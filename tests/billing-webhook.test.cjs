'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

// ---------------------------------------------------------------------------
// Fake `stripe` module — no network, no real keys. `webhooks.constructEvent`
// accepts a `valid-signature` sentinel for tests that don't care about
// signature wiring, but otherwise delegates to the *real* Stripe library's
// HMAC verification (captured below, before this module replaces the
// require cache entry) so at least one test exercises real signature
// verification end-to-end through the actual raw-body handling in the route.
// `subscriptions.retrieve` is driven per-test so we can assert the sync
// always re-fetches the authoritative subscription instead of trusting the
// webhook payload.
// ---------------------------------------------------------------------------
const RealStripe = require('stripe')
let subscriptionsRetrieveImpl = async () => {
  throw new Error('test bug: subscriptions.retrieve not stubbed for this test')
}
const retrieveCalls = []
function setSubscriptionsRetrieve(fn) {
  subscriptionsRetrieveImpl = fn
}
function FakeStripeCtor(_secretKey, _opts) {
  return {
    webhooks: {
      constructEvent(rawBody, signature, secret) {
        if (signature === 'valid-signature') {
          return JSON.parse(rawBody.toString())
        }
        return RealStripe.webhooks.constructEvent(rawBody, signature, secret)
      },
    },
    subscriptions: {
      retrieve: (id) => {
        retrieveCalls.push(id)
        return subscriptionsRetrieveImpl(id)
      },
    },
  }
}
class FakeStripeError extends Error {
  constructor(message) {
    super(message)
    this.type = 'StripeError'
  }
}
class FakeStripeConnectionError extends FakeStripeError {}
class FakeStripeAuthenticationError extends FakeStripeError {}
class FakeStripePermissionError extends FakeStripeError {}
class FakeStripeInvalidRequestError extends FakeStripeError {}
class FakeStripeRateLimitError extends FakeStripeError {}
class FakeStripeAPIError extends FakeStripeError {}
FakeStripeCtor.errors = {
  StripeError: FakeStripeError,
  StripeConnectionError: FakeStripeConnectionError,
  StripeAuthenticationError: FakeStripeAuthenticationError,
  StripePermissionError: FakeStripePermissionError,
  StripeInvalidRequestError: FakeStripeInvalidRequestError,
  StripeRateLimitError: FakeStripeRateLimitError,
  StripeAPIError: FakeStripeAPIError,
}
const stripePath = require.resolve('stripe')
require.cache[stripePath] = { id: stripePath, filename: stripePath, loaded: true, exports: FakeStripeCtor }

// ---------------------------------------------------------------------------
// Fake `resend` module — no network, no real key required. Only used by the
// legacy early-access branch; never invoked by the Pro subscription sync path.
// ---------------------------------------------------------------------------
class FakeResend {
  constructor() {
    this.emails = { send: async () => ({ data: { id: 'fake-email-id' }, error: null }) }
  }
}
const resendPath = require.resolve('resend')
const RealResend = require('resend').Resend
require.cache[resendPath] = { id: resendPath, filename: resendPath, loaded: true, exports: { Resend: FakeResend } }

// ---------------------------------------------------------------------------
// Fake `@supabase/supabase-js` — an in-memory, multi-table query builder.
// ---------------------------------------------------------------------------
const RAW_DB_ERROR = { message: 'permission denied for relation businesses', code: '42501' }

const scenario = {
  tables: { businesses: [], early_access_signups: [], early_access_customers: [] },
  forceBusinessesError: false,
}
function resetScenario() {
  scenario.tables = { businesses: [], early_access_signups: [], early_access_customers: [] }
  scenario.forceBusinessesError = false
  retrieveCalls.length = 0
}

function applyFilters(rows, filters) {
  return filters.reduce((acc, [key, value]) => acc.filter((r) => (r[key] ?? null) === value), rows.slice())
}

function makeQueryBuilder(table) {
  const filters = []
  let mode = 'select'
  let payload = null

  function dbError() {
    return table === 'businesses' && scenario.forceBusinessesError
  }

  const q = {
    select() {
      return q
    },
    update(p) {
      mode = 'update'
      payload = p
      return q
    },
    insert(p) {
      mode = 'insert'
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
      if (dbError()) return Promise.resolve({ data: null, error: { ...RAW_DB_ERROR } })
      const rows = applyFilters(scenario.tables[table], filters)
      return Promise.resolve({ data: rows.length === 1 ? { ...rows[0] } : null, error: null })
    },
    single() {
      if (dbError()) return Promise.resolve({ data: null, error: { ...RAW_DB_ERROR } })
      const rows = applyFilters(scenario.tables[table], filters)
      return Promise.resolve({ data: rows[0] ? { ...rows[0] } : null, error: rows[0] ? null : { message: 'no rows' } })
    },
    then(onResolve, onReject) {
      let result
      if (dbError()) {
        result = { data: null, error: { ...RAW_DB_ERROR } }
      } else if (mode === 'update') {
        const rows = applyFilters(scenario.tables[table], filters)
        for (const row of rows) Object.assign(row, payload)
        result = { data: rows.map((r) => ({ id: r.id })), error: null }
      } else if (mode === 'insert') {
        scenario.tables[table].push({ ...payload })
        result = { data: null, error: null }
      } else {
        const rows = applyFilters(scenario.tables[table], filters)
        result = { data: rows.map((r) => ({ ...r })), error: null }
      }
      return Promise.resolve(result).then(onResolve, onReject)
    },
  }
  return q
}

