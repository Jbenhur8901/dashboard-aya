-- LE DASH - User management fields
-- Run in Supabase SQL Editor

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

COMMENT ON COLUMN public.users.last_login_at IS 'Timestamp of last successful login';
COMMENT ON COLUMN public.users.mfa_enabled IS 'Whether MFA is enabled for the user';
COMMENT ON COLUMN public.users.mfa_verified_at IS 'Timestamp of last MFA verification';
COMMENT ON COLUMN public.users.created_by IS 'User who created this account';
COMMENT ON COLUMN public.users.updated_by IS 'User who last updated this account';
