'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, Mail, Calendar, PartyPopper, Heart } from 'lucide-react';
import Head from 'next/head';
import { trackEvent } from '@/lib/posthog-provider';

export default function OnboardingPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const { session_id } = router.query;
    if (session_id && typeof session_id === 'string') {
      setSessionId(session_id);

      // Track successful payment
      trackEvent('early_access_payment_completed', {
        sessionId: session_id,
        source: 'early_access',
        price: 10,
      });
    }
  }, [router.query]);

  return (
    <>
      <Head>
        <title>Welcome to ReviewFlo!</title>
        <meta name="description" content="Your early access payment was successful. Check your email for next steps." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F5F5DC]">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <a href="/" className="flex items-center transition-opacity hover:opacity-80">
                <img
                  src="/images/reviewflo-logo.svg"
                  alt="ReviewFlo"
                  className="h-8 sm:h-10 w-auto"
                />
              </a>
            </div>
          </div>
        </header>

        {/* Success Content */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center">
            {/* Success Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
              <PartyPopper className="w-10 h-10 text-[#C9A961]" /> Welcome to ReviewFlo!
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-700 mb-8">
              Your payment was successful. You're officially part of our early access program!
            </p>

            {/* What's Next Section */}
            <div className="bg-[#F5F5DC] rounded-lg p-6 mb-8 text-left">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                What Happens Next:
              </h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-[#4A3428] text-white rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-5 h-5 text-[#C9A961]" />
                      <h3 className="font-bold text-gray-900">Check Your Email</h3>
                    </div>
                    <p className="text-gray-700">
                      We just sent you a welcome email with a quick setup survey (2 minutes). Please complete it so we can create your account.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-[#4A3428] text-white rounded-full flex items-center justify-center font-bold">
                      2
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-[#C9A961]" />
                      <h3 className="font-bold text-gray-900">We'll Set Up Your Account</h3>
                    </div>
                    <p className="text-gray-700">
                      Within 24 hours, we'll create your ReviewFlo account and send you login credentials.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-[#4A3428] text-white rounded-full flex items-center justify-center font-bold">
                      3
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-[#C9A961]" />
                      <h3 className="font-bold text-gray-900">Start Getting More Reviews!</h3>
                    </div>
                    <p className="text-gray-700">
                      Once your account is ready, you can start using ReviewFlo to get more 5-star reviews and catch unhappy customers before they post.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Your Access Details */}
            <div className="bg-[#C9A961]/10 border border-[#C9A961]/30 rounded-lg p-6 mb-8">
              <h3 className="font-bold text-gray-900 mb-3">Your Early Access Details:</h3>
              <ul className="text-left text-gray-700 space-y-2">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#C9A961] flex-shrink-0" /> 2 months of full ReviewFlo access</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#C9A961] flex-shrink-0" /> Priority founder support</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#C9A961] flex-shrink-0" /> Help shape new features</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#C9A961] flex-shrink-0" /> All features included</li>
              </ul>
            </div>

            {/* Support CTA */}
            <div className="border-t border-gray-200 pt-6">
              <p className="text-gray-600 mb-4">
                <strong>Questions or need help?</strong>
              </p>
              <p className="text-gray-600">
                Email me directly at{' '}
                <a
                  href="mailto:jeremy@usereviewflo.com"
                  className="text-[#4A3428] hover:underline font-semibold"
                >
                  jeremy@usereviewflo.com
                </a>
              </p>
              <p className="text-sm text-gray-500 mt-4">
                I&apos;m here to make sure you have an amazing experience! <span className="inline-flex align-middle ml-1"><Heart className="w-4 h-4 text-[#C9A961]" /></span>
              </p>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 text-center text-gray-500 text-sm">
          <p>© 2026 ReviewFlo. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
