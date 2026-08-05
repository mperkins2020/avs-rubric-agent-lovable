import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseAuditBlock,
  classifyGate,
  correctDimensionScore,
  computeEvidenceQuality,
  isWhollyInsiderSourced,
  d3AggregationSpansMultipleSegments,
  AUDITED_DIMENSION_NAMES,
} from './rubric-audit.ts';

// All fixtures below are the ACTUAL rationale strings pulled from production
// scan_results during the Marketing Intelligence benchmark QA sweep,
// 2026-08-01/02 — see ENGINE_DEBUG_LOG.md Entries 064, 065, 066.

describe('parseAuditBlock', () => {
  it('parses a well-formed D8 audit block with a bare-label gate (Ahrefs)', () => {
    const rationale =
      '[D8 audit: T1=F T2=F T3=F T4=F T5=P T6=F | pts=1/6 | gate=T4 | score=1] [D8 evidence: T1←none; T2←none; T3←none; T4←none; T5←path-used:rbac_path:Access management & audit log@/pricing; T6←none] Ahrefs offers admin controls...';
    const parsed = parseAuditBlock(rationale);
    expect(parsed).not.toBeNull();
    expect(parsed?.dimensionNumber).toBe(8);
    expect(parsed?.marks).toEqual({ T1: 'F', T2: 'F', T3: 'F', T4: 'F', T5: 'P', T6: 'F' });
    expect(parsed?.declaredPts).toBe(1);
    expect(parsed?.declaredDenominator).toBe(6);
    expect(parsed?.gateText).toBe('T4');
    expect(parsed?.declaredScore).toBe(1);
    expect(parsed?.hasEvidenceBlock).toBe(true);
  });

  it('parses D7 with R5=NA (no enterprise segment)', () => {
    const rationale =
      '[D7 audit: R1=F R2=F R3=F R4=F R5=NA R6=F | pts=0/5 | gate=policies.overage_behavior missing AND any tier has overage_enabled == true | score=0] [D7 evidence: R1←none; R2←none; R3←none; R4←none; R5←none; R6←none]';
    const parsed = parseAuditBlock(rationale);
    expect(parsed?.marks.R5).toBe('NA');
    expect(parsed?.declaredDenominator).toBe(5);
  });

  it('detects a missing evidence block independent of a well-formed audit block', () => {
    const rationale =
      '[D5 audit: C1=P C2=F C3=P C4=P C5=P C6=F | pts=4/6 | gate=none | score=1] Conductor identifies several usage-based cost drivers...';
    const parsed = parseAuditBlock(rationale);
    expect(parsed?.hasEvidenceBlock).toBe(false);
  });

  it('returns null for prose with no audit block at all (D1-D4 style, or a fully broken response)', () => {
    expect(parseAuditBlock('Just a plain rationale with no brackets.')).toBeNull();
  });
});

describe('classifyGate', () => {
  it('classifies "none"', () => {
    expect(classifyGate('none')).toEqual({ kind: 'none' });
  });

  it('classifies an explicit "cap ... at N" gate', () => {
    const gate = classifyGate(
      'If any tier has overage_enabled == true and both caps and alerts are absent for that tier (no cap_policy and no alert_policy and forecasting_surfaces.alerts == none): cap final score at 1',
    );
    expect(gate).toEqual({ kind: 'cap', capValue: 1, defaulted: false });
  });

  it('classifies the "may not exceed N" alternate cap phrasing', () => {
    expect(classifyGate('score may not exceed 1')).toEqual({ kind: 'cap', capValue: 1, defaulted: false });
  });

  it('classifies a bare subtest label as an implicit cap at 1 when it matches a marked subtest', () => {
    const marks = { T1: 'F' as const, T2: 'F' as const, T3: 'F' as const, T4: 'F' as const, T5: 'P' as const, T6: 'F' as const };
    expect(classifyGate('T4', marks)).toEqual({ kind: 'cap', capValue: 1, defaulted: true });
  });

  it('classifies a verbose subtest-label reference without "cap" as an implicit cap at 1 (Scrunch AI D8 real case)', () => {
    const marks = { T1: 'P' as const, T2: 'F' as const, T3: 'F' as const, T4: 'F' as const, T5: 'P' as const, T6: 'F' as const };
    expect(classifyGate('T4 fails for the highest-priority segment', marks)).toEqual({
      kind: 'cap',
      capValue: 1,
      defaulted: true,
    });
  });

  it('classifies a bare TWO-LETTER subtest label as an implicit cap at 1 (Entry 070 — real v41 semrush.com production case)', () => {
    // The label-match regex originally only accepted single-letter+digit
    // labels (T4, S3, C1...), missing D1's two-letter "NS" prefix. A live
    // v41 rescan produced gate text "NS3 gate" which fell through to
    // 'unrecognized' instead of being read as a cap-at-1 — caught via
    // hand-verification of the raw audit block, not by a unit test, which
    // is exactly why this regression test exists now.
    const marks = { NS1: 'P' as const, NS2: 'P' as const, NS3: 'F' as const, NS4: 'P' as const, NS5: 'P' as const, NS6: 'F' as const };
    expect(classifyGate('NS3 gate', marks)).toEqual({ kind: 'cap', capValue: 1, defaulted: true });
  });

  it('classifies "none, aggregated across N segments" as none, not unrecognized (Entry 071 — D3\'s own prompt-mandated phrasing)', () => {
    // D3's MANDATORY SCORING PROCEDURE (Entry 068) explicitly instructs the
    // LLM to write "gate=none, aggregated across N segments" whenever
    // cross-segment aggregation changes the reported score — a correctly
    // behaving response following its own prompt fell through to
    // 'unrecognized' every time, because the old check only matched the
    // exact string "none". Caught via a live v42 semrush.com rescan.
    expect(classifyGate('none, aggregated across 3 segments')).toEqual({ kind: 'none' });
  });

  it('does not let the broadened "none" pattern accidentally match unrelated words', () => {
    expect(classifyGate('nonexistent policy').kind).toBe('unrecognized');
  });

  it('classifies the D6 primary_unit_name hard-zero gate', () => {
    expect(classifyGate('packaging.primary_unit_name missing → Score 0')).toEqual({ kind: 'hard-zero' });
  });

  it('classifies the D7 overage_behavior hard-zero gate', () => {
    expect(
      classifyGate(
        'policies.overage_behavior is missing AND any tier has overage_enabled == true: final dimension score = 0',
      ),
    ).toEqual({ kind: 'hard-zero' });
  });

  it('classifies genuinely unfamiliar gate text as unrecognized rather than guessing', () => {
    const gate = classifyGate('Some entirely novel gate phrasing never seen before');
    expect(gate.kind).toBe('unrecognized');
  });

  it('classifies the D7 auto_topup gate as a CAP despite containing "missing" and "overage_behavior" (review-pass bug fix)', () => {
    // This gate text contains both trigger words of the hard-zero fallback,
    // but is explicitly a cap-at-1 — the cap pattern must win.
    const gate = classifyGate(
      'If policies.overage_behavior == auto_topup and any tier has topup_available == true but tiers[].topup_increment is missing: cap final score at 1',
    );
    expect(gate).toEqual({ kind: 'cap', capValue: 1, defaulted: false });
  });
});

