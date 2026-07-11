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
  band: "Trusted",
  bandClass: "text-score-medium bg-score-medium/10 border-score-medium/30",
  bandDesc: "Strong foundation — closing remaining gaps can unlock 2–5% ARR uplift",
  score: 12,
  maxScore: 16,
  percentage: "75%",
  strengths: {
    title: "ICP and job clarity",
    desc: "Lovable clearly identifies its target users, from individual builders to enterprises, and articulates concrete job statements with inputs and outputs. This specificity helps potential customers quickly understand if the product is for them.",
    enables: "Enables: Effective marketing and sales targeting, reducing CAC and ensuring product-market fit.",
  },
  weaknesses: {
    title: "Product north star",
    desc: "Lovable lacks an explicit, measurable predictability outcome or target for its value delivery. While it states the value of building apps with AI, it doesn't quantify the expected impact or provide metrics for economic predictability.",
    impact: "Impact: Customers may struggle to forecast the economic benefits or costs of using Lovable, making it harder to justify investment.",
  },
  breakpoints: [
    { title: "Cost predictability for complex tasks", desc: "The 'Build mode' pricing states cost depends on complexity, but without a clear formula, users might face unexpected credit consumption for non-trivial tasks." },
    { title: "Enterprise billing and overage policies", desc: "The lack of publicly documented enterprise-specific payment methods (invoice/PO) and true-up policies could be a significant barrier for larger organizations." },
  ],
  dimensions: [
    { n: "01", name: "Product north star", conf: "Medium", score: "1/2", color: "text-score-medium bg-score-medium/10" },
    { n: "02", name: "ICP and job clarity", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "03", name: "Buyer and budget alignment", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "04", name: "Value unit", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
  ],
};

const hexExample: ExampleData = {
  label: "Hex report example",
  company: "Hex",
  band: "Trusted",
  bandClass: "text-score-medium bg-score-medium/10 border-score-medium/30",
  bandDesc: "Strong foundation — closing remaining gaps can unlock 2–5% ARR uplift",
  score: 12,
  maxScore: 16,
  percentage: "75%",
  strengths: {
    title: "ICP and job clarity",
    desc: "Hex clearly identifies its target audience as data teams (analysts, scientists, leaders) and provides concrete examples of analytical jobs and workflows, such as building retention charts or sales forecasts with AI agents.",
    enables: "Enables: Potential customers quickly understand if Hex fits their data challenges, reducing sales friction and improving adoption.",
  },
  weaknesses: {
    title: "Product north star",
    desc: "Hex lacks a single, clearly articulated and measurable primary outcome metric with a defined target. Examples of AI agent tasks exist, but a universal 'north star' metric is not evident.",
    impact: "Impact: Harder to quantify business impact and justify ROI around a shared success metric.",
  },
  breakpoints: [
    { title: "Unexpected Credit Consumption", desc: "The 'complexity of task' for AI features is a vague cost driver — without clear formulas or a pre-flight estimator, users may consume more credits than anticipated." },
    { title: "Lack of Granular Cost Control", desc: "Explicit configurable budget caps and detailed usage alerts for credits and compute are not publicly documented, risking overspend before users are aware." },
  ],
  dimensions: [
    { n: "01", name: "Product north star", conf: "Medium", score: "1/2", color: "text-score-medium bg-score-medium/10" },
    { n: "02", name: "ICP and job clarity", conf: "Medium", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "03", name: "Buyer and budget alignment", conf: "Medium", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "04", name: "Value unit", conf: "Medium", score: "2/2", color: "text-score-high bg-score-high/10" },
  ],
};

const deepgramExample: ExampleData = {
  label: "Deepgram report example",
  company: "Deepgram",
  band: "Exemplary",
  bandClass: "text-score-high bg-score-high/10 border-score-high/30",
  bandDesc: "Enterprise-ready trust infrastructure — supports fastest sales cycles",
  score: 16,
  maxScore: 16,
  percentage: "100%",
  strengths: {
    title: "Value unit",
    desc: "Deepgram provides exceptionally clear and granular definitions for its billing units, including per-second billing for audio and per-character for TTS, with explicit calculations for multichannel audio.",
    enables: "Enables: Customers can precisely understand and predict costs, fostering trust and accurate budgeting for their AI applications.",
  },
  weaknesses: {
    title: "No material weaknesses",
    desc: "All scored dimensions land at 2/2 with High confidence. Remaining opportunities are refinements, not gaps — see Trust Breakpoints for forward-looking risks.",
    impact: "Impact: Buyers can evaluate independently with minimal follow-up questions.",
  },
  breakpoints: [
    { title: "Cost Forecasting", desc: "Customers may experience unexpected costs if they cannot accurately estimate usage before deployment, especially with complex AI models and add-ons, due to the absence of public forecasting tools." },
    { title: "Usage Visibility", desc: "Without granular usage dashboards or explicit alerts for cost/usage thresholds, customers may lack the controls to manage spend proactively." },
  ],
  dimensions: [
    { n: "01", name: "Product north star", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "02", name: "ICP and job clarity", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "03", name: "Buyer and budget alignment", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "04", name: "Value unit", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
  ],
};

const relevanceExample: ExampleData = {
  label: "Relevance AI report example",
  company: "Relevance AI",
  band: "Exemplary",
  bandClass: "text-score-high bg-score-high/10 border-score-high/30",
  bandDesc: "Enterprise-ready trust infrastructure — supports fastest sales cycles",
  score: 13,
  maxScore: 16,
  percentage: "81%",
  strengths: {
    title: "ICP and job clarity",
    desc: "The target audience (Sales, CS, Marketing, HR leaders) and their specific job-to-be-done (automating workflows, personalizing outreach) are clearly articulated across the homepage and use case pages.",
    enables: "Enables: Potential customers quickly identify if the product is a fit, reducing sales friction and improving marketing effectiveness.",
  },
  weaknesses: {
    title: "Cost driver mapping",
    desc: "Explicit formulas detailing how product behavior translates into specific quantities of 'Actions' or 'Vendor Credits' are not publicly documented.",
    impact: "Impact: Without clear metering formulas, customers can struggle to forecast usage and costs for complex workflows, leading to potential billing surprises.",
  },
  breakpoints: [
    { title: "Cost predictability for complex workflows", desc: "Without explicit metering formulas for 'Actions' and 'Vendor Credits', customers might struggle to accurately predict costs for intricate agent workflows, leading to unexpected bills." },
    { title: "Overage management without explicit caps", desc: "While usage alerts exist, the absence of publicly documented hard caps or clear grace buffers for overages could lead to uncontrolled spend if alerts are missed." },
  ],
  dimensions: [
    { n: "01", name: "Product north star", conf: "Medium", score: "1/2", color: "text-score-medium bg-score-medium/10" },
    { n: "02", name: "ICP and job clarity", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "03", name: "Buyer and budget alignment", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
    { n: "04", name: "Value unit", conf: "High", score: "2/2", color: "text-score-high bg-score-high/10" },
  ],
};

const examples = [lovableExample, hexExample, deepgramExample, relevanceExample];

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
