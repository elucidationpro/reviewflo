import type { NextApiRequest, NextApiResponse } from 'next'

// 1x1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// Open tracking is not used — we only track click-through and platform selection.
// This endpoint is kept to avoid 404s from any previously sent emails that may
// still have the pixel URL in them.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Content-Type', 'image/gif')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.status(200).send(TRANSPARENT_GIF)
}
