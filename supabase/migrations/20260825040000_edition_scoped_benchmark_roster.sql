-- Edition-scoped benchmark roster membership (Gate 2 architecture-blocker fix).
--
-- PROBLEM: benchmark_companies has no month/edition column. get_benchmark_data
-- filters it only by (category, active) — p_month only gates which scan_results
-- rows join in for score data. Every month ever queried against a category sees
-- the SAME roster row set. This worked fine while every category had exactly
-- one live edition, but breaks the moment a category needs two independently
-- addressable rosters at once — which September 2026 AI Coding Assistant now
-- does (excludes Windsurf/Qodo, reframes JetBrains AI to Junie, adds Claude
-- Code/Codex — none of which May's roster or scores may change).
--
-- FIX: add an explicit benchmark_month column to benchmark_companies (mirrors
-- the column already on scan_results), scope roster-membership uniqueness and
-- the RPC's roster selection by it. Company + category + benchmark_month now
-- identifies a specific edition's roster row, exactly as domain + benchmark_month
-- already identifies a specific edition's scan_results row.
--
-- Backfill source of truth: the live frontend CATEGORIES array
-- (src/pages/Benchmark.tsx), not a single hardcoded guess. Verified live
-- 2026-08-25 (read-only queries against production via anon key +
-- anonymous-auth session, same method tools/scraper-dev/snapshot-scan.ts
-- uses) that every category currently has exactly ONE live edition today:
--   AI Customer Support     -> 2026-05   (13 rows)
--   AI Agent Platform       -> 2026-05   (13 rows)
--   AI Coding Assistant     -> 2026-05   (14 rows — the only category about
--                                         to gain a second edition, seeded
--                                         separately once this migration lands)
--   AI Sales Intelligence   -> 2026-05   (13 rows)
--   AI Revenue Intelligence -> 2026-05   (10 rows — already drifted from its
--                                         original 13-row May seed via row
--                                         deletion, unrelated to this work;
--                                         all 10 live rows still backfill to
--                                         2026-05, the only edition this
--                                         category has ever had)
--   AI Speech Platform      -> 2026-06   (15 rows — 2 added 2026-06-30,
--                                         after the initial seed, still
--                                         within the SAME single June
--                                         edition, not a second edition)
--   Marketing Intelligence  -> 2026-08   (12 rows)
--   AI Legal / AI Dev Infrastructure / AI Healthcare / AI Video & Podcast
--                           -> 2026-05   (phase=2, active=false, no
--                                         CATEGORIES entry exists for any of
--                                         these yet — never queried via
--                                         get_benchmark_data today, so the
--                                         exact backfill value is inert;
--                                         2026-05 matches their seed date)
--
-- Explicitly NOT used as a backfill source: scan_results.benchmark_month
-- diversity. A live check found a stray 'benchmark_month = 2026-07' cohort
-- (11 Marketing Intelligence domains, created_at in August) — leftover from
-- an earlier rescan-capture cycle that was superseded before 2026-08 became
-- the category's live edition (see process_rescan_capture_protocol.md).
-- Deriving roster editions from scan_results history would have picked up
-- this abandoned value; the frontend CATEGORIES array is the only reliable
-- record of which edition is actually live per category.

-- ─── 1) Add the column, nullable first ────────────────────────────────────
ALTER TABLE public.benchmark_companies
  ADD COLUMN IF NOT EXISTS benchmark_month text;

-- ─── 2) Backfill every existing row from its category's live edition ─────
UPDATE public.benchmark_companies SET benchmark_month = '2026-05'
  WHERE category IN (
    'AI Customer Support', 'AI Agent Platform', 'AI Coding Assistant',
    'AI Sales Intelligence', 'AI Revenue Intelligence',
    'AI Legal', 'AI Dev Infrastructure', 'AI Healthcare', 'AI Video & Podcast'
  ) AND benchmark_month IS NULL;

UPDATE public.benchmark_companies SET benchmark_month = '2026-06'
  WHERE category = 'AI Speech Platform' AND benchmark_month IS NULL;

