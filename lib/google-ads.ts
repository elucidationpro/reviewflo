type GoogleAdsGtag = (...args: any[]) => void;

function getGoogleAdsConfig() {
  const conversionId = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID?.trim();
  const conversionLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim();
  return { conversionId, conversionLabel };
}

function getGtag(): GoogleAdsGtag | null {
  if (typeof window === 'undefined') return null;
  const gtag = (window as any).gtag;
  return typeof gtag === 'function' ? (gtag as GoogleAdsGtag) : null;
}

export function fireGoogleAdsSignupConversion() {
  const { conversionId, conversionLabel } = getGoogleAdsConfig();
  const gtag = getGtag();

  if (!conversionId || !conversionLabel || !gtag) return;

  gtag('event', 'conversion', {
    send_to: `${conversionId}/${conversionLabel}`,
    event_category: 'Sign-up',
    event_label: 'Sign-up',
  });
}

