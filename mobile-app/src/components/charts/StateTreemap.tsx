import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { useCrossFilter } from '../../context/CrossFilterContext'
import { formatChartNumber, formatCompactValue } from './chartUtils'
import { STATE_COLORS } from './chartColors'

interface AggregationItem {
  name: string
  count: number
  total_value: number
  avg_price: number
}

interface StateTreemapProps {
  data: AggregationItem[]
}

interface TreemapContentProps {
  x: number
  y: number
  width: number
  height: number
  name: string
  count: number
  index: number
  isSelected: boolean
  opacity: number
}

// Custom tooltip for state treemap
function StateTreemapTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: AggregationItem }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload

  return (
    <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-gray-200">
      <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
      <p className="text-sm text-gray-600">
        Units: <span className="font-medium">{formatChartNumber(item.count)}</span>
      </p>
      <p className="text-sm text-gray-600">
        Value: <span className="font-medium">{formatCompactValue(item.total_value)}</span>
      </p>
      <p className="text-xs text-blue-600 mt-1">Click to filter</p>
    </div>
  )
}

function CustomTreemapContent({ x, y, width, height, name, count, index, isSelected, opacity }: TreemapContentProps) {
  if (width < 30 || height < 20) return null

  const color = STATE_COLORS[index % STATE_COLORS.length]

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        opacity={opacity}
        stroke={isSelected ? '#1F2937' : '#fff'}
        strokeWidth={isSelected ? 3 : 2}
        rx={4}
        style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
      />
      {width > 45 && height > 35 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#fff"
            fontSize={width > 80 ? 11 : 9}
            fontWeight={600}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
          >
            {name.length > (width > 80 ? 14 : 10) ? name.slice(0, width > 80 ? 12 : 8) + '...' : name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#fff"
            fontSize={10}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
          >
            {formatCompactValue(count, 'count')}
          </text>
        </>
      )}
    </g>
  )
}

export function StateTreemap({ data }: StateTreemapProps) {
  const { filter, setFilter, isFiltered, isAnyFiltered } = useCrossFilter()

  const handleClick = (node: { name: string }) => {
    if (node?.name) {
      setFilter('state', node.name, 'treemap')
    }
  }

  const getOpacity = (name: string): number => {
    if (!isAnyFiltered()) return 0.9
    if (filter.dimension !== 'state') return 0.6
    return isFiltered('state', name) ? 1 : 0.3
  }

  // Sort by count descending and limit to top entries
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  const treemapData = sortedData.map((item, index) => ({
    ...item,
    index,
    isSelected: isFiltered('state', item.name),
    opacity: getOpacity(item.name)
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <Treemap
        data={treemapData}
        dataKey="count"
        aspectRatio={4 / 3}
        stroke="#fff"
        content={({ x, y, width, height, name, count, index, isSelected, opacity }: TreemapContentProps) => (
          <CustomTreemapContent
            x={x}
            y={y}
            width={width}
            height={height}
            name={name}
            count={count}
            index={index}
            isSelected={isSelected}
            opacity={opacity}
          />
        )}
        onClick={(node) => handleClick(node as { name: string })}
        animationBegin={0}
        animationDuration={500}
      >
        <Tooltip content={<StateTreemapTooltip />} />
      </Treemap>
    </ResponsiveContainer>
  )
}
