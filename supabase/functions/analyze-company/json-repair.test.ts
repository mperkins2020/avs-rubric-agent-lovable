import { describe, it, expect } from 'vitest';
import { repairTruncatedJson } from './json-repair.ts';

// Every case here targets a real gap in the previous heuristic (regex-trim
// + separate brace/bracket counts), confirmed against production failures —
// Lovable monitoring evidence g6/g7/g8, 2026-08-06 ("JSON repair also
// failed" on 6+ occasions, 2 confirmed background-job failures).

describe('repairTruncatedJson', () => {
  it('repairs a simple mid-string truncation by dropping the dangling member', () => {
    const result = repairTruncatedJson('{"a":1,"b":"hello wor');
    expect(JSON.parse(result)).toEqual({ a: 1 });
  });

  it('closes an array-of-objects in the CORRECT nesting order (the old heuristic\'s main bug)', () => {
    // Old heuristic: 1 missing "]", 1 missing "}" -> appended "]" then "}"
    // -> "]}" -- WRONG for this shape, which needs "}" then "]" then "}".
    const result = repairTruncatedJson(
      '{"dimensionScores":[{"score":1,"rationale":"some text that got cut of',
    );
    expect(JSON.parse(result)).toEqual({ dimensionScores: [{ score: 1 }] });
  });

  it('drops a dangling trailing comma with no partial string', () => {
    const result = repairTruncatedJson('{"a":1,"b":2,');
    expect(JSON.parse(result)).toEqual({ a: 1, b: 2 });
  });

  it('preserves earlier COMPLETE array members and only drops the truncated one', () => {
    const input =
      '{"dimensionScores":[{"score":1,"rationale":"ok"},{"score":2,"rationale":"also ok"},' +
      '{"score":1,"rationale":"cut off mid strin';
    const result = repairTruncatedJson(input);
    expect(JSON.parse(result)).toEqual({
      dimensionScores: [
        { score: 1, rationale: 'ok' },
        { score: 2, rationale: 'also ok' },
        { score: 1 },
      ],
    });
  });

  it('respects escaped quotes when tracking string state', () => {
    const result = repairTruncatedJson('{"a":"back\\\\slash and \\"quote\\" then cut off her');
    // The only member is itself the dangling one, and it's the very first
    // field with no preceding comma -> falls back to an empty object.
    expect(JSON.parse(result)).toEqual({});
  });

  it('falls back to an empty container when truncated right after an opening bracket', () => {
    const result = repairTruncatedJson('{"dimensionScores":[{"scor');
    expect(JSON.parse(result)).toEqual({ dimensionScores: [{}] });
  });

  it('repairs an array of primitives truncated mid-string', () => {
    const result = repairTruncatedJson('{"tags":["a","b","c that got cu');
    expect(JSON.parse(result)).toEqual({ tags: ['a', 'b'] });
  });

  it('falls back to an empty object when the ENTIRE first field is truncated (no prior sibling to preserve)', () => {
    // There's an open '{' even though there's no comma yet, so this hits the
    // "fall back to just after the opening bracket" branch, not the
    // truly-nothing-salvageable one (that one only fires if content doesn't
    // even contain a '{' or '[' before the unterminated string — essentially
    // impossible for a JSON object response).
    const result = repairTruncatedJson('{"a":"cut off before any');
    expect(JSON.parse(result)).toEqual({});
  });

  it('returns content unchanged only when there is no open bracket at all before the unterminated string', () => {
    const input = '"cut off before any';
    const result = repairTruncatedJson(input);
    expect(result).toBe(input);
    expect(() => JSON.parse(result)).toThrow();
  });

  it('handles the real production shape: a full rubricScore object truncated mid-rationale', () => {
    // Modeled on this schema's actual shape (rubricScore.dimensionScores[]),
    // truncated the way a token-limit cutoff actually looks: mid-sentence,
    // inside the largest field (rationale), several complete dimensions in.
    // The 3rd dimension's dimension/score fields are complete when
    // truncation hits — only its rationale is cut — so the repair correctly
    // KEEPS dimension+score for it rather than dropping the whole entry;
    // it drops only what's actually incomplete (the dangling rationale).
    const input =
      '{"rubricScore":{"totalScore":8,"dimensionScores":[' +
      '{"dimension":"Product north star","score":1,"rationale":"[D1 audit: ...] Some analysis."},' +
      '{"dimension":"ICP and job clarity","score":2,"rationale":"[D2 audit: ...] More analysis."},' +
      '{"dimension":"Buyer and budget alignment","score":1,"rationale":"[D3 audit: ...] Partial analysis that got cut off mid-sen';
    const result = repairTruncatedJson(input);
    const parsed = JSON.parse(result) as {
      rubricScore: { totalScore: number; dimensionScores: Array<{ dimension: string; score: number; rationale?: string }> };
    };
    expect(parsed.rubricScore.totalScore).toBe(8);
    expect(parsed.rubricScore.dimensionScores).toHaveLength(3);
    expect(parsed.rubricScore.dimensionScores[0]).toEqual({
      dimension: 'Product north star', score: 1, rationale: '[D1 audit: ...] Some analysis.',
    });
    expect(parsed.rubricScore.dimensionScores[1]).toEqual({
      dimension: 'ICP and job clarity', score: 2, rationale: '[D2 audit: ...] More analysis.',
    });
    expect(parsed.rubricScore.dimensionScores[2]).toEqual({
      dimension: 'Buyer and budget alignment', score: 1,
    });
    expect(parsed.rubricScore.dimensionScores[2].rationale).toBeUndefined();
  });
});
