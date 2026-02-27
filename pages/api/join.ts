import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { isValidSlug, isReservedSlug, normalizeSlugForValidation } from '@/lib/slug-utils';
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
    if (isReservedSlug(normalizedSlug)) {
      return res.status(400).json({
        error: 'That link is reserved. Please choose another.',
      });
    }
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

    // Create business with chosen slug (must match dashboard query: WHERE user_id = auth.uid())
    const businessInsert = {
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
    };
    console.log('[join] Before business insert – user_id:', authData.user.id, 'slug:', normalizedSlug, 'business_name:', businessNameTrim);
    console.log('[join] Business insert payload:', JSON.stringify(businessInsert, null, 2));

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert(businessInsert)
      .select()
      .single();

    if (businessError || !business) {
      console.error('[join] Business insert failed:', businessError);
      console.error('[join] Business error details:', JSON.stringify(businessError, null, 2));
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        error: businessError?.message || 'Failed to create business. Please try again or contact support.',
      });
    }
    console.log('[join] Business created successfully – id:', business.id, 'user_id:', business.user_id);

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

    const { error: templatesError } = await supabaseAdmin
      .from('review_templates')
      .insert(templatesToCreate);

    if (templatesError) {
      console.error('[join] Template insert failed:', templatesError);
      // Rollback: delete business and auth user so signup can be retried
      await supabaseAdmin.from('businesses').delete().eq('id', business.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        error: 'Failed to create default templates. Please try again or contact support.',
      });
    }
    console.log('[join] 3 default templates created for business:', business.id);

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

    // Send welcome email (transactional tone, plain text + minimal HTML for deliverability)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com';
    const loginUrl = `${baseUrl}/login`;
    const reviewPageUrl = `${baseUrl}/${normalizedSlug}`;
    const loginDisplay = 'usereviewflo.com/login';

    try {
      const emailText = `Hi ${businessNameTrim},

Your ReviewFlo account is ready.

Login: ${loginDisplay}
Email: ${emailTrim}
Password: (the one you created)

Your review link: ${reviewPageUrl}

Send this link to customers after each job.

Questions? Reply to this email.

- Jeremy
ReviewFlo`;

      const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">
<p>Hi ${businessNameTrim},</p>
<p>Your ReviewFlo account is ready.</p>
<p><strong>Login:</strong> <a href="${loginUrl}" style="color: #2563eb;">${loginDisplay}</a><br>
<strong>Email:</strong> ${emailTrim}<br>
<strong>Password:</strong> (the one you created)</p>
<p><strong>Your review link:</strong> <a href="${reviewPageUrl}" style="color: #2563eb;">${reviewPageUrl}</a></p>
<p>Send this link to customers after each job.</p>
<p>Questions? Reply to this email.</p>
<p>- Jeremy<br>ReviewFlo</p>
</body>
</html>`;

      await resend.emails.send({
        from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
        to: emailTrim,
        subject: 'Your ReviewFlo Account - Login Details',
        text: emailText,
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
