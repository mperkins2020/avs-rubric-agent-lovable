# AVS Rubric — Engine Debug Log

**Purpose:** Running QA log for scoring issues, gate misfires, evidence gaps, and calibration drift.
**Usage:** When a report produces a questionable result, log it here. Run `Scan the debug log for recurring patterns` periodically to surface systemic issues.
**Related:** See ENGINE_DEBUG_HISTORY.md for backfilled history from git.

**Entries:** 71 | **Last updated:** August 3, 2026

---

## Pattern Summary

<!-- Update this section periodically. Count entries by root cause and dimension. -->

| Root Cause | Count | Most Affected Dimension |
|------------|-------|------------------------|
| evidence_gap | 0 | — |
| gate_misfire | 1 | D7/D8 cap-gate-misapplied-as-floor across 6 companies (Entry 066) |
| confidence_miscalc | 0 | — |
| prompt_drift | 5 | ICP and Job Clarity (D2); D6/D8 evidence-block leak (Entry 060); D7 audit arithmetic error (Entry 064); D5-D8 evidence block missing, initially 4 companies (Entry 065), later found near-universal across every dimension/company checked this session — root cause (asking for 2 brackets per dimension instead of 1) FIXED in Entry 069, not yet re-verified against a live rescan |
| evidence_snippet_selection | 2 | ICP (D2), Value Unit (D4), Overages (D6), Safety Rails (D7), Evidence Coverage (D8); same-page-different-read on D4 (Entry 062, confirmed a 3rd time on Semrush — see Entry 062 addendum). Root cause (D1-D4 had no mandatory audit-block procedure) FIXED in Entry 068 — not yet re-verified against a live rescan. |
| pipeline_miss | 27 | Value Unit, Cost Driver Mapping, Safety/Trust, Overages & Risk, URL filter; forced-page resolution gap (Entry 059); session-load evidence degradation (Entry 061); product-surface mismatch (Entry 063); blog-content misclassified as pricing evidence (Entry 067) |
| contamination | 13 | Pricing Transparency, Enterprise/Compliance (D7/D8) |
| calibration | 3 | Value unit (D4), ICP and Job Clarity (D2), Safety Rails (D8) |
| other | 4 | Architecture/merge-level (Entries 056–058): instrument drift, single-pass classification gating, pass-1 narrative bias |

---

## Debug Log

<!-- Newest first. To add an entry, copy the template below and fill it in. -->

<!-- Next entry goes here -->

---

### Entry 071 — August 3, 2026

| Field | Value |
|-------|-------|
| Company | Semrush (semrush.com) — found during v42 verification, but both bugs are systemic |
| Version | 2026-08-03-pipeline-v42 (bugs present); fixed in 2026-08-03-pipeline-v43 |
| Dimension | D3 specifically (gate-text bug); all 8 dimensions (confidence-threshold bug) |
| Subtest(s) | Gate classification for D3's own aggregation-note phrasing; the evidenceQuality confidence check |
| Root Cause | Two independent bugs, both found by hand-verifying the same v42 rescan requested to confirm Entry 070's fix |
| Caught By | Hand-verification of a live v42 rescan (Michelle + Claude Code, 2026-08-03) — the same discipline that caught Entry 070 an hour earlier, applied again to the very next verification pass |
| Status | fix_specified — deployed as part of this entry, verified via 11 new unit tests before commit |

**Bug 1 — D3's own prompt instruction produces gate text its own parser doesn't recognize.**

Entry 068's D3 MANDATORY SCORING PROCEDURE instructs the LLM: "if aggregation across multiple segments changes the score from what the highest-priority segment's own points would map to on their own, note this explicitly in the gate field (e.g. `gate=none, aggregated across N segments`)." `classifyGate()`'s none-check was `/^none$/i` — anchored to match *only* the exact string "none". A correctly-behaving D3 response following its own prompt's instructions produced `gate=none, aggregated across 3 segments`, which fell through every classification rule to `unrecognized`, incorrectly flagging a dimension with no actual problem. Self-inflicted by Entry 068's own prompt design, not a pre-existing gap.

Fix: broadened the none-check from `/^none$/i` to `/^none\b/i` — matches "none" as a complete leading word (word-boundary-terminated), so "none, aggregated across N segments" now correctly classifies as `{ kind: 'none' }`, while still correctly rejecting unrelated text like "nonexistent policy" (no boundary exists between "none" and "xistent").

**Bug 2 — floating-point noise in confidence values wrongly triggers the low-confidence flag.**

Confidence is computed upstream as an average of several subtest reliability values. Under IEEE-754, this routinely lands one float ULP off its intended 2-decimal value — the same live rescan produced `confidence: 0.44999999999999996` (intended: 0.45) on two separate dimensions, and `confidence: 0.6500000000000001` (intended: 0.65) elsewhere in the same response. The evidenceQuality logic's `< 0.45` check is a strict inequality, so a confidence arithmetically meant to be exactly 0.45 — which the prompt's own confidence labels place at the *floor* of "Medium" (0.45-0.74), not "Low" (<0.45) — was wrongly flagged. Confirmed systemic: this exact float value has appeared repeatedly across many companies/dimensions throughout this whole QA cycle, not just this one instance.

Fix: subtract a small epsilon (`1e-9`) from the threshold before comparing, so values that round to 0.45 are treated as 0.45. Does not affect any actual dimension SCORE — only the `verified`/`flagged` quality label.

**Process finding, not a bug:** the confidence-threshold logic was living directly in `index.ts`'s post-processing loop — Deno-only code with zero vitest coverage, unlike the rest of the corrector which lives in the dual-importable `rubric-audit.ts`. Extracted it into a new exported `computeEvidenceQuality()` function in `rubric-audit.ts` specifically so this class of logic gets real test coverage going forward, rather than patching it inline again.

