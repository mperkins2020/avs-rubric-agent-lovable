import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { SEOHead } from "@/components/SEOHead";

const categories = [
  {
    label: "AI Agent Platforms",
    companies: [
      "Botpress", "CrewAI", "Dust", "Lindy", "Make", "n8n",
      "Relay.app", "Relevance AI", "Salesforce Agentforce", "Stack AI",
      "Voiceflow", "Zapier AI",
    ],
  },
  {
    label: "AI Coding Assistants",
    companies: [
      "Amazon CodeWhisperer", "Augment Code", "Blackbox AI", "Bolt",
      "Cody (Sourcegraph)", "Cursor", "Devin (Cognition)", "GitHub Copilot",
      "JetBrains AI", "Lovable", "Qodo", "Replit", "Tabnine",
      "Windsurf (Codeium)",
    ],
  },
  {
    label: "AI Customer Support",
    companies: [
      "Ada", "Aisera", "Cognigy", "Decagon", "Forethought", "Gladly",
      "Helpshift", "Intercom (Fin AI)", "Kore.ai", "Parloa", "Sierra",
      "Tidio", "Zendesk AI",
    ],
  },
  {
    label: "AI Revenue Intelligence",
    companies: [
      "Backstory", "Clari (+ Salesloft)", "Common Room", "Gong", "Grain",
      "Jiminny", "Koala", "Momentum",
    ],
  },
  {
    label: "AI Sales Intelligence",
    companies: [
      "6sense", "Amplemarket", "Apollo.io", "Autobound", "Bombora", "Clay",
      "Cognism", "Demandbase", "Instantly.ai", "Lusha", "Salesmotion", "Seamless.ai",
      "ZoomInfo",
    ],
  },
];

export default function CompaniesEvaluatedMay2026() {
  return (
    <div className="min-h-screen bg-[hsl(var(--vt-bg-section))]">
      <SEOHead
        title="Companies Evaluated in the May 2026 AI SaaS Buyability Benchmark | ValueTempo"
        description="The complete list of 60 AI B2B SaaS companies evaluated across five categories in the May 2026 AI SaaS Buyability Benchmark."
        canonicalUrl="https://app.valuetempo.com/ai-saas-buyability-benchmark-may-2026/companies-evaluated"
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
              Companies Evaluated in the May 2026 AI SaaS Buyability Benchmark
            </h1>
            <p className="mt-5 text-lg text-vt-midnight/80 leading-relaxed max-w-2xl">
              The May 2026 benchmark evaluated the following 60 AI B2B SaaS
              companies across five categories: AI Agent Platforms, AI Coding
              Assistants, AI Customer Support, AI Revenue Intelligence, and AI
              Sales Intelligence.
            </p>
          </div>
        </div>
      </section>

      {/* Two-column category grid */}
      <section className="container mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-14">
          {categories.map((cat) => (
            <div key={cat.label}>
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[hsl(var(--vt-violet))] uppercase">
                {cat.label}
              </span>
              <ul className="mt-4 space-y-2">
                {cat.companies.map((company) => (
                  <li
                    key={company}
                    className="text-base text-vt-midnight/90 leading-relaxed"
                  >
                    {company}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Closing note */}
        <div className="mt-16 max-w-2xl">
          <p className="text-sm text-muted-foreground leading-relaxed">
            No scores are shown on this page by design — see the full report for
            category-level scoring and findings.
          </p>
        </div>

        {/* Bottom link */}
        <div className="mt-10">
          <Link
            to="/ai-saas-buyability-benchmark-may-2026"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--vt-violet))] hover:underline"
          >
            Back to the AI SaaS Buyability Benchmark
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
