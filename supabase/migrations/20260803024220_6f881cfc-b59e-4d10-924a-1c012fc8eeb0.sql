DELETE FROM public.scan_results WHERE url_domain = 'tryprofound.com';
DELETE FROM public.benchmark_run_log WHERE domain = 'tryprofound.com' AND run_month = '2026-07';
UPDATE public.benchmark_companies SET active = (domain = 'tryprofound.com') WHERE category = 'Marketing Intelligence';