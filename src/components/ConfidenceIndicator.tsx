import { cn } from "@/lib/utils";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";

interface ConfidenceIndicatorProps {
  level: "Strong" | "Partial" | "Sparse";
  score: number;
  compact?: boolean;
}

export function ConfidenceIndicator({ 
  level, 
  score, 
  compact = false 
}: ConfidenceIndicatorProps) {
  const config = {
    Strong: {
      icon: ShieldCheck,
      className: "text-confidence-strong",
      bgClassName: "bg-confidence-strong/10 border-confidence-strong/30",
    },
    Partial: {
      icon: ShieldAlert,
      className: "text-confidence-partial",
      bgClassName: "bg-confidence-partial/10 border-confidence-partial/30",
    },
    Sparse: {
      icon: ShieldQuestion,
      className: "text-confidence-sparse",
      bgClassName: "bg-confidence-sparse/10 border-confidence-sparse/30",
    },
  };

  const { icon: Icon, className, bgClassName } = config[level];

  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{score}%</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border",
        bgClassName
      )}
    >
      <Icon className={cn("w-4 h-4", className)} />
      <span className={cn("text-sm font-medium", className)}>
        {level} Observability
      </span>
      <span className="text-muted-foreground text-sm">•</span>
      <span className="font-mono text-sm text-foreground">{score}%</span>
    </div>
  );
}
