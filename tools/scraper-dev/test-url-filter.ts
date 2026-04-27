#!/usr/bin/env npx tsx
/**
 * test-url-filter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Test one or more URLs against every filter layer in the scraper pipeline.
 * Shows exactly which rules fire (or don't) and why — no live scan needed.
 *
 * Usage:
 *   npx tsx tools/scraper-dev/test-url-filter.ts <url> [url2] [url3] ...
 *   npx tsx tools/scraper-dev/test-url-filter.ts --domain gamma.app
 *
 * Examples:
 *   npx tsx tools/scraper-dev/test-url-filter.ts https://zoominfo.com/c/co/551539465
 *   npx tsx tools/scraper-dev/test-url-filter.ts https://zoominfo.com/pricing https://zoominfo.com/about/payments#creditcard
 *   npx tsx tools/scraper-dev/test-url-filter.ts --domain gamma.app
 */

import { auditUrl, getRegistrableDomain, normaliseForDedup } from './filter-logic.js';

// ─── CLI argument parsing ─────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npx tsx tools/scraper-dev/test-url-filter.ts <url> [url2] ...');
  console.error('       npx tsx tools/scraper-dev/test-url-filter.ts --domain <domain>');
  process.exit(1);
}

let urls: string[] = [];
let explicitBaseHost = '';

if (args[0] === '--domain') {
  const domain = args[1];
  if (!domain) { console.error('--domain requires a value'); process.exit(1); }
  explicitBaseHost = domain.replace(/^www\./, '').replace(/^https?:\/\//, '').split('/')[0];
  // When only a domain is given, show the filter verdict for the domain root
  urls = [`https://${explicitBaseHost}`];
  console.log(`\nFilter audit for domain: ${explicitBaseHost}`);
  console.log('Pass URLs as arguments to test specific pages.\n');
} else {
  urls = args.map(u => u.startsWith('http') ? u : `https://${u}`);
}

// ─── Derive baseHost and registrableDomain ────────────────────────────────────

function deriveHosts(url: string): { baseHost: string; registrableDomain: string } {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return { baseHost: hostname, registrableDomain: getRegistrableDomain(hostname) };
  } catch {
    return { baseHost: explicitBaseHost || 'unknown', registrableDomain: explicitBaseHost || 'unknown' };
  }
}

// Use baseHost from the first URL (or explicit --domain)
const { baseHost, registrableDomain } = explicitBaseHost
  ? { baseHost: explicitBaseHost, registrableDomain: getRegistrableDomain(explicitBaseHost) }
  : deriveHosts(urls[0]);

// ─── Output ───────────────────────────────────────────────────────────────────

const PASS = '✅';
const FAIL = '❌';
const INFO = '  ';

console.log(`Domain context: ${baseHost} (registrable: ${registrableDomain})\n`);
console.log('─'.repeat(72));

let includedCount = 0;
let excludedCount = 0;

// Group dedup: track what gets deduped
const seenNormalised = new Map<string, string>(); // normalised → first URL that used it

for (let i = 0; i < urls.length; i++) {
  const url = urls[i];
  console.log(`\n[${i + 1}/${urls.length}] ${url}`);

  const verdict = auditUrl(url, baseHost, registrableDomain);

  // exclusionPatterns
  if (verdict.exclusion.blocked) {
    console.log(`  ${FAIL} exclusionPatterns  BLOCKED — ${verdict.exclusion.pattern}`);
  } else {
    console.log(`  ${PASS} exclusionPatterns  pass`);
  }

  // isEvidenceEligible
  if (!verdict.eligibility.eligible) {
    console.log(`  ${FAIL} isEvidenceEligible BLOCKED — ${verdict.eligibility.reason}`);
  } else {
    console.log(`  ${PASS} isEvidenceEligible pass`);
  }

  // scoreUrl breakdown (only shown when eligible)
  if (verdict.included) {
    console.log(`  ${INFO} scoreUrl           ${verdict.score.total}`);
    for (const line of verdict.score.lines) {
      console.log(`  ${INFO}   ${line}`);
    }
    if (verdict.score.lines.length === 0) {
      console.log(`  ${INFO}   (no scoring rules fired — score = 0)`);
    }
  }

  // normaliseForDedup
  const norm = verdict.normalised;
  const dupeOf = seenNormalised.get(norm);
  if (dupeOf && dupeOf !== url) {
    console.log(`  ${FAIL} normaliseForDedup  DUPLICATE of: ${dupeOf}`);
    console.log(`  ${INFO}   → ${norm}`);
  } else {
    console.log(`  ${INFO} normaliseForDedup  → ${norm}`);
    seenNormalised.set(norm, url);
  }

  // Final verdict
  const isDupe = dupeOf && dupeOf !== url;
  if (verdict.included && !isDupe) {
    console.log(`  ${PASS} VERDICT: INCLUDED`);
    includedCount++;
  } else if (isDupe) {
    console.log(`  ${FAIL} VERDICT: EXCLUDED (duplicate)`);
    excludedCount++;
  } else {
    console.log(`  ${FAIL} VERDICT: EXCLUDED — ${verdict.excludedReason}`);
    excludedCount++;
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(72));
console.log(`\nSummary: ${includedCount} included, ${excludedCount} excluded (of ${urls.length} tested)\n`);
