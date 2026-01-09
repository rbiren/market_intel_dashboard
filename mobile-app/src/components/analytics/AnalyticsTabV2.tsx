import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  Title,
  Text,
  Metric,
  Flex,
  Grid,
  DonutChart,
  BarChart,
  BarList,
  Badge,
  BadgeDelta,
  ProgressBar,
  AreaChart,
} from '@tremor/react'

// Tremor color type
type TremorColor = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'
import { CrossFilterProvider, useCrossFilter } from '../../context/CrossFilterContext'
import { formatChartPrice, formatChartNumber, formatCompactValue } from '../charts/chartUtils'
import { RV_TYPE_COLORS } from '../charts/chartColors'

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
  by_region?: AggregationItem[]
  by_city?: AggregationItem[]
  by_county?: AggregationItem[]
}

interface InventoryItem {
  sale_price: number | null
  condition?: string | null
  rv_class?: string | null
  dealer_group?: string | null
  make?: string | null
  location?: string | null
}

interface AnalyticsTabV2Props {
  summaryData: AggregatedSummary | null
  inventoryItems: InventoryItem[]
  loading: boolean
}

// Color mapping for Tremor (uses predefined color names)
const TREMOR_RV_COLORS: Record<string, TremorColor> = {
  'TRAVEL TRAILER': 'blue',
  'FIFTH WHEEL': 'violet',
  'CLASS C': 'emerald',
  'CLASS A': 'amber',
  'CLASS B': 'red',
  'OTHER': 'gray',
  'CAMPING TRAILER': 'teal',
  'PARK MODEL': 'pink',
}

function FilterBannerV2() {
  const { filter, clearFilter, isAnyFiltered } = useCrossFilter()

  if (!isAnyFiltered()) return null

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <Flex justifyContent="between" alignItems="center">
        <Flex alignItems="center" className="gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <Text className="text-blue-600 font-medium">Active Cross-Filter</Text>
            <Flex className="gap-2 mt-1">
              <Badge color="blue" size="lg">
                {filter.dimension?.replace('_', ' ').toUpperCase()}: {filter.value}
              </Badge>
            </Flex>
          </div>
        </Flex>
        <button
          onClick={clearFilter}
          className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear Filter
        </button>
      </Flex>
    </Card>
  )
}

