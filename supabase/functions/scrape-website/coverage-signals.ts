// Pure, dependency-free TS (no Deno-only APIs) — same rationale as
// rubric-audit.ts's and json-repair.ts's header comments: directly
// importable by both index.ts (Deno) and vitest (Node) without a
// mirror/drift setup.

/**
 * Evidence-completeness and commercial-surface-relevance signals.
 * Gate 0 Action 2B (2026-08-24) — see the Action 2 diagnosis
 * (Gate0_Action2_Evidence_Completeness_Diagnosis.md) for the full
 * root-cause analysis that motivated these.
 *
 * TWO DISTINCT CONTROLS. Do not merge them into one heuristic:
 *   A. computeCoverageWarning         — evidence-VOLUME completeness:
 *      "did we retrieve enough credible evidence?"
 *   B. computeCommercialSurfaceSignal — commercial-surface RELEVANCE:
 *      "did we retrieve evidence for the CORRECT product/category
 *      surface?" A scan can pass A cleanly and still fail B — this was
 *      confirmed directly against a live production record (HubSpot:
 *      7 pages, 6 pricing-adjacent, 51% confidence, zero evidence of its
 *      dedicated /products/aeo commercial surface).
 */

// ─── Control A: evidence-volume completeness ────────────────────────────
//
// Pre-existing logic (previously inlined in index.ts as the `coverage`
// response object's `coverageWarning` field) — computed on every scan since
// before this change, but never consumed downstream. Extracted verbatim,
// not altered, so this refactor changes WHERE the signal is read, not what
// it means.
export function computeCoverageWarning(
  discoveredUrlCount: number,
  selectedCount: number,
  resolvedCount: number,
): boolean {
  return (
    (selectedCount > 0 && resolvedCount < Math.ceil(0.6 * selectedCount)) ||
    discoveredUrlCount < 12
  );
}

// ─── Control B: commercial-surface relevance ────────────────────────────

export interface ScrapedPageLike {
  url: string;
}

export interface CommercialSurfaceSignal {
  productScopedPageCount: number;
  productScopedPricingPageCount: number;
  /**
   * True only when a product path WAS deliberately seeded
   * (`productSearch` set) AND the final scraped page set contains zero
   * pages actually scoped to it. Always false for root-domain-configured
   * companies (`productSearch` undefined) — this control does not apply to
   * them, and root-domain behavior is unchanged.
   */
  commercialSurfaceWarning: boolean;
}

/**
 * For a product-path-seeded company (`productSearch` set from the first
 * segment of the seeded domain path — e.g. "aeo" for
 * hubspot.com/products/aeo), checks whether the FINAL scraped page set
 * (what was actually captured, not just discovered/candidate URLs)
 * contains any page scoped to that product. If not, the only pricing-
 * adjacent evidence in the scan is generic/root-domain content — which is
 * not equivalent evidence for a product-specific benchmark target, and
 * must not be silently treated as if the correct surface had been found.
 *
 * Deliberately does NOT attempt semantic judgment about whether the
 * product-scoped pages found are actually GOOD evidence — only whether any
 * exist at all. That narrower question is what a human reviewer decides;
 * this control's job is only to reliably surface the risk, not resolve it.
 */
export function computeCommercialSurfaceSignal(
  pages: ScrapedPageLike[],
  productSearch: string | undefined,
  isPricingPage: (url: string) => boolean,
): CommercialSurfaceSignal {
  if (!productSearch) {
    return { productScopedPageCount: 0, productScopedPricingPageCount: 0, commercialSurfaceWarning: false };
  }
  const productPathRe = new RegExp(`\\/${productSearch}\\/|\\/${productSearch}$`, 'i');
  const productScopedPages = pages.filter((p) => productPathRe.test(p.url));
  const productScopedPricingPages = productScopedPages.filter((p) => isPricingPage(p.url));
  return {
    productScopedPageCount: productScopedPages.length,
    productScopedPricingPageCount: productScopedPricingPages.length,
    commercialSurfaceWarning: productScopedPages.length === 0,
  };
}

/**
 * Canonical-probe construction (Gate 0 Action 2B fix). Prior behavior
 * (before this change) always probed only the bare root domain
 * (`${probeBase}${path}`), even for a company deliberately seeded at a
 * product-specific path — confirmed live to silently reintroduce
 * wrong-product evidence when the product-path map under-discovers
 * (similarweb.com/packages/ai-search/: main-domain map returned 0 URLs,
 * so the root-domain-only probes became the ONLY pricing-adjacent
 * evidence available).
 *
 * Fix: when `productSearch` is set, ALSO probe the same canonical paths
 * under the seeded product path, ordered FIRST so they win any slot
 * contention over the generic root-domain probes. Root-domain probes are
 * always still included — this is additive, not a replacement — so
 * companies genuinely configured at the root (no `productSearch`) see
 * byte-identical behavior to before this change.
 */
export function buildCanonicalProbes(
  probeBase: string,
  canonicalPaths: string[],
  productSearch: string | undefined,
  isAlreadySelected: (url: string) => boolean,
): string[] {
  const productProbes = productSearch
    ? canonicalPaths
        .map((path) => `${probeBase}/${productSearch}${path}`)
        .filter((url) => !isAlreadySelected(url))
    : [];
  const rootProbes = canonicalPaths
    .map((path) => `${probeBase}${path}`)
    .filter((url) => !isAlreadySelected(url));
  return [...productProbes, ...rootProbes];
}
