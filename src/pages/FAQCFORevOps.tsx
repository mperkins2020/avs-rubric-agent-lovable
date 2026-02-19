import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ValueTempoLogo from "@/assets/ValueTempo_Logo.png";
const FAQCFORevOps = () => {
  const faqs = [{
    question: "We already have Stripe, billing, cohorts, and a data warehouse. Why do we need this?",
    answer: `Your systems measure what customers did after they committed. This assessment measures whether your commercial system is sufficiently legible to reduce the likelihood of surprises by making expectations and risk boundaries clearer before commitment.

Here is why: Billing data tells you churn and downgrades after trust breaks. This rubric surfaces expectation gaps that cause sudden churn, refund pressure, and unpredictable usage patterns.

Example: If pricing units or limits are unclear externally, customers onboard with one expectation and churn when reality diverges.`
  }, {
    question: "Public info isn't reliable, it's marketing.",
    answer: `Correct, and that's precisely why it matters. Buyers make risk judgments based on what they can infer externally. If your risk boundaries aren't legible, they assume the worst or adopt with wrong expectations.

Here is why: Procurement, finance approvers, and champions need clear predictability signals. If those signals are missing, either adoption slows or churn spikes after the trial honeymoon.

Example: "Usage-based" without clear units, examples, and caps creates billing anxiety later.`
  }, {
    question: "This seems subjective. I care about auditability and repeatability.",
    answer: `The rubric is conservative and repeatable: fixed dimensions, explicit evidence thresholds, and a separate confidence score. It doesn't guess.

Here is why: Scores are tied to quoted evidence and URLs. Confidence reflects evidence coverage, not performance.

Example: Two teams running the same domain get the same score based on the same public sources.

Note: Rubric runs are designed to be repeatable on the same public inputs at the time of analysis, with evidence captured via quotes and URLs. Results may vary if public pages change.`
  }, {
    question: "How does this reduce churn or improve NRR?",
    answer: `Surfacing expectation and predictability gaps early helps teams reduce the risk of surprise-driven drop-off and churn in AI-native, product-led adoption.

Here is why: Expectation alignment reduces "trial excitement → sudden drop-off" patterns. Clear risk boundaries reduce refund requests and escalations.

Example: If you make "done" criteria and variability explicit, customers adopt the right workflows and stop blaming the product for predictable edge cases.`
  }, {
    question: "We already do CS health scoring. Isn't that enough?",
    answer: `Health scoring is downstream. This rubric is upstream. It evaluates whether the commercial system sets customers up for predictable success before they become "health scored."

Here is why: Health scores detect churn risk once it exists. This tool helps identify expectation mismatches early, which can reduce churn risk when addressed.

Example: Customers can be "green" on usage, but still churn when billing or reliability surprises hit a critical workflow.`
  }, {
    question: "What's the ROI? What decisions does this change?",
    answer: `It improves revenue quality by making expectation and predictability risks visible early and creating a shared artifact the org can align on before scaling.

Here is why. This report helps teams identify:
• Where workflow cutover risk is structurally higher, due to unclear "done" states, weak trust surfaces, or ambiguous handoffs.
• Which parts of the value system require manual explanation today, increasing downstream churn risk if left unresolved.
• Where expectation misalignment is most likely, even if current usage looks healthy.

Example: If the rubric surfaces weak signals around workflow completion or trust boundaries, it suggests that some workflows may require hedging or manual cleanup, increasing the risk of surprise and drop-off later unless clarified or reinforced.`
  }, {
    question: "Won't this just tell us to rewrite our website?",
    answer: `No. The action is not cosmetic. It's structural. The output is a prioritization lens for product, pricing, and policy clarity.

Here is why. Common structural fixes include:
• Clarifying value units and limits.
• Making failure modes and recovery paths explicit.
• Defining what "done" means and how customers reach it reliably.

Example: Publishing concrete pricing examples and "what happens when…" policies can reduce support load and lower surprise-driven churn risk, especially when paired with clear product mechanisms.`
  }, {
    question: "How is this different from using ChatGPT to review our site?",
    answer: `General agents can review and summarize. This system produces a structured, evidence-backed assessment with explicit rules and uncertainty labeling.

Here is why. This system has:
• Fixed dimensions and scoring rules.
• Evidence thresholds and citations.
• Confidence and observability separation.

Example: The exported report in PDF is designed for internal alignment and governance review, not a one-off conversation.`
  }, {
    question: "If you don't store internal info, why export a PDF?",
    answer: `Because finance and ops decisions require a shareable artifact, and links imply persistence. The PDF supports internal alignment without storing sensitive internal context. In the future, if users request us to save the provided data and want to share the report internally via a sharable link, we will consider adding it.

Here is why:
• Default export includes public evidence only.
• Optional opt-in includes founder clarifications clearly labeled as not independently verified.

Example: A CFO can forward the report to GTM, Product, and CS and align on risks without exposing internal dashboards.`
  }];
  return <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src="/lovable-uploads/5ba26099-86b5-4b34-8056-62c0f9a3cd7f.png" />
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                AVS Rubric
              </Button>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Methodology
            </Link>
            <Link to="/faq/product-growth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ: Growth</Link>
            <Link to="/faq/cfo-revops" className="text-sm font-medium text-primary">FAQ: RevOps</Link>
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

          <h1 className="text-4xl font-bold mb-6">FAQs for CFO and RevOps</h1>

          {/* Intro */}
          <div className="mb-12 p-6 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-muted-foreground mb-4">
              The AVS Rubric is an upstream revenue-quality tool. It surfaces the expectation and predictability gaps that create sudden churn and forecasting volatility in AI-native products. The goal is not to optimize adoption, but to align belief early enough that retention doesn't collapse later.
            </p>
            <p className="text-sm text-muted-foreground">
              This doesn't predict churn. It surfaces the structural conditions that make churn more likely if expectations aren't aligned early.
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
export default FAQCFORevOps;