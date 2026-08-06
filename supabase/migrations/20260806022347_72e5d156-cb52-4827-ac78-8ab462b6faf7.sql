UPDATE benchmark_companies SET active = false WHERE category = 'Marketing Intelligence';

UPDATE benchmark_companies SET active = true WHERE category = 'Marketing Intelligence' AND domain IN ('peec.ai', 'conductor.com');

UPDATE scan_results SET expires_at = now() - interval '1 day' WHERE url_domain IN ('peec.ai', 'conductor.com');

DELETE FROM benchmark_run_log WHERE run_month = '2026-08' AND category = 'Marketing Intelligence' AND domain IN ('peec.ai', 'conductor.com');