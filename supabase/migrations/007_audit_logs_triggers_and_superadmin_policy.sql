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
