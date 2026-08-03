UPDATE public.benchmark_companies
SET active = true
WHERE category = 'Marketing Intelligence'
  AND domain <> 'sparktoro.com';