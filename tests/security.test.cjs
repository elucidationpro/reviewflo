const { test } = require('node:test')
const assert = require('node:assert/strict')
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } })
const { isAdminUser } = require('../lib/admin-policy.ts')
const { publicBusinessFields } = require('../lib/public-business-fields.ts')
const { createConnectState, readConnectState } = require('../lib/google-connect-state.ts')
const { getBusinessForRequest } = require('../lib/business-account.ts')
const { verifyGoogleOAuthState } = require('../lib/google-oauth-csrf.ts')

process.env.ADMIN_EMAILS = 'admin@example.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'unit-test-signing-key'

test('editable metadata cannot grant administrator access', () => {
  assert.equal(isAdminUser({ email: 'tenant@example.test', user_metadata: { role: 'admin' } }), false)
  assert.equal(isAdminUser({ app_metadata: { role: 'admin' } }), true)
  assert.equal(isAdminUser(null), false)
})
test('email fallback requires verified identity and exact configured email', () => {
  assert.equal(isAdminUser({ email: 'admin@example.test' }), false)
  assert.equal(isAdminUser({ email: 'admin@example.test', email_confirmed_at: '' }), false)
  assert.equal(isAdminUser({ email: 'ADMIN@example.test', email_confirmed_at: '2026-01-01' }), true)
  assert.equal(isAdminUser({ email: 'admin@example.test.attacker.test', email_confirmed_at: '2026-01-01' }), false)
})
test('app_metadata role check is strict-equals "admin"', () => {
  assert.equal(isAdminUser({ app_metadata: { role: 'Admin' } }), false)
  assert.equal(isAdminUser({ app_metadata: { role: 'admin ' } }), false)
  assert.equal(isAdminUser({ app_metadata: { role: ['admin'] } }), false)
  assert.equal(isAdminUser({ app_metadata: { roles: ['admin'] } }), false)
  assert.equal(isAdminUser({ app_metadata: { role: '' } }), false)
})
test('public projection excludes existing and future private fields', () => {
  const result = publicBusinessFields({ id: 'a', slug: 'shop', business_name: 'Shop',
    owner_email: 'private', google_oauth_refresh_token: 'secret', google_oauth_access_token: 'secret',
    stripe_customer_id: 'secret', user_id: 'secret', future_private_field: 'secret' })
  assert.deepEqual(result, { id: 'a', business_name: 'Shop', slug: 'shop' })
})
test('Google connect state is signed and rejects tampering, wrong keys and expiry', () => {
  const state = createConnectState('user-a', 'business-a', true)
  assert.equal(readConnectState(state).businessId, 'business-a')
  const [encoded, signature] = state.split('.')
  const tampered = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(encoded, 'base64url')), businessId: 'business-b' })).toString('base64url')
  assert.equal(readConnectState(`${tampered}.${signature}`), null)
  assert.equal(readConnectState('bearer-token|business-a'), null)
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'wrong-key'
  assert.equal(readConnectState(state), null)
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'unit-test-signing-key'
  const originalNow = Date.now
  try { Date.now = () => originalNow() + 601_000; assert.equal(readConnectState(state), null) }
  finally { Date.now = originalNow }
})
test('readConnectState fails closed on malformed payloads', () => {
  assert.equal(readConnectState(''), null)
  assert.equal(readConnectState('only-one-segment'), null)
  assert.equal(readConnectState('a.b.c'), null)
  assert.equal(readConnectState('not-base64!@#.signature'), null)
})
test('OAuth callback requires the matching browser cookie', () => {
  const setCookieCalls = []
  const res = { appendHeader(name, value) { setCookieCalls.push({ name, value }) } }
  assert.equal(verifyGoogleOAuthState({ headers: {} }, res, 'a'), false)
  assert.equal(verifyGoogleOAuthState({ headers: { cookie: 'rf_google_oauth_state=b' } }, res, 'a'), false)
  assert.equal(verifyGoogleOAuthState({ headers: { cookie: 'rf_google_oauth_state=a' } }, res, 'a'), true)
  // Every attempt — match or mismatch — must invalidate the single-use cookie.
  assert.equal(setCookieCalls.length, 3)
  for (const call of setCookieCalls) {
    assert.equal(call.name, 'Set-Cookie')
    assert.match(call.value, /rf_google_oauth_state=;/)
    assert.match(call.value, /Max-Age=0/)
  }
})

function database(rows) {
  return { from() {
    let matches = rows.slice()
    const q = {
      select() { return q },
      eq(key, value) { matches = matches.filter(r => r[key] === value); return q },
      maybeSingle() { return Promise.resolve({ data: matches.length === 1 ? { ...matches[0] } : null, error: null }) },
      then(resolve) { return Promise.resolve({ data: matches.map(r => ({ ...r })), error: null }).then(resolve) },
    }
    return q
  } }
}
const rows = [
  { id: 'a', user_id: 'alice', parent_business_id: null, tier: 'pro' },
  { id: 'a-child', user_id: 'alice', parent_business_id: 'a', tier: 'free' },
  { id: 'b', user_id: 'bob', parent_business_id: null, tier: 'ai' },
  { id: 'b-child', user_id: 'bob', parent_business_id: 'a', tier: 'free' },
]
test('tenant cannot read another root or child by guessing its ID', async () => {
  for (const id of ['b', 'b-child', 'missing']) {
    const result = await getBusinessForRequest(database(rows), 'alice', id)
    assert.equal(result.row, null)
  }
})
test('location inherits the authenticated owner’s root subscription', async () => {
  const result = await getBusinessForRequest(database(rows), 'alice', 'a-child')
  assert.equal(result.row.id, 'a-child')
  assert.equal(result.row.tier, 'pro')
})
test('default business resolution stays within authenticated account', async () => {
  assert.equal((await getBusinessForRequest(database(rows), 'bob', null)).row.id, 'b')
  assert.equal((await getBusinessForRequest(database(rows), 'nobody', null)).row, null)
})

test('public projection never leaks private fields even if DB returns them', () => {
  const dbRow = {
    id: 'biz-1', slug: 'shop-1', business_name: 'Shop', primary_color: '#000', tier: 'pro',
    // Private fields that must never appear in the public projection.
    user_id: 'owner-uuid', owner_email: 'owner@example.test', owner_name: 'Owner',
    parent_business_id: null, google_oauth_access_token: 'access',
    google_oauth_refresh_token: 'refresh', google_oauth_expires_at: '2026-01-01',
    stripe_customer_id: 'cus_1', launch_discount_claimed: true,
    created_at: '2025-01-01', updated_at: '2026-01-01',
  }
  const projected = publicBusinessFields(dbRow)
  const forbidden = ['user_id', 'owner_email', 'owner_name', 'parent_business_id',
    'google_oauth_access_token', 'google_oauth_refresh_token', 'google_oauth_expires_at',
    'stripe_customer_id', 'launch_discount_claimed', 'created_at', 'updated_at']
  for (const key of forbidden) assert.equal(key in projected, false, `${key} leaked into public projection`)
  assert.equal(projected.business_name, 'Shop')
  assert.equal(projected.tier, 'pro')
})
