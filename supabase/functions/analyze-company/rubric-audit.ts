// Rubric Audit Validator — server-side correction layer for D5-D8 scoring.
//
// The RUBRIC_SCORING_PROMPT (index.ts) instructs the LLM to embed a
// machine-readable "[D_ audit: ...]" + "[D_ evidence: ...]" block in each
// D5-D8 dimension's rationale. Nothing previously verified that the LLM's
// declared score actually matches its own audit block's arithmetic — see
// ENGINE_DEBUG_LOG.md Entries 055, 064, 065, 066. This module parses those
// blocks and recomputes the correct score deterministically.
//
// Pure, dependency-free TS (no Deno-only APIs) so it's directly importable
// by both index.ts (Deno) and vitest (Node) without a mirror/drift setup.

export type SubtestMark = 'P' | 'F' | 'NA';

export interface AuditBlock {
  dimensionNumber: number;
  marks: Record<string, SubtestMark>;
  declaredPts: number;
  declaredDenominator: number;
  gateText: string;
  declaredScore: number;
  hasEvidenceBlock: boolean;
}

export type GateClass =
  | { kind: 'none' }
  | { kind: 'cap'; capValue: number; defaulted: boolean }
  | { kind: 'hard-zero' }
  | { kind: 'unrecognized'; text: string };

export type CorrectionReason =
  | 'none'
  | 'cap-misapplied-as-floor'
  | 'unexplained-mismatch'
  | 'wrong-denominator'
  | 'legitimate-floor-preserved'
  | 'legitimate-cap-preserved'
  | 'hard-zero-applied'
  | 'unrecognized-gate-not-corrected'
  | 'd7-r4-enterprise-exception-abstained';

export interface CorrectionResult {
  correctedScore: number;
  scoreWasCorrected: boolean;
  correctionReason: CorrectionReason;
  correctedDenominator?: number;
  auditParseFailed: boolean;
  evidenceBlockMissing: boolean;
  gateClass?: GateClass;
  /** Raw gate text from the audit block, for telemetry. */
  gateText?: string;
}

// All 8 dimension names, in the order the scoring prompt uses them. D1-D4
// gained the mandatory audit-block procedure in Entry 068 — previously only
// D5-D8 were audited server-side.
export const AUDITED_DIMENSION_NAMES: Record<number, string> = {
  1: 'Product north star',
  2: 'ICP and job clarity',
  3: 'Buyer and budget alignment',
  4: 'Value unit',
  5: 'Cost driver mapping',
  6: 'Pools and packaging',
  7: 'Overages and risk allocation',
  8: 'Safety rails and trust surfaces',
};

// Reverse lookup — dimension display name -> dimension number. Single
// source of truth for the name<->number mapping so index.ts doesn't need
// its own copy that could drift from AUDITED_DIMENSION_NAMES.
export const AUDITED_DIMENSION_NUMBER_BY_NAME: Record<string, number> = Object.fromEntries(
  Object.entries(AUDITED_DIMENSION_NAMES).map(([num, name]) => [name, Number(num)]),
);

// Matches: "[D5 audit: C1=P C2=F ... | pts=4/6 | gate=<free text> | score=1]"
// Non-greedy gate capture stops at the literal "| score=" per the prompt's
// own mandated tail format (identical across D1-D8, index.ts — D5-D8 use
// single-letter subtest prefixes (C/P/R/T), D1 uses the two-letter "NS"
// prefix (NS1-NS6, Entry 068), so the mark pattern allows 1-2 letters.
const AUDIT_BLOCK_PATTERN =
  /\[D(\d)\s+audit:\s*((?:[A-Z]{1,2}\d\s*=\s*(?:P|F|NA)\s*)+)\|\s*pts\s*=\s*(\d+)\s*\/\s*(\d+)\s*\|\s*gate\s*=\s*(.*?)\s*\|\s*score\s*=\s*(\d+)\s*\]/i;

const MARK_PATTERN = /([A-Z]{1,2}\d)\s*=\s*(P|F|NA)/g;

// The code-generated Score Floor marker (applyDigestFloor in index.ts,
// lines ~2599-2633) — deterministic code, not an LLM claim. When present,
// it must always be trusted and never overridden by this module.
const FLOOR_MARKER_PATTERN = /\[Score floored to (\d+) based on \d+[^\]]*\]/i;

export function parseAuditBlock(rationale: string): AuditBlock | null {
  const match = AUDIT_BLOCK_PATTERN.exec(rationale);
  if (!match) return null;

  const dimensionNumber = Number(match[1]);
  const marksSpan = match[2];
  const declaredPts = Number(match[3]);
  const declaredDenominator = Number(match[4]);
  const gateText = match[5].trim();
  const declaredScore = Number(match[6]);

  const marks: Record<string, SubtestMark> = {};
  let markMatch: RegExpExecArray | null;
  const markRe = new RegExp(MARK_PATTERN.source, MARK_PATTERN.flags);
  while ((markMatch = markRe.exec(marksSpan)) !== null) {
    marks[markMatch[1]] = markMatch[2] as SubtestMark;
  }

  const hasEvidenceBlock = new RegExp(`\\[D${dimensionNumber}\\s+evidence:`, 'i').test(rationale);

  return {
    dimensionNumber,
    marks,
    declaredPts,
    declaredDenominator,
    gateText,
    declaredScore,
    hasEvidenceBlock,
  };
}

