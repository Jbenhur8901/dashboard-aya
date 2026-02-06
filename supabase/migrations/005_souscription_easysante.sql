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
