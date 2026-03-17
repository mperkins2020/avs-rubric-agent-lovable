import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ScrapeRequest {
  url: string;
  includeSubpages?: boolean;
  maxPages?: number;
}

interface ScrapedPage {
  url: string;
  title: string;
  markdown: string;
  metadata?: {
    description?: string;
    keywords?: string;
  };
}

interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    metadata?: { title?: string; description?: string; keywords?: string };
  };
}

interface FirecrawlMapResponse {
  success: boolean;
  links?: string[];
}

// Validate JWT authentication
async function validateAuth(req: Request): Promise<{ userId: string; userEmail: string } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return {
    userId: data.claims.sub as string,
    userEmail: (data.claims.email as string) ?? '',
  };
}

// SSRF protection: block private/internal IPs and non-http schemes
function isUnsafeUrl(urlString: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return 'Invalid URL format';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'Only http and https URLs are allowed';
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
    return 'Internal URLs are not allowed';
  }

  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^fc00:/i,
    /^fe80:/i,
  ];
  if (privateRanges.some(r => r.test(hostname))) {
    return 'Internal URLs are not allowed';
  }

  if (hostname === 'metadata.google.internal' || hostname.endsWith('.internal')) {
    return 'Internal URLs are not allowed';
  }

  return null;
}

// ─── Helper: call Firecrawl /map ───────────────────────────────────────────
async function mapDomain(apiKey: string, url: string, limit = 200, includeSubdomains = false): Promise<string[]> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, limit, includeSubdomains }),
    });
    const text = await response.text();
    const data: FirecrawlMapResponse = JSON.parse(text);
    if (response.ok && data.success && data.links) {
      return data.links;
    }
  } catch (e) {
    console.warn(`Map failed for ${url}:`, e);
  }
  return [];
}

// ─── URL scoring & helpers ─────────────────────────────────────────────────

const priorityPatterns = [
  /\/pricing\b/i,
  /\/plans?\b/i,
  /\/billing\b/i,
  /\/subscription\b/i,
  /\/usage\b/i,
  /\/about\b/i,
  /\/features?\b/i,
  /\/products?\b/i,
  /\/solutions?\b/i,
  /\/security\b/i,
  /\/trust\b/i,
  /\/compliance\b/i,
  /\/enterprise\b/i,
  /\/platform\b/i,
  /\/integrations?\b/i,
  /\/how-it-works\b/i,
  /\/use-cases?\b/i,
  /\/customers?\b/i,
  /\/case-stud/i,
  /\/resources?\b/i,
  /\/why-/i,
  /\/compare/i,
  /\/vs-/i,
  /\/docs\b/i,
  /\/help\b/i,
  /\/help-center\b/i,
  /\/knowledge-base\b/i,
  /\/faq\b/i,
  /\/support\b/i,
  /\/api\b/i,
  /\/developers?\b/i,
  /\/changelog\b/i,
  /\/updates\b/i,
  /\/release-notes\b/i,
  /\/status\b/i,
  /\/terms\b/i,
  /\/legal\b/i,
  /\/privacy\b/i,
  /\/credits\b/i,
  /overage/i,
  /calculator/i,
  /fair.?use/i,
  /rate.?limit/i,
  /quota/i,
  /metering/i,
];

const highIntentPaths = new Set([
  '/pricing', '/plans', '/plan', '/billing', '/usage',
  '/subscription', '/features', '/feature', '/product',
  '/products', '/solutions',
]);

const exclusionPatterns = [
  /\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/i,
  /\/(blog|news|press|careers|jobs|cookie|author|tag|category)\//i,
  /\/(blog|news|press|careers|jobs|cookie|author|tag|category)$/i,
  /\/(wp-content|wp-admin|wp-includes|wp-json)\//i,
  /\/dashboard\b/i,
  /\/(login|signup|sign-up|sign-in|register|cart|checkout)\b/i,
  // Exclude deep legal subpages (addenda, old terms, biometric notices) — low evidence value
  /\/legal\/(?!$)[^/]+/i,
];

