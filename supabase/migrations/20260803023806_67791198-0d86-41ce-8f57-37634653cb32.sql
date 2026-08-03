DELETE FROM public.scan_results WHERE url_domain = 'otterly.ai';
DELETE FROM public.benchmark_run_log WHERE run_month = '2026-07' AND category = 'Marketing Intelligence' AND domain = 'otterly.ai';
UPDATE public.benchmark_companies SET active = true WHERE domain = 'otterly.ai';