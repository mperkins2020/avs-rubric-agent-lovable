import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { SEOHead } from "@/components/SEOHead";

interface CaseStudyEntry {
  slug: string;
  companyName: string;
  logoUrl: string;
  headline: string;
  trustScore: number;
  maxScore: number;
  scorePercent: number;
}

const caseStudies: CaseStudyEntry[] = [
  {
    slug: "elevenlabs",
    companyName: "ElevenLabs",
    logoUrl: "/case-studies/elevenlabs-logo.ico",
    headline: "The 75% Problem: When Strong Fundamentals Meet Predictability Gaps",
    trustScore: 12,
    maxScore: 16,
    scorePercent: 75,
  },
  {
    slug: "clay",
    companyName: "Clay",
    logoUrl: "/case-studies/clay-logo.ico",
    headline: "The $100M Platform With a Cost Predictability Gap",
    trustScore: 13,
    maxScore: 16,
    scorePercent: 81,
  },
];

export default function CaseStudies() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src="/lovable-uploads/87678626-e604-46ee-90b6-9ab9b6380322.png" />
            </Link>
            <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
              <Sparkles className="w-4 h-4" />
              AVS Rubric
            </Button>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Methodology</Link>
            <ResourcesDropdown />
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Case Studies</h1>
            <p className="text-muted-foreground mb-12">Real-world AVS analyses — what scores reveal about trust infrastructure</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {caseStudies.map((cs, i) => (
              <motion.div
                key={cs.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
              >
                <Link
                  to={`/resources/case-studies/${cs.slug}`}
                  className="group block rounded-xl border border-border/50 bg-card/50 hover:border-primary/30 hover:bg-card/80 transition-all overflow-hidden"
                >
                  <div className="p-6 space-y-4">
                    {/* Logo + Score */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={cs.logoUrl}
                          alt={cs.companyName}
                          className="w-10 h-10 rounded-lg object-contain bg-secondary/50 p-1"
                        />
                        <span className="font-semibold">{cs.companyName}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-2xl font-mono font-bold gradient-text">{cs.scorePercent}%</span>
                        <span className="text-[10px] text-muted-foreground">{cs.trustScore}/{cs.maxScore}</span>
                      </div>
                    </div>
                    {/* Headline */}
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {cs.headline}
                    </p>
                    {/* CTA */}
                    <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                      Read case study
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
