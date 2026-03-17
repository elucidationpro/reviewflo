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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
        .animate-slideUp { animation: slideUp 0.8s ease-out 0.2s both; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F5F5DC]">
        <SiteNav variant="join-minimal" />
        <div className={SITE_NAV_SPACER_CLASS} />

        {/* Main Content */}
        <>
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 animate-fadeIn">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
                <div className="text-center animate-slideUp">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight">
                    Stop Bad Reviews Before They Go Public
                  </h1>
                  <p className="text-lg sm:text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
                    Get 10x More 5-Star Google Reviews — Automatically
                  </p>
                  <p className="text-base text-gray-500 mb-8">Start free. No credit card. Takes 2 minutes.</p>
                  <button
                    type="button"
                    onClick={scrollToForm}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#4A3428] text-white text-base font-semibold rounded-lg hover:bg-[#4A3428]/90 transition-colors shadow-md"
                  >
                    Start Free Now
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </section>

            {/* How It Works Section */}
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
                  <div className="flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#C9A961]/15 mb-3">
                      <Send className="w-6 h-6 text-[#4A3428]" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Send Your Link</h3>
                    <p className="text-gray-600 text-sm mb-4">Text or email your ReviewFlo link after each job.</p>
                    <div className="w-full max-w-[280px] rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                      <Image
                        src="/images/sq-rating-page.png"
                        alt="Customer rating screen"
                        width={400}
                        height={400}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#C9A961]/15 mb-3">
                      <Star className="w-6 h-6 text-[#4A3428]" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Smart Routing</h3>
                    <p className="text-gray-600 text-sm mb-4">1–4 stars = private feedback. 5 stars = easy Google review.</p>
                    <div className="w-full max-w-[280px] rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                      <Image
                        src="/images/sq-templates-page.png"
                        alt="Review template selection"
                        width={400}
                        height={400}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#C9A961]/15 mb-3">
                      <CheckCircle className="w-6 h-6 text-[#4A3428]" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Get Results</h3>
                    <p className="text-gray-600 text-sm mb-4">Fix issues privately. Collect more 5-star reviews. Zero manual work.</p>
                    <div className="w-full max-w-[280px] rounded-lg overflow-hidden border border-gray-200 shadow-sm">
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

            {/* Trust Signals Section */}
            <section
              ref={trustSection.ref}
              className={`py-12 sm:py-16 bg-gray-50/50 transition-all duration-700 ${
                trustSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center gap-1.5 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <CheckCircle className="w-6 h-6 text-[#C9A961]" />
                    <p className="text-xs font-semibold text-gray-900 text-center">Free Forever</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <CheckCircle className="w-6 h-6 text-[#C9A961]" />
                    <p className="text-xs font-semibold text-gray-900 text-center">No Credit Card Required</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <CheckCircle className="w-6 h-6 text-[#C9A961]" />
                    <p className="text-xs font-semibold text-gray-900 text-center">Cancel Anytime</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <CheckCircle className="w-6 h-6 text-[#C9A961]" />
                    <p className="text-xs font-semibold text-gray-900 text-center">Early Beta Access</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Signup Form Section */}
            <section
              ref={formSectionRef}
              className="py-12 sm:py-16 bg-white"
            >
              <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Start Your Free Account</h2>

                {!success ? (
                  <>
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Your business name"
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full px-8 py-3 bg-[#4A3428] text-white text-base font-semibold rounded-lg hover:bg-[#4A3428]/90 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Sending...' : 'Create Free Account'}
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
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
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
            </section>
        </>
      </div>
    </>
  );
}
