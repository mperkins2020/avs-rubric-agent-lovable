
-- Table to store community-submitted public evidence URLs per domain
CREATE TABLE public.community_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_domain TEXT NOT NULL,
  evidence_url TEXT NOT NULL,
  dimension TEXT,
  submitted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookup by domain
CREATE INDEX idx_community_evidence_domain ON public.community_evidence (url_domain);

-- Unique constraint to avoid duplicates per domain+url
CREATE UNIQUE INDEX idx_community_evidence_unique ON public.community_evidence (url_domain, evidence_url);

-- Enable RLS
ALTER TABLE public.community_evidence ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (needed by scraper edge function via service role)
CREATE POLICY "No public reads on community_evidence"
ON public.community_evidence
FOR SELECT
USING (false);

-- No user inserts directly (edge function uses service role)
CREATE POLICY "No direct inserts on community_evidence"
ON public.community_evidence
FOR INSERT
WITH CHECK (false);

-- No deletes
CREATE POLICY "No deletes on community_evidence"
ON public.community_evidence
FOR DELETE
USING (false);
