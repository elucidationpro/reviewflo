import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import AppLayout from '@/components/AppLayout'

interface UserData {
  id: string
  email: string
  name?: string | null
  phone?: string | null
}

interface Business {
  id: string
  business_name: string
  tier: 'free' | 'pro' | 'ai'
}

interface GoogleAccount {
  email: string
  name?: string
  picture?: string
}

// ── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-bold text-gray-900 mb-5">{title}</h2>
      {children}
    </div>
  )
}

// ── Field row ────────────────────────────────────────────────────────────────
function FieldRow({ label, value, action }: { label: string; value: string | React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <p className="text-sm text-gray-600 mt-0.5">{value}</p>
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  )
}

export default function AccountPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [nameSuccess, setNameSuccess] = useState(false)

  useEffect(() => {
    fetchAccountData()
  }, [])

  const fetchAccountData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get user metadata
      const userMetadata = user.user_metadata || {}
      setUserData({
        id: user.id,
        email: user.email || '',
        name: userMetadata.full_name || userMetadata.name || null,
        phone: userMetadata.phone || null,
      })
      setNameInput(userMetadata.full_name || userMetadata.name || '')

      // Check for Google account connection
      const googleProvider = user.identities?.find(identity => identity.provider === 'google')
      if (googleProvider) {
        setGoogleAccount({
          email: googleProvider.identity_data?.email || user.email || '',
          name: googleProvider.identity_data?.full_name || googleProvider.identity_data?.name,
          picture: googleProvider.identity_data?.picture,
        })
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const res = await fetch('/api/my-business', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const payload = await res.json().catch(() => ({})) as {
          business?: { id: string; business_name: string; tier: string } | null
        }
        if (res.ok && payload.business) {
          setBusiness({
            id: payload.business.id,
            business_name: payload.business.business_name,
            tier: (payload.business.tier as Business['tier']) || 'free',
          })
        }
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching account data:', error)
      setIsLoading(false)
    }
  }

  const handleSaveName = async () => {
    if (!userData) return
    setNameError('')
    setNameSuccess(false)
    setSavingName(true)

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: nameInput || null }
      })

      if (error) {
        setNameError(error.message)
        setSavingName(false)
        return
      }

      setUserData({ ...userData, name: nameInput || null })
      setEditingName(false)
      setNameSuccess(true)
      setSavingName(false)
      setTimeout(() => setNameSuccess(false), 3000)
    } catch (error) {
      console.error('Error updating name:', error)
      setNameError('Failed to update name. Please try again.')
      setSavingName(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4A3428]" />
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No account data found</p>
      </div>
    )
  }

  return (
    <AppLayout
      businessName={business?.business_name}
      tier={business?.tier}
      pendingFeedbackCount={0}
      onLogout={handleLogout}
    >
      <Head>
        <title>Account — ReviewFlo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="px-6 py-8 max-w-2xl mx-auto space-y-4">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Account</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your personal details and connected accounts</p>
        </div>

        {/* Success message */}
        {nameSuccess && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-medium">
            <svg className="w-4 h-4 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Name updated successfully
          </div>
        )}

        {/* User Info */}
        <Card title="Personal Details">
          <div className="space-y-0">
            {/* Name */}
            <div className="py-3 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700">Name</p>
                  {editingName ? (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:border-transparent"
                        placeholder="Enter your name"
                      />
                      {nameError && <p className="text-xs text-red-600">{nameError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveName}
                          disabled={savingName}
                          className="px-3 py-1.5 bg-[#4A3428] text-white text-xs font-semibold rounded-lg hover:bg-[#4A3428]/90 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {savingName ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingName(false)
                            setNameInput(userData.name || '')
                            setNameError('')
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 mt-0.5">{userData.name || 'Not set'}</p>
                  )}
                </div>
                {!editingName && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="ml-4 text-xs font-semibold text-[#4A3428] hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Email */}
            <FieldRow
              label="Email"
              value={userData.email}
            />
          </div>
        </Card>

        {/* Google Account */}
        <Card title="Connected Accounts">
          {googleAccount ? (
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              {googleAccount.picture && (
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={googleAccount.picture} alt="Google profile" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <p className="text-sm font-semibold text-gray-900">Google</p>
                </div>
                <p className="text-sm text-gray-600">{googleAccount.email}</p>
                {googleAccount.name && (
                  <p className="text-xs text-gray-500 mt-0.5">{googleAccount.name}</p>
                )}
              </div>
              <span className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium shrink-0">
                Connected
              </span>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <p className="text-sm text-gray-600">No Google account connected</p>
              <p className="text-xs text-gray-500 mt-1">Connect your Google account in Settings to sync Google Business Profile</p>
            </div>
          )}
        </Card>

        {/* Business Info (if exists) */}
        {business && (
          <Card title="Business">
            <div className="space-y-0">
              <FieldRow
                label="Business Name"
                value={business.business_name}
              />
              <FieldRow
                label="Plan"
                value={
                  <span
                    style={{ backgroundColor: '#F5F5DC', borderColor: '#C9A961', color: '#4A3428' }}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-bold tracking-wide uppercase"
                  >
                    {business.tier === 'pro' ? 'PRO' : business.tier === 'ai' ? 'AI' : 'FREE'}
                  </span>
                }
              />
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
