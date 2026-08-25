/**
 * gate-agreement-logic.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure comparison logic for the Gate 2 / EXP-1 gate-agreement matrix (C2 in
 * September_Benchmark_Control_Framework_Implementation_Map.md). No filesystem
 * or CLI code lives here — that's diff-gate-agreement.ts. Split the same way
 * filter-logic.ts (pure) and test-url-filter.ts (CLI) already are in this
 * directory, so this module is directly importable by its test file without
 * dragging in argv parsing or fs reads.
 *
 * EXP-1 exists to test whether the scoring pipeline gives the same answer
 * twice under IDENTICAL evidence conditions (same scraped pages, same
 * ANALYSIS_VERSION) — so "agreement" has to be measured at the subtest
 * (P/F mark) level, not just the aggregate dimension/total score. Two runs
 * can land on the same dimension score via different subtest marks
 * (compensating errors), which the aggregate alone would hide.
 *
 * Reuses parseAuditBlock() from the actual production scoring/correction
 * module (supabase/functions/analyze-company/rubric-audit.ts) rather than
 * re-implementing audit-bracket parsing — that file is explicitly built
 * dependency-free so it's importable from both Deno (index.ts) and Node
 * (here, and rubric-audit.test.ts) without a hand-maintained mirror.
 */

import {
  parseAuditBlock,
  type SubtestMark,
} from '../../supabase/functions/analyze-company/rubric-audit.js';

// ─── Input shapes — mirrors snapshot-scan.ts's saved file + result_json ───────

export interface DimensionScoreEntry {
  dimension: string;
  score: number;
  confidence: number;
  notObservable: boolean;
  rationale: string;
}

export interface ResultJsonLike {
  analysisVersion?: string;
  rubricScore?: {
    totalScore?: number;
    maxScore?: number;
    dimensionScores?: DimensionScoreEntry[];
  };
}

export interface SnapshotFile {
  id: string;
  url_domain: string;
  created_at: string;
  expires_at?: string;
  result_json: ResultJsonLike;
}

// ─── Output shapes ──────────────────────────────────────────────────────────

export type SubtestAgreement = 'agree' | 'disagree' | 'non-comparable';

export interface SubtestComparison {
  dimensionNumber: number | null;
  dimensionName: string;
  subtestLabel: string;
  markA: SubtestMark | null;
  markB: SubtestMark | null;
  agreement: SubtestAgreement;
  citationA: string | null;
  citationB: string | null;
  /** Only meaningful when agreement !== 'non-comparable' — both sides had a citation to compare. */
  citationChanged: boolean;
}

export interface DimensionComparison {
  dimensionName: string;
  dimensionNumber: number | null;
  scoreA: number | null;
  scoreB: number | null;
  scoreDelta: number | null;
  notObservableA: boolean;
  notObservableB: boolean;
  /** True when the dimension entry existed but its rationale had no parseable "[D_ audit: ...]" bracket. */
  auditParseFailedA: boolean;
  auditParseFailedB: boolean;
  subtests: SubtestComparison[];
}

export interface ChangedSubtest {
  dimensionNumber: number | null;
  dimensionName: string;
  subtestLabel: string;
  markA: SubtestMark | null;
  markB: SubtestMark | null;
  citationA: string | null;
  citationB: string | null;
}

export interface GateAgreementTotals {
  exactAgreements: number;
  disagreements: number;
  /** Missing/non-comparable subtests — counted separately, never folded into disagreements. */
  nonComparable: number;
  comparableSubtests: number;
  /** exactAgreements / comparableSubtests, as a percentage rounded to 1 decimal. null if there was nothing comparable. */
  agreementPercentage: number | null;
}

export interface GateAgreementResult {
  domain: string;
  scanIdA: string;
  scanIdB: string;
  scannedAtA: string;
  scannedAtB: string;
  analysisVersionA: string;
  analysisVersionB: string;
  overallScoreA: number | null;
  overallScoreB: number | null;
  maxScoreA: number | null;
  maxScoreB: number | null;
  overallScoreDelta: number | null;
  dimensions: DimensionComparison[];
  changedSubtests: ChangedSubtest[];
  totals: GateAgreementTotals;
  generatedAt: string;
}

// ─── Core comparison ────────────────────────────────────────────────────────

/**
 * Compares one dimension's audit block between two runs. Either side may be
 * undefined (dimension missing from that run's dimensionScores array) —
 * every subtest label then reports 'non-comparable', never 'disagree'.
 */
