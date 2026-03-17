import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { checkIsAdmin } from '../lib/adminAuth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check for success message from signup
    if (router.query.signup === 'success') {
      setSuccessMessage('Account created successfully! Please log in with your credentials.')
    }
  }, [router.query])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        // Network errors often show as "Load failed" or "Failed to fetch"
        const msg = authError.message
        const isNetworkError = /load failed|failed to fetch|network/i.test(msg)
        setError(isNetworkError ? 'Connection failed. Please check your internet and try again.' : msg)
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Check if user is admin
        const adminUser = await checkIsAdmin()

        if (adminUser) {
          // Admin users go to admin dashboard
          const redirectPath = router.query.redirect as string || '/admin'
          router.push(redirectPath)
        } else {
          // Regular users go to business dashboard
          const redirectPath = router.query.redirect as string || '/dashboard'
          router.push(redirectPath)
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      const msg = err instanceof Error ? err.message : ''
      const isNetworkError = /load failed|failed to fetch|network/i.test(msg)
      setError(isNetworkError ? 'Connection failed. Please check your internet and try again.' : 'An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Log In to ReviewFlo - Review Management Dashboard</title>
        <meta name="description" content="Sign in to your ReviewFlo account to manage customer reviews and feedback." />
        <meta property="og:title" content="Log In to ReviewFlo" />
        <meta property="og:description" content="Sign in to your ReviewFlo account to manage customer reviews and feedback." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-block">
              <img
                src="/images/reviewflo-logo.svg"
                alt="ReviewFlo"
                className="h-10 sm:h-12 w-auto mx-auto"
              />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
            <h1 className="text-xl font-bold text-gray-900 text-center mb-1">Sign in</h1>
            <p className="text-gray-500 text-sm text-center mb-6">
              Welcome back to your dashboard
            </p>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-green-800 text-sm">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400 text-sm"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <Link href="/reset-password" className="text-xs text-[#4A3428] hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400 text-sm"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <p className="mt-5 text-sm text-gray-500 text-center">
              Don&apos;t have an account?{' '}
              <Link href="/join" className="font-medium text-[#4A3428] hover:underline underline-offset-2">
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
