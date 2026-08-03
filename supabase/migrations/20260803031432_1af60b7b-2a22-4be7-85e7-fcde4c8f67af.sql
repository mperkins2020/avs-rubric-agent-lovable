UPDATE public.benchmark_companies SET active = (domain = 'scrunch.com') WHERE category = 'Marketing Intelligence';
DELETE FROM public.benchmark_run_log WHERE run_month = '2026-07' AND domain = 'scrunch.com';
DELETE FROM public.scan_results WHERE url_domain = 'scrunch.com';