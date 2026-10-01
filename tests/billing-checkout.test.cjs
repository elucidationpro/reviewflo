'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

// ---------------------------------------------------------------------------
// Fake `stripe` module, installed into require.cache so every file under test
// (billing-errors.ts, stripe-checkout-config.ts, the two checkout handlers)
// gets the exact same fake class hierarchy — no real network calls, no real
// keys, and `instanceof Stripe.errors.X` checks still work correctly.
// ---------------------------------------------------------------------------
class FakeStripeError extends Error {
  constructor(message, props = {}) {
    super(message)
    this.type = props.type
    this.code = props.code
    this.param = props.param
    this.requestId = props.requestId
    this.statusCode = props.statusCode
  }
}
class FakeStripeConnectionError extends FakeStripeError {}
class FakeStripeAuthenticationError extends FakeStripeError {}
class FakeStripePermissionError extends FakeStripeError {}
class FakeStripeInvalidRequestError extends FakeStripeError {}
class FakeStripeRateLimitError extends FakeStripeError {}
class FakeStripeAPIError extends FakeStripeError {}

const VALID_PRO_MONTHLY_PRICE = {
  active: true,
  currency: 'usd',
  unit_amount: 2900,
  recurring: { interval: 'month', interval_count: 1 },
  livemode: false,
}

let stripeImpl = null
function FakeStripeCtor(secretKey, opts) {
  if (!stripeImpl) throw new Error('test bug: stripeImpl not configured before constructing Stripe client')
  return stripeImpl(secretKey, opts)
}
FakeStripeCtor.errors = {
  StripeError: FakeStripeError,
  StripeConnectionError: FakeStripeConnectionError,
  StripeAuthenticationError: FakeStripeAuthenticationError,
  StripePermissionError: FakeStripePermissionError,
  StripeInvalidRequestError: FakeStripeInvalidRequestError,
  StripeRateLimitError: FakeStripeRateLimitError,
  StripeAPIError: FakeStripeAPIError,
}
FakeStripeCtor.createFetchHttpClient = () => ({})

const stripePath = require.resolve('stripe')
require.cache[stripePath] = { id: stripePath, filename: stripePath, loaded: true, exports: FakeStripeCtor }

function makeStripeInstance(overrides = {}) {
  return {
    subscriptions: {
      list: overrides.subscriptionsList || (async () => ({ data: [] })),
      retrieve: overrides.subscriptionsRetrieve || (async () => ({ status: 'canceled' })),
    },
    customers: {
      retrieve: overrides.customersRetrieve || (async () => ({ deleted: true })),
      update: overrides.customersUpdate || (async () => ({})),
    },
    coupons: {
      retrieve: overrides.couponsRetrieve || (async (id) => ({ id })),
      list: overrides.couponsList || (async () => ({ data: [] })),
    },
    promotionCodes: {
      retrieve:
        overrides.promotionCodesRetrieve ||
        (async () => {
          throw new Error('test bug: promotionCodes.retrieve not stubbed for this test')
        }),
    },
    prices: {
      retrieve:
        overrides.pricesRetrieve ||
        (async (id) =>
          id === 'price_pro_annual'
            ? { ...VALID_PRO_MONTHLY_PRICE, id, unit_amount: 29000, recurring: { interval: 'year', interval_count: 1 } }
            : { ...VALID_PRO_MONTHLY_PRICE, id }),
    },
    checkout: {
      sessions: {
        create: overrides.sessionsCreate || (async () => ({ url: 'https://checkout.stripe.com/test-session' })),
      },
    },
  }
}
function setStripeImpl(overrides) {
  stripeImpl = () => makeStripeInstance(overrides)
}
function poisonStripeImpl() {
  stripeImpl = () => {
    throw new Error('test bug: Stripe client should not have been constructed for this scenario')
  }
}

// ---------------------------------------------------------------------------
// Fake `@supabase/supabase-js` module. Driven by a mutable `scenario` object
// so the same client instance (and billing-errors.ts's memoized admin client)
// can serve every test without re-registering a new module per test.
// ---------------------------------------------------------------------------
const scenario = {
  authUser: null,
  authError: null,
  rows: [],
  updateShouldError: false,
  createClientShouldThrow: false,
}

