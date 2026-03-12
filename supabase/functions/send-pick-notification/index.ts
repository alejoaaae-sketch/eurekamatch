import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const respond = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return respond({ error: "Unauthorized" }, 401);
    }

    let userId: string;
    try {
      const payloadB64 = authHeader.replace("Bearer ", "").split(".")[1];
      const payload = JSON.parse(atob(payloadB64));
      if (!payload.sub || (payload.exp && payload.exp * 1000 < Date.now())) {
        throw new Error("Invalid or expired token");
      }
      userId = payload.sub;
    } catch (e) {
      console.error("JWT decode error:", e);
      return respond({ error: "Unauthorized" }, 401);
    }

    const { pickId } = await req.json();
    if (!pickId) return respond({ error: "pickId is required" }, 400);

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get global config
    const { data: globalConfig } = await admin
      .from("global_config")
      .select("notifications_enabled, notification_sms_template, max_notifications_per_user")
      .limit(1)
      .single();

    if (!globalConfig?.notifications_enabled) {
      return respond({ error: "Notifications are disabled" }, 403);
    }

    const maxPerUser = globalConfig.max_notifications_per_user ?? 2;

    // 2. Get the pick and validate ownership
    const { data: pick } = await admin
      .from("picks")
      .select("*")
      .eq("id", pickId)
      .single();

    if (!pick) return respond({ error: "Pick not found" }, 404);
    if (pick.picker_id !== userId) return respond({ error: "Not your pick" }, 403);
    if (pick.deleted_at || pick.is_matched) return respond({ error: "Pick is not active" }, 400);
    if (!pick.picked_user_id) return respond({ error: "Recipient is not registered" }, 400);

    // 3. Get recipient's phone
    const { data: recipientProfile } = await admin
      .from("profiles")
      .select("phone")
      .eq("user_id", pick.picked_user_id)
      .single();

    if (!recipientProfile?.phone) {
      return respond({ error: "Recipient has no phone number" }, 400);
    }

    let normalizedPhone = recipientProfile.phone.replace(/[\s\-\(\)\.]/g, "");
    if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = "+34" + normalizedPhone;
    }

    // 4. Rate limit: no SMS to same phone number in the last month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data: recentToPhone } = await admin
      .from("pick_notifications")
      .select("id")
      .eq("recipient_phone", normalizedPhone)
      .eq("sender_id", userId)
      .gte("created_at", oneMonthAgo.toISOString())
      .limit(1)
      .maybeSingle();

    if (recentToPhone) {
      return respond({ error: "Already notified this phone number this month" }, 429);
    }

    // 5. Max lifetime notifications to this recipient user
    const { count: totalToRecipient } = await admin
      .from("pick_notifications")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", userId)
      .eq("recipient_user_id", pick.picked_user_id);

    if ((totalToRecipient ?? 0) >= maxPerUser) {
      return respond({ error: "Maximum notifications to this user reached" }, 429);
    }

    // 6. Check user has credits
    const { data: balance } = await admin
      .from("user_pick_balance")
      .select("picks_remaining, total_used")
      .eq("user_id", userId)
      .single();

    if (!balance || balance.picks_remaining <= 0) {
      return respond({ error: "No credits remaining" }, 402);
    }

    // 7. Send SMS via Twilio
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Twilio credentials not configured");
    }

    const appNames: Record<string, string> = {
      love: "Eureka Love 💕",
      plan: "Eureka Friends 🎉",
      mude: "Eureka Sex 🔥",
      sport: "Eureka Hobby 🏆",
    };
    const appLabel = appNames[pick.app_type] || "EurekaMatch";

    const optOutText = "\n\nPara dejar de recibir estos mensajes, entra en eurekamatch.lovable.app y desactívalo en Ajustes.";
    const template = globalConfig.notification_sms_template ||
      "Alguien ha pensado en ti en {app} 💫 Descubre quién en eurekamatch.lovable.app";
    let smsBody: string;
    if (template.includes("{app}")) {
      smsBody = template.replace(/\{app\}/g, appLabel) + optOutText;
    } else {
      smsBody = template + ` (${appLabel})` + optOutText;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append("To", normalizedPhone);
    formData.append("From", twilioPhone);
    formData.append("Body", smsBody);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();
      console.error("Twilio error:", errorData);
      throw new Error(errorData.message || "Failed to send SMS");
    }

    // 8. Deduct credit
    await admin
      .from("user_pick_balance")
      .update({
        picks_remaining: balance.picks_remaining - 1,
        total_used: balance.total_used + 1,
      })
      .eq("user_id", userId);

    // 9. Record notification
    await admin
      .from("pick_notifications")
      .insert({
        pick_id: pickId,
        sender_id: userId,
        recipient_user_id: pick.picked_user_id,
        recipient_phone: normalizedPhone,
      });

    console.log(`Notification sent for pick ${pickId} by user ${userId}`);
    return respond({ success: true });
  } catch (error: any) {
    console.error("Error in send-pick-notification:", error);
    return respond({ error: error.message }, 500);
  }
});
