import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scraperApi } from './scraper';

// Mock the entire Supabase client module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Helper to get the mocked invoke function
async function getInvokeMock() {
  const { supabase } = await import('@/integrations/supabase/client');
  return supabase.functions.invoke as ReturnType<typeof vi.fn>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('scraperApi.scrapeWebsite()', () => {
  it('returns success result when invoke succeeds', async () => {
    const invokeMock = await getInvokeMock();
    invokeMock.mockResolvedValueOnce({
      data: { success: true, pages: [{ url: 'https://example.com', title: 'Home', markdown: '# Hello' }], totalPages: 1 },
      error: null,
    });

    const result = await scraperApi.scrapeWebsite('https://example.com');
    expect(result.success).toBe(true);
    expect(result.pages).toHaveLength(1);
  });

  it('returns user-friendly error on FunctionsFetchError', async () => {
    const invokeMock = await getInvokeMock();
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'FunctionsFetchError: Failed to fetch' },
    });

    const result = await scraperApi.scrapeWebsite('https://example.com');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/timed out/i);
  });

  it('returns error message on non-2xx response', async () => {
    const invokeMock = await getInvokeMock();
    invokeMock.mockResolvedValueOnce({
      data: { error: 'This site blocks scrapers' },
      error: { message: 'non-2xx status code' },
    });

    const result = await scraperApi.scrapeWebsite('https://example.com');
    expect(result.success).toBe(false);
    expect(result.error).toBe('This site blocks scrapers');
  });

  it('returns error on unexpected exception', async () => {
    const invokeMock = await getInvokeMock();
    invokeMock.mockRejectedValueOnce(new Error('Network down'));

    const result = await scraperApi.scrapeWebsite('https://example.com');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network down');
  });
});

describe('scraperApi.analyzeCompany()', () => {
  it('returns success result when invoke succeeds', async () => {
    const invokeMock = await getInvokeMock();
    invokeMock.mockResolvedValueOnce({
      data: { success: true, companyProfile: { companyName: 'Acme' }, rubricScore: {}, observability: {} },
      error: null,
    });

    const result = await scraperApi.analyzeCompany([], 'https://example.com');
    expect(result.success).toBe(true);
  });

  it('surfaces rate-limit error from response body', async () => {
    const invokeMock = await getInvokeMock();
    invokeMock.mockResolvedValueOnce({
      data: { error: 'You have reached your weekly scan limit (3/3).' },
      error: { message: 'non-2xx status code' },
    });

    const result = await scraperApi.analyzeCompany([], 'https://example.com');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/weekly scan limit/i);
  });

  it('returns { success: false } when data reports failure', async () => {
    const invokeMock = await getInvokeMock();
    invokeMock.mockResolvedValueOnce({
      data: { success: false, error: 'Analysis failed' },
      error: null,
    });

    const result = await scraperApi.analyzeCompany([], 'https://example.com');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Analysis failed');
  });
});

describe('scraperApi.chat()', () => {
  it('returns response string on success', async () => {
    const invokeMock = await getInvokeMock();
    invokeMock.mockResolvedValueOnce({
      data: { success: true, response: 'Here is the analysis.' },
      error: null,
    });

    const result = await scraperApi.chat('What is the score?', [], {
      pages: [],
      companyName: 'Acme',
    });
    expect(result.success).toBe(true);
    expect(result.response).toBe('Here is the analysis.');
  });

  it('returns { success: false } on invoke error', async () => {
    const invokeMock = await getInvokeMock();
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'Service unavailable' },
    });

    const result = await scraperApi.chat('What is the score?', [], {
      pages: [],
      companyName: 'Acme',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Service unavailable');
  });
});

describe('scraperApi.fullScan()', () => {
  it('returns error if scraping fails', async () => {
    const invokeMock = await getInvokeMock();
    invokeMock.mockResolvedValueOnce({
      data: { success: false, error: 'Site unreachable' },
      error: null,
    });

    const result = await scraperApi.fullScan('https://example.com');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Site unreachable');
  });
});
