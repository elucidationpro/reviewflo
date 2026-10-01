'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

// ---------------------------------------------------------------------------
// Fake `stripe` module — no network, no real keys. `checkout.sessions.retrieve`
// and `subscriptions.retrieve` are driven per-test.
// ---------------------------------------------------------------------------
let stripeImpl = null
function FakeStripeCtor(secretKey, opts) {
  if (!stripeImpl) throw new Error('test bug: stripeImpl not configured before constructing Stripe client')
  return stripeImpl(secretKey, opts)
}
FakeStripeCtor.createFetchHttpClient = () => ({})
class FakeStripeError extends Error {}
class FakeStripeInvalidRequestError extends FakeStripeError {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}
class FakeStripeConnectionError extends FakeStripeError {}
class FakeStripeAPIError extends FakeStripeError {}
class FakeStripeRateLimitError extends FakeStripeError {}
FakeStripeCtor.errors = {
  StripeError: FakeStripeError,
  StripeInvalidRequestError: FakeStripeInvalidRequestError,
  StripeConnectionError: FakeStripeConnectionError,
  StripeAPIError: FakeStripeAPIError,
  StripeRateLimitError: FakeStripeRateLimitError,
}

const stripePath = require.resolve('stripe')
require.cache[stripePath] = { id: stripePath, filename: stripePath, loaded: true, exports: FakeStripeCtor }

function makeStripeInstance(overrides = {}) {
  return {
    checkout: {
      sessions: {
        retrieve:
          overrides.sessionsRetrieve ||
          (async () => {
            throw new Error('test bug: checkout.sessions.retrieve not stubbed for this test')
          }),
      },
    },
    subscriptions: {
      retrieve:
        overrides.subscriptionsRetrieve ||
        (async () => {
          throw new Error('test bug: subscriptions.retrieve not stubbed for this test')
        }),
    },
  }
}
function setStripeImpl(overrides) {
  stripeImpl = () => makeStripeInstance(overrides)
}

// ---------------------------------------------------------------------------
// Fake `@supabase/supabase-js` — in-memory `businesses` table + auth.getUser,
// with just enough query-builder surface for both `getBusinessForRequest` and
// `syncSubscriptionById` (select/update/eq/is/maybeSingle/then).
// ---------------------------------------------------------------------------
const scenario = {
  authUser: null,
  authError: null,
  rows: [],
}

function resetScenario() {
  scenario.authUser = { id: 'user-1', email: 'user@example.test' }
  scenario.authError = null
  scenario.rows = []
}

function addBusiness(row) {
  scenario.rows.push({
    parent_business_id: null,
    admin_override: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    created_at: '2025-01-01',
    ...row,
  })
}
function getBusiness(id) {
  return scenario.rows.find((r) => r.id === id)
}

function applyFilters(rows, filters) {
  return filters.reduce((acc, [key, value]) => acc.filter((r) => (r[key] ?? null) === value), rows.slice())
}

function makeQueryBuilder() {
  const filters = []
  let mode = 'select'
  let payload = null
  const q = {
    select() {
      return q
    },
    update(p) {
      mode = 'update'
      payload = p
      return q
    },
    eq(key, value) {
      filters.push([key, value])
      return q
    },
    is(key, value) {
      filters.push([key, value])
      return q
    },
    maybeSingle() {
      const rows = applyFilters(scenario.rows, filters)
      return Promise.resolve({ data: rows.length === 1 ? { ...rows[0] } : null, error: null })
    },
    then(onResolve, onReject) {
      let result
      if (mode === 'update') {
        const rows = applyFilters(scenario.rows, filters)
        for (const row of rows) Object.assign(row, payload)
        result = { data: rows.map((r) => ({ id: r.id })), error: null }
      } else {
        result = { data: applyFilters(scenario.rows, filters).map((r) => ({ ...r })), error: null }
      }
      return Promise.resolve(result).then(onResolve, onReject)
    },
  }
  return q
}

