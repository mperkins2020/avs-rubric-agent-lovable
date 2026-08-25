import { describe, it, expect } from 'vitest';
import {
  findUnresolvedDomains,
  isRerunWithoutDomainsInvalid,
  selectRunTargets,
  type CandidateCompany,
  type RunLogEntry,
} from './run-target-selection.ts';

function company(domain: string, sort_order: number, name = domain): CandidateCompany {
  return { domain, company_name: name, category: 'AI Coding Assistant', sort_order };
}

// A representative slice of the actual frozen September roster (subset —
// full 14 not needed to exercise the logic).
const septemberCompanies: CandidateCompany[] = [
  company('lovable.dev', 2, 'Lovable'),
  company('github.com/features/copilot', 5, 'GitHub Copilot'),
  company('claude.com/product/claude-code', 13, 'Claude Code'),
  company('chatgpt.com/codex', 14, 'Codex'),
];

describe('selectRunTargets — no domains (regression #1, #6)', () => {
  it('unfiltered request queues every company with no prior log entry', () => {
    const result = selectRunTargets(septemberCompanies, [], {});
    expect(result.toProcess).toEqual(septemberCompanies);
    expect(result.skippedComplete).toEqual([]);
    expect(result.skippedError).toEqual([]);
    expect(result.skippedInProgress).toEqual([]);
  });

  it('completed company + normal (unfiltered) request → skipped as today, unchanged behavior (regression #6)', () => {
    const logs: RunLogEntry[] = [{ domain: 'lovable.dev', status: 'complete' }];
    const result = selectRunTargets(septemberCompanies, logs, {});
    expect(result.toProcess.map((c) => c.domain)).not.toContain('lovable.dev');
    expect(result.skippedComplete).toEqual(['lovable.dev']);
    expect(result.toProcess).toHaveLength(3);
  });

  it('errored company is also skipped, unfiltered, same as before this feature', () => {
    const logs: RunLogEntry[] = [{ domain: 'chatgpt.com/codex', status: 'error' }];
    const result = selectRunTargets(septemberCompanies, logs, {});
    expect(result.toProcess.map((c) => c.domain)).not.toContain('chatgpt.com/codex');
    expect(result.skippedError).toEqual(['chatgpt.com/codex']);
  });

  it('a pending company is NOT specially guarded in the unfiltered path — pre-existing behavior, deliberately unchanged', () => {
    const logs: RunLogEntry[] = [{ domain: 'lovable.dev', status: 'pending' }];
    const result = selectRunTargets(septemberCompanies, logs, {});
    // Matches the exact pre-existing skipStatuses = {complete, error} logic —
    // 'pending' was never skipped by the unfiltered path before this change
    // and must not become skipped here, or full-run behavior would differ.
    expect(result.toProcess.map((c) => c.domain)).toContain('lovable.dev');
    expect(result.skippedInProgress).toEqual([]);
  });
});

describe('selectRunTargets — explicit domains (regression #2, #3)', () => {
  it('one valid domain → only that company selected', () => {
    // Caller's DB query has already scoped `companies` to the requested
    // domain(s) within this edition — this test reflects that contract.
    const scoped = septemberCompanies.filter((c) => c.domain === 'lovable.dev');
    const result = selectRunTargets(scoped, [], { domains: ['lovable.dev'] });
    expect(result.toProcess).toHaveLength(1);
    expect(result.toProcess[0].domain).toBe('lovable.dev');
  });

  it('multiple valid domains → only those companies selected', () => {
    const requested = ['lovable.dev', 'github.com/features/copilot', 'claude.com/product/claude-code'];
    const scoped = septemberCompanies.filter((c) => requested.includes(c.domain));
    const result = selectRunTargets(scoped, [], { domains: requested });
    expect(result.toProcess.map((c) => c.domain).sort()).toEqual([...requested].sort());
    expect(result.toProcess.map((c) => c.domain)).not.toContain('chatgpt.com/codex');
  });
});