function resetScenario() {
  scenario.authUser = { id: 'user-1', email: 'user@example.test' }
  scenario.authError = null
  scenario.rows = []
  scenario.updateShouldError = false
  scenario.createClientShouldThrow = false
}

function applyFilters(rows, filters) {
  return filters.reduce((acc, [key, value]) => acc.filter((r) => r[key] === value), rows.slice())
}

const RAW_DB_ERROR = { message: 'permission denied for relation businesses', code: '42501' }

function makeQueryBuilder() {
  const filters = []
  let mode = 'select'
  let updatePayload = null

  function finish() {
    if (mode === 'update') {
      if (scenario.updateShouldError) return { error: { ...RAW_DB_ERROR } }
      const rows = applyFilters(scenario.rows, filters)
      for (const row of rows) Object.assign(row, updatePayload)
      return { error: null }
    }
    const idFilter = filters.find(([key]) => key === 'id')
    if (idFilter && idFilter[1] === 'db-error-id') {
      return { data: null, error: { ...RAW_DB_ERROR } }
    }
    return { rows: applyFilters(scenario.rows, filters) }
  }

  const q = {
    select() {
      return q
    },
    update(payload) {
      mode = 'update'
      updatePayload = payload
      return q
    },
    eq(key, value) {
      filters.push([key, value])
      return q
    },
    maybeSingle() {
      const result = finish()
      if ('rows' in result) {
        const { rows } = result
        return Promise.resolve({ data: rows.length === 1 ? { ...rows[0] } : null, error: null })
      }
      return Promise.resolve(result)
    },
    then(onResolve, onReject) {
      const result = finish()
      if ('rows' in result) {
        return Promise.resolve({ data: result.rows.map((r) => ({ ...r })), error: null }).then(onResolve, onReject)
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
  if (scenario.createClientShouldThrow) throw new Error('supabase client init failed (raw, must never be logged)')
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
process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_pro_monthly'
process.env.STRIPE_PRO_ANNUAL_PRICE_ID = 'price_pro_annual'
delete process.env.STRIPE_PRO_PRICE_ID
delete process.env.VERCEL_ENV
delete process.env.CHECKOUT_BASE_URL
delete process.env.STRIPE_LAUNCH_COUPON_ID
delete process.env.STRIPE_LAUNCH_PROMO_ID

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

function makeReq({ authorization, body, method = 'POST', origin } = {}) {
  return {
    method,
    headers: { ...(authorization ? { authorization } : {}), ...(origin ? { origin } : {}) },
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

function loadCreateCheckoutSession() {
  return require('../pages/api/create-checkout-session.ts').default
}
function loadCreateEarlyAccessCheckout() {
  return require('../pages/api/create-early-access-checkout.ts').default
}

// ===========================================================================
// lib/billing-errors.ts — redaction unit tests
// ===========================================================================
test('billingLogFields never surfaces a raw error message for DB-style errors', () => {
  const { billingLogFields } = require('../lib/billing-errors.ts')
  const dbError = new Error('permission denied for relation businesses: role "app" violates policy')
  dbError.code = '42501'
  const fields = billingLogFields('scope.test', 'req-1', dbError)
  const serialized = JSON.stringify(fields)
  assert.ok(!serialized.includes('permission denied'))
  assert.equal(fields.errorCode, '42501')
})

test('billingLogFields captures only structured Stripe fields, never the raw Stripe message', () => {
  const { billingLogFields } = require('../lib/billing-errors.ts')
  const err = new FakeStripeInvalidRequestError('Customer cus_secret123 has no attached payment method', {
    type: 'StripeInvalidRequestError',
    code: 'resource_missing',
    param: 'customer',
    requestId: 'req_abc',
    statusCode: 400,
  })
  const fields = billingLogFields('scope.test', 'req-1', err)
  const serialized = JSON.stringify(fields)
  assert.ok(!serialized.includes('cus_secret123'))
  assert.ok(!serialized.includes('has no attached payment method'))
  assert.equal(fields.stripeCode, 'resource_missing')
  assert.equal(fields.stripeParam, 'customer')
})

test('billingError only emits fixed, non-leaking customer-facing messages', () => {
  const { billingError } = require('../lib/billing-errors.ts')
  const payload = billingError('internal_error', 'req-1')
  assert.equal(payload.error, 'Something went wrong starting checkout. Please try again.')
  assert.equal(payload.reason, 'internal_error')
})

// ===========================================================================
// lib/stripe-checkout-config.ts — base URL resolution unit tests
// ===========================================================================
test('resolveCheckoutBaseUrl always uses SITE_ORIGIN in production, ignoring overrides', async () => {
  await withEnv({ VERCEL_ENV: 'production', CHECKOUT_BASE_URL: 'https://attacker.evil' }, () => {
    const { resolveCheckoutBaseUrl } = require('../lib/stripe-checkout-config.ts')
    assert.equal(resolveCheckoutBaseUrl('sk_test_whatever'), 'https://www.usereviewflo.com')
  })
})

test('resolveCheckoutBaseUrl always uses SITE_ORIGIN for a live secret key, ignoring overrides', async () => {
  await withEnv({ CHECKOUT_BASE_URL: 'https://attacker.evil' }, () => {
    const { resolveCheckoutBaseUrl } = require('../lib/stripe-checkout-config.ts')
    assert.equal(resolveCheckoutBaseUrl('sk_live_realkey'), 'https://www.usereviewflo.com')
  })
})

test('resolveCheckoutBaseUrl ignores the override unless the secret key actually has a test prefix', async () => {
  await withEnv({ CHECKOUT_BASE_URL: 'https://staging.example.test' }, () => {
    const { resolveCheckoutBaseUrl } = require('../lib/stripe-checkout-config.ts')
    // Not `sk_live_`/`rk_live_`, but also not a real `sk_test_`/`rk_test_` key — must not unlock the override.
    assert.equal(resolveCheckoutBaseUrl('not-a-recognized-stripe-key'), 'https://www.usereviewflo.com')
  })
})

test('resolveCheckoutBaseUrl applies a well-formed override only for a real test-mode key', async () => {
  await withEnv({ CHECKOUT_BASE_URL: 'https://staging.example.test' }, () => {
    const { resolveCheckoutBaseUrl } = require('../lib/stripe-checkout-config.ts')
    assert.equal(resolveCheckoutBaseUrl('sk_test_realkey'), 'https://staging.example.test')
  })
})

test('resolveCheckoutBaseUrl rejects an override containing credentials', async () => {
  await withEnv({ CHECKOUT_BASE_URL: 'https://attacker:password@staging.example.test' }, () => {
    const { resolveCheckoutBaseUrl } = require('../lib/stripe-checkout-config.ts')
    assert.equal(resolveCheckoutBaseUrl('sk_test_realkey'), 'https://www.usereviewflo.com')
  })
})

test('resolveCheckoutBaseUrl rejects a non-root path override', async () => {
  await withEnv({ CHECKOUT_BASE_URL: 'https://staging.example.test/some/path' }, () => {
    const { resolveCheckoutBaseUrl } = require('../lib/stripe-checkout-config.ts')
    assert.equal(resolveCheckoutBaseUrl('sk_test_realkey'), 'https://www.usereviewflo.com')
  })
})

test('resolveCheckoutBaseUrl rejects http overrides except for localhost/127.0.0.1/[::1]', async () => {
  const { resolveCheckoutBaseUrl } = require('../lib/stripe-checkout-config.ts')
  await withEnv({ CHECKOUT_BASE_URL: 'http://staging.example.test' }, () => {
    assert.equal(resolveCheckoutBaseUrl('sk_test_realkey'), 'https://www.usereviewflo.com')
  })
  await withEnv({ CHECKOUT_BASE_URL: 'http://localhost:3000' }, () => {
    assert.equal(resolveCheckoutBaseUrl('sk_test_realkey'), 'http://localhost:3000')
  })
  await withEnv({ CHECKOUT_BASE_URL: 'http://127.0.0.1:3000' }, () => {
    assert.equal(resolveCheckoutBaseUrl('sk_test_realkey'), 'http://127.0.0.1:3000')
  })
})

// ===========================================================================
// pages/api/create-checkout-session.ts — handler tests (mocked Stripe + DB)
// ===========================================================================
test('create-checkout-session rejects requests without a bearer token', async () => {
  resetScenario()
  const handler = loadCreateCheckoutSession()
  const req = makeReq({})
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.reason, 'auth_required')
})

test('create-checkout-session rejects an invalid/expired session token', async () => {
  resetScenario()
  scenario.authError = { message: 'jwt expired' }
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer bad-token' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.reason, 'auth_invalid')
})

test('create-checkout-session returns a safe config_error when the Supabase admin client cannot be constructed', async () => {
  resetScenario()
  const handlerPath = '../pages/api/create-checkout-session.ts'
  const billingErrorsPath = '../lib/billing-errors.ts'
  const handlerResolved = require.resolve(handlerPath)
  const billingResolved = require.resolve(billingErrorsPath)
  delete require.cache[handlerResolved]
  delete require.cache[billingResolved]
  scenario.createClientShouldThrow = true
  try {
    const freshHandler = require(handlerResolved).default
    const req = makeReq({ authorization: 'Bearer token' })
    const res = makeRes()
    const { calls } = await withCapturedConsoleError(() => freshHandler(req, res))
    assert.equal(res.statusCode, 500)
    assert.equal(res.body.reason, 'config_error')
    const logged = JSON.stringify(calls)
    assert.ok(!logged.includes('supabase client init failed'))
  } finally {
    scenario.createClientShouldThrow = false
    delete require.cache[handlerResolved]
    delete require.cache[billingResolved]
  }
})

test('create-checkout-session returns config_error when STRIPE_SECRET_KEY is missing', async () => {
  resetScenario()
  await withEnv({ STRIPE_SECRET_KEY: undefined }, async () => {
    const handler = loadCreateCheckoutSession()
    const req = makeReq({ authorization: 'Bearer token' })
    const res = makeRes()
    await handler(req, res)
    assert.equal(res.statusCode, 500)
    assert.equal(res.body.reason, 'config_error')
  })
})

test('create-checkout-session returns config_error when the monthly price env var is missing', async () => {
  resetScenario()
  await withEnv({ STRIPE_PRO_MONTHLY_PRICE_ID: undefined }, async () => {
    const handler = loadCreateCheckoutSession()
    const req = makeReq({ authorization: 'Bearer token' })
    const res = makeRes()
    await handler(req, res)
    assert.equal(res.statusCode, 500)
    assert.equal(res.body.reason, 'config_error')
  })
})

test('create-checkout-session rejects an unsupported plan', async () => {
  resetScenario()
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token', body: { plan: 'ai' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.reason, 'invalid_request')
})

test('create-checkout-session rejects an unsupported billing interval', async () => {
  resetScenario()
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token', body: { interval: 'week' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.reason, 'invalid_request')
})

test('create-checkout-session blocks access to a business owned by another user', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'other-biz', user_id: 'someone-else', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token', body: { businessId: 'other-biz' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.reason, 'forbidden')
})

test('create-checkout-session rejects checkout for an already-paid account without contacting Stripe', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'pro', created_at: '2025-01-01' },
  ]
  poisonStripeImpl()
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.reason, 'already_subscribed')
})

