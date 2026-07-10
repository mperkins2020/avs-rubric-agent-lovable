// The scoring engine prefixes D5/D7 rationales with machine-readable audit
// blocks — "[D5 audit: ...]" and "[D5 evidence: ...]" — used to force subtest
// arithmetic and per-subtest evidence traceability (pipeline v30/v32).
// These are QA artifacts, not customer-facing prose.

const AUDIT_BLOCK_RE = /\[D\d+\s+(?:audit|evidence):[^\]]*\]\s*/gi;

export interface SplitRationale {
  /** Bracketed audit/evidence blocks, in order of appearance. Empty if none. */
  auditBlocks: string[];
  /** The rationale with audit/evidence blocks removed. */
  prose: string;
}

export function splitRationale(rationale: string): SplitRationale {
  const auditBlocks = (rationale.match(AUDIT_BLOCK_RE) ?? []).map((b) => b.trim());
  const prose = rationale.replace(AUDIT_BLOCK_RE, " ").replace(/\s{2,}/g, " ").trim();
  return { auditBlocks, prose };
}
