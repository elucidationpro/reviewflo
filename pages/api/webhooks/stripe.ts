import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { sendAdminNotification } from '@/lib/email-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Stripe sends POST; 405 means something (e.g. redirect) turned it into GET - check Vercel Logs for this line
  if (req.method !== 'POST') {
    console.warn('[Stripe webhook] Received non-POST method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'No signature found' });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Only process early access payments
      if (session.metadata?.source === 'early_access') {
        const customerEmail = session.customer_details?.email;
        const userId = session.metadata.user_id || session.client_reference_id;

        if (!customerEmail) {
          console.error('No customer email found in session:', session.id);
          return res.status(400).json({ error: 'No customer email' });
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
            console.error('Error updating early_access_signups:', updateError);
          }
        }

        const { error: dbError } = await supabase
          .from('early_access_customers')
          .insert({
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
          console.error('Error storing early access customer:', dbError);
        }

        // Send welcome email to customer
        let customerEmailSent = false;
        try {
          const resendKey = process.env.RESEND_API_KEY;
          if (!resendKey) {
            console.error('Early access welcome email skipped: RESEND_API_KEY is not set. Add it in Vercel (or .env.local for local webhook testing).');
          } else {
          const { error: emailError } = await resend.emails.send({
            from: 'ReviewFlo <jeremy@usereviewflo.com>',
            to: customerEmail,
            subject: 'Welcome to ReviewFlo Early Access! 🚀',
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #4A3428; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background: #C9A961; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
                    ul { padding-left: 20px; }
                    li { margin-bottom: 10px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>🎉 Welcome to ReviewFlo Early Access!</h1>
                    </div>
                    <div class="content">
                      <p>Hi there,</p>

                      <p><strong>Thank you for being one of the first 50 businesses to join ReviewFlo!</strong></p>

                      <p>Your early access starts today and runs for <strong>2 full months</strong> (until ${accessEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}).</p>

                      <h2>What's Next?</h2>

                      <p>1. <strong>Complete this quick survey</strong> (2 minutes) so we can set up your account:</p>
                      <a href="https://docs.google.com/forms/d/e/1FAIpQLSd1jTmwDjEy5XuG80Ox3FXA3AzMq1bPEpUzZ0cXliJb4I8ozg/viewform?usp=header" class="button">Complete Setup Survey →</a>

                      <p>2. <strong>We'll create your account</strong> within 24 hours and send you login credentials</p>

                      <p>3. <strong>Start using ReviewFlo</strong> to get more 5-star reviews and catch unhappy customers before they post!</p>

                      <h2>What You Get:</h2>
                      <ul>
                        <li>2 months of full ReviewFlo access</li>
                        <li>Stop bad reviews before they go public</li>
                        <li>Get more 5-star Google reviews automatically</li>
                        <li>Priority founder support (that's me, Jeremy!)</li>
                        <li>Help shape new features through your feedback</li>
                      </ul>

                      <h2>Questions?</h2>
                      <p>Reply to this email or reach out to me directly at <a href="mailto:jeremy@usereviewflo.com">jeremy@usereviewflo.com</a></p>

                      <p>I'm here to help make this an amazing experience for you!</p>

                      <p>Thanks again for being an early supporter! 🙏</p>

                      <p><strong>Jeremy</strong><br>
                      Founder, ReviewFlo</p>
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
            console.error('Error sending early access welcome email:', JSON.stringify(emailError));
            // Don't fail the webhook - we got paid and stored the data
          } else {
            customerEmailSent = true;
          }
          }
        } catch (emailError) {
          console.error('Exception sending early access welcome email:', emailError);
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
          await sendAdminNotification('early_access', {
            email: customerEmail,
            fullName: fullName || undefined,
            amountCents: session.amount_total ?? 1000,
            businessType: businessType || undefined,
            customerEmailSent,
          });
        } catch (adminErr) {
          console.error('Error sending admin early access notification:', adminErr);
        }

        console.log('Early access payment processed successfully:', customerEmail);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
}
