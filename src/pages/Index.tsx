import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { URLInput } from "@/components/URLInput";
import { Sparkles, Shield, Target, Zap, AlertCircle, Info } from "lucide-react";
import { useScan } from "@/hooks/useScan";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ValueTempoLogo from "@/assets/ValueTempo_Logo.png";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const dimensionDefinitions: Record<string, string> = {
  "Product north star": "One measurable 90-day outcome for value and predictability.",
  "ICP and job clarity": "Clear target user and job, anchored in workflows.",
  "Buyer and budget alignment": "Plans map to buyer, budget cycles, and approvals.",
  "Value unit": "Billable unit tracks value, is predictable and auditable.",
  "Cost driver mapping": "Usage and cost drivers are explicit and forecastable.",
  "Pools and packaging": "Tiers separate exploration from production by segment.",
  "Overages and risk allocation": "Limit behavior is explicit, risk is fairly shared.",
  "Safety rails and trust surfaces": "Controls prevent surprises, show usage, enable limits.",
  "Rating agility and governance": "Versioned pricing changes with approvals and traceability.",
  "Measurement and cadence": "Regular reviews drive evidence-based pricing and rails changes."
};
const Index = () => {
  const navigate = useNavigate();
  const {
    status,
    statusMessage,
    error,
    startScan,
    companyProfile,
    rubricScore,
    observability,
    pages,
    chatMessages
  } = useScan();
  const isLoading = status === 'scraping' || status === 'analyzing';

  // Navigate to results when scan completes
  useEffect(() => {
    if (status === 'complete' && companyProfile && rubricScore && observability) {
      navigate("/results", {
        state: {
          companyProfile,
          rubricScore,
          observability,
          pages
        }
      });
    }
  }, [status, companyProfile, rubricScore, observability, pages, navigate]);

  // Show error toast
  useEffect(() => {
    if (status === 'error' && error) {
      toast.error("Scan Failed", {
        description: error
      });
    }
  }, [status, error]);
  const handleSubmit = async (url: string) => {
    await startScan(url);
  };
  const features = [{
    icon: Target,
    title: "10 Rubric Dimensions",
    description: "Comprehensive scoring across your value system"
  }, {
    icon: Shield,
    title: "Evidence-Backed",
    description: "Every score is grounded in publicly observable information"
  }, {
    icon: Zap,
    title: "Instant Analysis",
    description: "Get actionable insights in under 2 minutes"
  }];
  return <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src="/lovable-uploads/87678626-e604-46ee-90b6-9ab9b6380322.png" />
            </Link>
            <Button variant="outline" size="sm" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AVS Rubric Agent
            </Button>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
              Beta
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Methodology
            </Link>
            <Link to="/faq/product-growth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ: Growth</Link>
            <Link to="/faq/cfo-revops" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ: RevOps</Link>
          </nav>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        {/* Hero */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center max-w-4xl mx-auto mb-12">

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Score Your{" "}
            <span className="gradient-text">Pricing Readiness</span>
            <br />
            in Minutes
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
        </p>

          {/* URL Input */}
          <div className="flex justify-center mb-16">
            <URLInput onSubmit={handleSubmit} isLoading={isLoading} />
          </div>

          {/* Loading state */}
          {isLoading && <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} className="text-center">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-secondary/50">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  {statusMessage || 'Processing...'}
                </span>
              </div>
            </motion.div>}

          {/* Error state */}
          {status === 'error' && error && <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} className="text-center mt-4">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">
                  {error}
                </span>
              </div>
            </motion.div>}
        </motion.div>

        {/* Features */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.3
      }} className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {features.map((feature, i) => <motion.div key={feature.title} initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.4 + i * 0.1
        }} className="p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>)}
        </motion.div>

        {/* Rubric dimensions preview */}
        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.6
      }} className="mt-20 text-center">
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
            Scored across 10 dimensions
          </h2>
          <TooltipProvider delayDuration={100}>
            <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
              {Object.keys(dimensionDefinitions).map(dim => (
                <Tooltip key={dim}>
                  <TooltipTrigger asChild>
                    <span className="px-3 py-1.5 text-xs rounded-full bg-secondary/50 text-muted-foreground border border-border/50 cursor-help hover:bg-secondary/70 transition-colors">
                      {dim}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-center">
                    <p>{dimensionDefinitions[dim]}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 ValueTempo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>;
};
export default Index;