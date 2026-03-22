## QA Debug Logs

Two files track scoring QA:

- `ENGINE_DEBUG_LOG.md` — Go-forward log. When I say "log this", append a new entry using the template. Auto-increment the entry number, use today's date.
- `ENGINE_DEBUG_HISTORY.md` — Backfilled from git. Read-only reference.

When I say "scan the debug log for patterns", parse all entries in ENGINE_DEBUG_LOG.md and report:
1. Most common root causes (by count)
2. Dimensions with the most entries
3. Any pattern tags that appear 3+ times
4. Recommendations for spec or guardrail changes based on clusters
