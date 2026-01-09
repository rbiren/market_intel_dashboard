// Version E: Nivo - Beautiful defaults, declarative API
// D3-based with excellent out-of-box styling

import { useState, useEffect, useCallback } from 'react'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveTreeMap } from '@nivo/treemap'
import { ResponsiveRadar } from '@nivo/radar'
import { CrossFilterProvider, useCrossFilter } from '../../context/CrossFilterContext'

const API_BASE = 'http://localhost:8000'

// Thor Industries color palette for Nivo
const THOR_NIVO_COLORS = [
  '#495737', // sage
  '#a46807', // gold
  '#577d91', // steel
  '#8c8a7e', // medium gray
  '#6b7a5e', // light sage
  '#c4850d', // light gold
  '#4a6673', // dark steel
  '#595755', // warm gray
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
}

interface AnalyticsTabEProps {
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

// Nivo Pie Chart
function NivoPieChart({ data, onSelect }: { data: AggregationItem[], onSelect?: (name: string) => void }) {
  const pieData = data.map((item, index) => ({
    id: item.name,
    label: item.name,
    value: item.count,
    color: THOR_NIVO_COLORS[index % THOR_NIVO_COLORS.length],
    avgPrice: item.avg_price,
    totalValue: item.total_value,
  }))

  return (
    <div style={{ height: 350 }}>
      <ResponsivePie
        data={pieData}
        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
        innerRadius={0.6}
        padAngle={1}
        cornerRadius={4}
        activeOuterRadiusOffset={8}
        colors={THOR_NIVO_COLORS}
        borderWidth={2}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#595755"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor="#ffffff"
        onClick={(node) => onSelect?.(node.id as string)}
        tooltip={({ datum }) => (
          <div className="bg-[var(--thor-charcoal)] text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="font-semibold mb-2">{datum.id}</div>
            <div className="text-sm space-y-1">
              <div>Units: <span className="font-medium">{formatNumber(datum.value)}</span></div>
              <div>Share: <span className="font-medium">{((datum.value / data.reduce((s, d) => s + d.count, 0)) * 100).toFixed(1)}%</span></div>
              <div>Avg Price: <span className="font-medium">{formatPrice(datum.data.avgPrice)}</span></div>
            </div>
          </div>
        )}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            justify: false,
            translateX: 0,
            translateY: 56,
            itemsSpacing: 0,
            itemWidth: 100,
            itemHeight: 18,
            itemTextColor: '#595755',
            itemDirection: 'left-to-right',
            itemOpacity: 1,
            symbolSize: 12,
            symbolShape: 'circle',
          },
        ]}
        motionConfig="gentle"
      />
    </div>
  )
}

// Nivo Bar Chart
function NivoBarChart({
  data,
  onSelect,
  layout = 'horizontal'
}: {
  data: AggregationItem[]
  onSelect?: (name: string) => void
  layout?: 'horizontal' | 'vertical'
}) {
  const barData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map(item => ({
      name: item.name.length > 18 ? item.name.slice(0, 16) + '...' : item.name,
      fullName: item.name,
      count: item.count,
      avgPrice: item.avg_price,
    }))
    .reverse()

  return (
    <div style={{ height: 300 }}>
      <ResponsiveBar
        data={barData}
        keys={['count']}
        indexBy="name"
        layout={layout}
        margin={{ top: 10, right: 30, bottom: 40, left: layout === 'horizontal' ? 130 : 60 }}
        padding={0.3}
        colors={['#495737']}
        borderRadius={4}
        borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: 0,
          format: (v) => layout === 'horizontal' ? formatNumber(Number(v)) : v,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: 0,
          format: (v) => layout === 'horizontal' ? v : formatNumber(Number(v)),
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor="#ffffff"
        onClick={(node) => {
          const item = barData.find(d => d.name === node.indexValue)
          if (item && onSelect) onSelect(item.fullName)
        }}
        tooltip={({ value, data }) => (
          <div className="bg-[var(--thor-charcoal)] text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="font-semibold mb-2">{data.fullName}</div>
            <div className="text-sm space-y-1">
              <div>Units: <span className="font-medium">{formatNumber(value)}</span></div>
              <div>Avg Price: <span className="font-medium">{formatPrice(data.avgPrice)}</span></div>
            </div>
          </div>
        )}
        theme={{
          axis: {
            ticks: {
              text: { fill: '#595755', fontSize: 11 },
            },
          },
          grid: {
            line: { stroke: '#d9d6cf', strokeWidth: 1 },
          },
        }}
        motionConfig="gentle"
      />
    </div>
  )
}

