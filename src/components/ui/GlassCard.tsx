import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "elevated" | "interactive";
  glow?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", glow = false, children, ...props }, ref) => {
    const variants = {
      default: "bg-card/80 backdrop-blur-xl border border-border/50",
      elevated: "bg-card/90 backdrop-blur-xl border border-border/50 shadow-lg",
      interactive:
        "bg-card/80 backdrop-blur-xl border border-border/50 hover:border-primary/30 hover:bg-card/90 transition-all duration-300 cursor-pointer",
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-xl",
          variants[variant],
          glow && "shadow-[0_0_60px_-12px_hsl(var(--primary)/0.4)]",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