test('create-checkout-session surfaces a business-lookup DB error safely, without leaking the raw message', async () => {
  resetScenario()
  scenario.rows = []
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token', body: { businessId: 'db-error-id' } })
  const res = makeRes()
  const { calls } = await withCapturedConsoleError(() => handler(req, res))
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'internal_error')
  const logged = JSON.stringify(calls)
  assert.ok(!logged.includes('permission denied'))
})

test('create-checkout-session blocks checkout without mutating tier when Stripe already has an active subscription', async () => {
  resetScenario()
  scenario.rows = [
    {
      id: 'biz-1',
      user_id: 'user-1',
      parent_business_id: null,
      tier: 'free',
      stripe_customer_id: 'cus_123',
      stripe_subscription_id: null,
      created_at: '2025-01-01',
    },
  ]
  scenario.updateShouldError = true
  setStripeImpl({ subscriptionsList: async () => ({ data: [{ id: 'sub_1', status: 'active' }] }) })
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token' })
  const res = makeRes()
  const { calls } = await withCapturedConsoleError(() => handler(req, res))
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.reason, 'already_subscribed')
  assert.equal(scenario.rows[0].tier, 'free')
  const logged = JSON.stringify(calls)
  assert.ok(!logged.includes('permission denied'))
})

test('create-checkout-session sanitizes a Stripe exception raised while creating the session', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  setStripeImpl({
    sessionsCreate: async () => {
      throw new FakeStripeInvalidRequestError('Raw Stripe detail mentioning secret_key sk_live_ABCDEF', {
        type: 'StripeInvalidRequestError',
        code: 'parameter_invalid',
      })
    },
  })
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token' })
  const res = makeRes()
  const { calls } = await withCapturedConsoleError(() => handler(req, res))
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
  assert.equal(res.body.error, 'Checkout is temporarily unavailable. Please try again shortly.')
  assert.ok(!JSON.stringify(res.body).includes('sk_live_ABCDEF'))
  const logged = JSON.stringify(calls)
  assert.ok(!logged.includes('sk_live_ABCDEF'))
  assert.ok(!logged.includes('Raw Stripe detail'))
})

