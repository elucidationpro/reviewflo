import React from 'react'
import { ImageResponse } from '@vercel/og'

// Next.js requires a plain, statically-parseable config object here
export const config = {
  runtime: 'edge',
}

export default function handler() {
  const width = 1200
  const height = 630

  const Star = ({ filled }: { filled: boolean }) => (
    <svg
      width="44"
      height="44"
      viewBox="0 0 24 24"
      fill={filled ? '#D4AF37' : 'none'}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M12 2.5l2.939 6.174 6.761.582-5.13 4.447 1.54 6.61L12 16.98 5.89 20.313l1.54-6.61-5.13-4.447 6.761-.582L12 2.5z"
        stroke="#D4AF37"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#F5EFE7',
        }}
      >
        {/* Neutral, non-branded feedback card */}
        <div
          style={{
            padding: '48px 72px',
            borderRadius: 32,
            background: '#FFFFFF',
            boxShadow:
              '0 24px 80px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(148, 163, 184, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: 800,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 32,
            }}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  border: '2px solid rgba(212, 175, 55, 0.45)',
                  background: '#FFFBF0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Star filled={false} />
              </div>
            ))}
          </div>

          <h1
            style={{
              fontSize: 52,
              lineHeight: 1.1,
              textAlign: 'center',
              margin: 0,
              marginBottom: 16,
              color: '#111827',
              letterSpacing: '-0.04em',
            }}
          >
            How would you rate your experience?
          </h1>

          <p
            style={{
              fontSize: 24,
              lineHeight: 1.4,
              textAlign: 'center',
              margin: 0,
              marginBottom: 8,
              color: '#4B5563',
              maxWidth: 640,
            }}
          >
            Tap a star to rate. Your feedback helps this business improve.
          </p>

          <p
            style={{
              fontSize: 20,
              lineHeight: 1.4,
              textAlign: 'center',
              margin: 0,
              marginTop: 20,
              color: '#6B7280',
            }}
          >
            Thank you for taking a moment to share your thoughts.
          </p>
        </div>
      </div>
    ),
    {
      width,
      height,
    }
  )
}

