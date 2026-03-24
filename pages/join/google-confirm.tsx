'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav';
import { generateSlugFromBusinessName } from '@/lib/slug-utils';

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
  const [businessName, setBusinessName] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string | null>(null);
  const [hasPlaceId, setHasPlaceId] = useState(false);

  useEffect(() => {
    async function loadBusiness() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/join');
        return;
      }

      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('id, business_name, slug, google_review_url, google_place_id')
        .eq('user_id', session.user.id)
        .single();

      if (bizError || !business) {
        setError('Could not load your business info. Please contact support.');
        setLoading(false);
        return;
      }

      setBusinessName(business.business_name || '');
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
        body: JSON.stringify({ businessName: businessName.trim() }),
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F5DC] via-white to-[#F5F5DC]">
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

      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F5F5DC]">
        <SiteNav variant="join-minimal" />
        <div className={SITE_NAV_SPACER_CLASS} />

        <div className="max-w-md mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">You&apos;re almost in!</h1>
              <p className="text-gray-500 text-sm mt-1">We pulled your info from Google. Confirm your business name below.</p>
            </div>

            {/* GBP connection status */}
            {hasPlaceId ? (
              <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <p className="text-sm text-green-800">
                  Google Business Profile connected. Your review stats will be available on your dashboard.
                </p>
              </div>
            ) : (
              <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  We connected your Google Business Profile but couldn&apos;t find a Place ID automatically. You can add your Google Review URL manually in Settings after signing up.
                </p>
              </div>
            )}

            <form onSubmit={handleConfirm} className="space-y-5">

              {/* Business Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                  required
                />
              </div>

              {/* Review Page Slug (read-only) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Your ReviewFlo Link
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                  <span className="px-3 py-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 whitespace-nowrap">
                    usereviewflo.com/
                  </span>
                  <span className="flex-1 px-3 py-3 text-gray-700 text-sm font-medium truncate">{previewSlug}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">This link is automatically generated from your business name.</p>
              </div>

              {/* Google Review URL (read-only display) */}
              {googleReviewUrl && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Google Review Link <span className="font-normal text-gray-400">(auto-connected)</span>
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate">
                    {googleReviewUrl}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !businessName.trim()}
                className="w-full px-6 py-3 bg-[#4A3428] text-white font-semibold rounded-lg hover:bg-[#4A3428]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  'Go to Dashboard'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
