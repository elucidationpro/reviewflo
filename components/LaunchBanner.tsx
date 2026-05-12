'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { X } from 'lucide-react';
import { trackEvent } from '@/lib/posthog-provider';
import { supabase } from '@/lib/supabase';

const BANNER_STORAGE_KEY = 'reviewflo_launch_banner_dismissed';
const CUTOFF_DATE = new Date('2026-05-01T00:00:00Z');

export default function LaunchBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wasDismissed = sessionStorage.getItem(BANNER_STORAGE_KEY) === 'true';
    setDismissed(wasDismissed);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, [mounted]);

  const shouldShow =
    mounted &&
    !dismissed &&
    (typeof window === 'undefined' ? true : new Date() < CUTOFF_DATE);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(BANNER_STORAGE_KEY, 'true');
      trackEvent('launch_banner_dismissed', {
        path: router.pathname,
        timestamp: new Date().toISOString(),
      });
    }
    setDismissed(true);
  };

  const handleCtaClick = () => {
    trackEvent('launch_banner_clicked', {
      path: router.pathname,
      is_logged_in: isLoggedIn,
      timestamp: new Date().toISOString(),
    });
    if (isLoggedIn) {
      void router.push('/settings?section=plan');
      return;
    }
    if (router.pathname === '/') {
      const el = document.getElementById('pricing');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        router.push('/#pricing');
      }
    } else {
      router.push('/#pricing');
    }
  };

  if (!shouldShow) return null;

  const isDashboard = isLoggedIn;

  return (
    <div
      className="sticky top-0 left-0 right-0 z-[100] flex items-center justify-center px-4 py-3 text-center text-[#4A3428] shadow-md"
      style={{
        minHeight: 50,
        maxHeight: 80,
        background: '#C9A961',
      }}
      role="banner"
    >
      <div className="flex flex-1 items-center justify-center gap-2 pr-8 sm:pr-10">
        {/* Desktop text */}
        <p className="hidden text-sm font-medium sm:block">
          {isDashboard ? (
            <>
              Pro is live — manage your plan or join the AI waitlist in{' '}
              <button
                type="button"
                onClick={handleCtaClick}
                className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-[#4A3428]/50 rounded"
              >
                Settings → Plan
              </button>
            </>
          ) : (
            <>
              Launch Special: Sign up now, get 50% off Pro & AI tiers for first
              3 months (May 2026) →{' '}
              <button
                type="button"
                onClick={handleCtaClick}
                className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-[#4A3428]/50 rounded"
              >
                Learn More
              </button>
            </>
          )}
        </p>
        {/* Mobile text */}
        <p className="text-sm font-medium sm:hidden">
          {isDashboard ? (
            <>
              Pro is live —{' '}
              <button
                type="button"
                onClick={handleCtaClick}
                className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-[#4A3428]/50 rounded"
              >
                Plan &amp; Billing
              </button>
            </>
          ) : (
            <>
              50% off Pro & AI at launch (May 2026){' '}
              <button
                type="button"
                onClick={handleCtaClick}
                className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-[#4A3428]/50 rounded"
              >
                Learn More
              </button>
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-[#4A3428] hover:bg-[#4A3428]/10 focus:outline-none focus:ring-2 focus:ring-[#4A3428]/50"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>
    </div>
  );
}
