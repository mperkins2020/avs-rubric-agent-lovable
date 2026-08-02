UPDATE benchmark_companies SET active = (domain = 'athenahq.ai') WHERE category = 'Marketing Intelligence';
DELETE FROM benchmark_run_log WHERE run_month='2026-07' AND category='Marketing Intelligence' AND domain='athenahq.ai';
DELETE FROM scan_results WHERE url_domain='athenahq.ai';