const fullContentPatterns = [
  /\/pricing\b/i, /\/plans?\b/i, /\/billing\b/i,
  /\/faq\b/i, /\/help\b/i, /\/support\b/i,
  /\/trust\b/i, /\/security\b/i, /\/credits\b/i, /\/usage\b/i,
];

const helpSubdomains = ['help', 'support', 'docs', 'developer', 'developers', 'kb', 'knowledge', 'community'];

function getNormalizedPath(link: string): string {
  try { return new URL(link).pathname.replace(/\/$/, '').toLowerCase() || '/'; }
  catch { return '/'; }
}

function isSameDomain(link: string, baseHost: string): boolean {
  try { return new URL(link).hostname.replace(/^www\./, '') === baseHost; }
  catch { return false; }
}

function isShallowSameDomainPath(link: string, baseHost: string): boolean {
  try {
    const u = new URL(link);
    if (u.hostname.replace(/^www\./, '') !== baseHost) return false;
    const segs = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    // Allow up to 3 segments for feature/product pages (e.g. /features/data-orchestration)
    return segs.length >= 1 && segs.length <= 3;
  } catch { return false; }
}

function isSubdomainUrl(link: string): boolean {
  return new RegExp(`^https?://(${helpSubdomains.join('|')})\\.`, 'i').test(link);
}

function scoreUrl(link: string, baseHost: string, communityUrlSet: Set<string>): number {
  const path = getNormalizedPath(link);
  const sameDomain = isSameDomain(link, baseHost);
  let score = 0;

  if (communityUrlSet.has(link)) score += 1000;
  if (sameDomain && highIntentPaths.has(path)) score += 900;
  if (sameDomain && isShallowSameDomainPath(link, baseHost)) score += 500;
  if (priorityPatterns.some(p => p.test(link))) score += 250;
  if (isSubdomainUrl(link)) {
    score += 100;
    // Extra boost for credit/pricing paths on docs subdomains
    if (/\/(plans-and-credits|credits|pricing|billing|usage|subscription)\b/i.test(path)) {
      score += 700;
    }
  }
  return score;
}

// ─── Pricing JSON schema for structured extraction ─────────────────────────
const pricingJsonSchema = {
  type: "object",
  properties: {
    plans: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Plan or tier name" },
          price: { type: "string", description: "Price as displayed (e.g. '$49/mo', 'Custom', 'Free')" },
          billingPeriod: { type: "string", description: "monthly, annual, or custom" },
          currency: { type: "string", description: "ISO currency code e.g. USD" },
          features: { type: "array", items: { type: "string" }, description: "List of included features" },
          limits: { type: "array", items: { type: "string" }, description: "Usage limits or caps (e.g. '100 credits/mo', '5 seats')" },
          overagePolicy: { type: "string", description: "What happens when limits are exceeded" },
        },
      },
    },
    valueUnit: { type: "string", description: "The primary billable unit (e.g. 'seat', 'credit', 'API call', 'GB')" },
    hasFreeTier: { type: "boolean" },
    hasTrial: { type: "boolean" },
    trialDetails: { type: "string", description: "Trial duration and conditions" },
    refundPolicy: { type: "string", description: "Full refund policy including conditions, fees, and exceptions" },
    enterprisePricing: { type: "string", description: "How enterprise/custom pricing works" },
    costDrivers: {
      type: "array",
      items: { type: "string" },
      description: "All factors that affect cost (e.g. 'number of users', 'storage used', 'API calls')",
    },
    discounts: { type: "array", items: { type: "string" }, description: "Available discounts (annual, volume, etc.)" },
  },
};

const isPricingPage = (url: string): boolean =>
  /\/(pricing|plans?|billing|subscription|credits|cost|packages)\b/i.test(url);

