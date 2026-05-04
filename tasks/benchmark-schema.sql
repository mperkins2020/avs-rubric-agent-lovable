-- ============================================================
-- AVS Rubric — Benchmark Analyzer Schema
-- Run this in Lovable's Supabase SQL Editor (one block at a time
-- if needed, or all at once — order matters, follow the sections).
-- ============================================================

-- ─── SECTION 1: New tables ───────────────────────────────────

-- Curated list of companies to scan each month per category.
-- Managed by admin only. This is the source of truth for which
-- companies appear on the benchmark dashboard.
CREATE TABLE IF NOT EXISTS benchmark_companies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain        text NOT NULL,
  company_name  text NOT NULL,
  category      text NOT NULL CHECK (category IN (
    'AI Customer Support',
    'AI Agent Platform',
    'AI Coding Assistant',
    'AI Sales Intelligence',
    'AI Revenue Intelligence',
    'AI Legal',
    'AI Dev Infrastructure',
    'AI Speech Platform',
    'AI Healthcare',
    'AI Video & Podcast'
  )),
  phase         int  NOT NULL DEFAULT 1 CHECK (phase IN (1, 2)),
  active        boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 99,   -- lower = higher priority within category
  notes         text,
  added_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain, category)
);

-- Audit log for each monthly benchmark run.
-- One row per company per run. Lets the dashboard show run status
-- and lets Claude Code retry failed scans without re-running the whole category.
CREATE TABLE IF NOT EXISTS benchmark_run_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_month      text NOT NULL,            -- 'YYYY-MM'
  category       text NOT NULL,
  domain         text NOT NULL,
  company_name   text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'complete', 'error', 'skipped')),
  error_message  text,
  scan_result_id uuid,                     -- FK to scan_results.id once complete
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  UNIQUE (run_month, domain)               -- one canonical result per company per month
);

-- ─── SECTION 2: Extend scan_results ──────────────────────────

-- Flag benchmark scans so the dashboard can query them separately
-- from ad-hoc scans. benchmark_month enables month-over-month diff.
ALTER TABLE scan_results
  ADD COLUMN IF NOT EXISTS is_benchmark    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS benchmark_month text;   -- 'YYYY-MM', e.g. '2026-05'

-- ─── SECTION 3: Indexes ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_scan_results_benchmark
  ON scan_results (benchmark_month, url_domain)
  WHERE is_benchmark = true;

CREATE INDEX IF NOT EXISTS idx_benchmark_companies_category
  ON benchmark_companies (category, phase, active, sort_order);

CREATE INDEX IF NOT EXISTS idx_benchmark_run_log_month
  ON benchmark_run_log (run_month, category, status);

-- ─── SECTION 4: RPC — get_benchmark_data ─────────────────────
--
-- Called by Lovable's frontend with the anon key.
-- Returns top 8 companies for a given category + month,
-- plus prior-month data for QoQ comparison.
-- SECURITY DEFINER bypasses RLS so anon key can read benchmark data.
--
-- Usage: SELECT get_benchmark_data('AI Coding Assistant', '2026-05');

