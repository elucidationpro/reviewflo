'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle, Send, Star, ChevronDown } from 'lucide-react';
import Head from 'next/head';
import Script from 'next/script';
import { trackEvent } from '@/lib/posthog-provider';
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav';

// Hook for fade-in and scroll tracking
function useFadeInOnScroll(eventName?: string) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const hasTracked = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (eventName && !hasTracked.current) {
            hasTracked.current = true;
            trackEvent(eventName, { timestamp: new Date().toISOString() });
          }
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [eventName]);

  return { ref, isVisible };
}

export default function JoinPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formStarted, setFormStarted] = useState(false);
  const hasTrackedPageView = useRef(false);
  const formSectionRef = useRef<HTMLElement>(null);

  const howItWorksSection = useFadeInOnScroll('how_it_works_viewed');
  const trustSection = useFadeInOnScroll('trust_signals_viewed');

  // Track page view on mount
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      trackEvent('join_page_viewed', {
        source: 'join_page',
        timestamp: new Date().toISOString(),
      });
      hasTrackedPageView.current = true;
    }
  }, []);

  // Show error from URL (e.g. redirect after expired/invalid magic link)
  useEffect(() => {
    const q = router.query.error;
    if (typeof q === 'string') {
      if (q === 'expired_link') {
        setError('That login link has expired. Request a new one below.');
      } else if (q === 'invalid_link' || q === 'invalid_data') {
        setError('That link is invalid. Request a new one below.');
      } else if (q === 'setup_failed') {
        setError('We couldn\'t complete your signup. Please try again or contact support.');
      }
      router.replace('/join', undefined, { shallow: true });
    }
  }, [router.query.error, router]);

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFormStart = () => {
    if (!formStarted) {
      setFormStarted(true);
      trackEvent('join_form_started', { timestamp: new Date().toISOString() });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    trackEvent('join_form_submitted', {
      source: 'join_page',
      timestamp: new Date().toISOString(),
    });

    // Validate inputs
    const emailTrim = email.trim().toLowerCase();
    const businessNameTrim = businessName.trim();

    if (!emailTrim || !businessNameTrim) {
      setError('Please enter both your email and business name');
      setIsSubmitting(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailTrim,
          businessName: businessNameTrim,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Fire Meta Pixel Lead event
        if (typeof window !== 'undefined' && typeof (window as any).fbq === 'function') {
          (window as any).fbq('track', 'Lead', {
            content_name: 'Free Signup',
            content_category: 'Early Access',
            status: 'free_signup',
          });
        }

        // Track PostHog event
        trackEvent('magic_link_requested', {
          email: emailTrim,
          businessName: businessNameTrim,
          timestamp: new Date().toISOString(),
        });

        setSuccess(true);
      } else {
        setError(data.error || 'Failed to send login link. Please try again.');
      }
    } catch (err) {
      console.error('Error sending magic link:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Stop Bad Reviews Before They Go Public | ReviewFlo</title>
        <meta name="description" content="Get 10x more 5-star Google reviews automatically. Free forever. Pro & AI tiers coming May 2026. Built for plumbers, electricians, detailers & service businesses. No credit card required." />
        <meta name="robots" content="noindex, nofollow" />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=750284611209309&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </Head>
      <Script
        id="meta-pixel-qualify"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '750284611209309');
fbq('track', 'PageView');`,
        }}
      />
      <style jsx global>{`
        /* Entrance animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes floatY {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes floatYSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(74, 52, 40, 0.35); }
          70%  { box-shadow: 0 0 0 10px rgba(74, 52, 40, 0); }
          100% { box-shadow: 0 0 0 0 rgba(74, 52, 40, 0); }
        }
        @keyframes shimmerText {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        /* Utility classes */
        .animate-fadeIn { animation: fadeIn 0.5s ease-out both; }
        .animate-slideUp-0 { animation: slideUp 0.55s ease-out 0.05s both; }
        .animate-slideUp-1 { animation: slideUp 0.55s ease-out 0.15s both; }
        .animate-slideUp-2 { animation: slideUp 0.55s ease-out 0.25s both; }
        .animate-slideUp-3 { animation: slideUp 0.55s ease-out 0.38s both; }
        .animate-scaleIn-0 { animation: scaleIn 0.4s ease-out 0.05s both; }
        .animate-scaleIn-1 { animation: scaleIn 0.4s ease-out 0.15s both; }
        .animate-scaleIn-2 { animation: scaleIn 0.4s ease-out 0.25s both; }
        .animate-scaleIn-3 { animation: scaleIn 0.4s ease-out 0.35s both; }
        .animate-float    { animation: floatY 4.5s ease-in-out infinite; }
        .animate-float-slow { animation: floatYSlow 6s ease-in-out 1.2s infinite; }
        .animate-pulse-ring { animation: pulseRing 2.2s ease-out infinite; }

        /* Hover card lift */
        .card-hover {
          transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
        }
        .card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(74, 52, 40, 0.10);
        }

        /* Reduced motion — collapse all animations */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F5F5DC]">
        <SiteNav variant="join-minimal" />
        <div className={SITE_NAV_SPACER_CLASS} />

        {/* Main Content */}
        <>
            {/* ── Hero Section ── */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 animate-fadeIn">

              {/* Decorative blobs — opacity-only, no layout impact */}
              <div
                aria-hidden="true"
                className="animate-float pointer-events-none absolute -top-16 -left-16 w-72 h-72 rounded-full opacity-[0.12]"
                style={{ background: 'radial-gradient(circle, #C9A961 0%, transparent 70%)' }}
              />
              <div
                aria-hidden="true"
                className="animate-float-slow pointer-events-none absolute top-10 -right-20 w-96 h-96 rounded-full opacity-[0.09]"
                style={{ background: 'radial-gradient(circle, #4A3428 0%, transparent 65%)' }}
              />

              <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
                <div className="text-center">
                  <h1 className="animate-slideUp-0 text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight">
                    Stop Bad Reviews Before They Go Public
                  </h1>
                  <p className="animate-slideUp-1 text-lg sm:text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
                    Get 10x More 5-Star Google Reviews — Automatically
                  </p>
                  <p className="animate-slideUp-2 text-base text-gray-500 mb-8">
                    Start free. No credit card. Takes 2 minutes.
                  </p>
                  <div className="animate-slideUp-3 inline-block">
                    <button
                      type="button"
                      onClick={scrollToForm}
                      className="animate-pulse-ring inline-flex items-center gap-2 px-6 py-3 bg-[#4A3428] text-white text-base font-semibold rounded-lg hover:bg-[#4A3428]/90 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-md cursor-pointer"
                    >
                      Start Free Now
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ── How It Works Section ── */}
            <section
              ref={howItWorksSection.ref}
              className={`py-12 sm:py-16 bg-white transition-all duration-700 ${
                howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8">
                  How It Works
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <div
                    className={`card-hover flex flex-col items-center text-center transition-all duration-500 ${
                      howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ transitionDelay: howItWorksSection.isVisible ? '0ms' : '0ms' }}
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#C9A961]/15 mb-3 transition-transform duration-200 hover:scale-110">
                      <Send className="w-6 h-6 text-[#4A3428]" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Send Your Link</h3>
                    <p className="text-gray-600 text-sm mb-4">Text or email your ReviewFlo link after each job.</p>
                    <div className="w-full max-w-[280px] rounded-lg overflow-hidden border border-gray-200 shadow-sm transition-shadow duration-200 hover:shadow-md">
                      <Image
                        src="/images/sq-rating-page.png"
                        alt="Customer rating screen"
                        width={400}
                        height={400}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div
                    className={`card-hover flex flex-col items-center text-center transition-all duration-500 ${
                      howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ transitionDelay: howItWorksSection.isVisible ? '120ms' : '0ms' }}
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#C9A961]/15 mb-3 transition-transform duration-200 hover:scale-110">
                      <Star className="w-6 h-6 text-[#4A3428]" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Smart Routing</h3>
                    <p className="text-gray-600 text-sm mb-4">1–4 stars = private feedback. 5 stars = easy Google review.</p>
                    <div className="w-full max-w-[280px] rounded-lg overflow-hidden border border-gray-200 shadow-sm transition-shadow duration-200 hover:shadow-md">
                      <Image
                        src="/images/sq-templates-page.png"
                        alt="Review template selection"
                        width={400}
                        height={400}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div
                    className={`card-hover flex flex-col items-center text-center transition-all duration-500 ${
                      howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ transitionDelay: howItWorksSection.isVisible ? '240ms' : '0ms' }}
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#C9A961]/15 mb-3 transition-transform duration-200 hover:scale-110">
                      <CheckCircle className="w-6 h-6 text-[#4A3428]" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Get Results</h3>
                    <p className="text-gray-600 text-sm mb-4">Fix issues privately. Collect more 5-star reviews. Zero manual work.</p>
                    <div className="w-full max-w-[280px] rounded-lg overflow-hidden border border-gray-200 shadow-sm transition-shadow duration-200 hover:shadow-md">
                      <Image
                        src="/images/sq-google-review.png"
                        alt="5-star Google review"
                        width={400}
                        height={400}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Signup Form Section ── */}
            <section
              ref={formSectionRef}
              className="py-12 sm:py-16 bg-gradient-to-b from-white to-[#F5F5DC]/40"
            >
              <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
                {/* Form card */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Start Your Free Account</h2>

                  {!success ? (
                    <>
                      {/* Continue with Google */}
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = '/api/auth/google/start?flow=signup';
                        }}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-lg bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 shadow-sm cursor-pointer"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-700">Continue with Google</span>
                      </button>

                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">or</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>

                      <form
                        onSubmit={handleFormSubmit}
                        onFocus={handleFormStart}
                        onClick={handleFormStart}
                        className="space-y-4"
                      >
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Your email address"
                          disabled={isSubmitting}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow duration-150"
                        />
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Your business name"
                          disabled={isSubmitting}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow duration-150"
                        />
                        {error && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-600">{error}</p>
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full px-8 py-3 bg-[#4A3428] text-white text-base font-semibold rounded-lg hover:bg-[#4A3428]/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Sending…
                            </span>
                          ) : (
                            'Create Free Account'
                          )}
                        </button>
                      </form>

                      <p className="mt-6 text-center text-sm text-gray-500">
                        Want more features? Pro ($19/mo) and AI ($49/mo) tiers launching May 2026. Early signups get 50% off first 3 months.
                      </p>
                      <p className="mt-2 text-center">
                        <Link
                          href="/pricing"
                          className="text-sm font-medium text-[#4A3428] hover:underline"
                          onClick={() => trackEvent('pricing_link_clicked', { source: 'join_page', timestamp: new Date().toISOString() })}
                        >
                          See Full Pricing
                        </Link>
                      </p>
                    </>
                  ) : (
                    <div className="animate-scaleIn-0 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Check your email!</h3>
                      <p className="text-gray-700">
                        We sent a login link to <strong>{email}</strong>. Click it to access your ReviewFlo account.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Trust Signals Section ── */}
            <section
              ref={trustSection.ref}
              className={`py-12 sm:py-16 bg-gray-50/50 transition-all duration-700 ${
                trustSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    'Free Forever',
                    'No Credit Card Required',
                    'Cancel Anytime',
                    'Early Beta Access',
                  ].map((label, i) => (
                    <div
                      key={label}
                      className={`card-hover flex flex-col items-center gap-1.5 p-4 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-500 ${
                        trustSection.isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                      }`}
                      style={{ transitionDelay: trustSection.isVisible ? `${i * 80}ms` : '0ms' }}
                    >
                      <CheckCircle className="w-6 h-6 text-[#C9A961]" />
                      <p className="text-xs font-semibold text-gray-900 text-center">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
        </>
      </div>
    </>
  );
}
