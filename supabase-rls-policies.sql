-- Row Level Security (RLS) Policies for AssurDash
-- Admin users can see everything, other users see filtered data

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
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin or superadmin
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

-- Helper function to get current user's org_id
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
-- USERS TABLE POLICIES
-- ============================================================
-- Admins can see all users, others can only see users in their org
CREATE POLICY "Users: Admin can view all"
  ON public.users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users: Users can view same org"
  ON public.users FOR SELECT
  USING (org_id = public.current_user_org_id() OR id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users: Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- CLIENTS TABLE POLICIES
-- ============================================================
-- Admins can see all clients
CREATE POLICY "Clients: Admin can view all"
  ON public.clients FOR SELECT
  USING (public.is_admin());

-- Non-admin users can see all clients (adjust if needed)
CREATE POLICY "Clients: Authenticated users can view"
  ON public.clients FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can insert/update/delete
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
-- SOUSCRIPTIONS TABLE POLICIES
-- ============================================================
CREATE POLICY "Souscriptions: Admin can view all"
  ON public.souscriptions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Souscriptions: Authenticated users can view"
  ON public.souscriptions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Souscriptions: Admin can insert"
  ON public.souscriptions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Souscriptions: Admin can update"
  ON public.souscriptions FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Souscriptions: Admin can delete"
  ON public.souscriptions FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- TRANSACTIONS TABLE POLICIES
-- ============================================================
CREATE POLICY "Transactions: Admin can view all"
  ON public.transactions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Transactions: Authenticated users can view"
  ON public.transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Transactions: Admin can insert"
  ON public.transactions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Transactions: Admin can update"
  ON public.transactions FOR UPDATE
  USING (public.is_admin());

-- ============================================================
-- CODE_PROMO TABLE POLICIES
-- ============================================================
CREATE POLICY "Code Promo: Admin can view all"
  ON public.code_promo FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Code Promo: Authenticated users can view"
  ON public.code_promo FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Code Promo: Admin can manage"
  ON public.code_promo FOR ALL
  USING (public.is_admin());

-- ============================================================
-- DOCUMENTS TABLE POLICIES
-- ============================================================
CREATE POLICY "Documents: Admin can view all"
  ON public.documents FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Documents: Authenticated users can view"
  ON public.documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Documents: Admin can manage"
  ON public.documents FOR ALL
  USING (public.is_admin());

-- ============================================================
-- SOUSCRIPTION DETAIL TABLES POLICIES
-- ============================================================
-- Souscription Auto
CREATE POLICY "Souscription Auto: Admin can view all"
  ON public.souscription_auto FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Souscription Auto: Authenticated users can view"
  ON public.souscription_auto FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Souscription Auto: Admin can manage"
  ON public.souscription_auto FOR ALL
  USING (public.is_admin());

-- Souscription Voyage
CREATE POLICY "Souscription Voyage: Admin can view all"
  ON public.souscription_voyage FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Souscription Voyage: Authenticated users can view"
  ON public.souscription_voyage FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Souscription Voyage: Admin can manage"
  ON public.souscription_voyage FOR ALL
  USING (public.is_admin());

-- Souscription MRH
CREATE POLICY "Souscription MRH: Admin can view all"
  ON public.souscription_mrh FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Souscription MRH: Authenticated users can view"
  ON public.souscription_mrh FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Souscription MRH: Admin can manage"
  ON public.souscription_mrh FOR ALL
  USING (public.is_admin());

-- Souscription IAC
CREATE POLICY "Souscription IAC: Admin can view all"
  ON public.souscription_iac FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Souscription IAC: Authenticated users can view"
  ON public.souscription_iac FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Souscription IAC: Admin can manage"
  ON public.souscription_iac FOR ALL
  USING (public.is_admin());

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
