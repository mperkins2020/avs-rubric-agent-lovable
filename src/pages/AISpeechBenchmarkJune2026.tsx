import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import slopeChartAsset from "@/assets/june-2026-avs-category-averages-slope.png.asset.json";
import previewCoverAsset from "@/assets/june-2026-preview-1-cover.png.asset.json";
import previewContentsAsset from "@/assets/june-2026-preview-2-contents.png.asset.json";
import previewExecSummaryAsset from "@/assets/june-2026-preview-3-executive-summary.png.asset.json";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Footer } from "@/components/Footer";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { SEOHead } from "@/components/SEOHead";
import { FAQJsonLd } from "@/components/FAQJsonLd";
import { BrevoSignupFormJune2026 } from "@/components/BrevoSignupFormJune2026";

const MOBILE_BREAKPOINT = 1024;
function useFormVariant(): "mobile" | "desktop" | null {
  const [variant, setVariant] = useState<"mobile" | "desktop" | null>(() => {
    if (typeof window === "undefined") return null;
    return window.innerWidth < MOBILE_BREAKPOINT ? "mobile" : "desktop";
  });
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setVariant(e.matches ? "mobile" : "desktop");
    setVariant(mql.matches ? "mobile" : "desktop");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return variant;
}

const stats = [
  { value: "12", label: "Companies scored" },
  { value: "86%", label: "Category average — highest in the benchmark to date" },
  { value: "100%", label: "Of companies scored Exemplary (first time in the benchmark)" },
  { value: "4 of 8", label: "Dimensions scored perfectly across all 12 companies" },
  { value: "9 of 12", label: "Companies don't document what happens when production hits a rate limit" },
  { value: "7 · 5", label: "Pricing models: 7 Hybrid (58%) · 5 Consumption (42%)" },
];

const findings = [
  {
    title: "Developer-first GTM sets a new transparency floor",
    body:
      "86% category average — 17 points above May's top category. When the pricing page does the work a sales rep would otherwise handle, commercial clarity follows structurally.",
  },
  {
    title: "Four dimensions scored perfectly. Two exposed the shared gap.",
    body:
      "ICP clarity, budget alignment, value unit, and packaging scored 2.0 across all 12 companies. The gaps concentrate in verifiable performance claims and production-edge behavior.",
  },
  {
    title: "Verifiable performance claims are the GTM liability most companies are ignoring",
    body:
      "8 of 12 companies make claims buyers can't independently verify. All four that scored full marks on this dimension are consumption-model companies.",
  },
  {
    title: "The shared floor is what happens when production hits a limit",
    body:
      "9 of 12 companies don't document rate limit behavior, credit exhaustion, or overage handling. For operators building on this infrastructure, that's an unquantified production risk.",
  },
  {
    title: "Sub-type drives score variation within the Exemplary band",
    body:
      "Full Speech Platforms averaged 93.8%. Voice Agent Platforms 89.6%. TTS 84.4%. STT 81.3%. All Exemplary — but the gap within the band is driven by D5 and D7 documentation depth.",
  },
  {
    title: "100% is not the ceiling",
    body:
      "Deepgram and Retell AI both scored 16/16 and still have named gaps in spend controls, billing disputes, and refund policies that informed buyers will surface.",
  },
];

const companies = [
  ["AssemblyAI", "assemblyai.com", "STT", "Consumption"],
  ["Bland.ai", "bland.ai", "Voice Agent Platform", "Hybrid (access + consumption)"],
  ["Cartesia", "cartesia.ai", "TTS", "Hybrid (access + consumption)"],
  ["Deepgram", "deepgram.com", "Full Speech Platform", "Consumption"],
  ["ElevenLabs", "elevenlabs.io", "TTS", "Hybrid (access + consumption)"],
  ["LMNT", "lmnt.com", "TTS", "Hybrid (access + consumption)"],
  ["Murf AI", "murf.ai", "TTS — Creative voice", "Hybrid (access + consumption)"],
  ["Retell AI", "retellai.com", "Voice Agent Platform", "Consumption"],
  ["Rime", "rime.ai", "TTS", "Consumption"],
  ["Speechmatics", "speechmatics.com", "Full Speech Platform", "Consumption"],
  ["Vapi", "vapi.ai", "Voice Agent Platform", "Hybrid (access + consumption)"],
  ["Wellsaid Labs", "wellsaid.io", "TTS — Enterprise", "Hybrid (access + consumption)"],
];

