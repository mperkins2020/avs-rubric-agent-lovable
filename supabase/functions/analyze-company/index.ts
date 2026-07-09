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
  existingProfile?: Record<string, unknown>;
  // Fix 2 metadata forwarded from scrape-website
  unresolvedPageCount?: number;
  totalQueuedCount?: number;
  confirmedMissUrls?: string[];
  // Background processing: true = poll-only (check job status, do not start new analysis)
  pollOnly?: boolean;
}

// Deno EdgeRuntime type for background processing
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

const ANALYSIS_VERSION = '2026-07-09-pipeline-v29';

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
  "model_type_l1": "access" | "consumption" | "outcome" | "hybrid" | "gated" | "unclassified",
  "model_type_l2": "per-seat" | "per-license" | "flat-rate-tiered" | "per-unit-metered" | "credit-pool" | "prepaid-block" | "event:resolution" | "event:conversation" | "event:checkpoint" | "share:revenue" | "share:clinical" | "access+consumption" | "access+outcome" | "consumption+outcome" | "unspecified",
  "model_type_confidence": 0.0 to 1.0,
  "classification_evidence": ["2–5 short verbatim snippets from pricing content that determined the classification"],
  "category_primary": "AI Customer Support" | "AI Agent Platform" | "AI Coding Assistant" | "AI Sales Intelligence" | "AI Revenue Intelligence" | "AI Legal" | "AI Dev Infrastructure" | "AI Speech Platform" | "AI Healthcare" | "AI Video & Podcast" | "unclassified",
  "category_confidence": 0.0 to 1.0,
  "valueUnitGuess": "What they charge for (e.g., 'per user', 'per API call')",
  "packagingNotes": "Notes about their pricing tiers/packages",
  "trustControlsSeen": ["Array", "of", "security/trust controls mentioned"],
  "indicatorsSeen": ["Array", "of", "key indicators or metrics they mention"]
}

Pricing model classification rules:
- "access": Fixed per-user/seat/member/license pricing. No metered consumption.
- "consumption": Pay-per-use — tokens, API calls, credits, minutes, GB, etc.
- "outcome": Pay for results — per resolution, per conversation, revenue share.
- "hybrid": Two or more of the above coexist in the same product (e.g., seat base + usage overages).
- "gated": Pricing is entirely behind "Contact Sales" with no public prices.
- "unclassified": Pricing page exists but model cannot be determined from the content.

For model_type_l2:
- access → one of: per-seat, per-license, flat-rate-tiered, unspecified
- consumption → one of: per-unit-metered, credit-pool, prepaid-block, unspecified
- outcome → one of: event:resolution, event:conversation, event:checkpoint, share:revenue, share:clinical, unspecified
- hybrid → the two component types joined with "+", e.g., "access+consumption"
- gated or unclassified → "unspecified"

For model_type_confidence: 0.0 = no pricing page or entirely ambiguous; 1.0 = explicit, unambiguous pricing language.
For classification_evidence: 2–5 short verbatim snippets from the pricing page content that directly support model_type_l1. Return an empty array if no pricing page is available.

Product category classification rules (use these exact string values for category_primary):
- "AI Customer Support": AI-powered chat, ticketing, or resolution tools for customer-facing support (e.g., Intercom Fin, Zendesk AI, Ada, Decagon, Forethought).
- "AI Agent Platform": General-purpose platforms for building, deploying, or orchestrating AI agents or multi-agent workflows (e.g., Relevance AI, Lindy, Beam.ai, Composio).
- "AI Coding Assistant": Tools that generate, review, or explain code for developers (e.g., Cursor, GitHub Copilot, Codeium, Tabnine).
- "AI Sales Intelligence": Tools that enrich leads, prospect, or provide buyer intent data to sales teams (e.g., ZoomInfo, Clay, Apollo, Lusha).
- "AI Revenue Intelligence": Tools that analyze sales calls, CRM data, or pipeline health to drive revenue outcomes (e.g., Gong, Clari, Chorus, Salesloft).
- "AI Legal": AI tools for contract review, legal research, drafting, or compliance (e.g., Harvey, Ironclad, Spellbook, Lexis+AI).
- "AI Dev Infrastructure": AI model serving, inference, fine-tuning, or MLOps platforms for developers and engineers (e.g., Together AI, Modal, Replicate, Baseten).
- "AI Speech Platform": Voice AI tools — ASR (transcription), TTS (synthesis), voice agents, or real-time speech analytics (e.g., Deepgram, ElevenLabs, Speechmatics, Livekit).
- "AI Healthcare": AI tools for clinical documentation, medical coding, diagnostics, or patient engagement (e.g., Abridge, Nabla, Suki, Ambience).
- "AI Video & Podcast": AI-assisted video editing, podcast production, or content repurposing tools (e.g., Descript, Opus Clip, Riverside, Podcastle).
- "unclassified": The product does not clearly fit any of the above categories.

For category_confidence: 1.0 = the company's primary product unambiguously matches the category; 0.5 = plausible fit but the product spans multiple categories; 0.0 = category cannot be determined. Use the company's PRIMARY product and ICP — not every feature they offer.

Be analytical and precise. If you can't determine something, use reasonable inferences based on the content. For productSurface, model_type_l1, and category_primary, use exactly those string values.`;

