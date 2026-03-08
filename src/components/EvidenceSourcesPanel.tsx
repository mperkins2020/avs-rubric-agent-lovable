import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Globe, ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import type { ScrapedPage } from "@/lib/api/scraper";

interface EvidenceSourcesPanelProps {
  pages: ScrapedPage[];
}

export function EvidenceSourcesPanel({ pages }: EvidenceSourcesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.pathname === "/" ? u.hostname : `${u.hostname}${u.pathname}`;
    } catch {
      return url;
    }
  };

  if (pages.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <GlassCard
        variant="interactive"
        className="overflow-hidden"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground">
                Pages Analyzed
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {pages.length}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
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
              <div className="px-4 pb-4 pt-1 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-3">
                  These pages were scraped and used as evidence for scoring.
                </p>
                <ul className="space-y-1.5">
                  {pages.map((page, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground font-mono text-xs mt-0.5 w-5 flex-shrink-0 text-right">
                        {i + 1}.
                      </span>
                      <div className="min-w-0">
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate">{formatUrl(page.url)}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                        {page.title && (
                          <p className="text-xs text-muted-foreground truncate">
                            {page.title}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}