const faqs = [
  {
    question: "What does the AVS Benchmark measure?",
    answer:
      "The AVS (Adaptive Value System) Benchmark measures published commercial evidence — what a buyer can independently verify on pricing pages, documentation, packaging pages, and other public surfaces before speaking with sales. It does not measure product quality, feature depth, or customer satisfaction.",
  },
  {
    question: "Does a higher score mean a better product?",
    answer:
      "No. A higher score means stronger published commercial evidence. A lower score means there are specific buyer questions that can only be answered by engaging sales — not that the product is weaker.",
  },
  {
    question: "Why did AI Speech score so much higher than May's categories?",
    answer:
      "Developer-first, usage-based products document pricing, billing units, and buyer segments in detail because their primary customer reads the documentation before talking to anyone. That expectation forces commercial transparency that sales-led categories can defer to a discovery call. The result: buyer questions in AI Speech have moved past \"what does this cost?\" toward \"what happens in production when something goes wrong?\"",
  },
  {
    question: "All 12 companies scored Exemplary — does that mean they're equivalent?",
    answer:
      "No. There's meaningful variation within the band (81%–100%), and even the top scorers have specific gaps in commercial terms that no dimension currently captures. The full report details what's missing at each level.",
  },
  {
    question: "Who is this benchmark for?",
    answer:
      "Founders building AI voice products who want to benchmark their commercial transparency against category peers, and GTM operators, practitioners, and product marketers who want to see what commercial evidence looks like at the top of this category — and what the gaps reveal about where AI speech GTM still falls short.",
  },
  {
    question: "What is a score walkthrough?",
    answer:
      "A score walkthrough reviews your public commercial evidence — pricing page, documentation, trust surfaces — against the AVS Rubric dimensions and identifies the specific gaps most likely to slow buyer decisions. Request one below.",
  },
];

const SignupForm = BrevoSignupFormJune2026;

// Placeholder image slot — swap in real assets when uploaded.
function ImagePlaceholder({ alt, aspect = "aspect-[4/5]" }: { alt: string; aspect?: string }) {
  return (
    <div
      className={`w-full ${aspect} rounded-lg md:rounded-xl border border-dashed border-[hsl(var(--vt-violet)/0.4)] bg-white/60 shadow-vt-sm flex items-center justify-center p-4`}
      role="img"
      aria-label={alt}
    >
      <span className="text-xs text-muted-foreground text-center leading-relaxed">{alt}</span>
    </div>
  );
}

