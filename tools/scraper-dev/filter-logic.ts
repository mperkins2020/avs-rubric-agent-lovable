/**
 * filter-logic.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Local mirror of the URL filter + scoring logic in the production scraper
 * (supabase/functions/scrape-website/index.ts). Powers the `filter` and
 * `preview-urls` dev tools.
 *
 * ⚠️  This is a MANUAL mirror — it can drift from the scraper.
 * When you change a filter rule in the scraper, update it here too, then bump
 * SYNCED_WITH_ANALYSIS_VERSION below to the scraper's new ANALYSIS_VERSION.
 *
 * A guardrail test (filter-logic-drift.test.ts) fails whenever the regexes,
 * scoring weights, or version string here diverge from the scraper. Run it with
 * `npm test` (or `npx vitest run filter-logic-drift`) after any scraper change.
 */

// The ANALYSIS_VERSION this mirror was last verified against. The drift test
// asserts this equals the scraper's ANALYSIS_VERSION — bump it here whenever
// you re-sync, so a scraper version bump can't silently outrun this file.
export const SYNCED_WITH_ANALYSIS_VERSION = '2026-07-10-pipeline-v33';

// ─── URL scoring & helpers ────────────────────────────────────────────────────

export const priorityPatterns = [
  /\/pricing\b/i,
  /\/plans?\b/i,
  /\/billing\b/i,
  /\/subscription\b/i,
  /\/usage\b/i,
  /\/about\b/i,
  /\/features?\b/i,
  /\/products?\b/i,
  /\/solutions?\b/i,
  /\/security\b/i,
  /\/trust\b/i,
  /\/compliance\b/i,
  /\/enterprise\b/i,
  /\/platform\b/i,
  /\/integrations?\b/i,
  /\/how-it-works\b/i,
  /\/use-cases?\b/i,
  /\/customers?\b/i,
  /\/case-stud/i,
  /\/resources?\b/i,
  /\/why-/i,
  /\/compare/i,
  /\/vs-/i,
  /\/docs\b/i,
  /\/help\b/i,
  /\/help-center\b/i,
  /\/knowledge-base\b/i,
  /\/faq\b/i,
  /\/support\b/i,
  /\/hc\b/i,
  /\/api\b/i,
  /\/developers?\b/i,
  /\/changelog\b/i,
  /\/updates\b/i,
  /\/release-notes\b/i,
  /\/status\b/i,
  /\/legal\b/i,
  /\/privacy\b/i,
  /\/credits\b/i,
  /\/refund/i,
  /\/cancel/i,
  /\/roi\b/i,
  /overage/i,
  /calculator/i,
  /fair.?use/i,
  /rate.?limit/i,
  /quota/i,
  /metering/i,
];

export const highIntentPaths = new Set([
  '/pricing', '/plans', '/plan', '/billing', '/usage', '/buy',
  '/subscription', '/features', '/feature', '/product',
  '/products', '/solutions',
  '/security', '/trust', '/compliance', '/privacy',
  '/roi-calculator', '/roi', '/calculator', '/value-calculator',
  '/hc',
]);

export const exclusionPatterns = [
  /\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|txt)$/i,
  /\/(blog|news|press|careers|jobs|cookie|author|tag|category|insights?)\//i,
  /\/(blog|news|press|careers|jobs|cookie|author|tag|category|insights?)$/i,
  /\/(wp-content|wp-admin|wp-includes|wp-json)\//i,
  /\/dashboard\b/i,
  /\/(login|signup|sign-up|sign-in|register|cart|checkout)\b/i,
  /\/legal\/(?!$)[^/]+/i,
  /\/template-categor(y|ies)\b/i,
  /\/templates?\//i,
  /\/sitemap[^/]*\.xml\b/i,
  /\/events?\//i,
  /\/events?\b$/i,
  /\/webinars?\b/i,
  /\/integrations\/[^/]+$/i,
  // Expert/instructor profiles, courses, academy, tutorials, learn content —
  // user-generated/educational, zero pricing signal (Issue 8, deployed 2026-05-08)
  /\/experts?\/[^/]+/i,
  /\/courses?\//i,
  /\/courses?\b$/i,
  /\/academy\//i,
  /\/academy\b$/i,
  /\/tutorials?\//i,
  /\/tutorials?\b$/i,
  /\/learn\//i,
  /\/marketplace\/[^/]+$/i,
  /\/what-is-[^/]+/i,
  /\/how-to-[^/]+/i,
  /\/guide-to-[^/]+/i,
  /\/terms\b/i,
  /\/explore\b/i,
  /\/collections\//i,
  /\/partners\b/i,
  /^https?:\/\/developers?\./i,
  // Prompt library pages — user-facing AI prompt templates, zero pricing signal
  /\/prompts?\//i,
  /\/prompts?\b$/i,
  /\/prompts?\/[^/]+/i,
  // Founders / team profiles — no pricing evidence
  /\/founders?\b/i,
  // Lecture and playlist pages — educational content, same principle as /courses/
  /\/[^/]+-lectures?\//i,
  /\/[^/]+-lectures?\b$/i,
  /\/[^/]+-playlist\//i,
  /\/[^/]+-playlist\b$/i,
];

