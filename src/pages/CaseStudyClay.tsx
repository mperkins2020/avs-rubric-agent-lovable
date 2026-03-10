import { Link, useNavigate } from "react-router-dom";
import ValueTempoLogo from "@/assets/ValueTempo_Logo.png";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Sparkles, ArrowLeft, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { SEOHead } from "@/components/SEOHead";

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export default function CaseStudyClay() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Clay AVS Case Study — Trust Infrastructure Analysis"
        description="AVS Rubric analysis of Clay's trust infrastructure. Evaluating value unit clarity, cost driver transparency, safety rails, and enterprise readiness across 8 dimensions."
        canonicalUrl="https://valuetempo.lovable.app/resources/case-studies/clay"
        publishedDate="2026-02-15"
        tags={["Clay", "case study", "AVS Rubric", "trust infrastructure", "AI SaaS"]}
      />
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-10" src={ValueTempoLogo} />
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

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Breadcrumb */}
        <Link to="/resources/case-studies" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Case Studies
        </Link>

        {/* Hero */}
        <Section>
          <div className="flex items-center gap-3 mb-4">
            <img src="/case-studies/clay-logo.ico" alt="Clay" className="w-10 h-10 rounded-lg object-contain bg-secondary/50 p-1" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Case Study: Clay</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            The $100M Platform With a Cost Predictability Gap
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-2">
            GTM Platform Leader. 81% AVS Trust Score. 4.9/5 G2 rating.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Clay has built the defining GTM platform of the AI era with exceptional product-market fit, explosive growth (6x in 2024, tripling in 2025), and a credit-based model that clearly maps value to usage. Yet credit consumption complaints dominate user feedback, teams burn $500-$800 in their first week learning the platform, and failed lookups still cost credits. The infrastructure that made Clay scale is the same infrastructure creating trust friction at the expansion layer.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4 font-medium">
            At $100M ARR, even small efficiency gaps represent millions in addressable revenue. Our analysis estimates closing the identified trust gaps could drive a <span className="text-foreground font-semibold">2–7% uplift in ARR</span>.
          </p>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* User Feedback */}
        <Section>
          <h2 className="text-2xl font-bold mb-2">What User Feedback Shows</h2>
          <h3 className="text-lg font-semibold text-muted-foreground mb-6">The Scattered Signal</h3>
          <div className="space-y-4">
            {[
              {
                label: "Credits just straight up disappear",
                quote: "Every sales manager I know that touches Clay for the first time burns through their credits while trying to figure it out.",
                source: "GTM Pros Survey (500+ respondents)",
              },
              {
                label: "$800 in a week",
                quote: "Clay should come with a seatbelt. No safety net, no practice mode that doesn't cost you.",
                source: "User feedback, Bloomberry review",
              },
              {
                label: "Can't predict costs",
                quote: "Credits per month, cost per credit, credits per $100 - all worthless without knowing the actual value of a credit.",
                source: "Jonas Ehrenstein, GTM professional",
              },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-xl bg-card/60 border border-border/50">
                <p className="text-sm font-semibold mb-1">"{item.label}"</p>
                <blockquote className="text-sm text-muted-foreground italic">"{item.quote}"</blockquote>
                <p className="text-xs text-muted-foreground mt-1">— {item.source}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Standard diagnosis: Customer education problem. Improve onboarding, rewrite docs, add tooltips. But none of that addresses the structural gaps causing these symptoms.
          </p>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* AVS Reveals */}
        <Section>
          <h2 className="text-2xl font-bold mb-2">What AVS Reveals</h2>
          <h3 className="text-lg font-semibold text-muted-foreground mb-4">The Systematic Picture</h3>
          <div className="flex items-center gap-4 mb-4 p-4 rounded-xl bg-card/60 border border-border/50">
            <div>
              <span className="text-3xl font-mono font-bold gradient-text">81%</span>
              <p className="text-xs text-muted-foreground">AVS Trust Score</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <span className="text-sm font-medium">Observability: Strong</span>
              <p className="text-xs text-muted-foreground">Confidence: 70%</p>
            </div>
          </div>

          {/* Company Scale */}
          <div className="p-4 rounded-xl bg-card/60 border border-border/50 mb-6">
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Company Scale</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><span className="text-muted-foreground">ARR:</span> <span className="font-medium">$100M</span></div>
              <div><span className="text-muted-foreground">Valuation:</span> <span className="font-medium">$3.1B (Series C)</span></div>
              <div><span className="text-muted-foreground">Customers:</span> <span className="font-medium">10,000+</span></div>
              <div><span className="text-muted-foreground">Avg ARPU:</span> <span className="font-medium">~$833/mo</span></div>
              <div><span className="text-muted-foreground">Data Sources:</span> <span className="font-medium">150+</span></div>
              <div><span className="text-muted-foreground">Agent Tasks:</span> <span className="font-medium">1.5B+</span></div>
            </div>
          </div>

          <p className="text-muted-foreground mb-6">Five dimensional strengths alongside three critical gaps:</p>

          {/* Key Strengths */}
          <h4 className="text-base font-bold mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[hsl(var(--score-high))]" />
            Key Strengths
          </h4>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Dimension</th>
                  <th className="py-2 pr-4 font-medium">Score</th>
                  <th className="py-2 font-medium">What It Means</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { dim: "Product North Star", score: "100%", meaning: "Clear articulation: unify GTM data + AI + automation for customer insights" },
                  { dim: "ICP & Job Clarity", score: "100%", meaning: "Explicit targeting of GTM teams; concrete job statements around enrichment, signals, AI research" },
                  { dim: "Buyer & Budget Alignment", score: "100%", meaning: "Tiered pricing from Free to Enterprise; clear feature segmentation per tier" },
                  { dim: "Value Unit", score: "100%", meaning: "Credits consistently defined, linked to data consumption; calculator available" },
                  { dim: "Pools & Packaging", score: "100%", meaning: "Free tier for exploration; credit pools with rollover; BYOK for zero-credit enrichment" },
                ].map((r) => (
                  <tr key={r.dim} className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium">{r.dim}</td>
                    <td className="py-2 pr-4">
                      <span className="score-badge score-badge-high">{r.score}</span>
                    </td>
                    <td className="py-2 text-muted-foreground">{r.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Critical Gaps */}
          <h4 className="text-base font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[hsl(var(--score-medium))]" />
            Critical Gaps
          </h4>
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Gap</th>
                  <th className="py-2 pr-4 font-medium">Score</th>
                  <th className="py-2 font-medium">What's Missing</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { gap: "Cost Driver Mapping", score: "50%", missing: "No formulas linking enrichment actions to credit burn rate. No p50/p95 workflow cost estimates. Failed lookups still consume credits." },
                  { gap: "Overages & Risk Allocation", score: "50%", missing: "Overage behavior (hard stop vs. soft limit) undefined. Top-ups carry a 50% premium. Rollover cap at 2x monthly." },
                  { gap: "Safety Rails & Trust Surfaces", score: "50%", missing: "No configurable budget caps for non-Enterprise. No per-table spend reports (confirmed by Clay). Rate limits undocumented." },
                ].map((r) => (
                  <tr key={r.gap} className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium">{r.gap}</td>
                    <td className="py-2 pr-4"><span className="score-badge score-badge-medium">{r.score}</span></td>
                    <td className="py-2 text-muted-foreground">{r.missing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* The Insight */}
        <Section>
          <h2 className="text-2xl font-bold mb-4">The Insight: Strong Foundation + Specific Gaps = High-ROI Fix Opportunity</h2>
          <p className="text-muted-foreground mb-6">Why complaints persist despite an 81% trust score:</p>
          <div className="space-y-4">
            {[
              {
                good: "Value Unit is clear (100%) — Customers understand \"credits\" as the consumption unit",
                but: "Cost Driver Mapping is incomplete (50%) — Teams cannot forecast credit burn for multi-step workflows. A 5-step enrichment on 1,000 leads could cost anywhere from 5,000 to 75,000 credits depending on provider selection, with no published guidance",
              },
              {
                good: "Pools & Packaging are transparent (100%) — Credit tiers, rollover rules, and BYOK options are documented",
                but: "Safety Rails are absent (50%) — No configurable budget caps, no per-table spend tracking (Clay confirms this is in development), and no sandbox mode for learning",
              },
            ].map((pair, i) => (
              <div key={i} className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[hsl(var(--score-high)/0.08)] border border-[hsl(var(--score-high)/0.2)]">
                  <p className="text-sm"><CheckCircle className="w-4 h-4 text-[hsl(var(--score-high))] inline mr-1" />{pair.good}</p>
                </div>
                <div className="p-3 rounded-lg bg-[hsl(var(--score-medium)/0.08)] border border-[hsl(var(--score-medium)/0.2)]">
                  <p className="text-sm"><AlertTriangle className="w-4 h-4 text-[hsl(var(--score-medium))] inline mr-1" />{pair.but}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium">Result: Best-in-class GTM platform + incomplete cost predictability infrastructure = trust breakdowns at the expansion layer.</p>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-card/60 border border-border/50 space-y-2">
            <p className="text-sm font-medium mb-2">At $100M ARR, this pattern affects:</p>
            <ul className="space-y-1">
              {[
                "New users burning $500-$800 in first week learning (no sandbox)",
                "Mid-market teams artificially capping usage to avoid overages",
                "Enterprise procurement stalling on cost predictability questions",
                "CRM integration locked behind $800/mo Pro tier, limiting expansion velocity",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* Three Trust Breakpoints */}
        <Section>
          <h2 className="text-2xl font-bold mb-6">The Three Trust Breakpoints</h2>
          <div className="space-y-8">
            {[
              {
                num: "1",
                title: "Cost Predictability for High-Volume Workflows",
                gap: "No published formulas for how provider selection, waterfall logic, retry behavior, and AI prompt complexity affect credit consumption. Failed lookups charge credits with no refund mechanism.",
                impact: "Mid-market segment (Explorer + Pro: estimated 4,000 customers, ~$6M MRR) expanding at 6% monthly vs. 10% benchmark for usage-based SaaS at this stage. 4 percentage points = $2.9M annual expansion revenue left on the table.",
                evidence: "Sacra reports Clay's gross margins are \"mid-60s to high-70 percent\" due to data licensing pass-through, meaning credit consumption volatility directly hits both customer budgets and Clay's unit economics.",
              },
              {
                num: "2",
                title: "Operational Risk Management",
                gap: "Configurable budget caps not available for non-Enterprise tiers. Top-up credits carry a 50% premium penalty. Rollover capped at 2x monthly allocation. No per-table spend reports (Clay acknowledges this is in development).",
                impact: "Month 2-3 churn spike for Starter/Explorer users who hit unexpected overages. Estimated 4% excess churn vs. 1.5% baseline for this segment. ~600 preventable annual churns at $5,000 avg annual contract = $3.0M annual LTV destroyed.",
                evidence: "",
              },
              {
                num: "3",
                title: "Onboarding-to-Value Friction",
                gap: "No free sandbox or practice mode. Learning the platform consumes real credits. Users report spending $500+ before running their first production workflow. CRM integration requires Pro tier ($800/mo), creating a hard gate on the highest-value use case.",
                impact: "Free-to-paid conversion and trial-to-paid activation rates suppressed by onboarding cost anxiety. Every week of delayed activation at 10,000+ customers compounds. Estimated $1.5M annual ARR from faster activation + reduced trial abandonment.",
                evidence: "",
              },
            ].map((bp) => (
              <div key={bp.num} className="p-5 rounded-xl bg-card/60 border border-border/50 space-y-3">
                <h3 className="text-lg font-bold">
                  <span className="text-primary mr-2">{bp.num}.</span>
                  {bp.title}
                </h3>
                <p className="text-sm text-muted-foreground"><strong>The Gap:</strong> {bp.gap}</p>
                <blockquote className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-4">{bp.impact}</blockquote>
                {bp.evidence && (
                  <p className="text-sm"><strong>Validated by:</strong> <span className="text-muted-foreground">{bp.evidence}</span></p>
                )}
              </div>
            ))}
          </div>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* Fix Roadmap */}
        <Section>
          <h2 className="text-2xl font-bold mb-6">The Prioritized Fix Roadmap</h2>
          <div className="space-y-8">
            {[
              {
                priority: "Priority 1",
                title: "Cost Driver Formulas & Workflow Estimator",
                timeline: "6-8 weeks",
                why: "Highest revenue impact; enables all other improvements; directly addresses the #1 complaint",
                fixes: [
                  "Publish provider-specific credit multipliers with formulas (e.g., \"Find Email via Apollo = 2 credits; via ContactOut = 15 credits\")",
                  "Create 20+ workflow cost scenarios with p50/p95 estimates (e.g., \"1,000-lead waterfall enrichment: typical 8,000 credits, worst-case 22,000 credits\")",
                  "Add pre-run cost estimation in the table UI before executing workflows",
                  "Build real-time credit burn dashboard at account, table, and column level",
                ],
                impact: "$2.9M expansion acceleration + 60% reduction in \"unexpected billing\" support tickets",
              },
              {
                priority: "Priority 2",
                title: "Configurable Safety Rails",
                timeline: "4-6 weeks",
                why: "Prevents high-value customer churn at the exact moment teams are scaling usage",
                fixes: [
                  "Build account-level and table-level spending caps for all paid tiers (not just Enterprise)",
                  "Document hard stop vs. soft stop behavior explicitly on pricing page",
                  "Add threshold alerts at 50%, 75%, 90% of monthly allocation",
                  "Ship the per-table spend reporting (already acknowledged as in development)",
                ],
                impact: "$3.0M churn prevention annually + 70% reduction in \"credits disappear\" complaints",
              },
              {
                priority: "Priority 3",
                title: "Onboarding Sandbox & Activation Accelerator",
                timeline: "4-6 weeks",
                why: "Strategic leverage for conversion velocity and free-to-paid acceleration",
                fixes: [
                  "Create sandbox/practice mode with synthetic data that does not consume credits",
                  "Pre-built workflow templates with cost estimates (\"This template typically costs 3,200 credits for 500 leads\")",
                  "Consider CRM integration at Explorer tier to reduce expansion friction",
                  "Guided first-workflow wizard with cost guardrails",
                ],
                impact: "$1.5M activation acceleration + reduced onboarding cost anxiety",
              },
            ].map((p) => (
              <div key={p.priority} className="p-5 rounded-xl bg-card/60 border border-border/50 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">{p.priority}</span>
                  <span className="text-xs text-muted-foreground">{p.timeline}</span>
                </div>
                <h3 className="text-lg font-bold">{p.title}</h3>
                <p className="text-sm text-muted-foreground"><strong>Why first:</strong> {p.why}</p>
                <ul className="space-y-1">
                  {p.fixes.map((fix, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">•</span>
                      {fix}
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-medium text-[hsl(var(--score-high))]">Expected impact: {p.impact}</p>
              </div>
            ))}
          </div>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* Business Case */}
        <Section>
          <h2 className="text-2xl font-bold mb-6">The Business Case</h2>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {[
                  { label: "Investment", value: "$400-600K" },
                  { label: "Timeline", value: "14-20 weeks" },
                  { label: "Revenue Impact", value: "$7.4M annually" },
                  { label: "ROI", value: "1,233-1,850%" },
                ].map((r) => (
                  <tr key={r.label} className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium">{r.label}</td>
                    <td className="py-2 text-muted-foreground">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 rounded-xl bg-card/60 border border-border/50 space-y-2">
            <p className="text-sm font-medium">Impact as % of ARR:</p>
            <p className="text-sm text-muted-foreground">$7.4M / $100M = <strong className="text-foreground">7.4% ARR lift</strong></p>
            <p className="text-sm text-muted-foreground">Conservative: 4% lift = $4.0M</p>
            <p className="text-sm text-muted-foreground">Optimistic: 10% lift = $10.0M</p>
          </div>
          <p className="text-sm text-muted-foreground mt-4 font-medium">
            At scale, cost predictability gaps are million-dollar problems with high-ROI solutions.
          </p>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* The Lesson */}
        <Section>
          <h2 className="text-2xl font-bold mb-4">The Lesson</h2>
          <p className="text-lg font-medium mb-4">An 81% AVS score at $100M ARR is not a crisis. It is a systematic optimization opportunity with outsized returns because the foundation is already exceptional.</p>
          <p className="text-muted-foreground mb-4">Clay has:</p>
          <ul className="space-y-1 mb-6">
            {[
              "Best-in-class product quality (4.9/5 G2, 94% data enrichment satisfaction)",
              "Strongest commercial fundamentals in GTM SaaS (100% on 5/8 dimensions)",
              "Category-defining market position ($3.1B valuation, created GTM Engineering as a role)",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-[hsl(var(--score-high))] mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mb-4">The gaps are:</p>
          <ul className="space-y-1 mb-6">
            {[
              "Specific: cost driver formulas, safety rail configuration, onboarding sandbox",
              "Fixable: product features + documentation, not pricing restructure",
              "High-ROI: 4-10% ARR impact for <$600K investment",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-[hsl(var(--score-high))] mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <div className="p-4 rounded-xl bg-card/60 border border-border/50 space-y-2">
            <p className="text-sm text-muted-foreground">User feedback identifies scattered symptoms.</p>
            <p className="text-sm text-muted-foreground">ValueTempo's Adaptive Value System (AVS) diagnoses the structural gaps creating those symptoms.</p>
            <p className="text-sm font-medium mt-2">
              At a $100M scale, fixing those gaps = $7M+ addressable revenue.
            </p>
          </div>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* Methodology Note */}
        <Section>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Methodology Note:</span> Revenue estimates based on $100M ARR (Sacra, November 2025), $3.1B Series C valuation (CapitalG, August 2025), 10,000+ customer base (Clay Series C announcement), industry benchmarks (OpenView, ChartMogul, ProfitWell), and behavioral modeling from 500+ GTM professional feedback (Bloomberry, G2, Trustpilot).
            </p>
          </div>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* CTA */}
        <Section className="text-center py-8">
          <h2 className="text-2xl font-bold mb-2">See Your Trust Gaps</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button className="bg-gradient-primary gap-2" asChild>
              <a href="/#hero">
                <Sparkles className="w-4 h-4" />
                Analyze My Product
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="https://calendly.com/mlhperkins/30min" target="_blank" rel="noopener noreferrer" className="gap-2">
                Book 30-min Session
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Get your AVS assessment in 60 seconds</p>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
