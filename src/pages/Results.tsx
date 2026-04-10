import { useState, useCallback, useEffect } from "react";
import ValueTempoLogo from "@/assets/ValueTempo_Logo_main.png";
import { Footer } from "@/components/Footer";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/utils/analytics";
import { TotalScoreCard } from "@/components/TotalScoreCard";
import { CompanyProfileCard } from "@/components/CompanyProfileCard";
import { ObservabilityStrip } from "@/components/ObservabilityStrip";
import { DimensionCard } from "@/components/DimensionCard";
import { StrengthsWeaknesses } from "@/components/StrengthsWeaknesses";
import { ChatPanel } from "@/components/ChatPanel";
import { InsiderPromptsPanel } from "@/components/InsiderPromptsPanel";
import { EvidenceSourcesPanel } from "@/components/EvidenceSourcesPanel";

import { FeedbackForm } from "@/components/FeedbackForm";
import { scraperApi, type ScrapedPage } from "@/lib/api/scraper";
import { exportToPDF } from "@/lib/pdfExport";
import { toast } from "sonner";
import type { ChatMessage, CompanyProfile, RubricScore, ObservabilityData } from "@/types/rubric";
import { ResourcesDropdown } from "@/components/ResourcesDropdown";

interface LocationState {
  companyProfile: CompanyProfile;
  rubricScore: RubricScore;
  observability: ObservabilityData;
  pages: ScrapedPage[];
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const initialState = location.state as (LocationState & { autoDownloadPdf?: boolean }) | null;

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(initialState?.companyProfile ?? null);
  const [rubricScore, setRubricScore] = useState<RubricScore | null>(initialState?.rubricScore ?? null);
  const [observability, setObservability] = useState<ObservabilityData | null>(initialState?.observability ?? null);
  const [pages, setPages] = useState<ScrapedPage[]>(initialState?.pages ?? []);

