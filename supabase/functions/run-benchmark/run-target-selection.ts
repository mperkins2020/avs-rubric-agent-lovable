// Pure, dependency-free TS (no Deno-only APIs) — same rationale as
// scrape-job-correlation.ts / retry-budget.ts's header comments: directly
// importable by both index.ts (Deno) and vitest (Node).

/**
 * Controlled-subset execution support for EXP-1 (measurement-stability
 * testing) without a separate execution implementation. `index.ts`'s
 * request handler resolves candidates from `benchmark_companies` and
 * `benchmark_run_log`, then calls the two pure functions here to decide
 * (a) whether every requested domain actually resolved, and (b) which
 * resolved companies should be queued vs. skipped and why. Every queued
 * company still flows through the exact same processCompany() path as a
 * full run — this module only decides the input list, nothing about how
 * a company is processed once selected.
 */

export interface CandidateCompany {
  domain: string;
  company_name: string;
  category: string;
  sort_order: number;
}

export interface RunLogEntry {
  domain: string;
  status: string;
}

export interface RunTargetOptions {
  /** Explicit domain subset. Absent/empty = unfiltered full-edition run. */
  domains?: string[];
  /**
   * Only meaningful when `domains` is non-empty. Bypasses the 'complete'
   * skip ONLY for domains in that explicit list — never a global
   * idempotency override. A domain whose last logged status is 'error' is
   * never auto-rerun by this flag; a domain still 'pending' is never
   * duplicated by it either — both are always skipped/reported, not
   * silently re-queued.
   */
  rerunCompleted?: boolean;
}

export interface RunTargetSelection {
  toProcess: CandidateCompany[];
  /** Domains skipped because their last logged run for this month was 'complete' and rerun wasn't requested for them. */
  skippedComplete: string[];
  /** Domains skipped because their last logged run for this month was 'error' — never auto-rerun. */
  skippedError: string[];
  /** Domains skipped because a run is already in flight ('pending') for this month — never duplicated. */
  skippedInProgress: string[];
}

/**
 * `rerun_completed` only ever makes sense against an explicit, bounded
 * subset — applying it with no `domains` would mean "silently re-run
 * everything already complete for this edition", which defeats the whole
 * point of a controlled, narrowly-scoped rerun. `true` means the request
 * is invalid and should be rejected before anything else runs.
 */
export function isRerunWithoutDomainsInvalid(hasDomains: boolean, rerunCompleted: boolean | undefined): boolean {
  return !!rerunCompleted && !hasDomains;
}

/**
 * Given the domains explicitly requested and the companies that actually
 * resolved (already scoped to category + benchmark_month + active by the
 * caller's query), returns which requested domains did NOT resolve — e.g.
 * a domain that only exists in a different edition (May's `github.com` vs.
 * September's `github.com/features/copilot`), or a plain typo. An empty
 * result means every requested domain resolved.
 */
export function findUnresolvedDomains(
  requestedDomains: string[],
  resolvedCompanies: CandidateCompany[],
): string[] {
  const resolved = new Set(resolvedCompanies.map((c) => c.domain));
  return requestedDomains.filter((d) => !resolved.has(d));
}

/**
 * Splits `companies` into what should be queued vs. skipped (and why),
 * given the current `benchmark_run_log` state for this run_month.
 *
 * Unfiltered (no `domains`): reproduces the pre-existing behavior exactly
 * — only 'complete'/'error' are skipped; 'pending' is not specially
 * guarded here (that's pre-existing full-run behavior, intentionally left
 * unchanged by this feature).
 *
 * Domain-scoped: adds the pending/in-flight guard and the narrowly-scoped
 * rerun_completed bypass described on RunTargetOptions.
 */
export function selectRunTargets(
  companies: CandidateCompany[],
  existingLogs: RunLogEntry[],
  options: RunTargetOptions,
): RunTargetSelection {
  const hasDomains = Array.isArray(options.domains) && options.domains.length > 0;
  const toProcess: CandidateCompany[] = [];
  const skippedComplete: string[] = [];
  const skippedError: string[] = [];
  const skippedInProgress: string[] = [];

  if (hasDomains) {
    const statusByDomain = new Map(existingLogs.map((l) => [l.domain, l.status]));
    const rerunSet = new Set(options.rerunCompleted ? options.domains : []);
    for (const company of companies) {
      const status = statusByDomain.get(company.domain);
      if (status === 'pending') {
        skippedInProgress.push(company.domain);
        continue;
      }
      if (status === 'error') {
        skippedError.push(company.domain);
        continue;
      }
      if (status === 'complete' && !rerunSet.has(company.domain)) {
        skippedComplete.push(company.domain);
        continue;
      }
      toProcess.push(company);
    }
  } else {
    const skipStatuses = new Set(['complete', 'error']);
    const skippedSet = new Set(
      existingLogs.filter((l) => skipStatuses.has(l.status)).map((l) => l.domain),
    );
    for (const company of companies) {
      if (!skippedSet.has(company.domain)) toProcess.push(company);
    }
    // Reporting only — does not affect toProcess above, just correctly
    // labels why each already-skipped domain was skipped.
    for (const log of existingLogs) {
      if (log.status === 'complete') skippedComplete.push(log.domain);
      else if (log.status === 'error') skippedError.push(log.domain);
    }
  }

  return { toProcess, skippedComplete, skippedError, skippedInProgress };
}
