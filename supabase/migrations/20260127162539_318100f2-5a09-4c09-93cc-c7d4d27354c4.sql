-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create stakeholder role enum
CREATE TYPE public.stakeholder_role AS ENUM ('PRESIDENT', 'SHAREHOLDER', 'ACCOUNTANT');

-- Create document type enum
CREATE TYPE public.document_type AS ENUM ('STATUTS', 'PACTE', 'PRIOR_PV', 'ACCOUNTS', 'OTHER');

-- Create task type enum
CREATE TYPE public.task_type AS ENUM (
  'COLLECT_YEAR_INPUTS',
  'COLLECT_ACCOUNTS',
  'DRAFT_AGM_PACK',
  'SEND_CONVOCATIONS',
  'HOLD_AGM',
  'FILE_ACCOUNTS',
  'ARCHIVE'
);

-- Create task status enum
CREATE TYPE public.task_status AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'LATE');

-- Create owner role enum
CREATE TYPE public.owner_role AS ENUM ('PRESIDENT', 'ACCOUNTANT');

-- Create nudge channel enum
CREATE TYPE public.nudge_channel AS ENUM ('SLACK', 'EMAIL');

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  siren TEXT,
  legal_form TEXT NOT NULL DEFAULT 'SAS',
  jurisdiction TEXT NOT NULL DEFAULT 'FR',
  fiscal_year_end DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  president_name TEXT NOT NULL,
  president_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stakeholders table
CREATE TABLE public.stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  role stakeholder_role NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  share_percentage DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  type document_type NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version_label TEXT
);

-- Governance profiles table (one per company)
CREATE TABLE public.governance_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  notice_period_days INTEGER,
  approval_deadline_days INTEGER,
  quorum_rules_summary TEXT,
  majority_rules_summary TEXT,
  who_can_convene TEXT,
  meeting_modality_rules JSONB DEFAULT '{}',
  annual_obligations JSONB DEFAULT '[]',
  special_clauses_flags JSONB DEFAULT '[]',
  open_questions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  cycle_year INTEGER NOT NULL,
  type task_type NOT NULL,
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  owner_role owner_role NOT NULL,
  status task_status NOT NULL DEFAULT 'TODO',
  depends_on_task UUID REFERENCES public.tasks(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Year context table
CREATE TABLE public.year_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  cycle_year INTEGER NOT NULL,
  events_summary TEXT,
  capital_change BOOLEAN DEFAULT false,
  governance_change BOOLEAN DEFAULT false,
  dividends BOOLEAN DEFAULT false,
  exceptions TEXT,
  confirmed_by_president_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, cycle_year)
);

-- Task nudges (audit trail)
CREATE TABLE public.task_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  channel nudge_channel NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB DEFAULT '{}'
);

-- User roles table for admin access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.year_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_nudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Companies RLS policies
CREATE POLICY "Users can view their own companies"
  ON public.companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own companies"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies"
  ON public.companies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies"
  ON public.companies FOR DELETE
  USING (auth.uid() = user_id);

-- Stakeholders RLS policies
CREATE POLICY "Users can view stakeholders of their companies"
  ON public.stakeholders FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can create stakeholders for their companies"
  ON public.stakeholders FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update stakeholders of their companies"
  ON public.stakeholders FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete stakeholders of their companies"
  ON public.stakeholders FOR DELETE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Documents RLS policies
CREATE POLICY "Users can view documents of their companies"
  ON public.documents FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can create documents for their companies"
  ON public.documents FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update documents of their companies"
  ON public.documents FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete documents of their companies"
  ON public.documents FOR DELETE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Governance profiles RLS policies
CREATE POLICY "Users can view governance profiles of their companies"
  ON public.governance_profiles FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can create governance profiles for their companies"
  ON public.governance_profiles FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update governance profiles of their companies"
  ON public.governance_profiles FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Tasks RLS policies
CREATE POLICY "Users can view tasks of their companies"
  ON public.tasks FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can create tasks for their companies"
  ON public.tasks FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update tasks of their companies"
  ON public.tasks FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete tasks of their companies"
  ON public.tasks FOR DELETE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Year contexts RLS policies
CREATE POLICY "Users can view year contexts of their companies"
  ON public.year_contexts FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can create year contexts for their companies"
  ON public.year_contexts FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update year contexts of their companies"
  ON public.year_contexts FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Task nudges RLS policies
CREATE POLICY "Users can view task nudges of their companies"
  ON public.task_nudges FOR SELECT
  USING (task_id IN (
    SELECT t.id FROM public.tasks t
    JOIN public.companies c ON t.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can create task nudges for their companies"
  ON public.task_nudges FOR INSERT
  WITH CHECK (task_id IN (
    SELECT t.id FROM public.tasks t
    JOIN public.companies c ON t.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

-- User roles RLS policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies
CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);