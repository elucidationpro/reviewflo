import dotenv from 'dotenv'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local (Next.js convention — not loaded by dotenv/config default)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function slugFromEmail(email: string): string {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
}

const USERS: Array<{ email: string; slug?: string }> = [
  { email: 'blazquezracing@gmail.com', slug: 'blazquez-racing' },
  { email: 'iromachristain@gmail.com' },
  { email: 'seyaw36334@bigonla.com' },
]

async function resolveSlug(preferred: string): Promise<string> {
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', preferred)
    .single()
  if (!data) return preferred
  const fallback = `${preferred}-${Math.floor(Math.random() * 9000) + 1000}`
  console.log(`  slug "${preferred}" taken → using "${fallback}"`)
  return fallback
}

async function recoverUser(email: string, overrideSlug?: string) {
  console.log(`\n── ${email}`)

  // 1. Look up auth user
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`)

  const authUser = users.find(u => u.email === email)
  if (!authUser) {
    console.log('  SKIP — not found in auth.users')
    return
  }

  const userId = authUser.id
  const meta = authUser.user_metadata || {}
  const businessName: string = meta.business_name || email.split('@')[0]
  const preferredSlug = overrideSlug || meta.slug || slugFromEmail(email)

  console.log(`  auth user: ${userId}`)
  console.log(`  business_name: "${businessName}", preferred slug: "${preferredSlug}"`)

  // 2. Skip if business already exists
  const { data: existing } = await supabase
    .from('businesses')
    .select('id, slug')
    .eq('user_id', userId)
    .single()

  if (existing) {
    console.log(`  SKIP — business already exists (id: ${existing.id}, slug: ${existing.slug})`)
    return
  }

  // 3. Resolve slug (avoid collisions)
  const slug = await resolveSlug(preferredSlug)

  // 4. Insert business
  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .insert({
      user_id: userId,
      business_name: businessName,
      owner_email: email,
      slug,
      primary_color: '#3B82F6',
      logo_url: null,
      skip_template_choice: true,
      google_review_url: null,
      facebook_review_url: null,
      yelp_review_url: null,
      nextdoor_review_url: null,
      terms_accepted_at: new Date().toISOString(),
      tier: 'free',
    })
    .select()
    .single()

  if (bizErr || !business) {
    console.error(`  ERROR inserting business:`, bizErr)
    return
  }

  console.log(`  ✓ business created — id: ${business.id}, slug: "${slug}"`)

  // 5. Insert 3 default templates
  const { error: tmplErr } = await supabase.from('review_templates').insert([
    {
      business_id: business.id,
      platform: 'google',
      template_text: `I had an excellent experience with ${businessName}! They exceeded my expectations. Highly recommend!`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      business_id: business.id,
      platform: 'facebook',
      template_text: `Just had a great experience with ${businessName}! Professional service and fantastic results. 5 stars! ⭐⭐⭐⭐⭐`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      business_id: business.id,
      platform: 'yelp',
      template_text: `5 stars for ${businessName}! Quality work, professional service, and fair pricing. Will definitely use again.`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ])

  if (tmplErr) {
    console.error(`  WARNING — templates insert failed:`, tmplErr)
  } else {
    console.log(`  ✓ 3 default templates created`)
  }
}

async function confirm() {
  console.log('\n── Confirmation query ──')
  const emails = USERS.map(u => u.email)
  const { data, error } = await supabase
    .from('businesses')
    .select('owner_email, business_name, slug, tier, created_at')
    .in('owner_email', emails)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Confirmation query failed:', error)
    return
  }

  for (const email of emails) {
    const row = data?.find(r => r.owner_email === email)
    if (row) {
      console.log(`  ✓ ${email} → "${row.business_name}" (/${row.slug}, tier=${row.tier})`)
    } else {
      console.log(`  ✗ ${email} → NOT FOUND in businesses`)
    }
  }
}

async function main() {
  console.log('recover-missing-businesses — starting\n')

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  for (const { email, slug } of USERS) {
    await recoverUser(email, slug)
  }

  await confirm()
  console.log('\nDone.')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
