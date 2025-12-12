'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, CheckCircle, Clock, Users, Shield, Zap } from 'lucide-react';

// Hook for fade-in on scroll
function useFadeInOnScroll() {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return { ref, isVisible };
}

export default function LandingPage() {
  const problemSection = useFadeInOnScroll();
  const howItWorksSection = useFadeInOnScroll();
  const betaSection = useFadeInOnScroll();
  const featuresSection = useFadeInOnScroll();
  const founderSection = useFadeInOnScroll();
  const waitlistSection = useFadeInOnScroll();

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.8s ease-out 0.2s both;
        }
      `}</style>
      <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50 animate-fadeIn">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center animate-slideUp">
            {/* Beta Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              Launching in 6 weeks • Limited beta spots available
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Stop Losing Customers to{' '}
              <span className="text-blue-600">Bad Reviews</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
              ReviewFlo catches unhappy customers before they leave 1-star reviews—and makes it easy for happy customers to review you.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <a
                href="#beta-signup"
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-2xl hover:scale-105 transform"
              >
                Join Beta Testing - Free for Life
              </a>
              <a
                href="#waitlist-signup"
                className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 rounded-lg font-semibold text-lg border-2 border-gray-300 hover:border-gray-400 transition-all duration-200 hover:shadow-md hover:scale-105 transform"
              >
                Join Waitlist
              </a>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Beta testers get lifetime free access
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                5-minute setup
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                No credit card needed
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Urgency Banner */}
      <section className="bg-blue-600 text-white py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-lg font-semibold">
            🚀 Beta Program Now Open • Limited Spots Available
          </p>
        </div>
      </section>

      {/* The Problem Section */}
      <section
        ref={problemSection.ref}
        className={`py-16 sm:py-24 bg-gray-50 transition-all duration-700 ${
          problemSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 text-center">
            You know the feeling...
          </h2>
          <div className="prose prose-lg mx-auto text-gray-600">
            <p className="text-xl leading-relaxed">
              You wake up, check your phone, and there's a new 1-star review on Google. Your stomach drops.
            </p>
            <p className="text-xl leading-relaxed">
              <em>"Why didn't they just tell me? I could have fixed it!"</em>
            </p>
            <p className="text-xl leading-relaxed">
              Now that review is public. Forever. Scaring away customers who would have loved your work.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        ref={howItWorksSection.ref}
        className={`py-16 sm:py-24 transition-all duration-700 ${
          howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            How ReviewFlo Works
          </h2>
          <p className="text-xl text-gray-600 mb-16 text-center max-w-3xl mx-auto">
            Three simple steps to turn review anxiety into review success
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Send Review Requests
              </h3>
              <p className="text-gray-600">
                After every job, customers get a simple text with a link to rate their experience. Quick and easy for them.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Intercept Problems Early
              </h3>
              <p className="text-gray-600">
                Unhappy customers (1-4 stars) are privately asked what went wrong—before they can leave a public review.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Amplify Your Champions
              </h3>
              <p className="text-gray-600">
                Happy customers (5 stars) get a personalized template making it easy to leave glowing reviews on Google.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-600 italic">
              Currently in private beta. Join 20 businesses testing ReviewFlo before public launch.
            </p>
          </div>
        </div>
      </section>

      {/* Beta Program Section */}
      <section
        id="beta-signup"
        ref={betaSection.ref}
        className={`py-16 sm:py-24 bg-gradient-to-br from-blue-600 to-blue-700 text-white transition-all duration-700 ${
          betaSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Be a Founding Member
            </h2>
            <p className="text-xl text-blue-100">
              Join our beta program and help shape ReviewFlo
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900">Lifetime free access</div>
                  <div className="text-gray-600 text-sm">Never pay a subscription fee</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900">Direct line to founder</div>
                  <div className="text-gray-600 text-sm">Text or email me directly</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900">Shape the product</div>
                  <div className="text-gray-600 text-sm">Your feedback drives development</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900">Early access</div>
                  <div className="text-gray-600 text-sm">First to see new features</div>
                </div>
              </div>
            </div>

            {/* Beta Signup Form */}
            <BetaSignupForm />

            <p className="text-center text-gray-600 text-sm mt-6">
              Not ready to beta test?{' '}
              <a href="#waitlist-signup" className="text-blue-600 font-semibold hover:underline">
                Join the waitlist instead →
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        ref={featuresSection.ref}
        className={`py-16 sm:py-24 transition-all duration-700 ${
          featuresSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            Everything You Need to Manage Your Reputation
          </h2>
          <p className="text-xl text-gray-600 mb-16 text-center max-w-3xl mx-auto">
            All features included in beta program
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Catch Problems Before They Go Public
                </h3>
                <p className="text-gray-600">
                  Route 1-4 star ratings to private feedback where you can make it right
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Make 5-Star Reviews Effortless
                </h3>
                <p className="text-gray-600">
                  Pre-written templates your happy customers can post with one tap
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Track What's Working
                </h3>
                <p className="text-gray-600">
                  Dashboard shows response rates, feedback trends, and sentiment over time
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Set It and Forget It
                </h3>
                <p className="text-gray-600">
                  Automated emails after every job. You focus on your work, ReviewFlo handles the rest
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Story Section */}
      <section
        ref={founderSection.ref}
        className={`py-16 sm:py-24 bg-gray-50 transition-all duration-700 ${
          founderSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                  J
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Hi, I'm Jeremy 👋
                </h2>
                <div className="prose prose-lg text-gray-600">
                  <p>
                    I built ReviewFlo because I own a mobile detailing business and got tired of customers leaving bad reviews without giving me a chance to fix the problem first.
                  </p>
                  <p>
                    I thought: <em>what if unhappy customers could tell me privately what went wrong before leaving a public review?</em>
                  </p>
                  <p>
                    That's ReviewFlo. I'm building it for business owners like us.
                  </p>
                  <p className="font-semibold text-gray-900">
                    Want to help me make it better? Join the beta program.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section
        id="waitlist-signup"
        ref={waitlistSection.ref}
        className={`py-16 sm:py-24 bg-gray-900 text-white transition-all duration-700 ${
          waitlistSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Can't Join Beta? Join the Waitlist
            </h2>
            <p className="text-xl text-gray-300">
              Be first to access ReviewFlo when we launch in 6 weeks
            </p>
          </div>

          <div className="bg-gray-800 rounded-xl p-8 shadow-2xl">
            <WaitlistSignupForm />
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8">
            Ready to Stop Worrying About Bad Reviews?
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a
              href="#beta-signup"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-2xl hover:scale-105 transform"
            >
              Join Beta Testing - Limited Spots
            </a>
            <a
              href="#waitlist-signup"
              className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 rounded-lg font-semibold text-lg border-2 border-gray-300 hover:border-gray-400 transition-all duration-200 hover:shadow-md hover:scale-105 transform"
            >
              Join Waitlist - Launch in 6 Weeks
            </a>
          </div>

          <div className="text-gray-600">
            <p className="mb-2">Questions? I'd love to hear from you.</p>
            <p>
              <strong>Text me:</strong> (385) 522-5040 |{' '}
              <strong>Email:</strong>{' '}
              <a href="mailto:jeremy@usereviewflo.com" className="text-blue-600 hover:underline">
                jeremy@usereviewflo.com
              </a>
            </p>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}

// Beta Signup Form Component
function BetaSignupForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessType: '',
    businessName: '',
    challenge: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API endpoint
      const response = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">You're In! 🎉</h3>
        <p className="text-gray-600 mb-4">
          Welcome to ReviewFlo beta. I'll text you within 24 hours to get you set up.
        </p>
        <p className="text-gray-600">
          Check your email for next steps.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            placeholder="John Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            placeholder="john@example.com"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            placeholder="(555) 123-4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Type *
          </label>
          <select
            required
            value={formData.businessType}
            onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          >
            <option value="">Select type...</option>
            <option value="barber">Barber / Hair Salon</option>
            <option value="mechanic">Mobile Mechanic</option>
            <option value="detailing">Auto Detailing</option>
            <option value="electrician">Electrician</option>
            <option value="plumber">Plumber</option>
            <option value="hvac">HVAC</option>
            <option value="cleaning">Cleaning Service</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Name *
        </label>
        <input
          type="text"
          required
          value={formData.businessName}
          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          placeholder="Smith's Mobile Detailing"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tell me about your biggest review challenge (optional)
        </label>
        <textarea
          value={formData.challenge}
          onChange={(e) => setFormData({ ...formData, challenge: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          placeholder="e.g., Customers leave bad reviews without telling me what went wrong..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSubmitting ? 'Submitting...' : 'Join Beta Testing'}
      </button>
    </form>
  );
}

// Waitlist Signup Form Component
function WaitlistSignupForm() {
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API endpoint
      const response = await fetch('/api/waitlist-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, businessType })
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
        <p className="text-gray-300 mb-4">
          You're one of {148} businesses waiting for ReviewFlo.
        </p>
        <p className="text-gray-300">
          We'll email you when we launch in 6 weeks.
        </p>
        <a href="#beta-signup" className="inline-block mt-6 text-blue-400 hover:underline font-semibold">
          Changed your mind? Join beta instead →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Business Type (optional)
        </label>
        <select
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          className="w-full px-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select type...</option>
          <option value="barber">Barber / Hair Salon</option>
          <option value="mechanic">Mobile Mechanic</option>
          <option value="detailing">Auto Detailing</option>
          <option value="electrician">Electrician</option>
          <option value="plumber">Plumber</option>
          <option value="hvac">HVAC</option>
          <option value="cleaning">Cleaning Service</option>
          <option value="other">Other</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSubmitting ? 'Joining...' : 'Join Waitlist'}
      </button>

      <p className="text-center text-gray-400 text-sm">
        Want beta access instead?{' '}
        <a href="#beta-signup" className="text-blue-400 hover:underline font-semibold">
          Join beta program →
        </a>
      </p>
    </form>
  );
}
