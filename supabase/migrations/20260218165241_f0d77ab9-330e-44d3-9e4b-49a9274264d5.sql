-- Add explicit DELETE deny policies for defense-in-depth
-- profiles: prevent users from deleting profiles
CREATE POLICY "Users cannot delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (false);

-- scan_usage: prevent deletion of usage records (protects rate limiting integrity)
CREATE POLICY "No deletes on scan_usage"
ON public.scan_usage FOR DELETE
USING (false);

-- report_feedback: prevent deletion of feedback records
CREATE POLICY "No deletes on report_feedback"
ON public.report_feedback FOR DELETE
USING (false);

-- evidence_misses: prevent deletion of evidence records
CREATE POLICY "No deletes on evidence_misses"
ON public.evidence_misses FOR DELETE
USING (false);