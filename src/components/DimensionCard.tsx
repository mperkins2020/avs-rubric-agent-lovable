import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertCircle, Info } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScoreBadge } from "@/components/ScoreBadge";
import { cn } from "@/lib/utils";
import type { DimensionScore } from "@/types/rubric";

interface DimensionCardProps {
  dimension: DimensionScore;
  index: number;
}

export function DimensionCard({ dimension, index }: DimensionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getConfidenceLabel = () => {
    if (dimension.notObservable) return "Not observable";
    if (dimension.confidence >= 0.7) return "High";
    if (dimension.confidence >= 0.4) return "Medium";
    return "Low";
  };

  const getConfidenceColor = () => {
    if (dimension.notObservable) return "text-muted-foreground";
    if (dimension.confidence >= 0.7) return "text-confidence-strong";
    if (dimension.confidence >= 0.4) return "text-confidence-partial";
    return "text-confidence-sparse";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      id={`dimension-${dimension.dimension.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <GlassCard
        variant="interactive"
        className="overflow-hidden"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground w-6">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-medium text-foreground">
                {dimension.dimension}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("text-xs", getConfidenceColor())}>
                {getConfidenceLabel()}
              </span>
              <ScoreBadge score={dimension.score} />
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-2 border-t border-border/50">
                <div className="space-y-4">
                  {/* Rationale */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Rationale
                    </h4>
                    <p className="text-sm text-foreground/90">
                      {dimension.rationale}
                    </p>
                  </div>

                  {/* Observed */}
                  {dimension.observed.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Info className="w-3 h-3" />
                        What we observed
                      </h4>
                      <ul className="space-y-1">
                        {dimension.observed.map((item, i) => (
                          <li
                            key={i}
                            className="text-sm text-foreground/80 flex items-start gap-2"
                          >
                            <span className="text-primary mt-1">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Uncertainty Reasons */}
                  {dimension.uncertaintyReasons.length > 0 && (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        Why confidence is low
                      </h4>
                      <ul className="space-y-1">
                        {dimension.uncertaintyReasons.map((reason, i) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-destructive/70 mt-1">•</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}
