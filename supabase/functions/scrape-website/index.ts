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

  // Only allow http/https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'Only http and https URLs are allowed';
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and loopback
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
    return 'Internal URLs are not allowed';
  }

  // Block private IP ranges
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

  // Block metadata endpoints
  if (hostname === 'metadata.google.internal' || hostname.endsWith('.internal')) {
    return 'Internal URLs are not allowed';
  }

  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Rate limit: 3 scrapes per week per user (mirrors analyze-company)
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

    // Enforce URL length limit
    if (url.length > 2048) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL exceeds maximum length of 2048 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enforce maxPages limit
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

    // Validate URL safety (SSRF protection)
    const unsafeReason = isUnsafeUrl(formattedUrl);
    if (unsafeReason) {
      return new Response(
        JSON.stringify({ success: false, error: unsafeReason }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting scrape for URL:', formattedUrl);
    console.log('Include subpages:', includeSubpages);
    console.log('Max pages:', maxPages);

    const pages: ScrapedPage[] = [];

    // Step 1: Scrape the main page
    // Determine if the submitted URL itself is a high-value page needing full content
    const mainPageFullContentPatterns = [
      /\/pricing\b/i, /\/plans?\b/i, /\/billing\b/i, /\/faq\b/i,
      /\/help\b/i, /\/support\b/i, /\/trust\b/i, /\/security\b/i,
      /\/credits\b/i, /\/usage\b/i,
    ];
    const mainNeedsFullContent = mainPageFullContentPatterns.some(p => p.test(formattedUrl));
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
      const mainPageText = await mainPageResponse.text();
      mainPageData = JSON.parse(mainPageText);
    } catch {
      console.error('Firecrawl returned non-JSON response, status:', mainPageResponse.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'The website could not be reached. Please check the URL and try again.' 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mainPageResponse.ok || !mainPageData.success) {
      console.error('Failed to scrape main page:', mainPageData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to scrape the main page. Please check the URL and try again.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mainPage = mainPageData.data;
    if (mainPage) {
      pages.push({
        url: formattedUrl,
        title: mainPage.metadata?.title || 'Home',
        markdown: mainPage.markdown || '',
        metadata: {
          description: mainPage.metadata?.description,
          keywords: mainPage.metadata?.keywords,
        },
      });
    }

    console.log('Main page scraped successfully');

    // Step 2: If subpages are requested, find and scrape relevant pages
    if (includeSubpages && safeMaxPages > 1) {
      console.log('Mapping website for subpages...');
      
      // Parse base URL for constructing fallback URLs
      const urlObj = new URL(formattedUrl);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const domainForLookup = urlObj.hostname.replace(/^www\./, '');

      // Load community-submitted evidence URLs for this domain
      let communityUrls: string[] = [];
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const ceResponse = await fetch(
          `${supabaseUrl}/rest/v1/community_evidence?url_domain=eq.${encodeURIComponent(domainForLookup)}&select=evidence_url&order=created_at.desc&limit=20`,
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
            console.log(`Found ${communityUrls.length} community evidence URLs for ${domainForLookup}`);
          }
        }
      } catch (ceErr) {
        console.error('Failed to load community evidence (non-fatal):', ceErr);
      }

      // Common high-value page paths to try as fallbacks — economic surfaces first
      const commonPaths = [
        '/pricing',
        '/about',
        '/features',
        '/product',
        '/solutions',
        '/platform',
        '/enterprise',
        '/security',
        '/trust',
        '/integrations',
        '/customers',
        '/use-cases',
        '/how-it-works',
        '/docs',
        '/help',
        '/help-center',
        '/knowledge-base',
        '/faq',
        '/support',
        '/api',
        '/developers',
        '/billing',
        '/usage',
        '/usage-limits',
        '/credits',
        '/subscription',
        '/plans',
        '/blog',
        '/changelog',
        '/updates',
        '/release-notes',
        '/status',
        '/terms',
        '/legal',
        '/privacy',
      ];

      // Detect common help/docs subdomains
      const helpSubdomains = ['help', 'support', 'docs', 'developer', 'developers', 'kb', 'knowledge', 'community'];
      const rootDomain = urlObj.hostname.replace(/^www\./, '');
      // Extract the registrable domain (e.g., elevenlabs.io from www.elevenlabs.io)
      const domainParts = rootDomain.split('.');
      const registrableDomain = domainParts.length >= 2 ? domainParts.slice(-2).join('.') : rootDomain;

      const subdomainUrls: string[] = [];
      const docsSubpaths = ['/pricing', '/introduction', '/introduction/plans-and-credits', '/getting-started', '/overview', '/guides', '/api-reference', '/quickstart'];
      for (const sub of helpSubdomains) {
        const subRoot = `https://${sub}.${registrableDomain}`;
        subdomainUrls.push(subRoot);
        // Add common docs subpaths for docs/help subdomains
        if (['docs', 'help', 'support', 'developer', 'developers', 'kb'].includes(sub)) {
          for (const subpath of docsSubpaths) {
            subdomainUrls.push(subRoot + subpath);
          }
        }
      }
      
      const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formattedUrl,
          limit: 200,
          includeSubdomains: true,
        }),
      });

      let mapData: FirecrawlMapResponse = { success: false };
      try {
        const mapText = await mapResponse.text();
        mapData = JSON.parse(mapText);
      } catch {
        console.warn('Map endpoint returned non-JSON, skipping subpage discovery');
      }
      let allLinks: string[] = [];

      if (mapResponse.ok && mapData.success && mapData.links) {
        console.log(`Found ${mapData.links.length} links from map`);
        allLinks = mapData.links;
      }
      
      // Add fallback URLs that might not be in the sitemap
      const fallbackUrls = commonPaths.map(path => baseUrl + path);
      console.log('Adding fallback URLs for common pages');
      
      // Combine and score candidates (avoid insertion-order bias toward docs subdomains)
      const combinedLinks = [...new Set([...communityUrls, ...fallbackUrls, ...subdomainUrls, ...allLinks])];
      console.log(`Total combined links: ${combinedLinks.length} (${communityUrls.length} community, ${subdomainUrls.length} subdomain probes)`);

      // Filter for high-value pages
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
        // Billing/usage-related keyword patterns
        /overage/i,
        /caps?\b/i,
        /alerts?\b/i,
        /calculator/i,
        /fair.?use/i,
        /rate.?limit/i,
        /quota/i,
        /metering/i,
        /cost/i,
        /spend/i,
      ];

      // Match ALL pages under help/docs subdomains (not just roots)
      const subdomainPattern = new RegExp(`^https?://(${helpSubdomains.join('|')})\\.`, 'i');

      const highIntentMainDomainPaths = new Set([
        '/pricing',
        '/plans',
        '/plan',
        '/billing',
        '/usage',
        '/subscription',
        '/features',
        '/feature',
        '/product',
        '/products',
        '/solutions',
      ]);

      // Check if a URL is a shallow path (1-2 segments) on the main domain
      // These are almost always top-level product, feature, or use-case pages
      const isShallowSameDomainPath = (link: string): boolean => {
        try {
          const linkUrl = new URL(link);
          const linkHost = linkUrl.hostname.replace(/^www\./, '');
          const baseHost = urlObj.hostname.replace(/^www\./, '');
          if (linkHost !== baseHost) return false;
          // Count path segments (ignore trailing slash)
          const pathSegments = linkUrl.pathname.replace(/\/$/, '').split('/').filter(Boolean);
          return pathSegments.length >= 1 && pathSegments.length <= 2;
        } catch {
          return false;
        }
      };

      const getNormalizedPath = (link: string): string => {
        try {
          return new URL(link).pathname.replace(/\/$/, '').toLowerCase() || '/';
        } catch {
          return '/';
        }
      };

      const isSameDomain = (link: string): boolean => {
        try {
          return new URL(link).hostname.replace(/^www\./, '') === urlObj.hostname.replace(/^www\./, '');
        } catch {
          return false;
        }
      };

      // Exclusion patterns - removed terms/legal/changelog from exclusion since they're now priority
      const exclusionPatterns = [
        /\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/i,
        /\/(blog|news|press|careers|jobs|cookie|author|tag|category)\//i,
        /\/(blog|news|press|careers|jobs|cookie|author|tag|category)$/i,
        /\/(wp-content|wp-admin|wp-includes|wp-json)\//i,
        /\/(login|signup|sign-up|sign-in|register|cart|checkout)\b/i,
      ];

      // Community evidence URLs bypass priority filtering (they're pre-validated as useful)
      const communityUrlSet = new Set(communityUrls);
      const scoredLinks = combinedLinks
        .filter((link: string) => {
          if (exclusionPatterns.some(pattern => pattern.test(link))) return false;
          if (link === formattedUrl || link === formattedUrl + '/') return false;

          if (communityUrlSet.has(link)) return true;
          if (isShallowSameDomainPath(link)) return true;
          if (priorityPatterns.some(pattern => pattern.test(link))) return true;
          if (subdomainPattern.test(link)) return true;
          return false;
        })
        .map((link: string) => {
          const path = getNormalizedPath(link);
          const sameDomain = isSameDomain(link);
          const shallowMainDomain = sameDomain && isShallowSameDomainPath(link);
          const highIntentMainDomain = sameDomain && highIntentMainDomainPaths.has(path);
          const keywordMatch = priorityPatterns.some(pattern => pattern.test(link));
          const docsSubdomain = subdomainPattern.test(link);

          let score = 0;
          if (communityUrlSet.has(link)) score += 1000;
          if (highIntentMainDomain) score += 900;
          if (shallowMainDomain) score += 500;
          if (keywordMatch) score += 250;
          if (docsSubdomain) score += 100;

          return { link, score };
        })
        .sort((a, b) => b.score - a.score || a.link.localeCompare(b.link));

      const priorityLinks = scoredLinks.map(({ link }) => link).slice(0, safeMaxPages - 1);

      console.log(`Selected ${priorityLinks.length} priority pages to scrape`);
      console.log('Priority links:', priorityLinks);

      // Pages where FAQ / accordion content is critical — scrape full page
      const fullContentPatterns = [
        /\/pricing\b/i,
        /\/plans?\b/i,
        /\/billing\b/i,
        /\/faq\b/i,
        /\/help\b/i,
        /\/support\b/i,
        /\/trust\b/i,
        /\/security\b/i,
        /\/credits\b/i,
        /\/usage\b/i,
      ];

      // Scrape each priority page (in parallel for speed)
      const scrapePromises = priorityLinks.map(async (pageUrl: string) => {
        try {
          // Use full page content for pages likely to have FAQ/accordion sections
          const needsFullContent = fullContentPatterns.some(p => p.test(pageUrl));
          console.log('Scraping:', pageUrl, needsFullContent ? '(full content)' : '(main only)');
          const pageResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: pageUrl,
              formats: ['markdown'],
              onlyMainContent: !needsFullContent,
            }),
          });

          let pageData: FirecrawlScrapeResponse;
          try {
            const pageText = await pageResponse.text();
            pageData = JSON.parse(pageText);
          } catch {
            console.log('Non-JSON response for:', pageUrl);
            return null;
          }

          if (pageResponse.ok && pageData.success && pageData.data) {
            console.log('Successfully scraped:', pageUrl);
            return {
              url: pageUrl,
              title: pageData.data.metadata?.title || pageUrl,
              markdown: pageData.data.markdown || '',
              metadata: {
                description: pageData.data.metadata?.description,
              },
            };
          } else {
            console.log('Failed to scrape (page may not exist):', pageUrl);
            return null;
          }
        } catch (pageError) {
          console.error(`Failed to scrape ${pageUrl}:`, pageError);
          return null;
        }
      });

      const scrapedPages = await Promise.all(scrapePromises);
      
      // Add successfully scraped pages
      for (const page of scrapedPages) {
        if (page) {
          pages.push(page);
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
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-website:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
