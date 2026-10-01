'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

// ---------------------------------------------------------------------------
// Focused tests for the Package C pricing upgrade: monthly/annual Pro
// checkout, Stripe Price validation, and removal of the automatic launch
// discount/coupon machinery. Fake `stripe`/`@supabase/supabase-js` modules
// mirror tests/billing-checkout.test.cjs — no network calls, no real keys.
// ---------------------------------------------------------------------------
class FakeStripeError extends Error {
  constructor(message, props = {}) {
    super(message)
    this.type = props.type
    this.code = props.code
  }
}
function FakeStripeCtor(secretKey, opts) {
  if (!stripeImpl) throw new Error('test bug: stripeImpl not configured before constructing Stripe client')
  return stripeImpl(secretKey, opts)
}
FakeStripeCtor.errors = {
  StripeError: FakeStripeError,
  StripeConnectionError: class extends FakeStripeError {},
  StripeAuthenticationError: class extends FakeStripeError {},
  StripePermissionError: class extends FakeStripeError {},
  StripeInvalidRequestError: class extends FakeStripeError {},
  StripeRateLimitError: class extends FakeStripeError {},
  StripeAPIError: class extends FakeStripeError {},
}
FakeStripeCtor.createFetchHttpClient = () => ({})

const stripePath = require.resolve('stripe')
require.cache[stripePath] = { id: stripePath, filename: stripePath, loaded: true, exports: FakeStripeCtor }

const VALID_PRO_MONTHLY_PRICE = {
  active: true,
  currency: 'usd',
  unit_amount: 2900,
  recurring: { interval: 'month', interval_count: 1 },
  livemode: false,
}
const VALID_PRO_ANNUAL_PRICE = {
  active: true,
  currency: 'usd',
  unit_amount: 29000,
  recurring: { interval: 'year', interval_count: 1 },
  livemode: false,
}

let stripeImpl = null
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
    prices: {
      retrieve:
        overrides.pricesRetrieve ||
        (async (id) => (id === 'price_pro_annual' ? { ...VALID_PRO_ANNUAL_PRICE, id } : { ...VALID_PRO_MONTHLY_PRICE, id })),
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
// Fake `@supabase/supabase-js` — same shape as tests/billing-checkout.test.cjs.
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
  scenario.rows = [{ id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'free', created_at: '2025-01-01' }]
  scenario.updateShouldError = false
  scenario.createClientShouldThrow = false
}

function applyFilters(rows, filters) {
  return filters.reduce((acc, [key, value]) => acc.filter((r) => r[key] === value), rows.slice())
}

