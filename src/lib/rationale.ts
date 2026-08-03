// The scoring engine prefixes D1-D8 rationales with a machine-readable audit
// block — "[D_ audit: ...]" — used to force subtest arithmetic and, as of
// Entry 069 (pipeline v41), inline per-subtest evidence citations attached
// directly to each PASS mark (e.g. "C1=P(tasks@/pricing)"). Historical
// rationale text from before Entry 069 may still carry a separate
// "[D_ evidence: ...]" bracket — the regex below matches both forms, so no
// code change was needed for the format switch. These are QA artifacts, not
// customer-facing prose.

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
