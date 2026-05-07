UPDATE scan_results SET is_benchmark = true, benchmark_month = '2026-05' WHERE id = '59dc6d0f-313c-40f6-8cf8-c345980e34bb';

UPDATE benchmark_run_log SET scan_result_id = '70a10535-af3c-46f5-816a-630101002e98' WHERE run_month = '2026-05' AND domain = 'github.com/features/copilot';

UPDATE benchmark_run_log SET scan_result_id = '59dc6d0f-313c-40f6-8cf8-c345980e34bb' WHERE run_month = '2026-05' AND domain = 'jetbrains.com/store';

UPDATE benchmark_companies SET domain = 'aws.amazon.com/q/developer/pricing' WHERE category = 'AI Coding Assistant' AND domain = 'aws.amazon.com/q/developer';

UPDATE benchmark_run_log SET domain = 'aws.amazon.com/q/developer/pricing', status = 'pending', error_message = NULL, completed_at = NULL, scan_result_id = NULL, started_at = now() WHERE run_month = '2026-05' AND domain = 'aws.amazon.com/q/developer';