-- SQUASHED INITIAL MIGRATION (001-012)

-- For fresh databases only. Do NOT run if 001-012 already applied.



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
-- Migration: Cascade souscription status to related tables
-- Run in Supabase SQL Editor (or via migrations)

CREATE OR REPLACE FUNCTION public.cascade_souscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Act on any status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Update transactions linked to this souscription (if status column exists)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'status'
    ) THEN
      EXECUTE '
        UPDATE public.transactions
        SET status = $1, updated_at = now()
        WHERE souscription_id = $2
          AND status IS DISTINCT FROM $1
      ' USING NEW.status, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cascade_souscription_status ON public.souscriptions;

CREATE TRIGGER trg_cascade_souscription_status
AFTER UPDATE OF status ON public.souscriptions
FOR EACH ROW
EXECUTE FUNCTION public.cascade_souscription_status();

-- Cascade transaction status back to souscriptions
CREATE OR REPLACE FUNCTION public.cascade_transaction_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'souscriptions'
        AND column_name = 'status'
    ) THEN
      EXECUTE '
        UPDATE public.souscriptions
        SET status = $1, updated_at = now()
        WHERE id = $2
          AND status IS DISTINCT FROM $1
      ' USING NEW.status, NEW.souscription_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_cascade_transaction_status ON public.transactions;

CREATE TRIGGER trg_cascade_transaction_status
AFTER UPDATE OF status ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.cascade_transaction_status();
-- Migration: Restrict non-admin updates to souscriptions.status only
-- Run in Supabase SQL Editor (or via migrations)

CREATE OR REPLACE FUNCTION public.enforce_souscription_status_only()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow updates from server-side triggers/service role
  IF auth.uid() IS NULL OR public.is_admin_or_fin() THEN
    RETURN NEW;
  END IF;

  -- Non-admin users can only change status (and updated_at)
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.prime_ttc IS DISTINCT FROM OLD.prime_ttc
     OR NEW.codepromo IS DISTINCT FROM OLD.codepromo
     OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.coverage_duration IS DISTINCT FROM OLD.coverage_duration
     OR NEW.producttype IS DISTINCT FROM OLD.producttype THEN
    RAISE EXCEPTION 'Only status can be updated by non-admin users';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_souscription_status_only ON public.souscriptions;

CREATE TRIGGER trg_enforce_souscription_status_only
BEFORE UPDATE ON public.souscriptions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_souscription_status_only();
-- Migration: Cascade delete for souscription_id foreign keys
-- Run in Supabase SQL Editor (or via migrations)

-- Only superadmin can delete souscriptions (cascade will follow)
DROP POLICY IF EXISTS "Souscriptions: Admin can delete" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Superadmin can delete" ON public.souscriptions;

CREATE POLICY "Souscriptions: Superadmin can delete"
  ON public.souscriptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role::text = 'superadmin'
      AND approved = true
      AND disabled = false
    )
  );

-- transactions
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_souscription_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_souscription_id_fkey
  FOREIGN KEY (souscription_id)
  REFERENCES public.souscriptions(id)
  ON DELETE CASCADE;

-- documents
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_souscription_id_fkey;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_souscription_id_fkey
  FOREIGN KEY (souscription_id)
  REFERENCES public.souscriptions(id)
  ON DELETE CASCADE;

-- souscription_auto
ALTER TABLE public.souscription_auto
  DROP CONSTRAINT IF EXISTS souscription_auto_souscription_id_fkey;
ALTER TABLE public.souscription_auto
  ADD CONSTRAINT souscription_auto_souscription_id_fkey
  FOREIGN KEY (souscription_id)
  REFERENCES public.souscriptions(id)
  ON DELETE CASCADE;

-- souscription_voyage
ALTER TABLE public.souscription_voyage
  DROP CONSTRAINT IF EXISTS souscription_voyage_souscription_id_fkey;
ALTER TABLE public.souscription_voyage
  ADD CONSTRAINT souscription_voyage_souscription_id_fkey
  FOREIGN KEY (souscription_id)
  REFERENCES public.souscriptions(id)
  ON DELETE CASCADE;

