import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { useMemo } from 'react'
import { CONDITION_COLORS } from './chartColors'
import { formatChartPrice, formatChartNumber, formatCompactValue } from './chartUtils'

interface InventoryItem {
  sale_price: number | null
  condition?: string | null
}

interface PriceDistributionProps {
  data: InventoryItem[]
  avgPrice?: number
  binCount?: number
}

interface HistogramBin {
  range: string
  rangeStart: number
  rangeEnd: number
  count: number
  newCount: number
  usedCount: number
}

// Custom tooltip for price distribution chart
function PriceDistributionTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: HistogramBin }> }) {
  if (!active || !payload?.length) return null
  const bin = payload[0].payload

  return (
    <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-gray-200">
      <p className="font-semibold text-gray-900 text-sm">
        {formatChartPrice(bin.rangeStart)} - {formatChartPrice(bin.rangeEnd)}
      </p>
      <div className="mt-1 space-y-0.5">
        <p className="text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CONDITION_COLORS.NEW }} />
          New: <span className="font-medium">{formatChartNumber(bin.newCount)}</span>
        </p>
        <p className="text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CONDITION_COLORS.USED }} />
          Used: <span className="font-medium">{formatChartNumber(bin.usedCount)}</span>
        </p>
        <p className="text-sm text-gray-500 pt-1 border-t border-gray-100">
          Total: {formatChartNumber(bin.count)}
        </p>
      </div>
    </div>
  )
}

export function PriceDistributionChart({ data, avgPrice, binCount = 12 }: PriceDistributionProps) {
  const histogram = useMemo(() => {
    const prices = data.filter(d => d.sale_price != null && d.sale_price > 0)
    if (prices.length === 0) return []

    const priceValues = prices.map(d => d.sale_price!)
    const min = Math.min(...priceValues)
    const max = Math.max(...priceValues)
    const binWidth = (max - min) / binCount

    const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
      range: formatCompactValue(min + i * binWidth),
      rangeStart: min + i * binWidth,
      rangeEnd: min + (i + 1) * binWidth,
      count: 0,
      newCount: 0,
      usedCount: 0
    }))

    prices.forEach((item) => {
      const price = item.sale_price!
      const binIndex = Math.min(Math.floor((price - min) / binWidth), binCount - 1)
      bins[binIndex].count++
      if (item.condition === 'NEW') {
        bins[binIndex].newCount++
      } else {
        bins[binIndex].usedCount++
      }
    })

    return bins
  }, [data, binCount])

  const avgBinIndex = useMemo(() => {
    if (!avgPrice || histogram.length === 0) return -1
    return histogram.findIndex(b => avgPrice >= b.rangeStart && avgPrice < b.rangeEnd)
  }, [avgPrice, histogram])

  if (histogram.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No price data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={histogram} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="range"
          angle={-45}
          textAnchor="end"
          tick={{ fontSize: 10, fill: '#6B7280' }}
          height={50}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6B7280' }}
          tickFormatter={(v) => formatCompactValue(v, 'count')}
          axisLine={{ stroke: '#E5E7EB' }}
        />
        <Tooltip content={<PriceDistributionTooltip />} />
        <Legend
          verticalAlign="top"
          height={30}
          formatter={(value: string) => (
            <span className="text-xs text-gray-700 capitalize">{value}</span>
          )}
        />
        <Bar
          dataKey="newCount"
          stackId="condition"
          fill={CONDITION_COLORS.NEW}
          name="New"
          animationBegin={0}
          animationDuration={600}
        />
        <Bar
          dataKey="usedCount"
          stackId="condition"
          fill={CONDITION_COLORS.USED}
          name="Used"
          radius={[4, 4, 0, 0]}
          animationBegin={0}
          animationDuration={600}
        />
        {avgBinIndex >= 0 && (
          <ReferenceLine
            x={histogram[avgBinIndex]?.range}
            stroke="#EF4444"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: `Avg: ${formatChartPrice(avgPrice)}`,
              position: 'top',
              fill: '#EF4444',
              fontSize: 11,
              fontWeight: 600
            }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
