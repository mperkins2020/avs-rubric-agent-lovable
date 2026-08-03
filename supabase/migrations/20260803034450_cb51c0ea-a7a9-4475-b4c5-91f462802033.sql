UPDATE public.benchmark_companies SET active = false WHERE category = 'Marketing Intelligence';
UPDATE public.benchmark_companies SET active = true WHERE domain = 'scrunch.com';
DELETE FROM public.benchmark_run_log WHERE run_month = '2026-07' AND domain = 'scrunch.com';
DELETE FROM public.scan_results WHERE url_domain = 'scrunch.com';