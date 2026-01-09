// Version F: Victory - Composable React components by Formidable
// Consistent styling, great animations, React Native compatible

import { useState, useEffect, useCallback } from 'react'
import {
  VictoryPie,
  VictoryBar,
  VictoryChart,
  VictoryAxis,
  VictoryTheme,
  VictoryLabel,
  VictoryArea,
  VictoryGroup,
  VictoryLegend,
} from 'victory'
import { CrossFilterProvider, useCrossFilter } from '../../context/CrossFilterContext'

const API_BASE = 'http://localhost:8000'

// Thor Industries color palette
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

interface AnalyticsTabFProps {
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

// Custom Victory Theme based on Thor colors
const thorVictoryTheme = {
  ...VictoryTheme.material,
  axis: {
    ...VictoryTheme.material.axis,
    style: {
      ...VictoryTheme.material.axis?.style,
      axis: { stroke: THOR_COLORS.borderGray },
      grid: { stroke: THOR_COLORS.borderGray, strokeDasharray: '4,4' },
      tickLabels: { fill: THOR_COLORS.warmGray, fontSize: 10 },
    },
  },
}

// Victory Pie Chart
function VictoryPieChart({ data, onSelect }: { data: AggregationItem[], onSelect?: (name: string) => void }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const pieData = data.map((item, index) => ({
    x: item.name,
    y: item.count,
    label: `${item.name}\n${((item.count / total) * 100).toFixed(1)}%`,
    fill: RV_COLORS[index % RV_COLORS.length],
  }))

  return (
    <div className="relative">
      <svg viewBox="0 0 400 350" width="100%" height="350">
        <VictoryPie
          standalone={false}
          data={pieData}
          innerRadius={80}
          padAngle={2}
          cornerRadius={4}
          colorScale={RV_COLORS}
          labelRadius={120}
          style={{
            data: {
              cursor: 'pointer',
              stroke: THOR_COLORS.offWhite,
              strokeWidth: 2,
            },
            labels: {
              fill: THOR_COLORS.warmGray,
              fontSize: 9,
              fontWeight: 500,
            },
          }}
          events={[
            {
              target: 'data',
              eventHandlers: {
                onClick: (_, props) => {
                  onSelect?.(props.datum.x)
                  return []
                },
                onMouseOver: () => [
                  { target: 'data', mutation: { style: { transform: 'scale(1.05)', transformOrigin: 'center' } } },
                ],
                onMouseOut: () => [
                  { target: 'data', mutation: {} },
                ],
              },
            },
          ]}
          animate={{ duration: 500 }}
        />
        {/* Center text */}
        <VictoryLabel
          textAnchor="middle"
          x={200}
          y={175}
          text={[formatNumber(total), 'Total Units']}
          style={[
            { fill: THOR_COLORS.charcoal, fontSize: 24, fontWeight: 700 },
            { fill: THOR_COLORS.mediumGray, fontSize: 12 },
          ]}
        />
      </svg>
    </div>
  )
}

// Victory Bar Chart
function VictoryBarChart({
  data,
  onSelect,
  color = THOR_COLORS.sage
}: {
  data: AggregationItem[]
  onSelect?: (name: string) => void
  color?: string
}) {
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .reverse()

  const barData = sortedData.map(item => ({
    x: item.name.length > 15 ? item.name.slice(0, 13) + '...' : item.name,
    y: item.count,
    fullName: item.name,
    avgPrice: item.avg_price,
  }))

  return (
    <VictoryChart
      theme={thorVictoryTheme}
      domainPadding={{ x: 20 }}
      height={300}
      padding={{ top: 20, bottom: 40, left: 130, right: 40 }}
      horizontal
    >
      <VictoryAxis
        style={{
          tickLabels: { fill: THOR_COLORS.warmGray, fontSize: 10 },
          axis: { stroke: 'transparent' },
        }}
      />
      <VictoryAxis
        dependentAxis
        tickFormat={(t) => formatCompactNum(t)}
        style={{
          tickLabels: { fill: THOR_COLORS.mediumGray, fontSize: 10 },
          grid: { stroke: THOR_COLORS.borderGray, strokeDasharray: '4,4' },
        }}
      />
      <VictoryBar
        data={barData}
        style={{
          data: {
            fill: color,
            cursor: 'pointer',
            width: 20,
          },
        }}
        cornerRadius={{ top: 4 }}
        animate={{ duration: 500 }}
        labels={({ datum }) => formatNumber(datum.y)}
        labelComponent={
          <VictoryLabel
            dx={8}
            style={{ fill: THOR_COLORS.charcoal, fontSize: 10 }}
          />
        }
        events={[
          {
            target: 'data',
            eventHandlers: {
              onClick: (_, props) => {
                onSelect?.(props.datum.fullName)
                return []
              },
              onMouseOver: () => [
                { target: 'data', mutation: { style: { fill: `${color}cc` } } },
              ],
              onMouseOut: () => [
                { target: 'data', mutation: {} },
              ],
            },
          },
        ]}
      />
    </VictoryChart>
  )
}

// Victory Area Chart for Price Distribution
function VictoryAreaChart({ data }: { data: InventoryItem[] }) {
  const priceData = data.filter(d => d.sale_price && d.sale_price > 0)

  if (priceData.length === 0) {
    return <div className="h-64 flex items-center justify-center text-[var(--thor-medium-gray)]">No price data</div>
  }

  // Create histogram bins
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

  const newData = newBins.map((count, i) => ({ x: i, y: count }))
  const usedData = usedBins.map((count, i) => ({ x: i, y: count }))

  return (
    <VictoryChart
      theme={thorVictoryTheme}
      height={250}
      padding={{ top: 30, bottom: 50, left: 50, right: 30 }}
    >
      <VictoryLegend
        x={280}
        y={10}
        orientation="horizontal"
        gutter={20}
        data={[
          { name: 'NEW', symbol: { fill: THOR_COLORS.sage } },
          { name: 'USED', symbol: { fill: THOR_COLORS.gold } },
        ]}
        style={{ labels: { fill: THOR_COLORS.warmGray, fontSize: 10 } }}
      />
      <VictoryAxis
        tickFormat={(t) => formatCompact(min + t * binWidth)}
        style={{ tickLabels: { fontSize: 9, angle: -30 } }}
      />
      <VictoryAxis dependentAxis tickFormat={(t) => formatCompactNum(t)} />
      <VictoryGroup>
        <VictoryArea
          data={newData}
          interpolation="natural"
          style={{
            data: {
              fill: THOR_COLORS.sage,
              fillOpacity: 0.4,
              stroke: THOR_COLORS.sage,
              strokeWidth: 2,
            },
          }}
          animate={{ duration: 500 }}
        />
        <VictoryArea
          data={usedData}
          interpolation="natural"
          style={{
            data: {
              fill: THOR_COLORS.gold,
              fillOpacity: 0.4,
              stroke: THOR_COLORS.gold,
              strokeWidth: 2,
            },
          }}
          animate={{ duration: 500 }}
        />
      </VictoryGroup>
    </VictoryChart>
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
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--thor-steel-blue)]/10 text-[var(--thor-steel-blue)]">
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
    <div className="mb-6 p-4 rounded-xl bg-[var(--thor-steel-blue)]/10 border border-[var(--thor-steel-blue)]/30 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--thor-steel-blue)] flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-medium text-[var(--thor-charcoal)]">Active Filter:</span>
          <span className="ml-2 px-2 py-0.5 text-sm rounded bg-[var(--thor-steel-blue)] text-white">
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

