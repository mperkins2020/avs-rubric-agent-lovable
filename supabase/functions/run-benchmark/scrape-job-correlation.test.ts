import { describe, it, expect, vi } from 'vitest';
import { interpretScrapeJobRow, pollScrapeJob, type ScrapeJobRow } from './scrape-job-correlation.ts';

// Deterministic fake clock/sleep — advances instantly, no real waiting, so
// the poll-loop tests below run in milliseconds regardless of the
// pollIntervalMs/timeoutMs values they exercise.
function fakeClock(startMs = 0) {
  let current = startMs;
  const now = () => current;
  const sleep = async (ms: number) => {
    current += ms;
  };
  return { now, sleep };
}

describe('interpretScrapeJobRow', () => {
  it('row not found (or not yet visible) is treated as pending, not an error', () => {
    expect(interpretScrapeJobRow(null)).toEqual({ status: 'pending' });
  });

  it('a still-pending row stays pending', () => {
    const row: ScrapeJobRow = { status: 'pending', result_json: null, error_message: null };
    expect(interpretScrapeJobRow(row)).toEqual({ status: 'pending' });
  });

  it('completed job → result returned correctly (regression #3)', () => {
    const row: ScrapeJobRow = {
      status: 'complete',
      result_json: { success: true, pages: [{ url: 'https://example.com' }] },
      error_message: null,
    };
    expect(interpretScrapeJobRow(row)).toEqual({
      status: 'complete',
      result: { success: true, pages: [{ url: 'https://example.com' }] },
    });
  });

  it('a completed row with a null result_json still resolves (defensive default), not a crash', () => {
    const row: ScrapeJobRow = { status: 'complete', result_json: null, error_message: null };
    expect(interpretScrapeJobRow(row)).toEqual({ status: 'complete', result: {} });
  });

  it('failed job → failure propagated correctly (regression #4)', () => {
    const row: ScrapeJobRow = { status: 'error', result_json: null, error_message: 'Firecrawl rate limited' };
    expect(interpretScrapeJobRow(row)).toEqual({ status: 'error', error: 'Firecrawl rate limited' });
  });

  it('a failed row with no error_message still reports a usable, non-empty error', () => {
    const row: ScrapeJobRow = { status: 'error', result_json: null, error_message: null };
    expect(interpretScrapeJobRow(row)).toEqual({ status: 'error', error: 'Scrape failed' });
  });
});

describe('pollScrapeJob — new job inserted before the 202 response (regression #1)', () => {
  it('finds the correct job by ID even though its row predates the polling loop starting', async () => {
    // Simulates the exact bug scenario: the row's created_at is earlier
    // than when polling begins (unrepresented here at all, deliberately —
    // interpretScrapeJobRow never looks at created_at). fetchRow only
    // succeeds for the one ID this job actually has.
    const jobId = 'job-new-123';
    const table = new Map<string, ScrapeJobRow>([
      [jobId, { status: 'complete', result_json: { success: true, pages: [] }, error_message: null }],
    ]);
    const fetchRow = vi.fn(async (id: string) => table.get(id) ?? null);
    const { now, sleep } = fakeClock();

    const outcome = await pollScrapeJob(jobId, fetchRow, { pollIntervalMs: 8000, timeoutMs: 300000, now, sleep });

    expect(outcome).toEqual({ status: 'complete', result: { success: true, pages: [] } });
    expect(fetchRow).toHaveBeenCalledWith(jobId);
  });

  it('keeps polling across several pending iterations before resolving', async () => {
    const jobId = 'job-slow-456';
    let callCount = 0;
    const fetchRow = vi.fn(async (id: string) => {
      callCount++;
      if (id !== jobId) return null;
      if (callCount < 3) return { status: 'pending', result_json: null, error_message: null } as ScrapeJobRow;
      return { status: 'complete', result_json: { success: true, pages: ['p1'] }, error_message: null } as ScrapeJobRow;
    });
    const { now, sleep } = fakeClock();

    const outcome = await pollScrapeJob(jobId, fetchRow, { pollIntervalMs: 8000, timeoutMs: 300000, now, sleep });

    expect(outcome).toEqual({ status: 'complete', result: { success: true, pages: ['p1'] } });
    expect(callCount).toBe(3);
  });

  it('times out cleanly (not an exception) if the job never reaches a terminal state', async () => {
    const jobId = 'job-never-completes';
    const fetchRow = vi.fn(async () => ({ status: 'pending', result_json: null, error_message: null } as ScrapeJobRow));
    const { now, sleep } = fakeClock();

    const outcome = await pollScrapeJob(jobId, fetchRow, { pollIntervalMs: 8000, timeoutMs: 24000, now, sleep });

    expect(outcome).toEqual({ status: 'timeout' });
  });
});

