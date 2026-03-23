# AVS Rubric — Engine Debug Log

**Purpose:** Running QA log for scoring issues, gate misfires, evidence gaps, and calibration drift.
**Usage:** When a report produces a questionable result, log it here. Run `Scan the debug log for recurring patterns` periodically to surface systemic issues.
**Related:** See ENGINE_DEBUG_HISTORY.md for backfilled history from git.

**Entries:** 7 | **Last updated:** March 22, 2026

---

## Pattern Summary

<!-- Update this section periodically. Count entries by root cause and dimension. -->

| Root Cause | Count | Most Affected Dimension |
|------------|-------|------------------------|
| evidence_gap | 0 | — |
| gate_misfire | 0 | — |
| confidence_miscalc | 0 | — |
| prompt_drift | 0 | — |
| pipeline_miss | 7 | Value Unit, Cost Driver Mapping, Safety/Trust, Overages & Risk |
| contamination | 0 | — |
| other | 0 | — |

---

## Debug Log

<!-- Newest first. To add an entry, copy the template below and fill it in. -->

<!-- Next entry goes here -->

---

### Entry 007 — March 22, 2026

| Field | Value |
|-------|-------|
| Company | Miro.com |
| Version | V2 (post-fix) |
| Dimension | All 8 dimensions — partial observability |
| Score | 11/16 (69%) — Established Stage |
| Pages Analyzed | 13 (including miro.com/pricing) |
| Root Cause | Partially resolved — pricing page now present and used for scoring |
| Caught By | Comparison to V1 baseline |
| Status | Stable. Miro V2 is a valid post-fix baseline. |

**Root Cause Detail:**
Pricing page prioritization fix from Round 6 resolved the V1 catastrophic failure. `miro.com/pricing` is now present and contributing evidence across all 8 dimensions. Score of 69% reflects genuine partial observability — AI credit metering and safety rail details are not publicly documented by Miro. This is accurate, not a pipeline miss.

**Open Issues:**
FAQ deep link extraction from pricing page not yet confirmed for Miro. If `miro.com/pricing` contains accordion/FAQ links to a help center article defining AI credit metering, those would be missed under the current implementation. Recommend a follow-up run to confirm.

**Pattern Tag:** `post-fix-baseline`, `genuine-partial-observability`, `miro-ai-credit-metering-gap`

---

### Entry 006 — March 22, 2026

| Field | Value |
|-------|-------|
| Company | Miro.com |
| Version | V1 (pre-fix) |
| Dimension | Dimensions 3–8 (all scored 0/2) |
| Score | 3/16 (19%) — Nascent Stage |
| Pages Analyzed | 15 |
| Root Cause | pipeline_miss — catastrophic: two simultaneous failure modes |
| Caught By | Manual review — 19% on a well-known SaaS product with a public pricing page immediately flagged |
| Status | Fixed. Exclusion pattern and pricing priority fix applied in Round 6. |

**Root Cause Detail:**

**(A) Pricing page completely absent from evidence set.** Despite `miro.com/pricing` existing and being the highest-priority target, it was not fetched or analyzed. Dimensions 3–8 scored 0/2 as a direct result. This is the most severe single-page miss observed across all test runs.

**(B) 9 of 15 page slots consumed by `miro.com/app/board/*` URLs** — individual whiteboard embed pages containing no pricing, packaging, or trust surface content. These pages matched the domain but had zero dimension relevance. They crowded out the pricing page entirely.

**Resolution:**
Round 6: Pricing page forced to highest priority regardless of URL scoring. `/app/board/*` pattern added to exclusion list. Cache cleared and rerun confirmed V2 at 69%.

**Pattern Tag:** `pricing-page-absent`, `product-embed-url-slot-consumption`, `catastrophic-pipeline-failure`

---

### Entry 005 — March 22, 2026

| Field | Value |
|-------|-------|
| Company | Clay.com |
| Version | V3 (post all rounds of fixes) |
| Dimension | Value Unit (primary improvement), all dimensions |
| Score | 12/16 (75%) — Established Stage |
| Pages Analyzed | 7 (including university.clay.com/docs/actions-data-credits) |
| Root Cause | Resolved — university deep link now extracted and analyzed |
| Caught By | Score comparison across rounds |
| Status | Stable. Clay V3 is the new calibration anchor. |

**Root Cause Detail:**
After 5 rounds of iteration, `university.clay.com/docs/actions-data-credits` is now present in the evidence set. Value Unit scored 2/2 (up from 1/2) as a direct result, confirming this page contains the authoritative definition of Actions and Data Credits. Overall score held at 75% — the university link improved Value Unit but Cost Driver Mapping, Overages, and Safety Rails remain at 1/2 reflecting genuine gaps in Clay's public documentation.

