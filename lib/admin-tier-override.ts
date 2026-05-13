/**
 * Admin dashboard tier dropdown: DB stays `free` | `pro` | `ai`; Pro live vs Pro testing
 * is distinguished with `admin_override` (testing) vs cleared (official / Stripe).
 */
export type AdminTierChoice = 'free' | 'pro_live' | 'pro_test' | 'ai_test'

export function adminTierChoiceToRow(choice: AdminTierChoice): {
  tier: 'free' | 'pro' | 'ai'
  admin_override: boolean
} {
  switch (choice) {
    case 'free':
      return { tier: 'free', admin_override: false }
    case 'pro_live':
      return { tier: 'pro', admin_override: false }
    case 'pro_test':
      return { tier: 'pro', admin_override: true }
    case 'ai_test':
      return { tier: 'ai', admin_override: true }
  }
}

export function rowToAdminTierChoice(
  tier: 'free' | 'pro' | 'ai' | string | undefined,
  admin_override?: boolean | null
): AdminTierChoice {
  if (tier === 'free' || !tier) return 'free'
  if (tier === 'ai') return 'ai_test'
  if (admin_override === true) return 'pro_test'
  return 'pro_live'
}
