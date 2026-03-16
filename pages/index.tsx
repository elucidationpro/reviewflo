'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, Shield } from 'lucide-react';
import Image from 'next/image';
import Head from 'next/head';
import Script from 'next/script';
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

// Hook for fade-in on scroll
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

export default function LandingPage() {
  const howItWorksSection = useFadeInOnScroll();
  const seeItInActionSection = useFadeInOnScroll();
  const pricingSection = useFadeInOnScroll();

  return (
    <>
      <Head>
        {/* Basic SEO */}
        <title>ReviewFlo - Get More 5-Star Google Reviews Automatically</title>
        <meta name="description" content="Get more 5-star Google reviews automatically. Catch unhappy customers privately before they post. Simple review management for small service businesses." />
        <meta name="keywords" content="review management, customer feedback, small business, negative reviews, review software, reputation management, service business, 5-star reviews, online reviews, Google reviews, Facebook reviews, Yelp reviews, barber reviews, mechanic reviews, auto detailing reviews" />
        <meta name="author" content="ReviewFlo" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://usereviewflo.com" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://usereviewflo.com" />
        <meta property="og:title" content="ReviewFlo - Get More 5-Star Google Reviews Automatically" />
        <meta property="og:description" content="Get more 5-star Google reviews automatically. Catch unhappy customers privately before they post. Simple review management for small service businesses." />
        <meta property="og:image" content="https://usereviewflo.com/images/reviewflo-og-image.png" />
        <meta property="og:site_name" content="ReviewFlo" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://usereviewflo.com" />
        <meta name="twitter:title" content="ReviewFlo - Get More 5-Star Google Reviews Automatically" />
        <meta name="twitter:description" content="Get more 5-star Google reviews automatically. Catch unhappy customers privately before they post. Simple review management for small service businesses." />
        <meta name="twitter:image" content="https://usereviewflo.com/images/reviewflo-twitter-image.png" />

        {/* Viewport and Mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />

        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />

        {/* Meta Pixel Code - noscript stays in Head */}
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
        id="meta-pixel-home"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '750284611209309');fbq('track', 'PageView');`,
        }}
      />
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.8s ease-out 0.2s both;
        }
      `}</style>
      <div className="min-h-screen bg-white">
        <SiteNav variant="marketing" />
        <div className={SITE_NAV_SPACER_CLASS}></div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 animate-fadeIn">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="text-center animate-slideUp">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              Stop Bad Reviews Before They Go Public
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-600 mb-4 max-w-2xl mx-auto leading-relaxed">
              Get 10x More 5-Star Google Reviews — Automatically
            </p>

            {/* Tagline */}
            <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              The simple review management software for service businesses. Free forever.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-3">
              <a
                href="/join"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#4A3428] text-white rounded-lg font-semibold text-base hover:bg-[#4A3428]/90 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Start Free
              </a>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#4A3428] rounded-lg font-semibold text-base border-2 border-[#C9A961] hover:border-[#4A3428] hover:bg-[#E8DCC8]/20 transition-all duration-200"
              >
                See How It Works ↓
              </a>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              No credit card • Takes 2 minutes • Free forever
            </p>

            {/* Trust signals */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C9A961]" />
                5-minute setup
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#C9A961]" />
                No credit card required
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        ref={howItWorksSection.ref}
        className={`py-12 sm:py-20 transition-all duration-700 ${
          howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">
            How ReviewFlo Works
          </h2>
          <p className="text-lg text-gray-600 mb-10 sm:mb-12 text-center max-w-2xl mx-auto">
            A simple 3-step flow that turns happy customers into public 5-star reviews.
          </p>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-[#C9A961]/20 transition-all duration-300 hover:shadow-lg hover:border-[#C9A961]/40">
              <div className="w-11 h-11 bg-[#C9A961]/20 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-[#4A3428]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Step 1: Send Your Link
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                After each job, send customers a single ReviewFlo link by text or email. No apps, no logins.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-[#C9A961]/20 transition-all duration-300 hover:shadow-lg hover:border-[#C9A961]/40">
              <div className="w-11 h-11 bg-[#C9A961]/20 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-[#4A3428]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Step 2: Smart Routing
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Happy customers are guided to leave a public review. Unhappy customers are routed to a private feedback form.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-[#C9A961]/20 transition-all duration-300 hover:shadow-lg hover:border-[#C9A961]/40">
              <div className="w-11 h-11 bg-[#C9A961]/20 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-[#4A3428]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Step 3: Get Results
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Fix issues privately before they go public and steadily grow your 5-star reviews on Google.
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <a
              href="#see-it-in-action"
              className="inline-flex items-center justify-center px-6 py-3 text-sm sm:text-base font-semibold text-[#4A3428] border border-[#C9A961] rounded-lg hover:border-[#4A3428] hover:bg-[#E8DCC8]/30 transition-colors"
            >
              See It In Action ↓
            </a>
          </div>
        </div>
      </section>

      {/* See It In Action Section */}
      <section
        id="see-it-in-action"
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

      {/* Pricing Teaser Section */}
      <section
        id="pricing"
        ref={pricingSection.ref}
        className={`py-12 sm:py-20 bg-white transition-all duration-700 ${
          pricingSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Simple Pricing
            </h2>
            <p className="text-gray-600 text-base sm:text-lg">
              Start free. Upgrade when Pro &amp; AI launch in May 2026.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <div className="border border-gray-200 rounded-lg p-5 text-center bg-white">
              <p className="text-xs font-semibold text-[#4A3428] uppercase tracking-wide mb-1">Free</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                $0<span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <p className="text-xs text-gray-500">Forever</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-5 text-center bg-white">
              <p className="text-xs font-semibold text-[#4A3428] uppercase tracking-wide mb-1">Pro</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                $19<span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <p className="text-xs text-gray-500">Coming May 2026</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-5 text-center bg-white">
              <p className="text-xs font-semibold text-[#4A3428] uppercase tracking-wide mb-1">AI</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                $49<span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <p className="text-xs text-gray-500">Coming May 2026</p>
            </div>
          </div>

          <p className="text-center text-gray-600 text-sm mb-4">
            Start free. Upgrade when Pro &amp; AI launch in May 2026.
          </p>

          <div className="text-center">
            <a
              href="/pricing"
              className="inline-flex items-center justify-center px-6 py-3 text-sm sm:text-base font-semibold text-[#4A3428] border border-[#C9A961] rounded-lg hover:border-[#4A3428] hover:bg-[#E8DCC8]/30 transition-colors"
            >
              See Full Pricing →
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Join 50+ Utah Service Businesses
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mb-4">
            Used by barbers, auto detailers, plumbers, electricians, cleaners, HVAC pros, and more.
          </p>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-20 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
            Ready to Stop Worrying About Bad Reviews?
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
            <a
              href="/join"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#4A3428] text-white rounded-lg font-semibold hover:bg-[#4A3428]/90 transition-all duration-200 shadow-lg"
            >
              Start Free - No Credit Card
            </a>
            <a
              href="/pricing"
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#4A3428] rounded-lg font-semibold border-2 border-[#C9A961] hover:border-[#4A3428] hover:bg-[#E8DCC8]/20 transition-all duration-200"
            >
              See Full Pricing
            </a>
          </div>

          <p className="text-gray-500 text-sm">
            Questions? <strong>Text:</strong> (385) 522-5040 · <strong>Email:</strong>{' '}
            <a href="mailto:jeremy@usereviewflo.com" className="text-[#4A3428] hover:underline">
              jeremy@usereviewflo.com
            </a>
          </p>
        </div>
      </section>

      <SiteFooter />
      </div>
    </>
  );
}
