import { supabase } from './supabase'

const ADMIN_EMAIL = 'jeremy.elucidation@gmail.com'

/**
 * Check if the current logged-in user is an admin
 * Returns the user if admin, null otherwise
 */
export async function checkIsAdmin() {
  console.log('[adminAuth] checkIsAdmin called')
  try {
    console.log('[adminAuth] Calling supabase.auth.getUser()')
    const { data: { user } } = await supabase.auth.getUser()
    console.log('[adminAuth] User result:', user)
    console.log('[adminAuth] User email:', user?.email, 'Expected:', ADMIN_EMAIL)

    if (!user || user.email !== ADMIN_EMAIL) {
      console.log('[adminAuth] User is NOT admin, returning null')
      return null
    }

    console.log('[adminAuth] User IS admin, returning user object')
    return user
  } catch (error) {
    console.error('[adminAuth] Error checking admin status:', error)
    return null
  }
}

/**
 * Server-side admin check for API routes
 */
export function isAdminEmail(email: string | undefined): boolean {
  return email === ADMIN_EMAIL
}
