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
1. "90-day north star" - Is there a clear near-term value goal customers can achieve?
2. "ICP and job clarity" - Is the ideal customer profile and job-to-be-done clear?
3. "Buyer and budget alignment" - Is it clear who pays and from what budget?
4. "Value units" - Are the units of value clear and measurable?
5. "Cost driver mapping" - Is there transparency about what drives costs?
6. "Pools and packaging" - Are there clear packages/tiers with defined pools?
7. "Overages and risk allocation" - Is overage pricing and risk handling clear?
8. "Safety rails and trust surfaces" - Are there controls, limits, and trust features?
9. "Rating agility and governance" - Can pricing adapt? Is there governance?
10. "Measurement and cadence" - How is value measured and reviewed?

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
