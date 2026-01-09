import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useCrossFilter } from '../../context/CrossFilterContext'
import type { FilterDimension } from '../../context/CrossFilterContext'
import { getRvTypeColor, CONDITION_COLORS, SEQUENTIAL_COLORS } from './chartColors'
import { formatChartNumber, formatCompactValue } from './chartUtils'

interface AggregationItem {
  name: string
  count: number
  total_value: number
  avg_price: number
}

interface MarketShareDonutProps {
  data: AggregationItem[]
  dataKey?: 'count' | 'total_value'
  dimension: FilterDimension
  title?: string
}

// Custom tooltip for market share donut chart
function MarketShareTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: AggregationItem }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload

  return (
    <div className="thor-tooltip">
      <p className="font-[var(--font-heading)] font-semibold text-[var(--thor-off-white)] text-sm mb-1.5">{item.name}</p>
      <div className="space-y-1">
        <p className="text-sm text-[var(--thor-medium-gray)]">
          Units: <span className="font-semibold text-[var(--thor-off-white)]">{formatChartNumber(item.count)}</span>
        </p>
        <p className="text-sm text-[var(--thor-medium-gray)]">
          Value: <span className="font-semibold text-[var(--thor-gold-light)]">{formatCompactValue(item.total_value)}</span>
        </p>
      </div>
      <p className="text-xs text-[var(--thor-sage-light)] mt-2 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        Click to filter
      </p>
    </div>
  )
}

export function MarketShareDonut({ data, dataKey = 'count', dimension }: MarketShareDonutProps) {
  const { filter, setFilter, isFiltered, isAnyFiltered } = useCrossFilter()

  const handleClick = (entry: AggregationItem) => {
    if (dimension) {
      setFilter(dimension, entry.name, 'donut')
    }
  }

  const getColor = (name: string, index: number): string => {
    if (dimension === 'rv_type') {
      return getRvTypeColor(name, index)
    }
    if (dimension === 'condition') {
      return CONDITION_COLORS[name] || SEQUENTIAL_COLORS[index]
    }
    return SEQUENTIAL_COLORS[index % SEQUENTIAL_COLORS.length]
  }

  const getOpacity = (name: string): number => {
    if (!isAnyFiltered()) return 1
    if (filter.dimension !== dimension) return 0.6
    return isFiltered(dimension, name) ? 1 : 0.25
  }

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number
    cy: number
    midAngle: number
    innerRadius: number
    outerRadius: number
    percent: number
  }) => {
    if (percent < 0.05) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={95}
          dataKey={dataKey}
          nameKey="name"
          label={renderCustomLabel}
          labelLine={false}
          onClick={(_, index) => handleClick(data[index])}
          style={{ cursor: 'pointer' }}
          animationBegin={0}
          animationDuration={600}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getColor(entry.name, index)}
              opacity={getOpacity(entry.name)}
              stroke={isFiltered(dimension, entry.name) ? '#1F2937' : 'white'}
              strokeWidth={isFiltered(dimension, entry.name) ? 3 : 1}
            />
          ))}
        </Pie>
        <Tooltip content={<MarketShareTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={50}
          formatter={(value: string) => (
            <span className="text-xs text-[var(--thor-warm-gray)] font-[var(--font-body)]">{value}</span>
          )}
          wrapperStyle={{ paddingTop: '10px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
