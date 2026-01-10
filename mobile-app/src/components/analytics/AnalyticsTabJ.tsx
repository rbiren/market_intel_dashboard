// Version J: AntV/G2 - Alibaba's Grammar of Graphics
// Enterprise dashboards, extensive chart types, great theming

import { useState, useEffect, useCallback } from 'react'
import { Pie, Column, Bar, Area, Radar } from '@ant-design/charts'
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

interface AnalyticsTabJProps {
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

// AntV Pie Chart
function AntVPieChart({ data, onSelect }: { data: AggregationItem[], onSelect?: (name: string) => void }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  const config = {
    data: data.map(d => ({ type: d.name, value: d.count })),
    angleField: 'value',
    colorField: 'type',
    radius: 0.9,
    innerRadius: 0.6,
    color: RV_COLORS,
    label: false,
    legend: {
      position: 'bottom' as const,
      itemName: { style: { fill: THOR_COLORS.warmGray } },
    },
    statistic: {
      title: {
        content: 'Total',
        style: { color: THOR_COLORS.mediumGray, fontSize: '12px' },
      },
      content: {
        content: formatNumber(total),
        style: { color: THOR_COLORS.charcoal, fontSize: '24px', fontWeight: 700 },
      },
    },
    interactions: [{ type: 'element-active' }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onReady: (plot: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plot.on('element:click', (evt: any) => {
        if (evt.data?.data?.type && onSelect) {
          onSelect(evt.data.data.type)
        }
      })
    },
  }

  return <Pie {...config} height={320} />
}

// AntV Bar Chart (Horizontal)
function AntVBarChart({ data, onSelect, color = THOR_COLORS.sage }: {
  data: AggregationItem[]
  onSelect?: (name: string) => void
  color?: string
}) {
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(d => ({
      name: d.name.length > 18 ? d.name.slice(0, 16) + '...' : d.name,
      fullName: d.name,
      count: d.count,
      avgPrice: d.avg_price,
    }))

  const config = {
    data: sortedData,
    xField: 'count',
    yField: 'name',
    color,
    barStyle: { radius: [4, 4, 4, 4] },
    label: {
      position: 'right' as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (datum: any) => formatNumber(datum.count),
      style: { fill: THOR_COLORS.charcoal, fontSize: 10 },
    },
    xAxis: {
      grid: { line: { style: { stroke: THOR_COLORS.borderGray, lineDash: [4, 4] } } },
      label: { style: { fill: THOR_COLORS.mediumGray } },
    },
    yAxis: {
      label: { style: { fill: THOR_COLORS.warmGray } },
    },
    tooltip: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (datum: any) => ({
        name: datum.fullName || datum.name,
        value: `${formatNumber(datum.count)} units • Avg: ${formatPrice(datum.avgPrice)}`,
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onReady: (plot: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plot.on('element:click', (evt: any) => {
        if (evt.data?.data?.fullName && onSelect) {
          onSelect(evt.data.data.fullName)
        }
      })
    },
  }

  return <Bar {...config} height={300} />
}

// AntV Column Chart (Vertical)
function AntVColumnChart({ data, onSelect }: { data: AggregationItem[], onSelect?: (name: string) => void }) {
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(d => ({
      name: d.name.length > 12 ? d.name.slice(0, 10) + '...' : d.name,
      fullName: d.name,
      count: d.count,
    }))

  const config = {
    data: sortedData,
    xField: 'name',
    yField: 'count',
    color: THOR_COLORS.steel,
    columnStyle: { radius: [4, 4, 0, 0] },
    label: {
      position: 'top' as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (datum: any) => formatNumber(datum.count),
      style: { fill: THOR_COLORS.charcoal, fontSize: 10 },
    },
    xAxis: {
      label: { style: { fill: THOR_COLORS.warmGray, fontSize: 10 }, autoRotate: true },
    },
    yAxis: {
      grid: { line: { style: { stroke: THOR_COLORS.borderGray, lineDash: [4, 4] } } },
      label: { style: { fill: THOR_COLORS.mediumGray } },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onReady: (plot: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plot.on('element:click', (evt: any) => {
        if (evt.data?.data?.fullName && onSelect) {
          onSelect(evt.data.data.fullName)
        }
      })
    },
  }

  return <Column {...config} height={280} />
}

// AntV Area Chart
function AntVAreaChart({ data }: { data: InventoryItem[] }) {
  const priceData = data.filter(d => d.sale_price && d.sale_price > 0)

  if (priceData.length === 0) {
    return <div className="h-64 flex items-center justify-center text-[var(--thor-medium-gray)]">No price data</div>
  }

  const prices = priceData.map(d => d.sale_price!)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const binCount = 15
  const binWidth = (max - min) / binCount

  const histogramData: { price: string; count: number; condition: string }[] = []

  for (let i = 0; i < binCount; i++) {
    const priceLabel = formatCompact(min + (i + 0.5) * binWidth)
    const binMin = min + i * binWidth
    const binMax = min + (i + 1) * binWidth

    const newCount = priceData.filter(d =>
      d.condition === 'NEW' && d.sale_price! >= binMin && d.sale_price! < binMax
    ).length
    const usedCount = priceData.filter(d =>
      d.condition === 'USED' && d.sale_price! >= binMin && d.sale_price! < binMax
    ).length

    histogramData.push({ price: priceLabel, count: newCount, condition: 'NEW' })
    histogramData.push({ price: priceLabel, count: usedCount, condition: 'USED' })
  }

  const config = {
    data: histogramData,
    xField: 'price',
    yField: 'count',
    seriesField: 'condition',
    color: [THOR_COLORS.sage, THOR_COLORS.gold],
    smooth: true,
    areaStyle: { fillOpacity: 0.4 },
    xAxis: {
      label: { style: { fill: THOR_COLORS.mediumGray, fontSize: 9 }, autoRotate: true },
    },
    yAxis: {
      grid: { line: { style: { stroke: THOR_COLORS.borderGray, lineDash: [4, 4] } } },
      label: { style: { fill: THOR_COLORS.mediumGray } },
    },
    legend: {
      position: 'top' as const,
      itemName: { style: { fill: THOR_COLORS.warmGray } },
    },
  }

  return <Area {...config} height={260} />
}

// AntV Radar Chart
function AntVRadarChart({ data }: { data: AggregationItem[] }) {
  const radarData = data.slice(0, 6).map(d => ({
    name: d.name.length > 12 ? d.name.slice(0, 10) + '...' : d.name,
    value: d.avg_price,
  }))

  const config = {
    data: radarData,
    xField: 'name',
    yField: 'value',
    color: THOR_COLORS.sage,
    meta: {
      value: {
        alias: 'Avg Price',
        formatter: (v: number) => formatPrice(v),
      },
    },
    xAxis: {
      line: null,
      tickLine: null,
      label: { style: { fill: THOR_COLORS.warmGray, fontSize: 10 } },
    },
    yAxis: {
      label: false,
      grid: { line: { style: { stroke: THOR_COLORS.borderGray } } },
    },
    point: { size: 3 },
    area: { style: { fillOpacity: 0.25 } },
  }

  return <Radar {...config} height={280} />
}

// CSS-based Radial Gauge (replaces Liquid which has compatibility issues)
function AntVLiquidGauge({ percent, title }: { percent: number, title: string }) {
  const circumference = 2 * Math.PI * 70 // radius = 70
  const strokeDashoffset = circumference - (percent / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center" style={{ height: 160 }}>
      <svg width="160" height="140" viewBox="0 0 160 140">
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke={THOR_COLORS.borderGray}
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke={THOR_COLORS.sage}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        {/* Percentage text */}
        <text
          x="80"
          y="75"
          textAnchor="middle"
          fontSize="28"
          fontWeight="700"
          fill={THOR_COLORS.charcoal}
        >
          {percent.toFixed(0)}%
        </text>
        {/* Title text */}
        <text
          x="80"
          y="100"
          textAnchor="middle"
          fontSize="11"
          fill={THOR_COLORS.warmGray}
        >
          {title}
        </text>
      </svg>
    </div>
  )
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
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
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
    <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-medium text-[var(--thor-charcoal)]">Active Filter:</span>
          <span className="ml-2 px-2 py-0.5 text-sm rounded bg-orange-600 text-white">
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
  const newData = data.find(d => d.name === 'NEW')
  const usedData = data.find(d => d.name === 'USED')
  const total = (newData?.count || 0) + (usedData?.count || 0)
  const newPct = total > 0 ? ((newData?.count || 0) / total) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <AntVLiquidGauge percent={newPct} title="NEW Inventory" />
      </div>

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
function AnalyticsContentJ({ summaryData, inventoryItems, loading: initialLoading }: AnalyticsTabJProps) {
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
        <KPICard title="States" value={String(displayData.by_state.length)} subtitle="Coverage" icon="🗺️" color="sage" />
      </div>

      {/* Interactive USA Map */}
      {displayData.by_state && displayData.by_state.length > 0 && (
        <USAMap
          data={displayData.by_state}
          onStateSelect={(state) => setFilter('state', state, 'antvMap')}
          selectedState={filter.dimension === 'state' ? filter.value : null}
          height={380}
          colorScheme="gradient"
          showLegend={true}
          darkMode={false}
          title="Regional Market Analysis"
          subtitle="AntV/G2 enterprise map view"
        />
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Market Share by RV Type" subtitle="Click to filter" badge="AntV Pie">
          <AntVPieChart data={displayData.by_rv_type} onSelect={(name) => setFilter('rv_type', name, 'pie')} />
        </ChartCard>

        <ChartCard title="Condition Analysis" subtitle="NEW vs USED" badge="AntV Liquid">
          <ConditionCards data={displayData.by_condition} onSelect={(condition) => setFilter('condition', condition, 'card')} />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top States" subtitle="Click to filter" badge="AntV Column">
          <AntVColumnChart data={displayData.by_state} onSelect={(name) => setFilter('state', name, 'column')} />
        </ChartCard>

        <ChartCard title="Price Distribution" subtitle="NEW vs USED" badge="AntV Area">
          <AntVAreaChart data={displayInventory} />
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Manufacturers" subtitle="By unit count" badge="AntV Bar">
          <AntVBarChart data={displayData.by_manufacturer} onSelect={(name) => setFilter('manufacturer', name, 'bar')} color={THOR_COLORS.steel} />
        </ChartCard>

        <ChartCard title="Avg Price by RV Type" subtitle="Radar comparison" badge="AntV Radar">
          <AntVRadarChart data={displayData.by_rv_type} />
        </ChartCard>
      </div>

      {/* Charts Row 4 */}
      <ChartCard title="Top Dealer Groups" subtitle="By unit count" badge="AntV Bar">
        <AntVBarChart data={displayData.by_dealer_group} onSelect={(name) => setFilter('dealer_group', name, 'bar')} color={THOR_COLORS.sage} />
      </ChartCard>

      {/* Footer */}
      <div className="p-4 rounded-xl bg-[var(--thor-light-beige)] flex items-center justify-between">
        <p className="text-sm text-[var(--thor-warm-gray)]">
          Displaying <span className="font-semibold text-[var(--thor-charcoal)]">{formatNumber(displayData.total_units)}</span> units
        </p>
        <span className="text-xs px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
          Version J (AntV/G2)
        </span>
      </div>
    </div>
  )
}

export function AnalyticsTabJ(props: AnalyticsTabJProps) {
  return (
    <CrossFilterProvider>
      <AnalyticsContentJ {...props} />
    </CrossFilterProvider>
  )
}
