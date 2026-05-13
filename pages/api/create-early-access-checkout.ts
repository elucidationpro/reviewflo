import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { firstNonLatin1Index } from '../../lib/stripe-env-ascii';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  const origin =
    (typeof req.headers.origin === 'string' && req.headers.origin) ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://usereviewflo.com';

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('STRIPE_SECRET_KEY is not set');
    return res.status(500).json({
      error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.',
    });
  }

  const trimmedSecret = secretKey.trim();
  const badKey = firstNonLatin1Index(trimmedSecret);
  if (badKey) {
    console.error('[create-early-access-checkout] STRIPE_SECRET_KEY has non-ASCII at index', badKey.index);
    return res.status(500).json({
      error:
        'Stripe secret key in the server environment contains a non-ASCII character (often a mis-copied key). Re-paste STRIPE_SECRET_KEY from Stripe Dashboard (ASCII only).',
      _debug: { env: 'STRIPE_SECRET_KEY', index: badKey.index, charCode: badKey.code },
    });
  }

  const priceId = process.env.STRIPE_EARLY_ACCESS_PRICE_ID?.trim();
  if (priceId) {
    const badPrice = firstNonLatin1Index(priceId);
    if (badPrice) {
      console.error(
        '[create-early-access-checkout] STRIPE_EARLY_ACCESS_PRICE_ID has non-ASCII at index',
        badPrice.index
      );
      return res.status(500).json({
        error: 'Stripe price ID in the environment contains invalid characters. Re-copy STRIPE_EARLY_ACCESS_PRICE_ID.',
        _debug: { env: 'STRIPE_EARLY_ACCESS_PRICE_ID', index: badPrice.index, charCode: badPrice.code },
      });
    }
  }

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
      success_url: `${origin}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/early-access`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: {
        source: 'early_access',
        user_id: user.id,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);
    const err = error as { message?: string; type?: string; code?: string };
    const message = err?.message || (error instanceof Error ? error.message : 'Failed to create checkout session');
    return res.status(500).json({ error: message });
  }
}
