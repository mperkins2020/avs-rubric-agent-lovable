import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ScrapedPage {
  url: string;
  title: string;
  markdown: string;
}

interface ChatRequest {
  message: string;
  history: ChatMessage[];
  context: {
    pages: ScrapedPage[];
    companyName: string;
    rubricScore?: {
      totalScore: number;
      maxScore: number;
      band: string;
      dimensionScores?: Array<{
        dimension: string;
        score: number;
        confidence: number;
        rationale: string;
        observed: string[];
      }>;
      strengths?: Array<{ dimension: string; whyItIsStrong: string }>;
      weaknesses?: Array<{ dimension: string; whatIsMissingOrUnclear: string; whyItMatters: string }>;
    };
  };
}

const CHAT_SYSTEM_PROMPT = `You are an expert analyst helping users understand a company's value proposition and pricing strategy based on public website content and rubric scores.

You have access to scraped content from the company's website, their AVS (Adaptive Value System) rubric score, and detailed per-dimension scoring with rationales.

CRITICAL GUIDELINES:
1. ONLY make claims that are directly supported by the provided website content or scoring data. Never invent facts.
2. When citing information, always reference the source page URL.
3. If you can't find information in the content, say so clearly — do NOT guess or fabricate.
4. A score of 2 means STRONG/CLEAR — the company demonstrates that dimension well. A score of 0 means WEAK/MISSING.
5. When discussing what a higher score looks like, describe what the company would need to IMPROVE or ADD, grounded in what is currently observed.
6. When the user asks "what would a 2 look like", describe what excellent execution looks like for that dimension — NOT the opposite.
7. Always ground your answers in the actual dimension scores, rationales, observed evidence, strengths, and weaknesses provided.
8. Format your responses with clear structure using markdown.

SCORING SCALE:
- 0 = Not observable / Missing — the dimension is not addressed on the public website
- 1 = Partial / Emerging — some signals exist but incomplete or unclear
- 2 = Strong / Clear — the dimension is well-demonstrated with clear public evidence

CITATION FORMAT:
When referencing content, include citations like: [Source: page title](url)

Be helpful, precise, and grounded in the actual content provided.`;

async function callLovableAI(messages: Array<{ role: string; content: string }>): Promise<string> {
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
      messages,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Lovable AI error:', error);
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
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
    console.log('Authenticated user:', claimsData.claims.sub);

    const { message, history, context }: ChatRequest = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Chat request for:', context.companyName);
    console.log('Message:', message);

    // Build context from scraped pages
    const pagesContext = context.pages.map(page => 
      `### ${page.title}\nURL: ${page.url}\n\n${page.markdown}`
    ).join('\n\n---\n\n');

    // Truncate if needed
    const truncatedContext = pagesContext.length > 50000 
      ? pagesContext.substring(0, 50000) + '\n\n[Content truncated...]'
      : pagesContext;

    // Build score context if available
    let scoreContext = '';
    if (context.rubricScore) {
      scoreContext = `\n\nAVS Score Summary:\n- Total Score: ${context.rubricScore.totalScore}/${context.rubricScore.maxScore}\n- Band: ${context.rubricScore.band}`;
      
      if (context.rubricScore.dimensionScores) {
        scoreContext += '\n\nDIMENSION SCORES (0=Missing, 1=Partial, 2=Strong):';
        for (const d of context.rubricScore.dimensionScores) {
          scoreContext += `\n- ${d.dimension}: ${d.score}/2 (confidence: ${Math.round(d.confidence * 100)}%) — ${d.rationale}`;
          if (d.observed?.length) {
            scoreContext += `\n  Observed: ${d.observed.join('; ')}`;
          }
        }
      }

      if (context.rubricScore.strengths?.length) {
        scoreContext += '\n\nSTRENGTHS:';
        for (const s of context.rubricScore.strengths) {
          scoreContext += `\n- ${s.dimension}: ${s.whyItIsStrong}`;
        }
      }

      if (context.rubricScore.weaknesses?.length) {
        scoreContext += '\n\nWEAKNESSES:';
        for (const w of context.rubricScore.weaknesses) {
          scoreContext += `\n- ${w.dimension}: ${w.whatIsMissingOrUnclear} — ${w.whyItMatters}`;
        }
      }
    }

    // Build messages array
    const messages = [
      {
        role: 'system',
        content: `${CHAT_SYSTEM_PROMPT}

COMPANY: ${context.companyName}
${scoreContext}

WEBSITE CONTENT:
${truncatedContext}`,
      },
      // Add conversation history
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      // Add current message
      {
        role: 'user',
        content: message,
      },
    ];

    console.log('Calling AI with', messages.length, 'messages');

    const response = await callLovableAI(messages);

    console.log('Chat response generated');

    return new Response(
      JSON.stringify({
        success: true,
        response,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat-with-docs:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
