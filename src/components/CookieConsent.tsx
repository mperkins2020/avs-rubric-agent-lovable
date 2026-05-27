import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const COOKIE_NAME = "vt_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function readConsentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)vt_consent=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function writeConsentCookie(value: "accepted" | "dismissed") {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const isValueTempo = /(^|\.)valuetempo\.com$/.test(host);
  const domainAttr = isValueTempo ? "; domain=.valuetempo.com" : "";
  const secureAttr = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${value}${domainAttr}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secureAttr}`;
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
    // Clean up legacy localStorage key
    try {
      localStorage.removeItem("cookie_consent");
    } catch {
      // ignore
    }

    const stored = readConsentCookie();
    if (stored === "accepted") {
      updateConsent(true);
      setVisible(false);
    } else if (stored === "dismissed") {
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, []);

  const decide = (granted: boolean) => {
    writeConsentCookie(granted ? "accepted" : "dismissed");
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
