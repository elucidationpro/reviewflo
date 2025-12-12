import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { sendBetaConfirmationEmail, sendAdminNotification } from '@/lib/email-service';

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
    const { name, email, phone, businessType, businessName, challenge } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !businessType || !businessName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert into beta_signups table
    const { data, error } = await supabase
      .from('beta_signups')
      .insert([
        {
          name,
          email,
          phone,
          business_type: businessType,
          business_name: businessName,
          challenge,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save signup' });
    }

    // Send confirmation email to user
    await sendBetaConfirmationEmail({
      name,
      email,
      businessName
    });

    // Send notification to admin
    await sendAdminNotification('beta', {
      name,
      email,
      phone,
      businessType,
      businessName,
      challenge
    });

    return res.status(200).json({
      success: true,
      message: 'Beta signup successful',
      data
    });

  } catch (error) {
    console.error('Error handling beta signup:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
