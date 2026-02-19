'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { trackEvent } from '@/lib/posthog-provider';

const SURVEY_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd1jTmwDjEy5XuG80Ox3FXA3AzMq1bPEpUzZ0cXliJb4I8ozg/viewform';

export default function SurveyPage() {
  const router = useRouter();
  const submitted = router.query.submitted === 'true';

  useEffect(() => {
    trackEvent('survey_page_viewed', { submitted: !!submitted });
  }, [submitted]);

  const handleCtaClick = () => {
    trackEvent('survey_button_clicked', { submitted: false });
    window.location.href = SURVEY_URL;
  };

  return (
    <>
      <Head>
        <title>Almost There! Quick Survey - ReviewFlo</title>
        <meta name="description" content="Help us understand your business and pricing preferences. Takes 3 minutes." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F5F5DC] flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-[600px] mx-auto px-6 py-5">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img
                src="/images/reviewflo-logo.svg"
                alt="ReviewFlo"
                className="h-8 w-auto"
              />
            </Link>
          </div>
        </header>

        {/* Main Content - Centered Vertically */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[600px]">
            {submitted ? (
              <div className="text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-[#4A3428] mb-6">
                  ✅ Survey Submitted!
                </h1>
                <div className="space-y-4 text-[#4A3428]/90 leading-relaxed mb-10">
                  <p className="text-lg">
                    Thanks for completing the survey! We&apos;re reviewing your responses to ensure everything recorded properly.
                  </p>
                  <p className="text-lg">
                    Expect an email within 24 hours with your login details.
                  </p>
                  <p className="text-base">
                    Questions? Email{' '}
                    <a href="mailto:jeremy@usereviewflo.com" className="text-[#C9A961] font-medium hover:underline">
                      jeremy@usereviewflo.com
                    </a>
                  </p>
                </div>
                <Link
                  href="/"
                  className="inline-block px-8 py-3 bg-[#4A3428] text-white rounded-lg font-semibold hover:bg-[#4A3428]/90 transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            ) : (
              <div className="text-center">
                {/* Hero Section */}
                <div className="mb-10">
                  <h1 className="text-3xl sm:text-4xl font-bold text-[#4A3428] mb-4">
                    Almost There! One Quick Survey
                  </h1>
                  <p className="text-lg sm:text-xl text-[#4A3428] font-medium mb-4">
                    Help us understand your business and pricing preferences. Takes 3 minutes.
                  </p>
                  <p className="text-base text-[#4A3428]/80 leading-relaxed max-w-[540px] mx-auto">
                    This survey helps us build ReviewFlo at the right price point for small businesses like yours. Your responses are confidential and directly influence our pricing and features.
                  </p>
                </div>

                {/* What to Expect Box */}
                <div className="bg-white border border-[#C9A961]/30 rounded-xl p-8 mb-8 shadow-sm">
                  <h2 className="text-lg font-semibold text-[#4A3428] mb-5">What to expect</h2>
                  <ul className="space-y-3.5 text-left text-[#4A3428]/90">
                    <li className="flex items-start gap-3">
                      <span className="text-[#C9A961] font-bold mt-0.5">•</span>
                      <span>7 questions about your business and what you&apos;d pay</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#C9A961] font-bold mt-0.5">•</span>
                      <span>Takes 3 minutes to complete</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-[#C9A961] font-bold mt-0.5">•</span>
                      <span>Helps us price ReviewFlo fairly for small businesses</span>
                    </li>
                  </ul>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={handleCtaClick}
                  className="w-full sm:w-auto px-12 py-4 bg-[#4A3428] text-white rounded-lg font-semibold text-lg hover:bg-[#4A3428]/90 transition-all duration-200 shadow-lg hover:shadow-xl mb-6"
                >
                  Complete Survey →
                </button>

                {/* Bottom Text */}
                <p className="text-sm text-[#4A3428]/70 leading-relaxed">
                  After completing the survey, we&apos;ll review your responses and email you account login details within 24 hours.
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} ReviewFlo
        </footer>
      </div>
    </>
  );
}
