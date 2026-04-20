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
