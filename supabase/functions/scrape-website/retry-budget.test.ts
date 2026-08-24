import { describe, it, expect } from 'vitest';
import { hasRetryBudgetRemaining, SCRAPE_RETRY_BUDGET_MS } from './retry-budget.ts';

describe('hasRetryBudgetRemaining (Entry 090 — retry-budget backstop)', () => {
  it('allows a retry well within budget', () => {
    const startedAt = 1_000_000;
    const now = startedAt + 30_000; // 30s elapsed
    expect(hasRetryBudgetRemaining(startedAt, SCRAPE_RETRY_BUDGET_MS, now)).toBe(true);
  });

  it('denies a retry once the budget is exhausted (retry budget terminates cleanly rather than retrying indefinitely)', () => {
    const startedAt = 1_000_000;
    const now = startedAt + SCRAPE_RETRY_BUDGET_MS + 1; // 1ms past budget
    expect(hasRetryBudgetRemaining(startedAt, SCRAPE_RETRY_BUDGET_MS, now)).toBe(false);
  });

  it('denies exactly at the budget boundary (strict less-than, not less-than-or-equal)', () => {
    const startedAt = 1_000_000;
    const now = startedAt + SCRAPE_RETRY_BUDGET_MS;
    expect(hasRetryBudgetRemaining(startedAt, SCRAPE_RETRY_BUDGET_MS, now)).toBe(false);
  });

  it('reproduces the Entry 089 signature: ~10 sequential 12s waits (120s) should still be within the default 240s budget', () => {
    const startedAt = 1_000_000;
    const afterTenWaits = startedAt + 10 * 12_000; // 120s
    expect(hasRetryBudgetRemaining(startedAt, SCRAPE_RETRY_BUDGET_MS, afterTenWaits)).toBe(true);
  });

  it('a pathological, much longer degradation (e.g. 20 sequential waits, 240s) is correctly denied further retry', () => {
    const startedAt = 1_000_000;
    const afterTwentyWaits = startedAt + 20 * 12_000; // 240s, at the boundary
    expect(hasRetryBudgetRemaining(startedAt, SCRAPE_RETRY_BUDGET_MS, afterTwentyWaits)).toBe(false);
  });

  it('respects a custom, non-default budget', () => {
    const startedAt = 1_000_000;
    const now = startedAt + 50_000;
    expect(hasRetryBudgetRemaining(startedAt, 60_000, now)).toBe(true);
    expect(hasRetryBudgetRemaining(startedAt, 40_000, now)).toBe(false);
  });

  it('defaults nowMs to something sane when omitted (does not throw, returns a boolean)', () => {
    const startedAt = Date.now() - 5000;
    expect(typeof hasRetryBudgetRemaining(startedAt)).toBe('boolean');
  });
});
