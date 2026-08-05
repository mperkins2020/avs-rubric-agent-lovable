// Pure, dependency-free TS (no Deno-only APIs) — same rationale as
// rubric-audit.ts's header comment: directly importable by both index.ts
// (Deno) and vitest (Node) without a mirror/drift setup.

/**
 * Repairs a JSON string truncated mid-generation (finish_reason "length")
 * by dropping the last incomplete member and closing every remaining open
 * object/array in the correct nesting order.
 *
 * Replaces a heuristic (regex-trim a trailing key/value pair, then append
 * N "]" followed by N "}") that had two independent bugs, both confirmed
 * against real production failures — Lovable monitoring evidence g6/g7/g8,
 * 2026-08-06: "JSON repair also failed" on 6+ occasions, 2 confirmed
 * background-job failures with no result delivered to the user:
 *   1. It never closed an unterminated STRING. Truncation lands inside a
 *      prose field almost every time — `rationale` is by far the largest
 *      field in this schema — so the dangling value is nearly always a
 *      half-written string. Appending brackets after an open quote is
 *      still invalid JSON; JSON.parse throws on the unterminated string
 *      before it ever reaches the appended brackets.
 *   2. It appended every missing "]" before every missing "}", regardless
 *      of actual nesting order. That's wrong whenever arrays and objects
 *      interleave, which `dimensionScores: [{...}, {...}]` always does:
 *      `{"dimensionScores":[{"score":1` needs closing "}]}" (close the
 *      inner object, then the array, then the outer object) — the old
 *      code would emit "]}}" (array first) instead, which is invalid for
 *      any response with more than the single outermost object open.
 *
 * This version tracks the actual stack of open '{'/'[' and whether the
 * cursor is inside a string (respecting escaped quotes), so it can (a)
 * find exactly where the last COMPLETE member ended and truncate there,
 * discarding the dangling partial member entirely rather than trying to
 * salvage it, and (b) close what's actually open, in reverse-open order.
 */
export function repairTruncatedJson(content: string): string {
  let inString = false;
  let escaped = false;
  let lastTopLevelCommaIdx = -1;
  let lastOpenBracketIdx = -1;
  const stack: Array<'{' | '['> = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') { stack.push(ch); lastOpenBracketIdx = i; continue; }
    if (ch === '}' || ch === ']') { stack.pop(); continue; }
    if (ch === ',') { lastTopLevelCommaIdx = i; continue; }
  }

  let truncated = content;
  if (inString) {
    // Cut back to before the dangling member — whichever comma most
    // recently preceded the string that's still open — removing the
    // incomplete key or value wholesale rather than salvaging a partial one.
    if (lastTopLevelCommaIdx >= 0) {
      truncated = content.slice(0, lastTopLevelCommaIdx);
    } else if (lastOpenBracketIdx >= 0) {
      // No sibling member completed yet in the innermost open container —
      // fall back to just after its opening bracket (an empty container).
      truncated = content.slice(0, lastOpenBracketIdx + 1);
    } else {
      // Truncated inside the very first string in the document — nothing
      // salvageable; let the caller's JSON.parse fail with a clear error.
      return content;
    }
  } else {
    // Not mid-string, but the content may still end in a dangling trailing
    // comma — strip it so the closing brackets below don't produce ",}".
    truncated = truncated.replace(/,\s*$/, '');
  }

  // Recompute what's actually open in the (possibly shorter) truncated
  // string and close it in reverse-open order.
  const closeStack: Array<'{' | '['> = [];
  let inStr2 = false;
  let esc2 = false;
  for (const ch of truncated) {
    if (inStr2) {
      if (esc2) esc2 = false;
      else if (ch === '\\') esc2 = true;
      else if (ch === '"') inStr2 = false;
      continue;
    }
    if (ch === '"') { inStr2 = true; continue; }
    if (ch === '{' || ch === '[') closeStack.push(ch as '{' | '[');
    else if (ch === '}' || ch === ']') closeStack.pop();
  }
  let closing = '';
  for (let i = closeStack.length - 1; i >= 0; i--) {
    closing += closeStack[i] === '{' ? '}' : ']';
  }
  return truncated + closing;
}
