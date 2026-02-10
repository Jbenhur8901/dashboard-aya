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
