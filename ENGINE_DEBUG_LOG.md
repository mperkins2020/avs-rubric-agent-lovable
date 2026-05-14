# AVS Rubric — Engine Debug Log

**Purpose:** Running QA log for scoring issues, gate misfires, evidence gaps, and calibration drift.
**Usage:** When a report produces a questionable result, log it here. Run `Scan the debug log for recurring patterns` periodically to surface systemic issues.
**Related:** See ENGINE_DEBUG_HISTORY.md for backfilled history from git.

**Entries:** 52 | **Last updated:** May 13, 2026

---

## Pattern Summary

<!-- Update this section periodically. Count entries by root cause and dimension. -->

| Root Cause | Count | Most Affected Dimension |
|------------|-------|------------------------|
| evidence_gap | 0 | — |
| gate_misfire | 0 | — |
| confidence_miscalc | 0 | — |
| prompt_drift | 1 | ICP and Job Clarity (D2) |
| pipeline_miss | 23 | Value Unit, Cost Driver Mapping, Safety/Trust, Overages & Risk, URL filter |
| contamination | 13 | Pricing Transparency, Enterprise/Compliance (D7/D8) |
| calibration | 3 | Value unit (D4), ICP and Job Clarity (D2), Safety Rails (D8) |
| other | 1 | N/A — architecture decision |

---

## Debug Log

<!-- Newest first. To add an entry, copy the template below and fill it in. -->

<!-- Next entry goes here -->

---

### Entry 052 — May 13, 2026

| Field | Value |
|-------|-------|
| Company | Kore.ai |
| Version | 2026-05-13-pipeline-v24 |
| Dimension | Safety rails and trust surfaces |
| Subtest(s) | Evidence citation |
| V1 Score | 1/2 |
| V2 Score | 1/2 |
| Root Cause | presentation — duplicate evidence citations in 3-pass merge |
| Caught By | Manual review (Michelle, 2026-05-13) |
| Status | open 🔴 |

**Root Cause Detail:**
Safety Rails dimension shows 6 evidence blocks but only 3 are unique — the bottom 3 are truncated repeats of the top 3. The 3-pass majority vote system merges evidence from all passes into the final output without deduplicating. When multiple passes cite the same page and quote, duplicates appear in the report. This is a cosmetic/presentation issue — scoring is not affected since the majority vote operates on scores, not evidence. Fix: deduplicate evidence by (url + quote) before writing to the final output.

**Pattern Tag:** `duplicate-evidence-citations`

---

### Entry 051 — May 13, 2026

| Field | Value |
|-------|-------|
| Company | All |
| Version | 2026-05-13-pipeline-v22 |
| Dimension | N/A — performance |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | other — scan latency regression |
| Caught By | Manual testing (Michelle, 2026-05-13) |
| Status | open 🔴 |

**Root Cause Detail:**
Scan time increased from ~1 minute to over 2 minutes after pipeline-v22 deployment. Pipeline-v22 added retry logic (up to 2 attempts) to `callLovableAI()`, which could add latency on retries. However, the increase appears on successful first-attempt scans as well — retry alone doesn't explain the full regression. Possible contributors: Gemini 2.5 Flash gateway latency, larger prompt payloads from improved page selection, or Firecrawl scrape time. Needs profiling.

**Pattern Tag:** `scan-latency-regression`

---

### Entry 050 — May 13, 2026

| Field | Value |
|-------|-------|
| Company | Forethought (81%→50%), Sierra (38%→25%) |
| Version | 2026-05-13-pipeline-v22 |
| Dimension | Multiple — Value Unit, Buyer Budget, North Star, ICP |
| Subtest(s) | Multiple |
| V1 Score | Forethought 13/16, Sierra 6/16 |
| V2 Score | Forethought 8/16, Sierra 4/16 |
| Root Cause | calibration — scorer variance across runs on identical page sets |
| Caught By | Benchmark rescan QA (Michelle, 2026-05-13) |
| Status | open 🔴 |

**Root Cause Detail:**
Both companies were rescanned with the same pages available (community_evidence URLs included and confirmed in pages analyzed). Forethought dropped from 81% to 50%: Value Unit went from 1/2 to 0/2 ("not explicitly defined"), Buyer Budget from 2/2 to 1/2. Sierra dropped from 38% to 25%: North Star from 2/2 to 1/2, ICP from 2/2 to 1/2. No prompt or scoring logic changes between runs — same pipeline version for the "before" runs. The model (Gemini 2.5 Flash via Lovable AI Gateway) is interpreting the same evidence differently across runs. Temperature is set to 0.1, which should minimize but doesn't eliminate variance.

Potential fixes: (1) reduce temperature to 0, (2) add scoring anchor examples to the prompt, (3) run multiple scoring passes and take median/mode, (4) add explicit calibration criteria for score thresholds.

**Pattern Tag:** `scorer-variance-same-pages`

---

### Entry 049 — May 13, 2026

| Field | Value |
|-------|-------|
| Company | Multiple (Sierra, Amplemarket, CrewAI, Relevance AI, Gong, Devin, Amazon Q, JetBrains, others) |
| Version | 2026-05-05-pipeline-v21 |
| Dimension | All — page selection, not scoring |
| Subtest(s) | N/A |
| V1 Score | Varies (low — often 1-3 pages used) |
| V2 Score | Varies (higher — all analyzed pages used after manual URL addition) |
| Root Cause | pipeline_miss — pages analyzed but not selected for scoring; adding one URL via insider prompts causes all analyzed pages to suddenly appear in "pages used" |
| Caught By | Manual benchmark QA review (Michelle, 2026-05-12) |
| Status | monitoring 👀 |

**Root Cause Detail:**
During Phase 1 benchmark QA, a recurring pattern was observed across 10+ companies: the scraper discovers and analyzes 8-15 pages, but only 1-3 are selected for scoring. When the user manually adds one relevant URL (e.g., a trust center or security page) via the app UI's insider prompts, the rescan suddenly uses all analyzed pages, not just the added one. Scores jump significantly (e.g., Amplemarket 31→75, Devin 18→75, Relevance AI 69→94).

The page selection logic uses a 100K char budget with priority scoring. The bug may be related to how the rerun path reprocesses the page set when insider answers are provided, potentially changing priority ordering or content assembly. However, the bug has not reproduced in the last 3-4 runs as of May 13.

Added diagnostic logging in pipeline-v22: dropped pages now logged with priority score and char count to detect recurrence.

**Pattern Tag:** `pages-analyzed-not-used`

---

### Entry 048 — April 22, 2026

| Field | Value |
|-------|-------|
| Company | ZoomInfo.com |
| Version | 2026-04-22-pipeline-v17 |
| Dimension | N/A — URL filter / deduplication |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | pipeline_miss — same-URL query-string variants bypassing dedup |
| Caught By | Manual review of Pages Analyzed list |
| Status | implemented ✅ |

**Root Cause Detail:**
`www.zoominfo.com/about/payments` appeared 4 times in the Pages Analyzed list. `normaliseForDedup()` strips `#:~:text=` anchors but preserves all other hash fragments (by design — FAQ section anchors like `#faq-credits` reveal genuinely different JS-rendered content). ZoomInfo links to `/about/payments` from multiple places with different section anchors (`#creditcard`, `#invoice`, `#bank-transfer`, etc.), each producing a distinct dedup key and consuming a separate slot. Unlike pricing FAQ anchors, billing page section anchors do not reveal different content.

**Resolution:**
For paths matched by `BILLING_DEDUP_PATHS` in `normaliseForDedup()`, strip both query params AND hash fragments before key comparison. Billing support pages have no section-partitioned content that would justify separate slots.

**Pattern Tag:** `dedup-query-param-billing-page`

---

### Entry 047 — April 22, 2026

| Field | Value |
|-------|-------|
| Company | ZoomInfo.com |
| Version | 2026-04-22-pipeline-v17 |
| Dimension | N/A — URL filter |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | pipeline_miss — product database pages with pure numeric IDs consuming evidence slots |
| Caught By | Manual review of Pages Analyzed list |
| Status | implemented ✅ |

**Root Cause Detail:**
ZoomInfo's company enrichment pages (`/c/1fit/551539465`, `/c/8worx-co/474189324`, etc.) were included in the evidence set. These are ZoomInfo's product output — enriched profiles of *other companies* in their database — not ZoomInfo's own corporate content. They returned "Access to this page has been denied" (login wall) and contributed zero evidence. The `isEvidenceEligible()` resource-instance ID filter checks for mixed alphanumeric slugs (Rules A–D) but does not reject pure numeric last path segments. A 9-digit integer like `551539465` is always a database record key, never a content page.

**Resolution:**
Add Rule E to `isEvidenceEligible()`: reject any URL whose last path segment is a pure numeric string of 5+ digits. Catches `/c/company/551539465` universally without ZoomInfo-specific hardcoding.

**Pattern Tag:** `numeric-id-product-page`, `login-wall-evidence-slot`

---

### Entry 046 — April 22, 2026

| Field | Value |
|-------|-------|
| Company | N/A — Pipeline architecture |
| Version | 2026-04-22-pipeline-v17 |
| Dimension | All (model_type drives D5–D8 guardrail overrides) |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | other — architecture decision |
| Caught By | Deliberate consolidation review |
| Status | implemented ✅ |

**Decision: Single LLM-based model type classifier**

The regex classifier (`classifyModelType.ts`) and the LLM-inferred `pricingModelGuess` in the company profile were two parallel systems producing the same output through different methods. The regex classifier had low confidence on ambiguous cases because it operates on pricing page text only, with no holistic context. The LLM identifier, receiving all scraped content, was consistently more accurate but had no L2 variant output and no explicit confidence score.

**Resolution:**
Consolidated into a single LLM classifier. `COMPANY_PROFILE_PROMPT` now returns `model_type_l1`, `model_type_l2`, `model_type_confidence`, and `classification_evidence` using the internal taxonomy (`access/consumption/outcome/hybrid/gated/unclassified`). `classifyModelType.ts` is no longer called. `modelClassification` is derived directly from the company profile.

**Taxonomy split (user-facing vs. internal):**
- Internal: `access`, `consumption`, `outcome`, `hybrid`, `gated`, `unclassified`
- Display: "Seat-based", "Usage-based", "Outcome-based", "Hybrid", "Enterprise / Contact Sales", "Unknown"
- Display label is a deterministic mapping from `model_type_l1` — never LLM-generated at render time.
- `classification_evidence` is internal only — not rendered in any public-facing component.

**RUBRIC_SCORING_PROMPT updated:** `Pricing Model Guess == "seat"` → `Pricing Model == "access"`, `"usage"` → `"consumption"`. Hybrid and outcome terms unchanged.

**Pattern Tag:** `classifier-consolidation`, `taxonomy-unification`

---

### Entry 045 — April 18, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — tenth pass, arc closed) |
| Version | 2026-04-18-pipeline-v16 |
| Dimension | All dimensions — QA arc closure |
| Root Cause | N/A — confirmed result |
| Caught By | Live scan QA — final verification pass |
| Status | resolved ✅ |

**Result:** 12/16 (75%), Established Stage, 68% confidence, 9 pages analyzed.

| Dimension | Score | Confidence |
|---|---|---|
| Product north star | 1/2 | 60% |
| ICP and job clarity | 2/2 | 80% |
| Buyer and budget alignment | 2/2 | 80% |
| Value unit | 2/2 | 80% |
| Cost driver mapping | 1/2 | 60% |
| Pools and packaging | 2/2 | 80% |
| Overages and risk allocation | 1/2 | 60% |
| Safety rails and trust surfaces | 1/2 | 43% |

**D8 rationale (confirmed correct):** SOC2 Type II + Trust Center satisfy T5 via the
compliance_cert path. Missing public budget caps/usage alerts correctly hold T2 and T4,
capping at 1/2. Confidence 43% (Medium) is accurate — in-product controls likely exist
but are not publicly documented. 90-day recommendation is actionable: document overage
policy and publish safety rail documentation.

**Gamma QA arc summary (Entries 034–045):**

| Version | Score | D8 | Root cause fixed |
|---|---|---|---|
| v8 (baseline) | 8/16 | 0/2 | — |
| v9 | — | 0/2 | /terms, /explore exclusions |
| v10 | — | 0/2 | developers.* hostname leak |
| v11 | — | 0/2 | Zendesk exception regex, Fix 1 domain check |
| v12 | — | 0/2 | Rule D (UGC slugs), 5xx detection |
| v13 | 11/16 | 0/2 | Credits article (community_evidence) |
| v14 | 10/16 | 0/2 | trust/compliance helpSubdomains (var bug introduced) |
| v15 | — | 0/2 | Subdomain probe cap (trust probes separated) |
| v15-hotfix | error | — | parsed is not defined in scoreUrl |
| v16 | **12/16** | **1/2** | D8 T5 SOC2/compliance_cert path |

**Net result:** +4 score points, Emerging → Established, D8 0/2 → 1/2, all from
pipeline and scoring engine fixes with no change to Gamma's actual product or policies.
This arc is the primary case study for the verification loop build-in-public post.

**Pattern Tag:** `arc-closed`, `pipeline-miss`, `scoring-gap`, `verification-loop`

---

### Entry 044 — April 18, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — ninth pass) |
| Version | 2026-04-18-pipeline-v15 |
| Dimension | D8 Safety Rails (0/2, 30% confidence) |
| Root Cause | scoring_gap — T5 subtest definition doesn't award credit for SOC2 + Trust Center |
| Caught By | Live scan QA — trust.gamma.app now in evidence set but D8 still 0/2 |
| Status | fixed |

**Root Cause Detail:**