UPDATE public.benchmark_companies SET benchmark_month = '2026-08'
  WHERE category = 'Marketing Intelligence' AND benchmark_month IS NULL;

-- Safety net: if any row didn't match one of the above (a category added
-- between when this migration was written and when it runs), fail loudly
-- rather than silently leaving a NULL that the NOT NULL constraint below
-- would reject anyway with a less informative error.
DO $$
DECLARE
  unbackfilled_count int;
BEGIN
  SELECT COUNT(*) INTO unbackfilled_count
  FROM public.benchmark_companies WHERE benchmark_month IS NULL;

  IF unbackfilled_count > 0 THEN
    RAISE EXCEPTION
      'edition-scoping backfill left % row(s) with NULL benchmark_month — this migration''s category list is stale, add the new category to it before re-running',
      unbackfilled_count;
  END IF;
END $$;

-- ─── 3) Enforce NOT NULL now that every row has a value ───────────────────
ALTER TABLE public.benchmark_companies
  ALTER COLUMN benchmark_month SET NOT NULL;

-- ─── 4) Edition-aware uniqueness — replaces (domain, category) ────────────
-- The same domain can now legitimately appear more than once per category
-- (e.g. lovable.dev in both the 2026-05 and 2026-09 AI Coding Assistant
-- editions) as long as each occurrence is a different edition.
--
-- The original CREATE TABLE (20260504055328) declared `UNIQUE (domain,
-- category)` inline without an explicit CONSTRAINT name, so Postgres
-- auto-named it — expected to be `benchmark_companies_domain_category_key`
-- under Postgres's standard {table}_{col1}_{col2}_key convention, but this
-- migration cannot be dry-run against a live/local instance from this
-- session (no Docker, no linked project), so the name is looked up from
-- pg_constraint by its actual columns instead of assumed — if the name
-- guess above is wrong for any reason, a hardcoded DROP CONSTRAINT would
-- silently no-op (IF EXISTS) and leave the old 2-column uniqueness rule
-- enforced alongside the new one, silently rejecting every September row
-- that shares a domain with its May counterpart. Doing this dynamically
-- removes that risk entirely rather than relying on the name guess.
DO $$
DECLARE
  old_constraint_name text;
BEGIN
  SELECT con.conname INTO old_constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'benchmark_companies'
    AND con.contype = 'u'
    AND (
      SELECT array_agg(a.attname ORDER BY a.attname)
      FROM unnest(con.conkey) AS k(attnum)
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
    ) = ARRAY['category', 'domain']::name[]
  LIMIT 1;

  IF old_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.benchmark_companies DROP CONSTRAINT %I', old_constraint_name);
  ELSE
    RAISE NOTICE 'No existing (domain, category) unique constraint found on benchmark_companies — nothing to drop (already migrated, or schema differs from what this migration expects).';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'benchmark_companies_domain_category_month_key'
  ) THEN
    ALTER TABLE public.benchmark_companies
      ADD CONSTRAINT benchmark_companies_domain_category_month_key
      UNIQUE (domain, category, benchmark_month);
  END IF;
END $$;

-- ─── 5) Index for the new roster-selection query shape ────────────────────
-- Additive — the existing idx_benchmark_companies_category (category, phase,
-- active, sort_order) is left in place untouched; nothing else in this repo
-- was found to depend on it, and dropping indexes unrelated to this fix is
-- out of scope for a minimal migration.
CREATE INDEX IF NOT EXISTS idx_benchmark_companies_category_month
  ON public.benchmark_companies (category, benchmark_month, active, sort_order);

