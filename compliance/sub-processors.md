# Sub-processors & Data Flows

**Last reviewed:** 2026-05-02

This document lists every third-party service that processes data on behalf of ValueTempo AVS Rubric, what data they see, and where their terms live.

## Inventory

| Sub-processor | Purpose | Data processed | Region | Terms |
|---|---|---|---|---|
| Lovable Cloud (Supabase) | Auth, Postgres, edge runtime, storage | User email, scan history, generated reports | EU/US (per project region) | https://supabase.com/privacy |
| Lovable AI Gateway | Routes prompts to LLM providers | Public web content + scan prompts; no PII intentionally sent | US | https://lovable.dev/privacy |
| Google Gemini (via Gateway) | Scoring rationale + chat responses | Public web content snippets, rubric prompts | US | https://ai.google.dev/gemini-api/terms |
| OpenAI GPT (via Gateway) | Scoring rationale fallback | Public web content snippets, rubric prompts | US | https://openai.com/policies/row-privacy-policy |
| Firecrawl | Crawl + extract public pricing pages | Target URL, public HTML content | US | https://www.firecrawl.dev/privacy |
| Resend | Transactional email (feedback, password reset) | User email, message body | US/EU | https://resend.com/legal/privacy-policy |
| Cloudflare Turnstile | Bot protection on scan submission | IP, browser fingerprint | Global | https://www.cloudflare.com/privacypolicy/ |
| Calendly | Booking demo calls (link-out) | Whatever the user submits to Calendly directly | US | https://calendly.com/privacy |

## Data we never send to LLMs intentionally

- Plaintext passwords or auth tokens
- User email (chat prompts are scoped to scan context only)
- Other users' scan content

## Data flow summary

1. **Scan submission** → Turnstile verifies → `scrape-website` calls Firecrawl with the target URL → public HTML returned.
2. **Analysis** → `analyze-company` sends rubric prompts + extracted snippets to Lovable AI Gateway → Gemini/OpenAI return rationales.
3. **Storage** → Results stored in Supabase Postgres, scoped by RLS to the requesting user.
4. **Chat** → `chat-with-docs` sends rubric + user question to Gateway; response streamed back.
5. **Email** → Resend delivers transactional messages only.

## Change log

- 2026-05-02 — Initial inventory created.
