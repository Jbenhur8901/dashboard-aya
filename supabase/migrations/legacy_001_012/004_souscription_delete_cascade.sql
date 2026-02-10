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
