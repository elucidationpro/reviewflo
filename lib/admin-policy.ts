type AdminIdentity = {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
  email?: string
  email_confirmed_at?: string
}

/** Server-only identity policy. Never trust user-editable metadata for authorization. */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'jeremy.elucidation@gmail.com')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
  return allowed.includes(email.trim().toLowerCase())
}

export function isAdminUser(user: AdminIdentity | null): boolean {
  return !!user && (user.app_metadata?.role === 'admin' ||
    (!!user.email_confirmed_at && isAdminEmail(user.email)))
}
