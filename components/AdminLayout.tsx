import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface AdminLayoutProps {
  onLogout: () => void
  children: React.ReactNode
  /** Optional extra nav content (e.g. business sub-sections) */
  navExtra?: React.ReactNode
}

function AdminSidebarInner({
  onLogout,
  pathname,
  navExtra,
}: {
  onLogout: () => void
  pathname: string
  navExtra?: React.ReactNode
}) {
  const isOverview = pathname === '/admin'
  const isBusinesses =
    pathname === '/admin/businesses' || pathname.startsWith('/admin/businesses/')
  const isLeads = pathname.startsWith('/admin/leads')
  const isAnalytics = pathname === '/admin/analytics'
  const isCreate = pathname === '/admin/create-business'

  const linkCls = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-[#4A3428]/[0.07] text-[#4A3428]'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`

  const iconCls = (active: boolean) =>
    `w-5 h-5 shrink-0 ${active ? 'text-[#4A3428]' : 'text-gray-400'}`

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/admin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/reviewflo-logo.svg" alt="ReviewFlo" className="h-8 w-auto" />
        </Link>
      </div>

      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Admin</p>
        <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-widest uppercase bg-[#4A3428] text-white border-[#4A3428]">
          Admin
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <Link href="/admin" className={linkCls(isOverview)}>
          <span className={iconCls(isOverview)}>
            <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </span>
          <span className="flex-1">Overview</span>
        </Link>

        <Link href="/admin/businesses" className={linkCls(isBusinesses)}>
          <span className={iconCls(isBusinesses)}>
            <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3M6 7h12M6 11h12M6 15h12M6 19h12M4 7h16v14H4V7z"
              />
            </svg>
          </span>
          <span className="flex-1">Businesses</span>
        </Link>

        {navExtra && (
          <div className="pl-4 space-y-0.5 pt-0.5">
            {navExtra}
          </div>
        )}

        <Link href="/admin/leads" className={linkCls(isLeads)}>
          <span className={iconCls(isLeads)}>
            <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
          <span className="flex-1">Leads &amp; signups</span>
        </Link>

        <Link href="/admin/analytics" className={linkCls(isAnalytics)}>
          <span className={iconCls(isAnalytics)}>
            <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </span>
          <span className="flex-1">Analytics</span>
        </Link>

        <Link href="/admin/create-business" className={linkCls(isCreate)}>
          <span className={iconCls(isCreate)}>
            <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
            </svg>
          </span>
          <span className="flex-1">Create business</span>
        </Link>
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
        >
          <span className="w-5 h-5 shrink-0 text-gray-400">
            <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </span>
          <span className="flex-1 text-left">Log out</span>
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout({ onLogout, children, navExtra }: AdminLayoutProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [router.pathname])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC]/30 via-white to-[#F5F5DC]/30">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-56 md:flex-col bg-white border-r border-gray-100 z-30">
        <AdminSidebarInner onLogout={onLogout} pathname={router.pathname} navExtra={navExtra} />
      </div>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 h-14 flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/reviewflo-logo.svg" alt="ReviewFlo" className="h-7 w-auto" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-[#4A3428]">Admin</span>
      </div>

      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/25"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-100 shadow-xl">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer z-10"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <AdminSidebarInner onLogout={onLogout} pathname={router.pathname} navExtra={navExtra} />
          </div>
        </>
      )}

      <div className="md:pl-56 pt-14 md:pt-0">{children}</div>
    </div>
  )
}
