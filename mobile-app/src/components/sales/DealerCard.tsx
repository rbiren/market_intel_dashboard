/**
 * Dealer Card Component
 *
 * Card displaying dealer information with key metrics
 */

import { useSalesContext } from '../../context/SalesContext'
import type { DealerInfo } from '../../hooks/useSalesData'

interface DealerCardProps {
  dealer: DealerInfo
  onClick?: () => void
  selected?: boolean
  compact?: boolean
}

export function DealerCard({ dealer, onClick, selected = false, compact = false }: DealerCardProps) {
  const { theme } = useSalesContext()
  const isDark = theme === 'dark'

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  const formatNumber = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toLocaleString()
  }

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`
          p-3 rounded-lg transition-all duration-200 cursor-pointer
          ${isDark
            ? `bg-[#232322] border border-white/10 hover:border-[#495737]/50 ${selected ? 'border-[#495737] bg-[#495737]/10' : ''}`
            : `bg-white border border-[#d9d6cf] hover:border-[#495737]/50 ${selected ? 'border-[#495737] bg-[#495737]/5' : ''}`
          }
          hover:shadow-md
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className={`font-semibold truncate ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              {dealer.dealer_group}
            </p>
            <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
              {dealer.state || 'Multiple States'}
            </p>
          </div>
          <div className="text-right ml-4">
            <p className={`font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              {formatNumber(dealer.total_units)}
            </p>
            <p className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>units</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-xl transition-all duration-200 cursor-pointer
        ${isDark
          ? `bg-[#232322] border border-white/10 hover:border-[#495737]/50 ${selected ? 'border-[#495737] ring-2 ring-[#495737]/30' : ''}`
          : `bg-white border border-[#d9d6cf] hover:border-[#495737]/50 shadow-sm ${selected ? 'border-[#495737] ring-2 ring-[#495737]/20' : ''}`
        }
        hover:shadow-lg hover:-translate-y-0.5
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-lg truncate ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            {dealer.dealer_group}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <svg className={`w-4 h-4 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
              {dealer.city ? `${dealer.city}, ${dealer.state}` : dealer.state || 'Multiple Locations'}
            </span>
          </div>
        </div>

        {/* Action button */}
        <button
          className={`
            p-2 rounded-lg transition-colors
            ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f7f4f0]'}
          `}
          onClick={(e) => {
            e.stopPropagation()
            // Open dealer details
          }}
        >
          <svg className={`w-5 h-5 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}`}>
          <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
            Units
          </p>
          <p className={`text-lg font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            {formatNumber(dealer.total_units)}
          </p>
        </div>

        <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}`}>
          <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
            Value
          </p>
          <p className={`text-lg font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            {formatCurrency(dealer.total_value)}
          </p>
        </div>

        <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}`}>
          <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
            Avg Price
          </p>
          <p className={`text-lg font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            {formatCurrency(dealer.avg_price)}
          </p>
        </div>
      </div>

      {/* Footer - condition split */}
      {(dealer.new_units > 0 || dealer.used_units > 0) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed border-[#d9d6cf]/30">
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#495737]/10 text-[#495737]">
            NEW {dealer.new_units}
          </span>
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#a46807]/10 text-[#a46807]">
            USED {dealer.used_units}
          </span>
        </div>
      )}

      {/* Days on lot indicator */}
      {dealer.avg_days_on_lot !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Avg {Math.round(dealer.avg_days_on_lot)} days on lot</span>
        </div>
      )}
    </div>
  )
}

export default DealerCard
