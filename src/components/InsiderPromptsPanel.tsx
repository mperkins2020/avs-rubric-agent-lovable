import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareWarning, Send, Loader2, ChevronDown, RotateCcw } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DimensionScore } from "@/types/rubric";

interface InsiderPromptsPanelProps {
  dimensions: DimensionScore[];
  onSubmitAnswers: (answers: Record<string, string>) => void;
  isRerunning: boolean;
}

export function InsiderPromptsPanel({ dimensions, onSubmitAnswers, isRerunning }: InsiderPromptsPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);

  // Filter to dimensions with low/medium confidence that have prompts
  const lowConfidenceDimensions = dimensions.filter(
    (d) =>
      !d.notObservable &&
      d.confidence < 0.75 &&
      d.missingInsiderPrompts &&
      d.missingInsiderPrompts.length > 0
  );

  if (lowConfidenceDimensions.length === 0) return null;

  const answeredCount = Object.values(answers).filter((v) => v.trim().length > 0).length;
  const totalPrompts = lowConfidenceDimensions.reduce(
    (sum, d) => sum + (d.missingInsiderPrompts?.length || 0),
    0
  );

  const handleSubmit = () => {
    const nonEmpty = Object.fromEntries(
      Object.entries(answers).filter(([, v]) => v.trim().length > 0)
    );
    if (Object.keys(nonEmpty).length > 0) {
      onSubmitAnswers(nonEmpty);
    }
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.45) return "Medium";
    return "Low";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.45) return "text-confidence-partial";
    return "text-confidence-sparse";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <GlassCard className="overflow-hidden">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquareWarning className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Improve Your Score
              </h2>
              <p className="text-sm text-muted-foreground">
                {lowConfidenceDimensions.length} dimension{lowConfidenceDimensions.length > 1 ? "s" : ""} scored with limited public evidence. Answer clarifying questions to refine your assessment.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50">
          {lowConfidenceDimensions.map((dim) => {
            const isExpanded = expandedDimension === dim.dimension;
            const dimAnsweredCount = (dim.missingInsiderPrompts || []).filter(
              (p) => answers[`${dim.dimension}::${p.question}`]?.trim()
            ).length;

            return (
              <div key={dim.dimension} className="border-b border-border/30 last:border-b-0">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                  onClick={() =>
                    setExpandedDimension(isExpanded ? null : dim.dimension)
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm text-foreground">
                      {dim.dimension}
                    </span>
                    <span className={cn("text-xs", getConfidenceColor(dim.confidence))}>
                      {getConfidenceLabel(dim.confidence)} confidence
                    </span>
                    {dimAnsweredCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        {dimAnsweredCount} answered
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-4">
                        {(dim.missingInsiderPrompts || []).map((prompt, i) => {
                          const key = `${dim.dimension}::${prompt.question}`;
                          return (
                            <div key={i} className="space-y-2">
                              <label className="text-sm font-medium text-foreground/90 block">
                                {i + 1}. {prompt.question}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                Maps to: {prompt.fieldPaths.join(", ")}
                              </p>
                              <Textarea
                                placeholder="Your answer..."
                                className="min-h-[60px] text-sm bg-background/50"
                                value={answers[key] || ""}
                                onChange={(e) =>
                                  setAnswers((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {answeredCount} of {totalPrompts} questions answered
          </span>
          <Button
            onClick={handleSubmit}
            disabled={answeredCount === 0 || isRerunning}
            size="sm"
            className="gap-2"
          >
            {isRerunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Re-analyzing...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Rerun Analysis
              </>
            )}
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