export const fullContentPatterns = [
  /\/pricing\b/i, /\/plans?\b/i, /\/billing\b/i,
  /\/faq\b/i, /\/help\b/i, /\/support\b/i,
  /\/trust\b/i, /\/security\b/i, /\/credits\b/i, /\/usage\b/i,
  /\/hc\b/i, /\/roi\b/i, /calculator/i, /\/refund/i,
];

export const helpSubdomains = ['help', 'support', 'docs', 'kb', 'knowledge', 'community', 'trust', 'compliance'];

export const BILLING_DEDUP_PATHS = /\/(?:about\/payments?|billing(?:-support)?|invoice|payments?|billing-and-invoices|payment-support)\b/i;

// ─── Helper functions ─────────────────────────────────────────────────────────

export function getNormalizedPath(link: string): string {
  try { return new URL(link).pathname.replace(/\/$/, '').toLowerCase() || '/'; }
  catch { return '/'; }
}

export function isSameDomain(link: string, baseHost: string): boolean {
  try { return new URL(link).hostname.replace(/^www\./, '') === baseHost; }
  catch { return false; }
}

export function isShallowSameDomainPath(link: string, baseHost: string): boolean {
  try {
    const u = new URL(link);
    if (u.hostname.replace(/^www\./, '') !== baseHost) return false;
    const segs = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    return segs.length >= 1 && segs.length <= 3;
  } catch { return false; }
}

export function isSubdomainUrl(link: string): boolean {
  return new RegExp(`^https?://(${helpSubdomains.join('|')})\\.`, 'i').test(link);
}

export function getRegistrableDomain(hostname: string): string {
  const parts = hostname.split('.');
  return parts.length >= 2 ? parts.slice(-2).join('.') : hostname;
}

// ─── Score breakdown for a URL (human-readable) ───────────────────────────────

export interface ScoreBreakdown {
  total: number;
  lines: string[];
}

