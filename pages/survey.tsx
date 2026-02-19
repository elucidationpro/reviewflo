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
        <title>Help Us Improve ReviewFlo – Quick Survey</title>
        <meta name="description" content="Your feedback shapes the product. This 3-minute survey helps us build exactly what small businesses need." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#E8DCC8]/30">
        <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-[#C9A961]/20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-[#4A3428] font-semibold hover:opacity-80 transition-opacity">
                ReviewFlo
              </Link>
              <Link href="/" className="text-sm text-[#4A3428]/80 hover:text-[#4A3428] font-medium">
                Back to Home
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {submitted ? (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#4A3428] mb-6">
                ✅ Survey Submitted!
              </h1>
              <div className="prose prose-[#4A3428] max-w-none space-y-4 text-[#4A3428]/90 leading-relaxed">
                <p>
                  Thanks for completing the survey! We&apos;re reviewing your responses to ensure everything recorded properly.
                </p>
                <p>
                  Expect an email within 24 hours with your login details.
                </p>
                <p>
                  Questions? Email{' '}
                  <a href="mailto:jeremy@usereviewflo.com" className="text-[#C9A961] font-medium hover:underline">
                    jeremy@usereviewflo.com
                  </a>
                </p>
              </div>
              <div className="mt-10">
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-[#4A3428] text-white rounded-lg font-semibold hover:bg-[#4A3428]/90 transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </>
          ) : (
            <>
              <section className="text-center mb-12">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#4A3428] mb-4">
                  Help Us Improve ReviewFlo
                </h1>
                <p className="text-lg sm:text-xl text-[#4A3428]/90 mb-8 max-w-xl mx-auto">
                  Your feedback shapes the product! This survey takes 3 minutes and helps us build exactly what small businesses need.
                </p>
                <button
                  type="button"
                  onClick={handleCtaClick}
                  className="inline-block px-10 py-4 sm:px-12 sm:py-5 bg-[#4A3428] text-white rounded-xl font-bold text-lg sm:text-xl hover:bg-[#4A3428]/90 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  Complete Survey →
                </button>
              </section>

              <section className="border border-[#C9A961]/30 rounded-xl bg-white/60 p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-[#4A3428] mb-4">What to expect</h2>
                <ul className="space-y-3 text-[#4A3428]/90">
                  <li className="flex items-start gap-3">
                    <span className="text-[#C9A961] font-bold mt-0.5">•</span>
                    <span>7 quick questions about your business and pricing preferences</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C9A961] font-bold mt-0.5">•</span>
                    <span>Takes 3 minutes to complete</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-[#C9A961] font-bold mt-0.5">•</span>
                    <span>Your responses help us build the right features at the right price</span>
                  </li>
                </ul>
              </section>

              <p className="mt-8 text-center text-sm text-[#4A3428]/70">
                You&apos;ll be taken to a short Google Form. We use it for easy export and analysis.
              </p>
            </>
          )}
        </main>

        <footer className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-[#4A3428]/60">
          © {new Date().getFullYear()} ReviewFlo
        </footer>
      </div>
    </>
  );
}
