import { Link } from "react-router-dom";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { motion } from "framer-motion";
import { Footer } from "@/components/Footer";
import { Sparkles, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { BlogTOC, TocItem } from "@/components/BlogTOC";
import { SEOHead } from "@/components/SEOHead";
import { AVSSystemDiagram } from "@/components/AVSSystemDiagram";

const tocSections: TocItem[] = [
{ id: "what-avs-measures", label: "What the AVS Trust Rubric Measures" },
{ id: "three-stages", label: "The Three Stages of AI Pricing" },
{ id: "what-changed", label: "What Changed in Clay's Pricing" },
{ id: "run-one", label: "Run One: February Pricing — 81%" },
{ id: "run-two", label: "Run Two: March Pricing — 75%" },
{ id: "run-three", label: "Run Three: Right Material Surfaced — 94%" },
{ id: "score-arc", label: "What the Score Arc Tells Founders" },
{ id: "recommended-focus", label: "Recommended Focus" },
{ id: "first-two-fixes", label: "First Two Fixes" },
{ id: "what-this-signals", label: "What This Signals for AI SaaS" }];


export default function BlogClayPricing() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Why AI Pricing Requires Three Layers — A Clay Case Study"
        description="Clay announced a major pricing overhaul. The architecture improved. But the AVS Trust Rubric score dropped from 81% to 75%. That drop is a buyer signal."
        canonicalUrl="https://valuetempo.lovable.app/resources/blog/clay-pricing-three-layers"
        publishedDate="2026-03-13"
        tags={["AI pricing", "Clay", "AVS", "trust surfaces", "case study", "pricing architecture"]} />
      
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src={ValueTempoLogo} />
            </Link>
            <Link to="/#url-input">
              <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
                <Sparkles className="w-4 h-4" />
                AVS Rubric
              </Button>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Methodology</Link>
            <ResourcesDropdown />
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
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3">Why AI Pricing Requires Three Layers: Architecture, Observability, and Trust</h1>
                <p className="text-lg md:text-xl text-muted-foreground">A Clay Case Study</p>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-8">
                <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">TL;DR</p>
                <p className="text-foreground/90 leading-relaxed">Clay announced a major pricing overhaul. The architecture improved. But when the AVS Trust Rubric evaluated the new pricing page, the score dropped from 81% to 75%. That drop is not a failure signal — it is a buyer signal, because the score reflects the first place buyers look: the pricing page. When the right documentation was surfaced, the score jumped to 94%. The gap between 75% and 94% is the distance between documentation and discovery.</p>
              </div>

              <div className="space-y-6 text-foreground/90 leading-relaxed">
                <p>Clay announced a major pricing overhaul.</p>
                <p>The architecture improved.</p>
                <p>But when the AVS Trust Rubric evaluated the new pricing page, the score dropped from 81% to 75%.</p>
                <p>That drop is not a failure signal. It is a buyer signal, because the score reflects the first place buyers look: the pricing page.</p>

                <hr className="border-border/50 my-8" />

                <h2 id="what-avs-measures" className="text-2xl font-bold text-foreground mt-10">What the AVS Trust Rubric Measures</h2>

                <p>The Adaptive Value System (AVS) Rubric evaluates whether an AI SaaS product communicates predictable value, usage, and cost signals to buyers using only publicly observable signals.</p>
                <p>It scores eight dimensions across a four-layer trust stack:</p>

                <div className="overflow-x-auto my-6">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 text-foreground font-semibold w-28">Layer</th>
                        <th className="text-left py-3 px-4 text-foreground font-semibold">Category</th>
                        <th className="text-left py-3 px-4 text-foreground font-semibold">Dimensions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/30">
                        <td className="py-3 px-4 text-muted-foreground">Layer 1</td>
                        <td className="py-3 px-4">Foundation</td>
                        <td className="py-3 px-4 text-muted-foreground">Product and Audience Clarity</td>
                      </tr>
                      <tr className="border-b border-border/30">
                        <td className="py-3 px-4 text-muted-foreground">Layer 2</td>
                        <td className="py-3 px-4">Value-Cost Alignment</td>
                        <td className="py-3 px-4 text-muted-foreground">Value Unit, Cost Driver Mapping</td>
                      </tr>
                      <tr className="border-b border-border/30">
                        <td className="py-3 px-4 text-muted-foreground">Layer 3</td>
                        <td className="py-3 px-4">Risk Management</td>
                        <td className="py-3 px-4 text-muted-foreground">Pools and Packaging, Overages and Risk Allocation, Safety Rails and Trust Surfaces</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-muted-foreground">Layer 4</td>
                        <td className="py-3 px-4">Buyer Alignment</td>
                        <td className="py-3 px-4 text-muted-foreground">Buyer and Budget Alignment</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p>Each dimension scores 0–2, with a confidence label reflecting how much public evidence the rubric can find.</p>
                <p>The score is not the destination. It reveals which signals buyers can easily reach and which signals require effort to find or even understand.</p>
                <p className="font-semibold text-foreground">The score does not measure product quality. It measures how easily buyers can infer value, usage, and cost before committing.</p>
                <p>The AVS rubric evaluates trust infrastructure across four internal layers. But when buyers experience pricing during evaluation, those signals typically appear through three observable stages.</p>

                <hr className="border-border/50 my-8" />

                <h2 id="three-stages" className="text-2xl font-bold text-foreground">The Three Stages of The AI Pricing System</h2>

                <p>Clay's pricing change also highlights a broader structural shift happening across AI software.</p>
                <p>The AI pricing system now operates across three stages:</p>

                <div className="space-y-4 my-6">
                  <div className="bg-muted/20 border border-border/40 rounded-lg p-5">
                    <p className="font-semibold text-foreground mb-2">1. Trust Surface Distribution: Limited Visibility</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                      <li>Pricing page</li>
                      <li>Cost examples</li>
                      <li>Spend controls</li>
                    </ul>
                  </div>
                  <div className="bg-muted/20 border border-border/40 rounded-lg p-5">
                    <p className="font-semibold text-foreground mb-2">2. Pricing Observability: Partially Visible</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                      <li>Cost drivers</li>
                      <li>Usage visibility</li>
                      <li>Guardrails (alerts, caps)</li>
                    </ul>
                  </div>
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-5">
                    <p className="font-semibold text-foreground mb-2">3. Economic Architecture: Improved</p>
                    <ul className="list-disc pl-5 space-y-1 text-foreground/80 text-sm">
                      <li>Data Credits</li>
                      <li>Actions</li>
                      <li>Value unit design</li>
                    </ul>
                  </div>
                </div>

                <p>Most AI startups solve the economic architecture stage first.</p>
                <p>A smaller number build strong pricing observability.</p>
                <p className="font-semibold text-foreground">Very few solve the final stage well: trust surface distribution, where pricing signals appear during evaluation.</p>

                <hr className="border-border/50 my-8" />

                <h2 id="what-changed" className="text-2xl font-bold text-foreground">What Changed in Clay's Pricing</h2>

                <p>Clay's pricing overhaul improved architecture and observability. But the third stage still shapes how buyers experience the new pricing model.</p>
                <p>Clay's previous model priced everything through credits — data enrichment lookups, AI research steps, automation logic, outbound execution. One unit for every job the platform performed.</p>
                <p>That worked when Clay was primarily a data enrichment tool.</p>
                <p>It stopped working when Clay evolved into a full GTM automation system.</p>
                <p>The credit model was capturing value from the data infrastructure, less from the automated GTM workflows where Clay now creates most of its value.</p>

                <div className="bg-muted/30 border border-border/50 rounded-xl p-6 my-8">
                  <p className="font-semibold text-foreground mb-3">The new architecture separates two things that were always economically distinct:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Data Credits</strong> cover the cost of external data providers. Clay reduced marketplace data costs 50–90% and passes AI model usage through at 0% markup.</li>
                    <li><strong>Actions</strong> measure the automation workflows Clay executes — research steps, logic, orchestration, and outbound motion. This becomes the monetized value layer.</li>
                  </ul>
                </div>

                <p>The economic logic is sound. Data infrastructure becomes a pass-through. Automation becomes the durable revenue engine.</p>
                <p>Clay acknowledged an expected 10% short-term revenue drop during the transition — a deliberate trade for a pricing architecture that scales with product usage over time.</p>

                <hr className="border-border/50 my-8" />

                <h2 id="run-one" className="text-2xl font-bold text-foreground">Run One of the AVS Rubric: February Pricing — 81%</h2>

                <p>Before the pricing change, Clay scored 81%.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                  <div className="bg-muted/20 border border-border/40 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">2/2</p>
                    <p className="text-sm text-muted-foreground">Value Unit — 80% confidence</p>
                  </div>
                  <div className="bg-muted/20 border border-border/40 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">2/2</p>
                    <p className="text-sm text-muted-foreground">Pools & Packaging — 70% confidence</p>
                  </div>
                </div>

                <p>The foundation was strong: clear target audiences, legible pricing tiers, and defined usage boundaries.</p>
                <p>The gaps were specific and solvable. Cost driver transparency and safety rail documentation were the main weaknesses holding the score at only 60%.</p>

                <hr className="border-border/50 my-8" />

                <h2 id="run-two" className="text-2xl font-bold text-foreground">Run Two of the AVS Rubric: March Pricing — 75%</h2>

                <p>After the pricing announcement, the rubric scored Clay 75%.</p>
                <p>The architecture improved. Yet the score dropped six points.</p>
                <p className="text-lg font-semibold text-foreground">That gap is worth reading closely.</p>
                <p>It is not a failure signal. It is a <strong>discoverability signal</strong>.</p>

                <p>When Actions became the value unit, the observability bar rose with it.</p>
                <p>Under the old credit model, buyers could map credits directly to data lookups. The unit was concrete.</p>
                <p>Under the new model, buyers need to understand how GTM workflows translate into Actions consumption before they can forecast spend confidently.</p>
                <p>At the surface level of the new pricing page, that mapping was not visible.</p>

                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">Current Page Analysis</h3>

                <p>The Value Unit and Pools and Packaging dimensions held at 2/2, with confidence rising to 90% due to the cleaner architecture.</p>
                <p>But two dimensions weakened:</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">1/2</p>
                    <p className="text-sm text-muted-foreground">Cost Driver Mapping — 60% confidence</p>
                  </div>
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">1/2</p>
                    <p className="text-sm text-muted-foreground">Safety Rails & Trust Surfaces — 50% confidence</p>
                  </div>
                </div>

                <p>The 75% score reveals something precise. Clay's pricing structure is coherent. But the evidence buyers need to forecast workflow costs requires more than a standard pricing page review to find.</p>

                <hr className="border-border/50 my-8" />

                <h2 id="run-three" className="text-2xl font-bold text-foreground">Run Three: When the Right Material Is Surfaced — 94%</h2>

                <p>The pricing FAQ at the bottom of the page contains a deep link many buyers would not find on a first pass.</p>
                <p>That link points to Clay University's documentation on Actions & Data Credits — a detailed breakdown of how Data Credits and Actions interact, how workflows consume each resource, rollover policies, and the guardrails available to manage spend.</p>

                <div className="space-y-4 my-6">
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                    <p className="font-semibold text-foreground mb-1">Cost Driver Mapping</p>
                    <p className="text-sm text-muted-foreground">1/2 at 60% → <span className="text-primary font-semibold">2/2 at 80% confidence</span></p>
                    <p className="text-sm text-muted-foreground mt-1">The documentation clearly explains how workflows translate into usage.</p>
                  </div>
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                    <p className="font-semibold text-foreground mb-1">Safety Rails and Trust Surfaces</p>
                    <p className="text-sm text-muted-foreground">1/2 at 50% → <span className="text-primary font-semibold">2/2 at 80% confidence</span></p>
                    <p className="text-sm text-muted-foreground mt-1">Usage controls, rollover policies, and limit behavior become visible.</p>
                  </div>
                </div>

                <p>Overall observability moves from 68% to 79%.</p>
                <p className="text-xl font-bold text-primary">The final score becomes 94%.</p>
                <p>The product did not change. The evidence did.</p>

                <hr className="border-border/50 my-8" />

                <h2 id="score-arc" className="text-2xl font-bold text-foreground">What the Score Arc Actually Tells Founders</h2>

                <p className="text-lg font-semibold text-foreground">The most useful score in this sequence is 75%, not 94%.</p>
                <p>94% tells you Clay's trust infrastructure is strong when a buyer performs deep research.</p>
                <p>75% tells you where buyers lose confidence during the first evaluation pass.</p>

                <div className="bg-muted/30 border border-border/50 rounded-xl p-6 my-8">
                  <p className="font-semibold text-foreground mb-2">Clay did not have a documentation problem.</p>
                  <p className="text-foreground/90 mb-0">Clay had a <strong>trust surface distribution</strong> problem.</p>
                </div>

                <p>The university.clay.com documentation is detailed and technically precise. But it lives several levels below where procurement teams, finance approvers, and internal champions usually evaluate pricing.</p>

                <p>Buyers typically encounter pricing signals in four places:</p>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>The pricing page</li>
                  <li>The FAQ</li>
                  <li>A buyer's guide / cost calculator (on the pricing page)</li>
                  <li>User reviews</li>
                </ol>

                <p>If trust signals live deeper than that, they function as support documentation, not decision infrastructure.</p>

                <hr className="border-border/50 my-8" />

                <h2 id="recommended-focus" className="text-2xl font-bold text-foreground">Recommended Focus: Enhance Cost Predictability and Control</h2>

                <p>Clay's new architecture separates infrastructure costs (Data Credits) from automation value (Actions). Clay's documentation explains how Data Credits and Actions behave.</p>
                <p>What's missing is helping buyers translate workflows into expected cost before running them at scale.</p>

                <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 my-8">
                  <p className="font-semibold text-foreground mb-3">For usage-based AI pricing, buyers need three operational signals:</p>
                  <ol className="list-decimal pl-6 space-y-2 text-foreground/90">
                    <li>What drives cost</li>
                    <li>How workflows translate into usage</li>
                    <li>How spend can be controlled</li>
                  </ol>
                </div>

                <p>The Clay University documentation addresses these questions, but most buyers encounter pricing signals first on the pricing page, not in deep documentation.</p>
                <p className="font-semibold text-foreground">Making those signals visible earlier would significantly strengthen cost predictability.</p>

                <hr className="border-border/50 my-8" />

                <h2 id="first-two-fixes" className="text-2xl font-bold text-foreground">First Two Fixes</h2>

                <h3 className="text-xl font-bold text-foreground mt-6 mb-4">1. Surface Workflow Cost Examples on the Pricing Page</h3>

                <p>The documentation explains how Data Credits and Actions behave, but buyers still need to translate that into real GTM workflows.</p>
                <p>Adding a simple "Workflow Cost Examples" section on the pricing page would bridge that gap.</p>

                <div className="overflow-x-auto my-6">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 text-foreground font-semibold">Example Workflow</th>
                        <th className="text-left py-3 px-4 text-foreground font-semibold">Data Credits</th>
                        <th className="text-left py-3 px-4 text-foreground font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/30">
                        <td className="py-3 px-4">Enrich 1,000 leads with company + contact data</td>
                        <td className="py-3 px-4 text-muted-foreground">1,000–3,000</td>
                        <td className="py-3 px-4 text-muted-foreground">Minimal</td>
                      </tr>
                      <tr className="border-b border-border/30">
                        <td className="py-3 px-4">Run AI research on 500 accounts</td>
                        <td className="py-3 px-4 text-muted-foreground">Minimal</td>
                        <td className="py-3 px-4 text-muted-foreground">500–1,500</td>
                      </tr>
                      <tr className="border-b border-border/30">
                        <td className="py-3 px-4">Automated outbound prospecting workflow</td>
                        <td className="py-3 px-4 text-muted-foreground">1,000–2,000</td>
                        <td className="py-3 px-4 text-muted-foreground">500–1,200</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">Multi-source enrichment + AI research</td>
                        <td className="py-3 px-4 text-muted-foreground">2,000–5,000</td>
                        <td className="py-3 px-4 text-muted-foreground">1,000–3,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p>These ranges do not need to be perfectly precise. Their purpose is to help buyers answer the question they ask during evaluation: <strong>"What does a typical workflow cost?"</strong></p>
                <p>Without this translation layer, buyers must infer cost behavior themselves.</p>

                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">2. Surface Spend Controls Directly in the Pricing Experience</h3>

                <p>The documentation describes how usage behaves, but buyers also want to know how spend can be controlled once automation is running.</p>
                <p>Explicitly surfacing available controls would reduce perceived risk. Examples include:</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                  <div className="bg-muted/20 border border-border/40 rounded-lg p-5">
                    <p className="font-semibold text-foreground mb-2">a) Budget Caps</p>
                    <p className="text-sm text-muted-foreground mb-2">Allow teams to set monthly spending limits:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      <li>Total workspace budget</li>
                      <li>Action usage caps</li>
                      <li>Data Credit caps</li>
                    </ul>
                  </div>
                  <div className="bg-muted/20 border border-border/40 rounded-lg p-5">
                    <p className="font-semibold text-foreground mb-2">b) Usage Alerts</p>
                    <p className="text-sm text-muted-foreground mb-2">Configurable alerts at thresholds:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      <li>50% of monthly budget</li>
                      <li>75% of monthly budget</li>
                      <li>90% of monthly budget</li>
                    </ul>
                  </div>
                  <div className="bg-muted/20 border border-border/40 rounded-lg p-5">
                    <p className="font-semibold text-foreground mb-2">c) Pre-Run Cost Estimates</p>
                    <p className="text-sm text-muted-foreground mb-2">Show estimated consumption before executing:</p>
                    <div className="bg-background/50 rounded p-3 text-xs font-mono text-muted-foreground mt-2">
                      Estimated run cost:<br />
                      1,200 Actions<br />
                      2,300 Data Credits
                    </div>
                  </div>
                </div>

                <p>These fixes do more than clarify Clay's pricing page. 
