import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(generateHtmlPage("error", "Token no proporcionado"), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // GET request: show confirmation page (don't verify yet)
    if (req.method === "GET") {
      return new Response(generateConfirmationPage(token), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // POST request: actually verify the token
    if (req.method === "POST") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: verification, error: fetchError } = await supabase
        .from("email_verifications")
        .select("*")
        .eq("token", token)
        .is("verified_at", null)
        .maybeSingle();

      if (fetchError || !verification) {
        return new Response(
          JSON.stringify({ status: "error", message: "Este enlace no es válido o ya ha sido utilizado." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (new Date(verification.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ status: "error", message: "Este enlace ha expirado. Por favor, solicita uno nuevo desde la app." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      await supabase
        .from("email_verifications")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", verification.id);

      await supabase
        .from("profiles")
        .update({ email_verified: true })
        .eq("user_id", verification.user_id);

      console.log(`Email verified for user ${verification.user_id}: ${verification.email}`);

      return new Response(
        JSON.stringify({ status: "success", message: "¡Tu email ha sido verificado correctamente!" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    console.error("Error in verify-email:", error);
    return new Response(
      JSON.stringify({ status: "error", message: "Ha ocurrido un error. Inténtalo de nuevo." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function generateConfirmationPage(token: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verificar email - Mútuo</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
      <div id="container" style="max-width: 400px; margin: 20px; padding: 40px; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;">
        <div style="font-size: 64px; margin-bottom: 20px;">✉️</div>
        <h1 id="title" style="color: #333; font-size: 24px; margin-bottom: 16px;">Verificar tu email</h1>
        <p id="message" style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
          Haz clic en el botón de abajo para confirmar tu dirección de correo electrónico.
        </p>
        <button id="verifyBtn" onclick="verifyEmail()" style="display: inline-block; background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%); color: white; border: none; cursor: pointer; padding: 14px 32px; border-radius: 25px; font-weight: 600; font-size: 16px; transition: opacity 0.2s;">
          Confirmar verificación ✓
        </button>
        <div id="spinner" style="display: none; margin-top: 20px;">
          <div style="width: 32px; height: 32px; border: 3px solid #eee; border-top-color: #c44569; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
        </div>
        <a id="appLink" href="https://eurekamatch.com" style="display: none; margin-top: 20px; background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%); color: white; text-decoration: none; padding: 12px 28px; border-radius: 25px; font-weight: 600; font-size: 14px;">
          Abrir Mútuo
        </a>
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
      <script>
        async function verifyEmail() {
          const btn = document.getElementById('verifyBtn');
          const spinner = document.getElementById('spinner');
          const title = document.getElementById('title');
          const message = document.getElementById('message');
          const appLink = document.getElementById('appLink');
          
          btn.style.display = 'none';
          spinner.style.display = 'block';
          
          try {
            const res = await fetch(window.location.href, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            spinner.style.display = 'none';
            
            if (data.status === 'success') {
              title.textContent = '¡Email verificado!';
              title.style.color = '#22c55e';
              message.textContent = data.message + ' Ya puedes recibir notificaciones de match.';
              document.querySelector('#container > div').textContent = '✅';
            } else {
              title.textContent = 'Error de verificación';
              title.style.color = '#ef4444';
              message.textContent = data.message;
              document.querySelector('#container > div').textContent = '❌';
            }
            appLink.style.display = 'inline-block';
          } catch (e) {
            spinner.style.display = 'none';
            title.textContent = 'Error';
            title.style.color = '#ef4444';
            message.textContent = 'Ha ocurrido un error. Inténtalo de nuevo.';
            btn.style.display = 'inline-block';
          }
        }
      </script>
    </body>
    </html>
  `;
}

serve(handler);
