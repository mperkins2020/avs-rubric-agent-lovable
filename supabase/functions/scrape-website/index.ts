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

// Validate JWT authentication
async function validateAuth(req: Request): Promise<{ userId: string } | null> {
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
  return { userId: data.claims.sub as string };
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

    const { url, includeSubpages = true, maxPages = 10 }: ScrapeRequest = await req.json();

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
    const safeMaxPages = Math.min(Math.max(1, maxPages), 20);

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
    console.log('Scraping main page...');
    const mainPageResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'links'],
        onlyMainContent: true,
      }),
    });

    let mainPageData: any;
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
    pages.push({
      url: formattedUrl,
      title: mainPage.metadata?.title || 'Home',
      markdown: mainPage.markdown || '',
      metadata: {
        description: mainPage.metadata?.description,
        keywords: mainPage.metadata?.keywords,
      },
    });

    console.log('Main page scraped successfully');

    // Step 2: If subpages are requested, find and scrape relevant pages
    if (includeSubpages && safeMaxPages > 1) {
      console.log('Mapping website for subpages...');
      
      // Parse base URL for constructing fallback URLs
      const urlObj = new URL(formattedUrl);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      
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
        '/support',
        '/blog',
        '/changelog',
        '/updates',
        '/release-notes',
        '/status',
        '/terms',
        '/legal',
        '/privacy',
      ];
      
      const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formattedUrl,
          limit: 100,
          includeSubdomains: false,
        }),
      });

      let mapData: any = {};
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
      
      // Combine mapped links with fallbacks (fallbacks first for priority)
      const combinedLinks = [...new Set([...fallbackUrls, ...allLinks])];
      console.log(`Total combined links: ${combinedLinks.length}`);

      // Filter for high-value pages
      const priorityPatterns = [
        /\/pricing\b/i,
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
        /\/support\b/i,
        /\/changelog\b/i,
        /\/updates\b/i,
        /\/release-notes\b/i,
        /\/status\b/i,
        /\/terms\b/i,
        /\/legal\b/i,
        /\/privacy\b/i,
        // Billing/usage-related keyword patterns
        /billing/i,
        /usage/i,
        /limits/i,
        /credits/i,
        /overage/i,
        /caps?\b/i,
        /alerts?\b/i,
        /calculator/i,
        /fair.?use/i,
        /rate.?limit/i,
      ];

      // Exclusion patterns - removed terms/legal/changelog from exclusion since they're now priority
      const exclusionPatterns = [
        /\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/i,
        /\/(blog|news|press|careers|jobs|cookie)\//i,
        /\/(blog|news|press|careers|jobs|cookie)$/i,
      ];

      const priorityLinks = combinedLinks
        .filter((link: string) => {
          if (exclusionPatterns.some(pattern => pattern.test(link))) return false;
          if (link === formattedUrl || link === formattedUrl + '/') return false;
          return priorityPatterns.some(pattern => pattern.test(link));
        })
        .slice(0, safeMaxPages - 1);

      console.log(`Selected ${priorityLinks.length} priority pages to scrape`);
      console.log('Priority links:', priorityLinks);

      // Scrape each priority page (in parallel for speed)
      const scrapePromises = priorityLinks.map(async (pageUrl: string) => {
        try {
          console.log('Scraping:', pageUrl);
          const pageResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: pageUrl,
              formats: ['markdown'],
              onlyMainContent: true,
            }),
          });

          let pageData: any;
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