const fakeSupabaseClient = {
  from(table) {
    return makeQueryBuilder(table)
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
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_default'
delete process.env.RESEND_API_KEY

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
async function withEnv(overrides, fn) {
  const original = {}
  for (const key of Object.keys(overrides)) {
    original[key] = process.env[key]
    if (overrides[key] === undefined) delete process.env[key]
    else process.env[key] = overrides[key]
  }
  try {
    return await fn()
  } finally {
    for (const key of Object.keys(overrides)) {
      if (original[key] === undefined) delete process.env[key]
      else process.env[key] = original[key]
    }
  }
}

async function withCapturedConsole(fn) {
  const originalError = console.error
  const originalWarn = console.warn
  const calls = []
  console.error = (...args) => calls.push(args)
  console.warn = (...args) => calls.push(args)
  try {
    const result = await fn()
    return { result, calls }
  } finally {
    console.error = originalError
    console.warn = originalWarn
  }
}

function makeReq({ method = 'POST', signature, rawBody } = {}) {
  const bodyBuffer = Buffer.from(rawBody || '')
  return {
    method,
    headers: signature !== undefined ? { 'stripe-signature': signature } : {},
    async *[Symbol.asyncIterator]() {
      yield bodyBuffer
    },
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
function makeEvent(type, dataObject, { id = 'evt_1', livemode = false, created = 1690000000 } = {}) {
  return { id, type, livemode, created, data: { object: dataObject } }
}
function eventReq(event, { signature = 'valid-signature' } = {}) {
  return makeReq({ signature, rawBody: JSON.stringify(event) })
}

function loadHandler() {
  return require('../pages/api/webhooks/stripe.ts').default
}

function addBusiness(row) {
  scenario.tables.businesses.push({
    parent_business_id: null,
    admin_override: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    created_at: '2025-01-01',
    ...row,
  })
}
function getBusiness(id) {
  return scenario.tables.businesses.find((r) => r.id === id)
}

// ===========================================================================
// pages/api/webhooks/stripe.ts — transport-level tests
// ===========================================================================
test('webhook rejects non-POST requests', async () => {
  resetScenario()
  const handler = loadHandler()
  const req = makeReq({ method: 'GET' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 405)
})

test('webhook returns a controlled 500 (not a crash) when Stripe config is missing', async () => {
  resetScenario()
  await withEnv({ STRIPE_SECRET_KEY: undefined }, async () => {
    const handler = loadHandler()
    const req = makeReq({ method: 'POST', signature: 'valid-signature', rawBody: '{}' })
    const res = makeRes()
    await handler(req, res)
    assert.equal(res.statusCode, 500)
  })
})

test('webhook rejects a request with no signature header', async () => {
  resetScenario()
  const handler = loadHandler()
  const req = makeReq({ method: 'POST', rawBody: '{}' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
})

test('webhook rejects an invalid signature', async () => {
  resetScenario()
  const handler = loadHandler()
  const req = makeReq({ method: 'POST', signature: 'bad-signature', rawBody: '{}' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
})

test('webhook accepts a real HMAC-signed raw body (validates actual raw-body wiring, not just the sentinel)', async () => {
  resetScenario()
  const handler = loadHandler()
  const event = makeEvent('some.unhandled.event', {})
  const payload = JSON.stringify(event)
  const signature = RealStripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  })
  const req = makeReq({ method: 'POST', signature, rawBody: payload })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
})

test('webhook rejects a real HMAC signature generated with the wrong secret', async () => {
  resetScenario()
  const handler = loadHandler()
  const event = makeEvent('some.unhandled.event', {})
  const payload = JSON.stringify(event)
  const signature = RealStripe.webhooks.generateTestHeaderString({
    payload,
    secret: 'whsec_completely_wrong_secret',
  })
  const req = makeReq({ method: 'POST', signature, rawBody: payload })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
})

test('webhook accepts a validly signed event and acknowledges unhandled event types', async () => {
  resetScenario()
  const handler = loadHandler()
  const event = makeEvent('some.unhandled.event', {})
  const res = makeRes()
  await handler(eventReq(event), res)
  assert.equal(res.statusCode, 200)
})

test('webhook rejects a live-mode event received under a test-mode secret key', async () => {
  resetScenario()
  const handler = loadHandler()
  const event = makeEvent('customer.subscription.updated', { id: 'sub_x' }, { livemode: true })
  const res = makeRes()
  await handler(eventReq(event), res)
  assert.equal(res.statusCode, 400)
})

// ===========================================================================
// customer.subscription.* lifecycle sync (via the webhook route)
// ===========================================================================
test('customer.subscription.updated grants pro for a business already mapped to the subscription', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' })
  setSubscriptionsRetrieve(async (id) => ({ id, status: 'active', customer: 'cus_1', metadata: {} }))
  const handler = loadHandler()
  const event = makeEvent('customer.subscription.updated', { id: 'sub_1' })
  const res = makeRes()
  await handler(eventReq(event), res)
  assert.equal(res.statusCode, 200)
  assert.equal(getBusiness('biz-1').tier, 'pro')
})

test('a DB failure during subscription sync returns 500 so Stripe retries', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free', stripe_subscription_id: 'sub_1' })
  scenario.forceBusinessesError = true
  setSubscriptionsRetrieve(async (id) => ({ id, status: 'active', customer: 'cus_1', metadata: {} }))
  const handler = loadHandler()
  const event = makeEvent('customer.subscription.updated', { id: 'sub_1' })
  const res = makeRes()
  const { calls } = await withCapturedConsole(() => handler(eventReq(event), res))
  assert.equal(res.statusCode, 500)
  assert.ok(!JSON.stringify(calls).includes('permission denied'))
})

test('replaying the same event twice is idempotent', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'free', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' })
  setSubscriptionsRetrieve(async (id) => ({ id, status: 'active', customer: 'cus_1', metadata: {} }))
  const handler = loadHandler()
  const event = makeEvent('customer.subscription.updated', { id: 'sub_1' })
  const res1 = makeRes()
  await handler(eventReq(event), res1)
  const res2 = makeRes()
  await handler(eventReq(event), res2)
  assert.equal(res1.statusCode, 200)
  assert.equal(res2.statusCode, 200)
  assert.equal(scenario.tables.businesses.length, 1)
  assert.equal(getBusiness('biz-1').tier, 'pro')
})

test('an out-of-order updated event cannot resurrect a subscription a later deleted event already revoked', async () => {
  resetScenario()
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'pro', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' })
  // Authoritative state is always re-fetched from Stripe and is canceled for both events,
  // regardless of which event type triggered the sync.
  setSubscriptionsRetrieve(async (id) => ({ id, status: 'canceled', customer: 'cus_1', metadata: {} }))
  const handler = loadHandler()

  const deletedEvent = makeEvent('customer.subscription.deleted', { id: 'sub_1' }, { id: 'evt_deleted' })
  const res1 = makeRes()
  await handler(eventReq(deletedEvent), res1)
  assert.equal(res1.statusCode, 200)
  assert.equal(getBusiness('biz-1').tier, 'free')

  const staleUpdatedEvent = makeEvent('customer.subscription.updated', { id: 'sub_1' }, { id: 'evt_stale_updated' })
  const res2 = makeRes()
  await handler(eventReq(staleUpdatedEvent), res2)
  assert.equal(res2.statusCode, 200)
  assert.equal(getBusiness('biz-1').tier, 'free', 'must not be resurrected by the stale updated event')
})

test('a late deletion event for a replaced subscription cannot downgrade the current one', async () => {
  resetScenario()
  // Business already switched from sub_A to sub_B (e.g. resubscribed); sub_A is stale.
  addBusiness({ id: 'biz-1', user_id: 'user-1', tier: 'pro', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_B' })
  setSubscriptionsRetrieve(async (id) => ({ id, status: 'canceled', customer: 'cus_1', metadata: {} }))
  const handler = loadHandler()
  const lateDeleted = makeEvent('customer.subscription.deleted', { id: 'sub_A' })
  const res = makeRes()
  await handler(eventReq(lateDeleted), res)
  assert.equal(res.statusCode, 200)
  assert.equal(getBusiness('biz-1').tier, 'pro')
  assert.equal(getBusiness('biz-1').stripe_subscription_id, 'sub_B')
})

test('metadata that does not match the root business user_id is blocked, not granted', async () => {
  resetScenario()
  addBusiness({ id: 'biz-2', user_id: 'owner-real', tier: 'free' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'active',
    customer: 'cus_2',
    metadata: { source: 'pro_subscription', business_id: 'biz-2', supabase_user_id: 'attacker-id' },
  }))
  const handler = loadHandler()
  const event = makeEvent('customer.subscription.created', { id: 'sub_new' })
  const res = makeRes()
  await handler(eventReq(event), res)
  assert.equal(res.statusCode, 200)
  assert.equal(getBusiness('biz-2').tier, 'free')
  assert.equal(getBusiness('biz-2').stripe_subscription_id, null)
})

test('an unrelated Stripe subscription without ReviewFlo metadata is ignored, not treated as an error', async () => {
  resetScenario()
  setSubscriptionsRetrieve(async (id) => ({ id, status: 'active', customer: 'cus_unrelated', metadata: {} }))
  const handler = loadHandler()
  const event = makeEvent('customer.subscription.created', { id: 'sub_unrelated' })
  const res = makeRes()
  await handler(eventReq(event), res)
  assert.equal(res.statusCode, 200)
  assert.equal(scenario.tables.businesses.length, 0)
})

test('a subscription on a legacy/old price stays correct and is not migrated or reset', async () => {
  resetScenario()
  addBusiness({ id: 'biz-3', user_id: 'user-3', tier: 'pro', stripe_customer_id: 'cus_3', stripe_subscription_id: 'sub_oldprice' })
  setSubscriptionsRetrieve(async (id) => ({ id, status: 'active', customer: 'cus_3', metadata: {} }))
  const handler = loadHandler()
  const event = makeEvent('customer.subscription.updated', { id: 'sub_oldprice' })
  const res = makeRes()
  await handler(eventReq(event), res)
  assert.equal(res.statusCode, 200)
  assert.equal(getBusiness('biz-3').tier, 'pro')
  assert.equal(getBusiness('biz-3').stripe_subscription_id, 'sub_oldprice')
  assert.equal(getBusiness('biz-3').stripe_customer_id, 'cus_3')
})

test('past_due keeps the current grace-period Pro access', async () => {
  resetScenario()
  addBusiness({ id: 'biz-4', user_id: 'user-4', tier: 'pro', stripe_customer_id: 'cus_4', stripe_subscription_id: 'sub_pd' })
  setSubscriptionsRetrieve(async (id) => ({ id, status: 'past_due', customer: 'cus_4', metadata: {} }))
  const handler = loadHandler()
  const event = makeEvent('customer.subscription.updated', { id: 'sub_pd' })
  const res = makeRes()
  await handler(eventReq(event), res)
  assert.equal(res.statusCode, 200)
  assert.equal(getBusiness('biz-4').tier, 'pro')
})

test('incomplete/unpaid subscriptions are never granted, even with valid app metadata', async () => {
  resetScenario()
  addBusiness({ id: 'biz-5', user_id: 'user-5', tier: 'free' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'incomplete',
    customer: 'cus_5',
    metadata: { source: 'pro_subscription', business_id: 'biz-5', supabase_user_id: 'user-5' },
  }))
  const handler = loadHandler()
  const event = makeEvent('customer.subscription.created', { id: 'sub_incomplete' })
  const res = makeRes()
  await handler(eventReq(event), res)
  assert.equal(res.statusCode, 200)
  assert.equal(getBusiness('biz-5').tier, 'free')
})

test('admin-granted Pro/AI overrides are preserved and never wiped by webhook sync', async () => {
  resetScenario()
  addBusiness({
    id: 'biz-6',
    user_id: 'user-6',
    tier: 'pro',
    admin_override: true,
    stripe_customer_id: 'cus_6',
    stripe_subscription_id: 'sub_admin',
  })
  setSubscriptionsRetrieve(async (id) => ({ id, status: 'canceled', customer: 'cus_6', metadata: {} }))
  const handler = loadHandler()
  const event = makeEvent('customer.subscription.deleted', { id: 'sub_admin' })
  const res = makeRes()
  await handler(eventReq(event), res)
  assert.equal(res.statusCode, 200)
  const row = getBusiness('biz-6')
  assert.equal(row.tier, 'pro')
  assert.equal(row.admin_override, true)
  assert.equal(row.stripe_subscription_id, 'sub_admin')
})

// ===========================================================================
// checkout.session.completed
// ===========================================================================
test('checkout.session.completed grants pro based on live subscription state, including no_payment_required promos', async () => {
  resetScenario()
  addBusiness({ id: 'biz-7', user_id: 'user-7', tier: 'free' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'trialing',
    customer: 'cus_7',
    metadata: { source: 'pro_subscription', business_id: 'biz-7', supabase_user_id: 'user-7' },
  }))
  const handler = loadHandler()
  const session = {
    id: 'cs_1',
    subscription: 'sub_promo',
    payment_status: 'no_payment_required',
    metadata: { source: 'pro_subscription', business_id: 'biz-7', supabase_user_id: 'user-7' },
  }
  const event = makeEvent('checkout.session.completed', session)
  const res = makeRes()
  await handler(eventReq(event), res)
  assert.equal(res.statusCode, 200)
  assert.equal(getBusiness('biz-7').tier, 'pro')
})

test('checkout.session.completed does not grant pro when the live subscription is not yet active', async () => {
  resetScenario()
  addBusiness({ id: 'biz-8', user_id: 'user-8', tier: 'free' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'incomplete',
    customer: 'cus_8',
    metadata: { source: 'pro_subscription', business_id: 'biz-8', supabase_user_id: 'user-8' },
  }))
  const handler = loadHandler()
  const session = { id: 'cs_2', subscription: 'sub_pending', payment_status: 'paid', metadata: {} }
  const event = makeEvent('checkout.session.completed', session)
  const res = makeRes()
  await handler(eventReq(event), res)
  assert.equal(res.statusCode, 200)
  assert.equal(getBusiness('biz-8').tier, 'free')
})

test('checkout.session.completed still processes legacy early-access one-time payments', async () => {
  resetScenario()
  const handler = loadHandler()
  const session = {
    id: 'cs_ea',
    subscription: null,
    customer_details: { email: 'customer@example.test' },
    metadata: { source: 'early_access' },
    amount_total: 1000,
    currency: 'usd',
    payment_status: 'paid',
  }
  const event = makeEvent('checkout.session.completed', session)
  const res = makeRes()
  await handler(eventReq(event), res)
  assert.equal(res.statusCode, 200)
  assert.equal(scenario.tables.early_access_customers.length, 1)
  assert.equal(scenario.tables.early_access_customers[0].email, 'customer@example.test')
})

// ===========================================================================
// invoice.payment_failed — Clover `parent.subscription_details.subscription`
// ===========================================================================
test('invoice.payment_failed reads the subscription id from the Clover parent field, not the legacy field', async () => {
  resetScenario()
  addBusiness({ id: 'biz-9', user_id: 'user-9', tier: 'free', stripe_subscription_id: 'sub_from_parent' })
  setSubscriptionsRetrieve(async (id) => ({ id, status: 'active', customer: 'cus_9', metadata: {} }))
  const handler = loadHandler()
  const invoice = {
    id: 'in_1',
    subscription: 'sub_wrong_legacy_field',
    parent: { subscription_details: { subscription: 'sub_from_parent' } },
  }
  const event = makeEvent('invoice.payment_failed', invoice)
  const res = makeRes()
  const { calls } = await withCapturedConsole(() => handler(eventReq(event), res))
  assert.equal(res.statusCode, 200)
  assert.ok(retrieveCalls.includes('sub_from_parent'))
  assert.ok(!retrieveCalls.includes('sub_wrong_legacy_field'))
  assert.equal(getBusiness('biz-9').tier, 'pro')
  // Structured logging only — no raw invoice payload dumped.
  assert.ok(!JSON.stringify(calls).includes('sub_wrong_legacy_field'))
})

// ===========================================================================
// lib/stripe-subscription-sync.ts — direct unit tests of the injectable helper
// ===========================================================================
test('syncSubscriptionById attaches a new mapping when the root business has no current subscription', async () => {
  resetScenario()
  addBusiness({ id: 'biz-10', user_id: 'user-10', tier: 'free' })
  const { syncSubscriptionById } = require('../lib/stripe-subscription-sync.ts')
  const stripe = {
    subscriptions: {
      retrieve: async (id) => ({
        id,
        status: 'active',
        customer: 'cus_10',
        metadata: { source: 'pro_subscription', business_id: 'biz-10', supabase_user_id: 'user-10' },
      }),
    },
  }
  const result = await syncSubscriptionById({ supabase: fakeSupabaseClient, stripe }, 'sub_new_10', {
    eventId: 'evt_x',
    eventType: 'customer.subscription.created',
  })
  assert.equal(result.ok, true)
  assert.equal(result.action, 'attached')
  assert.equal(getBusiness('biz-10').tier, 'pro')
})

test('syncSubscriptionById refuses to replace a different, currently active subscription on the same root', async () => {
  resetScenario()
  addBusiness({ id: 'biz-11', user_id: 'user-11', tier: 'pro', stripe_subscription_id: 'sub_existing_active' })
  const { syncSubscriptionById } = require('../lib/stripe-subscription-sync.ts')
  const stripe = {
    subscriptions: {
      retrieve: async (id) => {
        if (id === 'sub_existing_active') return { id, status: 'active', customer: 'cus_11', metadata: {} }
        return {
          id,
          status: 'active',
          customer: 'cus_11',
          metadata: { source: 'pro_subscription', business_id: 'biz-11', supabase_user_id: 'user-11' },
        }
      },
    },
  }
  const result = await syncSubscriptionById({ supabase: fakeSupabaseClient, stripe }, 'sub_duplicate', {
    eventId: 'evt_y',
    eventType: 'customer.subscription.created',
  })
  assert.equal(result.ok, true)
  assert.equal(result.action, 'ignored')
  assert.equal(getBusiness('biz-11').stripe_subscription_id, 'sub_existing_active')
})

test('syncSubscriptionById safely overwrites a stale cancelled previous subscription on the same root', async () => {
  resetScenario()
  addBusiness({ id: 'biz-12', user_id: 'user-12', tier: 'free', stripe_subscription_id: 'sub_stale_cancelled' })
  const { syncSubscriptionById } = require('../lib/stripe-subscription-sync.ts')
  const stripe = {
    subscriptions: {
      retrieve: async (id) => {
        if (id === 'sub_stale_cancelled') return { id, status: 'canceled', customer: 'cus_12', metadata: {} }
        return {
          id,
          status: 'active',
          customer: 'cus_12',
          metadata: { source: 'pro_subscription', business_id: 'biz-12', supabase_user_id: 'user-12' },
        }
      },
    },
  }
  const result = await syncSubscriptionById({ supabase: fakeSupabaseClient, stripe }, 'sub_replacement', {
    eventId: 'evt_z',
    eventType: 'customer.subscription.created',
  })
  assert.equal(result.ok, true)
  assert.equal(result.action, 'attached')
  assert.equal(getBusiness('biz-12').stripe_subscription_id, 'sub_replacement')
  assert.equal(getBusiness('biz-12').tier, 'pro')
})

test('syncSubscriptionById propagates a Stripe retrieve failure as a retryable error', async () => {
  resetScenario()
  const { syncSubscriptionById } = require('../lib/stripe-subscription-sync.ts')
  const stripe = {
    subscriptions: {
      retrieve: async () => {
        throw new Error('network error')
      },
    },
  }
  const result = await syncSubscriptionById({ supabase: fakeSupabaseClient, stripe }, 'sub_unreachable', {
    eventId: 'evt_w',
    eventType: 'customer.subscription.updated',
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'stripe_retrieve_failed')
})

// ===========================================================================
// Compare-and-set races on an already-mapped row
// ===========================================================================

// A single-row `businesses` double whose `update()` calls can be intercepted so a test can
// simulate a concurrent write landing between the sync's initial read and its CAS update.
function makeConcurrentSupabase(initialRow, { forceEmptyUpdateOnce = false, mutateOnFirstUpdate } = {}) {
  const row = { ...initialRow }
  let updateCallCount = 0
  let emptyOnceConsumed = false

  function matches(filters) {
    return filters.every(([k, v]) => (row[k] ?? null) === v)
  }

  function builder() {
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
      eq(k, v) {
        filters.push([k, v])
        return q
      },
      is(k, v) {
        filters.push([k, v])
        return q
      },
      maybeSingle() {
        return Promise.resolve({ data: matches(filters) ? { ...row } : null, error: null })
      },
      then(onResolve, onReject) {
        let result
        if (mode === 'update') {
          updateCallCount++
          if (mutateOnFirstUpdate && updateCallCount === 1) mutateOnFirstUpdate(row)
          if (forceEmptyUpdateOnce && !emptyOnceConsumed && updateCallCount === 1) {
            emptyOnceConsumed = true
            result = { data: [], error: null }
          } else if (matches(filters)) {
            Object.assign(row, payload)
            result = { data: [{ id: row.id }], error: null }
          } else {
            result = { data: [], error: null }
          }
        } else {
          result = { data: matches(filters) ? [{ ...row }] : [], error: null }
        }
        return Promise.resolve(result).then(onResolve, onReject)
      },
    }
    return q
  }

  return { from: () => builder(), row }
}

test('syncSubscriptionById retries a transient CAS conflict against the same observed state and succeeds', async () => {
  const { syncSubscriptionById } = require('../lib/stripe-subscription-sync.ts')
  const supabase = makeConcurrentSupabase(
    {
      id: 'biz-20',
      user_id: 'user-20',
      tier: 'free',
      admin_override: false,
      stripe_customer_id: null,
      stripe_subscription_id: 'sub_20',
      parent_business_id: null,
    },
    { forceEmptyUpdateOnce: true }
  )
  const stripe = { subscriptions: { retrieve: async (id) => ({ id, status: 'active', customer: 'cus_20', metadata: {} }) } }
  const result = await syncSubscriptionById({ supabase, stripe }, 'sub_20', {
    eventId: 'evt_cas',
    eventType: 'customer.subscription.updated',
  })
  assert.equal(result.ok, true)
  assert.equal(result.action, 'granted')
  assert.equal(supabase.row.tier, 'pro')
})

test('an admin override granted while a mapped-row update is in flight wins the race and is preserved', async () => {
  const { syncSubscriptionById } = require('../lib/stripe-subscription-sync.ts')
  const supabase = makeConcurrentSupabase(
    {
      id: 'biz-21',
      user_id: 'user-21',
      tier: 'pro',
      admin_override: false,
      stripe_customer_id: 'cus_21',
      stripe_subscription_id: 'sub_21',
      parent_business_id: null,
    },
    {
      mutateOnFirstUpdate: (row) => {
        row.admin_override = true
      },
    }
  )
  const stripe = { subscriptions: { retrieve: async (id) => ({ id, status: 'canceled', customer: 'cus_21', metadata: {} }) } }
  const result = await syncSubscriptionById({ supabase, stripe }, 'sub_21', {
    eventId: 'evt_admin_race',
    eventType: 'customer.subscription.deleted',
  })
  assert.equal(result.ok, true)
  assert.equal(result.action, 'no_change')
  assert.equal(supabase.row.admin_override, true)
  assert.equal(supabase.row.tier, 'pro', 'the in-flight admin override must not be downgraded by the losing update')
})

// ===========================================================================
// Data-corruption guards: duplicate / non-root mapped rows, child metadata
// ===========================================================================
test('two businesses mapped to the same subscription id is treated as data corruption, not resolved silently', async () => {
  resetScenario()
  addBusiness({ id: 'biz-dup-a', user_id: 'user-a', tier: 'pro', stripe_subscription_id: 'sub_dup' })
  addBusiness({ id: 'biz-dup-b', user_id: 'user-b', tier: 'free', stripe_subscription_id: 'sub_dup' })
  const { syncSubscriptionById } = require('../lib/stripe-subscription-sync.ts')
  const stripe = { subscriptions: { retrieve: async (id) => ({ id, status: 'active', customer: 'cus_dup', metadata: {} }) } }
  const result = await syncSubscriptionById({ supabase: fakeSupabaseClient, stripe }, 'sub_dup', {
    eventId: 'evt_dup',
    eventType: 'customer.subscription.updated',
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'db_error')
})

test('a mapped row that is itself a child business is rejected rather than silently updated', async () => {
  resetScenario()
  addBusiness({ id: 'biz-parent', user_id: 'user-p', tier: 'pro' })
  addBusiness({
    id: 'biz-child',
    user_id: 'user-p',
    tier: 'free',
    parent_business_id: 'biz-parent',
    stripe_subscription_id: 'sub_child',
  })
  const { syncSubscriptionById } = require('../lib/stripe-subscription-sync.ts')
  const stripe = { subscriptions: { retrieve: async (id) => ({ id, status: 'active', customer: 'cus_child', metadata: {} }) } }
  const result = await syncSubscriptionById({ supabase: fakeSupabaseClient, stripe }, 'sub_child', {
    eventId: 'evt_child',
    eventType: 'customer.subscription.updated',
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'db_error')
  assert.equal(getBusiness('biz-child').tier, 'free')
})

test('attach metadata pointing at a child business (not the root) is rejected, not attached', async () => {
  resetScenario()
  addBusiness({ id: 'biz-root-22', user_id: 'user-22', tier: 'free' })
  addBusiness({ id: 'biz-child-22', user_id: 'user-22', tier: 'free', parent_business_id: 'biz-root-22' })
  const { syncSubscriptionById } = require('../lib/stripe-subscription-sync.ts')
  const stripe = {
    subscriptions: {
      retrieve: async (id) => ({
        id,
        status: 'active',
        customer: 'cus_22',
        metadata: { source: 'pro_subscription', business_id: 'biz-child-22', supabase_user_id: 'user-22' },
      }),
    },
  }
  const result = await syncSubscriptionById({ supabase: fakeSupabaseClient, stripe }, 'sub_child_meta', {
    eventId: 'evt_child_meta',
    eventType: 'customer.subscription.created',
  })
  assert.equal(result.ok, true)
  assert.equal(result.action, 'ignored')
  assert.equal(getBusiness('biz-child-22').tier, 'free')
  assert.equal(getBusiness('biz-child-22').stripe_subscription_id, null)
})

// ===========================================================================
// Post-attach reconciliation (the bounded re-verify immediately after attach)
// ===========================================================================
test('a cancellation that races the attach is caught by post-attach reconciliation and revokes access', async () => {
  resetScenario()
  addBusiness({ id: 'biz-23', user_id: 'user-23', tier: 'free' })
  let retrieveCount = 0
  const { syncSubscriptionById } = require('../lib/stripe-subscription-sync.ts')
  const stripe = {
    subscriptions: {
      retrieve: async (id) => {
        retrieveCount++
        // First read (drives the attach decision) sees an active subscription; the second read,
        // immediately after attaching, sees it already canceled (a cancellation raced us).
        const status = retrieveCount === 1 ? 'active' : 'canceled'
        return {
          id,
          status,
          customer: 'cus_23',
          metadata: { source: 'pro_subscription', business_id: 'biz-23', supabase_user_id: 'user-23' },
        }
      },
    },
  }
  const result = await syncSubscriptionById({ supabase: fakeSupabaseClient, stripe }, 'sub_23', {
    eventId: 'evt_23',
    eventType: 'customer.subscription.created',
  })
  assert.equal(result.ok, true)
  assert.equal(result.action, 'downgraded')
  assert.equal(getBusiness('biz-23').tier, 'free')
  assert.equal(getBusiness('biz-23').stripe_subscription_id, null)
  assert.equal(retrieveCount, 2)
})

test('an admin override granted between attach and post-attach reconciliation survives the revoke check', async () => {
  resetScenario()
  addBusiness({ id: 'biz-24', user_id: 'user-24', tier: 'free' })
  let retrieveCount = 0
  const { syncSubscriptionById } = require('../lib/stripe-subscription-sync.ts')
  const stripe = {
    subscriptions: {
      retrieve: async (id) => {
        retrieveCount++
        if (retrieveCount === 2) {
          // Between the attach and the reconcile refetch, an admin granted an override out of
          // band; the reconcile revoke must not clobber it even though Stripe now reports
          // canceled.
          const row = getBusiness('biz-24')
          if (row) row.admin_override = true
        }
        const status = retrieveCount === 1 ? 'active' : 'canceled'
        return {
          id,
          status,
          customer: 'cus_24',
          metadata: { source: 'pro_subscription', business_id: 'biz-24', supabase_user_id: 'user-24' },
        }
      },
    },
  }
  const result = await syncSubscriptionById({ supabase: fakeSupabaseClient, stripe }, 'sub_24', {
    eventId: 'evt_24',
    eventType: 'customer.subscription.created',
  })
  assert.equal(result.ok, true)
  assert.equal(result.action, 'attached')
  assert.equal(getBusiness('biz-24').admin_override, true)
  assert.equal(getBusiness('biz-24').tier, 'pro', 'the admin-granted override must not be revoked by the reconcile check')
})

test('a Stripe retrieve failure during post-attach reconciliation is reported as retryable, not silently attached', async () => {
  resetScenario()
  addBusiness({ id: 'biz-25', user_id: 'user-25', tier: 'free' })
  let retrieveCount = 0
  const { syncSubscriptionById } = require('../lib/stripe-subscription-sync.ts')
  const stripe = {
    subscriptions: {
      retrieve: async (id) => {
        retrieveCount++
        if (retrieveCount === 2) throw new Error('network error')
        return {
          id,
          status: 'active',
          customer: 'cus_25',
          metadata: { source: 'pro_subscription', business_id: 'biz-25', supabase_user_id: 'user-25' },
        }
      },
    },
  }
  const result = await syncSubscriptionById({ supabase: fakeSupabaseClient, stripe }, 'sub_25', {
    eventId: 'evt_25',
    eventType: 'customer.subscription.created',
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'stripe_retrieve_failed')
})

// ===========================================================================
// Transport-level failure modes and dependency wiring
// ===========================================================================
test('webhook returns a controlled 400 (not a crash) when the raw request body cannot be read', async () => {
  resetScenario()
  const handler = loadHandler()
  const req = {
    method: 'POST',
    headers: { 'stripe-signature': 'valid-signature' },
    async *[Symbol.asyncIterator]() {
      throw new Error('socket hang up')
    },
  }
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
})

// ===========================================================================
// Server-side analytics: checkout_completed (checkout.session.completed) and
// checkout_failed (invoice.payment_failed), captured via lib/billing-analytics.ts
// ===========================================================================
async function withPostHogFetch(fn) {
  return withEnv({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_test', NEXT_PUBLIC_POSTHOG_HOST: 'https://us.posthog.com' }, async () => {
    const calls = []
    const originalFetch = global.fetch
    global.fetch = async (url, init) => {
      calls.push({ url, init })
      return { ok: true, status: 200 }
    }
    try {
      return await fn(calls)
    } finally {
      global.fetch = originalFetch
    }
  })
}

test('checkout.session.completed emits authoritative checkout_completed after a successful paid sync, keyed by session id/created', async () => {
  resetScenario()
  addBusiness({ id: 'biz-30', user_id: 'user-30', tier: 'free' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'active',
    customer: 'cus_30',
    metadata: { source: 'pro_subscription', business_id: 'biz-30', supabase_user_id: 'user-30' },
  }))

  await withPostHogFetch(async (calls) => {
    const handler = loadHandler()
    const session = {
      id: 'cs_30',
      subscription: 'sub_30',
      mode: 'subscription',
      payment_status: 'paid',
      created: 1700000000,
      metadata: {
        source: 'pro_subscription',
        business_id: 'biz-30',
        supabase_user_id: 'user-30',
        billing_interval: 'year',
        utm_source: 'google',
      },
    }
    const event = makeEvent('checkout.session.completed', session)
    const res = makeRes()
    await handler(eventReq(event), res)

    assert.equal(res.statusCode, 200)
    assert.equal(getBusiness('biz-30').tier, 'pro')
    assert.equal(calls.length, 1)
    const body = JSON.parse(calls[0].init.body)
    assert.equal(body.event, 'checkout_completed')
    assert.equal(body.distinct_id, 'user-30')
    assert.deepEqual(body.properties, { plan: 'pro', billing_interval: 'year', utm_source: 'google' })
    assert.equal(body.timestamp, new Date(1700000000 * 1000).toISOString())
  })
})

test('replaying the same checkout.session.completed event twice produces the same checkout_completed uuid/timestamp', async () => {
  resetScenario()
  addBusiness({ id: 'biz-31', user_id: 'user-31', tier: 'free' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'active',
    customer: 'cus_31',
    metadata: { source: 'pro_subscription', business_id: 'biz-31', supabase_user_id: 'user-31' },
  }))

  await withPostHogFetch(async (calls) => {
    const handler = loadHandler()
    const session = {
      id: 'cs_31',
      subscription: 'sub_31',
      mode: 'subscription',
      payment_status: 'paid',
      created: 1700000100,
      metadata: { source: 'pro_subscription', business_id: 'biz-31', supabase_user_id: 'user-31' },
    }
    // Two distinct Stripe event ids (original + a replay/redelivery) wrapping the same session.
    const event1 = makeEvent('checkout.session.completed', session, { id: 'evt_replay_1' })
    const event2 = makeEvent('checkout.session.completed', session, { id: 'evt_replay_2' })
    await handler(eventReq(event1), makeRes())
    await handler(eventReq(event2), makeRes())

    assert.equal(calls.length, 2)
    const body1 = JSON.parse(calls[0].init.body)
    const body2 = JSON.parse(calls[1].init.body)
    assert.equal(body1.uuid, body2.uuid, 'dedupe key must be derived from the session, not the webhook event id')
    assert.equal(body1.timestamp, body2.timestamp)
  })
})

test('checkout.session.completed still emits checkout_completed when customer.subscription.created already synced it first (no_change), verified against the real DB row', async () => {
  resetScenario()
  addBusiness({ id: 'biz-40', user_id: 'user-40', tier: 'free' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'active',
    customer: 'cus_40',
    metadata: {
      source: 'pro_subscription',
      business_id: 'biz-40',
      supabase_user_id: 'user-40',
      billing_interval: 'month',
    },
  }))

  await withPostHogFetch(async (calls) => {
    const handler = loadHandler()

    // subscription.created arrives first and performs the actual attach.
    const createdEvent = makeEvent('customer.subscription.created', { id: 'sub_40' }, { id: 'evt_sub_created_40' })
    const res1 = makeRes()
    await handler(eventReq(createdEvent), res1)
    assert.equal(res1.statusCode, 200)
    assert.equal(getBusiness('biz-40').tier, 'pro')
    assert.equal(calls.length, 0, 'subscription.created alone must never emit checkout_completed')

    // checkout.session.completed arrives moments later and now only sees `no_change`.
    const session = {
      id: 'cs_40',
      subscription: 'sub_40',
      mode: 'subscription',
      payment_status: 'paid',
      created: 1700000700,
      metadata: {
        source: 'pro_subscription',
        business_id: 'biz-40',
        supabase_user_id: 'user-40',
        billing_interval: 'month',
      },
    }
    const completedEvent = makeEvent('checkout.session.completed', session, { id: 'evt_checkout_completed_40' })
    const res2 = makeRes()
    await handler(eventReq(completedEvent), res2)

    assert.equal(res2.statusCode, 200)
    assert.equal(calls.length, 1, 'the real conversion must still be captured once the authoritative session arrives')
    const body = JSON.parse(calls[0].init.body)
    assert.equal(body.event, 'checkout_completed')
    assert.equal(body.distinct_id, 'user-40')
    assert.equal(body.properties.billing_interval, 'month')
  })
})

test('checkout_completed is never emitted for a no_change sync when the session metadata does not match the real DB row', async () => {
  resetScenario()
  // The real, paid business — synced earlier by subscription.created under its own identity.
  addBusiness({ id: 'biz-41', user_id: 'real-owner', tier: 'free' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'active',
    customer: 'cus_41',
    metadata: { source: 'pro_subscription', business_id: 'biz-41', supabase_user_id: 'real-owner' },
  }))

  await withPostHogFetch(async (calls) => {
    const handler = loadHandler()
    const createdEvent = makeEvent('customer.subscription.created', { id: 'sub_41' }, { id: 'evt_sub_created_41' })
    await handler(eventReq(createdEvent), makeRes())
    assert.equal(getBusiness('biz-41').tier, 'pro')

    // A checkout.session.completed replay/forgery claiming a different owner/business for the
    // same subscription must not piggyback on the real row's paid state.
    const session = {
      id: 'cs_41',
      subscription: 'sub_41',
      mode: 'subscription',
      payment_status: 'paid',
      created: 1700000800,
      metadata: {
        source: 'pro_subscription',
        business_id: 'biz-other-41',
        supabase_user_id: 'attacker-41',
        billing_interval: 'month',
      },
    }
    const completedEvent = makeEvent('checkout.session.completed', session, { id: 'evt_checkout_completed_41' })
    const res = makeRes()
    await handler(eventReq(completedEvent), res)

    assert.equal(res.statusCode, 200)
    assert.equal(calls.length, 0, 'mismatched session business/owner metadata must never ride along with an unrelated no_change result')
  })
})

test('checkout_completed is never emitted for a no_change sync caused by a preserved admin override', async () => {
  resetScenario()
  addBusiness({
    id: 'biz-42',
    user_id: 'user-42',
    tier: 'pro',
    admin_override: true,
    stripe_customer_id: 'cus_42',
    stripe_subscription_id: 'sub_42',
  })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'active',
    customer: 'cus_42',
    metadata: {
      source: 'pro_subscription',
      business_id: 'biz-42',
      supabase_user_id: 'user-42',
      billing_interval: 'month',
    },
  }))

  await withPostHogFetch(async (calls) => {
    const handler = loadHandler()
    const session = {
      id: 'cs_42',
      subscription: 'sub_42',
      mode: 'subscription',
      payment_status: 'paid',
      created: 1700000900,
      metadata: {
        source: 'pro_subscription',
        business_id: 'biz-42',
        supabase_user_id: 'user-42',
        billing_interval: 'month',
      },
    }
    const event = makeEvent('checkout.session.completed', session)
    const res = makeRes()
    await handler(eventReq(event), res)

    assert.equal(res.statusCode, 200)
    assert.equal(getBusiness('biz-42').admin_override, true)
    assert.equal(calls.length, 0, 'an admin-granted override must never be reported as a paid checkout conversion')
  })
})

