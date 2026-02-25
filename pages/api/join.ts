import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { isValidSlug, normalizeSlugForValidation } from '@/lib/slug-utils';
import { sendAdminNotification } from '@/lib/email-service';

const resend = new Resend(process.env.RESEND_API_KEY);

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

interface JoinRequest {
  name: string;
  businessName: string;
  email: string;
  password: string;
  slug: string;
  phone?: string;
  businessType: string;
  customersPerMonth: string;
  reviewAskingFrequency: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      name,
      businessName,
      email,
      password,
      slug: requestedSlug,
      phone,
      businessType,
      customersPerMonth,
      reviewAskingFrequency,
    } = req.body as JoinRequest;

    const nameTrim = typeof name === 'string' ? name.trim() : '';
    const businessNameTrim = typeof businessName === 'string' ? businessName.trim() : '';
    const emailTrim = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!nameTrim || !businessNameTrim || !emailTrim || !password || !requestedSlug) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!businessType || !customersPerMonth || !reviewAskingFrequency) {
      return res.status(400).json({ error: 'Please answer all questions' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedSlug = normalizeSlugForValidation(requestedSlug);
    if (!isValidSlug(normalizedSlug)) {
      return res.status(400).json({
        error: 'Invalid link. Use only letters, numbers, and hyphens (3–30 characters).',
      });
    }

    // Check slug availability
    const { data: existingBusiness } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('slug', normalizedSlug)
      .single();

    if (existingBusiness) {
      return res.status(400).json({
        error: 'That link is already taken. Please choose another.',
      });
    }

    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('id, status')
      .eq('email', emailTrim)
      .single();

    if (existingLead?.status === 'converted') {
      return res.status(400).json({
        error: 'You already have a ReviewFlo account. Try logging in.',
      });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailTrim,
      password,
      email_confirm: true,
      user_metadata: {
        owner_name: nameTrim,
        business_name: businessNameTrim,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      const msg = authError?.message || '';
      if (
        msg.includes('already been registered') ||
        msg.includes('already exists') ||
        msg.includes('User already registered')
      ) {
        return res.status(400).json({
          error: 'An account with this email already exists. Try logging in or use Forgot Password.',
        });
      }
      return res.status(500).json({
        error: msg || 'Failed to create account',
      });
    }

    // Create business with chosen slug
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        user_id: authData.user.id,
        business_name: businessNameTrim,
        owner_email: emailTrim,
        slug: normalizedSlug,
        primary_color: '#3B82F6',
        logo_url: null,
        google_review_url: null,
        facebook_review_url: null,
        yelp_review_url: null,
        nextdoor_review_url: null,
        terms_accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (businessError || !business) {
      console.error('Error creating business:', businessError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        error: businessError?.message || 'Failed to create business',
      });
    }

    // Create 3 default templates
    const templatesToCreate = [
      {
        business_id: business.id,
        platform: 'google',
        template_text:
          `I had an excellent experience with ${businessNameTrim}! They exceeded my expectations. Highly recommend!`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        business_id: business.id,
        platform: 'facebook',
        template_text:
          `Just had a great experience with ${businessNameTrim}! Professional service and fantastic results. 5 stars! ⭐⭐⭐⭐⭐`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        business_id: business.id,
        platform: 'yelp',
        template_text:
          `5 stars for ${businessNameTrim}! Quality work, professional service, and fair pricing. Will definitely use again.`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    await supabaseAdmin.from('review_templates').insert(templatesToCreate);

    // Upsert lead
    const leadPayload = {
      email: emailTrim,
      name: nameTrim,
      phone: typeof phone === 'string' ? phone.trim() || null : null,
      business_name: businessNameTrim,
      business_type: businessType,
      customers_per_month: customersPerMonth,
      review_asking_frequency: reviewAskingFrequency,
      status: 'converted',
      business_id: business.id,
      source: 'qualify',
      updated_at: new Date().toISOString(),
      email_sent: true,
    };

    if (existingLead) {
      await supabaseAdmin
        .from('leads')
        .update(leadPayload)
        .eq('id', existingLead.id);
    } else {
      await supabaseAdmin.from('leads').insert({
        ...leadPayload,
        created_at: new Date().toISOString(),
      });
    }

    // Send welcome email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com';
    const loginUrl = `${baseUrl}/login`;
    const reviewPageUrl = `${baseUrl}/${normalizedSlug}`;

    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to ReviewFlo</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4A3428; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: #C9A961; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .box { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
              ol { padding-left: 20px; }
              li { margin-bottom: 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">Welcome to ReviewFlo Beta! 🚀</h1>
              </div>
              <div class="content">
                <p>Hi ${nameTrim}!</p>
                <p>Your ReviewFlo account is ready. Log in and start sending your review link to customers today.</p>
                <div class="box">
                  <h2 style="color: #4A3428; font-size: 18px; margin: 0 0 12px 0;">Your login</h2>
                  <p style="margin: 5px 0;"><strong>Website:</strong> <a href="${loginUrl}" style="color: #4A3428;">usereviewflo.com/login</a></p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${emailTrim}</p>
                  <p style="margin: 5px 0;"><strong>Password:</strong> (the one you created)</p>
                </div>
                <div class="box">
                  <h2 style="color: #4A3428; font-size: 18px; margin: 0 0 12px 0;">Your review link</h2>
                  <p style="margin: 5px 0;"><a href="${reviewPageUrl}" style="color: #4A3428;">${reviewPageUrl}</a></p>
                  <p style="margin: 12px 0 0 0;">Share this link with customers after each job.</p>
                </div>
                <h2 style="color: #4A3428; font-size: 18px; margin: 20px 0 10px 0;">What happens next</h2>
                <ol>
                  <li>Your customer opens the link</li>
                  <li>They rate their experience (1–5 stars)</li>
                  <li>If 1–4 stars: You get private feedback via email (nothing goes public)</li>
                  <li>If 5 stars: They see easy templates to post a Google review</li>
                </ol>
                <div style="text-align: center; margin-top: 28px;">
                  <a href="${loginUrl}" class="button">Log In to Your Dashboard</a>
                </div>
              </div>
              <div class="footer">
                <p style="margin: 0;">© ${new Date().getFullYear()} ReviewFlo. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await resend.emails.send({
        from: 'ReviewFlo <jeremy@usereviewflo.com>',
        to: emailTrim,
        subject: `Welcome to ReviewFlo Beta! 🚀 - ${businessNameTrim}`,
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    try {
      await sendAdminNotification('qualify', {
        email: emailTrim,
        name: nameTrim,
        businessName: businessNameTrim,
        slug: normalizedSlug,
        phone: phone || undefined,
        businessType,
        customersPerMonth,
        reviewAskingFrequency,
        emailSent: true,
        source: 'automated_join',
      });
    } catch (adminError) {
      console.error('Admin notification failed:', adminError);
    }

    return res.status(200).json({
      success: true,
      slug: normalizedSlug,
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Error in join API:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
