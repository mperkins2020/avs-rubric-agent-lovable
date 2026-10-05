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
import { trackEvent, trackReturningUserAndMark } from "@/utils/analytics";
import { saveLastReport } from "@/utils/reportStorage";
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
    question: "Who is ValueTempo built for?",
    answer:
      "ValueTempo is built for AI SaaS founders, product marketers, pricing leads, and GTM operators who need to make their product easier for buyers to understand, evaluate, trust, and buy before the first sales conversation.",
  },
  {
    question: "What is buyability?",
    answer:
      "Buyability is the degree to which a buyer — human or AI agent — can independently understand, evaluate, budget for, and justify a product without engaging sales. It is the gap between buyer intent and decision-readiness. The AVS Rubric measures the trust infrastructure that enables it.",
  },
  {
    question: "How is buyability measured?",
    answer:
      "ValueTempo uses the AVS Rubric to evaluate published buyer-facing evidence across 8 key dimensions, including product clarity, ICP and job-to-be-done, budget clarity, value unit, cost drivers, packaging, overages and risk, and safety rails.",
  },
  {
    question: "Why does buyability matter for AI SaaS?",
    answer:
      "AI SaaS products often introduce new value units, usage patterns, pricing models, and operational risks. When buyers cannot understand those details before sales, evaluation slows down, trust weakens, and GTM teams have to explain the same commercial logic repeatedly.",
  },
  {
    question: "What is the AI SaaS Buyability Benchmark?",
    answer:
      "The AI SaaS Buyability Benchmark is a ValueTempo report that evaluates how well AI SaaS companies publish the commercial evidence buyers need before the first sales conversation. The May 2026 edition scored 60 companies across 5 categories and 8 evidence dimensions.",
  },
  {
    question: "What is a buyability score walkthrough?",
    answer:
      "A buyability score walkthrough is a session that identifies where a company's public buyer evidence is strong, where buyer-confidence gaps remain, and what to publish next to improve buyability.",
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

// Existing booking link already used across the app (case studies, benchmarks, methodology).
const BOOKING_URL = "https://calendly.com/mlhperkins/30min";

const lostItems = [
  "What evidence changed a decision",
  "What hypothesis was being tested",
  "Why an intervention was chosen",
  "What happened afterward",
  "What to learn before the next decision",
];

const loopSteps = [
  "Observe evidence",
  "Frame the decision",
  "Act",
  "Measure the response",
  "Update what we know",
];

const services = [
  {
    title: "AEO / AI Visibility Project",
    price: "$2,500",
    description:
      "Diagnose and prioritize AI visibility and evidence gaps based on the buyer decisions they may constrain, then design and test appropriate interventions.",
  },
  {
    title: "GTM Project",
    price: "$5,000",
    description:
      "Address a broader GTM decision problem through evidence gathering, diagnosis, intervention design, testing, and learning.",
  },
];

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
    errorCode,
    startScan,
    companyProfile,
    rubricScore,
    observability,
    modelClassification,
    pages,
    chatMessages
  } = useScan();
  const isLoading = status === 'scraping' || status === 'analyzing';
  const servicesRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = servicesRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        trackEvent('services_viewed');
        obs.disconnect();
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);


  useEffect(() => {
    if (status === 'complete' && companyProfile && rubricScore && observability) {
      saveLastReport({ companyProfile, rubricScore, observability, modelClassification, pages });
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
      if (errorCode === 'anon_limit') {
        setAuthModalReason('second-run');
        setShowAuthModal(true);
        trackEvent('second_run_gate_hit');
        trackEvent('signup_modal_opened', { reason: 'second_run_fallback' });
      } else {
        toast.error("Scan Failed", { description: error });
      }
    }
  }, [status, error, errorCode]);

  // Silent anonymous sign-in for first-time visitors
  useEffect(() => {
    const initAnonymousSession = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (!existingSession) {
        const { error: anonError } = await supabase.auth.signInAnonymously();
        if (!anonError) {
          trackEvent('anon_session_start');
          trackReturningUserAndMark();
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
        saveLastReport({ ...data, autoDownloadPdf: true });
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
        trackReturningUserAndMark();
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
      const { data: priorScans } = await supabase
        .from('scan_usage')
        .select('id')
        .eq('user_id', activeSession.user.id)
        .limit(1);
      if (priorScans && priorScans.length >= 1) {
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

    trackEvent('diagnostic_started', { url });
    await startScan(url);
  };

  const scrollToDiagnostic = (location: string) => {
    trackEvent('diagnostic_cta_clicked', { location });
    document.getElementById('url-input')?.scrollIntoView({ behavior: 'smooth' });
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
        title="ValueTempo — GTM learning for AI-native B2B teams"
        description="ValueTempo helps AI-native B2B teams turn buyer evidence, GTM decisions, and outcomes into learning. Start with a free buyability check or talk through your GTM problem."
        canonicalUrl="https://app.valuetempo.com/"
        type="website"
      />

      {/* Announcement Bar */}
      <Link
        to="/ai-search-visibility-aeo-benchmark-august-2026"
        className="block w-full bg-gradient-to-r from-vt-cyan via-vt-blue to-vt-violet text-white"
      >
        <div className="container mx-auto px-4 md:px-10 py-2.5 flex items-center justify-center gap-2 text-sm md:text-base flex-wrap">
          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur-sm shrink-0">
            New
          </span>
          <span className="font-medium text-center">
            AI Search Visibility &amp; AEO Benchmark, August 2026 is live: 12 companies analyzed across 3 emerging layers.
          </span>
          <span className="font-semibold underline-offset-2 hover:underline whitespace-nowrap shrink-0">
            Get the Executive Brief →
          </span>
        </div>
      </Link>

      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-white/75 backdrop-blur-md">
        <div className="container mx-auto px-5 md:px-10 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src={ValueTempoLogo} />
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#services" className="text-sm text-foreground hover:text-primary transition-colors">
              Services
            </a>
            <a href="https://www.valuetempo.com/methodology" className="text-sm text-foreground hover:text-primary transition-colors">
              Methodology
            </a>
            <a href="https://www.valuetempo.com/about" className="text-sm text-foreground hover:text-primary transition-colors">
              About
            </a>
            <ResourcesDropdown />
            <Button
              size="sm"
              className="bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[20px] px-5 h-9"
              onClick={() => scrollToDiagnostic('nav')}
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
                <a href="https://www.valuetempo.com/about" className="flex items-center px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  About
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

      <main>
      {/* Hero section */}
      <section className="relative pt-14 pb-4 md:pt-18 md:pb-6 overflow-hidden">
        <div className="hero-blob" aria-hidden="true" />
        <div className="container relative z-10 mx-auto px-5 md:px-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
            <h1 id="hero" className="text-3xl sm:text-4xl md:text-[52px] font-bold mb-5 leading-[1.15] tracking-tight">
              <span className="block">AI makes GTM execution faster.</span>
              <span className="mt-2 md:mt-3 block">
                Your <span className="gradient-text">learning system</span> has to keep up.
              </span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              ValueTempo helps AI-native B2B teams turn buyer evidence, GTM decisions, and market outcomes into learning that improves the next decision.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <Button asChild size="lg" className="bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[20px] px-7 h-12 font-semibold">
                <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('primary_service_cta_clicked', { location: 'hero' })}>
                  Talk through your GTM problem
                  <ArrowRight className="w-5 h-5 ml-2" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="rounded-[20px] px-7 h-12 font-semibold" onClick={() => scrollToDiagnostic('hero')}>
                Check your buyability
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-3">Free buyability check — enter your website:</p>
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

      {/* Problem */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-5 md:px-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary mb-3">The problem</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">More context isn't automatically more learning</h2>
            <p className="text-muted-foreground mb-8">
              As people and AI agents share information and run GTM work together, execution can speed up faster than the team's learning. What often gets lost:
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
            {lostItems.map((item) => (
              <li key={item} className="bg-card border border-border rounded-2xl p-5 text-sm text-foreground shadow-vt-sm">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Learning loop */}
      <section className="py-16 md:py-20 bg-secondary">
        <div className="container mx-auto px-5 md:px-10">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary mb-3">How we work</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">A simple learning loop</h2>
            <p className="text-muted-foreground">Each GTM decision should leave the team knowing more for the next one.</p>
          </div>
          <ol className="flex flex-col md:flex-row items-stretch justify-center gap-3 md:gap-2 max-w-6xl mx-auto">
            {loopSteps.map((step, i) => (
              <li key={step} className="flex flex-col md:flex-row items-center gap-2 md:gap-2 flex-1">
                <div className="w-full bg-card border border-border rounded-2xl px-4 py-5 text-center shadow-vt-sm flex-1">
                  <span className="block text-xs font-semibold text-primary mb-1">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-semibold text-sm">{step}</span>
                </div>
                {i < loopSteps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 rotate-90 md:rotate-0" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
          <p className="text-center text-xs text-muted-foreground mt-6">…then the loop starts again with better evidence.</p>
        </div>
      </section>

      {/* Three-pillar features */}
      <section id="diagnostic" className="py-16 md:py-24">
        <div className="container mx-auto px-5 md:px-10">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary mb-3 text-center">Free buyability diagnostic</p>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">One way to start: find where buyer friction exists</h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-10">
            The free AVS Rubric check scores what a buyer or AI agent can verify before engaging sales.
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

      {/* Services + pricing */}
      <section id="services" ref={servicesRef} className="py-16 md:py-24 scroll-mt-24">
        <div className="container mx-auto px-5 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary mb-3">Working with ValueTempo</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Paid help starts where diagnosis stops</h2>
            <p className="text-muted-foreground">
              Finding a gap is the first step. We help you decide which gap is worth acting on, which buyer decision it may be constraining, what intervention to test, and what signal would show it worked.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {services.map((s, i) => (
              <div
                key={s.title}
                style={{ borderTop: `3px solid ${i === 0 ? 'hsl(var(--vt-cyan))' : 'hsl(var(--vt-violet))'}` }}
                className="bg-card border border-border rounded-3xl p-7 shadow-vt-sm flex flex-col"
              >
                <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Starting at <span className="text-2xl font-bold text-foreground align-middle">{s.price}</span>
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{s.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild size="lg" className="bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[20px] px-8 h-12 font-semibold">
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('primary_service_cta_clicked', { location: 'services' })}>
                Talk through your GTM problem
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
            <p className="text-xs text-muted-foreground mt-3">Scope and price are confirmed after a first conversation.</p>
          </div>
        </div>
      </section>

      {/* Dark CTA band */}
      <section className="dark-anchor py-16 md:py-20">
        <div className="container mx-auto px-5 md:px-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-[hsl(var(--vt-text-on-dark))]">
            Two ways to start
          </h2>
          <p className="text-[hsl(var(--vt-text-on-dark-secondary))] mb-8 max-w-lg mx-auto">
            Have a GTM problem? Talk with us. Want to see where buyer friction exists first? Run the free buyability check.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-vt-midnight hover:bg-white/90 rounded-[20px] px-8 h-12 font-semibold shadow-vt-sm transition-shadow hover:shadow-[0_18px_50px_-10px_hsl(var(--vt-cyan)/0.55)]"
            >
              <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('primary_service_cta_clicked', { location: 'footer_band' })}>
                Talk through your GTM problem
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white rounded-[20px] px-8 h-12 font-semibold"
              onClick={() => scrollToDiagnostic('footer_band')}
            >
              Check your buyability
            </Button>
          </div>
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
      </main>

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
