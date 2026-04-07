'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, Shield, Star, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Head from 'next/head';
import Script from 'next/script';
import Link from 'next/link';
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import MarketingPricingSection from '@/components/MarketingPricingSection';

// Typewriter cycling hook
const CYCLING_WORDS = [
  'Barbers',
  'Plumbers',
  'Auto Detailers',
  'Electricians',
  'HVAC Pros',
  'Cleaners',
  'local businesses',
];
const PAUSE_ON_LAST_MS = 3200;
const PAUSE_DEFAULT_MS = 1400;
const TYPE_SPEED_MS = 80;
const DELETE_SPEED_MS = 45;

function useTypewriter(words: string[]) {
  const [displayText, setDisplayText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    const isLastWord = wordIndex === words.length - 1;

    let delay: number;

    if (!isDeleting) {
      if (displayText.length < currentWord.length) {
        delay = TYPE_SPEED_MS;
        const t = setTimeout(
          () => setDisplayText(currentWord.slice(0, displayText.length + 1)),
          delay
        );
        return () => clearTimeout(t);
      } else {
        delay = isLastWord ? PAUSE_ON_LAST_MS : PAUSE_DEFAULT_MS;
        const t = setTimeout(() => setIsDeleting(true), delay);
        return () => clearTimeout(t);
      }
    } else {
      if (displayText.length > 0) {
        delay = DELETE_SPEED_MS;
        const t = setTimeout(
          () => setDisplayText(displayText.slice(0, -1)),
          delay
        );
        return () => clearTimeout(t);
      } else {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
      }
    }
  }, [displayText, isDeleting, wordIndex, words]);

  return displayText;
}

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
  const pricingSection = useFadeInOnScroll();
  const typedWord = useTypewriter(CYCLING_WORDS);
  const actionStepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = actionStepsRef.current;
    if (!container) return;

    const header = container.querySelector('.action-header');
    let headerObserver: IntersectionObserver | null = null;
    if (header) {
      headerObserver = new IntersectionObserver(
        ([entry]) => {
          entry.target.classList.toggle('action-header--visible', entry.isIntersecting);
        },
        { threshold: 0.5 }
      );
      headerObserver.observe(header);
    }

    const rows = container.querySelectorAll('.action-step');
    const rowObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('action-step--visible', entry.isIntersecting);
        });
      },
      { threshold: 0.35 }
    );
    rows.forEach((row) => rowObserver.observe(row));

    return () => {
      headerObserver?.disconnect();
      rowObserver.disconnect();
    };
  }, []);

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

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .cursor-blink {
          animation: blink 1s step-end infinite;
        }

        /* === See It In Action Animations === */

        .action-header {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .action-header--visible {
          opacity: 1;
          transform: none;
        }

        /* Image slides from LEFT */
        .action-step-img {
          opacity: 0;
          transform: translateX(-44px);
          transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
        }
        /* Image slides from RIGHT */
        .action-step-img-right {
          opacity: 0;
          transform: translateX(44px);
          transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .action-step--visible .action-step-img,
        .action-step--visible .action-step-img-right {
          opacity: 1;
          transform: none;
        }

        /* Text fades up with stagger delay */
        .action-step-text {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.6s ease-out 0.15s,
                      transform 0.6s ease-out 0.15s;
        }
        .action-step--visible .action-step-text {
          opacity: 1;
          transform: none;
        }

        /* Step badge pops in with spring */
        .action-step-badge {
          opacity: 0;
          transform: scale(0.75);
          transition: opacity 0.35s ease-out 0.1s,
                      transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s;
        }
        .action-step--visible .action-step-badge {
          opacity: 1;
          transform: scale(1);
        }

        /* Respect prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .action-header,
          .action-step-img,
          .action-step-img-right,
          .action-step-text,
          .action-step-badge {
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
      <div className="min-h-screen bg-white">
        <SiteNav variant="marketing" />
        <div className={SITE_NAV_SPACER_CLASS}></div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 animate-fadeIn">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20">
          <div className="text-center animate-slideUp">
            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
              Stop Bad Reviews Before They Go Public
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-xl text-gray-600 mb-3 sm:mb-4 max-w-2xl mx-auto leading-relaxed">
              Get 10x More 5-Star Google Reviews — Automatically
            </p>

            {/* Tagline */}
            <p className="text-sm sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
              The simple review management software for{' '}
              <span className="text-[#4A3428] font-semibold whitespace-nowrap">
                {typedWord}
                <span className="cursor-blink inline-block w-[2px] h-[1em] bg-[#C9A961] ml-[2px] align-middle" />
              </span>
              . Free forever.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-4 sm:mb-3">
              <Link
                href="/join"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-[#4A3428] text-white rounded-lg font-semibold text-base hover:bg-[#4A3428]/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                style={{ touchAction: 'manipulation' }}
              >
                Start Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-white text-[#4A3428] rounded-lg font-semibold text-base border-2 border-[#C9A961] hover:border-[#4A3428] hover:bg-[#E8DCC8]/20 transition-all duration-200"
                style={{ touchAction: 'manipulation' }}
              >
                See How It Works ↓
              </a>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C9A961]" />
                5-minute setup
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C9A961]" />
                No credit card required
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-full text-gray-600 shadow-sm">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C9A961]" />
                Free forever
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
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">
            How ReviewFlo Works
          </h2>
          <p className="text-sm sm:text-lg text-gray-600 mb-4 sm:mb-5 text-center max-w-2xl mx-auto">
            A simple 3-step flow that turns happy customers into public 5-star reviews.
          </p>
          <p className="text-sm text-gray-600 mb-8 sm:mb-12 text-center max-w-xl mx-auto">
            Want to see the customer experience first?{' '}
            <Link
              href="/demo"
              className="font-semibold text-[#4A3428] underline decoration-[#C9A961]/70 underline-offset-2 hover:decoration-[#4A3428]"
            >
              Try the interactive demo
            </Link>
            .
          </p>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-[#C9A961]/30 z-0" />

            {/* Step 1 */}
            <div className="relative bg-white p-6 sm:p-8 rounded-xl shadow-md border border-[#C9A961]/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[#C9A961]/50 z-10">
              <div className="w-11 h-11 bg-[#4A3428] rounded-full flex items-center justify-center mb-5 text-white font-bold text-lg">
                1
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Send Your Link
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                After each job, send customers a single ReviewFlo link by text or email. No apps, no logins.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-white p-6 sm:p-8 rounded-xl shadow-md border border-[#C9A961]/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[#C9A961]/50 z-10">
              <div className="w-11 h-11 bg-[#4A3428] rounded-full flex items-center justify-center mb-5 text-white font-bold text-lg">
                2
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Smart Routing
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Happy customers are guided to leave a public review. Unhappy customers are routed to a private feedback form.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-white p-6 sm:p-8 rounded-xl shadow-md border border-[#C9A961]/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[#C9A961]/50 z-10">
              <div className="w-11 h-11 bg-[#C9A961] rounded-full flex items-center justify-center mb-5 text-[#4A3428] font-bold text-lg">
                3
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Get Results
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
      <section id="see-it-in-action" className="py-12 sm:py-16 bg-gray-50/50">
        <div ref={actionStepsRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header — slides up on enter */}
          <div className="action-header text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">
              See It In Action
            </h2>
            <p className="text-sm text-gray-500 max-w-xl mx-auto">
              Here&apos;s exactly what your customers will see
            </p>
          </div>

          {/* Step 1: image LEFT → slides from left */}
          <div className="action-step mb-12 flex flex-col-reverse md:flex-row items-center gap-6 md:gap-10">
            <div className="action-step-img w-full md:w-1/2 group">
              <Image
                src="/images/sq-rating-page.png"
                alt="Customer rating screen"
                width={400}
                height={400}
                className="w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-xl"
              />
            </div>
            <div className="action-step-text w-full md:w-1/2">
              <span className="action-step-badge inline-block px-3 py-1 bg-[#E8DCC8] text-[#4A3428] text-xs font-bold rounded-full mb-3 tracking-wide uppercase">
                Step 1
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Customer Rates
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Your customer receives your link and sees this simple 1-5 star rating screen. One click, takes 5 seconds.
              </p>
            </div>
          </div>

          {/* Step 2a: image RIGHT → slides from right */}
          <div className="action-step mb-12 flex flex-col-reverse md:flex-row-reverse items-center gap-6 md:gap-10">
            <div className="action-step-img-right w-full md:w-1/2 group">
              <Image
                src="/images/sq-feedback-page.png"
                alt="Private feedback form"
                width={400}
                height={400}
                className="w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-xl"
              />
            </div>
            <div className="action-step-text w-full md:w-1/2">
              <span className="action-step-badge inline-block px-3 py-1 bg-[#FEE2E2] text-red-700 text-xs font-bold rounded-full mb-3 tracking-wide uppercase">
                Step 2a — Unhappy
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                If They&apos;re Unhappy (1-4 stars)
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                They see a private feedback form where they can tell you what went wrong. You get an email. Nothing goes public. You can fix it.
              </p>
            </div>
          </div>

          {/* Step 2b: image LEFT → slides from left */}
          <div className="action-step mb-12 flex flex-col-reverse md:flex-row items-center gap-6 md:gap-10">
            <div className="action-step-img w-full md:w-1/2 group">
              <Image
                src="/images/sq-templates-page.png"
                alt="Template selection"
                width={400}
                height={400}
                className="w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-xl"
              />
            </div>
            <div className="action-step-text w-full md:w-1/2">
              <span className="action-step-badge inline-block px-3 py-1 bg-[#DCFCE7] text-green-700 text-xs font-bold rounded-full mb-3 tracking-wide uppercase">
                Step 2b — Happy
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                If They&apos;re Happy (5 stars)
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                They choose to write their own review or use a pre-written template. Templates make it effortless.
              </p>
            </div>
          </div>

          {/* Step 3: image RIGHT → slides from right */}
          <div className="action-step mb-12 flex flex-col-reverse md:flex-row-reverse items-center gap-6 md:gap-10">
            <div className="action-step-img-right w-full md:w-1/2 group">
              <Image
                src="/images/sq-platform-page.png"
                alt="Platform selection screen"
                width={400}
                height={400}
                className="w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-xl"
              />
            </div>
            <div className="action-step-text w-full md:w-1/2">
              <span className="action-step-badge inline-block px-3 py-1 bg-[#E8DCC8] text-[#4A3428] text-xs font-bold rounded-full mb-3 tracking-wide uppercase">
                Step 3
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Choose Platform
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Customer picks Google, Facebook, or Yelp. One click and they&apos;re there.
              </p>
            </div>
          </div>

          {/* Final Result: image LEFT → slides from left */}
          <div className="action-step mb-0 flex flex-col-reverse md:flex-row items-center gap-6 md:gap-10">
            <div className="action-step-img w-full md:w-1/2 group">
              <Image
                src="/images/sq-google-review.png"
                alt="5-star Google review"
                width={400}
                height={400}
                className="w-full max-w-sm mx-auto rounded-lg shadow-md border border-gray-200 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-xl"
              />
            </div>
            <div className="action-step-text w-full md:w-1/2">
              <span className="action-step-badge inline-block px-3 py-1 bg-[#C9A961] text-white text-xs font-bold rounded-full mb-3 tracking-wide uppercase">
                ★ Result
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                A Public 5-Star Review
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
        className={`transition-all duration-700 ${
          pricingSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <MarketingPricingSection as="div" />
      </section>

      {/* Social Proof Section */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-[#C9A961] text-[#C9A961]" />
            ))}
          </div>
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-3">
            Built for Local Service Businesses
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mb-6">
            Helping local pros get more 5-star reviews every week.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Barbers', 'Auto Detailers', 'Plumbers', 'Electricians', 'Cleaners', 'HVAC Pros', 'Mechanics', 'Landscapers'].map((biz) => (
              <span
                key={biz}
                className="px-3 py-1.5 bg-white border border-[#C9A961]/30 rounded-full text-sm text-gray-700 font-medium shadow-sm"
              >
                {biz}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-br from-[#4A3428] to-[#3a2820]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-[#C9A961] text-[#C9A961]" />
            ))}
          </div>
          <h2 className="text-xl sm:text-3xl font-bold text-white mb-3">
            Ready to Stop Worrying About Bad Reviews?
          </h2>
          <p className="text-[#E8DCC8]/80 text-sm sm:text-base mb-6 sm:mb-8">
            Simple review management for local service businesses. Free forever.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6 sm:mb-8">
            <Link
              href="/join"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-[#C9A961] text-[#4A3428] rounded-lg font-bold hover:bg-[#C9A961]/90 transition-all duration-200 shadow-lg"
              style={{ touchAction: 'manipulation' }}
            >
              Start Free - No Credit Card
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-transparent text-white rounded-lg font-semibold border-2 border-white/30 hover:border-white hover:bg-white/10 transition-all duration-200"
              style={{ touchAction: 'manipulation' }}
            >
              See Full Pricing
            </Link>
          </div>

          <p className="text-[#E8DCC8]/70 text-sm">
            Questions? <strong className="text-[#E8DCC8]">Email:</strong>{' '}
            <a href="mailto:jeremy@usereviewflo.com" className="text-[#C9A961] hover:underline">
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
