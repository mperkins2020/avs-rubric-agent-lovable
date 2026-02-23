import { motion, AnimatePresence } from "framer-motion";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ChevronDown, Layers, Target, DollarSign, Shield, Users, BookOpen, BarChart3, Lightbulb, List, X } from "lucide-react";
import { Link } from "react-router-dom";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const tocSections = [
  { id: "why-trust", label: "Why Trust Infrastructure Matters" },
  { id: "trust-stack", label: "The Trust Stack" },
  { id: "dimensions", label: "The Eight Dimensions" },
  { id: "how-it-works", label: "How It Works" },
  { id: "confidence", label: "Confidence Labels" },
  { id: "analytics-miss", label: "What Analytics Miss" },
  { id: "why-ai", label: "Why This Matters for AI" },
];

const Methodology = () => {
  const [activeSection, setActiveSection] = useState("");
  const [showScrolled, setShowScrolled] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );
    tocSections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrolled(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileTocOpen(false);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src="/lovable-uploads/05acbf98-b629-4a57-bf8d-5a8ffb90eb87.png" />
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">AVS Rubric</Button>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm font-medium text-primary">Methodology</Link>
            <ResourcesDropdown />
          </nav>
        </div>
      </header>

      {/* Mobile floating TOC */}
      <AnimatePresence>
        {showScrolled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="lg:hidden fixed bottom-6 right-6 z-50"
          >
            {mobileTocOpen ? (
              <div className="bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-4 w-64">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">On this page</p>
                  <button onClick={() => setMobileTocOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {tocSections.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => scrollTo(id)}
                      className={`block w-full text-left text-sm py-1.5 px-3 rounded-md transition-colors ${
                        activeSection === id
                          ? "text-primary bg-primary/10 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setMobileTocOpen(true)}
                className="p-3 rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-105 transition-transform"
              >
                <List className="w-5 h-5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="flex gap-10 max-w-6xl mx-auto">

          {/* Sticky TOC — desktop only */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">On this page</p>
              {tocSections.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`block w-full text-left text-sm py-1.5 px-3 rounded-md transition-colors ${
                    activeSection === id
                      ? "text-primary bg-primary/10 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>

              <h1 className="text-4xl font-bold mb-3 tracking-tight">The AVS Rubric: Methodology</h1>
              <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
                How we measure whether your trust infrastructure is strong enough for AI product growth to compound.
              </p>

              {/* ─── Why Trust Infrastructure ─── */}
              <section id="why-trust" className="scroll-mt-24 mb-16">
                <SectionHeading icon={<Lightbulb className="w-5 h-5" />} title="Why Trust Infrastructure Determines AI Product Growth" />
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  AI-native products face a unique market constraint: buyers can't predict how your product will behave before purchasing.
                </p>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Unlike traditional SaaS where workflows are deterministic ("click here, get this result"), AI outputs vary based on context, model versions, and user inputs. This unpredictability creates a <strong className="text-foreground">trust gap</strong> that breaks traditional growth loops before they can compound.
                </p>
                <Callout>
                  The Adaptive Value System (AVS) Rubric measures whether your trust infrastructure is strong enough for growth to accelerate.
                </Callout>
              </section>

              {/* ─── The Trust Stack ─── */}
              <section id="trust-stack" className="scroll-mt-24 mb-16">
                <SectionHeading icon={<Layers className="w-5 h-5" />} title="The Trust Stack" />
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  The rubric assesses eight trust dimensions organized in a hierarchical stack. Gaps in lower layers cascade upward, making upper layers unstable.
                </p>

                <div className="space-y-2 mb-4">
                  {[
                    { layer: 4, name: "Buyer Alignment", question: "Can the economic buyer approve this?", opacity: "bg-primary/15 border-primary/40" },
                    { layer: 3, name: "Risk Management", question: "Can customers control spend & avoid surprises?", opacity: "bg-primary/10 border-primary/30" },
                    { layer: 2, name: "Value-Cost Alignment", question: "Can customers predict what they'll pay?", opacity: "bg-primary/7 border-primary/20" },
                    { layer: 1, name: "Foundation", question: "Do you know who you serve & what success looks like?", opacity: "bg-primary/4 border-primary/15" },
                  ].map((l, i) => (
                    <div key={l.layer}>
                      <div className={`p-4 rounded-lg border ${l.opacity}`}>
                        <div className="text-xs font-semibold text-muted-foreground mb-0.5 uppercase tracking-wider">Layer {l.layer}: {l.name}</div>
                        <div className="text-foreground font-medium text-sm">{l.question}</div>
                      </div>
                      {i < 3 && <div className="text-center text-muted-foreground/60 text-xs py-0.5">↑</div>}
                    </div>
                  ))}
                </div>
              </section>

              {/* ─── The Eight Dimensions ─── */}
              <section id="dimensions" className="scroll-mt-24 mb-16">
                <SectionHeading icon={<BarChart3 className="w-5 h-5" />} title="The Eight Dimensions" />
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Click any dimension to expand its details.
                </p>

                <Accordion type="multiple" className="space-y-3">
                  <LayerGroup label="Layer 1: Foundation" color="text-primary">
                    <DimensionAccordion
                      value="d1"
                      num={1}
                      title="Product North Star"
                      question="Do you have a clearly stated, measurable outcome metric that defines success for your customers?"
                      evaluate="Whether your primary outcome metric is explicitly stated and operationally defined. Not your company vision, but the quantifiable result customers should track (e.g., &quot;minutes of production-ready audio generated&quot; or &quot;support tickets resolved by AI agent&quot;)."
                      matters="Without a clear North Star, customers can't quantify the value they receive, and you can't align product development and pricing around a single, impactful metric."
                    />
                    <DimensionAccordion
                      value="d2"
                      num={2}
                      title="ICP & Job Clarity"
                      question="Is your target user and their workflow problem crystal clear?"
                      evaluate="Whether your ideal customer profile is explicitly named and their job-to-be-done is anchored in a specific workflow context."
                      matters='Generic positioning ("for everyone") means your pricing, packaging, and trust signals can&apos;t be optimized for anyone. Specificity enables predictability.'
                    />
                  </LayerGroup>

                  <LayerGroup label="Layer 2: Value-Cost Alignment" color="text-primary">
                    <DimensionAccordion
                      value="d3"
                      num={3}
                      title="Value Unit"
                      question="Is your billable unit predictable and auditable?"
                      evaluate="Whether customers can track, verify, and forecast consumption of the unit you charge for (credits, characters, API calls, minutes, etc.)."
                      matters="If customers can't independently verify what they've consumed, every bill feels like a black box. Trust erodes with each invoice."
                    />
                    <DimensionAccordion
                      value="d4"
                      num={4}
                      title="Cost Driver Mapping"
                      question="Can customers forecast their spend based on usage patterns?"
                      evaluate="Whether the relationship between customer actions (generate audio, make API call, process document) and costs is explicitly documented with examples."
                      matters='Opaque cost drivers lead to "surprise bills." When customers can&apos;t map their workflows to costs, they either under-consume (leaving value on table) or over-consume (creating churn-inducing billing surprises).'
                    />
                  </LayerGroup>

                  <LayerGroup label="Layer 3: Risk Management" color="text-primary">
                    <DimensionAccordion
                      value="d5"
                      num={5}
                      title="Pools & Packaging"
                      question="Do your tiers separate exploration from production use appropriately?"
                      evaluate="Whether your pricing tiers match how customers actually adopt AI products (small tests → production rollout → scale) and whether limits align with real usage patterns by segment."
                      matters="Misaligned packaging forces customers into tiers that are either too restrictive (blocking expansion) or too expensive (premature commitment). Both create churn."
                    />
                    <DimensionAccordion
                      value="d6"
                      num={6}
                      title="Overages & Risk Allocation"
                      question="Is limit behavior explicit and risk fairly shared?"
                      evaluate="What happens when customers hit plan limits — hard stops, automatic overages, pay-as-you-go rates, contact sales? And whether customers know this behavior before hitting limits."
                      matters="Surprise overages are the #1 trust destroyer for usage-based pricing. If risk isn't explicitly allocated in advance, customers default to assuming you're optimizing for surprise revenue."
                    />
                    <DimensionAccordion
                      value="d7"
                      num={7}
                      title="Safety Rails & Trust Surfaces"
                      question="Can users set guardrails to prevent billing surprises?"
                      evaluate="Whether budget caps, usage alerts, rate limits, and spending controls are (a) available, (b) configurable by the customer, and (c) clearly documented with their trigger conditions and actions."
                      matters="Without configurable safety rails, customers can't manage risk. High-value customers will either not adopt or will adopt with extreme caution, capping their usage far below what they'd pay for if they had control."
                    />
                  </LayerGroup>

                  <LayerGroup label="Layer 4: Buyer Alignment" color="text-primary">
                    <DimensionAccordion
                      value="d8"
                      num={8}
                      title="Buyer & Budget Alignment"
                      question="Do your pricing plans map to how buyers actually purchase?"
                      evaluate="Whether your pricing structure matches buyer authority levels (individual IC, team lead, department VP, procurement) and typical budget approval cycles (monthly self-serve, quarterly approval, annual contract)."
                      matters="A user might love your product, but if the pricing doesn't match their approval authority or budget cycle, the sale stalls. Misalignment between product user and economic buyer kills conversion regardless of product quality."
                    />
                  </LayerGroup>
                </Accordion>
              </section>

              {/* ─── How It Works ─── */}
              <section id="how-it-works" className="scroll-mt-24 mb-16">
                <SectionHeading icon={<BookOpen className="w-5 h-5" />} title="How It Works" />

                <h3 className="text-lg font-semibold mb-3 mt-6">Input</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  You enter your company URL. The AVS Rubric Agent evaluates publicly visible signals across your digital presence:
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  {[
                    ["Pricing page", "Structure, transparency, unit definitions, tier breakdowns"],
                    ["Documentation", "Cost calculators, usage examples, constraint explanations"],
                    ["Product outputs", "Publicly shared artifacts (e.g., shared apps, presentations)"],
                    ["Terms of service", "Overage policies, limit behaviors, refund terms"],
                    ["Dashboard screenshots", "Usage tracking visibility via public demo or screenshots"],
                  ].map(([title, desc]) => (
                    <div key={title} className="p-3 rounded-lg bg-muted/40 border border-border/40">
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                  The rubric analyzes what's already public and generates the assessment automatically — no manual questionnaire.
                </p>
                <Callout>
                  The report reflects what your prospects can actually see — not what you believe you're communicating. This is the trust infrastructure gap.
                </Callout>

                <h3 className="text-lg font-semibold mb-3 mt-8">Output</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  You receive a real-time trust infrastructure score (0–100%) with:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  {[
                    ["Overall AVS Score", "Aggregate trust infrastructure strength"],
                    ["Dimension breakdown", "Scores for each of the 8 dimensions"],
                    ["Gap analysis", "Specific findings on weak legibility and predictability"],
                    ["Confidence labels", "How certain each assessment is"],
                    ["Next steps", "Prioritized actions to close trust gaps"],
                  ].map(([b, d]) => (
                    <li key={b}><strong className="text-foreground">{b}</strong> — {d}</li>
                  ))}
                </ul>
              </section>

              {/* ─── Confidence Labels ─── */}
              <section id="confidence" className="scroll-mt-24 mb-16">
                <SectionHeading icon={<Target className="w-5 h-5" />} title="Confidence Labels" />
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Each dimension includes a confidence score indicating assessment certainty:
                </p>

                <div className="space-y-3 mb-8">
                  {[
                    { level: "High", range: "≥ 75%", color: "border-green-500/40 bg-green-500/5", meaning: "Clear, unambiguous evidence found. This is a confirmed finding.", action: "Act on this immediately." },
                    { level: "Medium", range: "45–74%", color: "border-yellow-500/40 bg-yellow-500/5", meaning: "Partial evidence with some ambiguity. May indicate inconsistent messaging.", action: "Investigate further — needs human validation." },
                    { level: "Low", range: "< 45%", color: "border-red-500/40 bg-red-500/5", meaning: "Minimal or conflicting evidence. Automated assessment may be missing context.", action: "Don't act alone — signal is weak." },
                  ].map((c) => (
                    <div key={c.level} className={`p-4 rounded-lg border ${c.color}`}>
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="font-semibold text-foreground text-sm">{c.level} Confidence</span>
                        <span className="text-xs text-muted-foreground font-mono">{c.range}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{c.meaning}</p>
                      <p className="text-sm text-foreground font-medium mt-1">{c.action}</p>
                    </div>
                  ))}
                </div>

                <h4 className="text-sm font-semibold mb-3 text-foreground">Example interpretations</h4>
                <div className="space-y-2 mb-6 text-sm">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                    <span className="font-medium text-foreground">Product North Star (0.82)</span>
                    <span className="text-muted-foreground"> — "Your primary outcome metric is not stated on your pricing page, documentation, or product marketing. This is a definitive gap."</span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                    <span className="font-medium text-foreground">Cost Driver Mapping (0.58)</span>
                    <span className="text-muted-foreground"> — "Some cost information is visible, but the relationship between customer workflows and billing is unclear."</span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                    <span className="font-medium text-foreground">Safety Rails (0.38)</span>
                    <span className="text-muted-foreground"> — "Limited public information available on budget controls. May require reviewing the logged-in dashboard."</span>
                  </div>
                </div>

                <Callout>
                  A High Confidence gap should trigger immediate action — it's blocking trust. A Low Confidence finding might just mean the AI couldn't access the right information.
                </Callout>
              </section>

              {/* ─── What Traditional Analytics Miss ─── */}
              <section id="analytics-miss" className="scroll-mt-24 mb-16">
                <SectionHeading icon={<BarChart3 className="w-5 h-5" />} title="What Traditional Analytics Miss" />
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Funnels and product analytics tell you what users <em>do</em>. They don't tell you whether users can <em>predict what will happen</em> before they commit.
                </p>

                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  {[
                    "Can buyers forecast cost before purchasing?",
                    "Can they predict product behavior in their context?",
                    "Can they verify they're getting value for their spend?",
                    "Can they control risk (caps, limits, fallbacks)?",
                  ].map((q) => (
                    <div key={q} className="p-3 rounded-lg bg-muted/40 border border-border/40 text-sm text-muted-foreground">
                      {q}
                    </div>
                  ))}
                </div>

                <p className="text-muted-foreground mb-4 leading-relaxed">When the answer is "no," growth loops leak:</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground mb-6 pl-4">
                  <li>• Sign up but won't invite teammates — uncertainty about cost allocation</li>
                  <li>• Activate but won't share outputs — can't predict if it works for recipient</li>
                  <li>• Renew once but won't expand — fear of surprise bills</li>
                  <li>• First success but won't scale — no confidence in consistency</li>
                </ul>

                <Callout>
                  The AVS Rubric identifies these gaps before they show up in your retention curve — by measuring whether trust infrastructure exists in your public signals.
                </Callout>
              </section>

              {/* ─── Why This Matters for AI ─── */}
              <section id="why-ai" className="scroll-mt-24 mb-16">
                <SectionHeading icon={<Shield className="w-5 h-5" />} title="Why This Matters for AI Products" />
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Traditional SaaS could rely on free trials and generous freemium tiers to build trust through experience. AI products break this model:
                </p>

                <div className="space-y-4 mb-6">
                  <div className="p-5 rounded-lg bg-secondary/30 border border-border/50">
                    <h4 className="font-semibold mb-2 text-foreground text-sm">1. Free trials are expensive</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      LLM inference costs, GPU time, and API call expenses make generous free tiers economically unsustainable. Trust must exist <em>before</em> trial, not during it.
                    </p>
                  </div>
                  <div className="p-5 rounded-lg bg-secondary/30 border border-border/50">
                    <h4 className="font-semibold mb-2 text-foreground text-sm">2. One good output doesn't guarantee the next</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      AI output quality varies by input, context, model version, and even time of day. A single successful trial doesn't give buyers confidence the product will work reliably at scale.
                    </p>
                  </div>
                </div>

                <p className="text-muted-foreground mb-2 leading-relaxed">
                  Trust must be built through <strong className="text-foreground">signals</strong> — transparent pricing, clear constraints, explicit guardrails, documented failure modes — rather than just experience.
                </p>
                <p className="text-foreground font-semibold">AVS measures whether those signals exist.</p>
              </section>

              {/* CTA */}
              <section className="mt-12 p-6 rounded-lg bg-primary/5 border border-primary/20 text-center">
                <p className="text-muted-foreground mb-4">
                  Questions about the methodology? Book a 30-min session to discuss your specific context.
                </p>
                <a href="https://calendly.com/valuetempo/30min" target="_blank" rel="noopener noreferrer">
                  <Button className="bg-gradient-primary">Book a Session</Button>
                </a>
              </section>

            </motion.div>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
};

/* ─── Reusable sub-components ─── */

const SectionHeading = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
    <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
  </div>
);

const Callout = ({ children }: { children: React.ReactNode }) => (
  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-6">
    <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
  </div>
);

const LayerGroup = ({ label, color, children }: { label: string; color: string; children: React.ReactNode }) => (
  <div className="mb-2">
    <p className={`text-sm font-semibold ${color} mb-2 uppercase tracking-wider`}>{label}</p>
    {children}
  </div>
);

const DimensionAccordion = ({
  value, num, title, question, evaluate, matters,
}: {
  value: string; num: number; title: string; question: string; evaluate: string; matters: string;
}) => (
  <AccordionItem value={value} className="border border-border/50 rounded-lg px-4 mb-2 bg-card/50">
    <AccordionTrigger className="hover:no-underline text-left gap-3">
      <span className="flex items-baseline gap-2">
        <span className="text-xs font-mono text-muted-foreground">{num}.</span>
        <span className="font-medium text-foreground text-sm">{title}</span>
      </span>
    </AccordionTrigger>
    <AccordionContent>
      <p className="text-sm italic text-muted-foreground mb-3">{question}</p>
      <p className="text-sm text-muted-foreground mb-2">
        <strong className="text-foreground">What we evaluate:</strong> {evaluate}
      </p>
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Why it matters:</strong> {matters}
      </p>
    </AccordionContent>
  </AccordionItem>
);

export default Methodology;
