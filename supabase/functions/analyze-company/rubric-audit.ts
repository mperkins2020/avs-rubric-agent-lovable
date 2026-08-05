// Rubric Audit Validator — server-side correction layer for D1-D8 scoring.
//
// The RUBRIC_SCORING_PROMPT (index.ts) instructs the LLM to embed a
// machine-readable "[D_ audit: ...]" block in each dimension's rationale,
// with each PASS mark's supporting citation attached inline in parentheses
// (e.g. "C1=P(tasks@/pricing)") rather than in a separate evidence bracket.
// Nothing previously verified that the LLM's declared score actually
// matches its own audit block's arithmetic — see ENGINE_DEBUG_LOG.md
// Entries 055, 064, 065, 066. This module parses those blocks and
// recomputes the correct score deterministically.
//
// Format history (Entry 069, 2026-08-03): originally the prompt asked for
// TWO brackets per dimension — "[D_ audit: ...]" then a separate
// "[D_ evidence: field←page + ...]" line. Real-world data showed the LLM
// reliably produced the first bracket but essentially never produced the
// second (~0% compliance across every sample checked this cycle, Entries
// 065/068). Merged into ONE bracket with inline per-mark citations, betting
// that extending an already-high-compliance format beats asking for a
// second, apparently-easy-to-skip one. The parser below accepts BOTH the
// new inline format and the old separate-bracket format as satisfying the
// evidence requirement, so a stray old-format response (or historical
// stored rationale, though nothing re-parses that after the fact) doesn't
// get wrongly flagged.
//
// Pure, dependency-free TS (no Deno-only APIs) so it's directly importable
// by both index.ts (Deno) and vitest (Node) without a mirror/drift setup.

export type SubtestMark = 'P' | 'F' | 'NA';

export interface AuditBlock {
  dimensionNumber: number;
  marks: Record<string, SubtestMark>;
  /** Inline per-mark citation text, e.g. marks.C1='P' + citations.C1='tasks@/pricing'. Only present for marks with a non-empty parenthetical. */
  citations: Record<string, string>;
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
  | 'd7-r4-enterprise-exception-abstained'
  | 'd3-aggregation-abstained';

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
  /**
   * Count of PASS marks demoted to F because every source they cited was
   * "@user_input" on a scan that received no insider inputs — i.e. the model
   * invented the citation. See ENGINE_DEBUG_LOG.md Entry 074.
   */
  fabricatedCitationMarksInvalidated: number;
  /** Subtest labels demoted by the above, for telemetry (e.g. ["J1","J2"]). */
  fabricatedCitationLabels?: string[];
}

export interface CorrectionOptions {
  /**
   * Whether this scan actually received insider answers. `run-benchmark`
   * never sends them (Entry 074), so it is false for every benchmark scan.
   * When false, an "@user_input" citation cannot be genuine and any PASS
   * mark resting solely on one is invalidated before scoring.
   *
   * Defaults to FALSE — fail closed. A caller that forgets to pass this gets
   * the strict, evidence-only behaviour rather than silently trusting
   * fabricated citations.
   */
  insiderAnswersPresent?: boolean;
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

// Matches: "[D5 audit: C1=P(tasks@/pricing) C2=F ... | pts=4/6 | gate=<free text> | score=1]"
// Non-greedy gate capture stops at the literal "| score=" per the prompt's
// own mandated tail format (identical across D1-D8, index.ts — D5-D8 use
// single-letter subtest prefixes (C/P/R/T), D1 uses the two-letter "NS"
// prefix (NS1-NS6, Entry 068), so the mark pattern allows 1-2 letters. Each
// mark may carry an optional parenthesized inline citation (Entry 069) —
// mandatory for PASS marks under the current prompt, absent for FAIL/NA.
// The trailing "(?:\|(?:P|F|NA))?" tolerates a mark written as an ALTERNATION
// — e.g. "R5=F|NA" or "S1=P(cite@url)|F". The prompt's own format template
// spells the options out that way ("S1=P(<field@page-path>)|F"), so the model
// periodically copies the alternation into its answer. Before this, such a
// mark broke the contiguous marks-span match and the WHOLE block failed to
// parse, which meant auditParseFailed -> no correction at all -> the model's
// declared score stood entirely unaudited. Fail-open on a parse quirk the
// prompt itself induced. See ENGINE_DEBUG_LOG.md Entry 076.
const AUDIT_BLOCK_PATTERN =
  /\[D(\d)\s+audit:\s*((?:[A-Z]{1,2}\d\s*=\s*(?:P|F|NA)(?:\([^)]*\))?(?:\|(?:P|F|NA))?\s*)+)\|\s*pts\s*=\s*(\d+)\s*\/\s*(\d+)\s*\|\s*gate\s*=\s*(.*?)\s*\|\s*score\s*=\s*(\d+)\s*\]/i;

