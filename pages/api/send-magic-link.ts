import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { generateSlugFromBusinessName, normalizeSlugForValidation } from '@/lib/slug-utils';
import { wrapAuthLink } from '@/lib/auth-link-utils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const resend = new Resend(process.env.RESEND_API_KEY);

interface MagicLinkRequest {
  email: string;
  businessName: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, businessName } = req.body as MagicLinkRequest;

    // Validate inputs
    const emailTrim = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const businessNameTrim = typeof businessName === 'string' ? businessName.trim() : '';

    if (!emailTrim || !businessNameTrim) {
      return res.status(400).json({ error: 'Email and business name are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === emailTrim);

    if (userExists) {
      return res.status(400).json({
        error: 'An account with this email already exists. Check your email for the login link, or contact support.'
      });
    }

    // Generate slug from business name
    const generatedSlug = generateSlugFromBusinessName(businessNameTrim);
    const normalizedSlug = normalizeSlugForValidation(generatedSlug || 'my-business');

    // Check if slug is already taken
    const { data: existingBusiness } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('slug', normalizedSlug)
      .single();

    // If slug exists, append random number
    const finalSlug = existingBusiness
      ? `${normalizedSlug}-${Math.floor(Math.random() * 10000)}`
      : normalizedSlug;

    // Store pending signup data in leads table (schema: business_type NOT NULL, status must be waitlist|beta_invited|beta_active|converted|declined)
    const leadPayload = {
      email: emailTrim,
      business_name: businessNameTrim,
      business_type: 'other',
      status: 'waitlist',
      source: 'magic_link_join',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: leadError } = await supabaseAdmin
      .from('leads')
      .upsert(leadPayload, { onConflict: 'email' });

    if (leadError) {
      console.error('[send-magic-link] Lead upsert failed:', leadError);
      return res.status(500).json({
        error: 'Failed to process signup. Please try again.'
      });
    }

    // Generate magic link (generateLink does NOT send email - we send via Resend)
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/api/auth/verify-magic-link`;

    const { data: linkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: emailTrim,
      options: {
        redirectTo,
        data: {
          business_name: businessNameTrim,
          slug: finalSlug,
        }
      }
    });

    if (magicLinkError || !linkData?.properties?.action_link) {
      console.error('[send-magic-link] Magic link generation failed:', magicLinkError);
      return res.status(500).json({
        error: 'Failed to send login link. Please try again or contact support.'
      });
    }

    const actionLink = linkData.properties.action_link;
    const magicLink = wrapAuthLink(actionLink);

    // Send email via Resend (works on localhost if RESEND_API_KEY is set)
    if (!process.env.RESEND_API_KEY) {
      console.error('[send-magic-link] RESEND_API_KEY is not set');
      return res.status(500).json({
        error: 'Email service is not configured. Please try again later or contact support.'
      });
    }

    const { error: emailError } = await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: emailTrim,
      subject: `Your ReviewFlo login link - ${businessNameTrim}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">
          <p>Hi there,</p>
          <p>You requested a login link to create your ReviewFlo account for <strong>${businessNameTrim}</strong>.</p>
          <p><a href="${magicLink}" style="color: #2563eb; font-weight: 600;">Click here to complete your signup</a></p>
          <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <p>- Jeremy<br>ReviewFlo</p>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('[send-magic-link] Email send failed:', emailError);
      return res.status(500).json({
        error: 'Failed to send login link. Please try again or contact support.'
      });
    }

    // Update lead timestamp
    await supabaseAdmin
      .from('leads')
      .update({ updated_at: new Date().toISOString() })
      .eq('email', emailTrim);

    console.log('[send-magic-link] Magic link sent successfully to:', emailTrim);

    return res.status(200).json({
      success: true,
      email: emailTrim,
      message: 'Magic link sent successfully',
    });
  } catch (error) {
    console.error('[send-magic-link] Unexpected error:', error);
    return res.status(500).json({
      error: 'Something went wrong. Please try again.'
    });
  }
}
