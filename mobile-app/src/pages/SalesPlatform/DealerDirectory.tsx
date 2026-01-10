/**
 * Dealer Directory
 *
 * Searchable, filterable list of all dealers in the territory
 */

import { useState, useMemo } from 'react'
import { useSalesContext } from '../../context/SalesContext'
import { useDealerList } from '../../hooks/useSalesData'
import { DealerCard } from '../../components/sales/DealerCard'
import { DealerCardSkeleton } from '../../components/sales/LoadingState'

type SortOption = 'name' | 'units' | 'value' | 'price'
type ViewOption = 'grid' | 'list'

export function DealerDirectory() {
  const { theme, viewMode, filters, updateFilter, setCurrentView, setSelectedDealer } = useSalesContext()
  const { dealers, loading } = useDealerList(filters)

  const [sortBy, setSortBy] = useState<SortOption>('units')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [viewType, setViewType] = useState<ViewOption>('grid')

  const isDark = theme === 'dark'
  const isMobile = viewMode === 'mobile'

  // Sort dealers
  const sortedDealers = useMemo(() => {
    const sorted = [...dealers].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.dealer_group.localeCompare(b.dealer_group)
          break
        case 'units':
          comparison = a.total_units - b.total_units
          break
        case 'value':
          comparison = a.total_value - b.total_value
          break
        case 'price':
          comparison = a.avg_price - b.avg_price
          break
      }
      return sortDir === 'desc' ? -comparison : comparison
    })
    return sorted
  }, [dealers, sortBy, sortDir])

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  return (
    <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
      {/* Search and Controls */}
      <div className={`
        sticky top-14 z-30 px-4 py-3
        ${isDark ? 'bg-[#181817]/95 border-b border-white/10' : 'bg-[#fffdfa]/95 border-b border-[#d9d6cf]'}
        backdrop-blur-md
      `}>
        {/* Search */}
        <div className="relative mb-3">
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search dealers..."
            value={filters.searchQuery || ''}
            onChange={(e) => updateFilter('searchQuery', e.target.value || undefined)}
            className={`
              w-full pl-10 pr-4 py-2.5 rounded-xl border transition-all duration-200
              ${isDark
                ? 'bg-[#232322] border-white/10 text-[#fffdfa] placeholder-[#8c8a7e] focus:border-[#495737]'
                : 'bg-white border-[#d9d6cf] text-[#181817] placeholder-[#8c8a7e] focus:border-[#495737]'
              }
              focus:outline-none focus:ring-2 focus:ring-[#495737]/20
            `}
          />
          {filters.searchQuery && (
            <button
              onClick={() => updateFilter('searchQuery', undefined)}
              className={`
                absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full
                ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f7f4f0]'}
              `}
            >
              <svg className={`w-4 h-4 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`
                px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors
                ${isDark
                  ? 'bg-[#232322] border-white/10 text-[#fffdfa]'
                  : 'bg-white border-[#d9d6cf] text-[#181817]'
                }
              `}
            >
              <option value="units">Sort by Units</option>
              <option value="value">Sort by Value</option>
              <option value="price">Sort by Avg Price</option>
              <option value="name">Sort by Name</option>
            </select>

            {/* Sort direction */}
            <button
              onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
              className={`
                p-1.5 rounded-lg border transition-colors
                ${isDark
                  ? 'bg-[#232322] border-white/10 hover:bg-white/10'
                  : 'bg-white border-[#d9d6cf] hover:bg-[#f7f4f0]'
                }
              `}
            >
              <svg
                className={`w-4 h-4 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''} ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* View toggle */}
          {!isMobile && (
            <div className={`
              flex rounded-lg border overflow-hidden
              ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}
            `}>
              <button
                onClick={() => setViewType('grid')}
                className={`
                  p-1.5 transition-colors
                  ${viewType === 'grid'
                    ? 'bg-[#495737] text-white'
                    : isDark ? 'bg-[#232322] text-[#8c8a7e] hover:bg-white/10' : 'bg-white text-[#595755] hover:bg-[#f7f4f0]'
                  }
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewType('list')}
                className={`
                  p-1.5 transition-colors
                  ${viewType === 'list'
                    ? 'bg-[#495737] text-white'
                    : isDark ? 'bg-[#232322] text-[#8c8a7e] hover:bg-white/10' : 'bg-white text-[#595755] hover:bg-[#f7f4f0]'
                  }
                `}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}

          {/* Results count */}
          <span className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
            {sortedDealers.length} dealers
          </span>
        </div>
      </div>

      {/* Dealer List */}
      <div className="px-4 py-4">
        {loading ? (
          <div className={`grid gap-4 ${isMobile || viewType === 'list' ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {[...Array(6)].map((_, i) => (
              <DealerCardSkeleton key={i} />
            ))}
          </div>
        ) : sortedDealers.length === 0 ? (
          <div className={`
            text-center py-12 rounded-xl
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf]'}
          `}>
            <svg className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-[#8c8a7e]/30' : 'text-[#d9d6cf]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className={`font-semibold mb-1 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              No dealers found
            </h3>
            <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
              Try adjusting your search or filters
            </p>
          </div>
        ) : viewType === 'list' && !isMobile ? (
          // List view (desktop)
          <div className={`
            rounded-xl overflow-hidden
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
          `}>
            {/* Table header */}
            <div className={`
              grid grid-cols-5 gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wider
              ${isDark ? 'bg-white/5 text-[#8c8a7e]' : 'bg-[#f7f4f0] text-[#595755]'}
            `}>
              <div className="col-span-2">Dealer</div>
              <div className="text-right">Units</div>
              <div className="text-right">Value</div>
              <div className="text-right">Avg Price</div>
            </div>
            {/* Table rows */}
            {sortedDealers.map((dealer, i) => (
              <div
                key={dealer.dealer_group}
                onClick={() => {
                  setSelectedDealer({
                    id: dealer.dealer_group,
                    name: dealer.dealer_group,
                    dealerGroup: dealer.dealer_group,
                    state: dealer.state
                  })
                  setCurrentView('dealer-detail')
                }}
                className={`
                  grid grid-cols-5 gap-4 px-4 py-3 cursor-pointer transition-colors
                  ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#f7f4f0]'}
                  ${i < sortedDealers.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
                `}
              >
                <div className="col-span-2">
                  <p className={`font-medium truncate ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {dealer.dealer_group}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    {dealer.state || 'Multiple States'}
                  </p>
                </div>
                <div className={`text-right font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {dealer.total_units.toLocaleString()}
                </div>
                <div className={`text-right font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {formatCurrency(dealer.total_value)}
                </div>
                <div className={`text-right font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {formatCurrency(dealer.avg_price)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Grid view
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {sortedDealers.map((dealer) => (
              <DealerCard
                key={dealer.dealer_group}
                dealer={dealer}
                onClick={() => {
                  setSelectedDealer({
                    id: dealer.dealer_group,
                    name: dealer.dealer_group,
                    dealerGroup: dealer.dealer_group,
                    state: dealer.state
                  })
                  setCurrentView('dealer-detail')
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DealerDirectory
