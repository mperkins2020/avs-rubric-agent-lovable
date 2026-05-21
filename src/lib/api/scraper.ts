import { supabase } from '@/integrations/supabase/client';
import type { CompanyProfile, RubricScore, ObservabilityData, ModelClassification } from '@/types/rubric';

export interface ScrapedPage {
  url: string;
  title: string;
  markdown: string;
  metadata?: {
    description?: string;
    keywords?: string;
  };
}

export interface ScrapeResult {
  success: boolean;
  url?: string;
  pages?: ScrapedPage[];
  totalPages?: number;
  error?: string;
  // Fix 2: Pre-Scoring Validation Layer metadata from scrape-website
  unresolvedPageCount?: number;
  totalQueuedCount?: number;
  confirmedMissUrls?: string[];
}

export interface AnalysisResult {
  success: boolean;
  companyProfile?: CompanyProfile;
  rubricScore?: RubricScore;
  observability?: ObservabilityData;
  modelClassification?: ModelClassification;
  error?: string;
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  error?: string;
}

export const scraperApi = {
  /**
   * Scrape a website and its key subpages
   */
  async scrapeWebsite(url: string, options?: { maxPages?: number }): Promise<ScrapeResult> {
    try {
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      const { data, error } = await supabase.functions.invoke('scrape-website', {
        body: { 
          url, 
          includeSubpages: true,
          maxPages: options?.maxPages || 15,
        },
      });

      clearTimeout(timeoutId);

      if (error) {
        console.error('Scrape error:', error);
        if (error.message?.includes('FunctionsFetchError') || error.message?.includes('Failed to fetch')) {
          return { 
            success: false, 
            error: 'Request timed out. The website may be too large or slow to respond. Please try again or try a different URL.' 
          };
        }
        if (error.message?.includes('non-2xx')) {
          // Try to extract message from data if available
          const msg = data?.error || 'The website could not be scraped. It may be blocking automated access. Please try a different URL.';
          return { success: false, error: msg };
        }
        return { success: false, error: error.message };
      }

      return data as ScrapeResult;
    } catch (err) {
      console.error('Scrape exception:', err);
      // Handle abort/timeout errors
      if (err instanceof Error && err.name === 'AbortError') {
        return { 
          success: false, 
          error: 'Request timed out. The website may be too large or slow to respond. Please try again.' 
        };
      }
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to scrape website' 
      };
    }
  },

  /**
   * Analyze scraped pages to extract company profile and rubric score
   */
  async analyzeCompany(
    pages: ScrapedPage[],
    url: string,
    options?: {
      insiderAnswers?: Record<string, string>;
      previousScores?: Array<{ dimension: string; score: number; confidence: number }>;
      existingProfile?: Record<string, unknown>;
      // Fix 2: unresolved metadata forwarded from scrape result
      unresolvedPageCount?: number;
      totalQueuedCount?: number;
      confirmedMissUrls?: string[];
    }
  ): Promise<AnalysisResult> {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-company', {
        body: {
          pages,
          url,
          insiderAnswers: options?.insiderAnswers,
          previousScores: options?.previousScores,
          existingProfile: options?.existingProfile,
          unresolvedPageCount: options?.unresolvedPageCount,
          totalQueuedCount: options?.totalQueuedCount,
          confirmedMissUrls: options?.confirmedMissUrls,
        },
      });

      if (error) {
        console.error('Analysis error:', error);
        const msg = data?.error || error.message;
        return { success: false, error: msg };
      }

      // Background processing: edge function returned 202 — poll until complete
      if (data && data.status === 'pending') {
        return await this._pollAnalysis(url);
      }

      if (data && !data.success && data.error) {
        return { success: false, error: data.error };
      }

      // Defensive: some cached payloads (written by older client versions)
      // are missing the explicit `success: true` flag. If the response carries
      // a companyProfile + rubricScore, treat it as a successful analysis so
      // we don't show "Failed to analyze company" for a valid cache HIT.
      if (data && data.success !== true && data.companyProfile && data.rubricScore) {
        return { ...(data as object), success: true } as AnalysisResult;
      }

      return data as AnalysisResult;
    } catch (err) {
      console.error('Analysis exception:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to analyze company'
      };
    }
  },

  /**
   * Poll for a background analysis result. Called after receiving a 202 from analyzeCompany.
   * Polls every 4 seconds up to 2 minutes total.
   */
  async _pollAnalysis(url: string): Promise<AnalysisResult> {
    const POLL_INTERVAL_MS = 4000;
    const POLL_TIMEOUT_MS = 120000; // 2 minutes
    const startTime = Date.now();

    console.log(`Background analysis started for ${url} — polling for result`);

    while (Date.now() - startTime < POLL_TIMEOUT_MS) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

      try {
        const { data, error } = await supabase.functions.invoke('analyze-company', {
          body: { url, pollOnly: true },
        });

        if (error) {
          console.warn('Poll error (will retry):', error);
          continue;
        }

        if (data?.status === 'pending') {
          console.log(`Analysis still in progress for ${url}...`);
          continue;
        }

        if (data?.status === 'error') {
          return { success: false, error: 'Analysis failed in background — please try again' };
        }

        if (data?.status === 'not_found') {
          // Pending marker expired before result was written — analysis failed silently
          return { success: false, error: 'Analysis did not complete — please try again' };
        }

        if (data?.success === true) {
          console.log(`Analysis complete for ${url} after ${Math.round((Date.now() - startTime) / 1000)}s`);
          return data as AnalysisResult;
        }
      } catch (pollErr) {
        console.warn('Poll exception (will retry):', pollErr);
      }
    }

    return { success: false, error: 'Analysis timed out after 2 minutes — please try again' };
  },

  /**
   * Full scan: scrape and analyze in one call
   */
  async fullScan(url: string): Promise<AnalysisResult & { pages?: ScrapedPage[] }> {
    // Step 1: Scrape
    const scrapeResult = await this.scrapeWebsite(url);
    
    if (!scrapeResult.success || !scrapeResult.pages) {
      return { 
        success: false, 
        error: scrapeResult.error || 'Failed to scrape website' 
      };
    }

    // Step 2: Analyze — forward Fix 2 unresolved metadata
    const analysisResult = await this.analyzeCompany(scrapeResult.pages, url, {
      unresolvedPageCount: scrapeResult.unresolvedPageCount,
      totalQueuedCount: scrapeResult.totalQueuedCount,
      confirmedMissUrls: scrapeResult.confirmedMissUrls,
    });
    
    if (!analysisResult.success) {
      return analysisResult;
    }

    return {
      ...analysisResult,
      pages: scrapeResult.pages,
    };
  },

  /**
   * Chat with the scraped content
   */
  async chat(
    message: string, 
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
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
        strengths?: Array<{
          dimension: string;
          whyItIsStrong: string;
        }>;
        weaknesses?: Array<{
          dimension: string;
          whatIsMissingOrUnclear: string;
          whyItMatters: string;
        }>;
      };
    }
  ): Promise<ChatResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-docs', {
        body: { message, history, context },
      });

      if (error) {
        console.error('Chat error:', error);
        return { success: false, error: error.message };
      }

      return data as ChatResponse;
    } catch (err) {
      console.error('Chat exception:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to chat' 
      };
    }
  },
};
