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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(200).json({ step: 1 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return res.status(200).json({ step: 1 });
  }

  const { data: signup } = await supabaseAdmin
    .from('early_access_signups')
    .select('business_type, stripe_session_id')
    .eq('user_id', user.id)
    .single();

  if (!signup) {
    return res.status(200).json({
      step: 2,
      email: user.email ?? '',
      fullName: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || '',
    });
  }

  // Free beta: no payment required. Having a signup record = complete (whether paid or free).
  return res.status(200).json({ step: 'paid', email: user.email ?? '' });
}
