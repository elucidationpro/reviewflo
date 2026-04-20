/**
 * POST /api/admin/clear-leads-and-signups
 * Clears all rows from admin "Leads & signups" sources.
 *
 * This is intended for wiping test data in non-production environments.
 *
 * Body: { confirm: "CLEAR_LEADS_AND_SIGNUPS" }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '../../../lib/adminAuth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

type TableToClear = 'early_access_signups' | 'beta_signups' | 'waitlist' | 'leads'

async function countRows(table: TableToClear) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) throw error
  return count ?? 0
}

async function deleteAllRows(table: TableToClear) {
  // Supabase requires a filter for deletes; since `id` is non-null on these tables, this matches all rows.
  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .not('id', 'is', null)

  if (error) throw error
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user || !isAdminUser(user)) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const confirm = typeof req.body?.confirm === 'string' ? req.body.confirm : ''
    if (confirm !== 'CLEAR_LEADS_AND_SIGNUPS') {
      return res.status(400).json({
        error: 'Missing confirmation',
        hint: 'Send { "confirm": "CLEAR_LEADS_AND_SIGNUPS" }',
      })
    }

    // Delete in an order that avoids potential FK constraints.
    const tables: TableToClear[] = ['early_access_signups', 'beta_signups', 'waitlist', 'leads']
    const before = Object.fromEntries(
      await Promise.all(tables.map(async (t) => [t, await countRows(t)] as const))
    ) as Record<TableToClear, number>

    for (const t of tables) {
      await deleteAllRows(t)
    }

    return res.status(200).json({
      ok: true,
      cleared: before,
      message: 'Cleared early access, beta signups, waitlist, and leads.',
    })
  } catch (err) {
    console.error('[admin/clear-leads-and-signups]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

