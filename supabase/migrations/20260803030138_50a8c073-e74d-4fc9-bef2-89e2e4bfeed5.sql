DELETE FROM public.scan_results WHERE url_domain ILIKE '%botify%';
DELETE FROM public.benchmark_run_log WHERE domain ILIKE '%botify%';
UPDATE public.benchmark_companies SET active = false WHERE category = 'Marketing Intelligence';
UPDATE public.benchmark_companies SET active = true WHERE domain ILIKE '%botify%';