const fakeSupabaseClient = {
  auth: {
    async getUser() {
      if (scenario.authError) return { data: { user: null }, error: scenario.authError }
      return { data: { user: scenario.authUser }, error: null }
    },
  },
  from() {
    return makeQueryBuilder()
  },
}

function fakeCreateClient() {
  return fakeSupabaseClient
}
const supabasePath = require.resolve('@supabase/supabase-js')
require.cache[supabasePath] = {
  id: supabasePath,
  filename: supabasePath,
  loaded: true,
  exports: { createClient: fakeCreateClient },
}

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } })

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'unit-test-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_default1234567890'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
async function withCapturedConsoleError(fn) {
  const calls = []
  const original = console.error
  console.error = (...args) => calls.push(args)
  try {
    const result = await fn()
    return { result, calls }
  } finally {
    console.error = original
  }
}

function makeReq({ authorization, body, method = 'POST' } = {}) {
  return {
    method,
    headers: { ...(authorization ? { authorization } : {}) },
    body: body || {},
  }
}
function makeRes() {
  const res = { statusCode: null, body: null }
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (payload) => {
    res.body = payload
    return res
  }
  return res
}

function loadHandler() {
  return require('../pages/api/verify-checkout-session.ts').default
}

function baseSession(overrides = {}) {
  return {
    id: 'cs_test_1234567890',
    livemode: false,
    mode: 'subscription',
    status: 'complete',
    payment_status: 'paid',
    subscription: 'sub_1',
    customer: 'cus_1',
    metadata: {
      source: 'pro_subscription',
      business_id: 'biz-1',
      supabase_user_id: 'user-1',
      plan: 'pro',
      billing_interval: 'month',
    },
    ...overrides,
  }
}

function baseSubscription(overrides = {}) {
  return {
    id: 'sub_1',
    status: 'active',
    customer: 'cus_1',
    livemode: false,
    metadata: {
      source: 'pro_subscription',
      business_id: 'biz-1',
      supabase_user_id: 'user-1',
      billing_interval: 'month',
    },
    ...overrides,
  }
}

// ===========================================================================
// Auth / input validation
// ===========================================================================
test('verify-checkout-session rejects requests without a bearer token', async () => {
  resetScenario()
  const handler = loadHandler()
  const req = makeReq({ body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.reason, 'auth_required')
})

test('verify-checkout-session rejects an invalid/expired session token', async () => {
  resetScenario()
  scenario.authError = { message: 'jwt expired' }
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer bad-token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.reason, 'auth_invalid')
})

test('verify-checkout-session rejects a malformed session id', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'not-a-real-id' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.reason, 'invalid_request')
})

test('verify-checkout-session rejects a missing session id', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: {} })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.reason, 'invalid_request')
})

// ===========================================================================
// Ownership checks — must reject before revealing anything
// ===========================================================================
test('verify-checkout-session rejects a session whose metadata points at a different business/user (wrong owner)', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () =>
      baseSession({ metadata: { source: 'pro_subscription', business_id: 'biz-1', supabase_user_id: 'attacker' } }),
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.reason, 'session_unowned')
})

test('verify-checkout-session rejects a session with no ReviewFlo Pro metadata at all (e.g. someone else\'s checkout id)', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession({ metadata: {} }),
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.reason, 'session_unowned')
})

test('verify-checkout-session treats a resource_missing session retrieval as a terminal denial (never reveals existence)', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => {
      throw new FakeStripeInvalidRequestError('No such checkout session', 'resource_missing')
    },
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  const { calls } = await withCapturedConsoleError(() => handler(req, res))
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.reason, 'session_unowned')
  assert.ok(!JSON.stringify(calls).includes('No such checkout session'))
})

test('verify-checkout-session treats a transient network/API session retrieval failure as retryable, not a denial', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => {
      throw new FakeStripeConnectionError('network timeout')
    },
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  const { calls } = await withCapturedConsoleError(() => handler(req, res))
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'sync_pending')
  assert.ok(!JSON.stringify(calls).includes('network timeout'))
})

