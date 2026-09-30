import type Stripe from 'stripe'

export type SbRow = Record<string, unknown>

/** Minimal Supabase query surface this module depends on — dependency-injected for unit tests. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseLike = { from: (table: string) => any }

export interface StripeSubscriptionsLike {
  retrieve: (id: string) => Promise<Stripe.Subscription>
}

export interface StripeLike {
  subscriptions: StripeSubscriptionsLike
}

export type SyncLogLevel = 'info' | 'warn' | 'error'
export type SyncLogger = (level: SyncLogLevel, fields: Record<string, unknown>) => void

export interface SubscriptionSyncDeps {
  supabase: SupabaseLike
  stripe: StripeLike
  log?: SyncLogger
}

export interface SyncContext {
  eventId: string
  eventType: string
}

export type SyncResult =
  | { ok: true; action: 'granted' | 'downgraded' | 'attached' | 'no_change' | 'ignored'; businessId?: string }
  | { ok: false; reason: 'db_error' | 'stripe_retrieve_failed' | 'missing_mapping' }

/** Pro stays on while Stripe is still retrying a failed renewal (`past_due`). */
export function subscriptionGrantsPro(status: string): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due'
}

function subscriptionCustomerId(subscription: Stripe.Subscription): string | undefined {
  const c = subscription.customer
  if (typeof c === 'string') return c
  if (c && typeof c === 'object' && 'id' in c && typeof (c as { id: string }).id === 'string') {
    return (c as { id: string }).id
  }
  return undefined
}

function metaStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function normalizeId(v: unknown): string {
  return typeof v === 'string' ? v.trim().toLowerCase() : ''
}

/**
 * Normalize an observed `admin_override` value to the two states this module ever writes:
 * `false` or `null`. `true` is never produced here — callers must check `row.admin_override ===
 * true` themselves *before* calling this, since collapsing `true` into `false` here would make a
 * reread that finds an admin has granted override look like an ordinary, unprotected `false` row
 * instead of a protected conflict.
 */
function normalizeObservedOverride(v: unknown): false | null {
  return v === null || v === undefined ? null : false
}

/** Apply a compare-and-set filter for the `admin_override` value observed at read time. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withObservedOverrideFilter(q: any, observed: false | null): any {
  return observed === null ? q.is('admin_override', null) : q.eq('admin_override', false)
}

/** Apply a compare-and-set filter for the `stripe_subscription_id` value observed at read time. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withObservedSubIdFilter(q: any, observed: string | null): any {
  return observed === null ? q.is('stripe_subscription_id', null) : q.eq('stripe_subscription_id', observed)
}

function defaultLog(level: SyncLogLevel, fields: Record<string, unknown>): void {
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  fn('[billing-sync]', fields)
}

/**
 * Read the current, authoritative subscription id off a Checkout Session for a
 * subscription-mode checkout (undefined for one-time payment sessions like early access).
 */
export function extractSessionSubscriptionId(session: Stripe.Checkout.Session): string | null {
  const raw = session.subscription
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object' && 'id' in raw && typeof (raw as { id: unknown }).id === 'string') {
    return (raw as { id: string }).id
  }
  return null
}

/**
 * Read the subscription id off an invoice. The installed Stripe API version ("clover") moved
 * this under `parent.subscription_details.subscription`; `subscription` is kept as a fallback
 * for older event payload shapes.
 */
export function extractInvoiceSubscriptionId(invoice: Record<string, unknown>): string | null {
  const parent = invoice.parent as Record<string, unknown> | undefined
  const subDetails =
    parent && typeof parent === 'object'
      ? (parent.subscription_details as Record<string, unknown> | undefined)
      : undefined
  const fromParent = subDetails && typeof subDetails === 'object' ? subDetails.subscription : undefined
  const raw = fromParent ?? invoice.subscription
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object' && 'id' in raw && typeof (raw as { id: unknown }).id === 'string') {
    return (raw as { id: string }).id
  }
  return null
}

