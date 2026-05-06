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
      <div className="bg-card border border-border rounded-[20px] p-2 shadow-vt-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary">
            <Globe className="w-5 h-5 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Enter your product URL (e.g. lovable.dev)"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            className="flex-1 h-12 bg-transparent border-0 text-base placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="h-12 px-6 bg-vt-midnight hover:bg-vt-midnight/90 text-white font-semibold rounded-[20px] transition-all shadow-vt-sm"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Check Buyer Readiness
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
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

      <div className="mt-5 flex justify-center">
        <span className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-accent/40 bg-accent/10 text-sm font-semibold text-foreground tracking-wide shadow-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-vt-cyan animate-pulse" />
          Free · 3 analyses per week · ~1 minute
        </span>
      </div>
    </form>
  );
}
