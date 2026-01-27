import { motion } from "framer-motion";
import { ArrowLeft, Layers, MessageSquare, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ValueTempoLogo from "@/assets/ValueTempo_Logo.png";
const Methodology = () => {
  return <div className="min-h-screen bg-background relative overflow-hidden">
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
                AVS Rubric Agent
              </Button>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm font-medium text-primary">
              Methodology
            </Link>
            <Link to="/faq/product-growth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ: Growth</Link>
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

          <h1 className="text-4xl font-bold mb-6">About AVS Rubric Agent: The Methodology</h1>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-xl text-muted-foreground mb-8">A structured, evidence-backed rubric that evaluates public signals and your inputs, then generates a real-time report flagging legibility and predictability gaps with clear confidence and uncertainty labels.</p>

            <p className="text-muted-foreground mb-8">It doesn’t replace funnels, experiments, or analytics. It measures what they miss: whether the market can confidently predict how your AI-native product will behave before committing.</p>

            {/* Intellectual Core Section */}
            <div className="my-12 p-8 rounded-2xl bg-primary/5 border border-primary/20">
              <h2 className="text-2xl font-bold mb-6 text-primary">The Intellectual Core</h2>
              
              <div className="space-y-4 mb-8">
                <p className="text-lg font-medium">Belief is formed before usage.</p>
                <p className="text-lg font-medium">Trust is tested during usage.</p>
              </div>

              <p className="text-muted-foreground mb-8">
                The AVS Rubric Agent focuses on the first moment, where most revenue friction begins. It is also usually the least measured.
              </p>

              <h3 className="text-xl font-semibold mb-4">The Belief Formation Stack</h3>
              
              <div className="grid gap-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-background/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">1. Structure</h4>
                    <p className="text-sm text-muted-foreground">
                      Pricing, limits, workflows, trust surfaces
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-background/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">2. Messaging</h4>
                    <p className="text-sm text-muted-foreground">
                      What you say about it
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-background/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">3. Sentiment</h4>
                    <p className="text-sm text-muted-foreground">
                      How people react after experience
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-12 mb-4">Why Now</h2>
            <p className="text-muted-foreground mb-6">
              In traditional SaaS, behavior was deterministic, features were stable, and trust formed gradually through usage.
            </p>
            <p className="text-muted-foreground mb-6">
              In AI-native products, outcomes vary, costs fluctuate, and workflows are probabilistic—which pushes belief formation upstream, before exploration, adoption and deep usage.
            </p>
            <p className="text-muted-foreground mb-8">
              So, when user expectations are misaligned, growth doesn't fail slowly; it fails suddenly, through sharp drop-offs, stalled activation, or unexpected churn after early excitement.
            </p>

            <h2 className="text-2xl font-bold mt-12 mb-4">The Solution</h2>
            <p className="text-muted-foreground mb-8">
              By scoring publicly observable structure, value units, workflow completion cues, trust surfaces, and risk boundaries, this rubric helps teams align user expectations early, so users know what "done" looks like and what variability to expect.
            </p>

            <h2 className="text-2xl font-bold mt-12 mb-4">The Impact</h2>
            <p className="text-muted-foreground mb-8">
              The goal is not to optimize adoption, but to align belief early enough that retention doesn't collapse later.
            </p>

            <div className="my-12 p-6 rounded-xl bg-secondary/50 border border-border/50">
              <h3 className="text-lg font-semibold mb-4">What This Rubric Agent Does Not Do</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Does not validate internal product performance, reliability, or customer outcomes</li>
                <li>• Does not predict churn, revenue, or conversion rates</li>
                <li>• Does not replace product analytics, finance systems, or customer research</li>
                <li>• Does not independently verify founder-provided clarifications included in exports</li>
                <li>• Does not provide legal, compliance, or security certification</li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                It evaluates external legibility and risk boundaries based on publicly observable information at the time of analysis.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>;
};
export default Methodology;