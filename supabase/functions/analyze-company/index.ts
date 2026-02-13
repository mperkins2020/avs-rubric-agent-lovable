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

9. "Rating agility and governance" - Pricing changes are versioned, communicated, approved, and reversible.

   ## Data fields for Rating agility and governance (use these exact field names in analysis)

   **pricing_versions[]**
   - pricing_versions[].version_id: string, example: "v2026_01"
   - pricing_versions[].effective_date: ISO string
   - pricing_versions[].scope: new_customers_only | all_customers | opt_in
   - pricing_versions[].applies_to_segments: list of indie | team | enterprise
   - pricing_versions[].change_types: list of price_change | limit_change | unit_definition_change | overage_policy_change | packaging_change | discount_change
   - pricing_versions[].summary: string
   - pricing_versions[].notice_days: number or null
   - pricing_versions[].communication_channels: list of pricing_page | changelog | email | in_product | blog | sales_outreach | contract
   - pricing_versions[].grandfathering_policy: none | until_renewal | fixed_period | explicit_date
   - pricing_versions[].grandfather_until: ISO string or null (required if grandfathering_policy is fixed_period or explicit_date)
   - pricing_versions[].migration_path: none | self_serve_upgrade | assisted_migration | forced_migration
   - pricing_versions[].rollback_option: none | revert_plan | revert_rates | cancel_without_penalty
   - pricing_versions[].diff_url: string or null

   **governance**
   - governance.approver_roles: list of product | finance | sales | exec | legal | security
   - governance.change_log_system: none | doc | ticketing | repo | pricing_tool
   - governance.decision_log_exists: boolean
   - governance.pricing_review_cadence: none | monthly | quarterly | ad_hoc
   - governance.experimentation_allowed: boolean
   - governance.experiment_controls: list of feature_flags | cohort_rollout | holdout_tests | kill_switch (optional)
   - governance.contract_versioning: none | order_form_versioned | msa_versioned | both
   - governance.notice_policy_default_days: number or null
   - governance.change_approval_sla_days: number or null

   **policies (extend existing policies object)**
   - policies.pricing_last_updated: ISO string or null
   - policies.pricing_change_notice_public: none | stated_days | implied
   - policies.pricing_change_notice_days: number or null
   - policies.grandfathering_public: none | stated
   - policies.rollback_public: none | stated
   - policies.overage_behavior: hard_stop | soft_limit | auto_topup | rollover (reuse)

   **trust_surfaces[] (reuse existing object)**
   - trust_surfaces[].surface_type: changelog | policy_docs | limit_behavior_docs | status_page | postmortems | audit_export | usage_dashboard | cost_dashboard | alerting
   - trust_surfaces[].availability: public | in_product | both
   - trust_surfaces[].evidence_url: string or null

   **segments[] (reuse existing segments objects)**
   - segments[].name: indie | team | enterprise
   - segments[].priority_weight: float 0..1

   **facts[] (evidence ledger, required)**
   Each fact must be written into facts[] with:
   - field_path: string, example: pricing_versions[v2026_01].notice_days
   - value: any
   - source_type: public_url | doc | contract | user_input | assumption
   - reliability: float 0..1
   - evidence_ref: URL or attachment ID
   - timestamp: ISO string

   ## Evidence collection rules (before scoring)
   1) Extract public change signals from pricing pages ("last updated"), changelogs, blog posts, docs, terms, and trust centers, store as facts[].
   2) If no pricing history is visible, do not invent versions. Leave pricing_versions[] empty and prompt for insider inputs.
   3) If user provides a change event, create a pricing_versions[] entry with source_type=user_input in facts.
   4) If public evidence conflicts with user input, flag a conflict and lower confidence.

   ## Scoring (deterministic)
   Score per segment, then aggregate across segments.

   **Segment applicability**
   If segments[] is empty, assume all three segments with equal weights and lower confidence.

   #### Subtests (0 or 1 each, per segment)

   **G1 Versioning and effective dates**
   Pass if at least one is true:
   - pricing_versions[] contains a version that includes this segment in applies_to_segments AND has effective_date
   - policies.pricing_last_updated is present AND a trust_surfaces[] entry exists with surface_type == policy_docs or changelog and a valid evidence_url

   **G2 Notice and communication**
   Pass if at least one is true:
   - A version for this segment has notice_days >= 14 AND communication_channels is non-empty
   - policies.pricing_change_notice_days >= 14
   - A trust_surfaces[] entry exists with surface_type == changelog and availability == public and a valid evidence_url
   Segment strictness:
   - For enterprise, require notice_days or pricing_change_notice_days to be present (not null) to pass.

   **G3 Grandfathering or migration clarity**
   Pass if at least one is true:
   - A version for this segment has grandfathering_policy != none
   - A version for this segment has migration_path != none AND scope != all_customers (opt-in or new customers only)
   - policies.grandfathering_public == stated

   **G4 Rollback or reversibility**
   Pass if at least one is true:
   - A version for this segment has rollback_option != none
   - policies.rollback_public == stated
   - governance.experimentation_allowed == true AND governance.experiment_controls includes kill_switch
   Segment strictness:
   - For enterprise, pass requires either rollback_option != none OR contract versioning in G5.

   **G5 Approval and audit trail**
   Pass if:
   - governance.approver_roles has at least 2 roles
   AND
   - governance.change_log_system != none
   AND
   - governance.decision_log_exists == true
   Enterprise add-on requirement:
   - If segment is enterprise, also require governance.contract_versioning != none.

   **G6 Rate and limit policy coverage**
   Pass if:
   - a trust_surfaces[] entry exists with surface_type == limit_behavior_docs and a valid evidence_url
   AND
   - at least one of these is true:
     - policies.overage_behavior is present
     - a trust_surfaces[] entry exists with surface_type == policy_docs and evidence_url contains pricing or billing policy

   #### Points to score mapping (0-2, per segment)
   points = sum(G1..G6)
   - 0-2 points: segment score = 0
   - 3-4 points: segment score = 1
   - 5-6 points: segment score = 2

   #### Dimension aggregation (0-2)
   - If segments[].priority_weight exists and sums to 1: compute weighted average of segment scores.
   - If missing: equal-weight across segments, and lower confidence.

   #### Gates (hard enforcement caps)
   - If the highest-priority segment fails G5: cap final dimension score at 1.
   - If there exists any pricing_versions[] entry with scope == all_customers AND notice_days is null AND communication_channels is empty: cap final score at 1.
   - If a version includes unit_definition_change and diff_url is null: cap final score at 1.

   ## Confidence (separate from score)
   Compute confidence per subtest:
   - subtest_confidence = max(facts[].reliability among facts used by that subtest)
   - If no facts used: 0

   Per segment:
   - segment_confidence = average(subtest_confidence for G1..G6)

   Dimension confidence:
   - Identify highest-priority segment: max segments[].priority_weight (or enterprise if weights missing).
   - dimension_confidence = min(confidence(highest-priority segment), average(segment_confidence across segments))

   Confidence labels: High >= 0.75, Medium 0.45-0.74, Low < 0.45

   Conflict rule: If two facts with reliability >= 0.65 disagree for the same field_path, flag conflict and cap confidence at Medium until resolved.

   ## Missing-insider prompts (ask only when confidence is not High, max 5 questions)
   1) List your last 1 to 3 pricing or limit changes, include effective date, scope, and change types.
      -> pricing_versions[]
   2) For each change, how many days notice, and how was it communicated.
      -> pricing_versions[].notice_days, communication_channels
   3) Do existing customers get grandfathered, until renewal or a fixed date, and what is the migration path.
      -> pricing_versions[].grandfathering_policy, grandfather_until, migration_path
   4) What is the rollback option if a change breaks trust or economics.
      -> pricing_versions[].rollback_option OR policies.rollback_public
   5) Who approves pricing changes, where is the change logged, do you have a decision log, and do you version contracts for enterprise.
      -> governance.*

   ## Rerun behavior (must be explicit in output)
   When the user provides missing inputs:
   1) Persist inputs into pricing_versions[], governance, policies, and trust_surfaces[].
   2) Add corresponding facts[] entries with source_type=user_input, add evidence_ref if provided.
   3) Recompute G1-G6, segment scores, gates, final score, and confidence.
   4) In the report, include: score before vs after, confidence before vs after, new evidence added (by subtest), remaining unknowns (by subtest), conflicts detected and resolution needed.

