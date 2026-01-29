-- Create table for task reminders configuration
CREATE TABLE public.task_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  days_before integer NOT NULL CHECK (days_before IN (1, 7, 14, 30)),
  channel public.nudge_channel NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, days_before, channel)
);

-- Enable RLS
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_reminders
CREATE POLICY "Users can view reminders of their tasks"
  ON public.task_reminders FOR SELECT
  USING (task_id IN (
    SELECT t.id FROM tasks t
    JOIN companies c ON t.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can create reminders for their tasks"
  ON public.task_reminders FOR INSERT
  WITH CHECK (task_id IN (
    SELECT t.id FROM tasks t
    JOIN companies c ON t.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can update reminders of their tasks"
  ON public.task_reminders FOR UPDATE
  USING (task_id IN (
    SELECT t.id FROM tasks t
    JOIN companies c ON t.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete reminders of their tasks"
  ON public.task_reminders FOR DELETE
  USING (task_id IN (
    SELECT t.id FROM tasks t
    JOIN companies c ON t.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

-- Create index for performance
CREATE INDEX idx_task_reminders_task_id ON public.task_reminders(task_id);
CREATE INDEX idx_task_reminders_days_channel ON public.task_reminders(days_before, channel);

-- Add Slack configuration fields to integration_settings
ALTER TABLE public.integration_settings 
ADD COLUMN slack_channel_id text,
ADD COLUMN slack_enabled boolean DEFAULT false;

-- Create table for Slack incoming messages (to route to advisor)
CREATE TABLE public.slack_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  slack_user_id text NOT NULL,
  slack_user_name text,
  message_text text NOT NULL,
  thread_ts text,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS for slack_messages
ALTER TABLE public.slack_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view slack messages of their companies"
  ON public.slack_messages FOR SELECT
  USING (company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Public insert for webhook"
  ON public.slack_messages FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_slack_messages_company ON public.slack_messages(company_id);
CREATE INDEX idx_slack_messages_task ON public.slack_messages(task_id);