/**
 * Authoritative Pro subscription sync, shared by the webhook and any future authenticated
 * verification endpoint.
 *
 * Always re-fetches the subscription from Stripe by id — never trusts a webhook payload object
 * directly — so a delayed/out-of-order event can't regrant access a later event already revoked,
 * and a legacy subscription on an old price is honored without requiring the currently
 * configured price id. Never mutates the Stripe subscription; only reads it.
 *
 * Resolution order:
 * 1. A business row already mapped to this subscription id (`stripe_subscription_id` match) is
 *    the normal path for every lifecycle update, including legacy old-price subscriptions.
 * 2. If no row is mapped and the subscription now grants Pro, attach it to the business named in
 *    `metadata.business_id` — but only when `metadata.source === 'pro_subscription'` and
 *    `metadata.supabase_user_id` matches the *root* business's `user_id` (so an arbitrary,
 *    unrelated Stripe subscription can never grant Pro just by copying metadata field names).
 *
 * Rows with `admin_override: true` (admin-granted Pro/AI) are never modified by this sync.
 */
export async function syncSubscriptionById(
  deps: SubscriptionSyncDeps,
  subscriptionId: string,
  ctx: SyncContext
): Promise<SyncResult> {
  const log = deps.log || defaultLog

  let subscription: Stripe.Subscription
  try {
    subscription = await deps.stripe.subscriptions.retrieve(subscriptionId)
  } catch {
    log('error', { scope: 'sync.retrieve', eventId: ctx.eventId, eventType: ctx.eventType, subscriptionId })
    return { ok: false, reason: 'stripe_retrieve_failed' }
  }

  const subId = subscription.id
  const grantsPro = subscriptionGrantsPro(subscription.status)
  const customerId = subscriptionCustomerId(subscription)
  const businessIdMeta = metaStr(subscription.metadata?.business_id)
  const userIdMeta = metaStr(subscription.metadata?.supabase_user_id)
  const sourceMeta = metaStr(subscription.metadata?.source)

  const { data: mappedRows, error: mappedErr } = await deps.supabase
    .from('businesses')
    .select('id, tier, admin_override, stripe_customer_id, parent_business_id')
    .eq('stripe_subscription_id', subId)

  if (mappedErr) {
    log('error', {
      scope: 'sync.lookup_by_sub',
      eventId: ctx.eventId,
      eventType: ctx.eventType,
      subscriptionId: subId,
    })
    return { ok: false, reason: 'db_error' }
  }

  const mapped = (mappedRows as SbRow[] | null) || []
  if (mapped.length > 1) {
    // Data corruption (more than one business mapped to the same subscription id) — do not
    // silently operate on the first row; fail loudly so it can be investigated and Stripe retries.
    log('error', {
      scope: 'sync.lookup_by_sub_ambiguous',
      eventId: ctx.eventId,
      eventType: ctx.eventType,
      subscriptionId: subId,
      rowCount: mapped.length,
    })
    return { ok: false, reason: 'db_error' }
  }

  if (mapped.length === 1) {
    const row = mapped[0]!
    const businessId = String(row.id)

    if (typeof row.parent_business_id === 'string' && row.parent_business_id.trim()) {
      // Only root businesses are ever attached to a subscription id; a child row being mapped
      // indicates corrupted data, not a normal case to silently update.
      log('error', {
        scope: 'sync.lookup_by_sub_non_root',
        eventId: ctx.eventId,
        eventType: ctx.eventType,
        subscriptionId: subId,
        businessId,
      })
      return { ok: false, reason: 'db_error' }
    }

    if (row.admin_override === true) {
      log('info', {
        scope: 'sync.preserve_admin_override',
        eventId: ctx.eventId,
        eventType: ctx.eventType,
        subscriptionId: subId,
        businessId,
      })
      return { ok: true, action: 'no_change', businessId }
    }

    const payload = grantsPro
      ? {
          tier: 'pro' as const,
          admin_override: false,
          stripe_subscription_id: subId,
          ...(customerId ? { stripe_customer_id: customerId } : {}),
        }
      : { tier: 'free' as const, admin_override: false, stripe_subscription_id: null }

    const observedOverride = normalizeObservedOverride(row.admin_override)
    const runUpdate = () => {
      let q = deps.supabase.from('businesses').update(payload).eq('id', businessId).eq('stripe_subscription_id', subId)
      q = withObservedOverrideFilter(q, observedOverride)
      return q.select('id')
    }

    let { data: updated, error: updateErr } = await runUpdate()
    if (updateErr) {
      log('error', {
        scope: 'sync.update_mapped',
        eventId: ctx.eventId,
        eventType: ctx.eventType,
        subscriptionId: subId,
        businessId,
      })
      return { ok: false, reason: 'db_error' }
    }

    let affected = (updated as SbRow[] | null) || []
    if (affected.length === 0) {
      // The compare-and-set update matched zero rows: either a concurrent event already moved
      // this business to a different mapping/admin_override (respect it, don't overwrite), or
      // this was a transient conflict against the exact same observed state (retry once).
      const { data: reread, error: rereadErr } = await deps.supabase
        .from('businesses')
        .select('id, admin_override, stripe_subscription_id')
        .eq('id', businessId)
        .maybeSingle()

      if (rereadErr) {
        log('error', {
          scope: 'sync.update_mapped_reread_failed',
          eventId: ctx.eventId,
          eventType: ctx.eventType,
          subscriptionId: subId,
          businessId,
        })
        return { ok: false, reason: 'db_error' }
      }

      const current = reread as SbRow | null
      const stillMatchesObserved =
        current !== null &&
        current.admin_override !== true &&
        current.stripe_subscription_id === subId &&
        normalizeObservedOverride(current.admin_override) === observedOverride

      if (!stillMatchesObserved) {
        log('warn', {
          scope: 'sync.update_mapped_race',
          eventId: ctx.eventId,
          eventType: ctx.eventType,
          subscriptionId: subId,
          businessId,
        })
        return { ok: true, action: 'no_change', businessId }
      }

      ;({ data: updated, error: updateErr } = await runUpdate())
      if (updateErr) {
        log('error', {
          scope: 'sync.update_mapped_retry',
          eventId: ctx.eventId,
          eventType: ctx.eventType,
          subscriptionId: subId,
          businessId,
        })
        return { ok: false, reason: 'db_error' }
      }
      affected = (updated as SbRow[] | null) || []
      if (affected.length === 0) {
        log('error', {
          scope: 'sync.update_mapped_conflict_unresolved',
          eventId: ctx.eventId,
          eventType: ctx.eventType,
          subscriptionId: subId,
          businessId,
        })
        return { ok: false, reason: 'db_error' }
      }
    }

    return { ok: true, action: grantsPro ? 'granted' : 'downgraded', businessId }
  }

  // No business currently mapped to this subscription id.
  if (!grantsPro) {
    // Likely a stale/replaced subscription (see module docs) — nothing to downgrade.
    return { ok: true, action: 'ignored' }
  }

  const isAppSubscription = sourceMeta === 'pro_subscription' && businessIdMeta !== null && userIdMeta !== null
  if (!isAppSubscription) {
    // Unrelated Stripe subscription (not created by ReviewFlo checkout) — ignore, not an error.
    return { ok: true, action: 'ignored' }
  }

  const { data: bizRow, error: bizErr } = await deps.supabase
    .from('businesses')
    .select('id, user_id, parent_business_id, admin_override, stripe_subscription_id')
    .eq('id', businessIdMeta)
    .maybeSingle()

  if (bizErr) {
    log('error', {
      scope: 'sync.attach_lookup',
      eventId: ctx.eventId,
      eventType: ctx.eventType,
      subscriptionId: subId,
      businessId: businessIdMeta,
    })
    return { ok: false, reason: 'db_error' }
  }
  if (!bizRow) {
    log('error', {
      scope: 'sync.attach_missing_business',
      eventId: ctx.eventId,
      eventType: ctx.eventType,
      subscriptionId: subId,
      businessId: businessIdMeta,
    })
    return { ok: false, reason: 'missing_mapping' }
  }

  const root = bizRow as SbRow
  if (typeof root.parent_business_id === 'string' && root.parent_business_id.trim()) {
    // Checkout always stamps metadata.business_id with the already-resolved root id (see
    // pages/api/create-checkout-session.ts). A business_id that itself has a parent means the
    // metadata points at a child row — reject it rather than silently mapping a different root.
    log('error', {
      scope: 'sync.attach_child_metadata_rejected',
      eventId: ctx.eventId,
      eventType: ctx.eventType,
      subscriptionId: subId,
      businessId: businessIdMeta,
    })
    return { ok: true, action: 'ignored' }
  }

  const rootId = String(root.id)

  if (normalizeId(root.user_id) !== normalizeId(userIdMeta)) {
    log('error', {
      scope: 'sync.attach_ownership_mismatch',
      eventId: ctx.eventId,
      eventType: ctx.eventType,
      subscriptionId: subId,
      businessId: rootId,
    })
    return { ok: true, action: 'ignored' }
  }

  if (root.admin_override === true) {
    log('info', {
      scope: 'sync.attach_preserve_admin_override',
      eventId: ctx.eventId,
      eventType: ctx.eventType,
      subscriptionId: subId,
      businessId: rootId,
    })
    return { ok: true, action: 'no_change', businessId: rootId }
  }

  const priorSubId =
    typeof root.stripe_subscription_id === 'string' && root.stripe_subscription_id.trim()
      ? root.stripe_subscription_id.trim()
      : null

  if (priorSubId && priorSubId !== subId) {
    try {
      const priorSub = await deps.stripe.subscriptions.retrieve(priorSubId)
      if (subscriptionGrantsPro(priorSub.status)) {
        log('error', {
          scope: 'sync.attach_conflict_active',
          eventId: ctx.eventId,
          eventType: ctx.eventType,
          subscriptionId: subId,
          businessId: rootId,
        })
        return { ok: true, action: 'ignored' }
      }
    } catch {
      log('error', {
        scope: 'sync.attach_conflict_check_failed',
        eventId: ctx.eventId,
        eventType: ctx.eventType,
        subscriptionId: subId,
        businessId: rootId,
      })
      return { ok: false, reason: 'stripe_retrieve_failed' }
    }
  }

  const attachPayload = {
    tier: 'pro' as const,
    admin_override: false,
    stripe_subscription_id: subId,
    ...(customerId ? { stripe_customer_id: customerId } : {}),
  }

  const observedRootOverride = normalizeObservedOverride(root.admin_override)
  const runAttachUpdate = () => {
    let q = deps.supabase.from('businesses').update(attachPayload).eq('id', rootId)
    q = withObservedSubIdFilter(q, priorSubId)
    q = withObservedOverrideFilter(q, observedRootOverride)
    return q.select('id')
  }

  let { data: attached, error: attachErr } = await runAttachUpdate()

  if (attachErr) {
    log('error', {
      scope: 'sync.attach_update',
      eventId: ctx.eventId,
      eventType: ctx.eventType,
      subscriptionId: subId,
      businessId: rootId,
    })
    return { ok: false, reason: 'db_error' }
  }

  let attachedRows = (attached as SbRow[] | null) || []
  if (attachedRows.length === 0) {
    // The compare-and-set attach matched zero rows: either a concurrent event already moved this
    // business to a different subscription/admin_override (respect it, don't overwrite), or this
    // was a transient conflict against the exact same observed state (retry once).
    const { data: reread, error: rereadErr } = await deps.supabase
      .from('businesses')
      .select('id, admin_override, stripe_subscription_id')
      .eq('id', rootId)
      .maybeSingle()

    if (rereadErr) {
      log('error', {
        scope: 'sync.attach_reread_failed',
        eventId: ctx.eventId,
        eventType: ctx.eventType,
        subscriptionId: subId,
        businessId: rootId,
      })
      return { ok: false, reason: 'db_error' }
    }

    const current = reread as SbRow | null
    const currentSubId =
      current && typeof current.stripe_subscription_id === 'string' && current.stripe_subscription_id.trim()
        ? current.stripe_subscription_id.trim()
        : null
    const stillMatchesObserved =
      current !== null &&
      current.admin_override !== true &&
      currentSubId === priorSubId &&
      normalizeObservedOverride(current.admin_override) === observedRootOverride

    if (!stillMatchesObserved) {
      log('warn', {
        scope: 'sync.attach_conflict_race',
        eventId: ctx.eventId,
        eventType: ctx.eventType,
        subscriptionId: subId,
        businessId: rootId,
      })
      return { ok: true, action: 'ignored' }
    }

    ;({ data: attached, error: attachErr } = await runAttachUpdate())
    if (attachErr) {
      log('error', {
        scope: 'sync.attach_update_retry',
        eventId: ctx.eventId,
        eventType: ctx.eventType,
        subscriptionId: subId,
        businessId: rootId,
      })
      return { ok: false, reason: 'db_error' }
    }
    attachedRows = (attached as SbRow[] | null) || []
    if (attachedRows.length === 0) {
      log('error', {
        scope: 'sync.attach_conflict_unresolved',
        eventId: ctx.eventId,
        eventType: ctx.eventType,
        subscriptionId: subId,
        businessId: rootId,
      })
      return { ok: false, reason: 'db_error' }
    }
  }

  // Bounded post-attach reconciliation: the subscription read at the top of this call can already
  // be stale if a cancellation event raced us and found no mapping to act on (nothing to
  // downgrade). Re-verify authoritative state once more, immediately after attaching, and revoke
  // only this subscription if Stripe already shows it inactive.
  let reconcileSub: Stripe.Subscription
  try {
    reconcileSub = await deps.stripe.subscriptions.retrieve(subId)
  } catch {
    log('error', {
      scope: 'sync.attach_reconcile_retrieve_failed',
      eventId: ctx.eventId,
      eventType: ctx.eventType,
      subscriptionId: subId,
      businessId: rootId,
    })
    return { ok: false, reason: 'stripe_retrieve_failed' }
  }

  if (!subscriptionGrantsPro(reconcileSub.status)) {
    const { data: revoked, error: revokeErr } = await deps.supabase
      .from('businesses')
      .update({ tier: 'free' as const, admin_override: false, stripe_subscription_id: null })
      .eq('id', rootId)
      .eq('stripe_subscription_id', subId)
      .eq('admin_override', false)
      .select('id')

    if (revokeErr) {
      log('error', {
        scope: 'sync.attach_reconcile_revoke_failed',
        eventId: ctx.eventId,
        eventType: ctx.eventType,
        subscriptionId: subId,
        businessId: rootId,
      })
      return { ok: false, reason: 'db_error' }
    }

    const revokedRows = (revoked as SbRow[] | null) || []
    if (revokedRows.length > 0) {
      log('warn', {
        scope: 'sync.attach_reconcile_revoked',
        eventId: ctx.eventId,
        eventType: ctx.eventType,
        subscriptionId: subId,
        businessId: rootId,
      })
      return { ok: true, action: 'downgraded', businessId: rootId }
    }
    // Zero rows: something else already changed this mapping since the attach — leave it alone.
  }

  return { ok: true, action: 'attached', businessId: rootId }
}
