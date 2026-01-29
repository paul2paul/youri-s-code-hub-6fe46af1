-- Remove overly permissive INSERT policy for slack_messages
DROP POLICY IF EXISTS "Public insert for webhook" ON public.slack_messages;

-- Create proper INSERT policy (service role will bypass RLS)
CREATE POLICY "Users can insert slack messages for their companies"
  ON public.slack_messages FOR INSERT
  WITH CHECK (company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  ));