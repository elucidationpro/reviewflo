import type { NextApiRequest, NextApiResponse } from 'next'
import { getPublicBusiness } from '@/lib/public-business'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (typeof req.query.slug !== 'string' || req.query.slug.length > 100) return res.status(400).json({ error: 'Invalid slug' })
  const business = await getPublicBusiness(req.query.slug)
  if (!business) return res.status(404).json({ error: 'Business not found' })
  return res.status(200).json({ business })
}
