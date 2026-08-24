-- Entry 090 (2026-08-24): scrape-website previously did its entire crawl
-- synchronously within one HTTP request/response cycle, writing nothing to
-- any table until the final response. Under sustained Firecrawl rate-
-- limiting, total execution could exceed Supabase's own platform connection
-- ceiling, silently discarding completed work when the connection was
-- severed (Entry 089). This table gives scrape-website the same
-- background-job + polling pattern analyze-company already has for
-- scan_results, so a long-running crawl survives regardless of how long the
-- underlying Firecrawl work takes.

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_domain     text NOT NULL,
  requested_url  text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'complete', 'error')),
  result_json    jsonb,
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  -- Short TTL — this table is a transient job-handoff mechanism between
  -- scrape-website and its callers (client + run-benchmark), not a durable
  -- evidence record. scan_results is the durable store; a completed
  -- scrape_jobs row exists only long enough for the caller to poll it.
  expires_at     timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_domain_created
  ON scrape_jobs (url_domain, created_at DESC);

ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

-- Matches scan_results' read posture exactly (auth.uid() IS NOT NULL AND
-- expires_at > now()) — see 20260219034820_bc8fe6c2-*.sql.
CREATE POLICY "scrape_jobs_read"
  ON scrape_jobs FOR SELECT
  USING (auth.uid() IS NOT NULL AND expires_at > now());

-- Edge function (service role) writes are handled server-side, no insert/
-- update policy needed for users — same convention as scan_results.
