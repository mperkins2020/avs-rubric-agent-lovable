/**
 * Thin wrapper around GA4 gtag for funnel event tracking.
 * GA4 is loaded via gtag.js in index.html (G-PK220LY75P).
 * All events are tagged with event_category: 'anon_funnel' by default.
 */

const GA_MEASUREMENT_ID = 'G-PK220LY75P';
const RETURNING_USER_FLAG = 'vt_has_visited';

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

/**
 * Bind an authenticated user_id to GA4 for cross-device/session joining.
 * Call right after Supabase auth resolves a non-anonymous session.
 */
export function setGAUserId(userId: string | null): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('config', GA_MEASUREMENT_ID, {
    user_id: userId ?? undefined,
  });
}

/**
 * Fires `returning_user` if a prior-visit flag exists in localStorage,
 * then sets the flag. Safe to call on every anon_session_start.
 * Returns true if this was a returning visit.
 */
export function trackReturningUserAndMark(): boolean {
  if (typeof window === 'undefined') return false;
  let isReturning = false;
  try {
    isReturning = localStorage.getItem(RETURNING_USER_FLAG) === '1';
    if (isReturning) {
      trackEvent('returning_user');
    }
    localStorage.setItem(RETURNING_USER_FLAG, '1');
  } catch {
    // localStorage unavailable (private mode, etc.) — non-fatal
  }
  return isReturning;
}