Trust center IS now in the evidence set (trust.gamma.app, trust.gamma.app/controls,
trust.gamma.app/resources — pages 5, 8, 9). The LLM correctly extracted the content.
The LLM rationale stated: "While a Trust Center exists, it focuses on security and
compliance rather than customer-facing cost controls." This is accurate — and that's
the problem.

D8 T5 (Admin and access controls) only passes if `(rbac OR admin) IN tiers[].features`
AND `audit_logs OR audit_export`. SOC2 Type II is extractable into `tiers[].features`
as `soc2`, but T5 never checks for it. The trust center content (infrastructure security,
organizational security, product security) maps to `compliance_cert` but that surface_type
didn't exist. Result: T1 (hard-cap) + T6 (limit behavior) = 2 points = Score 0.

**The methodology says:** "Score 1: Basic security mentions present" and "Score 2: Explicit
advanced trust surfaces + compliance certs (SOC2, HIPAA, ISO) required." The subtests
didn't implement this — SOC2 had no scoring path.

**Fix:**
1. Added `compliance_cert` to trust_surfaces[].surface_type enum
2. Extended T5 with alternative pass path: `soc2 IN tiers[].features` AND publicly
   linked trust center with controls (trust_surfaces[].surface_type == compliance_cert
   with public availability OR evidence_url not null from trust domain)
3. Note: SOC2 Type II, ISO 27001, HIPAA, PCI-DSS, FedRAMP all satisfy the soc2 condition

**Expected result for Gamma:**
T1 (hard-cap) + T5 (SOC2 + trust.gamma.app) + T6 (limit behavior) = 3 points → Score 1
Gates: T4 fail → cap at 1, T2 fail → cap at 1. Final: D8 = 1/2 ✓

**ANALYSIS_VERSION:** bumped to `2026-04-18-pipeline-v16`.

**Pattern Tag:** `scoring_gap`, `D8-subtest-definition`, `soc2-trust-center`, `spec-implementation-mismatch`

---

### Entry 043 — April 18, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — eighth pass) |
| Version | 2026-04-17-pipeline-v14 |
| Dimension | D8 Safety Rails (0/2, 30% confidence) |
| Root Cause | pipeline_miss — subdomain probe hard-capped at 2, trust/compliance sorted to bottom |
| Caught By | Live scan QA — trust.gamma.app still absent after v14 helpSubdomains fix |
| Status | fixed |

**Root Cause Detail:**

Adding `trust` and `compliance` to `helpSubdomains` (v14) was necessary but not sufficient.
The subdomain probing logic (Phase 1b) caps probes at `.slice(0, 2)` after sorting by a
priority order of `['docs', 'help', 'support', 'developer']`. Since `trust` and `compliance`
are not in that order list, they receive sort index 99 and are cut off by the slice.

For Gamma: `help.gamma.app` and `docs.gamma.app` take both slots → `trust.gamma.app` never
probed. The main Firecrawl domain map also doesn't discover `trust.gamma.app` because the
link on the pricing page ("Learn more at our Trust Center") is a JavaScript-rendered element,
not a plain `<a href>` that Firecrawl follows during crawling. Vanta/Drata hosting via CNAME
also prevents the main domain sitemap from including trust center URLs.

**Fix:** Split `priorityProbes` into two separate pools:
1. **Trust/compliance probes** — always probed when undiscovered, no cap. These are primary
   D8 evidence per the AVS methodology and must not be gated by a cost-saving cap.
2. **General help probes** — capped at 2, sorted by `['docs', 'help', 'support', 'kb', 'knowledge']`.
   `developer` removed from the sort order (no longer in helpSubdomains).

Result: `trust.gamma.app` will now always be probed regardless of how many help subdomains
are also undiscovered. No cost increase for companies without trust/compliance subdomains.

**Also noted:** D2 (ICP & Job Clarity) regressed 2/2 → 1/2 in v14 vs v13 — run-to-run variance,
not a pipeline bug. Expect it to stabilise once evidence set is complete.

**ANALYSIS_VERSION:** bumped to `2026-04-18-pipeline-v15`.

**Pattern Tag:** `pipeline_miss`, `subdomain-probe-cap`, `trust-center-subdomain`, `D8-evidence-gap`

---

### Entry 042 — April 17, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — seventh pass) |
| Version | 2026-04-17-pipeline-v13 |
| Dimension | D8 Safety Rails (0/2, 30% confidence) |
| Root Cause | pipeline_miss — trust subdomain not in helpSubdomains |
| Caught By | Live scan QA — trust.gamma.app linked from pricing page but not followed |
| Status | fixed |

**Root Cause Detail:**

v13 scan showed 11/16 (significant improvement from v12's 8/16 after credits article was added).
D8 remains 0/2 at 30% confidence. The pricing page contains "We're a SOC 2 Type II compliant
organization. Learn more at our Trust Center" with a link to `trust.gamma.app`. The scraper
did not follow this link because `trust` was not in `helpSubdomains`.

`trust.*` and `compliance.*` are a well-established SaaS convention for dedicated trust centers
(trust.gamma.app, trust.lovable.dev, trust.clay.com, trust.replit.com, trust.hex.tech,
compliance.elevenlabs.io). These pages contain primary D8 evidence: SOC2/HIPAA/ISO certs,
security controls, audit capabilities, and compliance documentation.

**Fix:**
1. Added `'trust'` and `'compliance'` to `helpSubdomains` — Fix 1 secondary discovery now
   follows links to these subdomains from pricing page markdown
2. Added Tier 0 scoring (+800) for `subPrefix === 'trust' || subPrefix === 'compliance'` —
   trust centers compete with `highIntentPaths` for evidence slots, above billing articles

**ANALYSIS_VERSION:** bumped to `2026-04-17-pipeline-v14`.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `trust-center-subdomain`, `D8-evidence-gap`

---

### Entry 041 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — sixth pass) |
| Version | 2026-04-17-pipeline-v11 |
| Dimension | URL filter (multiple bad pages still appearing) |
| Root Cause | pipeline_miss (×2 distinct issues) |
| Caught By | Live scan QA — UGC doc URLs and 5xx error pages leaking into evidence set |
| Status | fixed |

**Root Cause Detail — Word-prefix + random suffix UGC doc URLs (Rule D):**

A new URL pattern appeared in the evidence set: `gamma.app/docs/ringkasan-jurnal-c4d1t3zry6ijqnb`.
The segment `ringkasan-jurnal-c4d1t3zry6ijqnb` starts with Indonesian words (`ringkasan jurnal` = "journal summary") followed by a random suffix. Rules A, B, and C did not block it:
- Rule A: no uppercase letters → fail
- Rule B: doesn't start with a digit → fail
- Rule C: contains hyphens → fail (`^[a-z0-9]+$` requires no hyphens)

**Fix (Rule D):** Check the **last hyphen-delimited token** of the last path segment.
`lastToken = lastSeg.split('-').pop()` → `c4d1t3zry6ijqnb` → length 15, all `[a-z0-9]`, 4 digits → blocked.

Threshold: `lastToken.length >= 8 && /^[a-z0-9]+$/.test(lastToken) && lastTokenDigits >= 2`.
Human-readable words (`gamma`, `delivery`, `enterprise`) have 0 digits → always pass.
Zendesk article slugs: lastToken is always a real English word (0 digits) → pass.

**Applied to:** both `scoredLinks.filter` and `isEvidenceEligible` (must be mirrored).

**Root Cause Detail — 5xx error pages not caught by is404 check:**

Help article `https://help.gamma.app/en/articles/8022861-what-s-the-easiest-way-to-export-my-gamma`
returned a page titled "We're having technical difficulties (500)". The existing `is404` check
pattern only matched 404-style strings. The parenthesized HTTP code `(500)` and generic error
messages were not covered.

**Fix:** Added two new conditions to all three `is404` check locations (primary, Fix 1 secondary, Fix 2 retry):
- `/\(5\d{2}\)/` — catches parenthesized HTTP status codes like `(500)`, `(503)`
- `/\b(technical difficulties|internal server error|service unavailable|bad gateway|something went wrong)\b/i`

**ANALYSIS_VERSION:** bumped to `2026-04-17-pipeline-v12`.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `ugc-doc-pattern`, `error-page-detection`

---

### Entry 040 — April 17, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — fifth pass) |
| Version | 2026-04-16-pipeline-v10 |
| Dimension | D8 Safety Rails (0/2, confidence 30%) |
| Root Cause | pipeline_miss (developers.* leak via priorityPatterns) + missing credits article (map coverage gap) |
| Caught By | Live scan QA — developers.gamma.app/workspace/list-folders appeared for the 4th consecutive scan |
| Status | fixed (developers.*) / pending (credits article) |

**Root Cause Detail — `developers.gamma.app` persisting despite helpSubdomains fix:**

Removing `developer`/`developers` from `helpSubdomains` was necessary but not sufficient.
The URL `https://developers.gamma.app/workspace/list-folders` was still passing through
`scoredLinks.filter` via a different code path: `priorityPatterns.some(p => p.test(link))`.

The offending pattern is `/\/developers?\b/i` in `priorityPatterns`. When tested against
the full URL string `https://developers.gamma.app/workspace/list-folders`, this pattern
finds a match because the URL contains `://developers` — the second `/` in `://` is
immediately followed by `developers`, satisfying `\/developers?\b`. The regex is intended
to match `/developer` as a PATH segment, but URL-string matching cannot distinguish
hostname from path segments.

**Fix:** Added `/^https?:\/\/developers?\./i` to `exclusionPatterns`. This runs BEFORE
the `priorityPatterns` check and permanently blocks `developers.*` subdomains. The pattern
anchors to the start of the URL and checks for the protocol `://` + `developers.` as a
HOSTNAME marker (not a path segment), which eliminates the false positive.

**Root Cause Detail — credits article still missing:**

`https://help.gamma.app/en/articles/7834324-how-do-credits-work-in-gamma` is not
returned by Firecrawl's map of `help.gamma.app` (map returns ~100 URLs; article is
not among them). Fix 1 (pricing page secondary discovery) can only find it if
`gamma.app/pricing` contains a markdown-format link `[text](url)` — which the scraped
markdown does not. The link likely appears in a JavaScript tooltip or hover element.

