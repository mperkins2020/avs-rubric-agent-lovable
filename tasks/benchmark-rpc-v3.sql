-- ============================================================
-- AVS Benchmark — get_benchmark_data RPC v3
-- Changes from v2:
--   1. companies[] returns ALL active companies (no LIMIT 8)
--      Frontend controls how many to display in the leaderboard.
--   2. Adds category_stats block computed from ALL scanned
--      companies — used for Zone 3 (Category Pulse) and any
--      category-level aggregates on the dashboard.
--   3. Band labels updated to new system:
--      Developing / Credible / Trusted / Exemplary
--
-- Run this in Lovable's Supabase SQL Editor.
-- Safe to run multiple times (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION get_benchmark_data(
  p_category text,
  p_month    text        -- 'YYYY-MM'
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH
  -- All active companies for this category with their current-month scan
  current_scans AS (
    SELECT
      bc.company_name,
      bc.domain,
      bc.sort_order,
      bc.notes,
      sr.id            AS scan_id,
      sr.created_at    AS scanned_at,
      -- Core scores
      (sr.result_json->'rubricScore'->>'totalScore')::int           AS total_score,
      (sr.result_json->'rubricScore'->>'maxScore')::int             AS max_score,
      sr.result_json->'rubricScore'->>'band'                        AS band,
      sr.result_json->'rubricScore'->'dimensionScores'              AS dimension_scores,
      -- Model & category classification
      sr.result_json->'modelClassification'->>'model_type_l1'       AS model_type_l1,
      sr.result_json->'modelClassification'->>'model_type_l2'       AS model_type_l2,
      sr.result_json->'categoryClassification'->>'category_primary' AS category_primary,
      -- Evidence coverage (formerly "observability")
      (sr.result_json->'observability'->>'confidenceScore')::int    AS evidence_confidence_score,
      sr.result_json->'observability'->>'level'                     AS evidence_coverage_level,
      -- Narrative signals
      sr.result_json->'rubricScore'->'strengths'                    AS strengths,
      sr.result_json->'rubricScore'->'weaknesses'                   AS weaknesses,
      -- Version
      sr.result_json->>'analysisVersion'                            AS analysis_version
    FROM benchmark_companies bc
    LEFT JOIN scan_results sr
      ON  sr.url_domain      = bc.domain
      AND sr.is_benchmark    = true
      AND sr.benchmark_month = p_month
      AND (sr.result_json->>'analysisVersion') NOT IN ('pending', 'error')
    WHERE bc.category = p_category
      AND bc.active   = true
    -- No LIMIT — return all companies; frontend caps display at top 8
    ORDER BY bc.sort_order
  ),
  -- Prior month label
  prior_month AS (
    SELECT to_char(
      to_date(p_month, 'YYYY-MM') - interval '1 month',
      'YYYY-MM'
    ) AS month_str
  ),
  -- Prior month scores for QoQ delta
  prior_scans AS (
    SELECT
      bc.domain,
      (sr.result_json->'rubricScore'->>'totalScore')::int   AS total_score,
      sr.result_json->'rubricScore'->'dimensionScores'      AS dimension_scores,
      sr.result_json->'rubricScore'->>'band'                AS band
    FROM benchmark_companies bc
    CROSS JOIN prior_month pm
    LEFT JOIN scan_results sr
      ON  sr.url_domain      = bc.domain
      AND sr.is_benchmark    = true
      AND sr.benchmark_month = pm.month_str
      AND (sr.result_json->>'analysisVersion') NOT IN ('pending', 'error')
    WHERE bc.category = p_category
      AND bc.active   = true
  )
  SELECT json_build_object(
    'category',    p_category,
    'month',       p_month,
    'prior_month', (SELECT month_str FROM prior_month),

    -- ── All companies (sorted by score desc) ─────────────────
    -- Frontend should display top 8 in the leaderboard and expose
    -- the rest via "Show all N" expansion.
    'companies', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            -- Identity
            'company_name',              cs.company_name,
            'domain',                    cs.domain,
            'notes',                     cs.notes,
            -- Current scores (raw + percentage)
            'total_score',               cs.total_score,
            'max_score',                 cs.max_score,
            'total_score_pct',           CASE WHEN cs.max_score > 0
                                           THEN round((cs.total_score::numeric / cs.max_score) * 100)
                                           ELSE NULL END,
            'band',                      cs.band,
            'dimension_scores',          cs.dimension_scores,
            -- Classification
            'model_type_l1',             cs.model_type_l1,
            'model_type_l2',             cs.model_type_l2,
            'category_primary',          cs.category_primary,
            -- Evidence coverage (renamed from observability in UI)
            'evidence_confidence_score', cs.evidence_confidence_score,
            'evidence_coverage_level',   cs.evidence_coverage_level,
            -- Narrative
            'strengths',                 cs.strengths,
            'weaknesses',                cs.weaknesses,
            -- Meta
            'analysis_version',          cs.analysis_version,
            'scanned_at',                cs.scanned_at,
            -- Prior month (raw + percentage)
            'prior_total_score',         ps.total_score,
            'prior_total_score_pct',     CASE WHEN ps.total_score IS NOT NULL AND cs.max_score > 0
                                           THEN round((ps.total_score::numeric / cs.max_score) * 100)
                                           ELSE NULL END,
            'prior_band',                ps.band,
            -- QoQ delta (raw points + percentage points)
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

    -- ── Category-level stats (ALL scanned companies) ──────────
    -- Used for Zone 3 (Category Pulse): avg score, band
    -- distribution, model type mix, prior-month comparison.
    -- Computed independently of the companies display list.
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
        -- Per-dimension averages across all scanned companies
        -- (for heatmap bottom row and category gap identification)
        'avg_score_pct_delta',  round(AVG(
                                  CASE WHEN cs.max_score > 0 AND ps.total_score IS NOT NULL
                                    THEN ((cs.total_score - ps.total_score)::numeric / cs.max_score) * 100
                                    ELSE NULL END
                                ))
      )
      FROM current_scans cs
      LEFT JOIN prior_scans ps ON ps.domain = cs.domain
    ),

    -- ── Run status log ────────────────────────────────────────
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
$$;
