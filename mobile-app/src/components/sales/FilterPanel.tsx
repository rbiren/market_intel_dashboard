/**
 * Filter Panel Component
 *
 * Comprehensive filtering for the Sales Platform
 * Supports both slide-out panel (mobile) and inline (desktop) modes
 */

import { useSalesContext } from '../../context/SalesContext'
import type { SalesFilters } from '../../context/SalesContext'
import { useFilterOptions, useSalesDateRange } from '../../hooks/useSalesData'

interface FilterPanelProps {
  mode?: 'panel' | 'inline'
  onClose?: () => void
}

export function FilterPanel({ mode = 'inline', onClose }: FilterPanelProps) {
  const { theme, filters, updateFilter, clearFilters, activeFilterCount } = useSalesContext()
  const { data: filterOptions, loading } = useFilterOptions()
  const { data: dateRange } = useSalesDateRange()
  const isDark = theme === 'dark'

  const selectClasses = `
    w-full px-3 py-2 rounded-lg border transition-all duration-200
    ${isDark
      ? 'bg-[#2a2928] border-white/10 text-[#fffdfa] focus:border-[#495737] focus:ring-1 focus:ring-[#495737]/50'
      : 'bg-white border-[#d9d6cf] text-[#181817] focus:border-[#495737] focus:ring-1 focus:ring-[#495737]/30'
    }
    text-sm focus:outline-none
  `

  const labelClasses = `
    block text-xs font-semibold uppercase tracking-wider mb-1.5
    ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}
  `

  const FilterSelect = ({
    label,
    filterKey,
    options,
    placeholder
  }: {
    label: string
    filterKey: keyof SalesFilters
    options: string[]
    placeholder: string
  }) => (
    <div>
      <label className={labelClasses}>{label}</label>
      <select
        value={(filters[filterKey] as string) || ''}
        onChange={(e) => updateFilter(filterKey, e.target.value || undefined)}
        className={selectClasses}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )

  const content = (
    <div className="space-y-4">
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-[#495737] text-white">
              {activeFilterCount}
            </span>
          )}
        </h3>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className={`text-sm font-medium transition-colors ${isDark ? 'text-[#a46807] hover:text-[#c4850d]' : 'text-[#a46807] hover:text-[#8a5806]'}`}
          >
            Clear All
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className={`h-3 w-20 rounded mb-2 ${isDark ? 'bg-white/10' : 'bg-[#d9d6cf]'}`} />
              <div className={`h-10 rounded-lg ${isDark ? 'bg-white/10' : 'bg-[#d9d6cf]'}`} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Search */}
          <div>
            <label className={labelClasses}>Search</label>
            <div className="relative">
              <svg
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}
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
                className={`${selectClasses} pl-10`}
              />
            </div>
          </div>

          {/* Region */}
          <FilterSelect
            label="Region"
            filterKey="region"
            options={filterOptions?.regions || ['SOUTHEAST', 'NORTHEAST', 'SOUTHWEST', 'NORTHWEST', 'MIDWEST', 'CANADA']}
            placeholder="All Regions"
          />

          {/* State */}
          <FilterSelect
            label="State"
            filterKey="state"
            options={filterOptions?.states || []}
            placeholder="All States"
          />

          {/* RV Type */}
          <FilterSelect
            label="RV Type"
            filterKey="rvType"
            options={filterOptions?.rv_types || []}
            placeholder="All Types"
          />

          {/* Condition */}
          <FilterSelect
            label="Condition"
            filterKey="condition"
            options={filterOptions?.conditions || ['NEW', 'USED']}
            placeholder="All Conditions"
          />

          {/* Dealer Group */}
          <FilterSelect
            label="Dealer Group"
            filterKey="dealerGroup"
            options={(filterOptions?.dealer_groups || []).slice(0, 50)}
            placeholder="All Dealer Groups"
          />

          {/* Manufacturer */}
          <FilterSelect
            label="Manufacturer"
            filterKey="manufacturer"
            options={(filterOptions?.manufacturers || []).slice(0, 50)}
            placeholder="All Manufacturers"
          />

          {/* Price Range */}
          <div>
            <label className={labelClasses}>Price Range</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice || ''}
                onChange={(e) => updateFilter('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                className={selectClasses}
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || ''}
                onChange={(e) => updateFilter('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                className={selectClasses}
              />
            </div>
          </div>

          {/* Sales Date Range */}
          <div>
            <label className={labelClasses}>Sales Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="date"
                  placeholder="Start"
                  value={filters.startDate || ''}
                  min={dateRange?.min_date || undefined}
                  max={filters.endDate || dateRange?.max_date || undefined}
                  onChange={(e) => updateFilter('startDate', e.target.value || undefined)}
                  className={selectClasses}
                />
              </div>
              <div>
                <input
                  type="date"
                  placeholder="End"
                  value={filters.endDate || ''}
                  min={filters.startDate || dateRange?.min_date || undefined}
                  max={dateRange?.max_date || undefined}
                  onChange={(e) => updateFilter('endDate', e.target.value || undefined)}
                  className={selectClasses}
                />
              </div>
            </div>
            {dateRange?.min_date && dateRange?.max_date && (
              <p className={`text-xs mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                Data available: {dateRange.min_date} to {dateRange.max_date}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )

  // Panel mode (mobile slide-out)
  if (mode === 'panel') {
    return (
      <div className={`
        fixed inset-y-0 right-0 w-80 max-w-full z-50
        transform transition-transform duration-300 ease-out
        ${isDark ? 'bg-[#181817] border-l border-white/10' : 'bg-[#fffdfa] border-l border-[#d9d6cf]'}
        shadow-2xl
      `}>
        {/* Panel Header */}
        <div className={`
          flex items-center justify-between p-4 border-b
          ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}
        `}>
          <h2 className={`text-lg font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Filters
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f7f4f0]'}`}
          >
            <svg className={`w-5 h-5 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Panel Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-130px)]">
          {content}
        </div>

        {/* Panel Footer */}
        <div className={`
          absolute bottom-0 left-0 right-0 p-4 border-t
          ${isDark ? 'border-white/10 bg-[#181817]' : 'border-[#d9d6cf] bg-[#fffdfa]'}
        `}>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-[#495737] text-white font-semibold hover:bg-[#3d4a2e] transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    )
  }

  // Inline mode (desktop sidebar)
  return (
    <div className={`
      p-4 rounded-xl
      ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
    `}>
      {content}
    </div>
  )
}

export default FilterPanel
