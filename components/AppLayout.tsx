import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import LocationSwitcher from './LocationSwitcher'

interface AppLayoutProps {
  businessName?: string
  tier?: 'free' | 'pro' | 'ai'
  pendingFeedbackCount?: number
  onLogout: () => void
  children: React.ReactNode
  /** Optional extra nav content rendered below the Settings link (e.g. settings sub-sections) */
  navExtra?: React.ReactNode
}

interface SidebarInnerProps {
  businessName?: string
  tier?: 'free' | 'pro' | 'ai'
  pendingFeedbackCount: number
  onLogout: () => void
  pathname: string
  navExtra?: React.ReactNode
}

function SidebarInner({ businessName, tier, pendingFeedbackCount, onLogout, pathname, navExtra }: SidebarInnerProps) {
  const tierLabel = tier === 'pro' ? 'PRO' : tier === 'ai' ? 'AI' : 'FREE'

  const isActive = (href: string) => pathname === href

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/dashboard">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/reviewflo-logo.svg" alt="ReviewFlo" className="h-8 w-auto" />
        </Link>
      </div>

      {/* Business info */}
      {businessName && (
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900 truncate">{businessName}</p>
          <span
            style={{ backgroundColor: '#F5F5DC', borderColor: '#C9A961', color: '#4A3428' }}
            className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-widest uppercase"
          >
            {tierLabel}
          </span>
          <div className="mt-3">
            <LocationSwitcher />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {/* Overview */}
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive('/dashboard')
              ? 'bg-[#4A3428]/[0.07] text-[#4A3428]'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <span className={`w-5 h-5 shrink-0 ${isActive('/dashboard') ? 'text-[#4A3428]' : 'text-gray-400'}`}>
            <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </span>
          <span className="flex-1">Overview</span>
        </Link>

        {/* Reviews */}
        <Link
          href="/dashboard/reviews"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive('/dashboard/reviews')
              ? 'bg-[#4A3428]/[0.07] text-[#4A3428]'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <span className={`w-5 h-5 shrink-0 ${isActive('/dashboard/reviews') ? 'text-[#4A3428]' : 'text-gray-400'}`}>
            <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </span>
          <span className="flex-1">Reviews</span>
        </Link>

        {/* Outreach */}
        <Link
          href="/dashboard/outreach"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive('/dashboard/outreach')
              ? 'bg-[#4A3428]/[0.07] text-[#4A3428]'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <span className={`w-5 h-5 shrink-0 ${isActive('/dashboard/outreach') ? 'text-[#4A3428]' : 'text-gray-400'}`}>
            <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0-.621.504-1.125 1.125-1.125h17.25c.621 0 1.125.504 1.125 1.125v10.5c0 .621-.504 1.125-1.125 1.125H3.375A1.125 1.125 0 012.25 17.25V6.75z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.55 7.05l9.45 6.3 9.45-6.3" />
            </svg>
          </span>
          <span className="flex-1">Outreach</span>
        </Link>

        {/* Feedback */}
        <Link
          href="/feedback"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive('/feedback')
              ? 'bg-[#4A3428]/[0.07] text-[#4A3428]'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <span className={`w-5 h-5 shrink-0 ${isActive('/feedback') ? 'text-[#4A3428]' : 'text-gray-400'}`}>
            <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </span>
          <span className="flex-1">Feedback</span>
          {pendingFeedbackCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingFeedbackCount > 9 ? '9+' : pendingFeedbackCount}
            </span>
          )}
        </Link>

        {/* Divider */}
        <div className="h-px bg-gray-100 my-2 mx-1" />

        {/* Settings */}
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive('/settings')
              ? 'bg-[#4A3428]/[0.07] text-[#4A3428]'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <span className={`w-5 h-5 shrink-0 ${isActive('/settings') ? 'text-[#4A3428]' : 'text-gray-400'}`}>
            <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <span className="flex-1">Settings</span>
        </Link>

        {/* Settings sub-sections (injected by settings page) */}
        {navExtra && (
          <div className="pl-4 space-y-0.5 pt-0.5">
            {navExtra}
          </div>
        )}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-4 border-t border-gray-100">
        {/* Log Out */}
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
        >
          <span className="w-5 h-5 shrink-0 text-gray-400">
            <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </span>
          <span className="flex-1 text-left">Log Out</span>
        </button>
      </div>
    </div>
  )
}

export default function AppLayout({
  businessName,
  tier,
  pendingFeedbackCount = 0,
  onLogout,
  children,
  navExtra,
}: AppLayoutProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [router.pathname])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC]/30 via-white to-[#F5F5DC]/30">

      {/* Desktop sidebar — fixed, hidden below md */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-56 md:flex-col bg-white border-r border-gray-100 z-30">
        <SidebarInner
          businessName={businessName}
          tier={tier}
          pendingFeedbackCount={pendingFeedbackCount}
          onLogout={onLogout}
          pathname={router.pathname}
          navExtra={navExtra}
        />
      </div>

      {/* Mobile top bar */}
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
        <div className="w-9" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/25"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-100 shadow-xl">
            {/* Close button */}
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
            <SidebarInner
              businessName={businessName}
              tier={tier}
              pendingFeedbackCount={pendingFeedbackCount}
              onLogout={onLogout}
              pathname={router.pathname}
              navExtra={navExtra}
            />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="md:pl-56 pt-14 md:pt-0">
        {children}
      </div>
    </div>
  )
}