export function compareDimension(
  dimA: DimensionScoreEntry | undefined,
  dimB: DimensionScoreEntry | undefined,
): DimensionComparison {
  const dimensionName = dimA?.dimension ?? dimB?.dimension ?? 'unknown';
  const auditA = dimA ? parseAuditBlock(dimA.rationale) : null;
  const auditB = dimB ? parseAuditBlock(dimB.rationale) : null;
  const dimensionNumber = auditA?.dimensionNumber ?? auditB?.dimensionNumber ?? null;

  const labels = new Set<string>([
    ...(auditA ? Object.keys(auditA.marks) : []),
    ...(auditB ? Object.keys(auditB.marks) : []),
  ]);

  const subtests: SubtestComparison[] = [...labels].sort().map((label) => {
    const markA = auditA?.marks[label] ?? null;
    const markB = auditB?.marks[label] ?? null;
    const citationA = auditA?.citations[label] ?? null;
    const citationB = auditB?.citations[label] ?? null;

    // Non-comparable whenever either side's audit block failed to parse at
    // all, or this specific label is absent from one side — a label present
    // in only one run (e.g. a segment-dependent D3 subtest set that differs
    // between runs) is missing data, not a disagreement.
    let agreement: SubtestAgreement;
    if (!auditA || !auditB || markA === null || markB === null) {
      agreement = 'non-comparable';
    } else if (markA === markB) {
      agreement = 'agree';
    } else {
      agreement = 'disagree';
    }

    return {
      dimensionNumber,
      dimensionName,
      subtestLabel: label,
      markA,
      markB,
      agreement,
      citationA,
      citationB,
      citationChanged: agreement !== 'non-comparable' && citationA !== citationB,
    };
  });

  return {
    dimensionName,
    dimensionNumber,
    scoreA: dimA?.score ?? null,
    scoreB: dimB?.score ?? null,
    scoreDelta: dimA && dimB ? dimA.score - dimB.score : null,
    notObservableA: dimA?.notObservable ?? false,
    notObservableB: dimB?.notObservable ?? false,
    auditParseFailedA: !!dimA && auditA === null,
    auditParseFailedB: !!dimB && auditB === null,
    subtests,
  };
}

/**
 * Full gate-agreement comparison between two snapshot-scan.ts JSON files for
 * the same domain. Caller picks which is "A" and which is "B" (e.g. read #1
 * vs read #2, per the C2 execution sequence) — the tool doesn't assume an
 * ordering.
 */
export function compareGateAgreement(snapA: SnapshotFile, snapB: SnapshotFile): GateAgreementResult {
  const dimsA = snapA.result_json?.rubricScore?.dimensionScores ?? [];
  const dimsB = snapB.result_json?.rubricScore?.dimensionScores ?? [];

  const byNameA = new Map(dimsA.map((d) => [d.dimension, d]));
  const byNameB = new Map(dimsB.map((d) => [d.dimension, d]));
  const names = new Set<string>([...byNameA.keys(), ...byNameB.keys()]);

  const dimensions = [...names]
    .sort()
    .map((name) => compareDimension(byNameA.get(name), byNameB.get(name)));

  let exactAgreements = 0;
  let disagreements = 0;
  let nonComparable = 0;
  const changedSubtests: ChangedSubtest[] = [];

  for (const dim of dimensions) {
    for (const st of dim.subtests) {
      if (st.agreement === 'agree') {
        exactAgreements++;
      } else if (st.agreement === 'disagree') {
        disagreements++;
        changedSubtests.push({
          dimensionNumber: dim.dimensionNumber,
          dimensionName: dim.dimensionName,
          subtestLabel: st.subtestLabel,
          markA: st.markA,
          markB: st.markB,
          citationA: st.citationA,
          citationB: st.citationB,
        });
      } else {
        nonComparable++;
      }
    }
  }

  const comparableSubtests = exactAgreements + disagreements;
  const agreementPercentage =
    comparableSubtests > 0 ? Math.round((exactAgreements / comparableSubtests) * 1000) / 10 : null;

  const overallScoreA = snapA.result_json?.rubricScore?.totalScore ?? null;
  const overallScoreB = snapB.result_json?.rubricScore?.totalScore ?? null;

  return {
    domain: snapA.url_domain ?? snapB.url_domain,
    scanIdA: snapA.id,
    scanIdB: snapB.id,
    scannedAtA: snapA.created_at,
    scannedAtB: snapB.created_at,
    analysisVersionA: snapA.result_json?.analysisVersion ?? 'unknown',
    analysisVersionB: snapB.result_json?.analysisVersion ?? 'unknown',
    overallScoreA,
    overallScoreB,
    maxScoreA: snapA.result_json?.rubricScore?.maxScore ?? null,
    maxScoreB: snapB.result_json?.rubricScore?.maxScore ?? null,
    overallScoreDelta:
      overallScoreA !== null && overallScoreB !== null ? overallScoreA - overallScoreB : null,
    dimensions,
    changedSubtests,
    totals: { exactAgreements, disagreements, nonComparable, comparableSubtests, agreementPercentage },
    generatedAt: new Date().toISOString(),
  };
}
