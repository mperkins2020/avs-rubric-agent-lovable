REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.scan_results FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.scan_results FROM authenticated;
GRANT SELECT ON public.scan_results TO anon;
GRANT SELECT ON public.scan_results TO authenticated;
GRANT ALL ON public.scan_results TO service_role;