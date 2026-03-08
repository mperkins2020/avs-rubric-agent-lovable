import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { FileText, AlertTriangle, ArrowDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ObservabilityData } from "@/types/rubric";

interface ObservabilityStripProps {
  data: ObservabilityData;
  onDimensionClick?: (dimension: string) => void;
}

export function ObservabilityStrip({ 
  data, 
  onDimensionClick 
}: ObservabilityStripProps) {
  const handleImproveAccuracy = () => {
    const el = document.getElementById("improve-accuracy-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <GlassCard className="p-5" variant="elevated">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Confidence & Observability */}
          <div className="flex items-center gap-4">
            <ConfidenceIndicator 
              level={data.level} 
              score={data.confidenceScore} 
            />
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-8 bg-border" />

          {/* Pages Used */}
          <div className="flex-1">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider font-medium">
                What we used
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.pagesUsed.map((page) => (
                <span
                  key={page}
                  className="px-2 py-1 text-xs bg-secondary/50 rounded-md text-secondary-foreground"
                >
                  {page}
                </span>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-8 bg-border" />

          {/* Most Uncertain */}
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider font-medium">
                Most uncertain
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.mostUncertainDimensions.map((item) => (
                <button
                  key={item.dimension}
                  onClick={() => onDimensionClick?.(item.dimension)}
                  className={cn(
                    "px-2 py-1 text-xs rounded-md transition-colors",
                    "bg-destructive/10 text-destructive/80 hover:bg-destructive/20",
                    "cursor-pointer"
                  )}
                >
                  {item.dimension}
                  {item.notObservable ? (
                    <span className="ml-1 opacity-70">(not observable)</span>
                  ) : (
                    <span className="ml-1 opacity-70">
                      ({Math.round((item.confidence ?? 0) * 100)}%)
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Improve accuracy CTA */}
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {data.mostUncertainDimensions.length} dimension{data.mostUncertainDimensions.length !== 1 ? "s" : ""} have limited public evidence.
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleImproveAccuracy}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            Improve accuracy
          </Button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
