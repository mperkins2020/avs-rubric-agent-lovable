import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { URLInput } from "@/components/URLInput";
import { Sparkles, Shield, Target, Zap, AlertCircle, Info, LogOut, LogIn, Menu, X } from "lucide-react";
import { Footer } from "@/components/Footer";
import { ReportPreviewCarousel } from "@/components/ReportPreviewCarousel";
import { useScan } from "@/hooks/useScan";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { SEOHead } from "@/components/SEOHead";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const dimensionDefinitions: Record<string, string> = {
  "Product north star": "Observable outcomes tie to value delivery and predictability.",
  "ICP and job clarity": "Clear target user and job, anchored in workflows.",
  "Buyer and budget alignment": "Plans map to buyer, budget cycles, and approvals.",
  "Value unit": "Billable unit tracks value, is predictable and auditable.",
  "Cost driver mapping": "Usage and cost drivers are explicit and forecastable.",
  "Pools and packaging": "Tiers separate exploration from production by segment.",
  "Overages and risk allocation": "Limit behavior is explicit, risk is fairly shared.",
  "Safety rails and trust surfaces": "Controls prevent surprises, show usage, enable limits.",
};

const Index = () => {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authIsLogin, setAuthIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
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

  // Scroll to hash on mount
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, []);

  // Show error toast
  useEffect(() => {
    if (status === 'error' && error) {
      toast.error("Scan Failed", {
        description: error
      });
    }
  }, [status, error]);
  // When user signs in while a pending URL exists, start the scan
  useEffect(() => {
    if (session && pendingUrl) {
      const url = pendingUrl;
      setPendingUrl(null);
      setShowAuthModal(false);
      startScan(url);
    }
  }, [session, pendingUrl, startScan]);

  const handleSubmit = async (url: string) => {
    if (!session) {
      setPendingUrl(url);
      setShowAuthModal(true);
      return;
    }
    await startScan(url);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = authEmail.trim().toLowerCase();
    if (!trimmedEmail || !authPassword) {
      toast.error("Please enter your email and password.");
      return;
    }
    if (authPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setAuthLoading(true);
    try {
      if (authIsLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: authPassword });
        if (error) throw error;
        // Close modal immediately on successful login (handles case without pendingUrl)
        setShowAuthModal(false);
      } else {
        const { error } = await supabase.auth.signUp({ email: trimmedEmail, password: authPassword, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success("Check your email for a confirmation link.");
        setPendingUrl(null);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };
  const features = [{
    icon: Target,
    title: "8 Trust Dimensions",
    description: "Cover units, limits, overages, rails, and more."
  }, {
    icon: Shield,
    title: "Evidence-Backed",
    description: "Ties scores to public sources, with confidence and what's missing."
  }, {
    icon: Zap,
    title: "Instant Analysis",
    description: "Identifies trust gaps, ranks by severity, and recommends what to fix first."
  }];
  return <div className="min-h-screen bg-background relative overflow-hidden">
      <SEOHead
        title="AVS Rubric Agent — Score Your AI Trust Infrastructure"
        description="Get an instant, evidence-backed assessment of your AI product's trust infrastructure across 8 dimensions. Case studies show closing trust gaps drives 2–7% ARR uplift."
        canonicalUrl="https://valuetempo.lovable.app/"
        publishedDate="2026-01-01"
        tags={["AVS Rubric", "AI trust", "trust infrastructure", "revenue quality", "SaaS"]}
      />
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src={ValueTempoLogo} />
            </Link>
            <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
              <Sparkles className="w-4 h-4" />
              AVS Rubric
            </Button>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20 hidden sm:inline">
              Beta
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Methodology
            </Link>
            <ResourcesDropdown />
            {session ? (
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-1 text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowAuthModal(true)} className="gap-1 text-muted-foreground hover:text-foreground">
                <LogIn className="w-4 h-4" />
                Sign in
              </Button>
            )}
          </nav>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile slide-in menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 z-50 h-full w-72 bg-background border-l border-border/50 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <span className="font-semibold text-sm">Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
                <Link
                  to="/methodology"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  Methodology
                </Link>
                <ResourcesDropdown mobile onNavigate={() => setMobileMenuOpen(false)} />
              </nav>
              <div className="px-3 py-4 border-t border-border/50">
                {session ? (
                  <button
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                ) : (
                  <button
                    onClick={() => { setMobileMenuOpen(false); setShowAuthModal(true); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign in
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        {/* Hero */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} className="text-center max-w-4xl mx-auto mb-12">

          <p className="text-base font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Trust is the new growth constraint in AI
          </p>

          <h1 id="hero" className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 leading-tight">
            Close Trust Gaps{" "}
            <span className="gradient-text">Faster</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            Our open rubric analyzes your AI product across 8 trust dimensions in under a minute — so you know exactly where to improve.
          </p>
          <p className="text-sm font-medium text-primary/80 max-w-xl mx-auto mb-12">
            Case studies show closing trust gaps drives 2–7% ARR uplift
          </p>

          {/* URL Input */}
          <div id="url-input" className="flex justify-center mb-16 scroll-mt-24">
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

        {/* Sample Report Preview - Sliding Carousel */}
        <ReportPreviewCarousel />

        {/* Rubric dimensions preview */}
        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.6
      }} className="mt-20 text-center">
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
            Scored across 8 dimensions
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

      <Footer />

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={(open) => { setShowAuthModal(open); if (!open) setPendingUrl(null); }}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-6">
            <div className="text-center">
              <img alt="ValueTempo" className="h-8 mx-auto mb-4" src={ValueTempoLogo} />
              <h2 className="text-xl font-bold">{authIsLogin ? "Sign in to analyze" : "Create account"}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {authIsLogin ? "Sign in to run your analysis" : "Sign up to get started — 3 analyses per week"}
              </p>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="auth-email">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="auth-email" type="email" placeholder="you@example.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="auth-password">Password</label>
                <Input id="auth-password" type="password" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} minLength={6} required />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={authLoading}>
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {authIsLogin ? "Sign in" : "Sign up"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              {authIsLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button type="button" className="text-primary hover:underline font-medium" onClick={() => setAuthIsLogin(!authIsLogin)}>
                {authIsLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Index;