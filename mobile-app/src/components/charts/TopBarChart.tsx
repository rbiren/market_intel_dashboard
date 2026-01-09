import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useCrossFilter } from '../../context/CrossFilterContext'
import type { FilterDimension } from '../../context/CrossFilterContext'
import { formatCompactValue, formatChartNumber, formatChartPrice, truncateLabel } from './chartUtils'

interface AggregationItem {
  name: string
  count: number
  total_value: number
  avg_price: number
}

interface TopBarChartProps {
  data: AggregationItem[]
  dimension: FilterDimension
  dataKey?: 'count' | 'total_value' | 'avg_price'
  color?: string
  maxItems?: number
  layout?: 'horizontal' | 'vertical'
}

// Props for the bar chart tooltip
interface BarTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: AggregationItem }>
  label?: string
  dataKey: 'count' | 'total_value' | 'avg_price'
}

// Custom tooltip for bar chart - defined outside component
function BarChartTooltip({ active, payload, label, dataKey }: BarTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload

  return (
    <div className="thor-tooltip">
      <p className="font-[var(--font-heading)] font-semibold text-[var(--thor-off-white)] text-sm mb-1.5">{label || item.name}</p>
      <p className="text-sm text-[var(--thor-medium-gray)]">
        {dataKey === 'count' && <>Units: <span className="font-semibold text-[var(--thor-off-white)]">{formatChartNumber(item.count)}</span></>}
        {dataKey === 'total_value' && <>Value: <span className="font-semibold text-[var(--thor-gold-light)]">{formatCompactValue(item.total_value)}</span></>}
        {dataKey === 'avg_price' && <>Avg Price: <span className="font-semibold text-[var(--thor-gold-light)]">{formatChartPrice(item.avg_price)}</span></>}
      </p>
      <p className="text-xs text-[var(--thor-sage-light)] mt-2 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        Click to filter
      </p>
    </div>
  )
}

export function TopBarChart({
  data,
  dimension,
  dataKey = 'count',
  color = '#3B82F6',
  maxItems = 10,
  layout = 'horizontal'
}: TopBarChartProps) {
  const { filter, setFilter, isFiltered, isAnyFiltered } = useCrossFilter()

  // Take top N items sorted by the dataKey
  const displayData = [...data]
    .sort((a, b) => b[dataKey] - a[dataKey])
    .slice(0, maxItems)

  const handleClick = (entry: AggregationItem) => {
    if (dimension) {
      setFilter(dimension, entry.name, 'bar')
    }
  }

  const getOpacity = (name: string): number => {
    if (!isAnyFiltered()) return 1
    if (filter.dimension !== dimension) return 0.7
    return isFiltered(dimension, name) ? 1 : 0.3
  }

  const formatAxisValue = (value: number): string => {
    switch (dataKey) {
      case 'count':
        return formatCompactValue(value, 'count')
      case 'total_value':
      case 'avg_price':
        return formatCompactValue(value)
      default:
        return value.toString()
    }
  }

  if (layout === 'horizontal') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={displayData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--thor-border-gray)" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            tickFormatter={formatAxisValue}
            tick={{ fontSize: 11, fill: 'var(--thor-medium-gray)' }}
            axisLine={{ stroke: 'var(--thor-border-gray)' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 11, fill: 'var(--thor-warm-gray)' }}
            tickFormatter={(v) => truncateLabel(v, 14)}
            axisLine={{ stroke: 'var(--thor-border-gray)' }}
          />
          <Tooltip content={<BarChartTooltip dataKey={dataKey} />} />
          <Bar
            dataKey={dataKey}
            onClick={(data) => handleClick(data)}
            style={{ cursor: 'pointer' }}
            animationBegin={0}
            animationDuration={500}
            radius={[0, 6, 6, 0]}
          >
            {displayData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={color}
                opacity={getOpacity(entry.name)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Vertical bars
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={displayData}
        margin={{ top: 5, right: 20, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--thor-border-gray)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: 'var(--thor-warm-gray)' }}
          angle={-45}
          textAnchor="end"
          height={60}
          tickFormatter={(v) => truncateLabel(v, 12)}
          axisLine={{ stroke: 'var(--thor-border-gray)' }}
        />
        <YAxis
          tickFormatter={formatAxisValue}
          tick={{ fontSize: 11, fill: 'var(--thor-medium-gray)' }}
          axisLine={{ stroke: 'var(--thor-border-gray)' }}
        />
        <Tooltip content={<BarChartTooltip dataKey={dataKey} />} />
        <Bar
          dataKey={dataKey}
          onClick={(data) => handleClick(data)}
          style={{ cursor: 'pointer' }}
          animationBegin={0}
          animationDuration={500}
          radius={[6, 6, 0, 0]}
        >
          {displayData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={color}
              opacity={getOpacity(entry.name)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
