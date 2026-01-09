import { useState, useEffect, useCallback } from 'react'
import { CrossFilterProvider, useCrossFilter } from '../../context/CrossFilterContext'
import { ChartCard } from '../charts/ChartCard'
import { MarketShareDonut } from '../charts/MarketShareDonut'
import { TopBarChart } from '../charts/TopBarChart'
import { PriceDistributionChart } from '../charts/PriceDistributionChart'
import { StateTreemap } from '../charts/StateTreemap'
import { ConditionComparison } from '../charts/ConditionComparison'

const API_BASE = 'http://localhost:8000'

interface AggregationItem {
  name: string
  count: number
  total_value: number
  avg_price: number
  min_price?: number
  max_price?: number
}

interface AggregatedSummary {
  total_units: number
  total_value: number
  avg_price: number
  min_price: number
  max_price: number
  by_rv_type: AggregationItem[]
  by_dealer_group: AggregationItem[]
  by_manufacturer: AggregationItem[]
  by_condition: AggregationItem[]
  by_state: AggregationItem[]
}

interface InventoryItem {
  sale_price: number | null
  condition?: string | null
  rv_class?: string | null
  dealer_group?: string | null
  make?: string | null
  location?: string | null
}

interface AnalyticsTabProps {
  summaryData: AggregatedSummary | null
  inventoryItems: InventoryItem[]
  loading: boolean
}

