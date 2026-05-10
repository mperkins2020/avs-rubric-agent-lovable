## Goal
Make the homepage pop using Option C (Bold Brand Statement) — but with gradient used sparingly as accent only — plus the three add-ons (stronger score chips, tinted hover shadows, tinted trust badges).

## Scope
Frontend/presentation only. No new color tokens needed — reuse existing `--vt-violet`, `--vt-cyan`, `--vt-coral`, `--vt-mint`, and `--gradient-primary` from `src/index.css`. No business logic changes.

## Changes

### 1. Hero (sparing gradient accents)
- Apply `.gradient-text` to one or two key words in the hero headline only (not the whole headline) — e.g. "Buyability Score".
- Add a single soft animated gradient blob (low opacity, blurred) behind the hero as ambient background — not a full-bleed gradient.
- Primary CTA button: keep solid violet fill, add a subtle violet glow shadow on hover (`shadow-[0_10px_40px_-10px_hsl(var(--vt-violet)/0.5)]`).

### 2. Coral as scarcity/CTA accent
- Reserve coral (`--vt-coral`) for the single primary "Check Your Buyability Score" CTA accents (e.g. small coral dot or underline detail) — used once, not repeated.

### 3. Colored top borders on section cards
- Add 3px colored top borders to feature/dimension cards in "What the analysis evaluates", cycling through cyan → violet → mint → coral → blue. Subtle but adds visible rhythm.

### 4. Add-on A — Stronger score chip fills
- Update `.score-badge-high/medium/low` in `src/index.css`: bump background opacity from `/0.1` to `/0.15`, keep 1px ring, ensure text stays accessible.

### 5. Add-on B — Tinted hover shadows
- Cards/buttons get accent-tinted shadows on hover instead of neutral grey (e.g. `hover:shadow-[0_18px_45px_-15px_hsl(var(--vt-violet)/0.25)]`).

### 6. Add-on C — Tinted trust badges
- Trust badges/pills near the URL input get soft tinted backgrounds (e.g. `bg-[hsl(var(--vt-cyan)/0.08)]` with matching border) instead of plain grey.

## Files to edit
- `src/pages/Index.tsx` — hero headline gradient word, ambient blob, section card top borders, trust badge tints, CTA hover glow
- `src/components/URLInput.tsx` — CTA button hover glow + coral accent dot
- `src/components/ReportPreviewCarousel.tsx` — CTA hover glow (consistency)
- `src/index.css` — bump score badge fill opacity; optionally add a `.glow-violet` utility for hover shadows

## Out of scope
- No new tokens, no full-bleed gradient backgrounds, no changes to dark sections, no copy changes, no layout restructuring.

## QA
- Verify on 1523px desktop viewport (current) and check mobile breakpoint via preview.
- Confirm contrast on tinted badges and score chips remains readable.
