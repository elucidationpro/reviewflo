/**
 * Server-side PostHog HogQL for admin analytics (conversions + in-flow ratings).
 * Requires POSTHOG_PERSONAL_API_KEY (scope: query:read) and POSTHOG_PROJECT_ID.
 * @see https://posthog.com/docs/api/query
 */

type PlatformBreakdown = {
  google: number
  facebook: number
  yelp: number
  nextdoor: number
}

export type PosthogConversionsByBusiness = {
  /** Unique persons who fired platform_selected at least once in the window */
  uniquePersons: Record<string, number>
  /** Raw event counts by platform (tooltip; can exceed unique if same user clicks multiple) */
  breakdown: Record<string, PlatformBreakdown>
}

export type PosthogFlowRatingByBusiness = Record<
  string,
  { avgRating: number; uniqueRaters: number }
>

function posthogApiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_POSTHOG_HOST || process.env.POSTHOG_HOST || 'https://us.posthog.com'
  try {
    const u = new URL(raw)
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

function parseHogqlTable(json: unknown): { columns: string[]; rows: unknown[][] } {
  const o = json as Record<string, unknown>
  const cols = o.columns
  const results = o.results
  if (Array.isArray(cols) && Array.isArray(results)) {
    return { columns: cols as string[], rows: results as unknown[][] }
  }
  return { columns: [], rows: [] }
}

function colIndex(columns: string[], name: string): number {
  const lower = name.toLowerCase()
  return columns.findIndex((c) => c.toLowerCase() === lower)
}

async function posthogHogqlQuery(sql: string, name: string): Promise<unknown | null> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const base = posthogApiBase()
  if (!apiKey || !projectId || !base) return null

  const url = `${base}/api/projects/${projectId}/query/`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name,
      query: { kind: 'HogQLQuery', query: sql },
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.warn('[posthog-admin-query]', name, res.status, text.slice(0, 500))
    return null
  }
  return res.json()
}

/**
 * Returns null if PostHog is not configured or the request fails (caller keeps DB counts).
 */
export async function fetchPosthogPlatformConversions(
  startIso: string
): Promise<PosthogConversionsByBusiness | null> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const base = posthogApiBase()
  if (!apiKey || !projectId || !base) return null

  const escapedStart = startIso.replace(/'/g, "\\'")

  const uniqQuery = `
    SELECT
      toString(properties.businessId) AS business_id,
      uniqExact(person_id) AS conversions
    FROM events
    WHERE event = 'platform_selected'
      AND timestamp >= parseDateTimeBestEffort('${escapedStart}')
      AND timestamp <= now()
      AND properties.businessId IS NOT NULL
      AND properties.businessId != ''
    GROUP BY business_id
  `

  const breakdownQuery = `
    SELECT
      toString(properties.businessId) AS business_id,
      lower(toString(properties.platform)) AS plat,
      count() AS cnt
    FROM events
    WHERE event = 'platform_selected'
      AND timestamp >= parseDateTimeBestEffort('${escapedStart}')
      AND timestamp <= now()
      AND properties.businessId IS NOT NULL
      AND properties.businessId != ''
    GROUP BY business_id, plat
  `

  try {
    const [uniqJson, brJson] = await Promise.all([
      posthogHogqlQuery(uniqQuery, 'admin_analytics_platform_conversions_uniq'),
      posthogHogqlQuery(breakdownQuery, 'admin_analytics_platform_conversions_breakdown'),
    ])
    if (!uniqJson || !brJson) return null

    const uniqTable = parseHogqlTable(uniqJson)
    const brTable = parseHogqlTable(brJson)

    const uniquePersons: Record<string, number> = {}
    const idIdx = colIndex(uniqTable.columns, 'business_id')
    const cIdx = colIndex(uniqTable.columns, 'conversions')
    if (idIdx >= 0 && cIdx >= 0) {
      for (const row of uniqTable.rows) {
        const id = String(row[idIdx] ?? '')
        if (!id) continue
        uniquePersons[id] = Number(row[cIdx] ?? 0)
      }
    }

    const breakdown: Record<string, PlatformBreakdown> = {}
    const bidB = colIndex(brTable.columns, 'business_id')
    const platB = colIndex(brTable.columns, 'plat')
    const cntB = colIndex(brTable.columns, 'cnt')
    if (bidB >= 0 && platB >= 0 && cntB >= 0) {
      for (const row of brTable.rows) {
        const bid = String(row[bidB] ?? '')
        if (!bid) continue
        if (!breakdown[bid]) {
          breakdown[bid] = { google: 0, facebook: 0, yelp: 0, nextdoor: 0 }
        }
        const plat = String(row[platB] ?? '').toLowerCase()
        const cnt = Number(row[cntB] ?? 0)
        if (plat === 'google') breakdown[bid].google += cnt
        else if (plat === 'facebook') breakdown[bid].facebook += cnt
        else if (plat === 'yelp') breakdown[bid].yelp += cnt
        else if (plat === 'nextdoor') breakdown[bid].nextdoor += cnt
      }
    }

    return { uniquePersons, breakdown }
  } catch (e) {
    console.warn('[posthog-conversions-query] failed', e)
    return null
  }
}

