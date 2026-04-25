import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { canUseCampaigns, getMaxCampaignContacts } from '../lib/tier-permissions'

type Tier = 'free' | 'pro' | 'ai'

interface Business {
  id: string
  business_name: string
  slug: string
  primary_color: string
  tier: Tier
}

interface PastCustomerCampaignsProps {
  business: Business
}

interface CampaignSummary {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  total_contacts: number
  sent_count: number
  clicked_count: number
  unsubscribed_count: number
  failed_count: number
  click_rate: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

interface PreviewContact {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
}

interface UploadResult {
  total_rows: number
  valid_contacts: number
  skipped_missing: number
  skipped_invalid_email: number
  skipped_intra_duplicate: number
  skipped_duplicates: number
  skipped_unsubscribes: number
  preview: PreviewContact[]
  contacts: PreviewContact[]
}

interface CampaignDetail {
  campaign: {
    id: string
    name: string
    status: 'draft' | 'active' | 'paused' | 'completed'
    total_contacts: number
    send_window_days: number
    sends_per_day: number
    message_template: string
    send_time: string
    started_at: string | null
    completed_at: string | null
    created_at: string
  }
  stats: {
    pending: number
    sent: number
    clicked: number
    unsubscribed: number
    failed: number
    ever_sent: number
    click_rate: number
  }
}

interface ContactRow {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'unsubscribed' | 'failed'
  scheduled_for: string | null
  sent_at: string | null
  clicked_at: string | null
  error_message: string | null
}

const DEFAULT_TEMPLATE = `Hi {first_name},

We wanted to reach out and say thank you for being a customer of {business_name}.

If you've had a great experience with us, we'd really appreciate it if you'd take a moment to share it on Google — it helps other customers find us and means a lot to our small business.

Leave a Google review: {google_review_link}

If you've already left us a review or feedback, no need to do anything — we just wanted to say thanks!

{business_name}`

const STATUS_BADGE: Record<CampaignSummary['status'], string> = {
  draft: 'bg-gray-50 text-gray-700 border-gray-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
}

const CONTACT_STATUS_BADGE: Record<ContactRow['status'], string> = {
  pending: 'bg-gray-50 text-gray-700 border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  opened: 'bg-amber-50 text-amber-700 border-amber-200',
  clicked: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unsubscribed: 'bg-gray-50 text-gray-500 border-gray-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
}

function suggestCampaignName(now: Date): string {
  const month = now.toLocaleString('en-US', { month: 'long' })
  const year = now.getFullYear()
  return `Past Customers — ${month} ${year}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(init.headers)
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`)
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  return fetch(url, { ...init, headers })
}

export default function PastCustomerCampaigns({ business }: PastCustomerCampaignsProps) {
  const allowed = canUseCampaigns(business.tier)
  const contactLimit = getMaxCampaignContacts(business.tier)

  const [view, setView] = useState<'list' | 'wizard' | 'detail'>('list')
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null)
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)

  const loadCampaigns = useCallback(async () => {
    if (!allowed) {
      setCampaigns([])
      return
    }
    setCampaignsError(null)
    try {
      const res = await authedFetch('/api/campaigns/list')
      if (!res.ok) {
        setCampaigns([])
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        setCampaignsError(json.error || `Request failed (${res.status})`)
        return
      }
      const json = (await res.json()) as { campaigns: CampaignSummary[] }
      setCampaigns(json.campaigns ?? [])
    } catch (err) {
      setCampaigns([])
      setCampaignsError(err instanceof Error ? err.message : 'Network error')
    }
  }, [allowed])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  const primaryColor = business.primary_color || '#4A3428'

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Past Customer Campaigns</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload a CSV of past customers and drip-send review requests over time.
          </p>
        </div>
        {view === 'list' && allowed && (
          <button
            type="button"
            onClick={() => setView('wizard')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer"
            style={{ backgroundColor: primaryColor }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New campaign
          </button>
        )}
      </div>

      {!allowed ? (
        <UpgradeCard />
      ) : view === 'list' ? (
        <CampaignList
          campaigns={campaigns}
          error={campaignsError}
          primaryColor={primaryColor}
          onNew={() => setView('wizard')}
          onOpen={(id) => {
            setActiveCampaignId(id)
            setView('detail')
          }}
        />
      ) : view === 'wizard' ? (
        <CampaignWizard
          business={business}
          contactLimit={contactLimit}
          onCancel={() => setView('list')}
          onCreated={async () => {
            setView('list')
            await loadCampaigns()
          }}
        />
      ) : view === 'detail' && activeCampaignId ? (
        <CampaignDetailView
          campaignId={activeCampaignId}
          onBack={async () => {
            setView('list')
            setActiveCampaignId(null)
            await loadCampaigns()
          }}
        />
      ) : null}
    </div>
  )
}

