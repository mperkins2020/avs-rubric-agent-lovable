import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { pollScrapeJob, type ScrapeJobRow } from "./scrape-job-correlation.ts";

// Deno EdgeRuntime type for background processing
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Constants ────────────────────────────────────────────────────────────────
const BATCH_SIZE = 2;           // companies processed in parallel per batch (reduced from 4 to limit concurrent Firecrawl /map calls)
const STAGGER_MS = 20000;       // delay between company starts within a batch (20s) to spread Firecrawl load
const POLL_INTERVAL_MS = 8000;  // how often to check for a new scan_results row
const POLL_TIMEOUT_MS = 300000; // 5 min max wait per company (some sites are slow)

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns 'YYYY-MM' for the current UTC month. */
function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Validate that the caller is either:
 *   - an internal/service caller presenting the literal service-role key as a Bearer token, OR
 *   - a signed-in human user whose JWT verifies and who has the `admin` role.
 *
 * Returns 'service_role' for the internal path, the userId for the human path,
 * or null on any auth failure.
 *
 * Security note: we deliberately do NOT decode JWT claims to detect the service
 * role. A base64-decoded `role: service_role` claim is trivially forgeable
 * without the signing secret. Instead we compare the bearer token byte-for-byte
 * against SUPABASE_SERVICE_ROLE_KEY, and route every other token through
 * Supabase's `getClaims()` which verifies the signature.
 */
async function validateAdminAuth(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');

  // Internal/service caller: direct string compare against the actual secret.
  // Same pattern used in scrape-website / analyze-company.
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (serviceKey.length > 0 && token === serviceKey) {
    return 'service_role';
  }

  // Human-admin path: verify the JWT signature via getClaims(), then check the admin role.
  const authSb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await authSb.auth.getClaims(token);
  if (error || !data?.claims) return null;

  const userId = data.claims.sub as string;
  const { data: adminCheck } = await supabaseAdmin
    .rpc('has_role', { _user_id: userId, _role: 'admin' });
  if (adminCheck !== true) return null;

  return userId;
}


// ── Poll until scan_results row appears after `afterTs` ──────────────────────
async function pollForScanResult(
  supabaseAdmin: ReturnType<typeof createClient>,
  hostname: string,
  afterTs: string,
): Promise<{ id: string } | null> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    const { data } = await supabaseAdmin
      .from('scan_results')
      .select('id, result_json')
      .eq('url_domain', hostname)
      .gte('created_at', afterTs)
      .not('result_json->>analysisVersion', 'in', '(pending,error)')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    const json = data?.result_json as Record<string, unknown> | undefined;
    if (json?.success === true) return { id: data!.id };
  }
  return null;
}

/**
 * Entry 090 (2026-08-24): scrape-website now runs its crawl in the
 * background (EdgeRuntime.waitUntil + scrape_jobs), mirroring the
 * pollForScanResult pattern above for analyze-company. Queries scrape_jobs
 * directly (service-role, same as pollForScanResult queries scan_results
 * directly) rather than re-invoking the scrape-website edge function.
 *
 * Correlation-bug fix (2026-08-25): originally looked up the job by
 * `requested_url` + `created_at >= afterTs`, where `afterTs` was captured
 * AFTER the 202 response. scrape-website inserts (or finds, on the dedup
 * path) the scrape_jobs row BEFORE returning 202, so that row's
 * `created_at` is always earlier than any timestamp captured after the
 * response — the `gte` filter excluded the real job on every poll
 * iteration until timeout. Now polls the exact job by primary key
 * (`scrape-website` returns `job_id` in its 202 body for both the new-job
 * and deduplicated-existing-job paths) — see scrape-job-correlation.ts for
 * the row-interpretation logic and why identity, not timing, is the only
 * correct fix here.
 */
async function pollForScrapeResult(
  supabaseAdmin: ReturnType<typeof createClient>,
  jobId: string,
): Promise<{ status: 'complete'; result: Record<string, unknown> } | { status: 'error'; error: string } | null> {
  const outcome = await pollScrapeJob(
    jobId,
    async (id) => {
      const { data } = await supabaseAdmin
        .from('scrape_jobs')
        .select('status, result_json, error_message')
        .eq('id', id)
        .maybeSingle();
      return data as ScrapeJobRow | null;
    },
    { pollIntervalMs: POLL_INTERVAL_MS, timeoutMs: POLL_TIMEOUT_MS },
  );
  return outcome.status === 'timeout' ? null : outcome;
}

