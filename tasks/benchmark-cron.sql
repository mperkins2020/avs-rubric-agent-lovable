-- ============================================================
-- AVS Benchmark — Monthly pg_cron schedule
-- Triggers run-benchmark for all 5 Phase 1 categories on the
-- 1st of each month, staggered 30 min apart to avoid resource
-- spikes. run-benchmark processes each category in the background
-- so the HTTP call returns immediately (202).
--
-- BEFORE RUNNING:
-- 1. Replace <YOUR_SUPABASE_URL> with your project URL
--    e.g. https://abcdefghijkl.supabase.co
-- 2. Replace <YOUR_SERVICE_ROLE_KEY> with your service role key
--    (Settings → API → service_role key in Supabase dashboard)
-- 3. Run in Lovable's Supabase SQL Editor.
--
-- REQUIREMENTS: pg_cron and pg_net extensions must be enabled.
-- Both are on by default in Supabase. Verify under
-- Database → Extensions if unsure.
-- ============================================================

-- ── Phase 1 schedule: 1st of each month, UTC ─────────────────
-- 06:00 UTC — AI Customer Support   (13 companies, ~15 min total)
-- 06:30 UTC — AI Agent Platform     (13 companies)
-- 07:00 UTC — AI Coding Assistant   (13 companies)
-- 07:30 UTC — AI Sales Intelligence (13 companies)
-- 08:00 UTC — AI Revenue Intelligence (12 companies)

SELECT cron.schedule(
  'benchmark-ai-customer-support',     -- job name (must be unique)
  '0 6 1 * *',                         -- 1st of month, 06:00 UTC
  $$
  SELECT net.http_post(
    url     := '<YOUR_SUPABASE_URL>/functions/v1/run-benchmark',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
    ),
    body    := '{"category": "AI Customer Support"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'benchmark-ai-agent-platform',
  '30 6 1 * *',                        -- 1st of month, 06:30 UTC
  $$
  SELECT net.http_post(
    url     := '<YOUR_SUPABASE_URL>/functions/v1/run-benchmark',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
    ),
    body    := '{"category": "AI Agent Platform"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'benchmark-ai-coding-assistant',
  '0 7 1 * *',                         -- 1st of month, 07:00 UTC
  $$
  SELECT net.http_post(
    url     := '<YOUR_SUPABASE_URL>/functions/v1/run-benchmark',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
    ),
    body    := '{"category": "AI Coding Assistant"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'benchmark-ai-sales-intelligence',
  '30 7 1 * *',                        -- 1st of month, 07:30 UTC
  $$
  SELECT net.http_post(
    url     := '<YOUR_SUPABASE_URL>/functions/v1/run-benchmark',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
    ),
    body    := '{"category": "AI Sales Intelligence"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'benchmark-ai-revenue-intelligence',
  '0 8 1 * *',                         -- 1st of month, 08:00 UTC
  $$
  SELECT net.http_post(
    url     := '<YOUR_SUPABASE_URL>/functions/v1/run-benchmark',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <YOUR_SERVICE_ROLE_KEY>'
    ),
    body    := '{"category": "AI Revenue Intelligence"}'::jsonb
  );
  $$
);

-- ── Verify: list all scheduled jobs ──────────────────────────
-- Run this after the above to confirm all 5 are registered:
-- SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;

-- ── To delete a job (if needed) ──────────────────────────────
-- SELECT cron.unschedule('benchmark-ai-customer-support');
-- SELECT cron.unschedule('benchmark-ai-agent-platform');
-- SELECT cron.unschedule('benchmark-ai-coding-assistant');
-- SELECT cron.unschedule('benchmark-ai-sales-intelligence');
-- SELECT cron.unschedule('benchmark-ai-revenue-intelligence');
