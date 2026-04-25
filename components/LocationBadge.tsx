interface LocationBadgeProps {
  name: string
  className?: string
}

export default function LocationBadge({ name, className = '' }: LocationBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#4A3428]/[0.07] text-[#4A3428] leading-none ${className}`}
    >
      <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span className="truncate max-w-[120px]">{name}</span>
    </span>
  )
}
