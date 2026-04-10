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
async function validateAuth(req: Request): Promise<{ userId: string; userEmail: string; isAnonymous: boolean } | null> {
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
    isAnonymous: (data.claims.is_anonymous as boolean) ?? false,
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
  /\/hc\b/i,           // Zendesk help center pattern (help.domain.com/hc/...)
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
  /\/refund/i,         // Refund/cancellation policies
  /\/cancel/i,         // Cancellation terms
  /\/roi\b/i,          // ROI calculators and value estimators
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
  // Bundle 2: trust-center path pinning — same priority as /pricing
  // Observed regression: ElevenLabs /security and /trust dropped after page-count reduction
  '/security', '/trust', '/compliance', '/privacy',
  // Bundle 3: ROI/value calculators — direct D1 NS3 evidence (quantified outcome proof)
  '/roi-calculator', '/roi', '/calculator', '/value-calculator',
  // Bundle 4: Zendesk/help center root — billing FAQs and overage policies live here
  '/hc',
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
  // Template/gallery pages — contain template metadata, not actual pricing terms
  /\/template-categor(y|ies)\b/i,
  /\/templates?\//i,
  // Sitemap XML files — no content value
  /\/sitemap[^/]*\.xml\b/i,
  // Event/launch pages — marketing, not pricing surfaces
  /\/events?\//i,
  /\/events?\b$/i,
  /\/webinars?\b/i,
  // Single integration pages — parent /integrations is sufficient
  /\/integrations\/[^/]+$/i,
];

