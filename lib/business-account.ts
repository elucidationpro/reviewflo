/**
 * Multi-location: account root has parent_business_id null; children reference root id.
 * Before migration, parent_business_id is undefined for all rows — treat every row as a root candidate.
 */

export type BusinessRowWithParent = {
  id: string
  parent_business_id?: string | null
  created_at?: string
}

/** Prefer account root(s); if ambiguous (legacy), oldest row first. */
export function pickPrimaryBusinessRow<T extends BusinessRowWithParent>(rows: T[]): T | null {
  if (!rows.length) return null
  const roots = rows.filter((r) => r.parent_business_id == null)
  const pool = roots.length > 0 ? roots : rows
  return pool
    .slice()
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return ta - tb
    })[0]!
}

export function sortLocationSummaries<T extends { business_name: string }>(rows: T[]): T[] {
  return rows.slice().sort((a, b) => a.business_name.localeCompare(b.business_name))
}

/**
 * Resolve a business row for an authenticated API request.
 * - If `businessId` is provided, validate it belongs to the user and return that row.
 * - Otherwise, fall back to the user's primary (parent_business_id IS NULL), or oldest row for legacy accounts.
 * Returns `{ row: null, error }` when the user has no business or the provided id doesn't belong to them.
 *
 * Callers pass the supabase admin client; the select string determines which columns are returned.
 * `user_id`, `parent_business_id`, and `created_at` are always appended to the select.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbLike = { from: (t: string) => any }

export async function getBusinessForRequest(
  client: SbLike,
  userId: string,
  businessId: string | null | undefined,
  select: string = '*'
): Promise<{ row: Record<string, unknown> | null; error: string | null }> {
  const augmented = `${select}, user_id, parent_business_id, created_at`

  if (businessId) {
    const { data, error } = await client
      .from('businesses')
      .select(augmented)
      .eq('id', businessId)
      .maybeSingle()
    if (error) return { row: null, error: error.message || 'lookup failed' }
    const match = data as Record<string, unknown> | null
    if (!match || match.user_id !== userId) return { row: null, error: 'not found' }
    return { row: match, error: null }
  }

  const { data, error } = await client
    .from('businesses')
    .select(augmented)
    .eq('user_id', userId)
  if (error) return { row: null, error: error.message || 'lookup failed' }
  const rows = (data as (Record<string, unknown> & BusinessRowWithParent)[] | null) || []
  const primary = pickPrimaryBusinessRow(rows)
  if (!primary) return { row: null, error: 'no business' }
  return { row: primary as unknown as Record<string, unknown>, error: null }
}