function makeQueryBuilder() {
  const filters = []
  let mode = 'select'
  let updatePayload = null

  function finish() {
    if (mode === 'update') {
      if (scenario.updateShouldError) return { error: { message: 'db error', code: '42501' } }
      const rows = applyFilters(scenario.rows, filters)
      for (const row of rows) Object.assign(row, updatePayload)
      return { error: null }
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
  if (scenario.createClientShouldThrow) throw new Error('supabase client init failed')
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
delete process.env.STRIPE_LAUNCH_COUPON_ID
delete process.env.STRIPE_LAUNCH_PROMO_ID
delete process.env.VERCEL_ENV
delete process.env.CHECKOUT_BASE_URL

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

function makeReq({ authorization = 'Bearer token', body } = {}) {
  return { method: 'POST', headers: { authorization }, body: body || {} }
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
  return require('../pages/api/create-checkout-session.ts').default
}

// ===========================================================================
// lib/billing-plans.ts — pure validation unit tests
// ===========================================================================
test('validateProPrice accepts a matching monthly price', () => {
  const { validateProPrice } = require('../lib/billing-plans.ts')
  assert.equal(validateProPrice(VALID_PRO_MONTHLY_PRICE, 'month', false), null)
})

test('validateProPrice accepts a matching annual price', () => {
  const { validateProPrice } = require('../lib/billing-plans.ts')
  assert.equal(validateProPrice(VALID_PRO_ANNUAL_PRICE, 'year', false), null)
})

test('validateProPrice rejects inactive, non-recurring, wrong-currency, wrong-interval, and wrong-amount prices', () => {
  const { validateProPrice } = require('../lib/billing-plans.ts')
  assert.ok(validateProPrice({ ...VALID_PRO_MONTHLY_PRICE, active: false }, 'month', false))
  assert.ok(validateProPrice({ ...VALID_PRO_MONTHLY_PRICE, recurring: null }, 'month', false))
  assert.ok(validateProPrice({ ...VALID_PRO_MONTHLY_PRICE, currency: 'eur' }, 'month', false))
  assert.ok(validateProPrice({ ...VALID_PRO_MONTHLY_PRICE, recurring: { interval: 'year', interval_count: 1 } }, 'month', false))
  assert.ok(validateProPrice({ ...VALID_PRO_MONTHLY_PRICE, recurring: { interval: 'month', interval_count: 3 } }, 'month', false))
  assert.ok(validateProPrice({ ...VALID_PRO_MONTHLY_PRICE, unit_amount: 1900 }, 'month', false))
})

test('validateProPrice rejects a livemode mismatch in either direction', () => {
  const { validateProPrice } = require('../lib/billing-plans.ts')
  assert.equal(validateProPrice({ ...VALID_PRO_MONTHLY_PRICE, livemode: false }, 'month', true), 'price_mode_mismatch')
  assert.equal(validateProPrice({ ...VALID_PRO_MONTHLY_PRICE, livemode: true }, 'month', false), 'price_mode_mismatch')
  assert.equal(validateProPrice({ ...VALID_PRO_MONTHLY_PRICE, livemode: true }, 'month', true), null)
})

test('parsePlan defaults to pro and rejects any other plan', () => {
  const { parsePlan } = require('../lib/billing-plans.ts')
  assert.equal(parsePlan(undefined), 'pro')
  assert.equal(parsePlan('pro'), 'pro')
  assert.equal(parsePlan('ai'), null)
  assert.equal(parsePlan('free'), null)
})

test('parseBillingInterval defaults to month and rejects unsupported intervals', () => {
  const { parseBillingInterval } = require('../lib/billing-plans.ts')
  assert.equal(parseBillingInterval(undefined), 'month')
  assert.equal(parseBillingInterval('month'), 'month')
  assert.equal(parseBillingInterval('year'), 'year')
  assert.equal(parseBillingInterval('week'), null)
})

// ===========================================================================
// pages/api/create-checkout-session.ts — plan/interval + price-validation
// ===========================================================================
test('checkout creates a monthly Pro session by default with no discounts and promo codes allowed', async () => {
  resetScenario()
  let params = null
  setStripeImpl({ sessionsCreate: async (p) => ((params = p), { url: 'https://checkout.stripe.com/monthly' }) })
  const handler = loadHandler()
  const req = makeReq({})
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(params.line_items[0].price, 'price_pro_monthly')
  assert.equal(params.allow_promotion_codes, true)
  assert.equal('discounts' in params, false)
  assert.equal(params.metadata.plan, 'pro')
  assert.equal(params.metadata.billing_interval, 'month')
  assert.equal(params.subscription_data.metadata.plan, 'pro')
  assert.equal(params.subscription_data.metadata.billing_interval, 'month')
})

test('checkout creates an annual Pro session when interval=year', async () => {
  resetScenario()
  let params = null
  setStripeImpl({ sessionsCreate: async (p) => ((params = p), { url: 'https://checkout.stripe.com/annual' }) })
  const handler = loadHandler()
  const req = makeReq({ body: { plan: 'pro', interval: 'year' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(params.line_items[0].price, 'price_pro_annual')
  assert.equal(params.allow_promotion_codes, true)
  assert.equal('discounts' in params, false)
  assert.equal(params.metadata.billing_interval, 'year')
  assert.equal(params.subscription_data.metadata.billing_interval, 'year')
})

test('checkout rejects plan=ai (AI has no checkout yet)', async () => {
  resetScenario()
  poisonStripeImpl()
  const handler = loadHandler()
  const req = makeReq({ body: { plan: 'ai' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.reason, 'invalid_request')
})

test('checkout rejects an invalid interval without contacting Stripe', async () => {
  resetScenario()
  poisonStripeImpl()
  const handler = loadHandler()
  const req = makeReq({ body: { interval: 'week' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.reason, 'invalid_request')
})

test('checkout returns config_error when STRIPE_PRO_MONTHLY_PRICE_ID is missing', async () => {
  resetScenario()
  await withEnv({ STRIPE_PRO_MONTHLY_PRICE_ID: undefined }, async () => {
    poisonStripeImpl()
    const handler = loadHandler()
    const req = makeReq({})
    const res = makeRes()
    await handler(req, res)
    assert.equal(res.statusCode, 500)
    assert.equal(res.body.reason, 'config_error')
  })
})

test('checkout returns config_error when STRIPE_PRO_ANNUAL_PRICE_ID is missing for interval=year', async () => {
  resetScenario()
  await withEnv({ STRIPE_PRO_ANNUAL_PRICE_ID: undefined }, async () => {
    poisonStripeImpl()
    const handler = loadHandler()
    const req = makeReq({ body: { interval: 'year' } })
    const res = makeRes()
    await handler(req, res)
    assert.equal(res.statusCode, 500)
    assert.equal(res.body.reason, 'config_error')
  })
})

test('checkout never falls back to legacy STRIPE_PRO_PRICE_ID', async () => {
  resetScenario()
  await withEnv({ STRIPE_PRO_MONTHLY_PRICE_ID: undefined, STRIPE_PRO_PRICE_ID: 'price_legacy' }, async () => {
    poisonStripeImpl()
    const handler = loadHandler()
    const req = makeReq({})
    const res = makeRes()
    await handler(req, res)
    assert.equal(res.statusCode, 500)
    assert.equal(res.body.reason, 'config_error')
  })
})

test('checkout returns config_error when the configured price is archived', async () => {
  resetScenario()
  setStripeImpl({ pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, active: false }) })
  const handler = loadHandler()
  const req = makeReq({})
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
})

test('checkout returns config_error when the configured price is not a recurring subscription price', async () => {
  resetScenario()
  setStripeImpl({ pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, recurring: null }) })
  const handler = loadHandler()
  const req = makeReq({})
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
})

test('checkout returns config_error when the configured monthly price amount is wrong', async () => {
  resetScenario()
  setStripeImpl({ pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, unit_amount: 1900 }) })
  const handler = loadHandler()
  const req = makeReq({})
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
})

test('checkout returns config_error when the configured annual price amount is wrong', async () => {
  resetScenario()
  setStripeImpl({ pricesRetrieve: async (id) => ({ ...VALID_PRO_ANNUAL_PRICE, id, unit_amount: 9900 }) })
  const handler = loadHandler()
  const req = makeReq({ body: { interval: 'year' } })
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
})

test('checkout returns config_error when the monthly-configured price is actually billed annually (mode mismatch)', async () => {
  resetScenario()
  setStripeImpl({
    pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, recurring: { interval: 'year', interval_count: 1 } }),
  })
  const handler = loadHandler()
  const req = makeReq({})
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
})

test('checkout returns config_error when the configured price currency is not usd', async () => {
  resetScenario()
  setStripeImpl({ pricesRetrieve: async (id) => ({ ...VALID_PRO_MONTHLY_PRICE, id, currency: 'eur' }) })
  const handler = loadHandler()
  const req = makeReq({})
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 500)
  assert.equal(res.body.reason, 'config_error')
})

test('checkout blocks an already-subscribed (paid-tier) business before contacting Stripe', async () => {
  resetScenario()
  scenario.rows = [{ id: 'biz-1', user_id: 'user-1', parent_business_id: null, tier: 'pro', created_at: '2025-01-01' }]
  poisonStripeImpl()
  const handler = loadHandler()
  const req = makeReq({})
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.reason, 'already_subscribed')
})