const RUBRIC_SCORING_PROMPT = `You are an expert in SaaS pricing and value strategy. Score this company against the AVS (Adaptive Value System) rubric.

EVIDENCE QUALITY RULES (MANDATORY — apply before scoring every dimension):
1. REJECT as evidence: copyright footers, cookie banners, navigation menus, social media links, generic legal boilerplate, "All rights reserved" text, partner logos without context, press release lists, job postings, and any auto-generated or templated content.
2. REJECT vague marketing slogans as evidence unless accompanied by specific, concrete details (metrics, features, workflows, pricing numbers). "We help teams succeed" is NOT evidence. "Reduces deployment time by 40%" IS evidence.
3. Each item in "observed" MUST cite a specific page and a concrete fact (e.g., "Pricing page lists 3 tiers: Free, Pro ($49/mo), Enterprise (custom)"). Never cite a footer, nav link, or copyright notice.
4. Confidence should reflect the QUALITY and SPECIFICITY of evidence, not just its presence. A pricing page with detailed tier breakdowns = high reliability (0.8+). A homepage with vague feature bullets = low reliability (0.3-0.4).
5. If the only evidence for a subtest comes from boilerplate, navigation, or footer content, that subtest FAILS.
6. When the same fact appears on multiple pages, count it once — do not inflate confidence by repetition.
7. TIER ATTRIBUTION: When citing plan-specific features, policies, or constraints, name the EXACT plan tier the evidence belongs to (e.g., "Team plan allows custom overage pricing for seats over 20"). Never generalize a tier-specific feature to a different tier. If a feature applies to multiple tiers, list each tier explicitly. Enterprise "custom pricing" is NOT the same as a Team plan's seat overage policy.
8. LEGAL vs PRODUCT EVIDENCE: Privacy policies, biometric notices, data processing addenda, and compliance legal pages describe COMPANY obligations to regulators — NOT customer-facing safety rails or admin controls. Do NOT cite legal compliance language (e.g., "monitor usage of our Service") as evidence for Safety rails, budget caps, or trust surfaces. Safety rails evidence must come from product pages, pricing pages, docs, or trust centers — not legal boilerplate.
9. STRUCTURED DATA CAVEAT: Sections labeled "Machine-Extracted — NOT direct quotes" contain AI-paraphrased data. Use them as scoring context but do NOT cite their text as direct quotes in sourceEvidence. Always prefer the original markdown content for direct citations.
10. COUNTERVAILING EVIDENCE ON A SINGLE PAGE: When one page presents BOTH favorable and unfavorable evidence for the same dimension, weigh ALL of it together — never score off a single excerpt read in isolation. Before scoring a dimension, scan the full content of each relevant page for sections that qualify, contradict, or complete a policy you already found. Example: a credits/billing page may state "unused daily free credits do not accumulate" (unfavorable for rollover) AND, elsewhere on the same page, "unused monthly plan credits roll over automatically" (favorable) — these describe different tiers and BOTH must be scored, naming the tier each applies to per Rule 7. A single unfavorable snippet MUST NOT suppress a dimension when the same page documents a favorable policy for another tier, plan, or scope.

PRICING MODEL CATEGORY AWARENESS (MANDATORY — apply throughout all dimension scoring):
The "Pricing Model" in the user content tells you the pricing category. Apply these overrides wherever they conflict with individual subtest defaults:

ACCESS/SEAT-BASED products (Pricing Model == "access"): Per-user/seat pricing, no metered consumption. These rules override the default subtest logic:
- D5 C1: Pass if ≥1 cost driver with driver_unit == seats AND per-seat price is published for at least one tier. The "≥3 drivers" and "≥1 inference-related" requirements are NOT applicable — seat products have one driver by design.
- D5 C4: Pass if per-seat price is published for at least one non-enterprise tier. p50/p95 variance is NOT required — seat cost is deterministic (seats × price).
- D5 C5: Auto-pass. Seat counts don't spike. Spike trigger requirements do NOT apply.
- D5 C6: Pass if the pricing page provides enough information to calculate total cost. forecasting_surfaces.alerts is NOT required — variable-cost alerts are N/A when cost is deterministic.
- D5 C6 gate: The "If C6 fails: cap score at 1" gate does NOT apply for seat-based products.
- D6 P3: If segment_pools is empty, pass P3 if the product has defined tier boundaries — at minimum, feature set listed per tier AND seat limits or team-size bands defined (e.g., "Team plan: up to 20 seats, features X/Y/Z"). Do NOT fail P3 solely because metered pools are absent in a seat-based product.
- D6 P3 gate: The "If P3 fails for the highest-priority segment: cap final dimension score at 1" gate applies only if P3 genuinely fails under the seat-based interpretation above. If tiers have clear boundaries, P3 passes.
- D7 R1: Pass if what happens at seat or plan limits is documented (e.g., "contact sales for more seats", "features restricted at limit", "upgrade required", "account downgraded to free limits"). Overage disclosure surface on a per-unit basis is N/A.
- D7 R2: Auto-pass if no tier has overage_enabled == true. Overage unit pricing is not applicable when costs don't vary by usage.
- D7 R3: Pass if admin can manage seat count (add/remove members) and has subscription visibility. Cap and usage alert mechanisms for variable consumption are N/A.
- D7 R6: Pass if total cost is deterministic from published pricing (no hidden variable charges). Estimation surfaces and usage alerts for variable spend are N/A for seat-based.
- D7 overage_behavior missing gate: If no tier has overage_enabled == true AND the product is seat-based, a missing overage_behavior means "not applicable" — do NOT apply the "policies.overage_behavior is missing → score = 0" gate.
- D8 T1: Pass if admin controls for user and access management exist (add/remove users, manage permissions, control who has access). Budget caps and usage caps for variable spend are N/A — do NOT penalize for their absence.
- D8 T2: Pass if admin has visibility into team membership and subscription status (member list, billing plan view, seat count). Usage-based spend alerts are N/A.
- D8 T3: Auto-pass. Cost = seats × price is deterministic. Pre-spend estimation for variable consumption is N/A.
- D8 T6: Pass if what happens at plan boundaries is documented (feature restrictions, upgrade prompts, or limit behavior stated). Rate limits and circuit breakers for variable usage are N/A.
- D8 T2 gate: The "If T2 fails: cap final dimension score at 1" gate does NOT apply when T2 passes under the seat-based reinterpretation above.

CONSUMPTION-BASED ("consumption") and PLATFORM/COMPUTE products: Apply all subtests as specified in each dimension. No overrides.

HYBRID products ("hybrid"): Score the access/seat component using access-based overrides above, the metered/consumption component using standard consumption rules. For subtests that span both components (D5 C1, D6 P3, D7 R1–R6), the lower-passing component is binding. For D8, both enterprise trust surfaces (SSO, audit logs, admin controls) AND consumption safety rails (caps, alerts, dashboards for the metered component) must be present for 2/2.

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
   Pass if ANY of the following tiers are satisfied:

   Tier A (explicit predictability):
   - at least one observable_signals[] exists with maps_to in {economic_predictability, both}
   OR
   - north_star.predictability_metric_name is present

   Tier B (implicit predictability via transparent usage pricing):
   Pass if ALL THREE of these conditions hold simultaneously:
   1. Credit-based, token-based, or metered pricing is present (e.g., "credits", "tokens", "messages", "compute units", "API calls" with visible per-unit pricing or bundle sizes)
   2. Per-unit cost is visible or calculable from the public pricing page (e.g., "$0.01 per message", "100 credits for $25", tier tables with usage caps)
   3. A usage dashboard, usage tracker, spend alert, budget cap, or cost estimation surface is mentioned or shown (e.g., "track your usage", "set spending limits", "usage dashboard", "cost calculator")

   IMPORTANT: Vague mentions of "flexible pricing" or "pay as you go" alone do NOT satisfy Tier B. All three conditions must hold with concrete evidence from the scraped pages.

   Tier C (bounded-scope predictability for AI-native products):
   Pass if ALL THREE of these conditions hold simultaneously:
   1. Flat-rate or tiered pricing plans are present (not purely pay-per-use)
   2. Capability envelopes or scope boundaries are clearly defined (e.g., "unlimited messages", "X projects included", "Y team members", "unlimited usage within plan", specific feature limits per tier)
   3. Plan boundaries provide meaningful economic predictability despite variable outputs (e.g., knowing your monthly cost is capped even if individual task complexity varies)

   IMPORTANT: This tier recognizes that for AI-native products with stochastic outputs, capping INPUT scope (messages, projects, seats) IS a valid form of economic predictability, even when individual OUTPUT complexity varies. Do NOT require deterministic per-unit outcomes for this tier.

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
   - If NS2 fails: reduce confidence by 0.15 but allow score 2 if other subtests justify it. Predictability is preferred but not required for AI-native products.
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
   Pass if ANY of the following are true:
   Tier A (explicit): jtbd[0].success_state exists AND (jtbd[0].must_have_requirements[] length >= 1 OR icp_profile.top_constraints[] length >= 1)
   Tier B (implicit via product surface): The product has named product surfaces or platforms (e.g., "ElevenCreative", "ElevenAgents", "Slides AI") with documented capabilities, target users, and measurable I/O requirements — even without a single universal success metric. Pass if jtbd[0].inputs[] length >= 1 AND jtbd[0].outputs[] length >= 1 AND (jtbd[0].must_have_requirements[] length >= 1 OR icp_profile.top_constraints[] length >= 1).
   IMPORTANT: Do NOT require a single published quantified outcome target (e.g., "95%+ accuracy") if the product's job is inherently variable (e.g., creative output, voice generation). Measurability via documented constraints and capability scope is sufficient for Tier B.

   **J4 Workflow specificity exists**
   Pass if at least one is true:
   - icp_profile.primary_workflows[] length >= 1
   - positioning_surfaces[] includes docs_quickstart with a valid evidence_url
   - positioning_surfaces[] includes api_reference with a valid evidence_url

   **J5 Non-fit boundaries are stated**
   Pass if ANY of the following are true:
   Tier A (explicit non-fit): icp_profile.non_fit_criteria[] length >= 1
   Tier B (explicit exclusions): a positioning_surfaces[] entry exists with surface_type == use_cases_page and evidence shows explicit exclusions, captured in facts
   Tier C (implicit scope boundaries for B2B SaaS): The product has at least 2 distinct named use-case verticals or product surfaces AND the ICP is specific enough (primary_buyer_role + industries[] non-empty) that the implicit boundary is clear (e.g., "API-first voice platform for developers building speech applications" implicitly excludes consumer, non-technical buyers, non-audio use cases). Pass Tier C only if J1 has already passed and at least 2 job statements (jtbd[] length >= 2) are present with different target roles or verticals.
   NOTE: Explicit "who we are NOT for" statements are Tier A evidence and should be noted when present. However, absence of explicit non-fit statements does NOT automatically fail this subtest for B2B SaaS products with clear vertical targeting. Most B2B SaaS companies define fit implicitly through their ICP — only penalize if scope is genuinely ambiguous.

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
   Pass if ANY of the following tiers are satisfied:
   Tier A (full determinism): value_units[].metering_formula, granularity, rounding_rule, and attribution_level are all present.
   Tier B (explicit formula, implicit rounding): value_units[].metering_formula is explicitly published with granularity (e.g., "characters are converted to credits at a documented rate", "$0.30 per 1,000 characters", "1 credit = 1 minute of audio"), AND attribution_level is present. Rounding_rule and minimum_charge need not be published if the formula is explicit enough to calculate cost for any input size.
   IMPORTANT: rounding_rule and attribution_level are rarely published publicly for consumption AI products. Do NOT fail V2 solely because rounding rules are undocumented if the metering formula is explicit and the granularity is documented. Tier B is the expected pass threshold for most consumption AI products.

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
   Pass if ANY of the following tiers are satisfied:
   Tier A (full auditability): value_units[].audit_surface is dashboard_breakdown OR export_logs AND breakdown_level != none.
   Tier B (in-product visibility): value_units[].audit_surface is dashboard_total AND the product has a documented mechanism for users to monitor remaining balance or consumption (e.g., in-product credit counter, remaining-minutes display, low-credit notification system, subscription page showing credits remaining). This recognizes that for subscription-based consumption AI products, a real-time balance surface IS a trust control even without granular per-request breakdown.
   NOTE: audit_surface == none always fails V6. dashboard_total alone without any notification or alert mechanism does NOT pass — there must be at least one proactive signal (alert, notification, or in-product indicator) alongside the total, or the dashboard must allow the user to take action based on the total (e.g., add credits, upgrade plan).

   #### Points to score mapping (0-2)
   points = sum(V1..V6)
   - 0-2 points: score = 0
   - 3-4 points: score = 1
   - 5-6 points: score = 2

   #### Gates (hard enforcement caps)
   - If V1 fails: cap score at 1.
   - If V2 fails: cap score at 1.
   - If V6 fails (audit_surface == none, or dashboard_total with no notification/action mechanism): cap score at 1.
   Rationale: you cannot claim a production-grade value unit without any auditability surface. However, V6 Tier B recognizes that in-product balance visibility with alerts is a genuine trust surface for consumption AI products.

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
     - workflows[].driver_contributions[].typical_per_value_unit: number or null  // typical observed quantity; leave null if not publicly documented
     - workflows[].driver_contributions[].high_per_value_unit: number or null     // high-end observed quantity; leave null if not publicly documented
     - workflows[].driver_contributions[].notes: string

   **cost_estimates[]**
   - cost_estimates[].workflow_name: string, must match workflows[].name
   - cost_estimates[].cost_per_value_unit_typical: number or null  // leave null if not publicly documented
   - cost_estimates[].cost_per_value_unit_high: number or null     // leave null if not publicly documented
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

   **C4 Cost calculability from published information**
   Pass if total cost for the primary workflow is calculable from published pricing:
   - Consumption/platform: at least one per-unit rate is published (e.g., "$0.003 per minute", "$0.002 per 1K tokens", "10M tokens for $25/mo"), making cost estimation possible without insider knowledge.
   - Seat-based: per-seat price is published for at least one non-enterprise tier, making total cost calculable as seats × price. (See PRICING MODEL CATEGORY AWARENESS for full seat-based override.)
   - Hybrid: per-seat price AND per-unit price for the metered component are both published.
   NOTE: p50/p95 workflow-level cost variance estimates are NOT required. No company publicly documents these — they are in-product analytics, not public pricing transparency artifacts.

   **C5 Cost scaling and boundary behavior**
   Pass if behavior at cost boundaries or unit exhaustion is documented:
   - Consumption/platform: what happens when included usage is exhausted is documented (overage pricing published, hard stop behavior stated, or upgrade path documented); OR cost scales with a documented per-unit rate that makes scaling predictable.
   - Seat-based: auto-pass. Seat cost is deterministic. (See PRICING MODEL CATEGORY AWARENESS.)
   - Hybrid: consumption component boundary behavior is documented.
   NOTE: Internal spike triggers and engineering mitigations (caches, batch routing, model fallbacks) are NOT required. These are implementation details, not public pricing transparency artifacts.

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
   - If C6 fails: cap score at 1. Forecasting without visibility and alerts is not operational. EXCEPTION: For seat-based products, see PRICING MODEL CATEGORY AWARENESS — C6 gate does not apply.

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
   3) Name your 1 to 3 primary workflows, the primary value unit used, and typical and high-end driver usage per value unit.
      -> workflows[], workflows[].driver_contributions[]
   4) Provide your estimated cost per value unit at typical and high-end usage for the primary workflow, include assumptions.
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
   - If policies.overage_behavior is missing AND any tier has overage_enabled == true: final dimension score = 0. EXCEPTION: For seat-based products where no tier has overage_enabled == true, a missing overage_behavior means "not applicable" — do NOT apply this gate (see PRICING MODEL CATEGORY AWARENESS).
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
   - trust_surfaces[].surface_type: usage_dashboard | cost_dashboard | estimate_surface | alerting | admin_controls | audit_export | policy_docs | limit_behavior_docs | changelog | status_page | postmortems | compliance_cert
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
   OR — alternative path for security-compliant products:
   - soc2 IN tiers[].features for at least one tier in segment_tiers
   AND
   - a publicly linked trust center or compliance page exists with security controls documented
     (trust_surfaces[].surface_type == compliance_cert with availability in {public, both}, OR
      trust_surfaces[].evidence_url is not null for any surface from a trust center domain)
   NOTE: SOC 2 Type II, ISO 27001, HIPAA, PCI-DSS, FedRAMP each satisfy the soc2 condition.
   For indie segment, pass if:
   - at least one of: usage_dashboard OR alerts OR caps is present in tier features
   OR
   - soc2 IN tiers[].features for any tier in segment_tiers.

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
   - If T2 fails for the highest-priority segment: cap final dimension score at 1. EXCEPTION: For seat-based products, T2 is assessed under the seat-based interpretation (admin team/subscription visibility). If T2 passes under that interpretation, this gate does not apply.
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
- ANTI-HALLUCINATION: Your rationale MUST only describe pricing constructs that are EXPLICITLY present in the scraped content. Do NOT assert that a company uses credits, tokens, usage-based pricing, rollovers, top-ups, or any other model unless you can point to a specific quote from the evidence. If the company uses flat-rate seat-based pricing, say so. If cost drivers are not publicly documented, say "not publicly documented" — do NOT fabricate a model.
- REFUND/TERMS COMPLETENESS: When analyzing terms, refund, or cancellation policies, cite ALL material conditions found on the page — not just the first one. If a refund policy has multiple conditions (e.g., processing fees, pro-rata charges, trial conversion rules), list each one.
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

async function callLovableAI(systemPrompt: string, userContent: string, maxRetries = 2): Promise<object> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');

  if (!apiKey) {
    throw new Error('Service temporarily unavailable');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
        temperature: 0.0,
        max_tokens: 32768,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Lovable AI error (attempt ${attempt}/${maxRetries}):`, error);
      if (attempt < maxRetries) { continue; }
      throw new Error('Analysis service temporarily unavailable');
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error(`Invalid AI response structure (attempt ${attempt}/${maxRetries}):`, JSON.stringify(data));
      if (attempt < maxRetries) { continue; }
      throw new Error('Invalid AI response structure');
    }

    // Check finish_reason — retry on truncated or errored responses
    const finishReason = data.choices[0].finish_reason;
    if (finishReason && finishReason !== 'stop') {
      console.warn(`AI finish_reason: "${finishReason}" (attempt ${attempt}/${maxRetries})`);
    }

    let content = data.choices[0].message.content;

    if (!content || content.trim() === '') {
      console.error(`Empty AI response content (attempt ${attempt}/${maxRetries})`);
      if (attempt < maxRetries) { continue; }
      throw new Error('AI returned empty response');
    }

    // Detect suspiciously short responses (likely truncated/errored)
    if (content.length < 500) {
      console.warn(`AI response suspiciously short: ${content.length} chars (attempt ${attempt}/${maxRetries}): ${content.substring(0, 200)}`);
      if (attempt < maxRetries) { continue; }
      // Fall through to parsing — let it fail with a clear error
    }

    console.log(`AI response length: ${content.length} (attempt ${attempt}/${maxRetries}, finish_reason: ${finishReason})`);

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
        console.error(`JSON repair also failed (attempt ${attempt}/${maxRetries})`);
        if (attempt < maxRetries) { continue; }
        throw new Error('Failed to parse AI response as JSON');
      }
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error('Analysis failed after all retry attempts');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

   try {
    // ── Auth: JWT validation with service role bypass ────────────────────
    // Direct key comparison: if the Authorization header exactly matches
    // "Bearer <SUPABASE_SERVICE_ROLE_KEY>", this is a trusted internal call.
    // This is more reliable than JWT decode in Deno's edge runtime.
    const authHeader = req.headers.get('authorization');
    const _serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const isBenchmarkRunner =
      _serviceKey.length > 0 &&
      (authHeader ?? '') === `Bearer ${_serviceKey}`;

    if (!isBenchmarkRunner) {
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
    }

    // Resolve user identity (synthetic for service role callers)
    let userId = 'service_role';
    let userEmail = '';
    let isAnonymous = false;
    if (!isBenchmarkRunner) {
      try {
        const tok = (authHeader ?? '').replace('Bearer ', '');
        const b64 = tok.split('.')[1];
        const c = JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/')));
        userId = (c.sub as string) ?? '';
        userEmail = (c.email as string) ?? '';
        isAnonymous = (c.is_anonymous as boolean) ?? false;
      } catch { /* leave defaults */ }
    }

    if (isBenchmarkRunner) {
      console.log('Benchmark runner (service role) — auth bypass granted');
    } else {
      console.log('Authenticated user:', userId, 'anonymous:', isAnonymous);
    }

    // Rate limit: 3 scans per week per user AND per email
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Service role callers are always admin; skip has_role RPC
    let isAdmin = isBenchmarkRunner;
    if (!isBenchmarkRunner) {
      const { data: adminCheck } = await supabaseAdmin
        .rpc('has_role', { _user_id: userId, _role: 'admin' });
      isAdmin = adminCheck === true;
    }
    console.log('Admin check for', userId, ':', isAdmin);

    // Parse request body early to check if this is a re-run
    const { pages, url, insiderAnswers, previousScores, existingProfile, unresolvedPageCount, totalQueuedCount, confirmedMissUrls, pollOnly }: AnalyzeRequest = await req.json();
    const isRerun = !!(previousScores && previousScores.length > 0);

    if (!isAdmin && !isRerun && !pollOnly) {
      // Anonymous users get 1 free scan (total); authenticated users get 3/week
      const maxScans = isAnonymous ? 1 : 3;

      if (isAnonymous) {
        // Anonymous: check total all-time scan count (no time window)
        const { count: anonCount, error: anonCountError } = await supabaseAdmin
          .from('scan_usage')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (anonCountError) {
          console.error('Anonymous rate limit check failed:', anonCountError);
        } else if (anonCount !== null && anonCount >= maxScans) {
          return new Response(
            JSON.stringify({ success: false, error: 'Free scan used. Create a free account to run more analyses.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Check by user_id
        const { count: userCount, error: countError } = await supabaseAdmin
          .from('scan_usage')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', weekAgo);

        if (countError) {
          console.error('Rate limit check failed:', countError);
        } else if (userCount !== null && userCount >= maxScans) {
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

          if (!emailCountError && emailCount !== null && emailCount >= maxScans) {
            return new Response(
              JSON.stringify({ success: false, error: 'Weekly limit reached. You can run 3 analyses per week. Try again next week.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    } else if (isRerun) {
      console.log('Skipping rate limit for evidence re-run');
    }


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

    if (!pollOnly && (!pages || pages.length === 0)) {
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

    // ── pollOnly: status check without starting new analysis ──
    if (pollOnly) {
      const { data: cached } = await supabaseAdmin
        .from('scan_results')
        .select('result_json')
        .eq('url_domain', domain)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!cached?.result_json) {
        return new Response(
          JSON.stringify({ success: false, status: 'not_found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const cachedResult = cached.result_json as Record<string, unknown>;
      if (cachedResult.status === 'pending') {
        return new Response(
          JSON.stringify({ success: false, status: 'pending' }),
          { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Complete result available
      return new Response(
        JSON.stringify(cachedResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isFreshScan) {
      const { data: cached } = await supabaseAdmin
        .from('scan_results')
        .select('result_json')
        .eq('url_domain', domain)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const cachedResult = cached?.result_json && typeof cached.result_json === 'object'
        ? cached.result_json as Record<string, unknown>
        : null;

      // Another request already started this analysis — return pending status
      if (cachedResult?.status === 'pending') {
        console.log(`Job IN PROGRESS for ${domain} — returning pending status`);
        return new Response(
          JSON.stringify({ success: false, status: 'pending' }),
          { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const cachedVersion = cachedResult?.analysisVersion ?? null;

      if (cachedResult && cachedVersion === ANALYSIS_VERSION) {
        console.log(`Cache HIT for ${domain} — returning cached result (${ANALYSIS_VERSION})`);
        return new Response(
          JSON.stringify(cachedResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (cachedResult) {
        console.log(`Cache STALE for ${domain} — expected ${ANALYSIS_VERSION}, got ${String(cachedVersion ?? 'none')}`);
      } else {
        console.log(`Cache MISS for ${domain} — starting background analysis`);
      }

      // Insert pending marker so concurrent requests don't start duplicate jobs
      try {
        await supabaseAdmin
          .from('scan_results')
          .insert({
            url_domain: domain,
            result_json: { status: 'pending', analysisVersion: 'pending' },
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min pending TTL
          });
      } catch (pendingErr) {
        console.error('Failed to insert pending marker (non-fatal):', pendingErr);
      }
    }

    console.log(`Analyzing ${pages.length} pages from ${url}`);

    // ── Background processing wrapper ──
    // For fresh scans: this promise runs in the background via EdgeRuntime.waitUntil.
    // For reruns: this promise is awaited synchronously before returning.
    const analysisPromise = (async (): Promise<Record<string, unknown>> => {

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
      if (/\/(pricing|plans?|billing|usage|credits|subscription|buy)\b/.test(target)) score += 1200;
      if (/\/(templates?)\b/.test(target)) score += 350;
      if (/\/(terms|legal|privacy)\b/.test(target)) score += 450;
      if (/faq \/ accordion content/i.test(page.markdown)) score += 500;

      // Entry 053: Content-based scoring — pages with actual pricing/trust content
      // outrank pages that only match URL patterns but contain no evidence.
      // Split into two tiers: strong economic signals (+600) and trust signals (+400).
      const economicHits = (content.match(/(per\s*(user|seat|month|year|agent|license|credit|api\s*call)|\$\d|€\d|free\s*tier|free\s*trial|enterprise\s*plan|starter\s*plan|pro\s*plan|pricing\s*table|included\s*in|add-?on|top-?up|overage|billing\s*cycle)/gi) || []).length;
      if (economicHits >= 3) score += 600;
      else if (economicHits >= 1) score += 300;

      // Trust/security content boost — catches trust centers and security pages
      // regardless of URL structure (e.g. /platform/trust-security, /company/security)
      const trustHits = (content.match(/(soc\s*2|hipaa|gdpr|ccpa|pci\s*dss|iso\s*27001|penetration\s*test|audit\s*log|data\s*encrypt|compliance\s*certif|kill\s*switch|rate\s*limit|budget\s*cap|rollback\s*control)/gi) || []).length;
      if (trustHits >= 3) score += 400;
      else if (trustHits >= 1) score += 200;

      // Entry 053: /help, /docs, /faq, /support paths — two-tier scoring.
      // Pages at these paths WITH economic or trust content are high-value (billing docs,
      // credits FAQ, trust center). Pages WITHOUT are noise (product tutorials, API guides
      // for irrelevant products on multi-product domains like jetbrains.com).
      const hasEvidenceContent = economicHits > 0 || trustHits > 0;
      if (/\/(faq|support|help|docs|changelog|trust|security|api|developers?)\b/.test(target)) {
        score += hasEvidenceContent ? 900 : 100;
      }

      // Entry 053: Penalize thin pages — help articles with minimal content
      // contribute noise and dilute scorer attention on multi-product domains.
      const strippedLength = page.markdown.trim().length;
      if (strippedLength < 500) score -= 400;
      else if (strippedLength < 1500) score -= 200;

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
        // Remove malformed markdown fragments: [text\\ or [text without closing ]
        .replace(/\[[^\]\n]*\\{1,2}/g, '')
        .replace(/- \[[^\]\n]{0,50}$/g, '')
        .replace(/[>#*_`|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const collectHighSignalEvidence = (inputPages: ScrapedPage[]) => {
      const northStar: string[] = [];
      const costDriver: string[] = [];
      const icpJob: string[] = [];
      const buyerBudget: string[] = [];
      const valueUnit: string[] = [];
      const poolsPackaging: string[] = [];
      const overagesRisk: string[] = [];
      const safetyRails: string[] = [];
      const seenNorthStar = new Set<string>();
      const seenCostDriver = new Set<string>();
      const seenIcpJob = new Set<string>();
      const seenBuyerBudget = new Set<string>();
      const seenValueUnit = new Set<string>();
      const seenPoolsPackaging = new Set<string>();
      const seenOveragesRisk = new Set<string>();
      const seenSafetyRails = new Set<string>();

      const bucketMap: Record<string, { arr: string[]; seen: Set<string> }> = {
        northStar: { arr: northStar, seen: seenNorthStar },
        costDriver: { arr: costDriver, seen: seenCostDriver },
        icpJob: { arr: icpJob, seen: seenIcpJob },
        buyerBudget: { arr: buyerBudget, seen: seenBuyerBudget },
        valueUnit: { arr: valueUnit, seen: seenValueUnit },
        poolsPackaging: { arr: poolsPackaging, seen: seenPoolsPackaging },
        overagesRisk: { arr: overagesRisk, seen: seenOveragesRisk },
        safetyRails: { arr: safetyRails, seen: seenSafetyRails },
      };

      const pushUniqueEvidence = (bucket: string, pageUrl: string, snippet: string) => {
        const cleanedSnippet = cleanEvidenceLine(snippet).slice(0, 260);
        if (cleanedSnippet.length < 20) return;
        const b = bucketMap[bucket];
        if (!b || b.arr.length >= 10) return;
        const formatted = `${pageUrl}: "${cleanedSnippet}"`;
        if (b.seen.has(formatted)) return;
        b.seen.add(formatted);
        b.arr.push(formatted);
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
          const line = cleanEvidenceLine(rawLine);
          if (line.length < 20 || line.length > 360) continue;

          // North star
          if (/(build|create|prototype|production-ready|deploy|ship|launch|workflow|real[- ]time|capacity|team|template|use case)/i.test(line)) {
            pushUniqueEvidence('northStar', page.url, line);
          }

          // Cost driver
          if (/(credit|usage-based|top-?up|rollover|monthly credits?|daily credits?|overage|quota|limit|billing|cloud \+ ai|task complexity|1 credit per message|user prompt|work done|cost of each message|message history|three dots)/i.test(line)) {
            pushUniqueEvidence('costDriver', page.url, line);
          }

          // ICP and job clarity
          if (/(developer|engineer|startup|enterprise|team|freelancer|agency|designer|founder|non-technical|technical|solo|small business|mid-market)/i.test(line) &&
              /(for |built for|designed for|ideal for|who|target|persona|audience|user)/i.test(line)) {
            pushUniqueEvidence('icpJob', page.url, line);
          }
          if (/(use case|workflow|job|task|problem|solution|helps? you|enables? you|so you can)/i.test(line)) {
            pushUniqueEvidence('icpJob', page.url, line);
          }

          // Buyer and budget alignment
          if (/(free|starter|pro|team|enterprise|business|growth|scale|custom|contact sales)/i.test(line) &&
              /(plan|tier|pricing|per month|per year|\/mo|\/yr|annual|monthly)/i.test(line)) {
            pushUniqueEvidence('buyerBudget', page.url, line);
          }
          if (/(invoice|purchase order|annual contract|sso|soc ?2|dpa|rbac|admin|seat)/i.test(line)) {
            pushUniqueEvidence('buyerBudget', page.url, line);
          }

          // Value unit
          if (/(credit|token|minute|hour|api call|request|message|task|unit|per |metering|billable)/i.test(line) &&
              /(cost|price|charge|bill|meter|usage|consume|spend|deduct)/i.test(line)) {
            pushUniqueEvidence('valueUnit', page.url, line);
          }

          // Pools and packaging
          if (/(included|allowance|pool|allocation|add-on|addon|top-?up|rollover|overage|tier|upgrade|downgrade|free trial|free tier|sandbox|credits? per)/i.test(line)) {
            pushUniqueEvidence('poolsPackaging', page.url, line);
          }

          // Overages and risk allocation
          if (/(overage|exceed|limit|cap|hard stop|soft limit|auto.?top.?up|grace|spike|dispute|refund|true.?up|budget cap|spending limit)/i.test(line)) {
            pushUniqueEvidence('overagesRisk', page.url, line);
          }

          // Safety rails and trust surfaces
          if (/(rate limit|budget cap|usage cap|alert|notification|dashboard|audit|kill switch|circuit breaker|approval|admin control|visibility|monitor)/i.test(line)) {
            pushUniqueEvidence('safetyRails', page.url, line);
          }
        }

        const fullMarkdown = page.markdown;

        const targetedCostSignals: Array<{ pattern: RegExp; snippet: string }> = [
          { pattern: /default\s*mode\s*:\s*credits\s+vary\s+based\s+on\s+task\s+complexity/i, snippet: 'Default Mode: credits vary based on task complexity' },
          { pattern: /chat\s*mode\s*:\s*1\s+credit\s+per\s+message/i, snippet: 'Chat Mode: 1 credit per message' },
          { pattern: /you\s+can\s+see\s+the\s+cost\s+of\s+each\s+message[\s\S]{0,120}(?:three\s+dots?|message\s+history)/i, snippet: 'Message history exposes exact credits used per message (three-dots menu).' },
          { pattern: /make\s+the\s+button\s+gray[\s\S]{0,160}(?:0\.50|0,50)/i, snippet: 'Prompt example: "Make the button gray" maps to 0.50 credits' },
          { pattern: /remove\s+the\s+footer[\s\S]{0,160}(?:0\.90|0,90)/i, snippet: 'Prompt example: "Remove the footer" maps to 0.90 credits' },
          { pattern: /add\s+authentication\s+with\s+sign\s+up\s+and\s+login[\s\S]{0,220}(?:1\.20|1,20)/i, snippet: 'Prompt example: "Add authentication with sign up and login" maps to 1.20 credits' },
          { pattern: /build\s+me\s+a\s+landing\s+page,?\s+use\s+images[\s\S]{0,220}(?:1\.70|1,70)/i, snippet: 'Prompt example: "Build me a landing page, use images" maps to 1.70 credits' },
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

      return { northStar, costDriver, icpJob, buyerBudget, valueUnit, poolsPackaging, overagesRisk, safetyRails };
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
    console.log(`Pages: ${candidatePages.length} candidates → ${selectedUrls.length} selected (${MAX_CONTENT_CHARS - usedChars} chars remaining)`);
    console.log('Pages selected for scoring:', selectedUrls);
    if (candidatePages.length > selectedUrls.length) {
      const droppedUrls = candidatePages
        .filter(p => !selectedUrls.includes(p.url))
        .map(p => `${p.url} (priority: ${scorePagePriority(p)}, chars: ${p.markdown.length})`);
      console.warn('Pages dropped (over budget):', droppedUrls);
    }
    console.log('High-signal evidence digest counts:', {
      northStar: evidenceDigest.northStar.length,
      costDriver: evidenceDigest.costDriver.length,
    });

    // Step 1: Extract company profile (skip on re-runs if client provides existing profile)
    let companyProfile: Record<string, unknown>;
    if (isRerun && existingProfile && existingProfile.companyName) {
      console.log('Reusing existing company profile for re-run:', existingProfile.companyName);
      companyProfile = existingProfile;
    } else {
      console.log('Extracting company profile...');
      const profileContent = `Analyze this website content from ${url}:\n\n${truncatedContent}`;
      companyProfile = await callLovableAI(COMPANY_PROFILE_PROMPT, profileContent) as Record<string, unknown>;
      console.log('Company profile extracted:', companyProfile.companyName);
    }

    // ── Model-Type Classification — derived from LLM company profile (single classifier) ──
    const l1 = String(companyProfile.model_type_l1 || 'unclassified');
    const l2 = String(companyProfile.model_type_l2 || 'unspecified');
    const modelClassification = {
      model_type: l2 !== 'unspecified' ? `${l1}:${l2}` : l1,
      model_type_l1: l1,
      model_type_l2: l2,
      model_type_confidence: Number(companyProfile.model_type_confidence ?? 0),
      model_type_source: Number(companyProfile.model_type_confidence ?? 0) >= 0.50 ? 'auto' : 'unclassified',
      enterprise_pricing: l1 === 'gated' ? 'gated' : 'public',
      classification_evidence: Array.isArray(companyProfile.classification_evidence)
        ? companyProfile.classification_evidence
        : [],
    };
    console.log('Model-type classification:', modelClassification.model_type, 'confidence:', modelClassification.model_type_confidence);

    // ── Category Classification — derived from LLM company profile ──
    const VALID_CATEGORIES = [
      'AI Customer Support',
      'AI Agent Platform',
      'AI Coding Assistant',
      'AI Sales Intelligence',
      'AI Revenue Intelligence',
      'AI Legal',
      'AI Dev Infrastructure',
      'AI Speech Platform',
      'AI Healthcare',
      'AI Video & Podcast',
    ] as const;
    const rawCategory = String(companyProfile.category_primary || 'unclassified');
    const categoryClassification = {
      category_primary: (VALID_CATEGORIES as readonly string[]).includes(rawCategory) ? rawCategory : 'unclassified',
      category_confidence: Number(companyProfile.category_confidence ?? 0),
    };
    console.log('Category classification:', categoryClassification.category_primary, 'confidence:', categoryClassification.category_confidence);

    // Fix 3B: Page-to-Dimension Routing
    // Classify pages whose URLs indicate billing/invoice-only content.
    // These pages should only be used as evidence for D7 (Overages & Risk Allocation)
    // and D8 (Safety Rails), NOT for D4 (Value unit), D5 (Cost driver mapping),
    // or D6 (Pools and packaging).
    const billingOnlyPagePatterns = [
      /\/about\/payments?\b/i,
      /\/billing-support\b/i,
      /\/billing\b/i,
      /\/invoice\b/i,
      /\/payments?\b/i,
      /billing-and-invoices/i,
      /payment-support/i,
    ];

    const billingOnlyPages = pages
      .filter(p => billingOnlyPagePatterns.some(pattern => pattern.test(p.url)))
      .map(p => p.url);

    const billingOnlyRoutingInstruction = billingOnlyPages.length > 0
      ? `\nPAGE-TO-DIMENSION ROUTING (Fix 3B — MANDATORY):
The following pages are classified as billing/invoice-only pages. They may be used as evidence ONLY for Dimension 7 (Overages and risk allocation) and Dimension 8 (Safety rails and trust surfaces). Do NOT cite these pages as evidence for Dimension 4 (Value unit), Dimension 5 (Cost driver mapping), or Dimension 6 (Pools and packaging):
${billingOnlyPages.map(u => `  - ${u}`).join('\n')}
`
      : '';

    // Step 2: Score against rubric
    console.log('Scoring against AVS rubric...');

    function getCategoryGuide(category: string): string {
      if (category !== 'AI Speech Platform') return '';
      return `
CATEGORY-SPECIFIC SCORING GUIDE — AI Speech Platform (MANDATORY):
This company operates in the AI Speech Platform category. Apply the following interpretation rules for every dimension. These rules override generic rubric defaults where they conflict.

METADATA (populate in your rationale for D4 and D1):
- Metering Model: classify as one of: per_audio_minute | per_voice_minute | per_character | per_token | per_credit | per_seat_plus_usage | hybrid | quote_based
- Speech Stack Role: classify as one of: STT | TTS | voice_agent | creative_voice | full_speech_platform | enterprise_ASR

D1 — NORTH STAR METRIC:
Score 2 if the company publishes a measurable outcome: latency (TTFA, P90), word error rate (WER), transcription accuracy %, language coverage count, uptime SLA, or a verified third-party benchmark result (e.g., Artificial Analysis, TTS-Arena). Score 1 for vague claims ("industry-leading accuracy") without a number. Score 0 for no measurable claim.
STT companies: evaluate on WER/accuracy. TTS companies: evaluate on TTFA or quality benchmarks. Voice agent platforms: evaluate on end-to-end latency or call completion rates.

D2 — ICP / USE CASE CLARITY:
Score 2 if the pricing or product page explicitly names buyer segments. Accepted segments: developer/API builder, GTM operator/sales team, contact center/telephony, creator/marketing team, enterprise platform team. Score 1 for generic language ("for teams," "for enterprise"). Score 0 for no buyer segment described.

D3 — BUDGET CLARITY:
Score 2 if a buyer can estimate their bill without contacting sales — accept a public pricing table with tier limits, a usage calculator, free credits with explicit cap, or a published per-unit rate with enough context to estimate volume costs. A calculator or "estimate your bill" tool counts as D3=2 even if no flat-rate tier table exists. Score 1 if some pricing exists but a full estimate requires sales. Score 0 if all pricing is gated.

D4 — VALUE UNIT:
Score 2 if the billing unit is explicitly named AND its conversion is defined. Examples that qualify: "1 audio minute = $0.0065" | "1 credit = 1,000 characters" | "$0.20 per voice minute" | "billed per token, 1M tokens = $X".
Score 1 if a unit is named but no conversion or rate is published (e.g., "priced in credits" with no credit definition).
Score 0 if no unit is named.
CREDIT RULE: per_credit Metering Model scores D4=2 ONLY if the conversion to a physical unit (characters, minutes, tokens) is explicitly published. A named credit without a defined conversion = D4=1.
In your rationale, state the Metering Model (e.g., "Metering Model: per_character").

D5 — COST DRIVERS:
Score 2 if at least three applicable cost factors are documented.
For STT/transcription: model tier, language/accent, real-time streaming vs. async batch, diarization, add-on features (sentiment, PII redaction), storage.
For TTS/voice generation: voice model tier, language, real-time vs. pre-rendered, custom/cloned voice premium, concurrent stream limits, storage.
For voice agent platforms: LLM model tier, STT provider choice, TTS provider choice, PSTN/telephony pass-through, SIP trunking, concurrency, custom voice add-on.
PSTN RULE: Documenting that PSTN costs are passed through at carrier rates = partial (contributes to D5=1 but not sufficient alone for D5=2). Publishing actual per-minute PSTN rates or a clear range = required for D5=2 if telephony is a material cost driver.
Score 1 for one or two cost factors documented. Score 0 for none.

D6 — POOLS & PACKAGING:
Score 2 if tiers exist AND the company documents: what is included per tier, reset cadence (monthly/annual), overage or upgrade behavior, and whether a free tier or trial exists. Score 1 if tiers exist but key details are missing. Score 0 if no tier structure is published.

D7 — OVERAGES / EDGE BEHAVIOR:
Evidence varies by product type — do NOT penalize STT/TTS APIs for lacking mid-call behavior:
For STT/TTS APIs: look for rate limit behavior (429 handling), credit/quota exhaustion (hard stop vs. auto-top-up), concurrency cap behavior, quota alert or notification.
For voice agent platforms: look for what happens when credits run out mid-call, auto-billing or hard cap, call interruption behavior, email alerts, top-up mechanics, concurrency limit enforcement.
Score 2 for explicit documentation of edge behavior appropriate to the product type. Score 1 for partial mention without detail. Score 0 for no documentation.

D8 — SAFETY RAILS:
Score 2 if two or more of the following are explicitly documented: SOC 2 / ISO 27001 / HIPAA, data retention and deletion policy, recording consent or compliance guidance (GDPR, CCPA, two-party consent), voice cloning safeguards (explicit consent requirements, identity verification, or abuse prevention documentation), admin controls (user roles, access management, audit logs), dedicated Trust Center or Security page.
VOICE CLONING RULE: A generic Terms of Service or Acceptable Use Policy alone = D8=1 if no other qualifying evidence exists. Explicit consent flow documentation, a cloning abuse reporting mechanism, or a published data retention/deletion policy elevates to D8=2 when combined with at least one other qualifying item.
Score 1 for one qualifying item. Score 0 for none.
`;
    }

    // Fix 2: Confidence penalty flag — if ≥30% of queued pages were unresolved,
    // the calling layer should apply a −0.15 confidence adjustment.
    const applyUnresolvedPenalty = typeof totalQueuedCount === 'number' &&
      totalQueuedCount > 0 &&
      typeof unresolvedPageCount === 'number' &&
      (unresolvedPageCount / totalQueuedCount) >= 0.30;

    if (applyUnresolvedPenalty) {
      console.warn(
        `Fix 2: Applying −0.15 confidence penalty for ${url} — ` +
        `${unresolvedPageCount}/${totalQueuedCount} pages unresolved. ` +
        `Confirmed misses: ${(confirmedMissUrls || []).join(', ')}`
      );
    }

    const scoringContent = `
Company: ${companyProfile.companyName}
Description: ${companyProfile.oneLineDescription}
Primary Users: ${companyProfile.primaryUsers}
Product Surface: ${companyProfile.productSurface}
Pricing Model: ${companyProfile.model_type_l1}
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

${getCategoryGuide(categoryClassification.category_primary)}
HIGH-SIGNAL EVIDENCE DIGEST (prioritized snippets from public pages):

IMPORTANT — PRICING PAGE VERIFICATION:
The following URLs were successfully scraped and their content is included below. If any of these URLs contain "/pricing", "/plans", or "/billing", then a public pricing page EXISTS. You MUST NOT claim "no public pricing page" or recommend "publish a pricing page" if such a URL was scraped. Instead, analyze the actual content from that page.
Scraped URLs: ${selectedUrls.join(', ')}

- Product north star candidates:
${evidenceDigest.northStar.length > 0 ? evidenceDigest.northStar.map((item) => `  - ${item}`).join('\n') : '  - None captured'}
- Cost driver mapping candidates:
${evidenceDigest.costDriver.length > 0 ? evidenceDigest.costDriver.map((item) => `  - ${item}`).join('\n') : '  - None captured'}
- ICP and job clarity candidates:
${evidenceDigest.icpJob.length > 0 ? evidenceDigest.icpJob.map((item) => `  - ${item}`).join('\n') : '  - None captured'}
- Buyer and budget alignment candidates:
${evidenceDigest.buyerBudget.length > 0 ? evidenceDigest.buyerBudget.map((item) => `  - ${item}`).join('\n') : '  - None captured'}
- Value unit candidates:
${evidenceDigest.valueUnit.length > 0 ? evidenceDigest.valueUnit.map((item) => `  - ${item}`).join('\n') : '  - None captured'}
- Pools and packaging candidates:
${evidenceDigest.poolsPackaging.length > 0 ? evidenceDigest.poolsPackaging.map((item) => `  - ${item}`).join('\n') : '  - None captured'}
- Overages and risk allocation candidates:
${evidenceDigest.overagesRisk.length > 0 ? evidenceDigest.overagesRisk.map((item) => `  - ${item}`).join('\n') : '  - None captured'}
- Safety rails and trust surfaces candidates:
${evidenceDigest.safetyRails.length > 0 ? evidenceDigest.safetyRails.map((item) => `  - ${item}`).join('\n') : '  - None captured'}
${billingOnlyRoutingInstruction}
Website Content:
${truncatedContent}`;

    // Step 2b: 2-pass scoring for consistency
    console.log('Running 3-pass scoring...');
    const rubricPasses = await Promise.all([
      callLovableAI(RUBRIC_SCORING_PROMPT, scoringContent),
      callLovableAI(RUBRIC_SCORING_PROMPT, scoringContent),
      callLovableAI(RUBRIC_SCORING_PROMPT, scoringContent),
    ]) as Array<Record<string, unknown>>;
    console.log('All 3 scoring passes complete');

    const DIMENSION_NAMES = [
      'Product north star', 'ICP and job clarity', 'Buyer and budget alignment',
      'Value unit', 'Cost driver mapping', 'Pools and packaging',
      'Overages and risk allocation', 'Safety rails and trust surfaces',
    ];

    const getPassDimensions = (passData: Record<string, unknown>) =>
      (Array.isArray(passData.dimensionScores) ? passData.dimensionScores : []) as Array<{
        dimension: string; score: number; confidence: number; notObservable: boolean;
        rationale: string; observed: string[]; sourceEvidence?: Array<{ url: string; snippet: string }>;
        uncertaintyReasons: string[]; missingInsiderPrompts?: Array<{ question: string; fieldPaths: string[] }>;
      }>;

    const pass1Dims = getPassDimensions(rubricPasses[0]);
    const pass2Dims = getPassDimensions(rubricPasses[1]);
    const pass3Dims = getPassDimensions(rubricPasses[2]);

    // Log per-dimension scores across passes for diagnostics
    for (const dimName of DIMENSION_NAMES) {
      const s1 = pass1Dims.find(d => d.dimension === dimName)?.score ?? -1;
      const s2 = pass2Dims.find(d => d.dimension === dimName)?.score ?? -1;
      const s3 = pass3Dims.find(d => d.dimension === dimName)?.score ?? -1;
      console.log(`  [3-pass] ${dimName}: ${s1}, ${s2}, ${s3}`);
    }

    // Merge: majority vote across 3 passes.
    // If 2 or 3 passes agree on a score, that score wins (use highest-confidence agreeing pass).
    // If all 3 disagree, use the highest-confidence pass.
    const mergedDimensionScores = DIMENSION_NAMES.map(dimName => {
      const candidates = [
        pass1Dims.find(d => d.dimension === dimName),
        pass2Dims.find(d => d.dimension === dimName),
        pass3Dims.find(d => d.dimension === dimName),
      ].filter(Boolean) as typeof pass1Dims;

      if (candidates.length === 0) {
        return { dimension: dimName, score: 0, confidence: 0, notObservable: true, rationale: '', observed: [], sourceEvidence: [], uncertaintyReasons: ['No data from any pass'], missingInsiderPrompts: [] };
      }

      if (candidates.length === 1) return candidates[0];

      // Count votes per score value
      const scoreCounts = new Map<number, typeof pass1Dims>();
      for (const c of candidates) {
        const key = c.score;
        if (!scoreCounts.has(key)) scoreCounts.set(key, []);
        scoreCounts.get(key)!.push(c);
      }

      // Find majority score (2+ votes)
      let majorityGroup: typeof pass1Dims | null = null;
      for (const [, group] of scoreCounts) {
        if (group.length >= 2 && (!majorityGroup || group.length > majorityGroup.length)) {
          majorityGroup = group;
        }
      }

      if (majorityGroup) {
        // Use highest-confidence pass from the majority group
        const winner = majorityGroup.reduce((best, c) =>
          (c.confidence || 0) > (best.confidence || 0) ? c : best
        );
        return {
          ...winner,
          confidence: majorityGroup.reduce((sum, c) => sum + (c.confidence || 0), 0) / majorityGroup.length,
        };
      }

      // All 3 disagree — use highest-confidence pass
      return candidates.reduce((best, c) =>
        (c.confidence || 0) > (best.confidence || 0) ? c : best
      );
    });

    // Log consistency metrics for diagnostics
    let unanimousCount = 0;
    let splitCount = 0;
    for (const dimName of DIMENSION_NAMES) {
      const s1 = pass1Dims.find(d => d.dimension === dimName)?.score ?? -1;
      const s2 = pass2Dims.find(d => d.dimension === dimName)?.score ?? -1;
      const s3 = pass3Dims.find(d => d.dimension === dimName)?.score ?? -1;
      if (s1 === s2 && s2 === s3) {
        unanimousCount++;
      } else {
        splitCount++;
        console.warn(`  [3-pass SPLIT] ${dimName}: ${s1}, ${s2}, ${s3}`);
      }
    }
    console.log(`3-pass consistency: ${unanimousCount}/8 unanimous, ${splitCount}/8 split`);

    // Fix 3A: Score Stability Rule
    // For each dimension where the new score is LOWER than the previousScore
    // AND no newly cited evidence URL differs from the prior page set,
    // hold the prior score. Confidence from the new run still applies.
    // Conservative implementation: if previousScores is provided, we flag
    // drops but only auto-hold when we can confirm no new contradicting URLs
    // were added. When prior page URLs are not available we flag but don't hold.
    const currentPageUrls = new Set(pages.map(p => p.url));

    const stabilizedDimensionScores = mergedDimensionScores.map(dim => {
      if (!previousScores || previousScores.length === 0) return dim;

      const prev = previousScores.find(p => p.dimension === dim.dimension);
      if (!prev) return dim;

      if (dim.score < prev.score) {
        // Check whether any observed evidence URL in the new run is NEW
        // (i.e., not present in the page set we have now, which is the same
        // set available to both runs when no extra URLs were passed in).
        // Since we don't store prior page URLs, use current page set as proxy:
        // if all observed evidence URLs are in currentPageUrls, no genuinely
        // new contradicting signal was added — hold the prior score.
        const observedUrls = (dim.observed || [])
          .map((obs: string) => {
            const m = obs.match(/^(https?:\/\/[^\s:]+)/);
            return m ? m[1] : '';
          })
          .filter(Boolean);

        const hasNewEvidence = observedUrls.some(u => !currentPageUrls.has(u));

        if (!hasNewEvidence) {
          console.warn(
            `Fix 3A: Score stability hold for "${dim.dimension}" at ${url} — ` +
            `new score ${dim.score} < prior score ${prev.score}, no new contradicting evidence URLs detected. ` +
            `Holding prior score ${prev.score}.`
          );
          return {
            ...dim,
            score: prev.score,
            // Confidence from the new run applies (do not hold confidence)
          };
        } else {
          console.warn(
            `Fix 3A: Score drop for "${dim.dimension}" at ${url} — ` +
            `new score ${dim.score} < prior score ${prev.score} but new evidence URLs detected. ` +
            `Allowing score change.`
          );
        }
      }

      return dim;
    });

    // Use pass 1 for strengths/weaknesses/breakpoints/focus (these are narrative, not scored)
    // Guard: remove any weakness whose dimension scored 2/2 after stabilization.
    // The LLM generates weaknesses before median scoring is finalized, so a dimension
    // can appear as a weakness in Pass 1 even if the stabilized score is 2/2.
    // A 2/2 score means the rubric found full evidence — it cannot logically be a weakness.
    const fullScoreDimensions = new Set(
      (stabilizedDimensionScores as Array<{ dimension: string; score: number }>)
        .filter(d => d.score === 2)
        .map(d => d.dimension.toLowerCase())
    );
    const filteredWeaknesses = (rubricPasses[0].weaknesses || []).filter(
      (w: { dimension: string }) =>
        !fullScoreDimensions.has((w.dimension ?? '').toLowerCase())
    );

    const rubricData: Record<string, unknown> = {
      dimensionScores: stabilizedDimensionScores,
      strengths: rubricPasses[0].strengths || [],
      weaknesses: filteredWeaknesses,
      trustBreakpoints: rubricPasses[0].trustBreakpoints || [],
      recommendedFocus: rubricPasses[0].recommendedFocus || null,
    };
    console.log('Rubric scoring complete (3-pass merged)');

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
              snippet: typeof item.snippet === 'string' ? cleanEvidenceLine(item.snippet).trim() : '',
            }))
            .filter((item) => {
              if (item.url.length === 0 || item.snippet.length === 0) return false;
              // Reject Machine-Extracted schema field citations. The scraper injects a
              // "Structured Pricing Data (Machine-Extracted — NOT direct quotes)" section
              // with fields like **Value Unit**: credits and - **Billing**: per minute.
              // The LLM strips the ** markdown and cites them as page quotes despite the
              // explicit instruction not to. Filter them out here as a safety net.
              if (item.snippet.length < 25) return false; // Entry 029: drop thin fragments
              if (/not explicitly stated/i.test(item.snippet)) return false;
              if (/^\s*-?\s*(value unit|free tier|trial available|trial details|refund policy|enterprise pricing|billing|price|limits?|overage policy|features?)\s*:/i.test(item.snippet)) return false; // Entry 031: features added
              return true;
            })
        : [];

      const fromObserved = observedEntries
        .map(parseSourceEvidenceFromObserved)
        .filter((item): item is SourceEvidence => item !== null)
        .map((item) => ({
          ...item,
          snippet: cleanEvidenceLine(item.snippet).trim(),
        }))
        .filter((item) => item.snippet.length > 0);

      const seen = new Set<string>();
      const merged: SourceEvidence[] = [];

      for (const item of [...fromModel, ...fromObserved]) {
        // Dedup by normalized snippet content — same quote from different pages counts once.
        // Normalizations applied before comparing:
        //   1. Lowercase + trim
        //   2. Strip parenthetical annotations: "10k credits per month (Free tier)" → "10k credits per month"
        //      Prevents near-duplicate evidence items that differ only in tier label suffixes.
        //   3. Collapse whitespace
        //   4. Truncate to first 120 chars
        // URL is preserved from the first occurrence.
        const key = item.snippet
          .toLowerCase()
          .trim()
          .replace(/^["""\u201C\u201D'''\u2018\u2019]+|["""\u201C\u201D'''\u2018\u2019]+$/g, '') // Entry 030: strip curly/smart quote variants before hashing
          .replace(/\s*\([^)]{0,40}\)/g, '') // strip short parentheticals (tier labels, annotations)
          .replace(/\.{2,}$|\u2026$/g, '') // Entry 052: strip trailing ellipsis so truncated quotes dedup against full quotes
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 60); // Entry 052: shorter key catches full vs truncated quote variants
        if (seen.has(key)) continue;
        seen.add(key);
        // Final synthetic-field guard — catches fromObserved bypass of the fromModel filter.
        if (item.snippet.length < 25) continue; // Entry 029: drop thin fragments
        if (/not explicitly stated/i.test(item.snippet)) continue;
        if (/^\s*-?\s*(value unit|free tier|trial available|trial details|refund policy|enterprise pricing|billing|price|limits?|overage policy|features?)\s*:/i.test(item.snippet)) continue; // Entry 031: features added
        merged.push(item);
      }

      return merged.slice(0, 6);
    };

    const hasExplicitCreditFaqSignals = evidenceDigest.costDriver.some((item) =>
      /(default mode|chat mode|1 credit per message|task complexity|0\.50|0\.90|1\.20|1\.70|what is a credit\?|how does pricing for lovable cloud \+ ai work\?|cost of each message|message history|three dots)/i.test(item)
    );

    const hasPerMessageCreditVisibilitySignals = evidenceDigest.costDriver.some((item) =>
      /(1 credit per message|cost of each message|message history|three dots)/i.test(item)
    );

    // Generic safety net helper: if LLM scored 0 but we have sufficient digest evidence, floor at 1
    // IMPORTANT: Preserves the AI's original rationale to avoid fabricating pricing constructs
    const applyDigestFloor = (
      dimension: { dimension: string; score: number; confidence: number; notObservable: boolean; rationale: string; observed: string[]; sourceEvidence?: Array<{ url: string; snippet: string }>; uncertaintyReasons: string[]; missingInsiderPrompts?: Array<{ question: string; fieldPaths: string[] }> },
      digestBucket: string[],
      minEvidence: number,
      floorConfidence: number,
      uncertaintyNote: string,
    ) => {
      const observed = Array.isArray(dimension.observed) ? [...dimension.observed] : [];
      const uncertaintyReasons = Array.isArray(dimension.uncertaintyReasons) ? [...dimension.uncertaintyReasons] : [];
      const mergedObserved = [...observed, ...digestBucket].slice(0, 4);
      const mergedSourceEvidence = normalizeSourceEvidence(dimension.sourceEvidence, mergedObserved);

      if (dimension.score === 0 && digestBucket.length >= minEvidence) {
        return {
          ...dimension,
          score: 1,
          confidence: Math.max(Number(dimension.confidence) || 0, floorConfidence),
          notObservable: false,
          // Preserve AI's rationale — append safety net note instead of replacing
          rationale: dimension.rationale
            ? `${dimension.rationale} [Score floored to 1 based on ${digestBucket.length} public evidence signals.]`
            : `Score floored to 1 based on ${digestBucket.length} public evidence signals found in scraped pages.`,
          observed: mergedObserved,
          sourceEvidence: mergedSourceEvidence,
          uncertaintyReasons: [...uncertaintyReasons, uncertaintyNote].slice(0, 2),
        };
      }

      return {
        ...dimension,
        observed: mergedObserved.length > observed.length ? mergedObserved : observed,
        sourceEvidence: mergedSourceEvidence,
        uncertaintyReasons,
      };
    };

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

      // === Product north star ===
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

      // === ICP and job clarity ===
      if (dimension.dimension === 'ICP and job clarity') {
        return applyDigestFloor(dimension, evidenceDigest.icpJob, 2, 0.5,
          'Explicit non-fit criteria and testable success states are not fully public.');
      }

      // === Buyer and budget alignment ===
      if (dimension.dimension === 'Buyer and budget alignment') {
        return applyDigestFloor(dimension, evidenceDigest.buyerBudget, 2, 0.5,
          'Segment-specific approval readiness and commercial terms details are not fully documented on public pages.');
      }

      // === Value unit ===
      if (dimension.dimension === 'Value unit') {
        const mergedObserved = [...observed, ...evidenceDigest.valueUnit, ...evidenceDigest.costDriver].slice(0, 5);
        const mergedSourceEvidence = normalizeSourceEvidence(sourceEvidence, mergedObserved);

        // Generic floor: if LLM scored 0 but we have ≥2 value unit evidence signals
        // (e.g. credits named, scoped, described on FAQ/pricing), floor to 1
        // and move metering granularity gap to uncertainty
        if (dimension.score === 0 && (evidenceDigest.valueUnit.length >= 2 || hasExplicitCreditFaqSignals)) {
          return {
            ...dimension,
            score: 1,
            confidence: Math.max(Number(dimension.confidence) || 0, hasExplicitCreditFaqSignals ? 0.65 : 0.55),
            notObservable: false,
            rationale: dimension.rationale
              ? `${dimension.rationale} [Score floored to 1 based on ${evidenceDigest.valueUnit.length} value-unit evidence signals — unit is named and scoped but full metering determinism is not publicly verifiable.]`
              : `Score floored to 1 based on ${evidenceDigest.valueUnit.length} value-unit evidence signals found in scraped pages.`,
            observed: mergedObserved,
            sourceEvidence: mergedSourceEvidence,
            uncertaintyReasons: [
              ...uncertaintyReasons.filter((reason) => !/audit|visibility|breakdown/i.test(reason)),
              'Detailed metering granularity (rounding, attribution, and edge-case counting) is not fully public. This limits confidence but does not negate the presence of a named billable unit.',
            ].slice(0, 2),
          };
        }

        if (hasPerMessageCreditVisibilitySignals && (Number(dimension.confidence) || 0) < 0.7) {
          return {
            ...dimension,
            confidence: 0.7,
            notObservable: false,
            rationale: 'Public FAQ evidence shows explicit per-message/task credit costs and message-level visibility, so value-unit transparency is publicly demonstrable; remaining uncertainty is mostly around full metering formula details.',
            observed: mergedObserved,
            sourceEvidence: mergedSourceEvidence,
            uncertaintyReasons: [
              ...uncertaintyReasons.filter((reason) => !/audit|visibility|breakdown/i.test(reason)),
              'Full metering formula details (rounding and attribution edge cases) are not fully specified in public docs.',
            ].slice(0, 2),
          };
        }

        return {
          ...dimension,
          observed,
          sourceEvidence: mergedSourceEvidence,
          uncertaintyReasons,
        };
      }

      // === Cost driver mapping ===
      if (dimension.dimension === 'Cost driver mapping') {
        const mergedObserved = [...observed, ...evidenceDigest.costDriver].slice(0, 4);
        const mergedSourceEvidence = normalizeSourceEvidence(sourceEvidence, mergedObserved);

        if (dimension.score === 0 && evidenceDigest.costDriver.length >= 2) {
          return {
            ...dimension,
            score: 1,
            confidence: Math.max(Number(dimension.confidence) || 0, hasExplicitCreditFaqSignals ? 0.65 : 0.5),
            notObservable: false,
            // Preserve AI's rationale — do NOT fabricate pricing constructs
            rationale: dimension.rationale
              ? `${dimension.rationale} [Score floored to 1 based on ${evidenceDigest.costDriver.length} cost-driver evidence signals.]`
              : `Score floored to 1 based on ${evidenceDigest.costDriver.length} cost-driver evidence signals found in scraped pages.`,
            observed: mergedObserved,
            sourceEvidence: mergedSourceEvidence,
            uncertaintyReasons: [...uncertaintyReasons, 'Driver formulas and per-workflow cost breakdowns are not publicly documented.'].slice(0, 2),
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

      // === Pools and packaging ===
      if (dimension.dimension === 'Pools and packaging') {
        return applyDigestFloor(dimension, evidenceDigest.poolsPackaging, 2, 0.5,
          'Pool scope, allocation mode, and rollover rules are not fully documented on public pages.');
      }

      // === Overages and risk allocation ===
      if (dimension.dimension === 'Overages and risk allocation') {
        return applyDigestFloor(dimension, evidenceDigest.overagesRisk, 2, 0.45,
          'Detailed dispute/refund processes, grace buffers, and spike protection mechanisms are not publicly documented.');
      }

      // === Safety rails and trust surfaces ===
      if (dimension.dimension === 'Safety rails and trust surfaces') {
        return applyDigestFloor(dimension, evidenceDigest.safetyRails, 2, 0.4,
          'Most safety rails (budget caps, kill switches, admin controls) are typically in-product and not publicly documented.');
      }

      return {
        ...dimension,
        observed,
        sourceEvidence,
        uncertaintyReasons,
      };
    });

    // Fix 2: Apply −0.15 confidence penalty to all dimensions when ≥30% of
    // queued scrape pages were unresolved (forwarded from scrape-website).
    if (applyUnresolvedPenalty) {
      for (const dim of dimensionScores) {
        dim.confidence = Math.max(0, (dim.confidence || 0) - 0.15);
      }
      console.log('Fix 2: Applied −0.15 confidence penalty to all dimensions due to high unresolved page rate.');
    }

    // ── Post-LLM contradiction fix: pricing page existence ─────────────
    // If we scraped a pricing page, the LLM MUST NOT claim "no pricing page"
    const scrapedPricingUrl = selectedUrls.find(u => /\/(pricing|plans?|billing)\b/i.test(u));
    if (scrapedPricingUrl) {
      const pricingContradictionPatterns = [
        /no\s+public\s+pricing\s+page/i,
        /there(?:'s| is)\s+no\s+(?:public\s+)?pricing\s+page/i,
        /(?:publish|create|add)\s+(?:a\s+)?(?:detailed\s+)?pricing\s+page/i,
        /pricing\s+page\s+(?:does not|doesn't)\s+exist/i,
        /absence\s+of\s+(?:a\s+)?(?:public\s+)?pricing/i,
        /no\s+pricing\s+(?:page|information)\s+(?:to|was|is|could)\s+/i,
      ];

      for (const dim of dimensionScores) {
        for (const pattern of pricingContradictionPatterns) {
          if (pattern.test(dim.rationale)) {
            console.warn(`CONTRADICTION FIX: "${dim.dimension}" claimed no pricing page, but ${scrapedPricingUrl} was scraped. Correcting rationale.`);
            dim.rationale = dim.rationale.replace(pattern, `the pricing page at ${scrapedPricingUrl} shows`);
          }
        }
      }

      // Also fix strengths, weaknesses, and recommendedFocus
      const weaknesses = (rubricData.weaknesses || []) as Array<{ whatIsMissingOrUnclear?: string; whyItMatters?: string }>;
      for (const w of weaknesses) {
        for (const pattern of pricingContradictionPatterns) {
          if (w.whatIsMissingOrUnclear && pattern.test(w.whatIsMissingOrUnclear)) {
            w.whatIsMissingOrUnclear = w.whatIsMissingOrUnclear.replace(pattern, `the pricing page at ${scrapedPricingUrl} shows`);
          }
        }
      }

      const focus = rubricData.recommendedFocus as { focusArea?: string; why?: string; firstTwoActions?: string[] } | null;
      if (focus) {
        for (const pattern of pricingContradictionPatterns) {
          if (focus.focusArea && pattern.test(focus.focusArea)) {
            focus.focusArea = focus.focusArea.replace(pattern, 'enhance the existing pricing page');
          }
          if (focus.why && pattern.test(focus.why)) {
            focus.why = focus.why.replace(pattern, `the pricing page at ${scrapedPricingUrl} exists but`);
          }
          if (focus.firstTwoActions) {
            focus.firstTwoActions = focus.firstTwoActions.map(a =>
              pricingContradictionPatterns.some(p => p.test(a))
                ? a.replace(pattern, 'enhance the existing pricing page')
                : a
            );
          }
        }
      }
    }

    const totalScore = dimensionScores.reduce((sum, d) => sum + d.score, 0);
    const maxScore = dimensionScores.length * 2;

    // Determine band (Developing / Credible / Trusted / Exemplary)
    // Thresholds: 0–25% Developing, 26–50% Credible, 51–75% Trusted, 76–100% Exemplary
    const percentage = (totalScore / maxScore) * 100;
    let band: 'Developing' | 'Credible' | 'Trusted' | 'Exemplary';
    if (percentage <= 25) band = 'Developing';
    else if (percentage <= 50) band = 'Credible';
    else if (percentage <= 75) band = 'Trusted';
    else band = 'Exemplary';

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
      analysisVersion: ANALYSIS_VERSION,
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
        pagesUsed: selectedUrls,
        mostUncertainDimensions: mostUncertain,
      },
      modelClassification,
      categoryClassification,
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

    // Record scan usage for rate limiting (skip for evidence re-runs and benchmark runner)
    if (!isRerun && !isBenchmarkRunner) {
      try {
        await supabaseAdmin
          .from('scan_usage')
          .insert({ user_id: userId, email: userEmail, scanned_url: url });
      } catch (usageErr) {
        console.error('Failed to record scan usage (non-fatal):', usageErr);
      }
    }

    return result;
    // ── End of analysisPromise IIFE ──
    })();

    if (isFreshScan) {
      // Register the analysis to complete in the background even after response is sent.
      // The result is cached in scan_results when complete; client polls via pollOnly requests.
      EdgeRuntime.waitUntil(
        analysisPromise.catch((bgErr) => {
          console.error('Background analysis failed:', bgErr);
          // Write error marker so the client stops polling
          (async () => {
            try {
              await supabaseAdmin.from('scan_results').insert({
                url_domain: domain,
                result_json: { status: 'error', error: String(bgErr), analysisVersion: 'error' },
                expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              });
            } catch { /* best-effort — don't let error reporting throw */ }
          })();
        })
      );

      return new Response(
        JSON.stringify({ success: false, status: 'pending', message: 'Analysis started — poll for results' }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rerun path (insiderAnswers or previousScores): await synchronously and return result
    const result = await analysisPromise;
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-company:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    // Surface specific known errors to help diagnose; fall back to generic message for unknowns
    const userMessage = [
      'Analysis service temporarily unavailable',
      'AI returned empty response',
      'Failed to parse AI response as JSON',
      'Analysis failed after all retry attempts',
    ].includes(errorMessage)
      ? errorMessage
      : 'An unexpected error occurred. Please try again.';
    return new Response(
      JSON.stringify({
        success: false,
        error: userMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
