# AVS Rubric — Pricing Model Category Calibration (DRAFT)

**Status:** Final
**Date:** April 1, 2026
**Scope:** D1, D5, D6, D7, D8 — the five dimensions with confirmed or suspected misfires across pricing model categories

## Pricing Model Categories

| Category | Definition | Examples |
|----------|-----------|----------|
| **Seat-based** | Per-user/seat pricing, AI and features bundled. No metered usage. | Beautiful.ai, Linear, Canva |
| **Consumption** | Pay-per-unit: tokens, credits, minutes, API calls. Cost scales with usage. | ElevenLabs, Deepgram, OpenAI API |
| **Hybrid** | Seat-based platform + metered add-on (AI credits, compute, etc.) | Notion, Cursor, GitHub Copilot |
| **Platform/compute** | Infrastructure with usage tiers, query-based or compute-based billing. | Snowflake, Hex, Deepnote |

---

## D5: Cost Driver Mapping (C1–C6)

### Current Spec (What Breaks)

The current spec requires:
- C1: ≥3 cost drivers, ≥1 inference-related
- C2: ≥2 drivers with deterministic formulas
- C4: p50/p95 cost-per-value-unit estimates
- C5: Spike triggers + mitigations for ≥2 drivers

**Problem:** These subtests assume multiple variable cost drivers exist. Seat-based tools have ONE driver (seats × price). There are no inference components, no driver formulas, no p50/p95 variance, and no spike triggers. All three seat-based examples (Beautiful.ai, Linear, Notion core) scored 1/2 with rationale citing missing consumption artifacts that don't apply.

### Proposed Calibration by Category

#### Seat-Based — What D5 Measures
For seat-based products, "cost driver mapping" means: **can the buyer calculate their total cost from published information?**

