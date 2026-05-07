import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
 * Decode the middle segment of a JWT without verification.
 * Used to detect the service_role key from inter-function callers.
 */
function getJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const b64 = token.split('.')[1];
    if (!b64) return null;
    return JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

/**
 * Validate that the caller is a logged-in Supabase admin user.
 * Returns the userId on success, null on any auth failure.
 */
async function validateAdminAuth(
  req: Request,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');

  // Service role key → unconditionally admin (inter-function call from cron or scripts)
  const claims = getJwtClaims(token);
  if (claims?.role === 'service_role') return 'service_role';

  // User JWT path: validate and check admin role
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
    const scrapeRes = await fetch(`${supabaseUrl}/functions/v1/scrape-website`, {
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
    });

    const scrapeData = await scrapeRes.json() as Record<string, unknown>;
    if (!scrapeData.success || !Array.isArray(scrapeData.pages)) {
      throw new Error(
        `Scrape failed (${scrapeRes.status}): ${String(scrapeData.error ?? 'no pages returned')}`,
      );
    }
    console.log(`[run-benchmark] Scraped ${(scrapeData.pages as unknown[]).length} pages for ${company.domain}`);

    // ── Step 2: Analyze ───────────────────────────────────────────────────
    const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-company`, {
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
    });

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
    await supabaseAdmin.from('benchmark_run_log').upsert({
      run_month: month,
      category: company.category,
      domain: company.domain,
      company_name: company.company_name,
      status: 'complete',
      scan_result_id: scanResultId,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'run_month,domain' });

    console.log(`[run-benchmark] Done: ${company.domain}`);
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

  // ── Load active companies for this category ────────────────────────────
  const { data: companies, error: companiesErr } = await supabaseAdmin
    .from('benchmark_companies')
    .select('domain, company_name, category, sort_order')
    .eq('category', category)
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
    `${completedDomains.size} already complete`,
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
      skipped: completedDomains.size,
    }),
    { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
