import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie_consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function updateConsent(granted: boolean) {
  if (typeof window.gtag === "function") {
    const value = granted ? "granted" : "denied";
    window.gtag("consent", "update", {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value,
    });
  }
}

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const decide = (granted: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, granted ? "granted" : "denied");
    } catch {
      // ignore
    }
    updateConsent(granted);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-6 md:bottom-6 md:max-w-md"
    >
      <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">We use cookies</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We use cookies to analyze traffic and improve your experience. You can accept
          analytics cookies or continue with only what's required.{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            Learn more
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => decide(false)}>
            Decline
          </Button>
          <Button size="sm" onClick={() => decide(true)}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