/**
 * Classifies free-text gate language into a structured type.
 *
 * Gate text is NOT an enum in the prompt — it varies by dimension and even
 * by which gate within a dimension fired (see index.ts lines ~752-753,
 * 932-934, 1126-1129, 1321-1323 for the real source phrasings this is
 * built against). Order matters: hard-zero is checked before cap because
 * some hard-zero phrasings could otherwise loosely match a "score" pattern.
 */
export function classifyGate(gateText: string, dimensionMarks?: Record<string, SubtestMark>): GateClass {
  const text = gateText.trim();

  if (/^none$/i.test(text) || text.length === 0) {
    return { kind: 'none' };
  }

  // Hard-zero (explicit): unconditional override to 0 spelled out in the
  // gate text itself. Real phrasings: "final dimension score = 0" (D6
  // missing primary_unit_name, D7 missing overage_behavior AND
  // overage_enabled). Checked FIRST because these are unambiguous.
  if (
    /final\s+(?:dimension\s+)?score\s*[=:→]\s*0/i.test(text) ||
    /\bscore\s*[:=→]\s*0\b/i.test(text)
  ) {
    return { kind: 'hard-zero' };
  }

  // Cap: score cannot EXCEED the cited value — only lowers a score that
  // would otherwise be higher, never raises one that's already lower.
  // Checked BEFORE the missing-field hard-zero fallback because D7's
  // auto_topup gate ("...tiers[].topup_increment is missing: cap final
  // score at 1") contains both "missing" and "overage_behavior" yet is
  // explicitly a cap — the fallback would misclassify it as hard-zero.
  const capMatch = text.match(/cap(?:s|ped)?\b.*?\b(?:at|to)\s+(\d)\b/i)
    || text.match(/(?:score\s+)?(?:may\s+not\s+exceed|not\s+exceed)\s+(\d)/i);
  if (capMatch) {
    return { kind: 'cap', capValue: Number(capMatch[1]), defaulted: false };
  }
  if (/\bcap\b/i.test(text)) {
    // A cap is clearly referenced but no numeral was extractable.
    return { kind: 'cap', capValue: 1, defaulted: true };
  }

  // Hard-zero (fallback): an abbreviated citation of one of the two known
  // hard-zero triggers with no score/cap wording at all (e.g.
  // "primary_unit_name missing"). Only reached after explicit score-0 and
  // cap patterns both failed to match, so it can't swallow cap gates.
  if (/\bmissing\b/i.test(text) && /\b(overage_behavior|primary_unit_name)\b/i.test(text)) {
    return { kind: 'hard-zero' };
  }

  // Gate text that names one of this dimension's own marked subtests but
  // doesn't spell out "cap" — e.g. "T4", "T4 fails for the highest-priority
  // segment", "P3 fails for the highest-priority segment" (all confirmed
  // real production output, ENGINE_DEBUG_LOG Entry 066). Every gate in this
  // rubric except the two hard-zero cases (D6 missing primary_unit_name, D7
  // missing overage_behavior) caps at 1 — there is no other gate semantics
  // in the spec — so any abbreviated reference to a failing subtest is
  // unambiguous shorthand for "cap at 1", not a guess.
  if (dimensionMarks) {
    const labelMatch = text.match(/\b([A-Z]\d)\b/);
    if (labelMatch && labelMatch[1] in dimensionMarks) {
      return { kind: 'cap', capValue: 1, defaulted: true };
    }
  }

  return { kind: 'unrecognized', text };
}

// D3 (Buyer & Budget Alignment) has only 5 subtests (S1-S5), scored per
// highest-priority segment, with its own distinct thresholds (0-1→0, 2-3→1,
// 4-5→2) — genuinely different from every other dimension's /6 scale.
// IMPORTANT: this must be keyed off dimensionNumber, not the raw effective
// denominator — D7's optional R5 mark can also legitimately be NA, dropping
// ITS effective denominator to 5 too, but D7 must keep the standard
// /6-shaped thresholds (0-2→0,3-4→1,5-6→2) even then. A denominator-value
// check alone would wrongly apply D3's thresholds to that D7 case.
// See index.ts D3's MANDATORY SCORING PROCEDURE.
function mapPointsToScore(points: number, dimensionNumber: number): number {
  if (dimensionNumber === 3) {
    if (points >= 4) return 2;
    if (points >= 2) return 1;
    return 0;
  }
  if (points >= 5) return 2;
  if (points >= 3) return 1;
  return 0;
}