test('checkout_completed is never emitted for an ignored sync (unrelated/ownership-mismatched subscription)', async () => {
  resetScenario()
  addBusiness({ id: 'biz-32', user_id: 'owner-real', tier: 'free' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'active',
    customer: 'cus_32',
    metadata: { source: 'pro_subscription', business_id: 'biz-32', supabase_user_id: 'attacker-id' },
  }))

  await withPostHogFetch(async (calls) => {
    const handler = loadHandler()
    const session = {
      id: 'cs_32',
      subscription: 'sub_32',
      mode: 'subscription',
      payment_status: 'paid',
      created: 1700000200,
      metadata: { source: 'pro_subscription', business_id: 'biz-32', supabase_user_id: 'attacker-id' },
    }
    const event = makeEvent('checkout.session.completed', session)
    const res = makeRes()
    await handler(eventReq(event), res)

    assert.equal(res.statusCode, 200)
    assert.equal(getBusiness('biz-32').tier, 'free')
    assert.equal(calls.length, 0, 'no checkout_completed for an ignored sync outcome')
  })
})

test('checkout_completed is never emitted when the live subscription does not yet grant pro', async () => {
  resetScenario()
  addBusiness({ id: 'biz-33', user_id: 'user-33', tier: 'free' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'incomplete',
    customer: 'cus_33',
    metadata: { source: 'pro_subscription', business_id: 'biz-33', supabase_user_id: 'user-33' },
  }))

  await withPostHogFetch(async (calls) => {
    const handler = loadHandler()
    const session = {
      id: 'cs_33',
      subscription: 'sub_33',
      mode: 'subscription',
      payment_status: 'paid',
      created: 1700000300,
      metadata: { source: 'pro_subscription', business_id: 'biz-33', supabase_user_id: 'user-33' },
    }
    const event = makeEvent('checkout.session.completed', session)
    const res = makeRes()
    await handler(eventReq(event), res)

    assert.equal(res.statusCode, 200)
    assert.equal(getBusiness('biz-33').tier, 'free')
    assert.equal(calls.length, 0)
  })
})

