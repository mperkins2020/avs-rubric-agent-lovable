import { Link } from "react-router-dom";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { motion } from "framer-motion";
import { Footer } from "@/components/Footer";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { BlogTOC, TocItem } from "@/components/BlogTOC";
import { SEOHead } from "@/components/SEOHead";

const tocSections: TocItem[] = [
  { id: "three-layers", label: "Three Layers of QA, Not Two" },
  { id: "in-practice", label: "What This Looks Like in Practice" },
  { id: "disciplines", label: "What Makes Output Defensible" },
  { id: "report", label: "What a Report Includes" },
  { id: "isnt", label: "What the Rubric Isn't" },
  { id: "see", label: "See What Your Surface Looks Like" },
];

export default function BlogVerificationLoop() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Why a Trust Diagnostic Needs More Than Evals"
        description="Three layers of AI-native QA: how the AVS Rubric engineers for evidence integrity — and the verification layer most AI tools skip."
        canonicalUrl="https://valuetempo.lovable.app/resources/blog/verification-loop"
        publishedDate="2026-04-19"
        tags={["evidence integrity", "AI QA", "evals", "trust infrastructure", "AVS Rubric"]}
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
                  <time>April 2026</time>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3">Why a Trust Diagnostic Needs More Than Evals</h1>
                <p className="text-lg md:text-xl text-muted-foreground">Three layers of AI-native QA: how the AVS Rubric engineers for evidence integrity.</p>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-8">
                <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">TL;DR</p>
                <p className="text-foreground/90 leading-relaxed">Most AI-native tools run evals on the model and traditional QA on the system. For diagnostics that read the external world, a third layer — input verification — has to sit upstream of both. Without it, the model produces confident, well-structured analysis of whatever evidence it was given. The AVS Rubric is built around six pipeline disciplines that make sure the evidence reaching the model deserves to be reasoned over.</p>
              </div>

              <div className="space-y-6 text-foreground/90 leading-relaxed">
                <p>If you're building an AI-native product, your public surface is already being evaluated by AI. Before a buyer books a demo, they're scanning your pricing page, your docs, your trust surfaces that are increasingly discovered through ChatGPT, Claude, Gemini, and Perplexity. By the time they reach your site, a machine has often already shaped their impression of you.</p>

                <p>When those signals are incomplete or contradictory, buyers don't always churn in obvious ways. They hesitate. They might still try your product, but would churn after a 7-day trial. They quietly route the budget to a competitor whose trust posture is easier to verify. You see the gap late in the retention curve, in a lost deal, in pricing confusion a CFO flags on a call.</p>

                <p>Which means the question isn't whether to use AI diagnostics on your own trust infrastructure. The question is whether the diagnostic's output deserves the trust it asks for.</p>

                <p>Most don't. An AI system will confidently analyze whatever evidence it's given. If the evidence reaching the model is incomplete, contaminated, or wrong, the output will still look structured, still sound authoritative, and still be wrong. That failure mode is silent. It doesn't raise an exception.</p>

                <p>The AVS Rubric is an evidence-based trust infrastructure diagnostic, which means its output is only as good as the evidence the pipeline delivers to the model. This post is about the engineering discipline that sits behind that output and the single QA layer most AI-native tools skip.</p>

                <hr className="border-border/50 my-8" />
                <h2 id="three-layers" className="text-2xl font-bold mt-12 mb-4 text-foreground">Three layers of QA, not two</h2>
                <p>Most software quality comes in two layers: evals (does the model reason correctly?) and traditional QA (does the feature work?). For AI systems that read external data, a third layer has to sit upstream of both.</p>

                <div className="overflow-x-auto my-6">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-semibold"></th>
                        <th className="text-left py-2 px-3 font-semibold">What it tests</th>
                        <th className="text-left py-2 px-3 font-semibold">When it runs</th>
                        <th className="text-left py-2 px-3 font-semibold">What it assumes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="py-2 px-3 font-semibold">Input Verification</td>
                        <td className="py-2 px-3">Are the inputs actually correct?</td>
                        <td className="py-2 px-3">Before the model call</td>
                        <td className="py-2 px-3">Nothing. This is the check.</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 px-3 font-semibold">Evals</td>
                        <td className="py-2 px-3">Does the model reason correctly?</td>
                        <td className="py-2 px-3">Against model outputs</td>
                        <td className="py-2 px-3">Inputs are correct</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold">Traditional QA</td>
                        <td className="py-2 px-3">Does the feature work?</td>
                        <td className="py-2 px-3">Against your system</td>
                        <td className="py-2 px-3">Model and inputs are correct</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p>Evals assume the inputs are correct. QA assumes the model and inputs are both correct. For AI systems that read the external world (web scraping, RAG, agent tool calls) the inputs are dynamic and constantly changing. The assumption breaks. And when it breaks, the model doesn't error out. It produces confident, well-structured analysis of whatever it was given.</p>

                <p>Most AI-native tools run evals on their model. Fewer run a dedicated verification layer on their inputs. The ones that don't can still produce trustworthy-sounding output until the evidence shifts underneath them.</p>

                <hr className="border-border/50 my-8" />
                <h2 id="in-practice" className="text-2xl font-bold mt-12 mb-4 text-foreground">What this looks like in practice</h2>
                <p>In a recent stress test, the AVS Rubric scored an AI-native company on its credit-based pricing model. The early runs surfaced all the wrong evidence.</p>

                <p>The scraper walks a company's sitemap and ranks pages by URL pattern: <code className="px-1 py-0.5 rounded bg-muted text-sm">/pricing</code> high, <code className="px-1 py-0.5 rounded bg-muted text-sm">/faq</code> and <code className="px-1 py-0.5 rounded bg-muted text-sm">/help</code> next, generic paths lower. It has precise logic until the sitemap itself is noisy. In this case, the sitemap included developer API documentation, terms of service, Zendesk category navigation pages (titles, no content), and user-generated documents in Korean and Indonesian the scraper couldn't distinguish from the company's own product pages.</p>

                <p>The pricing page itself was reachable. However, the detailed explanation of how credits actually work was not captured and fed to the model. That article existed, but only inside the signed-in product experience, behind a FAQ link in an in-product modal. The scraper had no path to it from the marketing site, help center, or sitemap.</p>

                <p>Missing that article, the rubric scored the company's Safety Rails dimension 0 out of 2 total points. Its top recommendation was to publish a detailed explanation of how credits work. The company already had.</p>

                <p>After the pipeline was fixed and a path to that article was in, the score moved from 8/16 (50%) to 12/16 (75%). Same company. Same public information. Four points of score movement driven entirely by what the model was allowed to see.</p>

                <p>That is exactly the failure mode a trust diagnostic cannot afford to produce silently.</p>

                <hr className="border-border/50 my-8" />
                <h2 id="disciplines" className="text-2xl font-bold mt-12 mb-4 text-foreground">What the rubric does to make its output defensible</h2>
                <p>Six pipeline disciplines work together to keep the evidence that reaches the model worth reasoning over.</p>

                <p><strong>URL-pattern exclusion rules.</strong> Certain page types are noise for a trust infrastructure scan: template pages, legal boilerplate, sitemap XML, developer subdomains, category navigation. These are blocked before entering the evidence pool. Every exclusion lives in a documented file with a "do not revert" rationale so we don't accidentally undo the product logic.</p>

                <p><strong>Intent-weighted page priority.</strong> Pricing pages rank highest, with FAQ and billing close behind. Comparison and solution pages get reserved slots. When crawl capacity forces tradeoffs, the pages that carry commercial signals are selected first.</p>

                <p><strong>Manual overrides for undiscoverable content.</strong> Some of the most important pages including in-product credit explanations, trust center pages, compliance documentation, are linked from JavaScript tooltips or in-product modals that standard crawlers cannot follow. A <code className="px-1 py-0.5 rounded bg-muted text-sm">community_evidence</code> table includes them explicitly on every run.</p>

                <p><strong>Every wrong output logged.</strong> A running log captures every scan that produces a surprising result: the company, the affected dimension, the root cause, the fix, whether resolved. Over time, the log becomes a prioritization tool. Pipeline misses get fixed first because they outnumber model errors by a significant margin.</p>

                <p><strong>Versioned cache.</strong> Every pipeline change bumps an analysis version, so scans never return stale results from before a fix.</p>

                <p><strong>Three-pass median voting.</strong> Every scan runs three independent LLM passes at temperature 0.1. The median score per dimension is reported. Disagreement between passes becomes a diagnostic about evidence quality. When passes land on different scores, the variance is usually tracing back to thin or contradictory evidence in the input layer, not model randomness.</p>

                <p>None of these is visible in the final report. All of them are why the final report is defensible.</p>

                <hr className="border-border/50 my-8" />
                <h2 id="report" className="text-2xl font-bold mt-12 mb-4 text-foreground">What a report includes</h2>
                <p>Every scan and analysis returns an evidence-backed diagnostic, not a verdict. Specifically:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>A <strong>Trust Stack score</strong> across eight dimensions on a 0–16 scale, with a maturity band from Nascent to Advanced.</li>
                  <li><strong>Dimension-level breakdowns</strong> showing pass/fail on each underlying subtest so you can see exactly which elements of your trust posture are landing and which aren't.</li>
                  <li>An <strong>evidence ledger</strong>. Every score cites the specific URL it was drawn from, with the extracted evidence visible. If you disagree with a score, you can trace the reasoning back to the source.</li>
                  <li><strong>Prioritized recommendations</strong> organized by Trust Stack layer, so a product or GTM lead can sequence fixes from foundational (Product-ICP clarity, Pricing Architecture) up through enterprise readiness.</li>
                </ul>
                <p>The evidence ledger is the part that tends to surprise people. Most AI tools produce rationale. The rubric produces a record you can audit.</p>

                <hr className="border-border/50 my-8" />
                <h2 id="isnt" className="text-2xl font-bold mt-12 mb-4 text-foreground">What the rubric isn't</h2>
                <p>A common question: why not just use an answer engine?</p>
                <p>A sophisticated user can replicate roughly 70% of a single rubric run with ChatGPT or Perplexity and good prompting. What changes with repeated use is what answer engines can't reproduce: the same score on the same evidence tomorrow, or a comparable score across companies against identical subtests, or a dataset large enough to tell you where you sit in your category.</p>

                <p>A related question: is this an AEO audit?</p>

                <p>No. AEO tools evaluate individual pages for discoverability by answer engines, answering questions like: can ChatGPT find and cite this page? The AVS Rubric evaluates the <strong>public-facing trust layer as a system</strong>, assessing whether pricing logic, cost drivers, safety rails, enterprise controls, and support content cohere into a trust posture a buyer can predict, verify, and defend across eight dimensions. A company can pass an AEO audit (every page findable) and still fail the rubric (the pieces don't add up to a coherent story a buyer can act on). They answer different questions, and a company serious about growth should probably run both.</p>

                <hr className="border-border/50 my-8" />
                <h2 id="see" className="text-2xl font-bold mt-12 mb-4 text-foreground">See what your surface looks like</h2>
                <p>The AVS Rubric is live at <Link to="/" className="text-primary hover:underline font-semibold">app.valuetempo.com</Link>. A single scan runs the full trust infrastructure analysis across eight dimensions and returns an evidence-backed score, gap breakdown, and prioritized recommendations. It is grounded in the engineering described above.</p>
              </div>
            </motion.article>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
