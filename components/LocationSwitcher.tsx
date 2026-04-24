import { useEffect, useRef, useState } from 'react'
import { useBusinessOptional } from '@/contexts/BusinessContext'

export default function LocationSwitcher() {
  const ctx = useBusinessOptional()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  if (!ctx) return null
  const { locations, selectedBusinessId, setSelectedBusinessId } = ctx
  if (!locations || locations.length < 2) return null

  const current = locations.find((l) => l.id === selectedBusinessId) ?? locations[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{current?.business_name || 'Location'}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-auto" role="listbox">
          {locations.map((loc) => {
            const isSelected = loc.id === current?.id
            return (
              <button
                key={loc.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setSelectedBusinessId(loc.id)
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${isSelected ? 'bg-[#4A3428]/[0.07] text-[#4A3428] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">{loc.business_name}</span>
                  {loc.is_primary && (
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold shrink-0">Primary</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