// Captures the FIRST token of an alternation as the operative mark: "F|NA"
// reads as F. F is the stricter reading (it counts in the denominator and
// does not pass, where NA would shrink the denominator), and the existing
// denominator-recompute logic reconciles any resulting mismatch with the
// model's declared pts anyway.
const MARK_PATTERN = /([A-Z]{1,2}\d)\s*=\s*(P|F|NA)(?:\(([^)]*)\))?(?:\|(?:P|F|NA))?/g;

// The code-generated Score Floor marker (applyDigestFloor in index.ts,
// lines ~2599-2633) — deterministic code, not an LLM claim. When present,
// it must always be trusted and never overridden by this module.
const FLOOR_MARKER_PATTERN = /\[Score floored to (\d+) based on \d+[^\]]*\]/i;

// Extracts the source token from each "field@source" pair inside a citation.
// Real citation shapes this must handle (all verbatim from production):
//   "economic_buyer_role@user_input"
//   "invoice@user_input + sso@user_input + dpa@user_input"
//   "soc2@user_input + compliance_cert@https://conductor.com/platform/..."
//   "Tier B: jtbd[0].inputs[]@user_input + jtbd[0].outputs[]@user_input"
//   "auto-seat-based"                        <- no source at all
// Stops at whitespace, "+", "," or ")" so a URL source is captured whole.
const CITATION_SOURCE_PATTERN = /@([^\s+,)]+)/g;

const INSIDER_SOURCE_TOKEN = 'user_input';

// D3 alone reports a bracket whose marks and score measure DIFFERENT things:
// the prompt (index.ts step 6) mandates "the P/F marks and pts are the
// highest-priority segment's alone" while "score" is the FINAL cross-segment
// aggregate, and instructs the model to flag the divergence in the gate field
// as "gate=none, aggregated across N segments". See ENGINE_DEBUG_LOG Entry 075.
const D3_AGGREGATION_NOTE = /\baggregated\s+across\s+(\d+|N)\s+segments?\b/i;

/**
 * True when a D3 gate's aggregation note covers MORE than one segment — i.e.
 * the declared score is a cross-segment average that the highest-priority
 * segment's own marks cannot reproduce, so recomputing from those marks would
 * destroy it.
 *
 * "aggregated across 1 segments" is NOT multi-segment: with a single segment
 * the aggregate is that segment, the mapping must hold, and normal correction
 * should still catch genuine arithmetic errors.
 *
 * A literal, unsubstituted "N" (the model echoing the prompt's placeholder —
 * observed on hubspot.com and similarweb.com) is treated as multi-segment:
 * the count can't be verified, so fail safe toward not overwriting.
 */
export function d3AggregationSpansMultipleSegments(gateText: string): boolean {
  const m = gateText.match(D3_AGGREGATION_NOTE);
  if (!m) return false;
  return /^\d+$/.test(m[1]) ? Number(m[1]) > 1 : true;
}

/**
 * True when a citation names at least one source and EVERY source it names is
 * "user_input". Compound citations that mix an insider source with a real page
 * (e.g. "soc2@user_input + compliance_cert@https://...") are NOT wholly
 * insider-sourced — they retain genuine public backing, so the mark stands.
 *
 * A citation naming no source at all (e.g. "auto-seat-based") returns false:
 * that is a separate, pre-existing weakness in citation quality and this
 * function deliberately does not widen its own remit to cover it.
 */
