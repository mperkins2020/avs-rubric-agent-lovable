import "https://deno.land/x/xhr@0.1.0/mod.ts";

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, includeSubpages = true, maxPages = 10 }: ScrapeRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
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

    const mainPageData = await mainPageResponse.json();

    if (!mainPageResponse.ok || !mainPageData.success) {
      console.error('Failed to scrape main page:', mainPageData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: mainPageData.error || 'Failed to scrape the main page' 
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

    // Step 2: If subpages are requested, use map to find relevant pages
    if (includeSubpages && maxPages > 1) {
      console.log('Mapping website for subpages...');
      
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

      const mapData = await mapResponse.json();

      if (mapResponse.ok && mapData.success && mapData.links) {
        console.log(`Found ${mapData.links.length} links`);

        // Filter for high-value pages (pricing, about, features, etc.)
        const priorityPatterns = [
          /pricing/i,
          /about/i,
          /feature/i,
          /product/i,
          /solution/i,
          /security/i,
          /trust/i,
          /compliance/i,
          /enterprise/i,
          /platform/i,
          /integrat/i,
          /how-it-works/i,
          /use-case/i,
          /customer/i,
          /case-stud/i,
          /resource/i,
          /docs/i,
          /api/i,
        ];

        const priorityLinks = mapData.links
          .filter((link: string) => {
            // Exclude common non-content pages
            if (/\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js)$/i.test(link)) return false;
            if (/\/(blog|news|press|careers|jobs|legal|terms|privacy|cookie)/i.test(link)) return false;
            if (link === formattedUrl) return false;
            return priorityPatterns.some(pattern => pattern.test(link));
          })
          .slice(0, maxPages - 1);

        console.log(`Selected ${priorityLinks.length} priority pages to scrape`);

        // Scrape each priority page
        for (const pageUrl of priorityLinks) {
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

            const pageData = await pageResponse.json();

            if (pageResponse.ok && pageData.success && pageData.data) {
              pages.push({
                url: pageUrl,
                title: pageData.data.metadata?.title || pageUrl,
                markdown: pageData.data.markdown || '',
                metadata: {
                  description: pageData.data.metadata?.description,
                },
              });
              console.log('Successfully scraped:', pageUrl);
            }
          } catch (pageError) {
            console.error(`Failed to scrape ${pageUrl}:`, pageError);
            // Continue with other pages
          }
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
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
