import { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle?: string
  icon: string
  loading?: boolean
  children: ReactNode
  className?: string
  onClearFilter?: () => void
  hasActiveFilter?: boolean
}

export function ChartCard({
  title,
  subtitle,
  icon,
  loading,
  children,
  className = '',
  onClearFilter,
  hasActiveFilter
}: ChartCardProps) {
  return (
    <div className={`thor-chart-card animate-thor-fade-in ${className}`}>
      {/* Header with gradient background */}
      <div className="thor-chart-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--thor-sage)] to-[var(--thor-sage-dark)] flex items-center justify-center shadow-sm">
            <span className="text-lg filter drop-shadow-sm">{icon}</span>
          </div>
          <div>
            <h3 className="thor-chart-title">{title}</h3>
            {subtitle && <p className="thor-chart-subtitle">{subtitle}</p>}
          </div>
        </div>
        {hasActiveFilter && onClearFilter && (
          <button
            onClick={onClearFilter}
            className="btn-thor-ghost text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          >
            <span>Clear Filter</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Chart body */}
      <div className="thor-chart-body">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="thor-spinner" />
              <span className="text-sm text-[var(--thor-medium-gray)] font-[var(--font-heading)] font-medium">
                Loading chart...
              </span>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
