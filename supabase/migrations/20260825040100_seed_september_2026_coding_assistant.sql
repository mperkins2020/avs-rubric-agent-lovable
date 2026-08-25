-- September 2026 AI Coding Assistant roster — the frozen Gate 1 roster from
-- September_2026_Coding_Assistant_Category_Definition.md §7, materialized
-- only now that edition-scoped roster membership exists (prior migration,
-- 20260825040000). Requires that migration applied first — the (domain,
-- category, benchmark_month) unique constraint and benchmark_month NOT NULL
-- both depend on it.
--
-- Does not touch any existing row. May's 14 AI Coding Assistant rows
-- (benchmark_month = '2026-05', backfilled by the prior migration) are
-- untouched by this INSERT — a September row can share a May row's exact
-- domain (e.g. lovable.dev) without conflict, because uniqueness is now
-- (domain, category, benchmark_month) and the two rows differ on the last
-- column.
--
-- Windsurf and Qodo are deliberately absent — excluded from September per
-- Gate 1 (Roster evolution — product consolidation / category-buyer-decision
-- shift, respectively). Their May rows are untouched and remain visible
-- under the May edition.
--
-- "JetBrains AI" (May) becomes "Junie" for September — not an UPDATE of the
-- May row (which stays exactly as-is), but a wholly separate new row at a
-- different domain (junie.jetbrains.com vs. jetbrains.com) and a different
-- company_name, because the underlying unit of analysis materially changed
-- (Roster evolution — product reframe, per §6.6 of the category-definition
-- doc) — May's "JetBrains AI" and September's "Junie" are two distinct rows,
-- not one row that got renamed.
--
-- sort_order is a fresh 1-14 sequence for this edition — it does not need to
-- match May's sort_order numbers, since these are independent rows.
--
-- No scan_results rows are created here. No scan is triggered. These 14
-- companies will show a null-score/"not yet available" empty state under the
-- September tab (get_benchmark_data's LEFT JOIN to scan_results, already
-- verified in Gate 1 Batch A) until an actual benchmark run scores them.

INSERT INTO public.benchmark_companies
  (domain, company_name, category, benchmark_month, phase, active, sort_order) VALUES
  ('cursor.com',                    'Cursor',              'AI Coding Assistant', '2026-09', 1, true, 1),
  ('lovable.dev',                   'Lovable',             'AI Coding Assistant', '2026-09', 1, true, 2),
  ('replit.com',                    'Replit',              'AI Coding Assistant', '2026-09', 1, true, 3),
  ('bolt.new',                      'Bolt',                'AI Coding Assistant', '2026-09', 1, true, 4),
  ('github.com/features/copilot',   'GitHub Copilot',      'AI Coding Assistant', '2026-09', 1, true, 5),
  ('tabnine.com',                   'Tabnine',             'AI Coding Assistant', '2026-09', 1, true, 6),
  ('sourcegraph.com',               'Cody (Sourcegraph)',  'AI Coding Assistant', '2026-09', 1, true, 7),
  ('augmentcode.com',               'Augment Code',        'AI Coding Assistant', '2026-09', 1, true, 8),
  ('devin.ai',                      'Devin (Cognition)',   'AI Coding Assistant', '2026-09', 1, true, 9),
  ('aws.amazon.com/q/developer',    'Amazon Q Developer',  'AI Coding Assistant', '2026-09', 1, true, 10),
  ('junie.jetbrains.com',           'Junie',               'AI Coding Assistant', '2026-09', 1, true, 11),
  ('blackbox.ai',                   'Blackbox AI',         'AI Coding Assistant', '2026-09', 1, true, 12),
  ('claude.com/product/claude-code','Claude Code',         'AI Coding Assistant', '2026-09', 1, true, 13),
  ('chatgpt.com/codex',             'Codex',               'AI Coding Assistant', '2026-09', 1, true, 14)
ON CONFLICT (domain, category, benchmark_month) DO NOTHING;
