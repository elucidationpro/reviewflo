import Link from 'next/link'

export default function Custom404() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <Link href="/" className="absolute top-6 left-6 flex items-center transition-opacity hover:opacity-80">
        <img src="/images/reviewflo-logo.svg" alt="ReviewFlo" className="h-8 w-auto" />
      </Link>
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Error Code */}
          <h1 className="text-8xl font-bold text-gray-800 mb-4">404</h1>

          {/* Error Message */}
          <h2 className="text-2xl font-semibold text-gray-700 mb-3">
            Page Not Found
          </h2>

          <p className="text-gray-600 mb-8">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. The business or page may not exist.
          </p>

          {/* Icon */}
          <div className="mb-8">
            <svg
              className="w-24 h-24 mx-auto text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>

        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Powered by ReviewFlo
        </p>
      </div>
    </div>
  )
}
