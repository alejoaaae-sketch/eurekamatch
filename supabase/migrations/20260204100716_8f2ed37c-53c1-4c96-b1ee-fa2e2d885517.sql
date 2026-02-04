-- Create table to track OTP verification attempts
CREATE TABLE public.otp_verification_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient lookups by phone and time
CREATE INDEX idx_otp_attempts_phone_time ON otp_verification_attempts(phone, created_at);

-- RLS: block all direct user access (only edge functions with service role can access)
ALTER TABLE otp_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verification_attempts FORCE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access" ON otp_verification_attempts FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block authenticated access" ON otp_verification_attempts FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Cleanup function to remove old attempt records (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_otp_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.otp_verification_attempts WHERE created_at < now() - interval '1 hour';
END;
$$;