function UpgradeCard() {
  return (
    <div className="rounded-2xl border border-[#C9A961]/30 overflow-hidden shadow-sm">
      <div className="h-0.5 bg-gradient-to-r from-[#C9A961] via-[#e6c97a] to-[#C9A961]" />
      <div className="p-6 bg-gradient-to-br from-[#F5F5DC]/30 via-white to-white">
        <p className="text-xs font-semibold text-[#C9A961] uppercase tracking-widest mb-1">Pro feature</p>
        <h3 className="text-base font-bold text-gray-900 mb-2">Reach your past customers</h3>
        <p className="text-sm text-gray-600 mb-4 max-w-lg">
          Upload a CSV of past customers and drip-send review requests over weeks — perfect for tapping into the backlog of happy customers who never left a review.
        </p>
        <Link
          href="/#pricing"
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#4A3428] text-white hover:bg-[#4A3428]/90 transition-colors cursor-pointer inline-block"
        >
          See Pricing
        </Link>
      </div>
    </div>
  )
}

function CampaignList({
  campaigns,
  error,
  primaryColor,
  onNew,
  onOpen,
}: {
  campaigns: CampaignSummary[] | null
  error: string | null
  primaryColor: string
  onNew: () => void
  onOpen: (id: string) => void
}) {
  if (campaigns === null) {
    return (
      <div className="bg-white rounded-2xl border border-[#4A3428]/6 p-8 text-center"
        style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
      >
        <div className="animate-pulse text-sm text-gray-400">Loading campaigns…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#4A3428]/6 p-8 text-center"
        style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
      >
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Upload your past customer list to start collecting reviews from people who already love your work.
        </p>
        <button
          type="button"
          onClick={onNew}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
          style={{ backgroundColor: primaryColor }}
        >
          Upload CSV →
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#4A3428]/6 overflow-hidden"
      style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
    >
      <ul className="divide-y divide-gray-100">
        {campaigns.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpen(c.id)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-900 truncate">{c.name}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[c.status]} shrink-0 capitalize`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {c.total_contacts} contacts · {c.sent_count} sent · {c.click_rate}% clicked · {formatDate(c.created_at)}
                  </p>
                </div>
                <span className="text-gray-300 text-sm shrink-0">›</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CampaignWizard({
  business,
  contactLimit,
  onCancel,
  onCreated,
}: {
  business: Business
  contactLimit: number
  onCancel: () => void
  onCreated: () => Promise<void>
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [name, setName] = useState(suggestCampaignName(new Date()))
  const [windowDays, setWindowDays] = useState(30)
  const [sendsPerDay, setSendsPerDay] = useState<5 | 7 | 10>(7)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setUploadError(null)
    setUploadResult(null)
    if (file.size > 4 * 1024 * 1024) {
      setUploadError('CSV is too large (max 4MB).')
      return
    }
    setUploading(true)
    try {
      const text = await file.text()
      const res = await authedFetch('/api/campaigns/upload-csv', {
        method: 'POST',
        body: JSON.stringify({ csv: text, businessId: business.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUploadError((json as { error?: string }).error || `Upload failed (${res.status})`)
        return
      }
      setUploadResult(json as UploadResult)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [business.id])

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void handleFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void handleFile(f)
  }

  const totalContacts = uploadResult?.contacts.length ?? 0
  const exceedsLimit = totalContacts > contactLimit

  const lastSendDate = useMemo(() => {
    if (totalContacts === 0) return null
    const days = Math.ceil(totalContacts / sendsPerDay) - 1
    const d = new Date()
    d.setDate(d.getDate() + Math.max(0, Math.min(days, windowDays - 1)))
    return d
  }, [totalContacts, sendsPerDay, windowDays])

  const handleLaunch = async () => {
    if (!uploadResult) return
    setLaunchError(null)
    setLaunching(true)
    try {
      const res = await authedFetch('/api/campaigns/create', {
        method: 'POST',
        body: JSON.stringify({
          businessId: business.id,
          name: name.trim(),
          send_window_days: windowDays,
          sends_per_day: sendsPerDay,
          message_template: template.trim(),
          send_time: '10:00',
          contacts: uploadResult.contacts,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLaunchError((json as { error?: string }).error || `Launch failed (${res.status})`)
        return
      }
      await onCreated()
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : 'Launch failed')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#4A3428]/6 p-5"
      style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
    >
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-5">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              step >= s ? 'bg-[#4A3428] text-white' : 'bg-gray-100 text-gray-400'
            }`}>{s}</div>
            <span className={`text-xs font-medium ${step >= s ? 'text-gray-900' : 'text-gray-400'}`}>
              {s === 1 ? 'Upload' : s === 2 ? 'Settings' : 'Review'}
            </span>
            {s < 3 && <div className="w-6 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-[#4A3428] bg-[#F5F5DC]/30' : 'border-gray-200 bg-gray-50/50'
            }`}
          >
            <p className="text-sm text-gray-600 mb-2">
              Drop a CSV here, or
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onPickFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#4A3428] text-white cursor-pointer"
            >
              Choose file
            </button>
            <p className="text-[11px] text-gray-400 mt-3">
              Required columns: email (or phone). Optional: first_name, last_name. Max 4MB.
            </p>
          </div>

          {uploading && <p className="mt-3 text-xs text-gray-500">Parsing…</p>}
          {uploadError && <p className="mt-3 text-xs text-red-600">{uploadError}</p>}

          {uploadResult && (
            <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {uploadResult.valid_contacts} valid · {uploadResult.total_rows} total
              </p>
              <ul className="text-xs text-gray-600 space-y-0.5">
                <li>{uploadResult.skipped_missing} skipped (no email or phone)</li>
                <li>{uploadResult.skipped_invalid_email} skipped (invalid email)</li>
                <li>{uploadResult.skipped_intra_duplicate} skipped (duplicate within file)</li>
                <li>{uploadResult.skipped_duplicates} skipped (already in another campaign)</li>
                <li>{uploadResult.skipped_unsubscribes} skipped (previously unsubscribed)</li>
              </ul>
              {uploadResult.preview.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">First 5 contacts</p>
                  <ul className="text-xs text-gray-700 space-y-0.5">
                    {uploadResult.preview.map((c, i) => (
                      <li key={i}>
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || '(no name)'} · {c.email || c.phone}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {exceedsLimit && (
                <p className="mt-3 text-xs text-red-600">
                  Your tier allows up to {Number.isFinite(contactLimit) ? contactLimit : '∞'} contacts per campaign. Reduce the file or upgrade.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between mt-5">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              ← Back to list
            </button>
            <button
              type="button"
              disabled={!uploadResult || uploadResult.valid_contacts === 0 || exceedsLimit}
              onClick={() => setStep(2)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#4A3428] text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Campaign name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A3428]/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Send window</label>
                <span className="text-xs text-gray-500">{windowDays} days</span>
              </div>
              <input
                type="range"
                min={7}
                max={90}
                value={windowDays}
                onChange={(e) => setWindowDays(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Sends per day</label>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                {([5, 7, 10] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSendsPerDay(n)}
                    className={`px-3 py-1.5 transition-colors cursor-pointer ${
                      sendsPerDay === n ? 'bg-[#4A3428] text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Message template</label>
              <textarea
                rows={10}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#4A3428]/20"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Available variables: <code>{'{first_name}'}</code>, <code>{'{business_name}'}</code>, <code>{'{google_review_link}'}</code>, <code>{'{unsubscribe_link}'}</code>
              </p>
            </div>

            {lastSendDate && (
              <p className="text-xs text-gray-500">
                At these settings, your last send will be on{' '}
                <span className="font-semibold text-gray-700">
                  {lastSendDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>.
              </p>
            )}
          </div>

          <div className="flex justify-between mt-5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={!name.trim() || !template.trim()}
              onClick={() => setStep(3)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#4A3428] text-white disabled:opacity-40 cursor-pointer"
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {step === 3 && uploadResult && (
        <>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700 space-y-1">
              <p><span className="font-semibold">{name}</span></p>
              <p className="text-xs text-gray-500">
                {totalContacts} contacts · {sendsPerDay}/day over up to {windowDays} days · first send today
              </p>
              {lastSendDate && (
                <p className="text-xs text-gray-500">
                  Last send: {lastSendDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Sample preview</p>
              <pre className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-700 whitespace-pre-wrap">
{template
  .replace(/\{first_name\}/g, uploadResult.preview[0]?.first_name || 'there')
  .replace(/\{business_name\}/g, business.business_name)
  .replace(/\{google_review_link\}/g, '[review link]')
  .replace(/\{unsubscribe_link\}/g, '[unsubscribe link]')}
              </pre>
            </div>

            {launchError && <p className="text-xs text-red-600">{launchError}</p>}
          </div>

          <div className="flex justify-between mt-5">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={launching}
              onClick={handleLaunch}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#4A3428] text-white disabled:opacity-50 cursor-pointer"
            >
              {launching ? 'Launching…' : 'Launch campaign'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function CampaignDetailView({
  campaignId,
  onBack,
}: {
  campaignId: string
  onBack: () => Promise<void>
}) {
  const [detail, setDetail] = useState<CampaignDetail | null>(null)
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dRes, cRes] = await Promise.all([
        authedFetch(`/api/campaigns/${campaignId}`),
        authedFetch(`/api/campaigns/${campaignId}/contacts?page=${page}&pageSize=50`),
      ])
      if (!dRes.ok) {
        const j = (await dRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || 'Failed to load campaign')
      }
      if (!cRes.ok) {
        const j = (await cRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || 'Failed to load contacts')
      }
      const d = (await dRes.json()) as CampaignDetail
      const c = (await cRes.json()) as { contacts: ContactRow[] }
      setDetail(d)
      setContacts(c.contacts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [campaignId, page])

  useEffect(() => { void load() }, [load])

  const handleToggle = async () => {
    if (!detail) return
    const next = detail.campaign.status === 'paused' ? 'active' : 'paused'
    setActionPending(true)
    try {
      const res = await authedFetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || 'Failed to update')
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setActionPending(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await authedFetch(`/api/campaigns/${campaignId}/contacts?all=1`)
      if (!res.ok) throw new Error('Export failed')
      const json = (await res.json()) as { contacts: ContactRow[] }
      const rows = json.contacts
      const header = ['first_name', 'last_name', 'email', 'phone', 'status', 'scheduled_for', 'sent_at', 'clicked_at']
      const lines = [header.join(',')]
      for (const r of rows) {
        const values = [r.first_name, r.last_name, r.email, r.phone, r.status, r.scheduled_for, r.sent_at, r.clicked_at]
        lines.push(values.map((v) => csvCell(v)).join(','))
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${detail?.campaign.name || 'campaign'}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <div className="bg-white rounded-2xl border border-[#4A3428]/6 p-8 text-center text-sm text-gray-400">Loading…</div>
  }
  if (error || !detail) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
        {error || 'Campaign not found'}
        <button onClick={onBack} className="block mt-2 text-xs font-semibold text-red-900 hover:underline cursor-pointer">← Back</button>
      </div>
    )
  }

  const c = detail.campaign
  const s = detail.stats

  return (
    <div className="bg-white rounded-2xl border border-[#4A3428]/6 p-5"
      style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
    >
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="min-w-0 flex-1">
          <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer">← Back to campaigns</button>
          <div className="flex items-center gap-2 mt-1">
            <h3 className="text-base font-bold text-gray-900 truncate">{c.name}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[c.status]} shrink-0 capitalize`}>{c.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {c.status !== 'completed' && (
            <button
              type="button"
              onClick={handleToggle}
              disabled={actionPending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            >
              {c.status === 'paused' ? 'Resume' : 'Pause'}
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {[
          { label: 'Total', value: c.total_contacts },
          { label: 'Sent', value: s.ever_sent },
          { label: 'Clicked', value: s.clicked, sub: `${s.click_rate}%` },
          { label: 'Unsubscribed', value: s.unsubscribed },
          { label: 'Failed', value: s.failed },
        ].map((item) => (
          <div key={item.label} className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-center">
            <div className="text-xl font-bold text-gray-900">{item.value}</div>
            <div className="text-[11px] font-medium text-gray-500 mt-0.5">{item.label}</div>
            {item.sub && <div className="text-[11px] text-gray-400 mt-0.5">{item.sub}</div>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Name</th>
              <th className="text-left px-3 py-2 font-semibold">Contact</th>
              <th className="text-left px-3 py-2 font-semibold">Status</th>
              <th className="text-left px-3 py-2 font-semibold">Scheduled</th>
              <th className="text-left px-3 py-2 font-semibold">Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 text-gray-700">
                  {[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-3 py-2 text-gray-600">{row.email || row.phone || '—'}</td>
                <td className="px-3 py-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CONTACT_STATUS_BADGE[row.status]} capitalize`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-500">{formatDateTime(row.scheduled_for)}</td>
                <td className="px-3 py-2 text-gray-500">{formatDateTime(row.sent_at)}</td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No contacts on this page.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 mt-3">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-2.5 py-1 rounded-lg text-xs border border-gray-200 disabled:opacity-40 cursor-pointer"
        >Prev</button>
        <span className="text-xs text-gray-500">Page {page}</span>
        <button
          type="button"
          disabled={contacts.length < 50}
          onClick={() => setPage((p) => p + 1)}
          className="px-2.5 py-1 rounded-lg text-xs border border-gray-200 disabled:opacity-40 cursor-pointer"
        >Next</button>
      </div>
    </div>
  )
}

function csvCell(v: string | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