// ─── Scrape a single page via Firecrawl ────────────────────────────────────
async function scrapePage(apiKey: string, pageUrl: string): Promise<ScrapedPage | null> {
  try {
    const needsFullContent = fullContentPatterns.some(p => p.test(pageUrl));
    const hasAccordions = /\/(pricing|faq|plans?|credits)\b/i.test(pageUrl);
    const wantStructuredJson = isPricingPage(pageUrl);
    console.log('Scraping:', pageUrl, needsFullContent ? '(full)' : '(main)', hasAccordions ? '(+html)' : '', wantStructuredJson ? '(+json)' : '');

    // Build formats as string array per Firecrawl v1 REST API
    const formats: string[] = ['markdown'];
    if (hasAccordions) formats.push('html', 'rawHtml');
    if (wantStructuredJson) formats.push('json');

    // Build request body — jsonOptions is a top-level param, NOT inside formats array
    const requestBody: Record<string, unknown> = {
      url: pageUrl,
      formats,
      onlyMainContent: !needsFullContent,
      ...(hasAccordions ? { waitFor: 3000 } : {}),
    };

    // Firecrawl v1 uses jsonOptions for structured extraction
    if (wantStructuredJson) {
      requestBody.jsonOptions = {
        schema: pricingJsonSchema,
        prompt: 'Extract ALL pricing plans, tiers, features, usage limits, overage policies, refund policies, cost drivers, trial details, and discounts from this page. Include exact prices, exact limits, and exact conditions. Do not infer or guess — only extract what is explicitly stated.',
      };
    }

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    let pageData: FirecrawlScrapeResponse & { data?: { json?: Record<string, unknown>; llm_extraction?: Record<string, unknown> } };
    try {
      pageData = JSON.parse(await response.text());
    } catch {
      console.log('Non-JSON response for:', pageUrl);
      return null;
    }

    if (!response.ok || !pageData.success || !pageData.data) {
      console.log('Failed to scrape (page may not exist):', pageUrl);
      return null;
    }

    console.log('Successfully scraped:', pageUrl);
    let finalMarkdown = pageData.data.markdown || '';

    // ── Append structured JSON pricing data ──────────────────────────────
    // Firecrawl v1 returns structured extraction in llm_extraction or json
    const extractedJson = pageData.data.llm_extraction || pageData.data.json;
    if (wantStructuredJson && extractedJson) {
      const json = extractedJson;
      console.log(`Structured JSON extracted for ${pageUrl}:`, JSON.stringify(json).slice(0, 500));

      const sections: string[] = [];
      sections.push('## Structured Pricing Data (Machine-Extracted — NOT direct quotes)');
      sections.push('> NOTE: The data below was extracted by an AI model and may contain paraphrases or inferences. Do NOT cite these as direct quotes. Use only as supplementary context for scoring.');
      if (json.valueUnit) sections.push(`**Value Unit**: ${json.valueUnit}`);
      if (json.hasFreeTier !== undefined) sections.push(`**Free Tier**: ${json.hasFreeTier ? 'Yes' : 'No'}`);
      if (json.hasTrial !== undefined) sections.push(`**Trial Available**: ${json.hasTrial ? 'Yes' : 'No'}`);
      if (json.trialDetails) sections.push(`**Trial Details**: ${json.trialDetails}`);
      if (json.refundPolicy) sections.push(`**Refund Policy**: ${json.refundPolicy}`);
      if (json.enterprisePricing) sections.push(`**Enterprise Pricing**: ${json.enterprisePricing}`);

      const plans = json.plans as Array<Record<string, unknown>> | undefined;
      if (plans && Array.isArray(plans) && plans.length > 0) {
        sections.push('\n### Plans');
        for (const plan of plans) {
          const planLines: string[] = [];
          planLines.push(`#### ${plan.name || 'Unnamed Plan'}`);
          if (plan.price) planLines.push(`- **Price**: ${plan.price}`);
          if (plan.billingPeriod) planLines.push(`- **Billing**: ${plan.billingPeriod}`);
          const features = plan.features as string[] | undefined;
          if (features && Array.isArray(features) && features.length > 0) {
            planLines.push(`- **Features**: ${features.join('; ')}`);
          }
          const limits = plan.limits as string[] | undefined;
          if (limits && Array.isArray(limits) && limits.length > 0) {
            planLines.push(`- **Limits**: ${limits.join('; ')}`);
          }
          if (plan.overagePolicy) planLines.push(`- **Overage Policy**: ${plan.overagePolicy}`);
          sections.push(planLines.join('\n'));
        }
      }

      const costDrivers = json.costDrivers as string[] | undefined;
      if (costDrivers && Array.isArray(costDrivers) && costDrivers.length > 0) {
        sections.push(`\n### Cost Drivers\n${costDrivers.map(d => `- ${d}`).join('\n')}`);
      }

      const discounts = json.discounts as string[] | undefined;
      if (discounts && Array.isArray(discounts) && discounts.length > 0) {
        sections.push(`\n### Discounts\n${discounts.map(d => `- ${d}`).join('\n')}`);
      }

      finalMarkdown += '\n\n---\n\n' + sections.join('\n\n');
    }

    // Extract accordion/table content from HTML
    if (hasAccordions && (pageData.data.rawHtml || pageData.data.html)) {
      const html = pageData.data.rawHtml || pageData.data.html || '';
      const extractedTexts: string[] = [];
      const seenExtracted = new Set<string>();

      const pushExtracted = (value: string) => {
        const plainText = value
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();
        if (plainText.length < 30) return;
        const normalized = plainText.slice(0, 420);
        if (seenExtracted.has(normalized)) return;
        seenExtracted.add(normalized);
        extractedTexts.push(normalized);
      };

      const accordionContentRegex = /<(?:div|section|p|span|li|details)[^>]*(?:data-(?:state|radix|orientation)|role="region"|aria-labelledby|aria-controls|accordion|collapse)[^>]*>([\s\S]*?)<\/(?:div|section|p|span|li|details)>/gi;
      let match;
      while ((match = accordionContentRegex.exec(html)) !== null) {
        pushExtracted(match[1]);
      }

      const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      while ((match = tableRowRegex.exec(html)) !== null) {
        const rowHtml = match[1];
        const cells = Array.from(rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi))
          .map((cellMatch) => cellMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (cells.length >= 2) pushExtracted(cells.join(' | '));
      }

      // Targeted "What is a credit?" FAQ extraction
      const creditFaqIndex = html.toLowerCase().indexOf('what is a credit?');
      if (creditFaqIndex >= 0) {
        const creditFaqSegment = html.slice(creditFaqIndex, creditFaqIndex + 18000)
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const targetedFaqSignals: Array<{ pattern: RegExp; snippet: string }> = [
          { pattern: /default\s*mode\s*:\s*credits\s+vary\s+based\s+on\s+task\s+complexity/i, snippet: 'Default Mode: credits vary based on task complexity' },
          { pattern: /chat\s*mode\s*:\s*1\s+credit\s+per\s+message/i, snippet: 'Chat Mode: 1 credit per message' },
          { pattern: /you\s+can\s+see\s+the\s+cost\s+of\s+each\s+message[\s\S]{0,120}(?:three\s+dots?|message\s+history)/i, snippet: 'Message history exposes exact credits used per message (three-dots menu).' },
          { pattern: /make\s+the\s+button\s+gray[\s\S]{0,120}(?:0\.50|0,50)/i, snippet: 'Prompt example: "Make the button gray" maps to 0.50 credits' },
          { pattern: /remove\s+the\s+footer[\s\S]{0,120}(?:0\.90|0,90)/i, snippet: 'Prompt example: "Remove the footer" maps to 0.90 credits' },
          { pattern: /add\s+authentication\s+with\s+sign\s+up\s+and\s+login[\s\S]{0,180}(?:1\.20|1,20)/i, snippet: 'Prompt example: "Add authentication with sign up and login" maps to 1.20 credits' },
          { pattern: /build\s+me\s+a\s+landing\s+page,?\s+use\s+images[\s\S]{0,180}(?:1\.70|1,70)/i, snippet: 'Prompt example: "Build me a landing page, use images" maps to 1.70 credits' },
        ];

        for (const signal of targetedFaqSignals) {
          if (signal.pattern.test(creditFaqSegment)) {
            pushExtracted(signal.snippet);
          }
        }
      }

      if (extractedTexts.length > 0) {
        console.log(`Extracted ${extractedTexts.length} accordion/table sections from HTML for: ${pageUrl}`);
        finalMarkdown += '\n\n---\n\n## FAQ / Accordion Content\n\n' + extractedTexts.join('\n\n');
      }
    }

    return {
      url: pageUrl,
      title: pageData.data.metadata?.title || pageUrl,
      markdown: finalMarkdown,
      metadata: { description: pageData.data.metadata?.description },
    };
  } catch (err) {
    console.error(`Failed to scrape ${pageUrl}:`, err);
    return null;
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const auth = await validateAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Authenticated user:', auth.userId);

    // Rate limit: 3 scrapes per week per user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: adminCheck } = await supabaseAdmin
      .rpc('has_role', { _user_id: auth.userId, _role: 'admin' });
    const isAdmin = adminCheck === true;

    if (!isAdmin) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { count: userCount, error: countError } = await supabaseAdmin
        .from('scan_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', auth.userId)
        .gte('created_at', weekAgo);

      if (!countError && userCount !== null && userCount >= 3) {
        return new Response(
          JSON.stringify({ success: false, error: 'Weekly limit reached. You can run 3 analyses per week. Try again next week.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (auth.userEmail) {
        const { count: emailCount, error: emailCountError } = await supabaseAdmin
          .from('scan_usage')
          .select('*', { count: 'exact', head: true })
          .eq('email', auth.userEmail)
          .gte('created_at', weekAgo);

        if (!emailCountError && emailCount !== null && emailCount >= 3) {
          return new Response(
            JSON.stringify({ success: false, error: 'Weekly limit reached. You can run 3 analyses per week. Try again next week.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const { url, includeSubpages = true, maxPages = 15 }: ScrapeRequest = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (url.length > 2048) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL exceeds maximum length of 2048 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeMaxPages = Math.min(Math.max(1, maxPages), 25);

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('Required API key not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service temporarily unavailable. Please try again later.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // SSRF protection
    const unsafeReason = isUnsafeUrl(formattedUrl);
    if (unsafeReason) {
      return new Response(
        JSON.stringify({ success: false, error: unsafeReason }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting scrape for URL:', formattedUrl);

    const pages: ScrapedPage[] = [];
    const urlObj = new URL(formattedUrl);
    const baseHost = urlObj.hostname.replace(/^www\./, '');
    const domainParts = baseHost.split('.');
    const registrableDomain = domainParts.length >= 2 ? domainParts.slice(-2).join('.') : baseHost;

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Scrape the main page
    // ═══════════════════════════════════════════════════════════════════════
    const mainNeedsFullContent = fullContentPatterns.some(p => p.test(formattedUrl));
    console.log('Scraping main page...', mainNeedsFullContent ? '(full content)' : '(main only)');

    const mainPageResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'links'],
        onlyMainContent: !mainNeedsFullContent,
      }),
    });

    let mainPageData: FirecrawlScrapeResponse;
    try {
      mainPageData = JSON.parse(await mainPageResponse.text());
    } catch {
      console.error('Firecrawl returned non-JSON response, status:', mainPageResponse.status);
      return new Response(
        JSON.stringify({ success: false, error: 'The website could not be reached. Please check the URL and try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mainPageResponse.ok || !mainPageData.success) {
      console.error('Failed to scrape main page:', mainPageData);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to scrape the main page. Please check the URL and try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (mainPageData.data) {
      pages.push({
        url: formattedUrl,
        title: mainPageData.data.metadata?.title || 'Home',
        markdown: mainPageData.data.markdown || '',
        metadata: {
          description: mainPageData.data.metadata?.description,
          keywords: mainPageData.data.metadata?.keywords,
        },
      });
    }

    console.log('Main page scraped successfully');

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: MAP-FIRST DISCOVERY — only discover URLs that actually exist
    // ═══════════════════════════════════════════════════════════════════════
    if (includeSubpages && safeMaxPages > 1) {
      // Phase 1a: Map the main domain (with subdomains)
      console.log('Phase 1a: Mapping main domain...');
      const mainMapLinks = await mapDomain(apiKey, formattedUrl, 300, true);
      console.log(`Main domain map: ${mainMapLinks.length} URLs discovered`);

      // Phase 1b: Check if main map already covers docs/help subdomains
      const discoveredSubdomains = new Set<string>();
      for (const link of mainMapLinks) {
        try {
          const h = new URL(link).hostname.replace(/^www\./, '');
          if (h !== baseHost) discoveredSubdomains.add(h);
        } catch { /* skip */ }
      }

      // Only map subdomains that weren't already discovered
      const subdomainsToProbe = helpSubdomains
        .map(sub => `${sub}.${registrableDomain}`)
        .filter(sub => !discoveredSubdomains.has(sub));

      let subdomainMapLinks: string[] = [];
      if (subdomainsToProbe.length > 0) {
        // Map at most 2 high-value subdomains (docs + help are most common)
        const priorityProbes = subdomainsToProbe
          .sort((a, b) => {
            const order = ['docs', 'help', 'support', 'developer'];
            const aIdx = order.findIndex(o => a.startsWith(o));
            const bIdx = order.findIndex(o => b.startsWith(o));
            return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
          })
          .slice(0, 2);

        console.log(`Phase 1b: Mapping ${priorityProbes.length} undiscovered subdomains:`, priorityProbes);
        const subMapResults = await Promise.all(
          priorityProbes.map(sub => mapDomain(apiKey, `https://${sub}`, 100, false))
        );
        subdomainMapLinks = subMapResults.flat();
        console.log(`Subdomain maps: ${subdomainMapLinks.length} URLs discovered`);
      } else {
        console.log('Phase 1b: Skipped — all subdomains already discovered via main map');
      }

      // Load community-submitted evidence URLs
      let communityUrls: string[] = [];
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const ceResponse = await fetch(
          `${supabaseUrl}/rest/v1/community_evidence?url_domain=eq.${encodeURIComponent(baseHost)}&select=evidence_url&order=created_at.desc&limit=20`,
          {
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Content-Type': 'application/json',
            },
          }
        );
        if (ceResponse.ok) {
          const ceData = await ceResponse.json();
          communityUrls = (ceData || []).map((r: { evidence_url: string }) => r.evidence_url);
          if (communityUrls.length > 0) {
            console.log(`Found ${communityUrls.length} community evidence URLs`);
          }
        }
      } catch (ceErr) {
        console.error('Failed to load community evidence (non-fatal):', ceErr);
      }

      // ═════════════════════════════════════════════════════════════════════
      // STEP 3: SCORE & SELECT — only from discovered + community URLs
      // ═════════════════════════════════════════════════════════════════════
      const communityUrlSet = new Set(communityUrls);
      // All candidates come from actual discovery — no blind fallback probes
      const allDiscovered = [...new Set([...mainMapLinks, ...subdomainMapLinks, ...communityUrls])];
      console.log(`Total discovered URLs: ${allDiscovered.length}`);

      const scoredLinks = allDiscovered
        .filter((link: string) => {
          if (exclusionPatterns.some(p => p.test(link))) return false;
          if (link === formattedUrl || link === formattedUrl + '/') return false;
          // Community URLs always pass
          if (communityUrlSet.has(link)) return true;
          // Shallow same-domain paths (high-value top-level pages)
          if (isShallowSameDomainPath(link, baseHost)) return true;
          // Keyword match
          if (priorityPatterns.some(p => p.test(link))) return true;
          // Subdomain pages
          if (isSubdomainUrl(link)) return true;
          return false;
        })
        .map((link: string) => ({ link, score: scoreUrl(link, baseHost, communityUrlSet) }))
        .sort((a, b) => b.score - a.score || a.link.localeCompare(b.link));

      const priorityLinks = scoredLinks.map(({ link }) => link).slice(0, safeMaxPages - 1);
      console.log(`Selected ${priorityLinks.length} verified pages to scrape (0 blind probes)`);
      console.log('Priority links:', priorityLinks);

      // ═════════════════════════════════════════════════════════════════════
      // STEP 4: TARGETED SCRAPE — only verified URLs
      // ═════════════════════════════════════════════════════════════════════
      const scrapePromises = priorityLinks.map(pageUrl => scrapePage(apiKey, pageUrl));
      const scrapedPages = await Promise.all(scrapePromises);

      for (const page of scrapedPages) {
        if (page) pages.push(page);
      }
    }

    console.log(`Scraping complete. Total pages: ${pages.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        url: formattedUrl,
        pages,
        totalPages: pages.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-website:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
