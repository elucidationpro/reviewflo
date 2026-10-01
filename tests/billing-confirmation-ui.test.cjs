'use strict'
const { test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } })

const {
  isValidCheckoutSessionId,
  savePendingCheckoutSessionId,
  readPendingCheckoutSessionId,
  clearPendingCheckoutSessionId,
  loginRedirectTarget,
  resolvePlanLabel,
} = require('../lib/pending-checkout.ts')

// ---------------------------------------------------------------------------
// pending-checkout.ts is the one piece of checkout-confirmation state that is
// pure enough to unit test directly (no React, no Next router, no Supabase
// client). The confirmation page itself (pages/dashboard/checkout.tsx) pulls
// in next/router, next/head, next/link and the live Supabase client at module
// scope, and this repo has no React rendering test library (no
// @testing-library/react, no react-test-renderer, no jsdom) available under
// /Users/jeremycarrera/reviewflow/node_modules. Rendering it here would mean
// either adding a new dependency (out of scope) or faking so much of
// React/Next that the "test" would just be re-asserting the source, not
// exercising real behavior. So: loginRedirectTarget/resolvePlanLabel (used by
// the confirmed/redirect UI states) and the sessionStorage-backed pending
// marker helpers (used to survive an auth redirect mid-confirmation) are
// tested directly; the component's async state machine (loading -> verifying
// -> confirmed/error/sync_pending, retry/abort wiring) is NOT covered by an
// automated test in this change and was instead verified by manual code
// review of pages/dashboard/checkout.tsx.
// ---------------------------------------------------------------------------

function installFakeWindow({ throwOnAccess = false } = {}) {
  if (throwOnAccess) {
    global.window = {
      get sessionStorage() {
        throw new Error('storage access blocked')
      },
    }
    return
  }
  const store = new Map()
  const sessionStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  }
  global.window = { sessionStorage }
  return sessionStorage
}

function uninstallFakeWindow() {
  delete global.window
}

afterEach(() => {
  uninstallFakeWindow()
})

test('isValidCheckoutSessionId accepts well-formed cs_ ids and rejects everything else', () => {
  assert.equal(isValidCheckoutSessionId('cs_test_a1b2c3d4e5'), true)
  assert.equal(isValidCheckoutSessionId('cs_live_' + 'a'.repeat(200)), true)

  assert.equal(isValidCheckoutSessionId(''), false)
  assert.equal(isValidCheckoutSessionId('cs_short'), false)
  assert.equal(isValidCheckoutSessionId('not_a_session_id'), false)
  assert.equal(isValidCheckoutSessionId(null), false)
  assert.equal(isValidCheckoutSessionId(undefined), false)
  assert.equal(isValidCheckoutSessionId(12345), false)
  assert.equal(isValidCheckoutSessionId(['cs_test_a1b2c3d4e5']), false)
  // path/query injection attempts must not pass as a bare session id
  assert.equal(isValidCheckoutSessionId('cs_test_a1b2c3/../../etc'), false)
})

test('save/read/clear pending checkout session id round-trips through sessionStorage', () => {
  installFakeWindow()
  const id = 'cs_test_a1b2c3d4e5'

  assert.equal(readPendingCheckoutSessionId(), null)

  assert.equal(savePendingCheckoutSessionId(id), true)
  assert.equal(readPendingCheckoutSessionId(), id)

  clearPendingCheckoutSessionId()
  assert.equal(readPendingCheckoutSessionId(), null)
})

test('savePendingCheckoutSessionId refuses to persist an invalid session id and reports failure', () => {
  const sessionStorage = installFakeWindow()
  assert.equal(savePendingCheckoutSessionId('not-a-real-session-id'), false)
  assert.equal(sessionStorage.getItem('reviewflo.pendingCheckoutSessionId'), null)
  assert.equal(readPendingCheckoutSessionId(), null)
})

test('readPendingCheckoutSessionId ignores a corrupted/forged stored value', () => {
  const sessionStorage = installFakeWindow()
  sessionStorage.setItem('reviewflo.pendingCheckoutSessionId', 'javascript:alert(1)')
  assert.equal(readPendingCheckoutSessionId(), null)
})

test('pending marker helpers no-op safely and report failure when storage access throws (privacy mode)', () => {
  installFakeWindow({ throwOnAccess: true })
  let saved
  assert.doesNotThrow(() => { saved = savePendingCheckoutSessionId('cs_test_a1b2c3d4e5') })
  assert.equal(saved, false)
  assert.doesNotThrow(() => clearPendingCheckoutSessionId())
  assert.equal(readPendingCheckoutSessionId(), null)
})

test('pending marker helpers no-op safely and report failure with no window (SSR)', () => {
  assert.equal(typeof global.window, 'undefined')
  let saved
  assert.doesNotThrow(() => { saved = savePendingCheckoutSessionId('cs_test_a1b2c3d4e5') })
  assert.equal(saved, false)
  assert.equal(readPendingCheckoutSessionId(), null)
  assert.doesNotThrow(() => clearPendingCheckoutSessionId())
})

test('loginRedirectTarget builds a login URL that round-trips the checkout session id', () => {
  const target = loginRedirectTarget('cs_test_a1b2c3d4e5')
  assert.equal(target, '/login?redirect=%2Fdashboard%2Fcheckout%3Fsession_id%3Dcs_test_a1b2c3d4e5')

  const decodedRedirect = new URLSearchParams(target.split('?')[1]).get('redirect')
  assert.equal(decodedRedirect, '/dashboard/checkout?session_id=cs_test_a1b2c3d4e5')
})

test('resolvePlanLabel shows AI only for the ai plan, Pro for everything else', () => {
  assert.equal(resolvePlanLabel('ai'), 'AI')
  assert.equal(resolvePlanLabel('pro'), 'Pro')
  assert.equal(resolvePlanLabel('free'), 'Pro')
  assert.equal(resolvePlanLabel(''), 'Pro')
})