CREATE OR REPLACE FUNCTION get_benchmark_data(
  p_category text,
  p_month    text        -- 'YYYY-MM'
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH
  -- Current month: join benchmark company list with scan results
  current_scans AS (
    SELECT
      bc.company_name,
      bc.domain,
      bc.sort_order,
      bc.notes,
      sr.id            AS scan_id,
      sr.created_at    AS scanned_at,
      sr.result_json,
      -- Core scores
      (sr.result_json->'rubricScore'->>'totalScore')::int     AS total_score,
      (sr.result_json->'rubricScore'->>'maxScore')::int       AS max_score,
      sr.result_json->'rubricScore'->>'band'                  AS band,
      sr.result_json->'rubricScore'->'dimensionScores'        AS dimension_scores,
      -- Model classification
      sr.result_json->'modelClassification'->>'model_type_l1' AS model_type_l1,
      sr.result_json->'modelClassification'->>'model_type_l2' AS model_type_l2,
      -- Observability
      (sr.result_json->'observability'->>'confidenceScore')::int AS confidence_score,
      sr.result_json->'observability'->>'level'               AS observability_level,
      -- Narrative signals for pattern detection
      sr.result_json->'rubricScore'->'strengths'              AS strengths,
      sr.result_json->'rubricScore'->'weaknesses'             AS weaknesses,
      -- Version
      sr.result_json->>'analysisVersion'                      AS analysis_version
    FROM benchmark_companies bc
    LEFT JOIN scan_results sr
      ON  sr.url_domain      = bc.domain
      AND sr.is_benchmark    = true
      AND sr.benchmark_month = p_month
      AND (sr.result_json->>'analysisVersion') NOT IN ('pending', 'error')
    WHERE bc.category = p_category
      AND bc.active   = true
    ORDER BY bc.sort_order
    LIMIT 8
  ),
  -- Prior month: derive 'YYYY-MM' for the month before p_month
  prior_month AS (
    SELECT to_char(
      to_date(p_month, 'YYYY-MM') - interval '1 month',
      'YYYY-MM'
    ) AS month_str
  ),
  prior_scans AS (
    SELECT
      bc.domain,
      (sr.result_json->'rubricScore'->>'totalScore')::int     AS total_score,
      sr.result_json->'rubricScore'->'dimensionScores'        AS dimension_scores,
      sr.result_json->'rubricScore'->>'band'                  AS band
    FROM benchmark_companies bc
    CROSS JOIN prior_month pm
    LEFT JOIN scan_results sr
      ON  sr.url_domain      = bc.domain
      AND sr.is_benchmark    = true
      AND sr.benchmark_month = pm.month_str
      AND (sr.result_json->>'analysisVersion') NOT IN ('pending', 'error')
    WHERE bc.category = p_category
      AND bc.active   = true
  )
  SELECT json_build_object(
    'category',    p_category,
    'month',       p_month,
    'prior_month', (SELECT month_str FROM prior_month),
    'companies',   COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'company_name',       cs.company_name,
            'domain',             cs.domain,
            'total_score',        cs.total_score,
            'max_score',          cs.max_score,
            'total_score_pct',    CASE WHEN cs.max_score > 0
                                    THEN round((cs.total_score::numeric / cs.max_score) * 100)
                                    ELSE NULL END,
            'band',               cs.band,
            'dimension_scores',   cs.dimension_scores,
            'model_type_l1',      cs.model_type_l1,
            'model_type_l2',      cs.model_type_l2,
            'confidence_score',   cs.confidence_score,
            'observability_level',cs.observability_level,
            'strengths',          cs.strengths,
            'weaknesses',         cs.weaknesses,
            'analysis_version',   cs.analysis_version,
            'scanned_at',         cs.scanned_at,
            'notes',              cs.notes,
            -- QoQ delta (null if no prior month data)
            'prior_total_score',  ps.total_score,
            'prior_band',         ps.band,
            'score_delta',        CASE WHEN ps.total_score IS NOT NULL AND cs.total_score IS NOT NULL
                                    THEN cs.total_score - ps.total_score
                                    ELSE NULL END
          )
          ORDER BY cs.total_score DESC NULLS LAST, cs.sort_order
        )
        FROM current_scans cs
        LEFT JOIN prior_scans ps ON ps.domain = cs.domain
      ),
      '[]'::json
    ),
    'run_status', (
      SELECT json_agg(
        json_build_object(
          'domain',       brl.domain,
          'company_name', brl.company_name,
          'status',       brl.status,
          'completed_at', brl.completed_at
        )
      )
      FROM benchmark_run_log brl
      WHERE brl.run_month = p_month
        AND brl.category  = p_category
    )
  );
$$;

-- ─── SECTION 5: RLS policies ─────────────────────────────────

-- benchmark_companies: public read (anyone can see the company list),
-- write restricted to service role (managed by Claude Code edge functions).
ALTER TABLE benchmark_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benchmark_companies_read"
  ON benchmark_companies FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policy for anon/authenticated —
-- all writes go through the service role key in edge functions.

