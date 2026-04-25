/**
 * Google Business Profile OAuth and API Integration
 *
 * This module handles:
 * - OAuth 2.0 flow for Google Business Profile
 * - Fetching business locations (including service-area businesses)
 * - Extracting Place IDs automatically
 */

interface GoogleBusinessLocation {
  name: string; // Format: accounts/{accountId}/locations/{locationId}
  title: string; // Business name
  storeCode?: string;
  placeId: string; // The Place ID we need!
  metadata: {
    placeId: string;
  };
}

interface GoogleAccountListResponse {
  accounts: Array<{
    name: string; // Format: accounts/{accountId}
    accountName: string;
    type: string;
  }>;
}

interface GoogleLocationsListResponse {
  locations: GoogleBusinessLocation[];
  nextPageToken?: string;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
function getGoogleOAuthClientId(): string | undefined {
  return (
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ||
    undefined
  );
}

export async function exchangeCodeForTokens(
  code: string,
  mode: 'settings' | 'signup' | 'login' = 'settings',
  /** Must match the host used in /api/auth/google/start (dev: request host). */
  appBaseUrl?: string
) {
  const clientId = getGoogleOAuthClientId();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const callbackPath = mode === 'signup'
    ? '/api/auth/google/signup-callback'
    : mode === 'login'
      ? '/api/auth/google/login-callback'
      : '/api/auth/google/callback';
  const base = (appBaseUrl || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const redirectUri = `${base}${callbackPath}`;

  if (!clientId || !clientSecret) {
    console.error('[Google OAuth] Missing GOOGLE_OAUTH_CLIENT_SECRET or client id (set GOOGLE_OAUTH_CLIENT_ID or NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID)');
    throw new Error(
      'Google OAuth is not configured on the server. Set GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_OAUTH_CLIENT_ID (or NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID).'
    );
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Google OAuth] Token exchange failed:', data);
    throw new Error(data.error_description || 'Failed to exchange code for tokens');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string) {
  const clientId = getGoogleOAuthClientId();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Google OAuth is not configured on the server. Set GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_OAUTH_CLIENT_ID (or NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID).'
    );
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId!,
      client_secret: clientSecret!,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Google OAuth] Token refresh failed:', data);
    throw new Error(data.error_description || 'Failed to refresh token');
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Fetch all Google Business Profile accounts for the authenticated user
 */
export async function getBusinessAccounts(accessToken: string): Promise<GoogleAccountListResponse> {
  const response = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('[Google Business Profile] Failed to fetch accounts:', data);
    throw new Error(data.error?.message || 'Failed to fetch business accounts');
  }

  return data;
}

/**
 * Fetch all locations for a specific account
 */