  // Mini gauge using Victory
  const gaugeData = [
    { x: 'NEW', y: newPct },
    { x: 'USED', y: 100 - newPct },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <svg viewBox="0 0 200 120" width="200" height="120">
          <VictoryPie
            standalone={false}
            width={200}
            height={200}
            data={gaugeData}
            innerRadius={60}
            startAngle={-90}
            endAngle={90}
            colorScale={[THOR_COLORS.sage, THOR_COLORS.gold]}
            style={{ data: { stroke: THOR_COLORS.offWhite, strokeWidth: 2 } }}
            labels={() => null}
          />
          <VictoryLabel
            textAnchor="middle"
            x={100}
            y={95}
            text={[`${newPct.toFixed(0)}%`, 'NEW']}
            style={[
              { fill: THOR_COLORS.charcoal, fontSize: 24, fontWeight: 700 },
              { fill: THOR_COLORS.mediumGray, fontSize: 12 },
            ]}
          />
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect?.('NEW')}
          className="p-4 rounded-xl border-2 border-[var(--thor-sage)]/30 bg-[var(--thor-sage)]/5 hover:bg-[var(--thor-sage)]/10 transition-all text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-[var(--thor-sage)]" />
            <span className="font-semibold text-[var(--thor-sage)]">NEW</span>
          </div>
          <p className="text-2xl font-bold text-[var(--thor-charcoal)]">{formatNumber(newData?.count || 0)}</p>
          <p className="text-sm text-[var(--thor-medium-gray)]">Avg: {formatPrice(newData?.avg_price || 0)}</p>
        </button>

