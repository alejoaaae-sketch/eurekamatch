import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.190.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyRequest {
  phone: string;
  otp: string;
}

// Hash OTP using SHA-256 for comparison
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
    const { phone, otp }: VerifyRequest = await req.json();

    if (!phone || !otp) {
      throw new Error("Phone and OTP are required");
    }

    // Normalize phone number
    let normalizedPhone = phone.replace(/[\s\-\(\)\.]/g, "");
    if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = "+34" + normalizedPhone;
    }

    // Hash the provided OTP for comparison
    const otpHash = await hashOTP(otp);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("phone_otps")
      .select("*")
      .eq("phone", normalizedPhone)
      .single();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ valid: false, error: "No OTP found for this phone" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: "OTP has expired" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if already verified
    if (otpRecord.verified) {
      return new Response(
        JSON.stringify({ valid: false, error: "OTP already used" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Verify OTP by comparing hashes
    if (otpRecord.otp_code !== otpHash) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid OTP" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark as verified and delete the record for extra security
    await supabase
      .from("phone_otps")
      .delete()
      .eq("phone", normalizedPhone);

    console.log(`OTP verified successfully for ${normalizedPhone}`);

    return new Response(
      JSON.stringify({ valid: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-otp:", error);
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