// ── Process a single company ──────────────────────────────────────────────────
async function processCompany(
  supabaseAdmin: ReturnType<typeof createClient>,
  company: { domain: string; company_name: string; category: string },
  month: string,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<void> {
  const startedAt = new Date().toISOString();
  // benchmark_companies.domain may include a path (e.g. "github.com/features/copilot").
  // scan_results.url_domain stores only the hostname, so derive it for lookups.
  const hostname = company.domain.split('/')[0];
  console.log(`[run-benchmark] Starting: ${company.domain} (host=${hostname}, ${month})`);

  try {
    // ── Step 1: Scrape ────────────────────────────────────────────────────
    // Entry 086: this fetch had NO timeout of its own — every other step in
    // this pipeline is bounded (scrapePage()'s per-page AbortControllers,
    // mapDomain()'s retry backoff, this file's own POLL_TIMEOUT_MS for the
    // analyze step below), but a hang inside scrape-website itself had
    // nothing forcing it to resolve. Confirmed in production 2026-08-06:
    // hubspot.com's run_log row sat at "pending" for 1551s (25.8 min) — over
    // 5x POLL_TIMEOUT_MS — meaning the hang was happening HERE, before ever
    // reaching the analyze step's own timeout logic, and scrape-website's
    // Entry 084 retry additions are a plausible contributor for a company
    // already documented as having unusually low concurrency/timing
    // tolerance. Bounding this to the same POLL_TIMEOUT_MS this pipeline
    // already treats as "too long to wait" turns a silent, permanent hang
    // into a clean, fast, diagnosable failure — it does not by itself fix
    // whatever makes the underlying scrape slow.
    const scrapeController = new AbortController();
    const scrapeTimeout = setTimeout(() => scrapeController.abort(), POLL_TIMEOUT_MS);
    let scrapeRes: Response;
    try {
      scrapeRes = await fetch(`${supabaseUrl}/functions/v1/scrape-website`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          // Signal to scrape-website that this is an internal benchmark call
          'x-benchmark-runner': 'true',
        },
        body: JSON.stringify({
          url: `https://${company.domain}`,
          includeSubpages: true,
          maxPages: 20,
        }),
        signal: scrapeController.signal,
      });
    } catch (fetchErr) {
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        throw new Error(
          `Scrape call to scrape-website did not respond within ${POLL_TIMEOUT_MS / 1000}s — ` +
          `aborted here rather than left hanging (Entry 086)`
        );
      }
      throw fetchErr;
    } finally {
      clearTimeout(scrapeTimeout);
    }

    let scrapeData = await scrapeRes.json() as Record<string, unknown>;

    // Entry 090 (2026-08-24): scrape-website now runs its crawl in the
    // background regardless of how long it takes — the initial call
    // returns 202 'pending' immediately, and the actual result must be
    // polled for, the same way Step 2 below already polls analyze-company.
    // Previously this call waited synchronously for the full crawl body,
    // bounded only by this file's own POLL_TIMEOUT_MS AbortController —
    // which could not prevent Supabase's platform connection ceiling from
    // severing the connection mid-crawl and discarding completed work
    // (Entry 089).
    if (scrapeData.status === 'pending') {
      const jobId = scrapeData.job_id;
      if (typeof jobId !== 'string' || !jobId) {
        // scrape-website returned 202 without a job_id — either a stale,
        // un-fixed deployment, or a genuine response-contract break. Fail
        // loudly and diagnosably rather than falling back to any timestamp
        // or URL-based guess (the bug this replaced).
        throw new Error(
          `scrape-website returned 202 'pending' without a job_id for ${company.domain} — cannot correlate the background job`,
        );
      }
      console.log(`[run-benchmark] Scrape running in background for ${company.domain} (job ${jobId}), polling…`);
      const polled = await pollForScrapeResult(supabaseAdmin, jobId);
      if (!polled) {
        throw new Error(`Scrape did not complete within ${POLL_TIMEOUT_MS / 1000}s (Entry 090 background job)`);
      }
      if (polled.status === 'error') {
        throw new Error(`Scrape failed: ${polled.error}`);
      }
      scrapeData = polled.result;
    }

    if (!scrapeData.success || !Array.isArray(scrapeData.pages)) {
      throw new Error(
        `Scrape failed (${scrapeRes.status}): ${String(scrapeData.error ?? 'no pages returned')}`,
      );
    }
    console.log(`[run-benchmark] Scraped ${(scrapeData.pages as unknown[]).length} pages for ${company.domain}`);

    // Gate 0 Action 2B (2026-08-24): scrape-website computes two distinct
    // completeness/relevance signals in its `coverage` response field
    // (see coverage-signals.ts) — previously computed on every scan but
    // read by nothing downstream (confirmed by full-codebase grep). A scan
    // carrying either signal must no longer be indistinguishable from a
    // clean completed scan once this run finishes — see the review-flag
    // write in Step 4 below. `status` stays 'complete' (the scan DID
    // complete; no schema/CHECK-constraint change to benchmark_run_log's
    // status enum) — the existing `error_message` column carries the
    // distinction instead, reusing the exact field the standard QA query
    // (`SELECT domain, status, error_message ... FROM benchmark_run_log`)
    // already selects.
    const coverage = (scrapeData.coverage ?? {}) as {
      coverageWarning?: boolean;
      commercialSurfaceWarning?: boolean;
      discoveredUrlCount?: number;
      selectedCount?: number;
      resolvedCount?: number;
      productSearch?: string | null;
      productScopedPageCount?: number;
    };
    const reviewReasons: string[] = [];
    if (coverage.coverageWarning) {
      reviewReasons.push(
        `EVIDENCE_VOLUME: thin evidence (discovered=${coverage.discoveredUrlCount ?? '?'}, ` +
        `selected=${coverage.selectedCount ?? '?'}, resolved=${coverage.resolvedCount ?? '?'})`
      );
    }
    if (coverage.commercialSurfaceWarning) {
      reviewReasons.push(
        `COMMERCIAL_SURFACE: seeded product path "${coverage.productSearch ?? '?'}" yielded ` +
        `zero product-scoped pages (productScopedPageCount=${coverage.productScopedPageCount ?? 0}) — ` +
        `evidence may be generic root-domain content, not the configured product surface`
      );
    }
    if (reviewReasons.length > 0) {
      console.log(`[run-benchmark] Review flag(s) for ${company.domain}: ${reviewReasons.join(' | ')}`);
    }

    // ── Step 2: Analyze ───────────────────────────────────────────────────
    // Entry 087: same gap as Entry 086, one step later. This call is meant
    // to return fast (200 cache-hit or 202 fresh-scan-started) with the real
    // work happening in the background and pollForScanResult() below doing
    // the actual bounded waiting (it already has its own deadline/while loop
    // capped at POLL_TIMEOUT_MS — that part was never the problem). But if
    // THIS synchronous call itself never returns — confirmed live,
    // 2026-08-06: hubspot.com's run_log row was still "pending" at 832s+
    // after Entry 086 shipped and was deployed (confirmed deployed by
    // Lovable), meaning Step 1 (now bounded) had already resolved and this
    // was the next unbounded call in the chain — nothing stops it either.
    const analyzeController = new AbortController();
    const analyzeTimeout = setTimeout(() => analyzeController.abort(), POLL_TIMEOUT_MS);
    let analyzeRes: Response;
    try {
      analyzeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-company`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'x-benchmark-runner': 'true',
        },
        body: JSON.stringify({
          pages: scrapeData.pages,
          url: `https://${company.domain}`,
          unresolvedPageCount: scrapeData.unresolvedPageCount ?? 0,
          totalQueuedCount: scrapeData.totalQueuedCount ?? 0,
          confirmedMissUrls: scrapeData.confirmedMissUrls ?? [],
        }),
        signal: analyzeController.signal,
      });
    } catch (fetchErr) {
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        throw new Error(
          `Analyze call to analyze-company did not respond within ${POLL_TIMEOUT_MS / 1000}s — ` +
          `aborted here rather than left hanging (Entry 087)`
        );
      }
      throw fetchErr;
    } finally {
      clearTimeout(analyzeTimeout);
    }

    let scanResultId: string | null = null;

    if (analyzeRes.status === 200) {
      // Cache hit — the latest scan_results row for this hostname is the result
      const { data: latest } = await supabaseAdmin
        .from('scan_results')
        .select('id')
        .eq('url_domain', hostname)
        .not('result_json->>analysisVersion', 'in', '(pending,error)')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      scanResultId = latest?.id ?? null;
      console.log(`[run-benchmark] Cache hit for ${company.domain}, scan_result id: ${scanResultId}`);
    } else if (analyzeRes.status === 202) {
      // Fresh scan started in background — poll until the new row appears
      console.log(`[run-benchmark] Fresh scan started for ${company.domain}, polling…`);
      const polled = await pollForScanResult(supabaseAdmin, hostname, startedAt);
      if (!polled) throw new Error(`Analysis timed out after ${POLL_TIMEOUT_MS / 1000}s`);
      scanResultId = polled.id;
      console.log(`[run-benchmark] Analysis complete for ${company.domain}, scan_result id: ${scanResultId}`);
    } else {
      const errBody = await analyzeRes.text();
      throw new Error(`analyze-company returned ${analyzeRes.status}: ${errBody.slice(0, 200)}`);
    }

    // ── Step 3: Tag the scan_results row as a benchmark scan ─────────────
    if (scanResultId) {
      const { error: tagErr } = await supabaseAdmin
        .from('scan_results')
        .update({ is_benchmark: true, benchmark_month: month })
        .eq('id', scanResultId);
      if (tagErr) console.error(`[run-benchmark] Failed to tag scan result ${scanResultId}:`, tagErr);
    }

    // ── Step 4: Mark complete in benchmark_run_log ────────────────────────
    // Gate 0 Action 2B: status stays 'complete' (accurate — the scan did
    // complete). error_message carries the review flag when either
    // completeness signal fired above, so a row that technically completed
    // but should not be trusted without review is no longer indistinguishable
    // from a clean row via the standard QA query. null on the clean path,
    // same as before this change.
    await supabaseAdmin.from('benchmark_run_log').upsert({
      run_month: month,
      category: company.category,
      domain: company.domain,
      company_name: company.company_name,
      status: 'complete',
      scan_result_id: scanResultId,
      completed_at: new Date().toISOString(),
      error_message: reviewReasons.length > 0 ? `REVIEW REQUIRED: ${reviewReasons.join(' | ')}` : null,
    }, { onConflict: 'run_month,domain' });

    console.log(`[run-benchmark] Done: ${company.domain}${reviewReasons.length > 0 ? ' (flagged for review)' : ''}`);
  } catch (err) {
    console.error(`[run-benchmark] Error processing ${company.domain}:`, err);
    await supabaseAdmin.from('benchmark_run_log').upsert({
      run_month: month,
      category: company.category,
      domain: company.domain,
      company_name: company.company_name,
      status: 'error',
      error_message: String(err).slice(0, 500),
      completed_at: new Date().toISOString(),
    }, { onConflict: 'run_month,domain' });
  }
}

