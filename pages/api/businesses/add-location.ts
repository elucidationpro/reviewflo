import type { NextApiRequest, NextApiResponse } from 'next'
import { isValidSlug, isReservedSlug, normalizeSlugForValidation } from '@/lib/slug-utils'
import { getMaxBusinessLocations, canUseMultipleLocations } from '@/lib/tier-permissions'
import { pickPrimaryBusinessRow, type BusinessRowWithParent } from '@/lib/business-account'
import { supabaseAdmin, parseTier, apiError } from '@/lib/api-utils'

type BusinessRow = Record<string, unknown> & BusinessRowWithParent

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * POST — create an additional location (child row) for Pro/AI accounts under the location cap.
 * Body: { businessName: string, slug: string }
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

    const body = req.body as { businessName?: string; slug?: string }
    const businessNameTrim = typeof body.businessName === 'string' ? body.businessName.trim() : ''
    const slugRaw = typeof body.slug === 'string' ? body.slug.trim() : ''

    if (!businessNameTrim || !slugRaw) {
      return apiError(res, 400, 'Business name and link slug are required')
    }

    const normalizedSlug = normalizeSlugForValidation(slugRaw)
    if (isReservedSlug(normalizedSlug)) {
      return apiError(res, 400, 'That link is reserved. Please choose another.')
    }
    if (!isValidSlug(normalizedSlug)) {
      return apiError(res, 400, 'Invalid link. Use only letters, numbers, and hyphens (3–30 characters).')
    }

    const { data: existingSlug } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('slug', normalizedSlug)
      .maybeSingle()

    if (existingSlug) {
      return apiError(res, 400, 'That link is already taken. Please choose another.')
    }

    let rows: BusinessRow[] = []
    const { data: byUser, error: listErr } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('user_id', user.id)

    if (listErr) {
      if (/parent_business_id|column|does not exist/i.test(String(listErr.message || ''))) {
        return apiError(res, 503, 'Multi-location requires a database update. Please try again later or contact support.')
      }
      console.error('[add-location] list businesses:', listErr.message)
      return apiError(res, 500, 'Could not load your account')
    }

    rows = (byUser || []) as BusinessRow[]
    if (!rows.length) {
      return apiError(res, 400, 'No business found for this account')
    }

    const primary = pickPrimaryBusinessRow(rows)
    if (!primary?.id) {
      return apiError(res, 400, 'Could not determine your primary business')
    }

    const { data: rootRow, error: rootErr } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', primary.id)
      .single()

    if (rootErr || !rootRow) {
      console.error('[add-location] root fetch:', rootErr?.message)
      return apiError(res, 500, 'Could not load primary business')
    }

    const root = rootRow as Record<string, unknown>
    const tier = parseTier(root.tier)

    if (!canUseMultipleLocations(tier)) {
      return apiError(res, 403, 'Upgrade to Pro or AI to add more locations.')
    }

    const maxLocations = getMaxBusinessLocations(tier)
    if (rows.length >= maxLocations) {
      return apiError(
        res,
        400,
        tier === 'ai'
          ? `You have reached the maximum of ${maxLocations} locations for your plan.`
          : `You have reached the maximum of ${maxLocations} locations on Pro (primary + ${maxLocations - 1} extra). Upgrade to AI for more.`
      )
    }

    const rootName = String(root.business_name || '')
    const now = new Date().toISOString()

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      parent_business_id: primary.id,
      business_name: businessNameTrim,
      owner_email: root.owner_email ?? user.email?.trim().toLowerCase() ?? null,
      slug: normalizedSlug,
      primary_color: root.primary_color ?? '#3B82F6',
      logo_url: null,
      skip_template_choice: root.skip_template_choice ?? true,
      google_review_url: null,
      facebook_review_url: null,
      yelp_review_url: null,
      nextdoor_review_url: null,
      tier: root.tier ?? 'free',
      interested_in_tier: root.interested_in_tier ?? null,
      notify_on_launch: root.notify_on_launch ?? false,
      launch_discount_eligible: root.launch_discount_eligible ?? true,
      launch_discount_claimed: root.launch_discount_claimed ?? false,
      terms_accepted_at: root.terms_accepted_at ?? now,
      show_reviewflo_branding: root.show_reviewflo_branding ?? true,
      show_business_name: root.show_business_name ?? true,
      google_place_id: null,
      sms_enabled: false,
      twilio_phone_number: null,
      white_label_enabled: root.white_label_enabled ?? false,
      custom_logo_url: null,
      custom_brand_name: null,
      custom_brand_color: null,
      square_access_token: null,
      square_refresh_token: null,
      square_merchant_id: null,
      jobber_api_key: null,
      housecall_pro_api_key: null,
    }

    const { data: created, error: insertErr } = await supabaseAdmin
      .from('businesses')
      .insert(insertPayload)
      .select()
      .single()

    if (insertErr || !created) {
      console.error('[add-location] insert:', insertErr?.message, insertErr)
      if (/parent_business_id|column|does not exist/i.test(String(insertErr?.message || ''))) {
        return apiError(res, 503, 'Multi-location requires a database update. Please try again later or contact support.')
      }
      if (String(insertErr?.code) === '23505' || /unique|duplicate/i.test(String(insertErr?.message))) {
        return apiError(res, 400, 'That link is already taken. Please choose another.')
      }
      return apiError(res, 500, 'Failed to create location')
    }

    const { data: rootTemplates } = await supabaseAdmin
      .from('review_templates')
      .select('platform, template_text')
      .eq('business_id', primary.id)

    const namePattern = rootName.length > 0 ? new RegExp(escapeRegExp(rootName), 'g') : null

    if (rootTemplates?.length) {
      const inserts = rootTemplates.map((t) => ({
        business_id: created.id,
        platform: t.platform,
        template_text: namePattern
          ? String(t.template_text).replace(namePattern, businessNameTrim)
          : t.template_text,
        created_at: now,
        updated_at: now,
      }))
      const { error: tplErr } = await supabaseAdmin.from('review_templates').insert(inserts)
      if (tplErr) {
        console.error('[add-location] template copy failed:', tplErr.message)
        await supabaseAdmin.from('businesses').delete().eq('id', created.id)
        return apiError(res, 500, 'Failed to copy templates for the new location')
      }
    } else {
      const templatesToCreate = [
        {
          business_id: created.id,
          platform: 'google',
          template_text: `I had an excellent experience with ${businessNameTrim}! They exceeded my expectations. Highly recommend!`,
          created_at: now,
          updated_at: now,
        },
        {
          business_id: created.id,
          platform: 'facebook',
          template_text: `Just had a great experience with ${businessNameTrim}! Professional service and fantastic results. 5 stars! ⭐⭐⭐⭐⭐`,
          created_at: now,
          updated_at: now,
        },
        {
          business_id: created.id,
          platform: 'yelp',
          template_text: `5 stars for ${businessNameTrim}! Quality work, professional service, and fair pricing. Will definitely use again.`,
          created_at: now,
          updated_at: now,
        },
      ]
      const { error: tplErr } = await supabaseAdmin.from('review_templates').insert(templatesToCreate)
      if (tplErr) {
        console.error('[add-location] default templates:', tplErr.message)
        await supabaseAdmin.from('businesses').delete().eq('id', created.id)
        return apiError(res, 500, 'Failed to create default templates')
      }
    }

    return res.status(200).json({
      location: {
        id: created.id,
        business_name: created.business_name,
        slug: created.slug,
      },
    })
  } catch (e) {
    console.error('[add-location] unexpected:', e)
    return apiError(res, 500, 'Internal server error')
  }
}