test('create-checkout-session ignores a spoofed Origin header and a malicious CHECKOUT_BASE_URL under a live key', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  let capturedParams = null
  setStripeImpl({
    pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, livemode: true }),
    sessionsCreate: async (params) => {
      capturedParams = params
      return { url: 'https://checkout.stripe.com/test-session' }
    },
  })
  await withEnv({ STRIPE_SECRET_KEY: 'sk_live_realkey', CHECKOUT_BASE_URL: 'https://attacker.evil' }, async () => {
    const handler = loadCreateCheckoutSession()
    const req = makeReq({ authorization: 'Bearer token', origin: 'https://attacker.evil' })
    const res = makeRes()
    await handler(req, res)
    assert.equal(res.statusCode, 200)
    assert.ok(res.body.url)
  })
  assert.ok(capturedParams.success_url.startsWith('https://www.usereviewflo.com'))
  assert.ok(capturedParams.cancel_url.startsWith('https://www.usereviewflo.com'))
})

test('create-checkout-session happy path returns a Stripe checkout url for a free-tier owner', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  let capturedParams = null
  setStripeImpl({
    sessionsCreate: async (params) => {
      capturedParams = params
      return { url: 'https://checkout.stripe.com/happy-path-session' }
    },
  })
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.url, 'https://checkout.stripe.com/happy-path-session')
  assert.equal(
    capturedParams.success_url,
    'https://www.usereviewflo.com/dashboard/checkout?session_id={CHECKOUT_SESSION_ID}'
  )
  assert.equal(
    capturedParams.cancel_url,
    'https://www.usereviewflo.com/settings?section=plan&checkout=canceled&billing_interval=month'
  )
  assert.equal(capturedParams.allow_promotion_codes, true)
  assert.equal(capturedParams.discounts, undefined)
  assert.equal(capturedParams.line_items[0].price, 'price_pro_monthly')
  assert.equal(capturedParams.metadata.plan, 'pro')
  assert.equal(capturedParams.metadata.billing_interval, 'month')
  assert.equal(capturedParams.subscription_data.metadata.plan, 'pro')
  assert.equal(capturedParams.subscription_data.metadata.billing_interval, 'month')
})

