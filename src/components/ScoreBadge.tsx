import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  maxScore?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ScoreBadge({ 
  score, 
  maxScore = 2, 
  size = "md",
  showLabel = false 
}: ScoreBadgeProps) {
  const percentage = (score / maxScore) * 100;
  
  const getVariant = () => {
    if (percentage >= 75) return "high";
    if (percentage >= 40) return "medium";
    return "low";
  };

  const variant = getVariant();

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-lg",
  };

  const variantClasses = {
    high: "bg-score-high/15 text-score-high border-score-high/30",
    medium: "bg-score-medium/15 text-score-medium border-score-medium/30",
    low: "bg-score-low/15 text-score-low border-score-low/30",
  };

  const labels = {
    high: "Strong",
    medium: "Partial",
    low: "Weak",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono font-semibold rounded-lg border",
        sizeClasses[size],
        variantClasses[variant]
      )}
    >
      {score}/{maxScore}
      {showLabel && (
        <span className="ml-2 font-sans font-normal opacity-80">
          {labels[variant]}
        </span>
      )}
    </span>
  );
}