// Nivo TreeMap
function NivoTreeMap({ data, onSelect }: { data: AggregationItem[], onSelect?: (name: string) => void }) {
  const treeData = {
    name: 'States',
    children: data.slice(0, 15).map((item, index) => ({
      name: item.name,
      value: item.count,
      color: THOR_NIVO_COLORS[index % THOR_NIVO_COLORS.length],
    })),
  }

  return (
    <div style={{ height: 300 }}>
      <ResponsiveTreeMap
        data={treeData}
        identity="name"
        value="value"
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        labelSkipSize={30}
        labelTextColor="#ffffff"
        parentLabelPosition="top"
        parentLabelTextColor="#ffffff"
        colors={THOR_NIVO_COLORS}
        borderWidth={2}
        borderColor="#ffffff"
        nodeOpacity={0.9}
        onClick={(node) => onSelect?.(node.id as string)}
        tooltip={({ node }) => (
          <div className="bg-[var(--thor-charcoal)] text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="font-semibold">{node.id}</div>
            <div className="text-sm">Units: {formatNumber(node.value)}</div>
          </div>
        )}
        motionConfig="gentle"
      />
    </div>
  )
}

// Nivo Radar Chart
function NivoRadarChart({ data }: { data: AggregationItem[] }) {
  const radarData = data.slice(0, 8).map(item => ({
    category: item.name.length > 12 ? item.name.slice(0, 10) + '...' : item.name,
    avgPrice: item.avg_price,
  }))

  return (
    <div style={{ height: 300 }}>
      <ResponsiveRadar
        data={radarData}
        keys={['avgPrice']}
        indexBy="category"
        maxValue="auto"
        margin={{ top: 30, right: 60, bottom: 30, left: 60 }}
        curve="linearClosed"
        borderWidth={2}
        borderColor="#495737"
        gridLevels={4}
        gridShape="circular"
        gridLabelOffset={12}
        dotSize={8}
        dotColor="#495737"
        dotBorderWidth={2}
        dotBorderColor="#ffffff"
        colors={['#495737']}
        fillOpacity={0.25}
        blendMode="normal"
        motionConfig="gentle"
        theme={{
          axis: {
            ticks: {
              text: { fill: '#595755', fontSize: 10 },
            },
          },
          grid: {
            line: { stroke: '#d9d6cf' },
          },
        }}
        valueFormat={(v) => formatPrice(v)}
      />
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
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--thor-medium-gray)]">
            {title}
          </p>
          <p className="text-2xl font-bold text-[var(--thor-charcoal)] mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-[var(--thor-warm-gray)] mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[color]} flex items-center justify-center`}>
          <span className="text-lg">{icon}</span>
        </div>
      </div>
    </div>
  )
}

