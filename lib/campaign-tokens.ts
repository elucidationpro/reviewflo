import crypto from 'crypto'

/**
 * Signed unsubscribe tokens.
 *
 * Format: base64url(payload).base64url(signature)
 * Payload JSON: { b: businessId, e?: email, p?: phone, t: issuedAtMs }
 * Expiry: 30 days from issuance.
 *
 * Secret: CAMPAIGN_SIGNING_SECRET. Falls back to SUPABASE_SERVICE_ROLE_KEY in dev
 * so locally the flow is testable without setting another env var.
 */

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

interface TokenPayload {
  b: string
  e?: string
  p?: string
  t: number
}

export interface UnsubscribePayload {
  businessId: string
  email?: string
  phone?: string
  issuedAt: number
}

function getSecret(): string {
  const s = process.env.CAMPAIGN_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('No signing secret configured (CAMPAIGN_SIGNING_SECRET)')
  return s
}

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? 0 : 4 - (input.length % 4)
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad)
  return Buffer.from(b64, 'base64')
}

function sign(payloadB64: string, secret: string): string {
  return base64url(crypto.createHmac('sha256', secret).update(payloadB64).digest())
}

export function signUnsubscribeToken(input: {
  businessId: string
  email?: string | null
  phone?: string | null
}): string {
  const payload: TokenPayload = { b: input.businessId, t: Date.now() }
  if (input.email) payload.e = input.email
  if (input.phone) payload.p = input.phone
  const payloadB64 = base64url(JSON.stringify(payload))
  const sig = sign(payloadB64, getSecret())
  return `${payloadB64}.${sig}`
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload | null {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [payloadB64, sig] = token.split('.', 2)
  if (!payloadB64 || !sig) return null

  let secret: string
  try {
    secret = getSecret()
  } catch {
    return null
  }

  const expected = sign(payloadB64, secret)
  if (expected.length !== sig.length) return null
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  }
  if (diff !== 0) return null

  let payload: TokenPayload
  try {
    payload = JSON.parse(fromBase64url(payloadB64).toString('utf8')) as TokenPayload
  } catch {
    return null
  }
  if (!payload || typeof payload.b !== 'string' || typeof payload.t !== 'number') return null

  if (Date.now() - payload.t > TOKEN_TTL_MS) return null

  return {
    businessId: payload.b,
    email: payload.e,
    phone: payload.p,
    issuedAt: payload.t,
  }
}
