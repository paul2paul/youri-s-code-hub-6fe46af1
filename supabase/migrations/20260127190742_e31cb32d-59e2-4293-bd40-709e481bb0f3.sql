-- Table pour les paramètres d'intégration webhooks
CREATE TABLE public.integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  webhook_url TEXT,
  notify_14_days BOOLEAN DEFAULT true,
  notify_7_days BOOLEAN DEFAULT true,
  notify_overdue BOOLEAN DEFAULT true,
  notify_timeline_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only see/modify their own company's settings
CREATE POLICY "Users can view their company integration settings"
ON public.integration_settings
FOR SELECT
USING (
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their company integration settings"
ON public.integration_settings
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their company integration settings"
ON public.integration_settings
FOR UPDATE
USING (
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their company integration settings"
ON public.integration_settings
FOR DELETE
USING (
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_integration_settings_updated_at
BEFORE UPDATE ON public.integration_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();