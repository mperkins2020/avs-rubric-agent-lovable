import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { URLInput } from "@/components/URLInput";
import { Sparkles, Shield, Target, Zap, AlertCircle, Info, LogOut, LogIn } from "lucide-react";
import { EmailPreferences } from "@/components/EmailPreferences";
import { useScan } from "@/hooks/useScan";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import ValueTempoLogo from "@/assets/ValueTempo_Logo.png";
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
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
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
    description: "Highlights top gaps, fastest fixes, and what to publish next."
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

          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            Score Your{" "}
            <span className="gradient-text">AI Product's Trust</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            Results in under one minute.
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

        {/* Sample Report Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-20 max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">What your report looks like</h2>
            <p className="text-sm text-muted-foreground">Using Hex as an example</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {/* 1 - Score Card */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Overall score & band</p>
              <div className="relative rounded-xl overflow-hidden border border-border/50 bg-card/50">
                <div className="p-5 bg-[hsl(220,30%,8%)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold text-foreground mb-1">Hex</div>
                      <span className="inline-block px-3 py-1 rounded-lg bg-score-high/10 border border-score-high/30 text-score-high text-sm font-semibold">Established</span>
                      <p className="text-xs text-muted-foreground mt-1.5">Strong foundation with room to optimize</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="40" cy="40" r="34" className="stroke-secondary" strokeWidth="6" fill="none" />
                          <circle cx="40" cy="40" r="34" stroke="hsl(var(--primary))" strokeWidth="6" fill="none" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            strokeDashoffset={`${2 * Math.PI * 34 * (1 - 9/16)}`} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="font-mono text-xl font-bold text-foreground">9</span>
                          <span className="text-[10px] text-muted-foreground">/ 16</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-mono font-bold gradient-text">56%</div>
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
                      <div className="text-xs font-medium mb-1">ICP and job clarity</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">Hex clearly articulates its target audience, including both technical and non-technical users.</div>
                      <div className="text-xs text-score-high mt-1.5">Enables: Tailored messaging across segments.</div>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/40 border border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded bg-score-low/20 flex items-center justify-center">
                          <span className="text-score-low text-xs">↘</span>
                        </div>
                        <span className="font-semibold text-sm">Top Weaknesses</span>
                      </div>
                      <div className="text-xs font-medium mb-1">Product north star</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">Hex lacks a clearly defined, measurable primary outcome metric.</div>
                      <div className="text-xs text-score-low mt-1.5">Impact: Hard to quantify value delivery.</div>
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
                    {[
                      { title: "Unpredictable Usage Costs", desc: "If metering for 'agent credits' and 'pay-as-you-go compute' are not transparent, customers face unexpected bills." },
                      { title: "Lack of Cost Control", desc: "Without explicit caps, alerts, or clear overage policies, customers may feel they lack spending control." },
                    ].map((bp) => (
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
                    {[
                      { n: "01", name: "Product north star", conf: "Medium", score: "1/2", color: "text-yellow-500 bg-yellow-500/15" },
                      { n: "02", name: "ICP and job clarity", conf: "High", score: "2/2", color: "text-score-high bg-score-high/15" },
                      { n: "03", name: "Buyer and budget alignment", conf: "High", score: "2/2", color: "text-score-high bg-score-high/15" },
                      { n: "04", name: "Value unit", conf: "Medium", score: "1/2", color: "text-yellow-500 bg-yellow-500/15" },
                    ].map((d) => (
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

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-6">
        <div className="container mx-auto px-4 flex flex-col items-center gap-3">
          <EmailPreferences />
          <p className="text-sm text-muted-foreground">
            © 2026 ValueTempo. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={(open) => { setShowAuthModal(open); if (!open) setPendingUrl(null); }}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-6">
            <div className="text-center">
              <img alt="ValueTempo" className="h-8 mx-auto mb-4" src="/lovable-uploads/87678626-e604-46ee-90b6-9ab9b6380322.png" />
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