-- souscription_mrh
ALTER TABLE public.souscription_mrh
  DROP CONSTRAINT IF EXISTS souscription_mrh_souscription_id_fkey;
ALTER TABLE public.souscription_mrh
  ADD CONSTRAINT souscription_mrh_souscription_id_fkey
  FOREIGN KEY (souscription_id)
  REFERENCES public.souscriptions(id)
  ON DELETE CASCADE;

-- souscription_iac
ALTER TABLE public.souscription_iac
  DROP CONSTRAINT IF EXISTS souscription_iac_souscription_id_fkey;
ALTER TABLE public.souscription_iac
  ADD CONSTRAINT souscription_iac_souscription_id_fkey
  FOREIGN KEY (souscription_id)
  REFERENCES public.souscriptions(id)
  ON DELETE CASCADE;
-- Migration: Create souscription_easysante table
-- Run in Supabase SQL Editor (or via migrations)

CREATE TABLE IF NOT EXISTS public.souscription_easysante (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT (now() AT TIME ZONE 'utc'::text),
  souscription_id uuid,

  nom_du_groupement text,
  personne_de_contact text,
  telephone text,
  nature_du_groupement text,
  nombre_de_personnes integer,
  composition_du_groupe text,
  petits_risques text,
  grands_risques text,
  limite_geographique text,
  confirmation_de_prise_en_charge boolean,
  confirmation_de_plafond boolean,
  plafonds_familiale text,
  delais_de_carence text,
  delais_de_carence_accident text,
  maladie_exclus text,
  questionnaire_medical text,
  refus_acceptation text,
  prime numeric,
  accord_avec_le_groupement boolean,
  validation_finale boolean,
  decision text,
  date_de_couverture date,
  date_echance date,
  nom_du_prospect text,
  attestation_information text,

  CONSTRAINT souscription_easysante_souscription_id_fkey
    FOREIGN KEY (souscription_id) REFERENCES public.souscriptions(id)
    ON DELETE SET NULL
);

ALTER TABLE public.souscription_easysante ENABLE ROW LEVEL SECURITY;

-- RLS: active users can read/write
DROP POLICY IF EXISTS "Souscription Easy Sante: Active users can view" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Active users can insert" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Active users can update" ON public.souscription_easysante;

CREATE POLICY "Souscription Easy Sante: Active users can view"
  ON public.souscription_easysante FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscription Easy Sante: Active users can insert"
  ON public.souscription_easysante FOR INSERT
  WITH CHECK (public.is_active_user());

CREATE POLICY "Souscription Easy Sante: Active users can update"
  ON public.souscription_easysante FOR UPDATE
  USING (public.is_active_user());
-- Migration: Storage and documents policies for Easy Sante PDF
-- Run in Supabase SQL Editor (or via migrations)

-- Storage bucket "file" policies
DROP POLICY IF EXISTS "File bucket: active users can read" ON storage.objects;
DROP POLICY IF EXISTS "File bucket: active users can upload" ON storage.objects;

CREATE POLICY "File bucket: active users can read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'file' AND public.is_active_user()
);

CREATE POLICY "File bucket: active users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'file' AND public.is_active_user()
);

-- Documents insert policy
DROP POLICY IF EXISTS "Documents: Active users can insert" ON public.documents;

CREATE POLICY "Documents: Active users can insert"
  ON public.documents FOR INSERT
  WITH CHECK (public.is_active_user());
-- Migration: Audit log triggers + superadmin-only audit log access
-- Run in Supabase SQL Editor (or via migrations)

-- Superadmin-only access to audit_logs
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Superadmin can read audit logs" ON public.audit_logs;

CREATE POLICY "Superadmin can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role::text = 'superadmin'
      AND approved = true
      AND disabled = false
    )
  );