**Key finding:** A single deep link off the pricing page FAQ was the signal page for an entire dimension. This pattern is expected to repeat across other companies.

**Pattern Tag:** `university-deep-link-signal-page`, `faq-accordion-extraction-success`, `clay-v3-calibration`

---

### Entry 004 — March 22, 2026

| Field | Value |
|-------|-------|
| Company | Clay.com |
| Version | Post-fix V1 through V2 (6 rounds of iteration) |
| Dimension | Multiple — Value Unit primary, score stability secondary |
| Score Progression | 75% → 69% (regression) → 75% (recovered) → 75% (V3 with university link) |
| Root Cause | pipeline_miss — fix implementation errors, 4 sub-issues requiring 6 rounds to resolve |
| Caught By | Manual review across all rounds |
| Status | Fixed in V3. |

**Root Cause Detail:**

**(A) Fix 1 sourced FAQ anchor links from `www.clay.com/faq` instead of `clay.com/pricing` DOM.** Resolved Round 1.

**(B) URL deduplication failure** — `www.clay.com/faq` appeared twice in pages list. Resolved Round 1.

**(C) Fix 3 Score Stability Rule caused score regression to 69%** by anchoring to a stale cached run. Floor logic corrected to ensure scores can only go up or stay the same vs. most recent prior run. Resolved Round 1.

**(D) FAQ/accordion deep link extraction not scoped correctly** — five rounds required to correctly extract `university.clay.com/docs/actions-data-credits` from the FAQ section of `clay.com/pricing` specifically. Root issue: extraction was either too broad (keyword matching introduced instability) or too narrow (scoped to wrong DOM regions). Final fix: extraction anchored to pricing page and pricing-calculator only, following hyperlinks with ≥2 path segments found within accordion/FAQ regions. Generic root subdomains excluded. Resolved Round 6.

**Pattern Tag:** `fix-implementation-regression`, `faq-extraction-scope-error`, `score-stability-floor-logic`, `deduplication-miss`

---

### Entry 003 — March 2026

| Field | Value |
|-------|-------|
| Company | ZoomInfo.com |
| Version | V1 → V2 |
| Dimension | Value Unit |
| Subtest(s) | Unit definition presence, metering corroboration |
| V1 Score | 1/2 (50% conf) |
| V2 Score | 0/2 (30% conf) |
| Root Cause | pipeline_miss — Score Stability failure |
| Caught By | Manual review (user compared V1 and V2 evidence side by side) |
| Status | Fix specified, not yet implemented |

**Root Cause Detail:**
V1 correctly scored Value Unit at 1/2 based on `/faqs/pricing` evidence confirming seats and credits as primary units. V2 added `/about/payments` pages which contained zero Value Unit-relevant evidence — only billing logistics (payment methods, invoice navigation). The scoring pass treated the absence of corroborating signal from the new pages as dilution of existing positive signal, causing the score to drop. The V1 evidence was uncontradicted and the correct score should have held.

**Resolution:**
Two fixes required:

1. **Score Stability Rule** — A score can only change if the new evidence set contains at least one page with affirmative or contradicting evidence for that dimension. Zero-signal pages are inert with respect to scoring.
2. **Page-to-Dimension Routing** — Billing support pages (`/about/payments`, `/billing-support`, `/invoice`) are routed to Dimension 7 (Overages & Risk) evidence only and do not contribute to character budgets for Dimensions 4, 5, or 6.

**Pattern Tag:** `score-stability-zero-signal-dilution`, `billing-page-dimension-bleed`

---

### Entry 002 — March 2026

| Field | Value |
|-------|-------|
| Company | Hex.tech |
| Version | V1 → V2 |
| Dimension | Multiple dimensions improved |
| Subtest(s) | Compute unit definition, credit unit definition, metering surfaces |
| V1 Score | 63% overall |
| V2 Score | 100% overall |
| Root Cause | pipeline_miss — pricing page secondary links not crawled |
| Caught By | Manual review (user added missing URLs manually for V2) |
| Status | Fix specified, not yet implemented. Shares implementation with Clay fix. |

**Root Cause Detail:**
Two deeper links off the pricing page were missed by the crawler — `https://hex.tech/pricing/?modal=compute` and `https://hex.tech/pricing/#faq-credits`. Both are modal and FAQ anchor patterns triggered from the pricing page. These contained the primary evidence for compute and credit unit definitions. Without them, dimension subtests failed that should have passed.

**Resolution:**
Same fix as Clay (Entry 001) — **Pricing Page Secondary Pass**. This is independent confirmation of the same failure mode across two companies:

- After fetching `/pricing`, extract and queue all modal URLs, FAQ anchor fragment links, and in-FAQ hyperlinks with priority +1200 before scoring begins.
- Pre-Scoring Validation Layer (see Entry 001 for full spec).

**Pattern Tag:** `pricing-page-secondary-pass`, `modal-faq-anchor-miss`

