-- Création d'un enum pour les types d'organes de gouvernance
CREATE TYPE governance_body_type AS ENUM (
  'PRESIDENT',
  'DIRECTEUR_GENERAL', 
  'DIRECTEUR_GENERAL_DELEGUE',
  'COMITE_DIRECTION',
  'CONSEIL_SURVEILLANCE',
  'COMITE_STRATEGIQUE',
  'OTHER'
);

-- Nouvelle table pour stocker les organes de gouvernance
CREATE TABLE public.governance_bodies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  body_type governance_body_type NOT NULL,
  name text NOT NULL,
  holder_name text,
  powers_summary text,
  appointment_rules text,
  term_duration text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances des requêtes par entreprise
CREATE INDEX idx_governance_bodies_company ON public.governance_bodies(company_id);

-- Activer Row Level Security
ALTER TABLE public.governance_bodies ENABLE ROW LEVEL SECURITY;

-- Politique pour voir les organes de ses entreprises
CREATE POLICY "Users can view governance bodies of their companies"
ON public.governance_bodies
FOR SELECT
USING (company_id IN (
  SELECT id FROM public.companies WHERE user_id = auth.uid()
));

-- Politique pour créer des organes pour ses entreprises
CREATE POLICY "Users can create governance bodies for their companies"
ON public.governance_bodies
FOR INSERT
WITH CHECK (company_id IN (
  SELECT id FROM public.companies WHERE user_id = auth.uid()
));

-- Politique pour mettre à jour les organes de ses entreprises
CREATE POLICY "Users can update governance bodies of their companies"
ON public.governance_bodies
FOR UPDATE
USING (company_id IN (
  SELECT id FROM public.companies WHERE user_id = auth.uid()
));

-- Politique pour supprimer les organes de ses entreprises
CREATE POLICY "Users can delete governance bodies of their companies"
ON public.governance_bodies
FOR DELETE
USING (company_id IN (
  SELECT id FROM public.companies WHERE user_id = auth.uid()
));