// Version I: Observable Plot - From D3 creator Mike Bostock
// Concise API, exploratory data viz, modern approach

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import * as Plot from '@observablehq/plot'
import { CrossFilterProvider, useCrossFilter } from '../../context/CrossFilterContext'
import USAMap from '../charts/USAMap'

const API_BASE = 'http://localhost:8000'

// Thor color palette
const THOR_COLORS = {
  sage: '#495737',
  gold: '#a46807',
  steel: '#577d91',
  charcoal: '#181817',
  offWhite: '#fffdfa',
  lightBeige: '#f7f4f0',
  mediumGray: '#8c8a7e',
  warmGray: '#595755',
  borderGray: '#d9d6cf',
}

const RV_COLORS = [
  '#495737', '#a46807', '#577d91', '#8c8a7e',
  '#6b7a5e', '#c4850d', '#4a6673', '#595755',
]

interface AggregationItem {
  name: string
  count: number
  total_value: number
  avg_price: number
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
}

interface AnalyticsTabIProps {
  summaryData: AggregatedSummary | null
  inventoryItems: InventoryItem[]
  loading: boolean
}

const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n)
const formatPrice = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const formatCompact = (n: number) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n}`
}

// Observable Plot Bar Chart
function ObservableBarChart({
  data,
  onSelect
}: {
  data: AggregationItem[]
  onSelect?: (name: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 10)

  useLayoutEffect(() => {
    if (!containerRef.current) return

    const plot = Plot.plot({
      marginLeft: 140,
      marginRight: 40,
      marginTop: 20,
      marginBottom: 30,
      height: 320,
      width: containerRef.current.offsetWidth || 400,
      style: {
        background: 'transparent',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
      },
      x: {
        grid: true,
        label: 'Units',
        tickFormat: (d: number) => d >= 1000 ? `${(d / 1000).toFixed(0)}K` : String(d),
      },
      y: {
        label: null,
        tickFormat: (d: string) => d.length > 16 ? d.slice(0, 14) + '...' : d,
      },
      color: {
        type: 'categorical',
        range: [THOR_COLORS.sage],
      },
      marks: [
        Plot.barX(sortedData, {
          x: 'count',
          y: 'name',
          fill: THOR_COLORS.sage,
          sort: { y: '-x' },
          tip: true,
          title: (d: AggregationItem) => `${d.name}\nUnits: ${formatNumber(d.count)}\nAvg Price: ${formatPrice(d.avg_price)}`,
        }),
        Plot.text(sortedData, {
          x: 'count',
          y: 'name',
          text: (d: AggregationItem) => formatNumber(d.count),
          textAnchor: 'start',
          dx: 5,
          fill: THOR_COLORS.charcoal,
          fontSize: 10,
        }),
        Plot.ruleX([0]),
      ],
    })

    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(plot)

    // Add click handler
    const bars = containerRef.current.querySelectorAll('rect')
    bars.forEach((bar, index) => {
      bar.style.cursor = 'pointer'
      bar.addEventListener('click', () => {
        if (sortedData[index] && onSelect) {
          onSelect(sortedData[index].name)
        }
      })
    })

    return () => plot.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, onSelect])

  return <div ref={containerRef} className="w-full" />
}

// Observable Plot Dot Chart (for scatter-like visualization)
function ObservableDotChart({ data }: { data: AggregationItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!containerRef.current) return

    const plot = Plot.plot({
      marginLeft: 80,
      marginRight: 30,
      marginTop: 30,
      marginBottom: 50,
      height: 280,
      width: containerRef.current.offsetWidth || 400,
      style: {
        background: 'transparent',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
      },
      x: {
        label: 'Unit Count',
        tickFormat: (d: number) => d >= 1000 ? `${(d / 1000).toFixed(0)}K` : String(d),
        grid: true,
      },
      y: {
        label: 'Avg Price ($)',
        tickFormat: (d: number) => `$${(d / 1000).toFixed(0)}K`,
        grid: true,
      },
      r: {
        range: [5, 30],
      },
      color: {
        type: 'categorical',
        domain: data.map(d => d.name),
        range: RV_COLORS,
        legend: true,
      },
      marks: [
        Plot.dot(data, {
          x: 'count',
          y: 'avg_price',
          r: 'total_value',
          fill: 'name',
          fillOpacity: 0.7,
          stroke: 'name',
          strokeWidth: 2,
          tip: true,
          title: (d: AggregationItem) => `${d.name}\nUnits: ${formatNumber(d.count)}\nAvg Price: ${formatPrice(d.avg_price)}\nTotal Value: ${formatCompact(d.total_value)}`,
        }),
      ],
    })

    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(plot)

    return () => plot.remove()
  }, [data])

  return <div ref={containerRef} className="w-full" />
}

// Observable Plot Area Chart
function ObservableAreaChart({ data }: { data: InventoryItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!containerRef.current) return

    const priceData = data.filter(d => d.sale_price && d.sale_price > 0)
    if (priceData.length === 0) {
      containerRef.current.innerHTML = '<div class="h-64 flex items-center justify-center text-gray-400">No price data</div>'
      return
    }

    const plot = Plot.plot({
      marginLeft: 60,
      marginRight: 30,
      marginTop: 30,
      marginBottom: 50,
      height: 260,
      width: containerRef.current.offsetWidth || 400,
      style: {
        background: 'transparent',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
      },
      x: {
        label: 'Price ($)',
        tickFormat: (d: number) => `$${(d / 1000).toFixed(0)}K`,
      },
      y: {
        label: 'Count',
        grid: true,
      },
      color: {
        type: 'categorical',
        domain: ['NEW', 'USED'],
        range: [THOR_COLORS.sage, THOR_COLORS.gold],
        legend: true,
      },
      marks: [
        Plot.rectY(
          priceData,
          Plot.binX(
            { y: 'count' },
            {
              x: 'sale_price',
              fill: 'condition',
              fillOpacity: 0.6,
              thresholds: 20,
              tip: true,
            }
          )
        ),
        Plot.ruleY([0]),
      ],
    })

    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(plot)

    return () => plot.remove()
  }, [data])

  return <div ref={containerRef} className="w-full" />
}

// Observable Plot Cell Chart (Heatmap-style)
function ObservableCellChart({ data }: { data: AggregationItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const topData = [...data].sort((a, b) => b.count - a.count).slice(0, 12)

  useLayoutEffect(() => {
    if (!containerRef.current) return

    const plot = Plot.plot({
      marginLeft: 120,
      marginRight: 40,
      marginTop: 20,
      marginBottom: 30,
      height: 280,
      width: containerRef.current.offsetWidth || 400,
      padding: 0.1,
      style: {
        background: 'transparent',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '10px',
      },
      x: {
        label: null,
        tickFormat: () => '',
      },
      y: {
        label: null,
      },
      color: {
        type: 'linear',
        scheme: 'YlGn',
        legend: true,
        label: 'Units',
      },
      marks: [
        Plot.cell(topData, {
          x: () => 'Units',
          y: 'name',
          fill: 'count',
          sort: { y: '-fill' },
          tip: true,
          title: (d: AggregationItem) => `${d.name}: ${formatNumber(d.count)} units`,
        }),
        Plot.text(topData, {
          x: () => 'Units',
          y: 'name',
          text: (d: AggregationItem) => formatNumber(d.count),
          fill: (d: AggregationItem) => d.count > topData[Math.floor(topData.length / 2)]?.count ? 'white' : THOR_COLORS.charcoal,
          fontSize: 11,
          fontWeight: 600,
        }),
      ],
    })

    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(plot)

    return () => plot.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  return <div ref={containerRef} className="w-full" />
}

// KPI Card
function KPICard({ title, value, subtitle, icon, color = 'sage' }: {
  title: string
  value: string
  subtitle?: string
  icon: string
  color?: 'sage' | 'gold' | 'steel'
}) {
  const colorMap = {
    sage: 'from-[var(--thor-sage)] to-[#3d4a2e]',
    gold: 'from-[var(--thor-gold)] to-[#8a5806]',
    steel: 'from-[var(--thor-steel-blue)] to-[#4a6b7c]',
  }

  return (
    <div className="card-thor p-5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorMap[color]}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--thor-medium-gray)]">{title}</p>
          <p className="text-2xl font-bold text-[var(--thor-charcoal)] mt-1">{value}</p>
          {subtitle && <p className="text-xs text-[var(--thor-warm-gray)] mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[color]} flex items-center justify-center`}>
          <span className="text-lg">{icon}</span>
        </div>
      </div>
    </div>
  )
}

