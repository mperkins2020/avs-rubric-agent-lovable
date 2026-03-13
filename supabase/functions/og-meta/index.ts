const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://valuetempo.lovable.app';
const DEFAULT_OG_IMAGE = `${BASE_URL}/ValueTempo_Logo.png`;

interface PageMeta {
  title: string;
  description: string;
  ogImage?: string;
}

// Metadata registry — keep in sync with SEOHead usage in each page
const PAGE_META: Record<string, PageMeta> = {
  '/': {
    title: 'AVS Rubric Agent — Score Your AI Trust Infrastructure',
    description: "Get an instant, evidence-backed assessment of your AI product's trust infrastructure across 8 dimensions. Case studies show closing trust gaps drives 2–7% ARR uplift.",
  },
  '/methodology': {
    title: 'AVS Rubric Methodology — How We Score Trust Infrastructure',
    description: 'The AVS Rubric evaluates AI products across 8 trust dimensions using a four-layer Trust Stack hierarchy. Learn about our scoring system, confidence labels, and evidence-based methodology.',
  },
  '/faq': {
    title: 'AVS Rubric FAQ — Frequently Asked Questions',
    description: 'Find answers about the AVS Rubric for Product & Growth leaders and CFO & RevOps teams. Learn how AVS evaluates trust infrastructure, reduces churn, and improves revenue quality.',
  },
  '/resources/case-studies/elevenlabs': {
    title: 'ElevenLabs AVS Case Study — The 75% Problem',
    description: 'AVS Rubric analysis of ElevenLabs: when strong fundamentals meet predictability gaps. Trust score 75% across 8 dimensions of AI trust infrastructure.',
  },
  '/resources/case-studies/clay': {
    title: 'Clay AVS Case Study — Trust Infrastructure Analysis',
    description: "AVS Rubric analysis of Clay's trust infrastructure. Evaluating value unit clarity, cost driver transparency, safety rails, and enterprise readiness across 8 dimensions.",
  },
  '/resources/blog/trust-growth-constraint': {
    title: 'Trust Is the New Growth Constraint in AI',
    description: 'A practical way to make value, usage, and cost feel predictable — why pricing drift becomes trust drift, and how AVS gives operators a shared map.',
  },
  '/resources/blog/vibecoding-ai-startup-tool': {
    title: 'What I Learned Vibecoding an AI Startup Tool using Lovable + Claude Code',
    description: 'A build-in-public note on what broke, what worked, and what vibecoding an AI product taught me about reliability, production readiness, and trust infrastructure.',
  },
  '/resources/blog/clay-pricing-three-layers': {
    title: 'Why AI Pricing Requires Three Layers — A Clay Case Study',
    description: "Clay announced a major pricing overhaul. The architecture improved. But the AVS Trust Rubric score dropped from 81% to 75%. That drop is a buyer signal.",
  },
};

const CRAWLER_UA_REGEX = /bot|crawl|spider|slurp|facebookexternalhit|linkedinbot|twitterbot|whatsapp|telegrambot|discordbot|slack|pinterest|redditbot|embedly|quora|outbrain|vkshare|baiduspider|yandex|googlebot|bingbot|semrushbot|ahrefsbot|mj12bot|preview/i;

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return CRAWLER_UA_REGEX.test(userAgent);
}

function buildHtml(path: string, meta: PageMeta): string {
  const fullTitle = `${meta.title} | ValueTempo`;
  const ogImage = meta.ogImage || DEFAULT_OG_IMAGE;
  const canonicalUrl = `${BASE_URL}${path}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}"/>

  <meta property="og:title" content="${escapeHtml(meta.title)}"/>
  <meta property="og:description" content="${escapeHtml(meta.description)}"/>
  <meta property="og:type" content="article"/>
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}"/>
  <meta property="og:image" content="${escapeHtml(ogImage)}"/>
  <meta property="og:site_name" content="ValueTempo"/>

  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escapeHtml(meta.title)}"/>
  <meta name="twitter:description" content="${escapeHtml(meta.description)}"/>
  <meta name="twitter:image" content="${escapeHtml(ogImage)}"/>

  <link rel="canonical" href="${escapeHtml(canonicalUrl)}"/>
</head>
<body>
  <p>${escapeHtml(meta.description)}</p>
  <a href="${escapeHtml(canonicalUrl)}">View on ValueTempo</a>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // The path comes as a query param since this is called via edge function URL
    const path = url.searchParams.get('path') || '/';
    const userAgent = req.headers.get('user-agent');

    // Only serve to crawlers
    if (!isCrawler(userAgent)) {
      return new Response(JSON.stringify({ crawler: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const meta = PAGE_META[path];
    if (!meta) {
      // Fall back to default homepage meta
      const fallback = PAGE_META['/']!;
      return new Response(buildHtml(path, fallback), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response(buildHtml(path, meta), {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    return new Response('Internal Server Error', {
      status: 500,
      headers: corsHeaders,
    });
  }
});