test('create-checkout-session propagates a sanitized utm_source to session and subscription metadata for both intervals', async () => {
  for (const interval of ['month', 'year']) {
    resetScenario()
    scenario.rows = [
      { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
    ]
    let capturedParams = null
    setStripeImpl({
      sessionsCreate: async (params) => {
        capturedParams = params
        return { url: 'https://checkout.stripe.com/utm-session' }
      },
    })
    const handler = loadCreateCheckoutSession()
    const req = makeReq({
      authorization: 'Bearer token',
      body: { interval, utmSource: '  google \r\n' },
    })
    const res = makeRes()
    await handler(req, res)
    assert.equal(res.statusCode, 200)
    assert.equal(capturedParams.metadata.utm_source, 'google')
    assert.equal(capturedParams.subscription_data.metadata.utm_source, 'google')
    assert.equal(capturedParams.metadata.billing_interval, interval)
    assert.equal(capturedParams.subscription_data.metadata.billing_interval, interval)
  }
})

test('create-checkout-session omits utm_source metadata entirely for a direct (no-UTM) checkout', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  let capturedParams = null
  setStripeImpl({
    sessionsCreate: async (params) => {
      capturedParams = params
      return { url: 'https://checkout.stripe.com/direct-session' }
    },
  })
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token', body: { utmSource: null } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal('utm_source' in capturedParams.metadata, false)
  assert.equal('utm_source' in capturedParams.subscription_data.metadata, false)
})

