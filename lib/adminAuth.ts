import { supabase } from './supabase'

// Admin email for backward compatibility - will be phased out in favor of role-based system
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jeremy.elucidation@gmail.com'

/**
 * Check if a user has admin role
 * Checks both app_metadata.role and user_metadata.role for flexibility
 */
function hasAdminRole(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false
  
  const appRole = user.app_metadata?.role
  const userRole = user.user_metadata?.role
  
  return appRole === 'admin' || userRole === 'admin'
}

/**
 * Check if the current logged-in user is an admin
 * Returns the user if admin, null otherwise
 * 
 * Checks in order:
 * 1. app_metadata.role === 'admin'
 * 2. user_metadata.role === 'admin'
 * 3. email matches ADMIN_EMAIL (backward compatibility)
 */
export async function checkIsAdmin() {
  console.log('[adminAuth] checkIsAdmin called')
  try {
    console.log('[adminAuth] Calling supabase.auth.getUser()')
    const { data: { user } } = await supabase.auth.getUser()
    console.log('[adminAuth] User result:', user)

    if (!user) {
      console.log('[adminAuth] No user found, returning null')
      return null
    }

    // Check role-based admin first (preferred method)
    if (hasAdminRole(user)) {
      console.log('[adminAuth] User IS admin (role-based), returning user object')
      return user
    }

    // Fallback to email check for backward compatibility
    if (user.email === ADMIN_EMAIL) {
      console.log('[adminAuth] User IS admin (email-based), returning user object')
      return user
    }

    console.log('[adminAuth] User is NOT admin, returning null')
    return null
  } catch (error) {
    console.error('[adminAuth] Error checking admin status:', error)
    return null
  }
}

/**
 * Server-side admin check for API routes
 * Checks role first, then falls back to email for backward compatibility
 */
export function isAdminUser(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown>; email?: string } | null): boolean {
  if (!user) return false
  
  // Check role-based admin first
  if (hasAdminRole(user)) {
    return true
  }
  
  // Fallback to email check for backward compatibility
  return user.email === ADMIN_EMAIL
}

/**
 * @deprecated Use isAdminUser instead
 * Kept for backward compatibility with existing API routes
 */
export function isAdminEmail(email: string | undefined): boolean {
  return email === ADMIN_EMAIL
}
