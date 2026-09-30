'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } })

// ---------------------------------------------------------------------------
// Minimal browser shims so lib/checkout-analytics.ts (a 'use client' module)
// can be required under plain Node for testing.
// ---------------------------------------------------------------------------
class MemoryStorage {
  constructor(denied = false) {
    this._store = new Map()
    this._denied = denied
  }
  getItem(key) {
    return this._store.has(key) ? this._store.get(key) : null
  }
  setItem(key, value) {
    if (this._denied) throw new Error('storage denied')
    this._store.set(key, String(value))
  }
  removeItem(key) {
    this._store.delete(key)
  }
  clear() {
    this._store.clear()
  }
}

// Simulates storage where the write-probe (setItem/removeItem) succeeds, but real
// getItem calls throw afterward -- e.g. a browser API that partially misbehaves.
class GetItemThrowsStorage extends MemoryStorage {
  getItem(key) {
    if (key === '__rf_storage_probe__') return super.getItem(key)
    throw new Error('getItem denied')
  }
}

function installBrowserGlobals({
  localDenied = false,
  sessionDenied = false,
  localStorageImpl = null,
  location = 'https://app.example.test/',
} = {}) {
  global.window = {
    localStorage: localStorageImpl || new MemoryStorage(localDenied),
    sessionStorage: new MemoryStorage(sessionDenied),
    location: new URL(location),
  }
}

function resetAnalyticsModule() {
  const resolved = require.resolve('../lib/checkout-analytics.ts')
  delete require.cache[resolved]
  return require(resolved)
}

test('captureFirstTouch persists direct (null) first touch and later UTM cannot overwrite it', () => {
  installBrowserGlobals()
  const { captureFirstTouch, getFirstTouch } = resetAnalyticsModule()

  const first = captureFirstTouch(null)
  assert.equal(first.utm_source, null)

  const second = captureFirstTouch('google')
  assert.equal(second.utm_source, null, 'stored direct/null sentinel must not be overwritten by a later utm_source')
  assert.equal(getFirstTouch().utm_source, null)
})

test('captureFirstTouch persists the first real utm_source and ignores subsequent ones', () => {
  installBrowserGlobals()
  const { captureFirstTouch, getFirstTouch } = resetAnalyticsModule()

  const first = captureFirstTouch('google')
  assert.equal(first.utm_source, 'google')

  const second = captureFirstTouch('facebook')
  assert.equal(second.utm_source, 'google')
  assert.equal(getFirstTouch().utm_source, 'google')
})

test('captureFirstTouch falls back to historical PostHog initial utm when no candidate is present', () => {
  installBrowserGlobals()
  const { captureFirstTouch } = resetAnalyticsModule()

  const result = captureFirstTouch(null, { historicalUtmSource: 'newsletter' })
  assert.equal(result.utm_source, 'newsletter')
})

test('historical PostHog first-touch source beats a UTM seen on the current, later revisit', () => {
  installBrowserGlobals()
  const { captureFirstTouch } = resetAnalyticsModule()

  const result = captureFirstTouch('newcurrent', { historicalUtmSource: 'oldsource' })
  assert.equal(result.utm_source, 'oldsource', 'historical first touch must win over the current revisit UTM')
})

test('captureFirstTouch degrades gracefully when storage is denied, using an in-memory sentinel', () => {
  installBrowserGlobals({ localDenied: true })
  const { captureFirstTouch, getFirstTouch } = resetAnalyticsModule()

  const result = captureFirstTouch(null)
  assert.equal(result.utm_source, null, 'direct first visit captured as null even without persistence')

  // A later campaign-bearing call in the same page session must not turn a direct
  // first visit into a UTM-attributed one, even though nothing persisted to storage.
  const second = captureFirstTouch('facebook')
  assert.equal(second.utm_source, null, 'direct first visit cannot become a later UTM in the same session')
  assert.equal(getFirstTouch().utm_source, null, 'in-memory sentinel is readable for the rest of the session')

  assert.doesNotThrow(() => captureFirstTouch('facebook'))
})