-- Triggers to log changes on core tables
CREATE OR REPLACE FUNCTION public.ensure_audit_log_trigger(table_name text) RETURNS void AS $$
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS audit_%I_trigger ON public.%I', table_name, table_name);
  EXECUTE format(
    'CREATE TRIGGER audit_%I_trigger AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_audit_event()',
    table_name, table_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT public.ensure_audit_log_trigger('souscriptions');
SELECT public.ensure_audit_log_trigger('transactions');
SELECT public.ensure_audit_log_trigger('clients');
SELECT public.ensure_audit_log_trigger('documents');
SELECT public.ensure_audit_log_trigger('code_promo');
SELECT public.ensure_audit_log_trigger('users');
-- Automatic User Profile Creation
-- This trigger creates a profile in public.users when a new auth.users record is created

-- Function to create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    username,
    role,
    approved,
    disabled,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    SPLIT_PART(NEW.email, '@', 1), -- Générer un username temporaire depuis l'email
    'user', -- Rôle par défaut
    true, -- Par défaut, les utilisateurs sont approuvés (accès immédiat)
    false,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Manually create an admin user profile (adjust email to match your auth user)
-- Run this after creating your admin user in Supabase Auth
/*
UPDATE public.users
SET
  role = 'admin',
  approved = true,
  full_name = 'Administrateur',
  fonction = 'Administrateur Système'
WHERE email = 'admin@assurdash.com';
*/
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
-- Function PostgreSQL pour le suivi des codes promo
-- Cette fonction agrège les souscriptions par code promo et calcule les statistiques

CREATE OR REPLACE FUNCTION get_promo_code_tracking()
RETURNS TABLE (
  code_promo TEXT,
  subscription_count BIGINT,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.codepromo, 'Sans code') as code_promo,
    COUNT(s.id) as subscription_count,
    COALESCE(SUM(s.prime_ttc), 0) as total_revenue
  FROM souscriptions s
  WHERE s.status = 'valide'  -- Seulement les souscriptions validées
  GROUP BY s.codepromo
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Pour utiliser cette fonction dans Supabase, exécutez ce SQL dans l'éditeur SQL de Supabase
-- Ensuite, vous pourrez l'appeler avec: supabase.rpc('get_promo_code_tracking')
-- LE DASH - RLS Policies (RBAC aligned)
-- Run in Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.souscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_promo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.souscription_auto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.souscription_voyage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.souscription_mrh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.souscription_iac ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.souscription_easysante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin')
    AND approved = true
    AND disabled = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_fin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin_fin', 'superadmin')
    AND approved = true
    AND disabled = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_or_fin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'admin_fin', 'superadmin')
    AND approved = true
    AND disabled = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND approved = true
    AND disabled = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IP whitelist helper
CREATE OR REPLACE FUNCTION public.is_ip_allowed(ip text)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ip_whitelist
    WHERE is_global = true
       OR ip_address >>= ip::inet
       OR ip_address = ip::inet
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT org_id FROM public.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- USERS
-- ============================================================
DROP POLICY IF EXISTS "Users: Admin can view all" ON public.users;
DROP POLICY IF EXISTS "Users: Users can view same org" ON public.users;
DROP POLICY IF EXISTS "Users: Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users: Admin can update" ON public.users;

CREATE POLICY "Users: Admin can view all"
  ON public.users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users: Users can view same org"
  ON public.users FOR SELECT
  USING (org_id = public.current_user_org_id() OR id = auth.uid());

CREATE POLICY "Users: Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users: Admin can update"
  ON public.users FOR UPDATE
  USING (public.is_admin());

-- ============================================================
-- CLIENTS
-- ============================================================
DROP POLICY IF EXISTS "Clients: Admin can view all" ON public.clients;
DROP POLICY IF EXISTS "Clients: Admin/Fin can view" ON public.clients;
DROP POLICY IF EXISTS "Clients: Authenticated users can view" ON public.clients;
DROP POLICY IF EXISTS "Clients: Active users can view" ON public.clients;
DROP POLICY IF EXISTS "Clients: Admin can insert" ON public.clients;
DROP POLICY IF EXISTS "Clients: Admin can update" ON public.clients;
DROP POLICY IF EXISTS "Clients: Admin can delete" ON public.clients;

CREATE POLICY "Clients: Admin can view all"
  ON public.clients FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Clients: Admin/Fin can view"
  ON public.clients FOR SELECT
  USING (public.is_admin_or_fin());

CREATE POLICY "Clients: Active users can view"
  ON public.clients FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Clients: Admin can insert"
  ON public.clients FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Clients: Admin can update"
  ON public.clients FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Clients: Admin can delete"
  ON public.clients FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- SOUSCRIPTIONS
