'use client';

import Head from 'next/head';
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

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

        <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Privacy Policy
            </h1>
            <p className="text-gray-600">
              Last updated: February 19, 2026
            </p>
          </div>
        </section>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="space-y-10 text-gray-600 leading-relaxed">
            <section>
              <p>
                Elucidation Media LLC (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates ReviewFlo, a review management tool for small businesses. This policy explains how we collect, use, and protect your information when you use our website and services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                1. Information We Collect
              </h2>
              <p className="mb-3">
                We collect information you provide directly and data generated through use of our service:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Account and signup information:</strong> When you sign up for our beta program, early access, or create an account, we collect your name, email address, business name, business type, and similar details you choose to share.</li>
                <li><strong>Customer feedback and reviews:</strong> Through ReviewFlo, we collect feedback and review data from your customers (e.g., ratings, comments) so you can manage and improve your business reputation.</li>
                <li><strong>Usage data:</strong> We collect information about how you interact with our website and product, such as pages visited and features used, to improve our service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                2. How We Use Information
              </h2>
              <p className="mb-3">
                We use your information to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Provide, maintain, and improve ReviewFlo</li>
                <li>Create and manage your account</li>
                <li>Respond to your questions and support requests</li>
                <li>Send product updates, surveys, and important service notices</li>
                <li>Understand how users interact with ReviewFlo so we can build better features</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                3. Data Storage and Security
              </h2>
              <p>
                We store your data securely using industry-standard practices and reputable hosting providers. We do not sell your personal information to third parties. We may share data only when necessary to operate our service (e.g., with our hosting and analytics providers) or when required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                4. Cookies and Tracking
              </h2>
              <p className="mb-3">
                We use cookies and similar technologies to improve your experience and understand how our site is used. Specifically, we use:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>PostHog:</strong> Analytics to understand product usage and improve the experience</li>
                <li><strong>Meta Pixel:</strong> To measure ad effectiveness and reach relevant audiences</li>
                <li><strong>Google Analytics:</strong> To analyze website traffic and behavior</li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings. Disabling certain cookies may affect how some features work.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                5. Your Rights
              </h2>
              <p>
                You have the right to request access to, correction of, or deletion of your personal data. If you want to exercise these rights or have questions about your data, contact us at{' '}
                <a href="mailto:support@usereviewflo.com" className="text-[#4A3428] font-medium hover:underline">
                  support@usereviewflo.com
                </a>
                . We will respond within a reasonable time. If you are located in the European Union or other regions with data protection laws, you may have additional rights under those laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                6. Contact Us
              </h2>
              <p>
                ReviewFlo is operated by Elucidation Media LLC, located in Utah, United States. For privacy-related questions or requests, email us at{' '}
                <a href="mailto:support@usereviewflo.com" className="text-[#4A3428] font-medium hover:underline">
                  support@usereviewflo.com
                </a>.
              </p>
            </section>

            <section className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                We may update this policy from time to time. When we do, we will update the &quot;Last updated&quot; date at the top of this page. Continued use of ReviewFlo after changes means you accept the updated policy.
              </p>
            </section>
          </div>

        </main>

        <SiteFooter />
      </div>
    </>
  );
}
