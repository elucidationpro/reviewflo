/**
 * Google Places API utilities for extracting and validating Place IDs
 */

interface PlaceDetailsResponse {
  status: string;
  result?: {
    place_id: string;
  };
  error_message?: string;
}

/**
 * Extracts Google Place ID from a Google Review URL
 *
 * Supports multiple Google Review URL formats:
 * - https://g.page/r/CbHvObp1VFePEBM/review
 * - https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4
 * - https://search.google.com/local/reviews?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4
 *
 * @param reviewUrl - The Google Review URL provided by the business
 * @returns The extracted Place ID, or null if extraction fails
 */
export async function extractPlaceIdFromReviewUrl(
  reviewUrl: string
): Promise<string | null> {
  if (!reviewUrl || typeof reviewUrl !== 'string') {
    console.log('[extractPlaceId] No review URL provided');
    return null;
  }

  try {
    // Normalize URL
    let url = reviewUrl.trim();
    console.log('[extractPlaceId] Processing URL:', url);

    // Decode URL to handle URL-encoded parameters
    const decodedUrl = decodeURIComponent(url);
    console.log('[extractPlaceId] Decoded URL:', decodedUrl);

    // Pattern 1: Direct place_id in URL (most reliable)
    // Example: https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4
    // Example: https://search.google.com/local/reviews?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4
    // Also handles: placeid= in URL-encoded parameters
    const directPlaceIdMatch = decodedUrl.match(/placeid[=:]([A-Za-z0-9_-]+)/i);
    if (directPlaceIdMatch) {
      const placeId = directPlaceIdMatch[1];
      console.log('[extractPlaceId] Found direct Place ID:', placeId);

      // Skip validation and trust the Place ID from Google's own redirect
      // The Place ID is coming from Google's review URL, so it should be valid
      // We'll let the actual stats fetch validate it instead
      console.log('[extractPlaceId] Using Place ID from Google redirect (skipping validation)');
      return placeId;
    }

    // Pattern 2: Short URL format (g.page/r/...)
    // Example: https://g.page/r/CbHvObp1VFePEBM/review
    // We need to follow the redirect to get the full Maps URL
    const shortUrlMatch = url.match(/g\.page\/r\/([A-Za-z0-9_-]+)/);
    if (shortUrlMatch) {
      console.log('[extractPlaceId] Found g.page short URL, following redirect...');

      try {
        // Follow the redirect to get the full Maps URL
        // Use a browser-like User-Agent so Google returns the full Maps URL
        const response = await fetch(url, {
          redirect: 'follow',
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          }
        });

        const finalUrl = response.url;
        console.log('[extractPlaceId] Final URL after redirect:', finalUrl);

        // Now extract Place ID from the final URL
        // The final URL should be a full Google Maps URL
        // Example: https://www.google.com/maps/place/...

        // Try to extract from the redirected URL
        if (finalUrl !== url) {
          return await extractPlaceIdFromReviewUrl(finalUrl);
        }
      } catch (error) {
        console.error('[extractPlaceId] Failed to follow redirect:', error);
      }

      console.warn(
        '[extractPlaceId] Unable to resolve g.page short URL.'
      );
      return null;
    }

    // Pattern 3: Google Maps URL with ftid parameter (contains CID encoded as hex)
    // Example: https://www.google.com/maps/place/...?ftid=0x42739ea03b45bd5d:0x8f575475ba39efb1
    // The second hex value (after the colon) is the Google CID (customer ID)
    // We can resolve this to a Place ID using the Places API cid= parameter
    const ftidMatch = url.match(/[?&]ftid=0x[a-fA-F0-9]+:(0x[a-fA-F0-9]+)/);
    if (ftidMatch) {
      const cidHex = ftidMatch[1];
      console.log('[extractPlaceId] Found ftid CID hex:', cidHex);

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        console.error('[extractPlaceId] GOOGLE_PLACES_API_KEY not configured');
        return null;
      }

      try {
        // Convert hex CID to decimal
        const cidDecimal = BigInt(cidHex).toString();
        console.log('[extractPlaceId] CID decimal:', cidDecimal);

        const detailsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?cid=${cidDecimal}&fields=place_id,name&key=${apiKey}`
        );
        const detailsData = await detailsResponse.json();

        if (detailsData.status === 'OK' && detailsData.result?.place_id) {
          const placeId = detailsData.result.place_id;
          console.log('[extractPlaceId] Resolved CID to Place ID:', placeId, '(', detailsData.result.name, ')');
          return placeId;
        } else {
          console.warn('[extractPlaceId] CID lookup failed:', detailsData.status, detailsData.error_message);
        }
      } catch (error) {
        console.error('[extractPlaceId] CID to Place ID conversion error:', error);
      }

      return null;
    }

    // Pattern 4: Full Google Maps URL - extract business name and use Text Search
    // Example: https://www.google.com/maps/place/Business+Name/@lat,lng,17z/...
    const businessNameMatch = url.match(/maps\/place\/([^/@?]+)/);
    if (businessNameMatch) {
      const businessName = decodeURIComponent(businessNameMatch[1].replace(/\+/g, ' '));
      console.log('[extractPlaceId] Found business name in URL:', businessName);

      // Use Google Places Text Search API to find the Place ID
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        console.error('[extractPlaceId] GOOGLE_PLACES_API_KEY not configured');
        return null;
      }

      try {
        const searchResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
            businessName
          )}&key=${apiKey}`
        );

        const searchData = await searchResponse.json();

        if (searchData.status === 'OK' && searchData.results?.[0]?.place_id) {
          const placeId = searchData.results[0].place_id;
          console.log('[extractPlaceId] Found Place ID via Text Search:', placeId);
          return placeId;
        } else {
          console.warn(
            '[extractPlaceId] Text Search failed:',
            searchData.status,
            searchData.error_message
          );
        }
      } catch (error) {
        console.error('[extractPlaceId] Text Search error:', error);
      }
    }

    console.error('[extractPlaceId] Unsupported Google Review URL format:', url);
    return null;
  } catch (error) {
    console.error('Error extracting Place ID from review URL:', error);
    return null;
  }
}

