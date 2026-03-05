import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

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

interface UpdateLaunchPreferencesRequest {
  businessId: string;
  /** 'pro' | 'ai' | null - which upcoming tier they want launch notification for */
  interestedInTier: 'pro' | 'ai' | null;
  /** Whether they want to be emailed when that tier launches */
  notifyOnLaunch?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const body = req.body as UpdateLaunchPreferencesRequest;
    const { businessId, interestedInTier, notifyOnLaunch } = body;

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    // Verify user owns this business
    const { data: business, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !business) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to update this business' });
    }

    const updateData: Record<string, string | boolean | null> = {};

    // Normalize interested_in_tier and notify_on_launch
    if (interestedInTier === null) {
      updateData.interested_in_tier = null;
      updateData.notify_on_launch = false;
    } else if (interestedInTier === 'pro' || interestedInTier === 'ai') {
      updateData.interested_in_tier = interestedInTier;
      // Default to true if not explicitly provided
      updateData.notify_on_launch =
        notifyOnLaunch === undefined ? true : !!notifyOnLaunch;
    } else {
      return res.status(400).json({ error: 'Invalid tier selection' });
    }

    try {
      const { error: updateError } = await supabaseAdmin
        .from('businesses')
        .update(updateData)
        .eq('id', businessId);

      if (updateError) {
        const errMsg = (updateError as { message?: string }).message || String(updateError);
        const isColumnError = /interested_in_tier|notify_on_launch|does not exist|undefined column|column.*not found/i.test(
          errMsg
        );

        if (isColumnError) {
          return res.status(500).json({
            error:
              'Launch preference fields are not available. Please run migration-businesses-tier-fields.sql in Supabase.',
            details: errMsg,
          });
        }

        return res.status(500).json({
          error: 'Failed to update launch preferences',
          details: errMsg,
        });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update launch preferences' });
    }

    return res.status(200).json({
      success: true,
      interested_in_tier: updateData.interested_in_tier ?? null,
      notify_on_launch: updateData.notify_on_launch ?? false,
    });
  } catch (error) {
    console.error('Error in update-launch-preferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

