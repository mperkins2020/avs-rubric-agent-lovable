// The scoring engine prefixes D1-D8 rationales with a machine-readable audit
// block — "[D_ audit: ...]" — used to force subtest arithmetic and, as of
// Entry 069 (pipeline v41), inline per-subtest evidence citations attached
// directly to each PASS mark (e.g. "C1=P(tasks@/pricing)"). Historical
// rationale text from before Entry 069 may still carry a separate
// "[D_ evidence: ...]" bracket — the regex below matches both forms, so no
// code change was needed for the format switch. These are QA artifacts, not
// customer-facing prose.

// NOTE: audit blocks routinely contain nested square brackets from evidence
// paths (e.g. "jtbd[0].inputs[]@https://..."), so a naive /\[[^\]]*\]/ match
// terminates at the first inner "]" and leaks the tail of the block into the
// customer-facing prose. We scan with bracket-depth tracking instead.
const AUDIT_BLOCK_START_RE = /\[D\d+\s+(?:audit|evidence):/gi;

export interface SplitRationale {
  /** Bracketed audit/evidence blocks, in order of appearance. Empty if none. */
  auditBlocks: string[];
  /** The rationale with audit/evidence blocks removed. */
  prose: string;
}

export function splitRationale(rationale: string): SplitRationale {
  if (!rationale) return { auditBlocks: [], prose: "" };

  const auditBlocks: string[] = [];
  let prose = "";
  let cursor = 0;

  AUDIT_BLOCK_START_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = AUDIT_BLOCK_START_RE.exec(rationale)) !== null) {
    const start = match.index;
    if (start < cursor) continue;

    // Walk forward to the bracket that closes this block.
    let depth = 0;
    let end = -1;
    for (let i = start; i < rationale.length; i++) {
      const ch = rationale[i];
      if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    // Unterminated block: drop everything from here to be safe.
    if (end === -1) {
      prose += rationale.slice(cursor, start);
      cursor = rationale.length;
      break;
    }

    auditBlocks.push(rationale.slice(start, end + 1).trim());
    prose += rationale.slice(cursor, start) + " ";
    cursor = end + 1;
    AUDIT_BLOCK_START_RE.lastIndex = cursor;
  }

  prose += rationale.slice(cursor);
  return {
    auditBlocks,
    prose: prose.replace(/\s{2,}/g, " ").trim(),
  };
}