export function scoreUrlWithBreakdown(
  link: string,
  baseHost: string,
  communityUrlSet: Set<string>,
): ScoreBreakdown {
  const path = getNormalizedPath(link);
  const sameDomain = isSameDomain(link, baseHost);
  const lines: string[] = [];
  let score = 0;

  if (communityUrlSet.has(link)) {
    score += 1000; lines.push('+1000  community_evidence entry');
  }
  if (sameDomain && highIntentPaths.has(path)) {
    score += 900; lines.push('+900   highIntentPath match');
  }
  if (sameDomain && isShallowSameDomainPath(link, baseHost)) {
    score += 500; lines.push('+500   shallowSameDomainPath (1–3 segments)');
  }
  const matchedPriority = priorityPatterns.find(p => p.test(link));
  if (matchedPriority) {
    score += 250; lines.push(`+250   priorityPattern: ${matchedPriority}`);
  }

  if (isSubdomainUrl(link)) {
    score += 100; lines.push('+100   helpSubdomain');
    try {
      const subPrefix = new URL(link).hostname.split('.')[0].toLowerCase();
      if (subPrefix === 'trust' || subPrefix === 'compliance') {
        score += 800; lines.push('+800   Tier 0: trust/compliance center');
      } else if (/\/(plans-and-credits|credits|pricing|billing|usage|subscription|refund|cancel|overage|limit|quota|metering)\b/i.test(path)) {
        score += 700; lines.push('+700   Tier 1: billing as path segment');
      } else if (/credits|billing|pricing|plans?|usage|overage|refund|subscription|cancel/i.test(path)) {
        score += 500; lines.push('+500   Tier 2: billing keyword in slug');
      } else if (/\/hc\/.+/i.test(path) || /\/articles?\/.+/i.test(path)) {
        score -= 200; lines.push('-200   Tier 3: generic deep help article');
      }
    } catch { /* skip */ }
  }

  if (/\/(pricing|billing|plans?|credits|subscription|refund|cancel|buy)\b/i.test(path) && !highIntentPaths.has(path)) {
    score += 800; lines.push('+800   highValue billing keyword (non-highIntent path)');
  }

  if (/\/(roi|calculator|value-calculator)\b/i.test(path) && !highIntentPaths.has(path)) {
    score += 800; lines.push('+800   ROI/calculator boost');
  }

  if (/\/docs?\b/i.test(path)) {
    if (/\/(billing|pricing|credits?|overage|usage|refund|cancel|limit|quota|trust|security|compliance|plan|subscription|metering|rate.?limit|fair.?use)\b/i.test(path)) {
      score += 800; lines.push('+800   Tier 1 docs: billing/trust keyword');
    } else {
      score -= 200; lines.push('-200   Tier 2 docs: generic docs page');
    }
  }

  if (/\/features?\//i.test(path)) {
    score += 200; lines.push('+200   feature sub-page');
  }

  if (/\/compare\b|\/vs-/i.test(path)) {
    score -= 200; lines.push('-200   compare/vs page (cap)');
  }

  return { total: score, lines };
}

// Plain scoreUrl for use in filtering/sorting (no breakdown)
export function scoreUrl(link: string, baseHost: string, communityUrlSet: Set<string>): number {
  return scoreUrlWithBreakdown(link, baseHost, communityUrlSet).total;
}

// ─── isEvidenceEligible ────────────────────────────────────────────────────────

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

export function checkEvidenceEligible(link: string, registrableDomain: string): EligibilityResult {
  try {
    const parsed = new URL(link);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { eligible: false, reason: 'Non-http/https scheme' };
    }
    if (/(&quot;|&amp;|&#\d+|[>)'"\\])$/.test(link)) {
      return { eligible: false, reason: 'Malformed URL (trailing HTML entity or syntax char)' };
    }
    const host = parsed.hostname.replace(/^www\./, '');
    if (!host.endsWith(registrableDomain) && host !== registrableDomain) {
      return { eligible: false, reason: `External domain (not under ${registrableDomain})` };
    }
    if (parsed.hostname.startsWith('cdn.')) {
      return { eligible: false, reason: 'CDN subdomain' };
    }
    if (/\.(webp|png|jpg|jpeg|gif|svg|ico|pdf|zip|mp4|mp3|wav|woff|woff2|ttf|eot|css|js)$/i.test(parsed.pathname)) {
      return { eligible: false, reason: 'Asset file extension' };
    }
    if (/\/(images|assets|static|media|fonts)\//i.test(parsed.pathname)) {
      return { eligible: false, reason: 'Static asset path' };
    }
    if (parsed.pathname.split('/').some(seg => seg.startsWith('@'))) {
      return { eligible: false, reason: '@username path (user-generated content)' };
    }

    const lastSeg = parsed.pathname.split('/').filter(Boolean).pop() || '';
    if (/^-[a-z0-9]{10,}$/i.test(lastSeg)) {
      return { eligible: false, reason: 'Legacy gamma.app "-slug" pattern' };
    }
    const digitCount = (lastSeg.match(/[0-9]/g) ?? []).length;
    const isZendeskSlug = /^[0-9]+-[a-z][a-z-]*$/.test(lastSeg);
    const lastToken = lastSeg.includes('-') ? (lastSeg.split('-').pop() || '') : '';
    const lastTokenDigits = (lastToken.match(/[0-9]/g) ?? []).length;

    if (lastSeg.length >= 8 && /^[A-Za-z0-9_-]+=*$/.test(lastSeg) && /[A-Z]/.test(lastSeg) && /[a-z]/.test(lastSeg)) {
      return { eligible: false, reason: `Rule A: mixed-case base64 ID (${lastSeg})` };
    }
    if (!isZendeskSlug && /^[0-9]/.test(lastSeg) && lastSeg.length >= 8 && /[a-zA-Z]/.test(lastSeg)) {
      return { eligible: false, reason: `Rule B: digit-leading slug (${lastSeg})` };
    }
    if (lastSeg.length >= 10 && /^[a-z0-9]+$/.test(lastSeg) && /[a-z]/.test(lastSeg) && digitCount >= 3) {
      return { eligible: false, reason: `Rule C: opaque no-hyphen ID (${lastSeg})` };
    }
    if (lastToken.length >= 8 && /^[a-z0-9]+$/.test(lastToken) && lastTokenDigits >= 2) {
      return { eligible: false, reason: `Rule D: compound slug with opaque suffix (${lastToken})` };
    }
    if (/^\d{5,}$/.test(lastSeg)) {
      return { eligible: false, reason: `Rule E: pure numeric ID (${lastSeg})` };
    }

    const firstSeg = parsed.pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
    if (/^(subscription|usage|account|accounts|dashboard|settings|login|signin|sign-in|sign-up|signup|register)$/.test(firstSeg)) {
      return { eligible: false, reason: `Gated path blocklist: /${firstSeg}` };
    }

    return { eligible: true };
  } catch {
    return { eligible: false, reason: 'Invalid URL (parse error)' };
  }
}