test('an analytics fetch rejection during checkout.session.completed never turns a successful sync into a webhook failure', async () => {
  resetScenario()
  addBusiness({ id: 'biz-34', user_id: 'user-34', tier: 'free' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'active',
    customer: 'cus_34',
    metadata: { source: 'pro_subscription', business_id: 'biz-34', supabase_user_id: 'user-34' },
  }))

  await withEnv({ NEXT_PUBLIC_POSTHOG_KEY: 'phc_test', NEXT_PUBLIC_POSTHOG_HOST: 'https://us.posthog.com' }, async () => {
    const originalFetch = global.fetch
    global.fetch = async () => {
      throw new Error('simulated PostHog outage')
    }
    try {
      const handler = loadHandler()
      const session = {
        id: 'cs_34',
        subscription: 'sub_34',
        mode: 'subscription',
        payment_status: 'paid',
        created: 1700000400,
        metadata: { source: 'pro_subscription', business_id: 'biz-34', supabase_user_id: 'user-34' },
      }
      const event = makeEvent('checkout.session.completed', session)
      const res = makeRes()
      await handler(eventReq(event), res)
      assert.equal(res.statusCode, 200, 'a best-effort analytics failure must still report webhook success')
      assert.equal(getBusiness('biz-34').tier, 'pro')
    } finally {
      global.fetch = originalFetch
    }
  })
})

