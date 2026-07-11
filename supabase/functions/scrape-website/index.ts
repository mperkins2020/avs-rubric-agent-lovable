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

// ─── Helper: call Firecrawl /map (with retry on empty/rate-limited response) ──
async function mapDomain(apiKey: string, url: string, limit = 200, includeSubdomains = false, search?: string): Promise<string[]> {
  // Below this, suspect a rate-limited PARTIAL map, not just total failure.
  // Observed: /map returned 300 URLs then 0 URLs for the same domain seconds
  // apart; partial subsets between those extremes shift page selection and
  // move dimension scores run-to-run (lovable.dev analyzed 6/9/9/8 pages
  // across four otherwise-identical scans). Was 3 — blind to partial results.
  // Cost of the higher threshold: sites that genuinely map < 12 URLs pay one
  // extra 12s retry; the union below still keeps every URL either attempt found.
  const MIN_EXPECTED_URLS = 12;
  const RETRY_DELAY_MS = 12000; // wait 12s before retrying

  async function attemptMap(): Promise<string[]> {
    try {
      const payload: Record<string, unknown> = { url, limit, includeSubdomains };
      if (search) payload.search = search;
      const response = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      const data: FirecrawlMapResponse = JSON.parse(text);
      if (response.ok && data.success && data.links) {
        return data.links;
      }
      console.warn(`Map returned non-success for ${url}: status=${response.status}`);
    } catch (e) {
      console.warn(`Map failed for ${url}:`, e);
    }
    return [];
  }

  const firstAttempt = await attemptMap();
  if (firstAttempt.length >= MIN_EXPECTED_URLS) return firstAttempt;

  // Too few URLs — likely a rate-limit or partial failure. Wait and retry once.
  console.warn(`Map returned only ${firstAttempt.length} URLs for ${url} — possible rate-limited partial map; retrying after ${RETRY_DELAY_MS}ms`);
  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
  const secondAttempt = await attemptMap();

  // UNION the two attempts rather than picking the larger: rate-limited maps
  // can return different partial subsets, so the union recovers URLs that
  // neither attempt alone would provide.
  const union = [...new Set([...firstAttempt, ...secondAttempt])];
  if (union.length > Math.max(firstAttempt.length, secondAttempt.length)) {
    console.log(`Map retry union improved coverage for ${url}: ${firstAttempt.length} + ${secondAttempt.length} → ${union.length} URLs`);
  } else if (secondAttempt.length > firstAttempt.length) {
    console.log(`Map retry succeeded for ${url}: ${secondAttempt.length} URLs`);
  }
  return union;
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
  // NOTE: /\/terms\b/i intentionally removed from priorityPatterns — terms pages are
  // legal boilerplate excluded by exclusionPatterns above. Previously this caused
  // gamma.app/terms to be included as an evidence page.
];

