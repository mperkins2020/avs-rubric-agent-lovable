import { motion } from "framer-motion";
import { ArrowLeft, Layers, MessageSquare, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ValueTempoLogo from "@/assets/ValueTempo_Logo.png";
const FAQProductGrowth = () => {
  const faqs = [{
    question: "Belief is mostly shaped by the words we use on the website. Isn't this just copy and messaging?",
    answer: `The rubric agent does not score messaging quality. It scores whether a buyer or champion can safely infer how the system behaves before adoption. Copy makes claims. Belief forms when those claims are supported by legible structure.

Why this matters: Two products can say "predictable pricing" or "enterprise-ready." But belief depends on whether a buyer can infer what the unit of value actually is, where limits apply, how overages behave, and what happens when something goes wrong.

Example: "Usage-based pricing" is copy. Defined units, examples, caps, and failure modes are structure. The rubric evaluates the second layer, not the slogan.`
  }, {
    question: "If legibility lives inside the product, shouldn't this tool actually use the product?",
    answer: `This assessment evaluates pre-adoption legibility, not in-product experience. It scores what a rational buyer, champion, or procurement team can understand before committing, using only publicly observable signals. It does not claim to validate lived UX or runtime behavior.

Why this matters: Most revenue friction happens before deep product usage—long sales cycles, discount pressure, security and pricing objections, champions struggling to defend the product internally. These failures happen when the system is not legible enough to trust before adoption.

Example: A product may work well in practice, but if workflows are not clearly described, trust controls are implicit, or pricing behavior is opaque—buyers hesitate, even if the product itself is strong.`
  }, {
    question: "We already have deep internal data, product analytics, and user surveys. What would the rubric agent do that is different?",
    answer: `Using the rubric agent, the assessment evaluates what the market can confidently infer externally before talking to a sales rep.

Internal data includes web analytics, in-product behavior, funnels and cohorts, user interviews and surveys. All of that is private and invisible to prospects.

Revenue fragility often appears when internal data looks healthy, external signals create uncertainty, and belief erodes before behavior changes.

Example: Usage remains high, but deals require longer cycles, expansion slows, and buyers ask for repeated reassurance. The gap is not performance. It's legibility.`
  }, {
    question: "Our metrics are objective. This feels subjective. Why should I trust it?",
    answer: `This system makes subjectivity explicit and bounded rather than hiding it behind averages. It separates score (what can be supported by evidence), confidence (how complete that evidence is), and uncertainty (what cannot be inferred).

Why this matters: Internal dashboards often imply certainty even when signals are incomplete. The rubric requires quotes and sources, defaults conservatively when evidence is missing, and labels low confidence explicitly.

Example: Instead of pretending to know, the system is more transparent than most internal reporting. When there isn't enough evidence, it tells you the reason.`
  }, {
    question: "We already monitor sentiment on social platforms. Is the rubric agent also using social sentiment as part of the assessment data?",
    answer: `Social sentiment measures the user's reaction after experience. This assessment does not factor in social sentiment data. The rubric is designed to strictly evaluate prospect's expectations before commitment.

Why: Sentiment captures skewed data—vocal users, post-usage emotion, complaints and praise. But many buyers never post, never complain publicly, and simply don't convert or quietly discount.

Example: A product can have positive sentiment and still stall in procurement, lose on pricing predictability, or face long evaluation cycles. Sentiment didn't catch it. Legibility would.`
  }, {
    question: "If the assessment data matters, why don't our internal metrics already show the problem?",
    answer: `Usually belief erodes before behavior changes. Your company's internal metrics are lagging indicators. External legibility is an early signal.

Common sequence: External ambiguity increases → Sales fills gaps with explanation and discounts → Expansion confidence weakens → Usage plateaus → Metrics finally degrade.

By the time your dashboards flash red, trust erosion has already happened.

Example: While NRR holds, discounting rises. That's belief erosion, not usage failure.`
  }, {
    question: "How is this different from what ChatGPT, Claude, or Gemini can already do?",
    answer: `General-purpose agents can analyze a company. The AVS Rubric Agent is not a smarter agent. It is a stricter, repeatable assessment system that uses a fixed rubric, explicit evidence rules, and calibrated uncertainty.

General-purpose agents browse, summarize, critique, and simulate opinions—but they are unstructured, non-repeatable, non-calibrated, and epistemically sloppy by default. They don't know what to score, what not to score, how conservative to be, or how to express uncertainty consistently. They produce answers, not assessments.

The AVS Rubric Agent uses defined dimensions, follows scoring rules, enforces evidence thresholds, has observability labeling, separates judgment from calibration, refuses to score without proof, defaults downward when signals are missing, surfaces uncertainty explicitly, and produces a shareable, defensible artifact.

Example: Two people running this assessment get the same result. Two ChatGPT conversations rarely do.`
  }, {
    question: "Isn't this just marketing analysis dressed up as rigor?",
    answer: `No. Marketing analysis evaluates persuasion. This evaluates economic legibility and trust structure.

Marketing focuses on narrative, positioning, and differentiation. The rubric focuses on value units, risk boundaries, predictability, and governance and trust surfaces.

Example: Great messaging can attract interest. Only legible structure sustains pricing power and expansion.`
  }, {
    question: "Even if this is true, how is it actionable? I can't just fix a website and expect growth.",
    answer: `This assessment does not prescribe "website fixes." It identifies where the system is not legible enough for the market to trust, and therefore where product, GTM, and roadmap effort is being diluted. The action is not cosmetic. The action is deciding which structural gaps to close next.

Growth comes from experimenting and adapting the system the market can't yet believe, not from explaining a wrong value system louder.

Most teams misinterpret legibility gaps as a messaging problem, a demand gen problem, or a sales enablement problem. In reality, those are symptoms.

The rubric narrows the problem to concrete system gaps: Value unit ambiguity, workflow completion opacity, risk and governance gaps, time-to-done uncertainty. Those gaps are actionable because they map directly to product roadmap priorities, pricing and packaging clarity, documentation and examples, integration decisions, and where sales must explain instead of the product showing.

Example: If the assessment surfaces workflow cutover risk, the action is not "rewrite copy." The action is: clarify the "done" state, reduce manual cleanup, expose finishing paths, add guardrails so users don't hedge back to old tools. That's a product and system decision, not prescribing a landing page change.`
  }];
  return <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src="/lovable-uploads/7944ca33-ab21-48b0-8553-efe2f2835d0c.png" />
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                AVS Rubric Agent
              </Button>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Methodology
            </Link>
            <Link to="/faq/product-growth" className="text-sm font-medium text-primary">FAQ: Growth</Link>
            <Link to="/faq/cfo-revops" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ: RevOps</Link>
          </nav>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }}>
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-4xl font-bold mb-6">FAQs for Product & Growth Leaders</h1>

          {/* Belief Formation Stack */}
          <div className="mb-12 p-8 rounded-2xl bg-primary/5 border border-primary/20">
            <div className="space-y-2 mb-6">
              <p className="text-lg font-semibold">Belief is formed before usage.</p>
              <p className="text-lg font-semibold">Trust is tested during usage.</p>
              <p className="text-muted-foreground">This system focuses on the first moment, where most revenue friction begins.</p>
            </div>

            <h3 className="font-semibold mb-4">The Belief Formation Stack</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <Layers className="w-5 h-5 text-primary" />
                <span><strong>1. Structure</strong> – pricing, limits, workflows, trust surfaces</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span><strong>2. Messaging</strong> – what you say about it</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <Heart className="w-5 h-5 text-primary" />
                <span><strong>3. Sentiment</strong> – how people react after experience</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The AVS Rubric Agent focuses on Layer 1, which is usually the least measured.
            </p>
          </div>

          {/* FAQ List */}
          <div className="space-y-8">
            {faqs.map((faq, index) => <motion.div key={index} initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            delay: index * 0.05
          }} className="p-6 rounded-xl bg-card/50 border border-border/50">
                <h3 className="text-lg font-semibold mb-4">
                  {index + 1}. {faq.question}
                </h3>
                <div className="text-muted-foreground whitespace-pre-line">
                  {faq.answer}
                </div>
              </motion.div>)}
          </div>
        </motion.div>
      </div>
    </div>;
};
export default FAQProductGrowth;