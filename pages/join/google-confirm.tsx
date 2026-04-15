'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CheckCircle, AlertCircle, Loader, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav';
import { generateSlugFromBusinessName } from '@/lib/slug-utils';
import { consumeGoogleAdsSignupConversionFromQuery } from '@/lib/google-ads';

/**
 * Google Signup Confirmation Page
 *
 * Shown after a user completes "Sign up with Google".
 * Their account and business are already created — this page lets them:
 * - Verify / edit their business name
 * - See their auto-generated review page slug (read-only)
 * - See their connected Google review URL
 * - Land on the dashboard
 */
export default function GoogleConfirmPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string | null>(null);
  const [hasPlaceId, setHasPlaceId] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const { hadNewSignupParam } = consumeGoogleAdsSignupConversionFromQuery(router.query);
    if (hadNewSignupParam) {
      router.replace('/join/google-confirm', undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when signup flag or readiness changes
  }, [router.isReady, router.query.new_signup]);

  useEffect(() => {
    async function loadBusiness() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/join');
        return;
      }

      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('id, business_name, slug, google_review_url, google_place_id, owner_name')
        .eq('user_id', session.user.id)
        .single();

      if (bizError || !business) {
        setError('Could not load your business info. Please contact support.');
        setLoading(false);
        return;
      }

      setOwnerName(business.owner_name || '');
      // Don't pre-fill the fallback placeholder name — force the user to type their real business name
      const loadedName = business.business_name || '';
      setBusinessName(loadedName === 'My Business' ? '' : loadedName);
      setGoogleReviewUrl(business.google_review_url || null);
      setHasPlaceId(!!business.google_place_id);
      setLoading(false);
    }

    loadBusiness();
  }, [router]);

  const previewSlug = generateSlugFromBusinessName(businessName.trim()) || 'my-business';

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;

    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/join'); return; }

      const res = await fetch('/api/auth/google/confirm-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          businessName: businessName.trim(),
          ownerName: ownerName.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to save your info. Please try again.');
        setSaving(false);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('[google-confirm] Error:', err);
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F5DC]/30 via-white to-[#F5F5DC]/30">
        <Loader className="w-8 h-8 text-[#4A3428] animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Confirm Your Info | ReviewFlo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC]/30 via-white to-[#F5F5DC]/30">
        <SiteNav variant="join-minimal" />
        <div className={SITE_NAV_SPACER_CLASS} />

        <div className="max-w-md mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

            {/* Gold accent top bar */}
            <div className="h-1 bg-gradient-to-r from-[#C9A961] via-[#e6c97a] to-[#C9A961]" />

            <div className="p-8">

              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#F5F5DC] border border-[#C9A961]/30 mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[#C9A961]" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">You&apos;re almost in!</h1>
                <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                  {hasPlaceId
                    ? 'We pulled your info from Google. Confirm your details below.'
                    : 'We have your name from Google. Add your business name below.'}
                </p>
              </div>

              {/* GBP connection status */}
              {hasPlaceId ? (
                <div className="mb-6 p-3.5 bg-[#F5F5DC]/70 border border-[#C9A961]/40 rounded-xl flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-[#4A3428] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#4A3428]">
                    <span className="font-semibold">Google Business Profile connected.</span>{' '}
                    Your review stats will be available on your dashboard.
                  </p>
                </div>
              ) : (
                <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-800">
                    We connected your Google account but couldn&apos;t pull your business automatically.
                    Add your business name below and you can connect your Google Review URL in Settings.
                  </p>
                </div>
              )}

              <form onSubmit={handleConfirm} className="space-y-5">

                {/* Owner / Personal Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A961]/50 focus:border-[#C9A961] text-gray-900 outline-none transition-colors"
                  />
                  <p className="mt-1.5 text-xs text-gray-400">Used when we email you directly.</p>
                </div>

                {/* Business Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Business Name <span className="text-[#C9A961]">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Smith's Plumbing Co."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C9A961]/50 focus:border-[#C9A961] text-gray-900 outline-none transition-colors"
                    required
                  />
                </div>

                {/* Review Page Slug (read-only) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Your ReviewFlo Link
                  </label>
                  <div className="flex items-center border border-[#C9A961]/30 rounded-xl overflow-hidden bg-[#F5F5DC]/40">
                    <span className="px-3 py-3 bg-[#4A3428]/5 text-[#4A3428]/60 text-xs font-medium border-r border-[#C9A961]/20 whitespace-nowrap">
                      usereviewflo.com/
                    </span>
                    <span className="flex-1 px-3 py-3 text-[#4A3428] text-sm font-semibold truncate">
                      {previewSlug}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">Automatically generated from your business name.</p>
                </div>

                {/* Google Review URL (read-only display) */}
                {googleReviewUrl && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Google Review Link{' '}
                      <span className="text-xs font-normal text-gray-400">auto-connected</span>
                    </label>
                    <div className="flex items-center gap-2.5 px-4 py-3 bg-[#F5F5DC]/40 border border-[#C9A961]/30 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-sm text-gray-600 truncate">{googleReviewUrl}</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving || !businessName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#4A3428] text-white font-semibold rounded-xl hover:bg-[#4A3428]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      Go to Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