**Consequence:** D8 scored 0/2 because the hard-cap credit model (credits run out →
blocked, no overages) is documented in the credits article but not otherwise
publicly stated in a way the LLM can cite. The 90-day recommendation ("Publish a
detailed How AI Credits Work page") is factually incorrect — Gamma already has this
page. This confirms the article must enter the evidence set to produce accurate scoring.

**Resolution for credits article:** Add to `community_evidence` table in Supabase:
- `url_domain`: `gamma.app`
- `evidence_url`: `https://help.gamma.app/en/articles/7834324-how-do-credits-work-in-gamma`
Community URLs always pass the filter and are always included in the evidence set.

**ANALYSIS_VERSION:** bumped to `2026-04-17-pipeline-v11`.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `priority-pattern-hostname-leak`, `map-coverage-gap`

---

### Entry 039 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — fourth pass) |
| Version | 2026-04-16-pipeline-v9 |
| Dimension | D7/D8 (low confidence due to wrong help articles) |
| Root Cause | pipeline_miss (×4 distinct issues) |
| Caught By | Live scan QA — 5 of 9 pages still low-value or wrong |
| Status | fixed |

**Root Cause Detail:** Four residual issues after v9 deploy:

1. **`gamma.app/docs/2026-04--e3e4deqagopvucq`** (Korean user-doc "April 2026 settlement report"):
   The v9 Zendesk exception used `normHyphens >= 2`. After normalising `--` to `-`, `2026-04--e3e4deqagopvucq` becomes `2026-04-e3e4deqagopvucq` → 2 hyphens → exception incorrectly fired. The date prefix `2026-04` contributed a hyphen, making it look like a multi-word slug. Fix: replaced hyphen-counting with a precise regex test: `/^[0-9]+-[a-z][a-z-]*$/`. The word portion after the numeric ID must be **purely lowercase letters and hyphens** (no digits). `04--e3e4...` starts with `0` (digit) → fails → Rule B blocks. Verified: `2026-04--e3e4deqagopvucq` now blocked; `7834324-how-do-credits-work-in-gamma` still passes.

2. **`developers.gamma.app/workspace/list-folders`** still appearing (Fix 1 regression from v9):
   The v9 fix changed Fix 1's domain check to `resolvedHostFix1.endsWith(registrableDomain)`. This admitted ALL `*.gamma.app` subdomains — including `developers.gamma.app` — if linked from the pricing page markdown. Fix: restricted to `helpSubdomains` explicitly (`helpSubdomains.some(s => resolvedHostFix1 === s + '.' + registrableDomain)`). Only `help.*`, `support.*`, `docs.*`, etc. are admitted.

3. **`help.gamma.app/en/collections/12271373-themes-fonts`** (Themes & Fonts category page):
   Zendesk `/collections/` pages are navigation pages listing article titles — they contain no article content. Added `/\/collections\//i` to `exclusionPatterns`.

4. **`gamma.app/partners`** (Gamma Partner Terms):
   Partner agreement page — legal content, same exclusion rationale as `/terms`. Added `/\/partners\b/i` to `exclusionPatterns`.

**ANALYSIS_VERSION:** bumped to `2026-04-16-pipeline-v10`.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `zendesk-exception-regression`, `wrong-page-type`

---

### Entry 038 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — third pass) |
| Version | 2026-04-13-model-type-classifier-v8 |
| Dimension | D7 Overages & Risk / D8 Safety Rails (low confidence due to missing credits article) |
| Subtest(s) | T1–T6, R1–R6 |
| V1 Score | confidence 30% (D8), 57% (D7) |
| V2 Score | pending re-scan with v9 |
| Root Cause | pipeline_miss (×3 independent blockers on help article) + wrong_page_type (×3 low-value pages) |
| Caught By | Live scan QA — 4 of 8 pages were low-value; key credits article still missing |
| Status | fixed |

**Root Cause Detail:** Two categories of issues in the same scan:

**Category A — Low-value pages still appearing (3 pages):**
1. `gamma.app/terms` (Terms of Use Agreement): `/\/terms\b/i` was in `priorityPatterns` (a boost), not `exclusionPatterns`. Terms pages are legal boilerplate explicitly removed from the AVS methodology source list. Fix: moved to `exclusionPatterns`.
2. `gamma.app/explore` (Explore Gamma | AI Presentation Software): a gallery of user-created presentations. Passes `isShallowSameDomainPath` (1 segment) and gets a score of +500. Not product evidence. Fix: added `/\/explore\b/i` to `exclusionPatterns`.
3. `developers.gamma.app/workspace/list-folders` (GET /folders | Gamma): API endpoint reference page. Entry 037 fix (removing `developers` from `helpSubdomains`) was committed but not yet deployed to Lovable — scan predated the deployment.

**Category B — `help.gamma.app/en/articles/7834324-how-do-credits-work-in-gamma` missing (3 independent blockers):**
1. **Rule B** (`scoredLinks.filter` and `isEvidenceEligible`): segment `7834324-how-do-credits-work-in-gamma` starts with a digit → Rule B blocked it. Zendesk-style article URLs always start with a numeric ID but are followed by a human-readable hyphenated title. Key differentiator: normalized hyphen count. `7834324-how-do-credits-work-in-gamma` has 6 hyphens; `2007-p39rtn8slkfwkbe` has 1; `6--2uoyy8nkses2lbj` normalizes to 1. Zendesk exception: `normHyphens >= 2` → not a random ID. Fix applied in both code paths.
2. **Locale filter** (`scoredLinks.filter`): first path segment `/en/` matched the ISO locale filter. For help subdomains (Zendesk), `/en/` is a structural URL element, not a language variant. Fix: added `isHelpSubdomainUrl` check — locale filter now skips help subdomain paths.
3. **Fix 1 secondary discovery**: `isSameDomain(resolved, baseHost)` checks exact hostname equality (`help.gamma.app` ≠ `gamma.app`). Help subdomain links discovered in pricing page markdown were silently dropped. Fix: replaced with registrable-domain check (`resolvedHost.endsWith(registrableDomain)`).

**Additional fix — billing keyword scoring for article slugs:**
Added Tier 2 to the help subdomain score boost: billing keyword embedded anywhere in the path (not just as a dedicated segment) now scores +500. This ensures `7834324-how-do-credits-work-in-gamma` (contains "credits") competes with other evidence pages rather than getting the generic article penalty (−200).

**Version bump:** ANALYSIS_VERSION → `2026-04-16-pipeline-v9` to bust the Gamma cache.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `zendesk-article-id`, `wrong-page-type`, `help-subdomain`

---

### Entry 037 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — second pass) |
| Version | 2026-04-13-model-type-classifier-v8 |
| Dimension | N/A — evidence pipeline quality |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | pipeline_miss |
| Caught By | Live scan QA — after Entry 036 fix, two low-signal pages still visible in Gamma evidence set: `robots.txt` and `developers.gamma.app` |
| Status | fixed |

**Root Cause Detail:** Two residual pages survived Entry 036's cleanup:

1. **`robots.txt` included as a page.** The asset extension filter excluded `.pdf`, `.zip`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.css`, `.js`, `.woff`, `.woff2`, `.ttf`, `.eot` — but not `.txt`. The Firecrawl URL map includes `robots.txt` for many domains; without an explicit exclusion it passed every filter and was fetched and included as evidence. Fix: added `txt` to the extension exclusion list in `exclusionPatterns`.

2. **`developers.gamma.app` treated as a help subdomain.** `'developer'` and `'developers'` were entries in `helpSubdomains`, which grants those subdomains a +100 priority score boost and causes Phase 1b to explicitly probe them. `developers.gamma.app` is an API reference subdomain (endpoint listings, SDK guides) — not a user-facing pricing or trust page. Including it adds noise without relevant evidence. Fix: removed `'developer'` and `'developers'` from `helpSubdomains`. These subdomains are now neither boosted nor explicitly probed.

**Principle documented in code:** `developers.company.com` is an API surface, not a product evidence page. API reference docs may mention auth schemes or rate limits, but they do not document plan-level pricing, enterprise trust controls, or buyer-facing features with enough specificity to count as evidence for AVS rubric dimensions.

**Resolution:** Two edits to `supabase/functions/scrape-website/index.ts`:
- `exclusionPatterns[0]`: added `txt` → `/\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|txt)$/i`
- `helpSubdomains`: removed `'developer'`, `'developers'`

**Pattern Tag:** `pipeline_miss`, `url-filter`, `asset-exclusion`, `subdomain-noise`

---

### Entry 036 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA) |
| Version | 2026-04-13-model-type-classifier-v8 |
| Dimension | D8 Safety Rails and Trust Surfaces |
| Subtest(s) | T1–T6 (all) |
| V1 Score | 0/2 |
| V2 Score | pending re-scan |
| Root Cause | pipeline_miss |
| Caught By | Live scan QA — 6 of 13 pages were user-generated Gamma documents, not Gamma's own pages |
| Status | fixed |

**Root Cause Detail:** Gamma's `/docs/{id}` path serves publicly accessible user-created presentations (boards, slides, docs made with Gamma's product). Six such pages were included as evidence, including a "Cybersecurity Maturity Assessment" authored by a Gamma user. The LLM read this as potential evidence for D8 (Safety Rails) but correctly couldn't attribute it to Gamma — driving D8 confidence to 30% and score to 0/2. A Korean-language user presentation was also included. All six IDs are all-lowercase alphanumeric (e.g., `avu2xyfyhrqm75f`, `8nmk3jj496525b6`). The existing base64 filter (Rule A) required BOTH uppercase and lowercase — all-lowercase IDs passed through.

**Resolution:** Extended the resource-instance ID filter in both `scoredLinks.filter` and `isEvidenceEligible` (`scrape-website/index.ts`) to cover three ID conventions:
- Rule A (existing): Mixed-case base64, ≥8 chars, optional trailing `=` → catches Miro board IDs
- Rule B (new): Starts with a digit, ≥8 chars, has letters → catches `2007-p39rtn8slkfwkbe`, `6--2uoyy8nkses2lbj`
- Rule C (new): ≥10 chars, only `[a-z0-9]` (no hyphens), ≥3 digits → catches `avu2xyfyhrqm75f`, `8nmk3jj496525b6`

Verified: 10/10 known generated IDs caught, 12/12 legitimate slugs (`enterprise`, `planning-delivery`, `collaboration-features`, etc.) correctly preserved.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `random-id-exclusion`, `user-generated-content`

---

### Entry 035 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | miro.com (second live scan QA pass) |
| Version | 2026-04-13-model-type-classifier-v8 |
| Dimension | N/A — evidence pipeline quality |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | pipeline_miss |
| Caught By | Live scan QA — 13 pages analyzed, only /pricing contributed evidence; board URLs still present after Entry 034 fix |
| Status | fixed |

**Root Cause Detail:** Four separate issues found in second QA pass after deploying Entry 034 fix:

1. **Base64 filter in wrong code path.** The filter was added to `isEvidenceEligible()`, which is only called when discovering secondary links from the pricing page markdown. Board URLs discovered via the Firecrawl map flow through `scoredLinks.filter`, a completely separate code path that never calls `isEvidenceEligible`. Filter never ran for the offending URLs.

2. **Base64 filter had broken digit requirement.** `uXjVGArvT-g=` and `uXjVlvQzGAs=` contain no digits. The filter required uppercase AND lowercase AND digits — the digit check caused both IDs to pass even when the filter ran. Mixed case alone is sufficient to identify a generated ID.

3. **Locale-prefixed duplicate pages.** `miro.com/fr/products/roadmaps` — a French translation of an English page. No additional evidence value for English-language pricing and trust scoring.

4. **Educational how-to articles and marketplace listings.** `miro.com/agile/what-is-burnup-chart`, `/customer-journey-map/what-is-service-blueprint` (content marketing pages), and `miro.com/marketplace/aws-cost-calculator` (third-party integration listing). None contain pricing, trust, or enterprise evidence.

**Resolution:** Four changes to `scrape-website/index.ts`:
- Added base64 check directly in `scoredLinks.filter` (fixes wrong code path)
- Removed digit requirement from both the new main-pipeline check and the existing `isEvidenceEligible` check
- Added locale-prefix filter: first path segment matching ISO 639-1 two-letter code + sub-path present → excluded
- Added to `exclusionPatterns`: `/marketplace/[^/]+$` (same principle as existing `/integrations/[^/]+$`), `/what-is-[^/]+`, `/how-to-[^/]+`, `/guide-to-[^/]+`

**Pattern Tag:** `pipeline_miss`, `url-filter`, `random-id-exclusion`, `locale-exclusion`

---

### Entry 034 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | miro.com (observed in live scan) |
| Version | 2026-04-13-model-type-classifier-v8 |
| Dimension | N/A — evidence pipeline quality |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | pipeline_miss |
| Caught By | Live scan QA — pages analyzed count increased from 7 to 13 with noise URLs |
| Status | fixed |

**Root Cause Detail:** Miro's `/app/board/<id>` URLs (e.g., `miro.com/app/board/uXjVG05WR5Q=/`) were being included as "Pages Analyzed." These are live product canvases — no evidence-quality content. The random-slug filter only caught path segments starting with `-`; base64-encoded IDs like `uXjVG05WR5Q=` (mixed-case alphanumeric + trailing `=`) were not caught. An initial fix also added `/\/app\//i` to `exclusionPatterns`, but this was reverted: the `/app/` prefix is not a principled signal — some companies use `/app/` for valid informational pages (download pages, integrations directories, feature landing pages). The over-broad exclusion would cause false positives. The actual pattern to reject is: a path segment that looks like a randomly-generated resource identifier, regardless of what precedes it in the path.

**Resolution:** Extended the random-slug filter in `isEvidenceEligible` (`scrape-website/index.ts`) to catch base64-style IDs: last path segment ≥8 chars, matches `[A-Za-z0-9_-]+=*`, requires mixed case AND digits. This is path-structure-agnostic — catches `uXjVG05WR5Q=` in `/app/board/`, `/file/`, `/workspace/`, or any other path prefix without hardcoding product-specific conventions.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `random-id-exclusion`

---

### Entry 033 — April 13, 2026

| Field | Value |
|-------|-------|
| Company | All — new feature |
| Version | Pre-deploy — implemented April 13, 2026 |
| Dimension | N/A — metadata, not a scoring dimension |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | other — new feature addition |
| Caught By | Feature request — model-type-classifier-plan.md |
| Status | implemented |

**Root Cause Detail:** Added deterministic model-type classifier that runs post-evidence-ingestion, pre-scoring. Classifies pricing model as access-based, consumption-based, outcome-based, or hybrid using regex + keyword scoring against /pricing page content — no LLM call. Outputs `model_classification` metadata on every scan with L1 type, L2 variant (e.g., `per-seat`, `credit-pool`, `access+consumption`), confidence score, source tag (`auto`/`unclassified`/`gated`), and `enterprise_pricing` flag. Handles edge cases: no /pricing page → `unclassified`; 100% Contact Sales → `gated`; mixed public + gated tiers → classify from public, tag enterprise as `gated`.

**Resolution:** New files: `supabase/functions/analyze-company/classifyModelType.ts` (classifier module), `src/components/ModelClassificationCard.tsx` (UI card). Modified: `analyze-company/index.ts` (integration), `src/types/rubric.ts` (types), `src/lib/api/scraper.ts` (API layer), `src/hooks/useScan.ts` (state), `src/pages/Index.tsx` + `Results.tsx` (plumbing + display). No scoring logic, gate logic, or 3-pass voting modified. All 33 existing tests pass.

**Pattern Tag:** `new-feature`, `model-type-classifier`, `metadata-only`

---

### Entry 032 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | Beautiful.ai (observed), general |
| Version | Current — observed April 10, 2026 via report 7 |
| Dimension | D7 Overages and risk allocation |
| Score | Unaffected |
| Root Cause | contamination — Machine-Extracted schema fields surfacing in `observed` array, not just `sourceEvidence` |
| Caught By | Beautiful.ai report 7 review |
| Status | Open — related to Entry 026 |

**Observation:** D7 renders under "Observations:" (bullet format) instead of "Evidence:" (card format), showing `"- Overage Policy : N/A"` and `"Refund Policy : ..."` directly from the LLM's `observed` array. The `normalizeSourceEvidence` filter blocks these from `sourceEvidence` but the LLM is also writing them into `observed` entries as `url: "schema text"` pairs, which bypasses all filtering. The PDF/UI then renders these raw `observed` entries when `sourceEvidence` is sparse. This is Entry 026 manifesting in a second location — the fix needs to target the `observed` array in addition to `sourceEvidence`.

**Pattern Tag:** `synthetic-evidence`, `observed-array-bypass`, `entry-026-related`

---

### Entry 031 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | Beautiful.ai (observed), general |
| Version | Current — observed April 10, 2026 via report 7 |
| Dimension | D3 Buyer alignment, D8 Safety rails |
| Score | Unaffected |
| Root Cause | contamination — "features" schema field not in synthetic evidence blocklist |
| Caught By | Beautiful.ai report 7 review |
| Status | Fixed — April 11, 2026 |

