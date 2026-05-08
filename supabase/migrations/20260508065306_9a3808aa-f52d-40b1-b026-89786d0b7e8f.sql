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
      bc.notes,
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
    LEFT JOIN benchmark_run_log brl
      ON  brl.domain    = bc.domain
      AND brl.category  = bc.category
      AND brl.run_month = p_month
      AND brl.status    = 'complete'
      AND brl.scan_result_id IS NOT NULL
    LEFT JOIN scan_results sr
      ON  sr.id = brl.scan_result_id
      AND (sr.result_json->>'analysisVersion') NOT IN ('pending', 'error')
    WHERE bc.category = p_category
      AND bc.active   = true
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
      sr.result_json->'rubricScore'->'dimensionScores'      AS dimension_scores,
      sr.result_json->'rubricScore'->>'band'                AS band
    FROM benchmark_companies bc
    CROSS JOIN prior_month pm
    LEFT JOIN benchmark_run_log brl
      ON  brl.domain    = bc.domain
      AND brl.category  = bc.category
      AND brl.run_month = pm.month_str
      AND brl.status    = 'complete'
      AND brl.scan_result_id IS NOT NULL
    LEFT JOIN scan_results sr
      ON  sr.id = brl.scan_result_id
      AND (sr.result_json->>'analysisVersion') NOT IN ('pending', 'error')
    WHERE bc.category = p_category
      AND bc.active   = true
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
            'notes',                     cs.notes,
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