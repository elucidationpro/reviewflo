import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { billingLogFields, getBillingSupabaseAdmin } from '../../../lib/billing-errors';
import {
  extractInvoiceSubscriptionId,
  extractSessionSubscriptionId,
  syncSubscriptionById,
  type SupabaseLike,
  type SyncResult,
} from '../../../lib/stripe-subscription-sync';
import { sanitizeUtmValue, type BillingInterval } from '../../../lib/checkout-analytics';
import { captureCheckoutCompletedFromSession, captureCheckoutFailedEvent } from '../../../lib/billing-analytics';

function metaBillingInterval(v: unknown): BillingInterval {
  return v === 'year' ? 'year' : 'month';
}

function metaStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/**
 * Best-effort checkout conversion capture after subscription sync. A subscription event may
 * sync first, so granted/attached/no_change all require a fresh paid root mapping and matching
 * session owner. Ignored, downgraded, and admin-overridden outcomes are excluded. Analytics
 * lookup/capture failures never change the webhook response or subscription sync behavior.
 */
async function emitCheckoutCompletedAnalytics(
  session: Stripe.Checkout.Session,
  syncResult: Extract<SyncResult, { ok: true }>,
  deps: { supabase: SupabaseLike }
): Promise<void> {
  try {
    const { action, businessId } = syncResult;
    if (action !== 'granted' && action !== 'attached' && action !== 'no_change') return;
    if (session.metadata?.source !== 'pro_subscription') return;
    if (session.mode !== 'subscription') return;
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return;

    const distinctId = metaStr(session.metadata?.supabase_user_id);
    const businessIdMeta = metaStr(session.metadata?.business_id);
    const subId = extractSessionSubscriptionId(session);
    if (!distinctId || !businessIdMeta || !subId || typeof session.created !== 'number') return;

    if (!businessId || businessId !== businessIdMeta) return;
    // Re-read the authoritative row for every action (not just `no_change`) — the sync's own
    // resolved action/businessId could still be stale by the time this best-effort check runs,
    // and mismatched checkout metadata must never misattribute an event to another user/business.
    const { data: row } = await deps.supabase
      .from('businesses')
      .select('id, user_id, tier, admin_override, stripe_subscription_id, parent_business_id')
      .eq('id', businessId)
      .maybeSingle();
    if (!row) return;
    if (typeof row.parent_business_id === 'string' && row.parent_business_id.trim()) return;
    if (row.admin_override !== false) return;
    if (row.tier !== 'pro') return;
    if (String(row.stripe_subscription_id || '') !== subId) return;
    if (String(row.user_id || '').trim().toLowerCase() !== distinctId.trim().toLowerCase()) return;

    await captureCheckoutCompletedFromSession({
      sessionId: session.id,
      created: session.created,
      distinctId,
      billingInterval: metaBillingInterval(session.metadata?.billing_interval),
      utmSource: sanitizeUtmValue(session.metadata?.utm_source),
    });
  } catch {
    // Best effort only — analytics must never affect webhook processing/sync behavior.
  }
}

/**
 * Best-effort `checkout_failed` (reason: payment_failed) capture for `invoice.payment_failed`.
 * Re-retrieves the subscription for reliable metadata/source and validates the metadata's
 * supabase_user_id against the root business row before using it as the analytics identity —
 * mirrors the ownership check `syncSubscriptionById` performs, so spoofed metadata can't attribute
 * an event to an unrelated user. Never throws and never alters sync behavior.
 */
async function emitInvoicePaymentFailedAnalytics(
  deps: { supabase: SupabaseLike; stripe: Stripe },
  subscriptionId: string,
  eventId: string,
  eventCreated: number
): Promise<void> {
  try {
    // Bounded, non-retrying: this is a best-effort analytics-only lookup, separate from the
    // correctness-critical sync retrieve, and must never add webhook latency/retry amplification.
    const subscription = await deps.stripe.subscriptions.retrieve(subscriptionId, {}, {
      timeout: 5000,
      maxNetworkRetries: 0,
    });
    if (metaStr(subscription.metadata?.source) !== 'pro_subscription') return;
    const businessIdMeta = metaStr(subscription.metadata?.business_id);
    const userIdMeta = metaStr(subscription.metadata?.supabase_user_id);
    if (!businessIdMeta || !userIdMeta) return;

    const { data: row } = await deps.supabase
      .from('businesses')
      .select('id, user_id, parent_business_id')
      .eq('id', businessIdMeta)
      .maybeSingle();
    if (!row) return;
    if (typeof row.parent_business_id === 'string' && row.parent_business_id.trim()) return;
    if (String(row.user_id || '').trim().toLowerCase() !== userIdMeta.trim().toLowerCase()) return;

    await captureCheckoutFailedEvent({
      stripeEventId: eventId,
      eventCreated,
      distinctId: userIdMeta,
      billingInterval: metaBillingInterval(subscription.metadata?.billing_interval),
      utmSource: sanitizeUtmValue(subscription.metadata?.utm_source),
      reason: 'payment_failed',
    });
  } catch {
    // Best effort only — analytics must never affect webhook processing.
  }
}