**Observation:** `"- Features : Everything in Team plus...; Dedicated onboarding..."` appears in D3 and D8 evidence. "features" is not in the synthetic field blocklist regex. The Machine-Extracted plan section generates `- **Features**: ...` which the LLM cites as `- Features : ...`. Fix: add `features?` to both filter regex instances in `normalizeSourceEvidence`.

**Pattern Tag:** `synthetic-evidence`, `filter-gap`

---

### Entry 030 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | Beautiful.ai (observed), general |
| Version | Current — observed April 10, 2026 via report 7 |
| Dimension | D1 Product north star, D2 ICP job clarity |
| Score | Unaffected |
| Root Cause | contamination — curly/smart quote variants bypassing snippet dedup |
| Caught By | Beautiful.ai report 7 review |
| Status | Fixed — April 11, 2026 |

**Observation:** D1 evidence 1 and 4 are the same quote: `""We reduced time by 75%..."` vs `"We reduced time by 75%..."`. D2 evidence 2 and 4 are identical. The dedup normalization hashes the snippet after lowercase/trim/slice(120) but does NOT strip leading/trailing curly quote characters (`"` `"`). So `""quote"` and `"quote"` produce different keys and both pass. Fix: add `.replace(/^["""'']+|["""'']+$/g, '')` to the dedup key normalization before slicing.

**Pattern Tag:** `evidence-dedup`, `unicode-quote-variant`

---

### Entry 029 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (observed), general |
| Version | Current — observed April 10, 2026 via report 14 |
| Dimension | D4 Value unit |
| Score | Unaffected |
| Root Cause | contamination — sub-minimum-length snippet from Machine-Extracted features list |
| Caught By | Report 14 review |
| Status | Fixed — April 11, 2026 |

**Observation:** D4 Value unit evidence 4: `"- additional minutes usage"` (24 chars) from `/pricing?price.platform=agents_platform`. This is a bullet fragment from the Machine-Extracted plan features list, likely `- **Features**: ...; additional minutes usage`. It passes the field-name filter because "additional" isn't a blocked schema field, but it's contextless and adds no evidential value. Fix: add minimum snippet length (~25 chars) to `normalizeSourceEvidence`. Deferred — score unaffected and ElevenLabs validated at 12/16.

**Pattern Tag:** `synthetic-evidence`, `thin-fragment`, `evidence-quality`

---

### Entry 028 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (observed), general |
| Version | Current — observed across reports 11–14 |
| Dimension | D8 Safety rails and trust surfaces |
| Score | Unaffected |
| Root Cause | contamination — "monitor" keyword false-positive in safetyRails evidence bucket |
| Caught By | Report 14 review |
| Status | Open — cosmetic, deferred |

**Observation:** D8 Safety rails evidence consistently includes `"Configure, deploy and monitor conversational agents."` from elevenlabs.io homepage. Product marketing copy being cited as a trust surface because "monitor" matches the safetyRails evidence bucket keyword. Fix: tighten the safetyRails keyword to require "monitor" adjacent to usage/spend/billing context words, not standalone. Deferred — score unaffected and ElevenLabs validated at 12/16.

**Pattern Tag:** `wrong-dimension-evidence`, `keyword-false-positive`

---

### Entry 027 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs |
| Version | Current — observed April 10, 2026 via report 13 review |
| Dimension | D2 ICP and job clarity |
| Score | D2: 2/2 (report 11) → 1/2 (report 13) — regression |
| Pages Analyzed | 15 — correct |
| Root Cause | calibration — J5 non-fit and J3 success state subtests structurally too strict for B2B SaaS |
| Caught By | ElevenLabs report 13 review, April 10, 2026 |
| Status | Addressed — D2 J3 and J5 updated in calibration pass (April 10, 2026) |

**Observation:** D2 scored 2/2 in report 11 and 1/2 in report 13. Rationale for 1/2 cited: "lacks explicit non-fit criteria or detailed success states for these jobs." Both failures trace to rubric subtests that most B2B SaaS companies structurally cannot pass from public evidence:

- **J5 Non-fit boundaries** — requires explicit "who we are NOT for" statements (`non_fit_criteria[]`). Almost no B2B SaaS company publishes these. ElevenLabs clearly targets developers building speech/voice applications across defined verticals, which implicitly excludes consumer use and non-audio applications, but this is inferred from ICP, not stated as exclusion.
- **J3 Success state** — requires `jtbd[0].success_state` with measurable constraints. ElevenLabs documents job scope via named platforms (ElevenCreative, ElevenAgents) with target users and I/O requirements, but without publishing a universal quantified success metric.

Combined with D4 variance (Entry 023), two dimensions are now volatile, causing ±12% score swings (1-2 points each on a 16-point scale) across reruns on identical input. This makes the score unreliable as a benchmark.

**Fix:** D2 J3 updated with Tier B path (named platforms + documented I/O + constraints). D2 J5 updated with Tier C path (implicit scope via vertical ICP + multiple jtbd roles). See calibration commit April 10, 2026.

**Pattern Tag:** `j5-non-fit-too-strict`, `j3-success-state-too-strict`, `lm-scoring-variance`, `calibration-needed`

---

### Entry 026 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (observed), general (all companies) |
| Version | Current — observed April 10, 2026 via report 13 review |
| Dimension | D7 Overages and risk allocation (observed); potentially all dimensions |
| Score | N/A — credibility/accuracy issue in rationale text |
| Pages Analyzed | 15 — correct |
| Root Cause | contamination — Machine-Extracted schema values leaking into rationale narrative |
| Caught By | ElevenLabs report 13 review, April 10, 2026 |
| Status | Open — harder to fix than evidence snippet contamination |

**Observation:** The LLM references Machine-Extracted schema values in its rationale text, not just in sourceEvidence snippets. Example from D7 report 13: "the pricing pages consistently list 'Overage Policy : N/A' for all tiers". The post-processing filter in `normalizeSourceEvidence` (Entry 024 fix) removes these from `sourceEvidence` arrays, but cannot scrub them from the free-text `rationale` string.

The root issue: the LLM treats the `## Structured Pricing Data (Machine-Extracted — NOT direct quotes)` section as if it is actual page copy, even in narrative output. The prompt at line 66 explicitly says not to cite this section as direct quotes, but Gemini 2.5 Flash incorporates these fields into rationale reasoning. This is distinct from Entry 024 — Entry 024 caught the snippet-level leakage; this entry tracks the narrative-level leakage.

**Potential fixes (not yet implemented):**
1. Rename the Machine-Extracted section header and fields to make them visually non-quotable — e.g., use `[CONTEXT ONLY — DO NOT CITE]` prefix on all fields, or emit as a JSON block rather than markdown prose.
2. Add a post-processing regex pass on `rationale` strings to detect and flag Machine-Extracted field patterns appearing in narrative context.
3. Move Machine-Extracted data to a separate, lower-salience position in the scrape markdown (after all real page content).

**Pattern Tag:** `synthetic-evidence`, `machine-extracted-narrative-bleed`, `rationale-contamination`

---

### Entry 025 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (observed), general (all companies) |
| Version | Current — observed April 10, 2026 via report 13 review |
| Dimension | D4 Value unit |
| Score | N/A — evidence quality issue |
| Pages Analyzed | 15 — correct |
| Root Cause | contamination — "price" field missing from synthetic schema field filter blocklist |
| Caught By | ElevenLabs report 13 review, April 10, 2026 |
| Status | Fixed — "price" added to both filter regex instances in normalizeSourceEvidence |

**Observation:** `"- Price : $0 per minute"` and `"- Price : $0.10 per minute"` appeared in D4 Value unit sourceEvidence in report 13. The Machine-Extracted plan section generates `- **Price**: $X per minute` fields for each pricing tier. The LLM strips the `**` markdown formatting and cites these as direct page quotes in sourceEvidence. "price" was not in the blocklist added in Entry 024, so the filter failed to catch it.

**Fix:** Added "price" to both regex instances in `normalizeSourceEvidence` (analyze-company/index.ts lines ~2185 and ~2222). The regex pattern `billing|price|limits?` now catches `- Price : $X` citations before they enter the output. Committed as `fix: add 'price' to synthetic schema field filter`.

**Pattern Tag:** `synthetic-evidence`, `machine-extracted-citation`, `filter-blocklist-incomplete`

---

### Entry 024 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (observed), general (all companies) |
| Version | Current — observed April 10, 2026 via report 11 review |
| Dimension | D4 Value unit, D6 Pools & Packaging, D7 Overages & Risk (primarily) |
| Score | Scores unaffected — credibility issue only |
| Pages Analyzed | 15 — correct |
| Root Cause | contamination — LLM citing Machine-Extracted schema fields as direct page quotes |
| Caught By | Full report 11 review, April 10, 2026 |
| Status | Fixed — post-processing filter added to normalizeSourceEvidence |

**Observation:** Multiple sourceEvidence snippets were structured schema fields, not actual page quotes:
- D4: `"Value Unit : credits"` — from `**Value Unit**: credits` in the Machine-Extracted section
- D4/D7: `"Refund Policy : Not explicitly stated"` — LLM inference cited as page evidence (**worst case**)
- D4: `"- Billing : per minute"` — plan schema field
- D6: `"- Limits : 10k credits per month; 3 Projects in Studio"` — plan schema field
- D7: `"- Overage Policy : Not applicable"` — plan schema field

The scraper injects a `## Structured Pricing Data (Machine-Extracted — NOT direct quotes)` section into the markdown passed to the analyzer. The prompt at line 66 of analyze-company explicitly says not to cite these as direct quotes, but Gemini 2.5 Flash ignores this instruction. "Refund Policy : Not explicitly stated" is particularly damaging to report credibility — it cites a LLM inference as a source URL quote.

**Fix:** Post-processing filter in `normalizeSourceEvidence` (analyze-company/index.ts) that rejects snippets matching Machine-Extracted schema field patterns before they can enter the output. Two checks:
1. `not explicitly stated` anywhere in snippet (always a LLM inference artifact)
2. Snippet starts with `- ` or bare field name followed by `:` matching known schema fields (value unit, refund policy, billing, limits, overage policy, etc.)

**Pattern Tag:** `synthetic-evidence`, `machine-extracted-citation`, `evidence-quality`

---

### Entry 023 — April 5, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs |
| Version | Current — observed April 5, 2026 |
| Dimension | D4 Value unit |
| Score | D4: 2/2 (report 7) → 1/2 (report 9) — regression |
| Pages Analyzed | 15 — correct page set including 4 pricing variants |
| Root Cause | calibration — V6 Auditability and V2 Metering determinism subtests too strict for consumption-based AI products; run-to-run LLM variance on V1 boundary |
| Caught By | ElevenLabs rerun after Entry 021 fixes, April 5, 2026 |
| Status | Open — flagged for calibration design review. Not patched to avoid overcorrecting on other companies. |

**Observation:** D4 scored 1/2 in report 9 after previously scoring 2/2 in report 7. ElevenLabs publishes explicit per-unit pricing across all 4 platforms (credits/character, $/minute, $/generation), which is objectively transparent. The 1/2 is driven by rubric subtest failures:

- **V2 Metering determinism** — requires `rounding_rule` and `attribution_level` to be publicly documented. ElevenLabs does not publish rounding rules → V2 fails.
- **V6 Auditability** — requires `audit_surface = dashboard_breakdown OR export_logs`. ElevenLabs has in-product credit dashboard (dashboard_total only) → V6 fails.

With at most 4 of 6 subtests passing, the point map (5-6 → score 2) caps the score at 1.

**Why 2/2 appeared in report 7:** LLM non-determinism. The previous run was more lenient on V1 (Unit definition clarity) interpretation, pushing to 5 passing subtests. This is within expected LLM variance.

**Calibration question (open):** Should V6 pass when in-product usage tracking exists but only at dashboard-total granularity? For AI-native consumption products, per-endpoint/per-model breakdown is rarely public. If V6 requires export_logs or dashboard_breakdown, most consumption-based AI companies will structurally fail it regardless of pricing transparency. This warrants a dedicated calibration session before patching.

**Pattern Tag:** `v6-auditability-too-strict`, `lm-scoring-variance`, `calibration-needed`

---

### Entry 022 — April 5, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (primary), general (all companies) |
| Version | Current — observed April 5, 2026 |
| Dimension | D5 Cost driver mapping (rationale text); all dimensions (evidence repetition) |
| Score | N/A — prompt and dedup issues |
| Pages Analyzed | N/A |
| Root Cause | contamination — p50/p95 field names in D5 schema; near-duplicate evidence passing dedup |
| Caught By | ElevenLabs report 9 review, April 5, 2026 |
| Status | ✅ Confirmed (April 5, 2026) — p50/p95 gone from D5 rationale; near-duplicate evidence reduced. D4 returned to 2/2 (LLM variance; Entry 023 remains open for calibration). |

**Failure 1 — p50/p95 still appearing in D5 Cost Driver rationale after post-processing fix**

Entry 021 removed the hardcoded `'Driver formulas and p50/p95 workflow cost estimates remain non-public.'` string from post-processing. However, the LLM was still generating p50/p95 language in its rationale because the D5 schema itself defined fields named `p50_per_value_unit`, `p95_per_value_unit`, `cost_per_value_unit_p50`, and `cost_per_value_unit_p95`. The LLM sees these field names and incorporates the concept into its reasoning even when C4 explicitly says p50/p95 is not required. Fix: renamed all four fields to `typical_per_value_unit`, `high_per_value_unit`, `cost_per_value_unit_typical`, and `cost_per_value_unit_high`. Insider prompts 3 and 4 updated to match.

**Failure 2 — Near-duplicate evidence ("10k credits per month" vs "10k credits per month (Free tier)")**