**Combined effect on the verification run that found these:** the v42 semrush.com rescan (Entry 070's fix already verified working — D8 correction fired cleanly, no `unrecognized-gate-not-corrected` recurrence) showed 7 of 8 dimensions as `flagged` instead of the mostly-`verified` v41 result, which is what triggered this investigation. After both fixes, re-verification is needed to confirm the flagged count drops back down appropriately — D3's flag should clear from the gate fix, and D1/D4/D5/D6's near-0.45 confidence flags should clear from the epsilon fix, while D7 (genuinely low confidence, 0.30) and D8 (a real, correct correction) should remain flagged.

**Pattern Tag:** `self-inflicted-prompt-parser-mismatch`, `d3-aggregation-gate-text`, `floating-point-confidence-threshold`, `untested-deno-only-logic`, `caught-by-live-verification-not-unit-tests`

---

### Entry 070 — August 3, 2026

| Field | Value |
|-------|-------|
| Company | Semrush (semrush.com) — found during v41 verification, but the underlying bug is systemic (affects D1 on any company) |
| Version | 2026-08-03-pipeline-v41 (bug present); fixed in 2026-08-03-pipeline-v42 |
| Dimension | D1 (Product North Star) specifically — the only dimension using a two-letter subtest prefix |
| Subtest(s) | Gate classification for abbreviated gate citations (e.g. "NS3 gate") |
| Root Cause | prompt_drift / incomplete-fix — Entry 068 extended the audit-block *parser* regex to accept 1-2 letter subtest prefixes (for D1's "NS" prefix) but missed applying the identical fix to the separate *gate-classification* regex in `classifyGate()` |
| Caught By | Hand-verification of a live v41 rescan (Michelle + Claude Code, 2026-08-03) — deliberately re-checking the deployed corrector's math against raw production data rather than trusting unit tests alone, immediately after Entries 068/069 deployed |
| Status | fix_specified — deployed as part of this entry, verified via 2 new regression tests before commit |

**Root Cause Detail:**

Entry 068 correctly identified that `AUDIT_BLOCK_PATTERN` and `MARK_PATTERN` needed to accept 1-2 letter subtest prefixes to parse D1's `NS1`-`NS6` marks (versus D2/D3/D4/D5-D8's single-letter prefixes). That fix was applied and tested. `classifyGate()`'s separate abbreviated-label-matching regex (`\b([A-Z]\d)\b`, used to recognize gate text like "T4" or "T4 fails for the highest-priority segment" as shorthand for "cap at 1") needed the exact same extension and did not get it — a straightforward oversight, not a different design problem.

A live v41 rescan of semrush.com produced D1 gate text `"NS3 gate"` (NS3 having failed). Tracing through `classifyGate()`: the text doesn't match `none`, doesn't match the explicit hard-zero or cap-with-number patterns, doesn't contain the bare word "cap", doesn't match the hard-zero fallback (no "missing" + overage_behavior/primary_unit_name), and the label-match regex `\b([A-Z]\d)\b` cannot match "NS3" at all — a word boundary is required immediately before the captured letter, but the transition from "N" to "S" inside "NS3" is word-to-word, not a boundary, so neither "N" nor "S3" can match. The gate fell through to `{ kind: 'unrecognized', text }`, which `correctDimensionScore` handles by passing the declared score through unchanged and setting `correctionReason: 'unrecognized-gate-not-corrected'`.

**In this specific instance, no wrong score reached the report.** By coincidence, the raw audit math (4 actual P marks — the LLM's own declared `pts=3/6` was itself wrong, but the pre-existing denominator-recompute logic caught that separately and correctly — mapping to score 1) and the intended cap (also 1, since NS3 failing should cap at 1) landed on the same value. The system's own safety net also worked as designed: `evidenceQuality` was correctly set to `flagged` (not silently `verified`) because `unrecognized-gate-not-corrected` is one of the flag conditions — the uncertainty was surfaced, not hidden. But the bug is real and could produce a genuinely wrong, uncorrected score in a scenario where the raw points map above the intended cap (e.g. 5-6 points with NS3 failing — correct answer is capped at 1, but with the bug the corrector would pass through whatever the LLM declared, which could be a wrong 2).

**Resolution:** Extended `classifyGate()`'s label-match regex from `\b([A-Z]\d)\b` to `\b([A-Z]{1,2}\d)\b`, identical to the fix already applied to the audit-block parser in Entry 068. Added a regression test reproducing the exact "NS3 gate" classification, plus an end-to-end test using the real production rationale text verbatim.

**Process note:** this bug survived Entry 068's original test suite (49 tests, all passing) because none of those tests exercised D1's abbreviated-gate-citation path specifically — the D1 test coverage added in Entry 068 used explicit gate phrasing ("final score = 0", "cap score at 1") rather than the abbreviated "NS3 gate" shorthand real production output turned out to use. This is the second time this cycle a defect was caught only by hand-verifying live production data after deployment rather than by pre-deployment unit tests (the first being the D1-D4/evidence-block scope discovery itself, Entries 065/068/069) — reinforces that a green test suite confirms the tests you wrote are internally consistent, not that they cover what production actually does. Continue the practice of hand-verifying at least one live rescan's raw audit-block math after any corrector change, not just running the existing suite.

**Pattern Tag:** `two-letter-prefix-gap`, `incomplete-fix`, `gate-classification-regex`, `caught-by-live-verification-not-unit-tests`, `d1-ns-prefix`

---

### Entry 069 — August 3, 2026

| Field | Value |
|-------|-------|
| Company | Systemic — engine/prompt change, not company-specific |
| Version | 2026-08-03-pipeline-v41 |
| Dimension | All 8 (D1-D8) |
| Subtest(s) | The `[D_ evidence: ...]` citation requirement, step 6 of every MANDATORY SCORING PROCEDURE |
| Root Cause | prompt_drift — near-zero LLM compliance with a two-bracket-per-dimension output requirement |
| Status | fix_specified — deployed as part of this entry, verified via 6 new unit tests + full-suite regression before commit; NOT yet verified against a live rescan |

**Root Cause Detail:**

Entry 065 first documented "D5-D8 evidence block missing" as an occasional finding on 4 companies. This session's broader QA sweep (Marketing Intelligence full rescan, the Zapier individual-scan anomaly investigation, and a direct unambiguous raw-`rationale` pull for CrewAI's D5-D8) established the true scope: across every single sample checked this session — roughly 40+ dimension-scans spanning two categories — the LLM produced the mandated `[D_ audit: ...]` bracket (step 5 of the procedure) essentially every time, but the separate `[D_ evidence: field←page + ...]` bracket (step 6) essentially never. This is not an intermittent gap; it's a near-total compliance failure on one specific instruction embedded in an already-long, multi-step, per-dimension procedure repeated 8 times in a single prompt.

The investigation initially suspected a corrector bug (a stray `rationale_evidence` field surfaced in one query result, appearing to show a well-formed evidence block that `evidenceBlockMissing: true` seemed to contradict). Traced to its source: that field did not exist anywhere in the codebase and was not a genuine stored value — a direct, unambiguous SQL pull of the raw `rationale` string (bypassing any derived/computed columns) confirmed the evidence bracket was genuinely absent from the field the corrector actually parses. The corrector was working correctly the whole time; the finding is real.

**Resolution:** Merged the two mandated brackets into one. Instead of a compact audit line followed by a separate per-subtest evidence line, each PASS mark now carries its supporting citation inline, in parentheses, directly after the mark:

```
Old (2 brackets, ~0% compliance on the 2nd):
[D5 audit: C1=P C2=F C3=P C4=P C5=P C6=F | pts=4/6 | gate=none | score=1]
[D5 evidence: C1←tasks@/pricing; C2←none; C3←Zap workflows@/pricing; ...]

New (1 bracket, evidence inline, Entry 069):
[D5 audit: C1=P(tasks@/pricing) C2=F C3=P(Zap workflows@/pricing) C4=P($19.99/mo@/pricing) C5=P(pay-per-task@/pricing) C6=F | pts=4/6 | gate=none | score=1]
```

Rationale for this specific fix direction over alternatives (e.g. reordering the two-step instruction, simplifying the evidence format while keeping it separate): the audit bracket already has near-100% compliance despite carrying comparable structural complexity (6 marks + pts + gate + score, all in one bracket). Extending a format the model already reliably produces should generalize better than asking for a second, apparently-easy-to-skip completion — betting on primacy/single-completion-action rather than instruction count or ordering.

**Implementation:**
- All 8 dimensions' MANDATORY SCORING PROCEDURE prompt sections (`index.ts`) rewritten to the merged format, preserving each dimension's specific citation rules (D5's PRICING MODEL CATEGORY AWARENESS override marker, D6's per-subtest P2/P3/P6 multi-field citation requirements, D7's R4/R5 exact-field-name rules, D8's T1/T5/T6 multi-condition citation requirements) — none of the underlying subtest logic changed, only the output packaging.
- The seat-based override marker changed from `auto(seat-based)` to `auto-seat-based` (hyphenated, no inner parentheses) across every dimension that references it — nested parentheses inside an inline citation would break the citation-extraction regex (`\(([^)]*)\)`, which stops at the first closing paren).
- `rubric-audit.ts`: `parseAuditBlock` now extracts an inline citation per mark alongside its P/F/NA value. `hasEvidenceBlock` is satisfied by EITHER the new inline format (every PASS mark has a non-empty citation) OR the old separate-bracket format (kept as a fallback, so a stray old-style response — or any transitional output — isn't wrongly flagged). Same underlying standard as before ("a PASS mark with missing evidence is INVALID"), checked differently.
- `src/lib/rationale.ts` (frontend "Subtest audit" panel renderer): no code change needed — its bracket-extraction regex (`[^\]]*`, anything except a closing bracket) already tolerates parentheses inside the bracket, so it continues to correctly isolate the single merged bracket. Confirmed no hardcoded two-block assumption in `DimensionCard.tsx` either.
- 6 new unit tests covering inline-citation parsing, the missing-citation failure case, the hyphenated override marker, backward compatibility with the old bracket format, a real production rationale text (CrewAI D5, no evidence bracket at all) still validating correctly, and D1's two-letter NS-prefix marks working with inline citations. 55 rubric-audit tests pass, 158 total.

**Verification status:** Not yet checked against a live rescan. The next scan on any company should be checked for whether `[D_ evidence: ...]` compliance (formerly ~0%) becomes `evidenceQuality: verified`/`flagged` at meaningfully higher rates than before, with `evidenceQuality: unverified` becoming the exception rather than the default it was throughout this entire session.

**Pattern Tag:** `evidence-block-missing`, `mandatory-scoring-procedure-compliance`, `merged-audit-evidence-bracket`, `inline-citation-format`, `two-bracket-instruction-non-compliance`

---

### Entry 068 — August 3, 2026

| Field | Value |
|-------|-------|
| Company | Systemic — engine change, not company-specific |
| Version | 2026-08-03-pipeline-v40 |
| Dimension | D1, D2, D3, D4 (previously unaudited; D5-D8 already had this) |
| Subtest(s) | All — NS1-NS6 (D1), J1-J6 (D2), S1-S5 (D3), V1-V6 (D4) |
| Status | fix_specified — deployed as part of this entry, verified via 49 rubric-audit unit tests (11 new) before commit |

**Root Cause Detail:**

Entry 062 (2026-08-01) identified the mechanism but the fix was never built: D1-D4 had real, well-defined subtest logic in the prompt (each with its own points→score mapping and gates — mechanically identical in shape to D5-D8's C1-C6/P1-P6/R1-R6/T1-T6) but no MANDATORY SCORING PROCEDURE forcing the LLM to show its work in a parseable `[D_ audit: ...]` + `[D_ evidence: ...]` bracket. Two independent scans could read materially the same evidence and reach opposite pass/fail conclusions on a subtest, with nothing to catch the discrepancy — confirmed on AthenaHQ and Ahrefs (Entry 062) and again on Semrush this cycle (Marketing Intelligence Entry 062 addendum, 2026-08-03), the latter moving a score DOWN rather than up, confirming this is a bidirectional interpretation-consistency defect, not a one-directional under-reading bias.

**Resolution:** Extended the exact same MANDATORY SCORING PROCEDURE pattern D5-D8 already use to D1-D4:
- Added procedure blocks to `RUBRIC_SCORING_PROMPT` (`index.ts`) for all four dimensions, each instructing the LLM to emit `[D_ audit: ...]` and `[D_ evidence: ...]` brackets in the same machine-readable format D5-D8 use.
- `rubric-audit.ts`: extended `AUDITED_DIMENSION_NAMES` to cover all 8 dimensions (was D5-D8 only).
- Fixed the mark-pattern regex (`AUDIT_BLOCK_PATTERN`, `MARK_PATTERN`) to accept 1-2 letter subtest prefixes — D1 uses the two-letter "NS" prefix (NS1-NS6), unlike D2/D3/D4/D5-D8's single-letter prefixes (J/S/V/C/P/R/T). The original regex (`[A-Z]\d`) would have silently failed to match D1's format entirely.
- Made `mapPointsToScore` denominator-aware: D3 (Buyer & Budget Alignment) has only 5 subtests (S1-S5, scored per highest-priority segment per the existing D3 spec) with genuinely different thresholds (0-1→0, 2-3→1, 4-5→2) than every other dimension's /6 scale (0-2→0, 3-4→1, 5-6→2). **Important distinction preserved:** this is keyed off `dimensionNumber === 3`, not the raw effective denominator — D7's optional R5 mark can also legitimately be NA, dropping its own effective denominator to 5, but D7 must keep the standard /6-shaped thresholds even then. A naive "denominator === 5 → use D3's thresholds" check would have silently miscorrected D7's R5=NA case.
- D3's audit block represents the highest-priority segment's S1-S5 marks specifically (matching the convention D6/D7/D8's gate text already implies with phrases like "fails for the highest-priority segment"), while the reported "score" is the full dimension aggregation across all segments — documented explicitly in the new prompt section since D3's aggregation can diverge from what the highest-priority segment's own points would map to alone.
- D1's NS2 subtest is a confidence-only gate ("reduce confidence by 0.15... allow score 2 if other subtests justify it") — not a score-affecting gate the corrector needs to enforce. The prompt explicitly instructs the LLM not to cite NS2 in the audit block's gate field unless NS1 or NS3 (the two genuine score gates) are also binding.

**Known limitation, not fixed by this entry:** D1's code-side floor safety net (the "north star" branch of the score-0 override logic in `index.ts`, distinct from the shared `applyDigestFloor` helper D2-D8 use) replaces the LLM's entire rationale text with a fixed string when it fires, discarding any audit bracket the LLM may have produced. This dimension will report `auditParseFailed: true` on that specific code path (no bracket to find), which is a safe failure mode (flags `evidenceQuality: unverified`, applies no incorrect correction) but not an ideal one. D2/D3/D4's floor logic already uses the shared `applyDigestFloor` helper, which appends rather than replaces, so their floor cases are correctly recognized via the existing `FLOOR_MARKER_PATTERN` — only D1's floor path has this gap.

**Verification:** 49 rubric-audit unit tests pass (11 new, covering D1's two-letter NS prefix parsing, D3's 5-point scale including the D7-collision edge case, D1's NS1 hard-zero gate, D2's J2 hard-zero gate, and D4's multi-gate case). Full suite: 152 tests pass. Not yet verified against a live rescan — first real-world check should be a company already flagged for the D1-D4 interpretation-drift pattern (Semrush, AthenaHQ, or Ahrefs) to confirm the new audit blocks actually resolve the same-evidence-different-read cases those companies previously demonstrated.

**Pattern Tag:** `d1-d4-audit-block-extension`, `mandatory-scoring-procedure-parity`, `two-letter-subtest-prefix`, `denominator-aware-mapping`, `segment-audit-highest-priority`

---

### Entry 067 — August 3, 2026

| Field | Value |
|-------|-------|
| Company | Peec AI (peec.ai) |
| Version | 2026-08-02-pipeline-v38 |
| Dimension | All — evidence-set contamination; most visibly D1–D4 (unexplained score drop) and D7 (rubric-audit corrector fired correctly, but on a decoy page's audit block, not the real pricing page) |
| Subtest(s) | URL discovery/filtering — `priorityPatterns` substring false-positive, compounded by a missing content-path exclusion |
| V1 Score | v37 baseline: 10/16 — evidence set included real `/pricing` and `/pricing-agencies` |
| V2 Score | v38 isolated rescan: 6/16 — evidence set contained no genuine `/pricing` page at all, only two blog/content-section decoys |
| Root Cause | pipeline_miss — two compounding defects. (1) `/customer-io-test-site/` and `/mcp-use-cases/` are real, actively published content sections on peec.ai (blog articles, product use-case write-ups) with unusual path names that no existing exclusion pattern matched. `isShallowSameDomainPath()` grants blanket inclusion to any 1–3 segment same-domain path, so these consumed 7+ of 15 evidence slots on this scan alongside zero D4–D8 signal, the same dilution mechanism already logged for `/customers/*` pages (line ~1805 of this log). (2) Two of those articles' slugs — "pricing-update" and "pricing-fix" — coincidentally contain the substring "pricing", which matched `priorityPatterns`' `/\/pricing\b/i` (the `\b` word boundary fires on the following hyphen, not just on a path separator) and scored them at 1550, high enough to outrank ordinary pages and get pulled into the evidence set as if they were real pricing documentation. In this specific run, Firecrawl's `/map` also did not surface the genuine `/pricing` page at all (a discovery-layer miss consistent with Entry 059/061's established pattern), so with real pricing entirely absent from `allDiscovered`, the two decoys became the only pricing-adjacent evidence the LLM had to work with. |
| Caught By | Manual QA (Michelle + Claude Code) — the user flagged the v37→v38 score drop (10→6) as suspicious rather than accepting it as a genuine correction. SQL export of `pagesUsed` showed `["https://peec.ai/customer-io-test-site/pricing-update", "https://peec.ai/mcp-use-cases/pricing-fix", "https://peec.ai/pricing-agencies", "https://peec.ai"]` — no `/pricing` in the set. `npm run filter` and `npm run preview-urls` confirmed the scoring mechanics directly rather than inferring them from the rationale text alone. |
| Status | fix_specified — deployed as part of this entry; verified via `npm run filter` (decoys now excluded, `/pricing` and `/pricing-agencies` still included) and `npm run preview-urls` (evidence slots now filled by real `/product/*` pages instead of blog content) before commit |

**Root Cause Detail:**

The rubric-audit corrector (Entries 065/066, live since v38) worked exactly as designed on this scan — it caught a genuine cap-misapplied-as-floor case on D7 (declared 1 → corrected 0) and correctly left D8 alone (self-consistent). The corrector cannot be faulted for this result: it audits whatever evidence the scan handed it, and the scan hallucinated coherent-looking pricing evidence out of blog posts. This is a distinct, upstream failure mode from anything the corrector is designed to catch — garbage evidence in, mathematically-correct-but-meaningless audit out.

Two separate mechanisms compounded:
1. **Missing content-path exclusion.** No exclusion pattern matched `/customer-io-test-site/` or `/mcp-use-cases/`, both of which are literal path prefixes peec.ai uses for real content (guides, benchmark reports, product use-case pages). `/customer-io-test-site/` appears to be generated by Customer.io's content-hosting product — despite the misleading "test-site" name, it is not a QA artifact; it hosts genuinely published articles. `/mcp-use-cases/` is peec.ai's own product feature documentation (use cases for their Claude/Cursor/n8n MCP integration).
2. **`priorityPatterns` substring false-positive.** `/\/pricing\b/i` matches any occurrence of "/pricing" followed by a non-word character — including a hyphen. This is the same bug class already documented and fixed once before for `/\/developers?\b/i` incorrectly matching `developers.company.com` subdomains (see the comment at scrape-website/index.ts ~line 277) — that fix was an exclusion added ahead of the priority check, not a rewrite of the priority pattern itself, because the general pattern is relied upon elsewhere for legitimately-hyphenated pricing pages (e.g. peec.ai's own `/pricing-agencies`, which must keep matching).

**Resolution:** Fixed by adding two new `exclusionPatterns` entries — `/\/customer-io-test-site\//i` and `/\/mcp-use-cases\//i` — in `supabase/functions/scrape-website/index.ts`, mirrored in `tools/scraper-dev/filter-logic.ts`. Deliberately did **not** touch the general `/\/pricing\b/i` pattern, to avoid regressing legitimately-matching hyphenated pricing pages across other companies already scored under it. `ANALYSIS_VERSION` bumped to `2026-08-03-pipeline-v39`. `filter-logic-drift.test.ts` passes.

**Open question, not addressed by this fix:** the `\b`-boundary substring-match risk is generic — any company with a blog post literally titled with "pricing" in its slug, under a path this exclusion list doesn't yet know about, would trigger the same false positive. This fix closes the two confirmed instances; it does not close the underlying pattern class. Worth monitoring for recurrence on other companies before considering a more systemic fix (e.g., requiring `/pricing` to be a full path segment rather than any substring match).

**Pattern Tag:** `false-positive-pricing-match`, `content-path-evidence-dilution`, `priority-pattern-substring-bug`, `garbage-evidence-valid-audit`

---

### Entry 066 — August 2, 2026

| Field | Value |
|-------|-------|
| Company | Systemic — confirmed on Ahrefs, HubSpot, Peec AI (×2), Scrunch AI, Semrush, Similarweb (already Entry 064) across the Marketing Intelligence benchmark |
| Version | 2026-07-10-pipeline-v37 |
| Dimension | D7 (Overages), D8 (Safety Rails) — any dimension using a cap-type gate |
| Subtest(s) | Cap-gate application logic |
| V1 Score | Recorded totals: Ahrefs 11, HubSpot 11, Peec AI 10, Scrunch AI 10, Semrush 10 |
| V2 Score | Corrected totals: Ahrefs 10, HubSpot 10, Peec AI 8, Scrunch AI 9, Semrush 9 |
| Root Cause | gate_misfire — a "score capped at N" gate is being applied as "score = N" regardless of whether the raw points-to-score mapping already falls at or below N. Caps should only ever lower a score that would otherwise exceed them; here they're inflating scores that were already at or below the cap. |
| Caught By | Manual QA (Michelle + Claude Code) applying `process_benchmark_eval_qa.md` Step 2 systematically across all 11 companies' D5–D8 audit blocks, 2026-08-02 — Entry 064 (Similarweb) was the first individual instance; checking the full cohort revealed it as a repeating, identifiable pattern rather than a one-off |
| Status | monitoring 👀 — mechanism precisely isolated, no fix implemented |

**Root Cause Detail:**

Confirmed instances — cap gate cited, raw points already at or below the cap, score wrongly matches the cap value instead of the raw mapping, no `[Score floored...]` note present to justify the override:

| Company | Dimension | Raw points | Correct score | Recorded score |
|---|---|---|---|---|
| Ahrefs | D8 | 1/6 | 0 | 1 |
| HubSpot | D8 | 2/6 | 0 | 1 |
| Peec AI | D7 | 2/6 | 0 | 1 |
| Peec AI | D8 | 1/6 | 0 | 1 |
| Scrunch AI | D8 | 2/6 | 0 | 1 |
| Semrush | D8 | 1/6 | 0 | 1 |
| Similarweb | D7 | 2/6 (denominator also wrong, shown as /5) | 0 | 1 — Entry 064 |

**Confirmed correct behavior, for contrast** — proves the model CAN apply caps correctly when they're actually binding: OtterlyAI D6, Peec AI D6, and Semrush D6 all had 5/6 raw points (which maps to 2) correctly capped down to 1 by a genuinely-binding P3 gate. The defect only fires when the cap is cited but non-binding (raw score already ≤ the cap) — in that case the model appears to read the gate's mere presence as an instruction to set the score to the cap value, rather than recognizing the cap is irrelevant and the raw mapped score should stand.

Every confirmed instance is D7 or D8 specifically — both dimensions whose gate language is phrased as "cap final score at N," which may itself be part of the mechanism (a phrasing that reads more like an assignment than a ceiling). Worth checking whether other dimensions with differently-worded cap gates show the same failure once more scans accumulate.

**Separately noted, different mechanism:** Profound's D5 shows 5/6 raw points (which should map to score 2) recorded as score 1, with `gate=none` — no gate cited at all. This is NOT the same cap-misapplication pattern (no gate is involved), and moves the score in the opposite direction (too low, not too high). Flagged for tracking but not yet understood; corrected total for Profound is 12, not 11.

**Impact:** 7 of 11 companies in this benchmark cycle have a wrong recorded total right now, all systematically inflated by exactly 1 point per affected dimension except Profound's separate deflation. This is no longer a spot-check-worthy anomaly — it's the dominant, most consequential finding of this entire QA pass.

**Resolution:** Not yet implemented. Direction: server-side recomputation of the points→score mapping from raw P/F marks, applying any cited cap as `MIN(raw_mapped_score, cap_value)` rather than trusting the LLM's own arithmetic — this single change would have caught every instance in the table above. Given the gate-phrasing hypothesis, also worth testing whether rewording cap-gate language from "cap final score at N" to something less assignment-shaped (e.g., "score may not exceed N") changes the failure rate, as a cheaper interim mitigation while server-side validation is built.

**Addendum (2026-08-03, Resolution IMPLEMENTED + cross-category check):** The server-side corrector described in "Resolution" above shipped in pipeline-v38 (see Entries 065/067/068) and is now live. Separately, the "Every confirmed instance is D7 or D8 specifically" claim (line above) has been superseded — the corrector has since caught the identical `cap-misapplied-as-floor` and `unexplained-mismatch` patterns on D6 as well, both within Marketing Intelligence (HubSpot D6: 1→2, `unexplained-mismatch`, 2026-08-03) and outside it (see below). The mechanism isn't D7/D8-specific; it's a general property of any dimension using the "cap final score at N" gate phrasing or a plain points→score mismatch.

**Cross-category check (2026-08-03):** Tested whether Marketing Intelligence's correction rate (6 of 11 companies, 55%, corrector-confirmed) generalizes to a category scored under a much older engine version. Sampled 4 AI Agent Platform companies from the May 2026 benchmark (pipeline-v25) via individual one-off scans on v39 — explicitly NOT via `run-benchmark`, to avoid touching the original May `scan_results` rows (verified untouched after each scan; see `process-benchmark-end-to-end` for the safeguard method used).

| Company | May 2026 (v25) | v39 rescan | Corrections |
|---|---|---|---|
| Zapier | 13/16 | 15/16 | none |
| Relevance AI | 12/16 | 15/16 | none |
| Stack AI | 10/16 | 8/16 | D8: 1→0 (`cap-misapplied-as-floor`) |
| CrewAI | 9/16 | 10/16 | D6: 1→2 (`unexplained-mismatch`), D7: 1→0 (`cap-misapplied-as-floor`) |

**Findings:**
- **The correction mechanism is systemic, not category-specific.** 2 of 4 companies (50%) received at least one correction — nearly identical to Marketing Intelligence's 55% rate. This confirms the defect generalizes across categories and engine-version gaps (these companies were last scored on v25, three major versions before the corrector existed).
- **The dimension distribution does NOT concentrate on D8 outside Marketing Intelligence.** This sample hit D6, D7, and D8 once each — no single dimension dominated the way D8 did in Marketing Intelligence (6 of 6 corrections there were D8). The safer general claim is "any D5-D8 dimension has roughly even odds of carrying an uncaught error in a pre-v38 scan," not "D8 specifically is overstated everywhere."
- **Half the sample needed no correction at all**, and where score changed without a correction (Zapier, Relevance AI), it was driven by genuinely richer evidence on rescan (6-8 pages vs. whatever the May scan captured), not an engine defect.
- **Practical implication:** the May 2026 benchmark's published totals for other categories are likely mildly overstated on some D5-D8 dimension for roughly half of scored companies, but a correction pass — if ever done — needs to check all four dimensions per company, not just D8. Not yet checked: whether this same ~50% rate holds for AI Coding Assistant, AI Customer Support, AI Revenue Intelligence, or AI Sales Intelligence — this check used a single 4-company sample from one category.

**Pattern Tag:** `cap-gate-misfire`, `gate-as-floor-not-ceiling`, `systemic-score-inflation`, `d5-d8-general-not-d8-specific`, `cross-category-confirmed`

---

### Entry 065 — August 2, 2026

| Field | Value |
|-------|-------|
| Company | Conductor, HubSpot, Peec AI, Scrunch AI — all four D5–D8 dimensions missing the evidence-citation block, not just one |
| Version | 2026-07-10-pipeline-v37 |
| Dimension | D5, D6, D7, D8 for the four companies listed |
| Subtest(s) | Mandatory evidence-citation block presence (`[D_ evidence: ...]`) |
| V1 Score | N/A |
| V2 Score | N/A — scores may still be numerically consistent (see Entry 066 for the arithmetic-level check); this entry is specifically about citations being unverifiable, not about the numbers being wrong |
| Root Cause | prompt_drift — same failure Entry 055 first identified (audit block present, evidence block absent), now confirmed recurring at whole-company scale across a fresh benchmark cycle, two-plus versions after 055 was logged |
| Caught By | Manual QA (Michelle + Claude Code) applying `process_benchmark_eval_qa.md` Step 2 across all 11 Marketing Intelligence companies, 2026-08-02 |
| Status | monitoring 👀 — same unresolved recommendation as Entry 055 |

**Root Cause Detail:**

Entry 055 found this failure mode on isolated dimensions for one company (Relevance AI) and treated it as a possible one-off prompt-following lapse. Checking the full Marketing Intelligence cohort shows it recurring across *every* D5–D8 dimension for four separate companies (Conductor, HubSpot, Peec AI, Scrunch AI) — the `[D_ audit: ...]` block is present and well-formed, but the `[D_ evidence: ...]` block that names the specific field+page backing each pass/fail mark never appears, for any of the four dimensions, for any of these four companies. This means none of their D5–D8 subtest marks are independently verifiable — the audit-arithmetic check in Entry 066 could still be run on them (the P/F marks and points are visible), but there's no way to confirm those marks are actually backed by real evidence rather than holistic impression, which is the entire purpose the evidence block exists to serve.

This is not isolated to a hard case (Entry 055's original was Relevance AI, a company with a missing pricing page) — Conductor, HubSpot, Peec AI, and Scrunch AI all have decent evidence sets in this cycle. The missing block doesn't correlate with evidence scarcity; it looks like an inconsistent prompt-following failure that can happen regardless of how much evidence is available.

**Resolution:** Same open recommendation as Entry 055, still not implemented: treat an audit block without a matching evidence block as invalid, and either retry the dimension or flag the result for review rather than trusting the P/F marks as-is.

**Pattern Tag:** `missing-evidence-block`, `audit-line-unverifiable`, `whole-company-recurrence`

---

### Entry 064 — August 1, 2026

| Field | Value |
|-------|-------|
| Company | Similarweb (similarweb.com/packages/ai-search/) |
| Version | 2026-07-10-pipeline-v37 |
| Dimension | D7 (Overages and Risk Allocation) |
| Subtest(s) | D7 audit arithmetic — points-to-score mapping violated; subtest denominator miscounted |
| V1 Score | Prior scan (wrong product surface, see Entry 063): D7 audit `pts=3/6, gate=R4-cap, score=1` |
| V2 Score | Corrected-product rescan: D7 audit `[R1=P R2=F R3=F R4=P R5=F R6=F | pts=2/5 | gate=none | score=1]` |
| Root Cause | prompt_drift — same class as Entry 055: declared score doesn't match the audit block's own arithmetic, and no gate is cited to justify the discrepancy |
| Caught By | Manual QA (Michelle + Claude Code) applying `process_benchmark_eval_qa.md` Step 2 (audit-block compliance) to a fresh Similarweb rescan, 2026-08-01 |
| Status | monitoring 👀 — no server-side enforcement exists yet to catch this class of error |

**Root Cause Detail:**

All six R1–R6 subtests are explicitly marked (`P` or `F`, none `NA`), so the points denominator should be 6 — the audit declares `pts=2/5`, an internal miscount. Worse, 2 points under the documented mapping (0–2 pts → score 0, 3–4 → score 1, 5–6 → score 2) should produce **score = 0**, not the recorded `score = 1`. No `[Score floored to N...]` note is present to explain an override — contrast with D5 and D8 in this same scan, which correctly cite `[Score floored to 1 based on N evidence signals]` whenever that guardrail actually fires. Its absence here confirms this isn't a floor case; it's a plain arithmetic error. The scan's recorded total (9/16) is therefore itself wrong — a corrected D7 brings the true total to 8/16.

**Resolution:** Same open recommendation as Entry 055 — not yet implemented. Reinforces the case for server-side parsing of audit blocks: recompute the points→score mapping from the raw P/F marks rather than trusting the LLM's declared `score`, validate the subtest count against the expected denominator (6, or 5 only for D3 which has one fewer subtest), and reject/flag any declared score that doesn't match before accepting the block.

**Pattern Tag:** `audit-arithmetic-error`, `points-score-mapping-violation`, `d7-denominator-miscount`

---

### Entry 063 — August 1, 2026

| Field | Value |
|-------|-------|
| Company | Similarweb (similarweb.com) |
| Version | 2026-07-10-pipeline-v37 |
| Dimension | All — most visibly D4 (Value Unit); affects the whole evidence basis for the company |
| Subtest(s) | Evidence source selection — the canonical pricing-page probe found a different product line's pricing than the one relevant to this benchmark category |
| V1 Score | Scanned against bare domain (`similarweb.com`): canonical probe found Web Intelligence's general `/pricing` page, D4 rationale cited undefined "monthly visits" — D4 = 1/2, 25% confidence |
| V2 Score | Scanned against `similarweb.com/packages/ai-search/`: correctly cites AI Search's actual terms ("1 User", "150 tracked prompts") — D4 = 1/2, 35% confidence (score unchanged, but now grounded in the right product; independently verified via WebFetch that "tracked prompts" metering is genuinely undefined on the AI Search page — confirming D4=1 is now a legitimate ceiling, not a wrong-product artifact) |
| Root Cause | pipeline_miss — for multi-product companies, canonical `/pricing`/`/plans`/`/billing` probing and general `/map` discovery default to whichever pricing surface is easiest to find (often the flagship/oldest product line), with no mechanism to detect that a different, category-relevant product exists at a separate URL |
| Caught By | Manual QA (Michelle + Claude Code) applying `process_benchmark_eval_qa.md` Step 4 (evidence-fidelity cross-check) to Similarweb's Marketing Intelligence scan, 2026-08-01 — caught because the reviewer had direct product knowledge that Similarweb sells AI Search as a distinct package |
| Status | fix_specified — practical fix applied and verified for Similarweb specifically; systemic detection not yet implemented |

**Root Cause Detail:**

Similarweb sells multiple distinct product lines (Web Intelligence/traffic analytics, AI Search Intelligence, Sales Intelligence, etc.), each with its own pricing page and, in this case, genuinely different pricing *models* — Web Intelligence's public pricing is visits/usage-oriented, while AI Search is flat seat-based tiering by feature/data-depth ($99/$333/$542 per month, 1 user, zero usage metering). The scan seeded at the bare domain found and scored the wrong product's pricing entirely. This is a distinct failure mode from Entry 059 (a selected page failing to *resolve*) — here the wrong page resolved perfectly fine and produced a plausible-looking, product-mismatched score. It's also distinct from — and the mirror image of — the HubSpot AEO question raised earlier in this same benchmark cycle: HubSpot's AEO is a free bundled feature with no separate pricing at all, so narrowing its seed URL would not have helped. Similarweb's AI Search has genuinely separate commercial terms, so narrowing was exactly right. **This has to be checked per company; it cannot be resolved with a blanket rule either way.**

Notably, fixing this did **not** change Similarweb's total score (9/16 either way, before Entry 064's separately-found D7 arithmetic correction) — the value was making the score's basis accurate for the category, not moving the number. This is very likely not isolated to Similarweb: the Marketing Intelligence category's whole theme is legacy tools bolting AI-visibility features onto existing products, so Semrush's "AI Visibility Toolkit" and Ahrefs' "Brand Radar" are plausible candidates for the same issue — not yet checked.

**Resolution:** Fix direction (not yet implemented systemically): during company selection/seeding (`process_benchmark_end_to_end.md` Phase 0), check whether the category-relevant capability has its own dedicated pricing page distinct from the company's primary product, and seed `benchmark_companies.domain` at that specific page when it exists (same domain-path pattern already used for scrape-failure workarounds, repurposed here for product-surface correctness). No engine-level detection exists yet — this currently requires a human with product knowledge to catch. Added as a consideration to `process_benchmark_eval_qa.md` Step 4. Recommend checking Semrush and Ahrefs in this category for the same issue before finalizing the benchmark.

**Pattern Tag:** `product-surface-mismatch`, `multi-product-company`, `category-relevant-pricing-page`, `wrong-product-scored`

**Addendum (2026-08-02, Semrush and Ahrefs checked for the same issue):** Checking the rest of the Marketing Intelligence cohort sharpened the deciding rule beyond "does a separate pricing page exist." Semrush's AI Visibility Toolkit has its own dedicated page (`semrush.com/pricing/ai/`) — structurally similar to Similarweb — but should **not** get the same fix. Research confirmed it's explicitly sold as an *add-on to the flagship platform* (bundles into Semrush One, cross-sold alongside core SEO plans, marketed as a module within the broader toolkit), not a standalone competing product the way Similarweb's AI Search is (a distinct "package" with its own disconnected pricing model, no bundling into Web Intelligence at all). The real test: is the AI capability a genuinely separate product line, or an add-on within the flagship's own pricing story? Semrush is the latter — scoring the bare `semrush.com` domain is correct for this benchmark, which specifically groups Semrush into a "legacy platform bolting AI-visibility onto an existing product" bucket; evaluating the platform's whole commercial model, not the narrow add-on in isolation, is the right scope for that analytical purpose. Ahrefs' Brand Radar was checked too and turned out to be a different case entirely — see the Entry 062 addendum below.

**Decision rule, refined:** separate product line with its own disconnected pricing model (Similarweb) → reseed at the product-specific page. Add-on bundled into the flagship's own pricing/GTM (Semrush) → keep the bare domain. Add-on whose pricing lives on the SAME general page as the base plans (Ahrefs) → not a scoping problem at all, see Entry 062.

---

### Entry 062 — August 1, 2026

| Field | Value |
|-------|-------|
| Company | AthenaHQ (athenahq.ai) |
| Version | 2026-07-10-pipeline-v37 |
| Dimension | D4 (Value Unit) primarily; touches D5 (Cost Driver Mapping) framing |
| Subtest(s) | V1/V2 (unit definition, metering) — an evidence-utilization failure, not a subtest-logic gate misfire |
| V1 Score | Individual scan (10 pages, `/credit-calculator` in evidence): Value Unit 1/2 — rationale: "the definition and metering formula for 'credits' are not provided" |
| V2 Score | Isolated `run-benchmark` rescan (7 pages, `/credit-calculator` also in evidence): Value Unit 2/2 — rationale quotes "1 credit = 1 AI response" and the formula "prompts × locations × credits/response × days × 4.33 weeks" from the SAME page |
| Root Cause | evidence_snippet_selection — the same source page was present in both evidence sets; the LLM extracted and used its content inconsistently across independent runs |
| Caught By | Manual QA (Michelle + Claude Code) comparing an individual-scan PDF against a subsequent isolated `run-benchmark` rescan for the same company, while investigating a 9/16 vs. 14/16 total-score swing that survived the evidence-completeness explanation (see Entry 061) |
| Status | monitoring 👀 — mechanism identified, fix not yet implemented |

**Root Cause Detail:**

Two runs on AthenaHQ, both with `/credit-calculator` in their evidence set, produced opposite conclusions about whether a metering formula was publicly documented. The higher-scoring run (V2, 14/16 total) carried clean, well-formed `[D5 audit: ...]`/`[D5 evidence: ...]` blocks for D5–D8 with real field-level citations tied to quoted page content (`C2←prompts × locations × credits/response × days × 4.33 weeks@/credit-calculator`), and its gates applied correctly to the genuinely thin dimensions — Overages capped at 1/2 because R3/R4 failed, Safety Rails capped at 1/2 because T2/T6 failed. On its own terms, V2's audit trail is trustworthy: D5–D8 all show the MANDATORY SCORING PROCEDURE working as designed.

The defect surfaces specifically at D4. There is currently no equivalent mandatory audit/evidence-citation procedure for D1–D4 — the MANDATORY SCORING PROCEDURE audit blocks (per Entries 032/033/037) only cover D5–D8. Nothing forces the model to name the specific field and page backing a V1–V6 pass/fail the way C1–C6 or T1–T6 must. That gap is the likely mechanism: dimensions without a mandatory per-subtest citation requirement are more exposed to this kind of silent evidence-utilization drift, because a scoring pass can simply fail to surface a fact that's sitting in its own evidence set, with no structural check catching the omission.

**Resolution:** Fix direction (not yet implemented): extend the MANDATORY SCORING PROCEDURE audit/evidence-block requirement to D1–D4, starting with D4 (Value Unit) given this concrete failure case. Forcing an explicit per-subtest field+page citation for V1–V6, the same way C1–C6/T1–T6 are already required, would very likely have caught the individual scan's under-read of `/credit-calculator` before it reached the customer-facing report.

**Pattern Tag:** `evidence-utilization-drift`, `d4-audit-block-gap`, `same-evidence-different-read`

**Addendum (2026-08-02, Ahrefs — confirmed repeatable, not a one-off):** Checked Ahrefs (`ahrefs.com`) for the same pattern found on AthenaHQ. Its Brand Radar AI-visibility pricing is genuinely present on `ahrefs.com/pricing` — independently confirmed via direct fetch: "$199/mo" standalone base, "Basic $50/mo, Growth $100/mo, Scale $250/mo" custom prompt packages, "271M+ organic prompts" database. None of it appeared in either of two independent scans' D4/D5 rationale — both cited only base-toolkit terms (tracked keywords, crawl credits, users). A rescan (fresh scrape, cache cleared) reproduced the identical miss. Two independent scans missing the same real, present content in the same way upgrades this from "worth checking" to a confirmed, repeatable gap specific to this page — likely because Brand Radar's pricing sits in a secondary section of a page dominated by the main tier-comparison table, and the model's attention doesn't reliably reach it. No fix available without the D1–D4 audit-block extension (see Resolution above); retrying further isn't expected to help. Treat Ahrefs' current D4/D5 scores as a documented underestimate — its actual AI-visibility pricing transparency is better than the score reflects, not because of a pipeline miss but because of this citation gap.

**Addendum (2026-08-03, Semrush — third confirmed instance, opposite direction):** Semrush's v37→v39 rescan (part of the post-Entry-067 validation batch) dropped D4 (Value Unit) from 1 to 0 with near-identical raw evidence between runs — both cite "5 websites to monitor" and "500 keywords to track daily" from the same pricing page. v37's rationale read this as "clearly defined and linked to pricing tiers" (score 1); v39's rationale read the same facts as "not explicitly defined or named... not presented as distinct value units" (score 0). Unlike AthenaHQ (evidence present but silently unused) or Ahrefs (evidence present but never surfaced across two runs), this is the interpretation itself flipping on materially the same evidence — and unlike both prior instances, it moved the score down rather than up. Confirms this is a general D1–D4 consistency gap, not a one-directional "under-reading" bias, and not specific to any one company's page layout. Same root cause, same unimplemented fix direction (D1–D4 audit-block extension). No isolated rerun was pursued for Semrush specifically — a rerun cannot fix an interpretation-consistency defect, only the audit-block extension can.

---

### Entry 061 — August 1, 2026

| Field | Value |
|-------|-------|
| Company | Systemic — peec.ai, conductor.com, athenahq.ai (representative cases); observed across the full 11-company Marketing Intelligence benchmark run |
| Version | 2026-07-10-pipeline-v37 |
| Dimension | Evidence pipeline (all dimensions downstream); most visibly D3/D4 (pricing-page-dependent) |
| Subtest(s) | Page selection/resolution — same class of failure as Entry 059, with a newly confirmed causal variable |
| V1 Score | Original same-session batch runs: peec.ai 6/16 (1 page, no pricing), conductor.com 4/16 (1 page, no pricing), athenahq.ai 9/16 (1 page, no pricing) ×2 attempts |
| V2 Score | Isolated/later reruns: peec.ai 10/16 (4 pages, pricing present), conductor.com 9/16 (7 pages, pricing present), athenahq.ai 14/16 (7 pages, pricing present) |
| Root Cause | pipeline_miss — extends Entry 059's forced-page-resolution-gap mechanism; evidence discovery quality degrades measurably when many companies are scanned back-to-back in the same session, independent of per-company site characteristics |
| Caught By | Manual QA (Michelle + Claude Code) during the first Marketing Intelligence benchmark run, 2026-07-31/08-01 — pattern became undeniable after 3-for-3 isolated reruns all improved substantially |
| Status | monitoring 👀 — practical mitigation identified and validated; root layer not yet isolated |

**Root Cause Detail:**

Entry 059 established that forced-pricing pages are selected but not guaranteed to resolve, and that a single company's silent scrape failure falls below the 30%-unresolved retry threshold. Tonight's run extends that finding: the failure rate wasn't randomly distributed across the 11-company category — it was concentrated in whichever companies happened to be scanned while the session was busiest, and it reversed cleanly on isolated retry.

Alternative explanations were checked and ruled out:
- `x-benchmark-runner` header (set on all `run-benchmark`-triggered calls): confirmed via grep to be a no-op, never read anywhere in `scrape-website` or `analyze-company`.
- `maxPages`: the individual-scan UI path actually defaults to a *smaller* budget (15) than `run-benchmark` (20), so a larger crawl allowance isn't the explanation for the individual scan's better result.
- Domain path: AthenaHQ's successful isolated retry used the bare root domain, the same as its failed same-session attempts — the earlier `/plans`-path workaround wasn't what fixed it; isolation was.

Three candidate mechanisms, not yet distinguished without direct access to Firecrawl's own logs/dashboard:
1. Firecrawl account-level rate/concurrency limiting, degrading gracefully (returning a thin/partial `/map` result) rather than failing hard — would look exactly like what was observed.
2. Target-site bot-protection reacting more aggressively to a burst traffic pattern (many companies scraped in quick succession, possibly from a shared IP pool) than to an isolated single request.
3. Supabase edge-runtime resource contention across multiple concurrently-alive `EdgeRuntime.waitUntil` background tasks spanning several batches.

**Resolution:** Not yet implemented at the engine level. Practical mitigation adopted as process (see `process_benchmark_end_to_end.md` Phase 1b): batch in small groups (3 companies at a time) with `active`-flag scoping rather than triggering a full category at once. Possible code-level fixes for later investigation: stagger delay between batch iterations (not just within a batch), reduce `BATCH_SIZE` further, add a distinct retry path for near-empty `/map` results (separate from the existing 30%-unresolved threshold, which only fires on individual page failures, not degraded discovery), or inspect Firecrawl's actual rate-limit response headers to detect throttling directly instead of inferring it after the fact from thin results.

**Addendum (2026-08-01, extended testing across 8 companies):** The original resolution note said to "isolate the rescan of any company whose confidence stays low" — that guidance was too broad and has been replaced. Testing all 8 remaining moderate-confidence companies from the category (not just the 3 catastrophic misses that drove the original entry) surfaced a sharper, more useful pattern:

- **The dramatic-recovery effect is specific to the catastrophic-miss signature** (1–2 pages, pricing entirely absent) — 3/3 confirmed. Companies that already had 5+ pages and pricing present showed only marginal gains on isolation (3 of 4), and one (Similarweb) **regressed slightly** on an isolated rescan — confidence dropped from 45% to 38% with an *identical* page count (7) and total score (9). Moderate confidence with decent evidence present is more likely a genuine ceiling (real product-transparency gaps, or ordinary LLM confidence-calibration noise) than a fixable pipeline miss. Blanket-rescanning everything under a confidence threshold wastes time for no reliable gain past the catastrophic-miss cases.
- **Company-specific concurrency intolerance, distinct from general session load:** HubSpot failed 3/3 times whenever scanned alongside even *one* other company (a 3-company batch, a pair with Similarweb, a pair with Botify) but succeeded 2/2 times scanned fully alone. That's a much lower tolerance threshold than the category showed generally, and it sharpens candidate mechanism #2 above (target-site bot-protection reacting to concurrent-looking traffic) — a 2-company pairing is an unlikely trigger for broad Firecrawl account-level throttling, but a plausible trigger for one specific site's own WAF. Companies matching this fail-with-any-peer/succeed-alone signature should be flagged for permanent solo-only scanning in future cycles, not just kept out of large batches.
- **A single failure is not evidence of load-sensitivity.** Botify timed out once when paired with HubSpot, but had completed cleanly in the *previous night's full 11-company batch* — the heaviest concurrency of the entire run, the opposite of what a load-sensitivity theory predicts for it. One isolated retry (which succeeded, landing close to its original baseline) confirmed the timeout was transient noise, not a pattern. Don't generalize from n=1, even when a result superficially matches the shape of a real finding.

Refined decision rule now in `process_benchmark_end_to_end.md` Phase 1b: rescan-worthy = 1–2 pages AND no pricing found (expect dramatic recovery); low-value = 5+ pages AND pricing present regardless of confidence (expect flat/noisy results); permanent-isolation flag = fails multiple times specifically when not alone.

**Pattern Tag:** `session-load-degradation`, `batch-concurrency-evidence-thinning`, `isolated-rerun-recovery`, `catastrophic-miss-vs-moderate-ceiling`, `company-specific-concurrency-intolerance`

---

### Entry 060 — July 31, 2026

| Field | Value |
|-------|-------|
| Company | Grain (grain.com) — v37 repeatability test, Run 3 of 4 |
| Version | 2026-07-10-pipeline-v37 |
| Dimension | D6 (Pools & Packaging), D7 (Overages & Risk), D8 (Safety Rails) |
| Subtest(s) | `[D6 evidence: ...]` / `[D7 evidence: ...]` / `[D8 evidence: ...]` block scoping |
| V1 Score | N/A |
| V2 Score | Run 3: 11/16 (69%) — scores not disputed; output contamination is the defect |
| Root Cause | prompt_drift — the mandated evidence-citation block is emitted but mis-scoped into the customer-facing `rationale` field instead of the audit prefix, and no server-side stripping catches it |
| Caught By | Manual QA review of 4-run v37 repeatability test PDFs (Michelle + Claude Code, 2026-07-31) |
| Status | fix_specified |

**Root Cause Detail:**

Run 3's rendered PDF (page 3, Dimension Scores table) shows raw evidence-block syntax inside the customer-facing rationale prose for D6, D7, and D8 — literal fragments like `.unit_name@https://support.grain.com/en/articles/9253220-plans; P2packaging.exploration_offering@https://grain.com + ... P6tiers[Starter].overage_unit_price@user_input` (D6) and `.payment_methods@... + policies.overage_behavior@user_input; R6none]` (D7). The leading `[D6 evidence:` marker is missing but the tail (including a closing `]`) runs straight into the prose, so the block wasn't dropped (Entry 055's failure) — it was malformed/mis-scoped, and the rendering pipeline's bracket extraction couldn't isolate it. This is the same contamination class the v33 fix (`e43eaa8`, "Keep D5/D7 audit blocks out of customer-facing prose") addressed for D5/D7, now recurring on the v37 D6/D8 blocks — and it reached a generated customer-facing PDF, not just a log.

Also notable: the citations that leaked include multiple `@user_input` page paths (e.g., `P4pools[Free Notetaker seat].scope@user_input`, `policies.overage_behavior@user_input`) on a scan that received NO insider inputs — a direct violation of the D7 procedure's rule that `@user_input` may only be cited when insider inputs exist. Subtests passed on fabricated user_input citations should have been re-marked F per the procedure's own INVALID rule; nothing enforces this server-side.

**Resolution:** Fix direction (not yet implemented): server-side post-processing that (1) extracts/strips ALL bracketed audit and evidence blocks from `rationale` before render, tolerating malformed/partial markers; (2) rejects or re-marks subtests whose evidence entries cite `@user_input` on scans with no insider answers; (3) treats a malformed evidence block the same as a missing one (Entry 055's proposed retry/flag path). Same enforcement layer as Entries 055/057-C.

**Pattern Tag:** `audit-block-leak`, `customer-facing-contamination`, `fabricated-user-input-citation`, `d6-d8-evidence-block`

---

### Entry 059 — July 31, 2026

| Field | Value |
|-------|-------|
| Company | Grain (grain.com) — 4 identical fresh scans, same day, cache cleared between each |
| Version | 2026-07-10-pipeline-v37 (all four runs) |
| Dimension | Evidence pipeline (all dimensions downstream); D4 (Value Unit) and D3 (Buyer & Budget) most affected |
| Subtest(s) | Page selection/resolution; D4 safety-net override; D3 pricing-page-absent gate |
| V1 Score | Runs 1/4: 9/16 (56%) — /pricing absent, D4=0/2 |
| V2 Score | Runs 2/3: 11/16 (69%) — Run 2 had /pricing, Run 3 recovered D4=1/2 via FAQ safety net |
| Root Cause | pipeline_miss — forced pricing pages have mandatory *selection* but not mandatory *resolution*; a single failed scrape below the 30% retry threshold silently drops /pricing |
| Caught By | v37 repeatability test (4 runs, Michelle, 2026-07-31) designed to separate run variance from instrument drift (Entries 056/057) |
| Status | fix_specified |

**Root Cause Detail:**

Four identical reruns produced 5, 8, 8, and 6 pages analyzed; `grain.com/pricing` appeared in the evidence set in only 1 of 4 runs (Run 2). Result: a 2-point (12.5pp) total-score swing on identical input, driven by D4 flipping 0↔1 with the pricing page's presence. `model_type_l1` was "hybrid" in all four runs — Entry 057's classification-flip hypothesis was tested and NOT confirmed as the variance driver in this experiment (the architecture risk stands; it just isn't what moved these runs).

Mechanism, traced in `scrape-website/index.ts`:
1. Canonical probe (line ~1243) correctly force-adds `/pricing`, `/plans`, `/billing` to the scrape list, prepended so the page-budget slice can't cut them. Selection is guaranteed.
2. All pages then scrape concurrently via `Promise.all`. An individually failed `/pricing` fetch (timeout, Firecrawl rate limit, empty render) is marked unresolved and silently dropped. The retry pass fires only when ≥30% of ALL pages are unresolved — 1 failure in 8 pages (12.5%) gets zero retries, no flag, no report annotation.
3. `/pricing` is the page MOST likely to fail: it carries the heaviest scrape config (waitFor:3000 for accordions + LLM structured-extraction call on a 30s budget) while sitting in the concurrent burst most exposed to rate limiting. Back-to-back reruns likely aggravated this.
4. Compounding gate failure: per methodology, D3 (Buyer & Budget) must auto-score 0 when the primary pricing page is absent from the evidence set. Runs 1, 3, 4 all scored D3=2/2 with no /pricing analyzed — the Pricing Page Assertion Check only regex-detects the LLM *claiming* "no pricing page"; it never verifies evidence-set membership. Run 1 scored D3=2/2 from 5 pages containing no pricing surface at all.
5. Working-as-designed note: Run 3 recovered D4 to 1/2 without /pricing via the documented FAQ safety-net override — that mechanism functioned correctly and masked the pipeline miss rather than causing it.

Related history: v31 (`fb26e85`) fixed Firecrawl /map ordering nondeterminism — that fix addressed *discovery* variance. This is *resolution* variance, a distinct leak the v31 fix never covered.

**Resolution:** Fix direction (not yet implemented): (1) per-page retry with URL-variant fallbacks for canonical-probe and community-evidence URLs regardless of the 30% threshold; (2) hard flag on the scan result (and report) when a forced page fails to resolve — a scan without /pricing should say so, not silently proceed; (3) D3 gate should check evidence-set membership directly (deterministic, server-side), not rely on LLM self-report; (4) consider serializing or jittering the scrape batch to reduce rate-limit exposure on the heavy pricing fetch.

**Pattern Tag:** `forced-page-resolution-gap`, `pricing-page-drop`, `retry-threshold-blind-spot`, `d3-gate-not-enforced`, `run-variance`

**Addendum (2026-07-31, Run 5 of 5):** A fifth same-day rerun scored **12/16 (75%) on 12 pages** — the most complete evidence set of any run, including `/pricing` AND two support-article deep links (`support.grain.com/.../how-to-purchase-a-grain-plan`, `.../which-grain-plan-is-right-for-me`) absent from all four prior runs. This score is an exact match to the May 2026 benchmark score, independently confirming both scans converge on the same result once evidence is complete — see the new Grain Calibration Anchor entry below. This is the control case that isolates the variable: it confirms the scoring logic itself is reproducible, and evidence-set completeness (not instrument drift, not classification variance) is the dominant driver of the score spread observed across Runs 1–5 (9, 11, 11, 9, 12 out of 16). Also confirms D7=1/2 is the correct structural-ceiling outcome for a documented "Overage Policy: N/A" seat-based product, not a scoring defect — worth remembering given the original question that started this investigation thread. Open question still unresolved: why page count/resolution varies so widely run-to-run (5 to 12 pages) on identical input — that's the remaining piece of the fix in items 1–4 above.

---

### Entry 058 — July 31, 2026

| Field | Value |
|-------|-------|
| Company | Systemic — affects every scan (surfaced during Grain May-vs-July investigation) |
| Version | 2026-07-10-pipeline-v37 (mechanism present since 3-pass merge was introduced, v23+) |
| Dimension | All — narrative sections (strengths, weaknesses, trust breakpoints, recommended focus) |
| Subtest(s) | N/A — merge logic, not subtest logic |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | other — 3-pass merge artifact: narrative sections always come from Pass 1, even when Pass 1 lost the majority vote |
| Caught By | Code review of the 3-pass merge (Michelle + Claude Code, 2026-07-31) |
| Status | fix_specified |

**Root Cause Detail:**

In the 3-pass merge ([index.ts:2364-2411](supabase/functions/analyze-company/index.ts)), the winning dimension score and rationale come from the highest-confidence pass in the majority group. But `strengths`, `weaknesses`, `trustBreakpoints`, and `recommendedFocus` are taken unconditionally from Pass 1 ([index.ts:2483-2503](supabase/functions/analyze-company/index.ts)). When Pass 1 is the outlier vote on a dimension, the report's narrative describes reasoning that lost the vote — e.g., a trust breakpoint premised on D7=0 while the published score is D7=1. The only existing guard is filtering out weaknesses for dimensions whose stabilized score is 2/2; breakpoints and recommendedFocus have no guard at all, and weaknesses premised on the wrong *rationale* (rather than a 2/2 score) pass through. This produces reports whose reasoning visibly contradicts their own scores — one of the two inaccuracy classes reported on 2026-07-31.

**Resolution:** Fix direction (not yet implemented): source narrative sections from the same pass that won each dimension's vote, or generate them in a post-merge step that takes the stabilized scores as input. At minimum, extend the 2/2 weakness guard to trustBreakpoints and recommendedFocus.

**Pattern Tag:** `merge-artifact`, `narrative-score-mismatch`, `pass1-narrative-bias`

---

### Entry 057 — July 31, 2026

| Field | Value |
|-------|-------|
| Company | Systemic — observed via Grain (grain.com) July individual scan |
| Version | 2026-07-10-pipeline-v37 (classification single-pass since v18 classifier consolidation) |
| Dimension | D5, D6, D7, D8 — every dimension with PRICING MODEL CATEGORY AWARENESS overrides |
| Subtest(s) | D5 C1/C4/C5/C6, D6 P3, D7 R1/R2/R3/R6 + overage_behavior gate, D8 T1/T2/T3/T6 |
| V1 Score | Grain May benchmark: 12/16 (75%) |
| V2 Score | Grain July individual scan: significantly divergent (exact row pending DB pull) |
| Root Cause | other — architecture: the entire seat-based override block is gated on `model_type_l1` from a SINGLE un-voted LLM profile pass; a one-run classification flip silently toggles ~15 subtest interpretations |
| Caught By | Manual QA review of Grain May-vs-July reports (Michelle) + code trace (Claude Code, 2026-07-31) |
| Status | fix_specified |

**Root Cause Detail:**

**(A) Classification is a single point of failure.** The 3-pass majority vote covers only the scoring call ([index.ts:2332-2336](supabase/functions/analyze-company/index.ts)). The company-profile extraction that produces `model_type_l1` is one un-voted call ([index.ts:2130](supabase/functions/analyze-company/index.ts)), and Gemini 2.5 Flash at temperature 0 is not bit-deterministic. The scoring prompt's PRICING MODEL CATEGORY AWARENESS block ([index.ts:107-131](supabase/functions/analyze-company/index.ts)) keys every seat-based override on `Pricing Model == "access"`. If a run classifies Grain as `hybrid` (plausible: free-plan "45 minutes per meeting" / "30-day history" limit language pattern-matches consumption signals), the harsher hybrid rule applies — "the lower-passing component is binding" for D7 R1–R6 — and a pure seat product gets interrogated for metered-overage mechanics it doesn't have. This is the suspected mechanism behind reasoning output that demands limit-behavior explanations from a seat-based product whose upgrade path is already documented (pricing table + FAQ stating no overages, no credits).

**(B) The deterministic classifier is dead code.** `classifyModelType.ts` (352 lines, regex-based, fully deterministic, with hybrid detection and confidence scoring) is not imported anywhere in `index.ts` since the v18 single-LLM-classifier consolidation. The one component that would make the override switch reproducible run-to-run is unused.

**(C) Even when classification is correct, override application is prompt-only.** Entry 055 documents the model misapplying D7's R4-fail heuristic as an unconditional cap and skipping the mandated evidence block under v37 — no server-side code parses the audit line, recomputes points→score, or verifies that overrides fired (`auto(seat-based)` entries). Score = whatever the LLM asserts.

**Resolution:** Fix direction (not yet implemented, ordered by leverage): (1) reinstate `classifyModelType.ts` as a deterministic validator/fallback — when LLM classification disagrees with the deterministic classifier or confidence < 0.50, flag or use the deterministic result; (2) run classification through the same 3-pass vote as scoring; (3) per Entry 055's working theory, enforce audit/evidence blocks server-side and recompute gate arithmetic in code rather than trusting LLM-asserted scores. Verification before fixing: pull both Grain scan rows and compare `model_type_l1`, `ANALYSIS_VERSION`, and D7 audit/evidence lines; run `npm run diff-pages grain.com`.

**Pattern Tag:** `classification-single-pass`, `override-gating-flip`, `dead-code-deterministic-classifier`, `seat-based-misinterpretation`

**Addendum (2026-07-31, post 4-run repeatability test):** The classification-flip hypothesis was tested — `model_type_l1` came back "hybrid" in all 4 v37 reruns, so classification variance was NOT the driver of the observed Grain score swing (that was the forced-page resolution gap, Entry 059). The architecture risk documented here stands (single un-voted pass gating ~15 subtest interpretations), but note the separate question it raises: "hybrid" was stable for a product that is arguably pure seat-based — whether that classification is *correct* (vs. merely consistent) is unresolved and directly controls which D5–D8 override rules apply. See Entry 059 for the confirmed variance mechanism.

---

### Entry 056 — July 31, 2026

| Field | Value |
|-------|-------|
| Company | Grain (grain.com) — representative case; applies to all May-benchmark companies rescanned post-v27 |
| Version | May benchmark: ~v23–v25 → July individual scan: 2026-07-10-pipeline-v37 |
| Dimension | All 8 — instrument-level, not dimension-specific |
| Subtest(s) | N/A |
| V1 Score | May 2026 benchmark: 12/16 (75%), top of AI Revenue Intelligence category |
| V2 Score | July 2026 individual scan: significantly divergent (exact row pending DB pull) |
| Root Cause | other — instrument drift: cross-version score comparison treated as company drift; ≥12 pipeline versions (v25→v37) changed both evidence extraction and scoring rules between the two scans |
| Caught By | Manual QA review of Grain May-vs-July reports (Michelle, 2026-07-31) |
| Status | fix_specified |

**Root Cause Detail:**

A May benchmark score and a July individual scan are outputs of two different measuring instruments. Between v25 and v37: v27 locale-page filtering, v30 forced D7 subtest arithmetic, v31 Firecrawl /map rate-limit nondeterminism fix (May scans predate this — May's evidence sets had a live page-count randomness source), v32/v33 per-subtest evidence justification for D7 R4/R5 + D5 C1–C6, v35 HTML-attribute leak fix, v36 homepage double-scrape fix, v37 D6/D8 mandatory scoring procedures. "No noticeable evidence differences" in the rendered reports does not establish identical model input — char budgets, page priority, dedup, and locale filtering all changed what entered the context window. Score deltas across versions cannot be attributed to the company without controlling for the instrument. Note the Calibration Anchors section exists for exactly this failure mode but contains no Grain anchor, and no anchor check runs automatically on version bumps.

**Resolution:** Fix direction (not yet implemented): (1) for any benchmark-to-benchmark or benchmark-to-scan comparison, re-score the prior cohort under the current ANALYSIS_VERSION before claiming movement — never compare raw scores across versions; (2) store `ANALYSIS_VERSION` prominently on every published report so cross-version comparisons are visible at review time; (3) add Grain to Calibration Anchors once the July divergence is root-caused (see Entry 057); (4) consider an automated calibration-anchor regression check on each version bump. Verification: `npm run diff-pages grain.com` + pull both scan rows for per-pass `[3-pass]` logs and audit lines.

**Pattern Tag:** `instrument-drift`, `cross-version-comparison`, `benchmark-comparability`, `calibration-anchor-gap`

---

### Entry 055 — July 10, 2026

| Field | Value |
|-------|-------|
| Company | Relevance AI (relevanceai.com) |
| Version | 2026-07-10-pipeline-v37 (first production scan after D6/D8 MANDATORY SCORING PROCEDURE added) |
| Dimension | D5 (Cost Driver Mapping), D6 (Pools & Packaging), D7 (Overages & Risk), D8 (Safety Rails) |
| Subtest(s) | D7 gate logic (R4/R5); D8 T1, T3, T4, T6; missing `[D_ evidence: ...]` block, all four dimensions |
| V1 Score | N/A — not a rescan, first scan under v37 |
| V2 Score | 13/16 (81%) — D5=1/2 D6=2/2 D7=1/2 D8=2/2 (D7 and D8 both suspected mis-scored, see below) |
| Root Cause | prompt_drift — model skips the mandated per-subtest evidence-citation block, and independently misapplies D7's R4-fail heuristic as an unconditional cap |
| Caught By | Manual QA review (Michelle + Claude Code, 2026-07-10) of the first scan run under the new D6/D8 audit-block procedure |
| Status | monitoring 👀 — logged for tracking; fix not yet implemented |

**Root Cause Detail:**

**(A) The mandatory `[D_ evidence: ...]` block is missing across the board, not just on the newly-added dimensions.** The D5/D6/D7/D8 MANDATORY SCORING PROCEDURE requires two bracketed lines per dimension: an `audit` line (step 5, P/F marks + points + score) and an `evidence` line (step 6, per-subtest field+page-path citations — the actual anti-reuse mechanism). On this scan, only the `audit` line appears in the rendered "Subtest audit" panel for all four dimensions ([DimensionCard.tsx:99-112](src/components/DimensionCard.tsx:99) renders every bracket [rationale.ts](src/lib/rationale.ts:6) finds, so this isn't a display bug — the model simply never emitted the evidence bracket). Without it, the P/F marks are unverifiable; nothing forces per-field citation discipline at inference time, which defeats the purpose of today's D6/D8 addition.

**(B) D7 audit line is internally inconsistent — points don't match the declared score.**
`[D7 audit: R1=P R2=P R3=P R4=F R5=P R6=P | pts=5/6 | gate=none | score=1]`
R5=P means this is the enterprise segment. Per the dimension's own points-to-score mapping, 5–6 points → score 2. The D7 procedure's step 3 explicitly carves out this exact case: *"if R4 fails, at most 4 of the 5 non-enterprise subtests can pass... **unless an enterprise segment independently reaches 5–6 points**"* ([index.ts:1135](supabase/functions/analyze-company/index.ts:1135)). This scan hit 5/6 with R4 as the only failure — the stated exception should apply, score should be 2. Instead the engine reported score=1 with `gate=none` (no gate cited to justify the cap). The model appears to be pattern-matching "R4 fail → cap at 1" as an unconditional rule and ignoring its own written exception.

**(C) D8's `pts=6/6 → score=2` looks like a genuine over-pass, not a false alarm.** Checked each PASS against the evidence panel actually shown:
- T1 (budget/usage caps) — only alert and balance-counter quotes exist; no evidence names an actual cap (hard stop, admin-set spend limit). Alerts are T2's evidence, not T1's.
- T3 (pre-spend estimation) — the credits counter shows *current remaining balance*, not a pre-spend cost estimate/calculator (`estimation_surface`).
- T4 (breakdown) — the counter is a single running total (`dashboard_total`); no `breakdown_level` (by_project/by_user/by_workflow) evidence exists, which T4 requires.
- T6 (risk-limiter rail) — SOC 2/SSO/RBAC/audit logs are compliance/access surfaces, not the `rate_limit | concurrency_limit | retry_limit | circuit_breaker | kill_switch | approval_gate` enum T6 requires. Nothing quoted names a technical rail.
- T2 and T5 look legitimately supported (T5's RBAC + audit_logs are both explicitly named on the security page evidence).

If T1/T3/T4/T6 are corrected to F, D8 drops from 6/6 to 2/6 — score 0, not 2. That's a 2-point swing on the 16-point total, and it's the exact compound-condition-citation-reuse failure mode the D5/D7 fix (and today's D6/D8 extension) was built to catch — just surfacing on generic "usage alerts" and "SOC 2 compliant" language instead of the original "usage limits"/"Enterprise Pricing" case.

**(D) D6's P4 (pool scope matches org/workspace, shared_pool) is also unsupported by anything in its evidence panel**, though less clear-cut than D8's issues — worth a second look once (A) is fixed and a real per-subtest evidence line exists to check against.

**Working theory:** prompt instructions alone aren't forcing step 6 to run — the model treats the evidence block as droppable, so nothing stops it from holistically judging "strong safety rails" for T1/T3/T4/T6 even though field-level evidence doesn't exist for those specific fields. Tightening the wording again probably won't fix a step the model is already skipping outright; likely needs a post-processing check in `index.ts` that treats an `audit` block without a matching `evidence` block as invalid (retry the dimension or flag for review) rather than trusting the P/F marks as-is.

**Resolution:** Not yet implemented — logged for tracking per user request before deciding on a fix approach.

**Pattern Tag:** `missing-evidence-block`, `audit-line-unverifiable`, `d7-r4-gate-misapplication`, `d8-compound-condition-overpass`

---

### Entry 054 — May 20, 2026

| Field | Value |
|-------|-------|
| Company | Lovable (lovable.dev), Cursor (cursor.com) |
| Version | 2026-05-05-pipeline-v21 (original) → rescan 2026-05-20 |
| Dimension | D2 (ICP), D4 (Value Unit), D6 (Overages), D7 (Safety Rails), D8 (Evidence Coverage) |
| Subtest(s) | Evidence snippet selection |
| V1 Score | Lovable: 11/16 (69%) — D1=1 D2=1 D3=2 D4=2 D5=1 D6=2 D7=1 D8=1; Cursor: 12/16 (75%) — D1=1 D2=2 D3=2 D4=1 D5=1 D6=2 D7=1 D8=2 |
| V2 Score | Lovable: 14/16 (88%) — D1=1 D2=2 D3=2 D4=2 D5=1 D6=2 D7=2 D8=2; Cursor: 13/16 (81%) — D1=1 D2=2 D3=2 D4=2 D5=1 D6=2 D7=1 D8=2 |
| Root Cause | evidence_snippet_selection — scraper fed engine misleading excerpts from pages containing both favorable and unfavorable evidence |
| Caught By | Manual review (Michelle, 2026-05-20/21) — score jumps triggered investigation |
| Status | corrected ✅ (benchmark updated: Lovable 14/16, Cursor 13/16) |

**Root Cause Detail:**
Lovable's `docs.lovable.dev/introduction/plans-and-credits` page documents two distinct credit types: (1) daily free credits for paid users (do not accumulate day to day) and (2) monthly plan credits (roll over at end of billing cycle). The original May benchmark scan surfaced the daily credits snippet ("Unused daily credits will not accumulate from day to day"), and the engine interpreted this as a negative signal for overages/risk allocation, suppressing D6-adjacent scoring. The rescan surfaced the monthly rollover snippet instead, which correctly reflects Lovable's credit rollover policy.

Similar pattern on D2: the rescan found `docs.lovable.dev` pages with explicit ICP segments ("Individual builders - Founders and entrepreneurs", "Product, design, and go-to-market teams") and `lovable.dev/solutions` that the original scan either missed or deprioritized.

D7 and D8 also improved (1→2 each) with evidence from the same `docs.lovable.dev` pages. The original scan had the same source pages available but selected less relevant snippets.

**Cursor detail:** D4 (Value Unit) went from 1→2. The old scan surfaced "model usage" language but the engine flagged "precise definition and metering formula for 'model usage' are not publicly available." The rescan extracted more complete evidence from the same pricing page including on-demand usage details and arrears billing terms. Same pattern: right page, wrong snippet.

**Key finding:** Neither company changed their website or policies between scans. The improvements are entirely attributable to which snippets the scraper extracted from pages that contain mixed-signal content. This means the original scores were under-scores, not that the new scores are over-scores.

**Broader risk:** Any company whose key evidence pages contain both favorable and unfavorable language (e.g., a credits page documenting both non-accumulating daily credits AND rollover monthly credits) is vulnerable to this same snippet selection variance. The engine scores what it sees — if the scraper feeds it the wrong excerpt from the right page, the score is suppressed silently.

**Affected companies (potential):** Unknown. Any company in the May benchmark could have the same issue. Most likely to affect companies with complex, multi-section docs pages where credit/pricing policies vary by plan type or usage tier.

**Recommended fixes:**
1. Scraper: when a page matches multiple evidence-relevant sections, extract all sections rather than a single excerpt
2. Engine: when evidence from a page produces a negative signal, check whether other sections of the same page contain countervailing evidence
3. QA: flag any rescan with a 3+ point delta for manual review before accepting

**Pattern Tag:** `evidence-snippet-selection`, `mixed-signal-page`, `silent-underscore`

---

### Entry 053 — May 14, 2026

| Field | Value |
|-------|-------|
| Company | JetBrains (jetbrains.com) |
| Version | 2026-05-13-pipeline-v25 |
| Dimension | All — especially Buyer & Budget, Value Unit, Pools & Packaging |
| Subtest(s) | Multiple |
| V1 Score | 6/16 |
| V2 Score | 6/16 (no improvement despite new evidence) |
| Root Cause | scorer — high-value pages analyzed but not cited in any dimension |
| Caught By | Manual review (Michelle, 2026-05-14) |
| Status | partially fixed ✅ (pipeline-v26) |

**Root Cause Detail:**
Two interleaved issues on `jetbrains.com`:

1. **Scorer attention dilution (fixed v26):** When pages ARE scraped with content, irrelevant help docs (CLion accessibility, apache-derby, etc.) consumed the same token budget as high-value pages, diluting scorer attention. Fixed by content-based scoring in `scorePagePriority`: economic content boost (+300/+600), trust content boost (+200/+400), help/docs two-tier (evidence-rich +900, generic +100), thin page penalty (-200/-400). Verified working on Backstory (`/platform/trust-security` now cited as #1 source).

2. **JS-rendered pricing page (open):** JetBrains `/ai-ides/buy` renders pricing tiers, dollar amounts, and feature matrix via client-side JavaScript. Firecrawl returns only the page shell (title "JetBrains AI Plans & Pricing" + navigation link) with no pricing content. The scraper selects the URL correctly but the resolved page is empty, so it's filtered out or contributes nothing. This is intermittent — earlier scrapes captured full content, later ones did not. Accepted as a scraper limitation for now; JetBrains score stays at 6/16.

**Fix (pipeline-v26):** Content-based scoring in `scorePagePriority` + `/buy` added to pricing URL patterns in both scraper and scorer.

**Open:** JS-rendering reliability for community_evidence URLs. Potential future fix: Firecrawl `waitFor` parameter for community URLs.

**Pattern Tag:** `pages-analyzed-not-used`, `multi-product-domain-noise`, `js-rendered-content`

---

### Entry 052 — May 13, 2026

| Field | Value |
|-------|-------|
| Company | Kore.ai |
| Version | 2026-05-13-pipeline-v24 |
| Dimension | Safety rails and trust surfaces |
| Subtest(s) | Evidence citation |
| V1 Score | 1/2 |
| V2 Score | 1/2 |
| Root Cause | presentation — duplicate evidence citations in 3-pass merge |
| Caught By | Manual review (Michelle, 2026-05-13) |
| Status | open 🔴 |

**Root Cause Detail:**
Safety Rails dimension shows 6 evidence blocks but only 3 are unique — the bottom 3 are truncated repeats of the top 3. The 3-pass majority vote system merges evidence from all passes into the final output without deduplicating. When multiple passes cite the same page and quote, duplicates appear in the report. This is a cosmetic/presentation issue — scoring is not affected since the majority vote operates on scores, not evidence. Fix: deduplicate evidence by (url + quote) before writing to the final output.

**Pattern Tag:** `duplicate-evidence-citations`

---

### Entry 051 — May 13, 2026

| Field | Value |
|-------|-------|
| Company | All |
| Version | 2026-05-13-pipeline-v22 |
| Dimension | N/A — performance |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | other — scan latency regression |
| Caught By | Manual testing (Michelle, 2026-05-13) |
| Status | open 🔴 |

**Root Cause Detail:**
Scan time increased from ~1 minute to over 2 minutes after pipeline-v22 deployment. Pipeline-v22 added retry logic (up to 2 attempts) to `callLovableAI()`, which could add latency on retries. However, the increase appears on successful first-attempt scans as well — retry alone doesn't explain the full regression. Possible contributors: Gemini 2.5 Flash gateway latency, larger prompt payloads from improved page selection, or Firecrawl scrape time. Needs profiling.

**Pattern Tag:** `scan-latency-regression`

---

### Entry 050 — May 13, 2026

| Field | Value |
|-------|-------|
| Company | Forethought (81%→50%), Sierra (38%→25%) |
| Version | 2026-05-13-pipeline-v22 |
| Dimension | Multiple — Value Unit, Buyer Budget, North Star, ICP |
| Subtest(s) | Multiple |
| V1 Score | Forethought 13/16, Sierra 6/16 |
| V2 Score | Forethought 8/16, Sierra 4/16 |
| Root Cause | calibration — scorer variance across runs on identical page sets |
| Caught By | Benchmark rescan QA (Michelle, 2026-05-13) |
| Status | open 🔴 |

**Root Cause Detail:**
Both companies were rescanned with the same pages available (community_evidence URLs included and confirmed in pages analyzed). Forethought dropped from 81% to 50%: Value Unit went from 1/2 to 0/2 ("not explicitly defined"), Buyer Budget from 2/2 to 1/2. Sierra dropped from 38% to 25%: North Star from 2/2 to 1/2, ICP from 2/2 to 1/2. No prompt or scoring logic changes between runs — same pipeline version for the "before" runs. The model (Gemini 2.5 Flash via Lovable AI Gateway) is interpreting the same evidence differently across runs. Temperature is set to 0.1, which should minimize but doesn't eliminate variance.

Potential fixes: (1) reduce temperature to 0, (2) add scoring anchor examples to the prompt, (3) run multiple scoring passes and take median/mode, (4) add explicit calibration criteria for score thresholds.

**Pattern Tag:** `scorer-variance-same-pages`

---

### Entry 049 — May 13, 2026

| Field | Value |
|-------|-------|
| Company | Multiple (Sierra, Amplemarket, CrewAI, Relevance AI, Gong, Devin, Amazon Q, JetBrains, others) |
| Version | 2026-05-05-pipeline-v21 |
| Dimension | All — page selection, not scoring |
| Subtest(s) | N/A |
| V1 Score | Varies (low — often 1-3 pages used) |
| V2 Score | Varies (higher — all analyzed pages used after manual URL addition) |
| Root Cause | pipeline_miss — pages analyzed but not selected for scoring; adding one URL via insider prompts causes all analyzed pages to suddenly appear in "pages used" |
| Caught By | Manual benchmark QA review (Michelle, 2026-05-12) |
| Status | monitoring 👀 |

**Root Cause Detail:**
During Phase 1 benchmark QA, a recurring pattern was observed across 10+ companies: the scraper discovers and analyzes 8-15 pages, but only 1-3 are selected for scoring. When the user manually adds one relevant URL (e.g., a trust center or security page) via the app UI's insider prompts, the rescan suddenly uses all analyzed pages, not just the added one. Scores jump significantly (e.g., Amplemarket 31→75, Devin 18→75, Relevance AI 69→94).

The page selection logic uses a 100K char budget with priority scoring. The bug may be related to how the rerun path reprocesses the page set when insider answers are provided, potentially changing priority ordering or content assembly. However, the bug has not reproduced in the last 3-4 runs as of May 13.

Added diagnostic logging in pipeline-v22: dropped pages now logged with priority score and char count to detect recurrence.

**Pattern Tag:** `pages-analyzed-not-used`

---

### Entry 048 — April 22, 2026

| Field | Value |
|-------|-------|
| Company | ZoomInfo.com |
| Version | 2026-04-22-pipeline-v17 |
| Dimension | N/A — URL filter / deduplication |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | pipeline_miss — same-URL query-string variants bypassing dedup |
| Caught By | Manual review of Pages Analyzed list |
| Status | implemented ✅ |

**Root Cause Detail:**
`www.zoominfo.com/about/payments` appeared 4 times in the Pages Analyzed list. `normaliseForDedup()` strips `#:~:text=` anchors but preserves all other hash fragments (by design — FAQ section anchors like `#faq-credits` reveal genuinely different JS-rendered content). ZoomInfo links to `/about/payments` from multiple places with different section anchors (`#creditcard`, `#invoice`, `#bank-transfer`, etc.), each producing a distinct dedup key and consuming a separate slot. Unlike pricing FAQ anchors, billing page section anchors do not reveal different content.

**Resolution:**
For paths matched by `BILLING_DEDUP_PATHS` in `normaliseForDedup()`, strip both query params AND hash fragments before key comparison. Billing support pages have no section-partitioned content that would justify separate slots.

**Pattern Tag:** `dedup-query-param-billing-page`

---

### Entry 047 — April 22, 2026

| Field | Value |
|-------|-------|
| Company | ZoomInfo.com |
| Version | 2026-04-22-pipeline-v17 |
| Dimension | N/A — URL filter |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | pipeline_miss — product database pages with pure numeric IDs consuming evidence slots |
| Caught By | Manual review of Pages Analyzed list |
| Status | implemented ✅ |

**Root Cause Detail:**
ZoomInfo's company enrichment pages (`/c/1fit/551539465`, `/c/8worx-co/474189324`, etc.) were included in the evidence set. These are ZoomInfo's product output — enriched profiles of *other companies* in their database — not ZoomInfo's own corporate content. They returned "Access to this page has been denied" (login wall) and contributed zero evidence. The `isEvidenceEligible()` resource-instance ID filter checks for mixed alphanumeric slugs (Rules A–D) but does not reject pure numeric last path segments. A 9-digit integer like `551539465` is always a database record key, never a content page.

**Resolution:**
Add Rule E to `isEvidenceEligible()`: reject any URL whose last path segment is a pure numeric string of 5+ digits. Catches `/c/company/551539465` universally without ZoomInfo-specific hardcoding.

**Pattern Tag:** `numeric-id-product-page`, `login-wall-evidence-slot`

---

### Entry 046 — April 22, 2026

| Field | Value |
|-------|-------|
| Company | N/A — Pipeline architecture |
| Version | 2026-04-22-pipeline-v17 |
| Dimension | All (model_type drives D5–D8 guardrail overrides) |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | other — architecture decision |
| Caught By | Deliberate consolidation review |
| Status | implemented ✅ |

**Decision: Single LLM-based model type classifier**

The regex classifier (`classifyModelType.ts`) and the LLM-inferred `pricingModelGuess` in the company profile were two parallel systems producing the same output through different methods. The regex classifier had low confidence on ambiguous cases because it operates on pricing page text only, with no holistic context. The LLM identifier, receiving all scraped content, was consistently more accurate but had no L2 variant output and no explicit confidence score.

**Resolution:**
Consolidated into a single LLM classifier. `COMPANY_PROFILE_PROMPT` now returns `model_type_l1`, `model_type_l2`, `model_type_confidence`, and `classification_evidence` using the internal taxonomy (`access/consumption/outcome/hybrid/gated/unclassified`). `classifyModelType.ts` is no longer called. `modelClassification` is derived directly from the company profile.

**Taxonomy split (user-facing vs. internal):**
- Internal: `access`, `consumption`, `outcome`, `hybrid`, `gated`, `unclassified`
- Display: "Seat-based", "Usage-based", "Outcome-based", "Hybrid", "Enterprise / Contact Sales", "Unknown"
- Display label is a deterministic mapping from `model_type_l1` — never LLM-generated at render time.
- `classification_evidence` is internal only — not rendered in any public-facing component.

**RUBRIC_SCORING_PROMPT updated:** `Pricing Model Guess == "seat"` → `Pricing Model == "access"`, `"usage"` → `"consumption"`. Hybrid and outcome terms unchanged.

**Pattern Tag:** `classifier-consolidation`, `taxonomy-unification`

---

### Entry 045 — April 18, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — tenth pass, arc closed) |
| Version | 2026-04-18-pipeline-v16 |
| Dimension | All dimensions — QA arc closure |
| Root Cause | N/A — confirmed result |
| Caught By | Live scan QA — final verification pass |
| Status | resolved ✅ |

**Result:** 12/16 (75%), Established Stage, 68% confidence, 9 pages analyzed.

| Dimension | Score | Confidence |
|---|---|---|
| Product north star | 1/2 | 60% |
| ICP and job clarity | 2/2 | 80% |
| Buyer and budget alignment | 2/2 | 80% |
| Value unit | 2/2 | 80% |
| Cost driver mapping | 1/2 | 60% |
| Pools and packaging | 2/2 | 80% |
| Overages and risk allocation | 1/2 | 60% |
| Safety rails and trust surfaces | 1/2 | 43% |

**D8 rationale (confirmed correct):** SOC2 Type II + Trust Center satisfy T5 via the
compliance_cert path. Missing public budget caps/usage alerts correctly hold T2 and T4,
capping at 1/2. Confidence 43% (Medium) is accurate — in-product controls likely exist
but are not publicly documented. 90-day recommendation is actionable: document overage
policy and publish safety rail documentation.

**Gamma QA arc summary (Entries 034–045):**

| Version | Score | D8 | Root cause fixed |
|---|---|---|---|
| v8 (baseline) | 8/16 | 0/2 | — |
| v9 | — | 0/2 | /terms, /explore exclusions |
| v10 | — | 0/2 | developers.* hostname leak |
| v11 | — | 0/2 | Zendesk exception regex, Fix 1 domain check |
| v12 | — | 0/2 | Rule D (UGC slugs), 5xx detection |
| v13 | 11/16 | 0/2 | Credits article (community_evidence) |
| v14 | 10/16 | 0/2 | trust/compliance helpSubdomains (var bug introduced) |
| v15 | — | 0/2 | Subdomain probe cap (trust probes separated) |
| v15-hotfix | error | — | parsed is not defined in scoreUrl |
| v16 | **12/16** | **1/2** | D8 T5 SOC2/compliance_cert path |

**Net result:** +4 score points, Emerging → Established, D8 0/2 → 1/2, all from
pipeline and scoring engine fixes with no change to Gamma's actual product or policies.
This arc is the primary case study for the verification loop build-in-public post.

**Pattern Tag:** `arc-closed`, `pipeline-miss`, `scoring-gap`, `verification-loop`

---

### Entry 044 — April 18, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — ninth pass) |
| Version | 2026-04-18-pipeline-v15 |
| Dimension | D8 Safety Rails (0/2, 30% confidence) |
| Root Cause | scoring_gap — T5 subtest definition doesn't award credit for SOC2 + Trust Center |
| Caught By | Live scan QA — trust.gamma.app now in evidence set but D8 still 0/2 |
| Status | fixed |

**Root Cause Detail:**

Trust center IS now in the evidence set (trust.gamma.app, trust.gamma.app/controls,
trust.gamma.app/resources — pages 5, 8, 9). The LLM correctly extracted the content.
The LLM rationale stated: "While a Trust Center exists, it focuses on security and
compliance rather than customer-facing cost controls." This is accurate — and that's
the problem.

D8 T5 (Admin and access controls) only passes if `(rbac OR admin) IN tiers[].features`
AND `audit_logs OR audit_export`. SOC2 Type II is extractable into `tiers[].features`
as `soc2`, but T5 never checks for it. The trust center content (infrastructure security,
organizational security, product security) maps to `compliance_cert` but that surface_type
didn't exist. Result: T1 (hard-cap) + T6 (limit behavior) = 2 points = Score 0.

**The methodology says:** "Score 1: Basic security mentions present" and "Score 2: Explicit
advanced trust surfaces + compliance certs (SOC2, HIPAA, ISO) required." The subtests
didn't implement this — SOC2 had no scoring path.

**Fix:**
1. Added `compliance_cert` to trust_surfaces[].surface_type enum
2. Extended T5 with alternative pass path: `soc2 IN tiers[].features` AND publicly
   linked trust center with controls (trust_surfaces[].surface_type == compliance_cert
   with public availability OR evidence_url not null from trust domain)
3. Note: SOC2 Type II, ISO 27001, HIPAA, PCI-DSS, FedRAMP all satisfy the soc2 condition

**Expected result for Gamma:**
T1 (hard-cap) + T5 (SOC2 + trust.gamma.app) + T6 (limit behavior) = 3 points → Score 1
Gates: T4 fail → cap at 1, T2 fail → cap at 1. Final: D8 = 1/2 ✓

**ANALYSIS_VERSION:** bumped to `2026-04-18-pipeline-v16`.

**Pattern Tag:** `scoring_gap`, `D8-subtest-definition`, `soc2-trust-center`, `spec-implementation-mismatch`

---

### Entry 043 — April 18, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — eighth pass) |
| Version | 2026-04-17-pipeline-v14 |
| Dimension | D8 Safety Rails (0/2, 30% confidence) |
| Root Cause | pipeline_miss — subdomain probe hard-capped at 2, trust/compliance sorted to bottom |
| Caught By | Live scan QA — trust.gamma.app still absent after v14 helpSubdomains fix |
| Status | fixed |

**Root Cause Detail:**

Adding `trust` and `compliance` to `helpSubdomains` (v14) was necessary but not sufficient.
The subdomain probing logic (Phase 1b) caps probes at `.slice(0, 2)` after sorting by a
priority order of `['docs', 'help', 'support', 'developer']`. Since `trust` and `compliance`
are not in that order list, they receive sort index 99 and are cut off by the slice.

For Gamma: `help.gamma.app` and `docs.gamma.app` take both slots → `trust.gamma.app` never
probed. The main Firecrawl domain map also doesn't discover `trust.gamma.app` because the
link on the pricing page ("Learn more at our Trust Center") is a JavaScript-rendered element,
not a plain `<a href>` that Firecrawl follows during crawling. Vanta/Drata hosting via CNAME
also prevents the main domain sitemap from including trust center URLs.

**Fix:** Split `priorityProbes` into two separate pools:
1. **Trust/compliance probes** — always probed when undiscovered, no cap. These are primary
   D8 evidence per the AVS methodology and must not be gated by a cost-saving cap.
2. **General help probes** — capped at 2, sorted by `['docs', 'help', 'support', 'kb', 'knowledge']`.
   `developer` removed from the sort order (no longer in helpSubdomains).

Result: `trust.gamma.app` will now always be probed regardless of how many help subdomains
are also undiscovered. No cost increase for companies without trust/compliance subdomains.

**Also noted:** D2 (ICP & Job Clarity) regressed 2/2 → 1/2 in v14 vs v13 — run-to-run variance,
not a pipeline bug. Expect it to stabilise once evidence set is complete.

**ANALYSIS_VERSION:** bumped to `2026-04-18-pipeline-v15`.

**Pattern Tag:** `pipeline_miss`, `subdomain-probe-cap`, `trust-center-subdomain`, `D8-evidence-gap`

---

### Entry 042 — April 17, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — seventh pass) |
| Version | 2026-04-17-pipeline-v13 |
| Dimension | D8 Safety Rails (0/2, 30% confidence) |
| Root Cause | pipeline_miss — trust subdomain not in helpSubdomains |
| Caught By | Live scan QA — trust.gamma.app linked from pricing page but not followed |
| Status | fixed |

**Root Cause Detail:**

v13 scan showed 11/16 (significant improvement from v12's 8/16 after credits article was added).
D8 remains 0/2 at 30% confidence. The pricing page contains "We're a SOC 2 Type II compliant
organization. Learn more at our Trust Center" with a link to `trust.gamma.app`. The scraper
did not follow this link because `trust` was not in `helpSubdomains`.

`trust.*` and `compliance.*` are a well-established SaaS convention for dedicated trust centers
(trust.gamma.app, trust.lovable.dev, trust.clay.com, trust.replit.com, trust.hex.tech,
compliance.elevenlabs.io). These pages contain primary D8 evidence: SOC2/HIPAA/ISO certs,
security controls, audit capabilities, and compliance documentation.

**Fix:**
1. Added `'trust'` and `'compliance'` to `helpSubdomains` — Fix 1 secondary discovery now
   follows links to these subdomains from pricing page markdown
2. Added Tier 0 scoring (+800) for `subPrefix === 'trust' || subPrefix === 'compliance'` —
   trust centers compete with `highIntentPaths` for evidence slots, above billing articles

**ANALYSIS_VERSION:** bumped to `2026-04-17-pipeline-v14`.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `trust-center-subdomain`, `D8-evidence-gap`

---

### Entry 041 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — sixth pass) |
| Version | 2026-04-17-pipeline-v11 |
| Dimension | URL filter (multiple bad pages still appearing) |
| Root Cause | pipeline_miss (×2 distinct issues) |
| Caught By | Live scan QA — UGC doc URLs and 5xx error pages leaking into evidence set |
| Status | fixed |

**Root Cause Detail — Word-prefix + random suffix UGC doc URLs (Rule D):**

A new URL pattern appeared in the evidence set: `gamma.app/docs/ringkasan-jurnal-c4d1t3zry6ijqnb`.
The segment `ringkasan-jurnal-c4d1t3zry6ijqnb` starts with Indonesian words (`ringkasan jurnal` = "journal summary") followed by a random suffix. Rules A, B, and C did not block it:
- Rule A: no uppercase letters → fail
- Rule B: doesn't start with a digit → fail
- Rule C: contains hyphens → fail (`^[a-z0-9]+$` requires no hyphens)

**Fix (Rule D):** Check the **last hyphen-delimited token** of the last path segment.
`lastToken = lastSeg.split('-').pop()` → `c4d1t3zry6ijqnb` → length 15, all `[a-z0-9]`, 4 digits → blocked.

Threshold: `lastToken.length >= 8 && /^[a-z0-9]+$/.test(lastToken) && lastTokenDigits >= 2`.
Human-readable words (`gamma`, `delivery`, `enterprise`) have 0 digits → always pass.
Zendesk article slugs: lastToken is always a real English word (0 digits) → pass.

**Applied to:** both `scoredLinks.filter` and `isEvidenceEligible` (must be mirrored).

**Root Cause Detail — 5xx error pages not caught by is404 check:**

Help article `https://help.gamma.app/en/articles/8022861-what-s-the-easiest-way-to-export-my-gamma`
returned a page titled "We're having technical difficulties (500)". The existing `is404` check
pattern only matched 404-style strings. The parenthesized HTTP code `(500)` and generic error
messages were not covered.

**Fix:** Added two new conditions to all three `is404` check locations (primary, Fix 1 secondary, Fix 2 retry):
- `/\(5\d{2}\)/` — catches parenthesized HTTP status codes like `(500)`, `(503)`
- `/\b(technical difficulties|internal server error|service unavailable|bad gateway|something went wrong)\b/i`

**ANALYSIS_VERSION:** bumped to `2026-04-17-pipeline-v12`.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `ugc-doc-pattern`, `error-page-detection`

---

### Entry 040 — April 17, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — fifth pass) |
| Version | 2026-04-16-pipeline-v10 |
| Dimension | D8 Safety Rails (0/2, confidence 30%) |
| Root Cause | pipeline_miss (developers.* leak via priorityPatterns) + missing credits article (map coverage gap) |
| Caught By | Live scan QA — developers.gamma.app/workspace/list-folders appeared for the 4th consecutive scan |
| Status | fixed (developers.*) / pending (credits article) |

**Root Cause Detail — `developers.gamma.app` persisting despite helpSubdomains fix:**

Removing `developer`/`developers` from `helpSubdomains` was necessary but not sufficient.
The URL `https://developers.gamma.app/workspace/list-folders` was still passing through
`scoredLinks.filter` via a different code path: `priorityPatterns.some(p => p.test(link))`.

The offending pattern is `/\/developers?\b/i` in `priorityPatterns`. When tested against
the full URL string `https://developers.gamma.app/workspace/list-folders`, this pattern
finds a match because the URL contains `://developers` — the second `/` in `://` is
immediately followed by `developers`, satisfying `\/developers?\b`. The regex is intended
to match `/developer` as a PATH segment, but URL-string matching cannot distinguish
hostname from path segments.

**Fix:** Added `/^https?:\/\/developers?\./i` to `exclusionPatterns`. This runs BEFORE
the `priorityPatterns` check and permanently blocks `developers.*` subdomains. The pattern
anchors to the start of the URL and checks for the protocol `://` + `developers.` as a
HOSTNAME marker (not a path segment), which eliminates the false positive.

**Root Cause Detail — credits article still missing:**

`https://help.gamma.app/en/articles/7834324-how-do-credits-work-in-gamma` is not
returned by Firecrawl's map of `help.gamma.app` (map returns ~100 URLs; article is
not among them). Fix 1 (pricing page secondary discovery) can only find it if
`gamma.app/pricing` contains a markdown-format link `[text](url)` — which the scraped
markdown does not. The link likely appears in a JavaScript tooltip or hover element.

**Consequence:** D8 scored 0/2 because the hard-cap credit model (credits run out →
blocked, no overages) is documented in the credits article but not otherwise
publicly stated in a way the LLM can cite. The 90-day recommendation ("Publish a
detailed How AI Credits Work page") is factually incorrect — Gamma already has this
page. This confirms the article must enter the evidence set to produce accurate scoring.

**Resolution for credits article:** Add to `community_evidence` table in Supabase:
- `url_domain`: `gamma.app`
- `evidence_url`: `https://help.gamma.app/en/articles/7834324-how-do-credits-work-in-gamma`
Community URLs always pass the filter and are always included in the evidence set.

**ANALYSIS_VERSION:** bumped to `2026-04-17-pipeline-v11`.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `priority-pattern-hostname-leak`, `map-coverage-gap`

---

### Entry 039 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — fourth pass) |
| Version | 2026-04-16-pipeline-v9 |
| Dimension | D7/D8 (low confidence due to wrong help articles) |
| Root Cause | pipeline_miss (×4 distinct issues) |
| Caught By | Live scan QA — 5 of 9 pages still low-value or wrong |
| Status | fixed |

**Root Cause Detail:** Four residual issues after v9 deploy:

1. **`gamma.app/docs/2026-04--e3e4deqagopvucq`** (Korean user-doc "April 2026 settlement report"):
   The v9 Zendesk exception used `normHyphens >= 2`. After normalising `--` to `-`, `2026-04--e3e4deqagopvucq` becomes `2026-04-e3e4deqagopvucq` → 2 hyphens → exception incorrectly fired. The date prefix `2026-04` contributed a hyphen, making it look like a multi-word slug. Fix: replaced hyphen-counting with a precise regex test: `/^[0-9]+-[a-z][a-z-]*$/`. The word portion after the numeric ID must be **purely lowercase letters and hyphens** (no digits). `04--e3e4...` starts with `0` (digit) → fails → Rule B blocks. Verified: `2026-04--e3e4deqagopvucq` now blocked; `7834324-how-do-credits-work-in-gamma` still passes.

2. **`developers.gamma.app/workspace/list-folders`** still appearing (Fix 1 regression from v9):
   The v9 fix changed Fix 1's domain check to `resolvedHostFix1.endsWith(registrableDomain)`. This admitted ALL `*.gamma.app` subdomains — including `developers.gamma.app` — if linked from the pricing page markdown. Fix: restricted to `helpSubdomains` explicitly (`helpSubdomains.some(s => resolvedHostFix1 === s + '.' + registrableDomain)`). Only `help.*`, `support.*`, `docs.*`, etc. are admitted.

3. **`help.gamma.app/en/collections/12271373-themes-fonts`** (Themes & Fonts category page):
   Zendesk `/collections/` pages are navigation pages listing article titles — they contain no article content. Added `/\/collections\//i` to `exclusionPatterns`.

4. **`gamma.app/partners`** (Gamma Partner Terms):
   Partner agreement page — legal content, same exclusion rationale as `/terms`. Added `/\/partners\b/i` to `exclusionPatterns`.

**ANALYSIS_VERSION:** bumped to `2026-04-16-pipeline-v10`.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `zendesk-exception-regression`, `wrong-page-type`

---

### Entry 038 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — third pass) |
| Version | 2026-04-13-model-type-classifier-v8 |
| Dimension | D7 Overages & Risk / D8 Safety Rails (low confidence due to missing credits article) |
| Subtest(s) | T1–T6, R1–R6 |
| V1 Score | confidence 30% (D8), 57% (D7) |
| V2 Score | pending re-scan with v9 |
| Root Cause | pipeline_miss (×3 independent blockers on help article) + wrong_page_type (×3 low-value pages) |
| Caught By | Live scan QA — 4 of 8 pages were low-value; key credits article still missing |
| Status | fixed |

**Root Cause Detail:** Two categories of issues in the same scan:

**Category A — Low-value pages still appearing (3 pages):**
1. `gamma.app/terms` (Terms of Use Agreement): `/\/terms\b/i` was in `priorityPatterns` (a boost), not `exclusionPatterns`. Terms pages are legal boilerplate explicitly removed from the AVS methodology source list. Fix: moved to `exclusionPatterns`.
2. `gamma.app/explore` (Explore Gamma | AI Presentation Software): a gallery of user-created presentations. Passes `isShallowSameDomainPath` (1 segment) and gets a score of +500. Not product evidence. Fix: added `/\/explore\b/i` to `exclusionPatterns`.
3. `developers.gamma.app/workspace/list-folders` (GET /folders | Gamma): API endpoint reference page. Entry 037 fix (removing `developers` from `helpSubdomains`) was committed but not yet deployed to Lovable — scan predated the deployment.

**Category B — `help.gamma.app/en/articles/7834324-how-do-credits-work-in-gamma` missing (3 independent blockers):**
1. **Rule B** (`scoredLinks.filter` and `isEvidenceEligible`): segment `7834324-how-do-credits-work-in-gamma` starts with a digit → Rule B blocked it. Zendesk-style article URLs always start with a numeric ID but are followed by a human-readable hyphenated title. Key differentiator: normalized hyphen count. `7834324-how-do-credits-work-in-gamma` has 6 hyphens; `2007-p39rtn8slkfwkbe` has 1; `6--2uoyy8nkses2lbj` normalizes to 1. Zendesk exception: `normHyphens >= 2` → not a random ID. Fix applied in both code paths.
2. **Locale filter** (`scoredLinks.filter`): first path segment `/en/` matched the ISO locale filter. For help subdomains (Zendesk), `/en/` is a structural URL element, not a language variant. Fix: added `isHelpSubdomainUrl` check — locale filter now skips help subdomain paths.
3. **Fix 1 secondary discovery**: `isSameDomain(resolved, baseHost)` checks exact hostname equality (`help.gamma.app` ≠ `gamma.app`). Help subdomain links discovered in pricing page markdown were silently dropped. Fix: replaced with registrable-domain check (`resolvedHost.endsWith(registrableDomain)`).

**Additional fix — billing keyword scoring for article slugs:**
Added Tier 2 to the help subdomain score boost: billing keyword embedded anywhere in the path (not just as a dedicated segment) now scores +500. This ensures `7834324-how-do-credits-work-in-gamma` (contains "credits") competes with other evidence pages rather than getting the generic article penalty (−200).

**Version bump:** ANALYSIS_VERSION → `2026-04-16-pipeline-v9` to bust the Gamma cache.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `zendesk-article-id`, `wrong-page-type`, `help-subdomain`

---

### Entry 037 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA — second pass) |
| Version | 2026-04-13-model-type-classifier-v8 |
| Dimension | N/A — evidence pipeline quality |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | pipeline_miss |
| Caught By | Live scan QA — after Entry 036 fix, two low-signal pages still visible in Gamma evidence set: `robots.txt` and `developers.gamma.app` |
| Status | fixed |

**Root Cause Detail:** Two residual pages survived Entry 036's cleanup:

1. **`robots.txt` included as a page.** The asset extension filter excluded `.pdf`, `.zip`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.css`, `.js`, `.woff`, `.woff2`, `.ttf`, `.eot` — but not `.txt`. The Firecrawl URL map includes `robots.txt` for many domains; without an explicit exclusion it passed every filter and was fetched and included as evidence. Fix: added `txt` to the extension exclusion list in `exclusionPatterns`.

2. **`developers.gamma.app` treated as a help subdomain.** `'developer'` and `'developers'` were entries in `helpSubdomains`, which grants those subdomains a +100 priority score boost and causes Phase 1b to explicitly probe them. `developers.gamma.app` is an API reference subdomain (endpoint listings, SDK guides) — not a user-facing pricing or trust page. Including it adds noise without relevant evidence. Fix: removed `'developer'` and `'developers'` from `helpSubdomains`. These subdomains are now neither boosted nor explicitly probed.

**Principle documented in code:** `developers.company.com` is an API surface, not a product evidence page. API reference docs may mention auth schemes or rate limits, but they do not document plan-level pricing, enterprise trust controls, or buyer-facing features with enough specificity to count as evidence for AVS rubric dimensions.

**Resolution:** Two edits to `supabase/functions/scrape-website/index.ts`:
- `exclusionPatterns[0]`: added `txt` → `/\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot|txt)$/i`
- `helpSubdomains`: removed `'developer'`, `'developers'`

**Pattern Tag:** `pipeline_miss`, `url-filter`, `asset-exclusion`, `subdomain-noise`

---

### Entry 036 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | gamma.app (live scan QA) |
| Version | 2026-04-13-model-type-classifier-v8 |
| Dimension | D8 Safety Rails and Trust Surfaces |
| Subtest(s) | T1–T6 (all) |
| V1 Score | 0/2 |
| V2 Score | pending re-scan |
| Root Cause | pipeline_miss |
| Caught By | Live scan QA — 6 of 13 pages were user-generated Gamma documents, not Gamma's own pages |
| Status | fixed |

**Root Cause Detail:** Gamma's `/docs/{id}` path serves publicly accessible user-created presentations (boards, slides, docs made with Gamma's product). Six such pages were included as evidence, including a "Cybersecurity Maturity Assessment" authored by a Gamma user. The LLM read this as potential evidence for D8 (Safety Rails) but correctly couldn't attribute it to Gamma — driving D8 confidence to 30% and score to 0/2. A Korean-language user presentation was also included. All six IDs are all-lowercase alphanumeric (e.g., `avu2xyfyhrqm75f`, `8nmk3jj496525b6`). The existing base64 filter (Rule A) required BOTH uppercase and lowercase — all-lowercase IDs passed through.

**Resolution:** Extended the resource-instance ID filter in both `scoredLinks.filter` and `isEvidenceEligible` (`scrape-website/index.ts`) to cover three ID conventions:
- Rule A (existing): Mixed-case base64, ≥8 chars, optional trailing `=` → catches Miro board IDs
- Rule B (new): Starts with a digit, ≥8 chars, has letters → catches `2007-p39rtn8slkfwkbe`, `6--2uoyy8nkses2lbj`
- Rule C (new): ≥10 chars, only `[a-z0-9]` (no hyphens), ≥3 digits → catches `avu2xyfyhrqm75f`, `8nmk3jj496525b6`

Verified: 10/10 known generated IDs caught, 12/12 legitimate slugs (`enterprise`, `planning-delivery`, `collaboration-features`, etc.) correctly preserved.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `random-id-exclusion`, `user-generated-content`

---

### Entry 035 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | miro.com (second live scan QA pass) |
| Version | 2026-04-13-model-type-classifier-v8 |
| Dimension | N/A — evidence pipeline quality |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | pipeline_miss |
| Caught By | Live scan QA — 13 pages analyzed, only /pricing contributed evidence; board URLs still present after Entry 034 fix |
| Status | fixed |

**Root Cause Detail:** Four separate issues found in second QA pass after deploying Entry 034 fix:

1. **Base64 filter in wrong code path.** The filter was added to `isEvidenceEligible()`, which is only called when discovering secondary links from the pricing page markdown. Board URLs discovered via the Firecrawl map flow through `scoredLinks.filter`, a completely separate code path that never calls `isEvidenceEligible`. Filter never ran for the offending URLs.

2. **Base64 filter had broken digit requirement.** `uXjVGArvT-g=` and `uXjVlvQzGAs=` contain no digits. The filter required uppercase AND lowercase AND digits — the digit check caused both IDs to pass even when the filter ran. Mixed case alone is sufficient to identify a generated ID.

3. **Locale-prefixed duplicate pages.** `miro.com/fr/products/roadmaps` — a French translation of an English page. No additional evidence value for English-language pricing and trust scoring.

4. **Educational how-to articles and marketplace listings.** `miro.com/agile/what-is-burnup-chart`, `/customer-journey-map/what-is-service-blueprint` (content marketing pages), and `miro.com/marketplace/aws-cost-calculator` (third-party integration listing). None contain pricing, trust, or enterprise evidence.

**Resolution:** Four changes to `scrape-website/index.ts`:
- Added base64 check directly in `scoredLinks.filter` (fixes wrong code path)
- Removed digit requirement from both the new main-pipeline check and the existing `isEvidenceEligible` check
- Added locale-prefix filter: first path segment matching ISO 639-1 two-letter code + sub-path present → excluded
- Added to `exclusionPatterns`: `/marketplace/[^/]+$` (same principle as existing `/integrations/[^/]+$`), `/what-is-[^/]+`, `/how-to-[^/]+`, `/guide-to-[^/]+`

**Pattern Tag:** `pipeline_miss`, `url-filter`, `random-id-exclusion`, `locale-exclusion`

---

### Entry 034 — April 16, 2026

| Field | Value |
|-------|-------|
| Company | miro.com (observed in live scan) |
| Version | 2026-04-13-model-type-classifier-v8 |
| Dimension | N/A — evidence pipeline quality |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | pipeline_miss |
| Caught By | Live scan QA — pages analyzed count increased from 7 to 13 with noise URLs |
| Status | fixed |

**Root Cause Detail:** Miro's `/app/board/<id>` URLs (e.g., `miro.com/app/board/uXjVG05WR5Q=/`) were being included as "Pages Analyzed." These are live product canvases — no evidence-quality content. The random-slug filter only caught path segments starting with `-`; base64-encoded IDs like `uXjVG05WR5Q=` (mixed-case alphanumeric + trailing `=`) were not caught. An initial fix also added `/\/app\//i` to `exclusionPatterns`, but this was reverted: the `/app/` prefix is not a principled signal — some companies use `/app/` for valid informational pages (download pages, integrations directories, feature landing pages). The over-broad exclusion would cause false positives. The actual pattern to reject is: a path segment that looks like a randomly-generated resource identifier, regardless of what precedes it in the path.

**Resolution:** Extended the random-slug filter in `isEvidenceEligible` (`scrape-website/index.ts`) to catch base64-style IDs: last path segment ≥8 chars, matches `[A-Za-z0-9_-]+=*`, requires mixed case AND digits. This is path-structure-agnostic — catches `uXjVG05WR5Q=` in `/app/board/`, `/file/`, `/workspace/`, or any other path prefix without hardcoding product-specific conventions.

**Pattern Tag:** `pipeline_miss`, `url-filter`, `random-id-exclusion`

---

### Entry 033 — April 13, 2026

| Field | Value |
|-------|-------|
| Company | All — new feature |
| Version | Pre-deploy — implemented April 13, 2026 |
| Dimension | N/A — metadata, not a scoring dimension |
| Subtest(s) | N/A |
| V1 Score | N/A |
| V2 Score | N/A |
| Root Cause | other — new feature addition |
| Caught By | Feature request — model-type-classifier-plan.md |
| Status | implemented |

**Root Cause Detail:** Added deterministic model-type classifier that runs post-evidence-ingestion, pre-scoring. Classifies pricing model as access-based, consumption-based, outcome-based, or hybrid using regex + keyword scoring against /pricing page content — no LLM call. Outputs `model_classification` metadata on every scan with L1 type, L2 variant (e.g., `per-seat`, `credit-pool`, `access+consumption`), confidence score, source tag (`auto`/`unclassified`/`gated`), and `enterprise_pricing` flag. Handles edge cases: no /pricing page → `unclassified`; 100% Contact Sales → `gated`; mixed public + gated tiers → classify from public, tag enterprise as `gated`.

**Resolution:** New files: `supabase/functions/analyze-company/classifyModelType.ts` (classifier module), `src/components/ModelClassificationCard.tsx` (UI card). Modified: `analyze-company/index.ts` (integration), `src/types/rubric.ts` (types), `src/lib/api/scraper.ts` (API layer), `src/hooks/useScan.ts` (state), `src/pages/Index.tsx` + `Results.tsx` (plumbing + display). No scoring logic, gate logic, or 3-pass voting modified. All 33 existing tests pass.

**Pattern Tag:** `new-feature`, `model-type-classifier`, `metadata-only`

---

### Entry 032 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | Beautiful.ai (observed), general |
| Version | Current — observed April 10, 2026 via report 7 |
| Dimension | D7 Overages and risk allocation |
| Score | Unaffected |
| Root Cause | contamination — Machine-Extracted schema fields surfacing in `observed` array, not just `sourceEvidence` |
| Caught By | Beautiful.ai report 7 review |
| Status | Open — related to Entry 026 |

**Observation:** D7 renders under "Observations:" (bullet format) instead of "Evidence:" (card format), showing `"- Overage Policy : N/A"` and `"Refund Policy : ..."` directly from the LLM's `observed` array. The `normalizeSourceEvidence` filter blocks these from `sourceEvidence` but the LLM is also writing them into `observed` entries as `url: "schema text"` pairs, which bypasses all filtering. The PDF/UI then renders these raw `observed` entries when `sourceEvidence` is sparse. This is Entry 026 manifesting in a second location — the fix needs to target the `observed` array in addition to `sourceEvidence`.

**Pattern Tag:** `synthetic-evidence`, `observed-array-bypass`, `entry-026-related`

---

### Entry 031 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | Beautiful.ai (observed), general |
| Version | Current — observed April 10, 2026 via report 7 |
| Dimension | D3 Buyer alignment, D8 Safety rails |
| Score | Unaffected |
| Root Cause | contamination — "features" schema field not in synthetic evidence blocklist |
| Caught By | Beautiful.ai report 7 review |
| Status | Fixed — April 11, 2026 |

**Observation:** `"- Features : Everything in Team plus...; Dedicated onboarding..."` appears in D3 and D8 evidence. "features" is not in the synthetic field blocklist regex. The Machine-Extracted plan section generates `- **Features**: ...` which the LLM cites as `- Features : ...`. Fix: add `features?` to both filter regex instances in `normalizeSourceEvidence`.

**Pattern Tag:** `synthetic-evidence`, `filter-gap`

---

### Entry 030 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | Beautiful.ai (observed), general |
| Version | Current — observed April 10, 2026 via report 7 |
| Dimension | D1 Product north star, D2 ICP job clarity |
| Score | Unaffected |
| Root Cause | contamination — curly/smart quote variants bypassing snippet dedup |
| Caught By | Beautiful.ai report 7 review |
| Status | Fixed — April 11, 2026 |

**Observation:** D1 evidence 1 and 4 are the same quote: `""We reduced time by 75%..."` vs `"We reduced time by 75%..."`. D2 evidence 2 and 4 are identical. The dedup normalization hashes the snippet after lowercase/trim/slice(120) but does NOT strip leading/trailing curly quote characters (`"` `"`). So `""quote"` and `"quote"` produce different keys and both pass. Fix: add `.replace(/^["""'']+|["""'']+$/g, '')` to the dedup key normalization before slicing.

**Pattern Tag:** `evidence-dedup`, `unicode-quote-variant`

---

### Entry 029 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (observed), general |
| Version | Current — observed April 10, 2026 via report 14 |
| Dimension | D4 Value unit |
| Score | Unaffected |
| Root Cause | contamination — sub-minimum-length snippet from Machine-Extracted features list |
| Caught By | Report 14 review |
| Status | Fixed — April 11, 2026 |

**Observation:** D4 Value unit evidence 4: `"- additional minutes usage"` (24 chars) from `/pricing?price.platform=agents_platform`. This is a bullet fragment from the Machine-Extracted plan features list, likely `- **Features**: ...; additional minutes usage`. It passes the field-name filter because "additional" isn't a blocked schema field, but it's contextless and adds no evidential value. Fix: add minimum snippet length (~25 chars) to `normalizeSourceEvidence`. Deferred — score unaffected and ElevenLabs validated at 12/16.

**Pattern Tag:** `synthetic-evidence`, `thin-fragment`, `evidence-quality`

---

### Entry 028 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (observed), general |
| Version | Current — observed across reports 11–14 |
| Dimension | D8 Safety rails and trust surfaces |
| Score | Unaffected |
| Root Cause | contamination — "monitor" keyword false-positive in safetyRails evidence bucket |
| Caught By | Report 14 review |
| Status | Open — cosmetic, deferred |

**Observation:** D8 Safety rails evidence consistently includes `"Configure, deploy and monitor conversational agents."` from elevenlabs.io homepage. Product marketing copy being cited as a trust surface because "monitor" matches the safetyRails evidence bucket keyword. Fix: tighten the safetyRails keyword to require "monitor" adjacent to usage/spend/billing context words, not standalone. Deferred — score unaffected and ElevenLabs validated at 12/16.

**Pattern Tag:** `wrong-dimension-evidence`, `keyword-false-positive`

---

### Entry 027 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs |
| Version | Current — observed April 10, 2026 via report 13 review |
| Dimension | D2 ICP and job clarity |
| Score | D2: 2/2 (report 11) → 1/2 (report 13) — regression |
| Pages Analyzed | 15 — correct |
| Root Cause | calibration — J5 non-fit and J3 success state subtests structurally too strict for B2B SaaS |
| Caught By | ElevenLabs report 13 review, April 10, 2026 |
| Status | Addressed — D2 J3 and J5 updated in calibration pass (April 10, 2026) |

**Observation:** D2 scored 2/2 in report 11 and 1/2 in report 13. Rationale for 1/2 cited: "lacks explicit non-fit criteria or detailed success states for these jobs." Both failures trace to rubric subtests that most B2B SaaS companies structurally cannot pass from public evidence:

- **J5 Non-fit boundaries** — requires explicit "who we are NOT for" statements (`non_fit_criteria[]`). Almost no B2B SaaS company publishes these. ElevenLabs clearly targets developers building speech/voice applications across defined verticals, which implicitly excludes consumer use and non-audio applications, but this is inferred from ICP, not stated as exclusion.
- **J3 Success state** — requires `jtbd[0].success_state` with measurable constraints. ElevenLabs documents job scope via named platforms (ElevenCreative, ElevenAgents) with target users and I/O requirements, but without publishing a universal quantified success metric.

Combined with D4 variance (Entry 023), two dimensions are now volatile, causing ±12% score swings (1-2 points each on a 16-point scale) across reruns on identical input. This makes the score unreliable as a benchmark.

**Fix:** D2 J3 updated with Tier B path (named platforms + documented I/O + constraints). D2 J5 updated with Tier C path (implicit scope via vertical ICP + multiple jtbd roles). See calibration commit April 10, 2026.

**Pattern Tag:** `j5-non-fit-too-strict`, `j3-success-state-too-strict`, `lm-scoring-variance`, `calibration-needed`

---

### Entry 026 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (observed), general (all companies) |
| Version | Current — observed April 10, 2026 via report 13 review |
| Dimension | D7 Overages and risk allocation (observed); potentially all dimensions |
| Score | N/A — credibility/accuracy issue in rationale text |
| Pages Analyzed | 15 — correct |
| Root Cause | contamination — Machine-Extracted schema values leaking into rationale narrative |
| Caught By | ElevenLabs report 13 review, April 10, 2026 |
| Status | Open — harder to fix than evidence snippet contamination |

**Observation:** The LLM references Machine-Extracted schema values in its rationale text, not just in sourceEvidence snippets. Example from D7 report 13: "the pricing pages consistently list 'Overage Policy : N/A' for all tiers". The post-processing filter in `normalizeSourceEvidence` (Entry 024 fix) removes these from `sourceEvidence` arrays, but cannot scrub them from the free-text `rationale` string.

The root issue: the LLM treats the `## Structured Pricing Data (Machine-Extracted — NOT direct quotes)` section as if it is actual page copy, even in narrative output. The prompt at line 66 explicitly says not to cite this section as direct quotes, but Gemini 2.5 Flash incorporates these fields into rationale reasoning. This is distinct from Entry 024 — Entry 024 caught the snippet-level leakage; this entry tracks the narrative-level leakage.

**Potential fixes (not yet implemented):**
1. Rename the Machine-Extracted section header and fields to make them visually non-quotable — e.g., use `[CONTEXT ONLY — DO NOT CITE]` prefix on all fields, or emit as a JSON block rather than markdown prose.
2. Add a post-processing regex pass on `rationale` strings to detect and flag Machine-Extracted field patterns appearing in narrative context.
3. Move Machine-Extracted data to a separate, lower-salience position in the scrape markdown (after all real page content).

**Pattern Tag:** `synthetic-evidence`, `machine-extracted-narrative-bleed`, `rationale-contamination`

---

### Entry 025 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (observed), general (all companies) |
| Version | Current — observed April 10, 2026 via report 13 review |
| Dimension | D4 Value unit |
| Score | N/A — evidence quality issue |
| Pages Analyzed | 15 — correct |
| Root Cause | contamination — "price" field missing from synthetic schema field filter blocklist |
| Caught By | ElevenLabs report 13 review, April 10, 2026 |
| Status | Fixed — "price" added to both filter regex instances in normalizeSourceEvidence |

**Observation:** `"- Price : $0 per minute"` and `"- Price : $0.10 per minute"` appeared in D4 Value unit sourceEvidence in report 13. The Machine-Extracted plan section generates `- **Price**: $X per minute` fields for each pricing tier. The LLM strips the `**` markdown formatting and cites these as direct page quotes in sourceEvidence. "price" was not in the blocklist added in Entry 024, so the filter failed to catch it.

**Fix:** Added "price" to both regex instances in `normalizeSourceEvidence` (analyze-company/index.ts lines ~2185 and ~2222). The regex pattern `billing|price|limits?` now catches `- Price : $X` citations before they enter the output. Committed as `fix: add 'price' to synthetic schema field filter`.

**Pattern Tag:** `synthetic-evidence`, `machine-extracted-citation`, `filter-blocklist-incomplete`

---

### Entry 024 — April 10, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (observed), general (all companies) |
| Version | Current — observed April 10, 2026 via report 11 review |
| Dimension | D4 Value unit, D6 Pools & Packaging, D7 Overages & Risk (primarily) |
| Score | Scores unaffected — credibility issue only |
| Pages Analyzed | 15 — correct |
| Root Cause | contamination — LLM citing Machine-Extracted schema fields as direct page quotes |
| Caught By | Full report 11 review, April 10, 2026 |
| Status | Fixed — post-processing filter added to normalizeSourceEvidence |

**Observation:** Multiple sourceEvidence snippets were structured schema fields, not actual page quotes:
- D4: `"Value Unit : credits"` — from `**Value Unit**: credits` in the Machine-Extracted section
- D4/D7: `"Refund Policy : Not explicitly stated"` — LLM inference cited as page evidence (**worst case**)
- D4: `"- Billing : per minute"` — plan schema field
- D6: `"- Limits : 10k credits per month; 3 Projects in Studio"` — plan schema field
- D7: `"- Overage Policy : Not applicable"` — plan schema field

The scraper injects a `## Structured Pricing Data (Machine-Extracted — NOT direct quotes)` section into the markdown passed to the analyzer. The prompt at line 66 of analyze-company explicitly says not to cite these as direct quotes, but Gemini 2.5 Flash ignores this instruction. "Refund Policy : Not explicitly stated" is particularly damaging to report credibility — it cites a LLM inference as a source URL quote.

**Fix:** Post-processing filter in `normalizeSourceEvidence` (analyze-company/index.ts) that rejects snippets matching Machine-Extracted schema field patterns before they can enter the output. Two checks:
1. `not explicitly stated` anywhere in snippet (always a LLM inference artifact)
2. Snippet starts with `- ` or bare field name followed by `:` matching known schema fields (value unit, refund policy, billing, limits, overage policy, etc.)

**Pattern Tag:** `synthetic-evidence`, `machine-extracted-citation`, `evidence-quality`

---

### Entry 023 — April 5, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs |
| Version | Current — observed April 5, 2026 |
| Dimension | D4 Value unit |
| Score | D4: 2/2 (report 7) → 1/2 (report 9) — regression |
| Pages Analyzed | 15 — correct page set including 4 pricing variants |
| Root Cause | calibration — V6 Auditability and V2 Metering determinism subtests too strict for consumption-based AI products; run-to-run LLM variance on V1 boundary |
| Caught By | ElevenLabs rerun after Entry 021 fixes, April 5, 2026 |
| Status | Open — flagged for calibration design review. Not patched to avoid overcorrecting on other companies. |

**Observation:** D4 scored 1/2 in report 9 after previously scoring 2/2 in report 7. ElevenLabs publishes explicit per-unit pricing across all 4 platforms (credits/character, $/minute, $/generation), which is objectively transparent. The 1/2 is driven by rubric subtest failures:

- **V2 Metering determinism** — requires `rounding_rule` and `attribution_level` to be publicly documented. ElevenLabs does not publish rounding rules → V2 fails.
- **V6 Auditability** — requires `audit_surface = dashboard_breakdown OR export_logs`. ElevenLabs has in-product credit dashboard (dashboard_total only) → V6 fails.

With at most 4 of 6 subtests passing, the point map (5-6 → score 2) caps the score at 1.

**Why 2/2 appeared in report 7:** LLM non-determinism. The previous run was more lenient on V1 (Unit definition clarity) interpretation, pushing to 5 passing subtests. This is within expected LLM variance.

**Calibration question (open):** Should V6 pass when in-product usage tracking exists but only at dashboard-total granularity? For AI-native consumption products, per-endpoint/per-model breakdown is rarely public. If V6 requires export_logs or dashboard_breakdown, most consumption-based AI companies will structurally fail it regardless of pricing transparency. This warrants a dedicated calibration session before patching.

**Pattern Tag:** `v6-auditability-too-strict`, `lm-scoring-variance`, `calibration-needed`

---

### Entry 022 — April 5, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (primary), general (all companies) |
| Version | Current — observed April 5, 2026 |
| Dimension | D5 Cost driver mapping (rationale text); all dimensions (evidence repetition) |
| Score | N/A — prompt and dedup issues |
| Pages Analyzed | N/A |
| Root Cause | contamination — p50/p95 field names in D5 schema; near-duplicate evidence passing dedup |
| Caught By | ElevenLabs report 9 review, April 5, 2026 |
| Status | ✅ Confirmed (April 5, 2026) — p50/p95 gone from D5 rationale; near-duplicate evidence reduced. D4 returned to 2/2 (LLM variance; Entry 023 remains open for calibration). |

**Failure 1 — p50/p95 still appearing in D5 Cost Driver rationale after post-processing fix**

Entry 021 removed the hardcoded `'Driver formulas and p50/p95 workflow cost estimates remain non-public.'` string from post-processing. However, the LLM was still generating p50/p95 language in its rationale because the D5 schema itself defined fields named `p50_per_value_unit`, `p95_per_value_unit`, `cost_per_value_unit_p50`, and `cost_per_value_unit_p95`. The LLM sees these field names and incorporates the concept into its reasoning even when C4 explicitly says p50/p95 is not required. Fix: renamed all four fields to `typical_per_value_unit`, `high_per_value_unit`, `cost_per_value_unit_typical`, and `cost_per_value_unit_high`. Insider prompts 3 and 4 updated to match.

**Failure 2 — Near-duplicate evidence ("10k credits per month" vs "10k credits per month (Free tier)")**

The snippet dedup from Entry 021 hashed on `snippet.toLowerCase().slice(0, 120)`. Short parenthetical tier annotations like `(Free tier)`, `(Business)`, `(Creator plan)` made otherwise identical quotes hash to different keys, both surviving into the evidence set. Fix: added `.replace(/\s*\([^)]{0,40}\)/g, '')` before hashing to strip short parentheticals. Ensures tier-label variants of the same quote count as one evidence item, preserving the first-occurrence URL.

**Pattern Tag:** `schema-fieldname-prompt-bleed`, `near-duplicate-evidence-parenthetical`

---

### Entry 021 — April 4, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (primary), general (all companies) |
| Version | Current — observed April 4, 2026 |
| Dimension | All — display; D5 Cost Driver Mapping — uncertainty label |
| Score | N/A — display and label bugs, not scoring bugs |
| Pages Analyzed | N/A |
| Root Cause | contamination — three UI components truncating evidence URLs; one hardcoded uncertainty string contradicting prompt |
| Caught By | Report review after ElevenLabs rerun, April 4, 2026 |
| Status | ✅ Confirmed (April 5, 2026) — query-param URLs display correctly in all three components |

**Failure 1 — Query-param URLs stripped in three UI display components**

`formatUrl()` helper existed identically in three components — `EvidenceSourcesPanel.tsx`, `DimensionCard.tsx`, `ObservabilityStrip.tsx` — building display URLs as `hostname + pathname` only, omitting `u.search`. For ElevenLabs, all four platform pricing pages (`/pricing?price.platform=agents_platform` etc.) displayed as identical `elevenlabs.io/pricing` entries in Pages Analyzed, dimension evidence citations, and the "What We Used" panel. `EvidenceSourcesPanel.tsx` was fixed in commit `42d9d77`; the other two were missed. Fixed in `cd7f708` by adding `u.search` to all three instances.

**Failure 2 — Same evidence quote appearing twice in same dimension (evidence 2 = evidence 4)**

`normalizeSourceEvidence()` in `analyze-company` deduped by `url|snippet` composite key. When the same quote appeared on both `elevenlabs.io/pricing` and `elevenlabs.io/pricing?price.platform=agents_platform`, they produced different composite keys and both passed through — surfacing as duplicate evidence items under the same dimension. Fixed in `cd7f708`: dedup key changed to `snippet.toLowerCase().trim().slice(0, 120)`. First-occurrence URL is preserved; duplicate snippet is dropped regardless of source URL.

**Failure 3 — "p50/p95 workflow cost estimates remain non-public" in D5 uncertainty reasons**

The Cost Driver Mapping post-processing block in `analyze-company` hardcoded this string as a forced uncertainty reason whenever the score was floored from 0→1. The C4 subtest in the scoring prompt explicitly states p50/p95 is NOT required (updated in ANALYSIS_VERSION v7). The hardcoded string contradicted the prompt and confused users about why confidence wasn't higher. Fixed in `cd7f708`: replaced with "per-workflow cost breakdowns are not publicly documented."

**Pattern Tag:** `formaturl-search-omission`, `evidence-snippet-dedup`, `hardcoded-uncertainty-contradicts-prompt`

---

### Entry 020 — April 4, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs |
| Version | Current — observed April 4, 2026 |
| Dimension | All — URL selection |
| Score | N/A — URL dedup fix |
| Pages Analyzed | 4× identical `elevenlabs.io/pricing` after revert of `parsed.search=''` |
| Root Cause | pipeline_miss — normaliseForDedup not normalizing trailing slash or http protocol |
| Caught By | ElevenLabs rerun after Entry 019 revert, April 4, 2026 |
| Status | ✅ Fixed (commit e225afd) — trailing slash strip + http→https normalization added to normaliseForDedup(); final Map-based dedup pass added before allUrlsToScrape construction |

**Root cause:** `normaliseForDedup()` stripped www and locale prefixes but not trailing slashes or http→https. Firecrawl map returning both `/pricing` and `/pricing/` (and/or `http://elevenlabs.io/pricing`) produced different normalized keys, all scored +1650, and all were selected. Combined with the canonical probe, 4 identical slots resulted.

**Fix:** Added `if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/$/, '')` and `parsed.protocol = 'https:'` to `normaliseForDedup()`. Also added a final `Map`-based dedup pass applied to `priorityLinks` before building `allUrlsToScrape` as a belt-and-suspenders guard.

**Pattern Tag:** `trailing-slash-dedup-gap`, `protocol-normalization-gap`

---

### Entry 019 — April 4, 2026

| Field | Value |
|-------|-------|
| Companies | ElevenLabs (query param dedup — misdiagnosed then corrected), Beautiful.ai (help subdomain contamination — fixed) |
| Version | Current — observed April 4, 2026 post-category-aware-scoring reruns |
| Dimension | All — slot contamination affects evidence quality across dimensions |
| Score | ElevenLabs 12/16 (75%); Beautiful.ai 12/16 (75%) |
| Pages Analyzed | ElevenLabs: /pricing platform variants should appear 4× (correct behavior); Beautiful.ai: 6 of 13 slots consumed by generic help articles (bug) |
| Root Cause | pipeline_miss (Beautiful.ai) — help subdomain boost too broad; misdiagnosis (ElevenLabs) — query-param pricing variants are content-differentiating, not duplicates |
| Caught By | Report validation review after category-aware scoring reruns, April 4, 2026; regression caught on rerun |
| Status | ✅ Beautiful.ai fix deployed (April 4, 2026). ✅ ElevenLabs `parsed.search=''` reverted — query params preserved. |

**Overview:** Post-rerun validation revealed one genuine bug (Beautiful.ai help subdomain over-boosting) and one misdiagnosis (ElevenLabs query-param pricing variants).

---

**Failure 1 — ElevenLabs query-param pricing variants: misdiagnosis and revert**

Initial diagnosis: `/pricing` appearing 4× was a dedup bug. Proposed fix: `parsed.search = ''` in `normaliseForDedup()`.

**This was wrong.** ElevenLabs uses query params to show genuinely different pricing content per product:
- `elevenlabs.io/pricing` — default
- `elevenlabs.io/pricing?price.platform=agents_platform`
- `elevenlabs.io/pricing?price.platform=api`
- `elevenlabs.io/pricing?price.platform=creative_platform`

Each variant contains a different product's credit rates, tier limits, and overage behavior. Stripping query params collapsed all 4 to one slot, losing 3 pages of D5/D6/D7 evidence. The `parsed.search = ''` change was reverted. Query params are intentionally preserved in `normaliseForDedup()` — products legitimately use them for content-differentiating sub-pages.

---

**Failure 2 — Generic Beautiful.ai help articles consuming evidence slots (/hc subpath boost too broad)**

The subdomain scoring boost in `scoreUrl()` included `/hc` in the billing-keyword regex:
`/\/(plans-and-credits|credits|pricing|billing|usage|subscription|refund|cancel|hc)\b/i`

Since Zendesk help centers use paths like `support.beautiful.ai/hc/en-us/articles/12345-how-to-present-slides`, the regex matched `/hc` anywhere in the path and gave every article +700 (same boost as billing docs). Result: 6 of 13 Beautiful.ai evidence slots were consumed by help articles about slide presentations, theme changes, and export settings — content with zero D5/D6/D7/D8 scoring value.

**Fix:** Two-part change to `scoreUrl()` subdomain block:

1. Removed `/hc` from the billing-keyword boost list — it was the wrong heuristic.
2. Added a **two-tier penalty** for generic deep help articles: paths matching `/hc/.+` or `/articles?/.+` with no billing keywords in the path now receive -200. Examples:
   - `support.beautiful.ai/hc/en-us/articles/how-to-present` → +100 (subdomain) - 200 (generic article) = -100
   - `support.beautiful.ai/hc/en-us/articles/manage-billing` → +100 + 700 (billing keyword) = +800
   - `support.beautiful.ai/hc` (root) → +100 (no penalty, no billing boost)

Rerun confirmed Beautiful.ai Pages Analyzed went from 6 generic help slots → 0. Freed slots filled by `/security`, `/roi-calculator`, `/enterprise`, `/enterprise-plan`.

**Pattern Tag:** `help-subdomain-boost-too-broad`, `evidence-slot-contamination`, `query-param-content-differentiating`

---

### Entry 018 — April 4, 2026

| Field | Value |
|-------|-------|
| Company | Clay (clay.com) |
| Version | Current — observed April 4, 2026 |
| Dimension | All — evidence quality affected across every dimension |
| Score | Not yet re-run post-fix |
| Pages Analyzed | 15 shown in UI — majority "Not Found" |
| Root Cause | pipeline_miss — three URL selection failures causing wasted scrape slots and report noise |
| Caught By | Manual report review (screenshot), April 4, 2026 |
| Status | Open. Three sub-issues identified. Fix planned for scrape-website. |

**Overview:** A Clay.com run showed 15 URLs in "Pages Analyzed" with the majority returning "Not Found." This reveals three distinct failure classes in the URL selection and filtering layer, all occurring before evidence reaches the LLM.

---

**Failure 1a-i — Login-wall pages consuming evidence slots (pre-existing, Entry 015B)**

Paths like `/subscription` and `/usage` return HTTP 200 but serve only a sign-in page ("Sign In | Clay"). The scraper treats the request as successful, returns the login page HTML, and the slot is counted as analyzed — but the evidence content is zero. These paths are consistently gated behind authentication across all SaaS companies.

Known gated paths: `/subscription`, `/usage`, `/account`, `/accounts`, `/dashboard`, `/settings`, `/login`, `/signin`, `/sign-in`, `/sign-up`, `/signup`, `/register`, `/app`, `/home` (when path is exactly `/home`).

**Fix:** Add gated path blocklist to `isEvidenceEligible()` — reject any URL whose path exactly matches or starts with these segments.

---

**Failure 1a-ii — 404 Not Found pages appearing in Pages Analyzed**

The canonical probe step force-adds `/pricing`, `/plans`, `/billing` regardless of whether those paths exist on the domain. When a company doesn't use those URL patterns (Clay uses `/pricing-calculator` not `/plans`), the probed URLs return 404. These 404 pages appear in the "Pages Analyzed" list in the UI and may be included in the evidence payload sent to the LLM — adding noise to the analysis ("Not Found" appearing in evidence context).

Clay screenshot: `www.clay.com/plans/` (Not Found), `www.clay.com/billing/` (Not Found), `clay.com/billing/` (Not Found), `clay.com/plans/` (Not Found), `clay.com/features/` (Not Found), `clay.com/product/` (Not Found), `clay.com/solutions/` (Not Found), `clay.com/platform/` (Not Found), `clay.com/subscription/` (Not Found), `clay.com/usage/` (Not Found).

**Fix:** After scraping, filter pages whose scraped content is null, empty, or matches a "Not Found" pattern before adding to the evidence payload and Pages Analyzed display list.

---

**Failure 1a-iii — www vs. non-www duplicate canonical probing**

The canonical probe step generates URLs using either the www-prefix or bare domain based on a heuristic. When the heuristic is ambiguous, both `www.clay.com/plans/` (item 6) and `clay.com/plans/` (item 10) are probed independently — two requests, two 404s, consuming two scrape slots for the same non-existent page.

**Fix:** Before adding canonical probes to the scrape queue, deduplicate www vs. non-www variants of the same path. If both would be probed, pick one (prefer www if any discovered URL uses www, otherwise bare domain) and discard the other.

**Pattern Tag:** `login-wall-slot-consumption`, `404-in-pages-analyzed`, `www-nonwww-duplicate-probe`, `canonical-probe-noise`

---

### Entry 017 — April 4, 2026

| Field | Value |
|-------|-------|
| Companies | General — affects all companies with interactive pricing pages |
| Version | Current — not yet fixed |
| Dimension | D5 Cost Driver Mapping, D7 Overages & Risk, D8 Safety Rails & Trust (primary) |
| Score | Undetermined — evidence gap, not yet quantified |
| Pages Analyzed | N/A — architectural gap identified in scraping layer |
| Root Cause | pipeline_miss — two classes of interactive pricing page content never captured |
| Caught By | Architecture review, April 4, 2026 |
| Status | Open. Two new failure classes identified. Not yet logged as open issues. |

**Failure A — Tooltip content on pricing pages never captured**

Pricing pages frequently use hover-triggered tooltips to explain pricing terms inline (e.g., "What counts as an active seat?", "How is API usage measured?", credit unit definitions, overage behavior explanations). These tooltips are directly relevant to D5 (Cost Driver Mapping), D7 (Overages & Risk), and D8 (Safety Rails).

Firecrawl performs a JavaScript-rendered scrape with a `waitFor` timer. It does not simulate hover events. Tooltip content is CSS/JS hidden (`display:none`, `visibility:hidden`, or opacity transitions) and never appears in the scraped markdown regardless of wait time. This content is structurally unreachable by the current pipeline.

**Fix needed:** Use Firecrawl's `actions` API to simulate hover/click on tooltip trigger elements on pricing pages before snapshotting. Alternatively, extract tooltip content directly from the raw HTML (many tooltip libraries embed the full text in `data-tooltip`, `title`, `aria-label`, or hidden `<div>` siblings) without requiring interaction simulation.

---

**Failure B — Collapsed FAQ accordions on pricing pages not actively expanded**

Entry 015D addressed the `waitFor` timing regression (restoring 2500ms for pricing pages). However, many pricing page FAQ sections use click-to-expand accordions — the content is hidden until a user clicks the question. Firecrawl with a timer waits for auto-rendered JS but does not click collapsed accordion items. If accordions do not auto-expand on page load, their content is absent from the scraped markdown even at 2500ms.

FAQ answers on pricing pages frequently contain the most precise documentation of:
- Credit and token usage definitions (D5)
- Overage rates and billing behavior (D7)
- Spend caps, alerts, and limit behaviors (D8)
- Cancellation and refund policies (D8)

Additionally, FAQ answers often reference external documentation pages (help center articles, billing guides, usage calculators). Fix 1's secondary pass already extracts `<a href>` links from scraped pages and queues high-priority ones — but only if the FAQ content itself was captured. If the accordion was never expanded, those links are never seen.

**Fix needed:** On pricing pages, use Firecrawl's `actions` API to click all collapsed accordion/details elements before snapshotting. Detect accordion patterns via `<details>`, `<summary>`, common accordion class names (`accordion`, `faq`, `collapsible`), or `aria-expanded="false"` attributes. This is distinct from the waitFor timing fix — it requires active interaction, not passive waiting.

**Pattern Tag:** `tooltip-content-miss`, `accordion-active-expansion-miss`, `interactive-pricing-page-gap`

---

### Entry 016 — April 4, 2026

| Field | Value |
|-------|-------|
| Companies | Beautiful.ai, Linear (seat-based); ElevenLabs, Deepgram, OpenAI (consumption); Notion, Cursor (hybrid) |
| Version | ANALYSIS_VERSION bump: `2026-04-03-category-aware-scoring-v7` |
| Dimension | D5 Cost Driver Mapping, D6 Pools & Packaging, D7 Overages & Risk, D8 Safety Rails & Trust (primary); all categories affected |
| Score | Pre/post not yet validated — engine deployed, reruns pending |
| Pages Analyzed | N/A — calibration + engine change session |
| Root Cause | contamination — scoring engine applied consumption-centric subtests to seat-based products, causing structural misfires on D5/D6/D7/D8 |
| Caught By | Calibration audit (April 1–4, 2026) — cross-company pattern review across Beautiful.ai, Linear, Notion (seat); ElevenLabs, Deepgram (consumption); Bolt, Replit, Vercel (hybrid) |
| Status | Engine deployed. Reruns needed: Beautiful.ai, Linear (seat-based); ElevenLabs, Deepgram (consumption); Notion, Cursor (hybrid) to validate corrections. |

**Root cause analysis:**

The scoring prompt evaluated all companies with a consumption-centric subtest battery. Seat-based products were penalized for missing artifacts that structurally cannot exist: p50/p95 cost variance estimates (C4), spike triggers and mitigations (C5), inference-related cost drivers (C1), and overage behavior documentation (D7). This caused systematic 1/2 scores on D5, D6, D7, and D8 for seat-based companies regardless of what was publicly available.

**Engine changes deployed (ANALYSIS_VERSION: 2026-04-03-category-aware-scoring-v7):**

1. **PRICING MODEL CATEGORY AWARENESS block** added to `RUBRIC_SCORING_PROMPT`:
   - D5 seat-based: C1 passes on ≥1 driver with published per-seat price; C4 passes on per-seat price published (p50/p95 not required); C5 auto-pass (seats don't spike); C6 gate exception
   - D6 seat-based: P3 (pool rules) override — pool features not applicable
   - D7 seat-based: Overage gate exception — missing `overage_behavior` = "not applicable" when no `overage_enabled` tiers exist
   - D8 seat-based: T1 passes on admin controls for user/access management; T2 passes on admin subscription/billing visibility; T3 passes on role-based access controls; T6 passes on documented seat limits or fair-use policy; T2 gate exception

2. **C4 subtest replaced (all categories):** p50/p95 cost estimates removed. New subtest: cost calculability from published information (consumption = per-unit rate; seat = per-seat price; hybrid = both).

3. **C5 subtest replaced (all categories):** Spike triggers/mitigations removed. New subtest: cost boundary behavior (consumption = overage/hard-stop documented; seat = auto-pass; hybrid = consumption boundary documented).

4. **D5 gate change:** `If C4 fails: cap score at 1` removed. C6 gate exception added for seat-based.

**Background processing deployed (analyze-company):**

Fresh scans for large sites (GitHub, Cursor) were timing out the edge function before analysis completed. Fix:
- `EdgeRuntime.waitUntil` keeps edge function alive post-response
- Fresh scans return 202 immediately; analysis runs in background IIFE
- Pending marker inserted into `scan_results` before analysis starts (10-min TTL)
- `pollOnly` flag: client polls for result without sending pages payload
- Error marker written to cache on background failure
- Client (`scraper.ts`) polls every 4s up to 2 min

**Scrape-website URL pattern updates:**

- `/hc`, `/refund`, `/cancel`, `/roi` added to `priorityPatterns` and `highIntentPaths`
- `fullContentPatterns` updated for help center, roi, calculator, refund paths
- HIGH-VALUE CONTENT BOOST added for refund/cancel and roi/calculator paths
- `/hc` added to subdomain boost path list

**Pattern Tag:** `category-misfire`, `seat-based-contamination`, `consumption-centric-prompt`, `background-processing-timeout`, `url-pattern-miss`

---

### Entry 015 — March 25, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs (elevenlabs.io) |
| Version | V3 — post-Bundle 2 rerun (March 24, 2026) |
| Dimension | D7 Overages & Risk, D8 Safety Rails & Trust Surfaces (primary); D1 Product North Star (secondary) |
| Score | 12/16 (75%) — no change from V2 (March 23). Bundle 2 did not recover D7/D8. |
| Pages Analyzed | 7 — same as V2 |
| Root Cause | pipeline_miss — four distinct evidence collection failures; three new failure classes identified |
| Caught By | Manual report review + screenshot analysis (March 24) |
| Status | Open. Four new failure patterns identified. None fixed. |

**Score comparison:**

| Dimension | Mar 6 (V1) | Mar 23 (V2) | Mar 24 (V3) | Status |
|---|---|---|---|---|
| D1 Product North Star | 2/2 | 1/2 | 1/2 | Not recovered |
| D2 ICP & Job Clarity | 2/2 | 2/2 | 2/2 | Stable ✓ |
| D3 Buyer & Budget | 2/2 | 2/2 | 2/2 | Stable ✓ |
| D4 Value Unit | 2/2 | 2/2 | 2/2 | Stable ✓ |
| D5 Cost Driver Mapping | 1/2 | 1/2 | 1/2 | Stable |
| D6 Pools & Packaging | 2/2 | 2/2 | 2/2 | Stable ✓ |
| D7 Overages & Risk | 2/2 | 1/2 | 1/2 | Not recovered |
| D8 Safety Rails & Trust | 2/2 | 1/2 | 1/2 | Not recovered |

**Bundle 2 assessment:** Bundle 2 added `/trust`, `/security`, `/compliance` as high-intent path probes on `elevenlabs.io`. These paths do not exist on the main domain — ElevenLabs hosts its trust/compliance content at `compliance.elevenlabs.io` (a separate subdomain). Path probing cannot reach subdomain-hosted trust centers. Bundle 2 was the correct fix class but the wrong form.

---

**Failure A — Trust center hosted on separate subdomain**

ElevenLabs' compliance and trust center lives at `compliance.elevenlabs.io`, not at `elevenlabs.io/compliance`. The canonical path probe step (and Bundle 2's highIntentPaths additions) only probe paths on the main registered domain. Subdomain trust centers are never discovered by path probing or by Firecrawl's `/map` endpoint (which returns same-domain URLs only by default).

This is a distinct failure class from missing paths. Companies increasingly host trust content at `compliance.*`, `trust.*`, or `security.*` subdomains (e.g., `compliance.elevenlabs.io`, `trust.segment.com`, `security.dropbox.com`). None of these are reachable by current pipeline.

**Fix needed:** In the canonical path probe step, also probe `compliance.{domain}`, `trust.{domain}`, and `security.{domain}` as subdomain root URLs alongside path variants. If the subdomain root returns non-empty content, add it to the evidence queue at the same priority as `/compliance` path.

---

**Failure B — Login-wall pages consuming evidence slots**

`elevenlabs.io/subscription` and `elevenlabs.io/usage` both scraped successfully (HTTP 200) but returned only the "Sign In | ElevenLabs" login page — zero evidence content. These consumed 2 of 7 slots (28% of evidence budget) with no return.

Fix 2 (pre-scoring validation) applies a confidence penalty for pages with unresolved/empty content, but login-wall pages are not empty — they return a complete HTML page. The login wall is invisible to the current content validation checks.

This pattern is consistent across SaaS: `/subscription`, `/usage`, `/account`, `/dashboard`, `/settings` are uniformly behind authentication for any company that uses these URL patterns. They should never enter the queue.

**Fix needed:** Add a **gated path blocklist** to `isEvidenceEligible()`: reject any URL whose path exactly matches or starts with `/subscription`, `/usage`, `/account`, `/dashboard`, `/settings`, `/login`, `/signin`, `/sign-in`, `/register`. These are in-app paths with no public evidence surface.

---

**Failure C — Tab-partitioned pricing page with query-param variants not reached**

The ElevenLabs pricing page uses JavaScript tabs to partition pricing by platform:
- `elevenlabs.io/pricing?price.platform=creative_platform`
- `elevenlabs.io/pricing?price.platform=agents_platform`
- `elevenlabs.io/pricing?price.platform=api`

Each tab shows a distinct pricing breakdown with different credit amounts, limits, and overage rates — the primary evidence source for D5 (Cost Driver Mapping) and D7 (Overages & Risk). These tabs are rendered as JS state changes, not as `<a href>` anchor links, so they are invisible to:
1. Firecrawl's `/map` step (sitemaps never include query-param variants)
2. Fix 1's secondary pass (extracts `<a href>` links from scraped markdown — JS tab navigation emits none)
3. Deduplication (query params stripped → all three collapse to `/pricing`)

The pipeline scrapes `/pricing` and receives only the default tab content. The other two tabs' pricing details are never seen.

**Fix needed:** After scraping a `/pricing` page, scan the raw HTML response for `<a href>` and JavaScript state patterns that match `?{param}={value}` on the same path. Probe each unique `?`-variant as a separate evidence page at high priority. This is distinct from the existing FAQ anchor extraction (Fix 1) — it targets URL query-param tab navigation, not anchor fragment links.

---

**Failure D — JS accordion content truncation causing D8 score miss (waitFor regression)**

The ElevenLabs pricing page FAQ section contains in-product observability disclosures:

> "How do I check how many credits I have remaining? You can view your remaining credits by logging into the platform and navigating to your subscription page from your profile menu."

This is public documentation of in-product credit balance monitoring — directly relevant to D8 (Safety Rails, in-product observability subtest). It was NOT captured in the March 24 run.

The performance commit `bb6e4ec` reduced `waitFor` from 3000ms to a blanket 1500ms across all pages. The pricing page FAQ accordions require full JS execution to expand and render their content. At 1500ms, the accordions are not yet expanded when Firecrawl snapshots the page, so FAQ content below the fold is absent from the scraped markdown.

The already-captured equivalent ("analytics tab in Developers dashboard" from `/pricing/api`) is a different FAQ item. The credit balance FAQ is distinct and was missed entirely due to the timing regression.

**Fix needed:** Restore adaptive `waitFor` behavior: use 2500ms for `/pricing` pages specifically, or detect `<details>`, `<summary>`, accordion class patterns in the initial HTML response and apply 2500ms only when detected. The blanket 1500ms is appropriate for non-accordion pages and preserves the performance gain for most pages.

**Pattern Tag:** `subdomain-trust-center`, `login-wall-slot-consumption`, `query-param-pricing-tab-miss`, `accordion-waitfor-regression`, `post-bundle-regression-no-recovery`

---

### Entry 014 — March 24, 2026

| Field | Value |
|-------|-------|
| Companies | Replit, AirOps, Cursor, Lovable, Deepnote |
| Version | Various — cross-run observation |
| Dimension | All dimensions affected indirectly — zero-signal pages consuming slots that high-signal pages would otherwise fill |
| Root Cause | contamination — four new URL contamination failure classes identified across five reports |
| Caught By | Manual review of Pages Analyzed lists across reports |
| Status | Partially fixed. w3.org and CDN/image URLs resolved by `bb6e4ec`. Four new patterns open — see below. |

**Already fixed by `bb6e4ec` (`isEvidenceEligible()`):**

The following URL types observed in these reports are resolved as of commit `bb6e4ec` and should no longer appear in evidence sets:

| URL example | Fix mechanism |
|---|---|
| `http://w3.org/2000/svg` (Replit, AirOps, Lovable) | External domain filter |
| `http://w3.org/1999/xlink` (AirOps) | External domain filter |
| `cdn.prod.website-files.com/...lottieflow.json` (AirOps) | `cdn.` subdomain prefix filter |
| `d3gk2c5xim1je2.cloudfront.net/...caret-right.svg` (Lovable) | External domain filter |
| `lovable.dev/img/opengraph-image.png` (Lovable) | `.png` extension filter |

If any of these appear in post-`bb6e4ec` runs, treat as a regression in the filter.

---

**New failure pattern A — `@username` user-generated content paths (Replit)**

`replit.com/@03aurika23/Banana-Delivery-Bot` is an individual user's project page hosted on Replit's domain — not Replit's own product or pricing content. The current random-slug filter (`/^-[a-z0-9]{10,}$/i`) catches gamma-style slugs but not the `@username` path pattern common to platforms that host user content at their root domain (Replit, HuggingFace, GitHub, etc.).

Fix: in `isEvidenceEligible()`, reject any URL whose path contains a segment that starts with `@`.

---

**New failure pattern B — Malformed URL from HTML entity encoding (Lovable, AirOps)**

`https://d3gk2c5xim1je2.cloudfront.net/v7.1.0/solid/caret-right.svg&quot;);` — the trailing `&quot;);` is an HTML-encoded double quote followed by CSS closing syntax. This was extracted from an HTML-encoded `background-image: url(&quot;...&quot;)` declaration in inline CSS or an SVG attribute. The URL was never a real navigable link — the extractor pulled it from raw text.

The same class of malformed extraction produces the w3.org namespace URLs: SVG `xmlns` attributes (`xmlns="http://www.w3.org/2000/svg"`) are being scraped as if they were hyperlinks.

Fix: before any extracted URL enters the queue, validate that it: (1) parses cleanly as a URL with no trailing `"`, `>`, `)`, or HTML entities (`&quot;`, `&amp;`, `&#`), and (2) uses `http` or `https` scheme only. Reject silently on failure.

---

**New failure pattern C — Changelog over-representation (Cursor)**

3 of 16 slots consumed by changelog pages: `/en-US/changelog`, `/changelog/0-1-7`, `/changelog/0-10-6-nightly`. Individual versioned changelog entries document release notes — they contain no pricing, packaging, overage, or trust evidence. Two sub-issues:

1. **No per-category slot cap on `/changelog/*`.** The URL scorer does not penalize versioned changelog entries, so multiple versions fill the queue alongside each other.
2. **Locale variant not deduplicated.** `/en-US/changelog` is the same content as `/changelog` with a locale prefix. Locale prefixes (`/en/`, `/en-US/`, `/fr/`, `/de/`, etc.) are not stripped before deduplication, so both are treated as distinct pages and both are fetched.

Fix: (1) cap `/changelog/*` at 1 slot total; (2) strip locale prefixes before URL deduplication and scoring.

---

**New failure pattern D — Docs path over-representation without keyword gating (Deepnote)**

9 of 10 `/docs/*` slots consumed by zero-signal pages: AI feature guides (`/docs/ai-analysis`, `/docs/ai-code-completion`), integration connectors (`/docs/amazon-s3`, `/docs/bigquery-oauth`), usage policy (`/docs/acceptable-use-policy`), and education tools (`/docs/auto-grading-solutions`). Only `/docs/billing-alerts-and-limits` is relevant.

`/docs/` is a mixed-signal path — it cannot be capped globally or deprioritized entirely because `/docs/billing*`, `/docs/credits*`, `/docs/usage-limits*` are often the highest-signal pages in the evidence set (see Clay university link, Entry 005). The scorer currently treats all `/docs/*` URLs as equal.

Fix: within `/docs/*`, apply a two-tier scoring split:
- **Boost** paths containing: `billing`, `credits`, `usage`, `limits`, `pricing`, `plans`, `overage`, `trust`, `security`, `compliance`, `soc`, `gdpr`, `hipaa`, `data-privacy`
- **Cap at 2 slots** all `/docs/*` paths that do not match any of the above keywords

**Pattern Tag:** `at-username-ugc`, `malformed-url-html-entity`, `changelog-slot-saturation`, `locale-variant-not-deduped`, `docs-path-no-keyword-gating`

---

### Entry 013 — March 23, 2026

| Field | Value |
|-------|-------|
| Company | Beautiful.ai (beautiful.ai) |
| Version | V1 |
| Dimension | D4 Cost Driver Mapping, D5 Overages & Risk, D6 Safety Rails & Trust, D7 Pricing Transparency, D8 Enterprise/Compliance — all scored 1/2 |
| Score | 11/16 (69%) — Established Stage |
| Pages Analyzed | 13 |
| Root Cause | contamination — T2 at scale: 10 of 13 slots consumed by low-signal pages, all five 1/2 dimensions scored off a single page |
| Caught By | Manual review — evidence citations show `/pricing` as sole source for D3–D8 |
| Status | Open. Three new failure patterns identified. No fix deployed. |

**Evidence concentration finding:**
All five dimensions scoring 1/2 (D4–D8) are sourced exclusively from `beautiful.ai/pricing`. No corroborating evidence from any other page for any of these dimensions. D1 and D2 additionally cite the root homepage and one customer story. The remaining 10 pages contributed zero scored evidence across all 8 dimensions.

**Slot breakdown — 13 pages fetched:**

| Page | Classification | Signal |
|------|---------------|--------|
| `beautiful.ai/pricing` | High-signal | D1–D8 evidence |
| `beautiful.ai` (root) | High-signal | D1, D2 only |
| `/customers/cmit-solutions-...` | Customer story | D2 one quote |
| `/customers/adweek` | Customer story | None |
| `/customers/adweek#:~:text=Caroline...` | **Duplicate** (text fragment of above) | None |
| `/customers/camelot` | Customer story | None |
| `/customers/carbongate` | Customer story | None |
| `/customers/cvent` | Customer story | None |
| `/customers` (listing) | Customer index | None |
| `/compare` | Comparison page | None |
| `/compare/pitch-alternative` | Comparison page | None |
| `/pricing-demo` | Demo request page | None |
| `support.beautiful.ai/hc/.../Delete-Account` | Help article — account deletion | None |

**Three new failure patterns identified:**

**(A) Customer story page over-representation.** 5 of 13 slots consumed by `/customers/*` pages. Customer stories contain testimonials and workflow quotes but have near-zero evidence for D4 (cost drivers), D5 (overages), D6 (safety rails), D7 (pricing transparency), or D8 (compliance). No cap exists on how many customer story pages enter the queue — the URL scorer does not penalize them sufficiently relative to pricing/trust paths.

**(B) Text fragment anchor not deduplicated.** `/customers/adweek#:~:text=Caroline%20explained...` is identical in content to `/customers/adweek` — Firecrawl returns the same markdown for both because the `#:~:text=` fragment is a browser-only scroll hint with no server-side effect. This consumed a page slot as a functional duplicate. The deduplication logic should strip text fragment anchors (`#:~:text=`) before comparing URLs.

**(C) Low-signal support article from legitimate subdomain.** `support.beautiful.ai/hc/en-us/articles/360028561851-Delete-Account` passed the domain filter (subdomain of beautiful.ai) and the evidence eligibility filter. It is a help article about how to delete your account — zero signal for any pricing or trust dimension. A help/support article about account deletion is the lowest-signal page type possible and consumed a slot that a billing FAQ or trust center article could have filled.

**Root Cause Detail:**
The pipeline has no mechanism to cap over-representation of any single path category. Once `/customers/adweek` scores above threshold, `/customers/adweek#:~:text=...`, `/customers/camelot`, `/customers/carbongate`, and `/customers/cvent` all score similarly and fill the queue. The practical effect: all five 1/2 dimensions have no corroborating evidence beyond a single page, and any gap on `/pricing` becomes unrecoverable.

**Pattern Tag:** `customer-story-slot-saturation`, `text-fragment-duplicate`, `low-signal-support-article`, `single-page-evidence-concentration`

---

### Entry 012 — March 23, 2026

| Field | Value |
|-------|-------|
| Company | ZoomInfo.com |
| Version | V2 → V3 (two independent reruns, March 22 → March 23) |
| Dimension | Product North Star (D1), ICP & Job Clarity (D2) |
| Score | V2: not recorded | V3: lower — D1 and D2 dropped |
| Score Delta | D1 and D2 both regressed between independent reruns |
| Pages Analyzed | V2: homepage present | V3: homepage absent from evidence set |
| Root Cause | pipeline_miss — pipeline inconsistency across independent reruns |
| Caught By | Manual comparison of V2 and V3 page lists |
| Status | Fix not yet implemented. Fix 3A does not cover this failure class — see Root Cause Detail. |

**Root Cause Detail:**
ZoomInfo's homepage (`zoominfo.com`) is a primary evidence page for D1 (Product North Star) and D2 (ICP & Job Clarity) — it contains the clearest articulation of the product's purpose, target buyer, and use case framing. In the March 22 run, the homepage appeared in the evidence set and both dimensions scored correctly. In the March 23 rerun (same company, no changes to public site), the homepage was absent from the fetched page list and D1/D2 dropped as a result.

This is a **pipeline inconsistency** failure: Firecrawl's `/map` API does not return a deterministic URL set across independent calls. The homepage ranked below the 10-page cutoff in the March 23 run due to map ordering variance, not any change to the site.

**Why Fix 3A did not fire:** Fix 3A (Score Stability Rule) only activates when `previousScores` is explicitly passed into the `analyze-company` function call. The application makes independent stateless calls — `previousScores` is never populated from a prior run. Fix 3A is structurally dormant for all production runs. Even if Fix 3A had fired, it would only hold the score if zero contradicting evidence appeared — it cannot guarantee the homepage appears in the evidence set.

**Resolution needed:**
1. **Score persistence** — store last known per-dimension scores and confidence per company in Supabase after each run.
2. **Score injection** — retrieve and pass stored scores as `previousScores` on subsequent runs for the same company to activate Fix 3A.
3. **Homepage pinning** — the company root domain URL should be force-added to the evidence set regardless of map results, similar to how `/pricing` was given priority override.

**Pattern Tag:** `pipeline-inconsistency-rerun`, `homepage-absent-map-variance`, `fix-3a-dormant`

---

### Entry 011 — March 23, 2026

| Field | Value |
|-------|-------|
| Company | ElevenLabs.io |
| Version | V2 → V3 (March 6 baseline → March 23 post-fix rerun) |
| Dimension | Pricing Transparency (D7), Enterprise/Compliance (D8) |
| Score | V2: higher | V3: lower — D7 and D8 regressed |
| Score Delta | D7 and D8 both dropped post-fix deployment |
| Pages Analyzed | V2: 18 pages (including /security and /trust) | V3: 7 pages (/security and /trust absent) |
| Root Cause | contamination — post-fix evidence set shrinkage; high-signal pages dropped after fix deployment changed page selection |
| Caught By | Manual page list comparison across runs |
| Status | Fix not yet identified. Fix 3A wrong failure class — cannot protect against missing pages. |

**Root Cause Detail:**
The March 6 run (pre-fix) fetched 18 pages including `elevenlabs.io/security` and `elevenlabs.io/trust` — the two highest-signal pages for D7 and D8 respectively. The March 23 rerun (post-fix deployment) fetched only 7 pages and neither `/security` nor `/trust` appeared in the evidence set. D7 and D8 dropped as a direct result.

This is a **post-fix evidence shrinkage** failure. The pipeline fixes deployed between March 6 and March 23 changed how URLs are selected, filtered, and capped:
- `maxPages` default reduced from 15 → 10 (performance fix `bb6e4ec`)
- `isEvidenceEligible()` pre-filter added — may be incorrectly excluding `/security` or `/trust` paths
- Fix 3B page-to-dimension routing changes may be deprioritizing trust-center paths relative to pricing/billing paths

**Why Fix 3A did not fire:** Fix 3A cannot protect against this failure class. The Score Stability Rule only holds a prior score when new evidence is zero-signal. When high-signal pages are *absent from the evidence set entirely*, Fix 3A has no prior-run scores to compare against (same dormancy issue as Entry 012). Even with full Fix 3A activation, a missing `/security` page produces no evidence — Fix 3A would still allow the score to drop because there is no explicit contradiction to block.

**Resolution needed:**
1. **Trust-center path pinning** — `/security`, `/trust`, `/compliance`, `/privacy` paths should be added to the `highIntentPaths` set with explicit positive scoring weight, not just left to map discovery.
2. **Investigate `isEvidenceEligible()` filter** — confirm `/security` and `/trust` are not being incorrectly excluded by the domain or path pre-filter.
3. **Regression test for page count** — before deploying performance page-count reductions, check that anchor high-signal pages (pricing, security, trust) still appear in the post-change evidence set for a known-good company.

**Pattern Tag:** `post-fix-page-shrinkage`, `security-trust-pages-absent`, `fix-3a-wrong-failure-class`, `performance-fix-evidence-regression`

---

### Entry 010 — March 15, 2026

| Field | Value |
|-------|-------|
| Company | Lovable.dev |
| Version | V2 → V3 (March 8 → March 15, two independent runs) |
| Dimension | ICP & Job Clarity (D2) |
| Score | V2: D2 = 2/2 | V3: D2 = 1/2 |
| Score Delta | −1 on D2 only; all other dimensions held |
| Pages Analyzed | Identical — same 7 pages in both runs |
| Root Cause | prompt_drift — same evidence set, different score on independent rerun |
| Caught By | Manual comparison after user noticed overall score change |
| Status | Fix not yet implemented. Predates Fix 3A. Fix 3A would cover this if score persistence were active — see Root Cause Detail. |

**Root Cause Detail:**
Both runs analyzed identical pages (7 pages, same URLs, same content — no changes to Lovable's public site between March 8 and March 15). D2 (ICP & Job Clarity) scored 2/2 in the March 8 run and 1/2 in the March 15 run with no change to the evidence set. All other 7 dimensions held.

This is **pure prompt drift** — scoring model instability producing different output from the same input across two calls. The Gemini 2.5 Flash model's response for D2 is non-deterministic at the margin of a 2/2 score. The March 8 run's 3-pass majority vote resolved to 2/2; the March 15 2-pass merge resolved to 1/2.

**Contributing factors:**
1. The switch from 3-pass → 2-pass scoring (performance fix `bb6e4ec`) reduced majority vote robustness. A 3-pass vote requires 2/3 agreement; 2-pass is a coin flip on disagreements, with confidence as tiebreaker.
2. D2 is a dimension where LLM inference of buyer clarity from marketing copy is inherently ambiguous — "developer-adjacent" products sit on the 1/2 vs. 2/2 threshold without bright-line evidence.

**Why Fix 3A would cover this (when active):** If `previousScores` were passed, Fix 3A's Score Stability Rule would hold D2 at 2/2 absent contradicting evidence. Prompt drift produces no contradicting evidence — it produces a lower-confidence alternative reading of the same text. Fix 3A is the correct mechanism for this failure class, but it requires score persistence infrastructure to be operational.

**Resolution needed:**
1. **Score persistence + injection** (same as Entry 012) — activates Fix 3A for all production runs.
2. **D2 threshold review** — consider whether the D2 subtest rubric has a bright-line at 2/2 that is LLM-interpretable, or whether the threshold is inherently ambiguous for developer-tool products.

**Pattern Tag:** `prompt-drift-same-evidence`, `d2-threshold-ambiguity`, `2-pass-vote-instability`, `fix-3a-dormant`

---

### Entry 009 — March 22, 2026

| Field | Value |
|-------|-------|
| Company | Relevance AI (relevance.ai) |
| Version | V2 (post-fix) |
| Dimension | Value Unit, Cost Driver Mapping, Buyer & Budget Alignment (improved); Pools & Packaging, Overages & Risk (unchanged) |
| Score | 10/16 (63%) — Established Stage |
| Score Delta vs V1 | +19 percentage points (44% → 63%) |
| Pages Analyzed | 4 (relevance.ai/pricing, docs.relevance.ai, cdn.relevanceai.com/images/customerstories/eftsure-logo-2.webp, relevance.ai) |
| Root Cause | Partially resolved — canonical path probing fix correctly surfaced pricing page |
| Caught By | Score comparison V1 → V2 |
| Status | Resolved. V2 is valid baseline. Remaining gaps reflect genuine non-disclosure by Relevance AI, not pipeline misses. |

**Dimension Changes V1 → V2:**

- **Value Unit:** 0/2 → 1/2 — pricing page confirmed Actions + vendor credits as primary units
- **Cost Driver Mapping:** 0/2 → 1/2 — pricing page provided Actions/month and Vendor Credits/month limits per tier
- **Buyer & Budget Alignment:** 1/2 → 2/2 — pricing page confirmed Free/Pro/Team/Enterprise tier structure with SSO, RBAC, custom implementation for Enterprise

**Dimensions Unchanged V1 → V2:**

- **Pools & Packaging:** held at 1/2 — rollover mentioned but reset cadence and top-up rules not publicly detailed
- **Overages & Risk:** held at 1/2 — overage policy explicitly stated as "None specified" on pricing page — accurate, not a pipeline miss

**Note on CDN URL in Pages Analyzed:**
`cdn.relevanceai.com/images/customerstories/eftsure-logo-2.webp` appeared in the pages list. Image/CDN asset URLs should be filtered from the queue before scraping — they cannot contribute evidence and consume a page slot. See Known Failure Modes.

**Root Cause Detail:**
Canonical path probing fix correctly constructed `relevance.ai/pricing` despite it being absent from the sitemap. Confirmed working. Remaining dimension gaps (Value Unit 1/2, Overages & Risk 1/2) reflect deliberate non-disclosure by Relevance AI — accurate scoring, not a pipeline miss. The "Overage Policy: None specified" on their pricing page is the correct scoring input for Overages & Risk.

**Pattern Tag:** `post-fix-baseline`, `genuine-non-disclosure`, `cdn-url-slot-contamination`, `overage-policy-none-specified`

---

### Entry 008 — March 22, 2026

| Field | Value |
|-------|-------|
| Company | Relevance AI (relevanceai.com) |
| Version | V1 |
| Dimension | N/A — report not generated |
| Score | Not completed — runtime error on scoring pass |
| Pages Analyzed | Pipeline failed before report generated |
| Root Cause | pipeline_miss — two simultaneous failure modes |
| Caught By | Manual review — pricing page absence identified in logs before report completed |
| Status | Both issues fixed. See Entry 009 for rerun results. |

**Root Cause Detail:**

**(A) Pricing page miss — sitemap exclusion + wrong page selected.** `relevanceai.com/pricing` was not returned by Firecrawl's `/map` API because the page is absent from the site's sitemap. The scraper selected `/agent-templates-tasks/pricing-optimization-ai-agents` instead — a page that matched the keyword "pricing" but is not the actual pricing page. Root cause: the forced pricing pattern had nothing to match when `/pricing` was not in the map results.

**(B) Runtime 500 error.** A transient connection reset on the 3rd scoring pass caused full function failure.

**Resolution:**

1. **Canonical path probing** — if `/pricing`, `/plans`, or `/billing` are not found in map results, the scraper now constructs and directly attempts to scrape these paths. This is a new fix class beyond the existing secondary pass logic and applies to any company whose pricing page is excluded from their sitemap.
2. **Retry logic with exponential backoff** added to `callLovableAI` (up to 2 retries) to handle transient network errors on the scoring pass.

**Pattern Tag:** `pricing-page-sitemap-excluded`, `wrong-page-keyword-match`, `transient-500-scoring-pass`

---

### Entry 007 — March 22, 2026

| Field | Value |
|-------|-------|
| Company | Miro.com |
| Version | V2 (post-fix) |
| Dimension | All 8 dimensions — partial observability |
| Score | 11/16 (69%) — Established Stage |
| Pages Analyzed | 13 (including miro.com/pricing) |
| Root Cause | Partially resolved — pricing page now present and used for scoring |
| Caught By | Comparison to V1 baseline |
| Status | Stable. Miro V2 is a valid post-fix baseline. |

**Root Cause Detail:**
Pricing page prioritization fix from Round 6 resolved the V1 catastrophic failure. `miro.com/pricing` is now present and contributing evidence across all 8 dimensions. Score of 69% reflects genuine partial observability — AI credit metering and safety rail details are not publicly documented by Miro. This is accurate, not a pipeline miss.

**Open Issues:**
FAQ deep link extraction from pricing page not yet confirmed for Miro. If `miro.com/pricing` contains accordion/FAQ links to a help center article defining AI credit metering, those would be missed under the current implementation. Recommend a follow-up run to confirm.

**Pattern Tag:** `post-fix-baseline`, `genuine-partial-observability`, `miro-ai-credit-metering-gap`

---

### Entry 006 — March 22, 2026

| Field | Value |
|-------|-------|
| Company | Miro.com |
| Version | V1 (pre-fix) |
| Dimension | Dimensions 3–8 (all scored 0/2) |
| Score | 3/16 (19%) — Nascent Stage |
| Pages Analyzed | 15 |
| Root Cause | pipeline_miss — catastrophic: two simultaneous failure modes |
| Caught By | Manual review — 19% on a well-known SaaS product with a public pricing page immediately flagged |
| Status | Fixed. Exclusion pattern and pricing priority fix applied in Round 6. |

**Root Cause Detail:**

**(A) Pricing page completely absent from evidence set.** Despite `miro.com/pricing` existing and being the highest-priority target, it was not fetched or analyzed. Dimensions 3–8 scored 0/2 as a direct result. This is the most severe single-page miss observed across all test runs.

**(B) 9 of 15 page slots consumed by `miro.com/app/board/*` URLs** — individual whiteboard embed pages containing no pricing, packaging, or trust surface content. These pages matched the domain but had zero dimension relevance. They crowded out the pricing page entirely.

**Resolution:**
Round 6: Pricing page forced to highest priority regardless of URL scoring. `/app/board/*` pattern added to exclusion list. Cache cleared and rerun confirmed V2 at 69%.

**Pattern Tag:** `pricing-page-absent`, `product-embed-url-slot-consumption`, `catastrophic-pipeline-failure`

---

### Entry 005 — March 22, 2026

| Field | Value |
|-------|-------|
| Company | Clay.com |
| Version | V3 (post all rounds of fixes) |
| Dimension | Value Unit (primary improvement), all dimensions |
| Score | 12/16 (75%) — Established Stage |
| Pages Analyzed | 7 (including university.clay.com/docs/actions-data-credits) |
| Root Cause | Resolved — university deep link now extracted and analyzed |
| Caught By | Score comparison across rounds |
| Status | Stable. Clay V3 is the new calibration anchor. |

**Root Cause Detail:**
After 5 rounds of iteration, `university.clay.com/docs/actions-data-credits` is now present in the evidence set. Value Unit scored 2/2 (up from 1/2) as a direct result, confirming this page contains the authoritative definition of Actions and Data Credits. Overall score held at 75% — the university link improved Value Unit but Cost Driver Mapping, Overages, and Safety Rails remain at 1/2 reflecting genuine gaps in Clay's public documentation.

**Key finding:** A single deep link off the pricing page FAQ was the signal page for an entire dimension. This pattern is expected to repeat across other companies.

**Pattern Tag:** `university-deep-link-signal-page`, `faq-accordion-extraction-success`, `clay-v3-calibration`

---

### Entry 004 — March 22, 2026

| Field | Value |
|-------|-------|
| Company | Clay.com |
| Version | Post-fix V1 through V2 (6 rounds of iteration) |
| Dimension | Multiple — Value Unit primary, score stability secondary |
| Score Progression | 75% → 69% (regression) → 75% (recovered) → 75% (V3 with university link) |
| Root Cause | pipeline_miss — fix implementation errors, 4 sub-issues requiring 6 rounds to resolve |
| Caught By | Manual review across all rounds |
| Status | Fixed in V3. |

**Root Cause Detail:**

**(A) Fix 1 sourced FAQ anchor links from `www.clay.com/faq` instead of `clay.com/pricing` DOM.** Resolved Round 1.

**(B) URL deduplication failure** — `www.clay.com/faq` appeared twice in pages list. Resolved Round 1.

**(C) Fix 3 Score Stability Rule caused score regression to 69%** by anchoring to a stale cached run. Floor logic corrected to ensure scores can only go up or stay the same vs. most recent prior run. Resolved Round 1.

**(D) FAQ/accordion deep link extraction not scoped correctly** — five rounds required to correctly extract `university.clay.com/docs/actions-data-credits` from the FAQ section of `clay.com/pricing` specifically. Root issue: extraction was either too broad (keyword matching introduced instability) or too narrow (scoped to wrong DOM regions). Final fix: extraction anchored to pricing page and pricing-calculator only, following hyperlinks with ≥2 path segments found within accordion/FAQ regions. Generic root subdomains excluded. Resolved Round 6.

**Pattern Tag:** `fix-implementation-regression`, `faq-extraction-scope-error`, `score-stability-floor-logic`, `deduplication-miss`

---

### Entry 003 — March 2026

| Field | Value |
|-------|-------|
| Company | ZoomInfo.com |
| Version | V1 → V2 |
| Dimension | Value Unit |
| Subtest(s) | Unit definition presence, metering corroboration |
| V1 Score | 1/2 (50% conf) |
| V2 Score | 0/2 (30% conf) |
| Root Cause | pipeline_miss — Score Stability failure |
| Caught By | Manual review (user compared V1 and V2 evidence side by side) |
| Status | Fix specified, not yet implemented |

**Root Cause Detail:**
V1 correctly scored Value Unit at 1/2 based on `/faqs/pricing` evidence confirming seats and credits as primary units. V2 added `/about/payments` pages which contained zero Value Unit-relevant evidence — only billing logistics (payment methods, invoice navigation). The scoring pass treated the absence of corroborating signal from the new pages as dilution of existing positive signal, causing the score to drop. The V1 evidence was uncontradicted and the correct score should have held.

**Resolution:**
Two fixes required:

1. **Score Stability Rule** — A score can only change if the new evidence set contains at least one page with affirmative or contradicting evidence for that dimension. Zero-signal pages are inert with respect to scoring.
2. **Page-to-Dimension Routing** — Billing support pages (`/about/payments`, `/billing-support`, `/invoice`) are routed to Dimension 7 (Overages & Risk) evidence only and do not contribute to character budgets for Dimensions 4, 5, or 6.

**Pattern Tag:** `score-stability-zero-signal-dilution`, `billing-page-dimension-bleed`

---

### Entry 002 — March 2026

| Field | Value |
|-------|-------|
| Company | Hex.tech |
| Version | V1 → V2 |
| Dimension | Multiple dimensions improved |
| Subtest(s) | Compute unit definition, credit unit definition, metering surfaces |
| V1 Score | 63% overall |
| V2 Score | 100% overall |
| Root Cause | pipeline_miss — pricing page secondary links not crawled |
| Caught By | Manual review (user added missing URLs manually for V2) |
| Status | Fix specified, not yet implemented. Shares implementation with Clay fix. |

**Root Cause Detail:**
Two deeper links off the pricing page were missed by the crawler — `https://hex.tech/pricing/?modal=compute` and `https://hex.tech/pricing/#faq-credits`. Both are modal and FAQ anchor patterns triggered from the pricing page. These contained the primary evidence for compute and credit unit definitions. Without them, dimension subtests failed that should have passed.

**Resolution:**
Same fix as Clay (Entry 001) — **Pricing Page Secondary Pass**. This is independent confirmation of the same failure mode across two companies:

- After fetching `/pricing`, extract and queue all modal URLs, FAQ anchor fragment links, and in-FAQ hyperlinks with priority +1200 before scoring begins.
- Pre-Scoring Validation Layer (see Entry 001 for full spec).

**Pattern Tag:** `pricing-page-secondary-pass`, `modal-faq-anchor-miss`

---

### Entry 001 — March 2026

| Field | Value |
|-------|-------|
| Company | Clay.com |
| Version | V1 → V2 |
| Dimension | Value Unit, Cost Driver Mapping, Safety Rails & Trust Surfaces (multiple improved) |
| Subtest(s) | Multiple — see root cause |
| V1 Score | 75% overall |
| V2 Score | 94% overall |
| Root Cause | pipeline_miss — pricing page secondary links not crawled; pre-scoring validation absent |
| Caught By | Manual review (user added missing URL manually for V2) |
| Status | Fix specified, not yet implemented |

**Root Cause Detail:**
The evidence crawler fetched `/pricing` but did not follow a deeper link accessible via the FAQ section of the pricing page. The missed page contained high-signal evidence for multiple dimensions. Additionally, 8 of 15 queued pages returned unresolved (404 or empty). The pipeline proceeded to scoring against a partial evidence set with no flag or confidence adjustment.

**Resolution:**
Two fixes required:

1. **Pricing Page Secondary Pass** — After fetching `/pricing`, extract and queue all modal URLs, FAQ anchor fragment links, and in-FAQ hyperlinks with priority +1200 before scoring begins.
2. **Pre-Scoring Validation Layer** — Validate each queued page returned status 200 with non-empty content before scoring. If ≥30% unresolved, retry once. Remaining unresolved pages trigger confidence penalty −0.15 on affected dimensions.

**Pattern Tag:** `pricing-page-secondary-pass`, `unresolved-page-no-flag`

---

## Known Failure Modes

Recurring pipeline failure patterns identified across production runs. Each row is a confirmed failure class with a fix status.

| Failure Mode | Status |
|---|---|
| Pricing page secondary links (modals, FAQ anchors) not crawled | Fixed — Fix 1: Pricing Page Secondary Pass |
| Pre-scoring validation absent; unresolved pages not flagged | Fixed — Fix 2: Pre-Scoring Validation Layer |
| Score drops when zero-signal pages added to evidence set | Fixed — Fix 3A: Score Stability Rule |
| Billing support pages bleeding into D4/D5/D6 evidence windows | Fixed — Fix 3B: Page-to-Dimension Routing |
| /app/board/* and equivalent product embed URLs consuming page slots | Fixed — exclusion pattern added Round 6 |
| Pricing page present but not used for scoring (priority override failure) | Fixed — pricing forced to highest priority Round 6 |
| 404/Not Found pages appearing in Pages Analyzed list | Fixed — 404 filter added Round 3 |
| FAQ deep link extraction scoping errors (too broad or wrong DOM region) | Fixed Round 6 — anchor to pricing page FAQ regions, follow ≥2 path segment URLs only |
| Pricing page excluded from sitemap — keyword match selects wrong page | Fixed — canonical path probing added. If `/pricing`, `/plans`, `/billing` absent from map results, scraper constructs and probes directly. |
| Transient network error on scoring pass causes full function 500 | Fixed — retry logic with exponential backoff added to `callLovableAI` (up to 2 retries). |
| Image/CDN URLs queued as pages (e.g., .webp, .png, .jpg, .gif, .svg, cdn.* subdomains) | Fixed — `isEvidenceEligible()` pre-filter deployed `bb6e4ec`. CDN subdomains and binary asset extensions excluded before queue entry. |
| User-generated content at domain paths consuming page slots (e.g., gamma.app/docs/random-slug, ephemeral customer-created pages) | Fixed — `isEvidenceEligible()` pre-filter deployed `bb6e4ec`. Path segments matching random-slug pattern (`/^-[a-z0-9]{10,}$/i`) excluded. |
| w3.org/2000/svg and other external domains appearing as evidence URLs | Fixed — `isEvidenceEligible()` pre-filter deployed `bb6e4ec`. Any URL whose host does not match the registrable domain of the target company is excluded. |
| Fix 3A (Score Stability Rule) operationally dormant — no score persistence or injection mechanism exists | Open — Fix 3A only activates when `previousScores` is explicitly passed. The app never passes `previousScores` (every run is independent/stateless). Requires: (1) store per-dimension scores in Supabase after each run, (2) retrieve and inject on next run for same company. |
| Prompt drift — same evidence set, different score on independent rerun | Open — covered by Fix 3A when active. Currently dormant (see above). Observed: Lovable D2, March 8→15. 2-pass scoring is more susceptible than 3-pass due to reduced majority vote robustness. |
| Post-fix evidence set shrinkage — page selection changes after fix deployment reduce total pages fetched, dropping high-signal pages | Fixed — Bundle 2. `/security`, `/trust`, `/compliance`, `/privacy` added to `highIntentPaths` (+900 score, same as `/pricing`). Will survive page-count cutoffs alongside pricing. |
| Pipeline inconsistency across independent reruns — different pages fetched for same company on separate runs due to Firecrawl map ordering variance | Fixed — Bundle 2. Homepage (Step 1) now always pushed to `pages` regardless of whether `mainPageData.data` is null. Homepage is structurally force-scraped before any URL selection. Score persistence + Fix 3A injection is secondary mitigation (still open — Bundle 4). |
| Customer story page over-representation — `/customers/*` pages saturate queue with near-zero D4–D8 signal | Fixed — Bundle 1. Per-category slot caps: `/customers/*` + `/case-studies/*` share 2 slots combined; `/blog/*` 1 slot; `/changelog/*` 1 slot. |
| Text fragment anchor URLs not deduplicated — `#:~:text=` fragments produce functionally identical content to the base URL but consume a separate slot | Fixed — Bundle 1. `normaliseForDedup()` strips `#:~:text=` fragments before deduplication key comparison. |
| Low-signal support articles from legitimate subdomains entering queue — `support.*` help articles about non-pricing topics (e.g., account deletion) pass domain filter but have zero evidence value | Open — observed: Beautiful.ai `support.beautiful.ai/hc/.../Delete-Account`. Fix: deprioritize or cap support subdomain articles that don't match billing/pricing/trust keyword patterns. |
| `@username` user-generated content paths entering queue (e.g., replit.com/@user/project-name) | Fixed — Bundle 1. `isEvidenceEligible()` rejects any URL path segment starting with `@`. |
| Malformed URLs from HTML entity encoding entering queue — `&quot;);` suffix, w3.org xmlns attributes scraped as hyperlinks | Fixed — Bundle 1. `isEvidenceEligible()` rejects URLs with trailing HTML entities or CSS syntax; scheme filter rejects non-http/https. |
| Changelog over-representation — versioned `/changelog/x-y-z` entries consuming multiple slots with zero pricing/trust signal | Fixed — Bundle 1. `/changelog/*` capped at 1 slot in per-category slot reservation. |
| Locale variant paths not deduplicated — `/en-US/page` and `/page` treated as distinct URLs | Fixed — Bundle 1. `normaliseForDedup()` strips locale prefixes (`/en/`, `/en-US/`, `/fr/`, etc.) before deduplication key comparison. |
| `/docs/*` over-representation without keyword gating — integration and feature docs consuming slots ahead of billing/limits docs | Open — observed: Deepnote (9 of 10 docs slots zero-signal; only `/docs/billing-alerts-and-limits` relevant). Fix: boost `/docs/*billing*`, `/docs/*credits*`, `/docs/*limits*`, `/docs/*security*` etc.; cap non-matching `/docs/*` at 2 slots. |
| Product database pages with pure numeric last path segment consuming evidence slots — e.g., `/c/company/551539465` are database record URLs that return login walls | Fixed — Rule E added to `isEvidenceEligible()`: reject last path segment matching `/^\d{5,}$/`. Observed: ZoomInfo (Entry 047). |
| Same billing page URL with section anchor variants appearing multiple times in Pages Analyzed — dedup preserves hash fragments by design (for FAQ anchors) but billing pages have no section-partitioned content | Fixed — `normaliseForDedup()` strips both query params and hash fragments for billing/payment paths. Observed: ZoomInfo `/about/payments` ×4 (Entry 048). |
| Trust center hosted on separate subdomain (`compliance.*`, `trust.*`, `security.*`) — unreachable by path probing or Firecrawl map | Open — observed: ElevenLabs `compliance.elevenlabs.io` (Entry 015). Path pinning in Bundle 2 cannot reach subdomain-hosted trust centers. Fix: probe `compliance.{domain}`, `trust.{domain}`, `security.{domain}` as subdomain roots alongside canonical path probes. |
| Login-wall pages consuming evidence slots — `/subscription`, `/usage`, `/account` scrape successfully (HTTP 200) but return only "Sign In" page with zero evidence | Open — observed: ElevenLabs `/subscription` and `/usage` (Entry 015), 28% of evidence budget wasted. Fix: add gated path blocklist to `isEvidenceEligible()`: reject `/subscription`, `/usage`, `/account`, `/dashboard`, `/settings`, `/login`, `/signin`, `/sign-in`, `/register`. |
| Tab-partitioned pricing page — query-param tab variants (`?price.platform=api` etc.) not reached by map, Fix 1, or deduplication; each tab contains distinct pricing/limits evidence | Open — observed: ElevenLabs pricing (Entry 015). Affects D5 and D7 specifically. Fix: after scraping `/pricing`, scan raw HTML for query-param variants on same path; probe each as a separate high-priority evidence page. |
| JS accordion content truncated on pricing page — `waitFor` reduction to 1500ms (`bb6e4ec`) prevents FAQ accordions from fully rendering; below-fold FAQ content absent from scraped markdown | Open — observed: ElevenLabs pricing FAQ credit balance answer missing (Entry 015); confirmed D8 score miss. Fix: restore adaptive `waitFor` — use 2500ms for `/pricing` pages or when accordion markup detected in initial HTML response. |

---

## Calibration Anchors

These are locked reference scores for companies that have been fully validated. If a future rubric or prompt change causes any of these scores to shift without new contradicting public evidence, that is a **calibration regression** and must be investigated before the change ships.

| Company | Dimension | Locked Score | Confidence | Notes |
|---------|-----------|-------------|------------|-------|
| Clay.com | Overall | 75% (12/16) | 70% | V3 post all fixes. 7 pages including university.clay.com/docs/actions-data-credits. Value Unit 2/2 confirmed. This is the authoritative locked score. Previous 94% (V2) was based on a pipeline miss that overcorrected — V3 is correct. |
| Clay.com | Value Unit | 2/2 | 90% | Requires university.clay.com/docs/actions-data-credits in evidence set. If this page is absent, Value Unit drops to 1/2 — this is the Signal Page for this dimension. |
| Hex.tech | Overall | 100% | 76% | Post-V2 score after modal and FAQ anchor links added. V1 63% was pipeline miss. |
| Miro.com | Overall | 69% (11/16) | 64% | V2 post-fix. Pricing page present. Score reflects genuine partial observability — AI credit metering not publicly documented. Valid baseline. Follow-up recommended to check FAQ deep links on pricing page. |
| ZoomInfo.com | Value Unit | 1/2 | 50% | V1 is authoritative. Confirmed again at v18 post scraper fixes — billing page dedup removal eliminated dimension bleed that had inflated this to 2/2 in the broken run. Credit metering formula and auditability surfaces not publicly documented — genuine gap, not pipeline miss. |
| Relevance AI | Overall | 63% (10/16) | 64% | V2 post-fix. 4 pages. Pricing page present via canonical path probing. Remaining gaps (Value Unit 1/2, overage policy) reflect deliberate non-disclosure — accurate, not pipeline misses. |
| Relevance AI | Overages & Risk | 1/2 | 45% | Pricing page explicitly states "Overage Policy: None specified." Score is accurate. Do not adjust upward without new public evidence of an actual overage policy. |
| Grain.com | Overall | 75% (12/16) | 68% | Confirmed by TWO independent full-evidence scans: May 2026 benchmark AND the July 31 v37 repeatability test Run 5 (12 pages, /pricing + support-article deep links present). Convergent result — treat as the authoritative score whenever the evidence set is complete. See Entry 059: four other same-day v37 reruns (5–8 pages, /pricing missing in 3 of them) scored 9–11/16 — those are pipeline evidence-completeness misses, not genuine instability. Any future Grain score below 12/16 should be checked against Appendix A for /pricing and support.grain.com plan-article presence before treating it as a real score change. |
| Grain.com | Overages & Risk | 1/2 | 60% | Structural ceiling per methodology, not a pipeline miss: "Overage Policy: N/A" on a seat-based flat-rate product caps at 1/2 without enterprise true-up language (Dimension 7 gates). Confirmed correct at full evidence (Run 5). Do not adjust upward without new public evidence of enterprise true-up terms. |

---

## Entry Template

```
### Entry [NNN] — [Month YYYY]

| Field | Value |
|-------|-------|
| Company | |
| Version | |
| Dimension | |
| Subtest(s) | |
| V1 Score | |
| V2 Score | |
| Root Cause | [evidence_gap · gate_misfire · confidence_miscalc · prompt_drift · pipeline_miss · contamination · other] |
| Caught By | |
| Status | [fix_specified · implemented · no_action · deferred] |

**Root Cause Detail:**

**Resolution:**

**Pattern Tag:** `tag-here`
```
