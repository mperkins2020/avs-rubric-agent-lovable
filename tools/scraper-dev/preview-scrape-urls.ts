#!/usr/bin/env npx tsx
/**
 * preview-scrape-urls.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows the exact list of URLs the scraper WOULD fetch for a domain,
 * without actually scraping content. Uses Firecrawl /map to discover URLs,
 * then runs the full scoring + selection pipeline locally.
 *
 * Usage:
 *   npx tsx tools/scraper-dev/preview-scrape-urls.ts <domain>
 *   npx tsx tools/scraper-dev/preview-scrape-urls.ts <domain> --max-pages 20
 *   npx tsx tools/scraper-dev/preview-scrape-urls.ts <domain> --verbose
 *
 * Examples:
 *   npx tsx tools/scraper-dev/preview-scrape-urls.ts gamma.app
 *   npx tsx tools/scraper-dev/preview-scrape-urls.ts zoominfo.com --max-pages 20
 *   npx tsx tools/scraper-dev/preview-scrape-urls.ts elevenlabs.io --verbose
 *
 * Requires: FIRECRAWL_API_KEY in repo/.env
 */

import {
  loadDotEnv,
  getRegistrableDomain,
  exclusionPatterns,
  helpSubdomains,
  priorityPatterns,
  highIntentPaths,
  BILLING_DEDUP_PATHS,
  isShallowSameDomainPath,
  isSubdomainUrl,
  isSameDomain,
  checkEvidenceEligible,
  normaliseForDedup,
  scoreUrl,
} from './filter-logic.js';

loadDotEnv();

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: npx tsx tools/scraper-dev/preview-scrape-urls.ts <domain> [--max-pages N] [--verbose]');
  process.exit(1);
}

const rawArg = args[0].replace(/^https?:\/\//, '');
const domainArg = rawArg.replace(/\/.*$/, '');
const inputPath = rawArg.includes('/') ? '/' + rawArg.split('/').slice(1).join('/') : '';
const maxPagesFlag = args.indexOf('--max-pages');
const maxPages = maxPagesFlag >= 0 ? parseInt(args[maxPagesFlag + 1], 10) || 15 : 15;
const verbose = args.includes('--verbose');

const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) {
  console.error('Missing FIRECRAWL_API_KEY. Add it to repo/.env');
  process.exit(1);
}

// ─── Domain setup ─────────────────────────────────────────────────────────────

const baseHost = domainArg.replace(/^www\./, '');
const registrableDomain = getRegistrableDomain(baseHost);
const formattedUrl = `https://${baseHost}${inputPath}`;
const safeMaxPages = Math.min(Math.max(1, maxPages), 25);

// When input targets a product path, use it as a search hint for Firecrawl /map
const pathSegments = inputPath.replace(/\/+$/, '').split('/').filter(Boolean);
const productSearch = pathSegments.length >= 1 ? pathSegments[0] : undefined;

console.log(`\nPreviewing scrape for: ${baseHost}${inputPath || ''}`);
console.log(`Max pages: ${safeMaxPages}  |  Verbose: ${verbose}${productSearch ? `  |  Product search: "${productSearch}"` : ''}`);
console.log('─'.repeat(72));

// ─── Firecrawl /map helper ────────────────────────────────────────────────────

async function mapDomain(url: string, limit = 200, includeSubdomains = false, search?: string): Promise<string[]> {
  const payload: Record<string, unknown> = { url, limit, includeSubdomains };
  if (search) payload.search = search;
  const resp = await fetch('https://api.firecrawl.dev/v1/map', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    console.warn(`  Map request failed (${resp.status}) for ${url}`);
    return [];
  }
  const data = await resp.json() as { success: boolean; links?: string[] };
  return data.success && data.links ? data.links : [];
}

// ─── Phase 1a: Map main domain ────────────────────────────────────────────────

console.log('\nPhase 1a: Mapping main domain...');
const mainMapLinks = await mapDomain(formattedUrl, 300, true, productSearch);
console.log(`  Discovered ${mainMapLinks.length} URLs`);

// ─── Phase 1b: Map undiscovered help subdomains ───────────────────────────────

const discoveredSubdomains = new Set<string>();
for (const link of mainMapLinks) {
  try {
    const h = new URL(link).hostname.replace(/^www\./, '');
    if (h !== baseHost) discoveredSubdomains.add(h);
  } catch { /* skip */ }
}

