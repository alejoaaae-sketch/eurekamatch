import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.190.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OTPRequest {
  phone: string;
}

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP using SHA-256 for secure storage
const hashOTP = async (otp: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = hexEncode(hashArray);
  return new TextDecoder().decode(hashHex);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone }: OTPRequest = await req.json();

    if (!phone) {
      throw new Error("Phone number is required");
    }

    // Normalize phone number
    let normalizedPhone = phone.replace(/[\s\-\(\)\.]/g, "");
    if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = "+34" + normalizedPhone;
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Get Twilio credentials
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Twilio credentials not configured");
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", normalizedPhone);
    formData.append("From", twilioPhone);
    formData.append("Body", `Tu código de verificación es: ${otp}. Válido por 10 minutos.`);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();
      console.error("Twilio error:", errorData);
      throw new Error(errorData.message || "Failed to send SMS");
    }

    // Store HASHED OTP in database (never store plain text)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert OTP record with hashed code
    const { error: dbError } = await supabase
      .from("phone_otps")
      .upsert({
        phone: normalizedPhone,
        otp_code: otpHash, // Store hash, not plain text
        expires_at: expiresAt.toISOString(),
        verified: false,
      }, {
        onConflict: "phone",
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to store OTP");
    }

    console.log(`OTP sent successfully to ${normalizedPhone}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