/**
 * Per-business average star rating from `customer_responded`, deduped by PostHog person_id
 * (each person's first rating in the window via argMin). Same time window as admin analytics.
 */
export async function fetchPosthogCustomerFlowAvgRatings(
  startIso: string
): Promise<PosthogFlowRatingByBusiness | null> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const base = posthogApiBase()
  if (!apiKey || !projectId || !base) return null

  const escapedStart = startIso.replace(/'/g, "\\'")

  const sql = `
    SELECT
      business_id,
      avg(r_once) AS avg_flow_rating,
      count() AS unique_raters
    FROM (
      SELECT
        toString(properties.businessId) AS business_id,
        person_id,
        argMin(toInt(properties.rating), timestamp) AS r_once
      FROM events
      WHERE event = 'customer_responded'
        AND timestamp >= parseDateTimeBestEffort('${escapedStart}')
        AND timestamp <= now()
        AND properties.businessId IS NOT NULL
        AND toString(properties.businessId) != ''
        AND toInt(properties.rating) >= 1
        AND toInt(properties.rating) <= 5
      GROUP BY business_id, person_id
    ) AS per_person
    GROUP BY business_id
  `

  try {
    const json = await posthogHogqlQuery(sql, 'admin_analytics_customer_flow_avg_rating')
    if (!json) return null

    const table = parseHogqlTable(json)
    const bidIdx = colIndex(table.columns, 'business_id')
    const avgIdx = colIndex(table.columns, 'avg_flow_rating')
    const urIdx = colIndex(table.columns, 'unique_raters')
    if (bidIdx < 0 || avgIdx < 0 || urIdx < 0) return null

    const out: PosthogFlowRatingByBusiness = {}
    for (const row of table.rows) {
      const id = String(row[bidIdx] ?? '')
      if (!id) continue
      const avg = Number(row[avgIdx] ?? 0)
      const n = Number(row[urIdx] ?? 0)
      if (!Number.isFinite(avg) || !Number.isFinite(n)) continue
      out[id] = { avgRating: avg, uniqueRaters: n }
    }
    return out
  } catch (e) {
    console.warn('[posthog-flow-ratings] failed', e)
    return null
  }
}

/**
 * Fetch platform_selected events for a single business.
 * Returns unique person count and per-platform event counts.
 */
export async function fetchPosthogConversionsForBusiness(
  businessId: string,
  startIso: string
): Promise<{ uniquePersons: number; platformBreakdown: PlatformBreakdown } | null> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const base = posthogApiBase()
  if (!apiKey || !projectId || !base) return null

  const escapedStart = startIso.replace(/'/g, "\\'")
  const escapedBid = businessId.replace(/'/g, "\\'")

  const uniqQuery = `
    SELECT
      uniqExact(person_id) AS conversions
    FROM events
    WHERE event = 'platform_selected'
      AND timestamp >= parseDateTimeBestEffort('${escapedStart}')
      AND timestamp <= now()
      AND toString(properties.businessId) = '${escapedBid}'
  `

  const breakdownQuery = `
    SELECT
      lower(toString(properties.platform)) AS plat,
      count() AS cnt
    FROM events
    WHERE event = 'platform_selected'
      AND timestamp >= parseDateTimeBestEffort('${escapedStart}')
      AND timestamp <= now()
      AND toString(properties.businessId) = '${escapedBid}'
    GROUP BY plat
  `

  try {
    const [uniqJson, brJson] = await Promise.all([
      posthogHogqlQuery(uniqQuery, 'client_analytics_conversions_uniq'),
      posthogHogqlQuery(breakdownQuery, 'client_analytics_conversions_breakdown'),
    ])
    if (!uniqJson || !brJson) return null

    const uniqTable = parseHogqlTable(uniqJson)
    const brTable = parseHogqlTable(brJson)

    let uniquePersons = 0
    const cIdx = colIndex(uniqTable.columns, 'conversions')
    if (cIdx >= 0 && uniqTable.rows.length > 0) {
      uniquePersons = Number(uniqTable.rows[0][cIdx] ?? 0)
    }

    const platformBreakdown: PlatformBreakdown = { google: 0, facebook: 0, yelp: 0, nextdoor: 0 }
    const platB = colIndex(brTable.columns, 'plat')
    const cntB = colIndex(brTable.columns, 'cnt')
    if (platB >= 0 && cntB >= 0) {
      for (const row of brTable.rows) {
        const plat = String(row[platB] ?? '').toLowerCase()
        const cnt = Number(row[cntB] ?? 0)
        if (plat === 'google') platformBreakdown.google += cnt
        else if (plat === 'facebook') platformBreakdown.facebook += cnt
        else if (plat === 'yelp') platformBreakdown.yelp += cnt
        else if (plat === 'nextdoor') platformBreakdown.nextdoor += cnt
      }
    }

    return { uniquePersons, platformBreakdown }
  } catch (e) {
    console.warn('[posthog-client-conversions] failed', e)
    return null
  }
}
