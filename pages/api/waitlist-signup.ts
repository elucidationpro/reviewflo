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

    // Check if email already exists in waitlist
    const { data: existing } = await supabase
      .from('waitlist')
      .select('email')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Already on waitlist'
      });
    }

    // Insert into waitlist table
    console.log('[waitlist-signup] Attempting to insert:', { email, business_name: businessName, business_type: businessType || null });
    const { data, error } = await supabase
      .from('waitlist')
      .insert([
        {
          email,
          business_name: businessName,
          business_type: businessType || null,
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

    console.log('[waitlist-signup] Successfully inserted:', data);

    // Send confirmation email to user
    console.log('[waitlist-signup] Sending confirmation email to:', email);
    const confirmationResult = await sendWaitlistConfirmationEmail({ email });
    console.log('[waitlist-signup] Confirmation email result:', confirmationResult);

    // Send notification to admin
    console.log('[waitlist-signup] Sending admin notification');
    const adminResult = await sendAdminNotification('waitlist', {
      email,
      businessType
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
