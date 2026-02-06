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
