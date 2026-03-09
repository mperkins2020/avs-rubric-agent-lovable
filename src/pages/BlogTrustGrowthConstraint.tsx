import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Footer } from "@/components/Footer";
import { Sparkles, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import avsArchitecture from "@/assets/avs-system-architecture.png";
import { BlogTOC, TocItem } from "@/components/BlogTOC";

const tocSections: TocItem[] = [
  { id: "value-system", label: "What I Mean by Value System" },
  { id: "retention-data", label: "The Retention Warning Sign" },
  { id: "strong-value", label: "Strong Value Systems in the Wild" },
  { id: "why-avs", label: "Why AVS Exists" },
  { id: "avs-replaces", label: "What AVS Replaces" },
  { id: "trust-layer", label: "AVS as the Economic Trust Layer" },
  { id: "operating-cadence", label: "Living Operating Cadence" },
  { id: "takeaway", label: "The Takeaway" },
];

export default function BlogTrustGrowthConstraint() {
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
                <time>February 2026</time>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3">Trust is the new growth constraint in AI</h1>
              <p className="text-lg md:text-xl text-muted-foreground">A practical way to make value, usage, and cost feel predictable</p>
            </div>

            <BlogTOC sections={tocSections} />

            <div className="space-y-6 text-foreground/90 leading-relaxed">
              <p>This is the year AI stops getting graded on "capabilities" and starts getting graded on economic value. Less demo magic, more measurable impact. Less "we added AI," more "what did it actually change in the workflow?"</p>

              <p>And that shift has a sharp consequence for operators: <strong>pricing drift becomes trust drift.</strong> If your monetization system keeps changing but your value system stays fuzzy, customers do not experience iteration. They experience randomness. Randomness kills exploration, habit, and expansion.</p>

              <p>If you are building an AI-native product, you probably feel the tension already. You want growth. You also want margins that do not collapse when usage takes off.</p>

              <p>So you do what most AI teams do, on the surface and under the hood. You add credits, caps, rollovers, team plans, and regional pricing. You juggle model mixes, throttles, and overage rules to keep your compute spend from exploding.</p>

              <p>A few quarters later, you are living with a trail of experiments that shape how models are routed, how compute is consumed, and what shows up on the pricing page, without anyone owning the whole thing.</p>

              <p>That is the surface problem.</p>

              <p className="text-lg font-semibold text-foreground">The deeper problem is this:</p>

              <p className="text-xl font-bold text-primary">Pricing is not a strategy. Pricing is the output of your value system.</p>

              <hr className="border-border/50 my-8" />

              <h2 id="value-system" className="text-2xl font-bold text-foreground mt-10">What I mean by "value system."</h2>

              <p>Your value system is how your company:</p>

              <ul className="list-disc pl-6 space-y-2">
                <li><strong>defines value</strong> for your ICP.</li>
                <li><strong>decides what should feel generous vs strict</strong>, and why.</li>
                <li><strong>decides what should be affordable to explore</strong> vs paid in production.</li>
                <li><strong>translates usage and cost</strong> into what customers see and feel.</li>
              </ul>

              <p>Your economic system is how you monetize: pricing, packaging, billing, contracts, and deal shapes.</p>

              <p>Your economic system can change quickly. It should.</p>

              <p>But if it changes without a stable value system underneath, you end up with a growing pile of patches and exceptions that few people can explain end-to-end, and customers do not trust.</p>

              <div className="bg-muted/30 border border-border/50 rounded-xl p-6 my-8">
                <p className="mb-0"><strong>AVS, the Adaptive Value System,</strong> is a lightweight operating map for AI economics. It helps teams define what counts as value, what should be cheap to explore, what must be paid in production, and what guardrails keep trust and margins stable as usage scales.</p>
              </div>

              <p>Think of AVS as a simple navigator, grounded in your differentiated value and adapting as your product grows. Its job is to sanity check the pricing and packaging experiments you are already running, especially once you cross roughly $1M ARR.</p>

              <hr className="border-border/50 my-8" />

              <h2 className="text-2xl font-bold text-foreground">The retention data is the loudest warning sign.</h2>

              <p>Kyle Poyar and Chart Mogul looked at retention across 3,500 software companies. Benchmarks:</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                <div className="bg-muted/20 border border-border/40 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">82%</p>
                  <p className="text-sm text-muted-foreground">B2B SaaS median NRR</p>
                </div>
                <div className="bg-muted/20 border border-border/40 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">40%</p>
                  <p className="text-sm text-muted-foreground">AI native median GRR</p>
                </div>
                <div className="bg-muted/20 border border-border/40 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">48%</p>
                  <p className="text-sm text-muted-foreground">AI native median NRR</p>
                </div>
              </div>

              <p>A lot of AI revenue is treated as "recurring" while the customer base behaves like it is still in trial mode. If your product is easy to buy and easy to cancel, you will feel it in GRR and NRR long before you feel it in brand sentiment.</p>

              <p className="font-semibold">That is not just a pricing problem. It is your value system showing up out of alignment.</p>

              <hr className="border-border/50 my-8" />

              <h2 className="text-2xl font-bold text-foreground">How strong value systems show up in the wild</h2>

              <p>ZoomInfo's CEO, Henry Schuck, shared a simple truth: their best AI ROI did not come from flashy demos. It came from "boring AI" embedded into repeatable workflows at scale, like daily prioritization, more relevant outreach, calls into usable data, and faster engineering execution.</p>

              <p><strong>That is a value system:</strong> delivering clear value units that earn a daily habit.</p>

              <hr className="border-border/50 my-8" />

              <h2 className="text-2xl font-bold text-foreground">Why the Adaptive Value System (AVS) exists</h2>

              <p>Most AI native teams feel like they are building a plane while they are flying it. They are trying to steer growth while:</p>

              <ul className="list-disc pl-6 space-y-2">
                <li>infra costs move under their feet.</li>
                <li>model behavior changes weekly.</li>
                <li>buyers demand predictability.</li>
                <li>usage is spiky and segment specific.</li>
                <li>retention is fragile because switching is easy.</li>
              </ul>

              <p>Without a value navigator, teams default to reactive moves.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
                <div className="bg-muted/20 border border-border/40 rounded-lg p-5">
                  <p className="font-semibold text-foreground mb-3">AVS is not:</p>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>a pricing system.</li>
                    <li>a new tax on your team.</li>
                    <li>a magic "AI pricing model."</li>
                    <li>something you implement before PMF.</li>
                  </ul>
                </div>
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-5">
                  <p className="font-semibold text-foreground mb-3">AVS is:</p>
                  <ul className="list-disc pl-5 space-y-1 text-foreground/80">
                    <li>a shared way to define "what counts as value."</li>
                    <li>a checklist for how generous exploration should be.</li>
                    <li>a structure for deciding where to tighten or loosen without killing trust.</li>
                  </ul>
                </div>
              </div>

              <p>The system is a decision assistant for operators, and a shared map across product, finance, infra, and GTM. It makes value, cost, and customer trust steerable across teams in 90-day cycles, instead of being buried in spreadsheets, Slack threads, and people's heads.</p>

              <hr className="border-border/50 my-8" />

              <h2 className="text-2xl font-bold text-foreground">What AVS replaces: the manual operating pattern that creates drift</h2>

              <p>AVS does not replace tools. It replaces the quarter-late, manual process of connecting monetization changes to behavior, trust, and margin outcomes. It gives operators a shared map, makes leading signals observable week to week, and turns learning into a repeatable cadence across product, finance, infra, and GTM.</p>

              <div className="space-y-4 my-8">
                {[
                  { title: "Quarter-late reconstruction.", desc: "Manual \"pricing experiment → behavior shift → north star impact\" analysis stitched from product analytics, billing logs, support tickets, and margin reports. AVS makes the hypothesis and leading indicators explicit upfront, then surfaces results weekly, while you can still steer." },
                  { title: "Oscillation as a strategy.", desc: "Blunt caps and credit patches are used as emergency brakes, tightening to protect costs, loosening to protect growth. AVS gives you a consistent set of levers and guardrails, so you can adjust without whiplash or loss of trust." },
                  { title: "Cross-team goal conflict.", desc: "Growth optimizes activation, finance optimizes margin variance, sales optimizes close velocity, and teams debate tactics without a shared objective. AVS forces alignment on a single 90-day north star and the value levers that support it." },
                  { title: "Hidden hesitation that kills habit.", desc: "\"What will this run cost me?\" moments where users avoid running a task or finishing a project because credit burn is unclear. AVS makes exploration legible and bounded, so users can learn, build, and adopt with confidence." },
                  { title: "Changes that feel random to customers.", desc: "Monetization updates that have no stable narrative tied to a consistent value model. AVS gives you a durable value story, so changes feel deliberate and explainable rather than arbitrary." },
                ].map((item) => (
                  <div key={item.title} className="bg-muted/20 border border-border/40 rounded-lg p-5">
                    <p className="font-semibold text-foreground mb-1">{item.title}</p>
                    <p className="text-muted-foreground text-sm mb-0">{item.desc}</p>
                  </div>
                ))}
              </div>

              <p>Pricing simulation tools offered in Orb or Metronome can model scenarios. AVS makes those scenarios trustworthy by standardizing the inputs first, your value units, pool logic, guardrails, and leading indicators by segment and workflow. That way, a "cap change" means the same thing across the business, and outcomes are comparable week to week rather than being debated after the fact.</p>

              <hr className="border-border/50 my-8" />

              <h2 className="text-2xl font-bold text-foreground">AVS as the economic trust layer</h2>

              <p>Trust in an AI product has many layers: predictable outputs, recoverable failures, clear uncertainty, aligned expectations, and low-friction workflows.</p>

              <p>AVS does not own all of the trust. It owns the slice where value and cost show up as product behavior.</p>

              <p>It is designed that three things stay true:</p>

              <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 my-8 text-center">
                <p className="text-lg font-semibold text-foreground mb-0">Value Clarity + Economic Trust + Exploration with Purpose → Activation + Retention, with Deliberate Margins</p>
              </div>

              <p>This is also where driving extreme clarity of a value system matters. It is one of the most direct ways to establish belief and trust in the Play Bigger sense of category design. When users know what "value" means, what counts, what is safe to try, and what happens when they lean in, they explore more, and they stick.</p>

              <figure className="my-10">
                <img src={avsArchitecture} alt="AVS Value Navigation System architecture diagram showing the strategic layer, mechanics layer with value units, pools, exploration, safety rails, and rating logic, connecting product and users to pricing and economics" className="w-full rounded-xl border border-border/30" />
                <figcaption className="text-center text-sm text-muted-foreground mt-3">The AVS Value Navigation System — connecting product behavior to pricing and economics through a structured mechanics layer.</figcaption>
              </figure>

              <hr className="border-border/50 my-8" />

              <h2 className="text-2xl font-bold text-foreground">How AVS becomes a living operating cadence</h2>

              <p>AVS stays useful by turning "pricing iteration" into a repeatable operating rhythm:</p>

              <ol className="list-decimal pl-6 space-y-2">
                <li>Pick one 90-day north star</li>
                <li>Sequence the bets</li>
                <li>Write the value hypothesis and leading indicators up front</li>
                <li>Configure the levers (units, pools, exploration, rails, rating logic)</li>
                <li>Set success and kill criteria, then review on cadence</li>
              </ol>

              <p>The cadence forces explicit hypotheses and weekly learning, so drift gets caught early, and changes feel deliberate to operators and legible to users.</p>

              <hr className="border-border/50 my-8" />

              <h2 className="text-2xl font-bold text-foreground">The takeaway</h2>

              <div className="bg-muted/30 border border-border/50 rounded-xl p-6 my-6">
                <p className="text-lg font-semibold text-foreground mb-2">Belief starts the value loop. Trust sustains it. Habit compounds it.</p>
                <p className="text-muted-foreground mb-0">Exploration, activation, retention, expansion, and margins are different views of the same loop. AVS is a way to design that loop on purpose, so you can steer instead of patch.</p>
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
      </main>
      <Footer />
    </div>
  );
}
