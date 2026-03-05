'use client';

import { useState } from 'react';
import Link from 'next/link';

interface OnboardingProgressProps {
  passwordSet: boolean;
  hasGoogleLink: boolean;
  hasFacebookLink: boolean;
  hasCustomColor: boolean;
  hasEditedTemplates: boolean;
}

const HELP_EMAIL = 'jeremy@usereviewflo.com';

export default function OnboardingProgress({
  passwordSet,
  hasGoogleLink,
  hasFacebookLink,
  hasCustomColor,
  hasEditedTemplates,
}: OnboardingProgressProps) {
  const [expanded, setExpanded] = useState(false);
  const [openStep, setOpenStep] = useState<string | null>(null);

  const steps = [
    { done: passwordSet, label: 'Password', key: 'password', hasDetails: false },
    { done: hasGoogleLink || hasFacebookLink, label: 'Add review links', key: 'links', hasDetails: true },
    { done: hasCustomColor, label: 'Brand color', key: 'color', hasDetails: true },
    { done: hasEditedTemplates, label: 'Edit review templates', key: 'templates', hasDetails: true },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;

  if (completed === total) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div
        className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all ${
          expanded ? 'w-80 sm:w-96' : 'w-48'
        }`}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-600">{completed}/{total}</span>
            </div>
            <span className="text-sm font-medium text-gray-700">Finish setting up</span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(completed / total) * 100}%` }}
              />
            </div>

            <div className="space-y-1">
              {steps.map((step) => (
                <div key={step.key} className="rounded-lg border border-gray-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => step.hasDetails && setOpenStep(openStep === step.key ? null : step.key)}
                    className={`w-full flex items-center justify-between gap-2 p-2 text-left hover:bg-gray-50 transition-colors ${step.hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {step.done ? (
                        <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm ${step.done ? 'text-gray-500' : 'text-gray-700'}`}>
                        {step.label}
                      </span>
                    </div>
                    {step.hasDetails && (
                      <svg
                        className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${openStep === step.key ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                  {step.hasDetails && openStep === step.key && (
                    <div className="px-3 pb-3 pt-0">
                      <div className="ml-7 text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
                        {step.key === 'links' && (
                          <>
                            <p className="font-medium text-gray-600 mb-1">Google:</p>
                            <ol className="list-decimal list-inside space-y-1 text-gray-600 mb-1">
                              <li>Log into your Google Business Profile</li>
                              <li>Search your business</li>
                              <li>Click &quot;Get more reviews&quot;</li>
                              <li>Copy the link that appears</li>
                            </ol>
                            <a
                              href="https://business.google.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-block mb-2"
                            >
                              Google Business Profile →
                            </a>
                            <p className="font-medium text-gray-600 mb-1 mt-2">Facebook:</p>
                            <ol className="list-decimal list-inside space-y-1 text-gray-600">
                              <li>Go to your Facebook Page</li>
                              <li>Copy the page URL</li>
                              <li>Add <code className="bg-gray-200 px-1 rounded">/reviews</code> to the end</li>
                            </ol>
                          </>
                        )}
                        {step.key === 'color' && (
                          <p className="text-gray-600">
                            Pick a color for buttons and branding on your review pages. This helps your link feel on-brand for your business.
                          </p>
                        )}
                        {step.key === 'templates' && (
                          <p className="text-gray-600">
                            Review templates are enabled by default and recommended to boost reviews. You can customize them or disable the option in Settings.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              Need help?{' '}
              <a href={`mailto:${HELP_EMAIL}`} className="text-blue-600 hover:underline">
                Email me
              </a>
            </p>
            <Link
              href="/settings"
              className="block w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 py-2"
            >
              Go to Settings →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
