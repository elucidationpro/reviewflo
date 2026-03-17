'use client';

import Head from 'next/head';
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

function SectionBadge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#E8DCC8] text-[#4A3428] text-xs font-bold flex-shrink-0 mt-0.5">
      {n}
    </span>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy - ReviewFlo</title>
        <meta name="description" content="ReviewFlo privacy policy. Learn how we collect, use, and protect your information." />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className="min-h-screen bg-white">
        <SiteNav variant="marketing" />
        <div className={SITE_NAV_SPACER_CLASS} />

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
              Privacy Policy
            </h1>
            <p className="text-gray-500 text-sm">
              Last updated: February 19, 2026
            </p>
          </div>
        </section>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

          {/* Intro */}
          <div className="mb-10 p-5 bg-[#E8DCC8]/30 border border-[#C9A961]/30 rounded-xl text-gray-700 text-sm leading-relaxed">
            Elucidation Media LLC (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates ReviewFlo, a review management tool for small businesses.
            This policy explains how we collect, use, and protect your information when you use our website and services.
          </div>

          <div className="space-y-10">

            <div className="flex gap-4">
              <SectionBadge n={1} />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Information We Collect</h2>
                <p className="text-gray-600 text-sm mb-3">
                  We collect information you provide directly and data generated through use of our service:
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex gap-2"><span className="text-[#C9A961] font-bold mt-0.5">·</span><span><strong className="text-gray-800">Account and signup information:</strong> When you sign up for our beta program, early access, or create an account, we collect your name, email address, business name, business type, and similar details you choose to share.</span></li>
                  <li className="flex gap-2"><span className="text-[#C9A961] font-bold mt-0.5">·</span><span><strong className="text-gray-800">Customer feedback and reviews:</strong> Through ReviewFlo, we collect feedback and review data from your customers (e.g., ratings, comments) so you can manage and improve your business reputation.</span></li>
                  <li className="flex gap-2"><span className="text-[#C9A961] font-bold mt-0.5">·</span><span><strong className="text-gray-800">Usage data:</strong> We collect information about how you interact with our website and product, such as pages visited and features used, to improve our service.</span></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex gap-4">
              <SectionBadge n={2} />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-3">How We Use Information</h2>
                <p className="text-gray-600 text-sm mb-3">We use your information to:</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  {[
                    'Provide, maintain, and improve ReviewFlo',
                    'Create and manage your account',
                    'Respond to your questions and support requests',
                    'Send product updates, surveys, and important service notices',
                    'Understand how users interact with ReviewFlo so we can build better features',
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-[#C9A961] font-bold mt-0.5">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex gap-4">
              <SectionBadge n={3} />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Data Storage and Security</h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  We store your data securely using industry-standard practices and reputable hosting providers.
                  We do not sell your personal information to third parties. We may share data only when necessary
                  to operate our service (e.g., with our hosting and analytics providers) or when required by law.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex gap-4">
              <SectionBadge n={4} />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Cookies &amp; Tracking</h2>
                <p className="text-gray-600 text-sm mb-3">
                  We use cookies and similar technologies to improve your experience and understand how our site is used. Specifically, we use:
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex gap-2"><span className="text-[#C9A961] font-bold mt-0.5">·</span><span><strong className="text-gray-800">PostHog:</strong> Analytics to understand product usage and improve the experience</span></li>
                  <li className="flex gap-2"><span className="text-[#C9A961] font-bold mt-0.5">·</span><span><strong className="text-gray-800">Meta Pixel:</strong> To measure ad effectiveness and reach relevant audiences</span></li>
                  <li className="flex gap-2"><span className="text-[#C9A961] font-bold mt-0.5">·</span><span><strong className="text-gray-800">Google Analytics:</strong> To analyze website traffic and behavior</span></li>
                </ul>
                <p className="text-gray-500 text-sm mt-3">
                  You can control cookies through your browser settings. Disabling certain cookies may affect how some features work.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex gap-4">
              <SectionBadge n={5} />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Your Rights</h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  You have the right to request access to, correction of, or deletion of your personal data.
                  If you want to exercise these rights or have questions about your data, contact us at{' '}
                  <a href="mailto:support@usereviewflo.com" className="text-[#4A3428] font-medium hover:underline">
                    support@usereviewflo.com
                  </a>
                  . We will respond within a reasonable time. If you are located in the European Union or other
                  regions with data protection laws, you may have additional rights under those laws.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex gap-4">
              <SectionBadge n={6} />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Contact Us</h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  ReviewFlo is operated by Elucidation Media LLC, located in Utah, United States.
                  For privacy-related questions or requests, email us at{' '}
                  <a href="mailto:support@usereviewflo.com" className="text-[#4A3428] font-medium hover:underline">
                    support@usereviewflo.com
                  </a>.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <p className="text-xs text-gray-400 leading-relaxed">
                We may update this policy from time to time. When we do, we will update the &quot;Last updated&quot; date at
                the top of this page. Continued use of ReviewFlo after changes means you accept the updated policy.
              </p>
            </div>

          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
