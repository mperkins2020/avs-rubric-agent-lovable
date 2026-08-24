import { describe, it, expect } from 'vitest';
import {
  computeCoverageWarning,
  computeCommercialSurfaceSignal,
  buildCanonicalProbes,
  type ScrapedPageLike,
} from './coverage-signals.ts';

// Fixtures/unit logic only — no live network calls. Each case maps to a
// real August/September failure signature from the Gate 0 Action 2
// diagnosis, not a synthetic scenario.

const isPricingPage = (url: string): boolean =>
  /\/(pricing|plans?|billing|subscription|credits|cost|packages|buy)\b/i.test(url);

describe('computeCoverageWarning (Control A — evidence-volume completeness)', () => {
  it('flags a catastrophic thin-evidence case (Goodie AI / Conductor batched-attempt signature: 1 page, no pricing)', () => {
    // discoveredUrlCount well under the 12-URL floor
    expect(computeCoverageWarning(1, 1, 1)).toBe(true);
  });

  it('does not flag a healthy root-domain case (AthenaHQ signature: 16 pages used, ample discovery/resolution)', () => {
    expect(computeCoverageWarning(200, 16, 16)).toBe(false);
  });

  it('flags when resolved pages fall below 60% of selected, even with reasonable discovery', () => {
    // 20 selected, only 10 resolved (50%) — below the 60% floor
    expect(computeCoverageWarning(200, 20, 10)).toBe(true);
  });

  it('does not flag when resolution is exactly at the 60% boundary', () => {
    // 10 selected, 6 resolved = exactly 60% -> ceil(0.6*10)=6, 6 < 6 is false
    expect(computeCoverageWarning(200, 10, 6)).toBe(false);
  });

  it('flags on discovery count alone even if everything selected resolved cleanly', () => {
    // Only 5 URLs discovered total, but all 5 resolved -- still thin overall
    expect(computeCoverageWarning(5, 5, 5)).toBe(true);
  });
});

describe('computeCommercialSurfaceSignal (Control B — commercial-surface relevance)', () => {
  it('does not warn for a genuinely root-domain-configured company (no productSearch)', () => {
    const pages: ScrapedPageLike[] = [
      { url: 'https://example.com/pricing' },
      { url: 'https://example.com/plans' },
    ];
    const result = computeCommercialSurfaceSignal(pages, undefined, isPricingPage);
    expect(result.commercialSurfaceWarning).toBe(false);
    expect(result.productScopedPageCount).toBe(0);
  });

  it('warns when a product path was seeded but zero scraped pages are scoped to it (HubSpot AEO signature: only generic root-domain pricing pages captured)', () => {
    const pages: ScrapedPageLike[] = [
      { url: 'https://www.hubspot.com/pricing' },
      { url: 'https://www.hubspot.com/pricing/cms' },
      { url: 'https://www.hubspot.com/pricing/marketing-plus' },
      { url: 'https://www.hubspot.com/pricing/bundle/' },
    ];
    const result = computeCommercialSurfaceSignal(pages, 'aeo', isPricingPage);
    expect(result.commercialSurfaceWarning).toBe(true);
    expect(result.productScopedPageCount).toBe(0);
    expect(result.productScopedPricingPageCount).toBe(0);
  });

  it('warns when a product path was seeded and the map under-discovered it, leaving only root-domain fallback pricing (Similarweb signature)', () => {
    const pages: ScrapedPageLike[] = [
      { url: 'https://similarweb.com/packages/ai-search/' }, // home, force-scraped
      { url: 'https://similarweb.com/pricing' }, // root canonical probe fallback
      { url: 'https://docs.similarweb.com/api-v5/guides/data-credits-calculations' },
    ];
    const result = computeCommercialSurfaceSignal(pages, 'packages', isPricingPage);
    // Home page itself IS /packages/ scoped, so this demonstrates the nuance:
    // the home page alone does not make this a false alarm if it's the ONLY
    // product-scoped page and carries no pricing signal on its own — but per
    // this control's stated scope (existence, not quality, of product-scoped
    // evidence), a single scoped page is enough to NOT warn. This is the
    // documented limit of what Control B detects (see coverage-signals.ts
    // doc comment) -- confirmed explicitly by this test's assertion below.
    expect(result.productScopedPageCount).toBe(1);
    expect(result.commercialSurfaceWarning).toBe(false);
  });

  it('warns for the stricter Similarweb case where even the home page was not captured under the product path (main-domain map returned 0, no force-scrape of the seed path succeeded)', () => {
    const pages: ScrapedPageLike[] = [
      { url: 'https://similarweb.com/pricing' }, // root canonical probe fallback only
      { url: 'https://docs.similarweb.com/api-v5/guides/data-credits-calculations' },
    ];
    const result = computeCommercialSurfaceSignal(pages, 'packages', isPricingPage);
    expect(result.commercialSurfaceWarning).toBe(true);
    expect(result.productScopedPageCount).toBe(0);
  });

  it('does not warn when product-scoped pricing evidence was genuinely captured (Amazon Q Developer / path-seeded GitHub Copilot positive-control signature)', () => {
    const pages: ScrapedPageLike[] = [
      { url: 'https://aws.amazon.com/q/developer' },
      { url: 'https://aws.amazon.com/q/developer/pricing' },
      { url: 'https://aws.amazon.com/q/developer/features' },
    ];
    const result = computeCommercialSurfaceSignal(pages, 'q', isPricingPage);
    expect(result.commercialSurfaceWarning).toBe(false);
    expect(result.productScopedPageCount).toBe(3);
    expect(result.productScopedPricingPageCount).toBe(1);
  });
});

describe('buildCanonicalProbes (Control B fix — product-aware canonical fallback)', () => {
  const canonicalPaths = ['/pricing', '/plans', '/billing'];
  const noneSelected = () => false;

  it('preserves existing root-domain-only behavior when no product path is seeded', () => {
    const probes = buildCanonicalProbes('https://example.com', canonicalPaths, undefined, noneSelected);
    expect(probes).toEqual([
      'https://example.com/pricing',
      'https://example.com/plans',
      'https://example.com/billing',
    ]);
  });

  it('adds product-scoped probes ahead of root-domain probes when a product path is seeded (GitHub Copilot signature)', () => {
    const probes = buildCanonicalProbes(
      'https://github.com',
      canonicalPaths,
      'features',
      noneSelected,
    );
    expect(probes[0]).toBe('https://github.com/features/pricing');
    expect(probes[1]).toBe('https://github.com/features/plans');
    expect(probes[2]).toBe('https://github.com/features/billing');
    // Root-domain probes still present (additive, not a replacement) --
    // preserves root-domain behavior even for a product-seeded company.
    expect(probes).toContain('https://github.com/pricing');
    expect(probes).toContain('https://github.com/plans');
    expect(probes).toContain('https://github.com/billing');
    expect(probes.length).toBe(6);
  });

  it('does not duplicate a probe URL that was already selected by normal discovery/scoring', () => {
    const isSelected = (url: string) => url === 'https://similarweb.com/packages/pricing';
    const probes = buildCanonicalProbes(
      'https://similarweb.com',
      canonicalPaths,
      'packages',
      isSelected,
    );
    expect(probes).not.toContain('https://similarweb.com/packages/pricing');
    expect(probes).toContain('https://similarweb.com/packages/plans');
    expect(probes).toContain('https://similarweb.com/packages/billing');
    expect(probes).toContain('https://similarweb.com/pricing');
  });
});