-- benchmark_run_log: same pattern.
ALTER TABLE benchmark_run_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benchmark_run_log_read"
  ON benchmark_run_log FOR SELECT
  USING (true);

-- ─── SECTION 6: Seed benchmark_companies ─────────────────────
-- 130 companies across 10 categories.
-- sort_order = scan priority within category (1 = highest).
-- Phase 1 categories (1–5) are active by default.
-- Phase 2 categories (6–10) are seeded but active=false until Phase 2 launch.

INSERT INTO benchmark_companies (domain, company_name, category, phase, active, sort_order, notes) VALUES

-- ── Category 1: AI Customer Support (Phase 1) ──────────────
('intercom.com',    'Intercom (Fin AI)',    'AI Customer Support', 1, true,  1,  'Category anchor; $0.99/resolution sets benchmark'),
('decagon.com',     'Decagon',             'AI Customer Support', 1, true,  2,  'Conversation-based pricing; clean unit; fast-growing; suggested first case study'),
('forethought.ai',  'Forethought',         'AI Customer Support', 1, true,  3,  'Resolution-based; mid-market focus'),
('ada.cx',          'Ada',                 'AI Customer Support', 1, true,  4,  'Automated conversation model; flat + overage'),
('sierra.ai',       'Sierra',              'AI Customer Support', 1, true,  5,  'No public pricing — low confidence on L2–3'),
('parloa.com',      'Parloa',              'AI Customer Support', 1, true,  6,  'Voice-first enterprise support; $1B+ valuation'),
('zendesk.com',     'Zendesk AI',          'AI Customer Support', 1, true,  7,  'Public company; dual model: seat + automated resolutions'),
('kore.ai',         'Kore.ai',             'AI Customer Support', 1, true,  8,  'Enterprise seat + usage; government contracts'),
('cognigy.com',     'Cognigy',             'AI Customer Support', 1, true,  9,  'Now part of NiCE; post-acquisition packaging in flux'),
('aisera.com',      'Aisera',              'AI Customer Support', 1, true,  10, 'IT + HR + CX unified pricing; multi-unit complexity'),
('gladly.com',      'Gladly',              'AI Customer Support', 1, true,  11, 'People-based pricing model (not ticket-based)'),
('tidio.com',       'Tidio',               'AI Customer Support', 1, true,  12, 'SMB-focused; freemium + conversation credits'),
('helpshift.com',   'Helpshift',           'AI Customer Support', 1, true,  13, 'Mobile-first; MAU-based pricing'),

-- ── Category 2: AI Agent Platform (Phase 1) ────────────────
('salesforce.com',          'Salesforce Agentforce',   'AI Agent Platform', 1, true,  1,  'Largest enterprise anchor; $2/conversation pricing; partially gated'),
('microsoft.com',           'Microsoft Copilot Studio','AI Agent Platform', 1, true,  2,  'Seat + message credits; enterprise-focused'),
('n8n.io',                  'n8n',                     'AI Agent Platform', 1, true,  3,  'Self-hosted + cloud; workflow execution count as unit; most transparent pricing'),
('voiceflow.com',           'Voiceflow',               'AI Agent Platform', 1, true,  4,  'Seat + conversation credits; multi-modal'),
('relevanceai.com',         'Relevance AI',            'AI Agent Platform', 1, true,  5,  'Agent runtime minutes + task runs; dual unit'),
('zapier.com',              'Zapier AI',               'AI Agent Platform', 1, true,  6,  'Task-based (Zaps); most established unit in category'),
('botpress.com',            'Botpress',                'AI Agent Platform', 1, true,  7,  'Message credits; community vs. enterprise gap'),
('relay.app',               'Relay.app',               'AI Agent Platform', 1, true,  8,  'Run-based credits; YC-backed'),
('crewai.com',              'CrewAI',                  'AI Agent Platform', 1, true,  9,  'Task executions; open-source → cloud conversion'),
('lindy.ai',                'Lindy',                   'AI Agent Platform', 1, true,  10, 'Task-based; AI employee framing'),
('stack-ai.com',            'Stack AI',                'AI Agent Platform', 1, true,  11, 'Enterprise-focused; workflow runs'),
('dust.tt',                 'Dust',                    'AI Agent Platform', 1, true,  12, 'Agent builder; seat + run model'),
('make.com',                'Make',                    'AI Agent Platform', 1, true,  13, 'Operation credits; most transparent unit; scoring anchor'),

