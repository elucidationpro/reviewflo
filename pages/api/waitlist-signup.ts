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
    const { email, businessType } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
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
    const { data, error } = await supabase
      .from('waitlist')
      .insert([
        {
          email,
          business_type: businessType || null,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save to waitlist' });
    }

    // Send confirmation email to user
    await sendWaitlistConfirmationEmail({ email });

    // Send notification to admin
    await sendAdminNotification('waitlist', {
      email,
      businessType
    });

    return res.status(200).json({
      success: true,
      message: 'Added to waitlist',
      data
    });

  } catch (error) {
    console.error('Error handling waitlist signup:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
