// Pure, dependency-free TS (no Deno-only APIs) — same rationale as
// retry-budget.ts / coverage-signals.ts / rubric-audit.ts's header
// comments: directly importable by both index.ts (Deno) and vitest (Node).

/**
 * Root-cause fix for the scrape-job correlation bug identified after Entry
 * 090 shipped: run-benchmark's original pollForScrapeResult() looked up a
 * scrape_jobs row by `requested_url` + `created_at >= scrapeStartedAt`,
 * where `scrapeStartedAt` was captured AFTER the 202 response came back.
 * But scrape-website inserts the scrape_jobs row (or finds an existing
 * pending one, on the dedup path) BEFORE it returns 202 — so the row's
 * `created_at` is always strictly earlier than `scrapeStartedAt`, and the
 * `gte` filter excluded the actual job on every poll iteration until
 * timeout. The dedup path was worse: an existing pending job can predate
 * the current request by an arbitrary amount.
 *
 * No timestamp can fix this correctly — the row legitimately predates the
 * response that reports it. The fix is identity, not timing: scrape-website
 * now returns the durable `scrape_jobs.id` in its 202 body for both the
 * new-job and deduplicated-existing-job paths, and run-benchmark polls that
 * exact row by primary key. A job found this way cannot be a different,
 * unrelated, or stale job — `id` is the table's primary key, so `WHERE id =
 * jobId` returns at most the one row that job creation (or dedup lookup)
 * actually reported, regardless of when it was created relative to when
 * this function starts polling.
 */

export type ScrapeJobStatus = 'pending' | 'complete' | 'error';

export interface ScrapeJobRow {
  status: ScrapeJobStatus;
  result_json: Record<string, unknown> | null;
  error_message: string | null;
}

export type ScrapeJobOutcome =
  | { status: 'complete'; result: Record<string, unknown> }
  | { status: 'error'; error: string }
  | { status: 'pending' };

/**
 * Interprets a single fetched scrape_jobs row for the exact job_id being
 * polled. Pure — no I/O, no timing, no identity logic (that's the caller's
 * WHERE id = jobId query). `row` is `null` when the row isn't found (or not
 * yet visible) — treated the same as 'pending': keep polling, not an error,
 * since the insert this ID came from already succeeded synchronously
 * before the caller ever received it.
 */
export function interpretScrapeJobRow(row: ScrapeJobRow | null): ScrapeJobOutcome {
  if (!row) return { status: 'pending' };
  if (row.status === 'complete') return { status: 'complete', result: row.result_json ?? {} };
  if (row.status === 'error') return { status: 'error', error: row.error_message ?? 'Scrape failed' };
  return { status: 'pending' };
}

export type ScrapeJobPollOutcome =
  | { status: 'complete'; result: Record<string, unknown> }
  | { status: 'error'; error: string }
  | { status: 'timeout' };

export interface ScrapeJobPollOptions {
  pollIntervalMs: number;
  timeoutMs: number;
  /** Injectable for deterministic tests — defaults to a real setTimeout-based sleep. */
  sleep?: (ms: number) => Promise<void>;
  /** Injectable clock for deterministic tests — defaults to Date.now. */
  now?: () => number;
}

/**
 * Polls `fetchRow(jobId)` until the job reaches a terminal state or the
 * deadline passes. `fetchRow` is called with ONLY the job ID being polled —
 * by construction, it cannot return a different job's row, which is what
 * makes this immune to the "unrelated/stale job" failure mode the previous
 * timestamp-based lookup had (that filtered a shared table by time, which
 * could in principle match the wrong row; this looks up one row by its own
 * primary key, which cannot).
 */
export async function pollScrapeJob(
  jobId: string,
  fetchRow: (jobId: string) => Promise<ScrapeJobRow | null>,
  options: ScrapeJobPollOptions,
): Promise<ScrapeJobPollOutcome> {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const deadline = now() + options.timeoutMs;
  while (now() < deadline) {
    await sleep(options.pollIntervalMs);
    const row = await fetchRow(jobId);
    const outcome = interpretScrapeJobRow(row);
    if (outcome.status === 'complete' || outcome.status === 'error') return outcome;
    // 'pending' — keep polling
  }
  return { status: 'timeout' };
}