// Chart Card
function ChartCard({ title, subtitle, children, badge }: {
  title: string
  subtitle?: string
  children: React.ReactNode
  badge?: string
}) {
  return (
    <div className="card-thor overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--thor-border-gray)] flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--thor-charcoal)]">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--thor-medium-gray)] mt-0.5">{subtitle}</p>}
        </div>
        {badge && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-700">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// Filter Banner
function FilterBanner() {
  const { filter, clearFilter, isAnyFiltered } = useCrossFilter()
  if (!isAnyFiltered()) return null

  return (
    <div className="mb-6 p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-medium text-[var(--thor-charcoal)]">Active Filter:</span>
          <span className="ml-2 px-2 py-0.5 text-sm rounded bg-teal-600 text-white">
            {filter.dimension}: {filter.value}
          </span>
        </div>
      </div>
      <button onClick={clearFilter} className="btn-thor-ghost text-sm">Clear Filter</button>
    </div>
  )
}

// Condition Cards
function ConditionCards({ data, onSelect }: { data: AggregationItem[], onSelect?: (condition: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const newData = data.find(d => d.name === 'NEW')
  const usedData = data.find(d => d.name === 'USED')
  const total = (newData?.count || 0) + (usedData?.count || 0)
  const newPct = total > 0 ? ((newData?.count || 0) / total) * 100 : 0

  useLayoutEffect(() => {
    if (!containerRef.current) return

    const plot = Plot.plot({
      marginLeft: 60,
      marginRight: 20,
      marginTop: 10,
      marginBottom: 30,
      height: 120,
      width: containerRef.current.offsetWidth || 300,
      style: {
        background: 'transparent',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      x: {
        label: null,
        domain: [0, 100],
        tickFormat: (d: number) => `${d}%`,
      },
      y: {
        label: null,
        tickFormat: () => '',
      },
      color: {
        type: 'categorical',
        domain: ['NEW', 'USED'],
        range: [THOR_COLORS.sage, THOR_COLORS.gold],
      },
      marks: [
        Plot.barX(
          [
            { condition: 'NEW', value: newPct },
            { condition: 'USED', value: 100 - newPct },
          ],
          Plot.stackX({
            x: 'value',
            fill: 'condition',
            y: () => 'Condition',
          })
        ),
        Plot.text(
          [{ x: newPct / 2, label: `NEW ${newPct.toFixed(0)}%` }],
          { x: 'x', y: () => 'Condition', text: 'label', fill: 'white', fontWeight: 600 }
        ),
      ],
    })

    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(plot)

    return () => plot.remove()
  }, [data, newPct])

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full" />

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect?.('NEW')}
          className="p-4 rounded-xl border-2 border-[var(--thor-sage)]/30 bg-[var(--thor-sage)]/5 hover:bg-[var(--thor-sage)]/10 transition-all text-left"
        >
          <span className="font-semibold text-[var(--thor-sage)]">NEW</span>
          <p className="text-2xl font-bold text-[var(--thor-charcoal)]">{formatNumber(newData?.count || 0)}</p>
          <p className="text-sm text-[var(--thor-medium-gray)]">Avg: {formatPrice(newData?.avg_price || 0)}</p>
        </button>

        <button
          onClick={() => onSelect?.('USED')}
          className="p-4 rounded-xl border-2 border-[var(--thor-gold)]/30 bg-[var(--thor-gold)]/5 hover:bg-[var(--thor-gold)]/10 transition-all text-left"
        >
          <span className="font-semibold text-[var(--thor-gold)]">USED</span>
          <p className="text-2xl font-bold text-[var(--thor-charcoal)]">{formatNumber(usedData?.count || 0)}</p>
          <p className="text-sm text-[var(--thor-medium-gray)]">Avg: {formatPrice(usedData?.avg_price || 0)}</p>
        </button>
      </div>
    </div>
  )
}

// Main Content
function AnalyticsContentI({ summaryData, inventoryItems, loading: initialLoading }: AnalyticsTabIProps) {
  const { filter, setFilter, isAnyFiltered } = useCrossFilter()
  const [filteredSummary, setFilteredSummary] = useState<AggregatedSummary | null>(null)
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([])
  const [filterLoading, setFilterLoading] = useState(false)

  const fetchFilteredData = useCallback(async () => {
    if (!isAnyFiltered()) {
      setFilteredSummary(null)
      setFilteredInventory([])
      return
    }

    setFilterLoading(true)
    try {
      const params = new URLSearchParams()
      switch (filter.dimension) {
        case 'rv_type': params.append('rv_class', filter.value || ''); break
        case 'condition': params.append('condition', filter.value || ''); break
        case 'dealer_group': params.append('dealer_group', filter.value || ''); break
        case 'manufacturer': params.append('manufacturer', filter.value || ''); break
        case 'state': params.append('state', filter.value || ''); break
      }

      const aggResponse = await fetch(`${API_BASE}/inventory/aggregated?${params}`)
      const aggData = await aggResponse.json()
      setFilteredSummary(aggData)

      params.append('limit', '3000')
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

  const displayData = isAnyFiltered() && filteredSummary ? filteredSummary : summaryData
  const displayInventory = isAnyFiltered() ? filteredInventory : inventoryItems
  const loading = initialLoading || filterLoading

  if (loading || !displayData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-[var(--thor-light-beige)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FilterBanner />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Units" value={formatNumber(displayData.total_units)} subtitle="In inventory" icon="📦" color="sage" />
        <KPICard title="Total Value" value={formatCompact(displayData.total_value)} subtitle="Market value" icon="💰" color="gold" />
        <KPICard title="Average Price" value={formatPrice(displayData.avg_price)} subtitle="Per unit" icon="📊" color="steel" />
        <KPICard title="Dealer Groups" value={String(displayData.by_dealer_group.length)} subtitle="Partners" icon="🏢" color="sage" />
      </div>

      {/* Interactive USA Map */}
      {displayData.by_state && displayData.by_state.length > 0 && (
        <USAMap
          data={displayData.by_state}
          onStateSelect={(state) => setFilter('state', state, 'observableMap')}
          selectedState={filter.dimension === 'state' ? filter.value : null}
          height={380}
          colorScheme="sage"
          showLegend={true}
          darkMode={false}
          title="Geographic Analysis"
          subtitle="Observable Plot enhanced map"
        />
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="RV Types Distribution" subtitle="Click bars to filter" badge="Observable Bar">
          <ObservableBarChart data={displayData.by_rv_type} onSelect={(name) => setFilter('rv_type', name, 'bar')} />
        </ChartCard>

        <ChartCard title="Condition Analysis" subtitle="NEW vs USED" badge="Observable Stack">
          <ConditionCards data={displayData.by_condition} onSelect={(condition) => setFilter('condition', condition, 'stack')} />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Price vs Volume" subtitle="Bubble size = total value" badge="Observable Dot">
          <ObservableDotChart data={displayData.by_rv_type} />
        </ChartCard>

        <ChartCard title="Price Distribution" subtitle="Histogram by condition" badge="Observable Rect">
          <ObservableAreaChart data={displayInventory} />
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Manufacturers" subtitle="Click to filter" badge="Observable Bar">
          <ObservableBarChart data={displayData.by_manufacturer} onSelect={(name) => setFilter('manufacturer', name, 'bar')} />
        </ChartCard>

        <ChartCard title="Geographic Heatmap" subtitle="By state" badge="Observable Cell">
          <ObservableCellChart data={displayData.by_state} />
        </ChartCard>
      </div>

      {/* Charts Row 4 */}
      <ChartCard title="Top Dealer Groups" subtitle="Click to filter" badge="Observable Bar">
        <ObservableBarChart data={displayData.by_dealer_group} onSelect={(name) => setFilter('dealer_group', name, 'bar')} />
      </ChartCard>

      {/* Footer */}
      <div className="p-4 rounded-xl bg-[var(--thor-light-beige)] flex items-center justify-between">
        <p className="text-sm text-[var(--thor-warm-gray)]">
          Displaying <span className="font-semibold text-[var(--thor-charcoal)]">{formatNumber(displayData.total_units)}</span> units
        </p>
        <span className="text-xs px-3 py-1 rounded-full bg-teal-100 text-teal-700 font-semibold">
          Version I (Observable Plot)
        </span>
      </div>
    </div>
  )
}

export function AnalyticsTabI(props: AnalyticsTabIProps) {
  return (
    <CrossFilterProvider>
      <AnalyticsContentI {...props} />
    </CrossFilterProvider>
  )
}