test('captureFirstTouch does not crash when storage getItem throws after a successful write-probe', () => {
  installBrowserGlobals({ localStorageImpl: new GetItemThrowsStorage() })
  const { captureFirstTouch } = resetAnalyticsModule()

  const result = captureFirstTouch('google')
  assert.equal(result.utm_source, 'google', 'still computes a usable value when reads are broken')

  const second = captureFirstTouch('facebook')
  assert.equal(second.utm_source, 'google', 'in-memory sentinel still protects first touch within the session')
})

test('sanitizeUtmValue bounds length and strips control characters', () => {
  installBrowserGlobals()
  const { sanitizeUtmValue } = resetAnalyticsModule()

  assert.equal(sanitizeUtmValue(123), null)
  assert.equal(sanitizeUtmValue('  google  '), 'google')
  assert.equal(sanitizeUtmValue('a\r\nb\tc\0d'), 'abcd')
  assert.equal(sanitizeUtmValue('x'.repeat(500)).length, 128)
})

test('buildCheckoutEventProperties produces the typed event payload', () => {
  installBrowserGlobals()
  const { buildCheckoutEventProperties } = resetAnalyticsModule()

  assert.deepEqual(buildCheckoutEventProperties('month', 'google'), {
    plan: 'pro',
    billing_interval: 'month',
    utm_source: 'google',
  })
  assert.deepEqual(buildCheckoutEventProperties('year', null), {
    plan: 'pro',
    billing_interval: 'year',
    utm_source: null,
  })
})

test('checkout attempt context round-trips through sessionStorage', () => {
  installBrowserGlobals()
  const { startCheckoutAttempt, getCheckoutAttempt } = resetAnalyticsModule()

  const started = startCheckoutAttempt('year', 'google')
  const fetched = getCheckoutAttempt()
  assert.deepEqual(fetched, started)
})

test('shouldEmitCheckoutEvent dedupes created/failed/canceled events across reloads', () => {
  installBrowserGlobals()
  const mod = resetAnalyticsModule()
  const attempt = mod.startCheckoutAttempt('month', 'google')

  assert.equal(mod.shouldEmitCheckoutEvent(attempt.attemptId, 'checkout_session_created'), true)
  assert.equal(mod.shouldEmitCheckoutEvent(attempt.attemptId, 'checkout_session_created'), false, 'reload replay must not re-fire')
  assert.equal(mod.shouldEmitCheckoutEvent(attempt.attemptId, 'checkout_failed'), true, 'different event name is independent')
  assert.equal(mod.shouldEmitCheckoutEvent(attempt.attemptId, 'checkout_failed'), false)
  assert.equal(mod.shouldEmitCheckoutEvent(attempt.attemptId, 'checkout_canceled'), true)

  // Simulate a reload: sessionStorage contents persist (new module instance, same storage).
  const reloaded = resetAnalyticsModule()
  assert.equal(reloaded.shouldEmitCheckoutEvent(attempt.attemptId, 'checkout_session_created'), false)
})

test('shouldEmitCheckoutEvent allows emission when sessionStorage is denied (best effort, no crash)', () => {
  installBrowserGlobals({ sessionDenied: true })
  const { shouldEmitCheckoutEvent } = resetAnalyticsModule()
  assert.equal(shouldEmitCheckoutEvent('attempt-1', 'checkout_session_created'), true)
  assert.equal(shouldEmitCheckoutEvent('attempt-1', 'checkout_session_created'), true)
})

test('sanitizeUrlValue redacts sensitive query and hash params but keeps utm/path', () => {
  installBrowserGlobals()
  const { sanitizeUrlValue } = resetAnalyticsModule()

  const sanitizedQuery = sanitizeUrlValue(
    'https://app.example.test/login?access_token=SECRET123&utm_source=google&plan=pro'
  )
  assert.ok(!sanitizedQuery.includes('SECRET123'))
  assert.ok(sanitizedQuery.includes('utm_source=google'))
  assert.ok(sanitizedQuery.includes('plan=pro'))

  const sanitizedHash = sanitizeUrlValue(
    'https://app.example.test/reset#refresh_token=HASHSECRET&token=alsoSecret&code=abc123&foo=bar'
  )
  assert.ok(!sanitizedHash.includes('HASHSECRET'))
  assert.ok(!sanitizedHash.includes('alsoSecret'))
  assert.ok(!sanitizedHash.includes('abc123'))
  assert.ok(sanitizedHash.includes('foo=bar'))

  const relativeSanitized = sanitizeUrlValue('/callback?code=xyz&utm_source=fb')
  assert.ok(!relativeSanitized.includes('xyz'))
  assert.ok(relativeSanitized.startsWith('/callback'))
  assert.ok(relativeSanitized.includes('utm_source=fb'))
})

