import { Link } from "react-router-dom";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { motion } from "framer-motion";
import { Footer } from "@/components/Footer";
import { Sparkles, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { BlogTOC, TocItem } from "@/components/BlogTOC";
import { SEOHead } from "@/components/SEOHead";

const tocSections: TocItem[] = [
  { id: "what-broke", label: "What Broke This Week" },
  { id: "evidence-contamination", label: "Evidence Contamination" },
  { id: "citation-artifacts", label: "Citation Artifacts" },
  { id: "url-filtering", label: "The URL Filtering Fix" },
  { id: "compare-page-slots", label: "Compare Page Slot Reservation" },
  { id: "structured-extraction", label: "Structured Extraction Traps" },
  { id: "pdf-truncation", label: "PDF Truncation" },
  { id: "what-we-deferred", label: "What We Deferred" },
  { id: "design-principle", label: "The Design Principle" },
  { id: "try-rubric", label: "Try the Rubric" },
];

export default function BlogEngineTuning() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Seven Versions of the Same Scan: Tuning an AI Scoring Engine in Public"
        description="A build-in-public log of what broke when we ran the AVS Rubric against real companies — evidence contamination, citation artifacts, and the URL filtering patterns that fixed them."
        canonicalUrl="https://valuetempo.lovable.app/resources/blog/engine-tuning-evidence-quality"
        publishedDate="2026-03-18"
        tags={["build in public", "AI scoring", "evidence quality", "trust infrastructure", "AVS Rubric"]}
      />
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src={ValueTempoLogo} />
            </Link>
            <Link to="/#url-input">
              <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
                <Sparkles className="w-4 h-4" />
                AVS Rubric
              </Button>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Methodology</Link>
            <ResourcesDropdown />
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="flex gap-10 max-w-6xl mx-auto">
          {/* Sticky TOC — desktop only */}
          <BlogTOC sections={tocSections} variant="sidebar" />

          {/* Main content */}
          <div className="flex-1 max-w-3xl">
            <Link to="/resources/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </Link>

            <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="prose prose-invert max-w-none">
              <div className="mb-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Calendar className="w-4 h-4" />
                  <time>March 2026</time>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3">Seven Versions of the Same Scan: Tuning an AI Scoring Engine in Public</h1>
                <p className="text-lg md:text-xl text-muted-foreground">A build-in-public log of what broke when we ran the AVS Rubric against real companies — and the systematic fixes that improved evidence quality without changing the model.</p>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-8">
                <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">TL;DR</p>
                <p className="text-foreground/90 leading-relaxed">We ran the AVS Rubric against ZoomInfo, Beautiful.ai, and Hex.tech — then manually audited every version. Seven iterations of ZoomInfo alone revealed three systematic failure classes: evidence contamination from non-pricing pages, persistent citation artifacts from malformed markdown, and wasted crawl slots on irrelevant URLs. None of these were model problems. They were all data quality problems. The fixes were URL exclusion filters, evidence sanitization regex, and structured extraction guardrails. The scoring model never changed. The evidence pipeline changed six times.</p>
              </div>

              <div className="space-y-6 text-foreground/90 leading-relaxed">
              <p>Last week I wrote about <Link to="/resources/blog/vibecoding-ai-startup-tool" className="text-primary underline hover:text-primary/80">what I learned vibecoding an AI scoring tool</Link>. One of the key lessons was that data quality matters more than model choice.</p>
              <p>This week proved it.</p>
              <p>We ran the rubric against three companies — ZoomInfo, Beautiful.ai, and Hex.tech — and manually audited every scoring dimension across multiple versions. What we found was not a model accuracy problem. It was an evidence pipeline problem.</p>
              <p className="font-semibold">The same model, given cleaner evidence, produced dramatically better scores.</p>

              {/* What Broke */}
              <hr className="border-border/50 my-8" />
              <h2 id="what-broke" className="text-2xl font-bold mt-12 mb-4 text-foreground">What Broke This Week</h2>
              <p>Three failure classes appeared across all scanned companies:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Evidence contamination</strong> — non-pricing pages being treated as pricing evidence</li>
                <li><strong>Citation artifacts</strong> — malformed markdown fragments surviving into evidence blocks and PDF exports</li>
                <li><strong>Wasted crawl slots</strong> — irrelevant pages consuming slots that should go to high-signal pages</li>
              </ul>
              <p>Each of these persisted across multiple versions because they were not obvious from reading model output. They only became visible through manual, line-by-line auditing of the evidence trail.</p>

              {/* Evidence Contamination */}
              <hr className="border-border/50 my-8" />
              <h2 id="evidence-contamination" className="text-2xl font-bold mt-12 mb-4 text-foreground">Evidence Contamination: When the Wrong Page Becomes the Source of Truth</h2>
              <p>The most damaging failure was evidence contamination.</p>
              <p>In the Beautiful.ai scan, a template category page (<code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">/template-categories/plans-strategies</code>) was being used as primary evidence in four scoring dimensions: Cost driver mapping, Pools and packaging, Overages, and Safety rails.</p>
              <p>The problem: this page contains template metadata, not Beautiful.ai's actual pricing terms.</p>
              <p>The structured JSON extractor — designed to pull pricing facts from pricing pages — parsed the template page's metadata fields. It found structured fields labeled "Refund Policy," "Overage Policy," and "Limits." Those fields existed because the page described a template about plans, not because it documented Beautiful.ai's own plans.</p>
              <p>The most damaging instance was the refund policy. The template page returned:</p>
              <div className="bg-muted/30 border border-border/40 rounded-lg p-4 text-sm italic">
                "No refunds after the billing cycle has commenced"
              </div>
              <p>Beautiful.ai's actual pricing page says the opposite for annual plans — partial refunds are available within 24 hours.</p>
              <p className="font-semibold">A direct factual contradiction, introduced entirely by the evidence pipeline, not the model.</p>
              <p>This is the same class of error we saw earlier with ZoomInfo, where deep legal subpages (biometric notices, data processing addenda) were contaminating the Safety Rails dimension with compliance language that had nothing to do with product trust infrastructure.</p>

              {/* Citation Artifacts */}
              <hr className="border-border/50 my-8" />
              <h2 id="citation-artifacts" className="text-2xl font-bold mt-12 mb-4 text-foreground">Citation Artifacts: The Parser Bug That Survived Five Versions</h2>
              <p>A malformed citation — <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">[Global coverage\\</code> — appeared in ZoomInfo's evidence blocks across four consecutive versions (V2 through V5).</p>
              <p>The fragment was a broken markdown link that survived the scraper's initial text processing, made it through the model's analysis passes, and rendered in both the UI and PDF exports as a visible artifact.</p>
              <p>The root cause: the scraper was not sanitizing unclosed brackets and escaped backslashes from the raw markdown before passing content to the analysis engine.</p>
              <p>The fix was a sanitization layer applied at two points:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>In the scraper</strong> — stripping malformed markdown before content reaches the model</li>
                <li><strong>In the analysis engine</strong> — normalizing evidence text after the model returns structured results</li>
              </ul>
              <p>The regex is simple:</p>
              <div className="bg-muted/30 border border-border/40 rounded-lg p-4 font-mono text-sm">
                {`/\\[[^\\]\\n]*\\\\{1,2}/g  → strip broken [text\\\\`}<br />
                {`/[>#*_\`|]+/g           → strip markdown formatting`}
              </div>
              <p>But finding where to apply it required tracing the data flow from scraper output through three model passes to final rendering.</p>
              <p className="font-semibold">Parser bugs in AI systems are uniquely hard to detect because the output still reads naturally — the model works around the artifact.</p>

              {/* URL Filtering */}
              <hr className="border-border/50 my-8" />
              <h2 id="url-filtering" className="text-2xl font-bold mt-12 mb-4 text-foreground">The URL Filtering Fix</h2>
              <p>The evidence contamination and wasted-slot problems both pointed to the same root cause: insufficient URL filtering in the crawl pipeline.</p>
              <p>The scraper already excluded obvious noise — blog posts, career pages, login pages, static assets. But three new categories needed exclusion:</p>

              <h3 className="text-xl font-bold mt-8 mb-2 text-foreground">Template and gallery pages</h3>
              <p>Pages like <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">/template-categories/</code> and <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">/templates/</code> contain metadata about templates, not the product's own pricing or policies. When the structured JSON extractor encounters these pages, it faithfully extracts their metadata — which happens to have the same field names as real pricing data.</p>

              <h3 className="text-xl font-bold mt-8 mb-2 text-foreground">Sitemap XML and event pages</h3>
              <p>Hex.tech's scan included <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">/sitemap-0.xml</code> and <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">/events/fall-2025-launch</code> — neither contains pricing signals. These consumed two of 15 available crawl slots that could have gone to comparison pages or solutions pages with stronger ICP evidence.</p>

              <h3 className="text-xl font-bold mt-8 mb-2 text-foreground">Single integration pages</h3>
              <p>Pages like <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">/product/integrations/mariadb</code> document one specific database connector. The parent <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">/integrations</code> page is sufficient. Individual connector pages add no pricing signal and waste crawl budget.</p>

              <p>The fix adds six new exclusion patterns to the scraper's URL scoring logic. These are purely additive filters — they don't change how evidence is parsed or scored, they only prevent junk pages from consuming crawl slots.</p>

              {/* Compare Page Slots */}
              <hr className="border-border/50 my-8" />
              <h2 id="compare-page-slots" className="text-2xl font-bold mt-12 mb-4 text-foreground">Compare Page Slot Reservation</h2>
              <p>An earlier version of the ZoomInfo scan included five competitor comparison pages. These pages contained the only public surface where ZoomInfo's credit model was described in contrast to competitors.</p>
              <p>A later version had none. The comparison pages had been crowded out by other high-scoring URLs.</p>
              <p>The fix reserves up to two crawl slots specifically for comparison pages (<code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">/compare</code> or <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">/vs-</code> paths). If a site has no comparison pages, all slots go to other evidence pages. No slots are wasted.</p>
              <p>This is a good example of a tension in evidence collection: the scraper needs to be both comprehensive (catch all page types) and disciplined (not let one category dominate).</p>

              {/* Structured Extraction Traps */}
              <hr className="border-border/50 my-8" />
              <h2 id="structured-extraction" className="text-2xl font-bold mt-12 mb-4 text-foreground">Structured Extraction Traps</h2>
              <p>The structured JSON extraction phase was designed to improve pricing accuracy. For pages matching pricing URL patterns, the scraper requests a schema-validated JSON format capturing plans, prices, limits, overage policies, and refund rules.</p>
              <p>This works well on actual pricing pages. But when applied to a template category page, the extractor treats the template's metadata as if it were the company's own pricing terms.</p>
              <p>The lesson: <strong>structured extraction amplifies the signal quality of whatever page it's pointed at</strong>. If the page is wrong, the extraction makes the error worse, not better, because the output looks more authoritative.</p>
              <p>The Beautiful.ai template page produced clean, well-structured JSON with confident field values. It looked more reliable than the actual pricing page's markdown. The model understandably preferred the structured data.</p>
              <p className="font-semibold">Structured extraction is a force multiplier. It multiplies both signal and noise.</p>

              {/* PDF Truncation */}
              <hr className="border-border/50 my-8" />
              <h2 id="pdf-truncation" className="text-2xl font-bold mt-12 mb-4 text-foreground">PDF Truncation</h2>
              <p>A smaller but professionally embarrassing bug: the Value Unit confidence note ended mid-sentence in the PDF export.</p>
              <div className="bg-muted/30 border border-border/40 rounded-lg p-4 text-sm italic">
                "Detailed metering granularity (rounding, attribution, edge-case counting) is not fully public — this is a"
              </div>
              <p>The truncation was caused by Unicode characters (arrows, special punctuation) that the PDF renderer could not handle, causing it to silently stop rendering at that point.</p>
              <p>The fix replaced Unicode arrows with PDF-safe ASCII text. A two-line change that would have been impossible to find without manually reviewing the exported PDF.</p>

              {/* What We Deferred */}
              <hr className="border-border/50 my-8" />
              <h2 id="what-we-deferred" className="text-2xl font-bold mt-12 mb-4 text-foreground">What We Deferred (And Why)</h2>
              <p>Two issues remain open:</p>
              <p><strong>Refund processing fee extraction.</strong> Beautiful.ai's pricing page states that all refunds are subject to a processing fee. This fact has not been captured in any of seven versions. The gap is a prompt-level issue — the extraction instructions don't specifically target processing fee clauses. Fixing this means adjusting prompt instructions that affect all scans, which carries regression risk across other companies.</p>
              <p><strong>Confidence calibration drift.</strong> Hex.tech's Cost Driver Mapping confidence dropped from 60% to 50% to 40% across three versions, despite the evidence base improving. This appears to be calibration drift in the 3-pass voting system rather than a measured confidence reduction based on new negative evidence. Addressing this requires broader testing across multiple companies.</p>
              <p>Both were deferred intentionally. The principle: <strong>ship the low-risk, high-value fix first</strong> (URL filtering), then re-scan to establish a new baseline before touching higher-risk layers (prompt instructions, calibration parameters).</p>

              {/* Design Principle */}
              <hr className="border-border/50 my-8" />
              <h2 id="design-principle" className="text-2xl font-bold mt-12 mb-4 text-foreground">The Design Principle</h2>
              <p>Every fix this week followed the same pattern:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Manual audit of evidence trail (not just scores)</li>
                <li>Classify the failure (data quality vs. model accuracy vs. rendering)</li>
                <li>Fix at the earliest point in the pipeline</li>
                <li>Verify the fix doesn't introduce regressions</li>
              </ol>
              <p>Most of what we fixed this week was not about making the model smarter. It was about making the evidence pipeline more disciplined.</p>
              <p className="font-semibold">The model was already good enough. The data reaching it was not.</p>
              <p>This is, I suspect, the central lesson of building production AI systems: the quality ceiling is set by your data pipeline, not your model.</p>

              {/* CTA */}
              <hr className="border-border/50 my-8" />
              <h2 id="try-rubric" className="text-2xl font-bold mt-12 mb-4 text-foreground">Try the Rubric</h2>
              <p>The AVS Rubric is free and live at <Link to="/" className="text-primary hover:underline font-semibold">valuetempo.com</Link>.</p>
              <p>Every improvement described here is already in production. If you ran a scan last week, try running it again — the evidence quality is measurably better.</p>
              <p>And if you spot something the rubric gets wrong, that feedback is exactly what drives the next iteration.</p>
              </div>
            </motion.article>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