// Chart Card wrapper
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
          {subtitle && (
            <p className="text-xs text-[var(--thor-medium-gray)] mt-0.5">{subtitle}</p>
          )}
        </div>
        {badge && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--thor-gold)]/10 text-[var(--thor-gold)]">
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
    <div className="mb-6 p-4 rounded-xl bg-[var(--thor-gold)]/10 border border-[var(--thor-gold)]/30 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--thor-gold)] flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-medium text-[var(--thor-charcoal)]">Active Filter:</span>
          <span className="ml-2 px-2 py-0.5 text-sm rounded bg-[var(--thor-gold)] text-white">
            {filter.dimension}: {filter.value}
          </span>
        </div>
      </div>
      <button onClick={clearFilter} className="btn-thor-ghost text-sm">
        Clear Filter
      </button>
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
      <div className="relative h-6 rounded-full overflow-hidden bg-[var(--thor-light-beige)]">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-[var(--thor-sage)] to-[#5a6b45] transition-all duration-700"
          style={{ width: `${newPct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect?.('NEW')}
          className="p-5 rounded-xl border-2 border-[var(--thor-sage)]/30 bg-gradient-to-br from-[var(--thor-sage)]/10 to-transparent hover:from-[var(--thor-sage)]/20 transition-all"
        >
          <div className="text-left">
            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-[var(--thor-sage)] text-white mb-2">NEW</span>
            <p className="text-3xl font-bold text-[var(--thor-charcoal)]">{formatNumber(newData?.count || 0)}</p>
            <p className="text-sm text-[var(--thor-medium-gray)] mt-1">{newPct.toFixed(1)}% of inventory</p>
            <p className="text-sm text-[var(--thor-sage)] font-medium mt-2">Avg: {formatPrice(newData?.avg_price || 0)}</p>
          </div>
        </button>

        <button
          onClick={() => onSelect?.('USED')}
          className="p-5 rounded-xl border-2 border-[var(--thor-gold)]/30 bg-gradient-to-br from-[var(--thor-gold)]/10 to-transparent hover:from-[var(--thor-gold)]/20 transition-all"
        >
          <div className="text-left">
            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-[var(--thor-gold)] text-white mb-2">USED</span>
            <p className="text-3xl font-bold text-[var(--thor-charcoal)]">{formatNumber(usedData?.count || 0)}</p>
            <p className="text-sm text-[var(--thor-medium-gray)] mt-1">{(100 - newPct).toFixed(1)}% of inventory</p>
            <p className="text-sm text-[var(--thor-gold)] font-medium mt-2">Avg: {formatPrice(usedData?.avg_price || 0)}</p>
          </div>
        </button>
      </div>
    </div>
  )
}

// Main Content
function AnalyticsContentE({ summaryData, loading: initialLoading }: AnalyticsTabEProps) {
  const { filter, setFilter, isAnyFiltered } = useCrossFilter()
  const [filteredSummary, setFilteredSummary] = useState<AggregatedSummary | null>(null)
  const [filterLoading, setFilterLoading] = useState(false)

  const fetchFilteredData = useCallback(async () => {
    if (!isAnyFiltered()) {
      setFilteredSummary(null)
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

      const response = await fetch(`${API_BASE}/inventory/aggregated?${params}`)
      const data = await response.json()
      setFilteredSummary(data)
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
        <KPICard title="Price Range" value={`${formatCompact(displayData.min_price)} - ${formatCompact(displayData.max_price)}`} subtitle="Min to Max" icon="📈" color="sage" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Market Share by RV Type" subtitle="Click segments to filter" badge="Nivo Pie">
          <NivoPieChart data={displayData.by_rv_type} onSelect={(name) => setFilter('rv_type', name, 'pie')} />
        </ChartCard>

        <ChartCard title="Condition Analysis" subtitle="NEW vs USED" badge="Nivo">
          <ConditionCards data={displayData.by_condition} onSelect={(condition) => setFilter('condition', condition, 'card')} />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Geographic Distribution" subtitle="By state" badge="Nivo TreeMap">
          <NivoTreeMap data={displayData.by_state} onSelect={(name) => setFilter('state', name, 'treemap')} />
        </ChartCard>

        <ChartCard title="Top Manufacturers" subtitle="By unit count" badge="Nivo Bar">
          <NivoBarChart data={displayData.by_manufacturer} onSelect={(name) => setFilter('manufacturer', name, 'bar')} />
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Dealer Groups" subtitle="By unit count" badge="Nivo Bar">
          <NivoBarChart data={displayData.by_dealer_group} onSelect={(name) => setFilter('dealer_group', name, 'bar')} />
        </ChartCard>

        <ChartCard title="Price by RV Type" subtitle="Radar comparison" badge="Nivo Radar">
          <NivoRadarChart data={displayData.by_rv_type} />
        </ChartCard>
      </div>

      {/* Footer */}
      <div className="p-4 rounded-xl bg-[var(--thor-light-beige)] flex items-center justify-between">
        <p className="text-sm text-[var(--thor-warm-gray)]">
          Displaying <span className="font-semibold text-[var(--thor-charcoal)]">{formatNumber(displayData.total_units)}</span> units
        </p>
        <span className="text-xs px-3 py-1 rounded-full bg-[var(--thor-gold)]/10 text-[var(--thor-gold)] font-semibold">
          Version E (Nivo)
        </span>
      </div>
    </div>
  )
}

export function AnalyticsTabE(props: AnalyticsTabEProps) {
  return (
    <CrossFilterProvider>
      <AnalyticsContentE {...props} />
    </CrossFilterProvider>
  )
}
