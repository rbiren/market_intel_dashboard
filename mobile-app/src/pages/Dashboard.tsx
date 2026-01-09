import { useState, useMemo } from 'react'
import { useOneLakeInventory, useOneLakeDealers, useFilterOptions, useAggregatedSummary } from '../hooks/useOneLakeInventory'
import { AnalyticsTab } from '../components/analytics/AnalyticsTab'
import { AnalyticsTabV2 } from '../components/analytics/AnalyticsTabV2'
import { AnalyticsTabV3 } from '../components/analytics/AnalyticsTabV3'
import { AnalyticsTabMobile } from '../components/analytics/AnalyticsTabMobile'
import { AnalyticsTabD } from '../components/analytics/AnalyticsTabD'
import { AnalyticsTabE } from '../components/analytics/AnalyticsTabE'
import { AnalyticsTabF } from '../components/analytics/AnalyticsTabF'
import { AnalyticsTabG } from '../components/analytics/AnalyticsTabG'
import { AnalyticsTabH } from '../components/analytics/AnalyticsTabH'
import { AnalyticsTabI } from '../components/analytics/AnalyticsTabI'
import { AnalyticsTabJ } from '../components/analytics/AnalyticsTabJ'

// Define types locally to avoid import issues
interface AggregationItem {
  name: string
  count: number
  total_value: number
  avg_price: number
  min_price: number
  max_price: number
  avg_days_on_lot?: number
}

interface InventoryItem {
  stock_number: string | null
  title: string | null
  year: string | null
  make: string | null
  model: string | null
  floorplan: string | null
  rv_class: string | null
  condition: string | null
  sale_price: number | null
  msrp: number | null
  location: string | null
  dealer_source: string | null
  dealer_group: string | null
  first_image: string | null
  sleeps: string | null
  length: string | null
  weight: string | null
  vin: string | null
  days_on_lot: number | null
}

type TabType = 'summary' | 'inventory' | 'analytics'

// Preset filters - increased limit for more data
const PRESET_FILTERS = {
  rv_class: '',
  state: '',
  limit: 500
}

function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'N/A'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price)
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

function formatCompactNumber(num: number): string {
  if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`
  return `$${num.toFixed(0)}`
}

// KPI Card Component - Thor Premium
function KPICard({ title, value, subtitle, icon, variant = 'sage' }: {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  variant?: 'sage' | 'gold' | 'steel'
}) {
  const gradients = {
    sage: 'from-[var(--thor-sage)] to-[var(--thor-sage-dark)]',
    gold: 'from-[var(--thor-gold)] to-[var(--thor-gold-dark)]',
    steel: 'from-[var(--thor-steel-blue)] to-[var(--thor-steel-dark)]',
  }

  const glows = {
    sage: 'shadow-[0_4px_14px_rgba(73,87,55,0.2)]',
    gold: 'shadow-[0_4px_14px_rgba(164,104,7,0.2)]',
    steel: 'shadow-[0_4px_14px_rgba(87,125,145,0.2)]',
  }

  return (
    <div className="card-thor-kpi p-5 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="thor-label mb-1">{title}</p>
          <p className="text-2xl font-extrabold text-[var(--thor-charcoal)] font-[var(--font-heading)] tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-[var(--thor-warm-gray)]">{subtitle}</p>}
        </div>
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[variant]} flex items-center justify-center ${glows[variant]} group-hover:scale-110 transition-transform duration-300`}>
          <span className="text-xl filter drop-shadow-sm">{icon}</span>
        </div>
      </div>
    </div>
  )
}

