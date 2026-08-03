UPDATE public.benchmark_companies SET active = (domain = 'athenahq.ai') WHERE category = 'Marketing Intelligence';
DELETE FROM public.benchmark_run_log WHERE run_month = '2026-07' AND category = 'Marketing Intelligence' AND domain = 'athenahq.ai';
DELETE FROM public.scan_results WHERE url_domain = 'athenahq.ai';