-- ============================================================
DROP POLICY IF EXISTS "Souscriptions: Admin can view all" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Admin/Fin can view" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Authenticated users can view" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Active users can view" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Admin can insert" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Admin can update" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Active users can update status" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Admin can delete" ON public.souscriptions;

CREATE POLICY "Souscriptions: Admin can view all"
  ON public.souscriptions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Souscriptions: Admin/Fin can view"
  ON public.souscriptions FOR SELECT
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscriptions: Active users can view"
  ON public.souscriptions FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscriptions: Admin can insert"
  ON public.souscriptions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Souscriptions: Admin can update"
  ON public.souscriptions FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Souscriptions: Active users can update status"
  ON public.souscriptions FOR UPDATE
  USING (public.is_active_user());

CREATE POLICY "Souscriptions: Admin can delete"
  ON public.souscriptions FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- TRANSACTIONS
-- ============================================================
DROP POLICY IF EXISTS "Transactions: Admin can view all" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Admin/Fin can view" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Authenticated users can view" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Admin can insert" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Admin/Fin can insert" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Admin can update" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Admin/Fin can update" ON public.transactions;

CREATE POLICY "Transactions: Admin can view all"
  ON public.transactions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Transactions: Admin/Fin can view"
  ON public.transactions FOR SELECT
  USING (public.is_admin_or_fin());

CREATE POLICY "Transactions: Admin can insert"
  ON public.transactions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Transactions: Admin/Fin can insert"
  ON public.transactions FOR INSERT
  WITH CHECK (public.is_admin_or_fin());

CREATE POLICY "Transactions: Admin/Fin can update"
  ON public.transactions FOR UPDATE
  USING (public.is_admin_or_fin());

-- ============================================================
-- CODE_PROMO (Codes Agents)
-- ============================================================
DROP POLICY IF EXISTS "Code Promo: Admin/Fin can view" ON public.code_promo;
DROP POLICY IF EXISTS "Code Promo: Authenticated users can view" ON public.code_promo;
DROP POLICY IF EXISTS "Code Promo: Admin can insert" ON public.code_promo;
DROP POLICY IF EXISTS "Code Promo: Admin/Fin can update" ON public.code_promo;
DROP POLICY IF EXISTS "Code Promo: Admin can delete" ON public.code_promo;

CREATE POLICY "Code Promo: Admin/Fin can view"
  ON public.code_promo FOR SELECT
  USING (public.is_admin_or_fin());

CREATE POLICY "Code Promo: Admin can insert"
  ON public.code_promo FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Code Promo: Admin/Fin can update"
  ON public.code_promo FOR UPDATE
  USING (public.is_admin_or_fin());

CREATE POLICY "Code Promo: Admin can delete"
  ON public.code_promo FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- DOCUMENTS
-- ============================================================
DROP POLICY IF EXISTS "Documents: Admin can view all" ON public.documents;
DROP POLICY IF EXISTS "Documents: Admin/Fin can view" ON public.documents;
DROP POLICY IF EXISTS "Documents: Authenticated users can view" ON public.documents;
DROP POLICY IF EXISTS "Documents: Active users can view" ON public.documents;
DROP POLICY IF EXISTS "Documents: Admin/Fin can update" ON public.documents;
DROP POLICY IF EXISTS "Documents: Admin can insert" ON public.documents;
DROP POLICY IF EXISTS "Documents: Admin can delete" ON public.documents;

CREATE POLICY "Documents: Admin can view all"
  ON public.documents FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Documents: Admin/Fin can view"
  ON public.documents FOR SELECT
  USING (public.is_admin_or_fin());

CREATE POLICY "Documents: Active users can view"
  ON public.documents FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Documents: Admin/Fin can update"
  ON public.documents FOR UPDATE
  USING (public.is_admin_or_fin());

CREATE POLICY "Documents: Admin can insert"
  ON public.documents FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Documents: Admin can delete"
  ON public.documents FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- SOUSCRIPTION DETAIL TABLES
-- ============================================================
DROP POLICY IF EXISTS "Souscription Auto: Admin can view all" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Admin/Fin can view" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Authenticated users can view" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Active users can view" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Admin/Fin can update" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Admin can insert" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Admin can delete" ON public.souscription_auto;

