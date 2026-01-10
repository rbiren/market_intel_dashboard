import { useState, useEffect, useCallback, useRef } from 'react'
import { CrossFilterProvider, useCrossFilter } from '../../context/CrossFilterContext'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { getRvTypeColor, CONDITION_COLORS, SEQUENTIAL_COLORS } from '../charts/chartColors'
import type { AggregationItem, AggregatedSummary } from '../../hooks/useOneLakeInventory'
import MobileGeoMap from '../charts/MobileGeoMap'

const API_BASE = 'http://localhost:8000'

interface InventoryItem {
  sale_price: number | null
  condition?: string | null
  rv_class?: string | null
  dealer_group?: string | null
  make?: string | null
  location?: string | null
}

interface AnalyticsTabMobileProps {
  summaryData: AggregatedSummary | null
  inventoryItems: InventoryItem[]
  loading: boolean
}

// Format helpers
function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

// Mobile-optimized Filter Banner
function MobileFilterBanner() {
  const { filter, clearFilter, isAnyFiltered } = useCrossFilter()

  if (!isAnyFiltered()) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-thor-slide-up">
      <div className="bg-gradient-to-r from-[var(--thor-sage)] to-[var(--thor-gold)] p-0.5 rounded-2xl shadow-xl">
        <div className="bg-[var(--thor-charcoal)] rounded-[14px] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--thor-sage)] to-[var(--thor-gold)] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[var(--thor-medium-gray)]">Filtered by</p>
              <p className="text-sm font-semibold text-white truncate">{filter.value}</p>
            </div>
          </div>
          <button
            onClick={clearFilter}
            className="ml-3 p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Mobile KPI Card
function MobileKPICard({ title, value, subtitle, icon, gradient }: {
  title: string
  value: string
  subtitle?: string
  icon: string
  gradient: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--thor-off-white)] p-4 shadow-sm border border-[var(--thor-border-gray)]">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--thor-medium-gray)] mb-0.5">{title}</p>
          <p className="text-xl font-bold text-[var(--thor-charcoal)] font-[var(--font-heading)] truncate">{value}</p>
          {subtitle && <p className="text-[10px] text-[var(--thor-warm-gray)] mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md flex-shrink-0 ml-2`}>
          <span className="text-lg">{icon}</span>
        </div>
      </div>
    </div>
  )
}

