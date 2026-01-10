import { useState, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TotalScoreCard } from "@/components/TotalScoreCard";
import { CompanyProfileCard } from "@/components/CompanyProfileCard";
import { ObservabilityStrip } from "@/components/ObservabilityStrip";
import { DimensionCard } from "@/components/DimensionCard";
import { StrengthsWeaknesses } from "@/components/StrengthsWeaknesses";
import { ChatPanel } from "@/components/ChatPanel";
import { EmailCaptureModal } from "@/components/EmailCaptureModal";
import { mockScanResult, mockChatMessages } from "@/data/mockData";
import type { ChatMessage } from "@/types/rubric";

export default function Results() {
  const location = useLocation();
  const url = (location.state as { url?: string })?.url || "https://example.com";
  
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Use mock data - in production this would come from an API
  const scanResult = {
    ...mockScanResult,
    url,
    companyProfile: {
      ...mockScanResult.companyProfile!,
      companyName: new URL(url).hostname.replace("www.", "").split(".")[0].charAt(0).toUpperCase() + 
                   new URL(url).hostname.replace("www.", "").split(".")[0].slice(1),
    },
  };

  const handleDimensionClick = useCallback((dimension: string) => {
    const element = document.getElementById(
      `dimension-${dimension.toLowerCase().replace(/\s+/g, "-")}`
    );
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);

    setIsChatLoading(true);

    // Simulate AI response
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now() + 1}`,
      role: "assistant",
      content: getAIResponse(content),
      citations: [
        { url: `${url}/pricing`, quote: "Enterprise plans include dedicated support" },
      ],
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, assistantMessage]);
    setIsChatLoading(false);
  }, [url]);

  const getAIResponse = (question: string): string => {
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes("safety") || lowerQ.includes("rails")) {
      return `Based on our scan, here's why Safety Rails scored a 1:

• **What we found:** Admin dashboard mentions usage limits and alert notifications
• **What's missing:** No visible budget caps or real-time spend controls documented
• **Why it matters:** Enterprise buyers need confidence they won't face surprise bills

**What would a 2 look like?**
- Documented budget caps with configurable thresholds
- Real-time alerts when approaching limits (e.g., 80%, 95%)
- Automatic pause or throttle options
- Public trust center with spend control documentation

**What's unclear publicly:** Whether these features exist but aren't documented, or if they're planned for future releases.`;
    }
    
    if (lowerQ.includes("90 days") || lowerQ.includes("fix")) {
      return `Based on your rubric profile, I'd prioritize:

1. **Safety Rails & Trust Surfaces** (currently scored 1)
   - Implement documented budget caps
   - Create a public trust center page
   
2. **Overages & Risk Allocation** (currently scored 0)
   - Publish clear overage pricing
   - Document risk allocation in customer agreements

These two improvements would likely move your total score from 12 to 15-16, shifting you from "Emerging" toward "Established" band.

*If you'd like help designing specific experiments for these improvements, AVS Brain can help you pick safe experiments tied to your 90-day goal.*`;
    }
    
    return `I'm analyzing your question based on the scan results for ${scanResult.companyProfile?.companyName}.

Based on the public information we gathered:
• We scanned ${scanResult.observability?.pagesUsed.length} pages from your website
• Overall confidence in our assessment is ${scanResult.observability?.confidenceScore}%
• The most uncertain areas are ${scanResult.observability?.mostUncertainDimensions.map(d => d.dimension).join(" and ")}

Would you like me to explain a specific dimension score or suggest improvements?`;
  };

  if (!scanResult.companyProfile || !scanResult.rubricScore || !scanResult.observability) {
    return <div>Loading...</div>;
  }

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
              {url}
            </span>
          </div>
          <Button 
            onClick={() => setShowEmailModal(true)}
            className="bg-gradient-primary"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Full Plan
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Total Score */}
            <TotalScoreCard
              totalScore={scanResult.rubricScore.totalScore}
              maxScore={scanResult.rubricScore.maxScore}
              band={scanResult.rubricScore.band}
              companyName={scanResult.companyProfile.companyName}
            />

            {/* Company Profile */}
            <CompanyProfileCard profile={scanResult.companyProfile} />

            {/* Observability Strip */}
            <ObservabilityStrip
              data={scanResult.observability}
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
                strengths={scanResult.rubricScore.strengths}
                weaknesses={scanResult.rubricScore.weaknesses}
                trustBreakpoints={scanResult.rubricScore.trustBreakpoints}
                recommendedFocus={scanResult.rubricScore.recommendedFocus}
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
                {scanResult.rubricScore.dimensionScores.map((dimension, i) => (
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
        companyName={scanResult.companyProfile.companyName}
      />
    </div>
  );
}
