'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { CheckCircle, Zap, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/posthog-provider';

type Step = 1 | 2 | 3 | 'paid';

export default function EarlyAccessJoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountError, setAccountError] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);

  const [businessType, setBusinessType] = useState('');
  const [customersPerMonth, setCustomersPerMonth] = useState('');
  const [reviewAskingFrequency, setReviewAskingFrequency] = useState('');
  const [surveyError, setSurveyError] = useState('');
  const [surveyLoading, setSurveyLoading] = useState(false);

  const [payError, setPayError] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setSessionToken(session.access_token);
        const res = await fetch('/api/early-access-status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.step === 3 || data.step === 'paid') setStep(data.step);
        else if (data.step === 2) setStep(2);
      }
      setLoading(false);
    };
    init();
  }, []);

  // From confirm-email: "I clicked the link — sign in to continue" → open sign-in form
  useEffect(() => {
    if (router.isReady && router.query.signin === '1') {
      setShowSignIn(true);
    }
  }, [router.isReady, router.query.signin]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError('');
    if (password !== confirmPassword) {
      setAccountError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setAccountError('Password must be at least 8 characters');
      return;
    }
    setAccountLoading(true);
    try {
      // Use canonical production URL (must be in Supabase Redirect URLs)
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const canonicalJoin = origin.includes('usereviewflo.com')
        ? 'https://www.usereviewflo.com/early-access/join'
        : `${origin}/early-access/join`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: canonicalJoin,
        },
      });
      if (error) throw error;
      if (data.session) {
        setSessionToken(data.session.access_token);
        setStep(2);
      } else {
        router.push(`/early-access/confirm-email?email=${encodeURIComponent(email.trim())}`);
        return;
      }
    } catch (err: unknown) {
      setAccountError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setAccountLoading(false);
    }
  };

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSurveyError('');
    if (!businessType || !customersPerMonth || !reviewAskingFrequency) {
      setSurveyError('Please answer all three questions.');
      return;
    }
    if (!sessionToken) {
      setSurveyError('Session expired. Please sign in again.');
      return;
    }
    setSurveyLoading(true);
    try {
      const res = await fetch('/api/early-access-survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          businessType,
          customersPerMonth,
          reviewAskingFrequency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setStep(3);
      trackEvent('early_access_survey_completed', { businessType, customersPerMonth, reviewAskingFrequency });
    } catch (err: unknown) {
      setSurveyError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setSurveyLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    setSignInLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPassword,
      });
      if (error) throw error;
      if (data.session?.access_token) {
        setSessionToken(data.session.access_token);
        const res = await fetch('/api/early-access-status', {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        const status = await res.json();
        if (status.step === 3 || status.step === 'paid') setStep(status.step);
        else if (status.step === 2) setStep(2);
      }
    } catch (err: unknown) {
      setSignInError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionToken(null);
    setStep(1);
    router.replace('/early-access/join');
  };

  const handlePay = async () => {
    setPayError('');
    if (!sessionToken) {
      setPayError('Session expired. Please sign in again.');
      return;
    }
    setPayLoading(true);
    trackEvent('early_access_cta_clicked', { price: 10, source: 'early_access_join' });
    try {
      const res = await fetch('/api/create-early-access-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error('Could not start checkout');
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Could not start checkout.');
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Join Early Access - ReviewFlo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F5F5DC]">
        <header className="bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <Link href="/early-access" className="flex items-center transition-opacity hover:opacity-80">
                <img src="/images/reviewflo-logo.svg" alt="ReviewFlo" className="h-8 sm:h-10 w-auto" />
              </Link>
              <div className="flex items-center gap-4">
                {sessionToken && (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-sm sm:text-base text-gray-600 hover:text-[#4A3428] font-medium transition-colors"
                  >
                    Sign out
                  </button>
                )}
                <Link href="/early-access" className="text-sm sm:text-base text-gray-600 hover:text-[#4A3428] font-medium transition-colors">
                  ← Back to early access
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12">
            {loading ? (
              <p className="text-center text-gray-500">Loading...</p>
            ) : step === 1 ? (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                    {showSignIn ? 'Sign in' : 'Create your account'}
                  </h1>
                  <p className="text-lg text-gray-600">
                    {showSignIn ? 'Sign in to continue your early access signup.' : 'We’ll use this to save your progress and give you access after payment.'}
                  </p>
                </div>
                {showSignIn ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label className="block text-base font-semibold text-gray-900 mb-2">Email</label>
                      <input
                        type="email"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-gray-900 mb-2">Password</label>
                      <input
                        type="password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                        placeholder="Your password"
                      />
                    </div>
                    {signInError && <p className="text-sm text-red-600">{signInError}</p>}
                    <button
                      type="submit"
                      disabled={signInLoading}
                      className="w-full px-8 py-4 bg-[#4A3428] text-white rounded-lg font-semibold text-lg hover:bg-[#4A3428]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {signInLoading ? 'Signing in...' : 'Sign in →'}
                    </button>
                    <p className="text-center text-sm text-gray-600">
                      <button
                        type="button"
                        onClick={() => { setShowSignIn(false); setSignInError(''); }}
                        className="text-[#4A3428] font-medium hover:underline"
                      >
                        Create a new account instead
                      </button>
                    </p>
                  </form>
                ) : (
                  <>
                    <form onSubmit={handleCreateAccount} className="space-y-4">
                      <div>
                        <label className="block text-base font-semibold text-gray-900 mb-2">Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-gray-900 mb-2">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                          placeholder="you@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-gray-900 mb-2">Password</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                          placeholder="At least 8 characters"
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-gray-900 mb-2">Confirm password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                          placeholder="Same as above"
                        />
                      </div>
                      {accountError && <p className="text-sm text-red-600">{accountError}</p>}
                      <button
                        type="submit"
                        disabled={accountLoading}
                        className="w-full px-8 py-4 bg-[#4A3428] text-white rounded-lg font-semibold text-lg hover:bg-[#4A3428]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {accountLoading ? 'Creating account...' : 'Continue →'}
                      </button>
                    </form>
                    <p className="text-center text-sm text-gray-600 mt-4">
                      <button
                        type="button"
                        onClick={() => setShowSignIn(true)}
                        className="text-[#4A3428] font-medium hover:underline"
                      >
                        Already have an account? Sign in
                      </button>
                    </p>
                  </>
                )}
              </>
            ) : step === 2 ? (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Check If You Qualify</h1>
                  <p className="text-lg text-gray-600">Answer 3 quick questions (about 1 minute)</p>
                </div>
                <form onSubmit={handleSurveySubmit} className="space-y-6">
                  <div>
                    <label className="block text-base font-semibold text-gray-900 mb-2">1. What type of business do you run?</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className={`w-full px-4 py-3 border ${surveyError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 bg-white`}
                    >
                      <option value="">Select your business type...</option>
                      <option value="barbershop">Barbershop / Hair Salon</option>
                      <option value="auto-repair">Auto Repair / Mobile Mechanic</option>
                      <option value="auto-detailing">Auto Detailing / Car Wash</option>
                      <option value="trades">Electrician / Plumber / HVAC</option>
                      <option value="other-service">Other Service Business</option>
                      <option value="not-service">I don&apos;t run a service business</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-gray-900 mb-2">2. How many customers do you serve per month?</label>
                    <select
                      value={customersPerMonth}
                      onChange={(e) => setCustomersPerMonth(e.target.value)}
                      className={`w-full px-4 py-3 border ${surveyError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 bg-white`}
                    >
                      <option value="">Select customer volume...</option>
                      <option value="1-10">1-10</option>
                      <option value="11-25">11-25</option>
                      <option value="26-50">26-50</option>
                      <option value="51-100">51-100</option>
                      <option value="100+">100+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-gray-900 mb-2">3. How often do you currently ask customers for Google reviews?</label>
                    <select
                      value={reviewAskingFrequency}
                      onChange={(e) => setReviewAskingFrequency(e.target.value)}
                      className={`w-full px-4 py-3 border ${surveyError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 bg-white`}
                    >
                      <option value="">Select frequency...</option>
                      <option value="every">Every customer (or nearly every)</option>
                      <option value="most">Most customers (75%+)</option>
                      <option value="half">About half my customers</option>
                      <option value="occasionally">Occasionally (25% or less)</option>
                      <option value="rarely">Rarely or never</option>
                    </select>
                  </div>
                  {surveyError && <p className="text-sm text-red-600">{surveyError}</p>}
                  <button
                    type="submit"
                    disabled={surveyLoading}
                    className="w-full px-8 py-4 bg-[#4A3428] text-white rounded-lg font-semibold text-lg hover:bg-[#4A3428]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {surveyLoading ? 'Saving...' : 'Continue →'}
                  </button>
                </form>
              </>
            ) : step === 3 ? (
              <>
                <div className="text-center mb-8">
                  <CheckCircle className="w-16 h-16 text-[#C9A961] mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">You’re all set</h2>
                  <p className="text-lg text-gray-600">Complete your early access with a one-time $10 payment. No auto-renewal.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm text-gray-600">
                  <span className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#C9A961]" /> No auto-renewal</span>
                  <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-[#C9A961]" /> One-time payment</span>
                  <span className="flex items-center gap-2"><Zap className="w-5 h-5 text-[#C9A961]" /> Instant access</span>
                </div>
                {payError && <p className="mb-4 text-sm text-red-600 text-center">{payError}</p>}
                <button
                  onClick={handlePay}
                  disabled={payLoading}
                  className="w-full px-8 py-4 bg-[#4A3428] text-white rounded-lg font-bold text-lg hover:bg-[#4A3428]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {payLoading ? 'Loading...' : 'Get Early Access - $10 →'}
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-[#C9A961] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-3">You already have early access</h2>
                <p className="text-gray-600 mb-6">Check your email for next steps, or go to the dashboard.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/dashboard" className="inline-block px-6 py-3 bg-[#4A3428] text-white rounded-lg font-semibold hover:bg-[#4A3428]/90">
                    Go to dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-sm text-gray-500 hover:text-[#4A3428] underline"
                  >
                    Use a different account? Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            Questions? <a href="mailto:jeremy@usereviewflo.com" className="text-[#4A3428] font-semibold hover:underline">Email Jeremy</a>
          </p>
        </div>
      </div>
    </>
  );
}
