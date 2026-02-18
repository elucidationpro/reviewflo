'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, CheckCircle, Clock, Users, Shield, Zap } from 'lucide-react';
import Image from 'next/image';
import Head from 'next/head';

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
  const problemSection = useFadeInOnScroll();
  const howItWorksSection = useFadeInOnScroll();
  const betaSection = useFadeInOnScroll();
  const featuresSection = useFadeInOnScroll();
  const founderSection = useFadeInOnScroll();
  const waitlistSection = useFadeInOnScroll();

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

        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '750284611209309');
              fbq('track', 'PageView');
            `,
          }}
        />
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
      <style jsx global>{`
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
      {/* Header/Navbar */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <a href="/" className="flex items-center transition-opacity hover:opacity-80">
              <img
                src="/images/reviewflo-logo.svg"
                alt="ReviewFlo"
                className="h-8 sm:h-10 w-auto"
              />
            </a>

            {/* Right side buttons */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Login Link */}
              <a
                href="/login"
                className="text-sm sm:text-base text-gray-600 hover:text-[#4A3428] font-medium transition-colors"
              >
                Business Login
              </a>

              {/* CTA Button */}
              <a
                href="/qualify"
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#4A3428] text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-[#4A3428]/90 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Apply for Beta →
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16 sm:h-20"></div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 animate-fadeIn">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="text-center animate-slideUp">
            {/* Beta Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A961]/20 text-[#4A3428] rounded-full text-sm font-medium mb-6 border border-[#C9A961]/30">
              <Zap className="w-4 h-4" />
              Beta program open • Limited spots
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              Get More 5-Star Google Reviews.{' '}
              <span className="text-[#4A3428]">Automatically.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Turn happy customers into 5-star reviews effortlessly. Catch unhappy customers privately so you can fix issues before they post.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6">
              <a
                href="/qualify"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#4A3428] text-white rounded-lg font-semibold text-base hover:bg-[#4A3428]/90 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Apply for Beta →
              </a>
              <a
                href="#waitlist-signup"
                className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#4A3428] rounded-lg font-semibold text-base border-2 border-[#C9A961] hover:border-[#4A3428] hover:bg-[#E8DCC8]/20 transition-all duration-200"
              >
                Join Waitlist
              </a>
            </div>

            {/* Trust + Early access mention */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C9A961]" />
                5-minute setup
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#C9A961]" />
                No credit card to apply
              </div>
              <span className="text-gray-500">·</span>
              <a href="/early-access" className="text-[#4A3428] hover:underline font-medium">
                Want to start now? Early access $10 →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Urgency Banner */}
      <section className="bg-[#4A3428] text-white py-3">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm sm:text-base font-medium">
            Limited beta spots • Apply or join the waitlist
          </p>
        </div>
      </section>

      {/* The Problem Section */}
      <section
        ref={problemSection.ref}
        className={`py-12 sm:py-20 bg-gray-50/80 transition-all duration-700 ${
          problemSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 text-center">
            You know the feeling...
          </h2>
          <div className="prose prose-lg mx-auto text-gray-600 text-center">
            <p className="text-lg sm:text-xl leading-relaxed mb-3">
              You wake up, check your phone, and there&apos;s a new 1-star review on Google. Your stomach drops.
            </p>
            <p className="text-lg sm:text-xl leading-relaxed mb-3">
              <em>&quot;Why didn&apos;t they just tell me? I could have fixed it!&quot;</em>
            </p>
            <p className="text-lg sm:text-xl leading-relaxed">
              Now that review is public. Forever. Scaring away customers who would have loved your work.
            </p>
          </div>
        </div>
      </section>

      {/* The Promise Section */}
      <section
        ref={howItWorksSection.ref}
        className={`py-12 sm:py-20 transition-all duration-700 ${
          howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">
            The Promise
          </h2>
          <p className="text-lg text-gray-600 mb-10 sm:mb-12 text-center max-w-2xl mx-auto">
            Three guarantees that protect your reputation
          </p>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {/* Guarantee 1 */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-[#C9A961]/20 transition-all duration-300 hover:shadow-lg hover:border-[#C9A961]/40">
              <div className="w-11 h-11 bg-[#C9A961]/20 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-[#4A3428]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Catch Problems Before They Go Public
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Route 1-4 star feedback to private forms. Fix issues before they become negative reviews.
              </p>
            </div>

            {/* Guarantee 2 */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-[#C9A961]/20 transition-all duration-300 hover:shadow-lg hover:border-[#C9A961]/40">
              <div className="w-11 h-11 bg-[#C9A961]/20 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-[#4A3428]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                More 5-Star Reviews, Effortlessly
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Pre-written templates for happy customers. One click after each job—ReviewFlo handles the rest.
              </p>
            </div>

            {/* Guarantee 3 */}
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-[#C9A961]/20 transition-all duration-300 hover:shadow-lg hover:border-[#C9A961]/40">
              <div className="w-11 h-11 bg-[#C9A961]/20 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-[#4A3428]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Setup in 5 minutes
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                No training, no complexity. Set it once and ReviewFlo runs on autopilot.
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-gray-500 text-sm">
            In private beta. Join businesses testing ReviewFlo before public launch.
          </p>
        </div>
      </section>

      {/* Beta Program Section */}
      <section
        id="beta-signup"
        ref={betaSection.ref}
        className={`py-12 sm:py-20 bg-gradient-to-br from-[#4A3428] to-[#3a2a20] text-white transition-all duration-700 ${
          betaSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Apply for the Beta Program
            </h2>
            <p className="text-[#C9A961]/90 text-base sm:text-lg">
              Help shape ReviewFlo and get early access
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 sm:p-8 shadow-xl">
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#C9A961] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Free during beta</div>
                  <div className="text-gray-600 text-xs">No subscription while we build with you</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#C9A961] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Direct line to founder</div>
                  <div className="text-gray-600 text-xs">Text or email me directly</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#C9A961] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Shape the product</div>
                  <div className="text-gray-600 text-xs">Your feedback drives development</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#C9A961] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-900 text-sm">First to new features</div>
                  <div className="text-gray-600 text-xs">Early access to everything we ship</div>
                </div>
              </div>
            </div>

            <BetaSignupForm />

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-left">
              <a href="#waitlist-signup" className="text-[#4A3428] text-sm font-medium hover:underline">
                Prefer the waitlist? Join here →
              </a>
              <a href="/early-access" className="text-[#4A3428] text-sm font-medium hover:underline">
                Want to start now? Early access $10 →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        ref={featuresSection.ref}
        className={`py-12 sm:py-20 transition-all duration-700 ${
          featuresSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">
            Everything You Need to Manage Your Reputation
          </h2>
          <p className="text-gray-600 mb-10 text-center max-w-2xl mx-auto">
            All features included in beta
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-[#C9A961]/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#4A3428]" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Catch Problems Before They Go Public
                </h3>
                <p className="text-gray-600">
                  Route 1-4 star ratings to private feedback where you can make it right
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-[#C9A961]/20 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-[#4A3428]" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Make 5-Star Reviews Effortless
                </h3>
                <p className="text-gray-600">
                  Pre-written templates your happy customers can post with one tap
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-[#C9A961]/20 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#4A3428]" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Track What&apos;s Working
                </h3>
                <p className="text-gray-600">
                  Dashboard shows response rates, feedback trends, and sentiment over time
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-[#C9A961]/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#4A3428]" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Set It and Forget It
                </h3>
                <p className="text-gray-600">
                  Automated emails after every job. You focus on your work, ReviewFlo handles the rest
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Story Section */}
      <section
        ref={founderSection.ref}
        className={`py-12 sm:py-20 bg-gray-50 transition-all duration-700 ${
          founderSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-6 sm:p-8 shadow-lg">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-shrink-0">
                <div className="relative w-48 h-48 rounded-full overflow-hidden ring-4 ring-[#C9A961]/30 shadow-xl">
                  <Image
                    src="/images/jeremy.jpg"
                    alt="Jeremy - ReviewFlo Founder"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 192px, 192px"
                    priority
                  />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Hi, I&apos;m Jeremy 👋
                </h2>
                <div className="prose prose-lg text-gray-600">
                  <p>
                    I&apos;m an entrepreneur who loves running businesses and helping others run and grow theirs.
                  </p>
                  <p>
                    I built ReviewFlo to make it <em>easy for your customers to leave reviews</em>—one link, pre-written templates, post to Google or Yelp in a tap. We also catch issues privately before they become bad reviews.
                  </p>
                  <p className="font-semibold text-gray-900">
                    Want to help shape the future of ReviewFlo? Apply for the beta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section
        id="waitlist-signup"
        ref={waitlistSection.ref}
        className={`py-12 sm:py-20 bg-[#2A1F1A] text-white transition-all duration-700 ${
          waitlistSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Join the Waitlist
            </h2>
            <p className="text-gray-300 text-base sm:text-lg">
              Be first to get access when we launch
            </p>
          </div>

          <div className="bg-[#1a1410] rounded-xl p-6 sm:p-8 shadow-xl border border-[#C9A961]/10">
            <WaitlistSignupForm />
          </div>
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
              href="/qualify"
              className="w-full sm:w-auto px-8 py-3.5 bg-[#4A3428] text-white rounded-lg font-semibold hover:bg-[#4A3428]/90 transition-all duration-200 shadow-lg"
            >
              Apply for Beta →
            </a>
            <a
              href="#waitlist-signup"
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#4A3428] rounded-lg font-semibold border-2 border-[#C9A961] hover:border-[#4A3428] hover:bg-[#E8DCC8]/20 transition-all duration-200"
            >
              Join Waitlist
            </a>
          </div>

          <p className="text-gray-600 text-sm mb-1">
            Questions? <strong>Text:</strong> (385) 522-5040 · <strong>Email:</strong>{' '}
            <a href="mailto:jeremy@usereviewflo.com" className="text-[#4A3428] hover:underline">
              jeremy@usereviewflo.com
            </a>
          </p>
          <p className="text-gray-500 text-sm">
            <a href="/early-access" className="text-[#4A3428] hover:underline">Early access</a> — $10, start in minutes
          </p>
        </div>
      </section>
      </div>
    </>
  );
}

// Beta Signup Form Component
function BetaSignupForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessType: '',
    businessName: '',
    challenge: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API endpoint
      const response = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-[#C9A961] mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re In! 🎉</h3>
        <p className="text-gray-600 mb-4">
          Welcome to ReviewFlo beta. I&apos;ll text you within 24 hours to get you set up.
        </p>
        <p className="text-gray-600">
          Check your email for next steps.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400"
            placeholder="John Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400"
            placeholder="john@example.com"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400"
            placeholder="(555) 123-4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Type *
          </label>
          <select
            required
            value={formData.businessType}
            onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
          >
            <option value="">Select type...</option>
            <option value="barber">Barber / Hair Salon</option>
            <option value="mechanic">Mobile Mechanic</option>
            <option value="detailing">Auto Detailing</option>
            <option value="electrician">Electrician</option>
            <option value="plumber">Plumber</option>
            <option value="hvac">HVAC</option>
            <option value="cleaning">Cleaning Service</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Name *
        </label>
        <input
          type="text"
          required
          value={formData.businessName}
          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400"
          placeholder="Smith's Mobile Detailing"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tell me about your biggest review challenge (optional)
        </label>
        <textarea
          value={formData.challenge}
          onChange={(e) => setFormData({ ...formData, challenge: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400"
          placeholder="e.g., Customers leave bad reviews without telling me what went wrong..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-8 py-4 bg-[#4A3428] text-white rounded-lg font-semibold text-lg hover:bg-[#4A3428]/90 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSubmitting ? 'Submitting...' : 'Apply for Beta →'}
      </button>
    </form>
  );
}

// Waitlist Signup Form Component
function WaitlistSignupForm() {
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/waitlist-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, businessName, businessType })
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-[#C9A961] mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">You&apos;re on the list!</h3>
        <p className="text-gray-300 mb-4">
          You&apos;re on the list. We&apos;ll be in touch when we launch.
        </p>
        <p className="text-gray-300">
          We&apos;ll email you when we launch.
        </p>
        <a href="#beta-signup" className="inline-block mt-6 text-[#C9A961] hover:underline font-semibold hover:text-white">
          Prefer beta? Apply here →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent placeholder-gray-400"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Business Name *
        </label>
        <input
          type="text"
          required
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent placeholder-gray-400"
          placeholder="Your Business Name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Business Type (optional)
        </label>
        <select
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          className="w-full px-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent placeholder-gray-400"
        >
          <option value="">Select type...</option>
          <option value="barber">Barber / Hair Salon</option>
          <option value="mechanic">Mobile Mechanic</option>
          <option value="detailing">Auto Detailing</option>
          <option value="electrician">Electrician</option>
          <option value="plumber">Plumber</option>
          <option value="hvac">HVAC</option>
          <option value="cleaning">Cleaning Service</option>
          <option value="other">Other</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-8 py-4 bg-[#4A3428] text-white rounded-lg font-semibold text-lg hover:bg-[#4A3428]/90 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSubmitting ? 'Joining...' : 'Join Waitlist'}
      </button>

      <p className="text-center text-gray-400 text-sm">
        Want beta access instead?{' '}
        <a href="#beta-signup" className="text-[#C9A961] hover:underline font-semibold hover:text-white">
          Join beta program →
        </a>
      </p>
    </form>
  );
}
