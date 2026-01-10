import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { TrendingUp, TrendingDown, AlertTriangle, Target, ExternalLink } from "lucide-react";
import type { Strength, Weakness, TrustBreakpoint, RecommendedFocus } from "@/types/rubric";

interface StrengthsWeaknessesProps {
  strengths: Strength[];
  weaknesses: Weakness[];
  trustBreakpoints: TrustBreakpoint[];
  recommendedFocus: RecommendedFocus;
}

export function StrengthsWeaknesses({
  strengths,
  weaknesses,
  trustBreakpoints,
  recommendedFocus,
}: StrengthsWeaknessesProps) {
  return (
    <div className="space-y-6">
      {/* Strengths and Weaknesses Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-score-high/10">
                <TrendingUp className="w-5 h-5 text-score-high" />
              </div>
              <h3 className="text-lg font-semibold">Top Strengths</h3>
            </div>
            <div className="space-y-4">
              {strengths.map((strength, i) => (
                <div key={i} className="space-y-2">
                  <h4 className="font-medium text-foreground">
                    {strength.dimension}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {strength.whyItIsStrong}
                  </p>
                  <p className="text-sm text-foreground/80">
                    <span className="text-score-high font-medium">Enables:</span>{" "}
                    {strength.whatItEnables}
                  </p>
                  {strength.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {strength.evidence.map((ev, j) => (
                        <a
                          key={j}
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Source
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Weaknesses */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-score-low/10">
                <TrendingDown className="w-5 h-5 text-score-low" />
              </div>
              <h3 className="text-lg font-semibold">Top Weaknesses</h3>
            </div>
            <div className="space-y-4">
              {weaknesses.map((weakness, i) => (
                <div key={i} className="space-y-2">
                  <h4 className="font-medium text-foreground">
                    {weakness.dimension}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {weakness.whatIsMissingOrUnclear}
                  </p>
                  <p className="text-sm text-foreground/80">
                    <span className="text-score-low font-medium">Impact:</span>{" "}
                    {weakness.whyItMatters}
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Next step: {weakness.whatToVerifyNext}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Trust Breakpoints */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-score-medium/10">
              <AlertTriangle className="w-5 h-5 text-score-medium" />
            </div>
            <h3 className="text-lg font-semibold">Trust Breakpoints</h3>
            <span className="text-sm text-muted-foreground ml-2">
              Where billing anxiety may surface
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {trustBreakpoints.map((bp, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-secondary/30 border border-border/50"
              >
                <h4 className="font-medium text-score-medium mb-1">{bp.area}</h4>
                <p className="text-sm text-muted-foreground">{bp.description}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* 90-Day Recommendation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <GlassCard className="p-5 border-primary/20" glow>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Recommended 90-Day Focus</h3>
          </div>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground uppercase tracking-wider">
                Focus Area
              </span>
              <p className="text-xl font-semibold gradient-text">
                {recommendedFocus.focusArea}
              </p>
            </div>
            <p className="text-muted-foreground">{recommendedFocus.why}</p>
            <div>
              <span className="text-sm text-muted-foreground uppercase tracking-wider block mb-2">
                First Two Actions
              </span>
              <ol className="space-y-2">
                {recommendedFocus.firstTwoActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-medium flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90">{action}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="pt-3 border-t border-border/50">
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">Measure:</strong>{" "}
                {recommendedFocus.whatToMeasure}
              </span>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