describe('correctDimensionScore — confirmed production cases (ENGINE_DEBUG_LOG Entries 064/066)', () => {
  it('Case 1a: cap-misapplied-as-floor, bare-label gate (Ahrefs D8: 1/6 pts, declared 1, should be 0)', () => {
    const rationale =
      '[D8 audit: T1=F T2=F T3=F T4=F T5=P T6=F | pts=1/6 | gate=T4 | score=1] [D8 evidence: T1←none; T2←none; T3←none; T4←none; T5←path-used:rbac_path:Access management & audit log@/pricing; T6←none]';
    const result = correctDimensionScore(rationale, 8);
    expect(result.correctedScore).toBe(0);
    expect(result.scoreWasCorrected).toBe(true);
    expect(result.correctionReason).toBe('cap-misapplied-as-floor');
  });

  it('Case 1b: cap-misapplied-as-floor, explicit cap gate (Peec AI D7: 2/6 pts, declared 1, should be 0)', () => {
    const rationale =
      '[D7 audit: R1=P R2=F R3=F R4=F R5=P R6=F | pts=2/6 | gate=If any tier has overage_enabled == true and both caps and alerts are absent for that tier (no cap_policy and no alert_policy and forecasting_surfaces.alerts == none): cap final score at 1 | score=1]';
    const result = correctDimensionScore(rationale, 7);
    expect(result.correctedScore).toBe(0);
    expect(result.scoreWasCorrected).toBe(true);
    expect(result.correctionReason).toBe('cap-misapplied-as-floor');
  });

  it('Case 1c: cap-misapplied-as-floor, verbose label gate (Scrunch AI D8: 2/6 pts, declared 1, should be 0)', () => {
    const rationale =
      '[D8 audit: T1=P T2=F T3=F T4=F T5=P T6=F | pts=2/6 | gate=T4 fails for the highest-priority segment | score=1]';
    const result = correctDimensionScore(rationale, 8);
    expect(result.correctedScore).toBe(0);
    expect(result.scoreWasCorrected).toBe(true);
    expect(result.correctionReason).toBe('cap-misapplied-as-floor');
  });

  it('Case 2: unexplained mismatch, no gate involved (Profound D5: 5/6 pts, declared 1, should be 2)', () => {
    const rationale = '[D5 audit: C1=P C2=F C3=P C4=P C5=P C6=P | pts=5/6 | gate=none | score=1]';
    const result = correctDimensionScore(rationale, 5);
    expect(result.correctedScore).toBe(2);
    expect(result.scoreWasCorrected).toBe(true);
    expect(result.correctionReason).toBe('unexplained-mismatch');
  });

  it('Case 2b: unexplained mismatch via a plain "gate=none" that still declared the wrong score (HubSpot D8: 2/6 pts, declared 1, should be 0)', () => {
    const rationale = '[D8 audit: T1=F T2=F T3=F T4=P T5=P T6=F | pts=2/6 | gate=none | score=1]';
    const result = correctDimensionScore(rationale, 8);
    expect(result.correctedScore).toBe(0);
    expect(result.scoreWasCorrected).toBe(true);
    expect(result.correctionReason).toBe('unexplained-mismatch');
  });

  it('Case 3a: wrong denominator AND wrong score (Similarweb D7: R5=F not NA, denom should be 6 not 5, 2pts should score 0 not 1)', () => {
    const rationale = '[D7 audit: R1=P R2=F R3=F R4=P R5=F R6=F | pts=2/5 | gate=none | score=1]';
    const result = correctDimensionScore(rationale, 7);
    expect(result.correctedDenominator).toBe(6);
    expect(result.correctedScore).toBe(0);
    expect(result.scoreWasCorrected).toBe(true);
  });

  it('Case 3b: wrong denominator but final score already correct (Botify D7 variant: 3/5 shown, should be 3/6, still maps to score 1)', () => {
    const rationale = '[D7 audit: R1=P R2=P R3=F R4=P R5=F R6=F | pts=3/5 | gate=none | score=1]';
    const result = correctDimensionScore(rationale, 7);
    expect(result.correctedDenominator).toBe(6);
    expect(result.correctedScore).toBe(1);
    expect(result.scoreWasCorrected).toBe(false);
    expect(result.correctionReason).toBe('wrong-denominator');
  });

  it('Case 4: missing evidence block flagged independently of scoring correctness (Conductor-style D5)', () => {
    const rationale = '[D5 audit: C1=P C2=F C3=P C4=P C5=P C6=F | pts=4/6 | gate=none | score=1] Conductor identifies drivers...';
    const result = correctDimensionScore(rationale, 5);
    expect(result.evidenceBlockMissing).toBe(true);
    expect(result.scoreWasCorrected).toBe(false); // score itself is correct, only citation is missing
  });

  it('Case 5: legitimate code-driven floor is always preserved, never overridden (Similarweb D8)', () => {
    const rationale =
      '[D8 audit: T1=F T2=F T3=F T4=F T5=F T6=F | pts=0/6 | gate=none | score=0] [D8 evidence: T1←none; T2←none; T3←none; T4←none; T5←none; T6←none] Public pages do not provide evidence... [Score floored to 1 based on 3 public evidence signals.]';
    const result = correctDimensionScore(rationale, 8);
    expect(result.correctedScore).toBe(1);
    expect(result.scoreWasCorrected).toBe(false);
    expect(result.correctionReason).toBe('legitimate-floor-preserved');
  });

  it('Case 6: legitimate binding cap is preserved (OtterlyAI/Peec AI/Semrush D6-style: 5/6 pts, capped to 1)', () => {
    const rationale =
      '[D6 audit: P1=P P2=P P3=F P4=P P5=P P6=P | pts=5/6 | gate=P3 fails for the highest-priority segment: cap final dimension score at 1 | score=1]';
    const result = correctDimensionScore(rationale, 6);
    expect(result.correctedScore).toBe(1);
    expect(result.scoreWasCorrected).toBe(false);
    expect(result.correctionReason).toBe('legitimate-cap-preserved');
  });

  it('Case 6b: legitimate binding cap via a bare verbose label (Similarweb D6: 5/6 pts would be 2, capped to 1)', () => {
    const rationale =
      '[D6 audit: P1=P P2=P P3=F P4=P P5=P P6=P | pts=5/6 | gate=P3 fails for the highest-priority segment | score=1]';
    const result = correctDimensionScore(rationale, 6);
    expect(result.correctedScore).toBe(1);
    expect(result.scoreWasCorrected).toBe(false);
  });

  it('correctly applies a hard-zero gate even when raw points would otherwise pass (D7 overage_behavior missing)', () => {
    const rationale =
      '[D7 audit: R1=P R2=P R3=P R4=P R5=NA R6=P | pts=4/5 | gate=policies.overage_behavior is missing AND any tier has overage_enabled == true: final dimension score = 0 | score=1]';
    const result = correctDimensionScore(rationale, 7);
    expect(result.correctedScore).toBe(0);
    expect(result.scoreWasCorrected).toBe(true);
    expect(result.correctionReason).toBe('hard-zero-applied');
  });

  it('correctly applies the D6 primary_unit_name hard-zero gate', () => {
    const rationale =
      '[D6 audit: P1=F P2=F P3=F P4=F P5=F P6=F | pts=0/6 | gate=packaging.primary_unit_name missing → Score 0 | score=0]';
    const result = correctDimensionScore(rationale, 6);
    expect(result.correctedScore).toBe(0);
    expect(result.scoreWasCorrected).toBe(false);
    expect(result.correctionReason).toBe('none');
  });

  it('D7 R4-enterprise exception: abstains from capping when R5=P and points reach 5+ (Entry 055 spec rule)', () => {
    // Spec: "if R4 fails ... score CANNOT exceed 1 UNLESS an enterprise
    // segment independently reaches 5-6 points." With R5=P and 5 pts, the
    // exception may legitimately allow score 2 — the corrector must NOT
    // blindly cap it back to 1 (that would reintroduce Entry 055's error
    // in the opposite direction). Abstain and keep the declared score.
    const rationale =
      '[D7 audit: R1=P R2=P R3=P R4=F R5=P R6=P | pts=5/6 | gate=R4 fails: cap at 1 | score=2]';
    const result = correctDimensionScore(rationale, 7);
    expect(result.correctedScore).toBe(2);
    expect(result.scoreWasCorrected).toBe(false);
    expect(result.correctionReason).toBe('d7-r4-enterprise-exception-abstained');
  });

  it('D7 R4 cap still applies normally when the enterprise exception does NOT hold (R5=NA)', () => {
    const rationale =
      '[D7 audit: R1=P R2=P R3=P R4=F R5=NA R6=P | pts=4/5 | gate=R4 fails: cap at 1 | score=1]';
    const result = correctDimensionScore(rationale, 7);
    // 4 pts maps to 1; cap at 1; declared 1 — consistent, nothing to fix.
    expect(result.correctedScore).toBe(1);
    expect(result.scoreWasCorrected).toBe(false);
  });

  it('the auto_topup cap gate corrects a cap-misapplied-as-floor like any other cap (review-pass bug fix)', () => {
    // 2 pts maps to 0; cap at 1 is non-binding; declared 1 must be
    // corrected down to 0 — NOT treated as hard-zero, NOT left at 1.
    const rationale =
      '[D7 audit: R1=P R2=P R3=F R4=F R5=NA R6=F | pts=2/5 | gate=If policies.overage_behavior == auto_topup and any tier has topup_available == true but tiers[].topup_increment is missing: cap final score at 1 | score=1]';
    const result = correctDimensionScore(rationale, 7);
    expect(result.correctedScore).toBe(0);
    expect(result.scoreWasCorrected).toBe(true);
    expect(result.correctionReason).toBe('cap-misapplied-as-floor');
  });

  it('exposes the raw gate text on the result for telemetry', () => {
    const rationale = '[D8 audit: T1=F T2=F T3=F T4=F T5=P T6=F | pts=1/6 | gate=T4 | score=1]';
    const result = correctDimensionScore(rationale, 8);
    expect(result.gateText).toBe('T4');
  });

  it('does not correct an unrecognized gate — abstains and flags for review rather than guessing', () => {
    const rationale = '[D5 audit: C1=P C2=P C3=P C4=P C5=P C6=P | pts=6/6 | gate=Some brand-new phrasing never seen before | score=1]';
    const result = correctDimensionScore(rationale, 5);
    expect(result.scoreWasCorrected).toBe(false);
    expect(result.correctedScore).toBe(1); // left as declared, not silently changed
    expect(result.correctionReason).toBe('unrecognized-gate-not-corrected');
  });

  it('flags auditParseFailed when no audit block exists at all', () => {
    const result = correctDimensionScore('Plain prose rationale with no bracket block.', 5);
    expect(result.auditParseFailed).toBe(true);
    expect(result.evidenceBlockMissing).toBe(true);
  });

  it('flags auditParseFailed when the parsed dimension number does not match the expected one', () => {
    const rationale = '[D5 audit: C1=P C2=P C3=P C4=P C5=P C6=P | pts=6/6 | gate=none | score=2]';
    const result = correctDimensionScore(rationale, 8); // expecting D8, block is D5
    expect(result.auditParseFailed).toBe(true);
  });
});

