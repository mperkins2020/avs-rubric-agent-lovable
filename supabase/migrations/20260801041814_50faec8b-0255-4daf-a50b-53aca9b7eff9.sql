ALTER TABLE public.benchmark_companies DROP CONSTRAINT benchmark_companies_category_check;
ALTER TABLE public.benchmark_companies ADD CONSTRAINT benchmark_companies_category_check CHECK (category IN (
  'AI Customer Support','AI Agent Platform','AI Coding Assistant',
  'AI Sales Intelligence','AI Revenue Intelligence','AI Legal',
  'AI Dev Infrastructure','AI Speech Platform','AI Healthcare',
  'AI Video & Podcast','Marketing Intelligence'
));