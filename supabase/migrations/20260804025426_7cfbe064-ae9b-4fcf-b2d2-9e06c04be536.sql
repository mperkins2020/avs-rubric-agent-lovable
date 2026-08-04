UPDATE benchmark_companies SET active = true WHERE category = 'Marketing Intelligence';

DELETE FROM benchmark_run_log WHERE domain LIKE 'hubspot.com%' AND run_month = '2026-08';

UPDATE scan_results SET expires_at = now() - interval '1 day' WHERE url_domain = 'hubspot.com';

UPDATE benchmark_companies SET active = false WHERE category = 'Marketing Intelligence' AND domain NOT LIKE 'hubspot.com%';