10. "Measurement and cadence" - Regular reviews drive evidence-based changes to units and rails.

   ## Data fields for Measurement and cadence (use these exact field names in analysis)

   **measurement_cadence**
   - measurement_cadence.primary_metrics[]: list of objects:
     - measurement_cadence.primary_metrics[].name: string
     - measurement_cadence.primary_metrics[].category: value_delivery | economic_predictability | growth | reliability
     - measurement_cadence.primary_metrics[].definition: string
     - measurement_cadence.primary_metrics[].target: string or number or null
     - measurement_cadence.primary_metrics[].time_window: weekly | monthly | quarterly
   - measurement_cadence.review_cadence: weekly | biweekly | monthly | quarterly | ad_hoc | none
   - measurement_cadence.review_owner_roles: list of product | finance | growth | eng | sales | exec
   - measurement_cadence.artifacts[]: list of objects:
     - measurement_cadence.artifacts[].artifact_type: dashboard | weekly_review_doc | pricing_review_doc | incident_review | experiment_readout | qbr
     - measurement_cadence.artifacts[].availability: public | internal
     - measurement_cadence.artifacts[].evidence_url: string or null
     - measurement_cadence.artifacts[].last_updated: ISO string or null
   - measurement_cadence.decision_log_exists: boolean
   - measurement_cadence.change_actions_last_90_days[]: list of objects:
     - measurement_cadence.change_actions_last_90_days[].date: ISO string
     - measurement_cadence.change_actions_last_90_days[].change_type: unit_change | limit_change | overage_policy_change | packaging_change | rail_change | pricing_change
     - measurement_cadence.change_actions_last_90_days[].linked_metrics[]: list of metric names from primary_metrics[]
     - measurement_cadence.change_actions_last_90_days[].summary: string
     - measurement_cadence.change_actions_last_90_days[].evidence_url: string or null

   **trust_surfaces[] (reuse existing object)**
   - trust_surfaces[].surface_type: changelog | status_page | postmortems | policy_docs | usage_dashboard | cost_dashboard | audit_export
   - trust_surfaces[].availability: public | in_product | both
   - trust_surfaces[].evidence_url: string or null

   **forecasting_surfaces (reuse existing object)**
   - forecasting_surfaces.cost_visibility_surface: none | dashboard_total | dashboard_breakdown | export_logs
   - forecasting_surfaces.breakdown_level: none | by_project | by_user | by_workflow | by_model | by_endpoint

   **facts[] (evidence ledger, required)**
   Each fact must be written into facts[] with:
   - field_path: string, example: measurement_cadence.review_cadence
   - value: any
   - source_type: public_url | doc | contract | user_input | assumption
   - reliability: float 0..1
   - evidence_ref: URL or attachment ID
   - timestamp: ISO string

   ## Evidence collection rules (before scoring)
   1) Prefer direct cadence artifacts (dashboards, review docs, decision logs) over proxies.
   2) If only public proxies exist (changelog, postmortems, status history), score using proxies but lower confidence and label as proxy-based evidence in the narrative.
   3) Do not infer review cadence from release cadence unless explicitly stated.

   ## Scoring (deterministic)

   #### Subtests (0 or 1 each)

   **M1 Metric set covers value and predictability**
   Pass if:
   - measurement_cadence.primary_metrics[] includes at least 1 metric with category == value_delivery
   AND
   - includes at least 1 metric with category == economic_predictability
   Examples of predictability metrics: surprise-bill tickets, spend variance, margin floor violations, cost per value unit.

   **M2 Instrumentation exists to measure**
   Pass if at least one is true:
   - forecasting_surfaces.cost_visibility_surface in {dashboard_breakdown, export_logs} AND breakdown_level != none
   - a trust_surfaces[] entry exists with surface_type in {usage_dashboard, cost_dashboard, audit_export} and a valid evidence_url
   - measurement_cadence.artifacts[] includes an internal dashboard with last_updated present

   **M3 Operating cadence is defined**
   Pass if:
   - measurement_cadence.review_cadence != none
   AND
   - measurement_cadence.review_owner_roles length >= 2

   **M4 Decision loop exists**
   Pass if:
   - measurement_cadence.decision_log_exists == true
   OR
   - measurement_cadence.artifacts[] includes weekly_review_doc or pricing_review_doc with last_updated present

   **M5 Cadence produces economic changes**
   Pass if:
   - measurement_cadence.change_actions_last_90_days[] has at least 2 entries
   AND
   - each entry has change_type in {unit_change, limit_change, overage_policy_change, packaging_change, rail_change, pricing_change}
   AND
   - each entry has at least 1 linked_metrics[]

   **M6 Public accountability proxy (only if no internal artifacts)**
   Pass if at least one is true:
   - a public trust_surfaces[] changelog exists with evidence_url
   - a public trust_surfaces[] status_page or postmortems exists with evidence_url
   - a public policy_docs page exists with evidence_url and shows update dates
   Note: if internal artifacts exist (M4 true via internal evidence), M6 is optional and can be excluded from points.

   #### Points to score mapping (0-2)
   Let points = sum(applicable subtests) where M6 is applicable only if M4 is not satisfied by internal artifacts.
   - 0-2 points: score = 0
   - 3-4 points: score = 1
   - 5-6 points: score = 2

   #### Gates (hard enforcement caps)
   - If M1 fails: cap score at 1. If you do not track predictability, the loop is incomplete.
   - If M2 fails: final score = 0. No instrumentation, no credible cadence.
   - If M5 fails: cap score at 1. Reviews without changes are theater.

   ## Confidence (separate from score)
   Compute confidence per subtest:
   - subtest_confidence = max(facts[].reliability among facts used by that subtest)
   - If no facts used: 0

   Dimension confidence:
   - dimension_confidence = average(subtest_confidence for applicable subtests)

   Confidence labels: High >= 0.75, Medium 0.45-0.74, Low < 0.45

   Conflict rule: If two facts with reliability >= 0.65 disagree for the same field_path, flag conflict and cap confidence at Medium until resolved.

   ## Missing-insider prompts (ask only when confidence is not High, max 5 questions)
   1) List your 3 to 6 primary metrics, include at least one predictability metric and definitions.
      -> measurement_cadence.primary_metrics[]
   2) What is your review cadence, and which roles attend.
      -> measurement_cadence.review_cadence, measurement_cadence.review_owner_roles
   3) What measurement artifacts exist (dashboards, weekly review doc, pricing review doc), and when were they last updated.
      -> measurement_cadence.artifacts[]
   4) Do you keep a decision log for pricing, units, and rails changes.
      -> measurement_cadence.decision_log_exists
   5) List 2 to 5 changes in the last 90 days tied to metrics, include dates and linked metrics.
      -> measurement_cadence.change_actions_last_90_days[]

   ## Rerun behavior (must be explicit in output)
   When the user provides missing inputs:
   1) Persist inputs into measurement_cadence, plus any supporting trust_surfaces[] and forecasting_surfaces.
   2) Add corresponding facts[] entries with source_type=user_input, add evidence_ref if provided.
   3) Recompute M1-M6, score, gates, and confidence.
   4) In the report, include: score before vs after, confidence before vs after, new evidence added (by subtest), remaining unknowns (by subtest), conflicts detected and resolution needed.

CRITICAL OUTPUT RULES:
- Keep rationale to 1-2 sentences max per dimension.
- Keep observed arrays to max 3 items per dimension.
- Keep uncertaintyReasons to max 2 items per dimension.
- Do NOT include facts[] or raw data in the output JSON. Only include the scored results.
- Do NOT echo back the spec or field schemas. Only output the final scores.

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
      max_tokens: 32768,
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
