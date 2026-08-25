/**
 * gate-agreement-logic.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Deterministic fixture tests for the Gate 2 / EXP-1 gate-agreement matrix
 * (C2). Fixtures use real audit-bracket syntax (`[D4 audit: V1=P(...) ... |
 * pts=N/M | gate=... | score=N]`) so this exercises the actual production
 * parser (parseAuditBlock, imported unmodified from rubric-audit.ts), not a
 * simplified stand-in for it.
 */

import { describe, it, expect } from 'vitest';
import { compareDimension, compareGateAgreement, type DimensionScoreEntry, type SnapshotFile } from './gate-agreement-logic.js';

function dim(overrides: Partial<DimensionScoreEntry>): DimensionScoreEntry {
  return {
    dimension: 'Value unit',
    score: 1,
    confidence: 0.8,
    notObservable: false,
    rationale: '[D4 audit: V1=P(unit_defined@/pricing) V2=P(unit_defined@/pricing) V3=F V4=F V5=NA V6=P(formula@/docs) | pts=3/5 | gate=none | score=1] The value unit is clearly defined.',
    ...overrides,
  };
}

function snapshot(overrides: Partial<SnapshotFile> & { dimensionScores: DimensionScoreEntry[] }): SnapshotFile {
  const { dimensionScores, ...rest } = overrides;
  return {
    id: 'scan-id',
    url_domain: 'example.com',
    created_at: '2026-08-24T00:00:00.000Z',
    result_json: {
      analysisVersion: '2026-08-24-pipeline-v53',
      rubricScore: {
        totalScore: 10,
        maxScore: 16,
        dimensionScores,
      },
    },
    ...rest,
  };
}

describe('compareDimension', () => {
  it('identical runs → 100% agreement, zero disagreements, zero non-comparable', () => {
    const a = dim({});
    const b = dim({});
    const result = compareDimension(a, b);

    expect(result.scoreDelta).toBe(0);
    expect(result.auditParseFailedA).toBe(false);
    expect(result.auditParseFailedB).toBe(false);
    expect(result.subtests).toHaveLength(6);
    expect(result.subtests.every((s) => s.agreement === 'agree')).toBe(true);
    expect(result.subtests.some((s) => s.agreement === 'disagree')).toBe(false);
    expect(result.subtests.some((s) => s.agreement === 'non-comparable')).toBe(false);
  });

  it('one changed subtest → exactly that subtest identified as a disagreement, rest agree', () => {
    const a = dim({
      rationale:
        '[D4 audit: V1=P(unit_defined@/pricing) V2=P(unit_defined@/pricing) V3=F V4=F V5=NA V6=P(formula@/docs) | pts=3/5 | gate=none | score=1] Value unit defined.',
      score: 1,
    });
    const b = dim({
      rationale:
        '[D4 audit: V1=P(unit_defined@/pricing) V2=P(unit_defined@/pricing) V3=P(driver_formula@/pricing) V4=F V5=NA V6=P(formula@/docs) | pts=4/5 | gate=none | score=2] Value unit defined, now with V3 passing too.',
      score: 2,
    });

    const result = compareDimension(a, b);

    const disagreements = result.subtests.filter((s) => s.agreement === 'disagree');
    expect(disagreements).toHaveLength(1);
    expect(disagreements[0].subtestLabel).toBe('V3');
    expect(disagreements[0].markA).toBe('F');
    expect(disagreements[0].markB).toBe('P');
    expect(disagreements[0].citationA).toBeNull();
    expect(disagreements[0].citationB).toBe('driver_formula@/pricing');

    const others = result.subtests.filter((s) => s.subtestLabel !== 'V3');
    expect(others.every((s) => s.agreement === 'agree')).toBe(true);
  });

  it('subtest present in only one run → non-comparable, never counted as a disagreement', () => {
    const a = dim({
      rationale:
        '[D4 audit: V1=P(unit_defined@/pricing) V2=P(unit_defined@/pricing) V3=F V4=F V5=NA V6=P(formula@/docs) | pts=3/5 | gate=none | score=1] Full six-subtest bracket.',
    });
    const b = dim({
      rationale:
        '[D4 audit: V1=P(unit_defined@/pricing) V2=P(unit_defined@/pricing) V3=F V4=F V5=NA | pts=2/4 | gate=none | score=1] Bracket missing V6 entirely.',
    });

    const result = compareDimension(a, b);

    const v6 = result.subtests.find((s) => s.subtestLabel === 'V6');
    expect(v6).toBeDefined();
    expect(v6!.agreement).toBe('non-comparable');
    expect(v6!.markA).toBe('P');
    expect(v6!.markB).toBeNull();

    // The other five labels are present on both sides and identical -> still agreements.
    const others = result.subtests.filter((s) => s.subtestLabel !== 'V6');
    expect(others.every((s) => s.agreement === 'agree')).toBe(true);

    // Non-comparable must never leak into disagreement count.
    expect(result.subtests.filter((s) => s.agreement === 'disagree')).toHaveLength(0);
  });

  it('a dimension with an unparseable audit block on one side marks every label non-comparable, not disagree', () => {
    const a = dim({ rationale: '[D4 audit: V1=P(unit_defined@/pricing) V2=F V3=F V4=F V5=NA V6=F | pts=1/5 | gate=none | score=0] ok.' });
    const b = dim({
      // notObservable fallback path in index.ts produces an empty rationale — no bracket to parse.
      rationale: '',
      score: 0,
      notObservable: true,
    });

    const result = compareDimension(a, b);

    expect(result.auditParseFailedB).toBe(true);
    expect(result.auditParseFailedA).toBe(false);
    expect(result.subtests.length).toBeGreaterThan(0);
    expect(result.subtests.every((s) => s.agreement === 'non-comparable')).toBe(true);
  });

  it('both sides missing entirely (dimension absent from both runs) yields no subtests, not a crash', () => {
    const result = compareDimension(undefined, undefined);
    expect(result.subtests).toHaveLength(0);
    expect(result.dimensionName).toBe('unknown');
    expect(result.scoreDelta).toBeNull();
  });
});

