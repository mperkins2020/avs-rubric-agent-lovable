/**
 * Thin wrapper around GA4 gtag for funnel event tracking.
 * GA4 is loaded via gtag.js in index.html (G-PK220LY75P).
 * All events are tagged with event_category: 'anon_funnel' by default.
 */

type GtagEventParams = {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: unknown;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: GtagEventParams): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, {
      event_category: 'anon_funnel',
      ...params,
    });
  }
}