const fullContentPatterns = [
  /\/pricing\b/i, /\/plans?\b/i, /\/billing\b/i,
  /\/faq\b/i, /\/help\b/i, /\/support\b/i,
  /\/trust\b/i, /\/security\b/i, /\/credits\b/i, /\/usage\b/i,
  /\/hc\b/i, /\/roi\b/i, /calculator/i, /\/refund/i,
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
    // Extra boost for billing/pricing content on help/docs subdomains (billing FAQs, overage policies, etc.)
    // NOTE: /hc removed from this list — it matches ALL Zendesk-style articles, including
    // generic topics like "how to present slides" or "change theme" (zero evidence value).
    // Billing-keyword check below handles /hc/billing, /hc/credits, etc. precisely.
    if (/\/(plans-and-credits|credits|pricing|billing|usage|subscription|refund|cancel|overage|limit|quota|metering)\b/i.test(path)) {
      score += 700; // Billing/pricing specific help content — treat like pricing-adjacent evidence
    } else if (/\/hc\/.+/i.test(path) || /\/articles?\/.+/i.test(path)) {
      // Generic deep help article (no billing keywords in path) — two-tier penalty.
      // e.g. support.beautiful.ai/hc/en-us/articles/how-to-present-slides
      // These consume evidence slots but provide zero scoring signal.
      score -= 200;
    }
  }

  // HIGH-VALUE CONTENT BOOST: pricing/billing/refund keywords anywhere in the path
  // (catches /faqs/pricing, /resources/pricing, /info/plans, /help/billing, /hc/refunds, etc.)
  if (/\/(pricing|billing|plans?|credits|subscription|refund|cancel)\b/i.test(path) && !highIntentPaths.has(path)) {
    score += 800;
  }

  // ROI/calculator boost — direct D1 NS3 evidence (quantified outcome proof)
  if (/\/(roi|calculator|value-calculator)\b/i.test(path) && !highIntentPaths.has(path)) {
    score += 800;
  }

  // Docs two-tier scoring — /docs/* paths vary widely in evidence quality.
  // Tier 1 (billing/trust/overage keywords in path): high-value evidence, boost to compete
  //   with pricing pages. Examples: /docs/billing, /docs/credits, /docs/rate-limits, /docs/overage
  // Tier 2 (generic docs): reduce priority so getting-started/API reference pages don't crowd
  //   out pricing and trust evidence. Examples: /docs/quickstart, /docs/sdk, /docs/authentication
  if (/\/docs?\b/i.test(path)) {
    if (/\/(billing|pricing|credits?|overage|usage|refund|cancel|limit|quota|trust|security|compliance|plan|subscription|metering|rate.?limit|fair.?use)\b/i.test(path)) {
      score += 800; // Tier 1: billing/trust/overage docs — treat like pricing-adjacent evidence
    } else {
      score -= 200; // Tier 2: generic docs — lower priority, allow only if no better page available
    }
  }

  // Feature/product pages — moderate boost for evidence quality
  if (/\/features?\//i.test(path)) score += 200;

  // COMPARE PAGE CAP: diminish value after first 2 compare pages are selected
  // (handled by dedup in selection, but lower base score to let evidence pages win)
  if (/\/compare\b|\/vs-/i.test(path)) score -= 200;

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

const sanitizeEvidenceText = (value: string): string =>
  value
    .replace(/!\[[^\]]*\]\([^\)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\[[^\]\n]*\\{1,2}/g, ' ')
    .replace(/\[[^\]\n]*(?=\s|$)/g, ' ')
    .replace(/[>#*_`|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const sanitizeEvidenceList = (values: unknown): string[] =>
  Array.isArray(values)
    ? values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => sanitizeEvidenceText(value))
        .filter((value) => value.length >= 3)
    : [];

// ─── Scrape a single page via Firecrawl ────────────────────────────────────
async function scrapePage(apiKey: string, pageUrl: string): Promise<ScrapedPage | null> {
  try {
    const needsFullContent = fullContentPatterns.some(p => p.test(pageUrl));
    const hasAccordions = /\/(pricing|faq|plans?|credits)\b/i.test(pageUrl);
    const wantStructuredJson = isPricingPage(pageUrl);
    console.log('Scraping:', pageUrl, needsFullContent ? '(full)' : '(main)', hasAccordions ? '(+html)' : '', wantStructuredJson ? '(+json)' : '');

    const formats: string[] = ['markdown'];
    if (hasAccordions) formats.push('html', 'rawHtml');
    if (wantStructuredJson) formats.push('json');

    const requestBody: Record<string, unknown> = {
      url: pageUrl,
      formats,
      onlyMainContent: !needsFullContent,
      ...(hasAccordions ? { waitFor: 3000 } : {}),
    };

    if (wantStructuredJson) {
      requestBody.jsonOptions = {
        schema: pricingJsonSchema,
        prompt: 'Extract ALL pricing plans, tiers, features, usage limits, overage policies, refund policies, cost drivers, trial details, and discounts from this page. Include exact prices, exact limits, and exact conditions. Do not infer or guess — only extract what is explicitly stated.',
      };
    }

    // Perf: 40s budget — pricing/accordion pages get 30s (waitFor:3000 + LLM JSON extraction
    // easily exceeds 7–15s under real Firecrawl load); regular pages keep 7s to prevent stalls.
    const pageController = new AbortController();
    const pageTimeoutMs = hasAccordions ? 30000 : 7000;
    const pageTimeout = setTimeout(() => pageController.abort(), pageTimeoutMs);
    let response: Response;
    try {
      response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: pageController.signal,
      });
    } catch (fetchErr) {
      clearTimeout(pageTimeout);
      console.log('Fetch timed out or failed for:', pageUrl, fetchErr instanceof Error ? fetchErr.message : fetchErr);
      return null;
    }
    clearTimeout(pageTimeout);

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
    let finalMarkdown = sanitizeEvidenceText(pageData.data.markdown || '');

    const extractedJson = pageData.data.llm_extraction || pageData.data.json;
    if (wantStructuredJson && extractedJson) {
      const json = extractedJson;
      console.log(`Structured JSON extracted for ${pageUrl}:`, JSON.stringify(json).slice(0, 500));

      const sections: string[] = [];
      sections.push('## Structured Pricing Data (Machine-Extracted — NOT direct quotes)');
      sections.push('> NOTE: The data below was extracted by an AI model and may contain paraphrases or inferences. Do NOT cite these as direct quotes. Use only as supplementary context for scoring.');
      if (json.valueUnit) sections.push(`**Value Unit**: ${sanitizeEvidenceText(String(json.valueUnit))}`);
      if (json.hasFreeTier !== undefined) sections.push(`**Free Tier**: ${json.hasFreeTier ? 'Yes' : 'No'}`);
      if (json.hasTrial !== undefined) sections.push(`**Trial Available**: ${json.hasTrial ? 'Yes' : 'No'}`);
      if (json.trialDetails) sections.push(`**Trial Details**: ${sanitizeEvidenceText(String(json.trialDetails))}`);
      if (json.refundPolicy) sections.push(`**Refund Policy**: ${sanitizeEvidenceText(String(json.refundPolicy))}`);
      if (json.enterprisePricing) sections.push(`**Enterprise Pricing**: ${sanitizeEvidenceText(String(json.enterprisePricing))}`);

      const plans = json.plans as Array<Record<string, unknown>> | undefined;
      if (plans && Array.isArray(plans) && plans.length > 0) {
        sections.push('\n### Plans');
        for (const plan of plans) {
          const planLines: string[] = [];
          planLines.push(`#### ${sanitizeEvidenceText(String(plan.name || 'Unnamed Plan'))}`);
          if (plan.price) planLines.push(`- **Price**: ${sanitizeEvidenceText(String(plan.price))}`);
          if (plan.billingPeriod) planLines.push(`- **Billing**: ${sanitizeEvidenceText(String(plan.billingPeriod))}`);
          const features = sanitizeEvidenceList(plan.features);
          if (features.length > 0) {
            planLines.push(`- **Features**: ${features.join('; ')}`);
          }
          const limits = sanitizeEvidenceList(plan.limits);
          if (limits.length > 0) {
            planLines.push(`- **Limits**: ${limits.join('; ')}`);
          }
          if (plan.overagePolicy) planLines.push(`- **Overage Policy**: ${sanitizeEvidenceText(String(plan.overagePolicy))}`);
          sections.push(planLines.join('\n'));
        }
      }

      const costDrivers = sanitizeEvidenceList(json.costDrivers);
      if (costDrivers.length > 0) {
        sections.push(`\n### Cost Drivers\n${costDrivers.map(d => `- ${d}`).join('\n')}`);
      }

      const discounts = sanitizeEvidenceList(json.discounts);
      if (discounts.length > 0) {
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
        const plainText = sanitizeEvidenceText(
          value
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim()
        );
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
      // Anonymous users get 1 free scan; authenticated users get 3/week
      const maxScans = auth.isAnonymous ? 1 : 3;

      if (auth.isAnonymous) {
        // For anonymous users: check total scans (not time-windowed)
        const { count: anonCount, error: anonCountError } = await supabaseAdmin
          .from('scan_usage')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.userId);

        if (!anonCountError && anonCount !== null && anonCount >= maxScans) {
          return new Response(
            JSON.stringify({ success: false, error: 'Free scan used. Create a free account to run more analyses.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { count: userCount, error: countError } = await supabaseAdmin
          .from('scan_usage')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', auth.userId)
          .gte('created_at', weekAgo);

        if (!countError && userCount !== null && userCount >= maxScans) {
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

          if (!emailCountError && emailCount !== null && emailCount >= maxScans) {
            return new Response(
              JSON.stringify({ success: false, error: 'Weekly limit reached. You can run 3 analyses per week. Try again next week.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
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
    // Fix 2: Pre-Scoring Validation Layer — metadata declared here so they are
    // in scope for the final response regardless of whether includeSubpages is set.
    let fix2UnresolvedPageCount = 0;
    let fix2TotalQueuedCount = 0;
    let fix2ConfirmedMissUrls: string[] = [];

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

    // Bundle 2: homepage always pushed to pages — even if data is unexpectedly null.
    // The homepage is a mandatory evidence page for D1/D2 (product north star, ICP clarity).
    // If Firecrawl returns success:true but data:null, we still log the URL so the
    // evidence set reflects that the homepage was attempted and not silently dropped.
    pages.push({
      url: formattedUrl,
      title: mainPageData.data?.metadata?.title || 'Home',
      markdown: mainPageData.data?.markdown || '',
      metadata: {
        description: mainPageData.data?.metadata?.description,
        keywords: mainPageData.data?.metadata?.keywords,
      },
    });
    if (!mainPageData.data) {
      console.warn(`Homepage scrape returned success:true but no data for ${formattedUrl}`);
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

      // Perf: 40s budget — URL content-relevance pre-filter applied before batch selection.
      // Removes external domains, CDN/image assets, and user-generated content slugs
      // that consume page slots but contribute zero dimension evidence.
      const isEvidenceEligible = (link: string): boolean => {
        try {
          const parsed = new URL(link);
          // Scheme filter — only http/https; rejects mailto:, data:, javascript:, etc.
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
          // Malformed URL filter — reject URLs with trailing HTML entities or CSS syntax
          if (/(&quot;|&amp;|&#\d+|[>)'"\\])$/.test(link)) return false;
          const host = parsed.hostname.replace(/^www\./, '');
          // External domain filter — must share the registrable domain
          if (!host.endsWith(registrableDomain) && host !== registrableDomain) return false;
          // CDN subdomain filter
          if (parsed.hostname.startsWith('cdn.')) return false;
          // Asset/image extension filter
          if (/\.(webp|png|jpg|jpeg|gif|svg|ico|pdf|zip|mp4|mp3|wav|woff|woff2|ttf|eot|css|js)$/i.test(parsed.pathname)) return false;
          // Static asset path filter
          if (/\/(images|assets|static|media|fonts)\//i.test(parsed.pathname)) return false;
          // @username user-generated content filter (e.g. replit.com/@user/project)
          if (parsed.pathname.split('/').some(seg => seg.startsWith('@'))) return false;
          // Random-slug user-generated content filter: path ends in -[a-z0-9]{10,} (e.g. gamma.app/docs/-gkzy48h1uj1yr1q)
          const lastSeg = parsed.pathname.split('/').filter(Boolean).pop() || '';
          if (/^-[a-z0-9]{10,}$/i.test(lastSeg)) return false;
          // Gated path blocklist — these paths are uniformly behind authentication across SaaS.
          // They return HTTP 200 + a login wall page with zero evidence content, wasting a slot.
          const firstSeg = parsed.pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
          if (/^(subscription|usage|account|accounts|dashboard|settings|login|signin|sign-in|sign-up|signup|register)$/.test(firstSeg)) return false;
          return true;
        } catch { return false; }
      };

      // Normalise a URL for deduplication.
      // Strips: #:~:text= fragments, locale prefixes, www prefix, trailing slash, http→https.
      // Preserves: query params — e.g. elevenlabs.io/pricing?price.platform=api is genuinely
      // different content from elevenlabs.io/pricing and must keep its own slot.
      const normaliseForDedup = (link: string): string => {
        try {
          const parsed = new URL(link);
          // Strip text fragment anchors (#:~:text=...) — same HTML document as the base URL
          parsed.hash = parsed.hash.startsWith('#:~:') ? '' : parsed.hash;
          // Strip locale path prefixes (/en/, /en-US/, /fr/, /de/, etc.)
          parsed.pathname = parsed.pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?\//,  '/');
          // Strip trailing slash from pathname (root '/' is preserved)
          // /pricing/ ≡ /pricing — Firecrawl map often returns both variants
          if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/$/, '');
          // Strip www. prefix — www.example.com/path ≡ example.com/path
          parsed.hostname = parsed.hostname.replace(/^www\./, '');
          // Normalize http → https — http://example.com/pricing ≡ https://example.com/pricing
          parsed.protocol = 'https:';
          return parsed.toString();
        } catch { return link; }
      };

      const filteredScoredLinks = scoredLinks.filter(({ link }) => isEvidenceEligible(link));

      // Deduplication after normalisation — removes text fragment and locale variants
      const seenNormalised = new Set<string>();
      const dedupedScoredLinks = filteredScoredLinks.filter(({ link }) => {
        const key = normaliseForDedup(link);
        if (seenNormalised.has(key)) return false;
        seenNormalised.add(key);
        return true;
      });

      // Per-category slot caps — enforced before final page selection
      // Prevents low-signal path categories from crowding out high-signal evidence pages
      const compareLinks: string[] = [];
      const storyLinks: string[] = [];   // /customers/* + /case-studies/* — 2 slots combined
      const blogLinks: string[] = [];    // /blog/* — 1 slot
      const changelogLinks: string[] = []; // /changelog/* — 1 slot
      const otherLinks: string[] = [];

      for (const { link } of dedupedScoredLinks) {
        if (/\/compare\b|\/vs-/i.test(link)) {
          compareLinks.push(link);
        } else if (/\/(customers|case-studies)\//i.test(link)) {
          storyLinks.push(link);
        } else if (/\/blog\//i.test(link)) {
          blogLinks.push(link);
        } else if (/\/changelog\//i.test(link)) {
          changelogLinks.push(link);
        } else {
          otherLinks.push(link);
        }
      }

      const reservedCompareSlots    = Math.min(2, compareLinks.length);
      const reservedStorySlots      = Math.min(2, storyLinks.length);
      const reservedBlogSlots       = Math.min(1, blogLinks.length);
      const reservedChangelogSlots  = Math.min(1, changelogLinks.length);
      const reservedLowSignalSlots  = reservedCompareSlots + reservedStorySlots + reservedBlogSlots + reservedChangelogSlots;

      const rawPriorityLinks = [
        ...otherLinks.slice(0, Math.max(0, (safeMaxPages - 1) - reservedLowSignalSlots)),
        ...compareLinks.slice(0, reservedCompareSlots),
        ...storyLinks.slice(0, reservedStorySlots),
        ...blogLinks.slice(0, reservedBlogSlots),
        ...changelogLinks.slice(0, reservedChangelogSlots),
      ].slice(0, safeMaxPages - 1);

      // Canonical probe: if critical pricing pages weren't discovered by map,
      // force-add them — they are too important to miss due to map variance.
      // Use www-prefix when discovered URLs use www (most enterprise SaaS).
      const canonicalProbes = ['/pricing', '/plans', '/billing'];
      const usesWww = allDiscovered.some(u => { try { return new URL(u).hostname.startsWith('www.'); } catch { return false; } });
      const probeBase = usesWww ? `https://www.${baseHost}` : `https://${baseHost}`;
      const selectedSet = new Set(rawPriorityLinks.map(l => normaliseForDedup(l)));
      const missingProbes = canonicalProbes
        .map(probe => `${probeBase}${probe}`)
        .filter(probeUrl => !selectedSet.has(normaliseForDedup(probeUrl)));
      const priorityLinks = [...missingProbes, ...rawPriorityLinks].slice(0, safeMaxPages - 1);

      console.log(`Selected ${priorityLinks.length} pages (${missingProbes.length} canonical probes added)`);
      console.log('Priority links:', priorityLinks);

      // ═════════════════════════════════════════════════════════════════════
      // STEP 4: TARGETED SCRAPE — only verified URLs
      // ═════════════════════════════════════════════════════════════════════

      // Perf: 40s budget — Fix 1 pre-fetch removed. The pricing page is fetched
      // in the main batch (it already requests HTML via hasAccordions). Secondary
      // link extraction runs after the batch from the already-scraped markdown.
      // This eliminates the duplicate sequential Firecrawl call that previously
      // blocked the main batch from starting.

      // Final dedup pass: normaliseForDedup catches any trailing-slash / http / www
      // variants that survived earlier dedup (e.g. map returning both /pricing and
      // /pricing/ as separate entries). Uses a Map to preserve the first-seen URL form.
      const finalDedupMap = new Map<string, string>();
      for (const u of priorityLinks) {
        const key = normaliseForDedup(u);
        if (!finalDedupMap.has(key)) finalDedupMap.set(key, u);
      }
      const allUrlsToScrape = [...finalDedupMap.values()];

      const scrapePromises = allUrlsToScrape.map(pageUrl => scrapePage(apiKey, pageUrl));
      const scrapedPages = await Promise.all(scrapePromises);

      // ═════════════════════════════════════════════════════════════════════
      // Fix 2: Pre-Scoring Validation Layer
      // Count resolved vs unresolved pages. If ≥30% unresolved, attempt one
      // retry pass per unresolved URL with URL variant fallbacks (strip slash,
      // www toggle, http/https swap). Attach unresolved metadata to response.
      // ═════════════════════════════════════════════════════════════════════

      const resolvedPages: ScrapedPage[] = [];
      const unresolvedUrls: string[] = [];

      for (let i = 0; i < allUrlsToScrape.length; i++) {
        const page = scrapedPages[i];
        // 404 filter: pages that returned 404/Not Found content consume slots
        // but provide zero evidence — treat them as unresolved.
        // Checks title anywhere (not just start) to catch "Not Found | Clay" variants.
        const is404 = page && (
          /\b(404|not found|page not found|page doesn['']t exist|this page (doesn['']t|does not) exist)\b/i.test(page.title || '') ||
          page.markdown?.trimStart().startsWith('# 404') ||
          page.markdown?.trimStart().startsWith('## 404') ||
          /^#\s*(404|Page Not Found)/m.test(page.markdown || '') ||
          (!page.markdown?.trim() && !page.title?.trim())  // Firecrawl returned completely empty page
        );
        if (page && !is404) {
          resolvedPages.push(page);
        } else {
          if (is404) {
            console.log(`Skipping 404 page: ${allUrlsToScrape[i]} (title: "${page?.title}")`);
          }
          unresolvedUrls.push(allUrlsToScrape[i]);
        }
      }

      fix2TotalQueuedCount = allUrlsToScrape.length;
      const unresolvedRate = fix2TotalQueuedCount > 0 ? unresolvedUrls.length / fix2TotalQueuedCount : 0;

      // ═════════════════════════════════════════════════════════════════════
      // Fix 1 (post-batch): Pricing Page Secondary Pass
      // Perf: 40s budget — extracted from already-scraped pricing page markdown
      // instead of a separate pre-fetch. Eliminates the duplicate sequential
      // Firecrawl call. Secondary links extracted from markdown [text](url)
      // patterns; covers modal/tab/plan params and FAQ fragment anchors.
      // ═════════════════════════════════════════════════════════════════════
      const pricingPageUrl = allUrlsToScrape.find(u => isPricingPage(u)) ?? null;
      if (pricingPageUrl) {
        const scrapedPricing = resolvedPages.find(p => isPricingPage(p.url));
        if (scrapedPricing) {
          // Normalise www for dedup — prevents www.example.com/faq being re-scraped
          // when clay.com/faq was already in the primary batch
          const normaliseQueueUrl = (u: string) => { try { return new URL(u).href.replace('://www.', '://'); } catch { return u; } };
          const alreadyQueued = new Set([...allUrlsToScrape, formattedUrl].map(normaliseQueueUrl));
          const discovered: string[] = [];
          const mdLinkRegex = /\[([^\]]*)\]\(([^)\s]+)\)/g;
          let mdMatch;
          while ((mdMatch = mdLinkRegex.exec(scrapedPricing.markdown)) !== null) {
            const href = mdMatch[2];
            if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
            try {
              const resolved = new URL(href, pricingPageUrl).href;
              if (alreadyQueued.has(normaliseQueueUrl(resolved)) || !isSameDomain(resolved, baseHost)) continue;
              if (exclusionPatterns.some(p => p.test(resolved))) continue;
              // Accept modal/tab/plan params, FAQ fragments, or ≥2-segment docs subpages
              const parsedHref = new URL(resolved);
              const isModal = /[?&](modal|tab|plan|price\.platform)=/.test(parsedHref.search);
              // Also accept any query-param variant of a pricing page (e.g. /pricing?price.platform=api)
              const isPricingVariant = isPricingPage(resolved) && parsedHref.search.length > 0;
              const isFaqAnchor = /^#?(faq-|credits|compute|billing)/i.test(parsedHref.hash);
              const pathSegs = parsedHref.pathname.split('/').filter(Boolean);
              const isDocSubpage = pathSegs.length >= 2 && isEvidenceEligible(resolved);
              if (isModal || isPricingVariant || isFaqAnchor || isDocSubpage) {
                discovered.push(resolved);
                alreadyQueued.add(resolved);
              }
            } catch { /* skip invalid */ }
          }
          const secondaryUrls = [...new Set(discovered)].slice(0, 5);
          if (secondaryUrls.length > 0) {
            console.log(`Fix 1 (post-batch): Found ${secondaryUrls.length} secondary pricing URLs:`, secondaryUrls);
            const secondaryResults = await Promise.all(secondaryUrls.map(u => scrapePage(apiKey, u)));
            secondaryResults.forEach(p => {
              if (!p) return;
              const is404Secondary = /\b(404|not found|page not found|page doesn['']t exist|this page (doesn['']t|does not) exist)\b/i.test(p.title || '') ||
                p.markdown?.trimStart().startsWith('# 404') ||
                /^#\s*(404|Page Not Found)/m.test(p.markdown || '') ||
                (!p.markdown?.trim() && !p.title?.trim());
              if (!is404Secondary) resolvedPages.push(p);
            });
          } else {
            console.log('Fix 1 (post-batch): No secondary pricing URLs discovered');
          }
        }
      }

      let additionalRetryPages: ScrapedPage[] = [];

      if (unresolvedRate >= 0.30 && unresolvedUrls.length > 0) {
        console.warn(
          `Fix 2: High unresolved rate (${Math.round(unresolvedRate * 100)}%) for ${baseHost} on ${new Date().toISOString()}. ` +
          `Unresolved URLs: ${unresolvedUrls.join(', ')}`
        );

        // Retry each unresolved URL with variant fallbacks
        const retryPromises = unresolvedUrls.map(async (failedUrl): Promise<ScrapedPage | null> => {
          const variants: string[] = [];

          // Variant 1: strip trailing slash
          const withoutSlash = failedUrl.replace(/\/$/, '');
          if (withoutSlash !== failedUrl) variants.push(withoutSlash);

          // Variant 2: add trailing slash
          const withSlash = failedUrl.endsWith('/') ? failedUrl : failedUrl + '/';
          if (!variants.includes(withSlash)) variants.push(withSlash);

          // Variant 3: add/remove www
          try {
            const u = new URL(failedUrl);
            if (u.hostname.startsWith('www.')) {
              variants.push(failedUrl.replace(`://${u.hostname}`, `://${u.hostname.replace(/^www\./, '')}`));
            } else {
              variants.push(failedUrl.replace(`://${u.hostname}`, `://www.${u.hostname}`));
            }
          } catch { /* skip */ }

          // Variant 4: try http if https failed (and vice versa)
          if (failedUrl.startsWith('https://')) {
            variants.push(failedUrl.replace(/^https:\/\//, 'http://'));
          } else if (failedUrl.startsWith('http://')) {
            variants.push(failedUrl.replace(/^http:\/\//, 'https://'));
          }

          // Try each variant in order, stopping on first success
          for (const variant of variants) {
            const result = await scrapePage(apiKey, variant);
            if (result) {
              console.log(`Fix 2: Retry succeeded for ${failedUrl} via variant ${variant}`);
              return result;
            }
          }

          return null;
        });

        const retryResults = await Promise.all(retryPromises);

        for (let i = 0; i < retryResults.length; i++) {
          const retried = retryResults[i];
          if (retried) {
            // Apply same 404 filter to retry results — retry variants can return 404 pages
            const is404Retry = /\b(404|not found|page not found|page doesn['']t exist|this page (doesn['']t|does not) exist)\b/i.test(retried.title || '') ||
              retried.markdown?.trimStart().startsWith('# 404') ||
              /^#\s*(404|Page Not Found)/m.test(retried.markdown || '') ||
              (!retried.markdown?.trim() && !retried.title?.trim());
            if (!is404Retry) {
              additionalRetryPages.push(retried);
            } else {
              console.log(`Fix 2: Retry returned 404 page for ${unresolvedUrls[i]} (title: "${retried.title}") — skipping`);
              fix2ConfirmedMissUrls.push(unresolvedUrls[i]);
            }
          } else {
            fix2ConfirmedMissUrls.push(unresolvedUrls[i]);
          }
        }

        console.log(`Fix 2: Retry complete. ${additionalRetryPages.length} recovered, ${fix2ConfirmedMissUrls.length} confirmed misses.`);
      } else {
        // Under 30% threshold — confirmed misses = all unresolved (no retry needed)
        fix2ConfirmedMissUrls = unresolvedUrls;
      }

      fix2UnresolvedPageCount = fix2ConfirmedMissUrls.length;

      // Add all resolved and retry-recovered pages to the pages array
      for (const page of resolvedPages) {
        pages.push(page);
      }
      for (const page of additionalRetryPages) {
        pages.push(page);
      }
    }

    console.log(`Scraping complete. Total pages: ${pages.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        url: formattedUrl,
        pages,
        totalPages: pages.length,
        unresolvedPageCount: fix2UnresolvedPageCount,
        totalQueuedCount: fix2TotalQueuedCount,
        confirmedMissUrls: fix2ConfirmedMissUrls,
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