| Score | Criteria |
|-------|----------|
| **2/2** | Per-seat price published for each tier. Seat types differentiated if product has distinct roles (viewer/editor/admin) or team-size bands. Total cost calculable from published info (seats × price). Bundled "unlimited" features are scoped or well-understood (no user confusion about what's included). |
| **1/2** | Per-seat price exists but: seat types not differentiated when product clearly has distinct user roles at different price points, OR pricing only partially published (only "contact sales" with no starting price for any non-enterprise tier), OR bundled "unlimited" features have no documented boundary AND users report confusion about limits. |
| **0** | No pricing information publicly available for any tier. |

**Subtest reinterpretation for seat-based:**
- C1 (Driver inventory): Pass if ≥1 driver (seats) with published per-seat price per tier. The "≥3 drivers" and "inference-related" requirements are N/A.
- C2 (Deterministic formulas): Pass if total cost = seats × published price is calculable. No formula beyond multiplication needed.
- C3 (Driver-to-workflow linkage): Pass if seat pricing is linked to a defined user role or workspace scope. Unchanged.
- C4 (Cost-per-value-unit estimate): Pass if per-seat price is published. p50/p95 variance is N/A — seat cost is deterministic.
- C5 (Spike and tail mapping): N/A for seat-based. Seat counts don't spike. Mark as auto-pass.
- C6 (Forecasting surfaces): Pass if pricing page provides enough info to calculate total cost. A pricing calculator or ROI estimator is a bonus, not a requirement.

**Validation — seat-based reports:**
- Beautiful.ai: Published $12/mo Pro, $40/user/mo Team, differentiated tiers → **2/2** (was 1/2)
- Linear: Published $10/user/mo Basic, $16/user/mo Business, Free tier, differentiated features → **2/2** (was 1/2)
- Notion (core platform): Published per-member pricing, differentiated tiers → **2/2** (was 1/2 — but Notion also has AI credits which are consumption; see hybrid)

#### Consumption-Based — What D5 Measures (No Change)
Current spec applies as-is. Consumption products DO have multiple drivers, inference components, and p50/p95 variance. Full subtest battery is appropriate.

| Score | Criteria |
|-------|----------|
| **2/2** | ≥3 drivers with ≥1 inference-related. Driver formulas documented. p50/p95 cost estimates published or calculable. Spike triggers and mitigations documented. Forecasting surfaces (calculator, dashboard, alerts) present. |
| **1/2** | Drivers identified but incomplete mapping: missing formulas, no p50/p95 estimates, or no forecasting surfaces. |
| **0** | No cost driver information publicly available. |

#### Hybrid — What D5 Measures
Score the seat component and consumption component separately, then take the lower score. The consumption add-on IS where cost driver complexity lives.

| Score | Criteria |
|-------|----------|
| **2/2** | Seat component: per-seat price published per tier. Consumption component: metered unit defined, per-unit price published, usage tracking documented, and cost drivers for the metered component are mapped (at minimum: unit definition + price + what triggers usage). |
| **1/2** | Seat pricing clear but consumption component has gaps: metered unit price missing, no usage tracking documented, or cost drivers for the add-on are undefined. |
| **0** | Neither seat nor consumption pricing publicly documented. |

#### Platform/Compute — What D5 Measures (Minor Adjustment)
Similar to consumption but often with query-based or compute-time billing. Current spec mostly applies. Adjustment: storage and compute drivers may replace inference drivers.

| Score | Criteria |
|-------|----------|
| **2/2** | ≥3 drivers (may include compute, storage, queries, egress instead of inference). Driver-to-workflow linkage documented. Cost estimates published or calculable via calculator. Forecasting surfaces present. |
| **1/2** | Drivers identified but mapping incomplete. Missing calculator, estimates, or driver formulas. |
| **0** | No cost driver information available. |

---

## D1: Product North Star (NS1–NS6)

### Current Spec (What Breaks)

The current NS3 gate requires "measurable outcome" for score 2. The LLM interprets this as "company publishes a concrete metric or target on their website." This penalizes all categories equally — most companies don't publish performance promises.

All three seat-based reports scored 1/2 with identical rationale: "no explicit predictability metrics or targets."

**Problem:** The definition of "measurable outcome" is too narrow. Companies demonstrate measurability through proof artifacts (ROI calculators, quantified testimonials, workflow-specific metrics), not just published targets.

### Proposed Calibration (Cross-Category — Same for All)

This is NOT a category-specific issue. The fix applies universally.

| Score | Criteria |
|-------|----------|
| **2/2** | (1) Differentiated value proposition — the company articulates what makes their product's outcome distinct, not generic. AND (2) Measurable outcomes demonstrated through ANY of: quantified customer testimonials (specific metrics like "75% more meetings", "5x content velocity"), ROI calculator or estimator tool, published benchmarks or case study metrics, workflow-linked pricing that lets buyers estimate value (credits tied to tasks, usage tracking with outcome visibility). The buyer has enough information to estimate their own ROI. |
| **1/2** | Clear value prop stated, but outcomes are generic or unquantified ("save time", "work faster", "be more productive"). No proof artifacts (no testimonials with numbers, no calculator, no case study metrics). The buyer understands what the product does but cannot estimate the economic impact. |
| **0** | No stated value outcome. Product description is purely feature-list with no articulation of the problem solved or outcome delivered. NS1 fails. |

**Subtest reinterpretation:**
- NS1 (Stated value outcome): Unchanged — must articulate the primary outcome.
- NS2 (Predictability): Redefine. Pass if buyer can form a cost-to-outcome estimate from published information. This includes: ROI calculators, usage-linked pricing with tracking, or bounded-scope plans (flat-rate with defined capability envelope). Does NOT require the company to publish a performance guarantee.
- NS3 (Measurable outcome): Expand accepted evidence. Quantified customer testimonials satisfy NS3 for score 1. Company-published benchmarks, ROI calculators, or case study metrics with specific numbers satisfy NS3 for score 2.

**Validation — seat-based reports:**
- Beautiful.ai: Has ROI calculator at /roi-calculator (not currently scraped!), customer testimonial "reduced time by 75%". With ROI calculator captured → **2/2** (was 1/2)
- Linear: Customer story "moved their teams into Linear" but no quantified metrics on public pages → **1/2** (stays 1/2 — correct)
- Notion: "Ship faster with automated sprints" — generic. No quantified testimonials on scraped pages → **1/2** (stays 1/2 — correct)

**Pipeline fix needed:** Add `/roi-calculator`, `/roi`, `/calculator`, `/value-calculator` to high-intent URL patterns for discovery. These are direct evidence for D1 NS3.

---

## D6: Pools and Packaging (P1–P6)

### Current Spec (What Breaks)

The current spec requires:
- P3: Pool rules explicit (unit_name, included_units, reset_cadence). Fails if pools empty.
- P6: Overage packaging consistency (overage_unit_price present for overage-enabled tiers).
- Score 2 requires "evidence of complex usage-based bundling BEYOND standard tiering."

**Problem:** Seat-based tools don't have "pools" that reset or get consumed. Seats are persistent access rights, not depletable resources. P3 auto-fails when pools are empty, and the "beyond standard tiering" requirement for 2/2 penalizes tools where standard tiering IS the packaging model.

Linear scored 1/2 with rationale: "explicit pools with reset cadences, rollover, or top-up rules are not detailed." These concepts are structurally irrelevant to seat-based pricing.

### Proposed Calibration by Category

#### Seat-Based

| Score | Criteria |
|-------|----------|
| **2/2** | Clear tier structure with differentiated feature sets per tier. Exploration path exists (free trial or free tier). Production tiers cover distinct segments (individual/team/enterprise). Upgrade path is documented (what you get by moving up). Seat limits or team-size bands are defined where applicable. |
| **1/2** | Tiers exist but: no exploration path (no free trial or free tier), OR tiers are not clearly differentiated (feature overlap makes it unclear why someone would upgrade), OR upgrade path is undocumented. |
| **0** | No tier structure. Single plan or "contact sales" only with no published packaging. |

**Subtest reinterpretation for seat-based:**
- P1 (Segment coverage): Unchanged — at least one tier per target segment.
- P2 (Exploration vs production separation): Unchanged — free trial or free tier required.
- P3 (Pool rules explicit): Reinterpret for seat-based. Pass if tier includes defined seat limits or team-size constraints AND feature set is explicitly listed per tier. "Pools" are not applicable; tier boundaries replace pool rules.
- P4 (Pool scope matches buying unit): Reinterpret. Pass if tier targeting matches buying unit (individual plan for individuals, team plan for teams, enterprise for enterprise).
- P5 (Scaling without cliffs): Unchanged — upgrade path or add-on must exist.
- P6 (Overage packaging consistency): For seat-based, pass if what happens at seat limits is documented (e.g., "contact sales for additional seats" or "upgrade to Team for more users"). Overage unit pricing is N/A when overages don't exist.

**Validation:**
- Beautiful.ai: Pro/Team/Enterprise tiers, 14-day trial, differentiated features, seat limits (2-20 for Team) → **2/2** (was 2/2 — holds)
- Linear: Free/Basic/Business/Enterprise, clear feature differentiation, upgrade path → **2/2** (was 1/2 — corrected)
- Notion: Free/Plus/Business/Enterprise with differentiated features → **2/2** (was 2/2 — holds)

#### Consumption-Based (No Change)
Current spec applies. Pools, reset cadences, rollover, and top-up rules are core to consumption packaging.

#### Hybrid
Score tier structure (seat component) and pool/credit structure (consumption component) together. Both must be clear.

| Score | Criteria |
|-------|----------|
| **2/2** | Seat tiers differentiated with clear feature sets. Consumption component has defined pool rules (included credits, reset cadence, what happens at exhaustion). Exploration path exists for both components. |
| **1/2** | Seat tiers clear but consumption pool rules are incomplete (missing reset cadence, exhaustion behavior, or top-up pricing). |
| **0** | No packaging structure visible. |

#### Platform/Compute (Minor Adjustment)
Current spec mostly applies. Pool and tier structure are core. No change needed.

---

## D7: Overages and Risk Allocation (R1–R6)

### Current Spec (What Breaks)

The spec already has SOME category awareness:
- R4 rollover marked N/A for flat-rate/seat-based
- "N/A" is accepted as a valid overage_behavior for flat-rate
- Structural ceiling: flat-rate capped at 1/2 without enterprise true-up language

**Problem:** The structural ceiling is too harsh for seat-based. Beautiful.ai and Linear both scored 1/2 with rationale citing missing "caps, alerts, or customer control surfaces." But there's nothing to cap or alert on — seat costs don't vary. The 1/2 ceiling for "no overages" effectively punishes companies for having simple, predictable pricing.

Additionally, R1-R3 all assume overage-enabled tiers exist. When no tier has overages, these subtests don't have meaningful pass criteria.

### Proposed Calibration by Category

#### Seat-Based

| Score | Criteria |
|-------|----------|
| **2/2** | Explicit statement of what happens at plan limits (e.g., "contact sales for more seats", "features restricted", "upgrade required"). Refund/cancellation policy documented. Enterprise tier offers invoice/PO billing and contractual terms if enterprise segment exists. No hidden variable costs — the buyer knows the total cost will be seats × price with no surprises. |
| **1/2** | Limit behavior is ambiguous (unclear what happens if you need more seats than the plan allows), OR refund/cancellation policy is missing, OR enterprise billing terms are absent when enterprise tier is marketed. |
| **0** | No information about plan limits, no refund policy, and pricing is entirely opaque. |

**Subtest reinterpretation for seat-based:**
- R1 (Explicit limit behavior): Pass if what happens at seat/feature limits is documented. "Contact sales", "features restricted", or "upgrade to next tier" all count.
- R2 (Overage economics clarity): N/A when no tier has overages. Auto-pass for seat-based if overage_behavior is explicitly "none" or "N/A."
- R3 (Customer control surfaces): Reinterpret. For seat-based, "control" means the buyer can manage seat count (add/remove users) and see their current subscription status. Usage caps/alerts are N/A.
- R4 (Fairness and tail protection): N/A for seat-based (already in spec). Auto-pass.
- R5 (Enterprise risk allocation): Unchanged — enterprise tier should offer invoice/PO and contractual terms.
- R6 (No-surprise operability): Reinterpret. For seat-based, pass if total cost is deterministic from published pricing and the buyer is not exposed to variable charges. Forecasting surfaces and alerts are N/A when cost doesn't vary.

**Removing the structural ceiling:** The current spec says flat-rate products "can reach 1/2 but cannot reach 2/2 without enterprise true-up language." This should be revised:
- If the product HAS an enterprise tier with contractual terms (invoice/PO, custom pricing) → eligible for 2/2
- If the product has NO enterprise tier and no variable costs → 2/2 is achievable if all applicable subtests pass. The absence of overages is a feature, not a gap.

**Validation:**
- Beautiful.ai: "Contact sales for additional seats" documented, refund policy clear (24hr window), Enterprise tier with SSO/audit logs → **2/2** (was 1/2)
- Linear: "No overage, features restricted if limit reached" explicitly stated, 30-day refund policy, Enterprise tier with invoice/PO/SAML → **2/2** (was 1/2)
- Notion: "No additional charges, account restricted to free limits", refund policy documented, Enterprise tier → **2/2** (was 2/2 — holds)

#### Consumption-Based (No Change)
Current spec applies in full. Overage behavior, economics, caps, alerts, and forecasting surfaces are all critical for consumption pricing.

#### Hybrid
Apply seat-based rules to the seat component, consumption rules to the metered component. Overall score = lower of the two.

| Score | Criteria |
|-------|----------|
| **2/2** | Seat limits and overages clearly documented. Consumption component has: explicit overage behavior, per-unit overage pricing, customer control surfaces (caps, alerts, or dashboards), and forecasting tools. |
| **1/2** | Seat component clear but consumption component has gaps in overage documentation, control surfaces, or forecasting. |
| **0** | No overage or limit information for either component. |

#### Platform/Compute (No Change)
Current spec applies. Variable-cost infrastructure needs full overage controls.

---

## D8: Safety Rails and Trust Surfaces (T1–T6)

### Current Spec (What Breaks)

The current spec requires:
- T1: Budget/usage caps
- T2: Alerts and notifications
- T3: Estimation before spend
- T4: Auditability and breakdown
- T6: Safe failure behavior with risk limiters (rate limits, circuit breakers, etc.)

**Problem:** T1, T2, T3, and T6 are all consumption-oriented controls. Seat-based tools don't generate variable spend, so there's nothing to cap, alert on, estimate, or circuit-break. Beautiful.ai and Linear both scored 1/2 citing missing "budget caps, usage alerts" — controls that are structurally irrelevant to their pricing model.

The spec already says "missing public evidence → confidence reduction, not score penalty," but the LLM is still penalizing seat-based tools for not having controls that don't apply.

### Proposed Calibration by Category

#### Seat-Based

| Score | Criteria |
|-------|----------|
| **2/2** | Enterprise-grade trust surfaces documented: compliance certifications (SOC 2, GDPR, HIPAA etc.), SSO/SAML, audit logs, admin controls (user management, permissions, role-based access). Trust center or security page exists with substantive content. These are the safety rails that matter for seat-based enterprise buyers. |
| **1/2** | Some security mentions (e.g., "enterprise-grade security" stated but not detailed), OR compliance certs claimed but not documented, OR admin controls exist for enterprise only with no visibility into what non-enterprise tiers get. |
| **0** | No security, compliance, or admin control information publicly available. |

**Subtest reinterpretation for seat-based:**
- T1 (Budget/usage caps): Reinterpret. For seat-based, pass if admin can control seat count and user access (add/remove members, manage permissions). Variable-cost caps are N/A.
- T2 (Alerts): Reinterpret. For seat-based, pass if admin has visibility into team membership and subscription status. Usage-based alerts are N/A.
- T3 (Estimation before spend): N/A for seat-based. Cost = seats × price. Auto-pass.
- T4 (Auditability): Unchanged — audit logs and activity tracking are relevant for any product, regardless of pricing model. Enterprise buyers need this.
- T5 (Admin and access controls): Unchanged — RBAC, SSO, SCIM, admin roles are universally important.
- T6 (Safe failure behavior): Reinterpret. For seat-based, pass if the product documents what happens at plan boundaries (feature restrictions, upgrade prompts) rather than rate limits or circuit breakers. Risk limiters for variable usage are N/A.

**Validation:**
- Beautiful.ai: SOC 2 Type II, CCPA, PCI, GDPR, SSO, audit logs, advanced permissions for Enterprise → **2/2** (was 1/2)
- Linear: SAML/SCIM, granular admin controls, enterprise-grade security, dashboards → **2/2** (was 1/2)
- Notion: Audit logs, admin controls, SSO, SCIM, zero data retention with LLM providers → **2/2** (was 2/2 — holds)

#### Consumption-Based (No Change)
Current spec applies in full. Budget caps, usage alerts, estimation surfaces, rate limits, and circuit breakers are all essential for consumption pricing.

#### Hybrid
Both seat-based trust surfaces (SSO, audit logs, admin controls) AND consumption-based safety rails (caps, alerts, dashboards for the metered component) must be present.

| Score | Criteria |
|-------|----------|
| **2/2** | Enterprise trust surfaces (compliance, SSO, audit logs, admin controls) present. Consumption component has: usage dashboards, alerts/caps for metered usage, and estimation or forecasting tools. |
| **1/2** | Enterprise trust present but consumption safety rails are incomplete (no caps or alerts for metered component), OR strong consumption controls but weak enterprise trust surfaces. |
| **0** | No trust surfaces or safety rails documented for either component. |

#### Platform/Compute (No Change)
Current spec applies. Infrastructure products need full safety rail coverage.

---

## Summary: Score Impact of Calibration

### Seat-Based Validation (Before → After)

| Dimension | Beautiful.ai | Linear | Notion |
|-----------|-------------|--------|--------|
| D1 Product North Star | 1/2 → **2/2*** | 1/2 → 1/2 | 1/2 → 1/2 |
| D5 Cost Driver Mapping | 1/2 → **2/2** | 1/2 → **2/2** | 1/2 → **2/2** |
| D6 Pools & Packaging | 2/2 → 2/2 | 1/2 → **2/2** | 2/2 → 2/2 |
| D7 Overages & Risk | 1/2 → **2/2** | 1/2 → **2/2** | 2/2 → 2/2 |
| D8 Safety Rails & Trust | 1/2 → **2/2** | 1/2 → **2/2** | 2/2 → 2/2 |
| **Total** | **11 → 15** | **11 → 15** | **14 → 15** |

*Beautiful.ai D1 requires pipeline fix to capture /roi-calculator URL.

### Consumption-Based Validation (Before → After)

| Dimension | ElevenLabs | Deepgram | OpenAI | Orb |
|-----------|-----------|----------|--------|-----|
| D1 Product North Star | 1/2 → 1/2 | 2/2 → 2/2 | 1/2 → 1/2 | 1/2 → 1/2 |
| D5 Cost Driver Mapping | 1/2 → **2/2**† | 1/2 → **2/2**† | 1/2 → **2/2**† | 1/2 → 1/2 |
| D6 Pools & Packaging | 2/2 → 2/2 | 2/2 → 2/2 | 2/2 → 2/2 | 0/2 → 0/2 |
| D7 Overages & Risk | 1/2 → **2/2**† | 1/2 → 1/2 | 1/2 → 1/2 | 1/2 → 1/2 |
| D8 Safety Rails & Trust | 1/2 → **2/2**† | 0/2 → **2/2**† | 1/2 → 1/2 | 1/2 → 1/2 |
| **Total** | **12 → 16** | **12 → 14** | **12 → 13** | **8 → 8** |

†Requires pipeline fix (help center/docs subdomain discovery) to capture evidence that exists but was not scraped.

**Key finding:** D5 p50/p95 requirement removed for all categories — no real company publishes this. The remaining consumption D5 gaps are genuine when evidence exists but is on the pricing page (which IS scraped). ElevenLabs/Deepgram/OpenAI all have sufficient driver mapping already published.

### D5 Cross-Category Change
**Removed for ALL categories:** C4 p50/p95 cost-per-value-unit estimates, C5 spike triggers/mitigations.
**Rationale:** p50/p95 is an in-product capability, not a public documentation standard. No company across any category publishes workflow-level cost variance estimates. Spike triggers and mitigations are engineering controls, not pricing transparency artifacts.

---

## Methodology Page Update: Input Surfaces

### Current (on valuetempo.com/methodology)
1. Homepage
2. Pricing page
3. Documentation & API reference
4. Blog & changelog
5. Trust center
6. Use cases & case studies
7. Terms of service — "Overage policies, limit behaviors, renewal/cancellation terms"
8. Community & investor content — "Public demos, architecture posts, community evidence"

### Proposed (replace #7 and #8)
1. Homepage — Primary positioning, outcome claims, ICP signals
2. Pricing page — Tier structure, unit definitions, overage behavior, billing options
3. Documentation & API reference — Cost calculators, usage examples, metering details, quickstarts
4. Blog & changelog — Product updates, case studies with quantified outcomes
5. Trust center — Security controls, compliance certifications, audit surfaces
6. Use cases & case studies — Workflow specificity, customer outcomes, proof artifacts
7. **Help center / Knowledge base** — Overage policies, limit behaviors, cancellation/refund terms, billing FAQs, usage management guides
8. **Billing & plan documentation** — Plan comparison, billing mechanics, seat/credit management, proration rules, upgrade/downgrade behavior

### Rationale
Verified across 7 companies (Beautiful.ai, Linear, Notion, ElevenLabs, Deepgram, OpenAI, Orb): overage policies, cancellation terms, and limit behaviors consistently live in help centers and billing docs, NOT in terms of service. ToS contains legal boilerplate that Rule 8 already excludes as evidence. Community/investor content is not a reliable or scrapeable evidence surface.

### Pipeline URL Patterns Needed

**New subdomain probes (add to scrape-website):**
- `help.{domain}` — Zendesk/Intercom-style help centers
- `support.{domain}` — Support portals
- `docs.{domain}` — Documentation sites

**New high-intent path patterns:**
- `/help/billing`, `/help/refunds`, `/help/plans`, `/help/pricing`
- `/hc/` (Zendesk pattern)
- `/docs/billing*`, `/docs/plans*`, `/docs/credits*`
- `/roi-calculator`, `/roi`, `/calculator`, `/value-calculator`

---

### Hybrid Validation (Before → After)

Current scores from April 1, 2026 reports: Bolt 8/16, Replit 10/16, Vercel 13/16.

| Dimension | Bolt | Replit | Vercel |
|-----------|------|--------|--------|
| D1 Product North Star | 1/2 → 1/2 | 1/2 → 1/2 | 1/2 → 1/2 |
| D5 Cost Driver Mapping | 1/2 → 1/2 | 1/2 → 1/2 | 2/2 → 2/2 |
| D6 Pools & Packaging | 1/2 → **2/2*** | 1/2 → 1/2 | 2/2 → 2/2 |
| D7 Overages & Risk | 1/2 → 1/2 | 1/2 → 1/2 | 2/2 → 2/2 |
| D8 Safety Rails & Trust | 1/2 → 1/2 | 1/2 → 1/2† | 1/2 → 1/2† |
| **Total (5 dims)** | **5 → 6** | **5 → 5** | **9 → 9** |

*Bolt D6: Token rollover + monthly reset cadence is documented ("unused tokens roll over for one additional month"). Exploration path exists (free tier with 300K daily / 1M monthly tokens). Seat tiers clearly differentiated. → Pool rules ARE satisfied under hybrid calibration; current 1/2 is a scoring misfire.

†Replit and Vercel D8: Both mention "advanced spend management" / spend visibility tools, but specific caps and alerts are not publicly documented on scraped pages. Pipeline subdomain discovery (help.vercel.com, billing.replit.com, docs.replit.com billing pages) may unlock 2/2 — flagged as likely pipeline gap, not a genuine absence of controls.

**Key finding for hybrid:** The calibration produces fewer corrections than seat-based because the current spec already partially handles hybrid. Main value is:
1. Bolt D6 corrects a genuine misfire (pool rules WERE documented, subtest was too narrow)
2. D5 and D8 gaps for Bolt/Replit are genuine — consumption component documentation is incomplete on their public pages (no per-token overage price for Bolt, no credit definition for Replit)
3. Vercel already scores correctly — it's the best-documented hybrid in the test set

---

## Implementation Order

1. **Update scoring prompts** in analyze-company edge function — add category-aware subtest logic for D1, D5, D6, D7, D8
2. **Update pipeline** — add help center/docs subdomain probing + ROI calculator URL patterns to highIntentPaths
3. **Update methodology page** at valuetempo.com/methodology — replace ToS and Community inputs with Help center and Billing docs
4. **Validate seat-based** — rerun Beautiful.ai, Linear, Notion and confirm corrected scores
5. **Validate consumption-based** — rerun ElevenLabs, Deepgram, OpenAI and confirm no regression + improved scores where pipeline finds new evidence
6. **Run hybrid examples** (Cursor, GitHub Copilot) to validate hybrid scoring logic
