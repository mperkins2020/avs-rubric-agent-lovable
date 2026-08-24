// Pure, dependency-free TS (no Deno-only APIs) — same rationale as
// coverage-signals.ts / rubric-audit.ts / json-repair.ts's header comments:
// directly importable by both index.ts (Deno) and vitest (Node).

/**
 * Entry 090 (2026-08-24) — Gate 0 Action 2C blocker remediation.
 *
 * scrape-website previously had no awareness of its own accumulated
 * execution time anywhere in its retry/backoff logic: the main-page retry
 * loop, the domain-map retry, each page's individual rate-limit retry, and
 * Fix 2's per-URL-per-variant retry chain each independently decided
 * "rate-limited? wait 12s and retry once" with zero knowledge of how much
 * wall-clock time the invocation had already spent. Under sustained
 * Firecrawl rate-limiting these compounded (confirmed live, Entry 089:
 * ~10 separate 12s waits across one invocation) past Supabase's platform
 * connection-lifetime ceiling, silently discarding completed work when the
 * connection was severed before the synchronous response could return.
 *
 * The PRIMARY fix (index.ts) is moving scrape-website to the same
 * background-job + polling pattern analyze-company already has, which
 * removes the hard synchronous deadline entirely. This module is the
 * defensive backstop that remains valuable even with background execution:
 * an overall time budget so a persistently-rate-limited or degraded
 * Firecrawl can't cause one invocation to retry indefinitely.
 */

/**
 * A generous ceiling on total scrape-website execution time, including all
 * retries/backoffs. Deliberately NOT tuned to fit inside any HTTP response
 * window (index.ts's background-job pattern removes that pressure) —
 * this exists only to bound genuinely pathological cases (Firecrawl
 * degraded for minutes at a time), not to trade away evidence depth for
 * speed under normal/expected rate-limiting. Set comfortably under
 * run-benchmark's own per-company POLL_TIMEOUT_MS (300_000ms) so a
 * scrape-website job that hits this ceiling still leaves analyze-company
 * time to run afterward within run-benchmark's overall budget.
 */
export const SCRAPE_RETRY_BUDGET_MS = 240_000; // 4 minutes

/**
 * Whether a rate-limited attempt is still worth waiting-and-retrying,
 * given how much time this invocation has already spent. Does NOT decide
 * whether an attempt IS rate-limited (that's the caller's own detection,
 * unchanged) — only whether spending another ~12s waiting is still
 * reasonable, or whether the invocation should accept the current result
 * (treat as a miss) and move on rather than compounding further.
 *
 * `nowMs` is an injectable clock for deterministic testing; defaults to
 * the real clock in production.
 */
export function hasRetryBudgetRemaining(
  invocationStartedAtMs: number,
  budgetMs: number = SCRAPE_RETRY_BUDGET_MS,
  nowMs: number = Date.now(),
): boolean {
  return nowMs - invocationStartedAtMs < budgetMs;
}