const subdomainsToProbe = helpSubdomains
  .map(sub => `${sub}.${registrableDomain}`)
  .filter(sub => !discoveredSubdomains.has(sub));

let subdomainMapLinks: string[] = [];
if (subdomainsToProbe.length > 0) {
  const trustProbes = subdomainsToProbe.filter(s => s.startsWith('trust.') || s.startsWith('compliance.'));
  const generalProbes = subdomainsToProbe
    .filter(s => !s.startsWith('trust.') && !s.startsWith('compliance.'))
    .sort((a, b) => {
      const order = ['docs', 'help', 'support', 'kb', 'knowledge'];
      const aIdx = order.findIndex(o => a.startsWith(o + '.'));
      const bIdx = order.findIndex(o => b.startsWith(o + '.'));
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    })
    .slice(0, 2);
  const priorityProbes = [...trustProbes, ...generalProbes];

  console.log(`\nPhase 1b: Mapping ${priorityProbes.length} undiscovered subdomains: ${priorityProbes.join(', ')}`);
  const results = await Promise.all(priorityProbes.map(sub => mapDomain(`https://${sub}`, 100, false)));
  subdomainMapLinks = results.flat();
  console.log(`  Discovered ${subdomainMapLinks.length} subdomain URLs`);
} else {
  console.log('\nPhase 1b: Skipped (all help subdomains already in main map)');
}

// ─── Score + filter pipeline ──────────────────────────────────────────────────

const communityUrlSet = new Set<string>(); // no community_evidence in local dev
const allDiscovered = [...new Set([...mainMapLinks, ...subdomainMapLinks])];

console.log(`\nTotal discovered: ${allDiscovered.length} unique URLs`);
console.log('\nPhase 2: Applying filters...');

// Step 1: exclusionPatterns + basic shape filters
const afterExclusion = allDiscovered.filter(link => {
  if (exclusionPatterns.some(p => p.test(link))) return false;
  if (link === formattedUrl || link === formattedUrl + '/') return false;
  try {
    const parsed = new URL(link);
    const segs = parsed.pathname.split('/').filter(Boolean);
    const lastSeg = segs[segs.length - 1] ?? '';
    const digitCount = (lastSeg.match(/[0-9]/g) ?? []).length;
    const isZendeskSlug = /^[0-9]+-[a-z][a-z-]*$/.test(lastSeg);
    const lastToken = lastSeg.includes('-') ? (lastSeg.split('-').pop() || '') : '';
    const lastTokenDigits = (lastToken.match(/[0-9]/g) ?? []).length;
    if (
      (lastSeg.length >= 8 && /^[A-Za-z0-9_-]+=*$/.test(lastSeg) && /[A-Z]/.test(lastSeg) && /[a-z]/.test(lastSeg)) ||
      (!isZendeskSlug && /^[0-9]/.test(lastSeg) && lastSeg.length >= 8 && /[a-zA-Z]/.test(lastSeg)) ||
      (lastSeg.length >= 10 && /^[a-z0-9]+$/.test(lastSeg) && /[a-z]/.test(lastSeg) && digitCount >= 3) ||
      (lastToken.length >= 8 && /^[a-z0-9]+$/.test(lastToken) && lastTokenDigits >= 2)
    ) return false;
    const firstSeg = (segs[0] ?? '').toLowerCase();
    const isHelpSubdomainUrl = helpSubdomains.some(s => parsed.hostname === `${s}.${registrableDomain}`);
    if (!isHelpSubdomainUrl && segs.length >= 2 && /^(?:fr|de|es|pt|ja|zh|ko|it|nl|pl|ru|ar|tr|sv|da|fi|nb|cs|hu|ro|uk|en|pt-br|zh-cn|zh-tw|es-mx|fr-ca)$/.test(firstSeg)) return false;
  } catch { /* malformed — let downstream filters handle */ }
  if (isShallowSameDomainPath(link, baseHost)) return true;
  if (priorityPatterns.some(p => p.test(link))) return true;
  if (isSubdomainUrl(link)) return true;
  return false;
});

if (verbose) {
  const dropped = allDiscovered.length - afterExclusion.length;
  console.log(`  After exclusionPatterns + shape filters: ${afterExclusion.length} (dropped ${dropped})`);
}

// Step 2: Score
const scored = afterExclusion
  .map(link => ({ link, score: scoreUrl(link, baseHost, communityUrlSet) }))
  .sort((a, b) => b.score - a.score || a.link.localeCompare(b.link));

