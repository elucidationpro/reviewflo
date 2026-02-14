import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('STRIPE_SECRET_KEY is not set');
    return res.status(500).json({
      error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.',
    });
  }

  try {
    const stripe = new Stripe(secretKey, { apiVersion: '2026-01-28.clover' });

    // Use your Stripe product's Price ID if set; otherwise fall back to inline price
    const priceId = process.env.STRIPE_EARLY_ACCESS_PRICE_ID;
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
      success_url: `${req.headers.origin}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/early-access`,
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
