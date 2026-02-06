import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { sendQualificationEmail, sendAdminNotification } from '@/lib/email-service';

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
    const { businessType, customersPerMonth, reviewAskingFrequency, email } = req.body;

    // Validate required fields
    if (!businessType || !customersPerMonth || !reviewAskingFrequency || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
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
        'qualified': 'You\'ve already completed the qualification form. Check your email for the next steps!',
        'converted': 'This email already has an active ReviewFlo account.',
        'declined': 'This email was previously declined.'
      };

      return res.status(400).json({
        error: statusMessages[existingLead.status] || 'This email is already registered.'
      });
    }

    // Insert into leads table with status='qualified'
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          email,
          business_type: businessType,
          customers_per_month: customersPerMonth,
          review_asking_frequency: reviewAskingFrequency,
          status: 'qualified',
          source: 'qualify',
          created_at: new Date().toISOString(),
          email_sent: false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save qualification' });
    }

    // Send confirmation email with Google Form link to user
    // Don't block if email fails - log error and continue
    let emailSent = false;
    try {
      const emailResult = await sendQualificationEmail({
        email,
        businessType
      });
      emailSent = emailResult.success;

      // Update database to mark email as sent
      if (emailSent) {
        await supabase
          .from('leads')
          .update({ email_sent: true })
          .eq('id', data.id);
      }
    } catch (emailError) {
      console.error('Failed to send qualification email:', emailError);
      // Continue - don't block the user
    }

    // Send notification to admin (don't block on this either)
    try {
      await sendAdminNotification('qualify', {
        email,
        businessType,
        customersPerMonth,
        reviewAskingFrequency,
        emailSent
      });
    } catch (adminEmailError) {
      console.error('Failed to send admin notification:', adminEmailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Qualification submitted successfully',
      emailSent,
      data
    });

  } catch (error) {
    console.error('Error handling qualification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
