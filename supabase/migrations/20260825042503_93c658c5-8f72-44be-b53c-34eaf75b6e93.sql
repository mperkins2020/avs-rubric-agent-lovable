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