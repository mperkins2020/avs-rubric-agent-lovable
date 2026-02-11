import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FeedbackFormProps {
  companyName: string;
}

export function FeedbackForm({ companyName }: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-feedback", {
        body: {
          company_name: companyName,
          rating,
          feedback: feedback.trim() || null,
          email: email.trim() || null,
        },
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({ title: "Thanks for your feedback!" });
    } catch (err) {
      console.error("Feedback error:", err);
      toast({ title: "Failed to submit feedback", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-border/50 bg-card p-6 text-center"
      >
        <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3" />
        <p className="text-lg font-semibold text-foreground">Thank you!</p>
        <p className="text-sm text-muted-foreground mt-1">Your feedback helps us improve.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-xl border border-border/50 bg-card p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold text-foreground">Rate this report</h3>

      {/* Star rating */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="p-1 transition-transform hover:scale-110"
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => setRating(star)}
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                star <= (hoveredStar || rating)
                  ? "fill-primary text-primary"
                  : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Feedback */}
      <Textarea
        placeholder="Any feedback? (optional)"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        maxLength={1000}
        className="resize-none"
        rows={3}
      />

      {/* Email */}
      <Input
        type="email"
        placeholder="Your email (optional)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={255}
      />

      <Button
        onClick={handleSubmit}
        disabled={rating === 0 || isSubmitting}
        className="w-full bg-gradient-primary gap-2"
      >
        <Send className="w-4 h-4" />
        {isSubmitting ? "Submitting…" : "Submit Feedback"}
      </Button>
    </motion.div>
  );
}