test('verify-checkout-session rejects a live-mode session verified under a test-mode key', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({ sessionsRetrieve: async () => baseSession({ livemode: true }) })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.reason, 'session_unowned')
})

// ===========================================================================
// Payment state
// ===========================================================================
test('verify-checkout-session reports an open/incomplete session as not confirmed, not an error', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({ sessionsRetrieve: async () => baseSession({ status: 'open', payment_status: 'unpaid' }) })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'payment_incomplete')
  assert.equal(getBusiness('biz-1').tier, 'free')
})

test('verify-checkout-session confirms a paid session and syncs Pro onto the business', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession(),
    subscriptionsRetrieve: async (id) => baseSubscription({ id }),
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'confirmed')
  assert.equal(res.body.plan, 'pro')
  assert.equal(res.body.billingInterval, 'month')
  assert.equal(getBusiness('biz-1').tier, 'pro')
})

test('verify-checkout-session confirms a no_payment_required (100% promo code) session', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession({ payment_status: 'no_payment_required' }),
    subscriptionsRetrieve: async (id) => baseSubscription({ id, status: 'trialing' }),
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'confirmed')
  assert.equal(getBusiness('biz-1').tier, 'pro')
})

// ===========================================================================
// Retryable sync failures — must never falsely confirm
// ===========================================================================
test('verify-checkout-session reports sync_pending (not confirmed) when the subscription sync errors', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession(),
    subscriptionsRetrieve: async () => {
      throw new Error('stripe network error')
    },
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  const { calls } = await withCapturedConsoleError(() => handler(req, res))
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'sync_pending')
  assert.equal(getBusiness('biz-1').tier, 'free')
  assert.ok(!JSON.stringify(calls).includes('stripe network error'))
})

test('verify-checkout-session reports sync_pending when the sync runs but the DB tier has not yet flipped to paid', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession(),
    // A subscription that does not (yet) grant Pro — e.g. still `incomplete`.
    subscriptionsRetrieve: async (id) => baseSubscription({ id, status: 'incomplete' }),
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'sync_pending')
  assert.equal(getBusiness('biz-1').tier, 'free')
})

test('verify-checkout-session still confirms when an admin override left the business on AI tier instead of Pro (adminAI display)', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'ai', admin_override: true })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession(),
    subscriptionsRetrieve: async (id) => baseSubscription({ id }),
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'confirmed')
  assert.equal(res.body.plan, 'ai')
  assert.equal(getBusiness('biz-1').tier, 'ai')
})

// ===========================================================================
// Subscription-level verification — the subscription, not just session metadata, must be
// re-checked before confirming. A canceled or unrelated subscription can never confirm, even if
// the business row already shows a paid tier for some other reason.
// ===========================================================================
test('verify-checkout-session does not confirm a canceled subscription even when the business is already marked paid (canceled with paidDB)', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'pro', stripe_subscription_id: 'sub_1' })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession(),
    subscriptionsRetrieve: async (id) => baseSubscription({ id, status: 'canceled' }),
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'sync_pending')
  assert.equal(getBusiness('biz-1').tier, 'pro')
})

test('verify-checkout-session does not confirm when the subscription customer does not match the session customer (wrong customer)', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession(),
    subscriptionsRetrieve: async (id) => baseSubscription({ id, customer: 'cus_other' }),
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'sync_pending')
  assert.equal(getBusiness('biz-1').tier, 'free')
})

test('verify-checkout-session does not confirm when the subscription metadata points at a different owner (wrong owner)', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession(),
    subscriptionsRetrieve: async (id) =>
      baseSubscription({ id, metadata: { source: 'pro_subscription', business_id: 'biz-1', supabase_user_id: 'attacker' } }),
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'sync_pending')
  assert.equal(getBusiness('biz-1').tier, 'free')
})

test('verify-checkout-session does not confirm when the subscription lacks the pro_subscription source metadata (wrong source / unrelated subscription)', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession(),
    subscriptionsRetrieve: async (id) => baseSubscription({ id, metadata: {} }),
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'sync_pending')
  assert.equal(getBusiness('biz-1').tier, 'free')
})