describe('compareGateAgreement', () => {
  it('dimension-total score change is traceable to an underlying subtest difference', () => {
    const dimA = dim({
      rationale:
        '[D4 audit: V1=P(unit_defined@/pricing) V2=P(unit_defined@/pricing) V3=F V4=F V5=NA V6=P(formula@/docs) | pts=3/5 | gate=none | score=1] Baseline.',
      score: 1,
    });
    const dimB = dim({
      rationale:
        '[D4 audit: V1=P(unit_defined@/pricing) V2=P(unit_defined@/pricing) V3=P(driver_formula@/pricing) V4=F V5=NA V6=P(formula@/docs) | pts=4/5 | gate=none | score=2] V3 now passes.',
      score: 2,
    });

    const snapA = snapshot({ id: 'scan-a', dimensionScores: [dimA] });
    const snapB = snapshot({ id: 'scan-b', dimensionScores: [dimB] });

    const result = compareGateAgreement(snapA, snapB);
    const valueUnitDim = result.dimensions.find((d) => d.dimensionName === 'Value unit')!;

    // scoreDelta is defined as A − B (see compareDimension); B scored one point
    // higher than A here, so the delta is -1.
    expect(valueUnitDim.scoreDelta).toBe(-1);
    // The dimension total moved — there must be at least one identifiable
    // disagreeing subtest that explains it, not just an opaque score jump.
    const explainingSubtests = valueUnitDim.subtests.filter((s) => s.agreement === 'disagree');
    expect(explainingSubtests.length).toBeGreaterThan(0);
    expect(explainingSubtests.map((s) => s.subtestLabel)).toContain('V3');
    expect(result.changedSubtests.map((c) => c.subtestLabel)).toContain('V3');
  });

  it('aggregates totals correctly and computes agreement percentage across two dimensions', () => {
    const productDimA = dim({
      dimension: 'Product north star',
      rationale: '[D1 audit: NS1=P(a@/x) NS2=F NS3=F NS4=NA NS5=F NS6=F | pts=1/5 | gate=none | score=0] a',
      score: 0,
    });
    const productDimB = dim({
      dimension: 'Product north star',
      rationale: '[D1 audit: NS1=P(a@/x) NS2=F NS3=F NS4=NA NS5=F NS6=F | pts=1/5 | gate=none | score=0] a',
      score: 0,
    });
    const valueDimA = dim({
      rationale:
        '[D4 audit: V1=P(unit_defined@/pricing) V2=P(unit_defined@/pricing) V3=F V4=F V5=NA V6=P(formula@/docs) | pts=3/5 | gate=none | score=1] Baseline.',
      score: 1,
    });
    const valueDimB = dim({
      rationale:
        '[D4 audit: V1=P(unit_defined@/pricing) V2=P(unit_defined@/pricing) V3=P(driver_formula@/pricing) V4=F V5=NA V6=P(formula@/docs) | pts=4/5 | gate=none | score=2] V3 now passes.',
      score: 2,
    });

    const snapA = snapshot({ id: 'scan-a', dimensionScores: [productDimA, valueDimA] });
    const snapB = snapshot({ id: 'scan-b', dimensionScores: [productDimB, valueDimB] });

    const result = compareGateAgreement(snapA, snapB);

    // D1: 6/6 agree. D4: 5/6 agree, 1/6 disagree (V3).
    expect(result.totals.exactAgreements).toBe(11);
    expect(result.totals.disagreements).toBe(1);
    expect(result.totals.nonComparable).toBe(0);
    expect(result.totals.comparableSubtests).toBe(12);
    expect(result.totals.agreementPercentage).toBeCloseTo((11 / 12) * 100, 1);
  });

  it('flags analysisVersion drift between runs without treating it as a subtest disagreement', () => {
    const dimA = dim({});
    const dimB = dim({});
    const snapA = snapshot({ id: 'scan-a', dimensionScores: [dimA], result_json: { analysisVersion: 'v52', rubricScore: { totalScore: 10, maxScore: 16, dimensionScores: [dimA] } } });
    const snapB = snapshot({ id: 'scan-b', dimensionScores: [dimB], result_json: { analysisVersion: 'v53', rubricScore: { totalScore: 10, maxScore: 16, dimensionScores: [dimB] } } });

    const result = compareGateAgreement(snapA, snapB);
    expect(result.analysisVersionA).toBe('v52');
    expect(result.analysisVersionB).toBe('v53');
    // Version drift is a CLI-level warning (printed separately), not folded into subtest agreement math.
    expect(result.totals.disagreements).toBe(0);
  });
});
