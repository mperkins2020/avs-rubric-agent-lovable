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

5. "Cost driver mapping" - Usage and cost drivers are explicit and forecastable.

6. "Pools and packaging" - Tiers separate exploration from production by segment.

7. "Overages and risk allocation" - Limit behavior is explicit, risk is fairly shared.

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
  
  const content = data.choices[0].message.content;
  
  if (!content || content.trim() === '') {
    console.error('Empty AI response content');
    throw new Error('AI returned empty response');
  }
  
  console.log('AI response length:', content.length);
  
  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.error('Failed to parse AI response:', content.substring(0, 500));
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