The snippet dedup from Entry 021 hashed on `snippet.toLowerCase().slice(0, 120)`. Short parenthetical tier annotations like `(Free tier)`, `(Business)`, `(Creator plan)` made otherwise identical quotes hash to different keys, both surviving into the evidence set. Fix: added `.replace(/\s*\([^)]{0,40}\)/g, '')` before hashing to strip short parentheticals. Ensures tier-label variants of the same quote count as one evidence item, preserving the first-occurrence URL.

**Pattern Tag:** `schema-fieldname-prompt-bleed`, `near-duplicate-evidence-parenthetical`

---

### Entry 021 — April 4, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (primary), general (all companies) |
| Version | Current — observed April 4, 2026 |
| Dimension | All — display; D5 Cost Driver Mapping — uncertainty label |
| Score | N/A — display and label bugs, not scoring bugs |
| Pages Analyzed | N/A |
| Root Cause | contamination — three UI components truncating evidence URLs; one hardcoded uncertainty string contradicting prompt |
| Caught By | Report review after ElevenLabs rerun, April 4, 2026 |
| Status | ✅ Confirmed (April 5, 2026) — query-param URLs display correctly in all three components |

**Failure 1 — Query-param URLs stripped in three UI display components**

`formatUrl()` helper existed identically in three components — `EvidenceSourcesPanel.tsx`, `DimensionCard.tsx`, `ObservabilityStrip.tsx` — building display URLs as `hostname + pathname` only, omitting `u.search`. For ElevenLabs, all four platform pricing pages (`/pricing?price.platform=agents_platform` etc.) displayed as identical `elevenlabs.io/pricing` entries in Pages Analyzed, dimension evidence citations, and the "What We Used" panel. `EvidenceSourcesPanel.tsx` was fixed in commit `42d9d77`; the other two were missed. Fixed in `cd7f708` by adding `u.search` to all three instances.

**Failure 2 — Same evidence quote appearing twice in same dimension (evidence 2 = evidence 4)**

`normalizeSourceEvidence()` in `analyze-company` deduped by `url|snippet` composite key. When the same quote appeared on both `elevenlabs.io/pricing` and `elevenlabs.io/pricing?price.platform=agents_platform`, they produced different composite keys and both passed through — surfacing as duplicate evidence items under the same dimension. Fixed in `cd7f708`: dedup key changed to `snippet.toLowerCase().trim().slice(0, 120)`. First-occurrence URL is preserved; duplicate snippet is dropped regardless of source URL.

**Failure 3 — "p50/p95 workflow cost estimates remain non-public" in D5 uncertainty reasons**

The Cost Driver Mapping post-processing block in `analyze-company` hardcoded this string as a forced uncertainty reason whenever the score was floored from 0→1. The C4 subtest in the scoring prompt explicitly states p50/p95 is NOT required (updated in ANALYSIS_VERSION v7). The hardcoded string contradicted the prompt and confused users about why confidence wasn't higher. Fixed in `cd7f708`: replaced with "per-workflow cost breakdowns are not publicly documented."

**Pattern Tag:** `formaturl-search-omission`, `evidence-snippet-dedup`, `hardcoded-uncertainty-contradicts-prompt`

---

### Entry 020 — April 4, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs |
| Version | Current — observed April 4, 2026 |
| Dimension | All — URL selection |
| Score | N/A — URL dedup fix |
| Pages Analyzed | 4× identical `elevenlabs.io/pricing` after revert of `parsed.search=''` |
| Root Cause | pipeline_miss — normaliseForDedup not normalizing trailing slash or http protocol |
| Caught By | ElevenLabs rerun after Entry 019 revert, April 4, 2026 |
| Status | ✅ Fixed (commit e225afd) — trailing slash strip + http→https normalization added to normaliseForDedup(); final Map-based dedup pass added before allUrlsToScrape construction |

**Root cause:** `normaliseForDedup()` stripped www and locale prefixes but not trailing slashes or http→https. Firecrawl map returning both `/pricing` and `/pricing/` (and/or `http://elevenlabs.io/pricing`) produced different normalized keys, all scored +1650, and all were selected. Combined with the canonical probe, 4 identical slots resulted.

**Fix:** Added `if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/$/, '')` and `parsed.protocol = 'https:'` to `normaliseForDedup()`. Also added a final `Map`-based dedup pass applied to `priorityLinks` before building `allUrlsToScrape` as a belt-and-suspenders guard.

**Pattern Tag:** `trailing-slash-dedup-gap`, `protocol-normalization-gap`

---

### Entry 019 — April 4, 2026

| Field | Value |
|-------|-------|
| Companies | ElevenLabs (query param dedup — misdiagnosed then corrected), Beautiful.ai (help subdomain contamination — fixed) |
| Version | Current — observed April 4, 2026 post-category-aware-scoring reruns |
| Dimension | All — slot contamination affects evidence quality across dimensions |
| Score | ElevenLabs 12/16 (75%); Beautiful.ai 12/16 (75%) |
| Pages Analyzed | ElevenLabs: /pricing platform variants should appear 4× (correct behavior); Beautiful.ai: 6 of 13 slots consumed by generic help articles (bug) |
| Root Cause | pipeline_miss (Beautiful.ai) — help subdomain boost too broad; misdiagnosis (ElevenLabs) — query-param pricing variants are content-differentiating, not duplicates |
| Caught By | Report validation review after category-aware scoring reruns, April 4, 2026; regression caught on rerun |
| Status | ✅ Beautiful.ai fix deployed (April 4, 2026). ✅ ElevenLabs `parsed.search=''` reverted — query params preserved. |

**Overview:** Post-rerun validation revealed one genuine bug (Beautiful.ai help subdomain over-boosting) and one misdiagnosis (ElevenLabs query-param pricing variants).

---

**Failure 1 — ElevenLabs query-param pricing variants: misdiagnosis and revert**

Initial diagnosis: `/pricing` appearing 4× was a dedup bug. Proposed fix: `parsed.search = ''` in `normaliseForDedup()`.

**This was wrong.** ElevenLabs uses query params to show genuinely different pricing content per product:
- `elevenlabs.io/pricing` — default
- `elevenlabs.io/pricing?price.platform=agents_platform`
- `elevenlabs.io/pricing?price.platform=api`
- `elevenlabs.io/pricing?price.platform=creative_platform`

Each variant contains a different product's credit rates, tier limits, and overage behavior. Stripping query params collapsed all 4 to one slot, losing 3 pages of D5/D6/D7 evidence. The `parsed.search = ''` change was reverted. Query params are intentionally preserved in `normaliseForDedup()` — products legitimately use them for content-differentiating sub-pages.

---

**Failure 2 — Generic Beautiful.ai help articles consuming evidence slots (/hc subpath boost too broad)**

The subdomain scoring boost in `scoreUrl()` included `/hc` in the billing-keyword regex:
`/\/(plans-and-credits|credits|pricing|billing|usage|subscription|refund|cancel|hc)\b/i`

Since Zendesk help centers use paths like `support.beautiful.ai/hc/en-us/articles/12345-how-to-present-slides`, the regex matched `/hc` anywhere in the path and gave every article +700 (same boost as billing docs). Result: 6 of 13 Beautiful.ai evidence slots were consumed by help articles about slide presentations, theme changes, and export settings — content with zero D5/D6/D7/D8 scoring value.

**Fix:** Two-part change to `scoreUrl()` subdomain block:

1. Removed `/hc` from the billing-keyword boost list — it was the wrong heuristic.
2. Added a **two-tier penalty** for generic deep help articles: paths matching `/hc/.+` or `/articles?/.+` with no billing keywords in the path now receive -200. Examples:
   - `support.beautiful.ai/hc/en-us/articles/how-to-present` → +100 (subdomain) - 200 (generic article) = -100
   - `support.beautiful.ai/hc/en-us/articles/manage-billing` → +100 + 700 (billing keyword) = +800
   - `support.beautiful.ai/hc` (root) → +100 (no penalty, no billing boost)

Rerun confirmed Beautiful.ai Pages Analyzed went from 6 generic help slots → 0. Freed slots filled by `/security`, `/roi-calculator`, `/enterprise`, `/enterprise-plan`.

**Pattern Tag:** `help-subdomain-boost-too-broad`, `evidence-slot-contamination`, `query-param-content-differentiating`

---

### Entry 018 — April 4, 2026

| Field | Value |
|-------|-------|
| Company | Clay (clay.com) |
| Version | Current — observed April 4, 2026 |
| Dimension | All — evidence quality affected across every dimension |
| Score | Not yet re-run post-fix |
| Pages Analyzed | 15 shown in UI — majority "Not Found" |
| Root Cause | pipeline_miss — three URL selection failures causing wasted scrape slots and report noise |
| Caught By | Manual report review (screenshot), April 4, 2026 |
| Status | Open. Three sub-issues identified. Fix planned for scrape-website. |

**Overview:** A Clay.com run showed 15 URLs in "Pages Analyzed" with the majority returning "Not Found." This reveals three distinct failure classes in the URL selection and filtering layer, all occurring before evidence reaches the LLM.

---

**Failure 1a-i — Login-wall pages consuming evidence slots (pre-existing, Entry 015B)**

Paths like `/subscription` and `/usage` return HTTP 200 but serve only a sign-in page ("Sign In | Clay"). The scraper treats the request as successful, returns the login page HTML, and the slot is counted as analyzed — but the evidence content is zero. These paths are consistently gated behind authentication across all SaaS companies.

Known gated paths: `/subscription`, `/usage`, `/account`, `/accounts`, `/dashboard`, `/settings`, `/login`, `/signin`, `/sign-in`, `/sign-up`, `/signup`, `/register`, `/app`, `/home` (when path is exactly `/home`).

**Fix:** Add gated path blocklist to `isEvidenceEligible()` — reject any URL whose path exactly matches or starts with these segments.

---

**Failure 1a-ii — 404 Not Found pages appearing in Pages Analyzed**

The canonical probe step force-adds `/pricing`, `/plans`, `/billing` regardless of whether those paths exist on the domain. When a company doesn't use those URL patterns (Clay uses `/pricing-calculator` not `/plans`), the probed URLs return 404. These 404 pages appear in the "Pages Analyzed" list in the UI and may be included in the evidence payload sent to the LLM — adding noise to the analysis ("Not Found" appearing in evidence context).

Clay screenshot: `www.clay.com/plans/` (Not Found), `www.clay.com/billing/` (Not Found), `clay.com/billing/` (Not Found), `clay.com/plans/` (Not Found), `clay.com/features/` (Not Found), `clay.com/product/` (Not Found), `clay.com/solutions/` (Not Found), `clay.com/platform/` (Not Found), `clay.com/subscription/` (Not Found), `clay.com/usage/` (Not Found).

**Fix:** After scraping, filter pages whose scraped content is null, empty, or matches a "Not Found" pattern before adding to the evidence payload and Pages Analyzed display list.

---

**Failure 1a-iii — www vs. non-www duplicate canonical probing**

The canonical probe step generates URLs using either the www-prefix or bare domain based on a heuristic. When the heuristic is ambiguous, both `www.clay.com/plans/` (item 6) and `clay.com/plans/` (item 10) are probed independently — two requests, two 404s, consuming two scrape slots for the same non-existent page.

**Fix:** Before adding canonical probes to the scrape queue, deduplicate www vs. non-www variants of the same path. If both would be probed, pick one (prefer www if any discovered URL uses www, otherwise bare domain) and discard the other.

**Pattern Tag:** `login-wall-slot-consumption`, `404-in-pages-analyzed`, `www-nonwww-duplicate-probe`, `canonical-probe-noise`

---

### Entry 017 — April 4, 2026

| Field | Value |
|-------|-------|
| Companies | General — affects all companies with interactive pricing pages |
| Version | Current — not yet fixed |
| Dimension | D5 Cost Driver Mapping, D7 Overages & Risk, D8 Safety Rails & Trust (primary) |
| Score | Undetermined — evidence gap, not yet quantified |
| Pages Analyzed | N/A — architectural gap identified in scraping layer |
| Root Cause | pipeline_miss — two classes of interactive pricing page content never captured |
| Caught By | Architecture review, April 4, 2026 |
| Status | Open. Two new failure classes identified. Not yet logged as open issues. |

**Failure A — Tooltip content on pricing pages never captured**

Pricing pages frequently use hover-triggered tooltips to explain pricing terms inline (e.g., "What counts as an active seat?", "How is API usage measured?", credit unit definitions, overage behavior explanations). These tooltips are directly relevant to D5 (Cost Driver Mapping), D7 (Overages & Risk), and D8 (Safety Rails).

Firecrawl performs a JavaScript-rendered scrape with a `waitFor` timer. It does not simulate hover events. Tooltip content is CSS/JS hidden (`display:none`, `visibility:hidden`, or opacity transitions) and never appears in the scraped markdown regardless of wait time. This content is structurally unreachable by the current pipeline.

**Fix needed:** Use Firecrawl's `actions` API to simulate hover/click on tooltip trigger elements on pricing pages before snapshotting. Alternatively, extract tooltip content directly from the raw HTML (many tooltip libraries embed the full text in `data-tooltip`, `title`, `aria-label`, or hidden `<div>` siblings) without requiring interaction simulation.

---

**Failure B — Collapsed FAQ accordions on pricing pages not actively expanded**

Entry 015D addressed the `waitFor` timing regression (restoring 2500ms for pricing pages). However, many pricing page FAQ sections use click-to-expand accordions — the content is hidden until a user clicks the question. Firecrawl with a timer waits for auto-rendered JS but does not click collapsed accordion items. If accordions do not auto-expand on page load, their content is absent from the scraped markdown even at 2500ms.

