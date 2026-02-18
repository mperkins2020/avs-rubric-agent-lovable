
-- Create scan_usage table to track scans per user per week
CREATE TABLE public.scan_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  scanned_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;

-- Users can insert their own usage records
CREATE POLICY "Users can insert own scan usage"
  ON public.scan_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own usage records
CREATE POLICY "Users can view own scan usage"
  ON public.scan_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for fast weekly lookup
CREATE INDEX idx_scan_usage_user_week ON public.scan_usage (user_id, created_at);