describe('findUnresolvedDomains — edition boundaries and typos (regression #4, #5)', () => {
  it('a domain that exists in May but not September is rejected for September', () => {
    // May's GitHub Copilot row is the bare `github.com`, not the corrected
    // September path — a caller accidentally passing May's domain against
    // a September-scoped query must not silently match nothing and proceed.
    const septemberQueryResult = septemberCompanies; // simulates the DB already scoped to September
    const unresolved = findUnresolvedDomains(['github.com'], septemberQueryResult);
    expect(unresolved).toEqual(['github.com']);
  });

  it('a genuinely unknown/typo domain → explicit failure, not partial silent execution (regression #5)', () => {
    const unresolved = findUnresolvedDomains(
      ['lovable.dev', 'lovable.typo.dev'],
      septemberCompanies,
    );
    expect(unresolved).toEqual(['lovable.typo.dev']);
  });

  it('every requested domain resolving returns an empty list', () => {
    const unresolved = findUnresolvedDomains(['lovable.dev', 'chatgpt.com/codex'], septemberCompanies);
    expect(unresolved).toEqual([]);
  });

  it('multiple unresolved domains are all reported together, not just the first', () => {
    const unresolved = findUnresolvedDomains(
      ['github.com', 'jetbrains.com', 'lovable.dev'],
      septemberCompanies,
    );
    expect(unresolved.sort()).toEqual(['github.com', 'jetbrains.com'].sort());
  });
});

describe('selectRunTargets — rerun_completed (regression #7, #9, #10)', () => {
  it('completed company + explicit domain + rerun_completed=true → eligible to rerun (regression #7)', () => {
    const scoped = [company('lovable.dev', 2, 'Lovable')];
    const logs: RunLogEntry[] = [{ domain: 'lovable.dev', status: 'complete' }];
    const result = selectRunTargets(scoped, logs, { domains: ['lovable.dev'], rerunCompleted: true });
    expect(result.toProcess).toHaveLength(1);
    expect(result.toProcess[0].domain).toBe('lovable.dev');
    expect(result.skippedComplete).toEqual([]);
  });

  it('rerun_completed does not affect OTHER completed companies not explicitly named', () => {
    const scoped = [company('lovable.dev', 2, 'Lovable'), company('chatgpt.com/codex', 14, 'Codex')];
    const logs: RunLogEntry[] = [
      { domain: 'lovable.dev', status: 'complete' },
      { domain: 'chatgpt.com/codex', status: 'complete' },
    ];
    // Only lovable.dev is named — codex must stay skipped even though both are complete.
    const result = selectRunTargets(scoped, logs, { domains: ['lovable.dev'], rerunCompleted: true });
    expect(result.toProcess.map((c) => c.domain)).toEqual(['lovable.dev']);
    expect(result.skippedComplete).toEqual(['chatgpt.com/codex']);
  });

  it('an errored company is NOT silently rerun by rerun_completed, even when explicitly named (regression #9)', () => {
    const scoped = [company('chatgpt.com/codex', 14, 'Codex')];
    const logs: RunLogEntry[] = [{ domain: 'chatgpt.com/codex', status: 'error' }];
    const result = selectRunTargets(scoped, logs, { domains: ['chatgpt.com/codex'], rerunCompleted: true });
    expect(result.toProcess).toEqual([]);
    expect(result.skippedError).toEqual(['chatgpt.com/codex']);
  });

  it('a pending/in-flight company cannot be duplicated, even when explicitly named with rerun_completed=true (regression #10)', () => {
    const scoped = [company('lovable.dev', 2, 'Lovable')];
    const logs: RunLogEntry[] = [{ domain: 'lovable.dev', status: 'pending' }];
    // Pending must win over the rerun bypass — a company mid-flight is
    // never a valid rerun target, only a completed one is.
    const result = selectRunTargets(scoped, logs, { domains: ['lovable.dev'], rerunCompleted: true });
    expect(result.toProcess).toEqual([]);
    expect(result.skippedInProgress).toEqual(['lovable.dev']);
  });

  it('a pending company is also correctly guarded WITHOUT rerun_completed, in the domain-scoped path', () => {
    const scoped = [company('lovable.dev', 2, 'Lovable')];
    const logs: RunLogEntry[] = [{ domain: 'lovable.dev', status: 'pending' }];
    const result = selectRunTargets(scoped, logs, { domains: ['lovable.dev'] });
    expect(result.toProcess).toEqual([]);
    expect(result.skippedInProgress).toEqual(['lovable.dev']);
  });
});

describe('isRerunWithoutDomainsInvalid (regression #8)', () => {
  it('rerun_completed=true with no domains is invalid', () => {
    expect(isRerunWithoutDomainsInvalid(false, true)).toBe(true);
  });

  it('rerun_completed=true WITH domains is valid', () => {
    expect(isRerunWithoutDomainsInvalid(true, true)).toBe(false);
  });

  it('rerun_completed absent/false is always valid, regardless of domains', () => {
    expect(isRerunWithoutDomainsInvalid(false, false)).toBe(false);
    expect(isRerunWithoutDomainsInvalid(true, false)).toBe(false);
    expect(isRerunWithoutDomainsInvalid(false, undefined)).toBe(false);
  });
});