test('create-checkout-session supports the annual interval and charges the annual price', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  let capturedParams = null
  setStripeImpl({
    sessionsCreate: async (params) => {
      capturedParams = params
      return { url: 'https://checkout.stripe.com/annual-session' }
    },
  })
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token', body: { interval: 'year' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(capturedParams.line_items[0].price, 'price_pro_annual')
  assert.equal(capturedParams.metadata.billing_interval, 'year')
})

test('create-checkout-session returns config_error when the configured price amount does not match', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  setStripeImpl({ pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, unit_amount: 1900 }) })
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
})

test('create-checkout-session returns config_error when the configured price is archived', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  setStripeImpl({ pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, active: false }) })
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
})

test('create-checkout-session returns config_error when the configured price is one-time (not recurring)', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  setStripeImpl({ pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, recurring: null }) })
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
})

test('create-checkout-session returns config_error when the configured price currency is not usd', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  setStripeImpl({ pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, currency: 'eur' }) })
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
})

test('create-checkout-session returns config_error when a test-mode price is fetched with a live secret key', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  setStripeImpl({ pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, livemode: false }) })
  await withEnv({ STRIPE_SECRET_KEY: 'sk_live_realkey' }, async () => {
    const handler = loadCreateCheckoutSession()
    const req = makeReq({ authorization: 'Bearer token' })
    const res = makeRes()
    await handler(req, res)
    assert.equal(res.statusCode, 500)
    assert.equal(res.body.reason, 'config_error')
  })
})

test('create-checkout-session returns config_error when a live-mode price is fetched with a test secret key', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  setStripeImpl({ pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, livemode: true }) })
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
})

test('create-checkout-session returns config_error when the configured monthly price is actually annual', async () => {
  resetScenario()
  scenario.rows = [
    { id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' },
  ]
  setStripeImpl({
    pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, recurring: { interval: 'year', interval_count: 1 } }),
  })
  const handler = loadCreateCheckoutSession()
  const req = makeReq({ authorization: 'Bearer token' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
})

// ===========================================================================
// pages/api/create-early-access-checkout.ts — handler tests
// ===========================================================================
test('create-early-access-checkout rejects requests without a bearer token', async () => {
  resetScenario()
  const handler = loadCreateEarlyAccessCheckout()
  const req = makeReq({})
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.reason, 'auth_required')
})

test('create-early-access-checkout builds SITE_ORIGIN redirect urls and ignores a spoofed Origin header', async () => {
  resetScenario()
  let capturedParams = null
  setStripeImpl({
    sessionsCreate: async (params) => {
      capturedParams = params
      return { url: 'https://checkout.stripe.com/early-access-session' }
    },
  })
  const handler = loadCreateEarlyAccessCheckout()
  const req = makeReq({ authorization: 'Bearer token', origin: 'https://attacker.evil' })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.url, 'https://checkout.stripe.com/early-access-session')
  assert.ok(capturedParams.success_url.startsWith('https://www.usereviewflo.com'))
  assert.ok(capturedParams.cancel_url.startsWith('https://www.usereviewflo.com'))
})

test('create-early-access-checkout sanitizes a Stripe exception raised while creating the session', async () => {
  resetScenario()
  setStripeImpl({
    sessionsCreate: async () => {
      throw new FakeStripeConnectionError('raw connection failure detail', { type: 'StripeConnectionError' })
    },
  })
  const handler = loadCreateEarlyAccessCheckout()
  const req = makeReq({ authorization: 'Bearer token' })
  const res = makeRes()
  const { calls } = await withCapturedConsoleError(() => handler(req, res))
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'upstream_timeout')
  assert.ok(!JSON.stringify(res.body).includes('raw connection failure detail'))
  assert.ok(!JSON.stringify(calls).includes('raw connection failure detail'))
})