export function isWhollyInsiderSourced(citation: string): boolean {
  const sources = [...citation.matchAll(CITATION_SOURCE_PATTERN)].map((m) => m[1].toLowerCase());
  if (sources.length === 0) return false;
  return sources.every((s) => s === INSIDER_SOURCE_TOKEN);
}

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
  const citations: Record<string, string> = {};
  let markMatch: RegExpExecArray | null;
  const markRe = new RegExp(MARK_PATTERN.source, MARK_PATTERN.flags);
  while ((markMatch = markRe.exec(marksSpan)) !== null) {
    marks[markMatch[1]] = markMatch[2] as SubtestMark;
    const citation = markMatch[3]?.trim();
    if (citation) citations[markMatch[1]] = citation;
  }

  // Evidence requirement is satisfied by EITHER format:
  // (a) new inline-citation format (Entry 069) — every PASS mark has a
  //     non-empty parenthetical citation attached directly to it, or
  // (b) old separate-bracket format — a standalone "[D_ evidence: ...]"
  //     line exists elsewhere in the rationale (kept as a fallback in case
  //     the LLM reverts to the old style, or for any transitional output).
  // A PASS mark with no inline citation under format (a) is the exact
  // "evidence entry is missing/none" INVALID case the prompt's own rule
  // already describes — same standard as before, checked differently.
  const passMarksWithoutCitation = Object.entries(marks).filter(
    ([label, mark]) => mark === 'P' && !citations[label],
  );
  const hasInlineEvidence = passMarksWithoutCitation.length === 0;
  const hasSeparateEvidenceBracket = new RegExp(`\\[D${dimensionNumber}\\s+evidence:`, 'i').test(rationale);
  const hasEvidenceBlock = hasInlineEvidence || hasSeparateEvidenceBracket;

  return {
    dimensionNumber,
    marks,
    citations,
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

  // Entry 071: was anchored to match ONLY the exact string "none" — but the
  // D3 MANDATORY SCORING PROCEDURE (Entry 068) explicitly instructs the LLM
  // to write "gate=none, aggregated across N segments" whenever cross-
  // segment aggregation changes the reported score from what the highest-
  // priority segment's own points would map to. That phrasing legitimately
  // starts with "none" but never matched the exact-string check, so a
  // correctly-behaving D3 response following its own prompt's instructions
  // fell through to 'unrecognized' every time aggregation actually mattered
  // — caught via hand-verification of a live v42 semrush.com rescan.
  // \b after "none" still rejects unrelated words like "nonexistent".
  if (/^none\b/i.test(text) || text.length === 0) {
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
  // Label pattern allows 1-2 letters (Entry 070) — D1 uses the two-letter
  // "NS" prefix (NS1-NS6); a single-letter-only pattern here caused a real
  // production miss ("NS3 gate" fell through to 'unrecognized' instead of
  // being read as a cap-at-1), confirmed via hand-verification of a live
  // v41 semrush.com rescan. The audit-block parser (AUDIT_BLOCK_PATTERN,
  // MARK_PATTERN) already got this same fix in Entry 068; this regex was
  // missed at the time.
  if (dimensionMarks) {
    const labelMatch = text.match(/\b([A-Z]{1,2}\d)\b/);
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
export function correctDimensionScore(
  rationale: string,
  expectedDimensionNumber: number,
  options: CorrectionOptions = {},
): CorrectionResult {
  const parsed = parseAuditBlock(rationale);

  if (!parsed || parsed.dimensionNumber !== expectedDimensionNumber) {
    return {
      correctedScore: NaN,
      scoreWasCorrected: false,
      correctionReason: 'none',
      auditParseFailed: true,
      evidenceBlockMissing: true,
      fabricatedCitationMarksInvalidated: 0,
    };
  }

  const evidenceBlockMissing = !parsed.hasEvidenceBlock;

  // ENGINE_DEBUG_LOG Entry 074 — fabricated-citation guard.
  //
  // `run-benchmark` never sends insiderAnswers, so the INSIDER ANSWERS prompt
  // block never renders on a benchmark scan and the model has no insider
  // inputs to cite. It cites "@user_input" anyway, in direct violation of the
  // rule in its own prompt ("may only be cited when the scan actually
  // received insider inputs for that field"). The evidence check upstream
  // only tests that a citation is non-empty, never what it says, so a
  // fabricated citation passed exactly like a verified URL and inflated the
  // pass count. Distribution was inversely correlated with public disclosure:
  // the companies publishing least had the most fabricated citations.
  //
  // Fail closed: unless the caller positively asserts insider answers were
  // supplied, any PASS resting *solely* on "@user_input" is demoted to F here
  // — before pass-counting, before mapping, before gate classification — so
  // every downstream number is computed on verifiable evidence only.
  const marks: Record<string, SubtestMark> = { ...parsed.marks };
  const fabricatedCitationLabels: string[] = [];
  if (!options.insiderAnswersPresent) {
    for (const [label, mark] of Object.entries(marks)) {
      const citation = parsed.citations[label];
      if (mark === 'P' && citation && isWhollyInsiderSourced(citation)) {
        marks[label] = 'F';
        fabricatedCitationLabels.push(label);
      }
    }
  }

  // R5 (D7 only) may legitimately be NA — expected denominator drops to 5.
  const naCount = Object.values(marks).filter((m) => m === 'NA').length;
  const markCount = Object.keys(marks).length;
  const expectedDenominator = markCount - naCount;
  const actualPassCount = Object.values(marks).filter((m) => m === 'P').length;

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
      fabricatedCitationMarksInvalidated: fabricatedCitationLabels.length,
      fabricatedCitationLabels: fabricatedCitationLabels.length ? fabricatedCitationLabels : undefined,
    };
  }

  // Gate classification reads the SANITIZED marks: if a gate cites a subtest
  // whose PASS was just invalidated, the gate must be judged against what the
  // evidence actually supports, not against the fabricated pass.
  const gateClass = classifyGate(parsed.gateText, marks);
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
        marks.R5 === 'P' &&
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
      // D3 cross-segment aggregation (Entry 075). The marks in this bracket
      // describe the highest-priority segment ONLY, while the declared score
      // is the average across every segment — the prompt says so explicitly
      // and tells the model to signal it here. Recomputing from the marks
      // would silently replace a legitimate multi-segment average with one
      // segment's mapping, inflating companies with a strong top tier and
      // deflating those carried by weaker ones. The corrector cannot see
      // per-segment data, so it must abstain rather than guess.
      //
      // Gates still win: step 4 of the D3 procedure says a triggered gate
      // OVERRIDES the aggregated score, so only this gate-free path abstains.
      // Entry 077 — this abstention is now UNCONDITIONAL for D3, no longer
      // keyed on the model emitting "aggregated across N segments".
      //
      // Entry 075 trusted that note as the signal that a score was an
      // aggregate. Production showed the model emits it unreliably: peec.ai's
      // D3 carried "none, aggregated across 3 segments" under v43 and a bare
      // "none" under v46, while both runs declared a score its own segment
      // marks did not map to. Keying on the note therefore protects a company
      // only when the model happens to remember it.
      //
      // And aggregation is an AVERAGE across segments, so it can move the
      // score in either direction — up when other segments are stronger, down
      // when weaker. Any divergence between the declared score and the
      // marks-mapped score is therefore explicable as aggregation, and this
      // module has no per-segment data to rule that out. D3's marks do not
      // determine D3's score by design, so recomputing from them is never
      // sound. Abstain always; the declared score stands, flagged.
      if (expectedDimensionNumber === 3) {
        correctedScore = parsed.declaredScore;
        correctionReason = 'd3-aggregation-abstained';
        break;
      }
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
    fabricatedCitationMarksInvalidated: fabricatedCitationLabels.length,
    fabricatedCitationLabels: fabricatedCitationLabels.length ? fabricatedCitationLabels : undefined,
  };
}

