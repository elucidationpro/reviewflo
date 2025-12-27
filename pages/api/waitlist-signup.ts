import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { sendWaitlistConfirmationEmail, sendAdminNotification } from '@/lib/email-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, businessType, businessName } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!businessName) {
      return res.status(400).json({ error: 'Business name is required' });
    }

    // Check for duplicate email in leads table
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, email, status')
      .eq('email', email)
      .single();

    if (existingLead) {
      // Email already exists - return appropriate message based on status
      const statusMessages: Record<string, string> = {
        'waitlist': 'You\'re already on our waitlist! We\'ll notify you when ReviewFlo launches.',
        'beta_invited': 'Great news! You\'ve been invited to our beta program. Check your email for details!',
        'beta_active': 'You\'re already part of our beta program!',
        'converted': 'This email already has an active ReviewFlo account.',
        'declined': 'This email was previously declined.'
      };

      return res.status(200).json({
        success: true,
        message: statusMessages[existingLead.status] || 'This email is already registered.'
      });
    }

    // Insert into leads table with status='waitlist'
    console.log('[waitlist-signup] Attempting to insert into leads:', { email, business_name: businessName, business_type: businessType || 'other' });
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          email,
          business_name: businessName,
          business_type: businessType || 'other', // Default to 'other' instead of null
          status: 'waitlist',
          source: 'waitlist',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('[waitlist-signup] Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return res.status(500).json({
        error: 'Failed to save to waitlist',
        debug: {
          message: error.message,
          code: error.code,
          details: error.details
        }
      });
    }

    console.log('[waitlist-signup] Successfully inserted into leads:', data);

    // Send confirmation email to user
    console.log('[waitlist-signup] Sending confirmation email to:', email);
    const confirmationResult = await sendWaitlistConfirmationEmail({ email });
    console.log('[waitlist-signup] Confirmation email result:', confirmationResult);

    // Send notification to admin
    console.log('[waitlist-signup] Sending admin notification');
    const adminResult = await sendAdminNotification('waitlist', {
      email,
      businessType,
      businessName
    });
    console.log('[waitlist-signup] Admin notification result:', adminResult);

    return res.status(200).json({
      success: true,
      message: 'Added to waitlist',
      data
    });

  } catch (error) {
    console.error('[waitlist-signup] Caught exception:', error);
    console.error('[waitlist-signup] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({
      error: 'Internal server error',
      debug: error instanceof Error ? error.message : String(error)
    });
  }
}
