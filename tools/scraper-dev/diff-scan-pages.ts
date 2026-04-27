#!/usr/bin/env npx tsx
/**
 * diff-scan-pages.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Side-by-side diff of pages analyzed between the two most recent scans
 * of the same company. Shows exactly what was added, removed, or kept —
 * making regression detection instant instead of manual.
 *
 * Usage:
 *   npx tsx tools/scraper-dev/diff-scan-pages.ts <domain>
 *   npx tsx tools/scraper-dev/diff-scan-pages.ts <domain> --all
 *
 * Options:
 *   --all    Show all shared pages (default: hides them to reduce noise)
 *
 * Examples:
 *   npx tsx tools/scraper-dev/diff-scan-pages.ts gamma.app
 *   npx tsx tools/scraper-dev/diff-scan-pages.ts zoominfo.com --all
 *
 * Requires: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in repo/.env
 */

import { loadDotEnv } from './filter-logic.js';

loadDotEnv();

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npx tsx tools/scraper-dev/diff-scan-pages.ts <domain> [--all]');
  process.exit(1);
}

const domain = args[0].replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
const showAll = args.includes('--all');

// ─── Supabase setup ───────────────────────────────────────────────────────────

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}

// ─── Fetch last N scans for this domain ───────────────────────────────────────

interface ScanRow {
  id: string;
  url_domain: string;
  result_json: {
    analysisVersion?: string;
    status?: string;
    observability?: {
      pagesUsed?: string[];
    };
  };
  created_at: string;
}

const query = `${supabaseUrl}/rest/v1/scan_results?select=id,url_domain,result_json,created_at&url_domain=eq.${encodeURIComponent(domain)}&order=created_at.desc&limit=10`;

let scans: ScanRow[] = [];
try {
  const resp = await fetch(query, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
  });
  if (!resp.ok) {
    console.error(`Supabase query failed: ${resp.status} ${resp.statusText}`);
    process.exit(1);
  }
  scans = await resp.json() as ScanRow[];
} catch (e) {
  console.error('Failed to reach Supabase:', e);
  process.exit(1);
}

// ─── Filter to completed scans (have pagesUsed) ───────────────────────────────

const completed = scans.filter(s => {
  const pages = s.result_json?.observability?.pagesUsed;
  return Array.isArray(pages) && pages.length > 0;
});

if (completed.length === 0) {
  console.log(`\nNo completed scans found for ${domain}\n`);
  process.exit(0);
}

if (completed.length === 1) {
  const scan = completed[0];
  const pages = scan.result_json.observability!.pagesUsed!;
  const when = new Date(scan.created_at).toLocaleString();
  const version = scan.result_json.analysisVersion ?? 'unknown';
  console.log(`\nOnly one completed scan found for ${domain} — no diff possible.`);
  console.log(`\nScan: ${when} (${version}) — ${pages.length} pages:`);
  for (const p of pages) console.log(`  ${p}`);
  console.log('');
  process.exit(0);
}

// ─── Diff the two most recent scans ───────────────────────────────────────────

const scanA = completed[0]; // newer
const scanB = completed[1]; // older
const pagesA = new Set(scanA.result_json.observability!.pagesUsed!);
const pagesB = new Set(scanB.result_json.observability!.pagesUsed!);

const added   = [...pagesA].filter(p => !pagesB.has(p)).sort();
const removed = [...pagesB].filter(p => !pagesA.has(p)).sort();
const shared  = [...pagesA].filter(p => pagesB.has(p)).sort();

const whenA = new Date(scanA.created_at).toLocaleString();
const whenB = new Date(scanB.created_at).toLocaleString();
const verA = scanA.result_json.analysisVersion ?? 'unknown';
const verB = scanB.result_json.analysisVersion ?? 'unknown';

// ─── Output ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(72));
console.log(`  Page diff for: ${domain}`);
console.log('─'.repeat(72));
console.log(`\n  Scan A (newer): ${whenA}  [${verA}]  — ${pagesA.size} pages`);
console.log(`  Scan B (older): ${whenB}  [${verB}]  — ${pagesB.size} pages`);

if (added.length === 0 && removed.length === 0) {
  console.log('\n  ✅ No changes — identical page sets\n');
} else {
  if (added.length > 0) {
    console.log(`\n  ✅ Added in A (${added.length}):`);
    for (const p of added) console.log(`    + ${p}`);
  }

  if (removed.length > 0) {
    console.log(`\n  ❌ Removed from A (${removed.length}):`);
    for (const p of removed) console.log(`    - ${p}`);
  }
}

if (showAll || shared.length <= 8) {
  console.log(`\n  = Shared (${shared.length}):`);
  for (const p of shared) console.log(`    = ${p}`);
} else {
  console.log(`\n  = Shared: ${shared.length} pages (use --all to show)`);
}

// ─── Version change callout ───────────────────────────────────────────────────

if (verA !== verB) {
  console.log(`\n  ⚠️  Version changed: ${verB} → ${verA}`);
} else {
  console.log(`\n  Version: same (${verA})`);
}

// ─── Older scans (for context) ────────────────────────────────────────────────

if (completed.length > 2) {
  console.log(`\n  Older scans for ${domain}:`);
  for (const s of completed.slice(2)) {
    const pages = s.result_json.observability!.pagesUsed!;
    const when = new Date(s.created_at).toLocaleString();
    const ver = s.result_json.analysisVersion ?? 'unknown';
    console.log(`    ${when}  [${ver}]  ${pages.length} pages`);
  }
}

console.log('\n' + '─'.repeat(72) + '\n');
