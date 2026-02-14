'use client';

import { CheckCircle, Zap, Shield } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';

export default function EarlyAccessPage() {
  return (
    <>
      <Head>
        <title>Early Access - ReviewFlo</title>
        <meta name="description" content="Get 2 months of full ReviewFlo access for just $10. Limited to 50 businesses." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F5F5DC]">
        <header className="bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
                <img src="/images/reviewflo-logo.svg" alt="ReviewFlo" className="h-8 sm:h-10 w-auto" />
              </Link>
              <Link href="/" className="text-sm sm:text-base text-gray-600 hover:text-[#4A3428] font-medium transition-colors">
                Back to Home
              </Link>
            </div>
          </div>
        </header>

        {/* Landing: Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A961]/20 text-[#4A3428] rounded-full text-sm font-semibold mb-8 border border-[#C9A961]/30">
              <Zap className="w-4 h-4" />
              Limited to 50 Businesses
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Early Access Launch
            </h1>
            <p className="text-2xl sm:text-3xl font-semibold text-[#4A3428] mb-6">
              $10 One-Time Payment
            </p>
            <p className="text-xl sm:text-2xl text-gray-700 mb-8">
              Get 2 Months of Full Access
            </p>
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
              ReviewFlo is officially launching soon. Be one of the first 50 businesses to try it.
            </p>
            <Link
              href="/early-access/join"
              className="inline-block px-12 py-5 bg-[#4A3428] text-white rounded-lg font-bold text-xl hover:bg-[#4A3428]/90 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 transform"
            >
              Get Early Access - $10 →
            </Link>
            <p className="mt-4">
              <Link href="/" className="text-sm text-gray-500 hover:text-[#4A3428] transition-colors">
                Want to learn more first? →
              </Link>
            </p>
            <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-gray-600">
              <span className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#C9A961]" /> No auto-renewal</span>
              <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-[#C9A961]" /> One-time payment</span>
              <span className="flex items-center gap-2"><Zap className="w-5 h-5 text-[#C9A961]" /> Instant access</span>
            </div>
          </div>
        </section>

        {/* Landing: What You Get */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">What You Get</h2>
            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#C9A961] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">2 months of full access starting today</p>
                  <p className="text-gray-600">Complete access to all ReviewFlo features</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#C9A961] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Stop bad reviews before they go public</p>
                  <p className="text-gray-600">Catch unhappy customers privately</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#C9A961] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Get more 5-star Google reviews automatically</p>
                  <p className="text-gray-600">Make leaving great reviews effortless</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#C9A961] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Help shape new features through feedback</p>
                  <p className="text-gray-600">Your input directly influences development</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#C9A961] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Priority founder support</p>
                  <p className="text-gray-600">Direct line to the founder</p>
                </div>
              </div>
            </div>
            <div className="bg-[#C9A961]/10 border border-[#C9A961]/30 rounded-lg p-6 mb-8">
              <p className="text-gray-700 text-center">
                <strong>After your 2 months:</strong> You&apos;ll have the option to continue at our standard monthly pricing. No obligation.
              </p>
            </div>
            <div className="bg-[#4A3428] text-white rounded-lg p-6 text-center">
              <p className="text-lg font-semibold mb-2">Limited to 50 businesses</p>
              <p className="text-sm opacity-90">No subscription, no auto-renewal. One-time payment only.</p>
            </div>
          </div>
        </section>

        {/* Landing: FAQ */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">What happens after 2 months?</h3>
                <p className="text-gray-600 leading-relaxed">
                  Your access ends and you can choose to subscribe at our standard monthly rate. We&apos;ll notify you 2 weeks before your access ends. No pressure, no automatic charges.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Will I be auto-charged?</h3>
                <p className="text-gray-600 leading-relaxed">
                  No. This is a one-time $10 payment. No subscription, no surprises. You&apos;re in complete control.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">When do you officially launch?</h3>
                <p className="text-gray-600 leading-relaxed">
                  We&apos;re targeting April 2026. Early access members will be notified first and get priority access to the full launch.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Ready to Join?</h2>
          <p className="text-xl text-gray-600 mb-10">Be one of the first 50 businesses. $10 one-time payment.</p>
          <Link
            href="/early-access/join"
            className="inline-block px-12 py-5 bg-[#4A3428] text-white rounded-lg font-bold text-xl hover:bg-[#4A3428]/90 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 transform"
          >
            Get Early Access - $10 →
          </Link>
          <p className="mt-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-[#4A3428] transition-colors">
              Not ready yet? Learn more about ReviewFlo →
            </Link>
          </p>
        </section>

        <footer className="py-8 text-center text-gray-500 text-sm">
          <p>© 2026 ReviewFlo. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
