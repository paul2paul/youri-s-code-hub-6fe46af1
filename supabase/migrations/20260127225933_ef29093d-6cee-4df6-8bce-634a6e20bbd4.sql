-- Add shares_count column to stakeholders table
ALTER TABLE public.stakeholders 
ADD COLUMN shares_count integer DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.stakeholders.shares_count IS 'Number of shares held by this stakeholder';