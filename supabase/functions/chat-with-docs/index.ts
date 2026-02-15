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
    };
  };
}

const CHAT_SYSTEM_PROMPT = `You are an expert analyst helping users understand a company's value proposition and pricing strategy based on public website content.

You have access to scraped content from the company's website and their AVS (Adaptive Value System) rubric score.

GUIDELINES:
1. Answer questions based on the provided website content
2. When citing information, always reference the source page URL
3. If you can't find information in the content, say so clearly
4. Be analytical and provide actionable insights
5. Format your responses with clear structure using markdown
6. When discussing scores or ratings, explain the reasoning

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
    const scoreContext = context.rubricScore 
      ? `\n\nAVS Score Summary:\n- Total Score: ${context.rubricScore.totalScore}/${context.rubricScore.maxScore}\n- Band: ${context.rubricScore.band}`
      : '';

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