-- ── Category 3: AI Coding Assistant (Phase 1) ──────────────
('cursor.com',              'Cursor',                  'AI Coding Assistant', 1, true,  1,  'Category anchor; moved to usage-based June 2025'),
('windsurf.com',            'Windsurf (Codeium)',      'AI Coding Assistant', 1, true,  2,  'Seat + model tiers; recently acquired by OpenAI'),
('lovable.dev',             'Lovable',                 'AI Coding Assistant', 1, true,  3,  'Credit-based; burst consumption model'),
('replit.com',              'Replit',                  'AI Coding Assistant', 1, true,  4,  'Agent runtime minutes; 200-min cap'),
('bolt.new',                'Bolt',                    'AI Coding Assistant', 1, true,  5,  'Credit-based; StackBlitz product'),
('github.com',              'GitHub Copilot',          'AI Coding Assistant', 1, true,  6,  'Seat + enterprise; 4.7M paid users; use github.com/features/copilot'),
('tabnine.com',             'Tabnine',                 'AI Coding Assistant', 1, true,  7,  'Enterprise-only (2026); $59/user/month agentic tier'),
('sourcegraph.com',         'Cody (Sourcegraph)',      'AI Coding Assistant', 1, true,  8,  'Seat + context window; enterprise context engine'),
('augmentcode.com',         'Augment Code',            'AI Coding Assistant', 1, true,  9,  'Per-seat; multi-agent orchestration'),
('qodo.ai',                 'Qodo',                    'AI Coding Assistant', 1, true,  10, '$70M Series C; verification-as-category — new unit type'),
('cognition.ai',            'Devin (Cognition)',       'AI Coding Assistant', 1, true,  11, 'Task-based outcome pricing; similar evidence challenge to Sierra'),
('aws.amazon.com',          'Amazon CodeWhisperer',    'AI Coding Assistant', 1, true,  12, 'AWS consumption credits; bundled billing — may be hard to isolate'),
('jetbrains.com',           'JetBrains AI',            'AI Coding Assistant', 1, true,  13, 'Seat; bundled with IDE subscription'),
('blackbox.ai',             'Blackbox AI',             'AI Coding Assistant', 1, true,  14, 'Freemium + credits; developer-focused'),

-- ── Category 4: AI Sales Intelligence (Phase 1) ────────────
('clay.com',                'Clay',                    'AI Sales Intelligence', 1, true,  1,  'Row-based credits; clearest unit; prior case study — calibration anchor'),
('apollo.io',               'Apollo.io',               'AI Sales Intelligence', 1, true,  2,  'Freemium → credit-based; multi-product complexity'),
('zoominfo.com',            'ZoomInfo',                'AI Sales Intelligence', 1, true,  3,  'Enterprise anchor; seat + credit bundles; mostly quote-based'),
('instantly.ai',            'Instantly.ai',            'AI Sales Intelligence', 1, true,  4,  'Email sends + leads; simple unit; outbound-focused'),
('amplemarket.com',         'Amplemarket',             'AI Sales Intelligence', 1, true,  5,  'Seat + signal credits; multi-signal blending'),
('autobound.ai',            'Autobound',               'AI Sales Intelligence', 1, true,  6,  'Signal credits; signal orchestration platform'),
('6sense.com',              '6sense',                  'AI Sales Intelligence', 1, true,  7,  'Account-credit model; intent data; structurally different from contact-based'),
('demandbase.com',          'Demandbase',              'AI Sales Intelligence', 1, true,  8,  'Account-based; intent data seat vs. account confusion'),
('bombora.com',             'Bombora',                 'AI Sales Intelligence', 1, true,  9,  'Intent signal subscription; topic count as unit'),
('lusha.com',               'Lusha',                   'AI Sales Intelligence', 1, true,  10, 'Credit-based; contact data focus'),
('seamless.ai',             'Seamless.ai',             'AI Sales Intelligence', 1, true,  11, 'Freemium + credits; direct comparison to ZoomInfo'),
('clearbit.com',            'Clearbit (HubSpot)',      'AI Sales Intelligence', 1, true,  12, 'Now HubSpot-owned; enrichment-focused'),
('cognism.com',             'Cognism',                 'AI Sales Intelligence', 1, true,  13, 'EMEA-focused; Diamond Data credits'),

