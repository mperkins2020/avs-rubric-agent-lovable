
CREATE TABLE public.report_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Public table, no auth required - anyone who generates a report can leave feedback
ALTER TABLE public.report_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback"
  ON public.report_feedback
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "No public reads"
  ON public.report_feedback
  FOR SELECT
  USING (false);
