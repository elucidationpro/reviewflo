'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';
import { parseMagicLandingNext, type MagicLandingNext } from '@/lib/magic-link-landing';

/**
 * Supabase magic-link completion page. After verify, Supabase redirects here with
 * session tokens in the URL hash (client-only). We set the session then route
 * to dashboard or Google onboarding.
 *
 * Also used when Supabase falls back to Site URL (/): _app sends users here if
 * the short-lived rf_magic_next cookie was set by the Google OAuth callback.
 */
export default function AuthMagicLandingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    const run = async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (!hash) {
        setError('Invalid or expired link');
        return;
      }

      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const err = params.get('error');
      if (err) {
        const desc = params.get('error_description') || err;
        if (params.get('error_code') === 'otp_expired' || desc.toLowerCase().includes('expired')) {
          router.replace('/login?error=expired_link');
          return;
        }
        setError(desc.replace(/\+/g, ' '));
        return;
      }

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (!accessToken || !refreshToken) {
        setError('Invalid link — missing session data');
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error('[auth/magic-landing] setSession failed:', sessionError);
        setError('Failed to sign in');
        return;
      }

      document.cookie = 'rf_magic_next=; Path=/; Max-Age=0';

      const next: MagicLandingNext =
        parseMagicLandingNext(router.query.next) ?? 'dashboard';
      const dest = next === 'google-confirm' ? '/join/google-confirm' : '/dashboard';
      router.replace(dest);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when route + query are ready
  }, [router.isReady, router.query.next]);

  if (error) {
    return (
      <>
        <Head>
          <title>Sign-in error - ReviewFlo</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Could not complete sign-in</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <a
                href="/login"
                className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to login
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Signing you in - ReviewFlo</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Signing you in…</p>
        </div>
      </div>
    </>
  );
}
