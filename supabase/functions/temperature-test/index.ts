import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RUBRIC_SCORING_PROMPT = `You are an expert in SaaS pricing and value strategy. Score this company against the AVS (Adaptive Value System) rubric.

EVIDENCE QUALITY RULES (MANDATORY):
1. REJECT as evidence: copyright footers, cookie banners, navigation menus, social media links, generic legal boilerplate.
2. Each item in "observed" MUST cite a specific page and a concrete fact.
3. Confidence should reflect QUALITY and SPECIFICITY of evidence.

For each of the 8 dimensions, provide: score (0/1/2), confidence (0.0-1.0), notObservable, rationale, observed[], uncertaintyReasons[].

THE 8 DIMENSIONS:
1. "Product north star" 2. "ICP and job clarity" 3. "Buyer and budget alignment"
4. "Value unit" 5. "Cost driver mapping" 6. "Pools and packaging"
7. "Overages and risk allocation" 8. "Safety rails and trust surfaces"

Also provide: strengths[], weaknesses[], trustBreakpoints[], recommendedFocus.
Return valid JSON: { dimensionScores, strengths, weaknesses, trustBreakpoints, recommendedFocus }`;

const HEX_CONTENT = `Company: Hex (hex.tech)

## Homepage
Bring the magic of AI to data, for everyone. Explore data using natural language, with or without code, on trusted context.
Agentic data notebooks. Notebook, App builder, Share, Publish app.
Features: SQL cell, Python cell, charts, AI agents (Notebook agent, Threads agent, Semantic model agent).
Customers: Brex, Ramp, Loom, Noom, Notion, Anthropic.

## Pricing (hex.tech/pricing)
Compute profiles (pay-as-you-go for Team/Enterprise):
Small(Free), Medium(Free), Large($0.32/hr), XL($0.65/hr), 2XL($1.29/hr), 4XL($2.58/hr), GPU($2.93-$4.06/hr). Billed per minute.

Community: Free. Up to 5 notebooks, small compute, limited agent credits.
Professional: $36/editor/month. Unlimited notebooks, standard agent credits, medium compute, 30-day history.
Team: $75/editor/month. Extended agent credits, unlimited apps, scheduled runs, advanced compute add-ons.
Enterprise: Custom. Audit logs, SSO, HIPAA add-on, dedicated support.

Agent credits: Community limited, Professional standard, Team/Enterprise extended.
Version history: Community 7-day, Professional 30-day, Team/Enterprise unlimited.`;

async function callAI(userContent: string, temperature: number): Promise<object> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: RUBRIC_SCORING_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature,
      max_tokens: 16384,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) throw new Error(`AI error ${response.status}`);
  const data = await response.json();
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty');
  if (content.startsWith('```')) content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  try { return JSON.parse(content); } catch {
    let r = content.replace(/,\s*"[^"]*"?\s*:?\s*[^}\]]*$/, '');
    const ob = (r.match(/{/g)||[]).length - (r.match(/}/g)||[]).length;
    const obrk = (r.match(/\[/g)||[]).length - (r.match(/\]/g)||[]).length;
    for (let i=0;i<obrk;i++) r+=']'; for (let i=0;i<ob;i++) r+='}';
    return JSON.parse(r);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = body.action || 'run';
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (action === 'results') {
      const { data } = await supabaseAdmin.from('scan_results').select('*')
        .like('url_domain', 'temp-test-hex-%').order('created_at', { ascending: false }).limit(10);
      return new Response(JSON.stringify({ results: data }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'run-both') {
      // Run BOTH temperatures sequentially and store results, staying alive the whole time
      const results: Record<string, unknown>[] = [];
      for (const temp of [0.1, 1.0]) {
        const domainKey = `temp-test-hex-t${temp}`;
        try {
          const rubricData = await callAI(HEX_CONTENT, temp) as Record<string, unknown>;
          const ds = (rubricData.dimensionScores || []) as Array<{ score: number; dimension: string; confidence: number }>;
          const totalScore = ds.reduce((sum, d) => sum + d.score, 0);
          const result = { temperature: temp, totalScore, maxScore: ds.length * 2, dimensionScores: ds, strengths: rubricData.strengths, weaknesses: rubricData.weaknesses, trustBreakpoints: rubricData.trustBreakpoints, recommendedFocus: rubricData.recommendedFocus };
          await supabaseAdmin.from('scan_results').insert({ url_domain: domainKey, result_json: result, expires_at: new Date(Date.now() + 86400000).toISOString() });
          results.push({ domainKey, totalScore, maxScore: ds.length * 2 });
        } catch (e) {
          results.push({ domainKey, error: e.message });
        }
      }
      return new Response(JSON.stringify({ done: true, results }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single run
    const temperature = body.temperature ?? 0.1;
    const domainKey = `temp-test-hex-t${temperature}`;
    const rubricData = await callAI(HEX_CONTENT, temperature) as Record<string, unknown>;
    const ds = (rubricData.dimensionScores || []) as Array<{ score: number; dimension: string; confidence: number }>;
    const totalScore = ds.reduce((sum, d) => sum + d.score, 0);
    const result = { temperature, totalScore, maxScore: ds.length * 2, dimensionScores: ds, strengths: rubricData.strengths, weaknesses: rubricData.weaknesses, trustBreakpoints: rubricData.trustBreakpoints, recommendedFocus: rubricData.recommendedFocus };
    await supabaseAdmin.from('scan_results').insert({ url_domain: domainKey, result_json: result, expires_at: new Date(Date.now() + 86400000).toISOString() });
    return new Response(JSON.stringify({ stored: true, domainKey, totalScore }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
