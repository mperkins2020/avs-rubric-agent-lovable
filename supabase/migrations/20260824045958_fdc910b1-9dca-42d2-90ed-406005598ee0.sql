CREATE TABLE IF NOT EXISTS public.scrape_jobs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_domain     text NOT NULL,
  requested_url  text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'complete', 'error')),
  result_json    jsonb,
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  expires_at     timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

GRANT SELECT ON public.scrape_jobs TO authenticated;
GRANT ALL ON public.scrape_jobs TO service_role;

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_domain_created
  ON public.scrape_jobs (url_domain, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_requested_url_created
  ON public.scrape_jobs (requested_url, created_at DESC);

ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scrape_jobs_read"
  ON public.scrape_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND expires_at > now());