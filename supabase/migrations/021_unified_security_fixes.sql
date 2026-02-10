-- Unified security/RLS fixes (consolidated)

-- =====================
-- Helper: superadmin
-- =====================
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role::text = 'superadmin'
      AND approved = true
      AND disabled = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.is_superadmin() SET search_path = public, auth;

-- =====================
-- Fix SECURITY DEFINER function search_path (guarded)
-- =====================
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT * FROM (VALUES
      ('is_admin', ''),
      ('is_admin_fin', ''),
      ('is_admin_or_fin', ''),
      ('is_active_user', ''),
      ('is_superadmin', ''),
      ('is_ip_allowed', 'text'),
      ('current_user_org_id', ''),
      ('cascade_souscription_status', ''),
      ('cascade_transaction_status', ''),
      ('enforce_souscription_status_only', ''),
      ('handle_new_user', ''),
      ('update_updated_at_column', ''),
      ('cleanup_expired_api_keys', ''),
      ('get_payment_transactions_by_period', ''),
      ('get_payment_transaction_statistics', ''),
      ('get_client_active_souscriptions', ''),
      ('get_promo_code_tracking', ''),
      ('ensure_audit_log_trigger', 'text'),
      ('current_actor_id', ''),
      ('log_audit_event', '')
    ) AS t(name, args)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = fn.name
        AND pg_get_function_identity_arguments(p.oid) = fn.args
    ) THEN
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path = public, auth',
        fn.name,
        fn.args
      );
    END IF;
  END LOOP;
END $$;

-- =====================
-- Views: remove SECURITY DEFINER (PG15+)
-- =====================
ALTER VIEW IF EXISTS public.v_payment_transactions_with_users SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_user_transaction_stats SET (security_invoker = true);

-- =====================
-- Audit logs
-- =====================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Superadmin can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Audit logs: superadmin can read"
  ON public.audit_logs FOR SELECT
  USING (public.is_superadmin());

CREATE POLICY "Audit logs: users can insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- =====================
-- IP whitelist
-- =====================
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins can manage IP whitelist" ON public.ip_whitelist;

CREATE POLICY "IP whitelist: superadmin manage"
  ON public.ip_whitelist FOR ALL
  USING (public.is_superadmin());

-- =====================
-- Users
-- =====================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users: Admin can view all" ON public.users;
DROP POLICY IF EXISTS "Users: Users can view same org" ON public.users;
DROP POLICY IF EXISTS "Users: Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users: Admin can update" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role has full access to users" ON public.users;

CREATE POLICY "Users: can select"
  ON public.users FOR SELECT
  USING (
    public.is_admin()
    OR org_id = public.current_user_org_id()
    OR id = (select auth.uid())
  );

CREATE POLICY "Users: can update"
  ON public.users FOR UPDATE
  USING (public.is_admin() OR id = (select auth.uid()));

-- =====================
-- Clients
-- =====================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients: Admin can view all" ON public.clients;
DROP POLICY IF EXISTS "Clients: Admin/Fin can view" ON public.clients;
DROP POLICY IF EXISTS "Clients: Authenticated users can view" ON public.clients;
DROP POLICY IF EXISTS "Clients: Active users can view" ON public.clients;
DROP POLICY IF EXISTS "Clients: Admin can insert" ON public.clients;
DROP POLICY IF EXISTS "Clients: Admin can update" ON public.clients;
DROP POLICY IF EXISTS "Clients: Admin can delete" ON public.clients;

CREATE POLICY "Clients: can view"
  ON public.clients FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Clients: admin insert"
  ON public.clients FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Clients: admin update"
  ON public.clients FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Clients: admin delete"
  ON public.clients FOR DELETE
  USING (public.is_admin());

-- =====================
-- Souscriptions
-- =====================
ALTER TABLE public.souscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Souscriptions: Admin can view all" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Admin/Fin can view" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Authenticated users can view" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Active users can view" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Admin can insert" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Admin can update" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Active users can update" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Active users can update status" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Admin can delete" ON public.souscriptions;
DROP POLICY IF EXISTS "Souscriptions: Superadmin can delete" ON public.souscriptions;
DROP POLICY IF EXISTS "Service role has full access to souscriptions" ON public.souscriptions;

CREATE POLICY "Souscriptions: can view"
  ON public.souscriptions FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscriptions: admin insert"
  ON public.souscriptions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Souscriptions: can update"
  ON public.souscriptions FOR UPDATE
  USING (public.is_admin() OR public.is_active_user());

