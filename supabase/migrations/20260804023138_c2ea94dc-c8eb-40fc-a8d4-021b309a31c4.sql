DELETE FROM benchmark_run_log WHERE domain IN ('otterly.ai','tryprofound.com') AND run_month = '2026-08';

UPDATE scan_results SET expires_at = now() - interval '1 day' WHERE url_domain IN ('otterly.ai','tryprofound.com');

UPDATE benchmark_companies SET active = false WHERE category = 'Marketing Intelligence';

UPDATE benchmark_companies SET active = true WHERE category = 'Marketing Intelligence' AND domain IN ('otterly.ai','tryprofound.com');