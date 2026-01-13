import { useState, useCallback, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TotalScoreCard } from "@/components/TotalScoreCard";
import { CompanyProfileCard } from "@/components/CompanyProfileCard";
import { ObservabilityStrip } from "@/components/ObservabilityStrip";
import { DimensionCard } from "@/components/DimensionCard";
import { StrengthsWeaknesses } from "@/components/StrengthsWeaknesses";
import { ChatPanel } from "@/components/ChatPanel";
import { EmailCaptureModal } from "@/components/EmailCaptureModal";
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
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                New Scan
              </Button>
            </Link>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground truncate max-w-[200px] md:max-w-none">
              {companyProfile.companyName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => exportToPDF({ companyProfile, rubricScore, observability })}
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button 
              onClick={() => setShowEmailModal(true)}
              className="bg-gradient-primary"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Get Full Plan
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Main Content */}
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
          </div>

          {/* Sidebar - Chat */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ChatPanel
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
            />
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
