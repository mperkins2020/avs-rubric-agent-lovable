import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Footer } from "@/components/Footer";
import { Sparkles, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { BlogTOC, TocItem } from "@/components/BlogTOC";

const tocSections: TocItem[] = [
  { id: "rubric-failed", label: "The Rubric Failed Its First Test" },
  { id: "trust-infrastructure", label: "The Trust Infrastructure" },
  { id: "five-lessons", label: "Five Things I Learned" },
  { id: "lesson-prompt", label: "1. Prompt as Business Logic" },
  { id: "lesson-data", label: "2. Data Quality > Model" },
  { id: "lesson-uncertainty", label: "3. Surface Uncertainty" },
  { id: "lesson-production", label: "4. Prototype vs Production" },
  { id: "lesson-reliability", label: "5. Reliability Matters" },
  { id: "production-grade", label: "Making It Production-Grade" },
  { id: "bigger-idea", label: "The Bigger Idea" },
  { id: "try-rubric", label: "Try the Rubric" },
];

export default function BlogVibecoding() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src="/lovable-uploads/87678626-e604-46ee-90b6-9ab9b6380322.png" />
            </Link>
            <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
              <Sparkles className="w-4 h-4" />
              AVS Rubric
            </Button>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Methodology</Link>
            <ResourcesDropdown />
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <Link to="/resources/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>

          <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="prose prose-invert max-w-none">
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Calendar className="w-4 h-4" />
                <time>March 2026</time>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3">What I Learned Vibecoding an AI Startup Tool using Lovable + Claude Code</h1>
              <p className="text-lg md:text-xl text-muted-foreground">A build-in-public note on what broke, what worked, and what vibecoding an AI product taught me about reliability, production readiness, and trust infrastructure.</p>
            </div>

            <BlogTOC sections={tocSections} />

            <div className="space-y-6 text-foreground/90 leading-relaxed">
              <p>I vibecoded an AI tool to score the trust infrastructure of AI startups.</p>
              <p>It looked great.</p>
              <p>Then I ran the same company through it twice and got two different scores.</p>
              <p>That's when I realized the hard part of building AI products today isn't shipping them. It's making the results reliable enough to trust.</p>
              <p>Over the past few weeks I ran the rubric across 50+ AI-native SaaS companies, which learned several unexpected failure modes.</p>

              {/* The Rubric Failed Its First Test */}
              <h2 id="rubric-failed" className="text-2xl font-bold mt-12 mb-4 text-foreground">The Rubric Failed Its First Test</h2>
              <p>The AVS Rubric exists to answer one question:</p>
              <p className="text-lg font-semibold text-primary">Does your AI product expose enough trust infrastructure for growth to compound?</p>
              <p>Before it could answer that for anyone else, it had to answer it honestly about itself.</p>
              <p>Early on, it couldn't.</p>
              <p>Three failures showed up immediately:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>the rubric wasn't scanning wide enough for evidence</li>
                <li>identical URLs produced different scores</li>
                <li>results differed across devices and sessions</li>
              </ul>
              <p>The system looked deterministic on the surface. Underneath, it wasn't.</p>
              <p>The root cause turned out to be architectural. Evidence collection and scoring were too tightly coupled. Any variance in what the scraper captured flowed directly into the score.</p>
              <p>Separating those layers stabilized the results.</p>
              <p className="font-semibold">Lesson one: AI evaluation systems are harder to make reliable than they appear.</p>

              {/* Trust Infrastructure */}
              <h2 id="trust-infrastructure" className="text-2xl font-bold mt-12 mb-4 text-foreground">The Trust Infrastructure the Rubric Measures</h2>
              <p>For context, the rubric evaluates eight dimensions organized into four layers.</p>
              <p className="font-semibold text-primary">The idea is simple: gaps at the foundation cascade upward.</p>

              {/* Trust Infrastructure Stack Infographic */}
              <div className="my-10 max-w-2xl mx-auto">
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">AI Trust Infrastructure Stack</p>
                <div className="flex flex-col gap-0">
                  {/* Layer 4 - Top */}
                  <div className="relative bg-gradient-to-r from-amber-500/15 to-amber-600/10 border border-amber-500/30 rounded-t-2xl px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Layer 4</span>
                    </div>
                    <p className="font-bold text-foreground text-base">Enterprise Readiness</p>
                    <p className="text-sm text-muted-foreground">Buyer &amp; Budget Alignment</p>
                  </div>
                  {/* Layer 3 */}
                  <div className="relative bg-gradient-to-r from-violet-500/15 to-violet-600/10 border-x border-violet-500/30 px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500/80">Layer 3</span>
                    </div>
                    <p className="font-bold text-foreground text-base">Operational Controls</p>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
                      <span className="text-sm text-muted-foreground">Safety Rails</span>
                      <span className="text-sm text-muted-foreground">Overages &amp; Risk</span>
                      <span className="text-sm text-muted-foreground">Pools &amp; Packaging</span>
                    </div>
                  </div>
                  {/* Layer 2 */}
                  <div className="relative bg-gradient-to-r from-sky-500/15 to-sky-600/10 border-x border-sky-500/30 px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-sky-500/80">Layer 2</span>
                    </div>
                    <p className="font-bold text-foreground text-base">Pricing Architecture</p>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
                      <span className="text-sm text-muted-foreground">Value Unit</span>
                      <span className="text-sm text-muted-foreground">Cost Driver Mapping</span>
                    </div>
                  </div>
                  {/* Layer 1 - Foundation */}
                  <div className="relative bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 border border-emerald-500/30 rounded-b-2xl px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">Layer 1 — Foundation</span>
                    </div>
                    <p className="font-bold text-foreground text-base">Product Clarity</p>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
                      <span className="text-sm text-muted-foreground">Product North Star</span>
                      <span className="text-sm text-muted-foreground">ICP &amp; Job Clarity</span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground/60 mt-3 italic">Gaps at the foundation cascade upward</p>
              </div>

              <h3 className="text-xl font-bold mt-8 mb-2 text-foreground">Layer 1: Product Clarity</h3>
              <p>Who is this product for, and what outcome are they paying for?</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Product North Star</li>
                <li>Ideal Customers & Job Clarity</li>
              </ul>

              <h3 className="text-xl font-bold mt-8 mb-2 text-foreground">Layer 2: Pricing Architecture</h3>
              <p>Can customers understand what they pay for and why?</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Value Unit</li>
                <li>Cost Driver Mapping</li>
              </ul>

              <h3 className="text-xl font-bold mt-8 mb-2 text-foreground">Layer 3: Operational Controls</h3>
              <p>Does the product protect users from runaway usage and mistakes?</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Pools & Packaging</li>
                <li>Overages & Risk Allocation</li>
                <li>Safety Rails & Trust Surfaces</li>
              </ul>

              <h3 className="text-xl font-bold mt-8 mb-2 text-foreground">Layer 4: Enterprise Readiness</h3>
              <p>Can finance, IT, and legal easily find what they need through official channels to close the deal?</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Buyer & Budget Alignment</li>
              </ul>

              <p>If customers cannot identify your value unit, cost drivers, controls for monthly spending and token allocation, no amount of security documentation will close enterprise deals.</p>

              {/* Five Things I Learned */}
              <h2 id="five-lessons" className="text-2xl font-bold mt-12 mb-4 text-foreground">Five Things I Learned Vibecoding an AI Product</h2>
              <p>I built the first version using <strong>Lovable</strong>. The speed-to-done was impressive. After I uploaded a product requirements document, a working product with a nicely designed UI appeared in less than an hour.</p>
              <p>But sooner or later we all realize that shipping a prototype and building something reliable are two very different problems.</p>
              <p>Here are the lessons that mattered most to me.</p>

              {/* Lesson 1 */}
              <h3 id="lesson-prompt" className="text-xl font-bold mt-8 mb-2 text-foreground">1. Your Prompt Becomes Your Business Logic</h3>
              <p>The scoring rubric lives inside the edge function prompt.</p>
              <p>Every nuance about how trust infrastructure is evaluated exists as natural-language instructions to the model.</p>
              <p>That includes rules like:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>when missing rollover policy is a real weakness</li>
                <li>when it's a false negative for flat-rate pricing</li>
                <li>when safety rails may exist behind login walls</li>
              </ul>
              <p>In AI systems, prompts are not just instructions.</p>
              <p className="font-semibold">They effectively become application logic written in natural language.</p>

              {/* Lesson 2 */}
              <h3 id="lesson-data" className="text-xl font-bold mt-8 mb-2 text-foreground">2. Data Collection Quality Matters More Than the Model</h3>
              <p>Early versions simply scraped the first N links from a website.</p>
              <p>That meant help center articles crowded out the pages that actually mattered.</p>
              <p>The fix was a link prioritization layer that weighted paths like:</p>
              <div className="bg-muted/30 border border-border/40 rounded-lg p-4 font-mono text-sm">
                /pricing<br />
                /plans<br />
                /security<br />
                /enterprise
              </div>
              <p>Once the scraper started feeding the model better evidence, accuracy improved more than any prompt tweak.</p>
              <p className="font-semibold">Garbage in still equals garbage out.</p>

              {/* Lesson 3 */}
              <h3 id="lesson-uncertainty" className="text-xl font-bold mt-8 mb-2 text-foreground">3. AI Assessments Must Surface Uncertainty</h3>
              <p>One of the most common questions about the rubric is: "Isn't this subjective?"</p>
              <p>The real issue is that a score without confidence is misleading.</p>
              <p>Early versions produced a simple 0–2 score per dimension. That looked clean, but it hid a critical problem: the system sometimes had very little evidence to justify that score.</p>
              <p>So instead of pretending the system knew more than it did, I redesigned the output to surface uncertainty explicitly.</p>
              <p>Each dimension now includes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>a score</li>
                <li>a confidence band (<code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">Strong / Partial / Sparse</code>)</li>
                <li>an uncertainty explanation</li>
              </ul>
              <p>For example, the system might say: "Budget caps not found."</p>
              <p>That could mean the feature does not exist. Or it could mean the feature exists but lives behind a login wall the scraper cannot access.</p>
              <p>To avoid hallucinating certainty, the rubric now includes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>"not observable" flags</li>
                <li>missing insider prompts</li>
              </ul>
              <p>This allows the system to say: "I cannot verify this from public evidence yet."</p>
              <p>That small design decision dramatically increased the credibility of the output.</p>
              <p className="font-semibold">Ironically, the system became more trustworthy once it started admitting what it didn't know.</p>

              {/* Lesson 4 */}
              <h3 id="lesson-production" className="text-xl font-bold mt-8 mb-2 text-foreground">4. Vibecoding Makes Prototypes Fast. Production Requires Discipline.</h3>
              <p>Lovable made it possible to ship a working pipeline incredibly quickly.</p>
              <p>Scraping → analysis → UI rendering → PDF export all appeared within a few sessions.</p>
              <p>But moving from prototype to production exposed a completely different set of problems.</p>
              <p>Interestingly, I found myself trusting <strong>Claude Code</strong> more to assess whether the system was production-grade.</p>
              <p>Part of that is psychological. It simply felt more trustworthy to use a separate third-party system to judge the code quality rather than relying on the same tool that generated it.</p>
              <p>Another reason was transparency. Claude Code gave much clearer visibility into:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>structural weaknesses</li>
                <li>security issues</li>
                <li>type safety gaps</li>
                <li>missing tests</li>
              </ul>
              <p>That external assessment made it easier to decide what to fix first, second, and third.</p>
              <p className="font-semibold">Vibecoding makes it easy to build quickly. Production readiness requires a different mindset.</p>

              {/* Lesson 5 */}
              <h3 id="lesson-reliability" className="text-xl font-bold mt-8 mb-2 text-foreground">5. Reliability Matters: AI Is Probabilistic</h3>
              <p>Another subtle issue appeared early. Running the same company through the rubric twice could produce slightly different scores.</p>
              <p>That is not surprising once you remember that LLMs are probabilistic systems.</p>
              <p>The solution was to stop treating model output as ground truth and instead treat it as a noisy signal that needs stabilization.</p>
              <p>The scoring engine now uses:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>three-pass voting</li>
                <li>median aggregation</li>
                <li>low-temperature inference</li>
              </ul>
              <p>Each assessment runs multiple model passes and aggregates the result.</p>
              <p>We stress-tested the setup with temperature variance tests across all eight dimensions. Variance dropped to <strong>0 percent during calibration runs</strong>.</p>
              <p>We also added a deterministic safety net. If the evidence clearly shows high-signal trust cues but the model still outputs a zero, the system floors the dimension score to <strong>1</strong> and raises the confidence level.</p>
              <p>This prevents obvious false negatives where the model detects evidence but scores too conservatively.</p>
              <p className="font-semibold">LLM output must be surrounded by deterministic guardrails to behave like production-grade software.</p>

              {/* Production-Grade */}
              <h2 id="production-grade" className="text-2xl font-bold mt-12 mb-4 text-foreground">What It Took to Make the Rubric Production-Grade</h2>
              <p>Shipping fast with Lovable created technical debt that needed to be addressed.</p>
              <p>But interestingly, the hardest production problems were <strong>not model problems</strong>. They were infrastructure problems.</p>
              <p>Five things mattered most.</p>

              <h3 className="text-xl font-bold mt-8 mb-2 text-foreground">1. Security and Bounded Inputs</h3>
              <p>The backend endpoints were hardened with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>authenticated access</li>
                <li>strict input validation</li>
                <li>SSRF protections</li>
                <li>generic error masking</li>
              </ul>
              <p>Without those protections, simple scraping requests could expose internal infrastructure or create unpredictable failures.</p>

              <h3 className="text-xl font-bold mt-8 mb-2 text-foreground">2. Resilient Execution</h3>
              <p>Some rubric runs involve dozens of page scans and LLM calls. Early versions frequently hit serverless timeouts.</p>
              <p>The fix was moving long-running workflows into background execution using async jobs. This allowed the system to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>avoid request timeouts</li>
                <li>track job states (pending / completed / failed)</li>
                <li>complete large scans reliably</li>
              </ul>

              <h3 className="text-xl font-bold mt-8 mb-2 text-foreground">3. Versioned Caching</h3>
              <p>Another subtle problem was <strong>result drift across releases</strong>.</p>
              <p>To stabilize outputs we added versioned caching with a <strong>7-day TTL</strong>. This improved three things simultaneously:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>cost control</li>
                <li>latency</li>
                <li>consistency across runs</li>
              </ul>

              <h3 className="text-xl font-bold mt-8 mb-2 text-foreground">4. The Facts Ledger Pattern</h3>
              <p>One design pattern that emerged was what I now think of as a facts ledger.</p>
              <p>Every dimension score is backed by structured evidence. That includes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>binary subtests</li>
                <li>observed signals</li>
                <li>source evidence (URL + snippet pairs)</li>
              </ul>
              <p>This prevents the model from generating convincing explanations without supporting data. The score must always tie back to observable facts.</p>

              <h3 className="text-xl font-bold mt-8 mb-2 text-foreground">5. What Actually Failed</h3>
              <p>One of the most annoying failures was not even model-related. It was schema drift.</p>
              <p>Some results stored the dimension label as <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">name</code>, others as <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">dimension</code>.</p>
              <p>That small inconsistency broke downstream queries.</p>
              <p>The fix was simple but humbling. The query layer now uses <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">COALESCE</code> to normalize the schema.</p>
              <p className="font-semibold">A reminder that sometimes the biggest production issues come from the least interesting parts of the stack.</p>

              {/* Bigger Idea */}
              <h2 id="bigger-idea" className="text-2xl font-bold mt-12 mb-4 text-foreground">The Bigger Idea Behind the Rubric</h2>
              <p>The rubric is based on the <strong>Adaptive Value System (AVS)</strong>.</p>
              <p>AVS is a framework for aligning four forces inside AI-native products:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>value</li>
                <li>usage</li>
                <li>cost</li>
                <li>trust</li>
              </ul>
              <p>Most companies measure the first three. Trust is often not designed intentionally.</p>
              <p>The rubric evaluates whether enough of that infrastructure is <strong>visible to buyers before they commit</strong>.</p>

              {/* What It Measures */}
              <h2 className="text-2xl font-bold mt-12 mb-4 text-foreground">What the Rubric Currently Measures</h2>
              <p>This version focuses on <strong>economic trust infrastructure</strong>:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>pricing legibility</li>
                <li>cost predictability</li>
                <li>spend controls</li>
                <li>operational safeguards</li>
              </ul>
              <p>These are the first trust problems most AI products encounter.</p>
              <p>The next evolution of the rubric will examine <strong>action accountability</strong> — what happens when AI systems begin executing tasks autonomously and something goes wrong.</p>
              <p>But diagnosing that through public evidence is significantly harder. That capability is still being developed.</p>

              {/* CTA */}
              <h2 id="try-rubric" className="text-2xl font-bold mt-12 mb-4 text-foreground">Try the Rubric</h2>
              <p>The AVS Rubric is free and live at <Link to="/" className="text-primary hover:underline font-semibold">valuetempo.com</Link>.</p>
              <p>It evaluates only what buyers can see publicly.</p>
              <p>Running your own product through it can be surprisingly revealing.</p>
              <p>And if you're building an AI product yourself, I'd be curious what it finds.</p>
            </div>
          </motion.article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
