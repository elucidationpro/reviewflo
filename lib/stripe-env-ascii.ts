/** Fetch / undici reject header values outside ISO-8859-1; Stripe keys must be ASCII-only. */
export function firstNonLatin1Index(s: string): { index: number; code: number } | null {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    if (code > 255) return { index: i, code }
  }
  return null
}
