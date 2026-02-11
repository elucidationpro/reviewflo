import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { sendBetaConfirmationEmail, sendAdminNotification } from '@/lib/email-service';

// Use anon key for public endpoint - RLS policies should control access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

    // Input validation and sanitization
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Length limits to prevent abuse
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name must be 100 characters or less' });
    }
    if (email.length > 255) {
      return res.status(400).json({ error: 'Email must be 255 characters or less' });
    }
    if (phone && phone.length > 20) {
      return res.status(400).json({ error: 'Phone must be 20 characters or less' });
    }
    if (businessName.length > 200) {
      return res.status(400).json({ error: 'Business name must be 200 characters or less' });
    }
    if (businessType.length > 100) {
      return res.status(400).json({ error: 'Business type must be 100 characters or less' });
    }
    if (challenge && challenge.length > 1000) {
      return res.status(400).json({ error: 'Challenge description must be 1000 characters or less' });
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
        'waitlist': 'This email is already on our waitlist. We\'ll notify you when beta access is available!',
        'beta_invited': 'You\'ve already been invited to the beta program. Check your email for details!',
        'beta_active': 'You\'re already part of our beta program!',
        'converted': 'This email already has an active ReviewFlo account.',
        'declined': 'This email was previously declined.'
      };

      return res.status(400).json({
        error: statusMessages[existingLead.status] || 'This email is already registered.'
      });
    }

    // Insert into leads table with status='beta_active'
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          name,
          email,
          phone,
          business_type: businessType,
          business_name: businessName,
          challenge,
          status: 'beta_active',
          source: 'beta',
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
