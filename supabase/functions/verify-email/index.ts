import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const handler = async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(generateHtmlPage("error", "Token no proporcionado"), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the verification token
    const { data: verification, error: fetchError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("token", token)
      .is("verified_at", null)
      .maybeSingle();

    if (fetchError || !verification) {
      return new Response(
        generateHtmlPage("error", "Este enlace no es válido o ya ha sido utilizado."),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Check expiry
    if (new Date(verification.expires_at) < new Date()) {
      return new Response(
        generateHtmlPage("error", "Este enlace ha expirado. Por favor, solicita uno nuevo desde la app."),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Mark token as verified
    await supabase
      .from("email_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", verification.id);

    // Update profile email_verified flag
    await supabase
      .from("profiles")
      .update({ email_verified: true })
      .eq("user_id", verification.user_id);

    console.log(`Email verified for user ${verification.user_id}: ${verification.email}`);

    return new Response(
      generateHtmlPage("success", "¡Tu email ha sido verificado correctamente! Ya puedes recibir notificaciones de match."),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error: any) {
    console.error("Error in verify-email:", error);
    return new Response(
      generateHtmlPage("error", "Ha ocurrido un error. Inténtalo de nuevo."),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
};

function generateHtmlPage(status: "success" | "error", message: string): string {
  const isSuccess = status === "success";
  const emoji = isSuccess ? "✅" : "❌";
  const title = isSuccess ? "¡Email verificado!" : "Error de verificación";
  const color = isSuccess ? "#22c55e" : "#ef4444";

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Mútuo</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
      <div style="max-width: 400px; margin: 20px; padding: 40px; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;">
        <div style="font-size: 64px; margin-bottom: 20px;">${emoji}</div>
        <h1 style="color: ${color}; font-size: 24px; margin-bottom: 16px;">${title}</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">${message}</p>
        <a href="https://eurekamatch.lovable.app" style="display: inline-block; background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%); color: white; text-decoration: none; padding: 12px 28px; border-radius: 25px; font-weight: 600; font-size: 14px;">
          Abrir Mútuo
        </a>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