export type EvidenceQuality = 'verified' | 'flagged' | 'unverified';

// Confidence is computed upstream (index.ts) as an average of several
// subtest reliability values, which routinely lands one float ULP off its
// intended 2-decimal value under IEEE-754 (e.g. 0.44999999999999996
// instead of 0.45, 0.6500000000000001 instead of 0.65) — confirmed via a
// live v42 rescan, Entry 071. A strict "< 0.45" comparison wrongly flags a
// confidence the prompt's own labels intend as the floor of "Medium"
// (0.45-0.74) as if it were "Low" (<0.45).
const CONFIDENCE_FLOAT_EPSILON = 1e-9;
const LOW_CONFIDENCE_THRESHOLD = 0.45;

/**
 * Decides the evidenceQuality flag for a dimension from its correction
 * result and declared confidence. Extracted from index.ts (Entry 071) so
 * this logic — previously untested Deno-only code — gets real unit test
 * coverage; it was living directly in the edge function's post-processing
 * loop with no vitest path exercising it at all.
 */
export function computeEvidenceQuality(
  result: Pick<
    CorrectionResult,
    'auditParseFailed' | 'evidenceBlockMissing' | 'scoreWasCorrected' | 'correctionReason'
  > & Partial<Pick<CorrectionResult, 'fabricatedCitationMarksInvalidated'>>,
  confidence: number | undefined,
): EvidenceQuality {
  if (result.auditParseFailed || result.evidenceBlockMissing) {
    return 'unverified';
  }
  if (
    result.scoreWasCorrected ||
    // A dimension where the model invented citations is not "verified" even
    // if invalidating them happened to leave the score unchanged — the
    // reasoning behind it was still partly fabricated (Entry 074).
    (result.fabricatedCitationMarksInvalidated ?? 0) > 0 ||
    result.correctionReason === 'unrecognized-gate-not-corrected' ||
    // Abstentions are cases where the corrector deliberately declined to
    // verify — D3 cross-segment aggregation (Entry 075) and the D7 R4
    // enterprise exception (Entry 055) both hinge on per-segment data this
    // module cannot see. "We chose not to check" must not surface as
    // "verified"; the score is the model's unaudited claim.
    result.correctionReason === 'd3-aggregation-abstained' ||
    result.correctionReason === 'd7-r4-enterprise-exception-abstained' ||
    (confidence ?? 0) < LOW_CONFIDENCE_THRESHOLD - CONFIDENCE_FLOAT_EPSILON
  ) {
    return 'flagged';
  }
  return 'verified';
}
