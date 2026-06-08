
-- Fix 1: Restrict scan_results SELECT so anonymous/authenticated users can only read benchmark rows.
-- Non-benchmark scans are written/read by edge functions via service_role and don't need direct client reads.
DROP POLICY IF EXISTS "Authenticated users can read cached results" ON public.scan_results;

CREATE POLICY "Authenticated users can read benchmark results"
  ON public.scan_results
  FOR SELECT
  TO authenticated
  USING (is_benchmark = true);

-- Fix 2: Hide internal analyst notes on benchmark_companies from public/client reads.
-- The get_benchmark_data RPC (security definer) can still access it; column-level revoke
-- prevents anon/authenticated from selecting the notes column directly via PostgREST.
REVOKE SELECT (notes) ON public.benchmark_companies FROM anon, authenticated;
