// Version H: Chart.js - Simple, lightweight, widely used
// Small bundle size, easy setup, great documentation

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Doughnut, Bar, Line, Pie } from 'react-chartjs-2'
import { CrossFilterProvider, useCrossFilter } from '../../context/CrossFilterContext'
import USAMap from '../charts/USAMap'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const API_BASE = 'http://localhost:8000'

// Thor color palette
const THOR_COLORS = {
  sage: '#495737',
  sageLight: 'rgba(73, 87, 55, 0.2)',
  gold: '#a46807',
  goldLight: 'rgba(164, 104, 7, 0.2)',
  steel: '#577d91',
  steelLight: 'rgba(87, 125, 145, 0.2)',
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

const RV_COLORS_LIGHT = [
  'rgba(73, 87, 55, 0.7)',
  'rgba(164, 104, 7, 0.7)',
  'rgba(87, 125, 145, 0.7)',
  'rgba(140, 138, 126, 0.7)',
  'rgba(107, 122, 94, 0.7)',
  'rgba(196, 133, 13, 0.7)',
  'rgba(74, 102, 115, 0.7)',
  'rgba(89, 87, 85, 0.7)',
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

interface AnalyticsTabHProps {
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
const formatCompactNum = (n: number) => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(n)
}

// Chart.js Doughnut Chart
function ChartJSDoughnut({ data, onSelect }: { data: AggregationItem[], onSelect?: (name: string) => void }) {
  const chartRef = useRef<ChartJS<'doughnut'>>(null)
  const total = data.reduce((sum, d) => sum + d.count, 0)

  const chartData = {
    labels: data.map(d => d.name),
    datasets: [
      {
        data: data.map(d => d.count),
        backgroundColor: RV_COLORS_LIGHT,
        borderColor: RV_COLORS,
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 11 },
          color: THOR_COLORS.warmGray,
        },
      },
      tooltip: {
        backgroundColor: THOR_COLORS.charcoal,
        titleColor: THOR_COLORS.offWhite,
        bodyColor: THOR_COLORS.offWhite,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (context: any) => {
            const value = context.raw as number
            const pct = ((value / total) * 100).toFixed(1)
            return `${formatNumber(value)} units (${pct}%)`
          },
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0 && onSelect) {
        const index = elements[0].index
        onSelect(data[index].name)
      }
    },
  }

  return (
    <div className="relative" style={{ height: 350 }}>
      <Doughnut ref={chartRef} data={chartData} options={options} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center -mt-8">
          <p className="text-2xl font-bold text-[var(--thor-charcoal)]">{formatNumber(total)}</p>
          <p className="text-xs text-[var(--thor-medium-gray)]">Total Units</p>
        </div>
      </div>
    </div>
  )
}

// Chart.js Horizontal Bar Chart
function ChartJSBar({ data, onSelect, color = THOR_COLORS.sage }: {
  data: AggregationItem[]
  onSelect?: (name: string) => void
  color?: string
}) {
  const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 8)

  const chartData = {
    labels: sortedData.map(d => d.name.length > 18 ? d.name.slice(0, 16) + '...' : d.name),
    datasets: [
      {
        data: sortedData.map(d => d.count),
        backgroundColor: `${color}cc`,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 4,
        barThickness: 24,
      },
    ],
  }

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: THOR_COLORS.charcoal,
        titleColor: THOR_COLORS.offWhite,
        bodyColor: THOR_COLORS.offWhite,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          title: (context: any) => sortedData[context[0].dataIndex].name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (context: any) => {
            const item = sortedData[context.dataIndex]
            return [
              `Units: ${formatNumber(context.raw)}`,
              `Avg Price: ${formatPrice(item.avg_price)}`,
            ]
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: THOR_COLORS.borderGray, drawBorder: false },
        ticks: {
          color: THOR_COLORS.mediumGray,
          font: { size: 10 },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (value: any) => formatCompactNum(value),
        },
      },
      y: {
        grid: { display: false },
        ticks: { color: THOR_COLORS.warmGray, font: { size: 10 } },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0 && onSelect) {
        onSelect(sortedData[elements[0].index].name)
      }
    },
  }

  return (
    <div style={{ height: 300 }}>
      <Bar data={chartData} options={options} />
    </div>
  )
}

// Chart.js Line Chart for Price Distribution
function ChartJSLine({ data }: { data: InventoryItem[] }) {
  const priceData = data.filter(d => d.sale_price && d.sale_price > 0)

  if (priceData.length === 0) {
    return <div className="h-64 flex items-center justify-center text-[var(--thor-medium-gray)]">No price data</div>
  }

  const prices = priceData.map(d => d.sale_price!)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const binCount = 15
  const binWidth = (max - min) / binCount

  const newBins = Array(binCount).fill(0)
  const usedBins = Array(binCount).fill(0)

  priceData.forEach(item => {
    const binIndex = Math.min(Math.floor((item.sale_price! - min) / binWidth), binCount - 1)
    if (item.condition === 'NEW') newBins[binIndex]++
    else usedBins[binIndex]++
  })

  const labels = Array.from({ length: binCount }, (_, i) =>
    formatCompact(min + (i + 0.5) * binWidth)
  )

  const chartData = {
    labels,
    datasets: [
      {
        label: 'NEW',
        data: newBins,
        borderColor: THOR_COLORS.sage,
        backgroundColor: THOR_COLORS.sageLight,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: THOR_COLORS.sage,
      },
      {
        label: 'USED',
        data: usedBins,
        borderColor: THOR_COLORS.gold,
        backgroundColor: THOR_COLORS.goldLight,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: THOR_COLORS.gold,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 11 },
          color: THOR_COLORS.warmGray,
        },
      },
      tooltip: {
        backgroundColor: THOR_COLORS.charcoal,
        titleColor: THOR_COLORS.offWhite,
        bodyColor: THOR_COLORS.offWhite,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: THOR_COLORS.borderGray, drawBorder: false },
        ticks: { color: THOR_COLORS.mediumGray, font: { size: 9 }, maxRotation: 45 },
      },
      y: {
        grid: { color: THOR_COLORS.borderGray, drawBorder: false },
        ticks: { color: THOR_COLORS.mediumGray, font: { size: 10 } },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }

  return (
    <div style={{ height: 260 }}>
      <Line data={chartData} options={options} />
    </div>
  )
}

