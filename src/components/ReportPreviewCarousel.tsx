import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const SLIDE_DURATION = 6000;

interface ExampleData {
  label: string;
  company: string;
  band: string;
  bandClass: string;
  bandDesc: string;
  score: number;
  maxScore: number;
  percentage: string;
  strengths: { title: string; desc: string; enables: string };
  weaknesses: { title: string; desc: string; impact: string };
  breakpoints: { title: string; desc: string }[];
  dimensions: { n: string; name: string; conf: string; score: string; color: string }[];
}

const lovableExample: ExampleData = {
  label: "Lovable report example",
  company: "Lovable",
  band: "Trusted Stage",
  bandClass: "text-score-medium bg-score-medium/10 border-score-medium/30",
  bandDesc: "Core trust signals in place — cost predictability gaps remain",
  score: 11,
  maxScore: 16,
  percentage: "69%",
  strengths: {
    title: "Buyer and budget alignment",
    desc: "Lovable offers clear tiered pricing with monthly and annual options, plus detailed instructions for managing subscriptions and accessing invoices via Stripe.",
    enables: "Enables: Easy subscription management and budget planning.",
  },
  weaknesses: {
    title: "Cost driver mapping",
    desc: "While 'credits' are the value unit, the underlying cost drivers (e.g., AI models, compute) and their formulas are not publicly detailed.",
    impact: "Impact: Hard for users to optimize usage or forecast costs.",
  },
  breakpoints: [
    { title: "Variable Credit Consumption", desc: "Without an explicit predictability metric, customers may struggle to forecast costs as 'message complexity' drives credit use." },
    { title: "Limited Safety Rail Visibility", desc: "Budget caps, alerting mechanisms, and audit logs are not fully documented publicly, creating governance uncertainty." },
  ],
  dimensions: [
    { n: "01", name: "Product north star", conf: "Medium", score: "1/2", color: "text-score-medium bg-score-medium/10" },
    { n: "02", name: "ICP and job clarity", conf: "Medium", score: "1/2", color: "text-score-medium bg-score-medium/10" },
    { n: "03", name: "Buyer and budget alignment", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "04", name: "Value unit", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
  ],
};

const hexExample: ExampleData = {
  label: "Hex report example",
  company: "Hex",
  band: "Trusted Stage",
  bandClass: "text-score-medium bg-score-medium/10 border-score-medium/30",
  bandDesc: "Strong packaging — credit metering transparency is the gap",
  score: 11,
  maxScore: 16,
  percentage: "69%",
  strengths: {
    title: "ICP and job clarity",
    desc: "Hex clearly defines its target audience as data teams and business users, with specific use cases and customer testimonials illustrating value.",
    enables: "Enables: Faster qualification and reduced sales friction.",
  },
  weaknesses: {
    title: "Value unit",
    desc: "While 'credits' are a billable unit, their definition and metering formula are not explicitly detailed — it's unclear how actions translate into credit consumption.",
    impact: "Impact: Customer confusion and unexpected costs erode trust.",
  },
  breakpoints: [
    { title: "Opaque Credit Metering", desc: "The exact formula linking AI features (agentic notebooks, quick edits) to credit consumption is not documented." },
    { title: "Missing Overage Controls", desc: "Cap policies, alert mechanisms, and grace buffers for credit overages are not publicly detailed." },
  ],
  dimensions: [
    { n: "01", name: "Product north star", conf: "Low", score: "1/2", color: "text-score-medium bg-score-medium/10" },
    { n: "02", name: "ICP and job clarity", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "03", name: "Buyer and budget alignment", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "04", name: "Value unit", conf: "Medium", score: "1/2", color: "text-score-medium bg-score-medium/10" },
  ],
};

const deepgramExample: ExampleData = {
  label: "Deepgram report example",
  company: "Deepgram",
  band: "Advanced Stage",
  bandClass: "text-score-high bg-score-high/10 border-score-high/30",
  bandDesc: "Transparent unit pricing — supports confident developer adoption",
  score: 13,
  maxScore: 16,
  percentage: "81%",
  strengths: {
    title: "Value unit",
    desc: "Deepgram uses precise, value-linked billing units (per-second audio minutes, per-character TTS, per-token AI features) and clearly defines how multichannel audio is calculated.",
    enables: "Enables: Accurate cost prediction and efficient resource planning.",
  },
  weaknesses: {
    title: "Cost driver mapping",
    desc: "Per-unit pricing is published, but explicit formulas linking specific product behaviors to driver quantities are not detailed, and no in-product cost estimator is documented.",
    impact: "Impact: Hard to forecast costs for complex usage patterns.",
  },
  breakpoints: [
    { title: "Concurrency Limit Surprises", desc: "Pay-As-You-Go requests above concurrency limits may be queued or rejected — limit behavior is not consolidated in docs." },
    { title: "No Public Budget Caps", desc: "Configurable budget caps, granular dashboards, and explicit alerting policies are not publicly visible across tiers." },
  ],
  dimensions: [
    { n: "01", name: "Product north star", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "02", name: "ICP and job clarity", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "03", name: "Value unit", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "04", name: "Cost driver mapping", conf: "Medium", score: "1/2", color: "text-score-medium bg-score-medium/10" },
  ],
};

const momentumExample: ExampleData = {
  label: "Momentum AI report example",
  company: "Momentum AI",
  band: "Trusted Stage",
  bandClass: "text-score-medium bg-score-medium/10 border-score-medium/30",
  bandDesc: "Clear ICP — usage-based add-on lacks pricing transparency",
  score: 9,
  maxScore: 16,
  percentage: "56%",
  strengths: {
    title: "ICP and job clarity",
    desc: "Momentum AI clearly identifies its target buyer roles (CROs, RevOps, Sales Managers) and explicitly states the core GTM workflows it automates.",
    enables: "Enables: Faster lead qualification and reduced sales friction.",
  },
  weaknesses: {
    title: "Cost driver mapping",
    desc: "Underlying cost drivers (tokens, call minutes, API calls) are not publicly disclosed, nor how they relate to per-user pricing or 'usage-based credits' for Deep Research.",
    impact: "Impact: Customers cannot forecast usage or AI feature costs.",
  },
  breakpoints: [
    { title: "Undefined Deep Research Credits", desc: "The 'usage-based credits' add-on lacks definition, overage pricing, and customer controls — creating surprise risk." },
    { title: "Missing Safety Rails", desc: "Budget caps, usage caps, rate limits, and audit dashboards are not publicly documented for any tier." },
  ],
  dimensions: [
    { n: "01", name: "Product north star", conf: "Low", score: "1/2", color: "text-score-medium bg-score-medium/10" },
    { n: "02", name: "ICP and job clarity", conf: "Medium", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "03", name: "Value unit", conf: "Low", score: "1/2", color: "text-score-medium bg-score-medium/10" },
    { n: "04", name: "Cost driver mapping", conf: "Low", score: "1/2", color: "text-score-medium bg-score-medium/10" },
  ],
};

const examples = [lovableExample, hexExample, deepgramExample, momentumExample];

const slideVariants = {
  enter: { x: "100%", opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: "-100%", opacity: 0 },
};

function PreviewCard({ data }: { data: ExampleData }) {
  const circumference = 2 * Math.PI * 34;
  const dashOffset = circumference * (1 - data.score / data.maxScore);

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* 1 - Score Card */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Overall score & band</p>
        <div className="bg-card border border-border rounded-3xl p-6 shadow-vt-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold mb-1">{data.company}</div>
              <span className={`inline-block px-3 py-1 rounded-full border text-sm font-semibold ${data.bandClass}`}>{data.band}</span>
              <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">{data.bandDesc}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="34" className="stroke-secondary" strokeWidth="6" fill="none" />
                  <circle cx="40" cy="40" r="34" stroke="hsl(var(--vt-cyan))" strokeWidth="6" fill="none" strokeLinecap="round"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={`${dashOffset}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-xl font-bold">{data.score}</span>
                  <span className="text-[10px] text-muted-foreground">/ {data.maxScore}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-mono font-bold gradient-text">{data.percentage}</div>
                <div className="text-xs text-muted-foreground">Value System Score</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2 - Analysis Summary */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Strengths & weaknesses</p>
        <div className="bg-card border border-border rounded-3xl p-6 shadow-vt-sm">
          <h3 className="font-bold text-base mb-3">Analysis Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-secondary border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded bg-score-high/10 flex items-center justify-center">
                  <span className="text-score-high text-xs">↗</span>
                </div>
                <span className="font-semibold text-sm">Top Strengths</span>
              </div>
              <div className="text-xs font-medium mb-1">{data.strengths.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{data.strengths.desc}</div>
              <div className="text-xs text-score-high mt-1.5">{data.strengths.enables}</div>
            </div>
            <div className="p-3 rounded-xl bg-secondary border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded bg-score-low/10 flex items-center justify-center">
                  <span className="text-score-low text-xs">↘</span>
                </div>
                <span className="font-semibold text-sm">Top Weaknesses</span>
              </div>
              <div className="text-xs font-medium mb-1">{data.weaknesses.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{data.weaknesses.desc}</div>
              <div className="text-xs text-score-low mt-1.5">{data.weaknesses.impact}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 - Trust Breakpoints */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Trust breakpoints</p>
        <div className="bg-card border border-border rounded-3xl p-6 shadow-vt-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-vt-coral/10 flex items-center justify-center">
              <span className="text-vt-coral text-xs">⚠</span>
            </div>
            <span className="font-bold text-base">Trust Breakpoints</span>
            <span className="text-xs text-muted-foreground">Where deals stall silently</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {data.breakpoints.map((bp) => (
              <div key={bp.title} className="p-3 rounded-xl bg-secondary border border-vt-coral/10">
                <div className="text-xs font-semibold text-vt-coral mb-1">{bp.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{bp.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 - Dimension Scores */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Dimension scores</p>
        <div className="bg-card border border-border rounded-3xl p-6 shadow-vt-sm">
          <h3 className="font-bold text-base mb-3">Dimension Scores</h3>
          <div className="space-y-1.5">
            {data.dimensions.map((d) => (
              <div key={d.n} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground font-mono">{d.n}</span>
                  <span className="text-xs font-medium">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${d.conf === "High" ? "text-score-high" : "text-score-medium"}`}>{d.conf}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${d.color}`}>{d.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportPreviewCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % examples.length);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Example: Where Buyer Confidence Breaks</h2>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-2 whitespace-pre-line">
          See how the analysis separates visible gaps from issues that may slow{"\n"}evaluation, approval, or expansion.
        </p>
        <div className="h-6 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -60, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="text-xs text-muted-foreground absolute inset-0 flex items-center justify-center"
            >
              Example: {examples[index].company}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <PreviewCard data={examples[index]} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="text-center mt-10">
        <Button
          size="lg"
          className="bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[20px] px-8 h-12 font-semibold shadow-vt-sm transition-shadow hover:shadow-[0_12px_40px_-10px_hsl(var(--vt-violet)/0.6)]"
          onClick={() => {
            const el = document.getElementById('url-input');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          Check Your Buyability Score
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
}
