import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { firstNonLatin1Index } from '../../lib/stripe-env-ascii';
import { resolveCheckoutBaseUrl } from '../../lib/stripe-checkout-config';
import {
  billingError,
  classifyCheckoutError,
  getBillingSupabaseAdmin,
  logBillingError,
  newCorrelationId,
} from '../../lib/billing-errors';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const requestId = newCorrelationId();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json(billingError('auth_required', requestId));
  }

  const { client: supabaseAdmin, error: adminInitError } = getBillingSupabaseAdmin();
  if (!supabaseAdmin) {
    logBillingError('create-early-access-checkout.init', requestId, adminInitError);
    return res.status(500).json(billingError('config_error', requestId));
  }

  const token = authHeader.replace('Bearer ', '');
  let user: { id: string; email?: string | null };
  try {
    const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !data.user) {
      return res.status(401).json(billingError('auth_invalid', requestId));
    }
    user = data.user;
  } catch (err) {
    logBillingError('create-early-access-checkout.auth', requestId, err);
    return res.status(500).json(billingError('internal_error', requestId));
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    logBillingError('create-early-access-checkout.config', requestId, undefined, { missing: 'STRIPE_SECRET_KEY' });
    return res.status(500).json(billingError('config_error', requestId));
  }

  const trimmedSecret = secretKey.trim();
  const badKey = firstNonLatin1Index(trimmedSecret);
  if (badKey) {
    logBillingError('create-early-access-checkout.config', requestId, undefined, {
      invalidEnv: 'STRIPE_SECRET_KEY',
      index: badKey.index,
    });
    return res.status(500).json(billingError('config_error', requestId));
  }

  const priceId = process.env.STRIPE_EARLY_ACCESS_PRICE_ID?.trim();
  if (priceId) {
    const badPrice = firstNonLatin1Index(priceId);
    if (badPrice) {
      logBillingError('create-early-access-checkout.config', requestId, undefined, {
        invalidEnv: 'STRIPE_EARLY_ACCESS_PRICE_ID',
        index: badPrice.index,
      });
      return res.status(500).json(billingError('config_error', requestId));
    }
  }

  const baseUrl = resolveCheckoutBaseUrl(trimmedSecret);

  try {
    const stripe = new Stripe(trimmedSecret, {
      apiVersion: '2026-02-25.clover',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Use your Stripe product's Price ID if set; otherwise fall back to inline price
    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'ReviewFlo Early Access',
                description: '2 months of full ReviewFlo access',
              },
              unit_amount: 1000,
            },
            quantity: 1,
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${baseUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/early-access`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: {
        source: 'early_access',
        user_id: user.id,
      },
    });

    if (!session.url) {
      logBillingError('create-early-access-checkout.no-url', requestId, undefined);
      return res.status(500).json(billingError('stripe_error', requestId));
    }

    return res.status(200).json({ url: session.url, requestId });
  } catch (error: unknown) {
    const reason = classifyCheckoutError(error);
    logBillingError('create-early-access-checkout', requestId, error);
    return res.status(500).json(billingError(reason, requestId));
  }
}