---

### Entry 001 — March 2026

| Field | Value |
|-------|-------|
| Company | Clay.com |
| Version | V1 → V2 |
| Dimension | Value Unit, Cost Driver Mapping, Safety Rails & Trust Surfaces (multiple improved) |
| Subtest(s) | Multiple — see root cause |
| V1 Score | 75% overall |
| V2 Score | 94% overall |
| Root Cause | pipeline_miss — pricing page secondary links not crawled; pre-scoring validation absent |
| Caught By | Manual review (user added missing URL manually for V2) |
| Status | Fix specified, not yet implemented |

**Root Cause Detail:**
The evidence crawler fetched `/pricing` but did not follow a deeper link accessible via the FAQ section of the pricing page. The missed page contained high-signal evidence for multiple dimensions. Additionally, 8 of 15 queued pages returned unresolved (404 or empty). The pipeline proceeded to scoring against a partial evidence set with no flag or confidence adjustment.

**Resolution:**
Two fixes required:

1. **Pricing Page Secondary Pass** — After fetching `/pricing`, extract and queue all modal URLs, FAQ anchor fragment links, and in-FAQ hyperlinks with priority +1200 before scoring begins.
2. **Pre-Scoring Validation Layer** — Validate each queued page returned status 200 with non-empty content before scoring. If ≥30% unresolved, retry once. Remaining unresolved pages trigger confidence penalty −0.15 on affected dimensions.

**Pattern Tag:** `pricing-page-secondary-pass`, `unresolved-page-no-flag`

---

## Known Failure Modes

Recurring pipeline failure patterns identified across production runs. Each row is a confirmed failure class with a fix status.

| Failure Mode | Status |
|---|---|
| Pricing page secondary links (modals, FAQ anchors) not crawled | Fixed — Fix 1: Pricing Page Secondary Pass |
| Pre-scoring validation absent; unresolved pages not flagged | Fixed — Fix 2: Pre-Scoring Validation Layer |
| Score drops when zero-signal pages added to evidence set | Fixed — Fix 3A: Score Stability Rule |
| Billing support pages bleeding into D4/D5/D6 evidence windows | Fixed — Fix 3B: Page-to-Dimension Routing |
| /app/board/* and equivalent product embed URLs consuming page slots | Fixed — exclusion pattern added Round 6 |
| Pricing page present but not used for scoring (priority override failure) | Fixed — pricing forced to highest priority Round 6 |
| 404/Not Found pages appearing in Pages Analyzed list | Fixed — 404 filter added Round 3 |
| FAQ deep link extraction scoping errors (too broad or wrong DOM region) | Fixed Round 6 — anchor to pricing page FAQ regions, follow ≥2 path segment URLs only |

---

## Calibration Anchors

These are locked reference scores for companies that have been fully validated. If a future rubric or prompt change causes any of these scores to shift without new contradicting public evidence, that is a **calibration regression** and must be investigated before the change ships.

| Company | Dimension | Locked Score | Confidence | Notes |
|---------|-----------|-------------|------------|-------|
| Clay.com | Overall | 75% (12/16) | 70% | V3 post all fixes. 7 pages including university.clay.com/docs/actions-data-credits. Value Unit 2/2 confirmed. This is the authoritative locked score. Previous 94% (V2) was based on a pipeline miss that overcorrected — V3 is correct. |
| Clay.com | Value Unit | 2/2 | 90% | Requires university.clay.com/docs/actions-data-credits in evidence set. If this page is absent, Value Unit drops to 1/2 — this is the Signal Page for this dimension. |
| Hex.tech | Overall | 100% | 76% | Post-V2 score after modal and FAQ anchor links added. V1 63% was pipeline miss. |
| Miro.com | Overall | 69% (11/16) | 64% | V2 post-fix. Pricing page present. Score reflects genuine partial observability — AI credit metering not publicly documented. Valid baseline. Follow-up recommended to check FAQ deep links on pricing page. |
| ZoomInfo.com | Value Unit | 1/2 | 50% | V1 is authoritative. Seats and credits confirmed on `/faqs/pricing`. V2 regression to 0/2 was a Score Stability failure. Credit metering detail and audit surfaces not publicly documented — this is why confidence is medium, not high. |

---

## Entry Template

```
### Entry [NNN] — [Month YYYY]

| Field | Value |
|-------|-------|
| Company | |
| Version | |
| Dimension | |
| Subtest(s) | |
| V1 Score | |
| V2 Score | |
| Root Cause | [evidence_gap · gate_misfire · confidence_miscalc · prompt_drift · pipeline_miss · contamination · other] |
| Caught By | |
| Status | [fix_specified · implemented · no_action · deferred] |

**Root Cause Detail:**

**Resolution:**

**Pattern Tag:** `tag-here`
```
