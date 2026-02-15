
-- Drop overly permissive policy
DROP POLICY "Allow service role to manage evidence_misses" ON public.evidence_misses;

-- Only allow inserts (edge functions use service role which bypasses RLS, but this is defense-in-depth)
CREATE POLICY "Allow inserts to evidence_misses"
ON public.evidence_misses
FOR INSERT
WITH CHECK (true);

-- No select/update/delete for anon users
CREATE POLICY "No public reads on evidence_misses"
ON public.evidence_misses
FOR SELECT
USING (false);
