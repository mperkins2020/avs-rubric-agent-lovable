-- RPC for clients to persist re-analysis results back into scan_results.
-- The analyze-company edge function does not write rerun results to cache,
-- so the client calls this after a successful rescore to overwrite the
-- latest non-benchmark row for the given domain.
CREATE OR REPLACE FUNCTION public.update_scan_result_cache(
  p_url_domain text,
  p_result_json jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_url_domain IS NULL OR length(trim(p_url_domain)) = 0 THEN
    RAISE EXCEPTION 'url_domain is required';
  END IF;

  IF p_result_json IS NULL THEN
    RAISE EXCEPTION 'result_json is required';
  END IF;

  SELECT id INTO v_id
  FROM public.scan_results
  WHERE lower(url_domain) = lower(p_url_domain)
    AND (is_benchmark IS NULL OR is_benchmark = false)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.scan_results
  SET result_json = p_result_json,
      expires_at  = now() + interval '7 days'
  WHERE id = v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_scan_result_cache(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_scan_result_cache(text, jsonb) TO authenticated;