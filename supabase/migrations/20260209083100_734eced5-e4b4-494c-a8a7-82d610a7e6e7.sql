
-- Add email_verified column to profiles
ALTER TABLE public.profiles ADD COLUMN email_verified boolean NOT NULL DEFAULT false;

-- Create email verification tokens table
CREATE TABLE public.email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Block all direct access - only edge functions (service role) can access
CREATE POLICY "Block anonymous access on email_verifications"
ON public.email_verifications
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Block authenticated access on email_verifications"
ON public.email_verifications
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Index for token lookups
CREATE INDEX idx_email_verifications_token ON public.email_verifications (token);

-- Index for cleanup
CREATE INDEX idx_email_verifications_expires ON public.email_verifications (expires_at);

-- Cleanup function for expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_email_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.email_verifications WHERE expires_at < now() AND verified_at IS NULL;
END;
$$;
