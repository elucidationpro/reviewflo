'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import posthog from 'posthog-js';
import { captureFirstTouch, sanitizeAnalyticsProperties } from './checkout-analytics';

// Initialize PostHog only on client side
if (typeof window !== 'undefined') {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (posthogKey && posthogHost) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      // Enable session recording for better UX insights
      session_recording: {
        recordCrossOriginIframes: true,
      },
      // Capture pageviews automatically
      capture_pageview: false, // We'll handle this manually for better control
      // Sanitize sensitive URL fragments (e.g. magic-link tokens) out of every automatic
      // event before it leaves the browser.
      before_send: (event) => {
        if (!event) return event;
        try {
          if (event.properties) {
            event.properties = sanitizeAnalyticsProperties(event.properties) as Record<string, any>;
          }
        } catch {
          return null;
        }
        return event;
      },
      // Disable in development to avoid polluting analytics
      loaded: (posthogInstance) => {
        if (process.env.NODE_ENV === 'development') {
          posthogInstance.opt_out_capturing();
        }
        try {
          const params = new URLSearchParams(window.location.search);
          const historicalUtmSource = posthogInstance.get_property('$initial_utm_source');
          captureFirstTouch(params.get('utm_source'), { historicalUtmSource });
        } catch {
          // best effort only
        }
      },
    });
  } else {
    // PostHog isn't configured (e.g. missing env vars); still capture first-touch
    // attribution from the current URL so it's available once analytics comes online.
    try {
      const params = new URLSearchParams(window.location.search);
      captureFirstTouch(params.get('utm_source'));
    } catch {
      // best effort only
    }
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Track page views on route change
    const handleRouteChange = () => {
      if (typeof window !== 'undefined') {
        posthog.capture('$pageview');
      }
    };

    // Track initial page load
    handleRouteChange();

    // Listen to route changes
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return <>{children}</>;
}

/**
 * Hook to access PostHog instance
 * Returns undefined if PostHog is not initialized (e.g., missing env vars)
 */
export function usePostHog() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return posthog;
}

/**
 * Helper to safely track events
 * Automatically handles errors and missing PostHog initialization
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  try {
    if (typeof window !== 'undefined' && posthog) {
      const sanitizedProperties = properties
        ? (sanitizeAnalyticsProperties(properties) as Record<string, any>)
        : properties;
      posthog.capture(eventName, sanitizedProperties);
    }
  } catch {
    // Log a generic message only; never log raw event/property contents.
    console.error('PostHog tracking error');
  }
}

/**
 * Helper to identify users
 * Call this when a user logs in or signs up
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, any>
) {
  try {
    if (typeof window !== 'undefined' && posthog) {
      posthog.identify(userId, properties);
    }
  } catch {
    console.error('PostHog identify error');
  }
}

/**
 * Helper to reset user identity
 * Call this when a user logs out
 */
export function resetUser() {
  try {
    if (typeof window !== 'undefined' && posthog) {
      posthog.reset();
    }
  } catch {
    console.error('PostHog reset error');
  }
}
