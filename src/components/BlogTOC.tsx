import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { List, X } from "lucide-react";

export interface TocItem {
  id: string;
  label: string;
}

interface BlogTOCProps {
  sections: TocItem[];
  variant?: "inline" | "sidebar";
}

export function BlogTOC({ sections, variant = "inline" }: BlogTOCProps) {
  const [activeSection, setActiveSection] = useState("");
  const [showFab, setShowFab] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const handleScroll = () => setShowFab(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };

  // Sidebar variant: sticky left-side TOC (desktop only, mobile uses FAB)
  if (variant === "sidebar") {
    return (
      <>
        {/* Desktop: sticky sidebar TOC */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">On this page</p>
            {sections.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`block w-full text-left text-sm py-1.5 px-3 rounded-md transition-colors ${
                  activeSection === id
                    ? "text-primary bg-primary/10 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        {/* Mobile: FAB + drawer */}
        <AnimatePresence>
          {showFab && !mobileOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setMobileOpen(true)}
              className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
              aria-label="Open table of contents"
            >
              <List className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />
              <motion.nav
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border rounded-t-2xl p-5 max-h-[60vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
                  <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <ul className="space-y-1">
                  {sections.map(({ id, label }) => (
                    <li key={id}>
                      <button
                        onClick={() => scrollTo(id)}
                        className={`text-sm text-left w-full px-3 py-2 rounded-lg transition-colors ${
                          activeSection === id
                            ? "text-primary bg-primary/10 font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.nav>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Default inline variant
  return (
    <>
      {/* Desktop: inline TOC card */}
      <nav className="hidden lg:block my-8 rounded-xl border border-border/40 bg-muted/20 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">On this page</p>
        <ul className="space-y-1.5">
          {sections.map(({ id, label }) => (
            <li key={id}>
              <button
                onClick={() => scrollTo(id)}
                className={`text-sm text-left w-full px-2 py-1 rounded-md transition-colors ${
                  activeSection === id
                    ? "text-primary bg-primary/10 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile: FAB + drawer */}
      <AnimatePresence>
        {showFab && !mobileOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setMobileOpen(true)}
            className="lg:hidden fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
            aria-label="Open table of contents"
          >
            <List className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border rounded-t-2xl p-5 max-h-[60vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
                <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ul className="space-y-1">
                {sections.map(({ id, label }) => (
                  <li key={id}>
                    <button
                      onClick={() => scrollTo(id)}
                      className={`text-sm text-left w-full px-3 py-2 rounded-lg transition-colors ${
                        activeSection === id
                          ? "text-primary bg-primary/10 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