function FilterBanner() {
  const { filter, clearFilter, isAnyFiltered } = useCrossFilter()

  if (!isAnyFiltered()) return null

  return (
    <div className="thor-filter-banner mb-6 animate-thor-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--thor-sage)] to-[var(--thor-gold)] flex items-center justify-center">
          <svg className="w-4 h-4 text-[var(--thor-off-white)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <div>
          <span className="thor-filter-banner-text">Active Filter:</span>
          <span className="badge-thor-filter ml-2">
            {filter.dimension}: {filter.value}
          </span>
        </div>
      </div>
      <button
        onClick={clearFilter}
        className="btn-thor-ghost text-sm flex items-center gap-1.5"
      >
        Clear Filter
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// Format large numbers with K/M suffix
function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`
  }
  return `$${value.toLocaleString()}`
}

interface KPICardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  accentColor: 'sage' | 'gold' | 'steel' | 'charcoal'
  loading?: boolean
}

function KPICard({ title, value, subtitle, icon, accentColor, loading }: KPICardProps) {
  const accentClasses = {
    sage: 'from-[var(--thor-sage)] to-[#3d4a2e]',
    gold: 'from-[var(--thor-gold)] to-[#8a5806]',
    steel: 'from-[var(--thor-steel-blue)] to-[#4a6b7c]',
    charcoal: 'from-[var(--thor-charcoal)] to-[#2a2928]',
  }

  return (
    <div className="card-thor p-5 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Accent gradient bar at top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentClasses[accentColor]}`} />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--thor-medium-gray)] mb-1">
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-24 bg-[var(--thor-border-gray)] rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-[var(--thor-charcoal)] font-[var(--font-heading)]">
              {value}
            </p>
          )}
          {subtitle && !loading && (
            <p className="text-xs text-[var(--thor-warm-gray)] mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${accentClasses[accentColor]} flex items-center justify-center text-[var(--thor-off-white)] shadow-md`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

interface KPICardsProps {
  data: AggregatedSummary | null
  loading: boolean
}

function KPICards({ data, loading }: KPICardsProps) {
  const newUnits = data?.by_condition?.find(c => c.name === 'NEW')?.count || 0
  const totalUnits = data?.total_units || 0
  const newPercent = totalUnits > 0 ? Math.round((newUnits / totalUnits) * 100) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KPICard
        title="Total Units"
        value={formatCompactNumber(data?.total_units || 0)}
        subtitle="In inventory"
        accentColor="sage"
        loading={loading}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
      />

      <KPICard
        title="Total Value"
        value={formatCurrency(data?.total_value || 0)}
        subtitle="Inventory worth"
        accentColor="gold"
        loading={loading}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      <KPICard
        title="Avg Price"
        value={formatCurrency(data?.avg_price || 0)}
        subtitle="Per unit"
        accentColor="steel"
        loading={loading}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        }
      />

      <div className="card-thor p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--thor-sage)] via-[var(--thor-gold)] to-[var(--thor-steel-blue)]" />
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--thor-medium-gray)] mb-1">
          Condition Split
        </p>
        {loading ? (
          <div className="h-8 w-full bg-[var(--thor-border-gray)] rounded animate-pulse" />
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-lg font-bold text-[var(--thor-sage)]">{newPercent}%</span>
              <span className="text-xs text-[var(--thor-medium-gray)]">NEW</span>
              <span className="text-[var(--thor-border-gray)]">|</span>
              <span className="text-lg font-bold text-[var(--thor-gold)]">{100 - newPercent}%</span>
              <span className="text-xs text-[var(--thor-medium-gray)]">USED</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--thor-light-beige)] overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-[var(--thor-sage)] to-[#5a6b45] transition-all duration-500"
                style={{ width: `${newPercent}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-[var(--thor-gold)] to-[#c4850d] transition-all duration-500"
                style={{ width: `${100 - newPercent}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AnalyticsContent({ summaryData, loading: initialLoading }: AnalyticsTabProps) {
  const { filter, clearFilter, isAnyFiltered } = useCrossFilter()
  const [filteredSummary, setFilteredSummary] = useState<AggregatedSummary | null>(null)
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([])
  const [filterLoading, setFilterLoading] = useState(false)

  // Fetch filtered data from API when cross-filter changes
  const fetchFilteredData = useCallback(async () => {
    if (!isAnyFiltered()) {
      setFilteredSummary(null)
      setFilteredInventory([])
      return
    }

    setFilterLoading(true)
    try {
      // Build query params based on filter dimension
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

      // Fetch filtered aggregations
      const aggResponse = await fetch(`${API_BASE}/inventory/aggregated?${params}`)
      const aggData = await aggResponse.json()
      setFilteredSummary(aggData)

      // Fetch filtered inventory for price distribution (with higher limit)
      params.append('limit', '5000')
      const invResponse = await fetch(`${API_BASE}/inventory?${params}`)
      const invData = await invResponse.json()
      setFilteredInventory(invData.items || [])
    } catch (error) {
      console.error('Error fetching filtered data:', error)
    } finally {
      setFilterLoading(false)
    }
  }, [filter.dimension, filter.value, isAnyFiltered])

  useEffect(() => {
    fetchFilteredData()
  }, [fetchFilteredData])

  // Use filtered data if available, otherwise use original
  const displayData = isAnyFiltered() && filteredSummary ? filteredSummary : summaryData
  const displayInventory = isAnyFiltered() ? filteredInventory : []
  const loading = initialLoading || filterLoading

  if (!summaryData && !loading) {
    return (
      <div className="card-thor p-12 text-center animate-thor-fade-in">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--thor-sage)]/20 to-[var(--thor-gold)]/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--thor-sage)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="font-[var(--font-heading)] font-semibold text-[var(--thor-charcoal)] mb-1">No Data Available</h3>
        <p className="text-sm text-[var(--thor-medium-gray)]">Please wait for the data to load.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FilterBanner />

      {/* KPI Summary Cards */}
      <KPICards data={displayData} loading={loading} />

      {/* Row 1: Market Share + Condition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Market Share by RV Type"
          subtitle="Click segments to filter"
          icon="🥧"
          loading={loading}
          hasActiveFilter={filter.dimension === 'rv_type'}
          onClearFilter={clearFilter}
        >
          {displayData?.by_rv_type && displayData.by_rv_type.length > 0 && (
            <MarketShareDonut
              data={displayData.by_rv_type}
              dimension="rv_type"
              dataKey="count"
            />
          )}
        </ChartCard>

        <ChartCard
          title="Condition Analysis"
          subtitle="NEW vs USED comparison"
          icon="🏷️"
          loading={loading}
          hasActiveFilter={filter.dimension === 'condition'}
          onClearFilter={clearFilter}
        >
          {displayData?.by_condition && displayData.by_condition.length > 0 && (
            <ConditionComparison byCondition={displayData.by_condition} />
          )}
        </ChartCard>
      </div>

      {/* Row 2: State + Manufacturers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Geographic Distribution"
          subtitle="Units by state"
          icon="🗺️"
          loading={loading}
          hasActiveFilter={filter.dimension === 'state'}
          onClearFilter={clearFilter}
        >
          {displayData?.by_state && displayData.by_state.length > 0 && (
            <StateTreemap data={displayData.by_state.slice(0, 15)} />
          )}
        </ChartCard>

        <ChartCard
          title="Top Manufacturers"
          subtitle="By unit count"
          icon="🏭"
          loading={loading}
          hasActiveFilter={filter.dimension === 'manufacturer'}
          onClearFilter={clearFilter}
        >
          {displayData?.by_manufacturer && displayData.by_manufacturer.length > 0 && (
            <TopBarChart
              data={displayData.by_manufacturer}
              dimension="manufacturer"
              dataKey="count"
              color="#577d91"
              maxItems={8}
            />
          )}
        </ChartCard>
      </div>

      {/* Row 3: Price Distribution + Dealer Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Price Distribution"
          subtitle="Stacked by condition"
          icon="💰"
          loading={loading}
        >
          <PriceDistributionChart
            data={displayInventory.length > 0 ? displayInventory : []}
            avgPrice={displayData?.avg_price}
            binCount={12}
          />
        </ChartCard>

        <ChartCard
          title="Top Dealer Groups"
          subtitle="By unit count"
          icon="🏢"
          loading={loading}
          hasActiveFilter={filter.dimension === 'dealer_group'}
          onClearFilter={clearFilter}
        >
          {displayData?.by_dealer_group && displayData.by_dealer_group.length > 0 && (
            <TopBarChart
              data={displayData.by_dealer_group}
              dimension="dealer_group"
              dataKey="count"
              color="#495737"
              maxItems={8}
            />
          )}
        </ChartCard>
      </div>

      {/* Row 4: Avg Price by RV Type (full width) */}
      <ChartCard
        title="Average Price by RV Type"
        subtitle="Compare pricing across categories"
        icon="📊"
        loading={loading}
        className="col-span-full"
      >
        {displayData?.by_rv_type && displayData.by_rv_type.length > 0 && (
          <TopBarChart
            data={displayData.by_rv_type}
            dimension="rv_type"
            dataKey="avg_price"
            color="#a46807"
            maxItems={10}
            layout="vertical"
          />
        )}
      </ChartCard>
    </div>
  )
}

export function AnalyticsTab(props: AnalyticsTabProps) {
  return (
    <CrossFilterProvider>
      <AnalyticsContent {...props} />
    </CrossFilterProvider>
  )
}
