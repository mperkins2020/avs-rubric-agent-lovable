import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Methodology = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src="/lovable-uploads/05acbf98-b629-4a57-bf8d-5a8ffb90eb87.png" />
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                AVS Rubric
              </Button>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm font-medium text-primary">
              Methodology
            </Link>
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
          </nav>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-4xl font-bold mb-6">The AVS Rubric: Methodology</h1>

          <div className="prose prose-lg dark:prose-invert max-w-none">

            {/* Why Trust Infrastructure */}
            <h2 className="text-2xl font-bold mt-12 mb-4">Why Trust Infrastructure Determines AI Product Growth</h2>
            <p className="text-muted-foreground mb-6">
              AI-native products face a unique market constraint: buyers can't predict how your product will behave before purchasing.
            </p>
            <p className="text-muted-foreground mb-6">
              Unlike traditional SaaS where workflows are deterministic ("click here, get this result"), AI outputs vary based on context, model versions, and user inputs. This unpredictability creates a trust gap that breaks traditional growth loops before they can compound.
            </p>
            <p className="text-muted-foreground mb-8">
              The Adaptive Value System (AVS) Rubric measures whether your trust infrastructure is strong enough for growth to accelerate.
            </p>

            {/* What the AVS Rubric Evaluates */}
            <h2 className="text-2xl font-bold mt-12 mb-4">What the AVS Rubric Evaluates</h2>
            <p className="text-muted-foreground mb-8">
              The rubric assesses eight trust dimensions organized in a hierarchical stack. These dimensions aren't independent — gaps in lower layers cascade upward, making upper layers unstable.
            </p>

            {/* The Trust Stack */}
            <h3 className="text-xl font-semibold mb-6">The Trust Stack</h3>
            <div className="space-y-2 mb-12 font-mono text-sm">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="text-xs text-muted-foreground mb-1">LAYER 4: Buyer Alignment</div>
                <div className="text-foreground font-medium">Can the economic buyer approve this?</div>
              </div>
              <div className="text-center text-muted-foreground text-xs">↑ supported by ↑</div>
              <div className="p-4 rounded-lg bg-primary/8 border border-primary/25">
                <div className="text-xs text-muted-foreground mb-1">LAYER 3: Risk Management</div>
                <div className="text-foreground font-medium">Can customers control spend & avoid surprises?</div>
              </div>
              <div className="text-center text-muted-foreground text-xs">↑ enabled by ↑</div>
              <div className="p-4 rounded-lg bg-primary/6 border border-primary/20">
                <div className="text-xs text-muted-foreground mb-1">LAYER 2: Value-Cost Alignment</div>
                <div className="text-foreground font-medium">Can customers predict what they'll pay?</div>
              </div>
              <div className="text-center text-muted-foreground text-xs">↑ requires ↑</div>
              <div className="p-4 rounded-lg bg-primary/4 border border-primary/15">
                <div className="text-xs text-muted-foreground mb-1">LAYER 1: Foundation</div>
                <div className="text-foreground font-medium">Do you know who you serve & what success looks like?</div>
              </div>
            </div>

            {/* The Eight Dimensions */}
            <h2 className="text-2xl font-bold mt-12 mb-6">The Eight Dimensions</h2>

            {/* Layer 1 */}
            <h3 className="text-lg font-semibold text-primary mb-4">Layer 1: Foundation</h3>
            <div className="space-y-6 mb-10">
              <div className="p-5 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-semibold mb-1 text-foreground">1. Product North Star</h4>
                <p className="text-sm italic text-muted-foreground mb-3">Do you have a clearly stated, measurable outcome metric that defines success for your customers?</p>
                <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">What we evaluate:</strong> Whether your primary outcome metric is explicitly stated and operationally defined. Not your company vision, but the quantifiable result customers should track (e.g., "minutes of production-ready audio generated" or "support tickets resolved by AI agent").</p>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Why it matters:</strong> Without a clear North Star, customers can't quantify the value they receive, and you can't align product development and pricing around a single, impactful metric.</p>
              </div>
              <div className="p-5 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-semibold mb-1 text-foreground">2. ICP & Job Clarity</h4>
                <p className="text-sm italic text-muted-foreground mb-3">Is your target user and their workflow problem crystal clear?</p>
                <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">What we evaluate:</strong> Whether your ideal customer profile is explicitly named and their job-to-be-done is anchored in a specific workflow context.</p>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Why it matters:</strong> Generic positioning ("for everyone") means your pricing, packaging, and trust signals can't be optimized for anyone. Specificity enables predictability.</p>
              </div>
            </div>

            {/* Layer 2 */}
            <h3 className="text-lg font-semibold text-primary mb-4">Layer 2: Value-Cost Alignment</h3>
            <div className="space-y-6 mb-10">
              <div className="p-5 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-semibold mb-1 text-foreground">3. Value Unit</h4>
                <p className="text-sm italic text-muted-foreground mb-3">Is your billable unit predictable and auditable?</p>
                <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">What we evaluate:</strong> Whether customers can track, verify, and forecast consumption of the unit you charge for (credits, characters, API calls, minutes, etc.).</p>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Why it matters:</strong> If customers can't independently verify what they've consumed, every bill feels like a black box. Trust erodes with each invoice.</p>
              </div>
              <div className="p-5 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-semibold mb-1 text-foreground">4. Cost Driver Mapping</h4>
                <p className="text-sm italic text-muted-foreground mb-3">Can customers forecast their spend based on usage patterns?</p>
                <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">What we evaluate:</strong> Whether the relationship between customer actions (generate audio, make API call, process document) and costs is explicitly documented with examples.</p>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Why it matters:</strong> Opaque cost drivers lead to "surprise bills." When customers can't map their workflows to costs, they either under-consume (leaving value on table) or over-consume (creating churn-inducing billing surprises).</p>
              </div>
            </div>

            {/* Layer 3 */}
            <h3 className="text-lg font-semibold text-primary mb-4">Layer 3: Risk Management</h3>
            <div className="space-y-6 mb-10">
              <div className="p-5 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-semibold mb-1 text-foreground">5. Pools & Packaging</h4>
                <p className="text-sm italic text-muted-foreground mb-3">Do your tiers separate exploration from production use appropriately?</p>
                <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">What we evaluate:</strong> Whether your pricing tiers match how customers actually adopt AI products (small tests → production rollout → scale) and whether limits align with real usage patterns by segment.</p>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Why it matters:</strong> Misaligned packaging forces customers into tiers that are either too restrictive (blocking expansion) or too expensive (premature commitment). Both create churn.</p>
              </div>
              <div className="p-5 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-semibold mb-1 text-foreground">6. Overages & Risk Allocation</h4>
                <p className="text-sm italic text-muted-foreground mb-3">Is limit behavior explicit and risk fairly shared?</p>
                <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">What we evaluate:</strong> What happens when customers hit plan limits — hard stops, automatic overages, pay-as-you-go rates, contact sales? And whether customers know this behavior before hitting limits.</p>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Why it matters:</strong> Surprise overages are the #1 trust destroyer for usage-based pricing. If risk isn't explicitly allocated in advance, customers default to assuming you're optimizing for surprise revenue.</p>
              </div>
              <div className="p-5 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-semibold mb-1 text-foreground">7. Safety Rails & Trust Surfaces</h4>
                <p className="text-sm italic text-muted-foreground mb-3">Can users set guardrails to prevent billing surprises?</p>
                <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">What we evaluate:</strong> Whether budget caps, usage alerts, rate limits, and spending controls are (a) available, (b) configurable by the customer, and (c) clearly documented with their trigger conditions and actions.</p>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Why it matters:</strong> Without configurable safety rails, customers can't manage risk. High-value customers will either not adopt or will adopt with extreme caution, capping their usage far below what they'd pay for if they had control.</p>
              </div>
            </div>

            {/* Layer 4 */}
            <h3 className="text-lg font-semibold text-primary mb-4">Layer 4: Buyer Alignment</h3>
            <div className="space-y-6 mb-10">
              <div className="p-5 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-semibold mb-1 text-foreground">8. Buyer & Budget Alignment</h4>
                <p className="text-sm italic text-muted-foreground mb-3">Do your pricing plans map to how buyers actually purchase?</p>
                <p className="text-sm text-muted-foreground mb-2"><strong className="text-foreground">What we evaluate:</strong> Whether your pricing structure matches buyer authority levels (individual IC, team lead, department VP, procurement) and typical budget approval cycles (monthly self-serve, quarterly approval, annual contract).</p>
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">Why it matters:</strong> A user might love your product, but if the pricing doesn't match their approval authority or budget cycle, the sale stalls. Misalignment between product user and economic buyer kills conversion regardless of product quality.</p>
              </div>
            </div>

            {/* How It Works */}
            <h2 className="text-2xl font-bold mt-12 mb-4">How It Works</h2>

            <h3 className="text-xl font-semibold mb-4">Input</h3>
            <p className="text-muted-foreground mb-4">
              You enter your company URL. The AVS Rubric Agent then evaluates publicly visible signals across your digital presence:
            </p>
            <ul className="space-y-2 text-muted-foreground mb-6">
              <li><strong className="text-foreground">Pricing page</strong> — Structure, transparency, unit definitions, tier breakdowns</li>
              <li><strong className="text-foreground">Documentation</strong> — Cost calculators, usage examples, constraint explanations, API reference</li>
              <li><strong className="text-foreground">Product outputs</strong> — Publicly shared artifacts (if applicable, e.g., shared Lovable apps, Gamma presentations)</li>
              <li><strong className="text-foreground">Terms of service</strong> — Overage policies, limit behaviors, refund terms, cancellation processes</li>
              <li><strong className="text-foreground">Dashboard screenshots</strong> — If available via public demo or screenshots, we evaluate visibility into usage tracking</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              The rubric does not require you to answer a group of questions manually. Instead, it analyzes what's already public and generates the assessment automatically.
            </p>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-8">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Why this matters:</strong> The report reflects what your prospects and customers can actually see — not what you believe you're communicating. This is the trust infrastructure gap: the difference between what you think is clear and what buyers can actually observe.
              </p>
            </div>

            <h3 className="text-xl font-semibold mb-4">Output</h3>
            <p className="text-muted-foreground mb-4">
              You receive a real-time trust infrastructure score (0–100%) with:
            </p>
            <ul className="space-y-2 text-muted-foreground mb-8">
              <li><strong className="text-foreground">Overall AVS Score</strong> — Your aggregate trust infrastructure strength</li>
              <li><strong className="text-foreground">Dimension-level breakdown</strong> — Scores for each of the 8 dimensions</li>
              <li><strong className="text-foreground">Gap analysis</strong> — Specific findings on where legibility and predictability are weak</li>
              <li><strong className="text-foreground">Confidence labels</strong> — How certain each assessment is (see below)</li>
              <li><strong className="text-foreground">Recommended next steps</strong> — Prioritized actions to close trust gaps</li>
            </ul>

            {/* Confidence Labels */}
            <h2 className="text-2xl font-bold mt-12 mb-4">Confidence Labels</h2>
            <p className="text-muted-foreground mb-6">
              Each dimension in your AVS report includes a confidence score that indicates how certain the assessment is:
            </p>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm border border-border/50 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left p-3 font-semibold text-foreground">Confidence Level</th>
                    <th className="text-left p-3 font-semibold text-foreground">Score Range</th>
                    <th className="text-left p-3 font-semibold text-foreground">What It Means</th>
                    <th className="text-left p-3 font-semibold text-foreground">How to Interpret</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border/50">
                    <td className="p-3 font-medium text-foreground">High Confidence</td>
                    <td className="p-3 text-muted-foreground">≥ 0.75 (75%+)</td>
                    <td className="p-3 text-muted-foreground">The AI model found clear, unambiguous evidence in your public signals. This gap (or strength) is definitive.</td>
                    <td className="p-3 text-muted-foreground">Act on this immediately. This is not a "maybe" — it's a confirmed finding.</td>
                  </tr>
                  <tr className="border-t border-border/50 bg-secondary/20">
                    <td className="p-3 font-medium text-foreground">Medium Confidence</td>
                    <td className="p-3 text-muted-foreground">0.45–0.74 (45–74%)</td>
                    <td className="p-3 text-muted-foreground">The AI model found partial evidence, but some ambiguity exists. This may indicate inconsistent messaging or incomplete documentation.</td>
                    <td className="p-3 text-muted-foreground">Investigate further before taking action. This finding needs human validation. Check if there's context the AI missed (e.g., logged-in experience, private docs).</td>
                  </tr>
                  <tr className="border-t border-border/50">
                    <td className="p-3 font-medium text-foreground">Low Confidence</td>
                    <td className="p-3 text-muted-foreground">&lt; 0.45 (&lt;45%)</td>
                    <td className="p-3 text-muted-foreground">The AI model found minimal or conflicting evidence. This dimension needs deeper human review — the automated assessment may be missing context.</td>
                    <td className="p-3 text-muted-foreground">Don't act on this alone. The signal is weak. May require reviewing logged-in user experience, talking to customers, or contacting your support team to see what they're hearing.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Example interpretation */}
            <h3 className="text-lg font-semibold mb-4">Example interpretation:</h3>
            <div className="space-y-4 mb-8">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Product North Star (High Confidence: 0.82)</strong> → "Your primary outcome metric is not stated on your pricing page, documentation, or product marketing. This is a definitive gap. Your prospects have no North Star to evaluate value against."
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Cost Driver Mapping (Medium Confidence: 0.58)</strong> → "Some cost information is visible (you show per-unit pricing), but the relationship between customer workflows and billing is unclear. Multiple users would need to test to understand actual costs. Needs clarification."
                </p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Safety Rails (Low Confidence: 0.38)</strong> → "Limited public information available on budget controls. The AI couldn't find documentation on spending caps or alerts. May require reviewing the logged-in dashboard or contacting support to confirm whether these exist."
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-8">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Why confidence matters:</strong> Without confidence labels, every finding looks equally important. In reality, a High Confidence gap should trigger immediate action (it's blocking trust), while a Low Confidence finding might just mean the AI couldn't access the right information (you may already have this solved internally).
              </p>
            </div>

            {/* What Traditional Analytics Miss */}
            <h2 className="text-2xl font-bold mt-12 mb-4">What Traditional Analytics Miss</h2>
            <p className="text-muted-foreground mb-4">
              Funnels and product analytics tell you what users do — signups, activation, retention, revenue, churn.
            </p>
            <p className="text-muted-foreground mb-6">
              They don't tell you whether users can predict what will happen before they commit.
            </p>
            <p className="text-muted-foreground mb-4 font-medium">
              The question beneath the conversion metric:
            </p>
            <ul className="space-y-2 text-muted-foreground mb-6">
              <li>Can buyers forecast what this will cost before purchasing?</li>
              <li>Can they predict how the product will behave in their specific context?</li>
              <li>Can they verify they're getting the value they're paying for?</li>
              <li>Can they control risk (spend caps, usage limits, fallback options)?</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              When the answer is "no," growth loops leak:
            </p>
            <ul className="space-y-2 text-muted-foreground mb-6">
              <li>Users might sign up, but they won't invite teammates (uncertainty about cost allocation)</li>
              <li>Users might activate, but they won't share outputs (can't predict if it will work for recipient)</li>
              <li>Users might renew once, but they won't expand usage (fear of surprise bills)</li>
              <li>Users might hit their first success, but they won't trust it to scale (no confidence in consistency)</li>
            </ul>
            <p className="text-muted-foreground mb-4 font-semibold">
              The trust gap stops compounding.
            </p>
            <p className="text-muted-foreground mb-8">
              The AVS Rubric identifies these gaps before they show up in your retention curve — by measuring whether the infrastructure for trust exists in your public signals.
            </p>

            {/* Why This Matters for AI Products */}
            <h2 className="text-2xl font-bold mt-12 mb-4">Why This Matters for AI Products</h2>
            <p className="text-muted-foreground mb-6">
              Traditional SaaS could rely on free trials and generous freemium tiers to build trust through experience. Try the product, see it work, convert.
            </p>
            <p className="text-muted-foreground mb-4">
              But AI products break this model in two ways:
            </p>

            <div className="space-y-6 mb-8">
              <div className="p-5 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-semibold mb-2 text-foreground">1. Free trials are expensive</h4>
                <p className="text-sm text-muted-foreground">
                  LLM inference costs, GPU time, and API call expenses make generous free tiers economically unsustainable. Many AI products cap free tiers aggressively or require credit cards upfront — which means trust must exist before trial, not during it.
                </p>
              </div>
              <div className="p-5 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="font-semibold mb-2 text-foreground">2. One good output doesn't guarantee the next</h4>
                <p className="text-sm text-muted-foreground">
                  In deterministic SaaS, if a feature works once, it works every time. In AI products, output quality varies by input, context, model version, and even time of day (rate limiting, queue depth, model load).
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  A single successful trial doesn't give buyers confidence the product will work reliably for their use case at scale.
                </p>
              </div>
            </div>

            <p className="text-muted-foreground mb-4">
              This means trust must be built through signals (transparent pricing, clear constraints, explicit guardrails, documented failure modes) rather than just experience.
            </p>
            <p className="text-muted-foreground font-semibold mb-8">
              AVS measures whether those signals exist.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Methodology;
