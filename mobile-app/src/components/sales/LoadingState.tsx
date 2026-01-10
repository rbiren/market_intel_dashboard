/**
 * Loading State Components
 *
 * Skeleton loaders and loading indicators for the Sales Platform
 */

import { useSalesContext } from '../../context/SalesContext'

// Skeleton shimmer animation
const shimmerClass = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"

export function StatCardSkeleton() {
  const { theme } = useSalesContext()
  const isDark = theme === 'dark'
  const bgColor = isDark ? 'bg-white/10' : 'bg-[#d9d6cf]/50'

  return (
    <div className={`
      p-4 rounded-lg border-l-4 border-[#8c8a7e]/30
      ${isDark ? 'bg-[#232322]' : 'bg-white'}
      ${shimmerClass}
    `}>
      <div className={`h-3 w-20 rounded ${bgColor} mb-2`} />
      <div className={`h-8 w-32 rounded ${bgColor} mb-1`} />
      <div className={`h-4 w-24 rounded ${bgColor}`} />
    </div>
  )
}

export function DealerCardSkeleton() {
  const { theme } = useSalesContext()
  const isDark = theme === 'dark'
  const bgColor = isDark ? 'bg-white/10' : 'bg-[#d9d6cf]/50'

  return (
    <div className={`
      p-4 rounded-xl
      ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf]'}
      ${shimmerClass}
    `}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className={`h-5 w-40 rounded ${bgColor} mb-2`} />
          <div className={`h-4 w-28 rounded ${bgColor}`} />
        </div>
        <div className={`w-8 h-8 rounded-lg ${bgColor}`} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}`}>
            <div className={`h-3 w-12 rounded ${bgColor} mb-1`} />
            <div className={`h-5 w-16 rounded ${bgColor}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  const { theme } = useSalesContext()
  const isDark = theme === 'dark'
  const bgColor = isDark ? 'bg-white/10' : 'bg-[#d9d6cf]/50'

  return (
    <div
      className={`
        rounded-xl p-4
        ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf]'}
        ${shimmerClass}
      `}
      style={{ height }}
    >
      <div className={`h-5 w-32 rounded ${bgColor} mb-4`} />
      <div className="flex items-end justify-around h-[calc(100%-60px)] pb-4 gap-2">
        {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
          <div
            key={i}
            className={`w-full rounded-t ${bgColor}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  const { theme } = useSalesContext()
  const isDark = theme === 'dark'
  const bgColor = isDark ? 'bg-white/10' : 'bg-[#d9d6cf]/50'

  return (
    <div className={`
      rounded-xl overflow-hidden
      ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf]'}
      ${shimmerClass}
    `}>
      {/* Header */}
      <div className={`
        flex gap-4 p-4 border-b
        ${isDark ? 'border-white/10 bg-white/5' : 'border-[#d9d6cf] bg-[#f7f4f0]'}
      `}>
        {[120, 80, 100, 80].map((w, i) => (
          <div key={i} className={`h-4 rounded ${bgColor}`} style={{ width: w }} />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className={`
            flex gap-4 p-4 border-b last:border-b-0
            ${isDark ? 'border-white/5' : 'border-[#d9d6cf]/50'}
          `}
        >
          {[120, 80, 100, 80].map((w, j) => (
            <div key={j} className={`h-4 rounded ${bgColor}`} style={{ width: w }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function MapSkeleton() {
  const { theme } = useSalesContext()
  const isDark = theme === 'dark'
  const bgColor = isDark ? 'bg-white/10' : 'bg-[#d9d6cf]/50'

  return (
    <div className={`
      rounded-xl p-4 h-[400px] flex items-center justify-center
      ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf]'}
      ${shimmerClass}
    `}>
      <div className="text-center">
        <svg className={`w-16 h-16 mx-auto mb-3 ${isDark ? 'text-[#8c8a7e]/30' : 'text-[#d9d6cf]'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <div className={`h-4 w-32 mx-auto rounded ${bgColor}`} />
      </div>
    </div>
  )
}

export function FullPageLoader() {
  const { theme } = useSalesContext()
  const isDark = theme === 'dark'

  return (
    <div className={`
      fixed inset-0 z-50 flex items-center justify-center
      ${isDark ? 'bg-[#181817]' : 'bg-[#fffdfa]'}
    `}>
      <div className="text-center">
        {/* Animated logo */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-[#495737]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#495737] animate-spin" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-[#495737] to-[#577d91] flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <p className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Loading Sales Hub...
        </p>
        <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
          Preparing your territory data
        </p>
      </div>
    </div>
  )
}

// Add shimmer animation to index.css or tailwind config
// @keyframes shimmer { 100% { transform: translateX(100%); } }
