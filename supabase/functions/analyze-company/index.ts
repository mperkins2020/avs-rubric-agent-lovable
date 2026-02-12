import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
}

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

For each of the 10 dimensions below, provide:
- score: 0 (not present), 1 (emerging), or 2 (strong)
- confidence: 0.0 to 1.0 based on how much evidence you have
- notObservable: true if there's genuinely no way to assess this from public info
- rationale: 2-3 sentences explaining your score
- observed: Array of specific things you observed
- uncertaintyReasons: Array of reasons for uncertainty

THE 10 DIMENSIONS:

1. "Product north star" - One measurable 90-day outcome for value and predictability.

2. "ICP and job clarity" - Clear target user and job, anchored in workflows.

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

6. "Pools and packaging" - Tiers separate exploration from production by segment.

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

8. "Safety rails and trust surfaces" - Controls prevent surprises, show usage, enable limits.

9. "Rating agility and governance" - Versioned pricing changes with approvals and traceability.

10. "Measurement and cadence" - Regular reviews drive evidence-based pricing and rails changes.

Also provide:
- strengths: Top 3 areas where they excel with evidence
- weaknesses: Top 3 areas needing improvement
- trustBreakpoints: Points where trust could break (max 3)
- recommendedFocus: Their top priority for next 90 days

Return a JSON object matching this schema:
{
  "dimensionScores": [
    {
      "dimension": "dimension name exactly as listed above",
      "score": 0 | 1 | 2,
      "confidence": 0.0-1.0,
      "notObservable": boolean,
      "rationale": "explanation",
      "observed": ["specific observations"],
      "uncertaintyReasons": ["reasons for uncertainty"]
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
    throw new Error('LOVABLE_API_KEY not configured');
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
      temperature: 0.3,
      max_tokens: 16384,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Lovable AI error:', error);
    throw new Error(`AI request failed: ${response.status}`);
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
    throw new Error('Failed to parse AI response as JSON');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pages, url }: AnalyzeRequest = await req.json();

    if (!pages || pages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No pages provided for analysis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${pages.length} pages from ${url}`);

    // Prepare content for analysis
    const combinedContent = pages.map(page => 
      `## ${page.title} (${page.url})\n\n${page.markdown}`
    ).join('\n\n---\n\n');

    // Truncate if too long (keeping ~100k chars for safety)
    const truncatedContent = combinedContent.length > 100000 
      ? combinedContent.substring(0, 100000) + '\n\n[Content truncated...]'
      : combinedContent;

    console.log('Content length:', truncatedContent.length);

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

Website Content:
${truncatedContent}`;

    const rubricData = await callLovableAI(RUBRIC_SCORING_PROMPT, scoringContent) as Record<string, unknown>;
    console.log('Rubric scoring complete');

    // Calculate totals
    const dimensionScores = (rubricData.dimensionScores || []) as Array<{ 
      dimension: string; 
      score: number; 
      confidence: number; 
      notObservable: boolean;
      rationale: string;
      observed: string[];
      uncertaintyReasons: string[];
    }>;
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

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-company:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
