import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, apiError } from '@/lib/api-utils'
import {
  generateLocationSlug,
  isReservedSlug,
  isValidSlug,
  normalizeSlugForValidation,
} from '@/lib/slug-utils'

/**
 * POST — given a proposed business name (+ optional city), return a smart slug
 * and whether it's available. If taken, walk suffixes (-2, -3, …) until we find
 * one that isn't, and return that as the suggestion.
 * Body: { businessName: string, city?: string, slug?: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError(res, 401, 'Unauthorized')
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return apiError(res, 401, 'Unauthorized')
    }

    const raw = req.body
    const body: { businessName?: string; city?: string; slug?: string } =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : ''
    const city = typeof body.city === 'string' ? body.city.trim() : ''
    const explicit = typeof body.slug === 'string' ? body.slug.trim() : ''

    const proposed = explicit
      ? normalizeSlugForValidation(explicit)
      : generateLocationSlug(businessName, city)

    console.log('[check-slug] input:', { businessName, city, explicit, proposed })

    if (!proposed || proposed.length < 3) {
      return apiError(res, 400, 'Please enter a business name.')
    }
    if (isReservedSlug(proposed) || !isValidSlug(proposed)) {
      return res.status(200).json({ proposed, available: false, suggestion: null, reserved: true })
    }

    const { data: taken, error: takenErr } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('slug', proposed)
      .maybeSingle()

    if (takenErr) {
      console.error('[check-slug] taken lookup failed:', takenErr.message, takenErr.code)
      return apiError(res, 500, `Database error: ${takenErr.message}`)
    }

    if (!taken) {
      return res.status(200).json({ proposed, available: true, suggestion: proposed })
    }

    // Walk suffixes until we find one that's free. Cap at 30 chars.
    let suggestion: string | null = null
    for (let i = 2; i <= 20; i++) {
      const suffix = `-${i}`
      const base = proposed.substring(0, 30 - suffix.length).replace(/-+$/g, '')
      const candidate = `${base}${suffix}`
      if (!isValidSlug(candidate) || isReservedSlug(candidate)) continue
      const { data: hit, error: hitErr } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle()
      if (hitErr) {
        console.error('[check-slug] suffix lookup failed:', hitErr.message, hitErr.code)
        continue
      }
      if (!hit) {
        suggestion = candidate
        break
      }
    }

    return res.status(200).json({ proposed, available: false, suggestion })
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
    console.error('[check-slug] unexpected:', msg)
    return apiError(res, 500, `Unexpected: ${e instanceof Error ? e.message : 'unknown'}`)
  }
}