FAQ answers on pricing pages frequently contain the most precise documentation of:
- Credit and token usage definitions (D5)
- Overage rates and billing behavior (D7)
- Spend caps, alerts, and limit behaviors (D8)
- Cancellation and refund policies (D8)

Additionally, FAQ answers often reference external documentation pages (help center articles, billing guides, usage calculators). Fix 1's secondary pass already extracts `<a href>` links from scraped pages and queues high-priority ones — but only if the FAQ content itself was captured. If the accordion was never expanded, those links are never seen.

**Fix needed:** On pricing pages, use Firecrawl's `actions` API to click all collapsed accordion/details elements before snapshotting. Detect accordion patterns via `<details>`, `<summary>`, common accordion class names (`accordion`, `faq`, `collapsible`), or `aria-expanded="false"` attributes. This is distinct from the waitFor timing fix — it requires active interaction, not passive waiting.

**Pattern Tag:** `tooltip-content-miss`, `accordion-active-expansion-miss`, `interactive-pricing-page-gap`

---

### Entry 016 — April 4, 2026

| Field | Value |
|-------|-------|
| Companies | Beautiful.ai, Linear (seat-based); ElevenLabs, Deepgram, OpenAI (consumption); Notion, Cursor (hybrid) |
| Version | ANALYSIS_VERSION bump: `2026-04-03-category-aware-scoring-v7` |
| Dimension | D5 Cost Driver Mapping, D6 Pools & Packaging, D7 Overages & Risk, D8 Safety Rails & Trust (primary); all categories affected |
| Score | Pre/post not yet validated — engine deployed, reruns pending |
| Pages Analyzed | N/A — calibration + engine change session |
| Root Cause | contamination — scoring engine applied consumption-centric subtests to seat-based products, causing structural misfires on D5/D6/D7/D8 |
| Caught By | Calibration audit (April 1–4, 2026) — cross-company pattern review across Beautiful.ai, Linear, Notion (seat); ElevenLabs, Deepgram (consumption); Bolt, Replit, Vercel (hybrid) |
| Status | Engine deployed. Reruns needed: Beautiful.ai, Linear (seat-based); ElevenLabs, Deepgram (consumption); Notion, Cursor (hybrid) to validate corrections. |

**Root cause analysis:**

The scoring prompt evaluated all companies with a consumption-centric subtest battery. Seat-based products were penalized for missing artifacts that structurally cannot exist: p50/p95 cost variance estimates (C4), spike triggers and mitigations (C5), inference-related cost drivers (C1), and overage behavior documentation (D7). This caused systematic 1/2 scores on D5, D6, D7, and D8 for seat-based companies regardless of what was publicly available.

**Engine changes deployed (ANALYSIS_VERSION: 2026-04-03-category-aware-scoring-v7):**

1. **PRICING MODEL CATEGORY AWARENESS block** added to `RUBRIC_SCORING_PROMPT`:
   - D5 seat-based: C1 passes on ≥1 driver with published per-seat price; C4 passes on per-seat price published (p50/p95 not required); C5 auto-pass (seats don't spike); C6 gate exception
   - D6 seat-based: P3 (pool rules) override — pool features not applicable
   - D7 seat-based: Overage gate exception — missing `overage_behavior` = "not applicable" when no `overage_enabled` tiers exist
   - D8 seat-based: T1 passes on admin controls for user/access management; T2 passes on admin subscription/billing visibility; T3 passes on role-based access controls; T6 passes on documented seat limits or fair-use policy; T2 gate exception

2. **C4 subtest replaced (all categories):** p50/p95 cost estimates removed. New subtest: cost calculability from published information (consumption = per-unit rate; seat = per-seat price; hybrid = both).

3. **C5 subtest replaced (all categories):** Spike triggers/mitigations removed. New subtest: cost boundary behavior (consumption = overage/hard-stop documented; seat = auto-pass; hybrid = consumption boundary documented).

4. **D5 gate change:** `If C4 fails: cap score at 1` removed. C6 gate exception added for seat-based.

**Background processing deployed (analyze-company):**

Fresh scans for large sites (GitHub, Cursor) were timing out the edge function before analysis completed. Fix:
- `EdgeRuntime.waitUntil` keeps edge function alive post-response
- Fresh scans return 202 immediately; analysis runs in background IIFE
- Pending marker inserted into `scan_results` before analysis starts (10-min TTL)
- `pollOnly` flag: client polls for result without sending pages payload
- Error marker written to cache on background failure
- Client (`scraper.ts`) polls every 4s up to 2 min

**Scrape-website URL pattern updates:**

- `/hc`, `/refund`, `/cancel`, `/roi` added to `priorityPatterns` and `highIntentPaths`
- `fullContentPatterns` updated for help center, roi, calculator, refund paths
- HIGH-VALUE CONTENT BOOST added for refund/cancel and roi/calculator paths
- `/hc` added to subdomain boost path list

**Pattern Tag:** `category-misfire`, `seat-based-contamination`, `consumption-centric-prompt`, `background-processing-timeout`, `url-pattern-miss`

---

### Entry 015 — March 25, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (elevenlabs.io) |
| Version | V3 — post-Bundle 2 rerun (March 24, 2026) |
| Dimension | D7 Overages & Risk, D8 Safety Rails & Trust Surfaces (primary); D1 Product North Star (secondary) |
| Score | 12/16 (75%) — no change from V2 (March 23). Bundle 2 did not recover D7/D8. |
| Pages Analyzed | 7 — same as V2 |
| Root Cause | pipeline_miss — four distinct evidence collection failures; three new failure classes identified |
| Caught By | Manual report review + screenshot analysis (March 24) |
| Status | Open. Four new failure patterns identified. None fixed. |

**Score comparison:**

| Dimension | Mar 6 (V1) | Mar 23 (V2) | Mar 24 (V3) | Status |
|---|---|---|---|---|
| D1 Product North Star | 2/2 | 1/2 | 1/2 | Not recovered |
| D2 ICP & Job Clarity | 2/2 | 2/2 | 2/2 | Stable ✓ |
| D3 Buyer & Budget | 2/2 | 2/2 | 2/2 | Stable ✓ |
| D4 Value Unit | 2/2 | 2/2 | 2/2 | Stable ✓ |
| D5 Cost Driver Mapping | 1/2 | 1/2 | 1/2 | Stable |
| D6 Pools & Packaging | 2/2 | 2/2 | 2/2 | Stable ✓ |
| D7 Overages & Risk | 2/2 | 1/2 | 1/2 | Not recovered |
| D8 Safety Rails & Trust | 2/2 | 1/2 | 1/2 | Not recovered |

**Bundle 2 assessment:** Bundle 2 added `/trust`, `/security`, `/compliance` as high-intent path probes on `elevenlabs.io`. These paths do not exist on the main domain — ElevenLabs hosts its trust/compliance content at `compliance.elevenlabs.io` (a separate subdomain). Path probing cannot reach subdomain-hosted trust centers. Bundle 2 was the correct fix class but the wrong form.

---

**Failure A — Trust center hosted on separate subdomain**

ElevenLabs' compliance and trust center lives at `compliance.elevenlabs.io`, not at `elevenlabs.io/compliance`. The canonical path probe step (and Bundle 2's highIntentPaths additions) only probe paths on the main registered domain. Subdomain trust centers are never discovered by path probing or by Firecrawl's `/map` endpoint (which returns same-domain URLs only by default).

This is a distinct failure class from missing paths. Companies increasingly host trust content at `compliance.*`, `trust.*`, or `security.*` subdomains (e.g., `compliance.elevenlabs.io`, `trust.segment.com`, `security.dropbox.com`). None of these are reachable by current pipeline.

**Fix needed:** In the canonical path probe step, also probe `compliance.{domain}`, `trust.{domain}`, and `security.{domain}` as subdomain root URLs alongside path variants. If the subdomain root returns non-empty content, add it to the evidence queue at the same priority as `/compliance` path.

---

**Failure B — Login-wall pages consuming evidence slots**

`elevenlabs.io/subscription` and `elevenlabs.io/usage` both scraped successfully (HTTP 200) but returned only the "Sign In | ElevenLabs" login page — zero evidence content. These consumed 2 of 7 slots (28% of evidence budget) with no return.

Fix 2 (pre-scoring validation) applies a confidence penalty for pages with unresolved/empty content, but login-wall pages are not empty — they return a complete HTML page. The login wall is invisible to the current content validation checks.

This pattern is consistent across SaaS: `/subscription`, `/usage`, `/account`, `/dashboard`, `/settings` are uniformly behind authentication for any company that uses these URL patterns. They should never enter the queue.

**Fix needed:** Add a **gated path blocklist** to `isEvidenceEligible()`: reject any URL whose path exactly matches or starts with `/subscription`, `/usage`, `/account`, `/dashboard`, `/settings`, `/login`, `/signin`, `/sign-in`, `/register`. These are in-app paths with no public evidence surface.

---

**Failure C — Tab-partitioned pricing page with query-param variants not reached**

The ElevenLabs pricing page uses JavaScript tabs to partition pricing by platform:
- `elevenlabs.io/pricing?price.platform=creative_platform`
- `elevenlabs.io/pricing?price.platform=agents_platform`
- `elevenlabs.io/pricing?price.platform=api`

Each tab shows a distinct pricing breakdown with different credit amounts, limits, and overage rates — the primary evidence source for D5 (Cost Driver Mapping) and D7 (Overages & Risk). These tabs are rendered as JS state changes, not as `<a href>` anchor links, so they are invisible to:
1. Firecrawl's `/map` step (sitemaps never include query-param variants)
2. Fix 1's secondary pass (extracts `<a href>` links from scraped markdown — JS tab navigation emits none)
3. Deduplication (query params stripped → all three collapse to `/pricing`)

The pipeline scrapes `/pricing` and receives only the default tab content. The other two tabs' pricing details are never seen.

**Fix needed:** After scraping a `/pricing` page, scan the raw HTML response for `<a href>` and JavaScript state patterns that match `?{param}={value}` on the same path. Probe each unique `?`-variant as a separate evidence page at high priority. This is distinct from the existing FAQ anchor extraction (Fix 1) — it targets URL query-param tab navigation, not anchor fragment links.

---

**Failure D — JS accordion content truncation causing D8 score miss (waitFor regression)**

The ElevenLabs pricing page FAQ section contains in-product observability disclosures:

> "How do I check how many credits I have remaining? You can view your remaining credits by logging into the platform and navigating to your subscription page from your profile menu."

This is public documentation of in-product credit balance monitoring — directly relevant to D8 (Safety Rails, in-product observability subtest). It was NOT captured in the March 24 run.

The performance commit `bb6e4ec` reduced `waitFor` from 3000ms to a blanket 1500ms across all pages. The pricing page FAQ accordions require full JS execution to expand and render their content. At 1500ms, the accordions are not yet expanded when Firecrawl snapshots the page, so FAQ content below the fold is absent from the scraped markdown.

The already-captured equivalent ("analytics tab in Developers dashboard" from `/pricing/api`) is a different FAQ item. The credit balance FAQ is distinct and was missed entirely due to the timing regression.

**Fix needed:** Restore adaptive `waitFor` behavior: use 2500ms for `/pricing` pages specifically, or detect `<details>`, `<summary>`, accordion class patterns in the initial HTML response and apply 2500ms only when detected. The blanket 1500ms is appropriate for non-accordion pages and preserves the performance gain for most pages.

**Pattern Tag:** `subdomain-trust-center`, `login-wall-slot-consumption`, `query-param-pricing-tab-miss`, `accordion-waitfor-regression`, `post-bundle-regression-no-recovery`

---

### Entry 014 — March 24, 2026

| Field | Value |
|-------|-------|
| Companies | Replit, AirOps, Cursor, Lovable, Deepnote |
| Version | Various — cross-run observation |
| Dimension | All dimensions affected indirectly — zero-signal pages consuming slots that high-signal pages would otherwise fill |
| Root Cause | contamination — four new URL contamination failure classes identified across five reports |
| Caught By | Manual review of Pages Analyzed lists across reports |
| Status | Partially fixed. w3.org and CDN/image URLs resolved by `bb6e4ec`. Four new patterns open — see below. |

**Already fixed by `bb6e4ec` (`isEvidenceEligible()`):**

The following URL types observed in these reports are resolved as of commit `bb6e4ec` and should no longer appear in evidence sets:

| URL example | Fix mechanism |
|---|---|
| `http://w3.org/2000/svg` (Replit, AirOps, Lovable) | External domain filter |
| `http://w3.org/1999/xlink` (AirOps) | External domain filter |
| `cdn.prod.website-files.com/...lottieflow.json` (AirOps) | `cdn.` subdomain prefix filter |
| `d3gk2c5xim1je2.cloudfront.net/...caret-right.svg` (Lovable) | External domain filter |
| `lovable.dev/img/opengraph-image.png` (Lovable) | `.png` extension filter |

If any of these appear in post-`bb6e4ec` runs, treat as a regression in the filter.

---

**New failure pattern A — `@username` user-generated content paths (Replit)**

`replit.com/@03aurika23/Banana-Delivery-Bot` is an individual user's project page hosted on Replit's domain — not Replit's own product or pricing content. The current random-slug filter (`/^-[a-z0-9]{10,}$/i`) catches gamma-style slugs but not the `@username` path pattern common to platforms that host user content at their root domain (Replit, HuggingFace, GitHub, etc.).

Fix: in `isEvidenceEligible()`, reject any URL whose path contains a segment that starts with `@`.

---

**New failure pattern B — Malformed URL from HTML entity encoding (Lovable, AirOps)**

