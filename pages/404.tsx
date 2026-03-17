import Link from 'next/link'
import Head from 'next/head'
import { ArrowRight, Home, Search } from 'lucide-react'

export default function Custom404() {
  return (
    <>
      <Head>
        <title>Page Not Found | ReviewFlo</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#E8DCC8]/20 via-white to-[#E8DCC8]/20">
        {/* Top nav bar */}
        <header className="w-full px-6 py-4 flex items-center">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <img src="/images/reviewflo-logo.svg" alt="ReviewFlo" className="h-8 w-auto" />
          </Link>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
          <div className="max-w-md w-full text-center">
            {/* Large 404 */}
            <p className="text-[120px] sm:text-[160px] font-bold leading-none text-[#E8DCC8] select-none mb-2">
              404
            </p>

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 px-8 py-8 -mt-6 relative z-10">
              <div className="w-12 h-12 bg-[#E8DCC8] rounded-xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-[#4A3428]" />
              </div>

              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Page not found
              </h1>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                The page you&apos;re looking for doesn&apos;t exist or may have moved.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#4A3428] text-white font-semibold rounded-lg hover:bg-[#4A3428]/90 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Link>
                <Link
                  href="/join"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[#4A3428] font-semibold rounded-lg border-2 border-[#C9A961] hover:border-[#4A3428] hover:bg-[#E8DCC8]/20 transition-all duration-200 text-sm"
                >
                  Start Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-6">
              © {new Date().getFullYear()} ReviewFlo · <Link href="/privacy-policy" className="hover:underline">Privacy</Link> · <Link href="/terms" className="hover:underline">Terms</Link>
            </p>
          </div>
        </main>
      </div>
    </>
  )
}