export async function getAccountLocations(
  accessToken: string,
  accountName: string
): Promise<GoogleBusinessLocation[]> {
  const allLocations: GoogleBusinessLocation[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`
    );

    url.searchParams.append('readMask', 'name,title,storeCode,metadata');

    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data: GoogleLocationsListResponse = await response.json();

    if (!response.ok) {
      console.error('[Google Business Profile] Failed to fetch locations:', data);
      throw new Error('Failed to fetch business locations');
    }

    if (data.locations) {
      allLocations.push(...data.locations);
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return allLocations;
}

/**
 * Fallback: search Google Places by business name to find a Place ID.
 * Used for service-area businesses whose GBP metadata has no placeId.
 */
async function searchPlaceIdByName(businessName: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn('[Google Business Profile] No GOOGLE_PLACES_API_KEY — cannot do SAB fallback search');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(businessName)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && data.results?.[0]?.place_id) {
      console.log('[Google Business Profile] SAB fallback: found Place ID via text search:', data.results[0].place_id);
      return data.results[0].place_id as string;
    }

    console.warn('[Google Business Profile] SAB fallback: text search returned no results', data.status);
    return null;
  } catch (err) {
    console.error('[Google Business Profile] SAB fallback text search failed:', err);
    return null;
  }
}

/**
 * Get the Place ID for the user's business.
 * Returns placeId as null for service-area businesses that have no Places match.
 *
 * This will:
 * 1. Fetch all accounts
 * 2. For each account, fetch all locations
 * 3. Return the first location's Place ID (or let user choose if multiple)
 */
export async function getPlaceIdFromGoogleBusinessProfile(
  accessToken: string
): Promise<{ placeId: string | null; businessName: string; locationName: string } | null> {
  try {
    // Get all accounts
    const accountsData = await getBusinessAccounts(accessToken);

    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      console.warn('[Google Business Profile] No accounts found');
      return null;
    }

    // For now, use the first account (we can let users choose later)
    const firstAccount = accountsData.accounts[0];
    console.log('[Google Business Profile] Using account:', firstAccount.accountName);

    // Get all locations for this account
    const locations = await getAccountLocations(accessToken, firstAccount.name);

    if (!locations || locations.length === 0) {
      console.warn('[Google Business Profile] No locations found');
      return null;
    }

    // Use the first location's Place ID
    const firstLocation = locations[0];
    let placeId: string | null = firstLocation.metadata?.placeId || firstLocation.placeId || null;

    // Service-area businesses often have no placeId in GBP metadata — fall back to Places text search
    if (!placeId) {
      console.log('[Google Business Profile] No Place ID in metadata (likely SAB), trying text search fallback...');
      placeId = await searchPlaceIdByName(firstLocation.title);
    }

    console.log('[Google Business Profile] Final Place ID:', placeId ?? '(none — SAB with no Places match)');

    // v4 reviews API requires accounts/{accountId}/locations/{locationId}.
    // Business Information API may return a relative name (locations/{id}) — prefix it when needed.
    const locationName = firstLocation.name.startsWith('accounts/')
      ? firstLocation.name
      : `${firstAccount.name}/${firstLocation.name}`;

    return {
      placeId,
      businessName: firstLocation.title,
      locationName,
    };
  } catch (error) {
    console.error('[Google Business Profile] Error fetching Place ID:', error);
    return null;
  }
}

const STAR_RATING_TO_NUMBER: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export interface NormalizedReview {
  author?: string;
  rating?: number;
  text?: string;
  time?: number; // Unix seconds for compatibility with Places API
}

interface GbpReview {
  reviewer?: { displayName?: string; isAnonymous?: boolean };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
}

interface GbpListReviewsResponse {
  reviews?: GbpReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
  error?: { code?: number; message?: string };
}

/**
 * Fetch ALL reviews from Google Business Profile API (paginated, up to 50 per page).
 * Requires OAuth with business.manage scope. Returns all reviews with pagination.
 */
export async function fetchAllReviewsFromBusinessProfile(
  accessToken: string
): Promise<{
  reviews: NormalizedReview[];
  averageRating: number;
  totalReviewCount: number;
} | null> {
  try {
    const profile = await getPlaceIdFromGoogleBusinessProfile(accessToken);
    if (!profile?.locationName) {
      // GBP_DEBUG
      console.error('[GBP_DEBUG] fetchAllReviews: no locationName from profile lookup, returning null early');
      return null;
    }
    // GBP_DEBUG
    console.log('[GBP_DEBUG] fetchAllReviews: resolved locationName:', profile.locationName);

    const allReviews: NormalizedReview[] = [];
    let pageToken: string | undefined;
    let averageRating = 0;
    let totalReviewCount = 0;

    do {
      const url = new URL(
        `https://mybusiness.googleapis.com/v4/${profile.locationName}/reviews`
      );
      url.searchParams.set('pageSize', '50');
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      // GBP_DEBUG
      console.log('[GBP_DEBUG] fetchAllReviews requesting URL:', url.toString());
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data: GbpListReviewsResponse = await res.json();

      if (data.error || !res.ok) {
        // GBP_DEBUG
        console.error('[GBP_DEBUG] fetchAllReviews non-200 response:', {
          url: url.toString(),
          status: res.status,
          statusText: res.statusText,
          errorBody: data.error ?? data,
        });
        return null;
      }

      if (data.reviews) {
        for (const r of data.reviews) {
          const rating = r.starRating ? STAR_RATING_TO_NUMBER[r.starRating] ?? 0 : 0;
          const timeStr = r.createTime || r.updateTime;
          const time = timeStr ? Math.floor(new Date(timeStr).getTime() / 1000) : undefined;
          allReviews.push({
            author: r.reviewer?.isAnonymous ? 'Anonymous' : (r.reviewer?.displayName || 'Anonymous'),
            rating: rating || undefined,
            text: (r.comment || '').slice(0, 500),
            time,
          });
        }
      }
      averageRating = data.averageRating ?? 0;
      totalReviewCount = data.totalReviewCount ?? allReviews.length;
      pageToken = data.nextPageToken;
    } while (pageToken);

    return {
      reviews: allReviews,
      averageRating,
      totalReviewCount,
    };
  } catch (error) {
    // GBP_DEBUG
    console.error('[GBP_DEBUG] fetchAllReviews exception:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}