function isLiveSecretKey(secretKey: string): boolean {
  return secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_');
}

// Disable body parsing, need raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

// Helper to read raw body
async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Legacy one-time early-access purchase (`$10`, not a Pro subscription). Kept functionally
 * unchanged; only DB/email error logging was sanitized (never log a raw Stripe/DB message).
 */
async function handleEarlyAccessCheckout(
  session: Stripe.Checkout.Session,
  supabase: SupabaseLike,
  eventId: string
): Promise<void> {
  const customerEmail = session.customer_details?.email;
  const userId = session.metadata?.user_id || session.client_reference_id;

  if (!customerEmail) {
    console.error('[Stripe webhook]', { scope: 'early_access.no_email', eventId, sessionId: session.id });
    return;
  }

  const accessStartDate = new Date();
  const accessEndDate = new Date();
  accessEndDate.setMonth(accessEndDate.getMonth() + 2);

  if (userId) {
    const { error: updateError } = await supabase
      .from('early_access_signups')
      .update({
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent as string,
        access_start_date: accessStartDate.toISOString(),
        access_end_date: accessEndDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error(
        '[Stripe webhook]',
        billingLogFields('webhook.early_access.update_signup', eventId, updateError)
      );
    }
  }

  const { error: dbError } = await supabase.from('early_access_customers').insert({
    email: customerEmail,
    stripe_session_id: session.id,
    stripe_payment_intent: session.payment_intent as string,
    amount_paid: session.amount_total || 1000,
    currency: session.currency || 'usd',
    payment_status: session.payment_status,
    access_start_date: accessStartDate.toISOString(),
    access_end_date: accessEndDate.toISOString(),
    source: 'early_access',
    created_at: new Date().toISOString(),
  });

  if (dbError) {
    console.error('[Stripe webhook]', billingLogFields('webhook.early_access.insert_customer', eventId, dbError));
  }

  // Send welcome email to customer
  let customerEmailSent = false;
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error('[Stripe webhook]', {
        scope: 'early_access.email_skipped_no_key',
        eventId,
      });
    } else {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      const { error: emailError } = await resend.emails.send({
        from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
        to: customerEmail,
        subject: 'Your ReviewFlo early access is active',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4A3428; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
                .button { display: inline-block; background: #4A3428; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                ul { padding-left: 20px; }
                li { margin-bottom: 10px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Your early access is active</h1>
                </div>
                <div class="content">
                  <p>Hi there!</p>

                  <p>Thanks for becoming an early ReviewFlo customer.</p>

                  <p>Your early access includes <strong>2 full months</strong> starting today (ending ${accessEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}).</p>

                  <h2>Next step: complete this short survey</h2>
                  <p><a href="https://usereviewflo.com/survey" class="button">Complete Survey →</a></p>
                  <p>This helps us understand what features you need and how to price ReviewFlo fairly.</p>

                  <p>Once you complete the survey, we'll create your account and email you login details within 24 hours.</p>

                  <h2>What You Get:</h2>
                  <ul>
                    <li>✅ 2 months of full access</li>
                    <li>✅ Stop bad reviews before they go public</li>
                    <li>✅ Get more 5-star Google reviews automatically</li>
                    <li>✅ Priority support from the founder</li>
                    <li>✅ Help shape new features</li>
                  </ul>

                  <p>Questions? Just reply to this email.</p>

                  <p>Thanks for being an early supporter!</p>

                  <p><strong>- Jeremy</strong><br>
                  ReviewFlo<br>
                  <a href="mailto:jeremy@usereviewflo.com">jeremy@usereviewflo.com</a></p>
                </div>
                <div class="footer">
                  <p>© 2026 ReviewFlo. All rights reserved.</p>
                  <p>You're receiving this because you purchased ReviewFlo Early Access.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      if (emailError) {
        console.error('[Stripe webhook]', billingLogFields('webhook.early_access.send_email', eventId, emailError));
        // Don't fail the webhook - we got paid and stored the data
      } else {
        customerEmailSent = true;
      }
    }
  } catch (emailError) {
    console.error('[Stripe webhook]', billingLogFields('webhook.early_access.send_email_exception', eventId, emailError));
  }

  // Notify admin
  try {
    let fullName = '';
    let businessType = '';
    if (userId) {
      const { data: signup } = await supabase
        .from('early_access_signups')
        .select('full_name, business_type')
        .eq('user_id', userId)
        .single();
      if (signup) {
        fullName = (signup.full_name as string) || '';
        businessType = (signup.business_type as string) || '';
      }
    }
    const { sendAdminNotification } = await import('../../../lib/email-service');
    await sendAdminNotification('early_access', {
      email: customerEmail,
      fullName: fullName || undefined,
      amountCents: session.amount_total ?? 1000,
      businessType: businessType || undefined,
      customerEmailSent,
    });
  } catch (adminErr) {
    console.error(
      '[Stripe webhook]',
      billingLogFields('webhook.early_access.admin_notification', eventId, adminErr)
    );
  }

  console.log('[Stripe webhook] Early access payment processed', { eventId, sessionId: session.id });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Stripe sends POST; 405 means something (e.g. redirect) turned it into GET - check Vercel Logs for this line
  if (req.method !== 'POST') {
    console.warn('[Stripe webhook] Received non-POST method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!webhookSecret || !secretKey) {
    console.error('[Stripe webhook]', {
      scope: 'webhook.config',
      hasWebhookSecret: Boolean(webhookSecret),
      hasSecretKey: Boolean(secretKey),
    });
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const { client: supabaseAdmin, error: supabaseInitError } = getBillingSupabaseAdmin();
  if (!supabaseAdmin) {
    console.error('[Stripe webhook]', billingLogFields('webhook.supabase-init', 'n/a', supabaseInitError));
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let stripe: Stripe;
  try {
    stripe = new Stripe(secretKey, { apiVersion: '2026-02-25.clover' });
  } catch (err) {
    console.error('[Stripe webhook]', billingLogFields('webhook.stripe-init', 'n/a', err));
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error('[Stripe webhook]', billingLogFields('webhook.raw_body_read', 'n/a', err));
    return res.status(400).json({ error: 'Failed to read request body' });
  }
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).json({ error: 'No signature found' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    console.error('[Stripe webhook]', { scope: 'webhook.signature_invalid' });
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.livemode !== isLiveSecretKey(secretKey)) {
    console.error('[Stripe webhook]', { scope: 'webhook.mode_mismatch', eventId: event.id });
    return res.status(400).json({ error: 'Event mode mismatch' });
  }

  const syncDeps = { supabase: supabaseAdmin, stripe };

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.source === 'early_access') {
          await handleEarlyAccessCheckout(session, supabaseAdmin, event.id);
          break;
        }

        const subId = extractSessionSubscriptionId(session);
        if (subId) {
          const result = await syncSubscriptionById(syncDeps, subId, {
            eventId: event.id,
            eventType: event.type,
          });
          if (!result.ok) {
            console.error('[Stripe webhook]', {
              scope: 'checkout.session.completed',
              eventId: event.id,
              subscriptionId: subId,
              reason: result.reason,
            });
            return res.status(500).json({ error: 'Sync failed' });
          }
          await emitCheckoutCompletedAnalytics(session, result, syncDeps);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const result = await syncSubscriptionById(syncDeps, subscription.id, {
          eventId: event.id,
          eventType: event.type,
        });
        if (!result.ok) {
          console.error('[Stripe webhook]', {
            scope: event.type,
            eventId: event.id,
            subscriptionId: subscription.id,
            reason: result.reason,
          });
          return res.status(500).json({ error: 'Sync failed' });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const subId = extractInvoiceSubscriptionId(invoice);
        console.warn('[Stripe webhook]', {
          scope: 'invoice.payment_failed',
          eventId: event.id,
          subscriptionId: subId ?? undefined,
        });
        if (subId) {
          const result = await syncSubscriptionById(syncDeps, subId, {
            eventId: event.id,
            eventType: event.type,
          });
          if (!result.ok) {
            console.error('[Stripe webhook]', {
              scope: 'invoice.payment_failed',
              eventId: event.id,
              subscriptionId: subId,
              reason: result.reason,
            });
            return res.status(500).json({ error: 'Sync failed' });
          }
          await emitInvoicePaymentFailedAnalytics(syncDeps, subId, event.id, event.created);
        }
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Stripe webhook]', billingLogFields('webhook.handler', event.id, error));
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}
