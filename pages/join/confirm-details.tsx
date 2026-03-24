'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Loader } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav';

/**
 * Shown after magic link signup, before set-password.
 * Collects the user's personal name for direct client emails.
 */
export default function ConfirmDetailsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/join');
        return;
      }

      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('id, business_name, owner_name')
        .eq('user_id', session.user.id)
        .single();

      if (bizError || !business) {
        setError('Could not load your account. Please contact support.');
        setLoading(false);
        return;
      }

      // If they already completed this step, skip to set-password
      if (business.owner_name) {
        router.replace('/join/set-password');
        return;
      }

      setOwnerName(business.owner_name || '');
      setBusinessName(business.business_name || '');
      setLoading(false);
    }

    load();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim()) return;

    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/join');
        return;
      }

      const res = await fetch('/api/auth/confirm-magic-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ownerName: ownerName.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to save. Please try again.');
        setSaving(false);
        return;
      }

      router.replace('/join/set-password');
    } catch (err) {
      console.error('[confirm-details] Error:', err);
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Almost done | ReviewFlo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <SiteNav variant="join-minimal" />
        <div className={SITE_NAV_SPACER_CLASS} />

        <div className="max-w-md mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">One more thing</h1>
              <p className="text-gray-500 text-sm mt-1">
                What&apos;s your name? We use this when emailing you directly.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                  autoFocus
                />
              </div>

              {businessName && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Business Name
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                    {businessName}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">You can change this in Settings later.</p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !ownerName.trim()}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving…
                  </span>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