test('sanitizeUrlValue strips embedded userinfo credentials from absolute URLs', () => {
  installBrowserGlobals()
  const { sanitizeUrlValue } = resetAnalyticsModule()

  const sanitized = sanitizeUrlValue('https://leakeduser:leakedpass@app.example.test/dashboard?plan=pro')
  assert.ok(!sanitized.includes('leakeduser'))
  assert.ok(!sanitized.includes('leakedpass'))
  assert.ok(!sanitized.includes('@app.example.test') || sanitized.startsWith('https://app.example.test'))
  assert.ok(sanitized.includes('plan=pro'))
})

test('sanitizeUrlValue redacts token_hash/provider_token/provider_refresh_token/api_key', () => {
  installBrowserGlobals()
  const { sanitizeUrlValue } = resetAnalyticsModule()

  const sanitized = sanitizeUrlValue(
    'https://app.example.test/auth?token_hash=THSECRET&provider_token=PTSECRET&provider_refresh_token=PRTSECRET&api_key=APISECRET&utm_source=google'
  )
  assert.ok(!sanitized.includes('THSECRET'))
  assert.ok(!sanitized.includes('PTSECRET'))
  assert.ok(!sanitized.includes('PRTSECRET'))
  assert.ok(!sanitized.includes('APISECRET'))
  assert.ok(sanitized.includes('utm_source=google'))
})

test('sanitizeUrlValue preserves ordinary anchors instead of rewriting them as key=value', () => {
  installBrowserGlobals()
  const { sanitizeUrlValue } = resetAnalyticsModule()

  assert.equal(sanitizeUrlValue('https://app.example.test/pricing#pricing'), 'https://app.example.test/pricing#pricing')
  assert.equal(sanitizeUrlValue('/pricing#pricing'), '/pricing#pricing')
})

test('sanitizeAnalyticsProperties recursively redacts nested and top-level URL-like properties', () => {
  installBrowserGlobals()
  const { sanitizeAnalyticsProperties } = resetAnalyticsModule()

  const input = {
    $current_url: 'https://app.example.test/magic?token=SUPERSECRET',
    $referrer: 'https://app.example.test/login?access_token=OTHERSECRET',
    plan: 'pro',
    nested: {
      $initial_current_url: 'https://app.example.test/?refresh_token=NESTEDSECRET&utm_source=google',
      safe: 'value',
    },
  }
  const sanitized = sanitizeAnalyticsProperties(input)
  const serialized = JSON.stringify(sanitized)
  assert.ok(!serialized.includes('SUPERSECRET'))
  assert.ok(!serialized.includes('OTHERSECRET'))
  assert.ok(!serialized.includes('NESTEDSECRET'))
  assert.ok(serialized.includes('utm_source=google'))
  assert.equal(sanitized.plan, 'pro')
  assert.equal(sanitized.nested.safe, 'value')
})

// ---------------------------------------------------------------------------
// Server-side billing-analytics.ts
// ---------------------------------------------------------------------------

function loadServerAnalytics() {
  const resolved = require.resolve('../lib/billing-analytics.ts')
  delete require.cache[resolved]
  return require(resolved)
}

test('normalizePostHogHost maps us/eu cloud hosts to ingestion-only subdomains', () => {
  const { normalizePostHogHost } = loadServerAnalytics()
  assert.equal(normalizePostHogHost('https://us.posthog.com'), 'https://us.i.posthog.com')
  assert.equal(normalizePostHogHost('https://eu.posthog.com/'), 'https://eu.i.posthog.com')
  assert.equal(normalizePostHogHost('https://custom.posthog.example.test'), 'https://custom.posthog.example.test')
  assert.equal(normalizePostHogHost('not a url'), 'not a url')
})

