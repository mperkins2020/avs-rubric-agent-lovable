import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, MessageSquareWarning, Send, Loader2, ChevronDown, RotateCcw, Plus, X, Info } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DimensionScore } from "@/types/rubric";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PublicLinkEntry {
  url: string;
  dimension?: string;
}

interface InsiderPromptsPanelProps {
  dimensions: DimensionScore[];
  onSubmitAnswers: (answers: Record<string, string>) => void;
  onSubmitPublicLinks?: (links: PublicLinkEntry[]) => void;
  isRerunning: boolean;
}

type InputMode = "links" | "insider";

export function InsiderPromptsPanel({ dimensions, onSubmitAnswers, onSubmitPublicLinks, isRerunning }: InsiderPromptsPanelProps) {
  const [mode, setMode] = useState<InputMode>("links");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);
  const [publicLinks, setPublicLinks] = useState<PublicLinkEntry[]>([{ url: "", dimension: undefined }]);

  // All dimensions sorted by confidence ascending
  const uncertainDimensions = dimensions
    .filter((d) => !d.notObservable)
    .sort((a, b) => a.confidence - b.confidence);

  // Low confidence dimensions for insider prompts
  const lowConfidenceDimensions = dimensions
    .filter(
      (d) =>
        !d.notObservable &&
        d.confidence < 0.4 &&
        d.missingInsiderPrompts &&
        d.missingInsiderPrompts.length > 0
    )
    .map((d) => ({
      ...d,
      missingInsiderPrompts: d.missingInsiderPrompts!.slice(0, 1),
    }));

  // Count dimensions with limited evidence
  const limitedEvidenceCount = uncertainDimensions.filter(d => d.confidence < 0.7).length;

  if (limitedEvidenceCount === 0) return null;

  const answeredCount = Object.values(answers).filter((v) => v.trim().length > 0).length;
  const validLinkCount = publicLinks.filter(l => l.url.trim().length > 0).length;

  const handleSubmitLinks = () => {
    const validLinks = publicLinks.filter(l => l.url.trim().length > 0);
    if (validLinks.length > 0 && onSubmitPublicLinks) {
      onSubmitPublicLinks(validLinks);
    }
  };

  const handleSubmitInsider = () => {
    const nonEmpty = Object.fromEntries(
      Object.entries(answers).filter(([, v]) => v.trim().length > 0)
    );
    if (Object.keys(nonEmpty).length > 0) {
      onSubmitAnswers(nonEmpty);
    }
  };

  const addLink = () => {
    setPublicLinks(prev => [...prev, { url: "", dimension: undefined }]);
  };

  const removeLink = (index: number) => {
    setPublicLinks(prev => prev.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, field: keyof PublicLinkEntry, value: string) => {
    setPublicLinks(prev => prev.map((l, i) => i === index ? { ...l, [field]: value || undefined } : l));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.45) return "text-confidence-partial";
    return "text-confidence-sparse";
  };

  return (
    <motion.div
      id="improve-accuracy-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <GlassCard className="overflow-hidden">
        {/* Header */}
        <div className="p-5">
          <h2 className="text-lg font-bold text-foreground mb-1">
            Improve Accuracy
          </h2>
          <p className="text-sm text-muted-foreground">
            {limitedEvidenceCount} dimension{limitedEvidenceCount !== 1 ? "s" : ""} have limited public evidence.
            Add public links to update scores and confidence.
            Internal context helps recommendations — it won't change the public score without a public link.
          </p>
        </div>

        {/* Uncertain dimensions summary */}
        <div className="px-5 pb-4">
          <div className="flex flex-wrap gap-2">
            {uncertainDimensions.filter(d => d.confidence < 0.7).map((dim) => (
              <span
                key={dim.dimension}
                className={cn(
                  "px-2 py-1 text-xs rounded-md bg-muted/50",
                  getConfidenceColor(dim.confidence)
                )}
              >
                {dim.dimension} ({Math.round(dim.confidence * 100)}%)
              </span>
            ))}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="px-5 pb-4 flex gap-2">
          <Button
            variant={mode === "links" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setMode("links")}
          >
            <Link2 className="w-3.5 h-3.5" />
            Add public links
          </Button>
          <Button
            variant={mode === "insider" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setMode("insider")}
          >
            <MessageSquareWarning className="w-3.5 h-3.5" />
            Clarify with insider context
          </Button>
        </div>

        {/* Mode 1: Public links */}
        {mode === "links" && (
          <div className="border-t border-border/50">
            <div className="p-5 space-y-3">
              <p className="text-xs text-muted-foreground">
                Link to pricing pages, docs, trust centers, or any public page with evidence the rubric may have missed.
              </p>
              
              {publicLinks.map((link, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      type="url"
                      placeholder="https://example.com/pricing"
                      value={link.url}
                      onChange={(e) => updateLink(i, "url", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <Select
                    value={link.dimension || "any"}
                    onValueChange={(v) => updateLink(i, "dimension", v === "any" ? "" : v)}
                  >
                    <SelectTrigger className="w-[200px] text-xs">
                      <SelectValue placeholder="Any dimension" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any dimension</SelectItem>
                      {dimensions.map(d => (
                        <SelectItem key={d.dimension} value={d.dimension}>
                          {d.dimension}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {publicLinks.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeLink(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={addLink}>
                <Plus className="w-3.5 h-3.5" />
                Add another link
              </Button>
            </div>

            <div className="p-4 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {validLinkCount} link{validLinkCount !== 1 ? "s" : ""} ready
              </span>
              <Button
                onClick={handleSubmitLinks}
                disabled={validLinkCount === 0 || isRerunning}
                size="sm"
                className="gap-2"
              >
                {isRerunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scraping & re-analyzing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Add evidence & rescore
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Mode 2: Insider context */}
        {mode === "insider" && (
          <div className="border-t border-border/50">
            <div className="px-5 py-3 bg-muted/30 flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Internal context — not scored unless you add a public link. Helps generate "what to publish" recommendations.
              </p>
            </div>

            {lowConfidenceDimensions.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground text-center">
                No low-confidence dimensions need insider clarification.
              </div>
            ) : (
              <>
                {lowConfidenceDimensions.map((dim) => {
                  const isExpanded = expandedDimension === dim.dimension;
                  const dimAnsweredCount = (dim.missingInsiderPrompts || []).filter(
                    (p) => answers[`${dim.dimension}::${p.question}`]?.trim()
                  ).length;

                  return (
                    <div key={dim.dimension} className="border-b border-border/30 last:border-b-0">
                      <button
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                        onClick={() =>
                          setExpandedDimension(isExpanded ? null : dim.dimension)
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm text-foreground">
                            {dim.dimension}
                          </span>
                          <span className={cn("text-xs", getConfidenceColor(dim.confidence))}>
                            {Math.round(dim.confidence * 100)}% confidence
                          </span>
                          {dimAnsweredCount > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              {dimAnsweredCount} answered
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-4">
                              {(dim.missingInsiderPrompts || []).map((prompt, i) => {
                                const key = `${dim.dimension}::${prompt.question}`;
                                return (
                                  <div key={i} className="space-y-2">
                                    <label className="text-sm font-medium text-foreground/90 block">
                                      {i + 1}. {prompt.question}
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                      Maps to: {prompt.fieldPaths.join(", ")}
                                    </p>
                                    <Textarea
                                      placeholder="Your answer..."
                                      className="min-h-[60px] text-sm bg-background/50"
                                      value={answers[key] || ""}
                                      onChange={(e) =>
                                        setAnswers((prev) => ({
                                          ...prev,
                                          [key]: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                <div className="p-4 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {answeredCount} question{answeredCount !== 1 ? "s" : ""} answered
                  </span>
                  <Button
                    onClick={handleSubmitInsider}
                    disabled={answeredCount === 0 || isRerunning}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    {isRerunning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Re-analyzing...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit context (not scored)
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}