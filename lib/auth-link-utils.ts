/**
 * Wraps Supabase auth URLs so emails link to our domain (usereviewflo.com)
 * instead of supabase.co. Improves deliverability by matching link domain to sender.
 */
export function wrapAuthLink(supabaseUrl: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'
  const encoded = encodeBase64Url(supabaseUrl)
  return `${baseUrl}/auth/verify?r=${encoded}`
}

function encodeBase64Url(str: string): string {
  const base64 = Buffer.from(str, 'utf-8').toString('base64')
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