const highIntentPaths = new Set([
  '/pricing', '/plans', '/plan', '/billing', '/usage', '/buy',
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
  /\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|txt)$/i,
  /\/(blog|news|press|careers|jobs|cookie|author|tag|category|insights?)\//i,
  /\/(blog|news|press|careers|jobs|cookie|author|tag|category|insights?)$/i,
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
  // Expert/instructor profiles, course pages, academy content — user-generated or
  // educational content with zero pricing signal (e.g. instantly.ai/experts/*, /courses/*)
  /\/experts?\/[^/]+/i,
  /\/courses?\//i,
  /\/courses?\b$/i,
  /\/academy\//i,
  /\/academy\b$/i,
  /\/tutorials?\//i,
  /\/tutorials?\b$/i,
  /\/learn\//i,
  // Single marketplace listing pages — same principle as integrations above;
  // the listing describes a third-party tool, not the company's own pricing or trust posture
  /\/marketplace\/[^/]+$/i,
  // Educational how-to/what-is articles — content marketing, not pricing or trust evidence.
  // Principle: a page explaining "what is X" teaches a concept; it does not document how
  // this company's product is priced, secured, or operationalised.
  /\/what-is-[^/]+/i,
  /\/how-to-[^/]+/i,
  /\/guide-to-[^/]+/i,
  // Terms of Service / Terms of Use pages — legal boilerplate. Removed from AVS methodology
  // source list per methodology v2. Refund conditions are captured from pricing and billing
  // pages instead. Rule 8: legal pages are not valid safety-rail evidence.
  /\/terms\b/i,
  // Explore / gallery pages — display user-created content (presentations, sites, docs).
  // These showcase what users built with the product; they are not the company's own
  // pricing, trust, or product documentation.
  /\/explore\b/i,
  // Zendesk collection pages — category/navigation pages that list articles.
  // They contain no actual help content, only article titles and summaries.
  // Example: help.gamma.app/en/collections/12271373-themes-fonts
  /\/collections\//i,
  // Partner agreement pages — legal terms between the company and its channel partners.
  // Not the company's own pricing or product documentation.
  /\/partners\b/i,
  // API/developer portal subdomains (developers.company.com, developer.company.com).
  // IMPORTANT: /\/developers?\b/i in priorityPatterns unintentionally matches these URLs
  // because the protocol separator '://' contributes a '/' immediately before 'developers'
  // in the hostname (e.g. https://developers.gamma.app contains '/developers').
  // This exclusion must run BEFORE the priorityPatterns check catches them.
  // Matches: https://developers.gamma.app/... and https://developer.stripe.com/...
  // Does NOT match: https://gamma.app/developers (different URL structure).
  /^https?:\/\/developers?\./i,
  // Prompt library pages — user-facing AI prompt templates, zero pricing signal
  // (e.g. instantly.ai/prompt/generate-b2b-saas-usp-differentiator-phrases)
  /\/prompts?\//i,
  /\/prompts?\b$/i,
  /\/prompts?\/[^/]+/i,
  // Founders / team profile pages — similar to /experts/, no pricing evidence
  /\/founders?\b/i,
  // Lecture and playlist pages — educational content, same principle as /courses/
  /\/[^/]+-lectures?\//i,
  /\/[^/]+-lectures?\b$/i,
  /\/[^/]+-playlist\//i,
  /\/[^/]+-playlist\b$/i,
];

const fullContentPatterns = [
  /\/pricing\b/i, /\/plans?\b/i, /\/billing\b/i,
  /\/faq\b/i, /\/help\b/i, /\/support\b/i,
  /\/trust\b/i, /\/security\b/i, /\/credits\b/i, /\/usage\b/i,
  /\/hc\b/i, /\/roi\b/i, /calculator/i, /\/refund/i,
];

