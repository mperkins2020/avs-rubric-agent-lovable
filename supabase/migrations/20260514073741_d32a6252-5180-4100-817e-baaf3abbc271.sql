CREATE OR REPLACE FUNCTION public.upsert_scan_result_cache(p_url_domain text, p_result_json jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    INSERT INTO public.scan_results (url_domain, result_json, is_benchmark, expires_at)
    VALUES (lower(p_url_domain), p_result_json, false, now() + interval '7 days')
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.scan_results
    SET result_json = p_result_json,
        expires_at  = now() + interval '7 days'
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$$;