test('invoice.payment_failed emits checkout_failed with the safe reason payment_failed, using verified subscription metadata', async () => {
  resetScenario()
  addBusiness({ id: 'biz-35', user_id: 'user-35', tier: 'pro', stripe_subscription_id: 'sub_35' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'past_due',
    customer: 'cus_35',
    metadata: {
      source: 'pro_subscription',
      business_id: 'biz-35',
      supabase_user_id: 'user-35',
      billing_interval: 'month',
      utm_source: 'newsletter',
    },
  }))

  await withPostHogFetch(async (calls) => {
    const handler = loadHandler()
    const invoice = { id: 'in_35', parent: { subscription_details: { subscription: 'sub_35' } } }
    const event = makeEvent('invoice.payment_failed', invoice, { id: 'evt_invoice_35', created: 1700000500 })
    const res = makeRes()
    const { calls: consoleCalls } = await withCapturedConsole(() => handler(eventReq(event), res))
    assert.equal(res.statusCode, 200)
    assert.equal(calls.length, 1)
    const body = JSON.parse(calls[0].init.body)
    assert.equal(body.event, 'checkout_failed')
    assert.equal(body.distinct_id, 'user-35')
    assert.deepEqual(body.properties, {
      plan: 'pro',
      billing_interval: 'month',
      utm_source: 'newsletter',
      reason: 'payment_failed',
    })
    assert.equal(body.timestamp, new Date(1700000500 * 1000).toISOString())
    assert.ok(!JSON.stringify(consoleCalls).includes('newsletter'))
  })
})

