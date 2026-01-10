import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface TotalScoreCardProps {
  totalScore: number;
  maxScore: number;
  band: string;
  companyName: string;
}

export function TotalScoreCard({
  totalScore,
  maxScore,
  band,
  companyName,
}: TotalScoreCardProps) {
  const percentage = (totalScore / maxScore) * 100;

  const getBandConfig = () => {
    switch (band) {
      case "Advanced":
        return {
          color: "text-score-high",
          bgColor: "bg-score-high/10",
          borderColor: "border-score-high/30",
          description: "Exceptional value system maturity",
        };
      case "Established":
        return {
          color: "text-score-high",
          bgColor: "bg-score-high/10",
          borderColor: "border-score-high/30",
          description: "Strong foundation with room to optimize",
        };
      case "Emerging":
        return {
          color: "text-score-medium",
          bgColor: "bg-score-medium/10",
          borderColor: "border-score-medium/30",
          description: "Key elements in place, gaps to address",
        };
      default:
        return {
          color: "text-score-low",
          bgColor: "bg-score-low/10",
          borderColor: "border-score-low/30",
          description: "Early stage, significant work ahead",
        };
    }
  };

  const config = getBandConfig();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <GlassCard className="p-6 relative overflow-hidden" glow>
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Company & Band */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                {companyName}
              </h2>
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <span className={cn("font-semibold", config.color)}>
                  {band}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>
            </div>

            {/* Score Circle */}
            <div className="flex items-center gap-6">
              <div className="relative w-28 h-28">
                {/* Background ring */}
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="stroke-secondary"
                    strokeWidth="8"
                    fill="none"
                  />
                  <motion.circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="stroke-primary"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 48}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
                    animate={{
                      strokeDashoffset:
                        2 * Math.PI * 48 * (1 - percentage / 100),
                    }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  />
                </svg>
                {/* Score text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-3xl font-bold text-foreground">
                    {totalScore}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {maxScore}
                  </span>
                </div>
              </div>

              <div className="hidden md:block text-right">
                <div className="text-4xl font-mono font-bold gradient-text">
                  {Math.round(percentage)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Value System Score
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
