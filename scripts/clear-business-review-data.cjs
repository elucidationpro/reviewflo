/**
 * One-off: delete reviews, feedback, and review_requests for a business by slug.
 * Usage: node scripts/clear-business-review-data.cjs obsidian-auto
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })
const { createClient } = require('@supabase/supabase-js')

const slug = process.argv[2] || 'obsidian-auto'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: biz, error: bErr } = await supabase.from('businesses').select('id, business_name').eq('slug', slug).maybeSingle()
  if (bErr || !biz) {
    console.error('Business not found:', slug, bErr?.message)
    process.exit(1)
  }
  const id = biz.id
  const { error: e1 } = await supabase.from('review_requests').delete().eq('business_id', id)
  if (e1) throw e1
  const { error: e2 } = await supabase.from('reviews').delete().eq('business_id', id)
  if (e2) throw e2
  const { error: e3 } = await supabase.from('feedback').delete().eq('business_id', id)
  if (e3) throw e3
  console.log('Cleared review_requests, reviews, feedback for', biz.business_name, '(' + slug + ')')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
