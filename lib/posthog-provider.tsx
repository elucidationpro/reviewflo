'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import posthog from 'posthog-js';

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
      // Disable in development to avoid polluting analytics
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.opt_out_capturing();
        }
      },
    });
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
      posthog.capture(eventName, properties);
    }
  } catch (error) {
    // Log error but don't break the app
    console.error('PostHog tracking error:', error);
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
  } catch (error) {
    console.error('PostHog identify error:', error);
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
  } catch (error) {
    console.error('PostHog reset error:', error);
  }
}
