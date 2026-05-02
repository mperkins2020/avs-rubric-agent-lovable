# Compliance

This folder is the source of truth for ValueTempo AVS Rubric's regulatory posture. It is versioned with the code so that classification, sub-processor lists, and model behaviour stay in sync with what actually ships.

## Contents

- [`classification.md`](./classification.md) — EU AI Act classification (limited-risk, Article 50) and re-classification triggers.
- [`sub-processors.md`](./sub-processors.md) — Every third-party that processes data, what they see, and where their terms live.
- [`model-card.md`](./model-card.md) — How the scoring engine works, models used, known limitations, human oversight.

## Review cadence

Every six months, or immediately when:

- A new sub-processor is added or removed
- The model routing in `analyze-company` or `chat-with-docs` changes provider
- The product enters a new domain (employment, credit, education, etc.) — see classification triggers
- ANALYSIS_VERSION is bumped for a meaningful methodology change

## Companion runtime artifacts

- Transparency badges: `src/pages/Results.tsx`, `src/components/ChatPanel.tsx`
- PDF disclosure: `src/lib/pdfExport.ts`
- Public-facing disclosure: `src/pages/Privacy.tsx`
- Decision & QA logs (Art. 12-style record-keeping): `ENGINE_DEBUG_LOG.md` (go-forward, append-only), `ENGINE_DEBUG_HISTORY.md` (backfilled from git)
