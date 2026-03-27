import { Link } from "react-router-dom";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { motion } from "framer-motion";
import { Footer } from "@/components/Footer";
import { Sparkles, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { BlogTOC, TocItem } from "@/components/BlogTOC";
import { SEOHead } from "@/components/SEOHead";

const tocSections: TocItem[] = [
  { id: "real-problem", label: "Evidence Integrity, Not Scoring" },
  { id: "pattern-early", label: "The Pattern Showed Up Early" },
  { id: "beautiful-ai", label: "Beautiful.ai Made It Clear" },
  { id: "worst-errors", label: "Worst Errors Looked Legitimate" },
  { id: "structured-extraction", label: "Structured Extraction Trap" },
  { id: "small-artifacts", label: "Small Artifacts, Big Impact" },
  { id: "low-signal-pages", label: "Low-Signal Page Crowding" },
  { id: "biggest-gains", label: "Pipeline Over Model" },
  { id: "restraint", label: "Restraint Over Rushing" },
  { id: "auditable-evidence", label: "Auditable Evidence" },
  { id: "trustworthy-evidence", label: "The Real Bar" },
];

export default function BlogEngineTuning() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="A Stable Score Can Still Hide Unstable Evidence"
        description="What hardening AVS Rubric across Beautiful.ai, Hex.tech, and ZoomInfo taught me about evidence integrity, trust infrastructure, and building an AI-native diagnostic founders can trust."
        canonicalUrl="https://valuetempo.lovable.app/resources/blog/stable-score-unstable-evidence"
        publishedDate="2026-03-19"
        tags={["build in public", "evidence integrity", "trust infrastructure", "AVS Rubric", "AI-native diagnostic"]}
      />
      <header className="sticky top-0 z-30 border-b border-border bg-white/75 backdrop-blur-md">
        <div className="container mx-auto px-5 md:px-10 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src={ValueTempoLogo} />
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Methodology</Link>
            <ResourcesDropdown />
            <Button
              size="sm"
              className="bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[20px] px-5 h-9"
              asChild
            >
              <Link to="/#url-input">Analyze</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="flex gap-10 max-w-6xl mx-auto">
          <BlogTOC sections={tocSections} variant="sidebar" />

          <div className="flex-1 max-w-3xl">
            <Link to="/resources/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </Link>

            <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="prose prose-invert max-w-none">
              <div className="mb-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Calendar className="w-4 h-4" />
                  <time>March 2026</time>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3">A Stable Score Can Still Hide Unstable Evidence</h1>
                <p className="text-lg md:text-xl text-muted-foreground">What hardening AVS Rubric across three companies taught me about building an AI-native trust infrastructure diagnostic</p>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-8">
                <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">TL;DR</p>
                <p className="text-foreground/90 leading-relaxed">Hardening the AVS Rubric across Beautiful.ai, Hex.tech, and ZoomInfo revealed that reliability is the visible outcome but evidence integrity is the underlying condition. Stable scores can hide unstable evidence. The biggest gains came from the evidence pipeline — not the model. Structured extraction multiplies both signal and noise. And the bar for an AI-native trust diagnostic is not interesting output — it is trustworthy evidence.</p>
              </div>

              <div className="space-y-6 text-foreground/90 leading-relaxed">
                <p>Trust in AI-native products is one of the harder problems to diagnose — and one of the most expensive to ignore. A trust gap can open before buyers ever try the product, and widen further before churn shows up in the performance data. That's because buyers often cannot predict how the product will behave, what they will pay, or whether value will match their spend — from the company's public surface alone.</p>

                <p>The Adaptive Value System (AVS) Rubric exists to diagnose whether that trust infrastructure is visible before the gap slows growth.</p>

                <p>Last week I wrote about <Link to="/resources/blog/vibecoding-ai-startup-tool" className="text-primary underline hover:text-primary/80">vibecoding the first version of AVS Rubric using Lovable and Claude Code</Link>. The core lesson was simple: shipping fast was not the hard part. Making the output reliable enough to trust was.</p>

                <p>This week pushed that lesson further.</p>

                <p>As I hardened the rubric across Beautiful.ai, Hex.tech, and ZoomInfo, the pattern became clear: reliability was only the visible problem. <strong>Evidence integrity was the deeper one.</strong></p>

                <p>What changed this week was not just the output. It was the discipline around how I checked it. Each iteration followed the same loop: inspect the evidence trail, classify the failure, fix the earliest point in the pipeline, then rerun the same company set to check for regressions. Tools like Lovable and Claude Code sped up parts of that work, but they did not define correctness. I still had to decide what counted as valid commercial evidence, what should be excluded, and which contradictions mattered enough to change the score.</p>

                <p>That is where AVS Rubric started to feel like more than a scoring tool. It started to feel like the category ValueTempo is building toward: an <strong>AI-native trust infrastructure diagnostic</strong>.</p>

                {/* The real problem */}
                <hr className="border-border/50 my-8" />
                <h2 id="real-problem" className="text-2xl font-bold mt-12 mb-4 text-foreground">The real problem was not scoring accuracy, it was evidence integrity</h2>
                <p>Here is what I learned this week:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>stable scores can hide unstable evidence quality</li>
                  <li>the biggest failures happened before scoring, not during scoring</li>
                  <li>structured extraction is a force multiplier, it multiplies both signal and noise</li>
                  <li>some of the worst errors came from pages that looked legitimate, not obviously broken</li>
                  <li>the most important fixes happened in the evidence pipeline, not in the model</li>
                </ul>
                <p className="font-semibold">Reliability is the visible outcome. Evidence integrity is the underlying condition.</p>

                {/* Pattern showed up early */}
                <hr className="border-border/50 my-8" />
                <h2 id="pattern-early" className="text-2xl font-bold mt-12 mb-4 text-foreground">The pattern showed up before the sample got big</h2>
                <p>I tested successive rubric versions across Beautiful.ai, Hex.tech, and ZoomInfo because I wanted different kinds of public surfaces.</p>
                <p>The pattern showed up faster than I expected.</p>
                <p>Across all three, the same failure classes kept recurring: evidence contamination from the wrong source pages, citation and export artifacts that weakened trust in the output, and wasted crawl attention on low-signal pages that crowded out the pages that mattered.</p>
                <p>The examples were different. The failure class was the same.</p>
                <p>In ZoomInfo's first version, developer API documentation was included as pricing evidence — technically from ZoomInfo's domain, clearly product-related, but describing integration patterns for developers rather than commercial terms for buyers.</p>
                <p>In Hex's earliest version, several citations in the evidence set didn't resolve to real pages. They passed surface-level inspection, but the confidence scores they supported couldn't be independently verified.</p>
                <p>In Beautiful.ai, a single missing source — the pricing page dropped from the evidence set in one version — simultaneously collapsed three dimension scores and generated a recommendation to publish a pricing page that already existed.</p>
                <p>Different companies. Different surfaces. Same upstream problem: the evidence entering the system did not deserve to be reasoned over.</p>
                <p>Beautiful.ai became the clearest lens for this post — its score progression made the deeper problem easiest to see.</p>

                {/* Beautiful.ai */}
                <hr className="border-border/50 my-8" />
                <h2 id="beautiful-ai" className="text-2xl font-bold mt-12 mb-4 text-foreground">Beautiful.ai made the hidden problem easiest to see</h2>
                <p>Across eight successive scans, Beautiful.ai became the clearest case study for one uncomfortable truth: <strong>the headline score can stay stable while the trustworthiness of the evidence changes materially</strong>.</p>
                <p>In seven of eight runs, Beautiful.ai held at 11/16 (68%).</p>
                <p>That sounds stable. It was not.</p>
                <p>Those eight runs were not identical reruns on a frozen system. Each one reflected a successive fix to the rubric, while the same evolving diagnostic was being tested across multiple companies. And under that apparently stable score, the evidence changed materially:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>early runs still carried weak or misleading commercial logic</li>
                  <li>one run dropped a key pricing source and destabilized multiple dimensions</li>
                  <li>a later run pulled in a legitimate-looking page that contradicted the actual refund policy</li>
                  <li>only the final run resolved all tracked issues at the same time</li>
                </ul>
                <p>That was the real lesson. Not that the number changed dramatically — most of the time, it did not. <strong>The real lesson was that a stable score can still hide unstable evidence.</strong></p>

                {/* Worst errors */}
                <hr className="border-border/50 my-8" />
                <h2 id="worst-errors" className="text-2xl font-bold mt-12 mb-4 text-foreground">The worst errors came from pages that looked legitimate</h2>
                <p>The most damaging failures were not obvious hallucinations.</p>
                <p>They were pages that looked structured, clean, and trustworthy, but were not the right source of truth.</p>
                <p><strong>ZoomInfo: Legal page misread as product evidence</strong></p>
                <p>ZoomInfo's biometric data privacy notice — a compliance document — was pulled into the evidence set and interpreted as a customer-facing safety rail. It was structured, official-looking, and clearly from ZoomInfo's domain. But it described regulatory obligations, not product capabilities. The rubric scored a safety rail that didn't exist from a buyer's perspective.</p>
                <p><strong>Hex: A citation with no URL</strong></p>
                <p>A "Structured Pricing Data" source appeared in Hex's Cost Driver Mapping rationale — formatted like a real citation, labeled as structured data, specific enough to seem authoritative. It had no traceable URL. The evidence looked more rigorous than it was because structured formatting signals reliability.</p>
                <p>That kind of error is worse than obvious noise. Obvious noise gets ignored. Clean but wrong evidence gets trusted. That asymmetry is what makes evidence contamination the hardest class of failure to catch. That is why evidence contamination became the most important failure class to fix.</p>

                {/* Structured extraction */}
                <hr className="border-border/50 my-8" />
                <h2 id="structured-extraction" className="text-2xl font-bold mt-12 mb-4 text-foreground">Structured extraction made the right pages more useful, and the wrong pages more dangerous</h2>
                <p>This was the most important technical lesson:</p>
                <p className="font-semibold">Structured extraction is a force multiplier. It multiplies both signal and noise.</p>
                <p>When it points at the right page, it helps. Plans, limits, refund rules, overage behavior, and packaging logic become easier to compare and reason over.</p>
                <p>When it points at the wrong page, it makes the error worse. The bad source becomes more legible, more confident, and more persuasive than it deserves to be.</p>
                <p>That changed how I think about the system.</p>
                <p>The hard problem is not just better scoring logic. It is upstream:</p>
                <p className="font-semibold">Does the evidence entering the system deserve to be reasoned over at all?</p>

                {/* Small artifacts */}
                <hr className="border-border/50 my-8" />
                <h2 id="small-artifacts" className="text-2xl font-bold mt-12 mb-4 text-foreground">Small evidence artifacts weakened trust in the whole diagnostic</h2>
                <p>A second class of failures came from citation hygiene and rendering artifacts.</p>
                <p>These were not glamorous bugs. A malformed citation fragment. A note that exported badly. A formatting issue that made the evidence trail look less reliable than it was.</p>
                <p>But that is why they mattered.</p>
                <p>If the diagnostic claims to be evidence-based, the evidence presentation layer is not cosmetic. It is part of the product.</p>
                <p>A founder or GTM leader should not have to wonder whether a strange citation artifact means the reasoning is sloppy too. Clean evidence presentation is part of what makes a diagnostic trustworthy enough to act on.</p>

                {/* Low-signal pages */}
                <hr className="border-border/50 my-8" />
                <h2 id="low-signal-pages" className="text-2xl font-bold mt-12 mb-4 text-foreground">Low-signal pages quietly crowded out the pages that mattered</h2>
                <p>The third recurring failure was quieter, but just as important.</p>
                <p>Low-signal pages were taking attention away from higher-signal surfaces like pricing, FAQ, billing, solutions, enterprise pages, and comparison pages.</p>
                <p>This was not just an efficiency problem.</p>
                <p>It changed what the rubric was able to see, and therefore what it was able to score.</p>
                <p>That was a reminder that evidence collection is not neutral. It shapes the diagnostic long before the model starts reasoning.</p>

                {/* Biggest gains */}
                <hr className="border-border/50 my-8" />
                <h2 id="biggest-gains" className="text-2xl font-bold mt-12 mb-4 text-foreground">The biggest gains came from the evidence pipeline, not the model</h2>
                <p>The most important improvements this week did not come from making the model smarter.</p>
                <p>They came from making the evidence pipeline more disciplined.</p>
                <p>The fixes fell into four buckets:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>excluding low-signal and misleading pages earlier</li>
                  <li>validating source quality before structured extraction gets trusted</li>
                  <li>cleaning evidence artifacts before they leak into the final diagnostic</li>
                  <li>manually auditing the evidence trail instead of trusting the final score alone</li>
                </ul>
                <p>That last point mattered more than I expected.</p>
                <p>Some of the worst failures would have passed if I had only looked at the final score and rationale. They became obvious only when I reviewed the evidence trail line by line.</p>
                <p>That is the kind of work that does not look dramatic from the outside, but it is where reliability gets built.</p>

                {/* Restraint */}
                <hr className="border-border/50 my-8" />
                <h2 id="restraint" className="text-2xl font-bold mt-12 mb-4 text-foreground">Restraint improved the diagnostic more than another rushed fix would have</h2>
                <p>One thing I do not want this story to become is performance theater, where every unresolved issue gets framed as progress.</p>
                <p>That is not discipline. That is thrashing.</p>
                <p>Some issues were deliberately deferred — not because they do not matter, but because fixing them without a broader baseline in place would have introduced new variance rather than reducing it.</p>
                <p>Not every bug deserves an immediate fix. Some deserve to be isolated, documented, and left untouched until lower-risk improvements establish a cleaner baseline.</p>
                <p>That restraint made the diagnostic better.</p>

                {/* Auditable evidence */}
                <hr className="border-border/50 my-8" />
                <h2 id="auditable-evidence" className="text-2xl font-bold mt-12 mb-4 text-foreground">Trust infrastructure diagnostics need auditable evidence, not just plausible output</h2>
                <p>This is the broader point behind the week's work.</p>
                <p>ValueTempo is not trying to produce another generic AI output.</p>
                <p>The ambition is narrower and more useful: to build an <strong>AI-native trust infrastructure diagnostic</strong> that helps founders and GTM leaders see whether their publicly observable signals make their product legible enough to support growth.</p>
                <p>That is a different question from:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>is our pricing page good</li>
                  <li>how do we compare to competitors</li>
                  <li>what does an answer engine say about us</li>
                </ul>
                <p>The real question is:</p>
                <p className="font-semibold">Can a buyer predict how this product behaves, what it may cost, and where the risk sits, before they commit more attention, budget, or trust?</p>
                <p>That is what trust infrastructure is about.</p>
                <p>And this week made one thing clear to me:</p>
                <p>If the evidence base is weak, the diagnostic may still sound smart. It just does not deserve to be trusted.</p>

                {/* The real bar */}
                <hr className="border-border/50 my-8" />
                <h2 id="trustworthy-evidence" className="text-2xl font-bold mt-12 mb-4 text-foreground">The bar is no longer interesting output. It is trustworthy evidence.</h2>
                <p>This week's lesson was simple: stable numbers are not enough. The real bar is evidence integrity.</p>
                <p>That is the difference between an AI output that sounds smart and a diagnostic a founder or GTM leader can use.</p>
                <p>If your pricing, limits, usage model, or enterprise trust surfaces are hard for a buyer to piece together from your public surface, that is not just a messaging problem.</p>
                <p>It is a trust infrastructure problem.</p>
                <p>That is the problem AVS Rubric is designed to make legible.</p>
                <p>If you want to see how the diagnostic evaluates trust infrastructure across the Trust Stack, start with the <Link to="/methodology" className="text-primary hover:underline font-semibold">methodology page</Link>.</p>
                <p>If you want to pressure test your own public surface, run the rubric on your own product at <Link to="/" className="text-primary hover:underline font-semibold">app.valuetempo.com</Link>.</p>
              </div>
            </motion.article>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