  // PDF hint popup state (shown after 2s for anonymous users)
  const [showPdfHint, setShowPdfHint] = useState(false);
  const [pdfHintDismissed, setPdfHintDismissed] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);

  // Redirect to home if no state
  useEffect(() => {
    if (!initialState) {
      navigate("/", { replace: true });
    }
  }, [initialState, navigate]);

  // Track first_scan_completed and save report to sessionStorage for PDF gate recovery
  useEffect(() => {
    if (!companyProfile || !rubricScore || !observability) return;
    trackEvent('first_scan_completed', { score: rubricScore.totalScore });
    try {
      sessionStorage.setItem('lastReport', JSON.stringify({ companyProfile, rubricScore, observability, pages }));
    } catch {
      // sessionStorage unavailable — non-fatal
    }
  }, [companyProfile, rubricScore, observability]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-download PDF after login redirect from PDF gate
  useEffect(() => {
    if (!initialState?.autoDownloadPdf) return;
    if (!companyProfile || !rubricScore || !observability) return;
    trackEvent('pdf_downloaded');
    exportToPDF({ companyProfile, rubricScore, observability });
  }, [initialState?.autoDownloadPdf, companyProfile, rubricScore, observability]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show PDF hint popup after 2 seconds (anonymous users only)
  useEffect(() => {
    if (pdfHintDismissed) return;
    if (!session || !session.user.is_anonymous) return;
    const timer = setTimeout(() => {
      setShowPdfHint(true);
      trackEvent('pdf_hint_shown');
    }, 2000);
    return () => clearTimeout(timer);
  }, [session, pdfHintDismissed]);

  const handlePdfClick = useCallback((source: 'hint_popup' | 'header_button' = 'header_button') => {
    if (!session || session.user.is_anonymous) {
      trackEvent('pdf_cta_clicked', { source });
      navigate('/?auth=pdf');
      return;
    }
    trackEvent('pdf_downloaded');
    if (companyProfile && rubricScore && observability) {
      exportToPDF({ companyProfile, rubricScore, observability });
    }
  }, [session, companyProfile, rubricScore, observability, navigate]);

  const handleDimensionClick = useCallback((dimension: string) => {
    const element = document.getElementById(
      `dimension-${dimension.toLowerCase().replace(/\s+/g, "-")}`
    );
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!companyProfile) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const result = await scraperApi.chat(content, history, {
        pages,
        companyName: companyProfile.companyName,
        rubricScore: rubricScore ? {
          totalScore: rubricScore.totalScore,
          maxScore: rubricScore.maxScore,
          band: rubricScore.band,
          dimensionScores: rubricScore.dimensionScores.map(d => ({
            dimension: d.dimension,
            score: d.score,
            confidence: d.confidence,
            rationale: d.rationale,
            observed: d.observed,
          })),
          strengths: rubricScore.strengths.map(s => ({
            dimension: s.dimension,
            whyItIsStrong: s.whyItIsStrong,
          })),
          weaknesses: rubricScore.weaknesses.map(w => ({
            dimension: w.dimension,
            whatIsMissingOrUnclear: w.whatIsMissingOrUnclear,
            whyItMatters: w.whyItMatters,
          })),
        } : undefined,
      });

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: result.success ? result.response || "No response generated." : `Error: ${result.error}`,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: "Sorry, there was an error processing your message. Please try again.",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatMessages, companyProfile, pages, rubricScore]);

  const handleInsiderSubmit = useCallback(async (answers: Record<string, string>) => {
    if (!companyProfile || !rubricScore || pages.length === 0) return;

    setIsRerunning(true);
    toast.info("Re-analyzing with your insider context (scores unchanged without public evidence)...");

    try {
      const previousScores = rubricScore.dimensionScores.map(d => ({
        dimension: d.dimension,
        score: d.score,
        confidence: d.confidence,
      }));

      const url = pages[0]?.url ? new URL(pages[0].url).origin : "";

      const result = await scraperApi.analyzeCompany(pages, url, {
        insiderAnswers: answers,
        previousScores,
        existingProfile: companyProfile as unknown as Record<string, unknown>,
      });

      if (result.success && result.rubricScore && result.observability) {
        setRubricScore(result.rubricScore);
        setObservability(result.observability);
        if (result.companyProfile) {
          setCompanyProfile(result.companyProfile);
        }

        toast.info("Insider context processed. Recommendations updated — public scores unchanged.");
      } else {
        toast.error(result.error || "Re-analysis failed. Please try again.");
      }
    } catch (err) {
      console.error("Rerun error:", err);
      toast.error("Re-analysis failed. Please try again.");
    } finally {
      setIsRerunning(false);
    }
  }, [companyProfile, rubricScore, pages]);

  const handlePublicLinksSubmit = useCallback(async (links: Array<{ url: string; dimension?: string }>) => {
    if (!companyProfile || !rubricScore || pages.length === 0) return;

    // Validate URLs before scraping
    const validLinks = links.filter(link => {
      try {
        let urlToTest = link.url.trim();
        if (!urlToTest.startsWith("http://") && !urlToTest.startsWith("https://")) {
          urlToTest = "https://" + urlToTest;
        }
        new URL(urlToTest);
        return true;
      } catch {
        return false;
      }
    });

    if (validLinks.length === 0) {
      toast.error("No valid URLs provided. Please enter valid web addresses.");
      return;
    }

    if (validLinks.length < links.length) {
      toast.warning(`${links.length - validLinks.length} invalid URL(s) skipped.`);
    }

    setIsRerunning(true);
    toast.info("Scraping submitted links and re-analyzing...");

    try {
      // Scrape each submitted link
      const scrapePromises = validLinks.map(async (link) => {
        try {
          const result = await scraperApi.scrapeWebsite(link.url, { maxPages: 1 });
          if (result.success && result.pages && result.pages.length > 0) {
            return result.pages[0];
          }
          return null;
        } catch {
          return null;
        }
      });

      const scrapedPages = await Promise.all(scrapePromises);
      const newPages = scrapedPages.filter(Boolean) as typeof pages;

      if (newPages.length === 0) {
        toast.error("Could not scrape any of the submitted links. Please check the URLs.");
        setIsRerunning(false);
        return;
      }

      // Merge new pages with existing (dedup by URL)
      const existingUrls = new Set(pages.map(p => p.url));
      const uniqueNewPages = newPages.filter(p => !existingUrls.has(p.url));
      const allPages = [...pages, ...uniqueNewPages];
      setPages(allPages);

      const previousScores = rubricScore.dimensionScores.map(d => ({
        dimension: d.dimension,
        score: d.score,
        confidence: d.confidence,
      }));

      const url = pages[0]?.url ? new URL(pages[0].url).origin : "";

      const result = await scraperApi.analyzeCompany(allPages, url, {
        previousScores,
        existingProfile: companyProfile as unknown as Record<string, unknown>,
      });

      if (result.success && result.rubricScore && result.observability) {
        const oldScore = rubricScore.totalScore;
        const newScore = result.rubricScore.totalScore;
        const oldConfidence = Math.round(
          rubricScore.dimensionScores.reduce((s, d) => s + d.confidence, 0) / rubricScore.dimensionScores.length * 100
        );
        const newConfidence = result.observability.confidenceScore;

        setRubricScore(result.rubricScore);
        setObservability(result.observability);
        if (result.companyProfile) {
          setCompanyProfile(result.companyProfile);
        }

        // Show delta
        const changedDims = result.rubricScore.dimensionScores
          .filter((d, i) => {
            const prev = previousScores.find(p => p.dimension === d.dimension);
            return prev && (prev.score !== d.score || Math.abs(prev.confidence - d.confidence) > 0.05);
          })
          .map(d => d.dimension);

        const parts: string[] = [];
        parts.push(`Score: ${oldScore} → ${newScore}/${rubricScore.maxScore}`);
        parts.push(`Confidence: ${oldConfidence}% → ${newConfidence}%`);
        parts.push(`${uniqueNewPages.length} new page${uniqueNewPages.length !== 1 ? "s" : ""} added`);
        if (changedDims.length > 0) {
          parts.push(`Changed: ${changedDims.join(", ")}`);
        }

        if (newScore > oldScore) {
          toast.success(parts.join(" · "));
        } else {
          toast.info(parts.join(" · "));
        }
      } else {
        toast.error(result.error || "Re-analysis failed.");
      }
    } catch (err) {
      console.error("Public links rerun error:", err);
      toast.error("Re-analysis failed. Please try again.");
    } finally {
      setIsRerunning(false);
    }
  }, [companyProfile, rubricScore, pages]);
  // Loading state while redirecting
  if (!initialState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!companyProfile || !rubricScore || !observability) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <img alt="ValueTempo" className="h-8" src={ValueTempoLogo} />
            </Link>
            <Button variant="outline" size="sm" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AVS Rubric
            </Button>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
              Beta
            </span>
            <div className="h-4 w-px bg-border hidden md:block" />
            <span className="text-sm text-muted-foreground truncate max-w-[200px] md:max-none hidden md:block">
              {companyProfile.companyName}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Methodology
              </Link>
              <ResourcesDropdown />
            </nav>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePdfClick('header_button')}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {/* Total Score */}
            <TotalScoreCard
              totalScore={rubricScore.totalScore}
              maxScore={rubricScore.maxScore}
              band={rubricScore.band}
              companyName={companyProfile.companyName}
            />

            {/* Company Profile */}
            <CompanyProfileCard profile={companyProfile} />

            {/* Observability Strip */}
            <ObservabilityStrip
              data={observability}
              onDimensionClick={handleDimensionClick}
            />

            {/* Evidence Sources */}
            <EvidenceSourcesPanel pages={pages} />


            {/* Strengths & Weaknesses */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-xl font-bold mb-4">Analysis Summary</h2>
              <StrengthsWeaknesses
                strengths={rubricScore.strengths}
                weaknesses={rubricScore.weaknesses}
                trustBreakpoints={rubricScore.trustBreakpoints}
                recommendedFocus={rubricScore.recommendedFocus}
              />
            </motion.div>

            {/* Dimension Scores */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-xl font-bold mb-4">Dimension Scores</h2>
              <div className="space-y-3">
                {rubricScore.dimensionScores.map((dimension, i) => (
                  <DimensionCard key={dimension.dimension} dimension={dimension} index={i} />
                ))}
              </div>
            </motion.div>

            {/* Improve Accuracy Panel */}
            <InsiderPromptsPanel
              dimensions={rubricScore.dimensionScores}
              onSubmitAnswers={handleInsiderSubmit}
              onSubmitPublicLinks={handlePublicLinksSubmit}
              isRerunning={isRerunning}
            />

            {/* Challenge Chat */}
            <ChatPanel
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
            />

            {/* Feedback Form */}
            <FeedbackForm companyName={companyProfile.companyName} />
          </div>
        </div>
      </main>

      <Footer />

      {/* PDF hint popup — shown after 2s for anonymous users */}
      {showPdfHint && !pdfHintDismissed && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-4 max-w-xs w-full">
          <button
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
            onClick={() => {
              setShowPdfHint(false);
              setPdfHintDismissed(true);
              trackEvent('pdf_hint_dismissed');
            }}
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-sm font-semibold text-gray-900 mb-1 pr-5">
            Download this report as PDF
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Log-in required.{' '}
            <a href="/privacy" className="underline hover:text-foreground" target="_blank" rel="noreferrer">
              See our privacy rules
            </a>
          </p>
          <Button
            size="sm"
            className="w-full bg-vt-midnight text-white hover:bg-vt-midnight/90 rounded-[20px] h-8 text-xs"
            onClick={() => handlePdfClick('hint_popup')}
          >
            <Download className="w-3 h-3 mr-1.5" />
            Download PDF
          </Button>
        </div>
      )}
    </div>
  );
}
