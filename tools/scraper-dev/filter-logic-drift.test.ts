/**
 * filter-logic-drift.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GUARDRAIL: fails whenever the local mirror (filter-logic.ts) drifts from the
 * production scraper (supabase/functions/scrape-website/index.ts).
 *
 * Why this exists
 * ---------------
 * `filter-logic.ts` is a hand-maintained copy of the scraper's URL filter and
 * scoring rules, used by the `filter` and `preview-urls` dev tools. When the
 * scraper changes but the mirror doesn't, those tools silently report scrape
 * decisions that no longer match production — the exact "silent staleness"
 * failure the scraper-dev tools were built to prevent. This test closes that gap.
 *
 * What it checks
 * --------------
 * For each mirrored construct it compares the *semantic content* (regex literals,
 * quoted string members, and scoring weights) rather than the source text, so the
 * mirror is free to differ structurally (e.g. filter-logic exports named consts
 * and adds a score breakdown; the scraper defines some rules inline). Only the
 * rules that actually change scrape decisions must match.
 *
 * When it fails
 * -------------
 * The message lists exactly which tokens are in the scraper but not the mirror
 * (or vice-versa). Re-sync filter-logic.ts, then bump SYNCED_WITH_ANALYSIS_VERSION.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../..');

const scraperSrc = readFileSync(
  join(repoRoot, 'supabase/functions/scrape-website/index.ts'),
  'utf-8',
);
const mirrorSrc = readFileSync(join(here, 'filter-logic.ts'), 'utf-8');

// ─────────────────────────────────────────────────────────────────────────────
// Mini-lexer: walk source once, classify comments / strings / regex literals so
// braces and quotes inside them can't fool the slicing or token extraction.
// Returns a same-length "neutralized" copy (comments, string bodies and regex
// literals blanked to spaces, newlines preserved) plus the regex literals found,
// each with its source position.
// ─────────────────────────────────────────────────────────────────────────────

interface LexResult {
  neutralized: string;
  regexes: { start: number; end: number; text: string }[];
}

function lex(src: string): LexResult {
  const out: string[] = new Array(src.length);
  const regexes: LexResult['regexes'] = [];
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k++) out[k] = src[k] === '\n' ? '\n' : ' ';
  };
  let i = 0;
  const n = src.length;
  let prevSig = ''; // last non-whitespace char emitted as code — decides regex vs divide

  while (i < n) {
    const c = src[i];

    // line comment
    if (c === '/' && src[i + 1] === '/') {
      const j = ((): number => { let k = i; while (k < n && src[k] !== '\n') k++; return k; })();
      blank(i, j); i = j; continue;
    }
    // block comment
    if (c === '/' && src[i + 1] === '*') {
      let k = i + 2; while (k < n && !(src[k] === '*' && src[k + 1] === '/')) k++;
      k = Math.min(n, k + 2); blank(i, k); i = k; continue;
    }
    // string literal (single / double / template) — blank the body, keep length
    if (c === '"' || c === "'" || c === '`') {
      let k = i + 1;
      while (k < n) { if (src[k] === '\\') { k += 2; continue; } if (src[k] === c) { k++; break; } k++; }
      blank(i, k); prevSig = c; i = k; continue;
    }
    // regex literal — a '/' that does not follow a value (identifier, ), ], digit)
    if (c === '/') {
      const isDivision = /[A-Za-z0-9_$)\]]/.test(prevSig);
      if (!isDivision) {
        let k = i + 1; let inClass = false; let ok = false;
        while (k < n) {
          const ck = src[k];
          if (ck === '\\') { k += 2; continue; }
          if (ck === '\n') break;            // unterminated → treat as divide
          if (ck === '[') inClass = true;
          else if (ck === ']') inClass = false;
          else if (ck === '/' && !inClass) { ok = true; break; }
          k++;
        }
        if (ok) {
          let e = k + 1; while (e < n && /[dgimsuy]/.test(src[e])) e++;
          regexes.push({ start: i, end: e, text: src.slice(i, e) });
          blank(i, e); prevSig = '/'; i = e; continue;
        }
      }
      out[i] = '/'; prevSig = '/'; i++; continue;
    }

    out[i] = c;
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  return { neutralized: out.join(''), regexes };
}

// Slice a bracket-balanced block ([...] or {...}) starting at the first `open`
// found at/after a marker. Balancing runs on the neutralized copy (safe from
// braces inside regex/strings); the returned range indexes the original source.
function balancedRange(
  original: string,
  neutralized: string,
  marker: string,
  open: '[' | '{',
): { start: number; end: number } {
  const close = open === '[' ? ']' : '}';
  const m = original.indexOf(marker);
  if (m === -1) throw new Error(`marker not found: ${marker}`);
  const start = neutralized.indexOf(open, m);
  if (start === -1) throw new Error(`open '${open}' not found after: ${marker}`);
  let depth = 0;
  for (let k = start; k < neutralized.length; k++) {
    if (neutralized[k] === open) depth++;
    else if (neutralized[k] === close) { depth--; if (depth === 0) return { start, end: k + 1 }; }
  }
  throw new Error(`unbalanced '${open}' after: ${marker}`);
}

const scraper = lex(scraperSrc);
const mirror = lex(mirrorSrc);

// Regex literal source strings whose position falls inside [start, end).
function regexesInRange(lexed: LexResult, r: { start: number; end: number }): string[] {
  return lexed.regexes.filter(x => x.start >= r.start && x.end <= r.end).map(x => x.text);
}

// Quoted string members inside a neutralized-safe range of the ORIGINAL source.
function stringMembersInRange(original: string, r: { start: number; end: number }): string[] {
  const slice = original.slice(r.start, r.end);
  return [...slice.matchAll(/(['"])((?:[^\\]|\\.)*?)\1/g)].map(x => x[2]);
}

// score += N / score -= N weights (sign kept), inside a range of the ORIGINAL.
function scoreWeightsInRange(original: string, r: { start: number; end: number }): string[] {
  const slice = original.slice(r.start, r.end);
  return [...slice.matchAll(/score\s*([+-])=\s*(\d+)/g)].map(x => `${x[1]}${x[2]}`);
}

// Compare two token multisets; on mismatch report the asymmetric differences.
function expectSameMultiset(label: string, prod: string[], mir: string[]) {
  const sortedProd = [...prod].sort();
  const sortedMir = [...mir].sort();
  const onlyInProd = sortedProd.filter(t => !removeOne(sortedMir, t));
  const onlyInMirror = sortedMir.filter(t => !removeOne([...prod], t));
  const detail =
    onlyInProd.length || onlyInMirror.length
      ? `\n[${label}] drift detected — re-sync filter-logic.ts:\n` +
        (onlyInProd.length ? `  in scraper but MISSING from mirror:\n${onlyInProd.map(t => `    ${t}`).join('\n')}\n` : '') +
        (onlyInMirror.length ? `  in mirror but NOT in scraper:\n${onlyInMirror.map(t => `    ${t}`).join('\n')}\n` : '')
      : '';
  expect(detail, detail || `${label} in sync`).toBe('');
}

// remove-one-occurrence helper (mutates copy), returns true if found.
function removeOne(arr: string[], t: string): boolean {
  const idx = arr.indexOf(t);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('filter-logic mirror is in sync with the production scraper', () => {
  it('is pinned to the scraper ANALYSIS_VERSION', () => {
    const scraperVersion = scraperSrc.match(/ANALYSIS_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
    // NOTE: ANALYSIS_VERSION lives in analyze-company/index.ts; the scraper file
    // references it indirectly. Read it from the source of truth here.
    const av = readFileSync(
      join(repoRoot, 'supabase/functions/analyze-company/index.ts'),
      'utf-8',
    ).match(/ANALYSIS_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
    const pinned = mirrorSrc.match(/SYNCED_WITH_ANALYSIS_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
    expect(pinned, 'filter-logic.ts must declare SYNCED_WITH_ANALYSIS_VERSION').toBeTruthy();
    expect(
      pinned,
      `filter-logic.ts is pinned to ${pinned} but the pipeline is at ${av}. ` +
        `Re-verify the mirror against the scraper, then bump SYNCED_WITH_ANALYSIS_VERSION.`,
    ).toBe(av);
    void scraperVersion;
  });

  it('priorityPatterns match', () => {
    const p = regexesInRange(scraper, balancedRange(scraperSrc, scraper.neutralized, 'const priorityPatterns = [', '['));
    const m = regexesInRange(mirror, balancedRange(mirrorSrc, mirror.neutralized, 'priorityPatterns = [', '['));
    expectSameMultiset('priorityPatterns', p, m);
  });

  it('exclusionPatterns match', () => {
    const p = regexesInRange(scraper, balancedRange(scraperSrc, scraper.neutralized, 'const exclusionPatterns = [', '['));
    const m = regexesInRange(mirror, balancedRange(mirrorSrc, mirror.neutralized, 'exclusionPatterns = [', '['));
    expectSameMultiset('exclusionPatterns', p, m);
  });

  it('fullContentPatterns match', () => {
    const p = regexesInRange(scraper, balancedRange(scraperSrc, scraper.neutralized, 'const fullContentPatterns = [', '['));
    const m = regexesInRange(mirror, balancedRange(mirrorSrc, mirror.neutralized, 'fullContentPatterns = [', '['));
    expectSameMultiset('fullContentPatterns', p, m);
  });

  it('highIntentPaths match', () => {
    const p = stringMembersInRange(scraperSrc, balancedRange(scraperSrc, scraper.neutralized, 'const highIntentPaths = new Set([', '['));
    const m = stringMembersInRange(mirrorSrc, balancedRange(mirrorSrc, mirror.neutralized, 'highIntentPaths = new Set([', '['));
    expectSameMultiset('highIntentPaths', p, m);
  });

  it('helpSubdomains match', () => {
    const p = stringMembersInRange(scraperSrc, balancedRange(scraperSrc, scraper.neutralized, 'const helpSubdomains = [', '['));
    const m = stringMembersInRange(mirrorSrc, balancedRange(mirrorSrc, mirror.neutralized, 'helpSubdomains = [', '['));
    expectSameMultiset('helpSubdomains', p, m);
  });

  it('BILLING_DEDUP_PATHS matches', () => {
    const grab = (src: string) => src.match(/BILLING_DEDUP_PATHS\s*=\s*(\/(?:\\.|\[(?:\\.|[^\]])*\]|[^/])+\/[a-z]*)/)?.[1];
    expect(grab(mirrorSrc), 'BILLING_DEDUP_PATHS drift').toBe(grab(scraperSrc));
  });

  it('scoreUrl regexes + weights match', () => {
    const pr = balancedRange(scraperSrc, scraper.neutralized, 'function scoreUrl(', '{');
    const mr = balancedRange(mirrorSrc, mirror.neutralized, 'function scoreUrlWithBreakdown(', '{');
    expectSameMultiset('scoreUrl regexes', regexesInRange(scraper, pr), regexesInRange(mirror, mr));
    expectSameMultiset('scoreUrl weights', scoreWeightsInRange(scraperSrc, pr), scoreWeightsInRange(mirrorSrc, mr));
  });

  it('isEvidenceEligible regexes match', () => {
    const pr = balancedRange(scraperSrc, scraper.neutralized, 'const isEvidenceEligible =', '{');
    const mr = balancedRange(mirrorSrc, mirror.neutralized, 'function checkEvidenceEligible(', '{');
    expectSameMultiset('isEvidenceEligible', regexesInRange(scraper, pr), regexesInRange(mirror, mr));
  });

  it('normaliseForDedup regexes match', () => {
    const pr = balancedRange(scraperSrc, scraper.neutralized, 'const normaliseForDedup =', '{');
    const mr = balancedRange(mirrorSrc, mirror.neutralized, 'function normaliseForDedup(', '{');
    expectSameMultiset('normaliseForDedup', regexesInRange(scraper, pr), regexesInRange(mirror, mr));
  });
});
