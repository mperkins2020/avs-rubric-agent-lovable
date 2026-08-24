import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  // Entry 090 (2026-08-24): scrape-website now runs in the background
  // (EdgeRuntime.waitUntil + scrape_jobs) — a long-running crawl survives
  // this call's own request lifetime instead of being lost when the
  // synchronous response window closes (Entry 089). These tests cover the
  // resulting 202-pending + poll contract.
  describe('background/poll behavior (Entry 090)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('polls and returns the result once the background job completes (long-running scrape survives the request-lifetime boundary)', async () => {
      const invokeMock = await getInvokeMock();
      // Initial trigger: 202 pending
      invokeMock.mockResolvedValueOnce({ data: { status: 'pending', url: 'https://example.com' }, error: null });
      // First poll: still pending
      invokeMock.mockResolvedValueOnce({ data: { status: 'pending' }, error: null });
      // Second poll: complete
      invokeMock.mockResolvedValueOnce({
        data: { success: true, pages: [{ url: 'https://example.com', title: 'Home', markdown: '# Hello' }], totalPages: 1 },
        error: null,
      });

      const resultPromise = scraperApi.scrapeWebsite('https://example.com');
      // Let the initial invoke() promise resolve before advancing poll timers.
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(4000); // first poll (still pending)
      await vi.advanceTimersByTimeAsync(4000); // second poll (complete)
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.pages).toHaveLength(1);
      // Exactly 3 invoke calls: 1 trigger + 2 polls — no duplicate job was
      // started by polling itself.
      expect(invokeMock).toHaveBeenCalledTimes(3);
    });

    it('returns an explicit error when the background job reports status: error (failure stays distinguishable from success)', async () => {
      const invokeMock = await getInvokeMock();
      invokeMock.mockResolvedValueOnce({ data: { status: 'pending' }, error: null });
      invokeMock.mockResolvedValueOnce({ data: { status: 'error', error: 'Failed to scrape the main page.' }, error: null });

      const resultPromise = scraperApi.scrapeWebsite('https://example.com');
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(4000);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to scrape the main page.');
    });

    it('returns an explicit error when the job row is not found (expired before completion)', async () => {
      const invokeMock = await getInvokeMock();
      invokeMock.mockResolvedValueOnce({ data: { status: 'pending' }, error: null });
      invokeMock.mockResolvedValueOnce({ data: { status: 'not_found' }, error: null });

      const resultPromise = scraperApi.scrapeWebsite('https://example.com');
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(4000);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/did not complete/i);
    });

    it('does not start a duplicate scrape by polling — a poll that stays pending keeps polling the SAME job rather than re-triggering', async () => {
      const invokeMock = await getInvokeMock();
      invokeMock.mockResolvedValueOnce({ data: { status: 'pending' }, error: null });
      invokeMock.mockResolvedValueOnce({ data: { status: 'pending' }, error: null });
      invokeMock.mockResolvedValueOnce({ data: { status: 'pending' }, error: null });
      invokeMock.mockResolvedValueOnce({ data: { success: true, pages: [], totalPages: 0 }, error: null });

      const resultPromise = scraperApi.scrapeWebsite('https://example.com');
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(4000);
      await vi.advanceTimersByTimeAsync(4000);
      await vi.advanceTimersByTimeAsync(4000);
      const result = await resultPromise;

      expect(result.success).toBe(true);
      // Every poll call after the initial trigger passed pollOnly: true —
      // confirms polling never re-invokes a fresh crawl.
      const pollCalls = invokeMock.mock.calls.slice(1);
      expect(pollCalls.every(([, opts]) => opts?.body?.pollOnly === true)).toBe(true);
    });
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

/*
 * CHANGE LOG — updated for Fix 1/2/3 evidence pipeline fixes:
 *
 * ScrapeResult interface (scraper.ts):
 *   - Added optional fields: unresolvedPageCount, totalQueuedCount, confirmedMissUrls
 *     (Fix 2: Pre-Scoring Validation Layer metadata passed from scrape-website to
 *     analyze-company so the confidence −0.15 penalty can be applied there)
 *   - All new fields are optional, so existing test mocks that return
 *     { success: true, pages: [...], totalPages: 1 } remain valid without modification.
 *
 * analyzeCompany() options (scraper.ts):
 *   - Added optional options fields: unresolvedPageCount, totalQueuedCount, confirmedMissUrls
 *   - No positional parameter changes; existing call sites with no options object
 *     continue to work unchanged.
 *
 * fullScan() (scraper.ts):
 *   - Now forwards unresolvedPageCount/totalQueuedCount/confirmedMissUrls from
 *     scrapeResult into analyzeCompany options.
 *   - Existing test for fullScan (scraping failure) unaffected because the mock
 *     returns { success: false } before analyzeCompany is ever called.
 *
 * No existing assertions were changed or removed.
 */
