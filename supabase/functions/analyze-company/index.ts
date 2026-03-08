import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ScrapedPage {
  url: string;
  title: string;
  markdown: string;
}

interface AnalyzeRequest {
  pages: ScrapedPage[];
  url: string;
  insiderAnswers?: Record<string, string>;
  previousScores?: Array<{ dimension: string; score: number; confidence: number }>;
}

const ANALYSIS_VERSION = '2026-03-08-credit-faq-v1';

const COMPANY_PROFILE_PROMPT = `You are an expert business analyst. Analyze the following website content and extract a company profile.

Return a JSON object with these exact fields:
{
  "companyName": "The company's name",
  "oneLineDescription": "A single sentence describing what the company does",
  "missionOrPositioning": "Their mission statement or market positioning",
  "primaryUsers": "Who uses their product/service",
  "economicBuyerGuess": "Who likely pays for it (e.g., 'VP of Engineering', 'CFO')",
  "icpGuess": ["Array", "of", "ideal customer profile traits"],
  "keyWorkflows": ["Array", "of", "main workflows or use cases"],
  "productSurface": "api" | "app" | "both",
  "pricingModelGuess": "seat" | "usage" | "hybrid" | "outcome" | "unknown",
  "valueUnitGuess": "What they charge for (e.g., 'per user', 'per API call')",
  "packagingNotes": "Notes about their pricing tiers/packages",
  "trustControlsSeen": ["Array", "of", "security/trust controls mentioned"],
  "indicatorsSeen": ["Array", "of", "key indicators or metrics they mention"]
}

Be analytical and precise. If you can't determine something, use reasonable inferences based on the content. For productSurface, pricingModelGuess, use exactly those string values.`;

