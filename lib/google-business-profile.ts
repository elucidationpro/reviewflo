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
export async function exchangeCodeForTokens(code: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

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
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

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
    'https://mybusinessbusinessinformation.googleapis.com/v1/accounts',
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
 * Get the Place ID for the user's business
 *
 * This will:
 * 1. Fetch all accounts
 * 2. For each account, fetch all locations
 * 3. Return the first location's Place ID (or let user choose if multiple)
 */
export async function getPlaceIdFromGoogleBusinessProfile(
  accessToken: string
): Promise<{ placeId: string; businessName: string; locationName: string } | null> {
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
    const placeId = firstLocation.metadata?.placeId || firstLocation.placeId;

    console.log('[Google Business Profile] Found Place ID:', placeId);

    return {
      placeId,
      businessName: firstLocation.title,
      locationName: firstLocation.name,
    };
  } catch (error) {
    console.error('[Google Business Profile] Error fetching Place ID:', error);
    return null;
  }
}