`https://d3gk2c5xim1je2.cloudfront.net/v7.1.0/solid/caret-right.svg&quot;);` — the trailing `&quot;);` is an HTML-encoded double quote followed by CSS closing syntax. This was extracted from an HTML-encoded `background-image: url(&quot;...&quot;)` declaration in inline CSS or an SVG attribute. The URL was never a real navigable link — the extractor pulled it from raw text.

The same class of malformed extraction produces the w3.org namespace URLs: SVG `xmlns` attributes (`xmlns="http://www.w3.org/2000/svg"`) are being scraped as if they were hyperlinks.

Fix: before any extracted URL enters the queue, validate that it: (1) parses cleanly as a URL with no trailing `"`, `>`, `)`, or HTML entities (`&quot;`, `&amp;`, `&#`), and (2) uses `http` or `https` scheme only. Reject silently on failure.

---

**New failure pattern C — Changelog over-representation (Cursor)**

3 of 16 slots consumed by changelog pages: `/en-US/changelog`, `/changelog/0-1-7`, `/changelog/0-10-6-nightly`. Individual versioned changelog entries document release notes — they contain no pricing, packaging, overage, or trust evidence. Two sub-issues:

1. **No per-category slot cap on `/changelog/*`.** The URL scorer does not penalize versioned changelog entries, so multiple versions fill the queue alongside each other.
2. **Locale variant not deduplicated.** `/en-US/changelog` is the same content as `/changelog` with a locale prefix. Locale prefixes (`/en/`, `/en-US/`, `/fr/`, `/de/`, etc.) are not stripped before deduplication, so both are treated as distinct pages and both are fetched.

Fix: (1) cap `/changelog/*` at 1 slot total; (2) strip locale prefixes before URL deduplication and scoring.

---

**New failure pattern D — Docs path over-representation without keyword gating (Deepnote)**

9 of 10 `/docs/*` slots consumed by zero-signal pages: AI feature guides (`/docs/ai-analysis`, `/docs/ai-code-completion`), integration connectors (`/docs/amazon-s3`, `/docs/bigquery-oauth`), usage policy (`/docs/acceptable-use-policy`), and education tools (`/docs/auto-grading-solutions`). Only `/docs/billing-alerts-and-limits` is relevant.

`/docs/` is a mixed-signal path — it cannot be capped globally or deprioritized entirely because `/docs/billing*`, `/docs/credits*`, `/docs/usage-limits*` are often the highest-signal pages in the evidence set (see Clay university link, Entry 005). The scorer currently treats all `/docs/*` URLs as equal.

Fix: within `/docs/*`, apply a two-tier scoring split:
- **Boost** paths containing: `billing`, `credits`, `usage`, `limits`, `pricing`, `plans`, `overage`, `trust`, `security`, `compliance`, `soc`, `gdpr`, `hipaa`, `data-privacy`
- **Cap at 2 slots** all `/docs/*` paths that do not match any of the above keywords

**Pattern Tag:** `at-username-ugc`, `malformed-url-html-entity`, `changelog-slot-saturation`, `locale-variant-not-deduped`, `docs-path-no-keyword-gating`

---

### Entry 013 — March 23, 2026

| Field | Value |
|-------|-------|
| Company | Beautiful.ai (beautiful.ai) |
| Version | V1 |
| Dimension | D4 Cost Driver Mapping, D5 Overages & Risk, D6 Safety Rails & Trust, D7 Pricing Transparency, D8 Enterprise/Compliance — all scored 1/2 |
| Score | 11/16 (69%) — Established Stage |
| Pages Analyzed | 13 |
| Root Cause | contamination — T2 at scale: 10 of 13 slots consumed by low-signal pages, all five 1/2 dimensions scored off a single page |
| Caught By | Manual review — evidence citations show `/pricing` as sole source for D3–D8 |
| Status | Open. Three new failure patterns identified. No fix deployed. |

**Evidence concentration finding:**
All five dimensions scoring 1/2 (D4–D8) are sourced exclusively from `beautiful.ai/pricing`. No corroborating evidence from any other page for any of these dimensions. D1 and D2 additionally cite the root homepage and one customer story. The remaining 10 pages contributed zero scored evidence across all 8 dimensions.

**Slot breakdown — 13 pages fetched:**

| Page | Classification | Signal |
|------|---------------|--------|
| `beautiful.ai/pricing` | High-signal | D1–D8 evidence |
| `beautiful.ai` (root) | High-signal | D1, D2 only |
| `/customers/cmit-solutions-...` | Customer story | D2 one quote |
| `/customers/adweek` | Customer story | None |
| `/customers/adweek#:~:text=Caroline...` | **Duplicate** (text fragment of above) | None |
| `/customers/camelot` | Customer story | None |
| `/customers/carbongate` | Customer story | None |
| `/customers/cvent` | Customer story | None |
| `/customers` (listing) | Customer index | None |
| `/compare` | Comparison page | None |
| `/compare/pitch-alternative` | Comparison page | None |
| `/pricing-demo` | Demo request page | None |
| `support.beautiful.ai/hc/.../Delete-Account` | Help article — account deletion | None |

**Three new failure patterns identified:**

**(A) Customer story page over-representation.** 5 of 13 slots consumed by `/customers/*` pages. Customer stories contain testimonials and workflow quotes but have near-zero evidence for D4 (cost drivers), D5 (overages), D6 (safety rails), D7 (pricing transparency), or D8 (compliance). No cap exists on how many customer story pages enter the queue — the URL scorer does not penalize them sufficiently relative to pricing/trust paths.

**(B) Text fragment anchor not deduplicated.** `/customers/adweek#:~:text=Caroline%20explained...` is identical in content to `/customers/adweek` — Firecrawl returns the same markdown for both because the `#:~:text=` fragment is a browser-only scroll hint with no server-side effect. This consumed a page slot as a functional duplicate. The deduplication logic should strip text fragment anchors (`#:~:text=`) before comparing URLs.

**(C) Low-signal support article from legitimate subdomain.** `support.beautiful.ai/hc/en-us/articles/360028561851-Delete-Account` passed the domain filter (subdomain of beautiful.ai) and the evidence eligibility filter. It is a help article about how to delete your account — zero signal for any pricing or trust dimension. A help/support article about account deletion is the lowest-signal page type possible and consumed a slot that a billing FAQ or trust center article could have filled.

**Root Cause Detail:**
The pipeline has no mechanism to cap over-representation of any single path category. Once `/customers/adweek` scores above threshold, `/customers/adweek#:~:text=...`, `/customers/camelot`, `/customers/carbongate`, and `/customers/cvent` all score similarly and fill the queue. The practical effect: all five 1/2 dimensions have no corroborating evidence beyond a single page, and any gap on `/pricing` becomes unrecoverable.

**Pattern Tag:** `customer-story-slot-saturation`, `text-fragment-duplicate`, `low-signal-support-article`, `single-page-evidence-concentration`

---

### Entry 012 — March 23, 2026

| Field | Value |
|-------|-------|
| Company | ZoomInfo.com |
| Version | V2 → V3 (two independent reruns, March 22 → March 23) |
| Dimension | Product North Star (D1), ICP & Job Clarity (D2) |
| Score | V2: not recorded | V3: lower — D1 and D2 dropped |
| Score Delta | D1 and D2 both regressed between independent reruns |
| Pages Analyzed | V2: homepage present | V3: homepage absent from evidence set |
| Root Cause | pipeline_miss — pipeline inconsistency across independent reruns |
| Caught By | Manual comparison of V2 and V3 page lists |
| Status | Fix not yet implemented. Fix 3A does not cover this failure class — see Root Cause Detail. |

**Root Cause Detail:**
ZoomInfo's homepage (`zoominfo.com`) is a primary evidence page for D1 (Product North Star) and D2 (ICP & Job Clarity) — it contains the clearest articulation of the product's purpose, target buyer, and use case framing. In the March 22 run, the homepage appeared in the evidence set and both dimensions scored correctly. In the March 23 rerun (same company, no changes to public site), the homepage was absent from the fetched page list and D1/D2 dropped as a result.

This is a **pipeline inconsistency** failure: Firecrawl's `/map` API does not return a deterministic URL set across independent calls. The homepage ranked below the 10-page cutoff in the March 23 run due to map ordering variance, not any change to the site.

**Why Fix 3A did not fire:** Fix 3A (Score Stability Rule) only activates when `previousScores` is explicitly passed into the `analyze-company` function call. The application makes independent stateless calls — `previousScores` is never populated from a prior run. Fix 3A is structurally dormant for all production runs. Even if Fix 3A had fired, it would only hold the score if zero contradicting evidence appeared — it cannot guarantee the homepage appears in the evidence set.

**Resolution needed:**
1. **Score persistence** — store last known per-dimension scores and confidence per company in Supabase after each run.
2. **Score injection** — retrieve and pass stored scores as `previousScores` on subsequent runs for the same company to activate Fix 3A.
3. **Homepage pinning** — the company root domain URL should be force-added to the evidence set regardless of map results, similar to how `/pricing` was given priority override.

**Pattern Tag:** `pipeline-inconsistency-rerun`, `homepage-absent-map-variance`, `fix-3a-dormant`

---

### Entry 011 — March 23, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs.io |
| Version | V2 → V3 (March 6 baseline → March 23 post-fix rerun) |
| Dimension | Pricing Transparency (D7), Enterprise/Compliance (D8) |
| Score | V2: higher | V3: lower — D7 and D8 regressed |
| Score Delta | D7 and D8 both dropped post-fix deployment |
| Pages Analyzed | V2: 18 pages (including /security and /trust) | V3: 7 pages (/security and /trust absent) |
| Root Cause | contamination — post-fix evidence set shrinkage; high-signal pages dropped after fix deployment changed page selection |
| Caught By | Manual page list comparison across runs |
| Status | Fix not yet identified. Fix 3A wrong failure class — cannot protect against missing pages. |

**Root Cause Detail:**
The March 6 run (pre-fix) fetched 18 pages including `elevenlabs.io/security` and `elevenlabs.io/trust` — the two highest-signal pages for D7 and D8 respectively. The March 23 rerun (post-fix deployment) fetched only 7 pages and neither `/security` nor `/trust` appeared in the evidence set. D7 and D8 dropped as a direct result.

This is a **post-fix evidence shrinkage** failure. The pipeline fixes deployed between March 6 and March 23 changed how URLs are selected, filtered, and capped:
- `maxPages` default reduced from 15 → 10 (performance fix `bb6e4ec`)
- `isEvidenceEligible()` pre-filter added — may be incorrectly excluding `/security` or `/trust` paths
- Fix 3B page-to-dimension routing changes may be deprioritizing trust-center paths relative to pricing/billing paths

**Why Fix 3A did not fire:** Fix 3A cannot protect against this failure class. The Score Stability Rule only holds a prior score when new evidence is zero-signal. When high-signal pages are *absent from the evidence set entirely*, Fix 3A has no prior-run scores to compare against (same dormancy issue as Entry 012). Even with full Fix 3A activation, a missing `/security` page produces no evidence — Fix 3A would still allow the score to drop because there is no explicit contradiction to block.

**Resolution needed:**
1. **Trust-center path pinning** — `/security`, `/trust`, `/compliance`, `/privacy` paths should be added to the `highIntentPaths` set with explicit positive scoring weight, not just left to map discovery.
2. **Investigate `isEvidenceEligible()` filter** — confirm `/security` and `/trust` are not being incorrectly excluded by the domain or path pre-filter.
3. **Regression test for page count** — before deploying performance page-count reductions, check that anchor high-signal pages (pricing, security, trust) still appear in the post-change evidence set for a known-good company.

**Pattern Tag:** `post-fix-page-shrinkage`, `security-trust-pages-absent`, `fix-3a-wrong-failure-class`, `performance-fix-evidence-regression`

---

### Entry 010 — March 15, 2026

| Field | Value |
|-------|-------|
| Company | Lovable.dev |
| Version | V2 → V3 (March 8 → March 15, two independent runs) |
| Dimension | ICP & Job Clarity (D2) |
| Score | V2: D2 = 2/2 | V3: D2 = 1/2 |
| Score Delta | −1 on D2 only; all other dimensions held |
| Pages Analyzed | Identical — same 7 pages in both runs |
| Root Cause | prompt_drift — same evidence set, different score on independent rerun |
| Caught By | Manual comparison after user noticed overall score change |
| Status | Fix not yet implemented. Predates Fix 3A. Fix 3A would cover this if score persistence were active — see Root Cause Detail. |

