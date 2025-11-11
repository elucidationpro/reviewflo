import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { checkIsAdmin } from '../../lib/adminAuth'

interface InviteCode {
  id: string
  code: string
  used: boolean
  used_by: string | null
  used_at: string | null
  created_at: string
}

export default function InviteCodesPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [customCode, setCustomCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    checkAdminAndFetchData()
  }, [])

  const checkAdminAndFetchData = async () => {
    try {
      const adminUser = await checkIsAdmin()
      if (!adminUser) {
        router.push('/dashboard')
        return
      }

      await fetchInviteCodes()
      setIsLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load invite codes')
      setIsLoading(false)
    }
  }

  const fetchInviteCodes = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const response = await fetch('/api/admin/get-invite-codes', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    })

    if (response.ok) {
      const data = await response.json()
      setInviteCodes(data.inviteCodes)
    }
  }

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsGenerating(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/generate-invite-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customCode: customCode.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate invite code')
      }

      setSuccess(`Invite code generated: ${data.inviteCode.code}`)
      setCustomCode('')
      await fetchInviteCodes()
      setIsGenerating(false)
    } catch (err: any) {
      setError(err.message || 'Failed to generate invite code')
      setIsGenerating(false)
    }
  }

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this invite code?')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/delete-invite-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ codeId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete invite code')
      }

      setSuccess('Invite code deleted successfully')
      await fetchInviteCodes()
    } catch (err: any) {
      setError(err.message || 'Failed to delete invite code')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Invite Codes - Admin Dashboard</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/admin"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Invite Codes</h1>
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">ADMIN</span>
            </div>
            <p className="text-gray-600 mt-2">Manage beta invite codes</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Generate Code Form */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate New Invite Code</h2>
            <form onSubmit={handleGenerateCode} className="flex gap-4">
              <input
                type="text"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                placeholder="Enter custom code or leave blank for random"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 uppercase"
              />
              <button
                type="submit"
                disabled={isGenerating}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </form>
          </div>

          {/* Invite Codes Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Used By</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Used Date</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inviteCodes.map((code) => (
                    <tr key={code.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <code className="font-mono font-bold text-blue-600">{code.code}</code>
                      </td>
                      <td className="px-6 py-4">
                        {code.used ? (
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                            Used
                          </span>
                        ) : (
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {code.used_by || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {new Date(code.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {code.used_at ? new Date(code.used_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!code.used && (
                          <button
                            onClick={() => handleDeleteCode(code.id)}
                            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {inviteCodes.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No invite codes yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
