'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X } from 'lucide-react';
import { trackEvent } from '@/lib/posthog-provider';

type NavVariant = 'marketing' | 'pricing' | 'join-minimal' | 'login-minimal' | 'dashboard';

interface SiteNavProps {
  variant: NavVariant;
  businessName?: string | null;
  onLogout?: () => void;
}

const NAV_HEIGHT_CLASS = 'h-16 sm:h-20';

export function SiteNav({ variant, businessName, onLogout }: SiteNavProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPricingActive = router.pathname === '/pricing';
  const isDashboardActive = router.pathname === '/dashboard';
  const isSettingsActive = router.pathname === '/settings';

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => {
      const next = !prev;
      trackEvent(next ? 'mobile_menu_opened' : 'mobile_menu_closed', {
        path: router.asPath,
        variant,
      });
      return next;
    });
  }, [router.asPath, variant]);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleNavClick = useCallback(
    (
      link:
        | 'home'
        | 'how-it-works'
        | 'pricing'
        | 'login'
        | 'start-free'
        | 'dashboard'
        | 'settings',
      source: 'desktop' | 'mobile'
    ) =>
      async (event?: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
        if (event) {
          event.preventDefault();
        }

        trackEvent('nav_link_clicked', {
          link,
          source,
          path: router.asPath,
          variant,
        });

        if (source === 'mobile') {
          closeMobile();
        }

        if (link === 'how-it-works') {
          if (router.pathname === '/') {
            const el = document.getElementById('how-it-works');
            if (el) {
              const headerOffset = 80;
              const rect = el.getBoundingClientRect();
              const scrollTop = window.scrollY + rect.top - headerOffset;
              window.scrollTo({ top: scrollTop, behavior: 'smooth' });
              return;
            }
          }

          await router.push('/#how-it-works');
          return;
        }

        if (link === 'pricing') {
          await router.push('/pricing');
          return;
        }

        if (link === 'login') {
          await router.push('/login');
          return;
        }

        if (link === 'start-free') {
          await router.push('/join');
          return;
        }

        if (link === 'dashboard') {
          await router.push('/dashboard');
          return;
        }

        if (link === 'settings') {
          await router.push('/settings');
          return;
        }

        await router.push('/');
      },
    [closeMobile, router, variant]
  );

  const handleLogoClick = useCallback(
    (source: 'desktop' | 'mobile') =>
      (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        trackEvent('nav_link_clicked', {
          link: 'home',
          source,
          path: router.asPath,
          variant,
        });
        if (source === 'mobile') {
          closeMobile();
        }
        router.push('/');
      },
    [closeMobile, router, variant]
  );

  const handleLogoutClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      trackEvent('nav_link_clicked', {
        link: 'logout',
        source: 'desktop',
        path: router.asPath,
        variant,
      });
      if (onLogout) {
        onLogout();
      }
    },
    [onLogout, router.asPath, variant]
  );

  const showPrimaryCta =
    variant === 'marketing' || variant === 'pricing';

  const showDesktopInfoLinks =
    variant === 'marketing' || variant === 'pricing';

  const showDesktopLogin =
    variant === 'marketing' || variant === 'pricing' || variant === 'join-minimal';

  const logo = (
    <Link
      href="/"
      onClick={handleLogoClick('desktop')}
      className="flex items-center transition-opacity hover:opacity-80"
    >
      <img
        src="/images/reviewflo-logo.svg"
        alt="ReviewFlo"
        className="h-8 sm:h-10 w-auto"
      />
    </Link>
  );

  if (variant === 'login-minimal') {
    return (
      <header className={`fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-50`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-center ${NAV_HEIGHT_CLASS}`}>
            {logo}
          </div>
        </div>
      </header>
    );
  }

  if (variant === 'dashboard') {
    return (
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between ${NAV_HEIGHT_CLASS}`}>
            <div className="flex items-center gap-6">
              <Link
                href="/"
                onClick={handleLogoClick('desktop')}
                className="flex items-center transition-opacity hover:opacity-80"
              >
                <img
                  src="/images/reviewflo-logo.svg"
                  alt="ReviewFlo"
                  className="h-8 sm:h-10 w-auto"
                />
              </Link>
              <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
                <Link
                  href="/dashboard"
                  onClick={handleNavClick('dashboard', 'desktop')}
                  className={`transition-colors ${
                    isDashboardActive
                      ? 'text-slate-900 border-b-2 border-[#C9A961] pb-1'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  onClick={handleNavClick('settings', 'desktop')}
                  className={`transition-colors ${
                    isSettingsActive
                      ? 'text-slate-900 border-b-2 border-[#C9A961] pb-1'
                      : 'hover:text-slate-900'
                  }`}
                >
                  Settings
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {businessName && (
                <span className="hidden sm:inline-flex max-w-xs truncate text-sm text-slate-700">
                  {businessName}
                </span>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="px-4 sm:px-5 py-2 rounded-lg bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between ${NAV_HEIGHT_CLASS}`}>
          {/* Mobile: menu + logo */}
          <div className="flex items-center gap-3 md:gap-6">
            {(variant === 'marketing' || variant === 'pricing') && (
              <button
                type="button"
                onClick={toggleMobile}
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C9A961] md:hidden"
                aria-label="Toggle navigation menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
            {logo}
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {showDesktopInfoLinks && (
              <nav className="flex items-center gap-6">
                <Link
                  href="/#how-it-works"
                  onClick={handleNavClick('how-it-works', 'desktop')}
                  className="text-sm font-medium text-gray-600 hover:text-[#4A3428] transition-colors"
                >
                  How It Works
                </Link>
                <Link
                  href="/pricing"
                  onClick={handleNavClick('pricing', 'desktop')}
                  className={`text-sm font-medium transition-colors ${
                    isPricingActive
                      ? 'text-[#4A3428] border-b-2 border-[#C9A961] pb-1'
                      : 'text-gray-600 hover:text-[#4A3428]'
                  }`}
                >
                  Pricing
                </Link>
              </nav>
            )}

            {showDesktopLogin && (
              <Link
                href="/login"
                onClick={handleNavClick('login', 'desktop')}
                className="text-sm font-medium text-gray-600 hover:text-[#4A3428] transition-colors"
              >
                Login
              </Link>
            )}

            {showPrimaryCta && (
              <Link
                href="/join"
                onClick={handleNavClick('start-free', 'desktop')}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#4A3428] text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-[#4A3428]/90 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Start Free
              </Link>
            )}
          </div>

          {/* Mobile right-side Start Free for marketing/pricing */}
          <div className="flex items-center md:hidden">
            {showPrimaryCta && (
              <Link
                href="/join"
                onClick={handleNavClick('start-free', 'mobile')}
                className="px-3 py-1.5 bg-[#4A3428] text-white rounded-lg text-sm font-semibold hover:bg-[#4A3428]/90 transition-all shadow-md"
              >
                Start Free
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {(variant === 'marketing' || variant === 'pricing') && mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
          <nav className="max-w-6xl mx-auto px-4 pt-2 pb-4 space-y-1 text-sm font-medium text-gray-700">
            <Link
              href="/#how-it-works"
              onClick={handleNavClick('how-it-works', 'mobile')}
              className="block rounded-md px-3 py-2 hover:bg-gray-50"
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              onClick={handleNavClick('pricing', 'mobile')}
              className="block rounded-md px-3 py-2 hover:bg-gray-50"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              onClick={handleNavClick('login', 'mobile')}
              className="block rounded-md px-3 py-2 hover:bg-gray-50"
            >
              Login
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export const SITE_NAV_SPACER_CLASS = NAV_HEIGHT_CLASS;

