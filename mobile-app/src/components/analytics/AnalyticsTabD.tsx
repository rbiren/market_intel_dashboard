// Version D: Visx (D3 + React by Airbnb)
// Low-level D3 primitives as React components for maximum customization

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Pie } from '@visx/shape'
import { Group } from '@visx/group'
import { scaleOrdinal, scaleBand, scaleLinear } from '@visx/scale'
import { AxisLeft } from '@visx/axis'
import { GridRows } from '@visx/grid'
import { localPoint } from '@visx/event'
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip'
import { ParentSize } from '@visx/responsive'
import { LinearGradient } from '@visx/gradient'
import { CrossFilterProvider, useCrossFilter } from '../../context/CrossFilterContext'

const API_BASE = 'http://localhost:8000'

// Thor Industries color palette
const COLORS = {
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
  rv_class?: string | null
}

interface AnalyticsTabDProps {
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

const tooltipStyles = {
  ...defaultStyles,
  background: COLORS.charcoal,
  border: `1px solid ${COLORS.borderGray}`,
  color: COLORS.offWhite,
  padding: '12px 16px',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
}

// Visx Donut Chart Component
function VisxDonutChart({ data, onSelect }: { data: AggregationItem[], onSelect?: (name: string) => void }) {
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<AggregationItem>()

  const total = data.reduce((sum, d) => sum + d.count, 0)
  const colorScale = scaleOrdinal({
    domain: data.map(d => d.name),
    range: RV_COLORS,
  })

  return (
    <div className="relative">
      <ParentSize>
        {({ width }) => {
          const height = 320
          const radius = Math.min(width, height) / 2 - 40
          const innerRadius = radius * 0.6

          return (
            <svg width={width} height={height}>
              <LinearGradient id="visx-sage-gradient" from={COLORS.sage} to="#3d4a2e" />
              <Group top={height / 2} left={width / 2}>
                <Pie
                  data={data}
                  pieValue={(d) => d.count}
                  outerRadius={radius}
                  innerRadius={innerRadius}
                  padAngle={0.02}
                  cornerRadius={4}
                >
                  {(pie) =>
                    pie.arcs.map((arc, index) => {
                      const [centroidX, centroidY] = pie.path.centroid(arc)
                      const arcPath = pie.path(arc) || ''
                      const arcFill = colorScale(arc.data.name)

                      return (
                        <g key={`arc-${arc.data.name}-${index}`}>
                          <path
                            d={arcPath}
                            fill={arcFill}
                            stroke={COLORS.charcoal}
                            strokeWidth={2}
                            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                            onMouseEnter={(event) => {
                              const coords = localPoint(event)
                              showTooltip({
                                tooltipData: arc.data,
                                tooltipLeft: coords?.x,
                                tooltipTop: coords?.y,
                              })
                            }}
                            onMouseLeave={hideTooltip}
                            onClick={() => onSelect?.(arc.data.name)}
                          />
                          {arc.endAngle - arc.startAngle > 0.3 && (
                            <text
                              x={centroidX}
                              y={centroidY}
                              fill={COLORS.offWhite}
                              fontSize={11}
                              fontWeight={600}
                              textAnchor="middle"
                              pointerEvents="none"
                            >
                              {((arc.data.count / total) * 100).toFixed(0)}%
                            </text>
                          )}
                        </g>
                      )
                    })
                  }
                </Pie>
                {/* Center text */}
                <text
                  textAnchor="middle"
                  fill={COLORS.charcoal}
                  fontSize={12}
                  dy={-10}
                  fontWeight={500}
                >
                  Total Units
                </text>
                <text
                  textAnchor="middle"
                  fill={COLORS.charcoal}
                  fontSize={24}
                  fontWeight={700}
                  dy={20}
                >
                  {formatNumber(total)}
                </text>
              </Group>
            </svg>
          )
        }}
      </ParentSize>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <div className="font-semibold mb-2">{tooltipData.name}</div>
          <div className="text-sm space-y-1">
            <div>Units: <span className="font-medium">{formatNumber(tooltipData.count)}</span></div>
            <div>Share: <span className="font-medium">{((tooltipData.count / total) * 100).toFixed(1)}%</span></div>
            <div>Avg Price: <span className="font-medium">{formatPrice(tooltipData.avg_price)}</span></div>
          </div>
        </TooltipWithBounds>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {data.slice(0, 6).map((item, i) => (
          <button
            key={item.name}
            onClick={() => onSelect?.(item.name)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--thor-light-beige)] transition-colors"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: RV_COLORS[i % RV_COLORS.length] }}
            />
            <span className="text-xs text-[var(--thor-warm-gray)]">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Visx Bar Chart Component
function VisxBarChart({
  data,
  onSelect,
  color = COLORS.sage
}: {
  data: AggregationItem[]
  onSelect?: (name: string) => void
  color?: string
}) {
  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<AggregationItem>()

  const sortedData = useMemo(() =>
    [...data].sort((a, b) => b.count - a.count).slice(0, 8),
    [data]
  )

  return (
    <div className="relative">
    <ParentSize>
      {({ width }) => {
        const height = 300
        const margin = { top: 20, right: 30, bottom: 40, left: 120 }
        const xMax = Math.max(0, width - margin.left - margin.right)
        const yMax = Math.max(0, height - margin.top - margin.bottom)

        if (xMax <= 0 || yMax <= 0) return null

        const xScale = scaleLinear({
          domain: [0, Math.max(...sortedData.map(d => d.count))],
          range: [0, xMax],
          nice: true,
        })

        const yScale = scaleBand({
          domain: sortedData.map(d => d.name),
          range: [0, yMax],
          padding: 0.3,
        })

        return (
          <svg width={width} height={height}>
            <LinearGradient id="bar-gradient" from={color} to={color} fromOpacity={1} toOpacity={0.7} />
            <Group left={margin.left} top={margin.top}>
              <GridRows
                scale={yScale}
                width={xMax}
                stroke={COLORS.borderGray}
                strokeOpacity={0.3}
              />

              {sortedData.map((d) => {
                const barHeight = yScale.bandwidth()
                const barWidth = Math.max(0, xScale(d.count) || 0)
                const barY = yScale(d.name) || 0

                return (
                  <g key={d.name}>
                    <rect
                      x={0}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fill="url(#bar-gradient)"
                      rx={4}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(event) => {
                        const coords = localPoint(event)
                        showTooltip({
                          tooltipData: d,
                          tooltipLeft: coords?.x,
                          tooltipTop: coords?.y,
                        })
                      }}
                      onMouseLeave={hideTooltip}
                      onClick={() => onSelect?.(d.name)}
                    />
                    <text
                      x={barWidth + 8}
                      y={barY + barHeight / 2}
                      dy="0.35em"
                      fill={COLORS.charcoal}
                      fontSize={11}
                      fontWeight={500}
                    >
                      {formatNumber(d.count)}
                    </text>
                  </g>
                )
              })}

              <AxisLeft
                scale={yScale}
                stroke={COLORS.borderGray}
                tickStroke="transparent"
                tickLabelProps={() => ({
                  fill: COLORS.warmGray,
                  fontSize: 11,
                  textAnchor: 'end',
                  dy: '0.35em',
                  dx: -8,
                })}
                tickFormat={(value) =>
                  String(value).length > 15 ? String(value).slice(0, 13) + '...' : String(value)
                }
              />
            </Group>
          </svg>
        )
      }}
    </ParentSize>
    {tooltipOpen && tooltipData && (
      <TooltipWithBounds
        top={tooltipTop}
        left={tooltipLeft}
        style={{
          ...defaultStyles,
          backgroundColor: COLORS.charcoal,
          color: COLORS.offWhite,
          borderRadius: '8px',
          padding: '8px 12px',
        }}
      >
        <div className="text-xs">
          <div className="font-semibold">{tooltipData.name}</div>
          <div>{formatNumber(tooltipData.count)} units</div>
        </div>
      </TooltipWithBounds>
    )}
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
      {/* Progress bar */}
      <div className="relative h-4 rounded-full overflow-hidden bg-[var(--thor-light-beige)]">
        <div
          className="absolute left-0 top-0 h-full bg-[var(--thor-sage)] transition-all duration-500"
          style={{ width: `${newPct}%` }}
        />
        <div
          className="absolute right-0 top-0 h-full bg-[var(--thor-gold)] transition-all duration-500"
          style={{ width: `${100 - newPct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onSelect?.('NEW')}
          className="p-4 rounded-xl border-2 border-[var(--thor-sage)]/30 bg-[var(--thor-sage)]/5 hover:bg-[var(--thor-sage)]/10 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-[var(--thor-sage)]" />
            <span className="font-semibold text-[var(--thor-sage)]">NEW</span>
          </div>
          <p className="text-2xl font-bold text-[var(--thor-charcoal)]">
            {formatNumber(newData?.count || 0)}
          </p>
          <p className="text-sm text-[var(--thor-medium-gray)]">
            {newPct.toFixed(1)}% • Avg: {formatPrice(newData?.avg_price || 0)}
          </p>
        </button>

        <button
          onClick={() => onSelect?.('USED')}
          className="p-4 rounded-xl border-2 border-[var(--thor-gold)]/30 bg-[var(--thor-gold)]/5 hover:bg-[var(--thor-gold)]/10 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-[var(--thor-gold)]" />
            <span className="font-semibold text-[var(--thor-gold)]">USED</span>
          </div>
          <p className="text-2xl font-bold text-[var(--thor-charcoal)]">
            {formatNumber(usedData?.count || 0)}
          </p>
          <p className="text-sm text-[var(--thor-medium-gray)]">
            {(100 - newPct).toFixed(1)}% • Avg: {formatPrice(usedData?.avg_price || 0)}
          </p>
        </button>
      </div>
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
    <div className="card-thor p-5 relative overflow-hidden group hover:shadow-lg transition-all">
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
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--thor-sage)]/10 text-[var(--thor-sage)]">
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
    <div className="mb-6 p-4 rounded-xl bg-[var(--thor-sage)]/10 border border-[var(--thor-sage)]/30 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--thor-sage)] flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-medium text-[var(--thor-charcoal)]">Active Filter:</span>
          <span className="ml-2 px-2 py-0.5 text-sm rounded bg-[var(--thor-sage)] text-white">
            {filter.dimension}: {filter.value}
          </span>
        </div>
      </div>
      <button
        onClick={clearFilter}
        className="btn-thor-ghost text-sm"
      >
        Clear Filter
      </button>
    </div>
  )
}

// Main Content
function AnalyticsContentD({ summaryData, loading: initialLoading }: AnalyticsTabDProps) {
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-80 bg-[var(--thor-light-beige)] rounded-xl animate-pulse" />
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
        <KPICard
          title="Total Units"
          value={formatNumber(displayData.total_units)}
          subtitle="In inventory"
          icon="📦"
          color="sage"
        />
        <KPICard
          title="Total Value"
          value={formatCompact(displayData.total_value)}
          subtitle="Market value"
          icon="💰"
          color="gold"
        />
        <KPICard
          title="Average Price"
          value={formatPrice(displayData.avg_price)}
          subtitle="Per unit"
          icon="📊"
          color="steel"
        />
        <KPICard
          title="Price Range"
          value={`${formatCompact(displayData.min_price)} - ${formatCompact(displayData.max_price)}`}
          subtitle="Min to Max"
          icon="📈"
          color="sage"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Market Share by RV Type" subtitle="Click to filter" badge="Visx Pie">
          <VisxDonutChart
            data={displayData.by_rv_type}
            onSelect={(name) => setFilter('rv_type', name, 'pie')}
          />
        </ChartCard>

        <ChartCard title="Condition Analysis" subtitle="NEW vs USED" badge="Visx">
          <ConditionCards
            data={displayData.by_condition}
            onSelect={(condition) => setFilter('condition', condition, 'card')}
          />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Manufacturers" subtitle="By unit count" badge="Visx Bar">
          <VisxBarChart
            data={displayData.by_manufacturer}
            onSelect={(name) => setFilter('manufacturer', name, 'bar')}
            color={COLORS.steel}
          />
        </ChartCard>

        <ChartCard title="Top Dealer Groups" subtitle="By unit count" badge="Visx Bar">
          <VisxBarChart
            data={displayData.by_dealer_group}
            onSelect={(name) => setFilter('dealer_group', name, 'bar')}
            color={COLORS.sage}
          />
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <ChartCard title="Top States" subtitle="By inventory count" badge="Visx Bar">
        <VisxBarChart
          data={displayData.by_state}
          onSelect={(name) => setFilter('state', name, 'bar')}
          color={COLORS.gold}
        />
      </ChartCard>

      {/* Footer */}
      <div className="p-4 rounded-xl bg-[var(--thor-light-beige)] flex items-center justify-between">
        <p className="text-sm text-[var(--thor-warm-gray)]">
          Displaying <span className="font-semibold text-[var(--thor-charcoal)]">{formatNumber(displayData.total_units)}</span> units
        </p>
        <span className="text-xs px-3 py-1 rounded-full bg-[var(--thor-sage)]/10 text-[var(--thor-sage)] font-semibold">
          Version D (Visx)
        </span>
      </div>
    </div>
  )
}

export function AnalyticsTabD(props: AnalyticsTabDProps) {
  return (
    <CrossFilterProvider>
      <AnalyticsContentD {...props} />
    </CrossFilterProvider>
  )
}