// ===========================================================================
// Thrown DB / sync exceptions — must degrade to sync_pending, never confirm or leak
// ===========================================================================
test('verify-checkout-session reports sync_pending when the final DB lookup throws (thrownDB)', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession(),
    subscriptionsRetrieve: async (id) => baseSubscription({ id }),
  })
  const originalFrom = fakeSupabaseClient.from
  fakeSupabaseClient.from = function (table) {
    const q = originalFrom.call(this, table)
    const originalSelect = q.select
    q.select = function (...args) {
      // Only the final post-sync re-read selects `tier, stripe_subscription_id` together — let
      // every earlier lookup (auth context, sync's own reads) through untouched, and throw only
      // for that one.
      if (table === 'businesses' && typeof args[0] === 'string' && args[0].includes('tier, stripe_subscription_id')) {
        throw new Error('db connection lost')
      }
      return originalSelect.apply(this, args)
    }
    return q
  }
  try {
    const handler = loadHandler()
    const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
    const res = makeRes()
    const { calls } = await withCapturedConsoleError(() => handler(req, res))
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.status, 'sync_pending')
    assert.ok(!JSON.stringify(calls).includes('db connection lost'))
  } finally {
    fakeSupabaseClient.from = originalFrom
  }
})

test('verify-checkout-session reports sync_pending when a DB query inside syncSubscriptionById throws (thrownSync)', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession(),
    subscriptionsRetrieve: async (id) => baseSubscription({ id }),
  })
  const originalFrom = fakeSupabaseClient.from
  fakeSupabaseClient.from = function (table) {
    const q = originalFrom.call(this, table)
    const originalSelect = q.select
    q.select = function (...args) {
      // syncSubscriptionById's own mapped-subscription lookup is the only select of
      // `stripe_customer_id` — throw only there, simulating a DB client failure that escapes
      // syncSubscriptionById itself rather than one of its own caught Stripe calls.
      if (table === 'businesses' && typeof args[0] === 'string' && args[0].includes('stripe_customer_id')) {
        throw new Error('db connection lost mid-sync')
      }
      return originalSelect.apply(this, args)
    }
    return q
  }
  try {
    const handler = loadHandler()
    const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
    const res = makeRes()
    const { calls } = await withCapturedConsoleError(() => handler(req, res))
    assert.equal(res.statusCode, 200)
    assert.equal(res.body.status, 'sync_pending')
    assert.equal(getBusiness('biz-1').tier, 'free')
    assert.ok(!JSON.stringify(calls).includes('db connection lost mid-sync'))
  } finally {
    fakeSupabaseClient.from = originalFrom
  }
})

test('verify-checkout-session does not confirm when both session and subscription are missing a customer id', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free' })
  setStripeImpl({
    sessionsRetrieve: async () => baseSession({ customer: null }),
    subscriptionsRetrieve: async (id) => baseSubscription({ id, customer: null }),
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'sync_pending')
  assert.equal(getBusiness('biz-1').tier, 'free')
})

test('verify-checkout-session does not confirm a subscription canceled during sync even under an admin override (canceled-during-sync)', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'ai', admin_override: true })
  let subscriptionCalls = 0
  setStripeImpl({
    sessionsRetrieve: async () => baseSession(),
    subscriptionsRetrieve: async (id) => {
      subscriptionCalls += 1
      // Pre-sync check (call 1) and syncSubscriptionById's own internal fetch (call 2) both see
      // an active subscription; by the time the endpoint does its own final re-verify (call 3),
      // it has since been canceled.
      return baseSubscription({ id, status: subscriptionCalls <= 2 ? 'active' : 'canceled' })
    },
  })
  const handler = loadHandler()
  const req = makeReq({ authorization: 'Bearer token', body: { sessionId: 'cs_test_1234567890' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.status, 'sync_pending')
  assert.equal(getBusiness('biz-1').tier, 'ai')
})