// ── Request handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── Auth: admin only ───────────────────────────────────────────────────
  const callerId = await validateAdminAuth(req, supabaseAdmin);
  if (!callerId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Admin access required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Parse body ─────────────────────────────────────────────────────────
  let body: { category?: string; month?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { category, month = currentMonth() } = body;
  if (!category) {
    return new Response(
      JSON.stringify({ success: false, error: '`category` is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Load active companies for this category + edition ───────────────────
  // benchmark_companies.benchmark_month scopes roster membership per
  // edition (2026-08-25 migration) — the same domain can now have a
  // separate row in more than one edition of the same category (e.g.
  // lovable.dev in both 2026-05 and 2026-09 AI Coding Assistant), so this
  // query must resolve rows by category + month together, not category
  // alone, or a run for one edition would pull in another edition's roster
  // too.
  const { data: companies, error: companiesErr } = await supabaseAdmin
    .from('benchmark_companies')
    .select('domain, company_name, category, sort_order')
    .eq('category', category)
    .eq('benchmark_month', month)
    .eq('active', true)
    .order('sort_order');

  if (companiesErr || !companies) {
    return new Response(
      JSON.stringify({ success: false, error: `Failed to load companies: ${String(companiesErr)}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (companies.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: `No active companies found for category: ${category}` }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Idempotency: skip companies already complete or errored for this month ───────
  const { data: existingLogs } = await supabaseAdmin
    .from('benchmark_run_log')
    .select('domain, status')
    .eq('run_month', month)
    .in('domain', companies.map(c => c.domain));

  const skipStatuses = new Set(['complete', 'error']);
  const skippedDomains = new Set(
    (existingLogs ?? []).filter(l => skipStatuses.has(l.status)).map(l => l.domain),
  );
  const toProcess = companies.filter(c => !skippedDomains.has(c.domain));

  // Seed benchmark_run_log with 'pending' for each company to be processed
  for (const company of toProcess) {
    await supabaseAdmin.from('benchmark_run_log').upsert({
      run_month: month,
      category,
      domain: company.domain,
      company_name: company.company_name,
      status: 'pending',
      started_at: new Date().toISOString(),
    }, { onConflict: 'run_month,domain' });
  }

  console.log(
    `[run-benchmark] Starting ${category} ${month}: ${toProcess.length} to process, ` +
    `${skippedDomains.size} skipped`,
  );

  // ── Background batch processing ────────────────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  EdgeRuntime.waitUntil((async () => {
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE);
      console.log(
        `[run-benchmark] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ` +
        batch.map(c => c.domain).join(', '),
      );
      // Stagger companies within each batch to spread concurrent Firecrawl /map calls.
      // Each company starts STAGGER_MS after the previous one, but they all run in parallel.
      await Promise.all(
        batch.map((company, idx) =>
          new Promise<void>(resolve => setTimeout(resolve, idx * STAGGER_MS))
            .then(() => processCompany(supabaseAdmin, company, month, supabaseUrl, serviceRoleKey)),
        ),
      );
    }
    console.log(`[run-benchmark] All done: ${category} ${month}`);
  })());

  // ── Return 202 immediately ─────────────────────────────────────────────
  return new Response(
    JSON.stringify({
      success: true,
      status: 'started',
      category,
      month,
      total: companies.length,
      queued: toProcess.length,
      skipped: skippedDomains.size,
    }),
    { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
