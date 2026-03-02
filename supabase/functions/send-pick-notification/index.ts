import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { pickId } = await req.json();
    if (!pickId) {
      return new Response(JSON.stringify({ error: "pickId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check notifications_enabled in global_config
    const { data: globalConfig } = await admin
      .from("global_config")
      .select("notifications_enabled, notification_sms_template")
      .limit(1)
      .single();

    if (!globalConfig?.notifications_enabled) {
      return new Response(JSON.stringify({ error: "Notifications are disabled" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2. Get the pick and validate ownership
    const { data: pick } = await admin
      .from("picks")
      .select("*")
      .eq("id", pickId)
      .single();

    if (!pick) {
      return new Response(JSON.stringify({ error: "Pick not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (pick.picker_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not your pick" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (pick.deleted_at || pick.is_matched) {
      return new Response(JSON.stringify({ error: "Pick is not active" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 3. Check picked_user_id exists (must be registered)
    if (!pick.picked_user_id) {
      return new Response(JSON.stringify({ error: "Recipient is not registered" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 4. Get recipient's phone from profile
    const { data: recipientProfile } = await admin
      .from("profiles")
      .select("phone")
      .eq("user_id", pick.picked_user_id)
      .single();

    if (!recipientProfile?.phone) {
      return new Response(JSON.stringify({ error: "Recipient has no phone number" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 5. Check 1/month rate limit for this pick
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const { data: recentNotification } = await admin
      .from("pick_notifications")
      .select("id")
      .eq("pick_id", pickId)
      .gte("created_at", oneMonthAgo.toISOString())
      .limit(1)
      .maybeSingle();

    if (recentNotification) {
      return new Response(JSON.stringify({ error: "Already notified this month" }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 6. Check user has credits
    const { data: balance } = await admin
      .from("user_pick_balance")
      .select("picks_remaining, total_used")
      .eq("user_id", user.id)
      .single();

    if (!balance || balance.picks_remaining <= 0) {
      return new Response(JSON.stringify({ error: "No credits remaining" }), {
        status: 402,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 7. Normalize phone and send SMS via Twilio
    let normalizedPhone = recipientProfile.phone.replace(/[\s\-\(\)\.]/g, "");
    if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = "+34" + normalizedPhone;
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Twilio credentials not configured");
    }

    const optOutText = "\n\nPara dejar de recibir estos mensajes, entra en eurekamatch.lovable.app y desactívalo en Ajustes.";
    const template = globalConfig.notification_sms_template ||
      "Alguien ha pensado en ti en EurekaMatch 💫 Descubre quién en eurekamatch.lovable.app";
    const smsBody = template + optOutText;

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
      .eq("user_id", user.id);

    // 9. Record notification
    await admin
      .from("pick_notifications")
      .insert({
        pick_id: pickId,
        sender_id: user.id,
        recipient_user_id: pick.picked_user_id,
        recipient_phone: normalizedPhone,
      });

    console.log(`Notification sent for pick ${pickId} by user ${user.id}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-pick-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