describe('format-drift guardrail', () => {
  // Guards against a future prompt-format change silently breaking the
  // parser (e.g. a delimiter change) without any test failing. Reads the
  // live RUBRIC_SCORING_PROMPT text directly out of index.ts and checks
  // that a synthetic fill of its own mandated template still parses.
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const indexSource = readFileSync(join(__dirname, 'index.ts'), 'utf-8');

  it('the D1-D8 audit template strings are still present in index.ts', () => {
    expect(indexSource).toContain('| gate=<none, or which cap applied> | score=X]');
    expect(indexSource).toContain('| gate=<none, or NS1/NS3 gate that applied> | score=X]');
    expect(indexSource).toContain('| gate=<none, or which cap/zero applied> | score=X]');
    expect(indexSource).toContain('| gate=<none, or which cap(s) applied> | score=X]');
  });

  it.each([5, 6, 7, 8])('a synthetic fill of the mandated D%i format still parses (6-mark dimensions)', (n) => {
    const labelPrefix = { 5: 'C', 6: 'P', 7: 'R', 8: 'T' }[n];
    const marks = Array.from({ length: 6 }, (_, i) => `${labelPrefix}${i + 1}=P`).join(' ');
    const synthetic = `[D${n} audit: ${marks} | pts=6/6 | gate=none | score=2] [D${n} evidence: ${labelPrefix}1←field@/pricing]`;
    const parsed = parseAuditBlock(synthetic);
    expect(parsed).not.toBeNull();
    expect(parsed?.dimensionNumber).toBe(n);
    expect(parsed?.declaredScore).toBe(2);
  });

  it.each([2, 4])('a synthetic fill of the mandated D%i format still parses (6-mark dimensions, Entry 068)', (n) => {
    const labelPrefix = { 2: 'J', 4: 'V' }[n];
    const marks = Array.from({ length: 6 }, (_, i) => `${labelPrefix}${i + 1}=P`).join(' ');
    const synthetic = `[D${n} audit: ${marks} | pts=6/6 | gate=none | score=2] [D${n} evidence: ${labelPrefix}1←field@/pricing]`;
    const parsed = parseAuditBlock(synthetic);
    expect(parsed).not.toBeNull();
    expect(parsed?.dimensionNumber).toBe(n);
    expect(parsed?.declaredScore).toBe(2);
  });

  it('a synthetic fill of the mandated D1 format still parses (two-letter NS prefix, Entry 068)', () => {
    const marks = Array.from({ length: 6 }, (_, i) => `NS${i + 1}=P`).join(' ');
    const synthetic = `[D1 audit: ${marks} | pts=6/6 | gate=none | score=2] [D1 evidence: NS1←field@/pricing]`;
    const parsed = parseAuditBlock(synthetic);
    expect(parsed).not.toBeNull();
    expect(parsed?.dimensionNumber).toBe(1);
    expect(parsed?.declaredScore).toBe(2);
    expect(parsed?.marks.NS1).toBe('P');
  });

  it('a synthetic fill of the mandated D3 format still parses (5-mark dimension, Entry 068)', () => {
    const marks = Array.from({ length: 5 }, (_, i) => `S${i + 1}=P`).join(' ');
    const synthetic = `[D3 audit: ${marks} | pts=5/5 | gate=none | score=2] [D3 evidence: S1←field@/pricing]`;
    const parsed = parseAuditBlock(synthetic);
    expect(parsed).not.toBeNull();
    expect(parsed?.dimensionNumber).toBe(3);
    expect(parsed?.declaredDenominator).toBe(5);
    expect(parsed?.declaredScore).toBe(2);
  });
});

