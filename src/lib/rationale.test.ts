import { describe, it, expect } from "vitest";
import { splitRationale } from "./rationale";

const D7_RATIONALE =
  "[D7 audit: R1=P R2=P R3=P R4=F R5=F R6=P | pts=4/6 | gate=R5 cap | score=1] " +
  "[D7 evidence: R1←overage_behavior@/docs/admin/subscriptions/plans; R2←Actions@/docs/admin/subscriptions/plans; R4←none; R5←none; R6←usage alerts@/docs/admin/project-management/usage-alerts] " +
  "Relevance AI provides clear overage policies and unit pricing for overages.";

describe("splitRationale()", () => {
  it("extracts audit and evidence blocks in order", () => {
    const { auditBlocks } = splitRationale(D7_RATIONALE);
    expect(auditBlocks).toHaveLength(2);
    expect(auditBlocks[0]).toMatch(/^\[D7 audit:/);
    expect(auditBlocks[1]).toMatch(/^\[D7 evidence:/);
  });

  it("returns prose without any bracketed blocks", () => {
    const { prose } = splitRationale(D7_RATIONALE);
    expect(prose).toBe("Relevance AI provides clear overage policies and unit pricing for overages.");
  });

  it("handles D5 blocks", () => {
    const { auditBlocks, prose } = splitRationale(
      "[D5 audit: C1=P C2=P C3=P C4=P C5=P C6=P | pts=6/6 | gate=none | score=2] Clear cost drivers."
    );
    expect(auditBlocks).toHaveLength(1);
    expect(prose).toBe("Clear cost drivers.");
  });

  it("passes through rationales with no audit blocks", () => {
    const { auditBlocks, prose } = splitRationale("Plain rationale citing the pricing page.");
    expect(auditBlocks).toHaveLength(0);
    expect(prose).toBe("Plain rationale citing the pricing page.");
  });

  it("does not strip score-floor internal notes (handled separately)", () => {
    const { prose } = splitRationale(
      "[Score floored to 1 based on 3 public evidence signals.] Some rationale."
    );
    expect(prose).toContain("[Score floored to 1");
  });

  it("collapses whitespace left behind by mid-string blocks", () => {
    const { prose } = splitRationale("Before. [D7 audit: R1=P | pts=1/6 | gate=none | score=0] After.");
    expect(prose).toBe("Before. After.");
  });
});
