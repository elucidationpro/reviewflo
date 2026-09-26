import { supabase } from './supabase'
import { isAdminUser, isAdminEmail } from './admin-policy'
export { isAdminUser, isAdminEmail }

/** Always resolve authorization on the server; user_metadata is user-editable. */
export async function checkIsAdmin() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const res = await fetch('/api/admin/check-admin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Unable to verify account access. Please try signing in again.')
  const { isAdmin } = await res.json()
  return isAdmin === true ? session.user : null
}
