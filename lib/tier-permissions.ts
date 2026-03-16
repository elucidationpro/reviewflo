/**
 * Tier permissions for Pro/AI feature gating.
 * Use these helpers everywhere to gate features and show upgrade prompts.
 */

export type Tier = 'free' | 'pro' | 'ai'

/** Can send review requests from dashboard (Pro/AI only) */
export function canSendFromDashboard(tier: Tier | undefined): boolean {
  return tier === 'pro' || tier === 'ai'
}

/** Can access multi-platform (Facebook, Yelp) settings (Pro/AI only) */
export function canAccessMultiPlatform(tier: Tier | undefined): boolean {
  return tier === 'pro' || tier === 'ai'
}

/** Can remove "Powered by ReviewFlo" branding (Pro/AI only) */
export function canRemoveBranding(tier: Tier | undefined): boolean {
  return tier === 'pro' || tier === 'ai'
}

/** Can access expanded Google Business Stats (Pro/AI only) */
export function canAccessGoogleStats(tier: Tier | undefined): boolean {
  return tier === 'pro' || tier === 'ai'
}

/** Number of template slots based on tier: Free=1, Pro/AI=3 */
export function getTemplateSlots(tier: Tier | undefined): number {
  return tier === 'free' ? 1 : 3
}

/** Whether tier is paid (Pro or AI) */
export function isPaidTier(tier: Tier | undefined): boolean {
  return tier === 'pro' || tier === 'ai'
}
