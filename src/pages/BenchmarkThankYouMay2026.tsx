import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { SEOHead } from "@/components/SEOHead";

export default function BenchmarkThankYouMay2026() {
  return (
    <div className="min-h-screen bg-[hsl(var(--vt-bg-section))]">
      <SEOHead
        title="Thank You — AI SaaS Buyability Benchmark May 2026 | ValueTempo"
        description="Your AI SaaS Buyability Benchmark report is ready for download."
        canonicalUrl="https://app.valuetempo.com/ai-saas-buyability-benchmark-may-2026/thank-you"
        ogImage="https://app.valuetempo.com/ValueTempo_Logo.png"
        type="website"
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-white/75 backdrop-blur-md">
        <div className="container mx-auto px-5 md:px-10 h-[72px] flex items-center justify-between">
          <Link to="/" aria-label="ValueTempo home">
            <img alt="ValueTempo" className="h-8" src={ValueTempoLogo} />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Methodology
            </Link>
            <ResourcesDropdown />
            <Button asChild size="sm" className="bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[20px] px-5 h-9">
              <Link to="/ai-saas-buyability-benchmark-may-2026">Benchmark</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero band */}
      <section className="relative overflow-hidden border-b border-[hsl(var(--vt-violet)/0.12)] bg-gradient-to-br from-[#EEEAFB] via-[#F4F1FC] to-[#E8F0FF]">
        <div
          className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, hsl(var(--vt-violet) / 0.55), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-20 h-[420px] w-[420px] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 70% 30%, hsl(var(--vt-blue) / 0.5), transparent 60%)",
          }}
        />

        <div className="container mx-auto px-5 md:px-10 py-14 md:py-20 relative">
          <div className="max-w-3xl">
            <Link
              to="/ai-saas-buyability-benchmark-may-2026"
              className="inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--vt-violet))] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to the AI SaaS Buyability Benchmark
            </Link>

            <h1 className="mt-5 text-3xl md:text-4xl lg:text-5xl font-bold text-vt-midnight leading-[1.08] tracking-tight">
              Thanks for your interest in the AI SaaS Buyability Benchmark.
            </h1>
            <p className="mt-5 text-lg text-vt-midnight/80 leading-relaxed max-w-2xl">
              The May 2026 report is ready.
            </p>

            <div className="mt-8">
              <Button
                asChild
                size="lg"
                className="bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[24px] h-12 px-7"
              >
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <Download className="mr-1 h-4 w-4" />
                  Download the report
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="container mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="max-w-2xl">
          <p className="text-base text-vt-midnight/80 leading-relaxed">
            This benchmark looks at how 60 AI SaaS companies publish the commercial evidence buyers
            need before the first sales conversation, including pricing clarity, value units,
            packaging, cost drivers, limits, risk, and trust signals.
          </p>

          <div className="mt-12">
            <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
              Next Step
            </span>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold text-vt-midnight">
              Want to understand how your company would score?
            </h2>
            <p className="mt-4 text-base text-vt-midnight/80 leading-relaxed">
              A score walkthrough helps identify:
            </p>
            <ul className="mt-4 space-y-3 text-base text-vt-midnight/80 leading-relaxed list-disc list-inside">
              <li>where your public buyer evidence is already strong</li>
              <li>where buyers still need sales to fill gaps</li>
              <li>which publishing moves would improve buyer confidence fastest</li>
            </ul>

            <div className="mt-8">
              <Button
                asChild
                size="lg"
                className="bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[24px] h-12 px-7"
              >
                <a
                  href="https://calendly.com/mlhperkins/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Request a buyability score walkthrough
                </a>
              </Button>
            </div>
          </div>

          <div className="mt-14">
            <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
              Useful Links
            </span>
            <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-4">
              <Link
                to="/ai-saas-buyability-benchmark-may-2026/companies-evaluated"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--vt-violet))] hover:underline"
              >
                View the companies evaluated
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="https://www.valuetempo.com/methodology"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--vt-violet))] hover:underline"
              >
                Read the methodology
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