// 'developer' and 'developers' intentionally excluded: these subdomains serve API reference
// documentation (endpoint listings, SDK guides), not user-facing pricing or trust evidence.
// Principle: developers.company.com is an API surface, not a product evidence page.
const helpSubdomains = ['help', 'support', 'docs', 'kb', 'knowledge', 'community', 'trust', 'compliance'];

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
    // Four-tier scoring for help/docs/trust subdomain content:
    // Tier 0: trust/compliance subdomains (trust.company.com, compliance.company.com) —
    //         primary D8 Safety Rails evidence. Treat like high-intent paths.
    //         Covers: trust.gamma.app, trust.lovable.dev, trust.clay.com,
    //                 trust.replit.com, trust.hex.tech, compliance.elevenlabs.io
    // Tier 1: billing keyword as a dedicated path segment (/credits, /billing, /overage, etc.)
    //         → highest priority for billing-adjacent evidence
    // Tier 2: billing keyword embedded anywhere in path — catches Zendesk article slugs
    //         (e.g. help.gamma.app/en/articles/7834324-how-do-credits-work-in-gamma).
    //         The article number prefix prevents Tier 1 from matching; check the full path.
    // Tier 3: generic deep help article (no billing keywords) — penalise so non-billing
    //         content (how-to-present-slides, change-theme, etc.) doesn't crowd out pricing pages.
    const subPrefix = new URL(link).hostname.split('.')[0].toLowerCase();
    if (subPrefix === 'trust' || subPrefix === 'compliance') {
      score += 800; // Tier 0 — trust/compliance center: primary D8 evidence
    } else if (/\/(plans-and-credits|credits|pricing|billing|usage|subscription|refund|cancel|overage|limit|quota|metering)\b/i.test(path)) {
      score += 700; // Tier 1 — billing as path segment
    } else if (/credits|billing|pricing|plans?|usage|overage|refund|subscription|cancel/i.test(path)) {
      score += 500; // Tier 2 — billing keyword embedded in slug
    } else if (/\/hc\/.+/i.test(path) || /\/articles?\/.+/i.test(path)) {
      score -= 200; // Tier 3 — generic deep help article, zero evidence signal
    }
  }

  // HIGH-VALUE CONTENT BOOST: pricing/billing/refund keywords anywhere in the path
  // (catches /faqs/pricing, /resources/pricing, /info/plans, /help/billing, /hc/refunds, etc.)
  if (/\/(pricing|billing|plans?|credits|subscription|refund|cancel|buy)\b/i.test(path) && !highIntentPaths.has(path)) {
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
  /\/(pricing|plans?|billing|subscription|credits|cost|packages|buy)\b/i.test(url);

// Naive `<[^>]+>` tag stripping breaks on attribute values that contain a
// literal `>` — e.g. Tailwind/Radix arbitrary-variant classes like
// `[&[data-state=open]>svg]:rotate-180`. The `>` inside the quoted class
// value terminates the match early, leaving the tag's tail (a fragment of
// the class string, or a sibling tag's attributes) treated as page text and
// leaking into evidence citations. Match quoted attribute values as opaque
// units so an embedded `>` can't end the tag early.
const stripHtmlTags = (html: string): string => html.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, ' ');

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
          stripHtmlTags(value)
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim()
        );
        if (plainText.length < 30) return;
        // Reject leaked HTML attribute/CSS-class soup (aria-*, data-*, Tailwind
        // utility runs) that survived tag stripping — not evidence-quality content.
        if (/\b(aria|data)-[\w-]+\s*=\s*["']|\bclass\s*=\s*["']|(?:\bhover:|dark:hover:|rounded-\w|\[&[[_])/i.test(plainText)) return;
        const normalized = plainText.slice(0, 420);
        if (seenExtracted.has(normalized)) return;
        seenExtracted.add(normalized);
        extractedTexts.push(normalized);
      };

      // Attribute-safe "not-yet-closed" fragment: quoted values (e.g. Tailwind/Radix
      // arbitrary-variant classes like `[&[data-state=open]>svg]:rotate-180`) can
      // contain a literal `>` — treat quoted spans as opaque so they can't be
      // mistaken for the tag's closing `>`.
      const ATTR = `(?:[^>"']|"[^"]*"|'[^']*')*`;
      const accordionContentRegex = new RegExp(
        `<(?:div|section|p|span|li|details)${ATTR}(?:data-(?:state|radix|orientation)|role="region"|aria-labelledby|aria-controls|accordion|collapse)${ATTR}>([\\s\\S]*?)<\\/(?:div|section|p|span|li|details)>`,
        'gi'
      );
      let match;
      while ((match = accordionContentRegex.exec(html)) !== null) {
        pushExtracted(match[1]);
      }

      const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      while ((match = tableRowRegex.exec(html)) !== null) {
        const rowHtml = match[1];
        const cells = Array.from(rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi))
          .map((cellMatch) => stripHtmlTags(cellMatch[1]).replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (cells.length >= 2) pushExtracted(cells.join(' | '));
      }

      // Targeted "What is a credit?" FAQ extraction
      const creditFaqIndex = html.toLowerCase().indexOf('what is a credit?');
      if (creditFaqIndex >= 0) {
        const creditFaqSegment = stripHtmlTags(
          html
            .slice(creditFaqIndex, creditFaqIndex + 18000)
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        )
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
    // ── Service role bypass — internal callers (e.g. run-benchmark) ──────
    // Direct key comparison: if the Authorization header exactly matches
    // "Bearer <SUPABASE_SERVICE_ROLE_KEY>", this is a trusted internal call.
    // This is more reliable than JWT decode in Deno's edge runtime.
    const _serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const isBenchmarkRunner =
      _serviceKey.length > 0 &&
      (req.headers.get('authorization') ?? '') === `Bearer ${_serviceKey}`;

    // Validate JWT authentication (skip for service role callers)
    const auth = isBenchmarkRunner
      ? { userId: 'service_role', userEmail: '', isAnonymous: false }
      : await validateAuth(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (isBenchmarkRunner) {
      console.log('Benchmark runner (service role) — auth bypass granted');
    } else {
      console.log('Authenticated user:', auth.userId);
    }

    // Rate limit: 3 scrapes per week per user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let isAdmin = isBenchmarkRunner; // service role = always admin
    if (!isBenchmarkRunner) {
      const { data: adminCheck } = await supabaseAdmin
        .rpc('has_role', { _user_id: auth.userId, _role: 'admin' });
      isAdmin = adminCheck === true;
    }

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
    // Coverage observability (see coverage block in the response): tracks how
    // complete discovery + scraping were this run, so thin scans are visible
    // downstream instead of silently scoring on less evidence.
    let coverageDiscoveredCount = 0;
    let coverageSelectedCount = 0;
    let coverageResolvedCount = 0;
    let coverageBackfilledCount = 0;

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
      // When the input URL targets a specific product path (e.g. salesforce.com/agentforce/),
      // pass the first path segment as a search hint to Firecrawl's /map so it returns
      // product-scoped URLs instead of the entire domain.
      const inputPath = urlObj.pathname.replace(/\/+$/, '');
      const pathSegments = inputPath.split('/').filter(Boolean);
      const productSearch = pathSegments.length >= 1 ? pathSegments[0] : undefined;
      if (productSearch) {
        console.log(`Product-scoped map: using search="${productSearch}" from input path`);
      }

      // Phase 1a: Map the main domain (with subdomains)
      // For path-based domains (e.g. autobound.ai/pricing), strip the path before
      // calling Firecrawl /map so it discovers the full site, not just the path subtree.
      console.log('Phase 1a: Mapping main domain...');
      const mapBaseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
      const mainMapLinks = await mapDomain(apiKey, mapBaseUrl, 300, true, productSearch);
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
        // Trust/compliance centers are primary D8 evidence per methodology — always probe
        // these when they exist, regardless of the general cap.
        // Examples: trust.gamma.app, trust.lovable.dev, compliance.elevenlabs.io
        const trustProbes = subdomainsToProbe.filter(s =>
          s.startsWith('trust.') || s.startsWith('compliance.')
        );
        // General help subdomains (help, docs, support, etc.) — cap at 2,
        // prioritising the most evidence-rich subdomain types first.
        const generalProbes = subdomainsToProbe
          .filter(s => !s.startsWith('trust.') && !s.startsWith('compliance.'))
          .sort((a, b) => {
            const order = ['docs', 'help', 'support', 'kb', 'knowledge'];
            const aIdx = order.findIndex(o => a.startsWith(o));
            const bIdx = order.findIndex(o => b.startsWith(o));
            return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
          })
          .slice(0, 2);
        const priorityProbes = [...trustProbes, ...generalProbes];

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

      // Normalise a URL for deduplication.
      // Strips: #:~:text= fragments, locale prefixes, www prefix, trailing slash, http→https.
      // Preserves: query params — e.g. elevenlabs.io/pricing?price.platform=api is genuinely
      // different content from elevenlabs.io/pricing and must keep its own slot.
      // Exception: billing/payment support pages have no content-differentiating query params —
      // strip them entirely so tracking variants don't consume multiple slots.
      // Defined before STEP 3 so the homepage-exclusion filter below can use the same
      // normalisation as every other dedup pass — a raw string-equality check misses
      // www/protocol/trailing-slash variants of the homepage URL, letting the already
      // force-scraped homepage (Step 1) get queued and scraped a second time.
      const BILLING_DEDUP_PATHS = /\/(?:about\/payments?|billing(?:-support)?|invoice|payments?|billing-and-invoices|payment-support)\b/i;
      const normaliseForDedup = (link: string): string => {
        try {
          const parsed = new URL(link);
          // Strip text fragment anchors (#:~:text=...) — same HTML document as the base URL
          parsed.hash = parsed.hash.startsWith('#:~:') ? '' : parsed.hash;
          // Strip locale path prefixes (/en/, /en-US/, /fr/, /de/, etc.)
          parsed.pathname = parsed.pathname.replace(/^\/[a-z]{2}(-[a-zA-Z]{2,4})?\//,  '/');
          // Collapse double slashes in path (e.g. //about → /about) — Firecrawl map
          // sometimes returns malformed URLs with double slashes that fool naive dedup.
          parsed.pathname = parsed.pathname.replace(/\/\/+/g, '/');
          // Strip trailing slash from pathname (root '/' is preserved)
          // /pricing/ ≡ /pricing — Firecrawl map often returns both variants
          if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/$/, '');
          // Lowercase the hostname — Relevanceai.com ≡ relevanceai.com. Case-variant
          // hostnames (e.g. from map results or hand-entered probes) otherwise survive
          // dedup and consume an extra evidence slot for what is the same page.
          parsed.hostname = parsed.hostname.toLowerCase();
          // Strip www. prefix — www.example.com/path ≡ example.com/path
          parsed.hostname = parsed.hostname.replace(/^www\./, '');
          // Normalize http → https — http://example.com/pricing ≡ https://example.com/pricing
          parsed.protocol = 'https:';
          // Strip query params and hash fragments from billing support pages — section anchors
          // and tracking variants all resolve to the same content and must not consume separate slots.
          if (BILLING_DEDUP_PATHS.test(parsed.pathname)) { parsed.search = ''; parsed.hash = ''; }
          return parsed.toString();
        } catch { return link; }
      };

      // ═════════════════════════════════════════════════════════════════════
      // STEP 3: SCORE & SELECT — only from discovered + community URLs
      // ═════════════════════════════════════════════════════════════════════
      const communityUrlSet = new Set(communityUrls);
      // All candidates come from actual discovery — no blind fallback probes.
      // If the input URL has a path (e.g. autobound.ai/pricing), add it as a seed so
      // it's always in the candidate pool even though mapDomain used the base hostname.
      const pathSeedUrls = urlObj.pathname !== '/' ? [formattedUrl] : [];
      const allDiscovered = [...new Set([...mainMapLinks, ...subdomainMapLinks, ...communityUrls, ...pathSeedUrls])];
      console.log(`Total discovered URLs: ${allDiscovered.length}`);

      // When a product path is active, boost URLs containing that segment so
      // product-specific pages outscore generic same-domain pages.
      const productPathBoost = (link: string, baseScore: number): number => {
        if (!productSearch) return baseScore;
        const re = new RegExp(`\\/${productSearch}\\/|\\/${productSearch}$`, 'i');
        if (re.test(link)) return baseScore + 1500;
        return baseScore;
      };

      // Normalized comparison, not raw string equality — the homepage was already
      // force-scraped in Step 1 (line ~875). A raw `link === formattedUrl` check
      // misses www/protocol/trailing-slash/case variants that Firecrawl's map
      // commonly returns (e.g. "https://www.relevanceai.com/" vs "https://relevanceai.com"),
      // letting the homepage slip into the candidate pool and get scraped a second
      // time as a duplicate "Pages Analyzed" entry.
      const normalisedHomepage = normaliseForDedup(formattedUrl);
      const scoredLinks = allDiscovered
        .filter((link: string) => {
          if (exclusionPatterns.some(p => p.test(link))) return false;
          if (normaliseForDedup(link) === normalisedHomepage) return false;
          try {
            const parsed = new URL(link);
            const segs = parsed.pathname.split('/').filter(Boolean);
            // Resource-instance ID filter — three rules covering different ID conventions.
            // Principle: a path segment that looks like a generated identifier is a resource
            // instance URL (a board, a doc, a file), not an informational evidence page.
            //
            // Rule A — Mixed-case base64 (Miro boards: uXjVGArvT-g=, uXjVG05WR5Q=)
            //   ≥8 chars, alphanumeric+hyphen+underscore+optional '=', has BOTH upper and lowercase.
            // Rule B — Digit-leading random slugs (Gamma docs: 2007-p39rtn8slkfwkbe, 6--2uoyy8nkses2lbj)
            //   Starts with a digit, ≥8 chars, contains letters.
            //   ZENDESK EXCEPTION: Zendesk article slugs follow {id}-{human-readable-title}.
            //   The word portion after the numeric ID is purely lowercase letters+hyphens — no digits.
            //   Test: /^[0-9]+-[a-z][a-z-]*$/
            //     7834324-how-do-credits-work-in-gamma → matches → Zendesk slug → ALLOWED
            //     2007-p39rtn8slkfwkbe → 'p39...' has digits → no match → blocked ✓
            //     2026-04--e3e4deqagopvucq → '04--...' starts with digit → no match → blocked ✓
            //     6--2uoyy8nkses2lbj → starts with '-' → no match → blocked ✓
            // Rule C — All-lowercase opaque IDs (Gamma docs: avu2xyfyhrqm75f, 8nmk3jj496525b6)
            //   ≥10 chars, only [a-z0-9] (no hyphens), ≥3 digits.
            // Rule D — Word-prefix + random suffix (Gamma docs: ringkasan-jurnal-c4d1t3zry6ijqnb)
            //   User docs often have a human-readable name + random ID suffix joined by hyphens.
            //   Rules A–C miss these because: not digit-leading (B), not mixed-case (A),
            //   and hyphens fail Rule C's ^[a-z0-9]+$ test.
            //   Detection: the LAST hyphen-delimited token of the segment is a compact
            //   alphanumeric string (≥8 chars, only [a-z0-9], ≥2 digits).
            //   Real word slugs end in actual words: 'delivery', 'features', 'gamma' (0 digits).
            //     ringkasan-jurnal-c4d1t3zry6ijqnb → last token c4d1t3zry6ijqnb (4 digits) → BLOCKED
            //     planning-delivery → last token delivery (0 digits) → ALLOWED
            //     how-do-credits-work-in-gamma → last token gamma (0 digits) → ALLOWED
            const lastSeg = segs[segs.length - 1] ?? '';
            const digitCount = (lastSeg.match(/[0-9]/g) ?? []).length;
            const isZendeskArticleSlug = /^[0-9]+-[a-z][a-z-]*$/.test(lastSeg); // Zendesk exception
            const lastToken = lastSeg.includes('-') ? (lastSeg.split('-').pop() || '') : '';
            const lastTokenDigits = (lastToken.match(/[0-9]/g) ?? []).length;
            if (
              // Rule A
              (lastSeg.length >= 8 &&
               /^[A-Za-z0-9_-]+=*$/.test(lastSeg) &&
               /[A-Z]/.test(lastSeg) &&
               /[a-z]/.test(lastSeg)) ||
              // Rule B (with Zendesk exception — pure alphabetic word portion)
              (!isZendeskArticleSlug &&
               /^[0-9]/.test(lastSeg) &&
               lastSeg.length >= 8 &&
               /[a-zA-Z]/.test(lastSeg)) ||
              // Rule C — no-hyphen opaque IDs
              (lastSeg.length >= 10 &&
               /^[a-z0-9]+$/.test(lastSeg) &&
               /[a-z]/.test(lastSeg) &&
               digitCount >= 3) ||
              // Rule D — compound slugs ending in a random opaque suffix
              (lastToken.length >= 8 &&
               /^[a-z0-9]+$/.test(lastToken) &&
               lastTokenDigits >= 2)
            ) return false;
            // Locale-prefix filter — drops non-English locale paths everywhere.
            // Help subdomains (Zendesk-style) use /en/ as a structural element, so English
            // locale paths are exempted on help subdomains only. Non-English locale paths
            // (e.g. trust.tabnine.com/zh) are always filtered regardless of subdomain type.
            const firstSeg = (segs[0] ?? '').toLowerCase();
            const isHelpSubdomainUrl = helpSubdomains.some(s => parsed.hostname === `${s}.${registrableDomain}`);
            const isLocalePrefix = segs.length >= 1 && /^(?:fr|de|es|pt|ja|zh|cn|ko|it|nl|pl|ru|ar|tr|sv|da|fi|nb|cs|hu|ro|uk|en|id|th|vi|ms|hi|he|el)(?:-[a-z]{2,4})?$/.test(firstSeg);
            if (isLocalePrefix && (!isHelpSubdomainUrl || !/^en(?:-[a-z]{2,4})?$/.test(firstSeg))) return false;
          } catch { /* malformed URL — let downstream filters handle */ }
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
        .map((link: string) => ({ link, score: productPathBoost(link, scoreUrl(link, baseHost, communityUrlSet)) }))
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
          // Resource-instance ID filter — mirrors Rules A–D in scoredLinks.filter.
          // See that location for full rule rationale and Zendesk exception.
          const lastSeg = parsed.pathname.split('/').filter(Boolean).pop() || '';
          if (/^-[a-z0-9]{10,}$/i.test(lastSeg)) return false; // legacy gamma.app '-slug' pattern
          const digitCount = (lastSeg.match(/[0-9]/g) ?? []).length;
          const isZendeskArticleSlugEE = /^[0-9]+-[a-z][a-z-]*$/.test(lastSeg); // Zendesk exception
          const lastTokenEE = lastSeg.includes('-') ? (lastSeg.split('-').pop() || '') : '';
          const lastTokenDigitsEE = (lastTokenEE.match(/[0-9]/g) ?? []).length;
          if (
            // Rule A — mixed-case base64 (Miro boards)
            (lastSeg.length >= 8 &&
             /^[A-Za-z0-9_-]+=*$/.test(lastSeg) &&
             /[A-Z]/.test(lastSeg) &&
             /[a-z]/.test(lastSeg)) ||
            // Rule B — digit-leading slugs; Zendesk exception
            (!isZendeskArticleSlugEE &&
             /^[0-9]/.test(lastSeg) &&
             lastSeg.length >= 8 &&
             /[a-zA-Z]/.test(lastSeg)) ||
            // Rule C — no-hyphen opaque IDs (Gamma docs: avu2xyfyhrqm75f)
            (lastSeg.length >= 10 &&
             /^[a-z0-9]+$/.test(lastSeg) &&
             /[a-z]/.test(lastSeg) &&
             digitCount >= 3) ||
            // Rule D — compound slugs ending in a random opaque suffix
            (lastTokenEE.length >= 8 &&
             /^[a-z0-9]+$/.test(lastTokenEE) &&
             lastTokenDigitsEE >= 2) ||
            // Rule E — pure numeric IDs (database record keys, e.g. zoominfo.com/c/co/551539465)
            /^\d{5,}$/.test(lastSeg)
          ) return false;
          // Gated path blocklist — these paths are uniformly behind authentication across SaaS.
          // They return HTTP 200 + a login wall page with zero evidence content, wasting a slot.
          const firstSeg = parsed.pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
          if (/^(subscription|usage|account|accounts|dashboard|settings|login|signin|sign-in|sign-up|signup|register)$/.test(firstSeg)) return false;
          return true;
        } catch { return false; }
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
      const complianceLinks: string[] = []; // compliance.*/trust.* subdomains — 3 slots max
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
        } else if (/^https?:\/\/(compliance|trust)\./i.test(link)) {
          complianceLinks.push(link);
        } else {
          otherLinks.push(link);
        }
      }

      const reservedCompareSlots    = Math.min(2, compareLinks.length);
      const reservedStorySlots      = Math.min(2, storyLinks.length);
      const reservedBlogSlots       = Math.min(1, blogLinks.length);
      const reservedChangelogSlots  = Math.min(1, changelogLinks.length);
      const reservedComplianceSlots = Math.min(3, complianceLinks.length);
      const reservedLowSignalSlots  = reservedCompareSlots + reservedStorySlots + reservedBlogSlots + reservedChangelogSlots + reservedComplianceSlots;

      const rawPriorityLinks = [
        ...otherLinks.slice(0, Math.max(0, (safeMaxPages - 1) - reservedLowSignalSlots)),
        ...complianceLinks.slice(0, reservedComplianceSlots),
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

      // Community evidence URLs get guaranteed slots — they were manually verified
      // as high-value pages that automated discovery misses. Force-add any that
      // didn't make it through the category cap system.
      const missingCommunity = communityUrls
        .filter(cu => !selectedSet.has(normaliseForDedup(cu)));
      if (missingCommunity.length > 0) {
        console.log(`Force-adding ${missingCommunity.length} community evidence URLs that were cut by slot caps:`, missingCommunity);
      }

      const priorityLinks = [...missingProbes, ...missingCommunity, ...rawPriorityLinks].slice(0, safeMaxPages - 1);

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
      // Sanitize URLs before scraping: collapse any double slashes in paths
      // that survived earlier dedup (e.g. www.clay.com//about → www.clay.com/about).
      const sanitiseForScrape = (link: string): string => {
        try {
          const parsed = new URL(link);
          parsed.pathname = parsed.pathname.replace(/\/\/+/g, '/');
          return parsed.toString();
        } catch { return link; }
      };
      const allUrlsToScrape = [...finalDedupMap.values()].map(sanitiseForScrape);
      coverageDiscoveredCount = allDiscovered.length;
      coverageSelectedCount = allUrlsToScrape.length;

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
          // 5xx server error pages — "We're having technical difficulties (500)" etc.
          // \(5\d{2}\) is specific to parenthesized HTTP codes in titles; avoids
          // false positives on pricing text like "500 credits/month".
          /\(5\d{2}\)/.test(page.title || '') ||
          /\b(technical difficulties|internal server error|service unavailable|bad gateway|something went wrong)\b/i.test(page.title || '') ||
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
              // Allow same hostname OR known help/docs subdomains only.
              // Using .endsWith(registrableDomain) is too permissive — it admits developers.*,
              // cdn.*, etc. Restrict to helpSubdomains explicitly so that only evidence-grade
              // subdomains (help.*, support.*, docs.*) are followed.
              const resolvedHostFix1 = new URL(resolved).hostname.replace(/^www\./, '');
              const isHelpSubFix1 = helpSubdomains.some(s => resolvedHostFix1 === `${s}.${registrableDomain}`);
              const isSameDomainOrHelpSub = resolvedHostFix1 === baseHost || isHelpSubFix1;
              if (alreadyQueued.has(normaliseQueueUrl(resolved)) || !isSameDomainOrHelpSub) continue;
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
                /\(5\d{2}\)/.test(p.title || '') ||
                /\b(technical difficulties|internal server error|service unavailable|bad gateway|something went wrong)\b/i.test(p.title || '') ||
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
              /\(5\d{2}\)/.test(retried.title || '') ||
              /\b(technical difficulties|internal server error|service unavailable|bad gateway|something went wrong)\b/i.test(retried.title || '') ||
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

      // ═════════════════════════════════════════════════════════════════════
      // Coverage backfill: when selected pages fail to resolve (fetch error,
      // 404, bot block) below Fix 2's 30% retry threshold, the analyzed set
      // silently shrinks — and dimension scores move with evidence coverage.
      // Refill the shortfall from the next-ranked eligible candidates so the
      // analyzed page count stays stable run-to-run. Bounded to keep latency
      // predictable (Issue 13).
      // ═════════════════════════════════════════════════════════════════════
      coverageResolvedCount = resolvedPages.length + additionalRetryPages.length;
      const MAX_BACKFILL = 3;
      const coverageShortfall = allUrlsToScrape.length - coverageResolvedCount;
      if (coverageShortfall > 0) {
        // Same 404/5xx content detection used for the primary batch and Fix 2
        // retries above; duplicated deliberately so existing paths stay untouched.
        const looksLike404 = (p: ScrapedPage): boolean =>
          /\b(404|not found|page not found|page doesn['']t exist|this page (doesn['']t|does not) exist)\b/i.test(p.title || '') ||
          /\(5\d{2}\)/.test(p.title || '') ||
          /\b(technical difficulties|internal server error|service unavailable|bad gateway|something went wrong)\b/i.test(p.title || '') ||
          p.markdown?.trimStart().startsWith('# 404') ||
          /^#\s*(404|Page Not Found)/m.test(p.markdown || '') ||
          (!p.markdown?.trim() && !p.title?.trim());

        const alreadyAttempted = new Set([...allUrlsToScrape, formattedUrl].map(normaliseForDedup));
        const backupCandidates = dedupedScoredLinks
          .map(({ link }) => link)
          .filter(link => !alreadyAttempted.has(normaliseForDedup(link)))
          .slice(0, Math.min(coverageShortfall, MAX_BACKFILL));

        if (backupCandidates.length > 0) {
          console.log(`Coverage backfill: ${coverageShortfall} selected page(s) failed to resolve — scraping ${backupCandidates.length} next-ranked backup(s):`, backupCandidates);
          const backfillResults = await Promise.all(backupCandidates.map(u => scrapePage(apiKey, sanitiseForScrape(u))));
          for (const page of backfillResults) {
            if (page && !looksLike404(page)) {
              pages.push(page);
              coverageBackfilledCount++;
            }
          }
          coverageResolvedCount += coverageBackfilledCount;
          console.log(`Coverage backfill complete: ${coverageBackfilledCount} page(s) recovered.`);
        }
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
        // Coverage observability: how complete discovery + scraping were this
        // run. coverageWarning=true means the evidence set is thinner than
        // normal and scores should not be trusted as final (QA Gate 1 hook:
        // benchmark runs should rescan instead of accepting a thin scan).
        coverage: {
          discoveredUrlCount: coverageDiscoveredCount,
          selectedCount: coverageSelectedCount,
          resolvedCount: coverageResolvedCount,
          backfilledCount: coverageBackfilledCount,
          confirmedMissCount: fix2ConfirmedMissUrls.length,
          coverageWarning:
            (coverageSelectedCount > 0 && coverageResolvedCount < Math.ceil(0.6 * coverageSelectedCount)) ||
            coverageDiscoveredCount < 12,
        },
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