CREATE POLICY "Souscription Auto: Admin can view all"
  ON public.souscription_auto FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Souscription Auto: Admin/Fin can view"
  ON public.souscription_auto FOR SELECT
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscription Auto: Active users can view"
  ON public.souscription_auto FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscription Auto: Admin/Fin can update"
  ON public.souscription_auto FOR UPDATE
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscription Auto: Admin can insert"
  ON public.souscription_auto FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Souscription Auto: Admin can delete"
  ON public.souscription_auto FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Souscription Voyage: Admin can view all" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Admin/Fin can view" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Authenticated users can view" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Active users can view" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Admin/Fin can update" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Admin can insert" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Admin can delete" ON public.souscription_voyage;

CREATE POLICY "Souscription Voyage: Admin can view all"
  ON public.souscription_voyage FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Souscription Voyage: Admin/Fin can view"
  ON public.souscription_voyage FOR SELECT
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscription Voyage: Active users can view"
  ON public.souscription_voyage FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscription Voyage: Admin/Fin can update"
  ON public.souscription_voyage FOR UPDATE
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscription Voyage: Admin can insert"
  ON public.souscription_voyage FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Souscription Voyage: Admin can delete"
  ON public.souscription_voyage FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Souscription MRH: Admin can view all" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Admin/Fin can view" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Authenticated users can view" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Active users can view" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Admin/Fin can update" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Admin can insert" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Admin can delete" ON public.souscription_mrh;

CREATE POLICY "Souscription MRH: Admin can view all"
  ON public.souscription_mrh FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Souscription MRH: Admin/Fin can view"
  ON public.souscription_mrh FOR SELECT
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscription MRH: Active users can view"
  ON public.souscription_mrh FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscription MRH: Admin/Fin can update"
  ON public.souscription_mrh FOR UPDATE
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscription MRH: Admin can insert"
  ON public.souscription_mrh FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Souscription MRH: Admin can delete"
  ON public.souscription_mrh FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Souscription IAC: Admin can view all" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Admin/Fin can view" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Authenticated users can view" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Active users can view" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Admin/Fin can update" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Admin can insert" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Admin can delete" ON public.souscription_iac;

CREATE POLICY "Souscription IAC: Admin can view all"
  ON public.souscription_iac FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Souscription IAC: Admin/Fin can view"
  ON public.souscription_iac FOR SELECT
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscription IAC: Active users can view"
  ON public.souscription_iac FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscription IAC: Admin/Fin can update"
  ON public.souscription_iac FOR UPDATE
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscription IAC: Admin can insert"
  ON public.souscription_iac FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Souscription IAC: Admin can delete"
  ON public.souscription_iac FOR DELETE
  USING (public.is_admin());

-- Souscription Easy Sante
DROP POLICY IF EXISTS "Souscription Easy Sante: Admin can view all" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Admin/Fin can view" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Active users can view" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Admin/Fin can update" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Admin can insert" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Admin can delete" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Active users can insert" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Active users can update" ON public.souscription_easysante;

CREATE POLICY "Souscription Easy Sante: Active users can view"
  ON public.souscription_easysante FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscription Easy Sante: Active users can insert"
  ON public.souscription_easysante FOR INSERT
  WITH CHECK (public.is_active_user());

CREATE POLICY "Souscription Easy Sante: Active users can update"
  ON public.souscription_easysante FOR UPDATE
  USING (public.is_active_user());

-- ============================================================
-- GRANTS
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- Force audit logs to always have a user_id (system fallback)
-- System user UUID:
-- e8aaa1ee-9f75-4219-81a2-10b261c6bb46

CREATE OR REPLACE FUNCTION public.current_actor_id()
RETURNS UUID AS $$
DECLARE
  actor UUID;
BEGIN
  actor := auth.uid();
  IF actor IS NULL THEN
    actor := 'e8aaa1ee-9f75-4219-81a2-10b261c6bb46'::uuid;
  END IF;
  RETURN actor;
END;
$$ LANGUAGE plpgsql STABLE;

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
    public.current_actor_id(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