CREATE POLICY "Souscriptions: superadmin delete"
  ON public.souscriptions FOR DELETE
  USING (public.is_superadmin());

-- =====================
-- Transactions
-- =====================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Transactions: Admin can view all" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Admin/Fin can view" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Authenticated users can view" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Admin can insert" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Admin/Fin can insert" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Admin can update" ON public.transactions;
DROP POLICY IF EXISTS "Transactions: Admin/Fin can update" ON public.transactions;

CREATE POLICY "Transactions: admin/fin view"
  ON public.transactions FOR SELECT
  USING (public.is_admin_or_fin());

CREATE POLICY "Transactions: admin/fin insert"
  ON public.transactions FOR INSERT
  WITH CHECK (public.is_admin_or_fin());

CREATE POLICY "Transactions: admin/fin update"
  ON public.transactions FOR UPDATE
  USING (public.is_admin_or_fin());

-- =====================
-- Code promo
-- =====================
ALTER TABLE public.code_promo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Code Promo: Admin/Fin can view" ON public.code_promo;
DROP POLICY IF EXISTS "Code Promo: Authenticated users can view" ON public.code_promo;
DROP POLICY IF EXISTS "Code Promo: Admin can insert" ON public.code_promo;
DROP POLICY IF EXISTS "Code Promo: Admin/Fin can update" ON public.code_promo;
DROP POLICY IF EXISTS "Code Promo: Admin can delete" ON public.code_promo;
DROP POLICY IF EXISTS "Code Promo: Admin can manage" ON public.code_promo;
DROP POLICY IF EXISTS "Code Promo: Admin can view all" ON public.code_promo;

CREATE POLICY "Code promo: admin/fin view"
  ON public.code_promo FOR SELECT
  USING (public.is_admin_or_fin());

CREATE POLICY "Code promo: admin insert"
  ON public.code_promo FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Code promo: admin/fin update"
  ON public.code_promo FOR UPDATE
  USING (public.is_admin_or_fin());

CREATE POLICY "Code promo: admin delete"
  ON public.code_promo FOR DELETE
  USING (public.is_admin());

-- =====================
-- Documents
-- =====================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Documents: Admin can view all" ON public.documents;
DROP POLICY IF EXISTS "Documents: Admin/Fin can view" ON public.documents;
DROP POLICY IF EXISTS "Documents: Authenticated users can view" ON public.documents;
DROP POLICY IF EXISTS "Documents: Active users can view" ON public.documents;
DROP POLICY IF EXISTS "Documents: Admin/Fin can update" ON public.documents;
DROP POLICY IF EXISTS "Documents: Admin can insert" ON public.documents;
DROP POLICY IF EXISTS "Documents: Active users can insert" ON public.documents;
DROP POLICY IF EXISTS "Documents: Admin can delete" ON public.documents;
DROP POLICY IF EXISTS "Documents: Admin can manage" ON public.documents;
DROP POLICY IF EXISTS "Service role has full access to documents" ON public.documents;

CREATE POLICY "Documents: can view"
  ON public.documents FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Documents: can insert"
  ON public.documents FOR INSERT
  WITH CHECK (public.is_active_user());

CREATE POLICY "Documents: admin/fin update"
  ON public.documents FOR UPDATE
  USING (public.is_admin_or_fin());

CREATE POLICY "Documents: admin delete"
  ON public.documents FOR DELETE
  USING (public.is_admin());

-- =====================
-- Souscription detail tables
-- =====================
-- Auto
ALTER TABLE public.souscription_auto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Souscription Auto: Admin can view all" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Admin/Fin can view" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Authenticated users can view" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Active users can view" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Admin/Fin can update" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Admin can insert" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Admin can delete" ON public.souscription_auto;
DROP POLICY IF EXISTS "Souscription Auto: Admin can manage" ON public.souscription_auto;

CREATE POLICY "Souscription auto: can view"
  ON public.souscription_auto FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscription auto: admin insert"
  ON public.souscription_auto FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Souscription auto: admin/fin update"
  ON public.souscription_auto FOR UPDATE
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscription auto: admin delete"
  ON public.souscription_auto FOR DELETE
  USING (public.is_admin());

-- Voyage
ALTER TABLE public.souscription_voyage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Souscription Voyage: Admin can view all" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Admin/Fin can view" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Authenticated users can view" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Active users can view" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Admin/Fin can update" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Admin can insert" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Admin can delete" ON public.souscription_voyage;
DROP POLICY IF EXISTS "Souscription Voyage: Admin can manage" ON public.souscription_voyage;

