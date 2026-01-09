import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useCrossFilter } from '../../context/CrossFilterContext'
import { CONDITION_COLORS } from './chartColors'
import { formatChartNumber, formatChartPrice, formatCompactValue } from './chartUtils'

interface AggregationItem {
  name: string
  count: number
  total_value: number
  avg_price: number
  min_price?: number
  max_price?: number
}

interface ConditionComparisonProps {
  byCondition: AggregationItem[]
}

// Custom tooltip for condition comparison chart
function ConditionComparisonTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-gray-200">
      <p className="font-semibold text-gray-900 text-sm mb-1">{label}</p>
      {payload.map((entry, index) => {
        const isPrice = label === 'Avg Price'
        return (
          <p key={index} className="text-sm" style={{ color: entry.name === 'new' ? CONDITION_COLORS.NEW : CONDITION_COLORS.USED }}>
            {entry.name === 'new' ? 'New' : 'Used'}: {isPrice ? formatChartPrice(entry.value) : formatChartNumber(entry.value)}
          </p>
        )
      })}
    </div>
  )
}

export function ConditionComparison({ byCondition }: ConditionComparisonProps) {
  const { setFilter, isFiltered, isAnyFiltered } = useCrossFilter()

  const newData = byCondition.find(c => c.name === 'NEW')
  const usedData = byCondition.find(c => c.name === 'USED')

  const handleCardClick = (condition: string) => {
    setFilter('condition', condition, 'comparison')
  }

  const getCardOpacity = (condition: string): string => {
    if (!isAnyFiltered()) return 'opacity-100'
    return isFiltered('condition', condition) ? 'opacity-100 ring-2 ring-offset-2' : 'opacity-50'
  }

  // Data for comparison bar chart
  const comparisonData = [
    {
      metric: 'Units',
      new: newData?.count || 0,
      used: usedData?.count || 0,
      format: 'count'
    },
    {
      metric: 'Avg Price',
      new: newData?.avg_price || 0,
      used: usedData?.avg_price || 0,
      format: 'price'
    }
  ]

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleCardClick('NEW')}
          className={`bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200 hover:border-green-400 transition-all text-left ${getCardOpacity('NEW')} ${isFiltered('condition', 'NEW') ? 'ring-green-500' : ''}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="font-semibold text-green-800 text-sm">NEW</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{formatChartNumber(newData?.count || 0)}</p>
          <p className="text-sm text-green-700 mt-1">Avg: {formatChartPrice(newData?.avg_price)}</p>
          <p className="text-xs text-green-600 mt-0.5">Total: {formatCompactValue(newData?.total_value || 0)}</p>
        </button>

        <button
          onClick={() => handleCardClick('USED')}
          className={`bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border-2 border-orange-200 hover:border-orange-400 transition-all text-left ${getCardOpacity('USED')} ${isFiltered('condition', 'USED') ? 'ring-orange-500' : ''}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="font-semibold text-orange-800 text-sm">USED</span>
          </div>
          <p className="text-2xl font-bold text-orange-900">{formatChartNumber(usedData?.count || 0)}</p>
          <p className="text-sm text-orange-700 mt-1">Avg: {formatChartPrice(usedData?.avg_price)}</p>
          <p className="text-xs text-orange-600 mt-0.5">Total: {formatCompactValue(usedData?.total_value || 0)}</p>
        </button>
      </div>

      {/* Comparison Bar Chart */}
      <div className="pt-2">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={comparisonData} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={(v) => formatCompactValue(v, 'count')} />
            <YAxis type="category" dataKey="metric" tick={{ fontSize: 11, fill: '#374151' }} width={55} />
            <Tooltip content={<ConditionComparisonTooltip />} />
            <Legend
              verticalAlign="top"
              height={25}
              formatter={(value: string) => (
                <span className="text-xs text-gray-700 capitalize">{value}</span>
              )}
            />
            <Bar dataKey="new" name="New" fill={CONDITION_COLORS.NEW} radius={[0, 4, 4, 0]} animationDuration={500} />
            <Bar dataKey="used" name="Used" fill={CONDITION_COLORS.USED} radius={[0, 4, 4, 0]} animationDuration={500} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Price Range Comparison */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500 mb-1">New Price Range</p>
          <p className="font-medium text-gray-900">
            {formatChartPrice(newData?.min_price)} - {formatChartPrice(newData?.max_price)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-500 mb-1">Used Price Range</p>
          <p className="font-medium text-gray-900">
            {formatChartPrice(usedData?.min_price)} - {formatChartPrice(usedData?.max_price)}
          </p>
        </div>
      </div>
    </div>
  )
}
