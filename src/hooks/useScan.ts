import { useState, useCallback } from 'react';
import { scraperApi, type ScrapedPage, type AnalysisResult } from '@/lib/api/scraper';
import type { CompanyProfile, RubricScore, ObservabilityData, ChatMessage } from '@/types/rubric';

export type ScanStatus = 'idle' | 'scraping' | 'analyzing' | 'complete' | 'error';

interface ScanState {
  status: ScanStatus;
  statusMessage: string;
  url: string | null;
  pages: ScrapedPage[];
  companyProfile: CompanyProfile | null;
  rubricScore: RubricScore | null;
  observability: ObservabilityData | null;
  error: string | null;
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
}

const initialState: ScanState = {
  status: 'idle',
  statusMessage: '',
  url: null,
  pages: [],
  companyProfile: null,
  rubricScore: null,
  observability: null,
  error: null,
  chatMessages: [],
  isChatLoading: false,
};

export function useScan() {
  const [state, setState] = useState<ScanState>(initialState);

  const updateState = useCallback((updates: Partial<ScanState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const startScan = useCallback(async (url: string): Promise<boolean> => {
    updateState({
      status: 'scraping',
      statusMessage: 'Scanning website and discovering pages...',
      url,
      pages: [],
      companyProfile: null,
      rubricScore: null,
      observability: null,
      error: null,
      chatMessages: [],
    });

    try {
      // Step 1: Scrape website
      console.log('Starting scrape for:', url);
      const scrapeResult = await scraperApi.scrapeWebsite(url);

      if (!scrapeResult.success || !scrapeResult.pages) {
        updateState({
          status: 'error',
          statusMessage: '',
          error: scrapeResult.error || 'Failed to scrape website',
        });
        return false;
      }

      console.log('Scrape complete:', scrapeResult.totalPages, 'pages');
      updateState({
        status: 'analyzing',
        statusMessage: `Found ${scrapeResult.totalPages} pages. Analyzing business context...`,
        pages: scrapeResult.pages,
      });

      // Step 2: Analyze company
      console.log('Starting analysis...');
      const analysisResult = await scraperApi.analyzeCompany(scrapeResult.pages, url);

      if (!analysisResult.success) {
        updateState({
          status: 'error',
          statusMessage: '',
          error: analysisResult.error || 'Failed to analyze company',
        });
        return false;
      }

      console.log('Analysis complete:', analysisResult.companyProfile?.companyName);
      updateState({
        status: 'complete',
        statusMessage: '',
        companyProfile: analysisResult.companyProfile || null,
        rubricScore: analysisResult.rubricScore || null,
        observability: analysisResult.observability || null,
      });

      return true;
    } catch (err) {
      console.error('Scan error:', err);
      updateState({
        status: 'error',
        statusMessage: '',
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
      return false;
    }
  }, [updateState]);

  const sendChatMessage = useCallback(async (content: string) => {
    if (!state.companyProfile || state.pages.length === 0) {
      console.warn('Cannot send chat message: missing context');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    const updatedMessages = [...state.chatMessages, userMessage];
    updateState({ chatMessages: updatedMessages, isChatLoading: true });

    try {
      const history = updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const result = await scraperApi.chat(content, history.slice(0, -1), {
        pages: state.pages,
        companyName: state.companyProfile.companyName,
        rubricScore: state.rubricScore ? {
          totalScore: state.rubricScore.totalScore,
          maxScore: state.rubricScore.maxScore,
          band: state.rubricScore.band,
        } : undefined,
      });

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: result.success ? result.response || 'No response generated.' : `Error: ${result.error}`,
        timestamp: new Date(),
      };

      updateState({
        chatMessages: [...updatedMessages, assistantMessage],
        isChatLoading: false,
      });
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date(),
      };

      updateState({
        chatMessages: [...updatedMessages, errorMessage],
        isChatLoading: false,
      });
    }
  }, [state.chatMessages, state.companyProfile, state.pages, state.rubricScore, updateState]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    startScan,
    sendChatMessage,
    reset,
  };
}