test('deterministicEventId and deterministicEventTimestamp are stable for replay dedupe', () => {
  const { deterministicEventId, deterministicEventTimestamp } = loadServerAnalytics()

  const idA = deterministicEventId(['checkout_completed', 'sub_123', 'owner_456'])
  const idB = deterministicEventId(['checkout_completed', 'sub_123', 'owner_456'])
  const idC = deterministicEventId(['checkout_completed', 'sub_999', 'owner_456'])
  assert.equal(idA, idB)
  assert.notEqual(idA, idC)
  assert.match(idA, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)

  const tsA = deterministicEventTimestamp('2026-01-01T00:00:00.789Z')
  const tsB = deterministicEventTimestamp('2026-01-01T00:00:00.001Z')
  assert.equal(tsA, tsB, 'millisecond jitter must collapse to the same replay-stable timestamp')
})

test('captureServerCheckoutEvent posts to the normalized /i/v0/e/ endpoint with provided ids', async (t) => {
  process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key'
  process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://us.posthog.com'
  const { captureServerCheckoutEvent, deterministicEventId, deterministicEventTimestamp } = loadServerAnalytics()

  const calls = []
  const originalFetch = global.fetch
  global.fetch = async (url, init) => {
    calls.push({ url, init })
    return { ok: true, status: 200 }
  }
  t.after(() => {
    global.fetch = originalFetch
  })

  const eventId = deterministicEventId(['checkout_completed', 'sub_1', 'owner_1'])
  const timestamp = deterministicEventTimestamp('2026-01-01T00:00:00.000Z')

  await captureServerCheckoutEvent({
    eventName: 'checkout_completed',
    distinctId: 'owner_1',
    eventId,
    timestamp,
    properties: { plan: 'pro', billing_interval: 'month', utm_source: 'google' },
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://us.i.posthog.com/i/v0/e/')
  const body = JSON.parse(calls[0].init.body)
  assert.equal(body.api_key, 'phc_test_key')
  assert.equal(body.event, 'checkout_completed')
  assert.equal(body.distinct_id, 'owner_1')
  assert.equal(body.uuid, eventId)
  assert.equal(body.timestamp, timestamp)
  assert.deepEqual(body.properties, { plan: 'pro', billing_interval: 'month', utm_source: 'google' })
})

test('captureServerCheckoutEvent never throws on network failure or timeout', async (t) => {
  process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key'
  process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://us.posthog.com'
  const { captureServerCheckoutEvent } = loadServerAnalytics()

  const originalFetch = global.fetch
  global.fetch = async () => {
    throw new Error('simulated network failure')
  }
  t.after(() => {
    global.fetch = originalFetch
  })

  await assert.doesNotReject(
    captureServerCheckoutEvent({
      eventName: 'checkout_failed',
      distinctId: 'owner_2',
      eventId: 'deadbeef-dead-4eef-8eef-deadbeefdead',
      timestamp: new Date(0).toISOString(),
      properties: { plan: 'pro', billing_interval: 'year', utm_source: null },
    })
  )
})

test('captureServerCheckoutEvent is a no-op when PostHog env vars are missing', async () => {
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST
  const { captureServerCheckoutEvent } = loadServerAnalytics()

  let fetchCalled = false
  const originalFetch = global.fetch
  global.fetch = async () => {
    fetchCalled = true
    return { ok: true }
  }
  try {
    await captureServerCheckoutEvent({
      eventName: 'checkout_completed',
      distinctId: 'owner_3',
      eventId: 'deadbeef-dead-4eef-8eef-deadbeefdead',
      timestamp: new Date(0).toISOString(),
      properties: { plan: 'pro', billing_interval: 'month', utm_source: null },
    })
  } finally {
    global.fetch = originalFetch
  }
  assert.equal(fetchCalled, false)
})
