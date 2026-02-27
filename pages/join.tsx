'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, Copy, Check } from 'lucide-react';
import Head from 'next/head';
import Script from 'next/script';
import { trackEvent } from '@/lib/posthog-provider';
import { generateSlugFromBusinessName, isValidSlug, isReservedSlug, normalizeSlugForValidation } from '@/lib/slug-utils';
import { supabase } from '@/lib/supabase';

type Step = 'form' | 'preview' | 'editing' | 'success';

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    businessType: '',
    customersPerMonth: '',
    reviewAskingFrequency: ''
  });
  const [slug, setSlug] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [slugAvailability, setSlugAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [rotatingText, setRotatingText] = useState('Plumbers');
  const [formStarted, setFormStarted] = useState(false);
  const hasTrackedPageView = useRef(false);

  const displayHost =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '').replace(/\/$/, '') ||
    (typeof window !== 'undefined' ? window.location.host : 'usereviewflo.com');
  const fullReviewUrl = slug
    ? (typeof window !== 'undefined' ? window.location.origin : 'https://usereviewflo.com') + '/' + slug
    : '';

  // Track page view on mount
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      trackEvent('join_page_viewed', {
        source: 'join_page',
        timestamp: new Date().toISOString(),
      });
      hasTrackedPageView.current = true;
    }
  }, []);

  // Rotating text animation
  useEffect(() => {
    const industries = ['Plumbers', 'Electricians', 'Detailers', 'Landscapers', 'HVAC Pros', 'Service Operators'];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % industries.length;
      setRotatingText(industries[currentIndex]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Track form start on first input interaction
  const handleFormStart = () => {
    if (!formStarted) {
      setFormStarted(true);
      trackEvent('join_form_started', {
        timestamp: new Date().toISOString(),
      });
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Please enter your name';
    }
    if (!formData.businessName?.trim()) {
      newErrors.businessName = 'Please enter your business name';
    }
    if (!formData.email) {
      newErrors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Please create a password (at least 8 characters)';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.businessType) {
      newErrors.businessType = 'Please select your business type';
    }
    if (!formData.customersPerMonth) {
      newErrors.customersPerMonth = 'Please select customer volume';
    }
    if (!formData.reviewAskingFrequency) {
      newErrors.reviewAskingFrequency = 'Please select review frequency';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Track form submission
    trackEvent('join_form_submitted', {
      businessType: formData.businessType,
      customersPerMonth: formData.customersPerMonth,
      reviewAskingFrequency: formData.reviewAskingFrequency,
      timestamp: new Date().toISOString(),
    });

    if (!validateForm()) return;

    const trimmedName = formData.name.trim();
    const trimmedBusinessName = formData.businessName.trim();
    const generatedSlug = generateSlugFromBusinessName(trimmedBusinessName);
    const finalSlug = generatedSlug || 'my-business';

    setFormData((prev) => ({
      ...prev,
      name: trimmedName,
      businessName: trimmedBusinessName,
      phone: prev.phone.trim(),
    }));
    setSlug(finalSlug);
    setCustomSlug(finalSlug);
    setStep('preview');

    trackEvent('slug_previewed', {
      businessName: trimmedBusinessName,
      slug: finalSlug,
      source: 'auto-generated',
    });
  };

  const handleEditLink = () => {
    setCustomSlug(slug);
    setSlugAvailability('idle');
    setStep('editing');
  };

  const handleCheckSlugAvailability = async () => {
    const normalized = normalizeSlugForValidation(customSlug);
    setErrors((e) => ({ ...e, slug: '' }));
    if (isReservedSlug(normalized)) {
      setSlugAvailability('taken');
      setErrors((e) => ({ ...e, slug: 'That link is reserved. Please choose another.' }));
      return;
    }
    if (!isValidSlug(normalized)) {
      setSlugAvailability('idle');
      setErrors((e) => ({ ...e, slug: 'Use only letters, numbers, and hyphens. 3–30 characters.' }));
      return;
    }
    setSlugAvailability('checking');
    try {
      const res = await fetch('/api/check-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: normalized }),
      });
      const data = await res.json();
      setSlugAvailability(data.available ? 'available' : 'taken');
      if (!data.available && data.error) {
        setErrors((e) => ({ ...e, slug: data.error }));
      }
    } catch {
      setSlugAvailability('idle');
    }
  };

  const handleSaveCustomSlug = async () => {
    const normalized = normalizeSlugForValidation(customSlug);
    setErrors({});
    if (isReservedSlug(normalized)) {
      setErrors({ slug: 'That link is reserved. Please choose another.' });
      return;
    }
    if (!isValidSlug(normalized)) {
      setErrors({ slug: 'Use only letters, numbers, and hyphens. 3–30 characters.' });
      return;
    }
    // If unchanged, just go back to preview
    if (normalized === slug) {
      setStep('preview');
      setErrors({});
      return;
    }
    if (slugAvailability !== 'available') {
      setSlugAvailability('checking');
      const res = await fetch('/api/check-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: normalized }),
      });
      const data = await res.json();
      setSlugAvailability(data.available ? 'available' : 'taken');
      if (!data.available) {
        setErrors({ slug: data.error || 'That link is already taken. Try another.' });
        return;
      }
    }
    setSlug(normalized);
    setStep('preview');
    setErrors({});

    trackEvent('slug_edited', {
      businessName: formData.businessName,
      previousSlug: slug,
      newSlug: normalized,
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullReviewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleConfirmAndCreate = async () => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          businessName: formData.businessName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          slug,
          phone: formData.phone.trim() || undefined,
          businessType: formData.businessType,
          customersPerMonth: formData.customersPerMonth,
          reviewAskingFrequency: formData.reviewAskingFrequency,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        trackEvent('slug_confirmed', {
          businessName: formData.businessName,
          slug,
        });
        trackEvent('beta_signup_completed', {
          name: formData.name,
          businessName: formData.businessName,
          businessType: formData.businessType,
          customersPerMonth: formData.customersPerMonth,
          reviewAskingFrequency: formData.reviewAskingFrequency,
          email: formData.email,
          slug,
        });
        if (typeof window !== 'undefined' && typeof (window as any).fbq === 'function') {
          (window as any).fbq('track', 'Lead', {
            content_name: 'Free Beta Signup',
            content_category: 'Beta Test',
            status: 'free_beta',
          });
        }
        await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });
        setStep('success');
      } else {
        setErrors({ submit: data.error || 'Failed to create account. Please try again.' });
      }
    } catch (error) {
      console.error('Error creating account:', error);
      setErrors({ submit: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const showForm = step === 'form';
  const showPreview = step === 'preview';
  const showEditing = step === 'editing';
  const showSuccess = step === 'success';

  const currentStep = showForm ? 1 : showPreview || showEditing ? 2 : 3;
  const totalSteps = 3;

  return (
    <>
      <Head>
        <title>Stop Bad Reviews Before They Go Public | ReviewFlo Free Beta</title>
        <meta name="description" content="Get 10x more 5-star Google reviews automatically. Free beta until April 2026. Built for plumbers, electricians, detailers & service businesses. No credit card required." />
        <meta name="robots" content="noindex, nofollow" />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=750284611209309&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </Head>
      <Script
        id="meta-pixel-qualify"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '750284611209309');
fbq('track', 'PageView');`,
        }}
      />

      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] via-white to-[#F5F5DC]">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <a href="/" className="flex items-center transition-opacity hover:opacity-80">
                <img
                  src="/images/reviewflo-logo.svg"
                  alt="ReviewFlo"
                  className="h-8 sm:h-10 w-auto"
                />
              </a>
              <div className="flex items-center gap-4">
                <a
                  href="/login"
                  className="hidden sm:inline-block text-sm sm:text-base text-gray-600 hover:text-[#4A3428] font-medium transition-colors"
                >
                  Business Login
                </a>
                <a
                  href="/"
                  className="text-sm sm:text-base text-gray-600 hover:text-[#4A3428] font-medium transition-colors"
                >
                  Back to Home
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10 border border-[#C9A961]/15">
            {/* Step Indicator */}
            <div className="mb-6 sm:mb-8">
              <p className="text-xs font-semibold tracking-[0.2em] text-[#4A3428] uppercase mb-3">
                ReviewFlo Beta Signup
              </p>
              <div className="flex items-center justify-between gap-4">
                {[1, 2, 3].map((stepNumber) => {
                  const isActive = stepNumber === currentStep;
                  const isCompleted = stepNumber < currentStep;
                  const labels = ['Create account', 'Confirm review link', 'You’re in'];
                  return (
                    <div key={stepNumber} className="flex-1 flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold ${
                          isActive
                            ? 'bg-[#4A3428] text-white border-[#4A3428]'
                            : isCompleted
                            ? 'bg-[#C9A961]/20 text-[#4A3428] border-[#C9A961]'
                            : 'bg-white text-gray-400 border-gray-300'
                        }`}
                      >
                        {stepNumber}
                      </div>
                      <div className="hidden sm:block">
                        <p
                          className={`text-xs font-medium ${
                            isActive ? 'text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                          }`}
                        >
                          {labels[stepNumber - 1]}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-gray-500">
                Step {currentStep} of {totalSteps}
              </p>
            </div>

            {/* Success: Account created */}
            {showSuccess && (
              <div className="text-center py-8 sm:py-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C9A961]/15 mb-4">
                  <CheckCircle className="w-8 h-8 text-[#C9A961]" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                  Your account is ready!
                </h1>
                <p className="text-base sm:text-lg text-gray-600 mb-6 max-w-md mx-auto">
                  You&apos;re signed in. Go to your dashboard to start collecting reviews.
                </p>
                <button
                  onClick={handleGoToDashboard}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#4A3428] text-white rounded-lg font-semibold text-base hover:bg-[#4A3428]/90 transition-all shadow-md hover:shadow-lg"
                >
                  Go to dashboard →
                </button>
                <p className="mt-4 text-xs text-gray-500">
                  Having trouble? Email{' '}
                  <a
                    href="mailto:jeremy@usereviewflo.com"
                    className="font-semibold text-[#4A3428] hover:text-[#C9A961] transition-colors"
                  >
                    jeremy@usereviewflo.com
                  </a>
                  .
                </p>
              </div>
            )}

            {/* Preview: Show link, Confirm or Edit */}
            {showPreview && !showSuccess && (
              <div className="text-center">
                <div className="mb-6 sm:mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Confirm your review link
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto">
                    This is the link you&apos;ll text or email to customers after each job so they can
                    leave you a review in a few taps.
                  </p>
                </div>
                <div className="bg-gray-50 border border-[#C9A961]/40 rounded-xl p-5 sm:p-6 mb-6 text-left">
                  <p className="text-xs font-medium text-gray-500 mb-2">Your customer review link</p>
                  <p className="text-base sm:text-xl font-mono font-semibold text-[#4A3428] break-all mb-4">
                    {displayHost}/{slug}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy link
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-3">Happy with this link?</p>
                <button
                  type="button"
                  onClick={handleConfirmAndCreate}
                  disabled={isSubmitting}
                  className="w-full px-8 py-3.5 bg-[#4A3428] text-white rounded-lg font-semibold text-base hover:bg-[#4A3428]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                >
                  {isSubmitting ? 'Creating your account...' : 'Confirm & create account'}
                </button>
                <button
                  type="button"
                  onClick={handleEditLink}
                  className="text-xs sm:text-sm text-gray-500 hover:text-[#4A3428] underline"
                >
                  Want to change it? Edit link
                </button>
                {errors.submit && (
                  <p className="mt-4 text-sm text-red-600">{errors.submit}</p>
                )}
              </div>
            )}

            {/* Editing: Custom slug input */}
            {showEditing && !showSuccess && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Edit your review link</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Use only letters, numbers, and hyphens. 3–30 characters.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) => {
                        setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                        setSlugAvailability('idle');
                        setErrors({ ...errors, slug: '' });
                      }}
                      placeholder="your-business-name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent font-mono text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckSlugAvailability}
                    disabled={slugAvailability === 'checking' || !customSlug}
                    className="px-5 py-3 bg-gray-100 rounded-lg font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 text-sm"
                  >
                    {slugAvailability === 'checking' ? 'Checking...' : 'Check'}
                  </button>
                </div>
                {slugAvailability === 'available' && (
                  <p className="text-green-600 font-medium mb-2">✓ Available</p>
                )}
                {slugAvailability === 'taken' && (
                  <p className="text-red-600 font-medium mb-2">Already taken, try another</p>
                )}
                {errors.slug && <p className="text-red-600 text-sm mb-4">{errors.slug}</p>}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSaveCustomSlug}
                    className="px-6 py-3 bg-[#4A3428] text-white rounded-lg font-semibold hover:bg-[#4A3428]/90 text-sm"
                  >
                    Save & Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('preview'); setErrors({}); }}
                    className="px-6 py-3 text-gray-600 hover:text-gray-900 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            {showForm && (
              <>
                {/* Hero Section */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                    Create your free ReviewFlo account
                  </h1>
                  <p className="text-xl sm:text-2xl text-gray-700 mb-6">
                    Stop bad reviews before they go public and get more 5-star Google reviews.
                  </p>

                  {/* Main CTA Box - FREE EMPHASIS */}
                  <div className="bg-gradient-to-br from-[#F5F5DC] to-[#C9A961]/10 border-2 border-[#C9A961]/60 rounded-2xl p-6 sm:p-8 mb-6 shadow-md">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-[#4A3428] tracking-[0.2em] uppercase mb-2">
                        Free beta access
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">
                        No credit card. No contracts.
                      </p>
                    </div>

                    <div className="bg-white/80 rounded-lg p-6 mb-6">
                      <p className="text-base sm:text-lg text-gray-800 mb-3 leading-relaxed">
                        Use ReviewFlo <strong>completely free</strong> while we test and fix bugs and get
                        feedback from business owners like you.
                      </p>
                      <p className="text-sm sm:text-base text-gray-700 mb-3">
                        <strong>Official launch:</strong> April 2026.
                      </p>
                      <p className="text-sm sm:text-base text-gray-700">
                        Beta testers get <strong>50% off the first 3 months</strong> when we launch.
                        <br />
                        <span className="text-xs sm:text-sm text-gray-600">
                          ($9.50 or $24.50/month vs $19-49/month)
                        </span>
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2 bg-[#4A3428] text-white px-6 py-3 rounded-lg font-semibold text-sm sm:text-base shadow-md">
                      <span>Join the free beta</span>
                      <span className="opacity-80">No credit card required</span>
                    </div>
                  </div>

                  {/* Subtext */}
                  <p className="text-base text-gray-600 mb-6">
                    The simple review management software small business owners asked for.
                  </p>
                </div>

                {/* Qualification Form */}
                <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* About you & your business */}
                <div className="pb-4 border-b border-gray-200">
                  <p className="text-sm font-semibold text-[#4A3428] uppercase tracking-wide mb-4">
                    About you & your business
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-base font-semibold text-gray-900 mb-2">
                        Your name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          setErrors({ ...errors, name: '' });
                        }}
                        onFocus={handleFormStart}
                        onBlur={(e) => {
                          setFormData({ ...formData, name: e.target.value.trim() });
                        }}
                        className={`w-full px-4 py-3 border ${
                          errors.name ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400`}
                        placeholder="e.g. Jenna Smith"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-gray-900 mb-2">
                        Business name *
                      </label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => {
                          setFormData({ ...formData, businessName: e.target.value });
                          setErrors({ ...errors, businessName: '' });
                        }}
                        onBlur={(e) => {
                          setFormData({ ...formData, businessName: e.target.value.trim() });
                        }}
                        className={`w-full px-4 py-3 border ${
                          errors.businessName ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400`}
                        placeholder="e.g. Smith's Barbershop"
                      />
                      {errors.businessName && (
                        <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-gray-900 mb-2">
                        Email address *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          setErrors({ ...errors, email: '' });
                        }}
                        className={`w-full px-4 py-3 border ${
                          errors.email ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400`}
                        placeholder="your@email.com"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-gray-900 mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({ ...formData, password: e.target.value });
                          setErrors({ ...errors, password: '', confirmPassword: '' });
                        }}
                        className={`w-full px-4 py-3 border ${
                          errors.password ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400`}
                        placeholder="At least 8 characters"
                      />
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-gray-900 mb-2">
                        Confirm password *
                      </label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => {
                          setFormData({ ...formData, confirmPassword: e.target.value });
                          setErrors({ ...errors, confirmPassword: '' });
                        }}
                        className={`w-full px-4 py-3 border ${
                          errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                        } rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400`}
                        placeholder="Same as above"
                      />
                      {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-base font-semibold text-gray-900 mb-2">
                        Phone <span className="font-normal text-gray-500">(optional)</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick questions */}
                <p className="text-sm font-semibold text-[#4A3428] uppercase tracking-wide mb-2">
                  Quick questions
                </p>

                {/* Question 1: Business Type */}
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-2">
                    1. What type of business do you run?
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => {
                      setFormData({ ...formData, businessType: e.target.value });
                      setErrors({ ...errors, businessType: '' });
                    }}
                    className={`w-full px-4 py-3 border ${
                      errors.businessType ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 bg-white`}
                  >
                    <option value="">Select your business type...</option>
                    <option value="barbershop">Barbershop / Hair Salon</option>
                    <option value="auto-repair">Auto Repair / Mobile Mechanic</option>
                    <option value="auto-detailing">Auto Detailing / Car Wash</option>
                    <option value="trades">Electrician / Plumber / HVAC</option>
                    <option value="other-service">Other Service Business</option>
                    <option value="not-service">I don't run a service business</option>
                  </select>
                  {errors.businessType && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessType}</p>
                  )}
                </div>

                {/* Question 2: Customer Volume */}
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-2">
                    2. How many customers do you serve per month?
                  </label>
                  <select
                    value={formData.customersPerMonth}
                    onChange={(e) => {
                      setFormData({ ...formData, customersPerMonth: e.target.value });
                      setErrors({ ...errors, customersPerMonth: '' });
                    }}
                    className={`w-full px-4 py-3 border ${
                      errors.customersPerMonth ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 bg-white`}
                  >
                    <option value="">Select customer volume...</option>
                    <option value="1-10">1-10</option>
                    <option value="11-25">11-25</option>
                    <option value="26-50">26-50</option>
                    <option value="51-100">51-100</option>
                    <option value="100+">100+</option>
                  </select>
                  {errors.customersPerMonth && (
                    <p className="mt-1 text-sm text-red-600">{errors.customersPerMonth}</p>
                  )}
                </div>

                {/* Question 3: Review Frequency */}
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-2">
                    3. How often do you currently ask customers for Google reviews?
                  </label>
                  <select
                    value={formData.reviewAskingFrequency}
                    onChange={(e) => {
                      setFormData({ ...formData, reviewAskingFrequency: e.target.value });
                      setErrors({ ...errors, reviewAskingFrequency: '' });
                    }}
                    className={`w-full px-4 py-3 border ${
                      errors.reviewAskingFrequency ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 bg-white`}
                  >
                    <option value="">Select frequency...</option>
                    <option value="every">Every customer (or nearly every)</option>
                    <option value="most">Most customers (75%+)</option>
                    <option value="half">About half my customers</option>
                    <option value="occasionally">Occasionally (25% or less)</option>
                    <option value="rarely">Rarely or never</option>
                  </select>
                  {errors.reviewAskingFrequency && (
                    <p className="mt-1 text-sm text-red-600">{errors.reviewAskingFrequency}</p>
                  )}
                </div>

                {/* Submit Error */}
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{errors.submit}</p>
                  </div>
                )}

                {/* Trust Signals - Reordered to emphasize FREE */}
                <div className="bg-[#F5F5DC]/50 border border-[#C9A961]/30 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-6 h-6 text-[#C9A961] mb-1" />
                      <p className="text-xs font-bold text-[#4A3428]">Free Until April 2026</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-5 h-5 text-[#C9A961] mb-1" />
                      <p className="text-xs font-semibold text-gray-700">No Credit Card Required</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-5 h-5 text-[#C9A961] mb-1" />
                      <p className="text-xs font-semibold text-gray-700">Cancel Anytime</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <CheckCircle className="w-5 h-5 text-[#C9A961] mb-1" />
                      <p className="text-xs font-semibold text-gray-700">Utah-Based</p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-8 py-4 bg-[#4A3428] text-white rounded-lg font-semibold text-lg hover:bg-[#4A3428]/90 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? 'Creating Your Free Account...' : 'Join Free Beta - No Credit Card'}
                </button>
              </form>

              {/* Pricing Section - Collapsible, AFTER form */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <details className="mb-6">
                  <summary className="cursor-pointer text-center text-base font-semibold text-[#4A3428] hover:text-[#C9A961] transition-colors py-2">
                    See pricing after beta ends (April 2026) ▼
                  </summary>

                  <div className="mt-6 bg-gradient-to-br from-[#F5F5DC] to-white border-2 border-[#C9A961]/30 rounded-xl p-6 sm:p-8">
                    <h3 className="text-center text-lg font-bold text-gray-900 mb-6">
                      After Beta Ends (April 2026):
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      {/* Basic Plan */}
                      <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
                        <div className="text-center mb-4">
                          <h4 className="text-2xl font-bold text-gray-900">BASIC</h4>
                          <p className="text-3xl font-bold text-[#4A3428] mt-2">$19<span className="text-lg font-normal text-gray-600">/month</span></p>
                        </div>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start">
                            <span className="text-[#C9A961] mr-2">✅</span>
                            <span>Review automation</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-[#C9A961] mr-2">✅</span>
                            <span>Negative interception</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-[#C9A961] mr-2">✅</span>
                            <span>Email notifications</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-[#C9A961] mr-2">✅</span>
                            <span>Templates</span>
                          </li>
                        </ul>
                      </div>

                      {/* Pro Plan */}
                      <div className="bg-white rounded-lg p-6 border-2 border-[#C9A961] relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-[#C9A961] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                          POPULAR
                        </div>
                        <div className="text-center mb-4">
                          <h4 className="text-2xl font-bold text-gray-900">PRO</h4>
                          <p className="text-3xl font-bold text-[#4A3428] mt-2">$49<span className="text-lg font-normal text-gray-600">/month</span></p>
                        </div>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start">
                            <span className="text-[#C9A961] mr-2">✅</span>
                            <span>Everything in Basic</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-[#C9A961] mr-2">✅</span>
                            <span>AI review drafts</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-[#C9A961] mr-2">✅</span>
                            <span>Reply management</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-[#C9A961] mr-2">✅</span>
                            <span>Priority support</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Podium Comparison */}
                    <div className="bg-white border-2 border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-center text-sm font-semibold text-gray-900">
                        vs. Podium: <span className="text-red-600">$289-449/month</span> + 12-month contract
                      </p>
                    </div>

                    {/* Beta Discount Reminder */}
                    <div className="bg-[#C9A961]/20 border border-[#C9A961] rounded-lg p-4 text-center">
                      <p className="font-bold text-gray-900">
                        Beta testers get <span className="text-[#4A3428]">50% off first 3 months</span>
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        ($9.50 or $24.50/mo instead of $19-49/mo)
                      </p>
                    </div>
                  </div>
                </details>
              </div>

              {/* Footer Note */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Questions?{' '}
                  <a
                    href="mailto:jeremy@usereviewflo.com"
                    className="text-[#4A3428] font-semibold hover:text-[#C9A961] transition-colors"
                  >
                    Email Jeremy
                  </a>
                </p>
              </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
