import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface URLInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export function URLInput({ onSubmit, isLoading = false }: URLInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const validateUrl = (input: string): boolean => {
    try {
      let urlToTest = input.trim();
      if (!urlToTest.startsWith("http://") && !urlToTest.startsWith("https://")) {
        urlToTest = "https://" + urlToTest;
      }
      new URL(urlToTest);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Please enter a company URL");
      return;
    }

    if (!validateUrl(url)) {
      setError("Please enter a valid URL");
      return;
    }

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    onSubmit(normalizedUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-xl opacity-20 animate-pulse-glow" />
        <div className="relative bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl p-2 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <Input
              type="text"
              placeholder="Enter your product URL (e.g. lovable.dev)"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              className="flex-1 h-12 bg-transparent border-0 text-lg placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className="h-12 px-6 bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold rounded-xl transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Analyze
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-destructive text-center"
        >
          {error}
        </motion.p>
      )}

      <p className="mt-3 text-xs text-muted-foreground/60 text-center">
        Free to use · 3 analyses per week per account
      </p>
    </form>
  );
}