test('checkout blocks checkout without mutating tier when Stripe already has an active subscription for the customer', async () => {
  resetScenario()
  scenario.rows = [
    {
      id: 'biz-1',
      user_id: 'user-1',
      parent_business_id: null,
      tier: 'free',
      stripe_customer_id: 'cus_123',
      created_at: '2025-01-01',
    },
  ]
  setStripeImpl({ subscriptionsList: async () => ({ data: [{ id: 'sub_1', status: 'active' }] }) })
  const handler = loadHandler()
  const req = makeReq({})
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.reason, 'already_subscribed')
  assert.equal(scenario.rows[0].tier, 'free')
})

test('checkout blocks checkout without mutating tier when a known subscription id is already active/trialing/past_due', async () => {
  resetScenario()
  scenario.rows = [
    {
      id: 'biz-1',
      user_id: 'user-1',
      parent_business_id: null,
      tier: 'free',
      stripe_subscription_id: 'sub_known',
      created_at: '2025-01-01',
    },
  ]
  setStripeImpl({ subscriptionsRetrieve: async () => ({ id: 'sub_known', status: 'trialing' }) })
  const handler = loadHandler()
  const req = makeReq({})
  const res = makeRes()
  await handler(req, res)
  assert.equal(res.statusCode, 403)
  assert.equal(res.body.reason, 'already_subscribed')
  assert.equal(scenario.rows[0].tier, 'free')
})
