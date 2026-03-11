import { useState, useMemo } from "react";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { ArrowLeft, Search, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQJsonLd } from "@/components/FAQJsonLd";
import { SEOHead } from "@/components/SEOHead";

type FAQCategory = "product-growth" | "cfo-revops";

interface FAQItem {
  question: string;
  answer: React.ReactNode;
  category: FAQCategory;
}

const faqs: FAQItem[] = [
  // Product & Growth
  {
    category: "product-growth",
    question: "We have great messaging. Isn't this just a copywriting audit?",
    answer: (
      <>
        <p className="mb-3">No. The AVS Rubric scores whether buyers can safely infer how your system behaves before adoption, not how persuasive your copy is.</p>
        <p className="mb-3">The difference: "Usage-based pricing" is messaging. Showing that 1,000 API calls = $2.50, with workflow examples ("typical chatbot: 50K calls/month = $125"), documented overage behavior, and configurable budget caps is trust infrastructure.</p>
      </>
    ),
  },
  {
    category: "product-growth",
    question: "Shouldn't you test the actual product, not just the website?",
    answer: (
      <>
        <p className="mb-3">The AVS Rubric intentionally evaluates pre-adoption legibility. Most revenue friction happens before deep product usage — long sales cycles, discount pressure, procurement objections, champions struggling to defend adoption internally.</p>
        <p className="mb-3"><strong>What we measure:</strong> Can rational buyers understand your value unit, cost drivers, limit behavior, and risk allocation using only publicly observable signals?</p>
        <p>Your product may work flawlessly, but if workflows aren't clearly described, trust controls are implicit, or pricing behavior is opaque, buyers hesitate and trials don't convert.</p>
      </>
    ),
  },
  {
    category: "product-growth",
    question: "We have analytics, funnels, and surveys. What does this add?",
    answer: (
      <>
        <p className="mb-3">Your internal data shows what committed customers do. AVS shows what the market can confidently infer before committing.</p>
        <p>Revenue fragility often appears when internal data looks healthy but external signals create uncertainty — usage stays high, but sales cycles lengthen, expansion slows, deals require repeated reassurance. The gap isn't product performance. It's pre-adoption legibility.</p>
      </>
    ),
  },
  {
    category: "product-growth",
    question: "This feels subjective. How can I trust the scores?",
    answer: (
      <>
        <p className="mb-3">AVS makes subjectivity explicit and bounded rather than hiding it. Every assessment separates:</p>
        <ul className="list-disc pl-6 space-y-1 mb-3">
          <li><strong>Score (0-100%)</strong> — What can be supported by quoted evidence</li>
          <li><strong>Confidence (High/Medium/Low)</strong> — How complete that evidence is</li>
          <li><strong>Uncertainty labels</strong> — What cannot be inferred and why</li>
        </ul>
        <p>Instead of implying certainty like most dashboards, AVS defaults conservatively when evidence is missing and labels low confidence explicitly.</p>
      </>
    ),
  },
  {
    category: "product-growth",
    question: "Why not use customer reviews or social sentiment?",
    answer: (
      <>
        <p className="mb-3">Social sentiment measures reaction after experience. AVS evaluates expectations before commitment.</p>
        <p>Many buyers never post publicly, don't complain on social media, and simply don't convert or quietly negotiate discounts. A product can have 4.5-star ratings while stalling in enterprise procurement, losing deals on pricing predictability, or facing long evaluation cycles. Sentiment doesn't catch these revenue blockers.</p>
      </>
    ),
  },
  {
    category: "product-growth",
    question: "Our metrics look fine. When would this matter?",
    answer: (
      <>
        <p className="mb-3">Trust erosion happens before metrics degrade. By the time dashboards flash red, revenue quality has already declined.</p>
        <p className="mb-3">Typical sequence: External legibility gaps exist (Week 1-4) → Sales fills gaps with manual explanation and discounts (Week 5-12) → Champions struggle to get buy-in, expansion confidence weakens (Week 13-20) → Usage plateaus (Week 21-30) → Churn accelerates (Week 31+).</p>
        <p>AVS surfaces the problem at Week 1. Internal metrics catch it at Week 21.</p>
      </>
    ),
  },
  {
    category: "product-growth",
    question: "Can't I just use ChatGPT or Claude to analyze my website?",
    answer: (
      <>
        <p className="mb-3">General-purpose AI generates opinions. AVS produces structured, repeatable assessments.</p>
        <p className="mb-3">Key differences:</p>
        <ul className="list-disc pl-6 space-y-1 mb-3">
          <li>Fixed dimensions vs. conversational output</li>
          <li>Evidence citations required vs. unstructured critique</li>
          <li>Repeatable (same input → same output) vs. varies by conversation</li>
          <li>Confidence calibration vs. unqualified statements</li>
          <li>Defensible assessment artifact vs. one-off answer</li>
        </ul>
        <p>Two people running ChatGPT twice get different results. Two people running AVS get the same dimensional scores, same confidence labels, same evidence citations.</p>
      </>
    ),
  },
  {
    category: "product-growth",
    question: "This sounds like marketing analysis. How is it different?",
    answer: (
      <>
        <p className="mb-3">Marketing analysis evaluates persuasion and positioning. AVS evaluates economic legibility and trust structure — value unit clarity, cost driver transparency, risk boundary explicitness, safety rail configurability.</p>
        <p>Great messaging creates interest. Only legible structure sustains pricing power and expansion.</p>
      </>
    ),
  },
  {
    category: "product-growth",
    question: "How is this actionable? I can't just fix a website.",
    answer: (
      <>
        <p className="mb-3">Correct. AVS identifies where your system isn't legible enough for the market to trust, revealing where product, GTM, and roadmap effort is being diluted.</p>
        <p className="mb-3">Not a website fix:</p>
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-sm border border-border/50 rounded-lg">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left p-3 font-semibold border-b border-border/50">AVS Finding</th>
                <th className="text-left p-3 font-semibold border-b border-border/50">The Real Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/30"><td className="p-3">Value Unit gap</td><td className="p-3">Define and expose the actual billable unit with examples</td></tr>
              <tr className="border-b border-border/30"><td className="p-3">Cost Driver gap</td><td className="p-3">Document workflow-to-cost relationship with real usage scenarios</td></tr>
              <tr className="border-b border-border/30"><td className="p-3">Safety Rails gap</td><td className="p-3">Build configurable spend caps and expose them in product</td></tr>
              <tr><td className="p-3">Workflow completion gap</td><td className="p-3">Add status indicators, publish completion criteria, clarify edge case handling</td></tr>
            </tbody>
          </table>
        </div>
        <p>These map to product roadmap, pricing policy, documentation strategy — not copywriting.</p>
      </>
    ),
  },
  // CFO & RevOps
  {
    category: "cfo-revops",
    question: "We have Stripe, billing analytics, and a data warehouse. Why this?",
    answer: (
      <>
        <p className="mb-3">Your systems measure what customers did after committing. AVS measures whether your commercial system is legible enough to prevent surprises before commitment.</p>
        <p>Your billing data shows churn after trust breaks. AVS surfaces expectation gaps that cause future churn. If pricing units or limits are unclear externally, customers onboard with wrong expectations and churn when reality diverges.</p>
      </>
    ),
  },
  {
    category: "cfo-revops",
    question: "Public info is just marketing. Why does it matter for revenue?",
    answer: (
      <>
        <p className="mb-3">Buyers make risk judgments based on what they can infer externally. If risk boundaries aren't legible, they either don't adopt, adopt with wrong expectations, or negotiate discounts to offset uncertainty.</p>
        <p>Procurement teams, finance approvers, and internal champions all rely on public signals. Missing signals create longer sales cycles, discount pressure, expansion hesitation, and surprise churn.</p>
      </>
    ),
  },
  {
    category: "cfo-revops",
    question: "This seems subjective. I need auditability.",
    answer: (
      <>
        <p className="mb-3">AVS is conservative and repeatable by design: fixed dimensions, explicit evidence thresholds, separate confidence scoring. Every score includes direct quotes, source URLs, confidence labels, and specific gap descriptions.</p>
        <p>Two teams running AVS on the same domain get the same score based on the same public sources — creating a shared artifact for organizational alignment.</p>
      </>
    ),
  },
  {
    category: "cfo-revops",
    question: "How does this reduce churn or improve NRR?",
    answer: (
      <>
        <p className="mb-3">AVS surfaces expectation and predictability gaps early, which reduces surprise-driven churn.</p>
        <p className="mb-3">Clear cost forecasting → confident expansion. Configurable caps → controlled scaling. Defined outcome metrics → proven value. Workflow completion clarity → full cutover.</p>
        <p>Example: Before fix, NRR 105% but 30% of customers never expand (don't trust cost predictability). After publishing cost calculator with workflow examples + budget caps, NRR climbs to 125%.</p>
      </>
    ),
  },
  {
    category: "cfo-revops",
    question: "We do customer health scoring. Isn't that enough?",
    answer: (
      <>
        <p className="mb-3">Health scoring is downstream (detects problems after they exist). AVS is upstream (prevents problems from forming).</p>
        <p>Customer can be "green" on usage but will never expand confidently because Safety Rails gaps create fear of surprise bills. Health score shows ✅ healthy, but expansion probability is low due to invisible trust barrier.</p>
      </>
    ),
  },
  {
    category: "cfo-revops",
    question: "What's the ROI? What decisions does this change?",
    answer: (
      <>
        <p className="mb-3">AVS improves revenue quality by making expectation and predictability risks visible before they appear in churn data.</p>
        <p className="mb-3">Decision impact:</p>
        <ul className="list-disc pl-6 space-y-1 mb-3">
          <li><strong>Roadmap:</strong> "Cost Driver gap blocks expansion — build usage forecasting dashboard before new features"</li>
          <li><strong>Pricing:</strong> "Value Unit is ambiguous — define billable unit clearly before testing new tiers"</li>
          <li><strong>GTM:</strong> "Safety Rails gap forces sales to manually explain controls — build product solution, then scale sales"</li>
          <li><strong>Expansion:</strong> "Workflow completion gap makes customers hedge with old tools — fix 'done' state clarity"</li>
        </ul>
        <p>Specific ROI: Reduce discount rates from 20% → 10% (10-point margin lift), compress sales cycles 120 → 90 days (25% revenue pull-forward), lift NRR from 110% → 130% (20-point gain).</p>
      </>
    ),
  },
  {
    category: "cfo-revops",
    question: "Won't this just tell us to rewrite the website?",
    answer: (
      <>
        <p className="mb-3">No. The action is structural, not cosmetic. AVS outputs a prioritization lens for product, pricing, and policy clarity.</p>
        <p className="mb-3">Not "rewrite copy" but: Add annual contracts (aligns with enterprise budget cycles), publish cost allocation guidance (helps multi-team orgs), offer SSO-based provisioning (maps to IT approval), create ROI calculator (helps champions present internally). None of that is copywriting — it's commercial system design.</p>
      </>
    ),
  },
  {
    category: "cfo-revops",
    question: "How is this different from ChatGPT reviewing our site?",
    answer: (
      <>
        <p>ChatGPT produces conversational output. AVS produces structured, evidence-backed assessments with explicit uncertainty labeling — creating a defensible artifact you can share with Board, Product, GTM, and CS leadership.</p>
      </>
    ),
  },
  {
    category: "cfo-revops",
    question: "Why export a PDF if you don't store data?",
    answer: (
      <>
        <p className="mb-3">Finance and operations decisions require shareable artifacts. PDF enables leadership review without login, internal sharing without exposing dashboards, version control via timestamp, and annotation-friendly format for assigning owners.</p>
        <p>Example: CFO forwards AVS report to VP Product ("Can we build usage forecasting?"), VP Sales ("Are you manually explaining pricing?"), VP CS ("Are Safety Rails concerns in escalations?") — all review same evidence, same scores, same gaps.</p>
      </>
    ),
  },
];

const categoryLabels: Record<FAQCategory, string> = {
  "product-growth": "Product & Growth",
  "cfo-revops": "CFO & RevOps",
};

const FAQ = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FAQCategory | "all">("all");

  const filtered = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
      const matchesSearch = !search || faq.question.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  // Number items within their displayed order
  let productIdx = 0;
  let revopsIdx = 0;
  const numberedFaqs = filtered.map((faq) => {
    if (faq.category === "product-growth") {
      productIdx++;
      return { ...faq, num: productIdx };
    }
    revopsIdx++;
    return { ...faq, num: revopsIdx + 9 }; // CFO starts at 10
  });

  // Split into sections
  const productFaqs = numberedFaqs.filter((f) => f.category === "product-growth");
  const revopsFaqs = numberedFaqs.filter((f) => f.category === "cfo-revops");

  const faqJsonLdData = faqs.map((faq) => ({
    question: faq.question,
    answer: faq.category === "product-growth"
      ? {
          "We have great messaging. Isn't this just a copywriting audit?": "No. The AVS Rubric scores whether buyers can safely infer how your system behaves before adoption, not how persuasive your copy is. The difference: 'Usage-based pricing' is messaging. Showing that 1,000 API calls = $2.50, with workflow examples, documented overage behavior, and configurable budget caps is trust infrastructure.",
          "Shouldn't you test the actual product, not just the website?": "The AVS Rubric intentionally evaluates pre-adoption legibility. Most revenue friction happens before deep product usage — long sales cycles, discount pressure, procurement objections, champions struggling to defend adoption internally. We measure whether rational buyers can understand your value unit, cost drivers, limit behavior, and risk allocation using only publicly observable signals.",
          "We have analytics, funnels, and surveys. What does this add?": "Your internal data shows what committed customers do. AVS shows what the market can confidently infer before committing. Revenue fragility often appears when internal data looks healthy but external signals create uncertainty.",
          "This feels subjective. How can I trust the scores?": "AVS makes subjectivity explicit and bounded. Every assessment separates Score (0-100%), Confidence (High/Medium/Low), and Uncertainty labels. Instead of implying certainty, AVS defaults conservatively when evidence is missing and labels low confidence explicitly.",
          "Why not use customer reviews or social sentiment?": "Social sentiment measures reaction after experience. AVS evaluates expectations before commitment. Many buyers never post publicly and simply don't convert or quietly negotiate discounts.",
          "Our metrics look fine. When would this matter?": "Trust erosion happens before metrics degrade. AVS surfaces the problem at Week 1. Internal metrics catch it at Week 21.",
          "Can't I just use ChatGPT or Claude to analyze my website?": "General-purpose AI generates opinions. AVS produces structured, repeatable assessments with fixed dimensions, evidence citations, confidence calibration, and defensible assessment artifacts.",
          "This sounds like marketing analysis. How is it different?": "Marketing analysis evaluates persuasion and positioning. AVS evaluates economic legibility and trust structure — value unit clarity, cost driver transparency, risk boundary explicitness, safety rail configurability.",
          "How is this actionable? I can't just fix a website.": "AVS identifies where your system isn't legible enough for the market to trust. Actions map to product roadmap, pricing policy, documentation strategy — not copywriting.",
        }[faq.question] || faq.question
      : {
          "We have Stripe, billing analytics, and a data warehouse. Why this?": "Your systems measure what customers did after committing. AVS measures whether your commercial system is legible enough to prevent surprises before commitment.",
          "Public info is just marketing. Why does it matter for revenue?": "Buyers make risk judgments based on what they can infer externally. Missing signals create longer sales cycles, discount pressure, expansion hesitation, and surprise churn.",
          "This seems subjective. I need auditability.": "AVS is conservative and repeatable by design: fixed dimensions, explicit evidence thresholds, separate confidence scoring. Every score includes direct quotes, source URLs, and confidence labels.",
          "How does this reduce churn or improve NRR?": "AVS surfaces expectation and predictability gaps early, which reduces surprise-driven churn. Clear cost forecasting enables confident expansion.",
          "We do customer health scoring. Isn't that enough?": "Health scoring is downstream (detects problems after they exist). AVS is upstream (prevents problems from forming).",
          "What's the ROI? What decisions does this change?": "AVS improves revenue quality by making expectation and predictability risks visible before they appear in churn data. Specific ROI includes reducing discount rates, compressing sales cycles, and lifting NRR.",
          "Won't this just tell us to rewrite the website?": "No. The action is structural, not cosmetic. AVS outputs a prioritization lens for product, pricing, and policy clarity.",
          "How is this different from ChatGPT reviewing our site?": "ChatGPT produces conversational output. AVS produces structured, evidence-backed assessments with explicit uncertainty labeling — creating a defensible artifact for leadership review.",
          "Why export a PDF if you don't store data?": "Finance and operations decisions require shareable artifacts. PDF enables leadership review without login, internal sharing, version control, and annotation.",
        }[faq.question] || faq.question,
  }));

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEOHead
        title="AVS Rubric FAQ — Frequently Asked Questions"
        description="Find answers about the AVS Rubric for Product & Growth leaders and CFO & RevOps teams. Learn how AVS evaluates trust infrastructure, reduces churn, and improves revenue quality."
        canonicalUrl="https://valuetempo.lovable.app/resources/faq"
        publishedDate="2026-01-15"
        tags={["FAQ", "AVS Rubric", "trust infrastructure", "revenue quality"]}
      />
      <FAQJsonLd faqs={faqJsonLdData} />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src={ValueTempoLogo} />
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
            <ResourcesDropdown />
          </nav>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-4xl font-bold mb-2">Frequently Asked Questions</h1>
          <p className="text-muted-foreground mb-8">Find answers about the AVS Rubric for your role.</p>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search questions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "product-growth", "cfo-revops"] as const).map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat === "all" ? "All" : categoryLabels[cat]}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No questions match your search.</p>
          )}

          {/* Product & Growth Section */}
          {productFaqs.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4 text-primary">For Product & Growth Leaders</h2>
              <Accordion type="multiple" className="space-y-2">
                {productFaqs.map((faq, i) => (
                  <AccordionItem
                    key={`pg-${i}`}
                    value={`pg-${i}`}
                    className="border border-border/50 rounded-xl px-6 bg-card/50 data-[state=open]:bg-card/80"
                  >
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="pr-4">{faq.num}. {faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-muted-foreground">{faq.answer}</div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* CFO & RevOps Section */}
          {revopsFaqs.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-semibold mb-4 text-primary">For CFO & RevOps Leaders</h2>
              <Accordion type="multiple" className="space-y-2">
                {revopsFaqs.map((faq, i) => (
                  <AccordionItem
                    key={`cr-${i}`}
                    value={`cr-${i}`}
                    className="border border-border/50 rounded-xl px-6 bg-card/50 data-[state=open]:bg-card/80"
                  >
                    <AccordionTrigger className="text-left hover:no-underline">
                      <span className="pr-4">{faq.num}. {faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-muted-foreground">{faq.answer}</div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* CTA */}
          <div className="mt-8 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <p className="text-muted-foreground mb-4">Have questions? Book a 30-min diagnostic session.</p>
            <a href="https://calendly.com/mlhperkins/30min" target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                Book 30-min Session <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default FAQ;
