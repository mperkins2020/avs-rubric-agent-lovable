# EU AI Act Classification — ValueTempo AVS Rubric

**Last reviewed:** 2026-05-02
**Reviewed by:** ValueTempo team
**Next review:** 2026-11-02 (semi-annual, or on material product change)

## Classification

**Category: Limited-risk (Article 50 — Transparency Obligations)**

The ValueTempo AVS Rubric is an AI system that:

- Generates synthetic content (scoring rationales, chat responses, summaries) about publicly available pricing pages
- Interacts with natural persons (the chat assistant on the Results page)
- Is **not** used to make legally significant decisions about persons
- Does **not** perform biometric categorization, emotion recognition, social scoring, or any other Annex III high-risk activity
- Is **not** listed under Article 5 prohibited practices

### Why not Article 5 (prohibited)
The system does not deploy subliminal techniques, exploit vulnerabilities, perform social scoring by public authorities, or do real-time biometric identification.

### Why not Annex III (high-risk)
The system does not operate in any high-risk domain: critical infrastructure, education, employment, essential services, law enforcement, migration, justice, or democratic processes. Its output is commercial pricing analysis aimed at SaaS founders and revenue teams.

### Why Article 50 (limited-risk) applies
- The chat assistant is an AI system intended to interact with natural persons → users must be informed they are interacting with AI (Art. 50(1)).
- Scoring rationales, summaries, and PDF reports are AI-generated text → must be disclosed as artificially generated (Art. 50(2)).

## Obligations we meet

| Obligation | Where it is implemented |
|---|---|
| Inform users they are interacting with AI | `src/components/ChatPanel.tsx` — "AI" pill in header + subline disclosure |
| Mark AI-generated outputs | `src/pages/Results.tsx` — "AI-generated" badge with model attribution tooltip |
| Disclose in exported artifacts | `src/lib/pdfExport.ts` — disclaimer text names the models used |
| Public-facing transparency | `src/pages/Privacy.tsx` — AI Disclosure section |
| Decision/QA logging | `ENGINE_DEBUG_LOG.md` (go-forward) and `ENGINE_DEBUG_HISTORY.md` (backfilled) — per-scan engine decisions, root causes, dimension outcomes |

## Models used (sub-processors)

Routed via the Lovable AI Gateway:

- Google Gemini (2.5 Pro, 2.5 Flash) — scoring synthesis, chat
- OpenAI GPT-5 family — scoring synthesis fallback

External services that process scan inputs:

- Firecrawl — public web content fetching
- Resend — transactional email
- Lovable Cloud (Supabase) — auth, storage, edge runtime

## Trigger conditions for re-classification

Re-evaluate this classification immediately if any of the following change:

- The product begins making decisions about employment, credit, insurance, education, or other Annex III domains
- The product is sold or repositioned for use by public authorities for benefit eligibility or law enforcement
- Biometric, emotion, or affect-recognition features are added
- Outputs become legally binding on individuals (e.g., automated contracts, eligibility determinations)

In any of those cases, this app likely becomes **high-risk** and the full Article 9–15 obligations apply (risk management, data governance, technical documentation, record-keeping, transparency, human oversight, accuracy/robustness/cybersecurity).
