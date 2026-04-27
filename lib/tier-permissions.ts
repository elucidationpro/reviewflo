/**
 * Tier permissions for Pro/AI feature gating.
 * Use these helpers everywhere to gate features and show upgrade prompts.
 */

export type Tier = 'free' | 'pro' | 'ai'

/** Can send review requests from dashboard (Pro/AI only) */
export function canSendFromDashboard(tier: Tier | undefined): boolean {
  return tier === 'pro' || tier === 'ai'
}

/** Should the UI show campaigns entry points? (Pro/AI only) */
export function canSeeCampaigns(tier: Tier | undefined): boolean {
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
  return (tier === 'pro' || tier === 'ai') ? 3 : 1
}

/** Whether tier is paid (Pro or AI) */
export function isPaidTier(tier: Tier | undefined): boolean {
  return tier === 'pro' || tier === 'ai'
}

/** Can use SMS automation (AI tier only) */
export function canUseSMS(tier: Tier | undefined): boolean {
  return tier === 'ai'
}

/** Can use CRM integrations (Square, Jobber, Housecall Pro) - AI tier only */
export function canUseCRMIntegration(tier: Tier | undefined): boolean {
  return tier === 'ai'
}

/** Can use AI features (review drafts, response generator) - AI tier only */
export function canUseAIFeatures(tier: Tier | undefined): boolean {
  return tier === 'ai'
}

/** Can use white-label branding - AI tier only */
export function canUseWhiteLabel(tier: Tier | undefined): boolean {
  return tier === 'ai'
}

/**
 * Max businesses rows (locations) per account: primary + children share one user_id.
 * Free: 1 · Pro: 3 · AI: 15
 */
export function getMaxBusinessLocations(tier: Tier | undefined): number {
  if (tier === 'ai') return 15
  if (tier === 'pro') return 3
  return 1
}

/** Pro/AI can add extra location rows; Free cannot */
export function canUseMultipleLocations(tier: Tier | undefined): boolean {
  return tier === 'pro' || tier === 'ai'
}

/** Monthly token budget for AI generation: free/pro = 0 (no AI access), ai = 50_000 */
export function getMonthlyTokenLimit(tier: Tier | undefined): number {
  return tier === 'ai' ? 50_000 : 0
}

/** Can use past-customer CSV outreach campaigns (Pro/AI only) */
export function canUseCampaigns(tier: Tier | undefined): boolean {
  // Temporarily disabled for all tiers until campaigns are re-verified end-to-end.
  return false
}

/** Max contacts per campaign: Free=0, Pro=500, AI=Infinity */
export function getMaxCampaignContacts(tier: Tier | undefined): number {
  if (tier === 'ai') return Infinity
  if (tier === 'pro') return 500
  return 0
}
