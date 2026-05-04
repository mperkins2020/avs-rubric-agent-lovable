# Benchmark Dashboard — Design Decisions & Deferred Work
**Recorded: May 2026**

---

## Locked Decisions

### Band / Tier Labels
Replace Nascent / Emerging / Established / Advanced with:

| Label | Score range |
|---|---|
| **Developing** | 0–25% |
| **Credible** | 26–50% |
| **Trusted** | 51–75% |
| **Exemplary** | 76–100% |

**Engine change required**: `analyze-company/index.ts` band computation + `src/types/rubric.ts` type. Must bump ANALYSIS_VERSION — invalidates all cached scans.

---

### Trust Index (planned for v2)
`Trust Index = (total_score / max_score) × avg_dimension_confidence × 100`

Provides continuous differentiation beyond the discrete 0–16 score. Two companies at 10/16 with avg confidence 0.70 vs 0.90 score 43.8 vs 56.3 — meaningfully different.

**v1**: rank leaderboard by raw `total_score_pct`.
**v2**: introduce Trust Index after validating against real May data. No rubric changes needed — computed from existing `confidence` fields.

---

### "Evidence Coverage" replaces "Observability Level" everywhere
- DB field name (`observability`) stays unchanged — migration too disruptive
- All UI display labels: **"Evidence Coverage"** with levels Strong / Partial / Sparse
- Applies to: individual company report (existing Lovable UI) + new benchmark dashboard
- "Observability" is reserved as a future feature name for the real-time monitoring tier
- **Action**: prompt Lovable to rename label in both surfaces

---

### Category stats — all companies, not just top 8
Zone 3 (Category Pulse) and all category-level aggregates must be computed from ALL scanned companies in the category, not the display-limited top 8. Requires RPC v3.

---

### Company detail panel — all companies accessible
Leaderboard displays top 8. "Show all N companies →" expands to a condensed table of remaining companies. Any company is clickable into the detail panel. RPC must support returning all companies.

---

### Run frequency
Monthly. Single run per company per month. Engine calibration already reduces LLM variance sufficiently.

---

### Quarterly company list refresh
**Cadence**: end of each calendar quarter — end of June, September, December, March.
Refresh timing ensures the updated company list is in place before the next quarter's first benchmark run.

| Refresh by | Ready for |
|---|---|
| End of June | Q3 — July run |
| End of September | Q4 — October run |
| End of December | Q1 next year — January run |
| End of March | Q2 — April run |

**First refresh: end of June 2026** (also evaluate Phase 2 category activation).
**Rule**: never DELETE — set `active = false` to preserve historical data.
**Owner**: Claude Code (not Lovable).

---

### Paid tier subscription model (foundation only)
- Model: base category subscription + add-on categories
- URL structure: `/benchmark/[category-slug]` — implement now in dashboard routing
- `user_category_subscriptions` table to create when paid tier launches (schema below)
- Current `get_benchmark_data` RPC stays public; auth wrapper added on top later
- UI: locked tabs for unsubscribed categories (lock icon + "Add category" CTA)

```sql
-- Create when paid tier is ready — do not create now
CREATE TABLE user_category_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  category   text NOT NULL,
  is_base    boolean NOT NULL DEFAULT false,
  status     text NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

### Editorial insight generation
- **v1**: Deterministic template — "[Weakest dimension] is the [category] gap this month — avg [X]% across [N] companies scanned."
- **v2**: LLM-generated, stored with `status: draft` in `editorial_insights` table. Human reviews and approves before publishing. v1 is fallback until approved.

---

### Real-time monitoring (future — foundation only)
- Reserve "Observability" as feature name for this tier (not used in v1 UI)
- Add `monitoring_enabled boolean DEFAULT false` to `benchmark_companies` when ready
- Company detail panel reserves a "Monitoring" section (hidden until feature launches)

---

## Deferred Work

### Before dashboard launch
- [ ] Prompt Lovable: rename "Observability Level" → "Evidence Coverage" in individual company report
- [ ] Write `tasks/benchmark-rpc-v3.sql`: add `category_stats` aggregates (all companies), extend companies array past top 8
- [ ] Update band labels in engine (`analyze-company/index.ts` + `src/types/rubric.ts`), bump ANALYSIS_VERSION

### When paid tier is ready
- [ ] Create `user_category_subscriptions` table
- [ ] Add auth-gated routing to `/benchmark/[category-slug]`
- [ ] Build locked-tab UI for unsubscribed categories

### When LLM editorial insights are ready
- [ ] Create `editorial_insights` table
- [ ] Build admin review/approve panel in Lovable

### When real-time monitoring is ready
- [ ] Add `monitoring_enabled` to `benchmark_companies`
- [ ] Create `benchmark_company_changes` changelog table
- [ ] Implement Trust Index as primary sort metric

### End of June 2026 (first calendar quarter refresh)
- [ ] First quarterly company list refresh for all 5 Phase 1 categories
- [ ] Evaluate Phase 2 categories for activation (AI Legal, AI Dev Infrastructure, AI Speech Platform, AI Healthcare, AI Video & Podcast)
