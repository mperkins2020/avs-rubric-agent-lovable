import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { SEOHead } from "@/components/SEOHead";
import { BrevoSignupFormAugust2026 } from "@/components/BrevoSignupFormAugust2026";
import previewCover from "@/assets/aug-2026-preview-1-cover.png.asset.json";
import previewSnapshot from "@/assets/aug-2026-preview-2-executive-snapshot.png.asset.json";
import previewCategory from "@/assets/aug-2026-preview-3-one-category.png.asset.json";

const findings = [
  {
    value: "10 of 12",
    headline: "still meter primarily on observation-based units",
    body: "Products increasingly diagnose, recommend, and act, while most billing models still meter prompts, audits, credits, seats, or similar activity.",
  },
  {
    value: "0 of 12",
    headline: "publish enough evidence to independently evaluate recommendation quality",
    body: "Recommendation capability is arriving faster than published validation.",
  },
  {
    value: "0 companies",
    headline: "reach the AVS rubric's highest standard for Safety Rails & Trust Surfaces",
    body: "Trust remains the weakest area of publicly observable commercial evidence in the benchmark.",
  },
];

const buyerJobs = [
  {
    title: "Visibility Measurement",
    question: "Are we visible, and how do we compare?",
  },
  {
    title: "Diagnosis, Recommendation & Optimization",
    question: "Why did visibility change, and what should we do next?",
  },
  {
    title: "Agent Readiness & Execution",
    question: "Can agents understand, trust, and act on our content?",
  },
];

const gtmQuestions = [
  "How should pricing evolve as products move from observation to action?",
  "How should agent readiness be commercialized before the value model has settled?",
  "How do you make recommendation value legible before recommendation quality can be validated at scale?",
];

const companies = [
  "Ahrefs",
  "AthenaHQ",
  "Botify",
  "Conductor",
  "Goodie AI",
  "HubSpot",
  "Otterly.AI",
  "Peec.ai",
  "Profound",
  "Scrunch AI",
  "Semrush",
  "Similarweb",
];

const dimensions = [
  "Product North Star",
  "ICP & Job Clarity",
  "Buyer & Budget Alignment",
  "Value Unit",
  "Cost Driver Mapping",
  "Pools & Packaging",
  "Overages & Risk Allocation",
  "Safety Rails & Trust Surfaces",
];

/**
 * First three pages of the August 2026 Benchmark Executive Brief.
 * `src` stays null until the exported page images are added as Lovable assets —
 * the full Brief PDF is deliberately never used here.
 */
const previewPages: { label: string; src: string | null }[] = [
  { label: "Cover", src: previewCover.url },
  { label: "Executive Snapshot", src: previewSnapshot.url },
  { label: "One Category, Three Emerging Buyer Jobs", src: previewCategory.url },
];

function PreviewPlaceholder({ label, index }: { label: string; index: number }) {
  return (
    <div className="flex aspect-[3/4] w-full flex-col justify-between rounded-xl border border-[hsl(var(--vt-violet)/0.18)] bg-gradient-to-br from-[#EEEAFB] via-[#F4F1FC] to-[#E8F0FF] p-6 md:p-8">
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--vt-violet))]">
          August 2026 Benchmark
        </span>
        <p className="mt-3 text-lg md:text-2xl font-bold leading-tight text-vt-midnight">
          AI Search Visibility &amp; AEO Benchmark
        </p>
        <p className="mt-2 text-sm text-vt-midnight/70">Executive Brief</p>
      </div>
      <div>
        <p className="text-sm font-semibold text-vt-midnight">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">Page {index + 1} preview</p>
      </div>
    </div>
  );
}

function PreviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const last = previewPages.length - 1;

  const prev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const next = useCallback(() => setPage((p) => Math.min(last, p + 1)), [last]);

  useEffect(() => {
    if (!open) setPage(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, prev, next]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-vt-midnight/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Benchmark Executive Brief preview"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[420px] rounded-2xl bg-white p-4 shadow-vt-lg md:max-w-[520px] md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-vt-midnight">
                {previewPages[page].label}
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close preview"
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  {previewPages[page].src ? (
                    <img
                      src={previewPages[page].src as string}
                      alt={`${previewPages[page].label} — August 2026 Benchmark Executive Brief preview`}
                      className="block w-full rounded-xl ring-1 ring-black/5"
                      draggable={false}
                    />
                  ) : (
                    <PreviewPlaceholder label={previewPages[page].label} index={page} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={prev}
                disabled={page === 0}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-vt-midnight transition-colors hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-xs font-medium text-muted-foreground">
                {page + 1}/{previewPages.length}
              </span>
              <button
                type="button"
                onClick={next}
                disabled={page === last}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-vt-midnight transition-colors hover:bg-muted disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {page === last && (
              <div className="mt-5 rounded-xl bg-[hsl(var(--vt-bg-section))] p-4 text-center">
                <p className="text-sm text-vt-midnight/80">That's the preview.</p>
                <Button
                  asChild
                  className="mt-3 h-11 rounded-[22px] bg-vt-midnight px-5 text-white hover:bg-vt-midnight/90"
                >
                  <a href="#download" onClick={onClose}>
                    Download the full Benchmark Executive Brief
                  </a>
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AISearchVisibilityBenchmarkAugust2026() {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[hsl(var(--vt-bg-section))]">
      <SEOHead
        title="AI Search Visibility & AEO Benchmark 2026 | ValueTempo"
        description="ValueTempo analyzes 12 AI search visibility and AEO companies across 8 dimensions of public commercial evidence, revealing where product ambition is moving faster than pricing, packaging, trust, and recommendation validation."
        canonicalUrl="https://app.valuetempo.com/ai-search-visibility-aeo-benchmark-august-2026"
        type="website"
      />

      <header className="sticky top-0 z-30 border-b border-border bg-white/75 backdrop-blur-md">
        <div className="container mx-auto flex h-[72px] items-center justify-between px-5 md:px-10">
          <Link to="/" aria-label="ValueTempo home">
            <img alt="ValueTempo" className="h-8" src={ValueTempoLogo} />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/methodology" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Methodology
            </Link>
            <ResourcesDropdown />
            <Button asChild size="sm" className="h-9 rounded-[20px] bg-vt-midnight px-5 text-white hover:bg-vt-midnight/90">
              <a href="#download">Download</a>
            </Button>
          </nav>
        </div>
      </header>

      {/* 1. Hero */}
      <section className="relative overflow-hidden border-b border-[hsl(var(--vt-violet)/0.12)] bg-gradient-to-br from-[#EEEAFB] via-[#F4F1FC] to-[#E8F0FF]">
        <div
          className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle at 30% 30%, hsl(var(--vt-violet) / 0.55), transparent 60%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-20 h-[420px] w-[420px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle at 70% 30%, hsl(var(--vt-blue) / 0.5), transparent 60%)" }}
        />

        <div className="container relative mx-auto px-5 py-14 md:px-10 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--vt-violet))]">
                August 2026 Benchmark
              </span>
              <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-vt-midnight md:text-5xl lg:text-6xl">
                AI Search Visibility &amp; AEO Benchmark
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-vt-midnight/80 md:text-xl">
                AI search tools are moving from measurement toward recommendation and action. Their commercial models are
                lagging behind.
              </p>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-vt-midnight/70">
                We analyzed <strong>12 AI search visibility and AEO companies</strong> across{" "}
                <strong>8 dimensions of publicly observable commercial evidence</strong> to understand what buyers can
                independently evaluate before speaking with sales.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 flex-shrink-0 rounded-[24px] bg-vt-midnight px-6 text-white hover:bg-vt-midnight/90"
                >
                  <a href="#download">
                    Download the Benchmark Executive Brief <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-medium text-vt-midnight transition-colors hover:text-[hsl(var(--vt-violet))]"
                >
                  Preview the first 3 pages <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="mt-5 text-sm font-medium text-vt-midnight/70">
                12 companies · 8 dimensions · 3 emerging product layers
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <div className="relative mx-auto max-w-[380px]">
                <div
                  className="absolute -inset-6 rounded-[28px] opacity-60 blur-2xl"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--vt-violet) / 0.5), hsl(var(--vt-blue) / 0.4))",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  aria-label="Preview the first 3 pages of the Benchmark Executive Brief"
                  className="relative block w-full rounded-xl shadow-vt-lg ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vt-violet))]"
                >
                  {previewPages[0].src ? (
                    <img
                      src={previewPages[0].src as string}
                      alt="August 2026 AI Search Visibility & AEO Benchmark Executive Brief cover"
                      className="block w-full rounded-xl"
                      draggable={false}
                    />
                  ) : (
                    <PreviewPlaceholder label="Cover" index={0} />
                  )}
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">Click the cover to peek inside</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. What surprised us */}
      <section className="container mx-auto px-5 py-14 md:px-10 md:py-20">
        <h2 className="text-2xl font-bold text-vt-midnight md:text-3xl">What surprised us</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {findings.map((f) => (
            <div key={f.value} className="rounded-2xl border border-border bg-white p-6 shadow-vt-sm md:p-7">
              <div className="text-3xl font-bold leading-none text-[hsl(var(--vt-violet))] md:text-4xl">{f.value}</div>
              <p className="mt-3 text-base font-semibold leading-snug text-vt-midnight">{f.headline}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
        <a
          href="#download"
          className="mt-7 inline-flex items-center gap-1 text-sm font-medium text-vt-midnight transition-colors hover:text-[hsl(var(--vt-violet))]"
        >
          See the evidence behind the findings → Download the Benchmark Executive Brief
        </a>
      </section>

      {/* 3. Emerging category model */}
      <section className="border-y border-border bg-white">
        <div className="container mx-auto px-5 py-14 md:px-10 md:py-20">
          <h2 className="text-2xl font-bold text-vt-midnight md:text-3xl">One category. Three emerging buyer jobs.</h2>
          <p className="mt-3 max-w-2xl text-base text-vt-midnight/70">
            As AI search products evolve, three distinct jobs are becoming visible.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {buyerJobs.map((j, i) => (
              <div
                key={j.title}
                className="rounded-2xl border border-[hsl(var(--vt-violet)/0.18)] bg-[hsl(var(--vt-bg-section))] p-6 md:p-7"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--vt-violet))]">
                  Layer {i + 1}
                </span>
                <h3 className="mt-2 text-lg font-bold text-vt-midnight">{j.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-vt-midnight/70">{j.question}</p>
              </div>
            ))}
          </div>
          <p className="mt-7 text-base font-semibold text-vt-midnight">
            Commercial maturity is developing unevenly as products move across these layers.
          </p>
        </div>
      </section>

      {/* 4. Three GTM questions */}
      <section className="container mx-auto px-5 py-14 md:px-10 md:py-20">
        <h2 className="text-2xl font-bold text-vt-midnight md:text-3xl">
          Three GTM questions the category is starting to answer
        </h2>
        <div className="mt-8 space-y-4">
          {gtmQuestions.map((q, i) => (
            <div
              key={q}
              className="flex items-start gap-5 rounded-2xl border border-border bg-white p-6 shadow-vt-sm"
            >
              <span className="text-2xl font-bold leading-none text-[hsl(var(--vt-violet))] md:text-3xl">{i + 1}.</span>
              <p className="text-base font-semibold leading-snug text-vt-midnight md:text-lg">{q}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-base text-vt-midnight/70">
          The Benchmark Executive Brief examines the emerging patterns, the companies providing evidence for them, and
          the questions the category still cannot answer.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-6 h-12 rounded-[24px] bg-vt-midnight px-6 text-white hover:bg-vt-midnight/90"
        >
          <a href="#download">
            Download the August Benchmark Executive Brief <ArrowRight className="ml-1 h-4 w-4" />
          </a>
        </Button>
      </section>

      {/* 5. Companies analyzed */}
      <section className="border-y border-border bg-white">
        <div className="container mx-auto px-5 py-14 md:px-10 md:py-20">
          <h2 className="text-2xl font-bold text-vt-midnight md:text-3xl">12 companies analyzed</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {companies.map((c) => (
              <div
                key={c}
                className="rounded-xl border border-border bg-[hsl(var(--vt-bg-section))] px-4 py-3 text-sm font-medium text-vt-midnight"
              >
                {c}
              </div>
            ))}
          </div>
          <p className="mt-7 text-sm font-semibold text-vt-midnight">
            The companies are the research sample, not a shortlist.
          </p>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Scores reflect public evidence maturity, not product quality, commercial strategy, customer satisfaction, or
            market leadership.
          </p>
        </div>
      </section>

      {/* 6. What the benchmark measures */}
      <section className="container mx-auto px-5 py-14 md:px-10 md:py-20">
        <h2 className="text-2xl font-bold text-vt-midnight md:text-3xl">What the benchmark measures</h2>
        <p className="mt-3 max-w-3xl text-base text-vt-midnight/70">
          The benchmark evaluates what buyers can independently understand and verify across eight areas of public
          commercial evidence:
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {dimensions.map((d) => (
            <div key={d} className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-vt-midnight shadow-vt-sm">
              {d}
            </div>
          ))}
        </div>
        <Link
          to="/methodology"
          className="mt-7 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-[hsl(var(--vt-violet))]"
        >
          Read the Benchmark Methodology <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>




      {/* 8. Previous benchmarks */}
      <section className="border-t border-border bg-white">
        <div className="container mx-auto px-5 py-14 md:px-10 md:py-20">
          <h2 className="text-2xl font-bold text-vt-midnight md:text-3xl">Explore previous ValueTempo benchmarks</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-border bg-[hsl(var(--vt-bg-section))] p-6 md:p-7">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--vt-violet))]">
                June 2026
              </span>
              <h3 className="mt-2 text-lg font-bold text-vt-midnight">AI Speech Platform Buyability Benchmark</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                12 AI speech platforms examined across commercial clarity, pricing, packaging, and buyer-facing evidence.
              </p>
              <Link
                to="/ai-speech-platform-benchmark-june-2026"
                className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-vt-midnight transition-colors hover:text-[hsl(var(--vt-violet))]"
              >
                Explore the June Benchmark <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex flex-col rounded-2xl border border-border bg-[hsl(var(--vt-bg-section))] p-6 md:p-7">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--vt-violet))]">
                May 2026
              </span>
              <h3 className="mt-2 text-lg font-bold text-vt-midnight">AI SaaS Buyability Benchmark</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                60 AI companies across five categories: AI Coding Assistants, AI Agent Platforms, AI Revenue
                Intelligence, AI Sales Intelligence, and AI Customer Support. The benchmark examined what buyers could
                independently understand, verify, justify, and buy before the first sales conversation.
              </p>
              <Link
                to="/ai-saas-buyability-benchmark-may-2026"
                className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-vt-midnight transition-colors hover:text-[hsl(var(--vt-violet))]"
              >
                Explore the May Benchmark <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}
