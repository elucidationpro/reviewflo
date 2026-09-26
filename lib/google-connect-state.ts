import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

type ConnectState = { userId: string; businessId: string; onboarding: boolean; expires: number; nonce: string }
function secret() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing OAuth signing key')
  return key
}
export function createConnectState(userId: string, businessId: string, onboarding: boolean): string {
  const payload = Buffer.from(JSON.stringify({ userId, businessId, onboarding,
    expires: Date.now() + 600_000, nonce: randomBytes(24).toString('base64url') })).toString('base64url')
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`
}
export function readConnectState(state: string): ConnectState | null {
  try {
    const parts = state.split('.')
    if (parts.length !== 2) return null
    const [payload, signature] = parts
    const expected = createHmac('sha256', secret()).update(payload).digest()
    const supplied = Buffer.from(signature, 'base64url')
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as ConnectState
    if (typeof parsed.userId !== 'string' || typeof parsed.businessId !== 'string' ||
      typeof parsed.expires !== 'number' || parsed.expires <= Date.now()) return null
    return parsed
  } catch { return null }
}
