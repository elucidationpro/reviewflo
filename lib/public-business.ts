import { createClient } from '@supabase/supabase-js'
import { publicBusinessFields } from './public-business-fields'

/** Only call in API routes/getServerSideProps. Public access never reads the base table directly. */
export async function getPublicBusiness(slug: string) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await db.from('businesses').select('*').eq('slug', slug).maybeSingle()
  if (error || !data) return null
  if (data.parent_business_id) {
    const { data: parent } = await db.from('businesses').select('tier').eq('id', data.parent_business_id).maybeSingle()
    if (parent) data.tier = parent.tier
  }
  return publicBusinessFields(data)
}
