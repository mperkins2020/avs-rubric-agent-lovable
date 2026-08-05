#!/usr/bin/env npx tsx
/**
 * snapshot-scan.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Saves the full result_json (scores, dimension rationale, evidence, audit
 * blocks, fabricatedCitations, everything) for one or more domains' most
 * recent scan to a local timestamped JSON file — a durable "before" snapshot
 * to diff against after a rescan.
 *
 * `scan_results` rows are never deleted (only soft-expired), so this is
 * technically recoverable from the database after the fact too — but a
 * local file is faster to diff, survives even if a row's expires_at makes it
 * fall out of the RLS-visible window, and doesn't require re-deriving which
 * row was "the one before the rescan" from timestamps after the fact.
 *
 * Usage:
 *   npx tsx tools/scraper-dev/snapshot-scan.ts <domain> [domain2] [domain3] ...
 *   npx tsx tools/scraper-dev/snapshot-scan.ts --roster marketing-intelligence
 *
 * Options:
 *   --roster <name>   Use a named roster from ROSTERS below instead of listing domains
 *   --out <dir>       Output directory (default: tools/scraper-dev/snapshots)
 *
 * Examples:
 *   npx tsx tools/scraper-dev/snapshot-scan.ts hubspot.com athenahq.ai
 *   npx tsx tools/scraper-dev/snapshot-scan.ts --roster marketing-intelligence
 *
 * Requires: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in repo/.env
 *
 * Auth note: scan_results RLS requires auth.uid() IS NOT NULL (see
 * supabase/migrations — "Authenticated users can read cached results"). The
 * anon key alone does NOT satisfy this — this tool signs in anonymously
 * (supabase.auth.signInAnonymously()) first, same as the production app's
 * own anonymous-visitor flow (src/pages/Index.tsx).
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv } from './filter-logic.js';

loadDotEnv();

// Named rosters so a full-category snapshot is one command, not a 12-domain
// paste. Add new categories here as they come up.
const ROSTERS: Record<string, string[]> = {
  'marketing-intelligence': [
    'hubspot.com', 'athenahq.ai', 'ahrefs.com', 'tryprofound.com', 'botify.com',
    'otterly.ai', 'semrush.com', 'higoodie.com', 'peec.ai', 'scrunch.com',
    'conductor.com', 'similarweb.com',
  ],
};

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const rosterIdx = args.indexOf('--roster');
const outIdx = args.indexOf('--out');

let domains: string[];
if (rosterIdx !== -1) {
  const rosterName = args[rosterIdx + 1];
  if (!rosterName || !ROSTERS[rosterName]) {
    console.error(`Unknown roster "${rosterName}". Known rosters: ${Object.keys(ROSTERS).join(', ')}`);
    process.exit(1);
  }
  domains = ROSTERS[rosterName];
} else {
  domains = args.filter((a, i) => a !== '--out' && args[i - 1] !== '--out').map(
    d => d.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, ''),
  );
}

if (domains.length === 0) {
  console.error('Usage: npx tsx tools/scraper-dev/snapshot-scan.ts <domain> [domain2] ... | --roster <name>');
  console.error(`Known rosters: ${Object.keys(ROSTERS).join(', ')}`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = outIdx !== -1 ? args[outIdx + 1] : join(here, 'snapshots');
mkdirSync(outDir, { recursive: true });

// ─── Supabase setup ───────────────────────────────────────────────────────────

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: authError } = await supabase.auth.signInAnonymously();
if (authError) {
  console.error('Anonymous sign-in failed:', authError.message);
  process.exit(1);
}

// ─── Snapshot each domain's most recent scan ───────────────────────────────────

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const results: Array<{ domain: string; ok: boolean; version?: string; score?: number; file?: string; error?: string }> = [];

for (const domain of domains) {
  const { data, error } = await supabase
    .from('scan_results')
    .select('id, url_domain, created_at, expires_at, result_json')
    .eq('url_domain', domain)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    results.push({ domain, ok: false, error: error.message });
    continue;
  }
  if (!data) {
    results.push({ domain, ok: false, error: 'no row found' });
    continue;
  }

  const version = data.result_json?.analysisVersion ?? 'unknown';
  const score = data.result_json?.rubricScore?.totalScore;
  const file = join(outDir, `${domain}__${version}__${timestamp}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  results.push({ domain, ok: true, version, score, file });
}

// ─── Output ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(72));
console.log(`  Snapshot — ${domains.length} domain(s), ${timestamp}`);
console.log('─'.repeat(72) + '\n');

for (const r of results) {
  if (r.ok) {
    console.log(`  ✅ ${r.domain.padEnd(20)} [${r.version}] score=${r.score} -> ${r.file}`);
  } else {
    console.log(`  ❌ ${r.domain.padEnd(20)} ${r.error}`);
  }
}

const failed = results.filter(r => !r.ok);
console.log('');
if (failed.length > 0) {
  console.log(`  ⚠️  ${failed.length} of ${domains.length} domain(s) failed to snapshot — see above.\n`);
  process.exit(1);
} else {
  console.log(`  All ${domains.length} snapshotted to ${outDir}\n`);
}