export default function AISpeechBenchmarkJune2026() {
  const formVariant = useFormVariant();

  return (
    <div className="min-h-screen bg-[hsl(var(--vt-bg-section))]">
      <SEOHead
        title="AI Speech Platform Buyability Benchmark, June 2026 | ValueTempo"
        description="12 AI speech companies scored on the commercial evidence buyers can verify before the first sales conversation. 86% category average — the highest in the AVS Benchmark to date."
        canonicalUrl="https://app.valuetempo.com/ai-speech-platform-benchmark-june-2026"
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

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[hsl(var(--vt-violet)/0.12)] bg-gradient-to-br from-[#EEEAFB] via-[#F4F1FC] to-[#E8F0FF]">
        <div className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle at 30% 30%, hsl(var(--vt-violet) / 0.55), transparent 60%)" }} />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-[420px] w-[420px] rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle at 70% 30%, hsl(var(--vt-blue) / 0.5), transparent 60%)" }} />

        <div className="container mx-auto px-5 md:px-10 py-14 md:py-20 relative">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="lg:col-span-7">
              <span className="text-[11px] font-semibold tracking-[0.2em] text-[hsl(var(--vt-violet))] uppercase">
                Benchmark Report · June 2026
              </span>
              <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-bold text-vt-midnight leading-[1.05] tracking-tight">
                AI Speech Platform Buyability Benchmark,
                <br className="hidden md:block" /> June 2026
              </h1>
              <p className="mt-5 text-lg md:text-xl text-vt-midnight/80 leading-relaxed max-w-2xl">
                We scored 12 AI speech companies — STT providers, TTS platforms, and voice agent builders — on what buyers can independently verify before the first sales conversation.
              </p>
              <p className="mt-5 text-base text-vt-midnight/70 leading-relaxed max-w-2xl">
                First category in the AVS Benchmark where every company scored Exemplary. When basic buyability is largely solved, the remaining gaps become the signal worth paying attention to.
              </p>

              <div className="mt-7 flex flex-nowrap items-center gap-x-6 gap-y-3 whitespace-nowrap overflow-x-auto">
                <Button asChild size="lg" className="bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[24px] h-12 px-6 flex-shrink-0">
                  <a href="#download">
                    Download the report <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
                <a href="https://calendly.com/mlhperkins/30min" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-vt-midnight hover:text-[hsl(var(--vt-violet))] transition-colors inline-flex items-center gap-1 flex-shrink-0">
                  Request a score walkthrough <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <Link to="/methodology" className="text-sm font-medium text-vt-midnight hover:text-[hsl(var(--vt-violet))] transition-colors inline-flex items-center gap-1 flex-shrink-0">
                  Read the methodology <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="lg:col-span-5">
              <ImagePlaceholder alt="June 2026 AI Speech Platform AVS Benchmark report cover" />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-7 space-y-16">
            {/* Who it's for */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                Who the report is for
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
                This report is for you if:
              </h2>
              <ul className="mt-5 space-y-3 max-w-3xl">
                <li className="flex gap-3 text-base text-vt-midnight/80 leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[hsl(var(--vt-violet))]" />
                  <span>You're a <strong>founder</strong> building an AI voice product and want to see how your commercial transparency stacks up against category peers</span>
                </li>
                <li className="flex gap-3 text-base text-vt-midnight/80 leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[hsl(var(--vt-violet))]" />
                  <span>You're a <strong>GTM operator, practitioner, or product marketer</strong> who wants to see what commercial evidence looks like at the top of this category — and what the gaps reveal about where AI speech GTM still falls short</span>
                </li>
              </ul>
            </div>

            {/* Stats */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                Benchmark Snapshot
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
                Key numbers from the June 2026 edition
              </h2>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-white p-5 shadow-vt-sm">
                    <div className="text-2xl md:text-3xl font-bold text-vt-midnight leading-tight">{s.value}</div>
                    <div className="mt-1 text-xs md:text-sm text-muted-foreground leading-snug">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile inline form */}
            {formVariant === "mobile" && (
              <div>
                <SignupForm id="download" />
                <p className="mt-3 text-sm text-muted-foreground text-center">
                  No spam. One email with your download link, one follow-up. That's it.
                </p>
              </div>
            )}

            {/* Benchmark context */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                Benchmark Context
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
                What the AVS Benchmark measures
              </h2>
              <p className="mt-4 text-base text-vt-midnight/80 leading-relaxed max-w-3xl">
                The AVS (Adaptive Value System) Benchmark measures published commercial evidence — what a buyer can independently verify on pricing pages, documentation, and other public surfaces before engaging sales. A higher score means stronger published evidence. It is not a judgment of product quality.
              </p>
            </div>

            {/* Report preview / teaser */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                6 findings inside
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
                What the benchmark found
              </h2>
              <ul className="mt-5 space-y-3 max-w-3xl text-base text-vt-midnight/80 leading-relaxed">
                <li className="flex gap-3">
                  <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-[hsl(var(--vt-violet))]" />
                  <span>Developer-first, usage-based GTM structurally requires commercial transparency: buyers read the docs before talking to anyone, which forces pricing, billing units, and packaging clarity that sales-led categories can defer — 17 points above May's top category</span>
                </li>
                <li className="flex gap-3">
                  <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-[hsl(var(--vt-violet))]" />
                  <span>Vague performance claims are a GTM liability: 8 of 12 companies make claims buyers can't verify without a proof of concept</span>
                </li>
                <li className="flex gap-3">
                  <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-[hsl(var(--vt-violet))]" />
                  <span>Even the two 16/16 scorers have specific, named gaps in commercial terms that the rubric doesn't capture</span>
                </li>
              </ul>

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <ImagePlaceholder alt="June 2026 AI Speech Platform AVS Benchmark report cover" aspect="aspect-[3/4]" />
                <ImagePlaceholder alt="Report preview page 1" aspect="aspect-[3/4]" />
                <ImagePlaceholder alt="Report preview page 2" aspect="aspect-[3/4]" />
                <ImagePlaceholder alt="Report preview page 3" aspect="aspect-[3/4]" />
              </div>
            </div>

            {/* Editorial insight */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                What the category reveals
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
                When the top of a category is 86%, the remaining gaps are the signal
              </h2>
              <div className="mt-5 space-y-4 text-base text-vt-midnight/80 leading-relaxed max-w-3xl">
                <p>When a category scores 86% on average — 17 points above the next highest — the gaps that remain tell you more than the gaps that were closed.</p>
                <p>In AI Speech, the basic buyability problems are solved. Pricing is visible. Value units are named. Packaging is clear. Buyers can estimate spend from public sources before talking to anyone. That's what developer-first, usage-based GTM forces: when your primary buyer reads the documentation before scheduling a call, commercial transparency has to be there.</p>
                <p>What's left is harder. Performance claims that can't be independently verified without running a proof of concept. Production-edge behavior — rate limits, credit exhaustion, call termination — left undocumented until after deployment. Post-purchase commercial terms: no configurable spend caps, no dispute process for contested charges, no published refund policy.</p>
                <p>The gaps have moved. They're not about whether buyers can understand the offer. They're about whether buyers can trust what happens in production.</p>
                <p>One more pattern the data reveals: pure consumption models outperform hybrid models by 9.5 points on average (92.5% vs. 83.0%). The simpler the pricing structure, the easier it is to document performance claims and production-edge behavior cleanly. All four companies with verifiable performance claims (D1) are consumption-model companies. Two of the three with full production-edge documentation (D7) are as well.</p>
              </div>

              <figure className="mt-8">
                <figcaption className="mb-3 text-sm font-semibold text-vt-midnight">
                  AVS Category Averages — May 2026 vs. June 2026 Spotlight
                </figcaption>
                <img
                  src={slopeChartAsset.url}
                  alt="Slope chart: May 2026 AVS category averages (59%–69%) vs. June 2026 AI Speech Platform at 86%"
                  className="w-full max-w-3xl rounded-xl border border-border shadow-vt-sm"
                  loading="lazy"
                />
              </figure>
            </div>

            {/* Findings cards */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                Six Findings
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
                Preview of what's inside
              </h2>
              <ol className="mt-6 space-y-4">
                {findings.map((f, i) => (
                  <li key={f.title} className="rounded-xl border border-border bg-white p-5 md:p-6 shadow-vt-sm flex gap-4">
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-[hsl(var(--vt-violet)/0.12)] text-[hsl(var(--vt-violet))] font-bold flex items-center justify-center text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-semibold text-vt-midnight leading-snug">{f.title}</h3>
                      <p className="mt-1.5 text-sm md:text-base text-muted-foreground leading-relaxed">{f.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Companies evaluated */}
            <div>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                Companies evaluated
              </span>
              <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
                12 companies scored in the June 2026 AVS Benchmark
              </h2>
              <p className="mt-3 text-base text-vt-midnight/75 max-w-3xl">All have public pricing.</p>
              <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white shadow-vt-sm">
                <table className="w-full text-sm">
                  <thead className="bg-[hsl(var(--vt-violet)/0.06)] text-vt-midnight">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">Company</th>
                      <th className="text-left font-semibold px-4 py-3">Domain</th>
                      <th className="text-left font-semibold px-4 py-3">Sub-type</th>
                      <th className="text-left font-semibold px-4 py-3">Pricing model</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((row) => (
                      <tr key={row[0]} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-vt-midnight">{row[0]}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row[1]}</td>
                        <td className="px-4 py-3 text-vt-midnight/80">{row[2]}</td>
                        <td className="px-4 py-3 text-vt-midnight/80">{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-muted-foreground italic">
                Play.ai, Resemble AI, and Speechify are in this category but were not included in the June 2026 run.
              </p>
            </div>

            {/* Secondary CTA */}
            <div className="rounded-2xl bg-vt-midnight text-white p-7 md:p-10">
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                Score Walkthrough
              </span>
              <h2 className="mt-3 text-2xl md:text-3xl font-bold leading-tight">
                Want to go deeper than the public report?
              </h2>
              <p className="mt-3 text-base text-white/75 leading-relaxed max-w-2xl">
                The full analyst report covers what this public version doesn't: dimension-level scores for all 12 companies, individual company profiles with specific improvement areas per dimension, how the scoring guide rules were applied company by company, and sub-segment analysis by dimension. A score walkthrough covers the full analysis and what it means for your company or vendor evaluation.
              </p>
              <ul className="mt-5 space-y-2.5 max-w-2xl text-sm text-white/80">
                {[
                  "Dimension-by-dimension scores for all 12 companies — exactly where each scored 1 vs. 2 and why",
                  "12 company profiles with named improvement areas and the specific documentation changes that would move each score",
                  "How category-specific rules were applied: voice cloning consent threshold, PSTN pass-through, credit conversion, and D7 sub-type differentiation",
                  "Sub-segment dimension analysis — what separates STT, TTS, and voice agent platforms within the Exemplary band",
                  "Assumptions validated and revised — where the scoring guide predictions held and where the market surprised us",
                ].map((item) => (
                  <li key={item} className="flex gap-3 leading-relaxed">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[hsl(var(--vt-violet))]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Button asChild size="lg" className="bg-white text-vt-midnight hover:bg-white/90 rounded-[24px] h-12 px-7">
                  <a href="https://calendly.com/mlhperkins/30min" target="_blank" rel="noopener noreferrer">
                    Request a score walkthrough →
                  </a>
                </Button>
                <a href="mailto:michelle@valuetempo.com" className="text-sm text-white/80 hover:text-white underline underline-offset-4">
                  Or contact Michelle Perkins directly — michelle@valuetempo.com
                </a>
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

            {/* Also in the AVS Benchmark Series */}
            <div className="rounded-2xl border border-border bg-white p-7 md:p-8 shadow-vt-sm">
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                Also in the AVS Benchmark Series
              </span>
              <h3 className="mt-3 text-xl md:text-2xl font-bold text-vt-midnight">
                May 2026 AI SaaS Buyability Benchmark
              </h3>
              <p className="mt-2 text-base text-vt-midnight/75 max-w-2xl">
                60 companies. 5 categories. The benchmark that established buyability as a measurable GTM standard.
              </p>
              <Link
                to="/ai-saas-buyability-benchmark-may-2026"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[hsl(var(--vt-violet))] hover:underline"
              >
                Download the May 2026 report <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <p className="text-sm text-muted-foreground italic border-t border-border pt-6">
              The AVS Benchmark is produced by ValueTempo. Scores reflect publicly observable, buyer-facing evidence as of June 30, 2026. This report does not constitute an endorsement or recommendation of any scored company.
            </p>
          </div>

          {/* Sticky form (desktop) */}
          {formVariant === "desktop" && (
            <aside className="lg:col-span-5">
              <div className="sticky top-24">
                <div>
                  <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                    Download
                  </span>
                  <h2 className="mt-2 mb-2 text-2xl font-bold text-vt-midnight leading-tight">
                    Get the full June 2026 AI Speech Platform Benchmark
                  </h2>
                  <p className="mb-4 text-sm text-vt-midnight/75 leading-relaxed">
                    12 companies. 8 dimensions. The highest-scoring category in the benchmark — and a clear map of what's still missing at the top.
                  </p>
                </div>
                <SignupForm id="download" />
                <p className="mt-3 text-sm text-muted-foreground text-center">
                  No spam. One email with your download link, one follow-up. That's it.
                </p>
              </div>
            </aside>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
