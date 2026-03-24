'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OnboardingProgressProps {
  businessId: string;
  tier: 'free' | 'pro' | 'ai';
  hasGoogleLink: boolean;
  hasFacebookLink: boolean;
  hasCustomColor: boolean;
  hasEditedTemplates: boolean;
}

interface Step {
  key: string;
  label: string;
  done: boolean;
  tier: 'all' | 'pro' | 'ai';
  hasDetails: boolean;
  helpContent?: React.ReactNode;
}

const HELP_EMAIL = 'jeremy@usereviewflo.com';

export default function OnboardingProgress({
  businessId,
  tier,
  hasGoogleLink,
  hasFacebookLink,
  hasCustomColor,
  hasEditedTemplates,
}: OnboardingProgressProps) {
  const [expanded, setExpanded] = useState(false);
  const [openStep, setOpenStep] = useState<string | null>(null);
  const [manuallyCompleted, setManuallyCompleted] = useState<Set<string>>(new Set());
  const [ignoredSteps, setIgnoredSteps] = useState<Set<string>>(new Set());

  // Load state from localStorage on mount
  useEffect(() => {
    const storageKey = `onboarding_${businessId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setManuallyCompleted(new Set(data.completed || []));
        setIgnoredSteps(new Set(data.ignored || []));
      } catch (e) {
        console.error('Failed to parse onboarding state:', e);
      }
    }
  }, [businessId]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const storageKey = `onboarding_${businessId}`;
    localStorage.setItem(storageKey, JSON.stringify({
      completed: Array.from(manuallyCompleted),
      ignored: Array.from(ignoredSteps),
    }));
  }, [businessId, manuallyCompleted, ignoredSteps]);

  const toggleManualComplete = (key: string) => {
    setManuallyCompleted(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleIgnore = (key: string) => {
    setIgnoredSteps(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const allSteps: Step[] = [
    {
      key: 'links',
      label: 'Add review links',
      done: hasGoogleLink || hasFacebookLink || manuallyCompleted.has('links'),
      tier: 'all',
      hasDetails: true,
      helpContent: (
        <>
          <p className="font-semibold text-gray-700 mb-2">Google Business Profile:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600 mb-3">
            <li>Log into your Google Business Profile</li>
            <li>Search your business</li>
            <li>Click &quot;Get more reviews&quot;</li>
            <li>Copy the link and paste in Settings → Review Links</li>
          </ol>
          <a
            href="https://business.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4A3428] hover:underline inline-block mb-3 font-medium"
          >
            Open Google Business Profile →
          </a>
          <p className="font-semibold text-gray-700 mb-2 mt-3">Facebook (Optional):</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            <li>Go to your Facebook Page</li>
            <li>Copy the page URL</li>
            <li>Add <code className="bg-gray-200 px-1 rounded">/reviews</code> to the end</li>
            <li>Paste in Settings → Review Links</li>
          </ol>
        </>
      ),
    },
    {
      key: 'color',
      label: 'Customize brand color',
      done: hasCustomColor || manuallyCompleted.has('color'),
      tier: 'all',
      hasDetails: true,
      helpContent: (
        <div className="text-gray-600 space-y-2">
          <p>Pick a brand color for buttons and accents on your review pages.</p>
          <p>Go to <strong>Settings → Branding</strong> and choose a color that matches your business branding.</p>
          <p className="text-xs text-gray-500 mt-2">Tip: Use your logo&apos;s primary color for consistency.</p>
        </div>
      ),
    },
    {
      key: 'logo',
      label: 'Upload business logo',
      done: manuallyCompleted.has('logo'),
      tier: 'all',
      hasDetails: true,
      helpContent: (
        <div className="text-gray-600 space-y-2">
          <p>Add your business logo to make review pages feel professional and trustworthy.</p>
          <p>Go to <strong>Settings → Branding → Logo</strong> and upload your logo (PNG, JPG, or SVG).</p>
          <p className="text-xs text-gray-500 mt-2">Recommended: Square or landscape format, 400x400px minimum.</p>
        </div>
      ),
    },
    {
      key: 'templates',
      label: 'Review templates',
      done: hasEditedTemplates || manuallyCompleted.has('templates'),
      tier: 'all',
      hasDetails: true,
      helpContent: (
        <div className="text-gray-600 space-y-2">
          <p>Review templates help customers write better reviews by providing suggestions they can use or customize.</p>
          <p>Go to <strong>Settings → Review Flow</strong> to enable templates and customize the text.</p>
          <p className="text-xs text-gray-500 mt-2">Tip: Templates are enabled by default and highly recommended.</p>
        </div>
      ),
    },
    {
      key: 'test-link',
      label: 'Test your review link',
      done: manuallyCompleted.has('test-link'),
      tier: 'all',
      hasDetails: true,
      helpContent: (
        <div className="text-gray-600 space-y-2">
          <p>Send your review link to yourself or a colleague to see how it works from a customer&apos;s perspective.</p>
          <p>Copy your link from the <strong>Dashboard</strong> and open it in a private/incognito window.</p>
          <p className="text-xs text-gray-500 mt-2">This helps you catch any issues before sending to real customers.</p>
        </div>
      ),
    },
    {
      key: 'google-stats',
      label: 'Connect Google Business Profile',
      done: manuallyCompleted.has('google-stats'),
      tier: 'pro',
      hasDetails: true,
      helpContent: (
        <div className="text-gray-600 space-y-2">
          <p>Connect your Google Business Profile to automatically sync reviews and stats to your dashboard.</p>
          <p>Go to <strong>Settings → Review Links</strong> and click &quot;Connect Google Business Profile&quot;.</p>
          <p className="text-xs text-[#C9A961] font-medium mt-2">Pro/AI feature</p>
        </div>
      ),
    },
    {
      key: 'multi-platform',
      label: 'Add additional review platforms',
      done: manuallyCompleted.has('multi-platform'),
      tier: 'pro',
      hasDetails: true,
      helpContent: (
        <div className="text-gray-600 space-y-2">
          <p>Add Facebook, Yelp, or Nextdoor to give customers multiple review platform options.</p>
          <p>Go to <strong>Settings → Review Links → Other Platforms</strong> to add additional URLs.</p>
          <p className="text-xs text-[#C9A961] font-medium mt-2">Pro/AI feature</p>
        </div>
      ),
    },
    {
      key: 'email-sending',
      label: 'Send first review request email',
      done: manuallyCompleted.has('email-sending'),
      tier: 'pro',
      hasDetails: true,
      helpContent: (
        <div className="text-gray-600 space-y-2">
          <p>Use the dashboard to send your first review request via email instead of manually copying links.</p>
          <p>From <strong>Dashboard → Review Requests</strong>, click &quot;Send Request via Email&quot;.</p>
          <p className="text-xs text-[#C9A961] font-medium mt-2">Pro/AI feature</p>
        </div>
      ),
    },
    {
      key: 'sms-setup',
      label: 'Configure SMS automation',
      done: manuallyCompleted.has('sms-setup'),
      tier: 'ai',
      hasDetails: true,
      helpContent: (
        <div className="text-gray-600 space-y-2">
          <p>Set up SMS review requests using Twilio to reach customers via text message.</p>
          <p>Go to <strong>Settings → SMS Automation</strong> and enter your Twilio credentials.</p>
          <p className="text-xs text-[#C9A961] font-medium mt-2">AI feature — Coming May 2026</p>
        </div>
      ),
    },
    {
      key: 'crm-integration',
      label: 'Connect your CRM',
      done: manuallyCompleted.has('crm-integration'),
      tier: 'ai',
      hasDetails: true,
      helpContent: (
        <div className="text-gray-600 space-y-2">
          <p>Integrate with Square, Jobber, or Housecall Pro to automatically trigger review requests.</p>
          <p>Go to <strong>Settings → CRM Integration</strong> and connect your preferred platform.</p>
          <p className="text-xs text-[#C9A961] font-medium mt-2">AI feature — Coming May 2026</p>
        </div>
      ),
    },
    {
      key: 'ai-features',
      label: 'Enable AI-powered features',
      done: manuallyCompleted.has('ai-features'),
      tier: 'ai',
      hasDetails: true,
      helpContent: (
        <div className="text-gray-600 space-y-2">
          <p>Turn on AI review drafts and AI-generated responses to help customers and save time.</p>
          <p>Go to <strong>Settings → AI Features</strong> and enable the features you want to use.</p>
          <p className="text-xs text-[#C9A961] font-medium mt-2">AI feature — Coming May 2026</p>
        </div>
      ),
    },
  ];

  // Filter steps based on tier and ignored status
  const visibleSteps = allSteps.filter(step => {
    if (ignoredSteps.has(step.key)) return false;
    if (step.tier === 'all') return true;
    if (step.tier === 'pro') return tier === 'pro' || tier === 'ai';
    if (step.tier === 'ai') return tier === 'ai';
    return false;
  });

  const completed = visibleSteps.filter((s) => s.done).length;
  const total = visibleSteps.length;

  if (completed === total && visibleSteps.length > 0) return null;
  if (visibleSteps.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div
        className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all ${
          expanded ? 'w-80 sm:w-96' : 'w-52'
        }`}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#4A3428]/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-[#4A3428]">{completed}/{total}</span>
            </div>
            <span className="text-sm font-semibold text-gray-800">Setup Guide</span>
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
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4A3428] rounded-full transition-all duration-500"
                style={{ width: `${(completed / total) * 100}%` }}
              />
            </div>

            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {visibleSteps.map((step) => (
                <div key={step.key} className="rounded-lg border border-gray-100 overflow-hidden bg-white">
                  <div className="flex items-start gap-2 p-2.5">
                    <button
                      type="button"
                      onClick={() => toggleManualComplete(step.key)}
                      className="shrink-0 mt-0.5 cursor-pointer"
                    >
                      {step.done ? (
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => step.hasDetails && setOpenStep(openStep === step.key ? null : step.key)}
                        className="w-full text-left flex items-center justify-between gap-2 group"
                      >
                        <span className={`text-sm ${step.done ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                          {step.label}
                        </span>
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
                        <div className="mt-2 mb-1">
                          <div className="text-xs bg-gray-50 rounded-lg p-3 space-y-1">
                            {step.helpContent}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleIgnore(step.key)}
                            className="mt-2 text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
                          >
                            Ignore this step
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {ignoredSteps.size > 0 && (
              <button
                type="button"
                onClick={() => setIgnoredSteps(new Set())}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium cursor-pointer"
              >
                Show {ignoredSteps.size} ignored step{ignoredSteps.size > 1 ? 's' : ''}
              </button>
            )}

            <div className="pt-2 border-t border-gray-100 space-y-2">
              <p className="text-xs text-gray-500">
                Need help?{' '}
                <a href={`mailto:${HELP_EMAIL}`} className="text-[#4A3428] hover:underline font-medium">
                  Email me
                </a>
              </p>
              <Link
                href="/settings"
                className="block w-full text-center text-sm font-semibold text-[#4A3428] hover:text-[#4A3428]/80 py-2"
              >
                Go to Settings →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
