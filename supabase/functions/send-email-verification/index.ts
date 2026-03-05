import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Authentication: Verify JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: authUser }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !authUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authenticatedUserId = authUser.id;
    // --- End Authentication ---

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting: max 3 verification emails per user per hour
    const { data: recentVerifications } = await supabase
      .from("email_verifications")
      .select("id")
      .eq("user_id", authenticatedUserId)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (recentVerifications && recentVerifications.length >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many verification requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate a secure random token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const verificationToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Delete any previous pending verifications for this user
    await supabase
      .from("email_verifications")
      .delete()
      .eq("user_id", authenticatedUserId)
      .is("verified_at", null);

    // Insert new verification token (expires in 24 hours)
    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        user_id: authenticatedUserId,
        email,
        token: verificationToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error("Error inserting verification:", insertError);
      throw new Error("Failed to create verification token");
    }

    // Build verification URL using the app's custom domain
    const verifyUrl = `https://eurekamatch.com/verify-email?token=${verificationToken}`;

    // Send verification email
    await resend.emails.send({
      from: "EurekaMatch <info@eurekamatch.com>",
      to: [email],
      subject: "✉️ Verifica tu email en EurekaMatch",
      html: generateVerificationEmail(verifyUrl),
    });

    console.log(`Verification email sent to ${email} for user ${authenticatedUserId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-email-verification:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function generateVerificationEmail(verifyUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #1a1a2e;">
      <div style="max-width: 500px; margin: 0 auto; padding: 30px 20px;">
        
        <div style="text-align: center; padding: 30px 0 20px;">
          <div style="font-size: 42px; margin-bottom: 8px;">💌</div>
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">EurekaMatch</h1>
        </div>
        
        <div style="background: #16213e; border-radius: 16px; padding: 32px; border: 1px solid rgba(255,255,255,0.08);">
          <h2 style="color: #ffffff; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Verifica tu email</h2>
          
          <p style="font-size: 15px; color: #a0a0b8; margin-bottom: 12px; line-height: 1.6;">
            ¡Hola! Necesitamos verificar tu correo electrónico para poder enviarte notificaciones cuando tengas un match.
          </p>
          
          <p style="font-size: 15px; color: #a0a0b8; margin-bottom: 28px; line-height: 1.6;">
            Haz clic en el botón de abajo para confirmar tu email:
          </p>
          
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff6b9d 0%, #e84393 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 30px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px; box-shadow: 0 4px 15px rgba(232, 67, 147, 0.4);">
              Verificar mi email ✓
            </a>
          </div>
          
          <p style="font-size: 13px; color: #6b6b80; margin-top: 28px; text-align: center;">
            Este enlace expira en 24 horas.
          </p>
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #4a4a5e; margin-top: 24px; line-height: 1.5;">
          Este email fue enviado desde EurekaMatch<br>
          Si no creaste una cuenta, puedes ignorar este email.
        </p>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