test('replaying the same invoice.payment_failed event twice produces the same checkout_failed uuid', async () => {
  resetScenario()
  addBusiness({ id: 'biz-36', user_id: 'user-36', tier: 'pro', stripe_subscription_id: 'sub_36' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'past_due',
    customer: 'cus_36',
    metadata: { source: 'pro_subscription', business_id: 'biz-36', supabase_user_id: 'user-36' },
  }))

  await withPostHogFetch(async (calls) => {
    const handler = loadHandler()
    const invoice = { id: 'in_36', parent: { subscription_details: { subscription: 'sub_36' } } }
    const event = makeEvent('invoice.payment_failed', invoice, { id: 'evt_invoice_36', created: 1700000600 })
    await handler(eventReq(event), makeRes())
    await handler(eventReq(event), makeRes())

    assert.equal(calls.length, 2)
    const body1 = JSON.parse(calls[0].init.body)
    const body2 = JSON.parse(calls[1].init.body)
    assert.equal(body1.uuid, body2.uuid)
    assert.equal(body1.timestamp, body2.timestamp)
  })
})

test('invoice.payment_failed never emits checkout_failed when subscription metadata ownership does not match the root business', async () => {
  resetScenario()
  addBusiness({ id: 'biz-37', user_id: 'owner-real', tier: 'pro', stripe_subscription_id: 'sub_37' })
  setSubscriptionsRetrieve(async (id) => ({
    id,
    status: 'past_due',
    customer: 'cus_37',
    metadata: { source: 'pro_subscription', business_id: 'biz-37', supabase_user_id: 'attacker-id' },
  }))

  await withPostHogFetch(async (calls) => {
    const handler = loadHandler()
    const invoice = { id: 'in_37', parent: { subscription_details: { subscription: 'sub_37' } } }
    const event = makeEvent('invoice.payment_failed', invoice, { id: 'evt_invoice_37' })
    const res = makeRes()
    await withCapturedConsole(() => handler(eventReq(event), res))
    assert.equal(res.statusCode, 200)
    assert.equal(calls.length, 0, 'spoofed/mismatched metadata must never drive an analytics identity')
  })
})

test('the Pro subscription webhook path succeeds without RESEND_API_KEY, using the real Resend constructor', async () => {
  resetScenario()
  addBusiness({ id: 'biz-26', user_id: 'user-26', tier: 'free', stripe_customer_id: 'cus_26', stripe_subscription_id: 'sub_26' })
  setSubscriptionsRetrieve(async (id) => ({ id, status: 'active', customer: 'cus_26', metadata: {} }))
  assert.equal(process.env.RESEND_API_KEY, undefined)

  // Swap the real `resend` module back in for this test: the real `Resend` constructor throws
  // without an API key, so if the Pro subscription sync path ever imported/instantiated it,
  // this test would fail loudly instead of silently passing against the fake.
  require.cache[resendPath].exports = { Resend: RealResend }
  try {
    const handler = loadHandler()
    const event = makeEvent('customer.subscription.updated', { id: 'sub_26' })
    const res = makeRes()
    await handler(eventReq(event), res)
    assert.equal(res.statusCode, 200)
    assert.equal(getBusiness('biz-26').tier, 'pro')
  } finally {
    require.cache[resendPath].exports = { Resend: FakeResend }
  }
})
