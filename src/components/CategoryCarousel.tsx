import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface CategoryCard {
  category: string;
  avgScore: number;
  topGaps: string;
  impact: string;
  hint: string;
}

const accentColors = [
  "bg-primary",           // violet
  "bg-vt-cyan",           // cyan
  "bg-[hsl(25,95%,53%)]", // orange
];

const categories: CategoryCard[] = [
  {
    category: "AI Vibe Coding Tools",
    avgScore: 79,
    topGaps: "Cost Driver",
    impact:
      "Buyers struggle to predict how usage translates to cost. Usage spikes often lead to unexpected bills, causing frustration and churn.",
    hint: "Analyzing AI Vibe Coding patterns",
  },
  {
    category: "AI Dev Infrastructure",
    avgScore: 75,
    topGaps: "Cost Drivers · Spend Controls",
    impact:
      "Cost drivers are not clearly mapped to product behavior, making spend hard to forecast. Weak safety rails leave teams without caps or alerts, increasing risk of unexpected bills.",
    hint: "Analyzing AI Dev Infrastructure patterns",
  },
  {
    category: "AI-Native CRM",
    avgScore: 63,
    topGaps: "Value Units · Cost Drivers · Risk Controls",
    impact:
      "Core usage units and cost drivers are unclear, making it difficult to understand how workflows translate to cost. Limited overage policies and missing controls reduce trust as usage grows.",
    hint: "Analyzing AI-Native CRM patterns",
  },
  {
    category: "GTM Platforms",
    avgScore: 60,
    topGaps: "Cost Drivers · Overages · Safety Rails",
    impact:
      "Workflow-level pricing is not clearly defined, making spend unpredictable. Overage behavior and safety controls are often unclear, increasing risk and reducing buyer confidence.",
    hint: "Analyzing GTM Platform patterns",
  },
  {
    category: "AI Agents & Automation",
    avgScore: 68,
    topGaps: "Value Units · Cost Drivers",
    impact:
      "Agent behavior is hard to map to cost, making it difficult to predict how workflows scale economically. This creates hesitation for teams deploying agents into production.",
    hint: "Analyzing AI Agent & Automation patterns",
  },
  {
    category: "AI Media & Generation Tools",
    avgScore: 72,
    topGaps: "Output Predictability · Cost Drivers",
    impact:
      "Output quality and cost per result are inconsistent, making outcomes hard to predict. This reduces confidence for repeatable production workflows.",
    hint: "Analyzing AI Media & Generation patterns",
  },
];

function scoreColor(score: number) {
  if (score >= 75) return "text-[hsl(var(--score-green))]";
  if (score >= 60) return "text-[hsl(var(--score-yellow))]";
  return "text-[hsl(var(--score-red))]";
}

export function CategoryCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const animRef = useRef<number | null>(null);
  const speedRef = useRef(0.5); // px per frame

  const scroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || isPaused) {
      animRef.current = requestAnimationFrame(scroll);
      return;
    }
    el.scrollLeft += speedRef.current;
    // loop: when we've scrolled past the duplicated set, reset
    const half = el.scrollWidth / 2;
    if (el.scrollLeft >= half) {
      el.scrollLeft -= half;
    }
    animRef.current = requestAnimationFrame(scroll);
  }, [isPaused]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(scroll);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [scroll]);

  const handleCardClick = (hint: string) => {
    const input = document.getElementById("url-input");
    if (input) {
      input.scrollIntoView({ behavior: "smooth" });
      // Show hint as a toast-style indication
      const urlField = input.querySelector("input");
      if (urlField) {
        urlField.focus();
        urlField.setAttribute("placeholder", hint);
        setTimeout(() => {
          urlField.setAttribute("placeholder", "Enter a company URL to analyze");
        }, 4000);
      }
    }
  };

  // Duplicate cards for seamless loop
  const allCards = [...categories, ...categories];

  return (
    <section className="pt-0 pb-14 md:pt-0 md:pb-20 overflow-hidden">
      <div className="container mx-auto px-5 md:px-10 mb-8">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-xl md:text-2xl font-bold text-center text-foreground"
        >
          Where buyability breaks down
        </motion.h2>
      </div>

      <div
        ref={trackRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="flex gap-5 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {/* Left spacer so first card isn't flush */}
        <div className="shrink-0 w-4 md:w-10" />
        {allCards.map((card, i) => (
          <motion.div
            key={`${card.category}-${i}`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(i * 0.08, 0.4) }}
            onClick={() => handleCardClick(card.hint)}
            className="shrink-0 w-[300px] md:w-[340px] bg-card border border-border rounded-3xl pt-0 overflow-hidden shadow-vt-sm hover:shadow-vt-md hover:border-primary/30 transition-all duration-200 cursor-pointer group select-none"
          >
            {/* Accent color bar */}
            <div className={`h-1 w-14 rounded-full mx-6 mt-5 mb-4 ${accentColors[i % accentColors.length]}`} />
            <div className="px-6 pb-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors leading-tight pr-3">
                {card.category}
              </h3>
              <span className={`text-2xl font-bold tabular-nums shrink-0 ${scoreColor(card.avgScore)}`}>
                {card.avgScore}%
              </span>
            </div>

            <p className="text-xs font-medium text-muted-foreground mb-3 tracking-wide uppercase">
              Top buyer friction: {card.topGaps}
            </p>

            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
              {card.impact}
            </p>
            </div>
          </motion.div>
        ))}
        {/* Right spacer */}
        <div className="shrink-0 w-4 md:w-10" />
      </div>
    </section>
  );
}
