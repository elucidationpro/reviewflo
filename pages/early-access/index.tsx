'use client';

import { CheckCircle, Zap, Shield, X } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import Script from 'next/script';

export default function EarlyAccessPage() {
  return (
    <>
      <Head>
        <title>Stop Bad Reviews Before They Go Public | ReviewFlo Free Beta</title>
        <meta name="description" content="Use ReviewFlo free until April 2026. No credit card. No contracts. Cancel anytime. Built for Utah plumbers, electricians, detailers & service businesses." />
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
        id="meta-pixel"
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

        {/* Hero - Lead with pain (defense) */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold mb-8 border border-green-200">
              <Zap className="w-4 h-4" />
              Free Beta Until April 2026
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Stop Bad Reviews Before They Go Public
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 mb-4">
              Catch unhappy customers privately. Turn problems into opportunities—and into 5-star reviews.
            </p>
            <p className="text-lg font-semibold text-[#4A3428] mb-8">
              Free until April. Pay nothing now. Cancel anytime.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-10 text-sm text-gray-600">
              <span className="flex items-center gap-2"><X className="w-5 h-5 text-red-500" /> No contracts</span>
              <span className="flex items-center gap-2"><X className="w-5 h-5 text-red-500" /> No credit card required</span>
              <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-[#C9A961]" /> Dead-simple setup</span>
              <span className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#C9A961]" /> Cancel anytime</span>
            </div>
            <Link
              href="/early-access/join"
              className="inline-block px-12 py-5 bg-[#4A3428] text-white rounded-lg font-bold text-xl hover:bg-[#4A3428]/90 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 transform"
            >
              Join Free Beta →
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              Takes 2 minutes. No payment.
            </p>
          </div>
        </section>

        {/* Value: Defense + Offense */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">What You Get</h2>
            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#C9A961] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Stop bad reviews before they go public</p>
                  <p className="text-gray-600">Unhappy customers message you first—not Google</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#C9A961] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Get more 5-star Google reviews automatically</p>
                  <p className="text-gray-600">Make leaving great reviews effortless for happy customers</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#C9A961] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Use ReviewFlo free until April 2026</p>
                  <p className="text-gray-600">Help us fix bugs and add features. Beta testers get 50% off first 3 months at launch ($9.50–$24.50/mo vs $19–$49)</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-[#C9A961] flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Way cheaper than Podium</p>
                  <p className="text-gray-600">Podium starts at $289/month. ReviewFlo: $19–49/month at launch—still a fraction of the cost</p>
                </div>
              </div>
            </div>
            <div className="bg-[#C9A961]/10 border border-[#C9A961]/30 rounded-lg p-6 text-center">
              <p className="text-gray-700 font-medium">
                <strong>Join now. Pay nothing until April. Cancel anytime.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Questions</h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Is it really free?</h3>
                <p className="text-gray-600 leading-relaxed">
                  Yes. Use ReviewFlo completely free while we fix bugs and add features. Official launch: April 2026 at $19–49/month. Beta testers get 50% off for the first 3 months.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Do I need a contract?</h3>
                <p className="text-gray-600 leading-relaxed">
                  No. No contracts. Cancel anytime. No surprises.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">What if it&apos;s not for me?</h3>
                <p className="text-gray-600 leading-relaxed">
                  Stop using it. No commitment. We built ReviewFlo for Utah service businesses—plumbers, electricians, detailers, barbers, HVAC—who want to stop bad reviews and get more 5-stars. If that&apos;s you, join the beta.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Ready to Join?</h2>
          <p className="text-xl text-gray-600 mb-10">Free until April. No credit card. No contracts.</p>
          <Link
            href="/early-access/join"
            className="inline-block px-12 py-5 bg-[#4A3428] text-white rounded-lg font-bold text-xl hover:bg-[#4A3428]/90 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 transform"
          >
            Join Free Beta →
          </Link>
          <p className="mt-4">
            <Link href="/" className="text-sm text-gray-500 hover:text-[#4A3428] transition-colors">
              Want to learn more first? →
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
