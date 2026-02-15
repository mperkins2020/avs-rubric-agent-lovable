
-- Create evidence_misses table for tracking retrieval pipeline gaps
CREATE TABLE public.evidence_misses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_domain TEXT NOT NULL,
  submitted_url TEXT NOT NULL,
  dimension TEXT NOT NULL,
  expected_fact TEXT,
  miss_reason TEXT NOT NULL CHECK (miss_reason IN ('discovery_gap', 'extraction_gap', 'parsing_error', 'ranking_error', 'blocked_access')),
  fix_applied TEXT NOT NULL DEFAULT 'none' CHECK (fix_applied IN ('new_seed_url', 'new_link_discovery_rule', 'new_parser_rule', 'rerank_boost', 'retry_fetch', 'none')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evidence_misses ENABLE ROW LEVEL SECURITY;

-- Allow inserts from edge functions (service role)
CREATE POLICY "Allow service role to manage evidence_misses"
ON public.evidence_misses
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for querying by domain
CREATE INDEX idx_evidence_misses_domain ON public.evidence_misses (company_domain);
