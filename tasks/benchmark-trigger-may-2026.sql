-- ============================================================
-- AVS Benchmark — Manual trigger for May 2026
-- Fires run-benchmark immediately for all 5 Phase 1 categories.
-- Run each SELECT statement one at a time in the SQL editor,
-- waiting ~30 seconds between each so they don't compete for
-- Firecrawl and LLM capacity at the exact same moment.
--
-- Replace the same placeholders as benchmark-cron.sql:
--   <YOUR_SUPABASE_URL>      e.g. https://abcdefghijkl.supabase.co
--   <YOUR_SERVICE_ROLE_KEY>  Settings → API → service_role
--
-- Each call returns immediately (202). Processing happens in the
-- background — check progress in benchmark_run_log:
--   SELECT domain, company_name, status, completed_at
--   FROM benchmark_run_log
--   WHERE run_month = '2026-05'
--   ORDER BY category, status, started_at;
-- ============================================================

-- 1 of 5 — AI Customer Support
SELECT net.http_post(
  url     := '<YOUR_SUPABASE_URL>/functions/v1/run-benchmark',
  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
  ),
  body    := '{"category": "AI Customer Support", "month": "2026-05"}'::jsonb
);

-- Wait ~30 seconds, then run the next block.

-- 2 of 5 — AI Agent Platform
SELECT net.http_post(
  url     := '<YOUR_SUPABASE_URL>/functions/v1/run-benchmark',
  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
  ),
  body    := '{"category": "AI Agent Platform", "month": "2026-05"}'::jsonb
);

-- 3 of 5 — AI Coding Assistant
SELECT net.http_post(
  url     := '<YOUR_SUPABASE_URL>/functions/v1/run-benchmark',
  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
  ),
  body    := '{"category": "AI Coding Assistant", "month": "2026-05"}'::jsonb
);

-- 4 of 5 — AI Sales Intelligence
SELECT net.http_post(
  url     := '<YOUR_SUPABASE_URL>/functions/v1/run-benchmark',
  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
  ),
  body    := '{"category": "AI Sales Intelligence", "month": "2026-05"}'::jsonb
);

-- 5 of 5 — AI Revenue Intelligence
SELECT net.http_post(
  url     := '<YOUR_SUPABASE_URL>/functions/v1/run-benchmark',
  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
  ),
  body    := '{"category": "AI Revenue Intelligence", "month": "2026-05"}'::jsonb
);

-- ── Progress check — run anytime after triggering ─────────────
-- SELECT
--   category,
--   COUNT(*) FILTER (WHERE status = 'complete') AS complete,
--   COUNT(*) FILTER (WHERE status = 'running')  AS running,
--   COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
--   COUNT(*) FILTER (WHERE status = 'error')    AS error,
--   COUNT(*)                                     AS total
-- FROM benchmark_run_log
-- WHERE run_month = '2026-05'
-- GROUP BY category
-- ORDER BY category;