        <button
          onClick={() => onSelect?.('USED')}
          className="p-4 rounded-xl border-2 border-[var(--thor-gold)]/30 bg-[var(--thor-gold)]/5 hover:bg-[var(--thor-gold)]/10 transition-all text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-[var(--thor-gold)]" />
            <span className="font-semibold text-[var(--thor-gold)]">USED</span>
          </div>
          <p className="text-2xl font-bold text-[var(--thor-charcoal)]">{formatNumber(usedData?.count || 0)}</p>
          <p className="text-sm text-[var(--thor-medium-gray)]">Avg: {formatPrice(usedData?.avg_price || 0)}</p>
        </button>
      </div>
    </div>
  )
}

// Main Content
function AnalyticsContentF({ summaryData, inventoryItems, loading: initialLoading }: AnalyticsTabFProps) {
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
        <KPICard title="RV Types" value={String(displayData.by_rv_type.length)} subtitle="Categories" icon="🚐" color="sage" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Market Share by RV Type" subtitle="Click to filter" badge="Victory Pie">
          <VictoryPieChart data={displayData.by_rv_type} onSelect={(name) => setFilter('rv_type', name, 'pie')} />
        </ChartCard>

        <ChartCard title="Condition Analysis" subtitle="NEW vs USED" badge="Victory Gauge">
          <ConditionCards data={displayData.by_condition} onSelect={(condition) => setFilter('condition', condition, 'card')} />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Manufacturers" subtitle="By unit count" badge="Victory Bar">
          <VictoryBarChart data={displayData.by_manufacturer} onSelect={(name) => setFilter('manufacturer', name, 'bar')} color={THOR_COLORS.steel} />
        </ChartCard>

        <ChartCard title="Top Dealer Groups" subtitle="By unit count" badge="Victory Bar">
          <VictoryBarChart data={displayData.by_dealer_group} onSelect={(name) => setFilter('dealer_group', name, 'bar')} color={THOR_COLORS.sage} />
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Price Distribution" subtitle="NEW vs USED" badge="Victory Area">
          <VictoryAreaChart data={displayInventory} />
        </ChartCard>

        <ChartCard title="Top States" subtitle="By unit count" badge="Victory Bar">
          <VictoryBarChart data={displayData.by_state} onSelect={(name) => setFilter('state', name, 'bar')} color={THOR_COLORS.gold} />
        </ChartCard>
      </div>

      {/* Footer */}
      <div className="p-4 rounded-xl bg-[var(--thor-light-beige)] flex items-center justify-between">
        <p className="text-sm text-[var(--thor-warm-gray)]">
          Displaying <span className="font-semibold text-[var(--thor-charcoal)]">{formatNumber(displayData.total_units)}</span> units
        </p>
        <span className="text-xs px-3 py-1 rounded-full bg-[var(--thor-steel-blue)]/10 text-[var(--thor-steel-blue)] font-semibold">
          Version F (Victory)
        </span>
      </div>
    </div>
  )
}

export function AnalyticsTabF(props: AnalyticsTabFProps) {
  return (
    <CrossFilterProvider>
      <AnalyticsContentF {...props} />
    </CrossFilterProvider>
  )
}
