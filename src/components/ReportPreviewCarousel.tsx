import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SLIDE_DURATION = 6000; // ms per example

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

const hexExample: ExampleData = {
  label: "Hex report example",
  company: "Hex",
  band: "Emerging",
  bandClass: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
  bandDesc: "Key elements in place — structural gaps are costing you deals",
  score: 8,
  maxScore: 16,
  percentage: "50%",
  strengths: {
    title: "ICP and job clarity",
    desc: "Hex clearly articulates its target audience, including both technical and non-technical users.",
    enables: "Enables: Tailored messaging across segments.",
  },
  weaknesses: {
    title: "Product north star",
    desc: "Hex lacks a clearly defined, measurable primary outcome metric.",
    impact: "Impact: Hard to quantify value delivery.",
  },
  breakpoints: [
    { title: "Unpredictable Usage Costs", desc: "If metering for 'agent credits' and 'pay-as-you-go compute' are not transparent, customers face unexpected bills." },
    { title: "Lack of Cost Control", desc: "Without explicit caps, alerts, or clear overage policies, customers may feel they lack spending control." },
  ],
  dimensions: [
    { n: "01", name: "Product north star", conf: "Medium", score: "1/2", color: "text-yellow-500 bg-yellow-500/15" },
    { n: "02", name: "ICP and job clarity", conf: "High", score: "2/2", color: "text-score-high bg-score-high/15" },
    { n: "03", name: "Buyer and budget alignment", conf: "High", score: "2/2", color: "text-score-high bg-score-high/15" },
    { n: "04", name: "Value unit", conf: "Medium", score: "1/2", color: "text-yellow-500 bg-yellow-500/15" },
  ],
};

const lovableExample: ExampleData = {
  label: "Lovable report example",
  company: "Lovable",
  band: "Advanced",
  bandClass: "text-score-high bg-score-high/10 border-score-high/30",
  bandDesc: "Enterprise-ready trust infrastructure — supports fastest sales cycles",
  score: 15,
  maxScore: 16,
  percentage: "94%",
  strengths: {
    title: "ICP and job clarity",
    desc: "Lovable clearly articulates its target audience segments and the specific problems it solves for each, supported by a comprehensive list of use cases and templates.",
    enables: "Enables: Potential customers can quickly identify if Lovable is the right solution, reducing friction in the sales cycle.",
  },
  weaknesses: {
    title: "Cost driver mapping",
    desc: "While credit usage is explained, the underlying cost drivers and their direct impact on credit consumption are not fully detailed.",
    impact: "Impact: Users may find it difficult to optimize usage or forecast costs beyond 'message complexity'.",
  },
  breakpoints: [
    { title: "Unexpected Overage Costs", desc: "If a complex prompt unexpectedly consumes a large number of credits, users could face higher-than-anticipated bills." },
    { title: "Performance and Scalability", desc: "The lack of explicit performance guarantees or SLAs could lead to trust issues for enterprise users." },
  ],
  dimensions: [
    { n: "01", name: "Product north star", conf: "High", score: "2/2", color: "text-score-high bg-score-high/15" },
    { n: "02", name: "ICP and job clarity", conf: "High", score: "2/2", color: "text-score-high bg-score-high/15" },
    { n: "03", name: "Buyer and budget alignment", conf: "High", score: "2/2", color: "text-score-high bg-score-high/15" },
    { n: "04", name: "Value unit", conf: "High", score: "2/2", color: "text-score-high bg-score-high/15" },
  ],
};

const examples = [hexExample, lovableExample];

const slideVariants = {
  enter: { x: "100%", opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: "-100%", opacity: 0 },
};

function PreviewCard({ data }: { data: ExampleData }) {
  const circumference = 2 * Math.PI * 34;
  const dashOffset = circumference * (1 - data.score / data.maxScore);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* 1 - Score Card */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Overall score & band</p>
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-card/50">
          <div className="p-5 bg-[hsl(220,30%,8%)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-bold text-foreground mb-1">{data.company}</div>
                <span className={`inline-block px-3 py-1 rounded-lg border text-sm font-semibold ${data.bandClass}`}>{data.band}</span>
                <p className="text-xs text-muted-foreground mt-1.5">{data.bandDesc}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="34" className="stroke-secondary" strokeWidth="6" fill="none" />
                    <circle cx="40" cy="40" r="34" stroke="hsl(var(--primary))" strokeWidth="6" fill="none" strokeLinecap="round"
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={`${dashOffset}`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-xl font-bold text-foreground">{data.score}</span>
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
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background/95 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* 2 - Analysis Summary */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Strengths & weaknesses</p>
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-card/50">
          <div className="p-5 bg-[hsl(220,30%,8%)]">
            <h3 className="font-bold text-base mb-3">Analysis Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-score-high/20 flex items-center justify-center">
                    <span className="text-score-high text-xs">↗</span>
                  </div>
                  <span className="font-semibold text-sm">Top Strengths</span>
                </div>
                <div className="text-xs font-medium mb-1">{data.strengths.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{data.strengths.desc}</div>
                <div className="text-xs text-score-high mt-1.5">{data.strengths.enables}</div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-score-low/20 flex items-center justify-center">
                    <span className="text-score-low text-xs">↘</span>
                  </div>
                  <span className="font-semibold text-sm">Top Weaknesses</span>
                </div>
                <div className="text-xs font-medium mb-1">{data.weaknesses.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{data.weaknesses.desc}</div>
                <div className="text-xs text-score-low mt-1.5">{data.weaknesses.impact}</div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background/95 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* 3 - Trust Breakpoints */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Trust breakpoints</p>
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-card/50">
          <div className="p-5 bg-[hsl(220,30%,8%)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-yellow-500/20 flex items-center justify-center">
                <span className="text-yellow-500 text-xs">⚠</span>
              </div>
              <span className="font-bold text-base">Trust Breakpoints</span>
              <span className="text-xs text-muted-foreground">Where billing anxiety may surface</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {data.breakpoints.map((bp) => (
                <div key={bp.title} className="p-3 rounded-lg bg-secondary/40 border border-yellow-500/10">
                  <div className="text-xs font-semibold text-yellow-500 mb-1">{bp.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{bp.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background/95 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* 4 - Dimension Scores */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Dimension scores</p>
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-card/50">
          <div className="p-5 bg-[hsl(220,30%,8%)]">
            <h3 className="font-bold text-base mb-3">Dimension Scores</h3>
            <div className="space-y-1.5">
              {data.dimensions.map((d) => (
                <div key={d.n} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground font-mono">{d.n}</span>
                    <span className="text-xs font-medium">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${d.conf === "High" ? "text-score-high" : "text-yellow-500"}`}>{d.conf}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${d.color}`}>{d.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background/95 to-transparent pointer-events-none" />
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
      className="mt-20 max-w-4xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">What your report looks like</h2>
        <div className="h-6 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -60, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="text-sm text-muted-foreground absolute inset-0 flex items-center justify-center"
            >
              {examples[index].label}
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
    </motion.div>
  );
}