/**
 * Validates a Place ID by checking it with the Google Places API
 *
 * @param placeId - The Place ID to validate
 * @returns true if valid, false otherwise
 */
export async function validatePlaceId(placeId: string): Promise<boolean> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.error('GOOGLE_PLACES_API_KEY is not configured');
    return false;
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId
      )}&fields=place_id&key=${apiKey}`
    );

    const data: PlaceDetailsResponse = await response.json();

    console.log('[validatePlaceId] Google API Response:', {
      status: data.status,
      error_message: data.error_message,
      hasResult: !!data.result
    });

    if (data.status === 'OK' && data.result?.place_id) {
      return true;
    }

    if (data.status === 'INVALID_REQUEST') {
      console.error('[validatePlaceId] Invalid Place ID format:', placeId);
    } else if (data.error_message) {
      console.error('[validatePlaceId] API Error:', data.error_message);
    }

    return false;
  } catch (error) {
    console.error('[validatePlaceId] Error validating Place ID:', error);
    return false;
  }
}

/**
 * Gets the Place ID from google_review_url, with caching
 *
 * Algorithm:
 * 1. Check if google_place_id is already cached in the database
 * 2. If not cached, extract from google_review_url
 * 3. Cache the result in the database for future use
 *
 * @param businessId - The business ID
 * @param googleReviewUrl - The Google Review URL
 * @param cachedPlaceId - The cached Place ID from database (if any)
 * @param supabaseClient - Supabase client for updating cache
 * @returns The Place ID, or null if extraction fails
 */
export async function getPlaceIdWithCache(
  businessId: string,
  googleReviewUrl: string | null,
  cachedPlaceId: string | null,
  supabaseClient: any
): Promise<string | null> {
  // If we have a cached Place ID, return it
  if (cachedPlaceId) {
    return cachedPlaceId;
  }

  // No cached ID, try to extract from review URL
  if (!googleReviewUrl) {
    return null;
  }

  const extractedPlaceId = await extractPlaceIdFromReviewUrl(googleReviewUrl);

  // If extraction succeeded, cache it in the database
  if (extractedPlaceId && supabaseClient) {
    try {
      await supabaseClient
        .from('businesses')
        .update({ google_place_id: extractedPlaceId })
        .eq('id', businessId);

      console.log(`Cached Place ID ${extractedPlaceId} for business ${businessId}`);
    } catch (error) {
      console.error('Error caching Place ID:', error);
      // Don't fail if caching fails, still return the extracted ID
    }
  }

  return extractedPlaceId;
}
