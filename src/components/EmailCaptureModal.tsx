import { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Sparkles, Check, Loader2 } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" }).max(255);

interface EmailCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
}

export const EmailCaptureModal = forwardRef<HTMLDivElement, EmailCaptureModalProps>(
  function EmailCaptureModal({ isOpen, onClose, companyName }, ref) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    // Validate email with zod
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setEmailError(result.error.errors[0]?.message || "Invalid email");
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {!isSubmitted ? (
                <>
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold">
                      Get the Full AVS Brain Plan
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Unlock personalized recommendations for{" "}
                      <strong className="text-foreground">{companyName}</strong>{" "}
                      to improve your value system.
                    </p>
                  </div>

                  {/* Benefits */}
                  <ul className="space-y-2 mb-6">
                    {[
                      "Detailed action plan for your top weaknesses",
                      "Custom experiments based on your ICP",
                      "90-day implementation roadmap",
                    ].map((benefit, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="w-4 h-4 text-primary" />
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Input
                        type="email"
                        placeholder="Enter your work email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError("");
                        }}
                        className={`bg-secondary/50 ${emailError ? 'border-destructive' : ''}`}
                        required
                      />
                      {emailError && (
                        <p className="text-xs text-destructive mt-1">{emailError}</p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Get My Plan"
                      )}
                    </Button>
                  </form>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    No spam. Unsubscribe anytime.
                  </p>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-score-high/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-score-high" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">You're In!</h2>
                  <p className="text-muted-foreground text-sm">
                    Check your inbox for your personalized AVS Brain plan.
                  </p>
                  <Button onClick={onClose} variant="outline" className="mt-6">
                    Close
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
