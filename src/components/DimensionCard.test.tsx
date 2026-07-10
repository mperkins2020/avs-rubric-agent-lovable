import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DimensionCard } from "./DimensionCard";
import type { DimensionScore } from "@/types/rubric";

const baseDimension: DimensionScore = {
  dimension: "Overages and risk allocation",
  score: 1,
  confidence: 0.7,
  notObservable: false,
  rationale:
    "[D7 audit: R1=P R2=P R3=P R4=F R5=F R6=P | pts=4/6 | gate=R5 cap | score=1] " +
    "[D7 evidence: R1←overage_behavior@/docs/plans; R4←none; R5←none] " +
    "Clear overage policies and unit pricing.",
  observed: [],
  uncertaintyReasons: [],
};

function renderExpanded(dimension: DimensionScore) {
  render(<DimensionCard dimension={dimension} index={6} />);
  fireEvent.click(screen.getByText(dimension.dimension));
}

describe("<DimensionCard />", () => {
  it("renders only the prose in the rationale section", () => {
    renderExpanded(baseDimension);
    expect(screen.getByText("Clear overage policies and unit pricing.")).toBeInTheDocument();
    const rationale = screen.getByText("Clear overage policies and unit pricing.");
    expect(rationale.textContent).not.toContain("[D7 audit:");
  });

  it("shows audit blocks inside the Subtest audit section", () => {
    renderExpanded(baseDimension);
    expect(screen.getByText("Subtest audit")).toBeInTheDocument();
    expect(screen.getByText(/\[D7 audit: R1=P/)).toBeInTheDocument();
    expect(screen.getByText(/\[D7 evidence: R1←overage_behavior/)).toBeInTheDocument();
  });

  it("omits the Subtest audit section when the rationale has no audit blocks", () => {
    renderExpanded({
      ...baseDimension,
      dimension: "ICP and job clarity",
      rationale: "Clear ICP by role and company type.",
    });
    expect(screen.queryByText("Subtest audit")).not.toBeInTheDocument();
  });
});