-- ── Category 5: AI Revenue Intelligence (Phase 1) ──────────
('commonroom.io',           'Common Room',             'AI Revenue Intelligence', 1, true,  1,  'Community + product + GTM signals; Series B; suggested first new case study'),
('gong.io',                 'Gong',                    'AI Revenue Intelligence', 1, true,  2,  'Conversation → revenue intelligence; established anchor; enterprise quote-based'),
('clari.com',               'Clari (+ Salesloft)',     'AI Revenue Intelligence', 1, true,  3,  'Revenue orchestration; merged with Salesloft Dec 2025; packaging may be in transition'),
('momentum.io',             'Momentum',                'AI Revenue Intelligence', 1, true,  4,  'Slack-native CRM sync + AI signals'),
('people.ai',               'People.ai',               'AI Revenue Intelligence', 1, true,  5,  'Activity capture + revenue intelligence'),
('pocus.com',               'Pocus',                   'AI Revenue Intelligence', 1, true,  6,  'Product-led sales; PLS-focused'),
('getkoala.com',            'Koala',                   'AI Revenue Intelligence', 1, true,  7,  'Intent signals for PLG → enterprise motion'),
('jiminny.com',             'Jiminny',                 'AI Revenue Intelligence', 1, true,  8,  'Conversation intelligence; mid-market'),
('aviso.ai',                'Aviso',                   'AI Revenue Intelligence', 1, true,  9,  'AI forecasting + deal guidance'),
('grain.com',               'Grain',                   'AI Revenue Intelligence', 1, true,  10, 'Meeting recording + CRM sync + signals'),
('trumpet.so',              'Trumpet',                 'AI Revenue Intelligence', 1, true,  11, 'Digital sales rooms + buyer signals'),
('chorus.ai',               'Chorus.ai (ZoomInfo)',    'AI Revenue Intelligence', 1, true,  12, 'Conversation intelligence; now ZoomInfo-owned'),
('salesmotion.io',          'Salesmotion',             'AI Revenue Intelligence', 1, true,  13, 'Signal-driven account intelligence; pre-call research focus'),

-- ── Category 6: AI Legal (Phase 2) ─────────────────────────
('harvey.ai',               'Harvey',                  'AI Legal', 2, false, 1,  'Category leader; $3B valuation; Claude-based; no public pricing'),
('robin.ai',                'Robin AI',                'AI Legal', 2, false, 2,  'Contract review; UK + US; enterprise-focused'),
('spellbook.legal',         'Spellbook',               'AI Legal', 2, false, 3,  'Contract drafting; Word add-in; per-seat'),
('ironclad.com',            'Ironclad',                'AI Legal', 2, false, 4,  'Contract lifecycle; Series D; established player'),
('lexion.ai',               'Lexion',                  'AI Legal', 2, false, 5,  'Contract management + AI; enterprise'),
('evenuplaw.com',           'EvenUp',                  'AI Legal', 2, false, 6,  'Personal injury litigation only; vertical specialist'),
('definely.com',            'Definely',                'AI Legal', 2, false, 7,  'Contract review; UK-focused'),
('clio.com',                'Clio (Duo AI)',            'AI Legal', 2, false, 8,  'Law firm management + AI; per-seat'),
('luminance.com',           'Luminance',               'AI Legal', 2, false, 9,  'Due diligence + contract; enterprise'),
('contractpodai.com',       'ContractPodAi',           'AI Legal', 2, false, 10, 'Enterprise CLM + AI; Salesforce-integrated'),
('leya.ai',                 'Leya',                    'AI Legal', 2, false, 11, 'Legal research; Scandinavian focus; early-stage'),
('juro.com',                'Juro',                    'AI Legal', 2, false, 12, 'Contract collaboration; self-serve + enterprise'),
('legalon.com',             'Legalon',                 'AI Legal', 2, false, 13, 'German market; compliance-focused'),

