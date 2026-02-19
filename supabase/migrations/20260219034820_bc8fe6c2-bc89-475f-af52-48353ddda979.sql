
-- Create a table to cache analysis results by URL
CREATE TABLE public.scan_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_domain TEXT NOT NULL,
  result_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + INTERVAL '7 days'
);

-- Index for fast lookups by domain
CREATE INDEX idx_scan_results_domain ON public.scan_results (url_domain, expires_at DESC);

-- Enable RLS
ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read cached results (it's public analysis data)
CREATE POLICY "Authenticated users can read cached results"
ON public.scan_results
FOR SELECT
USING (auth.uid() IS NOT NULL AND expires_at > now());

-- Edge function (service role) writes are handled server-side, no insert policy needed for users
-- No UPDATE or DELETE for users
CREATE POLICY "No user deletes on scan_results"
ON public.scan_results
FOR DELETE
USING (false);
