import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Download } from "lucide-react";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import benchmarkCoverAsset from "@/assets/benchmark-cover.png.asset.json";
import benchmarkContentsAsset from "@/assets/benchmark-contents.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Footer } from "@/components/Footer";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { SEOHead } from "@/components/SEOHead";
import { FAQJsonLd } from "@/components/FAQJsonLd";
import { BrevoSignupForm } from "@/components/BrevoSignupForm";

const stats = [
  { value: "60", label: "Companies scored" },
  { value: "5", label: "AI SaaS categories" },
  { value: "8", label: "Evidence dimensions" },
  { value: "59%", label: "Average score" },
  { value: "43 / 60", label: "Companies in the Trusted band" },
  { value: "4", label: "Companies broke 80% (Exemplary)" },
];

const findings = [
  {
    title: "Category averages hide where the market is moving",
    body: "Category spread shows whether buyer evidence norms are mature, uneven, or still stuck.",
  },
  {
    title: "Value unit precision creates a 43-point gap",
    body: "A named unit is not enough. Buyers need to understand what one unit means and whether they can estimate spend before sales.",
  },
  {
    title: "Challengers often publish stronger buyer evidence",
    body: "In 4 of 5 categories, a challenger outscored the incumbent on public buyer evidence.",
  },
  {
    title: "Commercial evidence breaks in sequence",
    body: "Pricing clarity, value unit definition, and packaging work as a connected system.",
  },
  {
    title: "Strong companies stall at 75% without operational evidence",
    body: "Moving beyond 75% requires publishing cost drivers, plan limits, overage behavior, and buyer controls.",
  },
  {
    title: "The next publishing move depends on the buyer blocker",
    body: "Each category has a different evidence gap. The right fix is category-specific, not universal.",
  },
];

const faqs = [
  {
    question: "What does the AI SaaS Buyability Benchmark measure?",
    answer:
      "The benchmark measures published commercial evidence: the buyer-facing information available on public websites, pricing pages, packaging pages, documentation, and related public surfaces.",
  },
  {
    question: "Which companies were evaluated?",
    answer:
      "The May 2026 edition evaluated 60 AI B2B SaaS companies across five categories: AI Agent Platforms, AI Coding Assistants, AI Customer Support, AI Revenue Intelligence, and AI Sales Intelligence. See the list of companies evaluated.",
  },
  {
    question: "Does a higher score mean a better product?",
    answer:
      "No. A higher score means stronger published commercial evidence. It should not be read as a product-quality judgment.",
  },
  {
    question: "Does the benchmark penalize sales-assisted buying?",
    answer:
      "No. Sales-assisted buying can still score well when buyers can verify enough evidence before the first call. Missing or inaccessible evidence lowers the score.",
  },
  {
    question: "What is included in the full report?",
    answer:
      "The report includes a benchmark overview, six key findings, category-level patterns, operator takeaways, and methodology notes. See a preview above.",
  },
  {
    question: "What is a buyability benchmark score walkthrough?",
    answer:
      "A buyability benchmark score walkthrough is a session that identifies where a company's public commercial evidence is strong and where buyer-confidence gaps remain. For products in one of the benchmark's five categories, ValueTempo also compares the company's evidence against others in its category and delivers an actionable plan for what to publish next to improve buyability.",
  },
];