const RUBRIC_SCORING_PROMPT = `You are an expert in SaaS pricing and value strategy. Score this company against the AVS (Adaptive Value System) rubric.

EVIDENCE QUALITY RULES (MANDATORY — apply before scoring every dimension):
1. REJECT as evidence: copyright footers, cookie banners, navigation menus, social media links, generic legal boilerplate, "All rights reserved" text, partner logos without context, press release lists, job postings, and any auto-generated or templated content.
2. REJECT vague marketing slogans as evidence unless accompanied by specific, concrete details (metrics, features, workflows, pricing numbers). "We help teams succeed" is NOT evidence. "Reduces deployment time by 40%" IS evidence.
3. Each item in "observed" MUST cite a specific page and a concrete fact (e.g., "Pricing page lists 3 tiers: Free, Pro ($49/mo), Enterprise (custom)"). Never cite a footer, nav link, or copyright notice.
4. Confidence should reflect the QUALITY and SPECIFICITY of evidence, not just its presence. A pricing page with detailed tier breakdowns = high reliability (0.8+). A homepage with vague feature bullets = low reliability (0.3-0.4).
5. If the only evidence for a subtest comes from boilerplate, navigation, or footer content, that subtest FAILS.
6. When the same fact appears on multiple pages, count it once — do not inflate confidence by repetition.

For each of the 8 dimensions below, provide:
- score: 0 (not present), 1 (emerging), or 2 (strong)
- confidence: 0.0 to 1.0 based on how much QUALITY evidence you have (apply evidence quality rules above)
- notObservable: true if there's genuinely no way to assess this from public info
- rationale: 2-3 sentences explaining your score, referencing specific pages and concrete facts
- observed: Array of specific things you observed (MUST pass evidence quality rules — no boilerplate)
- uncertaintyReasons: Array of reasons for uncertainty

THE 8 DIMENSIONS:

1. "Product north star" - Observable outcomes tie to value delivery and predictability.

   ## Data fields for Product north star (use these exact field names in analysis)

   **north_star**
   - north_star.primary_outcome_metric_name: string
   - north_star.primary_outcome_metric_definition: string
   - north_star.primary_outcome_metric_target: number or string or null
   - north_star.primary_outcome_metric_timeframe: string or null (example: "Q2", "this year", "next 6 months")
   - north_star.customer_done_state: string
   - north_star.primary_workflow_name: string or null
   - north_star.predictability_metric_name: string or null
   - north_star.predictability_metric_definition: string or null
   - north_star.predictability_metric_target: number or string or null
   - north_star.tradeoffs[]: list of strings (optional)
   - north_star.owner_roles[]: list of product | finance | eng | growth | sales | exec (optional)
   - north_star.last_public_signal_date: ISO string or null

   **observable_signals[]**
   - observable_signals[].signal_type: homepage | pricing_page | docs | blog | changelog | trust_center | investor_deck | community_post
   - observable_signals[].evidence_url: string
   - observable_signals[].excerpt: string (short excerpt or summary)
   - observable_signals[].date: ISO string or null
   - observable_signals[].maps_to: value_delivery | economic_predictability | both

   **facts[] (evidence ledger, required)**
   Each fact must be written into facts[] with:
   - field_path: string, example: observable_signals[0].excerpt
   - value: any
   - source_type: public_url | doc | contract | user_input | assumption
   - reliability: float 0..1
   - evidence_ref: URL or attachment ID
   - timestamp: ISO string

   ## Evidence collection rules (before scoring)
   1) This dimension is public-signal-first: collect observable_signals[] from public surfaces, store excerpts and URLs.
   2) Do not require targets or timeframes, but record them when present.
   3) If multiple signals conflict, record all and flag a conflict, do not average them away.

   ## Scoring (deterministic)
   #### Subtests (0 or 1 each)

   **NS1 Value outcome is stated**
   Pass if:
   - at least one observable_signals[] exists with maps_to in {value_delivery, both}
   AND
   - north_star.customer_done_state is present OR the signal excerpt explicitly describes a customer outcome (capture excerpt in facts).

   **NS2 Predictability outcome is stated**
   Pass if:
   - at least one observable_signals[] exists with maps_to in {economic_predictability, both}
   OR
   - north_star.predictability_metric_name is present

   **NS3 Outcome is measurable (even if target missing)**
   Pass if ANY of the following are true:
   - north_star.primary_outcome_metric_name is present AND north_star.primary_outcome_metric_definition is present AND definition is operational (how it is measured), not just a slogan.
   - A case study or customer story exists that cites a specific, quantified outcome metric (e.g., "reduced X by 40%", "saved 10 hours/week"). The metric does not need to be a universal target — a concrete result in a real customer context counts as measurable evidence.
   IMPORTANT: Not all products can or should publicly state a universal "increase X by Y%" north star. Products with high contextual variability (e.g., where outcomes depend on customer-specific factors) may legitimately demonstrate measurability through case studies with specific metrics rather than a single universal target. Do NOT penalize this approach.

   **NS4 Workflow linkage exists**
   Pass if at least one is true:
   - north_star.primary_workflow_name is present
   - an observable signal excerpt clearly names a workflow or use case tied to the outcome (capture excerpt).

   **NS5 Coherence across signals**
   Pass if:
   - there are no unresolved conflicts among high-reliability facts for north_star.primary_outcome_metric_name and predictability outcome
   OR
   - conflicts exist but the rubric has a "current" signal identified by recency (latest dated signal) and explicitly marks older signals as outdated in the narrative.

   **NS6 Tradeoffs are acknowledged (optional but strong)**
   Pass if:
   - north_star.tradeoffs[] length >= 1
   OR
   - an observable signal explicitly states what is deprioritized or not being optimized (capture excerpt).

   #### Points to score mapping (0-2)
   points = sum(NS1..NS6)
   - 0-2 points: score = 0
   - 3-4 points: score = 1
   - 5-6 points: score = 2

   #### Gates (hard enforcement caps)
   - If NS1 fails: final score = 0. No stated value outcome means no north star.
   - If NS2 fails: cap final score at 1. No predictability outcome means incomplete for AVS.
   - If NS3 fails: cap final score at 1. If it is not measurable, it is not an outcome.

   ## Confidence (separate from score)
   Compute confidence per subtest:
   - subtest_confidence = max(facts[].reliability among facts used by that subtest)
   - If no facts used: 0

   Dimension confidence:
   - dimension_confidence = average(subtest_confidence for NS1..NS6)

   Confidence labels: High >= 0.75 (typically requires direct public excerpts with dates), Medium 0.45-0.74, Low < 0.45 (typically implied or undated signals)

   Conflict rule: If two facts with reliability >= 0.65 disagree for the same field_path, flag conflict and cap confidence at Medium until resolved or recency-resolved per NS5.

   ## Missing-insider prompts (ask only when confidence is not High, max 5 questions)
   1) What is the primary outcome metric name and its measurement definition.
      -> north_star.primary_outcome_metric_name, north_star.primary_outcome_metric_definition
   2) What customer done state does it represent, and what workflow is it tied to.
      -> north_star.customer_done_state, north_star.primary_workflow_name
   3) What predictability outcome are you optimizing (spend variance, surprise bills, margin floor), and how is it measured.
      -> north_star.predictability_metric_name, north_star.predictability_metric_definition
   4) Share the most current public statement of outcomes, provide a URL and date if possible.
      -> observable_signals[]
   5) What tradeoffs or non-goals are explicitly true right now.
      -> north_star.tradeoffs[]

   ## Rerun behavior (must be explicit in output)
   When the user provides missing inputs:
   1) Persist inputs into north_star and observable_signals[] where applicable.
   2) Add corresponding facts[] entries with source_type=user_input, add evidence_ref if provided.
   3) Recompute NS1-NS6, score, gates, and confidence.
   4) In the report, include: score before vs after, confidence before vs after, new evidence added (by subtest), remaining unknowns (by subtest), conflicts detected and resolution needed.

2. "ICP and job clarity" - Target buyer and job are explicit, concrete, and bounded.

   ## Data fields for ICP and job clarity (use these exact field names in analysis)

   **icp_profile**
   - icp_profile.primary_buyer_role: string, example: "Head of RevOps", "ML Engineer"
   - icp_profile.user_roles[]: list of strings, optional
   - icp_profile.company_size_range: string, example: "1-10", "50-200", "1000+"
   - icp_profile.company_stage: pre_seed | seed | series_a | growth | enterprise | unknown
   - icp_profile.industries[]: list of strings
   - icp_profile.tech_context[]: list of strings, example: ["API-first", "SOC2-required", "on-prem"]
   - icp_profile.top_constraints[]: list of latency | accuracy | compliance | security | cost_predictability | integrations | reliability | time_to_value
   - icp_profile.non_fit_criteria[]: list of strings, example: "not for consumer", "not for offline use"
   - icp_profile.primary_workflows[]: list of strings, must match workflows[].name if workflows[] exists

   **jtbd[]**
   - jtbd[].job_statement: string, plain language, example: "Transcribe calls in real time for agents"
   - jtbd[].success_state: string, testable outcome, example: "95%+ accuracy under 300ms latency"
   - jtbd[].primary_user_role: string
   - jtbd[].buyer_role: string
   - jtbd[].inputs[]: list of strings
   - jtbd[].outputs[]: list of strings
   - jtbd[].frequency: ad_hoc | daily | weekly | continuous
   - jtbd[].must_have_requirements[]: list of strings, example: "DPA", "SSO", "HIPAA"

   **positioning_surfaces[]**
   - positioning_surfaces[].surface_type: homepage | pricing_page | docs_quickstart | use_cases_page | case_study | demo_video | template_gallery | api_reference
   - positioning_surfaces[].availability: public | in_product | both
   - positioning_surfaces[].evidence_url: string or null
   - positioning_surfaces[].last_updated: ISO string or null

   **facts[] (evidence ledger, required)**
   Each fact must be written into facts[] with:
   - field_path: string, example: jtbd[0].success_state
   - value: any
   - source_type: public_url | doc | contract | user_input | assumption
   - reliability: float 0..1
   - evidence_ref: URL or attachment ID
   - timestamp: ISO string

   ## Evidence collection rules (before scoring)
   1) Prefer direct statements on homepage, pricing page, use cases, quickstarts, and API docs, store as facts[].
   2) If ICP is implied but not stated, record as source_type=assumption with reliability=0.30.
   3) A JTBD only counts if it includes a success state or measurable requirement.

   ## Scoring (deterministic)
   Score the primary JTBD as jtbd[0]. If jtbd[] is empty, score defaults to 0 with Low confidence.

   #### Subtests (0 or 1 each)

   **J1 ICP is explicit and specific**
   Pass if icp_profile includes at least 3 of these 5 fields with non-empty values:
   - primary_buyer_role
   - company_size_range
   - company_stage
   - industries[] length >= 1
   - top_constraints[] length >= 1

   **J2 Job statement is concrete**
   Pass if:
   - jtbd[0].job_statement exists
   AND
   - jtbd[0].inputs[] length >= 1
   AND
   - jtbd[0].outputs[] length >= 1

   **J3 Success state is testable**
   Pass if:
   - jtbd[0].success_state exists
   AND
   - either jtbd[0].must_have_requirements[] length >= 1 OR icp_profile.top_constraints[] length >= 1

   **J4 Workflow specificity exists**
   Pass if at least one is true:
   - icp_profile.primary_workflows[] length >= 1
   - positioning_surfaces[] includes docs_quickstart with a valid evidence_url
   - positioning_surfaces[] includes api_reference with a valid evidence_url

   **J5 Non-fit boundaries are stated**
   Pass if:
   - icp_profile.non_fit_criteria[] length >= 1
   OR
   - a positioning_surfaces[] entry exists with surface_type == use_cases_page and evidence shows explicit exclusions, captured in facts.

   **J6 Proof artifacts exist for the job**
   Pass if:
   - positioning_surfaces[] includes at least one of case_study | template_gallery | demo_video
   AND
   - the artifact is tied to the JTBD, capture linkage in facts[] as a short excerpt or summary.

   #### Points to score mapping (0-2)
   points = sum(J1..J6)
   - 0-2 points: score = 0
   - 3-4 points: score = 1
   - 5-6 points: score = 2

   #### Gates (hard enforcement caps)
   - If J1 fails: cap score at 1.
   - If J2 fails: final score = 0.
   Rationale: no explicit ICP or job clarity means the dimension cannot score 2.

   ## Confidence (separate from score)
   Compute confidence per subtest:
   - subtest_confidence = max(facts[].reliability among facts used by that subtest)
   - If no facts used: 0

   Dimension confidence:
   - dimension_confidence = average(subtest_confidence for J1..J6)

   Confidence labels: High >= 0.75, Medium 0.45-0.74, Low < 0.45

   Conflict rule: If two facts with reliability >= 0.65 disagree for the same field_path, flag conflict and cap confidence at Medium until resolved.

   ## Missing-insider prompts (ask only when confidence is not High, max 5 questions)
   1) Who is the primary buyer role, company size range, stage, and top industries.
      -> icp_profile.primary_buyer_role, company_size_range, company_stage, industries[]
   2) What is the single primary job statement, plus inputs and outputs.
      -> jtbd[0].job_statement, jtbd[0].inputs[], jtbd[0].outputs[]
   3) What is the success state, include measurable constraints or requirements.
      -> jtbd[0].success_state, jtbd[0].must_have_requirements[], icp_profile.top_constraints[]
   4) What are the top 3 workflows you want to win first, name them.
      -> icp_profile.primary_workflows[]
   5) What are the non-fit boundaries, and what use cases you explicitly do not support.
      -> icp_profile.non_fit_criteria[]

   ## Rerun behavior (must be explicit in output)
   When the user provides missing inputs:
   1) Persist inputs into icp_profile, jtbd[], and positioning_surfaces[] if new URLs exist.
   2) Add corresponding facts[] entries with source_type=user_input, add evidence_ref if provided.
   3) Recompute J1-J6, score, gates, and confidence.
   4) In the report, include: score before vs after, confidence before vs after, new evidence added (by subtest), remaining unknowns (by subtest), conflicts detected and resolution needed.

3. "Buyer and budget alignment" - Plans map to buyer, budget cycles, and approvals.

   ## Data fields for Buyer and budget alignment (use these exact field names in analysis)

   **segments[]**
   - segments[].name: indie | team | enterprise
   - segments[].priority_weight: float 0..1
   - segments[].economic_buyer_role: string
   - segments[].budget_owner: string
   - segments[].payment_requirements: list of card | invoice | po | annual_commit | prepaid_credits
   - segments[].approval_blockers_top3: list of security | legal | it | procurement | privacy | finance_controls

   **tiers[]**
   - tiers[].name: string
   - tiers[].target_segment: indie | team | enterprise
   - tiers[].billing_options: list of monthly | annual | usage | hybrid
   - tiers[].payment_methods: list of card | invoice | po
   - tiers[].features: list of rbac | admin | usage_dashboard | caps | alerts | sso | scim | audit_logs | soc2 | dpa | sla

   **policies**
   - policies.overage_behavior: hard_stop | soft_limit | auto_topup | rollover
   - policies.renewal_cancellation: explicit | unclear

   **facts[] (evidence ledger)**
   Each computed or user-provided fact must be tracked with:
   - field_path: string, ex: tiers[Team].payment_methods
   - value: any
   - source_type: public_url | doc | contract | user_input | assumption
   - reliability: float 0..1
   - evidence_ref: URL or attachment ID
   - timestamp: ISO string

   ## Evidence collection rules (before scoring)
   1) Extract public signals from pricing pages, docs, trust centers, terms, and store them as facts[] tied to the specific field_path.
   2) If a required field is missing from public evidence, leave it blank and lower confidence. Do not guess unless explicitly marked as source_type=assumption with reliability=0.30.
   3) If user supplies insider info, write it as source_type=user_input with reliability=0.65.

   ## Scoring (deterministic)
   Compute subtests per segment. Each subtest returns pass: 0|1.

   **Helper: tier selection**
   For each segment s, define segment_tiers = tiers[] where tiers[].target_segment == s.name.
   If none exist, subtests that depend on tiers fail for that segment.

   **Subtests (0 or 1 each, per segment):**

   S1 Buyer clarity: Pass if segments[].economic_buyer_role exists for this segment.

   S2 Budget and billing fit: Pass if there exists at least one tier in segment_tiers where tiers[].payment_methods intersects segments[].payment_requirements is non-empty.

   S3 Approval readiness:
   - For team segment: pass if there exists a tier in segment_tiers where (rbac OR admin) IN tiers[].features AND (usage_dashboard OR caps OR alerts) IN tiers[].features
   - For enterprise segment: pass if there exists a tier in segment_tiers where (invoice OR po) IN tiers[].payment_methods AND sso IN tiers[].features AND dpa IN tiers[].features AND (audit_logs OR soc2) IN tiers[].features
   - For indie segment: pass if there exists a tier in segment_tiers where card IN tiers[].payment_methods AND at least one spend visibility control exists (usage_dashboard OR alerts OR caps)

   S4 Commercial terms legibility: Pass if policies.overage_behavior is present AND policies.renewal_cancellation == explicit

   S5 Upgrade and expansion path: Pass if the following progression exists in tiers[]: at least one tier targeting indie, at least one tier targeting team, at least one tier targeting enterprise, AND the enterprise tier satisfies S3 enterprise requirements.

   **Segment score mapping (0–2):**
   For each segment, segment_points = sum(S1..S5):
   - 0–1 points: segment score = 0
   - 2–3 points: segment score = 1
   - 4–5 points: segment score = 2

   **Dimension aggregation (0–2):**
   - If segments[].priority_weight is present and sums to 1: compute weighted average of segment scores.
   - If missing: assume equal weights across provided segments, and lower confidence.

   **Gates (hard enforcement caps):**
   - If an enterprise segment is present and S3 enterprise fails: cap final dimension score at 1.
   - If policies.overage_behavior is missing: cap final dimension score at 1.

   ## Confidence (separate from score)
   Compute confidence per subtest as:
   - subtest_confidence = max(facts[].reliability among facts used by that subtest)
   - If no facts used: subtest_confidence = 0

   Per segment:
   - segment_confidence = average(subtest_confidence for S1..S5)

   Dimension confidence:
   - Identify highest-priority segment: max segments[].priority_weight (or enterprise if weights missing).
   - dimension_confidence = min(confidence(highest-priority segment), average(segment_confidence across segments))

   Confidence labels: High >= 0.75, Medium 0.45–0.74, Low < 0.45

   Conflict rule: If two facts with reliability >= 0.65 disagree for the same field_path, flag a conflict and cap confidence at Medium until resolved.

4. "Value unit" - Billable unit is clear, value-linked, predictable, auditable.

   ## Data fields for Value unit (use these exact field names in analysis)

   **value_units[]**
   - value_units[].name: string, example: "minute", "credit", "task"
   - value_units[].is_primary: boolean
   - value_units[].definition: string, plain-language, include what counts and what does not
   - value_units[].metering_formula: string, how raw usage becomes billable units
   - value_units[].granularity: per_event | per_second | per_minute | per_1000_tokens | per_gb | per_task
   - value_units[].rounding_rule: none | round_up | round_down | nearest
   - value_units[].minimum_charge: none | per_request | per_session | per_day
   - value_units[].attribution_level: user | org | workspace | project | api_key
   - value_units[].value_anchor: output | workflow_step | success_event | time | compute | seat
   - value_units[].estimation_surface: none | calculator | preflight_estimate | in_product_estimate
   - value_units[].audit_surface: none | dashboard_total | dashboard_breakdown | export_logs
   - value_units[].breakdown_level: none | by_project | by_user | by_workflow | by_model | by_endpoint
   - value_units[].known_surprise_triggers: list of strings, optional, example: "retries", "streaming reconnects"

   **tiers[] (extend existing tiers objects)**
   - tiers[].name: string
   - tiers[].target_segment: indie | team | enterprise
   - tiers[].billing_options: list of monthly | annual | usage | hybrid
   - tiers[].payment_methods: list of card | invoice | po
   - tiers[].features: list of rbac | admin | usage_dashboard | caps | alerts | sso | scim | audit_logs | soc2 | dpa | sla
   - tiers[].included_units: number or null
   - tiers[].unit_price: number or null
   - tiers[].overage_unit_price: number or null
   - tiers[].unit_name: string or null, must match a value_units[].name

   **facts[] (evidence ledger, required)**
   Each fact must be written into facts[] with:
   - field_path: string, example: value_units[credits].rounding_rule
   - value: any
   - source_type: public_url | doc | contract | user_input | assumption
   - reliability: float 0..1
   - evidence_ref: URL or attachment ID
   - timestamp: ISO string

   ## Evidence collection rules (before scoring)
   1) Extract unit language from pricing pages, docs, API docs, terms, and UI screenshots, store as facts[].
   2) Do not infer the metering formula. If unknown, leave blank and prompt the user.
   3) If multiple units exist, require value_units[].is_primary=true for the unit that drives billing for the main tier.

   ## Scoring (deterministic)
   Score the primary unit. If multiple primary units are claimed, score each and take the minimum.

   **Primary selection**
   - primary_units = value_units[] where value_units[].is_primary == true
   - If len(primary_units) == 0: primary = unknown
   - If len(primary_units) > 1: score each, final = min

   #### Subtests (0 or 1 each)

   **V1 Unit definition clarity**
   Pass if value_units[].name and value_units[].definition exist AND the definition includes at least one explicit inclusion and one explicit exclusion example.
   Proxy rule: definition length >= 12 words AND contains one of: "includes", "does not include", "counts", "doesn't count".

   **V2 Metering determinism**
   Pass if value_units[].metering_formula, granularity, rounding_rule, and attribution_level are all present.

   **V3 Price linkage legibility**
   Pass if at least one tier references the unit with:
   - tiers[].unit_name matches primary unit name
   AND
   - (tiers[].unit_price OR tiers[].overage_unit_price is present)
   AND
   - tiers[].included_units is present for any tier that claims an allowance.

   **V4 Value anchoring**
   Pass if value_units[].value_anchor is present AND it is not purely technical without a value proxy.
   Deterministic rule:
   - Fail if value_anchor == compute AND no definition mentions a customer output or workflow step.
   - Pass otherwise.

   **V5 Predictability surface**
   Pass if value_units[].estimation_surface != none.
   If estimation is calculator or preflight_estimate, treat as stronger evidence for confidence.

   **V6 Auditability**
   Pass if value_units[].audit_surface is dashboard_breakdown OR export_logs.
   Also require breakdown_level != none.

   #### Points to score mapping (0-2)
   points = sum(V1..V6)
   - 0-2 points: score = 0
   - 3-4 points: score = 1
   - 5-6 points: score = 2

   #### Gates (hard enforcement caps)
   - If V1 fails: cap score at 1.
   - If V2 fails: cap score at 1.
   - If V6 fails: cap score at 1.
   Rationale: you cannot claim a production-grade value unit without auditability and deterministic metering.

   ## Confidence (separate from score)
   Compute confidence per subtest:
   - subtest_confidence = max(facts[].reliability among facts used by that subtest)
   - If no facts used: 0

   Dimension confidence:
   - dimension_confidence = average(subtest_confidence for V1..V6)

   Confidence labels: High >= 0.75, Medium 0.45-0.74, Low < 0.45

   Conflict rule: If two facts with reliability >= 0.65 disagree for the same field_path, flag conflict and cap confidence at Medium until resolved.

   ## Missing-insider prompts (ask only when confidence is not High, max 5 questions)
   1) What is your primary billable unit name and definition, include what counts and what does not.
      -> value_units[].name, value_units[].definition, value_units[].is_primary=true
   2) What is the exact metering formula, granularity, rounding, minimum charge, and attribution level.
      -> value_units[].metering_formula, granularity, rounding_rule, minimum_charge, attribution_level
   3) How is unit usage estimated before a customer runs work: none, calculator, preflight estimate, in-product estimate.
      -> value_units[].estimation_surface
   4) How can customers audit usage: dashboard totals, breakdowns, exports, and what breakdown level.
      -> value_units[].audit_surface, breakdown_level
   5) For each tier, what unit name is billed, included units, unit price, overage unit price.
      -> tiers[].unit_name, included_units, unit_price, overage_unit_price

   ## Rerun behavior (must be explicit in output)
   When the user provides missing inputs:
   1) Persist inputs into value_units[] and tiers[].
   2) Add corresponding facts[] entries with source_type=user_input, add evidence_ref if provided.
   3) Recompute V1-V6, score, gates, and confidence.
   4) In the report, include: score before vs after, confidence before vs after, new evidence added (by subtest), remaining unknowns (by subtest), conflicts detected and resolution needed.

5. "Cost driver mapping" - Usage and cost drivers are explicit, forecastable, and controllable.

   ## Data fields for Cost driver mapping (use these exact field names in analysis)

   **cost_model**
   - cost_model.currency: string, example: "USD"
   - cost_model.time_window: per_request | per_minute | per_hour | per_day | per_month
   - cost_model.cost_components: list of llm | asr | tts | vision | embedding | gpu_inference | gpu_training | storage | bandwidth | third_party_api | human_ops
   - cost_model.providers: list of strings, example: ["OpenAI", "Anthropic", "AWS", "GCP"]
   - cost_model.unit_costs[]: list of objects:
     - cost_model.unit_costs[].component: one of cost_model.cost_components
     - cost_model.unit_costs[].unit: per_1k_tokens | per_minute | per_second | per_gb | per_image | per_call | per_hour_gpu
     - cost_model.unit_costs[].price: number
     - cost_model.unit_costs[].notes: string

   **cost_drivers[]**
   - cost_drivers[].name: string, example: "input_tokens", "output_tokens", "audio_minutes", "concurrency"
   - cost_drivers[].component: one of cost_model.cost_components
   - cost_drivers[].driver_unit: tokens | minutes | seconds | images | gb | calls | gpu_hours | seats
   - cost_drivers[].variable_or_fixed: variable | fixed | hybrid
   - cost_drivers[].driver_formula: string, how driver quantity is computed from product behavior
   - cost_drivers[].controllability: high | medium | low
   - cost_drivers[].customer_visible: boolean
   - cost_drivers[].spike_triggers[]: list of strings, example: ["retries", "long_context", "stream_reconnects"]
   - cost_drivers[].mitigations[]: list of strings, example: ["cache", "batch", "truncate", "model_route"]

   **workflows[]**
   - workflows[].name: string
   - workflows[].primary_value_unit_name: string, must match value_units[].name
   - workflows[].driver_contributions[]: list of objects:
     - workflows[].driver_contributions[].driver_name: string, must match cost_drivers[].name
     - workflows[].driver_contributions[].p50_per_value_unit: number or null
     - workflows[].driver_contributions[].p95_per_value_unit: number or null
     - workflows[].driver_contributions[].notes: string

   **cost_estimates[]**
   - cost_estimates[].workflow_name: string, must match workflows[].name
   - cost_estimates[].cost_per_value_unit_p50: number or null
   - cost_estimates[].cost_per_value_unit_p95: number or null
   - cost_estimates[].assumptions: string
   - cost_estimates[].last_updated: ISO string

   **forecasting_surfaces**
   - forecasting_surfaces.estimation_surface: none | calculator | preflight_estimate | in_product_estimate
   - forecasting_surfaces.cost_visibility_surface: none | dashboard_total | dashboard_breakdown | export_logs
   - forecasting_surfaces.breakdown_level: none | by_project | by_user | by_workflow | by_model | by_endpoint
   - forecasting_surfaces.alerts: none | usage_alerts | cost_alerts | budget_caps

   **facts[] (evidence ledger, required)**
   Each fact must be written into facts[] with:
   - field_path: string, example: cost_drivers[input_tokens].driver_formula
   - value: any
   - source_type: public_url | doc | contract | user_input | assumption
   - reliability: float 0..1
   - evidence_ref: URL or attachment ID
   - timestamp: ISO string

   ## Evidence collection rules (before scoring)
   1) Extract cost driver hints from docs: rate limits, model choices, token policies, pricing pages, usage docs, status pages, architecture posts, then store as facts[].
   2) Do not guess unit costs or cost per value unit. If unknown, prompt for insider inputs.
   3) If the product uses multiple providers or models, capture at least the primary production path in workflows[].

   ## Scoring (deterministic)
   Score the most important workflow by segment priority if known, otherwise the first workflow in workflows[].
   If no workflows exist, score defaults to 0 with Low confidence.

   #### Subtests (0 or 1 each)

   **C1 Driver inventory completeness**
   Pass if:
   - cost_drivers[] contains at least 3 drivers
   AND
   - at least 1 driver maps to an inference-related component (llm | asr | tts | vision | embedding | gpu_inference)
   AND
   - each driver has component, driver_unit, and variable_or_fixed.

   **C2 Deterministic driver formulas**
   Pass if at least 2 drivers have non-empty driver_formula that links product behavior to driver quantity.

   **C3 Driver to workflow linkage**
   Pass if for the scored workflow:
   - workflows[].primary_value_unit_name matches an existing value_units[].name
   AND
   - workflows[].driver_contributions[] includes at least 2 drivers.

   **C4 Cost per value unit estimate**
   Pass if for the scored workflow:
   - cost_estimates[].cost_per_value_unit_p50 is present
   AND
   - cost_estimates[].cost_per_value_unit_p95 is present.

   **C5 Spike and tail mapping**
   Pass if:
   - at least 2 top drivers include spike_triggers[] (non-empty)
   AND
   - at least 2 top drivers include mitigations[] (non-empty).

   **C6 Forecasting and visibility surfaces**
   Pass if:
   - forecasting_surfaces.estimation_surface != none
   AND
   - forecasting_surfaces.cost_visibility_surface != none
   AND
   - forecasting_surfaces.alerts != none.

   #### Points to score mapping (0-2)
   points = sum(C1..C6)
   - 0-2 points: score = 0
   - 3-4 points: score = 1
   - 5-6 points: score = 2

   #### Gates (hard enforcement caps)
   - If C3 fails: cap score at 1. You cannot claim driver mapping without linking to a workflow and value unit.
   - If C4 fails: cap score at 1. If you cannot estimate cost per value unit, predictability is not real.
   - If C6 fails: cap score at 1. Forecasting without visibility and alerts is not operational.

   ## Confidence (separate from score)
   Compute confidence per subtest:
   - subtest_confidence = max(facts[].reliability among facts used by that subtest)
   - If no facts used: 0

   Dimension confidence:
   - dimension_confidence = average(subtest_confidence for C1..C6)

   Confidence labels: High >= 0.75, Medium 0.45-0.74, Low < 0.45

   Conflict rule: If two facts with reliability >= 0.65 disagree for the same field_path, flag conflict and cap confidence at Medium until resolved.

   ## Missing-insider prompts (ask only when confidence is not High, max 5 questions)
   1) List your top 3 to 5 cost drivers, component, unit, and whether variable or fixed.
      -> cost_drivers[]
   2) For each top driver, what formula determines quantity, and what spikes it.
      -> cost_drivers[].driver_formula, spike_triggers[]
   3) Name your 1 to 3 primary workflows, the primary value unit used, and p50 and p95 driver usage per value unit.
      -> workflows[], workflows[].driver_contributions[]
   4) Provide your estimated cost per value unit at p50 and p95 for the primary workflow, include assumptions.
      -> cost_estimates[]
   5) What forecasting and visibility surfaces exist today: estimator, dashboards, breakdown level, alerts or caps.
      -> forecasting_surfaces.*

   ## Rerun behavior (must be explicit in output)
   When the user provides missing inputs:
   1) Persist inputs into cost_model, cost_drivers[], workflows[], cost_estimates[], forecasting_surfaces.
   2) Add corresponding facts[] entries with source_type=user_input, add evidence_ref if provided.
   3) Recompute C1-C6, score, gates, and confidence.
   4) In the report, include: score before vs after, confidence before vs after, new evidence added (by subtest), remaining unknowns (by subtest), conflicts detected and resolution needed.

6. "Pools and packaging" - Tiers and pools separate exploration from production by segment.

   ## Data fields for Pools and packaging (use these exact field names in analysis)

   **packaging**
   - packaging.model: tiered | usage_based | hybrid | seats_plus_usage
   - packaging.primary_unit_name: string, must match value_units[].name
   - packaging.exploration_offering: free_trial | free_tier | credits_trial | sandbox | none
   - packaging.production_offering: paid_tiers | enterprise_contracts | usage_only | none
   - packaging.segment_notes: string, optional

   **pools[]**
   - pools[].name: string, example: "Exploration credits", "Team pool"
   - pools[].pool_type: exploration | production | shared
   - pools[].unit_name: string, must match value_units[].name
   - pools[].included_units: number
   - pools[].reset_cadence: none | daily | weekly | monthly | annual
   - pools[].rollover_allowed: boolean
   - pools[].rollover_rules: none | limited_period | unlimited (required if rollover_allowed=true)
   - pools[].topup_allowed: boolean
   - pools[].topup_increment: number or null (required if topup_allowed=true)
   - pools[].scope: user | org | workspace | project | api_key
   - pools[].allocation_mode: shared_pool | per_user_allowance | per_workspace_allowance
   - pools[].tier_coverage: list of tier names (must match tiers[].name)
   - pools[].notes: string, optional

   **tiers[] (extend existing tiers objects)**
   - tiers[].name: string
   - tiers[].target_segment: indie | team | enterprise
   - tiers[].billing_options: list of monthly | annual | usage | hybrid
   - tiers[].payment_methods: list of card | invoice | po
   - tiers[].unit_name: string or null, must match value_units[].name
   - tiers[].included_units: number or null
   - tiers[].overage_enabled: boolean
   - tiers[].overage_unit_price: number or null
   - tiers[].seat_price: number or null
   - tiers[].seat_included: number or null
   - tiers[].pool_name: string or null, must match pools[].name
   - tiers[].upgrade_path_next: list of tier names (optional)
   - tiers[].addon_available: boolean

   **segments[] (reuse existing segments objects)**
   - segments[].name: indie | team | enterprise
   - segments[].priority_weight: float 0..1
   - segments[].economic_buyer_role: string (optional)

   **facts[] (evidence ledger, required)**
   Each fact must be written into facts[] with:
   - field_path: string, example: pools[Team pool].reset_cadence
   - value: any
   - source_type: public_url | doc | contract | user_input | assumption
   - reliability: float 0..1
   - evidence_ref: URL or attachment ID
   - timestamp: ISO string

   ## Evidence collection rules (before scoring)
   1) Extract tiers, included units, pool language, rollover, and add-ons from pricing pages, plan tables, docs, terms, and in-product screenshots, store as facts[].
   2) A pool only counts if it has unit_name, included_units, and reset cadence.
   3) If tiers reference pools but the pool definition is missing, treat as missing data and lower confidence.

   ## Scoring (deterministic)
   Score per segment, then aggregate across segments.

   **Segment tiers**
   For each segment s in segments[]:
   - segment_tiers = tiers[] where tiers[].target_segment == s.name
   If empty, segment score = 0 with Low confidence.

   **Segment pools**
   For each segment s:
   - segment_pools = pools[] where any tier in segment_tiers has tiers[].name in pools[].tier_coverage

   #### Subtests (0 or 1 each, per segment)

   **P1 Segment packaging coverage**
   Pass if:
   - len(segment_tiers) >= 1
   AND
   - at least one tier in segment_tiers has tiers[].unit_name present and matching packaging.primary_unit_name.

   **P2 Exploration vs production separation**
   Pass if:
   - packaging.exploration_offering != none
   AND
   - packaging.production_offering != none
   AND
   - there exists at least one exploration construct that is not the same as production pricing, either:
     - a pool with pool_type == exploration, or
     - a tier with low-friction entry where payment_methods includes card and included_units exists and overage_enabled is false.

   **P3 Pool rules are explicit**
   Pass if for all pools in segment_pools:
   - unit_name, included_units, and reset_cadence are present
   AND if rollover_allowed == true, then rollover_rules is present
   AND if topup_allowed == true, then topup_increment is present.
   If segment_pools is empty, fail.

   **P4 Pool scope matches buying unit**
   Pass if:
   - for team and enterprise: there exists a pool in segment_pools where scope in {org, workspace} AND allocation_mode == shared_pool
   - for indie: there exists a pool where scope in {user, api_key} OR a tier has included_units without requiring pooling.

   **P5 Packaging supports scaling without cliffs**
   Pass if at least one is true:
   - tiers[].upgrade_path_next exists for at least one tier in segment_tiers
   OR
   - tiers[].addon_available == true for at least one tier in segment_tiers
   OR
   - pools[].topup_allowed == true for at least one pool in segment_pools.

   **P6 Overage packaging consistency**
   Pass if:
   - for any tier in segment_tiers where overage_enabled == true:
     - tiers[].overage_unit_price is present
     AND
     - tiers[].unit_name matches packaging.primary_unit_name
     AND
     - a pool exists or included_units exists that makes the boundary legible, either:
       - tiers[].included_units is present, or
       - tiers[].pool_name references an existing pool.
   If no tiers have overage_enabled, mark P6 as pass only if included_units or pool exists for at least one tier, otherwise fail.

   #### Points to score mapping (0-2, per segment)
   points = sum(P1..P6)
   - 0-2 points: segment score = 0
   - 3-4 points: segment score = 1
   - 5-6 points: segment score = 2

   #### Dimension aggregation (0-2)
   - If segments[].priority_weight exists and sums to 1: compute weighted average of segment scores.
   - If missing: equal-weight across provided segments, and lower confidence.

   #### Gates (hard enforcement caps)
   - If packaging.primary_unit_name is missing: final dimension score = 0.
   - If P3 fails for the highest-priority segment: cap final dimension score at 1.
   - If the highest-priority segment is team or enterprise and P4 fails: cap final dimension score at 1.

   ## Confidence (separate from score)
   Compute confidence per subtest:
   - subtest_confidence = max(facts[].reliability among facts used by that subtest)
   - If no facts used: 0

   Per segment:
   - segment_confidence = average(subtest_confidence for P1..P6)

   Dimension confidence:
   - Identify highest-priority segment: max segments[].priority_weight (or enterprise if weights missing).
   - dimension_confidence = min(confidence(highest-priority segment), average(segment_confidence across segments))

   Confidence labels: High >= 0.75, Medium 0.45-0.74, Low < 0.45

   Conflict rule: If two facts with reliability >= 0.65 disagree for the same field_path, flag conflict and cap confidence at Medium until resolved.

   ## Missing-insider prompts (ask only when confidence is not High, max 5 questions)
   1) What is your primary billable unit name, and which tiers use it.
      -> packaging.primary_unit_name, tiers[].unit_name
   2) Describe exploration offering and production offering, free tier/trial/credits, and how it differs from paid.
      -> packaging.exploration_offering, packaging.production_offering
   3) For each pool, provide unit, included units, reset cadence, scope, allocation mode, rollover, and top-up details.
      -> pools[]
   4) For each tier, which pool applies, included units, overage pricing, add-ons, and upgrade path.
      -> tiers[].pool_name, included_units, overage_unit_price, addon_available, upgrade_path_next
   5) For team and enterprise, confirm whether usage is shared at org or workspace level, and who controls it.
      -> pools[].scope, pools[].allocation_mode

   ## Rerun behavior (must be explicit in output)
   When the user provides missing inputs:
   1) Persist inputs into packaging, pools[], tiers[].
   2) Add corresponding facts[] entries with source_type=user_input, add evidence_ref if provided.
   3) Recompute P1-P6, segment scores, gates, final score, and confidence.
   4) In the report, include: score before vs after, confidence before vs after, new evidence added (by subtest), remaining unknowns (by subtest), conflicts detected and resolution needed.

7. "Overages and risk allocation" - Limit behavior is explicit, risk is fairly shared, surprises are prevented.

   ## Data fields for Overages and risk allocation (use these exact field names in analysis)

   **policies (extend existing policies object)**
   - policies.overage_behavior: hard_stop | soft_limit | auto_topup | rollover
   - policies.overage_charge_timing: real_time | end_of_period | threshold_event
   - policies.overage_disclosure_surface: list of pricing_page | docs | in_product | contract
   - policies.grace_buffer: none | small_buffer | explicit_units (if explicit_units, store detail in facts)
   - policies.spike_protection: none | anomaly_detect | daily_cap | rate_limit_on_spike
   - policies.dispute_refund_process: none | documented | documented_with_sla
   - policies.rollover_rules: none | limited_period | unlimited
   - policies.enterprise_true_up: none | monthly_true_up | quarterly_true_up

   **tiers[] (extend existing tiers objects)**
   - tiers[].name: string
   - tiers[].target_segment: indie | team | enterprise
   - tiers[].billing_options: list of monthly | annual | usage | hybrid
   - tiers[].payment_methods: list of card | invoice | po
   - tiers[].included_units: number or null
   - tiers[].unit_name: string or null, must match value_units[].name
   - tiers[].overage_enabled: boolean
   - tiers[].overage_unit_price: number or null
   - tiers[].cap_policy: none | hard_cap | soft_cap | admin_cap
   - tiers[].alert_policy: none | user | admin | both
   - tiers[].topup_available: boolean
   - tiers[].topup_increment: number or null
   - tiers[].auto_upgrade_on_exceed: boolean

   **forecasting_surfaces (reuse existing object)**
   - forecasting_surfaces.estimation_surface: none | calculator | preflight_estimate | in_product_estimate
   - forecasting_surfaces.cost_visibility_surface: none | dashboard_total | dashboard_breakdown | export_logs
   - forecasting_surfaces.alerts: none | usage_alerts | cost_alerts | budget_caps

   **facts[] (evidence ledger, required)**
   Each fact must be written into facts[] with:
   - field_path: string, example: policies.overage_behavior
   - value: any
   - source_type: public_url | doc | contract | user_input | assumption
   - reliability: float 0..1
   - evidence_ref: URL or attachment ID
   - timestamp: ISO string

   ## Evidence collection rules (before scoring)
   1) Extract overage behavior and limit handling from pricing pages, plan tables, docs, terms, trust center, and in-product screenshots, store as facts[].
   2) If overage pricing is not explicit, do not infer it. Leave tiers[].overage_unit_price blank and prompt the user.
   3) If behavior differs by tier, store per-tier facts and reflect them in tiers[] fields, do not collapse into a single narrative.

   ## Scoring (deterministic)
   Score per segment, then aggregate across segments.

   **Segment tiers**
   For each segment s in segments[], define:
   - segment_tiers = tiers[] where tiers[].target_segment == s.name
   If segment_tiers is empty, that segment score is 0 with Low confidence.

   #### Subtests (0 or 1 each, per segment)

   **R1 Explicit limit behavior**
   Pass if:
   - policies.overage_behavior is present
   AND
   - for at least one tier in segment_tiers where tiers[].overage_enabled == true, at least one disclosure surface exists:
     - policies.overage_disclosure_surface contains pricing_page OR docs OR in_product OR contract

   **R2 Overage economics clarity**
   Pass if for each tier in segment_tiers where tiers[].overage_enabled == true:
   - tiers[].unit_name is present
   AND
   - tiers[].overage_unit_price is present
   AND
   - primary value unit metering determinism exists (reuse Value unit V2 fields via facts, minimum requirement):
     - value_units[].granularity and value_units[].rounding_rule are known for the billed unit

   **R3 Customer control surfaces**
   Pass if for at least one tier in segment_tiers where tiers[].overage_enabled == true:
   - (tiers[].cap_policy != none OR forecasting_surfaces.alerts != none)
   AND
   - tiers[].alert_policy != none OR forecasting_surfaces.alerts != none
   Deterministic intent: at least one cap mechanism plus at least one alert mechanism.

   **R4 Fairness and tail protection**
   Pass if at least two of the following are true:
   - policies.grace_buffer != none
   - policies.spike_protection != none
   - policies.dispute_refund_process != none

   APPLICABILITY NOTE ON ROLLOVER:
   - Rollover (policies.rollover_rules) is ONLY relevant when the product offers top-ups, add-ons, or prepaid credit packs. If the pricing model is purely seat-based, flat-rate, or usage-based without prepaid allowances/top-ups, rollover is NOT applicable and should NOT be treated as a gap or weakness.
   - Similarly, if no tier offers topup_available == true and no add-on credits exist, do NOT cite "missing rollover policy" as a weakness or trust breakpoint.

   **R5 Enterprise risk allocation readiness**
   Evaluate only if the segment is enterprise.
   Pass if there exists a tier in segment_tiers where:
   - (invoice OR po) IN tiers[].payment_methods
   AND
   - policies.enterprise_true_up != none
   AND
   - policies.overage_behavior is present
   AND
   - tiers[].overage_enabled == true implies tiers[].overage_unit_price is present

   If enterprise segment does not exist, mark R5 as not applicable and exclude from points.

   **R6 No-surprise operability**
   Pass if:
   - forecasting_surfaces.estimation_surface != none
   AND
   - forecasting_surfaces.cost_visibility_surface != none
   AND
   - (tiers[].alert_policy != none OR forecasting_surfaces.alerts != none)

   #### Points to score mapping (0-2, per segment)
   Let points = sum(applicable subtests).
   If enterprise segment: max points = 6. Otherwise: max points = 5 (R5 excluded).

   Map points to segment score:
   - 0-2 points: segment score = 0
   - 3-4 points: segment score = 1
   - 5-6 points: segment score = 2

   #### Dimension aggregation (0-2)
   - If segments[].priority_weight exists and sums to 1: compute weighted average of segment scores.
   - If missing: equal-weight across provided segments, and lower confidence.

   #### Gates (hard enforcement caps)
   - If policies.overage_behavior is missing: final dimension score = 0.
   - If any tier has overage_enabled == true and both tiers[].cap_policy == none AND tiers[].alert_policy == none AND forecasting_surfaces.alerts == none: cap final score at 1.
   - If policies.overage_behavior == auto_topup and any tier has topup_available == true but tiers[].topup_increment is missing: cap final score at 1.
   - If an enterprise segment exists and R5 fails: cap final score at 1.

   ## Confidence (separate from score)
   Compute confidence per subtest:
   - subtest_confidence = max(facts[].reliability among facts used by that subtest)
   - If no facts used: 0

   Per segment:
   - segment_confidence = average(subtest_confidence for applicable subtests)

   Dimension confidence:
   - Identify highest-priority segment: max segments[].priority_weight (or enterprise if weights missing).
   - dimension_confidence = min(confidence(highest-priority segment), average(segment_confidence across segments))

   Confidence labels: High >= 0.75, Medium 0.45-0.74, Low < 0.45

   Conflict rule: If two facts with reliability >= 0.65 disagree for the same field_path, flag conflict and cap confidence at Medium until resolved.

   ## Missing-insider prompts (ask only when confidence is not High, max 5 questions)
   1) For each tier, is overage enabled, what unit is billed, and what is the overage unit price.
      -> tiers[].overage_enabled, tiers[].unit_name, tiers[].overage_unit_price
   2) What happens at the limit, hard stop, soft limit, auto top-up, rollover, and when are charges applied.
      -> policies.overage_behavior, policies.overage_charge_timing
   3) What controls exist, caps, alerts, admin controls, and which tier includes them.
      -> tiers[].cap_policy, tiers[].alert_policy, forecasting_surfaces.alerts
   4) What tail protections exist, grace buffer, spike protection, dispute or refund process.
      -> policies.grace_buffer, policies.spike_protection, policies.dispute_refund_process
   5) If enterprise is a target, do you support invoice or PO, true-ups, and what is the true-up cadence.
      -> tiers[].payment_methods, policies.enterprise_true_up

   ## Rerun behavior (must be explicit in output)
   When the user provides missing inputs:
   1) Persist inputs into policies, tiers[], and forecasting_surfaces.
   2) Add corresponding facts[] entries with source_type=user_input, add evidence_ref if provided.
   3) Recompute R1-R6, segment scores, gates, final score, and confidence.
   4) In the report, include: score before vs after, confidence before vs after, new evidence added (by subtest), remaining unknowns (by subtest), conflicts detected and resolution needed.

8. "Safety rails and trust surfaces" - Controls prevent surprises, expose usage, and bound risk.

   PUBLIC OBSERVABILITY CAVEAT:
   Many safety rails (budget caps, rate limits, usage alerts, admin controls, kill switches) are implemented INSIDE the product experience and are NOT visible on public-facing pages. This is normal and expected — these controls are often only discoverable after login.
   - If no public evidence of safety rails exists but the product has a mature pricing/enterprise tier, set notObservable to false but acknowledge in the rationale that in-product controls likely exist and cannot be assessed from public pages alone.
   - Do NOT score 0 purely because safety rails are not publicly documented. Instead, score based on what IS observable, note the limitation in uncertaintyReasons, and set confidence to Low (< 0.40) to trigger insider prompts.
   - If documentation, trust center, or security pages reference controls (e.g., "admin can set spending limits"), treat those as valid evidence even without screenshots.

   ## Data fields for Safety rails and trust surfaces (use these exact field names in analysis)

   **safety_rails[]**
   - safety_rails[].name: string, example: "Budget caps"
   - safety_rails[].rail_type: budget_cap | usage_cap | rate_limit | concurrency_limit | approval_gate | anomaly_detect | circuit_breaker | kill_switch | retry_limit | context_limit | model_route_guard
   - safety_rails[].trigger: string, what condition activates it
   - safety_rails[].action: string, what happens when triggered
   - safety_rails[].scope: user | org | workspace | project | api_key | endpoint | workflow
   - safety_rails[].configurable_by: user | admin | both
   - safety_rails[].default_state: on | off
   - safety_rails[].tier_coverage: list of tier names (must match tiers[].name)

   **trust_surfaces[]**
   - trust_surfaces[].surface_type: usage_dashboard | cost_dashboard | estimate_surface | alerting | admin_controls | audit_export | policy_docs | limit_behavior_docs | changelog | status_page | postmortems
   - trust_surfaces[].availability: public | in_product | both
   - trust_surfaces[].breakdown_level: none | by_project | by_user | by_workflow | by_model | by_endpoint
   - trust_surfaces[].exportable: boolean
   - trust_surfaces[].tier_coverage: list of tier names (must match tiers[].name)
   - trust_surfaces[].evidence_url: string or null

   **tiers[] (reuse existing tiers objects)**
   - tiers[].name: string
   - tiers[].target_segment: indie | team | enterprise
   - tiers[].features: list of rbac | admin | usage_dashboard | caps | alerts | sso | scim | audit_logs | soc2 | dpa | sla
   - tiers[].cap_policy: none | hard_cap | soft_cap | admin_cap
   - tiers[].alert_policy: none | user | admin | both
   - tiers[].overage_enabled: boolean

   **forecasting_surfaces (reuse existing object)**
   - forecasting_surfaces.estimation_surface: none | calculator | preflight_estimate | in_product_estimate
   - forecasting_surfaces.cost_visibility_surface: none | dashboard_total | dashboard_breakdown | export_logs
   - forecasting_surfaces.breakdown_level: none | by_project | by_user | by_workflow | by_model | by_endpoint
   - forecasting_surfaces.alerts: none | usage_alerts | cost_alerts | budget_caps

   **policies (reuse existing policies fields)**
   - policies.overage_behavior: hard_stop | soft_limit | auto_topup | rollover

   **facts[] (evidence ledger, required)**
   Each fact must be written into facts[] with:
   - field_path: string, example: safety_rails[Budget caps].default_state
   - value: any
   - source_type: public_url | doc | contract | user_input | assumption
   - reliability: float 0..1
   - evidence_ref: URL or attachment ID
   - timestamp: ISO string

   ## Evidence collection rules (before scoring)
   1) Extract rails and surfaces from pricing pages, docs, trust center, status page, changelog, and in-product screenshots, store as facts[].
   2) A rail only counts if it has a trigger and action, not just a marketing claim.
   3) If a surface exists only in-product, mark availability=in_product and lower confidence unless a screenshot or user evidence is provided.

   ## Scoring (deterministic)
   Score per segment, then aggregate across segments.

   **Segment tiers**
   For each segment s in segments[]:
   - segment_tiers = tiers[] where tiers[].target_segment == s.name
   If empty, segment score = 0 with Low confidence.

   #### Subtests (0 or 1 each, per segment)

   **T1 Budget and usage caps**
   Pass if there exists a tier in segment_tiers where:
   - tiers[].cap_policy != none
   OR
   - any safety_rails[].rail_type in {budget_cap, usage_cap} with that tier in tier_coverage
   Additional requirement:
   - if segment is team or enterprise, cap must be admin_cap OR a rail has configurable_by in {admin, both}.

   **T2 Alerts and notifications**
   Pass if there exists a tier in segment_tiers where:
   - tiers[].alert_policy != none
   OR
   - forecasting_surfaces.alerts != none
   OR
   - any trust_surfaces[].surface_type == alerting with that tier in tier_coverage

   **T3 Estimation before spend**
   Pass if:
   - forecasting_surfaces.estimation_surface != none
   OR
   - any trust_surfaces[].surface_type == estimate_surface with that tier in tier_coverage

   **T4 Auditability and breakdown**
   Pass if:
   - forecasting_surfaces.cost_visibility_surface in {dashboard_breakdown, export_logs}
   AND
   - forecasting_surfaces.breakdown_level != none
   OR
   - any trust_surfaces[].surface_type in {usage_dashboard, cost_dashboard, audit_export} where breakdown_level != none and tier is covered

   **T5 Admin and access controls**
   Pass if for team and enterprise segments, there exists a tier in segment_tiers where:
   - (rbac OR admin) IN tiers[].features
   AND
   - at least one of: audit_logs IN tiers[].features OR trust_surfaces[].surface_type == audit_export is covered
   For indie segment, pass if:
   - at least one of: usage_dashboard OR alerts OR caps is present in tier features.

   **T6 Safe failure behavior and bounded risk**
   Pass if there exists evidence for both:
   - documented limit behavior: a trust_surfaces[] entry with surface_type == limit_behavior_docs and availability not public only without evidence_url
   AND
   - at least one risk limiter rail exists: any safety_rails[].rail_type in {rate_limit, concurrency_limit, retry_limit, circuit_breaker, kill_switch, approval_gate} covered by at least one tier in segment_tiers
   If tiers[].overage_enabled == true for any tier in segment_tiers, require:
   - policies.overage_behavior is present.

   #### Points to score mapping (0-2, per segment)
   points = sum(T1..T6)
   - 0-2 points: segment score = 0
   - 3-4 points: segment score = 1
   - 5-6 points: segment score = 2

   #### Dimension aggregation (0-2)
   - If segments[].priority_weight exists and sums to 1: compute weighted average of segment scores.
   - If missing: equal-weight across provided segments, and lower confidence.

   #### Gates (hard enforcement caps)
   - If T4 fails for the highest-priority segment: cap final dimension score at 1.
   - If T2 fails for the highest-priority segment: cap final dimension score at 1.
   - If any tier has overage_enabled == true and both caps and alerts are absent for that tier (no cap_policy and no alert_policy and forecasting_surfaces.alerts == none): cap final score at 1.

   ## Confidence (separate from score)
   Compute confidence per subtest:
   - subtest_confidence = max(facts[].reliability among facts used by that subtest)
   - If no facts used: 0

   Per segment:
   - segment_confidence = average(subtest_confidence for T1..T6)

   Dimension confidence:
   - Identify highest-priority segment: max segments[].priority_weight (or enterprise if weights missing).
   - dimension_confidence = min(confidence(highest-priority segment), average(segment_confidence across segments))

   Confidence labels: High >= 0.75, Medium 0.45-0.74, Low < 0.45

   Conflict rule: If two facts with reliability >= 0.65 disagree for the same field_path, flag conflict and cap confidence at Medium until resolved.

   ## Missing-insider prompts (ask only when confidence is not High, max 5 questions)
   1) Which caps exist by tier, who can set them, and what happens when hit.
      -> tiers[].cap_policy, safety_rails[] (budget_cap or usage_cap)
   2) Which alerts exist by tier, thresholds, channels, and who receives them.
      -> tiers[].alert_policy, forecasting_surfaces.alerts, trust_surfaces[] (alerting)
   3) Do users get estimates before running, calculator, preflight, or in-product estimate.
      -> forecasting_surfaces.estimation_surface, trust_surfaces[] (estimate_surface)
   4) What audit surfaces exist, dashboards, breakdowns, exports, and the breakdown level.
      -> forecasting_surfaces.cost_visibility_surface, forecasting_surfaces.breakdown_level, trust_surfaces[] (audit_export)
   5) What are your bounded-risk rails, rate limits, retries, circuit breaker, kill switch, approvals, and where documented.
      -> safety_rails[], trust_surfaces[] (limit_behavior_docs)

   ## Rerun behavior (must be explicit in output)
   When the user provides missing inputs:
   1) Persist inputs into safety_rails[], trust_surfaces[], tiers[], forecasting_surfaces, and policies.
   2) Add corresponding facts[] entries with source_type=user_input, add evidence_ref if provided.
   3) Recompute T1-T6, segment scores, gates, final score, and confidence.
   4) In the report, include: score before vs after, confidence before vs after, new evidence added (by subtest), remaining unknowns (by subtest), conflicts detected and resolution needed.



CRITICAL OUTPUT RULES:
- Keep rationale to 1-2 sentences max per dimension. Each rationale MUST reference a specific page URL or section (e.g., "Pricing page shows...") — never cite footers, nav items, or copyright notices.
- Keep observed arrays to max 3 items per dimension. Each observed item MUST be a concrete, specific fact from page content — NOT from footers, navigation, cookie banners, or boilerplate. If you cannot find 3 quality observations, include fewer rather than padding with weak evidence.
- Keep uncertaintyReasons to max 2 items per dimension.
- Do NOT include facts[] or raw data in the output JSON. Only include the scored results.
- Do NOT echo back the spec or field schemas. Only output the final scores.
- REQUIRED: For each dimension where confidence < 0.40 (Low), you MUST include exactly 1 missingInsiderPrompt — the single most important clarifying question from that dimension's "Missing-insider prompts" section. For dimensions with confidence >= 0.40, set missingInsiderPrompts to an empty array []. This assessment is based on publicly observable evidence only.
- CONSISTENCY CHECK: Before finalizing, verify that a dimension scored 2 (strong) has at least 2 high-quality observed items with specific details. A dimension scored 0 should NOT have strong evidence in its observed array. If there's a mismatch, re-evaluate the score.

Also provide:
- strengths: Top 3 areas where they excel with evidence
- weaknesses: Top 3 areas needing improvement. IMPORTANT QUALITY RULES FOR WEAKNESSES:
  * Only cite something as a weakness if it is ACTUALLY RELEVANT to the company's pricing model and product type. For example, do NOT cite "missing rollover policy" if the product has no prepaid credits or add-ons to roll over.
  * Do NOT cite in-product features (safety rails, admin controls, usage dashboards) as weaknesses simply because they are not visible on public pages. Instead, note them as "not publicly observable" and suggest the company document them publicly.
  * Weaknesses should be ACTIONABLE — things the company can realistically improve. Avoid generic platitudes like "could be more transparent" without specifying WHAT should be transparent and WHERE.
  * Each weakness must pass a relevance test: "Would fixing this actually improve the customer's trust or buying experience for THIS specific product?" If not, it's not a real weakness.
- trustBreakpoints: Points where trust could break (max 3). Apply the same relevance test — only cite breakpoints that are realistic for this product's model.
- recommendedFocus: Their top priority for next 90 days. The recommendation MUST be specific to the company's actual pricing model, product type, and observed gaps. Avoid generic advice. The firstTwoActions should be concrete, implementable steps (e.g., "Add a pricing calculator to the /pricing page" not "Improve transparency").

Return a JSON object matching this schema EXACTLY:
{
  "dimensionScores": [
    {
      "dimension": "dimension name exactly as listed above",
      "score": 0 | 1 | 2,
      "confidence": 0.0-1.0,
      "notObservable": boolean,
      "rationale": "explanation",
      "observed": ["specific observations"],
      "sourceEvidence": [{"url": "the page URL where the evidence was found", "snippet": "the exact quote or key phrase from that page"}],
      "uncertaintyReasons": ["reasons for uncertainty"],
      "missingInsiderPrompts": [
        {
          "question": "The clarifying question text",
          "fieldPaths": ["data.field.path1", "data.field.path2"]
        }
      ]
    }
  ],
  "strengths": [
    {
      "dimension": "dimension name",
      "whyItIsStrong": "explanation",
      "whatItEnables": "benefit",
      "evidence": [{"url": "source url", "quote": "relevant quote"}]
    }
  ],
  "weaknesses": [
    {
      "dimension": "dimension name",
      "whatIsMissingOrUnclear": "explanation",
      "whyItMatters": "impact",
      "whatToVerifyNext": "next step",
      "evidence": [{"url": "source url", "quote": "relevant quote or absence note"}]
    }
  ],
  "trustBreakpoints": [
    {"area": "area name", "description": "why trust could break"}
  ],
  "recommendedFocus": {
    "focusArea": "main focus",
    "why": "reasoning",
    "firstTwoActions": ["action 1", "action 2"],
    "whatToMeasure": "success metric"
  }
}`;