describe('AUDITED_DIMENSION_NAMES', () => {
  it('covers exactly D1-D8, matching the dimensions with a MANDATORY SCORING PROCEDURE (Entry 068)', () => {
    expect(Object.keys(AUDITED_DIMENSION_NAMES).map(Number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('correctDimensionScore — D1-D4 (Entry 068 extension)', () => {
  it('D3: applies the 5-point scale, not the 6-point scale (4/5 pts should score 2, not 1)', () => {
    const rationale = '[D3 audit: S1=P S2=P S3=P S4=P S5=F | pts=4/5 | gate=none | score=2] [D3 evidence: S1←economic_buyer_role@/pricing; S2←payment_methods@/pricing; S3←field@/pricing; S4←field@/pricing; S5←none]';
    const result = correctDimensionScore(rationale, 3);
    expect(result.auditParseFailed).toBe(false);
    expect(result.correctedScore).toBe(2);
    expect(result.scoreWasCorrected).toBe(false);
  });

  it('D3: NO LONGER corrects a declared/mapping mismatch (Entry 077 — superseded)', () => {
    // Written for Entry 068, when D3 was assumed to work like every other
    // dimension. It does not: its marks describe the highest-priority segment
    // while its score is the cross-segment aggregate, so a mismatch is
    // explicable as aggregation and cannot be distinguished from an error
    // without per-segment data. The corrector now abstains. This is a
    // deliberate loss of error-detection on D3 — see Entry 077.
    const rationale = '[D3 audit: S1=P S2=P S3=P S4=F S5=F | pts=3/5 | gate=none | score=2] [D3 evidence: S1←field@/pricing; S2←field@/pricing; S3←field@/pricing; S4←none; S5←none]';
    const result = correctDimensionScore(rationale, 3);
    expect(result.correctedScore).toBe(2);
    expect(result.scoreWasCorrected).toBe(false);
    expect(result.correctionReason).toBe('d3-aggregation-abstained');
  });

  it('D1: parses the two-letter NS prefix and validates its own 6-point scale (5/6 pts should score 2)', () => {
    const rationale = '[D1 audit: NS1=P NS2=F NS3=P NS4=P NS5=P NS6=P | pts=5/6 | gate=none | score=2] [D1 evidence: NS1←field@/pricing; NS2←none; NS3←field@/pricing; NS4←field@/pricing; NS5←field@/pricing; NS6←field@/pricing]';
    const result = correctDimensionScore(rationale, 1);
    expect(result.auditParseFailed).toBe(false);
    expect(result.correctedScore).toBe(2);
    expect(result.scoreWasCorrected).toBe(false);
  });

  it('D1: NS1 hard-zero gate (no stated value outcome) overrides the mapping', () => {
    const rationale = '[D1 audit: NS1=F NS2=P NS3=P NS4=P NS5=P NS6=P | pts=5/6 | gate=final score = 0 | score=2] [D1 evidence: NS1←none; NS2←field@/pricing; NS3←field@/pricing; NS4←field@/pricing; NS5←field@/pricing; NS6←field@/pricing]';
    const result = correctDimensionScore(rationale, 1);
    expect(result.correctedScore).toBe(0);
    expect(result.scoreWasCorrected).toBe(true);
    expect(result.correctionReason).toBe('hard-zero-applied');
  });

  it('D2: J2 hard-zero gate (no job clarity) overrides the mapping even with high points', () => {
    const rationale = '[D2 audit: J1=P J2=F J3=P J4=P J5=P J6=P | pts=5/6 | gate=final score = 0 | score=1] [D2 evidence: J1←field@/pricing; J2←none; J3←field@/pricing; J4←field@/pricing; J5←field@/pricing; J6←field@/pricing]';
    const result = correctDimensionScore(rationale, 2);
    expect(result.correctedScore).toBe(0);
    expect(result.scoreWasCorrected).toBe(true);
    expect(result.correctionReason).toBe('hard-zero-applied');
  });

  it('D4: catches a cap-misapplied-as-floor on V1 (unit definition missing, capped at 1, but declared score 1 when raw points map to 0)', () => {
    const rationale = '[D4 audit: V1=F V2=P V3=P V4=P V5=F V6=F | pts=3/6 | gate=cap score at 1 | score=1] [D4 evidence: V1←none; V2←field@/pricing; V3←field@/pricing; V4←field@/pricing; V5←none; V6←none]';
    const result = correctDimensionScore(rationale, 4);
    // 3/6 pts maps to score 1 already, and the cap (1) is non-binding since
    // baseMappedScore (1) does not exceed it — declared score of 1 is correct.
    expect(result.correctedScore).toBe(1);
    expect(result.scoreWasCorrected).toBe(false);
  });
});

describe('inline-citation format (Entry 069 — merged audit+evidence bracket)', () => {
  it('parses inline citations attached to PASS marks and populates the citations map', () => {
    const rationale =
      '[D5 audit: C1=P(tasks@/pricing + AI steps@/pricing) C2=F C3=P(Zap workflows@/pricing) C4=P($19.99/mo@/pricing) C5=P(pay-per-task@/pricing) C6=F | pts=4/6 | gate=none | score=1] CrewAI identifies cost drivers...';
    const parsed = parseAuditBlock(rationale);
    expect(parsed).not.toBeNull();
    expect(parsed?.marks.C1).toBe('P');
    expect(parsed?.citations.C1).toBe('tasks@/pricing + AI steps@/pricing');
    expect(parsed?.citations.C3).toBe('Zap workflows@/pricing');
    expect(parsed?.citations.C2).toBeUndefined(); // F marks carry no citation
    expect(parsed?.hasEvidenceBlock).toBe(true);
  });

  it('flags hasEvidenceBlock=false when a PASS mark has no inline citation and no fallback bracket exists', () => {
    const rationale =
      '[D5 audit: C1=P C2=F C3=P(field@/pricing) C4=P C5=P C6=F | pts=4/6 | gate=none | score=1] Some prose with no evidence bracket at all.';
    const parsed = parseAuditBlock(rationale);
    expect(parsed).not.toBeNull();
    // C1, C4 are P with no inline citation and no separate [D5 evidence:] bracket present
    expect(parsed?.hasEvidenceBlock).toBe(false);
  });

  it('accepts the hyphenated seat-based override marker without breaking on nested parens', () => {
    const rationale =
      '[D5 audit: C1=P(auto-seat-based) C2=F C3=P(field@/pricing) C4=P(field@/pricing) C5=P(field@/pricing) C6=F | pts=4/6 | gate=none | score=1] Seat-based product.';
    const parsed = parseAuditBlock(rationale);
    expect(parsed).not.toBeNull();
    expect(parsed?.citations.C1).toBe('auto-seat-based');
    expect(parsed?.hasEvidenceBlock).toBe(true);
  });

  it('backward compat: a P mark with no inline citation is still satisfied by the OLD separate [D_ evidence:] bracket', () => {
    const rationale =
      '[D5 audit: C1=P C2=F C3=P C4=P C5=P C6=F | pts=4/6 | gate=none | score=1] [D5 evidence: C1←tasks@/pricing; C2←none; C3←field@/pricing; C4←field@/pricing; C5←field@/pricing; C6←none] Old-format response.';
    const parsed = parseAuditBlock(rationale);
    expect(parsed).not.toBeNull();
    expect(parsed?.citations.C1).toBeUndefined(); // no inline citation
    expect(parsed?.hasEvidenceBlock).toBe(true); // but satisfied by the old bracket
  });

  it('correctDimensionScore still validates score arithmetic correctly against inline-citation rationales (real CrewAI D5 case, no evidence bracket)', () => {
    // Real production text (2026-08-03): audit block present, no separate
    // evidence bracket at all — the exact Entry 065/069 failure mode this
    // format change targets. Score arithmetic must still validate correctly
    // regardless of whether the evidence requirement is satisfied.
    const rationale =
      "[D5 audit: C1=P C2=F C3=P C4=P C5=P C6=F | pts=4/6 | gate=none | score=1] CrewAI identifies 'workflow executions' and 'scale of deployments' as cost drivers, and the pricing page links these to tiers. However, detailed driver formulas and forecasting/visibility surfaces are not publicly documented.";
    const result = correctDimensionScore(rationale, 5);
    expect(result.auditParseFailed).toBe(false);
    expect(result.correctedScore).toBe(1);
    expect(result.scoreWasCorrected).toBe(false);
    expect(result.evidenceBlockMissing).toBe(true); // no inline citations, no fallback bracket
  });

  it('D1 two-letter NS prefix works correctly with inline citations', () => {
    const rationale =
      '[D1 audit: NS1=P(customer_done_state@/pricing) NS2=F NS3=P(case study@/customers) NS4=P(workflow@/docs) NS5=P(no conflicts@/pricing) NS6=F | pts=4/6 | gate=none | score=1] North star rationale.';
    const parsed = parseAuditBlock(rationale);
    expect(parsed).not.toBeNull();
    expect(parsed?.citations.NS1).toBe('customer_done_state@/pricing');
    expect(parsed?.hasEvidenceBlock).toBe(true);
  });
});

describe('correctDimensionScore — Entry 070 regression (real v41 semrush.com D1 rationale)', () => {
  it('correctly classifies the NS3 gate on the actual production text instead of falling through to unrecognized', () => {
    // Pulled verbatim from a live v41 scan, 2026-08-03. Note the LLM also
    // miscounted its own points (declared pts=3/6, but NS1/NS2/NS4/NS5 are
    // all P — actually 4 passes) — the pre-existing denominator-recompute
    // logic (unrelated to this entry) already handles that correctly and
    // is exercised here too.
    const rationale =
      "[D1 audit: NS1=P(north_star.customer_done_state@https://www.semrush.com/plans) NS2=P(Tier C: jtbd[0].inputs[]@user_input + jtbd[0].outputs[]@user_input + icp_profile.top_constraints[]@user_input) NS3=F NS4=P(observable_signals[0].excerpt@https://www.semrush.com/plans) NS5=P(north_star.primary_outcome_metric_name@user_input) NS6=F | pts=3/6 | gate=NS3 gate | score=1] Semrush clearly states its primary outcome...";
    // Entry 074 note: this fixture ALSO contains two fabricated citations —
    // NS2 (all three sources @user_input) and NS5 (@user_input) — on a
    // benchmark scan that received no insider inputs. Passing
    // insiderAnswersPresent:true here isolates the gate-classification
    // behaviour this test was written to protect; the fabricated-citation
    // path is asserted separately below.
    const result = correctDimensionScore(rationale, 1, { insiderAnswersPresent: true });
    expect(result.auditParseFailed).toBe(false);
    expect(result.gateClass).toEqual({ kind: 'cap', capValue: 1, defaulted: true });
    // 4 actual passes (denominator-corrected) maps to 1, capped at 1 by
    // NS3 — non-binding cap, so declared score of 1 is correct and no
    // correction fires, but the gate must be classified correctly to
    // reach that conclusion rather than accidentally agreeing by luck.
    expect(result.correctedScore).toBe(1);
    expect(result.scoreWasCorrected).toBe(false);
    expect(result.correctionReason).not.toBe('unrecognized-gate-not-corrected');
  });

  it('Entry 074: the SAME production fixture collapses to 0 under benchmark conditions, because two of its passes were fabricated', () => {
    // Real v41 semrush.com D1. On a benchmark scan (no insider inputs) NS2
    // and NS5 cite only "@user_input" — invented sources. Stripping them
    // leaves NS1 and NS4 as the only evidence-backed passes: 2/6 -> maps to
    // 0, and the NS3 cap (ceiling 1) is non-binding at 0. The declared score
    // of 1 was inflated purely by fabricated citations.
    const rationale =
      "[D1 audit: NS1=P(north_star.customer_done_state@https://www.semrush.com/plans) NS2=P(Tier C: jtbd[0].inputs[]@user_input + jtbd[0].outputs[]@user_input + icp_profile.top_constraints[]@user_input) NS3=F NS4=P(observable_signals[0].excerpt@https://www.semrush.com/plans) NS5=P(north_star.primary_outcome_metric_name@user_input) NS6=F | pts=3/6 | gate=NS3 gate | score=1] Semrush clearly states its primary outcome...";
    const result = correctDimensionScore(rationale, 1, { insiderAnswersPresent: false });
    expect(result.fabricatedCitationLabels).toEqual(['NS2', 'NS5']);
    expect(result.correctedScore).toBe(0);
    expect(result.scoreWasCorrected).toBe(true);
  });
});

describe('computeEvidenceQuality (Entry 071 — extracted from previously-untested index.ts logic)', () => {
  const baseResult = {
    auditParseFailed: false,
    evidenceBlockMissing: false,
    scoreWasCorrected: false,
    correctionReason: 'none' as const,
  };

  it('returns unverified when the audit block failed to parse', () => {
    expect(computeEvidenceQuality({ ...baseResult, auditParseFailed: true }, 0.65)).toBe('unverified');
  });

  it('returns unverified when the evidence block is missing, even with high confidence', () => {
    expect(computeEvidenceQuality({ ...baseResult, evidenceBlockMissing: true }, 0.9)).toBe('unverified');
  });

  it('returns flagged when the score was corrected', () => {
    expect(computeEvidenceQuality({ ...baseResult, scoreWasCorrected: true }, 0.65)).toBe('flagged');
  });

  it('returns flagged when the gate was unrecognized', () => {
    expect(
      computeEvidenceQuality({ ...baseResult, correctionReason: 'unrecognized-gate-not-corrected' }, 0.65),
    ).toBe('flagged');
  });

  it('returns flagged for genuinely low confidence (0.30)', () => {
    expect(computeEvidenceQuality(baseResult, 0.30000000000000004)).toBe('flagged');
  });

  it('returns verified for clearly medium/high confidence (0.65)', () => {
    expect(computeEvidenceQuality(baseResult, 0.6500000000000001)).toBe('verified');
  });

  it('REGRESSION (Entry 071): does not flag a confidence that floating-point-rounds to exactly 0.45 (real v42 semrush.com value)', () => {
    // This exact float — 0.44999999999999996 — was produced by a live scan
    // and wrongly triggered "flagged" under the old strict "< 0.45" check,
    // even though the prompt's own confidence labels treat 0.45 as the
    // floor of "Medium", not "Low".
    expect(computeEvidenceQuality(baseResult, 0.44999999999999996)).toBe('verified');
  });

  it('still correctly flags a confidence that is genuinely, meaningfully below 0.45', () => {
    expect(computeEvidenceQuality(baseResult, 0.44)).toBe('flagged');
  });

  it('treats a missing confidence value as 0 (flagged), not as passing', () => {
    expect(computeEvidenceQuality(baseResult, undefined)).toBe('flagged');
  });
});

describe('isWhollyInsiderSourced (Entry 074 — fabricated-citation detection)', () => {
  it('detects a single bare user_input source', () => {
    expect(isWhollyInsiderSourced('economic_buyer_role@user_input')).toBe(true);
  });

  it('detects a compound citation where every source is user_input (real conductor.com D3 S3)', () => {
    expect(
      isWhollyInsiderSourced('invoice@user_input + sso@user_input + dpa@user_input + audit_logs@user_input'),
    ).toBe(true);
  });

  it('does NOT flag a mixed citation that retains real public backing (real conductor.com D8 T5)', () => {
    // Half insider, half a genuine scraped page — the mark still has real
    // evidence behind it, so invalidating it would over-correct.
    expect(
      isWhollyInsiderSourced(
        'path-used-soc2_path: soc2@user_input + compliance_cert@https://www.conductor.com/platform/features/mcp-server',
      ),
    ).toBe(false);
  });

  it('handles the "Tier B:" prefix form (real hubspot.com D2 J3)', () => {
    expect(
      isWhollyInsiderSourced('Tier B: jtbd[0].inputs[]@user_input + jtbd[0].outputs[]@user_input'),
    ).toBe(true);
  });

  it('does not flag a purely public citation', () => {
    expect(isWhollyInsiderSourced('value_units[credit].definition@https://athenahq.ai/pricing')).toBe(false);
  });

  it('does not flag a citation naming no source at all (real hubspot.com D5 C5)', () => {
    // "auto-seat-based" cites nothing. That is a separate citation-quality
    // weakness; this guard deliberately does not widen its remit to cover it.
    expect(isWhollyInsiderSourced('auto-seat-based')).toBe(false);
  });
});

describe('correctDimensionScore — Entry 074 fabricated-citation guard', () => {
  // Verbatim production rationale: scrunch.com D4, v43 benchmark scan. Its
  // value-unit DEFINITION (V1) and METERING FORMULA (V2) — the two facts most
  // central to D4 — were both fabricated. Declared 5/6 -> score 2.
  const SCRUNCH_D4 =
    '[D4 audit: V1=P(definition@user_input) V2=P(Tier B: metering_formula@user_input + granularity@user_input + attribution_level@user_input) V3=P(unit_price-or-overage_unit_price@https://scrunch.com/pricing + included_units@https://scrunch.com/pricing) V4=P(value_anchor@user_input) V5=F V6=P(Tier B: audit_surface@https://scrunch.com/plans) | pts=4/6 | gate=none | score=1] Scrunch primary value unit.';

  it('demotes PASS marks whose only source was user_input when no insider answers were supplied', () => {
    const result = correctDimensionScore(SCRUNCH_D4, 4, { insiderAnswersPresent: false });
    // V1, V2, V4 fabricated -> only V3 and V6 survive -> 2/6 -> score 0.
    expect(result.fabricatedCitationMarksInvalidated).toBe(3);
    expect(result.fabricatedCitationLabels).toEqual(['V1', 'V2', 'V4']);
    expect(result.correctedScore).toBe(0);
  });

  it('KEEPS those marks when the scan genuinely received insider answers', () => {
    const result = correctDimensionScore(SCRUNCH_D4, 4, { insiderAnswersPresent: true });
    expect(result.fabricatedCitationMarksInvalidated).toBe(0);
    // 5 real passes -> maps to 2.
    expect(result.correctedScore).toBe(2);
  });

  it('FAILS CLOSED — a caller omitting options gets the strict evidence-only behaviour', () => {
    const result = correctDimensionScore(SCRUNCH_D4, 4);
    expect(result.fabricatedCitationMarksInvalidated).toBe(3);
    expect(result.correctedScore).toBe(0);
  });

  it('leaves a fully public dimension untouched (real athenahq.ai D2)', () => {
    const athenaD2 =
      '[D2 audit: J1=P(icp_profile.primary_buyer_role@https://athenahq.ai) J2=P(jtbd[0].job_statement@https://athenahq.ai) J3=P(Tier B: jtbd[0].inputs[]@https://athenahq.ai) J4=P(icp_profile.primary_workflows[]@https://athenahq.ai) J5=P(Tier C: icp_profile.primary_buyer_role@https://athenahq.ai) J6=P(positioning_surfaces[0].surface_type@https://athenahq.ai) | pts=6/6 | gate=none | score=2] AthenaHQ.';
    const result = correctDimensionScore(athenaD2, 2, { insiderAnswersPresent: false });
    expect(result.fabricatedCitationMarksInvalidated).toBe(0);
    expect(result.correctedScore).toBe(2);
    expect(result.scoreWasCorrected).toBe(false);
  });

  it('collapses a D2 built almost entirely on fabricated citations (real hubspot.com D2)', () => {
    const hubspotD2 =
      '[D2 audit: J1=P(primary_buyer_role@user_input + company_size_range@user_input + industries@user_input + top_constraints@user_input) J2=P(job_statement@user_input + inputs@user_input + outputs@user_input) J3=P(jtbd[0].must_have_requirements@user_input) J4=P(docs_quickstart@https://www.hubspot.com/pricing/content) J5=P(use_cases_page@https://www.hubspot.com/pricing) J6=P(case_study@https://www.hubspot.com/pricing) | pts=6/6 | gate=none | score=2] HubSpot.';
    const result = correctDimensionScore(hubspotD2, 2, { insiderAnswersPresent: false });
    expect(result.fabricatedCitationMarksInvalidated).toBe(3);
    // Only J4/J5/J6 are real -> 3/6 -> score 1, not the declared 2.
    expect(result.correctedScore).toBe(1);
    expect(result.scoreWasCorrected).toBe(true);
  });

  it('preserves a mixed citation with genuine public backing (real conductor.com D8 T5)', () => {
    const conductorD8 =
      '[D8 audit: T1=F T2=P(forecasting_surfaces.alerts@https://conductor.com) T3=F T4=F T5=P(path-used-soc2_path: soc2@user_input + compliance_cert@https://www.conductor.com/platform/features/mcp-server) T6=F | pts=2/6 | gate=T4 | score=1] Conductor.';
    const result = correctDimensionScore(conductorD8, 8, { insiderAnswersPresent: false });
    // T5 keeps its public half; nothing is invalidated.
    expect(result.fabricatedCitationMarksInvalidated).toBe(0);
  });

  it('re-judges the gate against sanitized marks, not the fabricated pass', () => {
    // R5's PASS is fabricated. The D7 R4-enterprise exception requires a
    // GENUINE R5=P; once R5 is invalidated the exception must not fire.
    const d7 =
      '[D7 audit: R1=P(overage_behavior@https://x.com/pricing) R2=P(unit@https://x.com/pricing) R3=P(alerts@https://x.com/pricing) R4=F R5=P(enterprise_true_up@user_input) R6=P(cost@https://x.com/pricing) | pts=5/6 | gate=R4 cap final score at 1 | score=2] X.';
    const result = correctDimensionScore(d7, 7, { insiderAnswersPresent: false });
    expect(result.fabricatedCitationLabels).toEqual(['R5']);
    expect(result.correctionReason).not.toBe('d7-r4-enterprise-exception-abstained');
    expect(result.correctedScore).toBe(1);
  });

  it('reports fabricated citations even when invalidation does not change the score', () => {
    // Two fabricated passes, but enough real passes remain that the mapped
    // score is unchanged — the dimension is still not trustworthy.
    const d5 =
      '[D5 audit: C1=P(a@user_input) C2=P(b@user_input) C3=P(c@https://x.com/p) C4=P(d@https://x.com/p) C5=P(e@https://x.com/p) C6=F | pts=5/6 | gate=none | score=2] X.';
    const result = correctDimensionScore(d5, 5, { insiderAnswersPresent: false });
    expect(result.fabricatedCitationMarksInvalidated).toBe(2);
    expect(result.correctedScore).toBe(1);
    expect(computeEvidenceQuality(result, 0.8)).toBe('flagged');
  });
});

describe('computeEvidenceQuality — Entry 074 integration', () => {
  const clean = {
    auditParseFailed: false,
    evidenceBlockMissing: false,
    scoreWasCorrected: false,
    correctionReason: 'none' as const,
  };

  it('flags a dimension with fabricated citations even at high confidence and no score change', () => {
    expect(
      computeEvidenceQuality({ ...clean, fabricatedCitationMarksInvalidated: 1 }, 0.9),
    ).toBe('flagged');
  });

  it('still returns verified when there are none', () => {
    expect(
      computeEvidenceQuality({ ...clean, fabricatedCitationMarksInvalidated: 0 }, 0.9),
    ).toBe('verified');
  });
});

describe('correctDimensionScore — Entry 075: D3 cross-segment aggregation must not be overwritten', () => {
  // Verbatim production rationale, tryprofound.com D3, v43 benchmark scan.
  // Marks are the highest-priority segment ONLY (4/5 -> would map to 2), but
  // the declared score of 1 is the aggregate across all 3 segments, and the
  // model flagged that divergence in the gate exactly as the prompt tells it
  // to. Entry 071 made this gate classify as 'none', which routed it into the
  // baseMappedScore overwrite and silently raised 1 -> 2.
  const PROFOUND_D3 =
    '[D3 audit: S1=P(segments[enterprise].economic_buyer_role@https://tryprofound.com/pricing) S2=P(tiers[Enterprise].payment_methods@https://tryprofound.com/pricing) S3=P(tiers[Enterprise].features@https://tryprofound.com/pricing) S4=F S5=P(tiers[Starter].target_segment@https://tryprofound.com/pricing) | pts=4/5 | gate=none, aggregated across 3 segments | score=1] Profound offers clear tiers.';

  it('preserves the declared cross-segment aggregate instead of remapping one segment (real tryprofound.com D3)', () => {
    const result = correctDimensionScore(PROFOUND_D3, 3, { insiderAnswersPresent: true });
    expect(result.correctedScore).toBe(1);
    expect(result.scoreWasCorrected).toBe(false);
    expect(result.correctionReason).toBe('d3-aggregation-abstained');
  });

  it('marks an abstained D3 as flagged, not verified — the corrector declined to check it', () => {
    const result = correctDimensionScore(PROFOUND_D3, 3, { insiderAnswersPresent: true });
    expect(computeEvidenceQuality(result, 0.9)).toBe('flagged');
  });

  it('Entry 077: abstains even with NO aggregation note — the note is emitted unreliably', () => {
    // Verbatim shape of peec.ai's v46 D3: pts=4/5 (maps to 2) declared as 1
    // with a BARE "gate=none". The same company emitted "aggregated across 3
    // segments" on the identical dimension under v43. Keying the abstention
    // on the note protected peec.ai in one run and silently inflated it in
    // the next, so the note can no longer be trusted as the signal.
    const noNote =
      '[D3 audit: S1=P(a@https://x.com/p) S2=P(b@https://x.com/p) S3=P(c@https://x.com/p) S4=P(d@https://x.com/p) S5=F | pts=4/5 | gate=none | score=1] X.';
    const result = correctDimensionScore(noNote, 3, { insiderAnswersPresent: true });
    expect(result.correctedScore).toBe(1);
    expect(result.correctionReason).toBe('d3-aggregation-abstained');
  });

  it('Entry 077: abstains on "aggregated across 1 segments" too — the segment COUNT is no more reliable than the note', () => {
    const oneSegment =
      '[D3 audit: S1=P(a@https://x.com/p) S2=P(b@https://x.com/p) S3=P(c@https://x.com/p) S4=P(d@https://x.com/p) S5=F | pts=4/5 | gate=none, aggregated across 1 segments | score=1] X.';
    const result = correctDimensionScore(oneSegment, 3, { insiderAnswersPresent: true });
    expect(result.correctedScore).toBe(1);
    expect(result.correctionReason).toBe('d3-aggregation-abstained');
  });

  it('treats an unsubstituted literal "N" as multi-segment and fails safe (real hubspot.com/similarweb.com shape)', () => {
    const literalN =
      '[D3 audit: S1=P(a@https://x.com/p) S2=P(b@https://x.com/p) S3=F S4=F S5=P(c@https://x.com/p) | pts=3/5 | gate=none, aggregated across N segments | score=1] X.';
    const result = correctDimensionScore(literalN, 3, { insiderAnswersPresent: true });
    expect(result.correctionReason).toBe('d3-aggregation-abstained');
    expect(result.correctedScore).toBe(1);
  });

  it('lets a real gate still override the aggregate (step 4: a triggered gate wins)', () => {
    const capped =
      '[D3 audit: S1=P(a@https://x.com/p) S2=P(b@https://x.com/p) S3=P(c@https://x.com/p) S4=P(d@https://x.com/p) S5=P(e@https://x.com/p) | pts=5/5 | gate=S4 cap final score at 1, aggregated across 3 segments | score=2] X.';
    const result = correctDimensionScore(capped, 3, { insiderAnswersPresent: true });
    expect(result.correctedScore).toBe(1);
    expect(result.correctionReason).toBe('cap-misapplied-as-floor');
  });

  it('does not abstain on other dimensions that happen to mention segments', () => {
    // D8 gates routinely say "fails for the highest-priority segment"; that is
    // a cap, not an aggregation note, and must keep correcting normally.
    const d8 =
      '[D8 audit: T1=F T2=F T3=F T4=F T5=P(soc2@https://x.com/p) T6=F | pts=1/6 | gate=T4 fails for the highest-priority segment | score=1] X.';
    const result = correctDimensionScore(d8, 8, { insiderAnswersPresent: true });
    expect(result.correctedScore).toBe(0);
    expect(result.correctionReason).toBe('cap-misapplied-as-floor');
  });
});

describe('d3AggregationSpansMultipleSegments', () => {
  it('true for a multi-segment count', () => {
    expect(d3AggregationSpansMultipleSegments('none, aggregated across 3 segments')).toBe(true);
  });
  it('false for exactly one segment', () => {
    expect(d3AggregationSpansMultipleSegments('none, aggregated across 1 segments')).toBe(false);
  });
  it('true for an unsubstituted literal N', () => {
    expect(d3AggregationSpansMultipleSegments('none, aggregated across N segments')).toBe(true);
  });
  it('false when there is no aggregation note at all', () => {
    expect(d3AggregationSpansMultipleSegments('none')).toBe(false);
  });
});

describe('parseAuditBlock — Entry 076: mark alternation from the prompt template', () => {
  // The format template in index.ts spells options out as "S1=P(<field@page>)|F",
  // so the model periodically copies the alternation into its answer. Before
  // this fix the alternation broke the contiguous marks-span match and the
  // ENTIRE block failed to parse — auditParseFailed, no correction, the
  // declared score standing completely unaudited.
  it('parses "R5=F|NA" (verbatim conductor.com + peec.ai v45 D7 output)', () => {
    const rationale =
      '[D7 audit: R1=P(overage_behavior@https://www.conductor.com/pricing) R2=P(overage_unit_price@https://www.conductor.com/pricing) R3=F R4=F R5=F|NA R6=F | pts=2/5 | gate=cap score at 1 | score=1] Conductor.';
    const parsed = parseAuditBlock(rationale);
    expect(parsed).not.toBeNull();
    expect(parsed?.marks.R5).toBe('F');
    expect(parsed?.declaredScore).toBe(1);
  });

  it('parses a PASS written with an alternation suffix, keeping its citation', () => {
    const rationale =
      '[D3 audit: S1=P(economic_buyer_role@https://x.com/pricing)|F S2=F S3=F S4=F S5=F | pts=1/5 | gate=none | score=0] X.';
    const parsed = parseAuditBlock(rationale);
    expect(parsed?.marks.S1).toBe('P');
    expect(parsed?.citations.S1).toBe('economic_buyer_role@https://x.com/pricing');
  });

  it('still corrects normally through an alternation mark rather than failing open', () => {
    const rationale =
      '[D7 audit: R1=P(a@https://x.com/p) R2=P(b@https://x.com/p) R3=F R4=F R5=F|NA R6=F | pts=2/5 | gate=cap score at 1 | score=1] X.';
    const result = correctDimensionScore(rationale, 7, { insiderAnswersPresent: true });
    expect(result.auditParseFailed).toBe(false);
    expect(result.correctedScore).toBe(0);
    expect(result.correctionReason).toBe('cap-misapplied-as-floor');
  });

  it('leaves ordinary NA marks working exactly as before', () => {
    const rationale =
      '[D7 audit: R1=F R2=F R3=F R4=F R5=NA R6=F | pts=0/5 | gate=none | score=0] X.';
    const parsed = parseAuditBlock(rationale);
    expect(parsed?.marks.R5).toBe('NA');
    expect(parsed?.declaredDenominator).toBe(5);
  });
});

describe('Entry 074 guard — verbatim tryprofound.com v47 production blocks', () => {
  // Pulled from the live v47 scan, 2026-08-05. These document the case that
  // initially looked like the guard had failed: five dimensions contained
  // "@user_input" yet rubricCorrections came back empty. The guard DID fire —
  // the demotions simply didn't move the score, because a cap gate was
  // already binding at 1 in each case.
  it('D5: demotes the single wholly-insider mark; cap keeps the score at 1', () => {
    const d5 =
      '[D5 audit: C1=P(cost_drivers[prompts tracked].name@https://tryprofound.com/pricing + cost_drivers[Agents credits].name@https://tryprofound.com/pricing + cost_drivers[Answer Engines tracked].name@https://tryprofound.com/pricing) C2=F C3=P(workflows[AEO Marketing].primary_value_unit_name@user_input) C4=P(tiers[Starter].included_units@https://tryprofound.com/pricing) C5=P(tiers[Starter].overage_enabled@https://tryprofound.com/pricing) C6=F | pts=4/6 | gate=C6 gate | score=1] Profound identifies key cost drivers.';
    const result = correctDimensionScore(d5, 5, { insiderAnswersPresent: false });
    expect(result.fabricatedCitationLabels).toEqual(['C3']);
    expect(result.correctedScore).toBe(1);
    expect(result.scoreWasCorrected).toBe(false);
    // Score unchanged, but the dimension must NOT read as verified.
    expect(computeEvidenceQuality(result, 0.8)).toBe('flagged');
  });

  it('D6: demotes two wholly-insider marks, PRESERVES the compound one, cap holds at 1', () => {
    const d6 =
      '[D6 audit: P1=P(tiers[Starter].name@https://tryprofound.com/pricing) P2=P(packaging.exploration_offering@https://tryprofound.com/pricing + packaging.production_offering@https://tryprofound.com/pricing + tiers[Starter].name@https://tryprofound.com/pricing) P3=P(pools[Starter Agents].unit_name@https://tryprofound.com/pricing) P4=P(pools[Starter Agents].scope@user_input) P5=P(tiers[Growth].upgrade_path_next@user_input) P6=P(tiers[Starter].overage_unit_price@user_input + tiers[Starter].unit_name@https://tryprofound.com/pricing + tiers[Starter].included_units@https://tryprofound.com/pricing) | pts=6/6 | gate=P3 gate | score=1] Profound offers clear tiered packaging.';
    const result = correctDimensionScore(d6, 6, { insiderAnswersPresent: false });
    expect(result.fabricatedCitationLabels).toEqual(['P4', 'P5']);
    expect(result.correctedScore).toBe(1);
  });

  it('D7: leaves a compound R5 alone — real pages still back it', () => {
    const d7 =
      '[D7 audit: R1=P(policies.overage_behavior@https://tryprofound.com/pricing) R2=F R3=P(tiers[Starter].alert_policy@https://tryprofound.com/pricing) R4=F R5=P(tiers[Enterprise].payment_methods@https://tryprofound.com/pricing + policies.enterprise_true_up@user_input + policies.overage_behavior@https://tryprofound.com/pricing) R6=P(forecasting_surfaces.estimation_surface@https://tryprofound.com/pricing) | pts=4/6 | gate=R4 gate | score=1] Profound explicitly states overage behavior.';
    const result = correctDimensionScore(d7, 7, { insiderAnswersPresent: false });
    expect(result.fabricatedCitationMarksInvalidated).toBe(0);
    expect(result.correctedScore).toBe(1);
  });
});

describe('correctDimensionScore — Entry 079: a D3 cap is a ceiling, never a floor', () => {
  it('does NOT raise a low aggregate up to the cap (the hole Entry 077 left open)', () => {
    // Marks map to 2, cap is 1, but the declared cross-segment aggregate is 0
    // because weaker segments pull it down. MIN(baseMapped=2, cap=1) would
    // have published 1 — a ceiling silently acting as a floor.
    const d3 =
      '[D3 audit: S1=P(a@https://x.com/p) S2=P(b@https://x.com/p) S3=P(c@https://x.com/p) S4=P(d@https://x.com/p) S5=P(e@https://x.com/p) | pts=5/5 | gate=S4 cap final score at 1 | score=0] X.';
    const result = correctDimensionScore(d3, 3, { insiderAnswersPresent: true });
    expect(result.correctedScore).toBe(0);
    expect(result.scoreWasCorrected).toBe(false);
  });

  it('still enforces the cap downward when the declared score exceeds it', () => {
    const d3 =
      '[D3 audit: S1=P(a@https://x.com/p) S2=P(b@https://x.com/p) S3=P(c@https://x.com/p) S4=P(d@https://x.com/p) S5=P(e@https://x.com/p) | pts=5/5 | gate=S4 cap final score at 1 | score=2] X.';
    const result = correctDimensionScore(d3, 3, { insiderAnswersPresent: true });
    expect(result.correctedScore).toBe(1);
    expect(result.correctionReason).toBe('cap-misapplied-as-floor');
  });

  it('leaves the cap logic on other dimensions unchanged', () => {
    // D6: baseMapped IS authoritative there, so MIN(baseMapped, cap) stands.
    const d6 =
      '[D6 audit: P1=F P2=F P3=F P4=F P5=F P6=F | pts=0/6 | gate=P3 cap final score at 1 | score=1] X.';
    const result = correctDimensionScore(d6, 6, { insiderAnswersPresent: true });
    expect(result.correctedScore).toBe(0);
    expect(result.correctionReason).toBe('cap-misapplied-as-floor');
  });
});