function FlipBook() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative mx-auto max-w-[420px] lg:max-w-none">
      <div
        className="absolute -inset-6 rounded-[28px] opacity-60 blur-2xl"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--vt-violet) / 0.5), hsl(var(--vt-blue) / 0.4))",
        }}
      />
      <div
        className="relative"
        style={{ perspective: "2000px" }}
      >
        {/* Contents page (behind, revealed when cover opens) */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close cover"
          aria-hidden={!open}
          tabIndex={open ? 0 : -1}
          className="block w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vt-violet))] rounded-lg md:rounded-xl"
        >
          <img
            src={benchmarkContentsAsset.url}
            alt="AI SaaS Buyability Benchmark — table of contents preview"
            className="block w-full h-auto rounded-lg md:rounded-xl shadow-vt-lg ring-1 ring-black/5"
            draggable={false}
          />
        </button>
        {/* Cover page (on top, flips open from the left edge) */}
        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close cover" : "Open cover to see contents"}
          className="absolute inset-0 origin-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vt-violet))] rounded-lg md:rounded-xl"
          style={{ transformStyle: "preserve-3d", cursor: open ? "default" : "pointer", pointerEvents: open ? "none" : "auto" }}
          animate={{ rotateY: open ? -160 : 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            src={benchmarkCoverAsset.url}
            alt="AI SaaS Buyability Benchmark May 2026 Edition — report cover"
            className="block w-full h-auto rounded-lg md:rounded-xl shadow-vt-lg ring-1 ring-black/5"
            style={{ backfaceVisibility: "hidden" }}
            draggable={false}
          />
        </motion.button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {open ? "Click the contents page to close" : "Click the cover to peek inside"}
      </p>
    </div>
  );
}

const SignupForm = BrevoSignupForm;

export default function BuyabilityBenchmarkMay2026() {
  return (
    <div className="min-h-screen bg-[hsl(var(--vt-bg-section))]">
      <SEOHead
        title="AI SaaS Buyability Benchmark, May 2026 Edition | ValueTempo"
        description="A benchmark of how 60 AI SaaS companies publish the commercial evidence buyers need to estimate cost, evaluate risk, and move forward before the first call."
        canonicalUrl="https://app.valuetempo.com/ai-saas-buyability-benchmark-may-2026"
        ogImage="https://app.valuetempo.com/ValueTempo_Logo.png"
        type="website"
      />
      <FAQJsonLd faqs={faqs} />

      <header className="sticky top-0 z-30 border-b border-border bg-white/75 backdrop-blur-md">
        <div className="container mx-auto px-5 md:px-10 h-[72px] flex items-center justify-between">
          <Link to="/" aria-label="ValueTempo home">
            <img alt="ValueTempo" className="h-8" src={ValueTempoLogo} />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Methodology
            </Link>
            <ResourcesDropdown />
            <Button asChild size="sm" className="bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[20px] px-5 h-9">
              <a href="#download">Download</a>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero band — soft lavender with gradient blob accents */}
      <section className="relative overflow-hidden border-b border-[hsl(var(--vt-violet)/0.12)] bg-gradient-to-br from-[#EEEAFB] via-[#F4F1FC] to-[#E8F0FF]">
        <div
          className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, hsl(var(--vt-violet) / 0.55), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-20 h-[420px] w-[420px] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 70% 30%, hsl(var(--vt-blue) / 0.5), transparent 60%)",
          }}
        />

        <div className="container mx-auto px-5 md:px-10 py-14 md:py-20 relative">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            {/* Left content */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7"
            >
              <span className="text-[11px] font-semibold tracking-[0.2em] text-[hsl(var(--vt-violet))] uppercase">
                Benchmark Report · May 2026
              </span>
              <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-bold text-vt-midnight leading-[1.05] tracking-tight">
                AI SaaS Buyability Benchmark,
                <br className="hidden md:block" /> May 2026 Edition
              </h1>
              <p className="mt-5 text-lg md:text-xl text-vt-midnight/80 leading-relaxed max-w-2xl">
                A benchmark of how 60 AI SaaS companies publish the commercial evidence buyers need
                to understand value, estimate cost, evaluate risk, and move forward before the first
                call.
              </p>
              <p className="mt-5 text-base text-vt-midnight/70 leading-relaxed max-w-2xl">
                Download the 17-page report to see where AI SaaS companies are making evaluation easier, where
                buyer-confidence gaps remain, and which publishing moves can help teams improve
                buyability.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[24px] h-12 px-7"
                >
                  <a href="#download">
                    <Download className="mr-1 h-4 w-4" />
                    Download the report
                  </a>
                </Button>
                <Link
                  to="/ai-saas-buyability-benchmark-may-2026/companies-evaluated"
                  className="text-sm font-medium text-vt-midnight hover:text-[hsl(var(--vt-violet))] transition-colors inline-flex items-center gap-1"
                >
                  View the companies evaluated <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/methodology"
                  className="text-sm font-medium text-vt-midnight hover:text-[hsl(var(--vt-violet))] transition-colors inline-flex items-center gap-1"
                >
                  Read the methodology <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* Right: cover image that opens to contents */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-5"
            >
              <FlipBook />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Two-column body */}
      <section className="container mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14">
          {/* LEFT: scrolling content */}
          <div className="lg:col-span-8 space-y-16">
            {/* Stats */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                Benchmark Snapshot
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
                Key numbers from the May 2026 edition
              </h2>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-border bg-white p-5 shadow-vt-sm"
                  >
                    <div className="text-2xl md:text-3xl font-bold text-vt-midnight leading-tight">
                      {s.value}
                    </div>
                    <div className="mt-1 text-xs md:text-sm text-muted-foreground leading-snug">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-base text-vt-midnight/75 leading-relaxed">
                The market is compressed rather than polarized. Most companies publish enough
                evidence to be considered, but not enough to make independent evaluation easy.
              </p>
            </div>

            {/* Mobile inline form */}
            <div className="lg:hidden">
              <SignupForm id="download-mobile-1" />
            </div>

            {/* What the benchmark measures */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                Benchmark Context
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
                What the buyability benchmark measures
              </h2>
              <div className="mt-4 space-y-4 text-base text-vt-midnight/80 leading-relaxed max-w-3xl">
                <p>
                  The May 2026 AI SaaS Buyability Benchmark evaluates the public commercial evidence
                  buyers can verify before speaking with sales: pricing clarity, value unit
                  definition, packaging, cost drivers, limits, risk, and trust signals.
                </p>
                <p>
                  A higher score indicates stronger published buyer-facing evidence. It should not
                  be read as a product-quality judgment.
                </p>
              </div>
            </div>

            {/* Findings */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                Six Findings
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
                Preview of what's inside
              </h2>
              <ol className="mt-6 space-y-4">
                {findings.map((f, i) => (
                  <li
                    key={f.title}
                    className="rounded-xl border border-border bg-white p-5 md:p-6 shadow-vt-sm flex gap-4"
                  >
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-[hsl(var(--vt-violet)/0.12)] text-[hsl(var(--vt-violet))] font-bold flex items-center justify-center text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-semibold text-vt-midnight leading-snug">
                        {f.title}
                      </h3>
                      <p className="mt-1.5 text-sm md:text-base text-muted-foreground leading-relaxed">
                        {f.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* What operators can do */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                For Operators
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
                What operators can do with the report
              </h2>
              <p className="mt-4 text-base text-vt-midnight/80 leading-relaxed max-w-3xl">
                Use the buyability benchmark to identify:
              </p>
              <ul className="mt-4 space-y-2.5 max-w-3xl">
                {[
                  "where your category is already converging around buyer-ready evidence",
                  "which evidence gaps still slow buyer confidence",
                  "whether your pricing, packaging, value unit, and risk signals are clear enough before sales",
                  "which publishing moves can make your product easier to evaluate",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-base text-vt-midnight/80 leading-relaxed"
                  >
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[hsl(var(--vt-violet))]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-base text-vt-midnight/80 leading-relaxed max-w-3xl">
                The fastest improvement usually comes from publishing the missing commercial
                evidence that helps buyers move from interest to confidence.
              </p>
            </div>

            {/* Secondary CTA */}
            <div className="rounded-2xl bg-vt-midnight text-white p-7 md:p-10">
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                Score Walkthrough
              </span>
              <h2 className="mt-3 text-2xl md:text-3xl font-bold leading-tight">
                Want to understand how your company would score?
              </h2>
              <p className="mt-3 text-base text-white/75 leading-relaxed max-w-2xl">
                A buyability score walkthrough helps identify where your public buyer evidence is
                strong, where buyers still need sales to fill gaps, and what to publish next.
              </p>
              <div className="mt-6">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-vt-midnight hover:bg-white/90 rounded-[24px] h-12 px-7"
                >
                  <a
                    href="https://calendly.com/mlhperkins/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Request a buyability score walkthrough
                  </a>
                </Button>
              </div>
            </div>

            {/* FAQ */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                FAQ
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
                Frequently asked questions
              </h2>
              <Accordion type="single" collapsible className="mt-6 rounded-xl border border-border bg-white px-5 shadow-vt-sm">
                {faqs.map((f, i) => (
                  <AccordionItem key={f.question} value={`item-${i}`} className="border-b last:border-b-0">
                    <AccordionTrigger className="text-left text-base font-semibold text-vt-midnight">
                      {f.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                      {f.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Mobile end-of-page form intentionally omitted —
                the Brevo embed must render only once per viewport
                (duplicate #sib-form / #sib-captcha ids would break reCAPTCHA). */}

            <p className="text-sm text-muted-foreground italic border-t border-border pt-6">
              Published by ValueTempo. This benchmark measures published commercial evidence, not
              product quality.
            </p>
          </div>

          {/* RIGHT: sticky form */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24">
              <SignupForm id="download" />
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
}