They illustrate a broader shift happening across AI software.</p>

                <hr className="border-border/50 my-8" />

                <h2 id="what-this-signals" className="text-2xl font-bold text-foreground">What This Signals for AI SaaS Pricing</h2>

                <p>Clay is not alone in this dynamic. PostHog, Replicate, and Modal have followed similar arcs. First usage pricing appears. Then predictability tooling improves. Then observability surfaces mature enough to change buyer behavior.</p>

                <div className="bg-muted/30 border border-border/50 rounded-xl p-6 my-8">
                  <p className="font-semibold text-foreground mb-3">Three structural shifts are emerging across AI software:</p>
                  <ol className="list-decimal pl-6 space-y-3 text-foreground/90">
                    <li><strong>Usage pricing is becoming the default.</strong>Companies that once priced data are increasingly pricing workflows.
                    </li>
                    <li><strong>Value units are moving up the stack.</strong> Companies that once priced data are now pricing workflows.</li>
                    <li><strong>Discoverability is becoming part of the pricing system.</strong> Documentation that exists but is not surfaced cannot build buyer confidence.</li>
                  </ol>
                </div>

                <p>The architecture now reflects where Clay creates value. 
The observability infrastructure largely exists.</p>
                <p>Many AI-native companies operate inside that same gap today.


