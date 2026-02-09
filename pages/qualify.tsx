'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import Head from 'next/head';
import { trackEvent } from '@/lib/posthog-provider';

export default function QualifyPage() {
  const [formData, setFormData] = useState({
    businessType: '',
    customersPerMonth: '',
    reviewAskingFrequency: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | null;
    message: string;
  }>({ type: null, message: '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.businessType) {
      newErrors.businessType = 'Please select your business type';
    }
    if (!formData.customersPerMonth) {
      newErrors.customersPerMonth = 'Please select customer volume';
    }
    if (!formData.reviewAskingFrequency) {
      newErrors.reviewAskingFrequency = 'Please select review frequency';
    }
    if (!formData.email) {
      newErrors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit to API - everyone passes, we filter manually later
      const response = await fetch('/api/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        // EVENT 1: Track beta signup completion
        trackEvent('beta_signup_completed', {
          businessType: formData.businessType,
          customersPerMonth: formData.customersPerMonth,
          reviewAskingFrequency: formData.reviewAskingFrequency,
          email: formData.email,
        });

        setResult({
          type: 'success',
          message: "Perfect! Check your email for the next step. We just sent you a link to complete the survey."
        });
      } else {
        // Show the specific error message from the API
        const errorMessage = data.error || 'Failed to submit. Please try again.';
        setErrors({ submit: errorMessage });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Qualify for ReviewFlo Beta | ReviewFlo</title>
        <meta name="description" content="See if ReviewFlo is the right fit for your service business. Answer 4 quick questions to qualify for our beta program." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30">
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
              <a
                href="/"
                className="text-sm sm:text-base text-gray-600 hover:text-[#4A3428] font-medium transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
                Check If You Qualify
              </h1>
              <p className="text-lg text-gray-600">
                Answer 4 quick questions (2 minutes)
              </p>
            </div>

            {/* Show result if submitted */}
            {result.type ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-[#C9A961] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Perfect! 🎉
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Check your email for the next step. We just sent you a link to complete the survey.
                </p>
                <div className="bg-[#C9A961]/10 border border-[#C9A961]/30 rounded-lg p-4 text-sm text-gray-700">
                  <p className="font-semibold mb-1">What's next?</p>
                  <p>If you don't see it in 5 minutes, check spam or email jeremy@usereviewflo.com</p>
                </div>
              </div>
            ) : (
              /* Qualification Form */
              <form onSubmit={handleSubmit} className="space-y-6">
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

                {/* Question 4: Email */}
                <div>
                  <label className="block text-base font-semibold text-gray-900 mb-2">
                    4. Your email address
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
                  <p className="mt-1 text-sm text-gray-600">We'll send you the next step</p>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Submit Error */}
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{errors.submit}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-8 py-4 bg-[#4A3428] text-white rounded-lg font-semibold text-lg hover:bg-[#4A3428]/90 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? 'Submitting...' : 'Continue →'}
                </button>
              </form>
            )}

            {/* Footer Note */}
            {!result.type && (
              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}
