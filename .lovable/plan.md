## Goal

Tighten the homepage hero so the H1 → static subhead → URL input path dominates above the fold. No layout/component changes — just remove two text blocks and clean up surrounding spacing.

## Final hero stack (above the fold)

1. H1 — "Find the Buyer Friction / Slowing Your Growth"
2. Static subhead — "AVS Rubric measures buyability across 8 buyer-confidence dimensions."
3. URL input
4. (loading / error state when active)

## Changes

**`src/pages/Index.tsx`**

- Remove the `RotatingSubhead` component usage from the hero (lines ~410).
- Remove the `RotatingSubhead` function definition and the `rotatingLines` array at the top of the file (lines ~31–63) since they become unused.
- Remove the unused `AnimatePresence` import if no other usage remains in the file (verify before removing).
- Remove the microcopy paragraph "Built for AI products and AI-powered SaaS teams." below the URL input (lines ~416–418).
- Promote the static buyability line so it acts as the subhead: bump from `text-sm` to `text-base md:text-lg`, keep `text-muted-foreground`, increase bottom margin from `mb-6` to `mb-8 md:mb-10` so it breathes between H1 and input.
- Tighten the H1's bottom margin slightly (`mb-5` → `mb-4`) so the new subhead sits closer to the headline.

## Out of scope

- No changes to the CategoryCarousel, feature pillars, report preview, dimension chips, dark CTA band, or footer.
- No changes to colors, fonts, or component structure.
- No changes to metadata, SEO, or routing.

## Technical note

`AnimatePresence` is also used in the mobile menu and the hero status pills, so the import stays. Only `RotatingSubhead` + `rotatingLines` are removed as dead code.
