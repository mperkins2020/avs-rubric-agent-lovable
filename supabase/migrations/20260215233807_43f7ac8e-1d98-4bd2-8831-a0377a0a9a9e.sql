
-- Tighten report_feedback INSERT policy
DROP POLICY "Anyone can insert feedback" ON public.report_feedback;
CREATE POLICY "Authenticated users can insert feedback"
  ON public.report_feedback
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Tighten evidence_misses INSERT policy
DROP POLICY "Allow inserts to evidence_misses" ON public.evidence_misses;
CREATE POLICY "Authenticated users can insert evidence_misses"
  ON public.evidence_misses
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