// Mobile Section Header with Expand/Collapse
function MobileSectionHeader({ title, icon, expanded, onToggle, count }: {
  title: string
  icon: string
  expanded: boolean
  onToggle: () => void
  count?: number
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 bg-[var(--thor-off-white)] rounded-2xl border border-[var(--thor-border-gray)] shadow-sm active:bg-[var(--thor-light-beige)] transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--thor-sage)] to-[var(--thor-sage-dark)] flex items-center justify-center shadow-sm">
          <span className="text-lg">{icon}</span>
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-[var(--thor-charcoal)] font-[var(--font-heading)]">{title}</h3>
          {count !== undefined && (
            <p className="text-xs text-[var(--thor-medium-gray)]">{count} items</p>
          )}
        </div>
      </div>
      <svg
        className={`w-5 h-5 text-[var(--thor-medium-gray)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

// Mobile Donut Chart
function MobileDonut({ data, dimension, onItemClick, activeFilter }: {
  data: AggregationItem[]
  dimension: string
  onItemClick: (item: AggregationItem) => void
  activeFilter: string | null
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0)

  const getColor = (name: string, index: number): string => {
    if (dimension === 'rv_type') return getRvTypeColor(name, index)
    if (dimension === 'condition') return CONDITION_COLORS[name] || SEQUENTIAL_COLORS[index]
    return SEQUENTIAL_COLORS[index % SEQUENTIAL_COLORS.length]
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data.slice(0, 6) as unknown as Record<string, unknown>[]}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            dataKey="count"
            animationDuration={400}
          >
            {data.slice(0, 6).map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getColor(entry.name, index)}
                opacity={activeFilter && activeFilter !== entry.name ? 0.3 : 1}
                stroke={activeFilter === entry.name ? '#1F2937' : 'white'}
                strokeWidth={activeFilter === entry.name ? 3 : 1}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Touch-friendly Legend */}
      <div className="grid grid-cols-2 gap-2">
        {data.slice(0, 6).map((item, index) => {
          const percent = ((item.count / total) * 100).toFixed(1)
          const isActive = activeFilter === item.name
          return (
            <button
              key={item.name}
              onClick={() => onItemClick(item)}
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all active:scale-[0.98] ${
                isActive
                  ? 'bg-[var(--thor-charcoal)] border-transparent'
                  : 'bg-[var(--thor-light-beige)] border-[var(--thor-border-gray)] hover:bg-[var(--thor-border-gray)]'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getColor(item.name, index) }}
              />
              <div className="min-w-0 flex-1 text-left">
                <p className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-[var(--thor-charcoal)]'}`}>
                  {item.name}
                </p>
                <p className={`text-[10px] ${isActive ? 'text-white/70' : 'text-[var(--thor-medium-gray)]'}`}>
                  {formatCompactNumber(item.count)} ({percent}%)
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Mobile Horizontal Bar Chart
function MobileBarChart({ data, onItemClick, activeFilter, maxItems = 5 }: {
  data: AggregationItem[]
  onItemClick: (item: AggregationItem) => void
  activeFilter: string | null
  maxItems?: number
}) {
  const displayData = data.slice(0, maxItems)
  const maxValue = Math.max(...displayData.map(d => d.count))

  return (
    <div className="space-y-2">
      {displayData.map((item) => {
        const isActive = activeFilter === item.name
        const percent = (item.count / maxValue) * 100
        return (
          <button
            key={item.name}
            onClick={() => onItemClick(item)}
            className={`w-full p-3 rounded-xl border transition-all active:scale-[0.99] ${
              isActive
                ? 'bg-[var(--thor-charcoal)] border-transparent'
                : 'bg-[var(--thor-light-beige)] border-[var(--thor-border-gray)]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-[var(--thor-charcoal)]'}`}>
                {item.name}
              </span>
              <span className={`text-sm font-bold tabular-nums ${isActive ? 'text-white' : 'text-[var(--thor-sage)]'}`}>
                {formatCompactNumber(item.count)}
              </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isActive ? 'bg-white/20' : 'bg-[var(--thor-border-gray)]'}`}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--thor-sage)] to-[var(--thor-gold)] transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Mobile Condition Cards
function MobileConditionCards({ data, onItemClick, activeFilter }: {
  data: AggregationItem[]
  onItemClick: (item: AggregationItem) => void
  activeFilter: string | null
}) {
  const newData = data.find(d => d.name === 'NEW')
  const usedData = data.find(d => d.name === 'USED')
  const total = (newData?.count || 0) + (usedData?.count || 0)

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => newData && onItemClick(newData)}
        className={`p-4 rounded-2xl border transition-all active:scale-[0.98] ${
          activeFilter === 'NEW'
            ? 'bg-[var(--thor-sage)] border-transparent'
            : 'bg-[var(--thor-light-beige)] border-[var(--thor-border-gray)]'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${activeFilter === 'NEW' ? 'bg-white' : 'bg-[var(--thor-sage)]'}`} />
          <span className={`text-xs font-bold uppercase tracking-wide ${activeFilter === 'NEW' ? 'text-white' : 'text-[var(--thor-sage)]'}`}>
            NEW
          </span>
        </div>
        <p className={`text-2xl font-bold font-[var(--font-heading)] ${activeFilter === 'NEW' ? 'text-white' : 'text-[var(--thor-charcoal)]'}`}>
          {formatCompactNumber(newData?.count || 0)}
        </p>
        <p className={`text-xs mt-1 ${activeFilter === 'NEW' ? 'text-white/70' : 'text-[var(--thor-medium-gray)]'}`}>
          {total > 0 ? ((newData?.count || 0) / total * 100).toFixed(0) : 0}% of inventory
        </p>
        <p className={`text-sm font-semibold mt-2 ${activeFilter === 'NEW' ? 'text-white' : 'text-[var(--thor-gold)]'}`}>
          {formatCurrency(newData?.avg_price || 0)} avg
        </p>
      </button>

      <button
        onClick={() => usedData && onItemClick(usedData)}
        className={`p-4 rounded-2xl border transition-all active:scale-[0.98] ${
          activeFilter === 'USED'
            ? 'bg-[var(--thor-gold)] border-transparent'
            : 'bg-[var(--thor-light-beige)] border-[var(--thor-border-gray)]'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${activeFilter === 'USED' ? 'bg-white' : 'bg-[var(--thor-gold)]'}`} />
          <span className={`text-xs font-bold uppercase tracking-wide ${activeFilter === 'USED' ? 'text-white' : 'text-[var(--thor-gold)]'}`}>
            USED
          </span>
        </div>
        <p className={`text-2xl font-bold font-[var(--font-heading)] ${activeFilter === 'USED' ? 'text-white' : 'text-[var(--thor-charcoal)]'}`}>
          {formatCompactNumber(usedData?.count || 0)}
        </p>
        <p className={`text-xs mt-1 ${activeFilter === 'USED' ? 'text-white/70' : 'text-[var(--thor-medium-gray)]'}`}>
          {total > 0 ? ((usedData?.count || 0) / total * 100).toFixed(0) : 0}% of inventory
        </p>
        <p className={`text-sm font-semibold mt-2 ${activeFilter === 'USED' ? 'text-white' : 'text-[var(--thor-gold)]'}`}>
          {formatCurrency(usedData?.avg_price || 0)} avg
        </p>
      </button>
    </div>
  )
}

// Mobile Price Stats Card
function MobilePriceStats({ data }: { data: AggregatedSummary }) {
  return (
    <div className="bg-gradient-to-br from-[var(--thor-charcoal)] to-[#2a2928] rounded-2xl p-4 text-white">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--thor-medium-gray)] mb-3">
        Price Analysis
      </h4>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-[var(--thor-medium-gray)]">Average</p>
          <p className="text-lg font-bold font-[var(--font-heading)] text-[var(--thor-gold)]">
            {formatCurrency(data.avg_price)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--thor-medium-gray)]">Minimum</p>
          <p className="text-lg font-bold font-[var(--font-heading)] text-[var(--thor-sage-light)]">
            {formatCurrency(data.min_price)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--thor-medium-gray)]">Maximum</p>
          <p className="text-lg font-bold font-[var(--font-heading)] text-[var(--thor-steel-blue)]">
            {formatCurrency(data.max_price)}
          </p>
        </div>
      </div>
    </div>
  )
}

// Bottom Navigation for Quick Section Access
function MobileBottomNav({ activeSection, onSectionChange }: {
  activeSection: string
  onSectionChange: (section: string) => void
}) {
  const sections = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'types', icon: '🚐', label: 'Types' },
    { id: 'condition', icon: '🏷️', label: 'Condition' },
    { id: 'dealers', icon: '🏢', label: 'Dealers' },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--thor-off-white)] border-t border-[var(--thor-border-gray)] px-2 py-1 z-40">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
              activeSection === section.id
                ? 'bg-[var(--thor-sage)]/10'
                : ''
            }`}
          >
            <span className="text-xl mb-0.5">{section.icon}</span>
            <span className={`text-[10px] font-semibold ${
              activeSection === section.id
                ? 'text-[var(--thor-sage)]'
                : 'text-[var(--thor-medium-gray)]'
            }`}>
              {section.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Loading Skeleton
function MobileLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-[var(--thor-light-beige)] rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-[var(--thor-light-beige)] rounded-2xl" />
      <div className="h-48 bg-[var(--thor-light-beige)] rounded-2xl" />
    </div>
  )
}

// Main Content Component
function AnalyticsMobileContent({ summaryData, loading: initialLoading }: AnalyticsTabMobileProps) {
  const { filter, setFilter, clearFilter, isAnyFiltered } = useCrossFilter()
  const [filteredSummary, setFilteredSummary] = useState<AggregatedSummary | null>(null)
  const [filterLoading, setFilterLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    types: true,
    condition: true,
    manufacturers: false,
    dealers: false,
    states: false,
    regions: false,
    cities: false,
  })

  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    types: useRef<HTMLDivElement>(null),
    condition: useRef<HTMLDivElement>(null),
    dealers: useRef<HTMLDivElement>(null),
  }

  // Fetch filtered data from API when cross-filter changes
  const fetchFilteredData = useCallback(async () => {
    if (!isAnyFiltered()) {
      setFilteredSummary(null)
      return
    }

    setFilterLoading(true)
    try {
      const params = new URLSearchParams()

      switch (filter.dimension) {
        case 'rv_type':
          params.append('rv_class', filter.value || '')
          break
        case 'condition':
          params.append('condition', filter.value || '')
          break
        case 'dealer_group':
          params.append('dealer_group', filter.value || '')
          break
        case 'manufacturer':
          params.append('manufacturer', filter.value || '')
          break
        case 'state':
          params.append('state', filter.value || '')
          break
      }

      const aggResponse = await fetch(`${API_BASE}/inventory/aggregated?${params}`)
      const aggData = await aggResponse.json()
      setFilteredSummary(aggData)
    } catch (error) {
      console.error('Error fetching filtered data:', error)
    } finally {
      setFilterLoading(false)
    }
  }, [filter.dimension, filter.value, isAnyFiltered])

  useEffect(() => {
    fetchFilteredData()
  }, [fetchFilteredData])

  const displayData = isAnyFiltered() && filteredSummary ? filteredSummary : summaryData
  const loading = initialLoading || filterLoading

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleItemClick = (dimension: string, item: AggregationItem) => {
    if (filter.dimension === dimension && filter.value === item.name) {
      clearFilter()
    } else {
      setFilter(dimension as 'rv_type' | 'condition' | 'state' | 'dealer_group' | 'manufacturer', item.name, 'mobile')
    }
  }

  const scrollToSection = (section: string) => {
    setActiveSection(section)
    const ref = sectionRefs[section as keyof typeof sectionRefs]
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (!summaryData && !loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--thor-sage)]/20 to-[var(--thor-gold)]/20 flex items-center justify-center">
            <span className="text-4xl">📊</span>
          </div>
          <h3 className="font-[var(--font-heading)] font-semibold text-[var(--thor-charcoal)] mb-1">No Data Available</h3>
          <p className="text-sm text-[var(--thor-medium-gray)]">Please wait for the data to load.</p>
        </div>
      </div>
    )
  }

  if (loading && !displayData) {
    return <MobileLoadingSkeleton />
  }

  const activeFilterValue = isAnyFiltered() ? filter.value : null

  return (
    <div className="pb-24 space-y-4">
      <MobileFilterBanner />

      {/* Overview Section */}
      <div ref={sectionRefs.overview} className="scroll-mt-4">
        {/* KPI Cards - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MobileKPICard
            title="Total Units"
            value={formatCompactNumber(displayData?.total_units || 0)}
            subtitle="In inventory"
            icon="📦"
            gradient="from-[var(--thor-sage)] to-[#3d4a2e]"
          />
          <MobileKPICard
            title="Total Value"
            value={formatCurrency(displayData?.total_value || 0)}
            subtitle="Market value"
            icon="💰"
            gradient="from-[var(--thor-gold)] to-[#8a5806]"
          />
          <MobileKPICard
            title="Avg Price"
            value={formatCurrency(displayData?.avg_price || 0)}
            subtitle="Per unit"
            icon="📊"
            gradient="from-[var(--thor-steel-blue)] to-[#4a6b7c]"
          />
          <MobileKPICard
            title="RV Types"
            value={(displayData?.by_rv_type?.length || 0).toString()}
            subtitle="Categories"
            icon="🚐"
            gradient="from-[var(--thor-charcoal)] to-[#2a2928]"
          />
        </div>

        {/* Price Stats */}
        {displayData && (
          <div className="mt-4">
            <MobilePriceStats data={displayData} />
          </div>
        )}

        {/* Interactive Geographic Map */}
        {displayData?.by_state && displayData.by_state.length > 0 && (
          <div className="mt-4">
            <MobileGeoMap
              stateData={displayData.by_state}
              regionData={displayData.by_region}
              onStateSelect={(state) => setFilter('state', state, 'mobileMap')}
              selectedState={filter.dimension === 'state' ? activeFilterValue : null}
            />
          </div>
        )}
      </div>

      {/* RV Types Section */}
      <div ref={sectionRefs.types} className="scroll-mt-4 space-y-3">
        <MobileSectionHeader
          title="Market Share by RV Type"
          icon="🥧"
          expanded={expandedSections.types}
          onToggle={() => toggleSection('types')}
          count={displayData?.by_rv_type?.length}
        />
        {expandedSections.types && displayData?.by_rv_type && (
          <div className="bg-[var(--thor-off-white)] rounded-2xl border border-[var(--thor-border-gray)] p-4">
            <MobileDonut
              data={displayData.by_rv_type}
              dimension="rv_type"
              onItemClick={(item) => handleItemClick('rv_type', item)}
              activeFilter={filter.dimension === 'rv_type' ? activeFilterValue : null}
            />
          </div>
        )}
      </div>

      {/* Condition Section */}
      <div ref={sectionRefs.condition} className="scroll-mt-4 space-y-3">
        <MobileSectionHeader
          title="Condition Analysis"
          icon="🏷️"
          expanded={expandedSections.condition}
          onToggle={() => toggleSection('condition')}
          count={2}
        />
        {expandedSections.condition && displayData?.by_condition && (
          <MobileConditionCards
            data={displayData.by_condition}
            onItemClick={(item) => handleItemClick('condition', item)}
            activeFilter={filter.dimension === 'condition' ? activeFilterValue : null}
          />
        )}
      </div>

      {/* Manufacturers Section */}
      <div className="scroll-mt-4 space-y-3">
        <MobileSectionHeader
          title="Top Manufacturers"
          icon="🏭"
          expanded={expandedSections.manufacturers}
          onToggle={() => toggleSection('manufacturers')}
          count={displayData?.by_manufacturer?.length}
        />
        {expandedSections.manufacturers && displayData?.by_manufacturer && (
          <div className="bg-[var(--thor-off-white)] rounded-2xl border border-[var(--thor-border-gray)] p-4">
            <MobileBarChart
              data={displayData.by_manufacturer}
                            onItemClick={(item) => handleItemClick('manufacturer', item)}
              activeFilter={filter.dimension === 'manufacturer' ? activeFilterValue : null}
              maxItems={6}
            />
          </div>
        )}
      </div>

      {/* Dealer Groups Section */}
      <div ref={sectionRefs.dealers} className="scroll-mt-4 space-y-3">
        <MobileSectionHeader
          title="Top Dealer Groups"
          icon="🏢"
          expanded={expandedSections.dealers}
          onToggle={() => toggleSection('dealers')}
          count={displayData?.by_dealer_group?.length}
        />
        {expandedSections.dealers && displayData?.by_dealer_group && (
          <div className="bg-[var(--thor-off-white)] rounded-2xl border border-[var(--thor-border-gray)] p-4">
            <MobileBarChart
              data={displayData.by_dealer_group}
                            onItemClick={(item) => handleItemClick('dealer_group', item)}
              activeFilter={filter.dimension === 'dealer_group' ? activeFilterValue : null}
              maxItems={6}
            />
          </div>
        )}
      </div>

      {/* States Section */}
      <div className="scroll-mt-4 space-y-3">
        <MobileSectionHeader
          title="Geographic Distribution"
          icon="📍"
          expanded={expandedSections.states}
          onToggle={() => toggleSection('states')}
          count={displayData?.by_state?.length}
        />
        {expandedSections.states && displayData?.by_state && (
          <div className="bg-[var(--thor-off-white)] rounded-2xl border border-[var(--thor-border-gray)] p-4">
            <MobileBarChart
              data={displayData.by_state}
                            onItemClick={(item) => handleItemClick('state', item)}
              activeFilter={filter.dimension === 'state' ? activeFilterValue : null}
              maxItems={8}
            />
          </div>
        )}
      </div>

      {/* Regions Section */}
      {displayData?.by_region && displayData.by_region.length > 0 && (
        <div className="scroll-mt-4 space-y-3">
          <MobileSectionHeader
            title="Regional Distribution"
            icon="🌍"
            expanded={expandedSections.regions}
            onToggle={() => toggleSection('regions')}
            count={displayData.by_region.length}
          />
          {expandedSections.regions && (
            <div className="bg-gradient-to-br from-[var(--thor-steel-blue)]/10 to-[var(--thor-sage)]/10 rounded-2xl border border-[var(--thor-border-gray)] p-4">
              <MobileBarChart
                data={displayData.by_region}
                onItemClick={(item) => handleItemClick('region', item)}
                activeFilter={filter.dimension === 'region' ? activeFilterValue : null}
                maxItems={10}
              />
            </div>
          )}
        </div>
      )}

      {/* Cities Section */}
      {displayData?.by_city && displayData.by_city.length > 0 && (
        <div className="scroll-mt-4 space-y-3">
          <MobileSectionHeader
            title="Top Cities"
            icon="🏙️"
            expanded={expandedSections.cities}
            onToggle={() => toggleSection('cities')}
            count={displayData.by_city.length}
          />
          {expandedSections.cities && (
            <div className="bg-gradient-to-br from-[var(--thor-gold)]/10 to-[var(--thor-sage)]/10 rounded-2xl border border-[var(--thor-border-gray)] p-4">
              <MobileBarChart
                data={displayData.by_city}
                onItemClick={(item) => handleItemClick('city', item)}
                activeFilter={filter.dimension === 'city' ? activeFilterValue : null}
                maxItems={12}
              />
            </div>
          )}
        </div>
      )}

      {/* Avg Price by Type - Always Visible */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--thor-gold)] to-[var(--thor-gold-dark)] flex items-center justify-center shadow-sm">
            <span className="text-base">💵</span>
          </div>
          <h3 className="font-semibold text-[var(--thor-charcoal)] font-[var(--font-heading)]">Avg Price by Type</h3>
        </div>
        {displayData?.by_rv_type && (
          <div className="bg-gradient-to-br from-[var(--thor-charcoal)] to-[#2a2928] rounded-2xl p-4">
            <div className="space-y-3">
              {displayData.by_rv_type.slice(0, 5).map((item) => {
                const maxPrice = Math.max(...displayData.by_rv_type.slice(0, 5).map(d => d.avg_price))
                const percent = (item.avg_price / maxPrice) * 100
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/80">{item.name}</span>
                      <span className="text-sm font-bold text-[var(--thor-gold)]">
                        {formatCurrency(item.avg_price)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--thor-sage)] via-[var(--thor-gold)] to-[var(--thor-steel-blue)]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNav
        activeSection={activeSection}
        onSectionChange={scrollToSection}
      />
    </div>
  )
}

export function AnalyticsTabMobile(props: AnalyticsTabMobileProps) {
  return (
    <CrossFilterProvider>
      <AnalyticsMobileContent {...props} />
    </CrossFilterProvider>
  )
}