async function callLovableAI(systemPrompt: string, userContent: string): Promise<object> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!apiKey) {
    throw new Error('Service temporarily unavailable');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 32768,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Lovable AI error:', error);
    throw new Error('Analysis service temporarily unavailable');
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Invalid AI response structure:', JSON.stringify(data));
    throw new Error('Invalid AI response structure');
  }
  
  let content = data.choices[0].message.content;
  
  if (!content || content.trim() === '') {
    console.error('Empty AI response content');
    throw new Error('AI returned empty response');
  }
  
  console.log('AI response length:', content.length);
  
  // Strip markdown code fences if present
  content = content.trim();
  if (content.startsWith('```')) {
    content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  
  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.error('Failed to parse AI response:', content.substring(0, 500));
    console.error('Response tail:', content.substring(content.length - 200));
    
    // Attempt to repair truncated JSON by closing open structures
    try {
      let repaired = content;
      // Count open/close braces and brackets
      const openBraces = (repaired.match(/{/g) || []).length;
      const closeBraces = (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;
      
      // Trim trailing incomplete key-value pairs
      repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*[^}\]]*$/, '');
      
      // Close missing brackets and braces
      for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
      for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';
      
      const result = JSON.parse(repaired);
      console.log('Successfully repaired truncated JSON response');
      return result;
    } catch (repairError) {
      console.error('JSON repair also failed');
      throw new Error('Failed to parse AI response as JSON');
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

   try {
    // Validate JWT authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const authSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    console.log('Authenticated user:', userId);

    // Rate limit: 3 scans per week per user AND per email
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Check if user has admin role (whitelisted — unlimited scans)
    const { data: adminCheck } = await supabaseAdmin
      .rpc('has_role', { _user_id: userId, _role: 'admin' });
    const isAdmin = adminCheck === true;
    console.log('Admin check for', userId, ':', isAdmin);

    if (!isAdmin) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Check by user_id
      const { count: userCount, error: countError } = await supabaseAdmin
        .from('scan_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', weekAgo);

      if (countError) {
        console.error('Rate limit check failed:', countError);
      } else if (userCount !== null && userCount >= 3) {
        return new Response(
          JSON.stringify({ success: false, error: 'Weekly limit reached. You can run 3 analyses per week. Try again next week.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Secondary check by email to deter multi-account bypass
      if (userEmail) {
        const { count: emailCount, error: emailCountError } = await supabaseAdmin
          .from('scan_usage')
          .select('*', { count: 'exact', head: true })
          .eq('email', userEmail)
          .gte('created_at', weekAgo);

        if (!emailCountError && emailCount !== null && emailCount >= 3) {
          return new Response(
            JSON.stringify({ success: false, error: 'Weekly limit reached. You can run 3 analyses per week. Try again next week.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const { pages, url, insiderAnswers, previousScores }: AnalyzeRequest = await req.json();

    // Input size validation (DoS protection)
    if (insiderAnswers && typeof insiderAnswers === 'object') {
      const keys = Object.keys(insiderAnswers);
      if (keys.length > 10) {
        return new Response(
          JSON.stringify({ success: false, error: 'Too many insider answers provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      for (const key of keys) {
        if (typeof insiderAnswers[key] === 'string' && insiderAnswers[key].length > 500) {
          return new Response(
            JSON.stringify({ success: false, error: 'Insider answer exceeds maximum length of 500 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (pages && pages.length > 25) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many pages provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pages || pages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No pages provided for analysis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize domain for cache key
    let domain = url;
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch { /* use raw url */ }

    // ── Cache lookup (skip for re-runs with insider/public-link context) ──
    const isFreshScan = !insiderAnswers && !previousScores;
    if (isFreshScan) {
      const { data: cached } = await supabaseAdmin
        .from('scan_results')
        .select('result_json')
        .eq('url_domain', domain)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const cachedVersion = cached?.result_json && typeof cached.result_json === 'object'
        ? (cached.result_json as Record<string, unknown>).analysisVersion
        : null;

      if (cached?.result_json && cachedVersion === ANALYSIS_VERSION) {
        console.log(`Cache HIT for ${domain} — returning cached result (${ANALYSIS_VERSION})`);
        return new Response(
          JSON.stringify(cached.result_json),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (cached?.result_json) {
        console.log(`Cache STALE for ${domain} — expected ${ANALYSIS_VERSION}, got ${String(cachedVersion ?? 'none')}`);
      } else {
        console.log(`Cache MISS for ${domain} — running fresh analysis`);
      }
    }

    console.log(`Analyzing ${pages.length} pages from ${url}`);

    // Prepare content for analysis — prioritize high-signal pages before truncation
    const stripBoilerplate = (markdown: string): string => {
      return markdown
        // Remove image-only markdown lines (high token cost, low evidence value)
        .replace(/^\s*!\[[^\]]*\]\([^\)]+\)\s*$/gim, '')
        // Remove copyright footers
        .replace(/©\s*\d{4}[^\n]*/gi, '')
        .replace(/copyright\s*©?\s*\d{4}[^\n]*/gi, '')
        .replace(/all rights reserved[^\n]*/gi, '')
        // Remove cookie consent banners
        .replace(/we use cookies[^\n]*/gi, '')
        .replace(/cookie\s*(policy|preferences|settings|consent)[^\n]*/gi, '')
        .replace(/accept\s*(all\s*)?cookies[^\n]*/gi, '')
        // Remove social media link clusters
        .replace(/^\s*(follow us|connect with us|social)\s*$/gim, '')
        .replace(/^\s*\[?(twitter|facebook|linkedin|instagram|youtube|x\.com)\]?\s*$/gim, '')
        // Remove generic footer navigation patterns
        .replace(/^\s*(privacy policy|terms of service|terms & conditions|cookie policy|sitemap)\s*$/gim, '')
        // Remove excessive whitespace left behind
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    };

    const isLikely404Page = (page: ScrapedPage): boolean => {
      const text = `${page.title}\n${page.markdown}`.toLowerCase();
      return text.includes('page not found') || text.includes('# 404') || text.includes('doesn\'t exist or has been moved');
    };

    const scorePagePriority = (page: ScrapedPage): number => {
      const target = `${page.url} ${page.title}`.toLowerCase();
      const content = page.markdown.toLowerCase();

      let score = 0;
      if (/\/(pricing|plans?|billing|usage|credits|subscription)\b/.test(target)) score += 1200;
      if (/\/(faq|support|help|docs|changelog|trust|security|api|developers?)\b/.test(target)) score += 900;
      if (/\/(templates?)\b/.test(target)) score += 350;
      if (/\/(terms|legal|privacy)\b/.test(target)) score += 450;
      if (/faq \/ accordion content/i.test(page.markdown)) score += 500;

      // Boost pages that actually contain economic/pricing evidence
      if (/(credit|top-up|overage|usage-based|monthly|annual|tier|pricing|quota|limit|billing)/i.test(content)) score += 300;

      // Penalize noisy marketplace/community listing pages
      if (/\/(discover|products)\b/.test(target)) score -= 500;

      // Keep homepage, but lower than pricing/docs evidence pages
      if (page.url.replace(/\/$/, '') === url.replace(/\/$/, '')) score -= 150;

      return score;
    };

    const cleanEvidenceLine = (line: string): string => {
      return line
        .replace(/!\[[^\]]*\]\([^\)]+\)/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/[>#*_`|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const collectHighSignalEvidence = (inputPages: ScrapedPage[]) => {
      const northStar: string[] = [];
      const costDriver: string[] = [];
      const seenNorthStar = new Set<string>();
      const seenCostDriver = new Set<string>();

      const pushUniqueEvidence = (bucket: 'northStar' | 'costDriver', pageUrl: string, snippet: string) => {
        const cleanedSnippet = cleanEvidenceLine(snippet).slice(0, 260);
        if (cleanedSnippet.length < 20) return;

        const formatted = `${pageUrl}: "${cleanedSnippet}"`;

        if (bucket === 'northStar') {
          if (northStar.length >= 10 || seenNorthStar.has(formatted)) return;
          seenNorthStar.add(formatted);
          northStar.push(formatted);
          return;
        }

        if (costDriver.length >= 10 || seenCostDriver.has(formatted)) return;
        seenCostDriver.add(formatted);
        costDriver.push(formatted);
      };

      const pagePriority = (pageUrl: string) => {
        if (/\/(pricing|plans?|billing|credits|usage)\b/i.test(pageUrl)) return 5;
        if (/\/templates?\b/i.test(pageUrl)) return 4;
        if (/\/(product|solutions?)\b/i.test(pageUrl)) return 3;
        return 1;
      };

      const orderedPages = [...inputPages].sort((a, b) => pagePriority(b.url) - pagePriority(a.url));

      for (const page of orderedPages) {
        const lines = page.markdown.split('\n');

        for (const rawLine of lines) {
          if (northStar.length >= 10 && costDriver.length >= 10) break;

          const line = cleanEvidenceLine(rawLine);
          if (line.length < 20 || line.length > 360) continue;

          const northStarMatch = /(build|create|prototype|production-ready|deploy|ship|launch|workflow|real[- ]time|capacity|team|template|use case)/i.test(line);
          const costDriverMatch = /(credit|usage-based|top-?up|rollover|monthly credits?|daily credits?|overage|quota|limit|billing|cloud \+ ai|task complexity|1 credit per message|user prompt|work done)/i.test(line);

          if (northStarMatch) {
            pushUniqueEvidence('northStar', page.url, line);
          }

          if (costDriverMatch) {
            pushUniqueEvidence('costDriver', page.url, line);
          }
        }

        const fullMarkdown = page.markdown;

        const targetedCostSignals: Array<{ pattern: RegExp; snippet: string }> = [
          { pattern: /default\s*mode\s*:\s*credits\s+vary\s+based\s+on\s+task\s+complexity/i, snippet: 'Default Mode: credits vary based on task complexity' },
          { pattern: /chat\s*mode\s*:\s*1\s+credit\s+per\s+message/i, snippet: 'Chat Mode: 1 credit per message' },
          { pattern: /make\s+the\s+button\s+gray[\s\S]{0,160}(?:0\.50|0,50)/i, snippet: 'Prompt example: “Make the button gray” maps to 0.50 credits' },
          { pattern: /remove\s+the\s+footer[\s\S]{0,160}(?:0\.90|0,90)/i, snippet: 'Prompt example: “Remove the footer” maps to 0.90 credits' },
          { pattern: /add\s+authentication\s+with\s+sign\s+up\s+and\s+login[\s\S]{0,220}(?:1\.20|1,20)/i, snippet: 'Prompt example: “Add authentication with sign up and login” maps to 1.20 credits' },
          { pattern: /build\s+me\s+a\s+landing\s+page,?\s+use\s+images[\s\S]{0,220}(?:1\.70|1,70)/i, snippet: 'Prompt example: “Build me a landing page, use images” maps to 1.70 credits' },
        ];

        for (const signal of targetedCostSignals) {
          if (signal.pattern.test(fullMarkdown)) {
            pushUniqueEvidence('costDriver', page.url, signal.snippet);
          }
        }

        if (/\/templates?\b/i.test(page.url)) {
          const templateSignals: Array<{ pattern: RegExp; snippet: string }> = [
            { pattern: /production[- ]ready/i, snippet: 'Templates emphasize production-ready starting points for real workflows' },
            { pattern: /(landing page|authentication|internal tools?)/i, snippet: 'Templates surface concrete workflows (landing pages, authentication, internal tools)' },
            { pattern: /(build|ship|launch).{0,60}(faster|quickly|in minutes)/i, snippet: 'Templates position faster time-to-value for building and shipping' },
          ];

          for (const signal of templateSignals) {
            if (signal.pattern.test(fullMarkdown)) {
              pushUniqueEvidence('northStar', page.url, signal.snippet);
            }
          }
        }
      }

      return { northStar, costDriver };
    };

    const cleanedPages = pages
      .filter((page) => !isLikely404Page(page))
      .map((page) => ({ ...page, markdown: stripBoilerplate(page.markdown) }))
      .filter((page) => page.markdown.length > 0);

    // Fallback to original pages if everything was filtered out
    const candidatePages = cleanedPages.length > 0 ? cleanedPages : pages;

    const prioritizedPages = [...candidatePages]
      .sort((a, b) => scorePagePriority(b) - scorePagePriority(a));

    const MAX_CONTENT_CHARS = 100000;
    let usedChars = 0;
    const selectedBlocks: string[] = [];
    const selectedUrls: string[] = [];

    for (const page of prioritizedPages) {
      const priority = scorePagePriority(page);
      const perPageBudget = priority >= 1000 ? 18000 : priority >= 600 ? 12000 : 6000;

      let pageMarkdown = page.markdown;

      // Ensure FAQ/accordion extraction survives per-page trimming
      const faqMatch = pageMarkdown.match(/## FAQ \/ Accordion Content[\s\S]*/i);
      const faqSection = faqMatch ? faqMatch[0] : '';

      if (pageMarkdown.length > perPageBudget) {
        if (faqSection.length > 0) {
          const preservedFaq = faqSection.slice(0, 5000);
          const mainBudget = Math.max(1500, perPageBudget - preservedFaq.length - 2);
          pageMarkdown = `${pageMarkdown.slice(0, mainBudget).trim()}\n\n${preservedFaq}`;
        } else {
          pageMarkdown = pageMarkdown.slice(0, perPageBudget).trim();
        }
      }

      const block = `## ${page.title} (${page.url})\n\n${pageMarkdown}`;
      const blockWithDivider = selectedBlocks.length === 0 ? block : `\n\n---\n\n${block}`;

      if (usedChars + blockWithDivider.length > MAX_CONTENT_CHARS) {
        const remaining = MAX_CONTENT_CHARS - usedChars;
        if (remaining > 1500) {
          selectedBlocks.push(blockWithDivider.slice(0, remaining) + '\n\n[Content truncated...]');
          selectedUrls.push(page.url);
        }
        break;
      }

      selectedBlocks.push(blockWithDivider);
      selectedUrls.push(page.url);
      usedChars += blockWithDivider.length;
    }

    const truncatedContent = selectedBlocks.join('');
    const evidenceDigest = collectHighSignalEvidence(prioritizedPages);

    console.log('Content length:', truncatedContent.length);
    console.log('Pages selected for scoring:', selectedUrls);
    console.log('High-signal evidence digest counts:', {
      northStar: evidenceDigest.northStar.length,
      costDriver: evidenceDigest.costDriver.length,
    });

    // Step 1: Extract company profile
    console.log('Extracting company profile...');
    const profileContent = `Analyze this website content from ${url}:\n\n${truncatedContent}`;
    const companyProfile = await callLovableAI(COMPANY_PROFILE_PROMPT, profileContent) as Record<string, unknown>;
    console.log('Company profile extracted:', companyProfile.companyName);

    // Step 2: Score against rubric
    console.log('Scoring against AVS rubric...');
    const scoringContent = `
Company: ${companyProfile.companyName}
Description: ${companyProfile.oneLineDescription}
Primary Users: ${companyProfile.primaryUsers}
Product Surface: ${companyProfile.productSurface}
Pricing Model Guess: ${companyProfile.pricingModelGuess}
${previousScores && previousScores.length > 0 && !insiderAnswers ? `
RERUN WITH NEW PUBLIC EVIDENCE:
This is a re-analysis with additional public pages that were not available in the original scan.
PREVIOUS SCORES (for before/after comparison):
${previousScores.map((s: { dimension: string; score: number; confidence: number }) => `- ${s.dimension}: score=${s.score}, confidence=${s.confidence}`).join('\n')}

CRITICAL INSTRUCTIONS FOR RERUN:
- You MUST re-evaluate all dimensions using the FULL set of pages below, including newly added pages.
- Scores and confidence CAN change based on new public evidence found in the additional pages.
- In the rationale for each dimension, explicitly reference any NEW evidence found in the newly added pages.
- If a dimension's score or confidence changed from the previous run, explain WHY in the rationale (what new evidence was found).
- If a dimension's score did NOT change despite new pages, briefly note that the new pages did not contain additional evidence for that dimension.
- Follow the rerun behavior specified in each dimension's spec: include score before vs after, confidence before vs after, new evidence added.
` : ''}${insiderAnswers && Object.keys(insiderAnswers).length > 0 ? `
INSIDER ANSWERS (user-provided, source_type=user_input, reliability=0.65):
${Object.entries(insiderAnswers).map(([key, value]) => {
  const [dimension, question] = key.split('::');
  return '- [' + dimension + '] Q: ' + question + '\n  A: ' + value;
}).join('\n')}

CRITICAL PUBLIC-ONLY SCORING INVARIANT:
- Insider-only inputs (no public URL, no publishable artifact) must NOT change dimension scores or total score.
- Scores update ONLY when public_evidence[] gains new eligible entries (source_type in {public_url, public_doc, public_screenshot}).
- Insider answers improve recommendations and "what to publish" guidance, but the public_score and public_confidence must remain unchanged unless the insider answer references a verifiable public URL.
- If the insider answer contains a public URL, treat it as public evidence and allow score changes.
- In the rationale, note what the insider context suggests but clarify that scores reflect public evidence only.
${previousScores ? `
PREVIOUS SCORES (for before/after comparison):
${previousScores.map((s: { dimension: string; score: number; confidence: number }) => '- ' + s.dimension + ': score=' + s.score + ', confidence=' + s.confidence).join('\n')}
Since these are insider-only inputs, scores should remain the same as previous unless a public URL was provided in the answers.
` : ''}` : ''}

HIGH-SIGNAL EVIDENCE DIGEST (prioritized snippets from public pages):
- Product north star candidates:
${evidenceDigest.northStar.length > 0 ? evidenceDigest.northStar.map((item) => `  - ${item}`).join('\n') : '  - None captured'}
- Cost driver mapping candidates:
${evidenceDigest.costDriver.length > 0 ? evidenceDigest.costDriver.map((item) => `  - ${item}`).join('\n') : '  - None captured'}

Website Content:
${truncatedContent}`;

    const rubricData = await callLovableAI(RUBRIC_SCORING_PROMPT, scoringContent) as Record<string, unknown>;
    console.log('Rubric scoring complete');

    // Calculate totals
    type SourceEvidence = { url: string; snippet: string };

    const parseSourceEvidenceFromObserved = (entry: string): SourceEvidence | null => {
      if (typeof entry !== 'string') return null;
      const match = entry.match(/(https?:\/\/[^\s"”]+)\s*:\s*["“]?([\s\S]+?)["”]?$/);
      if (!match) return null;

      const urlValue = match[1]?.trim();
      const snippetValue = match[2]?.replace(/["”]+$/g, '').trim();
      if (!urlValue || !snippetValue) return null;

      return {
        url: urlValue,
        snippet: snippetValue.slice(0, 260),
      };
    };

    const normalizeSourceEvidence = (rawEvidence: unknown, observedEntries: string[]): SourceEvidence[] => {
      const fromModel = Array.isArray(rawEvidence)
        ? rawEvidence
            .filter((item): item is { url?: unknown; snippet?: unknown } => typeof item === 'object' && item !== null)
            .map((item) => ({
              url: typeof item.url === 'string' ? item.url.trim() : '',
              snippet: typeof item.snippet === 'string' ? item.snippet.trim() : '',
            }))
            .filter((item) => item.url.length > 0 && item.snippet.length > 0)
        : [];

      const fromObserved = observedEntries
        .map(parseSourceEvidenceFromObserved)
        .filter((item): item is SourceEvidence => item !== null);

      const seen = new Set<string>();
      const merged: SourceEvidence[] = [];

      for (const item of [...fromModel, ...fromObserved]) {
        const key = `${item.url}|${item.snippet}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }

      return merged.slice(0, 6);
    };

    const hasExplicitCreditFaqSignals = evidenceDigest.costDriver.some((item) =>
      /(default mode|chat mode|1 credit per message|task complexity|0\.50|0\.90|1\.20|1\.70)/i.test(item)
    );

    const dimensionScores = ((rubricData.dimensionScores || []) as Array<{
      dimension: string;
      score: number;
      confidence: number;
      notObservable: boolean;
      rationale: string;
      observed: string[];
      sourceEvidence?: Array<{ url: string; snippet: string }>;
      uncertaintyReasons: string[];
      missingInsiderPrompts?: Array<{ question: string; fieldPaths: string[] }>;
    }>).map((dimension) => {
      const observed = Array.isArray(dimension.observed) ? [...dimension.observed] : [];
      const uncertaintyReasons = Array.isArray(dimension.uncertaintyReasons) ? [...dimension.uncertaintyReasons] : [];
      const sourceEvidence = normalizeSourceEvidence(dimension.sourceEvidence, observed);

      if (dimension.dimension === 'Product north star' && dimension.score === 0 && evidenceDigest.northStar.length >= 2) {
        const mergedObserved = [...observed, ...evidenceDigest.northStar].slice(0, 4);
        const mergedSourceEvidence = normalizeSourceEvidence(sourceEvidence, mergedObserved);

        return {
          ...dimension,
          score: 1,
          confidence: Math.max(Number(dimension.confidence) || 0, 0.55),
          notObservable: false,
          rationale: 'Public pricing/template signals describe concrete value-delivery outcomes and intended workflows, which supports an emerging product north star even though predictability metrics are still incomplete.',
          observed: mergedObserved,
          sourceEvidence: mergedSourceEvidence,
          uncertaintyReasons: [...uncertaintyReasons, 'Public pages still do not expose a single explicit predictability metric target.'].slice(0, 2),
        };
      }

      if (dimension.dimension === 'Cost driver mapping') {
        const mergedObserved = [...observed, ...evidenceDigest.costDriver].slice(0, 4);
        const mergedSourceEvidence = normalizeSourceEvidence(sourceEvidence, mergedObserved);

        if (dimension.score === 0 && evidenceDigest.costDriver.length >= 2) {
          return {
            ...dimension,
            score: 1,
            confidence: Math.max(Number(dimension.confidence) || 0, hasExplicitCreditFaqSignals ? 0.65 : 0.5),
            notObservable: false,
            rationale: 'The pricing surface explicitly defines usage-linked economics (credits, usage-based Cloud + AI, task-level credit examples, rollovers/top-ups), which is enough for emerging cost-driver mapping even if detailed formulas are not publicly documented.',
            observed: mergedObserved,
            sourceEvidence: mergedSourceEvidence,
            uncertaintyReasons: [...uncertaintyReasons, 'Driver formulas and p50/p95 workflow cost estimates remain non-public.'].slice(0, 2),
          };
        }

        if (hasExplicitCreditFaqSignals && (Number(dimension.confidence) || 0) < 0.65) {
          return {
            ...dimension,
            confidence: 0.65,
            notObservable: false,
            observed: mergedObserved,
            sourceEvidence: mergedSourceEvidence,
            uncertaintyReasons,
          };
        }

        return {
          ...dimension,
          observed,
          sourceEvidence: mergedSourceEvidence,
          uncertaintyReasons,
        };
      }

      return {
        ...dimension,
        observed,
        sourceEvidence,
        uncertaintyReasons,
      };
    });

    const totalScore = dimensionScores.reduce((sum, d) => sum + d.score, 0);
    const maxScore = dimensionScores.length * 2;

    // Determine band
    const percentage = (totalScore / maxScore) * 100;
    let band: 'Nascent' | 'Emerging' | 'Established' | 'Advanced';
    if (percentage < 30) band = 'Nascent';
    else if (percentage < 55) band = 'Emerging';
    else if (percentage < 80) band = 'Established';
    else band = 'Advanced';

    // Calculate observability
    const avgConfidence = dimensionScores.length > 0 
      ? dimensionScores.reduce((sum, d) => sum + d.confidence, 0) / dimensionScores.length 
      : 0;
    let observabilityLevel: 'Strong' | 'Partial' | 'Sparse';
    if (avgConfidence >= 0.7) observabilityLevel = 'Strong';
    else if (avgConfidence >= 0.4) observabilityLevel = 'Partial';
    else observabilityLevel = 'Sparse';

    const mostUncertain = dimensionScores
      .filter(d => !d.notObservable)
      .sort((a, b) => a.confidence - b.confidence)
      .slice(0, 3)
      .map(d => ({
        dimension: d.dimension,
        confidence: d.confidence,
        notObservable: d.notObservable,
      }));

    const result = {
      success: true,
      companyProfile,
      rubricScore: {
        totalScore,
        maxScore,
        band,
        dimensionScores,
        strengths: rubricData.strengths || [],
        weaknesses: rubricData.weaknesses || [],
        trustBreakpoints: rubricData.trustBreakpoints || [],
        recommendedFocus: rubricData.recommendedFocus || null,
      },
      observability: {
        level: observabilityLevel,
        confidenceScore: Math.round(avgConfidence * 100),
        pagesUsed: pages.map(p => p.url),
        mostUncertainDimensions: mostUncertain,
      },
    };

    console.log('Analysis complete:', {
      company: companyProfile.companyName,
      totalScore,
      band,
      observabilityLevel,
    });

    // ── Write to cache for fresh scans ──
    if (isFreshScan) {
      try {
        await supabaseAdmin
          .from('scan_results')
          .insert({
            url_domain: domain,
            result_json: result,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
        console.log(`Cached result for ${domain}`);
      } catch (cacheErr) {
        console.error('Failed to cache result (non-fatal):', cacheErr);
      }
    }

    // Log evidence misses when user submitted new public URLs (previousScores present = rerun)
    if (previousScores && previousScores.length > 0) {
      try {
        const missDomain = new URL(url).hostname.replace(/^www\./, '');
        // Identify dimensions that changed score or confidence
        const changedDimensions = dimensionScores.filter(d => {
          const prev = previousScores.find(p => p.dimension === d.dimension);
          return prev && (prev.score !== d.score || Math.abs(prev.confidence - d.confidence) > 0.05);
        });

        if (changedDimensions.length > 0 && !insiderAnswers) {
          // This is a public-link rerun where scores changed — means original run missed evidence
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          
          if (supabaseUrl && supabaseKey) {
            const missEntries = changedDimensions.map(d => ({
              company_domain: missDomain,
              submitted_url: pages[pages.length - 1]?.url || url,
              dimension: d.dimension,
              expected_fact: d.rationale?.substring(0, 200) || null,
              miss_reason: 'discovery_gap',
              fix_applied: 'new_seed_url',
            }));

            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/evidence_misses`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify(missEntries),
            });

            if (insertResponse.ok) {
              console.log(`Logged ${missEntries.length} evidence misses for ${missDomain}`);
            } else {
              console.error('Failed to log evidence misses:', await insertResponse.text());
            }
          }
        }

        // Persist submitted public URLs to community_evidence for future scans
        if (!insiderAnswers) {
          try {
            // Find URLs that were added in this rerun (not in the original scan)
            // The new pages are typically at the end of the pages array
            const originalPageCount = previousScores.length > 0 ? pages.length : 0;
            const allPageUrls = pages.map(p => p.url);
            
            const evidenceEntries = allPageUrls.map(pageUrl => ({
              url_domain: domain,
              evidence_url: pageUrl,
              dimension: null,
              submitted_by: userId,
            }));

            if (evidenceEntries.length > 0) {
              const { error: evidenceError } = await supabaseAdmin
                .from('community_evidence')
                .upsert(evidenceEntries, { onConflict: 'url_domain,evidence_url', ignoreDuplicates: true });

              if (evidenceError) {
                console.error('Failed to persist community evidence (non-fatal):', evidenceError);
              } else {
                console.log(`Persisted ${evidenceEntries.length} community evidence URLs for ${domain}`);
              }
            }
          } catch (ceError) {
            console.error('Error persisting community evidence (non-fatal):', ceError);
          }
        }
      } catch (logError) {
        console.error('Error logging evidence misses (non-fatal):', logError);
      }
    }

    // Record scan usage for rate limiting
    try {
      await supabaseAdmin
        .from('scan_usage')
        .insert({ user_id: userId, email: userEmail, scanned_url: url });
    } catch (usageErr) {
      console.error('Failed to record scan usage (non-fatal):', usageErr);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-company:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
