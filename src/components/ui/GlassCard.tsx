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
      default: "bg-card border border-border shadow-vt-sm",
      elevated: "bg-card border border-border shadow-vt-md",
      interactive:
        "bg-card border border-border shadow-vt-sm hover:shadow-vt-md hover:border-primary/30 transition-all duration-200 cursor-pointer",
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-3xl",
          variants[variant],
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
