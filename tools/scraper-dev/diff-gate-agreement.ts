#!/usr/bin/env npx tsx
/**
 * diff-gate-agreement.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gate 2 / EXP-1 gate-agreement matrix (C2 in
 * September_Benchmark_Control_Framework_Implementation_Map.md). Compares two
 * `snapshot-scan.ts` JSON outputs for the SAME domain — read #1 and read #2
 * of the identical-evidence stability test — at the subtest (P/F mark) level,
 * not just aggregate scores, per the C2 execution sequence.
 *
 * This tool does not decide pass/fail. No numeric stability threshold exists
 * in the Control Framework (C2's own text: "if the matrix shows material
 * instability... the framework requires pausing — this is a process rule...
 * not something a script can enforce"). This tool's job ends at producing the
 * matrix; Gate 2's proceed/pause/caveat decision is Michelle's, made by
 * reading the matrix, not by this tool returning a boolean.
 *
 * Usage:
 *   npx tsx tools/scraper-dev/diff-gate-agreement.ts <domain>
 *     Auto-locates the two most recent snapshot files for <domain> in
 *     tools/scraper-dev/snapshots/ (or --snapshots-dir below).
 *
 *   npx tsx tools/scraper-dev/diff-gate-agreement.ts --files <fileA> <fileB>
 *     Explicit snapshot file paths — use this to compare two specific reads
 *     rather than "whatever's newest," or to point at fixtures.
 *
 * Options:
 *   --snapshots-dir <dir>   Where to look for <domain>__*.json files (default: tools/scraper-dev/snapshots)
 *   --json <path>           Also write the machine-readable result to this path
 *
 * Examples:
 *   npx tsx tools/scraper-dev/diff-gate-agreement.ts lovable.dev
 *   npx tsx tools/scraper-dev/diff-gate-agreement.ts --files snapshots/a.json snapshots/b.json --json exp1-lovable.json
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareGateAgreement, type GateAgreementResult, type SnapshotFile } from './gate-agreement-logic.js';

const here = dirname(fileURLToPath(import.meta.url));

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const filesIdx = args.indexOf('--files');
const jsonIdx = args.indexOf('--json');
const dirIdx = args.indexOf('--snapshots-dir');

const snapshotsDir = dirIdx !== -1 ? args[dirIdx + 1] : join(here, 'snapshots');
const jsonOutPath = jsonIdx !== -1 ? args[jsonIdx + 1] : null;

function usageAndExit(): never {
  console.error('Usage: npx tsx tools/scraper-dev/diff-gate-agreement.ts <domain> [--json <path>]');
  console.error('       npx tsx tools/scraper-dev/diff-gate-agreement.ts --files <fileA> <fileB> [--json <path>]');
  process.exit(1);
}

function loadSnapshot(path: string): SnapshotFile {
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as SnapshotFile;
}

let fileA: string;
let fileB: string;

if (filesIdx !== -1) {
  fileA = args[filesIdx + 1];
  fileB = args[filesIdx + 2];
  if (!fileA || !fileB) usageAndExit();
} else {
  const positional = args.filter((a, i) => {
    if (a.startsWith('--')) return false;
    if (args[i - 1] === '--json' || args[i - 1] === '--snapshots-dir') return false;
    return true;
  });
  const domain = positional[0];
  if (!domain) usageAndExit();

  let entries: string[];
  try {
    entries = readdirSync(snapshotsDir);
  } catch {
    console.error(`Snapshot directory not found: ${snapshotsDir}`);
    process.exit(1);
  }

  const matches = entries
    .filter((f) => f.startsWith(`${domain}__`) && f.endsWith('.json'))
    .sort(); // filenames embed an ISO-ish timestamp — lexical sort is chronological

  if (matches.length < 2) {
    console.error(
      `Found ${matches.length} snapshot(s) for "${domain}" in ${snapshotsDir} — need at least 2 (run ` +
        `"npm run snapshot-scan -- ${domain}" twice, per the C2 execution sequence, before diffing).`,
    );
    process.exit(1);
  }

  // Two most recent — "B" is the newer read, "A" the older, matching
  // diff-scan-pages.ts's existing newer/older convention in this directory.
  fileB = join(snapshotsDir, matches[matches.length - 1]);
  fileA = join(snapshotsDir, matches[matches.length - 2]);
}

const snapA = loadSnapshot(fileA);
const snapB = loadSnapshot(fileB);

if (snapA.url_domain !== snapB.url_domain) {
  console.error(
    `⚠️  Domain mismatch: ${fileA} is "${snapA.url_domain}", ${fileB} is "${snapB.url_domain}". ` +
      `Refusing to diff two different companies as if they were repeated runs of one.`,
  );
  process.exit(1);
}

const result = compareGateAgreement(snapA, snapB);

// ─── Console output ─────────────────────────────────────────────────────────

function fmtScore(s: number | null): string {
  return s === null ? '—' : String(s);
}

console.log('\n' + '─'.repeat(78));
console.log(`  Gate agreement — ${result.domain}`);
console.log('─'.repeat(78));
console.log(`\n  Run A: ${result.scannedAtA}  [${result.analysisVersionA}]  scan ${result.scanIdA}`);
console.log(`  Run B: ${result.scannedAtB}  [${result.analysisVersionB}]  scan ${result.scanIdB}`);

if (result.analysisVersionA !== result.analysisVersionB) {
  console.log(
    `\n  ⚠️  ANALYSIS_VERSION differs between runs (${result.analysisVersionA} vs ${result.analysisVersionB}) — ` +
      `this is NOT an identical-evidence-conditions comparison. EXP-1 requires the same version on both reads.`,
  );
}

console.log(
  `\n  Overall score:  A=${fmtScore(result.overallScoreA)}/${fmtScore(result.maxScoreA)}   ` +
    `B=${fmtScore(result.overallScoreB)}/${fmtScore(result.maxScoreB)}   ` +
    `delta=${result.overallScoreDelta === null ? '—' : result.overallScoreDelta}`,
);

console.log('\n  Dimension scores:');
for (const dim of result.dimensions) {
  const flagA = dim.notObservableA ? ' (not observable)' : dim.auditParseFailedA ? ' (audit unparseable)' : '';
  const flagB = dim.notObservableB ? ' (not observable)' : dim.auditParseFailedB ? ' (audit unparseable)' : '';
  const delta = dim.scoreDelta === null ? '—' : dim.scoreDelta === 0 ? '0' : dim.scoreDelta > 0 ? `+${dim.scoreDelta}` : String(dim.scoreDelta);
  console.log(
    `    ${dim.dimensionName.padEnd(32)} A=${fmtScore(dim.scoreA)}${flagA.padEnd(20)} B=${fmtScore(dim.scoreB)}${flagB.padEnd(20)} delta=${delta}`,
  );
}

if (result.changedSubtests.length > 0) {
  console.log(`\n  Changed subtests (${result.changedSubtests.length}):`);
  for (const c of result.changedSubtests) {
    const cite =
      c.citationA !== c.citationB
        ? `  [citation A: ${c.citationA ?? '—'}  →  B: ${c.citationB ?? '—'}]`
        : '';
    console.log(`    ${c.dimensionName} / ${c.subtestLabel}:  ${c.markA} → ${c.markB}${cite}`);
  }
} else {
  console.log('\n  ✅ No changed subtests among comparable pairs.');
}

if (result.totals.nonComparable > 0) {
  console.log(
    `\n  ⚪ ${result.totals.nonComparable} subtest(s) non-comparable (missing from one run or audit block failed ` +
      `to parse) — excluded from the agreement percentage, not counted as disagreement.`,
  );
}

console.log(
  `\n  Agreement: ${result.totals.exactAgreements} exact / ${result.totals.comparableSubtests} comparable` +
    (result.totals.agreementPercentage === null ? '' : `  (${result.totals.agreementPercentage}%)`) +
    `   —   disagreements: ${result.totals.disagreements}   non-comparable: ${result.totals.nonComparable}`,
);

console.log(
  '\n  This tool does not pass/fail the run — no stability threshold is defined in the Control Framework. ' +
    'Review this matrix per Gate 2 (C2) and record a proceed / pause / caveat decision.',
);

console.log('\n' + '─'.repeat(78) + '\n');

// ─── JSON output ────────────────────────────────────────────────────────────

if (jsonOutPath) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(jsonOutPath, JSON.stringify(result, null, 2));
  console.log(`  Machine-readable result written to ${jsonOutPath}\n`);
}

export type { GateAgreementResult };