CREATE POLICY "Souscription voyage: can view"
  ON public.souscription_voyage FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscription voyage: admin insert"
  ON public.souscription_voyage FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Souscription voyage: admin/fin update"
  ON public.souscription_voyage FOR UPDATE
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscription voyage: admin delete"
  ON public.souscription_voyage FOR DELETE
  USING (public.is_admin());

-- MRH
ALTER TABLE public.souscription_mrh ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Souscription MRH: Admin can view all" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Admin/Fin can view" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Authenticated users can view" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Active users can view" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Admin/Fin can update" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Admin can insert" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Admin can delete" ON public.souscription_mrh;
DROP POLICY IF EXISTS "Souscription MRH: Admin can manage" ON public.souscription_mrh;

CREATE POLICY "Souscription mrh: can view"
  ON public.souscription_mrh FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscription mrh: admin insert"
  ON public.souscription_mrh FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Souscription mrh: admin/fin update"
  ON public.souscription_mrh FOR UPDATE
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscription mrh: admin delete"
  ON public.souscription_mrh FOR DELETE
  USING (public.is_admin());

-- IAC
ALTER TABLE public.souscription_iac ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Souscription IAC: Admin can view all" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Admin/Fin can view" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Authenticated users can view" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Active users can view" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Admin/Fin can update" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Admin can insert" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Admin can delete" ON public.souscription_iac;
DROP POLICY IF EXISTS "Souscription IAC: Admin can manage" ON public.souscription_iac;

CREATE POLICY "Souscription iac: can view"
  ON public.souscription_iac FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscription iac: admin insert"
  ON public.souscription_iac FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Souscription iac: admin/fin update"
  ON public.souscription_iac FOR UPDATE
  USING (public.is_admin_or_fin());

CREATE POLICY "Souscription iac: admin delete"
  ON public.souscription_iac FOR DELETE
  USING (public.is_admin());

-- Easy Sante
ALTER TABLE public.souscription_easysante ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Souscription Easy Sante: Admin can view all" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Admin/Fin can view" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Active users can view" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Admin/Fin can update" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Admin can insert" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Admin can delete" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Active users can insert" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Active users can update" ON public.souscription_easysante;
DROP POLICY IF EXISTS "Souscription Easy Sante: Admin can manage" ON public.souscription_easysante;

CREATE POLICY "Souscription easysante: can view"
  ON public.souscription_easysante FOR SELECT
  USING (public.is_active_user());

CREATE POLICY "Souscription easysante: can insert"
  ON public.souscription_easysante FOR INSERT
  WITH CHECK (public.is_active_user());

CREATE POLICY "Souscription easysante: can update"
  ON public.souscription_easysante FOR UPDATE
  USING (public.is_active_user());

CREATE POLICY "Souscription easysante: admin delete"
  ON public.souscription_easysante FOR DELETE
  USING (public.is_admin());

-- =====================
-- Payment transactions
-- =====================
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to payment_transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Users can view own payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Payment transactions: service insert" ON public.payment_transactions;
DROP POLICY IF EXISTS "Payment transactions: all can update" ON public.payment_transactions;
DROP POLICY IF EXISTS "Payment transactions: all can select" ON public.payment_transactions;
DROP POLICY IF EXISTS "Payment transactions: superadmin can delete" ON public.payment_transactions;

CREATE POLICY "Payment transactions: service insert"
  ON public.payment_transactions FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Payment transactions: all can update"
  ON public.payment_transactions FOR UPDATE
  USING ((select auth.role()) IN ('anon', 'authenticated', 'service_role'))
  WITH CHECK ((select auth.role()) IN ('anon', 'authenticated', 'service_role'));

CREATE POLICY "Payment transactions: all can select"
  ON public.payment_transactions FOR SELECT
  USING ((select auth.role()) IN ('anon', 'authenticated', 'service_role'));

CREATE POLICY "Payment transactions: superadmin can delete"
  ON public.payment_transactions FOR DELETE
  USING (public.is_superadmin());

-- =====================
-- API keys
-- =====================
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can create own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Service role has full access to api_keys" ON public.api_keys;

CREATE POLICY "API keys: user select"
  ON public.api_keys FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "API keys: user insert"
  ON public.api_keys FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "API keys: user update"
  ON public.api_keys FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "API keys: user delete"
  ON public.api_keys FOR DELETE
  USING (user_id = (select auth.uid()));
