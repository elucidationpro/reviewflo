import { ImageResponse } from '@vercel/og'

export const config = {
  runtime: 'edge',
}

export default function handler() {
  const width = 1200
  const height = 630

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
            {[1, 2, 3, 4, 5].map((star) => (
              <div
                key={star}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: '2px solid #D4AF37',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D4AF37',
                  fontSize: 26,
                }}
              >
                ★
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
            Share Your Feedback
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
            How was your recent experience? Your feedback helps this business
            improve.
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
            Tap to rate your visit and leave a private or public review.
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

