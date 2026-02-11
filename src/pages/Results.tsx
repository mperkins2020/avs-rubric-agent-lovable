import { useState, useCallback, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TotalScoreCard } from "@/components/TotalScoreCard";
import { CompanyProfileCard } from "@/components/CompanyProfileCard";
import { ObservabilityStrip } from "@/components/ObservabilityStrip";
import { DimensionCard } from "@/components/DimensionCard";
import { StrengthsWeaknesses } from "@/components/StrengthsWeaknesses";
import { ChatPanel } from "@/components/ChatPanel";
import { EmailCaptureModal } from "@/components/EmailCaptureModal";
import { FeedbackForm } from "@/components/FeedbackForm";
import { scraperApi, type ScrapedPage } from "@/lib/api/scraper";
import { exportToPDF } from "@/lib/pdfExport";
import type { ChatMessage, CompanyProfile, RubricScore, ObservabilityData } from "@/types/rubric";

interface LocationState {
  companyProfile: CompanyProfile;
  rubricScore: RubricScore;
  observability: ObservabilityData;
  pages: ScrapedPage[];
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Redirect to home if no state
  useEffect(() => {
    if (!state) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  const handleDimensionClick = useCallback((dimension: string) => {
    const element = document.getElementById(
      `dimension-${dimension.toLowerCase().replace(/\s+/g, "-")}`
    );
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!state) return;

    // Add user message
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
        pages: state.pages,
        companyName: state.companyProfile.companyName,
        rubricScore: {
          totalScore: state.rubricScore.totalScore,
          maxScore: state.rubricScore.maxScore,
          band: state.rubricScore.band,
        },
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
  }, [chatMessages, state]);

  // Loading state while redirecting
  if (!state) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const { companyProfile, rubricScore, observability } = state;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
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
            <div className="h-4 w-px bg-border hidden md:block" />
            <span className="text-sm text-muted-foreground truncate max-w-[200px] md:max-w-none hidden md:block">
              {companyProfile.companyName}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Methodology
              </Link>
              <Link to="/faq/product-growth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ: Growth
              </Link>
            </nav>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => exportToPDF({ companyProfile, rubricScore, observability })}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button 
              onClick={() => setShowEmailModal(true)}
              size="sm"
              className="bg-gradient-primary"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Full Plan
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

      {/* Email Capture Modal */}
      <EmailCaptureModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        companyName={companyProfile.companyName}
      />
    </div>
  );
}
