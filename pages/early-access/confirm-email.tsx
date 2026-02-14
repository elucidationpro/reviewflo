'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ConfirmEmailPage() {
  const router = useRouter();
  const email = typeof router.query.email === 'string' ? router.query.email : '';
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<'success' | 'error' | null>(null);

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendMessage(null);
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/early-access/join` : '';
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    setResendLoading(false);
    setResendMessage(error ? 'error' : 'success');
  };

  return (
    <>
      <Head>
        <title>Confirm your email - ReviewFlo Early Access</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F5F5DC] flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-[#C9A961]/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#4A3428]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-600 mb-6">
            We sent a confirmation link to{email ? <> <strong className="text-gray-900">{email}</strong></> : ' your email'}. Click it to verify your account and continue.
          </p>
          <div className="bg-[#C9A961]/10 border border-[#C9A961]/30 rounded-lg p-4 text-sm text-gray-700 mb-8 text-left">
            <p className="font-semibold mb-1">What to do next</p>
            <p className="mb-2">1. Open your email and find the message from ReviewFlo.</p>
            <p className="mb-2">2. Click the confirmation link in that email.</p>
            <p>3. You’ll be taken back here to finish signing up for early access.</p>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Didn’t get it? Check spam, or <a href="mailto:jeremy@usereviewflo.com" className="text-[#4A3428] font-medium hover:underline">email Jeremy</a>.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Already confirmed this email? Click <strong>Continue</strong> below, then on the next page choose <strong>Already have an account? Sign in</strong> and enter your password.
          </p>
          {email && (
            <>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="block w-full sm:w-auto mx-auto mb-4 px-6 py-3 border-2 border-[#4A3428] text-[#4A3428] rounded-lg font-semibold hover:bg-[#4A3428]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resendLoading ? 'Sending…' : 'Send a new confirmation link'}
              </button>
              {resendMessage === 'success' && (
                <p className="text-sm text-green-600 mb-4">New link sent. Check your inbox (and spam).</p>
              )}
              {resendMessage === 'error' && (
                <p className="text-sm text-red-600 mb-4">Couldn’t send. Wait a minute and try again, or email Jeremy.</p>
              )}
            </>
          )}
          <Link
            href="/early-access/join"
            className="inline-block w-full sm:w-auto px-6 py-3 bg-[#4A3428] text-white rounded-lg font-semibold hover:bg-[#4A3428]/90 transition-colors"
          >
            Already confirmed? Continue →
          </Link>
        </div>
        <p className="mt-8 text-sm text-gray-500">
          <Link href="/early-access" className="text-[#4A3428] hover:underline">← Back to early access</Link>
        </p>
      </div>
    </>
  );
}
