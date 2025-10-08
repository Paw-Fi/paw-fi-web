-- WhatsApp verification system for binding phone numbers to user accounts

-- Verification codes table
CREATE TABLE IF NOT EXISTS public.whatsapp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_verifications_phone ON public.whatsapp_verifications(phone_e164);
CREATE INDEX IF NOT EXISTS idx_whatsapp_verifications_code ON public.whatsapp_verifications(verification_code);
CREATE INDEX IF NOT EXISTS idx_whatsapp_verifications_user ON public.whatsapp_verifications(user_id);

-- Auto-cleanup expired verifications (optional, can be run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.whatsapp_verifications
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.whatsapp_verifications IS 'Temporary verification codes for linking WhatsApp to user accounts';