// Chart.js Pie Chart for States
function ChartJSPie({ data, onSelect }: { data: AggregationItem[], onSelect?: (name: string) => void }) {
  const topData = [...data].sort((a, b) => b.count - a.count).slice(0, 8)

  const chartData = {
    labels: topData.map(d => d.name),
    datasets: [
      {
        data: topData.map(d => d.count),
        backgroundColor: RV_COLORS_LIGHT,
        borderColor: RV_COLORS,
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 10 },
          color: THOR_COLORS.warmGray,
        },
      },
      tooltip: {
        backgroundColor: THOR_COLORS.charcoal,
        titleColor: THOR_COLORS.offWhite,
        bodyColor: THOR_COLORS.offWhite,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (context: any) => `${formatNumber(context.raw)} units`,
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0 && onSelect) {
        onSelect(topData[elements[0].index].name)
      }
    },
  }

  return (
    <div style={{ height: 280 }}>
      <Pie data={chartData} options={options} />
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
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-pink-100 text-pink-700">
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
    <div className="mb-6 p-4 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-pink-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-medium text-[var(--thor-charcoal)]">Active Filter:</span>
          <span className="ml-2 px-2 py-0.5 text-sm rounded bg-pink-600 text-white">
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

  const chartData = {
    labels: ['NEW', 'USED'],
    datasets: [
      {
        data: [newData?.count || 0, usedData?.count || 0],
        backgroundColor: [THOR_COLORS.sageLight, THOR_COLORS.goldLight],
        borderColor: [THOR_COLORS.sage, THOR_COLORS.gold],
        borderWidth: 3,
        circumference: 180,
        rotation: 270,
      },
    ],
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center" style={{ height: 140 }}>
        <Doughnut
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { legend: { display: false } },
          }}
        />
      </div>
      <p className="text-center text-2xl font-bold text-[var(--thor-charcoal)]">{newPct.toFixed(0)}% NEW</p>

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
function AnalyticsContentH({ summaryData, inventoryItems, loading: initialLoading }: AnalyticsTabHProps) {
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
        <KPICard title="Manufacturers" value={String(displayData.by_manufacturer.length)} subtitle="Brands" icon="🏭" color="sage" />
      </div>

      {/* Interactive USA Map */}
      {displayData.by_state && displayData.by_state.length > 0 && (
        <USAMap
          data={displayData.by_state}
          onStateSelect={(state) => setFilter('state', state, 'chartjsMap')}
          selectedState={filter.dimension === 'state' ? filter.value : null}
          height={380}
          colorScheme="gold"
          showLegend={true}
          darkMode={false}
          title="Market Distribution"
          subtitle="Chart.js visualization with state filtering"
        />
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Market Share by RV Type" subtitle="Click to filter" badge="Chart.js Doughnut">
          <ChartJSDoughnut data={displayData.by_rv_type} onSelect={(name) => setFilter('rv_type', name, 'doughnut')} />
        </ChartCard>

        <ChartCard title="Condition Analysis" subtitle="NEW vs USED" badge="Chart.js">
          <ConditionCards data={displayData.by_condition} onSelect={(condition) => setFilter('condition', condition, 'card')} />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top States" subtitle="Click to filter" badge="Chart.js Pie">
          <ChartJSPie data={displayData.by_state} onSelect={(name) => setFilter('state', name, 'pie')} />
        </ChartCard>

        <ChartCard title="Price Distribution" subtitle="NEW vs USED" badge="Chart.js Line">
          <ChartJSLine data={displayInventory} />
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Manufacturers" subtitle="By unit count" badge="Chart.js Bar">
          <ChartJSBar data={displayData.by_manufacturer} onSelect={(name) => setFilter('manufacturer', name, 'bar')} color={THOR_COLORS.steel} />
        </ChartCard>

        <ChartCard title="Top Dealer Groups" subtitle="By unit count" badge="Chart.js Bar">
          <ChartJSBar data={displayData.by_dealer_group} onSelect={(name) => setFilter('dealer_group', name, 'bar')} color={THOR_COLORS.sage} />
        </ChartCard>
      </div>

      {/* Footer */}
      <div className="p-4 rounded-xl bg-[var(--thor-light-beige)] flex items-center justify-between">
        <p className="text-sm text-[var(--thor-warm-gray)]">
          Displaying <span className="font-semibold text-[var(--thor-charcoal)]">{formatNumber(displayData.total_units)}</span> units
        </p>
        <span className="text-xs px-3 py-1 rounded-full bg-pink-100 text-pink-700 font-semibold">
          Version H (Chart.js)
        </span>
      </div>
    </div>
  )
}

export function AnalyticsTabH(props: AnalyticsTabHProps) {
  return (
    <CrossFilterProvider>
      <AnalyticsContentH {...props} />
    </CrossFilterProvider>
  )
}