// KPI Card with sparkline-style indicator
function KPIMetricCard({
  title,
  metric,
  subtitle,
  icon,
  trend,
  color = 'blue'
}: {
  title: string
  metric: string
  subtitle?: string
  icon: string
  trend?: { value: number; direction: 'up' | 'down' | 'unchanged' }
  color?: TremorColor
}) {
  return (
    <Card decoration="top" decorationColor={color} className="hover:shadow-lg transition-shadow">
      <Flex alignItems="start" justifyContent="between">
        <div>
          <Text className="text-gray-500">{title}</Text>
          <Metric className="mt-1">{metric}</Metric>
          {subtitle && <Text className="text-xs text-gray-400 mt-1">{subtitle}</Text>}
          {trend && (
            <BadgeDelta
              deltaType={trend.direction === 'up' ? 'increase' : trend.direction === 'down' ? 'decrease' : 'unchanged'}
              className="mt-2"
            >
              {trend.value}%
            </BadgeDelta>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-${color}-50`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </Flex>
    </Card>
  )
}

// Enhanced Donut Chart with click-to-filter
function RVTypeDonut({ data }: { data: AggregationItem[] }) {
  const { setFilter, isFiltered } = useCrossFilter()

  const chartData = data.map(item => ({
    name: item.name,
    value: item.count,
    avgPrice: item.avg_price,
    totalValue: item.total_value
  }))

  const colors = data.map(item => TREMOR_RV_COLORS[item.name] || 'slate')

  const total = data.reduce((sum, item) => sum + item.count, 0)

  const handleClick = (item: { name: string }) => {
    setFilter('rv_type', item.name, 'donut')
  }

  const valueFormatter = (value: number) => formatChartNumber(value)

  return (
    <div className="relative">
      <DonutChart
        data={chartData}
        category="value"
        index="name"
        colors={colors}
        valueFormatter={valueFormatter}
        showLabel={true}
        showAnimation={true}
        className="h-72"
        onValueChange={(v) => v && handleClick(v)}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <Text className="text-gray-500 text-xs">Total Units</Text>
          <Metric className="text-2xl">{formatCompactValue(total, 'count')}</Metric>
        </div>
      </div>
      {/* Legend with clickable items */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.slice(0, 6).map(item => {
          const isActive = isFiltered('rv_type', item.name)
          const percentage = ((item.count / total) * 100).toFixed(1)
          return (
            <button
              key={item.name}
              onClick={() => handleClick({ name: item.name })}
              className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-50 ring-2 ring-blue-500'
                  : 'hover:bg-gray-50'
              }`}
            >
              <Flex className="gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: RV_TYPE_COLORS[item.name] || '#6B7280' }}
                />
                <Text className="text-xs truncate max-w-[100px]">{item.name}</Text>
              </Flex>
              <Badge color={TREMOR_RV_COLORS[item.name] || 'slate'} size="xs">
                {percentage}%
              </Badge>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Condition Comparison with progress bars
function ConditionAnalysis({ data }: { data: AggregationItem[] }) {
  const { setFilter, isFiltered } = useCrossFilter()

  const newData = data.find(c => c.name === 'NEW')
  const usedData = data.find(c => c.name === 'USED')

  const total = (newData?.count || 0) + (usedData?.count || 0)
  const newPct = total > 0 ? ((newData?.count || 0) / total) * 100 : 0
  const usedPct = total > 0 ? ((usedData?.count || 0) / total) * 100 : 0

  return (
    <div className="space-y-4">
      {/* NEW Card */}
      <button
        onClick={() => setFilter('condition', 'NEW', 'condition-card')}
        className={`w-full text-left p-4 rounded-xl transition-all ${
          isFiltered('condition', 'NEW')
            ? 'bg-emerald-50 ring-2 ring-emerald-500'
            : 'bg-gradient-to-br from-emerald-50 to-green-50 hover:shadow-md'
        }`}
      >
        <Flex justifyContent="between" alignItems="start">
          <div>
            <Badge color="emerald" size="lg">NEW</Badge>
            <Metric className="mt-2 text-emerald-900">{formatChartNumber(newData?.count || 0)}</Metric>
            <Text className="text-emerald-700">Avg: {formatChartPrice(newData?.avg_price)}</Text>
          </div>
          <div className="text-right">
            <Text className="text-emerald-600 font-semibold text-2xl">{newPct.toFixed(1)}%</Text>
            <Text className="text-emerald-500 text-xs">of inventory</Text>
          </div>
        </Flex>
        <ProgressBar value={newPct} color="emerald" className="mt-3" />
      </button>

      {/* USED Card */}
      <button
        onClick={() => setFilter('condition', 'USED', 'condition-card')}
        className={`w-full text-left p-4 rounded-xl transition-all ${
          isFiltered('condition', 'USED')
            ? 'bg-orange-50 ring-2 ring-orange-500'
            : 'bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-md'
        }`}
      >
        <Flex justifyContent="between" alignItems="start">
          <div>
            <Badge color="orange" size="lg">USED</Badge>
            <Metric className="mt-2 text-orange-900">{formatChartNumber(usedData?.count || 0)}</Metric>
            <Text className="text-orange-700">Avg: {formatChartPrice(usedData?.avg_price)}</Text>
          </div>
          <div className="text-right">
            <Text className="text-orange-600 font-semibold text-2xl">{usedPct.toFixed(1)}%</Text>
            <Text className="text-orange-500 text-xs">of inventory</Text>
          </div>
        </Flex>
        <ProgressBar value={usedPct} color="orange" className="mt-3" />
      </button>

      {/* Price Comparison Bar */}
      <Card className="mt-4">
        <Title className="text-sm">Average Price Comparison</Title>
        <BarChart
          data={[
            { condition: 'NEW', price: newData?.avg_price || 0 },
            { condition: 'USED', price: usedData?.avg_price || 0 }
          ]}
          index="condition"
          categories={['price']}
          colors={['emerald', 'orange']}
          valueFormatter={(v) => formatChartPrice(v)}
          showLegend={false}
          className="h-24 mt-3"
          layout="vertical"
        />
      </Card>
    </div>
  )
}

// Top Items as BarList (cleaner than bar chart)
function TopItemsBarList({
  data,
  dimension,
  title,
  color = 'blue',
  maxItems = 8
}: {
  data: AggregationItem[]
  dimension: 'manufacturer' | 'dealer_group' | 'state'
  title: string
  color?: TremorColor
  maxItems?: number
}) {
  const { setFilter, isFiltered } = useCrossFilter()

  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems)

  const barListData = sortedData.map(item => ({
    name: item.name,
    value: item.count,
    color: isFiltered(dimension, item.name) ? color : 'slate',
    icon: () => isFiltered(dimension, item.name) ? (
      <span className="mr-2">*</span>
    ) : null
  }))

  const handleClick = (item: { name: string }) => {
    setFilter(dimension, item.name, 'barlist')
  }

  return (
    <div>
      <Flex justifyContent="between" className="mb-3">
        <Title className="text-sm">{title}</Title>
        <Badge color={color}>{data.length} total</Badge>
      </Flex>
      <BarList
        data={barListData}
        valueFormatter={(v) => formatChartNumber(v)}
        showAnimation={true}
        className="mt-2"
        onValueChange={(v) => v && handleClick(v)}
      />
    </div>
  )
}

// Geographic Heatmap as BarChart
function GeographicDistribution({ data }: { data: AggregationItem[] }) {
  const { setFilter } = useCrossFilter()

  const topStates = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const chartData = topStates.map(item => ({
    state: item.name.length > 12 ? item.name.slice(0, 10) + '...' : item.name,
    fullName: item.name,
    units: item.count,
    value: item.total_value
  }))

  return (
    <div>
      <Flex justifyContent="between" className="mb-3">
        <Title className="text-sm">Top States by Inventory</Title>
        <Badge color="cyan">{data.length} states</Badge>
      </Flex>
      <BarChart
        data={chartData}
        index="state"
        categories={['units']}
        colors={['cyan']}
        valueFormatter={(v) => formatChartNumber(v)}
        showLegend={false}
        showGridLines={false}
        className="h-64"
        onValueChange={(v) => {
          if (v) {
            const fullItem = chartData.find(d => d.state === v.state)
            if (fullItem) {
              setFilter('state', fullItem.fullName, 'geo-chart')
            }
          }
        }}
      />
    </div>
  )
}

// Region Distribution as DonutChart
function RegionDistribution({ data }: { data: AggregationItem[] }) {
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const chartData = sortedData.map(item => ({
    name: item.name,
    value: item.count,
    avgPrice: item.avg_price
  }))

  const total = sortedData.reduce((sum, item) => sum + item.count, 0)

  const colors: TremorColor[] = ['blue', 'cyan', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']

  return (
    <div>
      <Flex justifyContent="between" className="mb-3">
        <Title className="text-sm">Distribution by Region</Title>
        <Badge color="indigo">{data.length} regions</Badge>
      </Flex>
      <div className="relative">
        <DonutChart
          data={chartData}
          category="value"
          index="name"
          colors={colors}
          valueFormatter={(v) => formatChartNumber(v)}
          showLabel={true}
          showAnimation={true}
          className="h-56"
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Text className="text-gray-400 text-xs">Total</Text>
            <Metric className="text-lg">{formatCompactValue(total, 'count')}</Metric>
          </div>
        </div>
      </div>
      {/* Region Legend with Avg Price */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {sortedData.slice(0, 6).map((item, idx) => (
          <div key={item.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <Flex className="gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: `var(--tremor-content-${colors[idx]})` }}
              />
              <Text className="text-xs truncate">{item.name}</Text>
            </Flex>
            <Text className="text-xs text-gray-500">{formatCompactValue(item.avg_price)}</Text>
          </div>
        ))}
      </div>
    </div>
  )
}

// Top Cities as BarList with Value and Avg Price
function TopCitiesDistribution({ data }: { data: AggregationItem[] }) {
  const topCities = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  const barListData = topCities.map(item => ({
    name: item.name,
    value: item.count,
  }))

  return (
    <div>
      <Flex justifyContent="between" className="mb-3">
        <Title className="text-sm">Top Cities by Inventory</Title>
        <Badge color="amber">{data.length} cities</Badge>
      </Flex>
      <BarList
        data={barListData}
        valueFormatter={(v) => formatChartNumber(v)}
        showAnimation={true}
        color="amber"
      />
      {/* City stats summary */}
      <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg">
        <Flex justifyContent="between">
          <div>
            <Text className="text-xs text-amber-700">Highest Concentration</Text>
            <Text className="font-semibold text-amber-900">{topCities[0]?.name}</Text>
          </div>
          <div className="text-right">
            <Text className="text-xs text-amber-700">Avg Price (Top City)</Text>
            <Text className="font-semibold text-amber-900">{formatChartPrice(topCities[0]?.avg_price)}</Text>
          </div>
        </Flex>
      </div>
    </div>
  )
}

// Price by RV Type comparison
function PriceByRVType({ data }: { data: AggregationItem[] }) {
  const chartData = [...data]
    .sort((a, b) => b.avg_price - a.avg_price)
    .map(item => ({
      type: item.name,
      'Avg Price': item.avg_price,
      'Min': item.min_price || 0,
      'Max': item.max_price || 0
    }))

  return (
    <div>
      <Title className="text-sm mb-3">Average Price by RV Type</Title>
      <BarChart
        data={chartData}
        index="type"
        categories={['Avg Price']}
        colors={['indigo']}
        valueFormatter={(v) => formatChartPrice(v)}
        layout="vertical"
        className="h-72"
        showGridLines={false}
        showAnimation={true}
      />
    </div>
  )
}

// Price Distribution as Area Chart
function PriceDistribution({ data, avgPrice }: { data: InventoryItem[], avgPrice?: number }) {
  const histogram = useMemo(() => {
    const prices = data.filter(d => d.sale_price != null && d.sale_price > 0)
    if (prices.length === 0) return []

    const priceValues = prices.map(d => d.sale_price!)
    const min = Math.min(...priceValues)
    const max = Math.max(...priceValues)
    const binCount = 15
    const binWidth = (max - min) / binCount

    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: formatCompactValue(min + i * binWidth),
      rangeStart: min + i * binWidth,
      NEW: 0,
      USED: 0
    }))

    prices.forEach(item => {
      const price = item.sale_price!
      const binIndex = Math.min(Math.floor((price - min) / binWidth), binCount - 1)
      if (item.condition === 'NEW') {
        bins[binIndex].NEW++
      } else {
        bins[binIndex].USED++
      }
    })

    return bins
  }, [data])

  if (histogram.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Text className="text-gray-500">No price data available</Text>
      </div>
    )
  }

  return (
    <div>
      <Flex justifyContent="between" className="mb-3">
        <Title className="text-sm">Price Distribution</Title>
        {avgPrice && (
          <Badge color="red">Avg: {formatChartPrice(avgPrice)}</Badge>
        )}
      </Flex>
      <AreaChart
        data={histogram}
        index="range"
        categories={['NEW', 'USED']}
        colors={['emerald', 'orange']}
        valueFormatter={(v) => formatChartNumber(v)}
        className="h-56"
        showLegend={true}
        stack={true}
        showAnimation={true}
      />
    </div>
  )
}

// Market Summary Stats Row
function MarketSummaryRow({ data }: { data: AggregatedSummary }) {
  const topRvType = data.by_rv_type.reduce((a, b) => a.count > b.count ? a : b, data.by_rv_type[0])
  const topState = data.by_state.reduce((a, b) => a.count > b.count ? a : b, data.by_state[0])
  const topManufacturer = data.by_manufacturer.reduce((a, b) => a.count > b.count ? a : b, data.by_manufacturer[0])

  return (
    <Card className="mb-6 bg-gradient-to-r from-slate-900 to-slate-800">
      <Flex justifyContent="between" className="flex-wrap gap-4">
        <div>
          <Text className="text-slate-400">Market Leader (RV Type)</Text>
          <Flex alignItems="baseline" className="gap-2">
            <Metric className="text-white">{topRvType?.name}</Metric>
            <Badge color="blue">{formatCompactValue(topRvType?.count, 'count')} units</Badge>
          </Flex>
        </div>
        <div>
          <Text className="text-slate-400">Top State</Text>
          <Flex alignItems="baseline" className="gap-2">
            <Metric className="text-white">{topState?.name}</Metric>
            <Badge color="cyan">{formatCompactValue(topState?.count, 'count')} units</Badge>
          </Flex>
        </div>
        <div>
          <Text className="text-slate-400">Leading Manufacturer</Text>
          <Flex alignItems="baseline" className="gap-2">
            <Metric className="text-white text-lg">{topManufacturer?.name}</Metric>
            <Badge color="violet">{formatCompactValue(topManufacturer?.count, 'count')} units</Badge>
          </Flex>
        </div>
      </Flex>
    </Card>
  )
}

function AnalyticsContentV2({ summaryData, inventoryItems, loading: initialLoading }: AnalyticsTabV2Props) {
  const { filter, isAnyFiltered } = useCrossFilter()
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

  const displayData = isAnyFiltered() && filteredSummary ? filteredSummary : summaryData
  const displayInventory = isAnyFiltered() ? filteredInventory : inventoryItems
  const loading = initialLoading || filterLoading

  if (!summaryData && !loading) {
    return (
      <Card className="text-center py-12">
        <Text className="text-gray-500">No data available. Please wait for the data to load.</Text>
      </Card>
    )
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <Grid numItemsMd={2} numItemsLg={4} className="gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </Card>
          ))}
        </Grid>
        <Grid numItemsMd={2} className="gap-6">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse h-80">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
              <div className="h-64 bg-gray-100 rounded" />
            </Card>
          ))}
        </Grid>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FilterBannerV2 />

      {/* Market Summary Hero */}
      {displayData && <MarketSummaryRow data={displayData} />}

      {/* KPI Cards Row */}
      <Grid numItemsMd={2} numItemsLg={4} className="gap-4">
        <KPIMetricCard
          title="Total Inventory"
          metric={formatChartNumber(displayData?.total_units || 0)}
          subtitle="Active listings"
          icon="🚐"
          color="blue"
        />
        <KPIMetricCard
          title="Total Market Value"
          metric={formatCompactValue(displayData?.total_value || 0)}
          subtitle="Combined inventory value"
          icon="💰"
          color="emerald"
        />
        <KPIMetricCard
          title="Average Price"
          metric={formatChartPrice(displayData?.avg_price)}
          subtitle="Per unit"
          icon="📊"
          color="violet"
        />
        <KPIMetricCard
          title="Price Range"
          metric={`${formatCompactValue(displayData?.min_price || 0)} - ${formatCompactValue(displayData?.max_price || 0)}`}
          subtitle="Min to Max"
          icon="📈"
          color="amber"
        />
      </Grid>

      {/* Main Charts Row */}
      <Grid numItemsMd={2} className="gap-6">
        {/* RV Type Donut */}
        <Card>
          <Flex justifyContent="between" alignItems="center" className="mb-4">
            <div>
              <Title>Market Share by RV Type</Title>
              <Text className="text-gray-500">Click segments to filter</Text>
            </div>
            <Badge color="blue" size="lg">Interactive</Badge>
          </Flex>
          {displayData?.by_rv_type && <RVTypeDonut data={displayData.by_rv_type} />}
        </Card>

        {/* Condition Analysis */}
        <Card>
          <Flex justifyContent="between" alignItems="center" className="mb-4">
            <div>
              <Title>Condition Analysis</Title>
              <Text className="text-gray-500">NEW vs USED inventory</Text>
            </div>
            <Badge color="emerald" size="lg">Click to Filter</Badge>
          </Flex>
          {displayData?.by_condition && <ConditionAnalysis data={displayData.by_condition} />}
        </Card>
      </Grid>

      {/* Secondary Charts Row */}
      <Grid numItemsMd={2} className="gap-6">
        {/* Geographic Distribution */}
        <Card>
          {displayData?.by_state && <GeographicDistribution data={displayData.by_state} />}
        </Card>

        {/* Top Manufacturers */}
        <Card>
          {displayData?.by_manufacturer && (
            <TopItemsBarList
              data={displayData.by_manufacturer}
              dimension="manufacturer"
              title="Top Manufacturers"
              color="violet"
              maxItems={10}
            />
          )}
        </Card>
      </Grid>

      {/* Geographic Deep Dive Row - Region + City */}
      {(displayData?.by_region?.length || displayData?.by_city?.length) && (
        <Grid numItemsMd={2} className="gap-6">
          {/* Region Distribution */}
          <Card>
            {displayData?.by_region && displayData.by_region.length > 0 ? (
              <RegionDistribution data={displayData.by_region} />
            ) : (
              <div className="h-64 flex items-center justify-center">
                <Text className="text-gray-400">No region data available</Text>
              </div>
            )}
          </Card>

          {/* Top Cities */}
          <Card>
            {displayData?.by_city && displayData.by_city.length > 0 ? (
              <TopCitiesDistribution data={displayData.by_city} />
            ) : (
              <div className="h-64 flex items-center justify-center">
                <Text className="text-gray-400">No city data available</Text>
              </div>
            )}
          </Card>
        </Grid>
      )}

      {/* Price Analysis Row */}
      <Grid numItemsMd={2} className="gap-6">
        {/* Price Distribution */}
        <Card>
          <PriceDistribution data={displayInventory} avgPrice={displayData?.avg_price} />
        </Card>

        {/* Top Dealer Groups */}
        <Card>
          {displayData?.by_dealer_group && (
            <TopItemsBarList
              data={displayData.by_dealer_group}
              dimension="dealer_group"
              title="Top Dealer Groups"
              color="teal"
              maxItems={10}
            />
          )}
        </Card>
      </Grid>

      {/* Full Width Price by Type */}
      <Card>
        {displayData?.by_rv_type && <PriceByRVType data={displayData.by_rv_type} />}
      </Card>

      {/* Insights Footer */}
      <Card decoration="left" decorationColor="indigo">
        <Flex justifyContent="between" alignItems="start">
          <div>
            <Title>Data Insights</Title>
            <Text className="mt-2 text-gray-600">
              This dashboard displays {formatChartNumber(displayData?.total_units || 0)} inventory units
              across {displayData?.by_state?.length || 0} states from {displayData?.by_dealer_group?.length || 0} dealer groups.
              {displayData?.by_rv_type && displayData.by_rv_type.length > 0 && (
                <span className="block mt-1">
                  The most popular RV type is <strong>{displayData.by_rv_type[0]?.name}</strong> with{' '}
                  {formatChartNumber(displayData.by_rv_type[0]?.count)} units.
                </span>
              )}
            </Text>
          </div>
          <div className="text-right">
            <Text className="text-gray-400 text-xs">Version B (Tremor)</Text>
            <Badge color="indigo" size="sm" className="mt-1">A/B Testing</Badge>
          </div>
        </Flex>
      </Card>
    </div>
  )
}

export function AnalyticsTabV2(props: AnalyticsTabV2Props) {
  return (
    <CrossFilterProvider>
      <AnalyticsContentV2 {...props} />
    </CrossFilterProvider>
  )
}