-- ── Category 7: AI Dev Infrastructure (Phase 2) ────────────
('together.ai',             'Together AI',             'AI Dev Infrastructure', 2, false, 1,  'Token-based inference; fine-tuning credits separate'),
('groq.com',                'Groq',                    'AI Dev Infrastructure', 2, false, 2,  'Token-based; speed as pricing differentiation'),
('fireworks.ai',            'Fireworks AI',            'AI Dev Infrastructure', 2, false, 3,  'Token-based; fine-tuning + inference dual model'),
('modal.com',               'Modal',                   'AI Dev Infrastructure', 2, false, 4,  'GPU second billing; per-second compute'),
('replicate.com',           'Replicate',               'AI Dev Infrastructure', 2, false, 5,  'Per-prediction; CPU/GPU second billing'),
('baseten.com',             'Baseten',                 'AI Dev Infrastructure', 2, false, 6,  'Compute credits; self-hosted option'),
('wandb.ai',                'Weights & Biases',        'AI Dev Infrastructure', 2, false, 7,  'Seat + compute hours; dual unit; watch for research tier inflation'),
('anyscale.com',            'Anyscale',                'AI Dev Infrastructure', 2, false, 8,  'Compute + managed service; Ray framework'),
('lambdalabs.com',          'Lambda Labs',             'AI Dev Infrastructure', 2, false, 9,  'GPU hour rental; spot vs. reserved'),
('huggingface.co',          'Hugging Face',            'AI Dev Infrastructure', 2, false, 10, 'Free + Inference credits + enterprise; three-tier hybrid'),
('lepton.ai',               'Lepton AI',               'AI Dev Infrastructure', 2, false, 11, 'Serverless GPU; token-based'),
('runpod.io',               'RunPod',                  'AI Dev Infrastructure', 2, false, 12, 'GPU rental; pod-based pricing'),
('cerebras.net',            'Cerebras',                'AI Dev Infrastructure', 2, false, 13, 'Token + compute; custom silicon pricing'),

-- ── Category 8: AI Speech Platform (Phase 2) ───────────────
('elevenlabs.io',           'ElevenLabs',              'AI Speech Platform', 2, false, 1,  'Character credits; prior case study — calibration anchor for category'),
('deepgram.com',            'Deepgram',                'AI Speech Platform', 2, false, 2,  'Per-minute audio (STT); clearest unit in category'),
('assemblyai.com',          'AssemblyAI',              'AI Speech Platform', 2, false, 3,  'Per-minute + feature tiers; diarization adds cost layer'),
('vapi.ai',                 'Vapi',                    'AI Speech Platform', 2, false, 4,  'Per-minute voice agent; check API docs for PSTN cost pass-through'),
('bland.ai',                'Bland.ai',                'AI Speech Platform', 2, false, 5,  'Per-minute + PSTN costs; check API docs for phone cost documentation'),
('cartesia.ai',             'Cartesia',                'AI Speech Platform', 2, false, 6,  'Token-based TTS; per-token unit'),
('play.ai',                 'Play.ai',                 'AI Speech Platform', 2, false, 7,  'Character credits; ElevenLabs-comparable model'),
('resemble.ai',             'Resemble AI',             'AI Speech Platform', 2, false, 8,  'Per-second audio; highest metering granularity — useful baseline'),
('rime.ai',                 'Rime',                    'AI Speech Platform', 2, false, 9,  'Per-character; voice cloning credits separate'),
('wellsaid.com',            'Wellsaid Labs',           'AI Speech Platform', 2, false, 10, 'Seat + character bundle; hybrid model'),
('murf.ai',                 'Murf AI',                 'AI Speech Platform', 2, false, 11, 'Credit-based; team collaboration tiers'),
('lmnt.com',                'LMNT',                    'AI Speech Platform', 2, false, 12, 'Per-character; low-latency TTS focus'),
('speechify.com',           'Speechify',               'AI Speech Platform', 2, false, 13, 'Freemium + seat; B2B push recent'),

