# AVS Rubric — Engine Debug Log

**Purpose:** Running QA log for scoring issues, gate misfires, evidence gaps, and calibration drift.
**Usage:** When a report produces a questionable result, log it here. Run `Scan the debug log for recurring patterns` periodically to surface systemic issues.
**Related:** See ENGINE_DEBUG_HISTORY.md for backfilled history from git.

---

## Pattern Summary

<!-- Update this section periodically. Count entries by root cause and dimension. -->

| Root Cause | Count | Most Affected Dimension |
|------------|-------|------------------------|
| evidence_gap | | |
| gate_misfire | | |
| confidence_miscalc | | |
| prompt_drift | | |
| pipeline_miss | | |
| contamination | | |
| other | | |

---

## Entries

<!-- Newest first. To add an entry, copy the template below and fill it in. -->

### Entry 001 — [DATE]

| Field | Value |
|-------|-------|
| Company | |
| Dimension | |
| Subtest(s) | |
| Expected Score | |
| Actual Score | |
| Confidence | |
| Root Cause | [evidence_gap · gate_misfire · confidence_miscalc · prompt_drift · pipeline_miss · contamination · other] |

**Evidence Reviewed:**
<!-- Paste or link the specific evidence snippets that surfaced the issue -->

**Diagnosis:**
<!-- What went wrong and why. Be specific about which gate, subtest, or pipeline step failed. -->

**Resolution:**
<!-- spec_change · guardrail_addition · pipeline_fix · no_action · deferred -->
<!-- Link to commit or spec change if applicable -->

**Pattern Tag:**
<!-- Tag recurring patterns for easy grep, e.g., "flat-rate-overage-ceiling", "missing-pricing-page", "ns3-case-study-inflation" -->

---
