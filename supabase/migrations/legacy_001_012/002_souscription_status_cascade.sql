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
