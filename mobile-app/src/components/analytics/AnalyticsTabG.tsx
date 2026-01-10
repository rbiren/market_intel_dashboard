// Version G: Plotly - Scientific/data science grade visualizations
// Interactive zoom, pan, export built-in

import { useState, useEffect, useCallback } from 'react'
import Plot from 'react-plotly.js'
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
}

interface AnalyticsTabGProps {
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

const plotlyLayout = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { family: 'Inter, system-ui, sans-serif', color: THOR_COLORS.warmGray },
  margin: { t: 30, r: 20, b: 40, l: 120 },
  showlegend: false,
}

// Plotly Pie/Donut Chart
function PlotlyDonutChart({ data, onSelect }: { data: AggregationItem[], onSelect?: (name: string) => void }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <Plot
      data={[
        {
          type: 'pie',
          values: data.map(d => d.count),
          labels: data.map(d => d.name),
          hole: 0.55,
          marker: {
            colors: RV_COLORS,
            line: { color: THOR_COLORS.offWhite, width: 2 },
          },
          textinfo: 'percent',
          textposition: 'inside',
          textfont: { color: 'white', size: 11 },
          hovertemplate: '<b>%{label}</b><br>Units: %{value:,}<br>Share: %{percent}<extra></extra>',
          pull: 0.02,
        },
      ]}
      layout={{
        ...plotlyLayout,
        height: 350,
        margin: { t: 20, r: 20, b: 20, l: 20 },
        annotations: [
          {
            text: `<b>${formatNumber(total)}</b><br>Total Units`,
            showarrow: false,
            font: { size: 14, color: THOR_COLORS.charcoal },
          },
        ],
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
      onClick={(event) => {
        if (event.points && event.points[0]) {
          onSelect?.(event.points[0].label as string)
        }
      }}
    />
  )
}

// Plotly Horizontal Bar Chart
function PlotlyBarChart({
  data,
  onSelect,
  color = THOR_COLORS.sage
}: {
  data: AggregationItem[]
  onSelect?: (name: string) => void
  color?: string
}) {
  const sortedData = [...data].sort((a, b) => a.count - b.count).slice(-8)

  return (
    <Plot
      data={[
        {
          type: 'bar',
          y: sortedData.map(d => d.name.length > 18 ? d.name.slice(0, 16) + '...' : d.name),
          x: sortedData.map(d => d.count),
          orientation: 'h',
          marker: {
            color: color,
            opacity: 0.9,
            line: { width: 0 },
          },
          text: sortedData.map(d => formatNumber(d.count)),
          textposition: 'outside',
          textfont: { size: 10, color: THOR_COLORS.charcoal },
          hovertemplate: '<b>%{y}</b><br>Units: %{x:,}<extra></extra>',
          customdata: sortedData.map(d => d.name),
        },
      ]}
      layout={{
        ...plotlyLayout,
        height: 300,
        xaxis: {
          showgrid: true,
          gridcolor: THOR_COLORS.borderGray,
          zeroline: false,
          tickfont: { size: 10 },
        },
        yaxis: {
          showgrid: false,
          tickfont: { size: 10 },
        },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
      onClick={(event) => {
        if (event.points && event.points[0]) {
          const customdata = event.points[0].customdata
          onSelect?.(customdata as string)
        }
      }}
    />
  )
}

// Plotly Box Plot for Price Distribution
function PlotlyBoxPlot({ data }: { data: InventoryItem[] }) {
  const newPrices = data.filter(d => d.condition === 'NEW' && d.sale_price).map(d => d.sale_price!)
  const usedPrices = data.filter(d => d.condition === 'USED' && d.sale_price).map(d => d.sale_price!)

  if (newPrices.length === 0 && usedPrices.length === 0) {
    return <div className="h-64 flex items-center justify-center text-[var(--thor-medium-gray)]">No price data</div>
  }

  return (
    <Plot
      data={[
        {
          type: 'box',
          y: newPrices,
          name: 'NEW',
          marker: { color: THOR_COLORS.sage },
          boxpoints: 'outliers',
          jitter: 0.3,
          hovertemplate: 'NEW<br>Price: $%{y:,.0f}<extra></extra>',
        },
        {
          type: 'box',
          y: usedPrices,
          name: 'USED',
          marker: { color: THOR_COLORS.gold },
          boxpoints: 'outliers',
          jitter: 0.3,
          hovertemplate: 'USED<br>Price: $%{y:,.0f}<extra></extra>',
        },
      ]}
      layout={{
        ...plotlyLayout,
        height: 280,
        margin: { t: 20, r: 30, b: 40, l: 70 },
        showlegend: true,
        legend: { orientation: 'h', y: 1.1 },
        yaxis: {
          title: 'Price ($)',
          tickformat: '$,.0s',
          gridcolor: THOR_COLORS.borderGray,
        },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
    />
  )
}

// Plotly Sunburst Chart
function PlotlySunburst({ data, onSelect }: { data: AggregationItem[], onSelect?: (name: string) => void }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const topItems = [...data].sort((a, b) => b.count - a.count).slice(0, 10)

  return (
    <Plot
      data={[
        {
          type: 'sunburst',
          labels: ['All', ...topItems.map(d => d.name)],
          parents: ['', ...topItems.map(() => 'All')],
          values: [total, ...topItems.map(d => d.count)],
          branchvalues: 'total',
          marker: {
            colors: ['transparent', ...RV_COLORS],
            line: { width: 2, color: THOR_COLORS.offWhite },
          },
          textinfo: 'label+percent parent',
          textfont: { size: 10 },
          hovertemplate: '<b>%{label}</b><br>Units: %{value:,}<br>Share: %{percentParent:.1%}<extra></extra>',
        },
      ]}
      layout={{
        ...plotlyLayout,
        height: 320,
        margin: { t: 20, r: 20, b: 20, l: 20 },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
      onClick={(event) => {
        if (event.points && event.points[0] && event.points[0].label !== 'All') {
          onSelect?.(event.points[0].label as string)
        }
      }}
    />
  )
}

// Plotly Scatter for Price vs Count
function PlotlyScatter({ data }: { data: AggregationItem[] }) {
  return (
    <Plot
      data={[
        {
          type: 'scatter',
          mode: 'markers+text',
          x: data.map(d => d.count),
          y: data.map(d => d.avg_price),
          text: data.map(d => d.name.length > 10 ? d.name.slice(0, 8) + '..' : d.name),
          textposition: 'top center',
          textfont: { size: 9, color: THOR_COLORS.warmGray },
          marker: {
            size: data.map(d => Math.sqrt(d.total_value) / 500 + 10),
            color: data.map((_, i) => RV_COLORS[i % RV_COLORS.length]),
            opacity: 0.8,
            line: { width: 1, color: THOR_COLORS.offWhite },
          },
          hovertemplate: '<b>%{text}</b><br>Units: %{x:,}<br>Avg Price: $%{y:,.0f}<extra></extra>',
        },
      ]}
      layout={{
        ...plotlyLayout,
        height: 300,
        margin: { t: 30, r: 30, b: 50, l: 80 },
        xaxis: {
          title: 'Unit Count',
          gridcolor: THOR_COLORS.borderGray,
          zeroline: false,
        },
        yaxis: {
          title: 'Avg Price ($)',
          tickformat: '$,.0s',
          gridcolor: THOR_COLORS.borderGray,
          zeroline: false,
        },
      }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: '100%' }}
    />
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
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
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
    <div className="mb-6 p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-medium text-[var(--thor-charcoal)]">Active Filter:</span>
          <span className="ml-2 px-2 py-0.5 text-sm rounded bg-purple-600 text-white">
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
      <Plot
        data={[
          {
            type: 'indicator',
            mode: 'gauge+number',
            value: newPct,
            title: { text: 'NEW %', font: { size: 14, color: THOR_COLORS.warmGray } },
            number: { suffix: '%', font: { size: 28, color: THOR_COLORS.charcoal } },
            gauge: {
              axis: { range: [0, 100], tickwidth: 1, tickcolor: THOR_COLORS.borderGray },
              bar: { color: THOR_COLORS.sage },
              bgcolor: THOR_COLORS.lightBeige,
              borderwidth: 0,
              steps: [
                { range: [0, newPct], color: THOR_COLORS.sage },
                { range: [newPct, 100], color: THOR_COLORS.gold },
              ],
            },
          },
        ]}
        layout={{
          ...plotlyLayout,
          height: 180,
          margin: { t: 40, r: 20, b: 0, l: 20 },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%' }}
      />

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
function AnalyticsContentG({ summaryData, inventoryItems, loading: initialLoading }: AnalyticsTabGProps) {
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
        <KPICard title="States" value={String(displayData.by_state.length)} subtitle="Geographic reach" icon="🗺️" color="sage" />
      </div>

      {/* Interactive USA Map */}
      {displayData.by_state && displayData.by_state.length > 0 && (
        <USAMap
          data={displayData.by_state}
          onStateSelect={(state) => setFilter('state', state, 'plotlyMap')}
          selectedState={filter.dimension === 'state' ? filter.value : null}
          height={380}
          colorScheme="steel"
          showLegend={true}
          darkMode={false}
          title="Geographic Intelligence"
          subtitle="Plotly-powered interactive map"
        />
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Market Share by RV Type" subtitle="Click to filter" badge="Plotly Donut">
          <PlotlyDonutChart data={displayData.by_rv_type} onSelect={(name) => setFilter('rv_type', name, 'donut')} />
        </ChartCard>

        <ChartCard title="Condition Analysis" subtitle="NEW vs USED" badge="Plotly Gauge">
          <ConditionCards data={displayData.by_condition} onSelect={(condition) => setFilter('condition', condition, 'card')} />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Geographic Sunburst" subtitle="Click to filter" badge="Plotly Sunburst">
          <PlotlySunburst data={displayData.by_state} onSelect={(name) => setFilter('state', name, 'sunburst')} />
        </ChartCard>

        <ChartCard title="Price Distribution" subtitle="Box plot by condition" badge="Plotly Box">
          <PlotlyBoxPlot data={displayInventory} />
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Manufacturers" subtitle="By unit count" badge="Plotly Bar">
          <PlotlyBarChart data={displayData.by_manufacturer} onSelect={(name) => setFilter('manufacturer', name, 'bar')} color={THOR_COLORS.steel} />
        </ChartCard>

        <ChartCard title="Price vs Volume" subtitle="Bubble chart" badge="Plotly Scatter">
          <PlotlyScatter data={displayData.by_rv_type} />
        </ChartCard>
      </div>

      {/* Charts Row 4 */}
      <ChartCard title="Top Dealer Groups" subtitle="By unit count" badge="Plotly Bar">
        <PlotlyBarChart data={displayData.by_dealer_group} onSelect={(name) => setFilter('dealer_group', name, 'bar')} color={THOR_COLORS.sage} />
      </ChartCard>

      {/* Footer */}
      <div className="p-4 rounded-xl bg-[var(--thor-light-beige)] flex items-center justify-between">
        <p className="text-sm text-[var(--thor-warm-gray)]">
          Displaying <span className="font-semibold text-[var(--thor-charcoal)]">{formatNumber(displayData.total_units)}</span> units
        </p>
        <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">
          Version G (Plotly)
        </span>
      </div>
    </div>
  )
}

export function AnalyticsTabG(props: AnalyticsTabGProps) {
  return (
    <CrossFilterProvider>
      <AnalyticsContentG {...props} />
    </CrossFilterProvider>
  )
}
