import type { SupabaseClient } from '@supabase/supabase-js'
import { parseTier } from '@/lib/api-utils'
import type { Tier } from '@/lib/tier-permissions'

/** Row shape sufficient to resolve billed plan for feature gates. */
export type BillingTierLookupRow = {
  tier?: unknown
  parent_business_id?: string | null
}

/**
 * Effective subscription tier for a businesses row (Pro/AI are account-level).
 * Extra locations inherit the primary's tier server-side for UI (/api/my-business),
 * but the child DB row often still holds `tier: free` unless synced — gate saves and
 * public follow-up routing using this helper instead of `row.tier` alone.
 */
export async function resolveAccountBillingTier(
  client: SupabaseClient,
  row: BillingTierLookupRow
): Promise<Tier> {
  const direct = parseTier(row.tier)
  if (direct === 'pro' || direct === 'ai') return direct

  const parentId = row.parent_business_id
  if (typeof parentId !== 'string' || !parentId.trim()) return direct

  const { data: parent, error } = await client
    .from('businesses')
    .select('tier')
    .eq('id', parentId)
    .maybeSingle()

  if (error || !parent) return direct
  return parseTier((parent as { tier?: unknown }).tier)
}