**Root Cause Detail:**
Both runs analyzed identical pages (7 pages, same URLs, same content — no changes to Lovable's public site between March 8 and March 15). D2 (ICP & Job Clarity) scored 2/2 in the March 8 run and 1/2 in the March 15 run with no change to the evidence set. All other 7 dimensions held.

This is **pure prompt drift** — scoring model instability producing different output from the same input across two calls. The Gemini 2.5 Flash model's response for D2 is non-deterministic at the margin of a 2/2 score. The March 8 run's 3-pass majority vote resolved to 2/2; the March 15 2-pass merge resolved to 1/2.

**Contributing factors:**
1. The switch from 3-pass → 2-pass scoring (performance fix `bb6e4ec`) reduced majority vote robustness. A 3-pass vote requires 2/3 agreement; 2-pass is a coin flip on disagreements, with confidence as tiebreaker.
2. D2 is a dimension where LLM inference of buyer clarity from marketing copy is inherently ambiguous — "developer-adjacent" products sit on the 1/2 vs. 2/2 threshold without bright-line evidence.

**Why Fix 3A would cover this (when active):** If `previousScores` were passed, Fix 3A's Score Stability Rule would hold D2 at 2/2 absent contradicting evidence. Prompt drift produces no contradicting evidence — it produces a lower-confidence alternative reading of the same text. Fix 3A is the correct mechanism for this failure class, but it requires score persistence infrastructure to be operational.

**Resolution needed:**
1. **Score persistence + injection** (same as Entry 012) — activates Fix 3A for all production runs.
2. **D2 threshold review** — consider whether the D2 subtest rubric has a bright-line at 2/2 that is LLM-interpretable, or whether the threshold is inherently ambiguous for developer-tool products.

**Pattern Tag:** `prompt-drift-same-evidence`, `d2-threshold-ambiguity`, `2-pass-vote-instability`, `fix-3a-dormant`

---

### Entry 009 — March 22, 2026

| Field | Value |
|-------|-------|
| Company | Relevance AI (relevance.ai) |
| Version | V2 (post-fix) |
| Dimension | Value Unit, Cost Driver Mapping, Buyer & Budget Alignment (improved); Pools & Packaging, Overages & Risk (unchanged) |
| Score | 10/16 (63%) — Established Stage |
| Score Delta vs V1 | +19 percentage points (44% → 63%) |
| Pages Analyzed | 4 (relevance.ai/pricing, docs.relevance.ai, cdn.relevanceai.com/images/customerstories/eftsure-logo-2.webp, relevance.ai) |
| Root Cause | Partially resolved — canonical path probing fix correctly surfaced pricing page |
| Caught By | Score comparison V1 → V2 |
| Status | Resolved. V2 is valid baseline. Remaining gaps reflect genuine non-disclosure by Relevance AI, not pipeline misses. |

**Dimension Changes V1 → V2:**

- **Value Unit:** 0/2 → 1/2 — pricing page confirmed Actions + vendor credits as primary units
- **Cost Driver Mapping:** 0/2 → 1/2 — pricing page provided Actions/month and Vendor Credits/month limits per tier
- **Buyer & Budget Alignment:** 1/2 → 2/2 — pricing page confirmed Free/Pro/Team/Enterprise tier structure with SSO, RBAC, custom implementation for Enterprise

**Dimensions Unchanged V1 → V2:**

- **Pools & Packaging:** held at 1/2 — rollover mentioned but reset cadence and top-up rules not publicly detailed
- **Overages & Risk:** held at 1/2 — overage policy explicitly stated as "None specified" on pricing page — accurate, not a pipeline miss

**Note on CDN URL in Pages Analyzed:**
`cdn.relevanceai.com/images/customerstories/eftsure-logo-2.webp` appeared in the pages list. Image/CDN asset URLs should be filtered from the queue before scraping — they cannot contribute evidence and consume a page slot. See Known Failure Modes.

**Root Cause Detail:**
Canonical path probing fix correctly constructed `relevance.ai/pricing` despite it being absent from the sitemap. Confirmed working. Remaining dimension gaps (Value Unit 1/2, Overages & Risk 1/2) reflect deliberate non-disclosure by Relevance AI — accurate scoring, not a pipeline miss. The "Overage Policy: None specified" on their pricing page is the correct scoring input for Overages & Risk.

**Pattern Tag:** `post-fix-baseline`, `genuine-non-disclosure`, `cdn-url-slot-contamination`, `overage-policy-none-specified`

---

### Entry 008 — March 22, 2026

| Field | Value |
|-------|-------|
| Company | Relevance AI (relevanceai.com) |
| Version | V1 |
| Dimension | N/A — report not generated |
| Score | Not completed — runtime error on scoring pass |
| Pages Analyzed | Pipeline failed before report generated |
| Root Cause | pipeline_miss — two simultaneous failure modes |
| Caught By | Manual review — pricing page absence identified in logs before report completed |
| Status | Both issues fixed. See Entry 009 for rerun results. |

**Root Cause Detail:**

**(A) Pricing page miss — sitemap exclusion + wrong page selected.** `relevanceai.com/pricing` was not returned by Firecrawl's `/map` API because the page is absent from the site's sitemap. The scraper selected `/agent-templates-tasks/pricing-optimization-ai-agents` instead — a page that matched the keyword "pricing" but is not the actual pricing page. Root cause: the forced pricing pattern had nothing to match when `/pricing` was not in the map results.

**(B) Runtime 500 error.** A transient connection reset on the 3rd scoring pass caused full function failure.

**Resolution:**

1. **Canonical path probing** — if `/pricing`, `/plans`, or `/billing` are not found in map results, the scraper now constructs and directly attempts to scrape these paths. This is a new fix class beyond the existing secondary pass logic and applies to any company whose pricing page is excluded from their sitemap.
2. **Retry logic with exponential backoff** added to `callLovableAI` (up to 2 retries) to handle transient network errors on the scoring pass.

**Pattern Tag:** `pricing-page-sitemap-excluded`, `wrong-page-keyword-match`, `transient-500-scoring-pass`

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
| Pricing page excluded from sitemap — keyword match selects wrong page | Fixed — canonical path probing added. If `/pricing`, `/plans`, `/billing` absent from map results, scraper constructs and probes directly. |
| Transient network error on scoring pass causes full function 500 | Fixed — retry logic with exponential backoff added to `callLovableAI` (up to 2 retries). |
| Image/CDN URLs queued as pages (e.g., .webp, .png, .jpg, .gif, .svg, cdn.* subdomains) | Fixed — `isEvidenceEligible()` pre-filter deployed `bb6e4ec`. CDN subdomains and binary asset extensions excluded before queue entry. |
| User-generated content at domain paths consuming page slots (e.g., gamma.app/docs/random-slug, ephemeral customer-created pages) | Fixed — `isEvidenceEligible()` pre-filter deployed `bb6e4ec`. Path segments matching random-slug pattern (`/^-[a-z0-9]{10,}$/i`) excluded. |
| w3.org/2000/svg and other external domains appearing as evidence URLs | Fixed — `isEvidenceEligible()` pre-filter deployed `bb6e4ec`. Any URL whose host does not match the registrable domain of the target company is excluded. |
| Fix 3A (Score Stability Rule) operationally dormant — no score persistence or injection mechanism exists | Open — Fix 3A only activates when `previousScores` is explicitly passed. The app never passes `previousScores` (every run is independent/stateless). Requires: (1) store per-dimension scores in Supabase after each run, (2) retrieve and inject on next run for same company. |
| Prompt drift — same evidence set, different score on independent rerun | Open — covered by Fix 3A when active. Currently dormant (see above). Observed: Lovable D2, March 8→15. 2-pass scoring is more susceptible than 3-pass due to reduced majority vote robustness. |
| Post-fix evidence set shrinkage — page selection changes after fix deployment reduce total pages fetched, dropping high-signal pages | Fixed — Bundle 2. `/security`, `/trust`, `/compliance`, `/privacy` added to `highIntentPaths` (+900 score, same as `/pricing`). Will survive page-count cutoffs alongside pricing. |
| Pipeline inconsistency across independent reruns — different pages fetched for same company on separate runs due to Firecrawl map ordering variance | Fixed — Bundle 2. Homepage (Step 1) now always pushed to `pages` regardless of whether `mainPageData.data` is null. Homepage is structurally force-scraped before any URL selection. Score persistence + Fix 3A injection is secondary mitigation (still open — Bundle 4). |
| Customer story page over-representation — `/customers/*` pages saturate queue with near-zero D4–D8 signal | Fixed — Bundle 1. Per-category slot caps: `/customers/*` + `/case-studies/*` share 2 slots combined; `/blog/*` 1 slot; `/changelog/*` 1 slot. |
| Text fragment anchor URLs not deduplicated — `#:~:text=` fragments produce functionally identical content to the base URL but consume a separate slot | Fixed — Bundle 1. `normaliseForDedup()` strips `#:~:text=` fragments before deduplication key comparison. |
| Low-signal support articles from legitimate subdomains entering queue — `support.*` help articles about non-pricing topics (e.g., account deletion) pass domain filter but have zero evidence value | Open — observed: Beautiful.ai `support.beautiful.ai/hc/.../Delete-Account`. Fix: deprioritize or cap support subdomain articles that don't match billing/pricing/trust keyword patterns. |
| `@username` user-generated content paths entering queue (e.g., replit.com/@user/project-name) | Fixed — Bundle 1. `isEvidenceEligible()` rejects any URL path segment starting with `@`. |
| Malformed URLs from HTML entity encoding entering queue — `&quot;);` suffix, w3.org xmlns attributes scraped as hyperlinks | Fixed — Bundle 1. `isEvidenceEligible()` rejects URLs with trailing HTML entities or CSS syntax; scheme filter rejects non-http/https. |
| Changelog over-representation — versioned `/changelog/x-y-z` entries consuming multiple slots with zero pricing/trust signal | Fixed — Bundle 1. `/changelog/*` capped at 1 slot in per-category slot reservation. |
| Locale variant paths not deduplicated — `/en-US/page` and `/page` treated as distinct URLs | Fixed — Bundle 1. `normaliseForDedup()` strips locale prefixes (`/en/`, `/en-US/`, `/fr/`, etc.) before deduplication key comparison. |
| `/docs/*` over-representation without keyword gating — integration and feature docs consuming slots ahead of billing/limits docs | Open — observed: Deepnote (9 of 10 docs slots zero-signal; only `/docs/billing-alerts-and-limits` relevant). Fix: boost `/docs/*billing*`, `/docs/*credits*`, `/docs/*limits*`, `/docs/*security*` etc.; cap non-matching `/docs/*` at 2 slots. |
| Product database pages with pure numeric last path segment consuming evidence slots — e.g., `/c/company/551539465` are database record URLs that return login walls | Fixed — Rule E added to `isEvidenceEligible()`: reject last path segment matching `/^\d{5,}$/`. Observed: ZoomInfo (Entry 047). |
| Same billing page URL with section anchor variants appearing multiple times in Pages Analyzed — dedup preserves hash fragments by design (for FAQ anchors) but billing pages have no section-partitioned content | Fixed — `normaliseForDedup()` strips both query params and hash fragments for billing/payment paths. Observed: ZoomInfo `/about/payments` ×4 (Entry 048). |
| Trust center hosted on separate subdomain (`compliance.*`, `trust.*`, `security.*`) — unreachable by path probing or Firecrawl map | Open — observed: ElevenLabs `compliance.elevenlabs.io` (Entry 015). Path pinning in Bundle 2 cannot reach subdomain-hosted trust centers. Fix: probe `compliance.{domain}`, `trust.{domain}`, `security.{domain}` as subdomain roots alongside canonical path probes. |
| Login-wall pages consuming evidence slots — `/subscription`, `/usage`, `/account` scrape successfully (HTTP 200) but return only "Sign In" page with zero evidence | Open — observed: ElevenLabs `/subscription` and `/usage` (Entry 015), 28% of evidence budget wasted. Fix: add gated path blocklist to `isEvidenceEligible()`: reject `/subscription`, `/usage`, `/account`, `/dashboard`, `/settings`, `/login`, `/signin`, `/sign-in`, `/register`. |
| Tab-partitioned pricing page — query-param tab variants (`?price.platform=api` etc.) not reached by map, Fix 1, or deduplication; each tab contains distinct pricing/limits evidence | Open — observed: ElevenLabs pricing (Entry 015). Affects D5 and D7 specifically. Fix: after scraping `/pricing`, scan raw HTML for query-param variants on same path; probe each as a separate high-priority evidence page. |
| JS accordion content truncated on pricing page — `waitFor` reduction to 1500ms (`bb6e4ec`) prevents FAQ accordions from fully rendering; below-fold FAQ content absent from scraped markdown | Open — observed: ElevenLabs pricing FAQ credit balance answer missing (Entry 015); confirmed D8 score miss. Fix: restore adaptive `waitFor` — use 2500ms for `/pricing` pages or when accordion markup detected in initial HTML response. |

---

## Calibration Anchors

These are locked reference scores for companies that have been fully validated. If a future rubric or prompt change causes any of these scores to shift without new contradicting public evidence, that is a **calibration regression** and must be investigated before the change ships.

| Company | Dimension | Locked Score | Confidence | Notes |
|---------|-----------|-------------|------------|-------|
| Clay.com | Overall | 75% (12/16) | 70% | V3 post all fixes. 7 pages including university.clay.com/docs/actions-data-credits. Value Unit 2/2 confirmed. This is the authoritative locked score. Previous 94% (V2) was based on a pipeline miss that overcorrected — V3 is correct. |
| Clay.com | Value Unit | 2/2 | 90% | Requires university.clay.com/docs/actions-data-credits in evidence set. If this page is absent, Value Unit drops to 1/2 — this is the Signal Page for this dimension. |
| Hex.tech | Overall | 100% | 76% | Post-V2 score after modal and FAQ anchor links added. V1 63% was pipeline miss. |
| Miro.com | Overall | 69% (11/16) | 64% | V2 post-fix. Pricing page present. Score reflects genuine partial observability — AI credit metering not publicly documented. Valid baseline. Follow-up recommended to check FAQ deep links on pricing page. |
| ZoomInfo.com | Value Unit | 1/2 | 50% | V1 is authoritative. Confirmed again at v18 post scraper fixes — billing page dedup removal eliminated dimension bleed that had inflated this to 2/2 in the broken run. Credit metering formula and auditability surfaces not publicly documented — genuine gap, not pipeline miss. |
| Relevance AI | Overall | 63% (10/16) | 64% | V2 post-fix. 4 pages. Pricing page present via canonical path probing. Remaining gaps (Value Unit 1/2, overage policy) reflect deliberate non-disclosure — accurate, not pipeline misses. |
| Relevance AI | Overages & Risk | 1/2 | 45% | Pricing page explicitly states "Overage Policy: None specified." Score is accurate. Do not adjust upward without new public evidence of an actual overage policy. |

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
