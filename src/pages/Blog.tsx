import { Link } from "react-router-dom";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";

export default function Blog() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src={ValueTempoLogo} />
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

      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-4xl font-bold mb-10">Blog</h1>
          </motion.div>

          <div className="space-y-6">
            <Link to="/resources/blog/vibecoding-ai-startup-tool" className="block group">
              <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-muted/20 border border-border/40 rounded-xl p-6 hover:border-primary/40 transition-colors">
                <p className="text-sm text-muted-foreground mb-2">March 2026</p>
                <h2 className="text-xl md:text-2xl font-bold group-hover:text-primary transition-colors mb-2">What I Learned Vibecoding an AI Startup Tool using Lovable + Claude Code</h2>
                <p className="text-muted-foreground">A build-in-public note on what broke, what worked, and what vibecoding an AI product taught me about reliability, production readiness, and trust infrastructure.</p>
              </motion.article>
            </Link>

            <Link to="/resources/blog/trust-growth-constraint" className="block group">
              <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-muted/20 border border-border/40 rounded-xl p-6 hover:border-primary/40 transition-colors">
                <p className="text-sm text-muted-foreground mb-2">February 2026</p>
                <h2 className="text-xl md:text-2xl font-bold group-hover:text-primary transition-colors mb-2">Trust is the new growth constraint in AI</h2>
                <p className="text-muted-foreground">A practical way to make value, usage, and cost feel predictable — why pricing drift becomes trust drift, and how AVS gives operators a shared map.</p>
              </motion.article>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