-- ─── 6) get_benchmark_data — scope roster selection by edition too ────────
-- Both current_scans and prior_scans now filter benchmark_companies by
-- benchmark_month, not just category+active. current_scans' bc.benchmark_month
-- match against p_month, combined with the pre-existing sr.benchmark_month =
-- p_month join condition, is what makes "category + edition identifies both
-- the roster and the results" hold. prior_scans is scoped the same way so
-- month-over-month comparison only ever considers domains that are actually
-- part of the CURRENT edition's roster, not every row that ever existed for
-- the category — for AI Coding Assistant specifically, May (2026-05) and
-- September (2026-09) are 4 months apart, so prior_scans naturally finds no
-- match for either edition (there was no 2026-04 or 2026-08 coding-assistant
-- scan) and every prior_* field stays null, exactly as it already did before
-- this migration — no behavior change for the existing single-edition
-- categories, and no spurious May-vs-September delta gets computed (per the
-- Control Framework's non-negotiable against treating that gap as normal
-- month-over-month evolution).
CREATE OR REPLACE FUNCTION public.get_benchmark_data(p_category text, p_month text)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH
  current_scans AS (
    SELECT
      bc.company_name,
      bc.domain,
      bc.sort_order,
      sr.id            AS scan_id,
      sr.created_at    AS scanned_at,
      (sr.result_json->'rubricScore'->>'totalScore')::int           AS total_score,
      (sr.result_json->'rubricScore'->>'maxScore')::int             AS max_score,
      sr.result_json->'rubricScore'->>'band'                        AS band,
      sr.result_json->'rubricScore'->'dimensionScores'              AS dimension_scores,
      sr.result_json->'modelClassification'->>'model_type_l1'       AS model_type_l1,
      sr.result_json->'modelClassification'->>'model_type_l2'       AS model_type_l2,
      sr.result_json->'categoryClassification'->>'category_primary' AS category_primary,
      (sr.result_json->'observability'->>'confidenceScore')::int    AS evidence_confidence_score,
      sr.result_json->'observability'->>'level'                     AS evidence_coverage_level,
      sr.result_json->'rubricScore'->'strengths'                    AS strengths,
      sr.result_json->'rubricScore'->'weaknesses'                   AS weaknesses,
      sr.result_json->>'analysisVersion'                            AS analysis_version
    FROM benchmark_companies bc
    LEFT JOIN scan_results sr
      ON  sr.url_domain      = bc.domain
      AND sr.is_benchmark    = true
      AND sr.benchmark_month = p_month
      AND (sr.result_json->>'analysisVersion') NOT IN ('pending', 'error')
    WHERE bc.category         = p_category
      AND bc.benchmark_month  = p_month
      AND bc.active           = true
    ORDER BY bc.sort_order
  ),
  prior_month AS (
    SELECT to_char(
      to_date(p_month, 'YYYY-MM') - interval '1 month',
      'YYYY-MM'
    ) AS month_str
  ),
  prior_scans AS (
    SELECT
      bc.domain,
      (sr.result_json->'rubricScore'->>'totalScore')::int   AS total_score,
      sr.result_json->'rubricScore'->'dimension_scores'     AS dimension_scores,
      sr.result_json->'rubricScore'->>'band'                AS band
    FROM benchmark_companies bc
    CROSS JOIN prior_month pm
    LEFT JOIN scan_results sr
      ON  sr.url_domain      = bc.domain
      AND sr.is_benchmark    = true
      AND sr.benchmark_month = pm.month_str
      AND (sr.result_json->>'analysisVersion') NOT IN ('pending', 'error')
    WHERE bc.category         = p_category
      AND bc.benchmark_month  = p_month
      AND bc.active           = true
  )
  SELECT json_build_object(
    'category',    p_category,
    'month',       p_month,
    'prior_month', (SELECT month_str FROM prior_month),
    'companies', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'company_name',              cs.company_name,
            'domain',                    cs.domain,
            'scan_id',                   cs.scan_id,
            'total_score',               cs.total_score,
            'max_score',                 cs.max_score,
            'total_score_pct',           CASE WHEN cs.max_score > 0
                                           THEN round((cs.total_score::numeric / cs.max_score) * 100)
                                           ELSE NULL END,
            'band',                      cs.band,
            'dimension_scores',          cs.dimension_scores,
            'model_type_l1',             cs.model_type_l1,
            'model_type_l2',             cs.model_type_l2,
            'category_primary',          cs.category_primary,
            'evidence_confidence_score', cs.evidence_confidence_score,
            'evidence_coverage_level',   cs.evidence_coverage_level,
            'strengths',                 cs.strengths,
            'weaknesses',                cs.weaknesses,
            'analysis_version',          cs.analysis_version,
            'scanned_at',                cs.scanned_at,
            'prior_total_score',         ps.total_score,
            'prior_total_score_pct',     CASE WHEN ps.total_score IS NOT NULL AND cs.max_score > 0
                                           THEN round((ps.total_score::numeric / cs.max_score) * 100)
                                           ELSE NULL END,
            'prior_band',                ps.band,
            'score_delta',               CASE WHEN ps.total_score IS NOT NULL AND cs.total_score IS NOT NULL
                                           THEN cs.total_score - ps.total_score
                                           ELSE NULL END,
            'score_delta_pct',           CASE WHEN ps.total_score IS NOT NULL AND cs.total_score IS NOT NULL AND cs.max_score > 0
                                           THEN round(((cs.total_score - ps.total_score)::numeric / cs.max_score) * 100)
                                           ELSE NULL END
          )
          ORDER BY cs.total_score DESC NULLS LAST, cs.sort_order
        )
        FROM current_scans cs
        LEFT JOIN prior_scans ps ON ps.domain = cs.domain
      ),
      '[]'::json
    ),
    'category_stats', (
      SELECT json_build_object(
        'total_in_category',    COUNT(*),
        'total_scanned',        COUNT(*) FILTER (WHERE cs.total_score IS NOT NULL),
        'avg_score_pct',        round(AVG(
                                  CASE WHEN cs.max_score > 0
                                    THEN (cs.total_score::numeric / cs.max_score) * 100
                                    ELSE NULL END
                                )),
        'prior_avg_score_pct',  round(AVG(
                                  CASE WHEN cs.max_score > 0
                                    THEN (ps.total_score::numeric / cs.max_score) * 100
                                    ELSE NULL END
                                )),
        'band_counts', json_build_object(
          'Developing', COUNT(*) FILTER (WHERE cs.band = 'Developing'),
          'Credible',   COUNT(*) FILTER (WHERE cs.band = 'Credible'),
          'Trusted',    COUNT(*) FILTER (WHERE cs.band = 'Trusted'),
          'Exemplary',  COUNT(*) FILTER (WHERE cs.band = 'Exemplary')
        ),
        'model_type_counts', json_build_object(
          'access',       COUNT(*) FILTER (WHERE cs.model_type_l1 = 'access'),
          'consumption',  COUNT(*) FILTER (WHERE cs.model_type_l1 = 'consumption'),
          'outcome',      COUNT(*) FILTER (WHERE cs.model_type_l1 = 'outcome'),
          'hybrid',       COUNT(*) FILTER (WHERE cs.model_type_l1 = 'hybrid'),
          'gated',        COUNT(*) FILTER (WHERE cs.model_type_l1 = 'gated'),
          'unclassified', COUNT(*) FILTER (WHERE cs.model_type_l1 = 'unclassified'
                                              OR cs.model_type_l1 IS NULL)
        ),
        'avg_score_pct_delta',  round(AVG(
                                  CASE WHEN cs.max_score > 0 AND ps.total_score IS NOT NULL
                                    THEN ((cs.total_score - ps.total_score)::numeric / cs.max_score) * 100
                                    ELSE NULL END
                                ))
      )
      FROM current_scans cs
      LEFT JOIN prior_scans ps ON ps.domain = cs.domain
    ),
    'run_status', (
      SELECT json_agg(
        json_build_object(
          'domain',       brl.domain,
          'company_name', brl.company_name,
          'status',       brl.status,
          'completed_at', brl.completed_at,
          'error_message',brl.error_message
        )
      )
      FROM benchmark_run_log brl
      WHERE brl.run_month = p_month
        AND brl.category  = p_category
    )
  );
$function$;
