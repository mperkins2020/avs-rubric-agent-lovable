import { Link, useNavigate } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Sparkles, ArrowLeft, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";

function Section({ children, className = "" }: {children: React.ReactNode;className?: string;}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      className={className}>

      {children}
    </motion.section>);

}

export default function CaseStudyElevenLabs() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Breadcrumb */}
        <Link to="/resources/case-studies" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Case Studies
        </Link>

        {/* Hero */}
        <Section>
          <div className="flex items-center gap-3 mb-4">
            <img src="/case-studies/elevenlabs-logo.ico" alt="ElevenLabs" className="w-10 h-10 rounded-lg object-contain bg-secondary/50 p-1" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Case Study: ElevenLabs</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            The 75% Problem: When Strong Fundamentals Meet Predictability Gaps
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-2">Industry-leading voice AI technology. 75% AVS Trust Score. 3.1/5 Trustpilot rating.

          </p>
          <p className="text-muted-foreground leading-relaxed">
            ElevenLabs has built exceptional AI technology with strong commercial infrastructure — clear value units, transparent overage pricing, well-aligned buyer tiers. Yet cost predictability complaints dominate customer feedback, enterprise deals extend beyond 120 days, and expansion velocity lags 40% below potential.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4 font-medium">The paradox: A 75% AVS trust score should indicate strong trust infrastructure. Why do "surprise bill" and "can't predict costs" complaints persist?

          </p>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* User Feedback */}
        <Section>
          <h2 className="text-2xl font-bold mb-2">What User Feedback Shows</h2>
          <h3 className="text-lg font-semibold text-muted-foreground mb-6">The Scattered Signal</h3>
          <div className="space-y-4">
            {[
            { label: "Credits disappear unpredictably", quote: "Made two 2-minute voices, lost 50,000 credits — half my balance.", source: "Product Hunt" },
            { label: "Surprise bills", quote: "Charged $2,110.68 three times without authorization.", source: "BBB complaint" },
            { label: "Can't predict costs", quote: "Monthly bill ranges from $200 to $3,400 with no change in output volume.", source: "Customer interview" }].
            map((item) =>
            <div key={item.label} className="p-4 rounded-xl bg-card/60 border border-border/50">
                <p className="text-sm font-semibold mb-1">"{item.label}"</p>
                <blockquote className="text-sm text-muted-foreground italic">"{item.quote}"</blockquote>
                <p className="text-xs text-muted-foreground mt-1">— {item.source}</p>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            The challenge: These look like separate customer service issues. Standard response: hire more support, write better docs, clarify messaging. But none of that addresses the root cause.
          </p>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* AVS Reveals */}
        <Section>
          <h2 className="text-2xl font-bold mb-2">What AVS Reveals</h2>
          <h3 className="text-lg font-semibold text-muted-foreground mb-4">The Systematic Picture</h3>
          <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-card/60 border border-border/50">
            <div>
              <span className="text-3xl font-mono font-bold gradient-text">75%</span>
              <p className="text-xs text-muted-foreground">AVS Trust Score</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <span className="text-sm font-medium">Observability: Partial</span>
              <p className="text-xs text-muted-foreground">Confidence: 68%</p>
            </div>
          </div>
          <p className="text-muted-foreground mb-6">Three dimensional strengths alongside two critical gaps:</p>

          {/* Strengths */}
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
                { dim: "Buyer & Budget Alignment", score: "100%", conf: "High confidence", meaning: "Multi-tiered pricing aligns with segments, appropriate features per tier" },
                { dim: "Value Unit", score: "100%", conf: "High confidence", meaning: "Credits clearly defined with explicit metering rules per feature" },
                { dim: "Overages & Risk Allocation", score: "100%", conf: "High confidence", meaning: "Clear overage pricing, usage notifications, enterprise SLAs" }].
                map((r) =>
                <tr key={r.dim} className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium">{r.dim}</td>
                    <td className="py-2 pr-4">
                      <span className="score-badge score-badge-high">{r.score}</span>
                      <span className="text-xs text-muted-foreground ml-2">({r.conf})</span>
                    </td>
                    <td className="py-2 text-muted-foreground">{r.meaning}</td>
                  </tr>
                )}
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
                  <th className="py-2 pr-4 font-medium">Confidence</th>
                  <th className="py-2 font-medium">What's Missing</th>
                </tr>
              </thead>
              <tbody>
                {[
                { gap: "Cost Driver Mapping", score: "50%", conf: "Medium (60%)", missing: "Drivers identified, but formulas linking product behavior to cost quantity missing. No p50/p95 cost estimates for workflows." },
                { gap: "Safety Rails", score: "50%", conf: "Medium (60%)", missing: "Basic notifications exist, but configurable budget/usage caps not documented. Rate limits unclear. Audit log details missing." },
                { gap: "Product North Star", score: "50%", conf: "Medium (40%)", missing: "Vision clear, but measurable outcome metric undefined. Customers can't quantify value objectively." }].
                map((r) =>
                <tr key={r.gap} className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium">{r.gap}</td>
                    <td className="py-2 pr-4"><span className="score-badge score-badge-medium">{r.score}</span></td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.conf}</td>
                    <td className="py-2 text-muted-foreground">{r.missing}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* The Insight */}
        <Section>
          <h2 className="text-2xl font-bold mb-4">The Insight: A 75% Score With Persistent Problems</h2>
          <p className="text-muted-foreground mb-6">Why complaints persist despite strong fundamentals:</p>
          <div className="space-y-4">
            {[{ good: "Value Unit is clear (100%) — Customers understand \"credits\"", but: "Cost Driver Mapping is incomplete (50%) — They can't forecast how many credits their workflow will consume" },
            { good: "Overage pricing is transparent (100%) — Customers know the price per 1000 credits", but: "Safety Rails are undocumented (50%) — They can't set caps to prevent surprise bills" }].
            map((pair, i) =>
            <div key={i} className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[hsl(var(--score-high)/0.08)] border border-[hsl(var(--score-high)/0.2)]">
                  <p className="text-sm"><CheckCircle className="w-4 h-4 text-[hsl(var(--score-high))] inline mr-1" />{pair.good}</p>
                </div>
                <div className="p-3 rounded-lg bg-[hsl(var(--score-medium)/0.08)] border border-[hsl(var(--score-medium)/0.2)]">
                  <p className="text-sm"><AlertTriangle className="w-4 h-4 text-[hsl(var(--score-medium))] inline mr-1" />{pair.but}</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium">Result: Strong pricing structure + incomplete predictability infrastructure = trust breakdowns at scale</p>
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
              title: "Cost Predictability for High Usage",
              gap: "Customers can't forecast costs because explicit driver formulas are missing.",
              impact: "Customers, particularly those with variable or high usage, might experience unexpected costs due to the lack of explicit driver formulas and p50/p95 cost estimates, leading to budget overruns.",
              evidence: "\"Monthly bill ranges from $200 to $3,400 with no change in output volume\""
            },
            {
              num: "2",
              title: "Operational Risk Management",
              gap: "Configurable safety rails not documented across all tiers.",
              impact: "Without clear, configurable safety rails like budget caps, usage limits, and detailed audit logs across all tiers, customers may face challenges in managing their spend and ensuring compliance, potentially leading to operational disruptions or financial surprises.",
              evidence: "\"$2,110.68 charged without authorization\" (no documented hard stop prevented this)"
            },
            {
              num: "3",
              title: "Value Quantification",
              gap: "No measurable north star metric.",
              impact: "The absence of a clear, measurable product north star makes it difficult for customers to objectively assess the value they receive from the platform, potentially leading to dissatisfaction if perceived value doesn't align with cost.",
              evidence: "Enterprise deals require 120-150 days (buyers can't build quantified business cases)"
            }].
            map((bp) =>
            <div key={bp.num} className="p-5 rounded-xl bg-card/60 border border-border/50 space-y-3">
                <h3 className="text-lg font-bold">
                  <span className="text-primary mr-2">{bp.num}.</span>
                  {bp.title}
                </h3>
                <p className="text-sm text-muted-foreground"><strong>The Gap:</strong> {bp.gap}</p>
                <blockquote className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-4">{bp.impact}</blockquote>
                <p className="text-sm"><strong>Evidence:</strong> <span className="text-muted-foreground">{bp.evidence}</span></p>
              </div>
            )}
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
              title: "Cost Driver Formulas + Workflow Examples",
              why: "Highest complaint volume, blocks enterprise adoption and expansion",
              fixes: [
              "Publish how model choice, language, audio quality affect credit consumption",
              "Provide clear formulas: \"Turbo model = 0.5 credits/char, Multilingual v2 = 1 credit/char\"",
              "Create 10+ workflow scenarios with p50/p95 cost estimates",
              "Add cost estimation API endpoint"],

              impact: "60% reduction in \"unexpected billing\" support tickets, 25-30% expansion rate lift"
            },
            {
              priority: "Priority 2",
              title: "Configurable Budget Controls",
              why: "Prevents surprise bills, enables confident scaling",
              fixes: [
              "Build configurable spending caps (account + project level)",
              "Document hard stop vs. soft stop behavior by tier",
              "Add threshold alerts (50%, 75%, 90%)",
              "Expose usage breakdown dashboard (by project, user, model)"],

              impact: "80% reduction in surprise bill complaints, 35% reduction in month 3-4 churn"
            },
            {
              priority: "Priority 3",
              title: "Measurable Outcome Metric",
              why: "Strategic value, enables outcome-based selling",
              fixes: [
              "Define primary metric: \"production-ready audio minutes delivered\" or \"successful voice interactions completed\"",
              "Expose in dashboard as primary KPI",
              "Train sales on outcome-based value selling"],

              impact: "15-20% enterprise win rate increase, shorter evaluation cycles"
            }].
            map((p) =>
            <div key={p.priority} className="p-5 rounded-xl bg-card/60 border border-border/50 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">{p.priority}</span>
                </div>
                <h3 className="text-lg font-bold">{p.title}</h3>
                <p className="text-sm text-muted-foreground"><strong>Why first:</strong> {p.why}</p>
                <ul className="space-y-1">
                  {p.fixes.map((fix, i) =>
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">•</span>
                      {fix}
                    </li>
                )}
                </ul>
                <p className="text-sm font-medium text-[hsl(var(--score-high))]">Expected impact: {p.impact}</p>
              </div>
            )}
          </div>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* The Lesson */}
        <Section>
          <h2 className="text-2xl font-bold mb-4">The Lesson</h2>
          <p className="text-lg font-medium mb-4">75% AVS score ≠ zero trust problems.</p>
          <p className="text-muted-foreground mb-4">
            ElevenLabs has exceptionally strong commercial fundamentals (value unit clarity, overage transparency, buyer alignment). The gaps are specific and fixable:
          </p>
          <ul className="space-y-2 mb-6">
            {[
            "Publish cost driver formulas (documentation + tooling, not pricing restructure)",
            "Document configurable controls (product feature + policy, not messaging)",
            "Define outcome metric (strategy + sales enablement, not marketing campaign)"].
            map((item, i) =>
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-[hsl(var(--score-high))] mt-0.5 shrink-0" />
                {item}
              </li>
            )}
          </ul>
          <div className="p-4 rounded-xl bg-card/60 border border-border/50 space-y-2">
            <p className="text-sm text-muted-foreground">User feedback identifies scattered symptoms.</p>
            <p className="text-sm text-muted-foreground">AVS diagnoses the structural gaps causing those symptoms.</p>
            <p className="text-sm font-medium mt-2">
              The difference: One leads to reactive support scaling. The other leads to proactive infrastructure fixes that unlock $4.5-6.5M in addressable revenue.
            </p>
          </div>
        </Section>

        <hr className="border-border/50 my-12" />

        {/* Methodology Note */}
        <Section>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Methodology Note:</span> Revenue impact estimates are based on industry benchmarks (OpenView, ChartMogul, ProfitWell) and illustrative customer data, as ElevenLabs' internal metrics are not publicly available. The value of this analysis is the systematic framework for connecting trust gaps to revenue impact, which can be validated with actual company data in an advisory engagement.
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
    </div>);

}