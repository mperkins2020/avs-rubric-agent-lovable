# Model Card — AVS Rubric Scoring System

**Last reviewed:** 2026-05-02

## Purpose

The AVS Rubric scores a SaaS company's trust infrastructure that enables buyability across 8 dimensions (Buyer Budget, Cost Driver, ICP Clarity, North Star, Overages Risk, Pools Packaging, Safety Rails, Value Unit) on a 0–2 scale per subtest, producing a 0–16 overall score.

## Intended users

- SaaS founders and pricing leads evaluating their own pricing page
- Revenue/RevOps teams benchmarking competitors
- Buyers evaluating vendor transparency before purchase

## Out-of-scope use

- Investment, credit, or insurance decisions about the scored company
- Employment screening of any individual
- Any decision with legal effect on a natural person
- Real-time decisioning where stale scores (cached up to 7 days) would mislead

## How it works

1. **Discovery** — Firecrawl maps the domain, prioritizes pricing/billing/docs pages within a 15-page budget.
2. **Extraction** — Public HTML scraped; structured pricing data extracted via Firecrawl JSON schema where possible.
3. **Scoring** — Gemini 2.5 Pro (primary) or GPT-5 (fallback) evaluates each subtest with explicit rubric instructions and required citations from scraped snippets.
4. **Stability** — 3-pass median vote per dimension; "Score Stability Rule" floors a re-run to the previous score if only additive evidence appears.
5. **Classification** — Regex-based deterministic classifier assigns L1/L2 pricing model labels.

## Models used

| Component | Model | Provider |
|---|---|---|
| Primary scoring | google/gemini-2.5-pro | Google via Lovable AI Gateway |
| Fast scoring / chat | google/gemini-2.5-flash | Google via Lovable AI Gateway |
| Fallback scoring | openai/gpt-5 | OpenAI via Lovable AI Gateway |

## Known limitations

- **Public content only** — gated, login-walled, or sales-only pricing is scored as "Enterprise: Contact Sales" and not graded.
- **JS-rendered content** — content behind tooltips or JS-only modals may be missed; mitigated by `community_evidence` table.
- **Stale cache** — scans cached for 7 days; pricing changes within that window may not appear until ANALYSIS_VERSION is bumped or cache expires.
- **English-language bias** — rubric prompts and citation matching are English-first.
- **No ground-truth dataset** — rubric is calibrated against expert review, not a labeled benchmark; confidence bands (High/Med/Low) are surfaced to the user.

## Human oversight

- Every output displays an "AI-generated" badge with model attribution.
- Users can challenge any score via the in-app chat or feedback form (`src/components/FeedbackForm.tsx`).
- The Accuracy Workflow (`mem://features/accuracy-workflow`) lets users add public links the scraper missed and re-run.

## Performance and evaluation

- QA log: `ENGINE_DEBUG_LOG.md` (go-forward) and `ENGINE_DEBUG_HISTORY.md` (backfilled).
- Calibration tasks: `tasks/rubric-calibration-draft.md`.

## Change log

- 2026-05-02 — Initial model card created.
