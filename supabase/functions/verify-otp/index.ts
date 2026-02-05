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
    // NOTE: No authentication required for verify-otp
    // This allows unauthenticated users to verify OTP during registration
    // Rate limiting (5 attempts per phone per 10 minutes) prevents brute force attacks

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");

    const { phone, otp }: VerifyRequest = await req.json();

    if (!phone || !otp) {
      return new Response(
        JSON.stringify({ valid: false, error: "Phone and OTP are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate OTP is exactly 6 digits
    const otpRegex = /^\d{6}$/;
    if (!otpRegex.test(otp)) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid OTP format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate phone format
    const phoneRegex = /^\+?[0-9]{9,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)\.]/g, ""))) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid phone number format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Normalize phone number
    let normalizedPhone = phone.replace(/[\s\-\(\)\.]/g, "");
    if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = "+34" + normalizedPhone;
    }

    // Hash the provided OTP for comparison
    const otpHash = await hashOTP(otp);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- Rate Limiting: Max 5 attempts per phone per 10 minutes ---
    const MAX_ATTEMPTS = 5;
    const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

    const { data: recentAttempts } = await supabase
      .from("otp_verification_attempts")
      .select("id")
      .eq("phone", normalizedPhone)
      .gte("created_at", new Date(Date.now() - ATTEMPT_WINDOW_MS).toISOString());

    if (recentAttempts && recentAttempts.length >= MAX_ATTEMPTS) {
      console.error("[SECURITY] Too many verification attempts:", normalizedPhone.substring(0, 6) + "***");
      return new Response(
        JSON.stringify({ valid: false, error: "Too many attempts. Please request a new code." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    // --- End Rate Limiting ---

    // Get OTP record and validate all conditions
    const { data: otpRecord, error: fetchError } = await supabase
      .from("phone_otps")
      .select("*")
      .eq("phone", normalizedPhone)
      .single();

    // Validate all conditions together to prevent enumeration
    const isExpired = otpRecord && new Date(otpRecord.expires_at) < new Date();
    const isAlreadyVerified = otpRecord && otpRecord.verified;
    const isValidCode = otpRecord && otpRecord.otp_code === otpHash;
    
    const isValid = otpRecord && 
      !fetchError &&
      !isExpired &&
      !isAlreadyVerified &&
      isValidCode;

    if (!isValid) {
      // Log specific reason server-side only (for debugging)
      console.error('[INTERNAL] Verification failed:', {
        phone: normalizedPhone.substring(0, 6) + '***',
        reason: !otpRecord ? 'no_record' : 
                fetchError ? 'fetch_error' :
                isExpired ? 'expired' :
                isAlreadyVerified ? 'already_used' : 'invalid_code',
        timestamp: new Date().toISOString()
      });
      
      // Log failed attempt
      await supabase.from("otp_verification_attempts").insert({ phone: normalizedPhone });
      
      // Return generic error message to prevent enumeration
      return new Response(
        JSON.stringify({ valid: false, error: "Verification failed. Please check your code or request a new one." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Clear attempts on successful verification
    await supabase
      .from("otp_verification_attempts")
      .delete()
      .eq("phone", normalizedPhone);

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
