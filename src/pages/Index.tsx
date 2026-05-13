import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { URLInput } from "@/components/URLInput";
import { Eye, Calculator, ShieldCheck, CheckCircle2, AlertCircle, LogOut, LogIn, Menu, X } from "lucide-react";
import { Footer } from "@/components/Footer";
import { ReportPreviewCarousel } from "@/components/ReportPreviewCarousel";
import { useScan } from "@/hooks/useScan";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";
import { CategoryCarousel } from "@/components/CategoryCarousel";
import { SEOHead } from "@/components/SEOHead";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { trackEvent } from "@/utils/analytics";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQJsonLd } from "@/components/FAQJsonLd";

const homepageFaqs = [
  {
    question: "Who is the AVS Rubric built for?",
    answer:
      "The AVS Rubric is built for AI-native B2B products and AI-powered SaaS teams — product marketers, pricing leads, and GTM operators who need to understand how buyers evaluate their product before engaging sales.",
  },
  {
    question: "What is buyability?",
    answer:
      "Buyability is the degree to which a buyer — human or AI agent — can independently understand, evaluate, budget for, and justify a product without engaging sales. It is the gap between buyer intent and decision-readiness. The AVS Rubric measures the trust infrastructure that enables it.",
  },
  {
    question: "How is buyability measured?",
    answer:
      "The AVS Rubric measures the trust infrastructure that enables buyability, scoring products across 8 buyer-confidence dimensions: from pricing clarity and cost driver mapping to operational controls and compliance visibility. Each dimension is scored from publicly available evidence — the same evidence a buyer or AI agent would encounter. When that infrastructure is strong, buyers can independently verify what they need to evaluate, budget for, and justify a product. That is buyability.",
  },
  {
    question: "Why does buyability matter for AI agents?",
    answer:
      "AI agents are increasingly involved in vendor evaluation and purchasing decisions. An agent cannot ask follow-up questions or infer information behind a contact-us wall. If pricing, value units, and cost drivers are not structured and publicly available, the product is invisible to agent-led evaluation.",
  },
];

const dimensionDefinitions: Record<string, string> = {
  "Product North Star": "Observable outcomes tie to value delivery and predictability.",
  "ICP & Job Clarity": "Clear target user and job, anchored in workflows.",
  "Buyer & Budget Alignment": "Plans map to buyer, budget cycles, and approvals.",
  "Value Unit": "Billable unit tracks value, is predictable and auditable.",
  "Cost Driver Mapping": "Usage and cost drivers are explicit and forecastable.",
  "Pools & Packaging": "Tiers separate exploration from production by segment.",
  "Overages & Risk Allocation": "Limit behavior is explicit, risk is fairly shared.",
  "Safety Rails & Trust Surfaces": "Controls prevent surprises, show usage, enable limits.",
};

