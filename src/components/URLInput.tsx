import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Animated circular progress that fills over ~estimatedSeconds (eases out as it approaches 95%).
function CircularProgress({ estimatedSeconds = 120 }: { estimatedSeconds?: number }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      // Asymptotic to 95%: reaches ~63% at estimatedSeconds, ~95% at ~3x
      const pct = 95 * (1 - Math.exp(-elapsed / estimatedSeconds));
      setProgress(pct);
    }, 200);
    return () => clearInterval(id);
  }, [estimatedSeconds]);

  const size = 87;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const visibleProgress = Math.max(progress, 14);
  const offset = circ - (visibleProgress / 100) * circ;

  return (
    <span
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        style={{ transform: "rotate(-90deg)", filter: "drop-shadow(0 0 7px rgba(255, 122, 69, 0.65))" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.38)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FF7A45"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 200ms linear" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-white tabular-nums leading-none">
        {Math.round(progress)}
      </span>
    </span>
  );
}

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
            className="relative min-h-24 px-7 bg-vt-midnight hover:bg-vt-midnight/90 text-white font-semibold rounded-[48px] transition-all shadow-vt-sm hover:shadow-[0_12px_40px_-10px_hsl(var(--vt-violet)/0.6)]"
          >
            {!isLoading && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-vt-coral ring-2 ring-card" aria-hidden="true" />
            )}
            {isLoading ? (
              <span className="inline-flex items-center gap-3">
                <CircularProgress estimatedSeconds={120} />
                <span className="text-sm">Analyzing…</span>
              </span>
            ) : (
              <>
                Check Your Buyability Score
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
          Free · 3 analyses per week · ~2 minutes
        </span>
      </div>
    </form>
  );
}
