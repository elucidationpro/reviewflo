'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';

/**
 * Client-side callback for magic link signup.
 * Supabase redirects here with session tokens in the URL hash (access_token, refresh_token).
 * Hash is only available in the browser - API routes cannot read it.
 */
export default function JoinCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');

  useEffect(() => {
    const run = async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (!hash) {
        setError('Invalid or expired link');
        setStatus('error');
        return;
      }

      const params = new URLSearchParams(hash.replace(/^#/, ''));

      // Handle Supabase error redirect (expired link, etc.)
      const err = params.get('error');
      if (err) {
        const desc = params.get('error_description') || err;
        if (params.get('error_code') === 'otp_expired' || desc.toLowerCase().includes('expired')) {
          router.replace('/join?error=expired_link');
          return;
        }
        setError(desc.replace(/\+/g, ' '));
        setStatus('error');
        return;
      }

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (!accessToken || !refreshToken) {
        setError('Invalid link - missing session data');
        setStatus('error');
        return;
      }

      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('[join/callback] setSession failed:', sessionError);
          setError('Failed to sign in');
          setStatus('error');
          return;
        }

        // Complete signup: create business if needed (API uses the session)
        const res = await fetch('/api/auth/complete-magic-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Failed to complete setup');
          setStatus('error');
          return;
        }

        setStatus('success');
        router.replace('/join/set-password');
      } catch (err) {
        console.error('[join/callback] Error:', err);
        setError('Something went wrong');
        setStatus('error');
      }
    };

    run();
  }, [router]);

  if (status === 'loading') {
    return (
      <>
        <Head>
          <title>Completing signup - ReviewFlo</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Setting up your account…</p>
          </div>
        </div>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <Head>
          <title>Signup error - ReviewFlo</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Link expired or invalid</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <a
                href="/join"
                className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to sign up
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  return null;
}