const Index = () => {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<'second-run' | 'pdf' | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [pendingPdfDownload, setPendingPdfDownload] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authIsLogin, setAuthIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authResetSent, setAuthResetSent] = useState(false);
  const [authSendingReset, setAuthSendingReset] = useState(false);
  // Track previous anonymous state to detect session upgrade
  const prevIsAnonymousRef = useRef<boolean | null>(null);
  const {
    status,
    statusMessage,
    error,
    startScan,
    companyProfile,
    rubricScore,
    observability,
    modelClassification,
    pages,
    chatMessages
  } = useScan();
  const isLoading = status === 'scraping' || status === 'analyzing';

  useEffect(() => {
    if (status === 'complete' && companyProfile && rubricScore && observability) {
      navigate("/results", {
        state: { companyProfile, rubricScore, observability, modelClassification, pages }
      });
    }
  }, [status, companyProfile, rubricScore, observability, modelClassification, pages, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scanUrl = params.get('scan');
    if (scanUrl) {
      window.history.replaceState({}, '', window.location.pathname);
      if (session) {
        startScan(scanUrl);
      } else {
        setPendingUrl(scanUrl);
        setShowAuthModal(true);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, []);

  useEffect(() => {
    if (status === 'error' && error) {
      toast.error("Scan Failed", { description: error });
    }
  }, [status, error]);

  // Silent anonymous sign-in for first-time visitors
  useEffect(() => {
    const initAnonymousSession = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (!existingSession) {
        const { error: anonError } = await supabase.auth.signInAnonymously();
        if (!anonError) {
          trackEvent('anon_session_start');
        }
      }
    };
    initAnonymousSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle ?auth=pdf redirect from Results page PDF gate
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'pdf') {
      window.history.replaceState({}, '', '/');
      setAuthModalReason('pdf');
      setShowAuthModal(true);
      setPendingPdfDownload(true);
      trackEvent('signup_modal_opened', { reason: 'pdf' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // After authentication, handle pending PDF download
  useEffect(() => {
    if (!session || session.user.is_anonymous || !pendingPdfDownload) return;
    const stored = sessionStorage.getItem('lastReport');
    setPendingPdfDownload(false);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        sessionStorage.removeItem('lastReport');
        navigate('/results', { state: { ...data, autoDownloadPdf: true } });
      } catch {
        // sessionStorage data malformed — non-fatal, user is signed in at least
      }
    }
  }, [session, pendingPdfDownload, navigate]);

  // Detect anonymous-to-real session upgrade for signup_completed tracking
  useEffect(() => {
    if (!session) {
      prevIsAnonymousRef.current = null;
      return;
    }
    const currentIsAnon = session.user.is_anonymous ?? false;
    if (prevIsAnonymousRef.current === true && !currentIsAnon) {
      trackEvent('signup_completed', { method: 'email' });
    }
    prevIsAnonymousRef.current = currentIsAnon;
  }, [session]);

  useEffect(() => {
    if (session && pendingUrl) {
      const url = pendingUrl;
      setPendingUrl(null);
      setShowAuthModal(false);
      startScan(url);
    }
  }, [session, pendingUrl, startScan]);

  const handleSubmit = async (url: string) => {
    // Resolve session — try context first, then getSession(), then signInAnonymously()
    let activeSession = session;
    if (!activeSession) {
      const { data: { session: current } } = await supabase.auth.getSession();
      activeSession = current;
    }
    if (!activeSession) {
      // Background effect may still be in-flight — try sign-in inline now
      const { data, error: anonError } = await supabase.auth.signInAnonymously();
      if (!anonError && data.session) {
        activeSession = data.session;
        trackEvent('anon_session_start');
      }
    }
    if (!activeSession) {
      // Anonymous auth is disabled in Supabase — fall back to manual sign-in
      setPendingUrl(url);
      setAuthModalReason(null);
      setShowAuthModal(true);
      trackEvent('signup_modal_opened', { reason: 'manual' });
      return;
    }
    // Anonymous users are capped at 1 free scan
    if (activeSession.user.is_anonymous) {
      const { count } = await supabase
        .from('scan_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', activeSession.user.id);
      if ((count ?? 0) >= 1) {
        setPendingUrl(url);
        setAuthModalReason('second-run');
        setShowAuthModal(true);
        trackEvent('second_run_gate_hit');
        trackEvent('signup_modal_opened', { reason: 'second_run' });
        return;
      }
      // First scan for anonymous user
      trackEvent('first_scan_started', { url });
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
    icon: Eye,
    title: "Product Clarity",
    description: "Can buyers understand what your product does, who it is for, and what outcome it helps them achieve?"
  }, {
    icon: Calculator,
    title: "Cost Predictability",
    description: "Can buyers see what drives usage, how cost scales, and how to avoid budget surprises?"
  }, {
    icon: ShieldCheck,
    title: "Operational Trust",
    description: "Can buyers verify the controls, limits, safety rails, and governance needed to deploy with confidence?"
  }, {
    icon: CheckCircle2,
    title: "Decision Readiness",
    description: "Can champions justify the purchase to finance, security, procurement, and leadership?"
  }];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="ValueTempo — AI Product Buyability Score"
        description="The AVS Rubric scores your AI product's buyability across 8 trust dimensions buyers and AI agents use to evaluate, budget, and justify a purchase."
        canonicalUrl="https://app.valuetempo.com/"
        type="website"
      />

      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-white/75 backdrop-blur-md">
        <div className="container mx-auto px-5 md:px-10 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src={ValueTempoLogo} />
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="https://www.valuetempo.com/methodology" className="text-sm text-foreground hover:text-primary transition-colors">
              Methodology
            </a>
            <ResourcesDropdown />
            <Button
              size="sm"
              className="bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[20px] px-5 h-9"
              onClick={() => {
                const el = document.getElementById('url-input');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Analyze
            </Button>
            {session ? (
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-1 text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => { setAuthModalReason(null); setShowAuthModal(true); }} className="gap-1 text-muted-foreground hover:text-foreground">
                <LogIn className="w-4 h-4" />
                Sign in
              </Button>
            )}
          </nav>
          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 z-50 h-full w-72 bg-card border-l border-border flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <span className="font-semibold text-sm">Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors" aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
                <a href="https://www.valuetempo.com/methodology" className="flex items-center px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  Methodology
                </a>
                <ResourcesDropdown mobile onNavigate={() => setMobileMenuOpen(false)} />
              </nav>
              <div className="px-3 py-4 border-t border-border">
                {session ? (
                  <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                ) : (
                  <button onClick={() => { setMobileMenuOpen(false); setAuthModalReason(null); setShowAuthModal(true); }} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <LogIn className="w-4 h-4" /> Sign in
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hero section */}
      <section className="relative pt-14 pb-4 md:pt-18 md:pb-6 overflow-hidden">
        <div className="hero-blob" aria-hidden="true" />
        <div className="container relative z-10 mx-auto px-5 md:px-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
            <h1 id="hero" className="text-3xl sm:text-4xl md:text-[56px] font-bold mb-4 leading-[1.15] tracking-tight">
              <span className="block">Find the Buyer Friction</span>
              <span className="mt-3 md:mt-4 block">
                Slowing Your <span className="gradient-text">Growth</span>
              </span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-8 md:mb-10">
              AVS Rubric measures the trust infrastructure that enables buyability across 8 buyer-confidence dimensions.
            </p>

            <div id="url-input" className="flex justify-center mb-12 scroll-mt-24">
              <URLInput onSubmit={handleSubmit} isLoading={isLoading} />
            </div>

            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-secondary border border-border">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm text-muted-foreground">{statusMessage || 'Processing...'}</span>
                </div>
              </motion.div>
            )}

            {status === 'error' && error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Category Carousel */}
      <CategoryCarousel />

      {/* Three-pillar features */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container mx-auto px-5 md:px-10">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">What the analysis evaluates</h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            Your buyability score reflects what a buyer or AI agent can verify before engaging sales.
          </p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, i) => {
              const accents = [
                { border: 'hsl(var(--vt-cyan))', icon: 'text-vt-cyan', bg: 'bg-[hsl(var(--vt-cyan)/0.12)]', glow: 'glow-cyan-hover' },
                { border: 'hsl(var(--vt-violet))', icon: 'text-vt-violet', bg: 'bg-[hsl(var(--vt-violet)/0.12)]', glow: 'glow-violet-hover' },
                { border: 'hsl(var(--vt-mint))', icon: 'text-[hsl(var(--vt-mint))]', bg: 'bg-[hsl(var(--vt-mint)/0.14)]', glow: 'glow-mint-hover' },
                { border: 'hsl(var(--vt-coral))', icon: 'text-vt-coral', bg: 'bg-[hsl(var(--vt-coral)/0.12)]', glow: 'glow-coral-hover' },
              ];
              const a = accents[i % accents.length];
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  style={{ borderTop: `3px solid ${a.border}` }}
                  className={`bg-card border border-border rounded-3xl p-7 shadow-vt-sm ${a.glow}`}
                >
                  <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center mb-5`}>
                    <feature.icon className={`w-5 h-5 ${a.icon}`} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Report Preview */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-5 md:px-10">
          <ReportPreviewCarousel />
        </div>
      </section>

      {/* Dimension chips */}
      <section className="py-16 md:py-20 bg-secondary">
        <div className="container mx-auto px-5 md:px-10 text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
            <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
              Scored across 8 buyer-confidence dimensions
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-6">
              The rubric maps trust infrastructure across product clarity, pricing architecture, operational controls, and enterprise readiness.
            </p>
            <TooltipProvider delayDuration={100}>
              <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
                {Object.keys(dimensionDefinitions).map(dim => (
                  <Tooltip key={dim}>
                    <TooltipTrigger asChild>
                      <span className="px-4 py-2 text-xs rounded-full bg-card text-muted-foreground border border-border cursor-help hover:border-primary/30 transition-colors">
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
      </section>

      {/* Dark CTA band */}
      <section className="dark-anchor py-16 md:py-20">
        <div className="container mx-auto px-5 md:px-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-[hsl(var(--vt-text-on-dark))]">
            Ready to make your AI product easier to evaluate and buy?
          </h2>
          <p className="text-[hsl(var(--vt-text-on-dark-secondary))] mb-8 max-w-lg mx-auto">
            Get an instant, evidence-backed analysis of where buyers may lose clarity, confidence, or budget justification.
          </p>
          <Button
            size="lg"
            className="bg-white text-vt-midnight hover:bg-white/90 rounded-[20px] px-8 h-12 font-semibold shadow-vt-sm transition-shadow hover:shadow-[0_18px_50px_-10px_hsl(var(--vt-cyan)/0.55)]"
            onClick={() => {
              const el = document.getElementById('url-input');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Check Your Buyability Score
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      <section className="py-16 px-6 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-10">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {homepageFaqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`}>
                <AccordionTrigger className="text-left text-base md:text-lg font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
      <FAQJsonLd faqs={homepageFaqs} />

      <Footer />

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={(open) => { setShowAuthModal(open); if (!open) { setPendingUrl(null); setPendingPdfDownload(false); } }}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-6">
            <div className="text-center">
              <img alt="ValueTempo" className="h-8 mx-auto mb-4" src={ValueTempoLogo} />
              <h2 className="text-xl font-bold">
                {authIsLogin
                  ? "Sign in to continue"
                  : authModalReason === 'pdf'
                    ? "Create a free account to save and download"
                    : authModalReason === 'second-run'
                      ? "Create a free account to run more analyses"
                      : "Create account"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {authIsLogin
                  ? "Sign in to your account"
                  : "Sign up to get started — 3 analyses per week"}
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
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" htmlFor="auth-password">Password</label>
                  {authIsLogin && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline disabled:pointer-events-none disabled:opacity-60"
                      disabled={authSendingReset}
                      onClick={async () => {
                        if (authSendingReset) return;
                        const trimmedEmail = authEmail.trim().toLowerCase();
                        if (!trimmedEmail) {
                          toast.error("Enter your email first, then click Forgot password.");
                          return;
                        }
                        setAuthSendingReset(true);
                        try {
                          const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
                            redirectTo: `${window.location.origin}/reset-password`,
                          });
                          if (error) throw error;
                          setAuthResetSent(true);
                          toast.success("Password reset link sent — check your email.");
                        } catch (err: unknown) {
                          const msg = err instanceof Error ? err.message : "";
                          if (msg.toLowerCase().includes("rate limit")) {
                            toast.error("Too many attempts — please wait a minute and try again.");
                          } else {
                            toast.error(msg || "Could not send reset email");
                          }
                        } finally {
                          setAuthSendingReset(false);
                        }
                      }}
                    >
                      {authSendingReset ? "Sending…" : "Forgot password?"}
                    </button>
                  )}
                </div>
                <Input id="auth-password" type="password" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} minLength={6} required />
              </div>
              {authResetSent && authIsLogin && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-foreground flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span>We sent a reset link to <strong>{authEmail.trim().toLowerCase()}</strong>. Check your inbox (and spam) and click the link to set a new password.</span>
                </div>
              )}
              <Button type="submit" className="w-full gap-2 bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[20px] h-11" disabled={authLoading}>
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
    </div>
  );
};
export default Index;
