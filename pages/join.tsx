'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { CheckCircle, Send, Star, ChevronDown } from 'lucide-react';
import Head from 'next/head';
import Script from 'next/script';
import { trackEvent } from '@/lib/posthog-provider';

// Hook for fade-in on scroll (matches homepage)
function useFadeInOnScroll() {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
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
  }, []);

  return { ref, isVisible };
}

export default function JoinPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const hasTrackedPageView = useRef(false);

  const howItWorksSection = useFadeInOnScroll();
  const trustSection = useFadeInOnScroll();
  const seeItInActionSection = useFadeInOnScroll();
  const questionsSection = useFadeInOnScroll();

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

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
            content_name: 'Free Beta Signup',
            content_category: 'Beta Test',
            status: 'free_beta',
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
        <title>Stop Bad Reviews Before They Go Public | ReviewFlo Free Beta</title>
        <meta name="description" content="Get 10x more 5-star Google reviews automatically. Free beta until April 2026. Built for plumbers, electricians, detailers & service businesses. No credit card required." />
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
        {/* Header */}
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <a href="/" className="flex items-center transition-opacity hover:opacity-80">
                <img
                  src="/images/reviewflo-logo.svg"
                  alt="ReviewFlo"
                  className="h-8 sm:h-10 w-auto"
                />
              </a>
              <a
                href="/login"
                className="hidden sm:inline-block text-sm sm:text-base text-gray-600 hover:text-[#4A3428] font-medium transition-colors"
              >
                Login
              </a>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <>
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 animate-fadeIn">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
                <div className="text-center animate-slideUp">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight">
                    Stop Bad Reviews Before They Go Public
                  </h1>
                  <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                    Get 10x More 5-Star Google Reviews — Automatically
                  </p>

                  {/* Inline Signup Form */}
                  {!success ? (
                    <div className="max-w-md mx-auto">
                      <form onSubmit={handleFormSubmit} className="space-y-4">
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
                          {isSubmitting ? 'Sending...' : 'Join Free Beta - No Credit Card'}
                        </button>
                      </form>
                      <p className="text-sm text-gray-500 mt-3">
                        No credit card required. Free until April 2026.
                      </p>
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto bg-green-50 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email!</h2>
                      <p className="text-gray-700">
                        We sent a login link to <strong>{email}</strong>. Click it to access your ReviewFlo account.
                      </p>
                    </div>
                  )}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#C9A961]/15 mb-3">
                      <Send className="w-5 h-5 text-[#4A3428]" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1.5">Step 1: Send Your Link</h3>
                    <p className="text-gray-600 text-sm leading-snug">
                      After you finish a job, text or email your unique ReviewFlo link to your customer. Takes 5 seconds.
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#C9A961]/15 mb-3">
                      <Star className="w-5 h-5 text-[#4A3428]" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1.5">Step 2: Customer Rates Their Experience</h3>
                    <p className="text-gray-600 text-sm leading-snug mb-2">
                      They click the link and rate 1-5 stars.
                    </p>
                    <div className="text-sm text-gray-600 space-y-1 leading-snug">
                      <p>1-4 stars → Private feedback (nothing goes public)</p>
                      <p>5 stars → Easy templates for Google review</p>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#C9A961]/15 mb-3">
                      <CheckCircle className="w-5 h-5 text-[#4A3428]" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1.5">Step 3: You Get Results</h3>
                    <p className="text-gray-600 text-sm leading-snug">
                      Unhappy customers handled privately. Happy customers leave 5-star reviews. Zero manual work after setup.
                    </p>
                  </div>
                </div>

                <p className="text-center text-gray-500 text-sm max-w-2xl mx-auto">
                  Example: Customer gives 3 stars → You get private feedback via email. Fix the issue. No public damage.
                </p>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex flex-col items-center gap-1.5 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <CheckCircle className="w-6 h-6 text-[#C9A961]" />
                    <p className="text-xs font-semibold text-gray-900 text-center">Free Until April 2026</p>
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
                    <p className="text-xs font-semibold text-gray-900 text-center">Utah-Based</p>
                  </div>
                </div>
                <p className="text-center text-gray-500 text-sm">Join 50+ Utah service businesses testing ReviewFlo</p>
              </div>
            </section>

            {/* See It In Action Section */}
            <section
              ref={seeItInActionSection.ref}
              className={`py-12 sm:py-16 bg-gray-50/50 transition-all duration-700 ${
                seeItInActionSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    See It In Action
                  </h2>
                  <p className="text-sm text-gray-500 max-w-xl mx-auto">
                    Here&apos;s exactly what your customers will see
                  </p>
                </div>

                {/* Step 1: Customer Rates */}
                <div className="mb-12 flex flex-col-reverse md:flex-row items-center gap-6 md:gap-10">
                  <div className="w-full md:w-1/2">
                    <Image
                      src="/images/sq-rating-page.png"
                      alt="Customer rating screen"
                      width={400}
                      height={400}
                      className="w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200"
                    />
                  </div>
                  <div className="w-full md:w-1/2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Step 1: Customer Rates
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Your customer receives your link and sees this simple 1-5 star rating screen. One click, takes 5 seconds.
                    </p>
                  </div>
                </div>

                {/* Step 2a: Unhappy Path */}
                <div className="mb-12 flex flex-col-reverse md:flex-row-reverse items-center gap-6 md:gap-10">
                  <div className="w-full md:w-1/2">
                    <Image
                      src="/images/sq-feedback-page.png"
                      alt="Private feedback form"
                      width={400}
                      height={400}
                      className="w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200"
                    />
                  </div>
                  <div className="w-full md:w-1/2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Step 2a: If They&apos;re Unhappy (1-4 stars)
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      They see a private feedback form where they can tell you what went wrong. You get an email. Nothing goes public. You can fix it.
                    </p>
                  </div>
                </div>

                {/* Step 2b: Happy Path - Templates */}
                <div className="mb-12 flex flex-col-reverse md:flex-row items-center gap-6 md:gap-10">
                  <div className="w-full md:w-1/2">
                    <Image
                      src="/images/sq-templates-page.png"
                      alt="Template selection"
                      width={400}
                      height={400}
                      className="w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200"
                    />
                  </div>
                  <div className="w-full md:w-1/2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Step 2b: If They&apos;re Happy (5 stars)
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      They choose to write their own review or use a pre-written template. Templates make it effortless.
                    </p>
                  </div>
                </div>

                {/* Step 3: Platform Choice */}
                <div className="mb-12 flex flex-col-reverse md:flex-row-reverse items-center gap-6 md:gap-10">
                  <div className="w-full md:w-1/2">
                    <Image
                      src="/images/sq-platform-page.png"
                      alt="Platform selection screen"
                      width={400}
                      height={400}
                      className="w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200"
                    />
                  </div>
                  <div className="w-full md:w-1/2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Step 3: Choose Platform
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Customer picks Google, Facebook, or Yelp. One click and they&apos;re there.
                    </p>
                  </div>
                </div>

                {/* Final Result */}
                <div className="mb-0 flex flex-col-reverse md:flex-row items-center gap-6 md:gap-10">
                  <div className="w-full md:w-1/2">
                    <Image
                      src="/images/sq-google-review.png"
                      alt="5-star Google review"
                      width={400}
                      height={400}
                      className="w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200"
                    />
                  </div>
                  <div className="w-full md:w-1/2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      The Result: A Public 5-Star Review
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      The template copies to their clipboard. Google opens. They paste and post. Done in under a minute.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section
              ref={questionsSection.ref}
              className={`py-12 sm:py-16 bg-white transition-all duration-700 ${
                questionsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center">Questions</h2>
                <div className="max-w-2xl mx-auto space-y-5">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Is it really free? What do beta testers get?</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Yes. Use ReviewFlo completely free while we test and fix bugs and get feedback from business owners like you. Official launch: April 2026. Beta testers get 50% off the first 3 months when we launch ($9.50 or $24.50/month vs $19-49/month).
                    </p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Do I need a contract?</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      No. No contracts. Cancel anytime. No credit card required to join.
                    </p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">How does ReviewFlo compare to Podium?</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Podium costs $289–449/month with a 12-month contract. ReviewFlo is free during beta, no contract ever, and will launch at $19–49/month—about 90% cheaper. Both help you collect reviews and manage feedback; ReviewFlo is built for small service businesses who don&apos;t need the full Podium suite.
                    </p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">What if it&apos;s not for me?</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Stop using it. No commitment. We built ReviewFlo for Utah service businesses—plumbers, electricians, detailers, barbers, HVAC—who want to stop bad reviews and get more 5-stars. If that&apos;s you, join the beta.
                    </p>
                  </div>
                </div>
              </div>
            </section>
        </>
      </div>
    </>
  );
}
