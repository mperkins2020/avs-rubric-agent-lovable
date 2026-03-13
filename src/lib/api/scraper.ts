import { supabase } from '@/integrations/supabase/client';
import type { CompanyProfile, RubricScore, ObservabilityData } from '@/types/rubric';

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
}

export interface AnalysisResult {
  success: boolean;
  companyProfile?: CompanyProfile;
  rubricScore?: RubricScore;
  observability?: ObservabilityData;
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
        },
      });

      if (error) {
        console.error('Analysis error:', error);
        // Extract the meaningful error message from the response body (e.g. 429 rate limit)
        const msg = data?.error || error.message;
        return { success: false, error: msg };
      }

      if (data && !data.success && data.error) {
        return { success: false, error: data.error };
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

    // Step 2: Analyze
    const analysisResult = await this.analyzeCompany(scrapeResult.pages, url);
    
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