// Step 3: isEvidenceEligible
const filtered = scored.filter(({ link }) => checkEvidenceEligible(link, registrableDomain).eligible);

if (verbose) {
  console.log(`  After isEvidenceEligible: ${filtered.length} (dropped ${scored.length - filtered.length})`);
}

// Step 4: Dedup
const seenNorm = new Set<string>();
const deduped = filtered.filter(({ link }) => {
  const key = normaliseForDedup(link);
  if (seenNorm.has(key)) return false;
  seenNorm.add(key);
  return true;
});

if (verbose) {
  console.log(`  After dedup: ${deduped.length} (dropped ${filtered.length - deduped.length})`);
}

// Step 5: Per-category slot caps
const compareLinks: string[] = [];
const storyLinks: string[] = [];
const blogLinks: string[] = [];
const changelogLinks: string[] = [];
const otherLinks: string[] = [];

for (const { link } of deduped) {
  if (/\/compare\b|\/vs-/i.test(link)) compareLinks.push(link);
  else if (/\/(customers|case-studies)\//i.test(link)) storyLinks.push(link);
  else if (/\/blog\//i.test(link)) blogLinks.push(link);
  else if (/\/changelog\//i.test(link)) changelogLinks.push(link);
  else otherLinks.push(link);
}

const reservedCompare   = Math.min(2, compareLinks.length);
const reservedStory     = Math.min(2, storyLinks.length);
const reservedBlog      = Math.min(1, blogLinks.length);
const reservedChangelog = Math.min(1, changelogLinks.length);
const reservedTotal     = reservedCompare + reservedStory + reservedBlog + reservedChangelog;

const rawSelected = [
  ...otherLinks.slice(0, Math.max(0, (safeMaxPages - 1) - reservedTotal)),
  ...compareLinks.slice(0, reservedCompare),
  ...storyLinks.slice(0, reservedStory),
  ...blogLinks.slice(0, reservedBlog),
  ...changelogLinks.slice(0, reservedChangelog),
].slice(0, safeMaxPages - 1);

// Step 6: Canonical probes
const canonicalProbes = ['/pricing', '/plans', '/billing'];
const usesWww = allDiscovered.some(u => { try { return new URL(u).hostname.startsWith('www.'); } catch { return false; } });
const probeBase = usesWww ? `https://www.${baseHost}` : `https://${baseHost}`;
const selectedSet = new Set(rawSelected.map(l => normaliseForDedup(l)));
const missingProbes = canonicalProbes
  .map(p => `${probeBase}${p}`)
  .filter(u => !selectedSet.has(normaliseForDedup(u)));
const finalSelected = [...missingProbes, ...rawSelected].slice(0, safeMaxPages - 1);

// ─── Output ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(72)}`);
console.log(`Would scrape ${finalSelected.length + 1} pages (1 home + ${finalSelected.length} subpages):\n`);

// Home page always first
const scoreMap = new Map(deduped.map(({ link, score }) => [link, score]));

console.log(`  #0   (home)  ${formattedUrl}`);
for (let i = 0; i < finalSelected.length; i++) {
  const url = finalSelected[i];
  const score = scoreMap.get(url);
  const scoreStr = score !== undefined ? String(score).padStart(5) : ' PROBE';
  const tag = missingProbes.includes(url) ? '  ← canonical probe' : '';
  console.log(`  #${String(i + 1).padStart(2)}  ${scoreStr}  ${url}${tag}`);
}

if (missingProbes.length > 0) {
  console.log(`\n  Note: ${missingProbes.length} canonical probe(s) added (not discovered by map)`);
}

// ─── Verbose: what was dropped ────────────────────────────────────────────────

if (verbose && allDiscovered.length > 0) {
  const selectedSet2 = new Set(finalSelected);
  selectedSet2.add(formattedUrl);
  const dropped = allDiscovered.filter(u => !selectedSet2.has(u)).slice(0, 30);
  if (dropped.length > 0) {
    console.log(`\n${'─'.repeat(72)}`);
    console.log(`\nFirst 30 URLs that were discovered but NOT selected:\n`);
    for (const u of dropped) {
      const elig = checkEvidenceEligible(u, registrableDomain);
      const excl = exclusionPatterns.find(p => p.test(u));
      const reason = excl ? `exclusion: ${excl}` : !elig.eligible ? `ineligible: ${elig.reason}` : 'not in top slots';
      console.log(`  ${u}`);
      console.log(`    → ${reason}`);
    }
  }
}

console.log('');
