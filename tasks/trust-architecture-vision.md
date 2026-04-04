# AVS Rubric — Trust Architecture Vision

**Last updated:** April 4, 2026
**Status:** Active — evolves with market feedback and product development

---

## What AVS Rubric Is

**External trust infrastructure diagnostic for AI-native software companies.**

The company is the patient. The rubric is the diagnostic.

It is NOT a procurement tool for buyers. It is NOT a pricing optimization tool. It measures whether an AI-native company has built the trust infrastructure its buyers need to commit, stay, and expand — visible in public signals, before the trust gap shows up in the retention curve.

---

## The Core Problem (First Principles)

AI-native products create a new class of buyer risk that didn't exist in traditional SaaS:

- **Stochastic outputs** — behavior may differ each run
- **Unpredictable cost** — usage is a function of AI behavior, not seat count
- **Opaque decisions** — the AI acts on behalf of the buyer without explainable reasoning
- **Data exposure** — inputs may be used for training or visible to third parties
- **Model drift** — the product that passed procurement in January may behave differently in June

Traditional funnels and product metrics tell you what users do. They don't tell you whether users can predict what will happen before they commit.

Trust in AI-native products is a continuous operational state, not a compliance checkbox. "Adaptive" is the right word — the framework must evolve as AI models, pricing structures, and regulatory requirements change.

---

## The Four-Layer Trust Stack

### Current Coverage

| Layer | Name | Question | Coverage |
|-------|------|----------|----------|
| 1 | **Economic Trust** | Can a buyer predict cost? | ✅ D4, D5, D6, D7 |
| 2 | **Observability Trust** | Can a buyer see usage and outcomes? | ⚠️ Partial — D8, D5 C6 |
| 3 | **Operational Trust** | Can a buyer trust how the AI behaves? | ❌ Not yet |
| 4 | **Governance Trust** | Can a buyer verify accountability? | ⚠️ Partial — D3, D8 |

### Layer 1 — Economic Trust ✅
The core of the current 8-dimension rubric. D4 (Value Unit), D5 (Cost Driver Mapping), D6 (Pools & Packaging), D7 (Overages & Risk). Strongest current coverage.

### Layer 2 — Observability Trust ⚠️
Beyond cost observability: can the buyer verify value delivery after purchase?
- ROI visibility, usage dashboards, outcome tracking
- AI action logs and audit trails (public-facing)
- Extends D8 and D5 C6 — deepening within current framework before adding new dimensions

**Immediate design work needed:** Define observability subtests within D8 that distinguish cost observability (current) from value/outcome observability (missing).

### Layer 3 — Operational Trust ❌ (Next layer to design)
The uniquely AI-native trust gap. Evidence signals:
- AI action logs and audit trails available to users
- Human-in-the-loop options documented
- Failure mode and error rate disclosures
- Capability boundaries (what the AI can and cannot do)
- Incident response process documented
- Model behavior documentation and versioning

**Design constraint:** Most operational trust signals are internal, not public. This layer requires insider prompts as the primary evidence mechanism, not just public signal scanning. Insider prompt architecture already exists for low-confidence dimensions — extend it here.

### Layer 4 — Governance Trust ⚠️ (Emerging)
Where regulatory requirements will land. Evidence signals:
- Documented AI policies (data handling for AI inputs/outputs)
- Model update/change processes and changelogs
- Responsible AI framework or ethics policy
- EU AI Act compliance readiness
- Sector-specific AI rules (financial services, healthcare)

**Strategic note:** Governance trust has the longest lead time to build and highest switching costs once built. Companies that build it now have a durable moat. Highest-value layer for long-term enterprise positioning.

---

## Dimension-to-Trust-Stack Mapping

| Dimension | Trust Layer | Low Score → Internal Signal |
|-----------|-------------|------------------------------|
| D1 Product North Star | Economic + Observability | Positioning problem |
| D2 ICP & Job Clarity | Economic | ICP not sharp enough for packaging |
| D3 Buyer & Budget Alignment | Governance (partial) | Enterprise readiness gap |
| D4 Value Unit | Economic | Unit charged ≠ value experienced (churn predictor) |
| D5 Cost Driver Mapping | Economic + Observability | Cost architecture opaque to buyers |
| D6 Pools & Packaging | Economic | Expansion path invisible (NRR ceiling) |
| D7 Overages & Risk | Economic | Risk pushed to buyer (churn predictor) |
| D8 Safety Rails | Observability + Governance | Controls exist but not externally visible |

---

## Product Evolution Roadmap

| Track | Trust Layers | Evidence | Status |
|-------|-------------|----------|--------|
| Free external scan | Layers 1–2 | Public signals | ✅ Live |
| Insider-assisted scan | All 4 layers | Public + insider prompts | 🔄 Partial |
| Continuous monitoring | All 4 + drift detection | Scheduled rescans | 📋 Planned |
| Benchmark report | All 4 vs. category peers | Cross-company database | 📋 Planned |

The benchmark report is the compounding asset: once AVS has scored enough AI-native companies across all four layers at consistent methodology, it becomes the authoritative standard for trust infrastructure in the category.

---

## Macro Volatility Context

In volatile macro environments, the trust stack becomes load-bearing:

- **CFOs cut AI spend first** → Low economic trust = direct churn. D5/D7 weakness is a churn predictor in tightening budgets.
- **Enterprise procurement slows** → Security reviews and AI vendor questionnaires map to Layers 3–4. An AVS score on governance trust is a procurement accelerator.
- **Regulation accelerates** → EU AI Act and sector-specific AI rules map directly to Layers 3–4. Build early, don't scramble later.
- **AI capability commoditizes** → By 2027, being AI-native is table stakes. Trust becomes the durable differentiator.

The reframe for founders: trust infrastructure is not a cost center. It's a revenue driver — shorter sales cycles, lower churn, enterprise expansion enabler.

---

## The Missing Interpretive Layer

The rubric measures *existence* of trust signals. What executives need is **gap-to-outcome mapping**:

- D7 score 1/2 → "correlates with X% higher churn in similar companies"
- D4 misalignment → "root cause of upgrade friction at 10-seat teams"
- D3 score 1/2 → "enterprises in your category require ≥2 to pass procurement"

This interpretive layer requires the benchmark dataset to become meaningful. It's what transforms the rubric from a diagnostic into a strategic planning tool.

---

## Evolution Triggers — When to Update This Document

- Enterprise buyers asking about Layers 3–4 before pricing → accelerate operational/governance trust design
- Founders using scores for board reporting → add executive summary + trend view
- Regulatory requirements citing specific signals → fast-track governance layer
- Competitors adding longitudinal tracking or benchmarks → accelerate benchmark dataset
- Market feedback shifts the definition of "AI-native" → revisit first-principles problem statement