/**
 * Recomputes the correct score for a D5-D8 dimension from its audit block,
 * independent of what the LLM declared. See ENGINE_DEBUG_LOG.md Entries
 * 064/065/066 for the confirmed real-world cases this directly fixes.
 */
export function correctDimensionScore(rationale: string, expectedDimensionNumber: number): CorrectionResult {
  const parsed = parseAuditBlock(rationale);

  if (!parsed || parsed.dimensionNumber !== expectedDimensionNumber) {
    return {
      correctedScore: NaN,
      scoreWasCorrected: false,
      correctionReason: 'none',
      auditParseFailed: true,
      evidenceBlockMissing: true,
    };
  }

  const evidenceBlockMissing = !parsed.hasEvidenceBlock;

  // R5 (D7 only) may legitimately be NA — expected denominator drops to 5.
  const naCount = Object.values(parsed.marks).filter((m) => m === 'NA').length;
  const markCount = Object.keys(parsed.marks).length;
  const expectedDenominator = markCount - naCount;
  const actualPassCount = Object.values(parsed.marks).filter((m) => m === 'P').length;

  let denominatorWasWrong = false;
  let effectivePts = parsed.declaredPts;
  let effectiveDenominator = parsed.declaredDenominator;

  if (parsed.declaredDenominator !== expectedDenominator || parsed.declaredPts !== actualPassCount) {
    denominatorWasWrong = true;
    effectivePts = actualPassCount;
    effectiveDenominator = expectedDenominator;
  }

  const baseMappedScore = mapPointsToScore(effectivePts, expectedDimensionNumber);

  // The Score Floor guardrail (applyDigestFloor in index.ts) is
  // deterministic code, not an LLM claim — when its marker is present,
  // always trust it and never override the score.
  const floorMatch = rationale.match(FLOOR_MARKER_PATTERN);
  if (floorMatch) {
    const flooredScore = Number(floorMatch[1]);
    return {
      correctedScore: flooredScore,
      scoreWasCorrected: false,
      correctionReason: 'legitimate-floor-preserved',
      correctedDenominator: denominatorWasWrong ? effectiveDenominator : undefined,
      auditParseFailed: false,
      evidenceBlockMissing,
    };
  }

  const gateClass = classifyGate(parsed.gateText, parsed.marks);
  let correctedScore: number;
  let correctionReason: CorrectionReason;

  switch (gateClass.kind) {
    case 'hard-zero':
      correctedScore = 0;
      correctionReason = parsed.declaredScore !== 0 ? 'hard-zero-applied' : 'none';
      break;
    case 'cap':
      // D7 R4-enterprise exception (ENGINE_DEBUG_LOG Entry 055): the spec
      // says "if R4 fails ... the score CANNOT exceed 1 UNLESS an
      // enterprise segment independently reaches 5-6 points." When the
      // gate references R4 and the enterprise condition holds (R5=P with
      // 5+ points), the cap's applicability depends on segment-level
      // semantics this module can't see — abstain rather than risk
      // reintroducing Entry 055's error in the opposite direction.
      if (
        parsed.dimensionNumber === 7 &&
        /\bR4\b/i.test(parsed.gateText) &&
        parsed.marks.R5 === 'P' &&
        effectivePts >= 5
      ) {
        correctedScore = parsed.declaredScore;
        correctionReason = 'd7-r4-enterprise-exception-abstained';
        break;
      }
      correctedScore = Math.min(baseMappedScore, gateClass.capValue);
      if (parsed.declaredScore === correctedScore) {
        // Cap was binding and applied correctly, or non-binding and
        // correctly left alone — either way, nothing to fix.
        correctionReason = baseMappedScore > gateClass.capValue ? 'legitimate-cap-preserved' : 'none';
      } else {
        correctionReason = 'cap-misapplied-as-floor';
      }
      break;
    case 'unrecognized':
      correctedScore = parsed.declaredScore;
      correctionReason = 'unrecognized-gate-not-corrected';
      break;
    case 'none':
    default:
      correctedScore = baseMappedScore;
      correctionReason = parsed.declaredScore !== correctedScore ? 'unexplained-mismatch' : 'none';
      break;
  }

  // Wrong denominator can co-occur with a correct or incorrect final score
  // (ENGINE_DEBUG_LOG Entry 064: Similarweb D7 had both wrong; Botify D7 had
  // only the denominator wrong). Surface it as its own reason only when it's
  // the sole discrepancy found.
  if (denominatorWasWrong && correctionReason === 'none') {
    correctionReason = 'wrong-denominator';
  }

  const scoreWasCorrected = correctedScore !== parsed.declaredScore;

  return {
    correctedScore,
    scoreWasCorrected,
    correctionReason,
    correctedDenominator: denominatorWasWrong ? effectiveDenominator : undefined,
    auditParseFailed: false,
    evidenceBlockMissing,
    gateClass,
    gateText: parsed.gateText,
  };
}
