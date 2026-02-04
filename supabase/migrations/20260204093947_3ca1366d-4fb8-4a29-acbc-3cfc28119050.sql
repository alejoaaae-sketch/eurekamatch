-- Create table to store phone OTPs
CREATE TABLE public.phone_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_otps FORCE ROW LEVEL SECURITY;

-- Block all direct access - only edge functions can access via service role
CREATE POLICY "Anonymous cannot access phone_otps"
ON public.phone_otps
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Authenticated cannot access phone_otps"
ON public.phone_otps
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Create index for faster lookups
CREATE INDEX idx_phone_otps_phone ON public.phone_otps(phone);

-- Add cleanup function to delete expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.phone_otps WHERE expires_at < now();
END;
$$;