// Summary Table Component - Thor Premium
function SummaryTable({ title, data, icon }: {
  title: string
  data: AggregationItem[]
  icon: string
}) {
  const [showAll, setShowAll] = useState(false)
  const displayData = showAll ? data : data.slice(0, 10)

  return (
    <div className="card-thor-accent overflow-hidden animate-thor-fade-in">
      <div className="px-5 py-4 border-b border-[var(--thor-border-gray)] flex items-center justify-between bg-gradient-to-r from-[var(--thor-off-white)] to-[var(--thor-light-beige)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--thor-sage)] to-[var(--thor-sage-dark)] flex items-center justify-center shadow-sm">
            <span className="text-base filter drop-shadow-sm">{icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--thor-charcoal)] font-[var(--font-heading)]">{title}</h3>
            <span className="text-xs text-[var(--thor-medium-gray)]">{data.length} items</span>
          </div>
        </div>
        {data.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="btn-thor-ghost text-xs"
          >
            {showAll ? 'Show less' : `Show all ${data.length}`}
          </button>
        )}
      </div>
      <div className="overflow-x-auto thor-scrollbar">
        <table className="thor-table">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-right">Units</th>
              <th className="text-right">Total Value</th>
              <th className="text-right">Avg Price</th>
              <th className="text-right">Min</th>
              <th className="text-right">Max</th>
              {data[0]?.avg_days_on_lot !== undefined && (
                <th className="text-right">Avg Days</th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayData.map((item) => (
              <tr key={item.name}>
                <td className="font-medium whitespace-nowrap">{item.name}</td>
                <td className="text-right tabular-nums">{formatNumber(item.count)}</td>
                <td className="text-right tabular-nums text-[var(--thor-gold)]">{formatCompactNumber(item.total_value)}</td>
                <td className="text-right tabular-nums font-semibold">{formatPrice(item.avg_price)}</td>
                <td className="text-right tabular-nums text-[var(--thor-medium-gray)]">{formatPrice(item.min_price)}</td>
                <td className="text-right tabular-nums text-[var(--thor-medium-gray)]">{formatPrice(item.max_price)}</td>
                {item.avg_days_on_lot != null && (
                  <td className="text-right tabular-nums">{item.avg_days_on_lot.toFixed(0)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Inventory Card Component - Thor Industries branded
function InventoryCard({ item }: { item: InventoryItem }) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="card-thor overflow-hidden hover:shadow-lg transition-all duration-200 group">
      {/* Image */}
      <div className="relative h-40 bg-[var(--thor-light-beige)] overflow-hidden rounded-t-[var(--radius-lg)]">
        {item.first_image && !imageError ? (
          <img
            src={item.first_image}
            alt={item.title || 'RV'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--thor-medium-gray)]">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Condition Badge - Thor branded */}
        {item.condition && (
          <span className={item.condition === 'NEW' ? 'badge-thor-new absolute top-2 left-2' : 'badge-thor-used absolute top-2 left-2'}>
            {item.condition}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-[var(--thor-charcoal)] text-sm line-clamp-1 font-[var(--font-heading)]">
          {item.year} {item.make} {item.model}
        </h3>
        <p className="text-xs text-[var(--thor-medium-gray)] mt-0.5 line-clamp-1">
          {item.rv_class} {item.floorplan && `| ${item.floorplan}`}
        </p>

        {/* Price - Thor gold accent */}
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-lg font-bold text-[var(--thor-gold)] font-[var(--font-heading)]">
            {formatPrice(item.sale_price)}
          </span>
          {item.days_on_lot && (
            <span className="text-xs text-[var(--thor-medium-gray)]">
              {item.days_on_lot} days
            </span>
          )}
        </div>

        {/* Location & Dealer Group */}
        <div className="mt-3 pt-3 border-t border-[var(--thor-border-gray)]">
          <div className="flex items-center justify-between text-xs text-[var(--thor-warm-gray)]">
            <span className="truncate flex-1">{item.location || 'Location N/A'}</span>
          </div>
          {item.dealer_group && (
            <p className="text-xs text-[var(--thor-medium-gray)] mt-1 truncate">{item.dealer_group}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Tab Button Component - Thor Industries branded
function TabButton({ active, onClick, children, icon }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 font-[var(--font-heading)] ${
        active
          ? 'bg-[var(--thor-sage)] text-[var(--thor-off-white)]'
          : 'text-[var(--thor-warm-gray)] hover:text-[var(--thor-charcoal)] hover:bg-[var(--thor-light-beige)]'
      }`}
    >
      <span>{icon}</span>
      {children}
    </button>
  )
}

export default function Dashboard() {
  useOneLakeDealers() // Preload dealers data
  const { filters: filterOptions, loading: filtersLoading } = useFilterOptions()
  const [activeTab, setActiveTab] = useState<TabType>('summary')
  const [showFilters, setShowFilters] = useState(true)
  const [analyticsVersion, setAnalyticsVersion] = useState<'A' | 'B' | 'C' | 'M' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'>('C') // A/B/C/M/D/E/F/G/H/I/J testing toggle

  // Filter state
  const [rvClass, setRvClass] = useState(PRESET_FILTERS.rv_class)
  const [state, setState] = useState('')
  const [dealerGroup, setDealerGroup] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [condition, setCondition] = useState<string>('')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')

  // Aggregated Summary data (for Summary tab)
  const { data: summaryData, loading: summaryLoading, error: summaryError, refetch: refetchSummary } = useAggregatedSummary({
    rv_class: rvClass || undefined,
    dealer_group: dealerGroup || undefined,
    manufacturer: manufacturer || undefined,
    condition: condition || undefined,
    state: state || undefined,
    min_price: minPrice ? parseFloat(minPrice) : undefined,
    max_price: maxPrice ? parseFloat(maxPrice) : undefined,
  })

  // Inventory data (for Inventory tab)
  const { data: inventoryData, loading: inventoryLoading, error: inventoryError, refetch: refetchInventory } = useOneLakeInventory({
    rv_class: rvClass || undefined,
    dealer_group: dealerGroup || undefined,
    manufacturer: manufacturer || undefined,
    state: state || undefined,
    condition: condition || undefined,
    min_price: minPrice ? parseFloat(minPrice) : undefined,
    max_price: maxPrice ? parseFloat(maxPrice) : undefined,
    limit: PRESET_FILTERS.limit
  })

  const loading = activeTab === 'summary' ? summaryLoading : inventoryLoading
  const error = activeTab === 'summary' ? summaryError : inventoryError

  const handleRefresh = () => {
    if (activeTab === 'summary') {
      refetchSummary()
    } else {
      refetchInventory()
    }
  }

  const resetFilters = () => {
    setRvClass(PRESET_FILTERS.rv_class)
    setState('')
    setDealerGroup('')
    setManufacturer('')
    setCondition('')
    setMinPrice('')
    setMaxPrice('')
  }

  // Calculate stats from inventory for the inventory tab
  const inventoryStats = useMemo(() => {
    if (!inventoryData?.items) return { avgPrice: 0, totalValue: 0, newCount: 0, usedCount: 0 }

    const prices = inventoryData.items.filter(i => i.sale_price).map(i => i.sale_price!)
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
    const totalValue = prices.reduce((a, b) => a + b, 0)
    const newCount = inventoryData.items.filter(i => i.condition === 'NEW').length
    const usedCount = inventoryData.items.filter(i => i.condition === 'USED').length

    return { avgPrice, totalValue, newCount, usedCount }
  }, [inventoryData])

  // Active filter pills
  const activeFilters = [
    { key: 'rvClass', value: rvClass, label: rvClass, color: 'blue', clear: () => setRvClass('') },
    { key: 'state', value: state, label: state, color: 'green', clear: () => setState('') },
    { key: 'dealerGroup', value: dealerGroup, label: dealerGroup, color: 'purple', clear: () => setDealerGroup('') },
    { key: 'manufacturer', value: manufacturer, label: manufacturer, color: 'orange', clear: () => setManufacturer('') },
    { key: 'condition', value: condition, label: condition, color: 'amber', clear: () => setCondition('') },
  ].filter(f => f.value)

  return (
    <div className="min-h-screen bg-[var(--thor-light-beige)]">
      {/* Header - Thor Industries Premium */}
      <header className="thor-header">
        {/* Animated gradient accent line at top */}
        <div className="thor-accent-line-animated w-full"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 py-3">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              {/* Thor Logo Mark */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--thor-sage)] via-[var(--thor-gold)] to-[var(--thor-steel-blue)] p-0.5 shadow-lg">
                <div className="w-full h-full rounded-[10px] bg-[var(--thor-off-white)] flex items-center justify-center">
                  <svg className="w-7 h-7 text-[var(--thor-sage)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[var(--thor-charcoal)] font-[var(--font-heading)] tracking-tight flex items-center gap-2">
                  RV Market Intelligence
                  <span className="badge-thor-info">LIVE</span>
                </h1>
                <p className="text-xs text-[var(--thor-medium-gray)] font-medium">
                  Powered by <span className="text-[var(--thor-sage)] font-semibold">Thor Industries</span> Analytics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Tab Buttons */}
              <div className="flex gap-1 bg-[var(--thor-light-beige)] p-1 rounded-lg">
                <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon="📊">
                  Summary
                </TabButton>
                <TabButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon="📦">
                  Inventory
                </TabButton>
                <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon="📈">
                  Analytics
                </TabButton>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 font-[var(--font-heading)] font-semibold ${
                  showFilters ? 'bg-[var(--thor-sage)]/10 text-[var(--thor-sage)]' : 'text-[var(--thor-warm-gray)] hover:text-[var(--thor-charcoal)] hover:bg-[var(--thor-light-beige)]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="btn-thor-sage px-4 py-2 text-sm rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Panel - Thor Premium */}
        {showFilters && (
          <div className="thor-filter-panel mb-6 animate-thor-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--thor-sage)] to-[var(--thor-sage-dark)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--thor-off-white)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-[var(--thor-charcoal)] font-[var(--font-heading)]">Filter Options</h3>
              </div>
              <button
                onClick={resetFilters}
                className="btn-thor-ghost text-xs"
              >
                Reset all
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
              <div>
                <label className="thor-filter-label">RV Type</label>
                <select
                  value={rvClass}
                  onChange={(e) => setRvClass(e.target.value)}
                  disabled={filtersLoading}
                  className="select-thor w-full disabled:opacity-50"
                >
                  <option value="">All Types</option>
                  {filterOptions?.rv_types.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="thor-filter-label">Dealer Group</label>
                <select
                  value={dealerGroup}
                  onChange={(e) => setDealerGroup(e.target.value)}
                  disabled={filtersLoading}
                  className="select-thor w-full disabled:opacity-50"
                >
                  <option value="">All Groups</option>
                  {filterOptions?.dealer_groups?.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="thor-filter-label">Manufacturer</label>
                <select
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  disabled={filtersLoading}
                  className="select-thor w-full disabled:opacity-50"
                >
                  <option value="">All Brands</option>
                  {filterOptions?.manufacturers?.map(mfr => (
                    <option key={mfr} value={mfr}>{mfr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="thor-filter-label">State</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={filtersLoading}
                  className="select-thor w-full disabled:opacity-50"
                >
                  <option value="">All States</option>
                  {filterOptions?.states.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="thor-filter-label">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  disabled={filtersLoading}
                  className="select-thor w-full disabled:opacity-50"
                >
                  <option value="">All</option>
                  {filterOptions?.conditions.map(cond => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="thor-filter-label">Min Price</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="$0"
                  className="input-thor w-full"
                />
              </div>
              <div>
                <label className="thor-filter-label">Max Price</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="No limit"
                  className="input-thor w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Filters - Thor Premium */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 animate-thor-fade-in">
            <span className="thor-label">Active filters:</span>
            {activeFilters.map(filter => (
              <span key={filter.key} className="badge-thor-filter">
                {filter.label}
                <button onClick={filter.clear} className="hover:text-[var(--thor-charcoal)] transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Error State - Thor branded */}
        {error && (
          <div className="bg-[#8b4049]/10 border border-[#8b4049]/30 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#8b4049] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-[#8b4049] font-[var(--font-heading)]">Connection Error</h3>
                <p className="text-xs text-[#8b4049]/80 mt-1">{error}</p>
                <p className="text-xs text-[var(--thor-warm-gray)] mt-2">
                  Make sure the API server is running: <code className="bg-[#8b4049]/10 px-1 rounded text-[#8b4049]">cd api && uvicorn main:app --reload --port 8000</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Tab Content */}
        {activeTab === 'summary' && (
          <>
            {/* KPI Cards - Staggered Animation */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 animate-thor-stagger">
              <KPICard
                title="Total Units"
                value={summaryLoading ? '...' : formatNumber(summaryData?.total_units || 0)}
                subtitle="All inventory"
                icon="📦"
                variant="sage"
              />
              <KPICard
                title="Total Value"
                value={summaryLoading ? '...' : formatCompactNumber(summaryData?.total_value || 0)}
                subtitle="Market inventory"
                icon="💰"
                variant="gold"
              />
              <KPICard
                title="Avg Price"
                value={summaryLoading ? '...' : formatPrice(summaryData?.avg_price)}
                subtitle="Per unit"
                icon="📊"
                variant="steel"
              />
              <KPICard
                title="Min Price"
                value={summaryLoading ? '...' : formatPrice(summaryData?.min_price)}
                subtitle="Lowest"
                icon="⬇️"
                variant="sage"
              />
              <KPICard
                title="Max Price"
                value={summaryLoading ? '...' : formatPrice(summaryData?.max_price)}
                subtitle="Highest"
                icon="⬆️"
                variant="gold"
              />
            </div>

            {/* Summary Tables */}
            {summaryLoading ? (
              <div className="grid gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="card-thor p-4 animate-pulse">
                    <div className="h-6 bg-[var(--thor-light-beige)] rounded w-1/4 mb-4" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map(j => (
                        <div key={j} className="h-8 bg-[var(--thor-light-beige)] rounded" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : summaryData && (
              <div className="grid gap-6">
                <SummaryTable
                  title="By RV Type"
                  data={summaryData.by_rv_type}
                  icon="🚐"
                />
                <SummaryTable
                  title="By Dealer Group"
                  data={summaryData.by_dealer_group}
                  icon="🏢"
                />
                <SummaryTable
                  title="By Manufacturer"
                  data={summaryData.by_manufacturer}
                  icon="🏭"
                />
                <div className="grid md:grid-cols-2 gap-6">
                  <SummaryTable
                    title="By Condition"
                    data={summaryData.by_condition}
                    icon="✨"
                  />
                  <SummaryTable
                    title="By State"
                    data={summaryData.by_state}
                    icon="📍"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Inventory Tab Content */}
        {activeTab === 'inventory' && (
          <>
            {/* KPI Cards for Inventory - Staggered Animation */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-thor-stagger">
              <KPICard
                title="Total Units"
                value={inventoryLoading ? '...' : formatNumber(inventoryData?.total || 0)}
                subtitle={`Showing up to ${PRESET_FILTERS.limit}`}
                icon="🚐"
                variant="sage"
              />
              <KPICard
                title="Avg Price"
                value={inventoryLoading ? '...' : formatPrice(inventoryStats.avgPrice)}
                subtitle="All RV Types"
                icon="💰"
                variant="gold"
              />
              <KPICard
                title="New Units"
                value={inventoryLoading ? '...' : formatNumber(inventoryStats.newCount)}
                subtitle={`${inventoryData?.total ? Math.round((inventoryStats.newCount / inventoryData.total) * 100) : 0}% of inventory`}
                icon="✨"
                variant="steel"
              />
              <KPICard
                title="Total Value"
                value={inventoryLoading ? '...' : formatCompactNumber(inventoryStats.totalValue)}
                subtitle="Market inventory"
                icon="📊"
                variant="gold"
              />
            </div>

            {/* Inventory Grid */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--thor-charcoal)] font-[var(--font-heading)]">
                  Inventory
                  {inventoryData && !inventoryLoading && (
                    <span className="text-sm font-normal text-[var(--thor-medium-gray)] ml-2">
                      ({inventoryData.total} units)
                    </span>
                  )}
                </h2>
                {inventoryData && (
                  <span className="text-xs text-[var(--thor-medium-gray)]">
                    Data from {inventoryData.dealers_queried} dealer{inventoryData.dealers_queried !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {inventoryLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="card-thor overflow-hidden animate-pulse">
                      <div className="h-40 bg-[var(--thor-light-beige)]" />
                      <div className="p-4">
                        <div className="h-4 bg-[var(--thor-light-beige)] rounded w-3/4 mb-2" />
                        <div className="h-3 bg-[var(--thor-light-beige)] rounded w-1/2 mb-4" />
                        <div className="h-6 bg-[var(--thor-light-beige)] rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : inventoryData?.items && inventoryData.items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {inventoryData.items.map((item, index) => (
                    <InventoryCard key={item.stock_number || index} item={item} />
                  ))}
                </div>
              ) : (
                <div className="card-thor p-12 text-center">
                  <svg className="w-12 h-12 mx-auto text-[var(--thor-medium-gray)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-[var(--thor-charcoal)] font-semibold mb-1 font-[var(--font-heading)]">No inventory found</h3>
                  <p className="text-sm text-[var(--thor-medium-gray)]">Try adjusting your filters.</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'analytics' && (
          <div>
            {/* Library Version Toggle - Thor branded */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[var(--thor-warm-gray)] font-[var(--font-heading)]">Visualization Library:</span>
                <span className="text-xs text-[var(--thor-medium-gray)] bg-[var(--thor-sage)]/10 px-2 py-1 rounded font-semibold">
                  11 Libraries
                </span>
              </div>
              <div className="flex flex-wrap gap-2 bg-[var(--thor-light-beige)] p-2 rounded-xl">
                <button
                  onClick={() => setAnalyticsVersion('A')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all font-[var(--font-heading)] ${
                    analyticsVersion === 'A'
                      ? 'bg-[var(--thor-off-white)] text-[var(--thor-sage)] shadow-sm'
                      : 'text-[var(--thor-medium-gray)] hover:text-[var(--thor-charcoal)] hover:bg-white/50'
                  }`}
                >
                  A <span className="opacity-70">Recharts</span>
                </button>
                <button
                  onClick={() => setAnalyticsVersion('B')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all font-[var(--font-heading)] ${
                    analyticsVersion === 'B'
                      ? 'bg-[var(--thor-off-white)] text-[var(--thor-steel-blue)] shadow-sm'
                      : 'text-[var(--thor-medium-gray)] hover:text-[var(--thor-charcoal)] hover:bg-white/50'
                  }`}
                >
                  B <span className="opacity-70">Tremor</span>
                </button>
                <button
                  onClick={() => setAnalyticsVersion('C')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all font-[var(--font-heading)] ${
                    analyticsVersion === 'C'
                      ? 'bg-gradient-to-r from-[var(--thor-sage)] to-[var(--thor-gold)] text-[var(--thor-off-white)] shadow-sm'
                      : 'text-[var(--thor-medium-gray)] hover:text-[var(--thor-charcoal)] hover:bg-white/50'
                  }`}
                >
                  C <span className="opacity-75">ECharts</span>
                </button>
                <button
                  onClick={() => setAnalyticsVersion('M')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all font-[var(--font-heading)] ${
                    analyticsVersion === 'M'
                      ? 'bg-gradient-to-r from-[var(--thor-steel-blue)] to-[var(--thor-sage)] text-[var(--thor-off-white)] shadow-sm'
                      : 'text-[var(--thor-medium-gray)] hover:text-[var(--thor-charcoal)] hover:bg-white/50'
                  }`}
                >
                  M <span className="opacity-75">Mobile</span>
                </button>
                <div className="w-px h-6 bg-[var(--thor-border-gray)] mx-1 self-center" />
                <button
                  onClick={() => setAnalyticsVersion('D')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all font-[var(--font-heading)] ${
                    analyticsVersion === 'D'
                      ? 'bg-[var(--thor-off-white)] text-[var(--thor-sage)] shadow-sm'
                      : 'text-[var(--thor-medium-gray)] hover:text-[var(--thor-charcoal)] hover:bg-white/50'
                  }`}
                >
                  D <span className="opacity-70">Visx</span>
                </button>
                <button
                  onClick={() => setAnalyticsVersion('E')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all font-[var(--font-heading)] ${
                    analyticsVersion === 'E'
                      ? 'bg-[var(--thor-off-white)] text-[var(--thor-gold)] shadow-sm'
                      : 'text-[var(--thor-medium-gray)] hover:text-[var(--thor-charcoal)] hover:bg-white/50'
                  }`}
                >
                  E <span className="opacity-70">Nivo</span>
                </button>
                <button
                  onClick={() => setAnalyticsVersion('F')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all font-[var(--font-heading)] ${
                    analyticsVersion === 'F'
                      ? 'bg-[var(--thor-off-white)] text-[var(--thor-steel-blue)] shadow-sm'
                      : 'text-[var(--thor-medium-gray)] hover:text-[var(--thor-charcoal)] hover:bg-white/50'
                  }`}
                >
                  F <span className="opacity-70">Victory</span>
                </button>
                <button
                  onClick={() => setAnalyticsVersion('G')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all font-[var(--font-heading)] ${
                    analyticsVersion === 'G'
                      ? 'bg-[var(--thor-off-white)] text-purple-600 shadow-sm'
                      : 'text-[var(--thor-medium-gray)] hover:text-[var(--thor-charcoal)] hover:bg-white/50'
                  }`}
                >
                  G <span className="opacity-70">Plotly</span>
                </button>
                <button
                  onClick={() => setAnalyticsVersion('H')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all font-[var(--font-heading)] ${
                    analyticsVersion === 'H'
                      ? 'bg-[var(--thor-off-white)] text-pink-600 shadow-sm'
                      : 'text-[var(--thor-medium-gray)] hover:text-[var(--thor-charcoal)] hover:bg-white/50'
                  }`}
                >
                  H <span className="opacity-70">Chart.js</span>
                </button>
                <button
                  onClick={() => setAnalyticsVersion('I')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all font-[var(--font-heading)] ${
                    analyticsVersion === 'I'
                      ? 'bg-[var(--thor-off-white)] text-teal-600 shadow-sm'
                      : 'text-[var(--thor-medium-gray)] hover:text-[var(--thor-charcoal)] hover:bg-white/50'
                  }`}
                >
                  I <span className="opacity-70">Observable</span>
                </button>
                <button
                  onClick={() => setAnalyticsVersion('J')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all font-[var(--font-heading)] ${
                    analyticsVersion === 'J'
                      ? 'bg-[var(--thor-off-white)] text-orange-600 shadow-sm'
                      : 'text-[var(--thor-medium-gray)] hover:text-[var(--thor-charcoal)] hover:bg-white/50'
                  }`}
                >
                  J <span className="opacity-70">AntV/G2</span>
                </button>
              </div>
            </div>

            {/* Render selected version */}
            {analyticsVersion === 'A' && (
              <AnalyticsTab
                summaryData={summaryData}
                inventoryItems={inventoryData?.items || []}
                loading={summaryLoading || inventoryLoading}
              />
            )}
            {analyticsVersion === 'B' && (
              <AnalyticsTabV2
                summaryData={summaryData}
                inventoryItems={inventoryData?.items || []}
                loading={summaryLoading || inventoryLoading}
              />
            )}
            {analyticsVersion === 'C' && (
              <AnalyticsTabV3
                summaryData={summaryData}
                inventoryItems={inventoryData?.items || []}
                loading={summaryLoading || inventoryLoading}
              />
            )}
            {analyticsVersion === 'M' && (
              <AnalyticsTabMobile
                summaryData={summaryData}
                inventoryItems={inventoryData?.items || []}
                loading={summaryLoading || inventoryLoading}
              />
            )}
            {analyticsVersion === 'D' && (
              <AnalyticsTabD
                summaryData={summaryData}
                inventoryItems={inventoryData?.items || []}
                loading={summaryLoading || inventoryLoading}
              />
            )}
            {analyticsVersion === 'E' && (
              <AnalyticsTabE
                summaryData={summaryData}
                inventoryItems={inventoryData?.items || []}
                loading={summaryLoading || inventoryLoading}
              />
            )}
            {analyticsVersion === 'F' && (
              <AnalyticsTabF
                summaryData={summaryData}
                inventoryItems={inventoryData?.items || []}
                loading={summaryLoading || inventoryLoading}
              />
            )}
            {analyticsVersion === 'G' && (
              <AnalyticsTabG
                summaryData={summaryData}
                inventoryItems={inventoryData?.items || []}
                loading={summaryLoading || inventoryLoading}
              />
            )}
            {analyticsVersion === 'H' && (
              <AnalyticsTabH
                summaryData={summaryData}
                inventoryItems={inventoryData?.items || []}
                loading={summaryLoading || inventoryLoading}
              />
            )}
            {analyticsVersion === 'I' && (
              <AnalyticsTabI
                summaryData={summaryData}
                inventoryItems={inventoryData?.items || []}
                loading={summaryLoading || inventoryLoading}
              />
            )}
            {analyticsVersion === 'J' && (
              <AnalyticsTabJ
                summaryData={summaryData}
                inventoryItems={inventoryData?.items || []}
                loading={summaryLoading || inventoryLoading}
              />
            )}
          </div>
        )}

        {/* Footer - Thor Premium */}
        <footer className="thor-footer mt-12">
          <div className="thor-accent-line-thick w-32 mx-auto mb-6"></div>
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--thor-sage)] to-[var(--thor-gold)] p-0.5">
              <div className="w-full h-full rounded-[6px] bg-[var(--thor-off-white)] flex items-center justify-center">
                <svg className="w-4 h-4 text-[var(--thor-sage)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
            </div>
            <span className="thor-footer-brand text-lg">Thor Industries</span>
          </div>
          <p className="thor-footer-text mb-1">
            Data Source: Fabric GraphQL API (Gold Tables) | 185,160 Total Units
          </p>
          <p className="thor-footer-text opacity-60">
            Market Intelligence Dashboard v2.0
          </p>
        </footer>
      </main>
    </div>
  )
}