-- ── Category 9: AI Healthcare (Phase 2) ────────────────────
('abridge.com',             'Abridge',                 'AI Healthcare', 2, false, 1,  'Ambient clinical documentation; EPIC-integrated'),
('suki.ai',                 'Suki',                    'AI Healthcare', 2, false, 2,  'Voice-first clinical AI; per-user'),
('nabla.com',               'Nabla',                   'AI Healthcare', 2, false, 3,  'Ambient AI for clinicians; European + US'),
('ambiencehealthcare.com',  'Ambience Healthcare',     'AI Healthcare', 2, false, 4,  'Full clinical documentation suite'),
('hippocratic.ai',          'Hippocratic AI',          'AI Healthcare', 2, false, 5,  'Patient communication agents; $1.64B valuation'),
('corti.com',               'Corti',                   'AI Healthcare', 2, false, 6,  'Emergency medicine + claims; $605M valuation'),
('notablehealth.com',       'Notable Health',          'AI Healthcare', 2, false, 7,  'Patient intake automation; per-encounter'),
('qventus.com',             'Qventus',                 'AI Healthcare', 2, false, 8,  'Operational AI for health systems'),
('regardapp.com',           'Regard',                  'AI Healthcare', 2, false, 9,  'Diagnosis + documentation AI'),
('aidoc.com',               'Aidoc',                   'AI Healthcare', 2, false, 10, 'Radiology AI; FDA-cleared — hard trust signal for Safety Rails'),
('nuance.com',              'Nuance (Microsoft)',       'AI Healthcare', 2, false, 11, 'DAX ambient AI; Microsoft-owned; bundled pricing — low public evidence expected'),
('dovetailhealth.com',      'Dovetail Health',         'AI Healthcare', 2, false, 12, 'Post-acute care coordination'),

-- ── Category 10: AI Video & Podcast (Phase 2) ──────────────
('synthesia.io',            'Synthesia',               'AI Video & Podcast', 2, false, 1,  'Per-minute video; avatar licensing; enterprise push'),
('heygen.com',              'HeyGen',                  'AI Video & Podcast', 2, false, 2,  'Credit-based video minutes; avatar tiers'),
('descript.com',            'Descript',                'AI Video & Podcast', 2, false, 3,  'Seat + transcription hours; editing-first'),
('opus.pro',                'Opus Clip',               'AI Video & Podcast', 2, false, 4,  'Seat + video hours processed; clips-focused'),
('riverside.fm',            'Riverside',               'AI Video & Podcast', 2, false, 5,  'Seat + recording hours; podcast + video'),
('runwayml.com',            'Runway',                  'AI Video & Podcast', 2, false, 6,  'Credit-based; GPU seconds as credits — most complex unit in category'),
('captions.ai',             'Captions.ai',             'AI Video & Podcast', 2, false, 7,  'Seat + video minutes; mobile-first'),
('podcastle.fm',            'Podcastle',               'AI Video & Podcast', 2, false, 8,  'Seat + recording hours; podcast-specific'),
('veed.io',                 'Veed.io',                 'AI Video & Podcast', 2, false, 9,  'Seat + export credits; creator-focused'),
('pika.art',                'Pika',                    'AI Video & Podcast', 2, false, 10, 'Credit-based; text-to-video focus'),
('loom.com',                'Loom (Atlassian)',         'AI Video & Podcast', 2, false, 11, 'Seat-based; Atlassian-owned; may be bundled in enterprise agreements'),
('wondercraft.ai',          'Wondercraft',             'AI Video & Podcast', 2, false, 12, 'Audio-first; podcast production'),
('klingai.com',             'Kling (Kuaishou)',         'AI Video & Podcast', 2, false, 13, 'Credit-based; Chinese entrant; aggressive pricing — useful contrast baseline')

ON CONFLICT (domain, category) DO NOTHING;
