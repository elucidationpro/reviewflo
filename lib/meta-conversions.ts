/**
 * Meta Conversions API - Server-side event tracking
 * Sends CompleteRegistration and other events to Meta for ad attribution.
 * Works even when browser tracking is blocked.
 *
 * Requires: META_PIXEL_ID, META_CONVERSIONS_API_ACCESS_TOKEN in env
 * Get token: Events Manager > Settings > Conversions API > Generate Access Token
 */

import crypto from 'crypto';

const PIXEL_ID = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID || '750284611209309';
const ACCESS_TOKEN = process.env.META_CONVERSIONS_API_ACCESS_TOKEN;

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export interface CompleteRegistrationParams {
  email: string;
  eventId?: string;
  fbc?: string;  // Facebook click ID from _fbc cookie
  fbp?: string;  // Facebook browser ID from _fbp cookie
}

/**
 * Send CompleteRegistration event to Meta Conversions API.
 * Call this server-side when a user completes account signup.
 */
export async function sendCompleteRegistration(params: CompleteRegistrationParams): Promise<boolean> {
  if (!ACCESS_TOKEN) {
    console.warn('[meta-conversions] META_CONVERSIONS_API_ACCESS_TOKEN not set, skipping server-side event');
    return false;
  }

  const eventId = params.eventId || `reg_${crypto.randomUUID()}`;
  const eventTime = Math.floor(Date.now() / 1000);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com';

  const userData: Record<string, string> = {
    em: sha256(params.email),
  };
  if (params.fbp) userData.fbp = params.fbp;
  if (params.fbc) userData.fbc = params.fbc;

  const payload = {
    data: [
      {
        event_name: 'CompleteRegistration',
        event_time: eventTime,
        event_id: eventId,
        event_source_url: `${baseUrl}/join`,
        action_source: 'website',
        user_data: userData,
        custom_data: {
          content_name: 'Free Tier Signup',
          status: 'free_signup',
          value: 0,
          currency: 'USD',
        },
      },
    ],
    access_token: ACCESS_TOKEN,
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[meta-conversions] CAPI error:', res.status, data);
      return false;
    }
    if (data.error) {
      console.error('[meta-conversions] Meta API error:', data.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[meta-conversions] Failed to send event:', err);
    return false;
  }
}
