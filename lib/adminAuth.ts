import { supabase } from './supabase'

const ADMIN_EMAIL = 'jeremy.elucidation@gmail.com'

/**
 * Check if the current logged-in user is an admin
 * Returns the user if admin, null otherwise
 */
export async function checkIsAdmin() {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== ADMIN_EMAIL) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error checking admin status:', error)
    return null
  }
}

/**
 * Server-side admin check for API routes
 */
export function isAdminEmail(email: string | undefined): boolean {
  return email === ADMIN_EMAIL
}
