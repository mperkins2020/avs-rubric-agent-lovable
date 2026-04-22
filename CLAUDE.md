## Protected Files — Claude Code Territory

The following files are maintained exclusively by Claude Code. Lovable must NEVER edit them:

- `supabase/functions/analyze-company/index.ts` — scoring engine
- `supabase/functions/scrape-website/index.ts` — scraper
- `src/lib/api/scraper.ts` — client API layer
- `tasks/` — calibration docs and todos

If a Lovable push has overwritten any of these, restore from the last Claude Code commit.

---

## QA Debug Logs

Two files track scoring QA:

- `ENGINE_DEBUG_LOG.md` — Go-forward log. When I say "log this", append a new entry using the template. Auto-increment the entry number, use today's date.
- `ENGINE_DEBUG_HISTORY.md` — Backfilled from git. Read-only reference.

When I say "scan the debug log for patterns", parse all entries in ENGINE_DEBUG_LOG.md and report:
1. Most common root causes (by count)
2. Dimensions with the most entries
3. Any pattern tags that appear 3+ times
4. Recommendations for spec or guardrail changes based on clusters

---

## Lovable Deployment Prompts

Use these exact prompts when deploying edge functions. Do not ask Lovable to make code changes — protected files are Claude Code territory.

**Deploy both functions:**
> Deploy both Supabase edge functions to production — `scrape-website` and `analyze-company`. No code changes — deployment only. Pull the latest from the main branch before deploying.

**Deploy scrape-website only:**
> Deploy `scrape-website` edge function only. No code changes — deployment only. Pull the latest from main branch before deploying.

**Deploy analyze-company only:**
> Deploy `analyze-company` edge function only. No code changes — deployment only. Pull the latest from the main branch before deploying.

Note: Lovable may report "pre-existing build errors in protected files" — this is expected. Linter warnings in protected files are pre-existing and do not prevent deployment. Proceed with the scan after deployment.

---

## community_evidence Table

**Purpose:** Escape hatch for high-value pages that automated discovery (Firecrawl sitemap + subdomain probing) cannot find. These pages are always included in the evidence set regardless of what the scraper discovers.

**When to use:** When a scan is missing a page that:
- Exists and is publicly accessible
- Is not surfaced by Firecrawl's domain map
- Is linked from JavaScript elements (tooltips, modals, hover states) not captured in markdown
- Is critical evidence for one or more scoring dimensions

**How to add an entry:** Via Lovable's database UI (Table Editor) or Supabase SQL editor:
```sql
INSERT INTO community_evidence (url_domain, evidence_url)
VALUES ('company.com', 'https://help.company.com/en/articles/...');
```

**Current entries (known):**
- `gamma.app` → `https://help.gamma.app/en/articles/7834324-how-do-credits-work-in-gamma` (credits article — not in Firecrawl map, JS-linked from pricing page)

**Important:** community_evidence is per-domain. Entries only fire for scans of that exact domain. No other companies are affected.

---

## ANALYSIS_VERSION

Bump `ANALYSIS_VERSION` in `supabase/functions/analyze-company/index.ts` every time either edge function is meaningfully changed. Format: `'YYYY-MM-DD-pipeline-vN'`. Without a bump, the 7-day cache serves stale results.

Current version as of last session: `2026-04-18-pipeline-v16`

---

## Pending Content Work

**Build-in-public post — "The Verification Loop"**
- Status: Final draft complete (April 18, 2026)
- Based on Gamma QA arc (Entries 034–045), 8/16 → 12/16 result
- Ready to publish — add CTA pointing to the "how to read" guide once that is live

**"How to Read Your AVS Rubric Trust Score" guide**
- Status: Outline complete, Gamma before/after sections to be written
- Target: next week after verification loop post is live
- Uses Gamma as primary case study (confirmed 12/16 final score)
- Hold Gamma sections until Gamma team is notified (see outline in session history)
- Format: explainer/reference guide, not BIP narrative
- Audience: founders and buyers receiving or viewing an AVS Rubric report
