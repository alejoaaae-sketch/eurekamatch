import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MatchNotificationRequest {
  matchId: string;
  user1Id: string;
  user2Id: string;
  appType: string;
}

// App-specific configurations
const appConfigs: Record<string, { name: string; emoji: string; fromName: string }> = {
  love: { name: "Eureka Love", emoji: "💕", fromName: "Eureka Love" },
  plan: { name: "Eureka Plan", emoji: "🎉", fromName: "Eureka Plan" },
  sex: { name: "Eureka Sex", emoji: "🔥", fromName: "Eureka Sex" },
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { matchId, user1Id, user2Id, appType }: MatchNotificationRequest = await req.json();

    if (!matchId || !user1Id || !user2Id || !appType) {
      throw new Error("Missing required fields: matchId, user1Id, user2Id, appType");
    }

    // Security validation: Verify the match exists and was created recently (within 60 seconds)
    // This prevents unauthorized calls since only the database trigger creates matches
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("id, user1_id, user2_id, created_at")
      .eq("id", matchId)
      .single();

    if (matchError || !matchData) {
      console.error("Match validation failed:", matchError);
      return new Response(
        JSON.stringify({ error: "Invalid match" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the user IDs match what's in the database
    if (matchData.user1_id !== user1Id || matchData.user2_id !== user2Id) {
      console.error("User ID mismatch");
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the match was created within the last 60 seconds (prevents replay attacks)
    const matchCreatedAt = new Date(matchData.created_at);
    const now = new Date();
    const secondsSinceCreation = (now.getTime() - matchCreatedAt.getTime()) / 1000;
    
    if (secondsSinceCreation > 60) {
      console.error("Match too old for notification:", secondsSinceCreation, "seconds");
      return new Response(
        JSON.stringify({ error: "Request expired" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const appConfig = appConfigs[appType] || appConfigs.love;

    // Get both users' profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name, email, phone")
      .in("user_id", [user1Id, user2Id]);

    if (profilesError) {
      throw new Error(`Error fetching profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length < 2) {
      throw new Error("Could not find both user profiles");
    }

    const user1Profile = profiles.find(p => p.user_id === user1Id);
    const user2Profile = profiles.find(p => p.user_id === user2Id);

    if (!user1Profile || !user2Profile) {
      throw new Error("Could not find both user profiles");
    }

    // Get the picked names from the picks table
    const { data: picks, error: picksError } = await supabase
      .from("picks")
      .select("picker_id, picked_name")
      .eq("is_matched", true)
      .eq("app_type", appType)
      .or(`and(picker_id.eq.${user1Id},picked_user_id.eq.${user2Id}),and(picker_id.eq.${user2Id},picked_user_id.eq.${user1Id})`);

    if (picksError) {
      console.error("Error fetching picks:", picksError);
    }

    // Find the names each user gave to the other
    const nameUser1GaveToUser2 = picks?.find(p => p.picker_id === user1Id)?.picked_name || user2Profile.display_name || "alguien especial";
    const nameUser2GaveToUser1 = picks?.find(p => p.picker_id === user2Id)?.picked_name || user1Profile.display_name || "alguien especial";

    const emailsSent: string[] = [];
    const errors: string[] = [];

    // Send email to User 1
    if (user1Profile.email) {
      try {
        const emailHtml = generateEmailHtml({
          recipientName: user1Profile.display_name || "Usuario",
          matchedPersonName: nameUser1GaveToUser2,
          matchedPersonPhone: user2Profile.phone,
          matchedPersonEmail: user2Profile.email,
          appConfig,
        });

        await resend.emails.send({
          from: `${appConfig.fromName} <noreply@eurekamatch.eus>`,
          to: [user1Profile.email],
          subject: `${appConfig.emoji} ¡Es mutuo! Tienes un match en ${appConfig.name}`,
          html: emailHtml,
        });

        emailsSent.push(user1Profile.email);
        console.log(`Email sent to user1: ${user1Profile.email}`);
      } catch (emailError: any) {
        console.error(`Error sending email to user1:`, emailError);
        errors.push(`User1: ${emailError.message}`);
      }
    }

    // Send email to User 2
    if (user2Profile.email) {
      try {
        const emailHtml = generateEmailHtml({
          recipientName: user2Profile.display_name || "Usuario",
          matchedPersonName: nameUser2GaveToUser1,
          matchedPersonPhone: user1Profile.phone,
          matchedPersonEmail: user1Profile.email,
          appConfig,
        });

        await resend.emails.send({
          from: `${appConfig.fromName} <noreply@eurekamatch.eus>`,
          to: [user2Profile.email],
          subject: `${appConfig.emoji} ¡Es mutuo! Tienes un match en ${appConfig.name}`,
          html: emailHtml,
        });

        emailsSent.push(user2Profile.email);
        console.log(`Email sent to user2: ${user2Profile.email}`);
      } catch (emailError: any) {
        console.error(`Error sending email to user2:`, emailError);
        errors.push(`User2: ${emailError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        errors: errors.length > 0 ? errors : undefined 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-match-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

interface EmailParams {
  recipientName: string;
  matchedPersonName: string;
  matchedPersonPhone: string | null;
  matchedPersonEmail: string | null;
  appConfig: { name: string; emoji: string };
}

function generateEmailHtml(params: EmailParams): string {
  const { recipientName, matchedPersonName, matchedPersonPhone, matchedPersonEmail, appConfig } = params;

  const contactSection = [];
  if (matchedPersonPhone) {
    contactSection.push(`<p style="margin: 8px 0;"><strong>📱 Teléfono:</strong> ${matchedPersonPhone}</p>`);
  }
  if (matchedPersonEmail) {
    contactSection.push(`<p style="margin: 8px 0;"><strong>📧 Email:</strong> ${matchedPersonEmail}</p>`);
  }

  const contactHtml = contactSection.length > 0 
    ? contactSection.join("")
    : `<p style="margin: 8px 0; color: #666;">No hay información de contacto disponible.</p>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%); border-radius: 16px 16px 0 0; padding: 30px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 10px;">${appConfig.emoji}</div>
          <h1 style="color: white; margin: 0; font-size: 24px;">¡Es mutuo!</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Hola <strong>${recipientName}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            ¡Tenemos noticias increíbles! <strong>${matchedPersonName}</strong> también te ha elegido en ${appConfig.name}. 
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Ahora puedes contactar:
          </p>
          
          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📋 Datos de contacto</h3>
            ${contactHtml}
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 25px; text-align: center;">
            ✨ ¡Da el primer paso y contacta ahora!
          </p>
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
          Este email fue enviado desde ${appConfig.name}
        </p>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
