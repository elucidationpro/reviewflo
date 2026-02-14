import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Early access survey: missing Supabase env (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
      return res.status(503).json({ error: 'Service misconfigured. Please try again later.' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Please sign in to continue.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    }

    const { businessType, customersPerMonth, reviewAskingFrequency } = req.body as {
      businessType?: string;
      customersPerMonth?: string;
      reviewAskingFrequency?: string;
    };

    if (!businessType || !customersPerMonth || !reviewAskingFrequency) {
      return res.status(400).json({ error: 'Please answer all three questions.' });
    }

    const email = user.email ?? '';
    const fullName = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || '';

    const { error: dbError } = await supabaseAdmin
      .from('early_access_signups')
      .upsert(
        {
          user_id: user.id,
          email,
          full_name: fullName || null,
          business_type: businessType,
          customers_per_month: customersPerMonth,
          review_asking_frequency: reviewAskingFrequency,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (dbError) {
      console.error('Early access survey save error:', dbError);
      const isDev = process.env.NODE_ENV === 'development';
      const tableMissing = dbError.code === '42P01' || dbError.message?.includes('does not exist');
      const hint = isDev && tableMissing
        ? ' Run migration-early-access-signups.sql in the Supabase SQL editor.'
        : '';
      return res.status(500).json({
        error: 'Could not save your answers. Please try again.' + hint,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Early access survey unexpected error:', err);
    return res.status(500).json({ error: 'Could not save your answers. Please try again.' });
  }
}