// ─── normaliseForDedup ────────────────────────────────────────────────────────

export function normaliseForDedup(link: string): string {
  try {
    const parsed = new URL(link);
    parsed.hash = parsed.hash.startsWith('#:~:') ? '' : parsed.hash;
    parsed.pathname = parsed.pathname.replace(/^\/[a-z]{2}(-[a-zA-Z]{2,4})?\//,  '/');
    // Collapse double slashes in path (//about → /about) — Issue 7 fix
    parsed.pathname = parsed.pathname.replace(/\/\/+/g, '/');
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/$/, '');
    parsed.hostname = parsed.hostname.replace(/^www\./, '');
    parsed.protocol = 'https:';
    if (BILLING_DEDUP_PATHS.test(parsed.pathname)) { parsed.search = ''; parsed.hash = ''; }
    return parsed.toString();
  } catch { return link; }
}

// ─── checkExclusionPatterns ───────────────────────────────────────────────────

export function checkExclusionPatterns(link: string): { blocked: boolean; pattern?: RegExp } {
  const matched = exclusionPatterns.find(p => p.test(link));
  return matched ? { blocked: true, pattern: matched } : { blocked: false };
}

// ─── Full pipeline check for a URL ───────────────────────────────────────────

export interface UrlVerdict {
  url: string;
  exclusion: { blocked: boolean; pattern?: RegExp };
  eligibility: EligibilityResult;
  score: ScoreBreakdown;
  normalised: string;
  included: boolean;
  excludedReason?: string;
}

export function auditUrl(
  url: string,
  baseHost: string,
  registrableDomain: string,
  communityUrlSet: Set<string> = new Set(),
): UrlVerdict {
  const exclusion = checkExclusionPatterns(url);
  const eligibility = checkEvidenceEligible(url, registrableDomain);
  const score = scoreUrlWithBreakdown(url, baseHost, communityUrlSet);
  const normalised = normaliseForDedup(url);
  const included = !exclusion.blocked && eligibility.eligible;
  const excludedReason = exclusion.blocked
    ? `exclusionPattern: ${exclusion.pattern}`
    : !eligibility.eligible
      ? `isEvidenceEligible: ${eligibility.reason}`
      : undefined;

  return { url, exclusion, eligibility, score, normalised, included, excludedReason };
}

// ─── .env loader (for Node.js scripts) ───────────────────────────────────────

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export function loadDotEnv(): void {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const repoRoot = join(here, '../..');
    const content = readFileSync(join(repoRoot, '.env'), 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // no .env — rely on existing process.env
  }
}