Most would likely score somewhere between 40% and 70% on these signals.</p>
                <p className="font-semibold text-foreground">But the final layer still determines how buyers experience the system: where pricing signals appear during evaluation.</p>
                <p>In Clay's case, the difference between the 75% score and the 94% score is not a product gap. It is the distance between documentation and discovery.</p>
                <p>Many AI-native companies are operating inside that same gap today.</p>
                <p className="text-muted-foreground">Most AI-native products today would score somewhere between 40% and 70% on these signals.</p>

                <hr className="border-border/50 my-8" />

                <div className="bg-muted/30 border border-border/50 rounded-xl p-6 my-8">
                  <h3 className="text-xl font-bold text-foreground mb-3">The AVS Trust Rubric</h3>
                  <p className="text-foreground/90 mb-2">The AVS Trust Rubric evaluates AI SaaS products using publicly observable signals across eight trust dimensions.</p>
                  <p className="text-foreground/90 mb-0">It measures how easily buyers can infer value, usage, and cost before committing.</p>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-16 border-t border-border/50 pt-12 text-center">
                <h3 className="text-2xl font-bold mb-4">See Your Trust Gaps</h3>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="gap-2 w-full sm:w-auto" asChild>
                    <a href="/#hero">
                      <Sparkles className="w-4 h-4" />
                      Analyze My Product
                    </a>
                  </Button>
                  <a href="https://calendly.com/mlhperkins/30min" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      Book 30-min Session
                    </Button>
                  </a>
                </div>
                <p className="text-sm text-muted-foreground mt-3">Get your AVS assessment in 60 seconds</p>
              </div>
            </motion.article>
          </div>
        </div>
      </main>
      <Footer />
    </div>);}