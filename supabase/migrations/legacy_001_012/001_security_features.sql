-- Migration: Security Features for LE DASH
-- Run this migration in your Supabase SQL Editor

-- =====================================================
-- STEP 0: Add admin_fin to role enum
-- =====================================================
-- Run this FIRST, separately (cannot be in a transaction):
-- ALTER TYPE role ADD VALUE IF NOT EXISTS 'admin_fin';

-- If the above fails, run this instead:
-- ALTER TYPE role ADD VALUE 'admin_fin';

-- =====================================================
-- STEP 1: After adding enum value, run the rest below
-- =====================================================

-- 1. Add admin_fin check function
CREATE OR REPLACE FUNCTION public.is_admin_fin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role::text IN ('admin_fin', 'superadmin')
    AND approved = true
    AND disabled = false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Create IP Whitelist table
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  description TEXT,
  is_global BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;

-- Only superadmins can manage IP whitelist
DROP POLICY IF EXISTS "Superadmins can manage IP whitelist" ON public.ip_whitelist;
CREATE POLICY "Superadmins can manage IP whitelist" ON public.ip_whitelist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role::text = 'superadmin'
      AND approved = true
      AND disabled = false
    )
  );

-- 3. Create Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role::text IN ('admin', 'admin_fin', 'superadmin')
      AND approved = true
      AND disabled = false
    )
  );

-- Anyone authenticated can insert audit logs (for their own actions)
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Add actif column to code_promo (optional toggle feature)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'code_promo' AND column_name = 'actif'
  ) THEN
    ALTER TABLE public.code_promo ADD COLUMN actif BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 5. Add updated_at column to code_promo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'code_promo' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.code_promo ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_ip ON public.ip_whitelist(ip_address);

-- 7. Add mfa_required column to users (for tracking MFA status)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'mfa_required'
  ) THEN
    ALTER TABLE public.users ADD COLUMN mfa_required BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 8. Function to log audit events automatically via trigger (optional)
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.ip_whitelist IS 'IP addresses allowed to access the application';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for security and compliance';