describe('pollScrapeJob — deduplicated existing pending job (regression #2)', () => {
  it('resolves correctly for a job that was already pending well before this request, with no lookback window involved', async () => {
    // The dedup path can hand back a job_id for a row created arbitrarily
    // long ago. Nothing in pollScrapeJob or interpretScrapeJobRow ever
    // reads a timestamp, so "how old" the row is cannot affect the outcome
    // — this test uses the same mechanism as any other job on purpose, to
    // demonstrate there is no separate/weaker code path for the dedup case.
    const dedupedJobId = 'job-existing-pending-from-ages-ago';
    const table = new Map<string, ScrapeJobRow>([
      [dedupedJobId, { status: 'complete', result_json: { success: true, pages: ['a', 'b'] }, error_message: null }],
    ]);
    const fetchRow = async (id: string) => table.get(id) ?? null;
    const { now, sleep } = fakeClock();

    const outcome = await pollScrapeJob(dedupedJobId, fetchRow, { pollIntervalMs: 8000, timeoutMs: 300000, now, sleep });

    expect(outcome).toEqual({ status: 'complete', result: { success: true, pages: ['a', 'b'] } });
  });
});

describe('pollScrapeJob — unrelated/stale jobs cannot be mistaken for the requested job (regression #5)', () => {
  it('only ever returns the outcome for the exact job_id polled, regardless of what else is in the table', async () => {
    const requestedJobId = 'job-the-one-we-want';
    const table = new Map<string, ScrapeJobRow>([
      // An unrelated job for a DIFFERENT company, already complete —
      // under the old requested_url + created_at>=X bug class this kind of
      // row is exactly what a broad filter could accidentally match.
      ['job-unrelated-other-company', { status: 'complete', result_json: { success: true, pages: ['wrong'] }, error_message: null }],
      // A stale, long-abandoned job that errored out.
      ['job-stale-abandoned', { status: 'error', result_json: null, error_message: 'stale failure' }],
      // The actual job being polled — still pending on the first check.
      [requestedJobId, { status: 'pending', result_json: null, error_message: null }],
    ]);
    let pollCount = 0;
    const fetchRow = async (id: string) => {
      if (id === requestedJobId) {
        pollCount++;
        if (pollCount < 2) return table.get(id) ?? null;
        // Only becomes complete on the second poll of the CORRECT id.
        return { status: 'complete', result_json: { success: true, pages: ['correct'] }, error_message: null } as ScrapeJobRow;
      }
      return table.get(id) ?? null;
    };
    const { now, sleep } = fakeClock();

    const outcome = await pollScrapeJob(requestedJobId, fetchRow, { pollIntervalMs: 8000, timeoutMs: 300000, now, sleep });

    expect(outcome).toEqual({ status: 'complete', result: { success: true, pages: ['correct'] } });
  });

  it('fetchRow is invoked only with the requested job_id, never with any other id from the table', async () => {
    const requestedJobId = 'job-under-test';
    const otherIds = ['job-other-1', 'job-other-2', 'job-other-3'];
    const seenIds = new Set<string>();
    const fetchRow = vi.fn(async (id: string) => {
      seenIds.add(id);
      if (id === requestedJobId) {
        return { status: 'complete', result_json: { success: true, pages: [] }, error_message: null } as ScrapeJobRow;
      }
      return null;
    });
    const { now, sleep } = fakeClock();

    await pollScrapeJob(requestedJobId, fetchRow, { pollIntervalMs: 8000, timeoutMs: 300000, now, sleep });

    expect([...seenIds]).toEqual([requestedJobId]);
    for (const otherId of otherIds) {
      expect(seenIds.has(otherId)).toBe(false);
    }
  });
});

describe('pollScrapeJob — behavior unrelated to this fix stays unchanged (regression #6)', () => {
  it('a job already complete on the very first poll resolves immediately, without needing repeated pending iterations', async () => {
    // This is the closest pure-logic analogue to "existing synchronous/
    // completed behavior is unchanged": a job that's done by the time
    // polling starts resolves on the first check, same as before this fix
    // — the only thing that changed is HOW the row is looked up (by id,
    // not by url+timestamp), not the terminal-state handling itself.
    const jobId = 'job-already-done';
    const fetchRow = vi.fn(async () => ({
      status: 'complete',
      result_json: { success: true, pages: ['already-there'] },
      error_message: null,
    } as ScrapeJobRow));
    const { now, sleep } = fakeClock();

    const outcome = await pollScrapeJob(jobId, fetchRow, { pollIntervalMs: 8000, timeoutMs: 300000, now, sleep });

    expect(outcome).toEqual({ status: 'complete', result: { success: true, pages: ['already-there'] } });
    expect(fetchRow).toHaveBeenCalledTimes(1);
  });

  // pollForScanResult (analyze-company's polling, in index.ts) is untouched
  // by this fix — it already sets its correlation timestamp BEFORE any
  // fetch call, not after receiving a 202, so it never had this bug class.
  // Verified by inspection/diff, not re-tested here: this fix's scope is
  // scrape_jobs correlation only.
});
