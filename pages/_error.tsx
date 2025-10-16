import { NextPageContext } from 'next'
import Link from 'next/link'

interface ErrorProps {
  statusCode?: number
}

function Error({ statusCode }: ErrorProps) {
  const errorMessage = statusCode === 404
    ? 'Page Not Found'
    : statusCode === 500
    ? 'Internal Server Error'
    : 'An Error Occurred'

  const errorDescription = statusCode === 404
    ? "Sorry, we couldn't find the page you're looking for."
    : statusCode === 500
    ? 'Something went wrong on our end. Please try again later.'
    : 'An unexpected error has occurred. Please try again.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Error Code */}
          <h1 className="text-8xl font-bold text-gray-800 mb-4">
            {statusCode || 'Error'}
          </h1>

          {/* Error Message */}
          <h2 className="text-2xl font-semibold text-gray-700 mb-3">
            {errorMessage}
          </h2>

          <p className="text-gray-600 mb-8">
            {errorDescription}
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
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200"
            >
              Go Back Home
            </Link>

            <button
              onClick={() => window.location.reload()}
              className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Powered by ReviewFlow
        </p>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
