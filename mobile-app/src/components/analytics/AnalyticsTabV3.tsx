import { useState, useEffect, useCallback, useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import { CrossFilterProvider, useCrossFilter } from '../../context/CrossFilterContext'
import { formatChartPrice, formatChartNumber, formatCompactValue } from '../charts/chartUtils'

const API_BASE = 'http://localhost:8000'

// ECharts tooltip params interface
interface EChartsTooltipParams {
  name: string
  value: number
  percent?: number
  color: string
  seriesName?: string
  axisValue?: string
  data?: {
    name?: string
    value?: number
  }
}

// Premium color palette - Thor Industries branded
// Based on thorindustries.com design system: earthy, outdoor adventure aesthetic
const COLORS = {
  primary: '#495737',      // Sage Green (Thor primary accent)
  secondary: '#a46807',    // Gold/Amber (Thor action accent)
  accent: '#577d91',       // Steel Blue (Thor info accent)
  success: '#495737',      // Sage Green for success states
  warning: '#a46807',      // Gold for warnings
  danger: '#8b4049',       // Muted red (complementary)
  sage: '#6b7a5e',         // Lighter sage
  gold: '#c4850d',         // Lighter gold
  steel: '#4a6673',        // Darker steel

  // Background shades - Thor dark charcoal palette
  bgDark: '#181817',
  bgCard: '#232322',
  bgHover: '#2d2d2b',

  // Text - Thor off-white and grays
  textPrimary: '#fffdfa',
  textSecondary: '#8c8a7e',
  textMuted: '#595755',

  // Borders - Thor border gray
  border: 'rgba(217, 214, 207, 0.15)',
  borderLight: 'rgba(217, 214, 207, 0.25)',

  // Glow effects - Thor branded
  glow: 'rgba(73, 87, 55, 0.4)',
  glowGold: 'rgba(164, 104, 7, 0.4)',
  glowSteel: 'rgba(87, 125, 145, 0.4)',
}

// RV Type color mapping with glow colors - Thor branded
const RV_COLORS: Record<string, { main: string; glow: string }> = {
  'TRAVEL TRAILER': { main: '#495737', glow: 'rgba(73, 87, 55, 0.5)' },
  'FIFTH WHEEL': { main: '#a46807', glow: 'rgba(164, 104, 7, 0.5)' },
  'CLASS C': { main: '#577d91', glow: 'rgba(87, 125, 145, 0.5)' },
  'CLASS A': { main: '#8c8a7e', glow: 'rgba(140, 138, 126, 0.5)' },
  'CLASS B': { main: '#6b7a5e', glow: 'rgba(107, 122, 94, 0.5)' },
  'OTHER': { main: '#595755', glow: 'rgba(89, 87, 85, 0.5)' },
  'CAMPING TRAILER': { main: '#c4850d', glow: 'rgba(196, 133, 13, 0.5)' },
  'PARK MODEL': { main: '#4a6673', glow: 'rgba(74, 102, 115, 0.5)' },
}

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
  dealer_group?: string | null
  make?: string | null
  location?: string | null
}

interface AnalyticsTabV3Props {
  summaryData: AggregatedSummary | null
  inventoryItems: InventoryItem[]
  loading: boolean
}

// Glassmorphism tooltip formatter
const createGlassTooltip = (content: string) => `
  <div style="
    background: rgba(15, 15, 35, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 14px 18px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(99, 102, 241, 0.1);
    font-family: 'Inter', -apple-system, sans-serif;
    min-width: 180px;
  ">
    ${content}
  </div>
`

// Premium KPI Card Component
function PremiumKPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = COLORS.primary,
  glowColor = COLORS.glow
}: {
  title: string
  value: string
  subtitle?: string
  icon: string
  trend?: { value: number; direction: 'up' | 'down' }
  color?: string
  glowColor?: string
}) {
  return (
    <div
      className="relative group overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.02]"
      style={{
        background: `linear-gradient(135deg, ${COLORS.bgCard} 0%, ${COLORS.bgDark} 100%)`,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${glowColor} 0%, transparent 60%)`,
        }}
      />

      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
              {title}
            </p>
            <p
              className="text-3xl font-bold tracking-tight"
              style={{
                color: COLORS.textPrimary,
                textShadow: `0 0 30px ${glowColor}`
              }}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={`text-sm font-medium ${trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
                </span>
              </div>
            )}
          </div>
          <div
            className="p-3 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
              boxShadow: `0 0 20px ${glowColor}`,
            }}
          >
            <span className="text-2xl">{icon}</span>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${color}, transparent)`,
        }}
      />
    </div>
  )
}

// Premium Donut Chart
function PremiumDonutChart({ data, onSelect }: { data: AggregationItem[], onSelect?: (name: string) => void }) {
  const total = data.reduce((sum, item) => sum + item.count, 0)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    animationDuration: 1500,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      formatter: (params: EChartsTooltipParams) => createGlassTooltip(`
        <div style="color: ${COLORS.textPrimary}; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
          ${params.name}
        </div>
        <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 4px;">
          <span style="color: ${COLORS.textSecondary};">Units</span>
          <span style="color: ${COLORS.textPrimary}; font-weight: 600;">${formatChartNumber(params.value)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 20px;">
          <span style="color: ${COLORS.textSecondary};">Share</span>
          <span style="color: ${params.color}; font-weight: 600;">${params.percent.toFixed(1)}%</span>
        </div>
      `),
    },
    legend: {
      show: false,
    },
    series: [
      {
        name: 'RV Types',
        type: 'pie',
        radius: ['55%', '80%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: COLORS.bgDark,
          borderWidth: 3,
        },
        label: {
          show: false,
        },
        emphasis: {
          scale: true,
          scaleSize: 12,
          itemStyle: {
            shadowBlur: 30,
            shadowColor: 'rgba(99, 102, 241, 0.5)',
          },
        },
        data: data.map((item) => ({
          value: item.count,
          name: item.name,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: RV_COLORS[item.name]?.main || COLORS.primary },
              { offset: 1, color: echarts.color.modifyHSL(RV_COLORS[item.name]?.main || COLORS.primary, undefined, undefined, -0.2) },
            ]),
            shadowBlur: 15,
            shadowColor: RV_COLORS[item.name]?.glow || COLORS.glow,
          },
        })),
        universalTransition: true,
      },
      // Inner glow ring
      {
        name: 'Glow',
        type: 'pie',
        radius: ['45%', '50%'],
        center: ['50%', '50%'],
        silent: true,
        itemStyle: {
          color: 'transparent',
          borderColor: COLORS.primary,
          borderWidth: 1,
          opacity: 0.3,
        },
        label: { show: false },
        data: [{ value: 1 }],
      },
    ],
  }

  const handleClick = (params: EChartsTooltipParams) => {
    if (onSelect && params.name) {
      onSelect(params.name)
    }
  }

  return (
    <div className="relative">
      <ReactECharts
        option={option}
        style={{ height: 320 }}
        opts={{ renderer: 'canvas' }}
        onEvents={{ click: handleClick }}
      />
      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-sm" style={{ color: COLORS.textMuted }}>Total Units</p>
          <p
            className="text-3xl font-bold"
            style={{
              color: COLORS.textPrimary,
              textShadow: `0 0 20px ${COLORS.glow}`,
            }}
          >
            {formatCompactValue(total, 'count')}
          </p>
        </div>
      </div>
    </div>
  )
}

// Premium Bar Chart (Horizontal)
function PremiumBarChart({
  data,
  color = COLORS.primary,
  glowColor = COLORS.glow,
  maxItems = 8,
  onSelect
}: {
  data: AggregationItem[]
  color?: string
  glowColor?: string
  maxItems?: number
  onSelect?: (name: string) => void
}) {
  const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, maxItems)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    animationDuration: 1500,
    animationEasing: 'cubicOut',
    grid: {
      left: '3%',
      right: '8%',
      top: '3%',
      bottom: '3%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(99, 102, 241, 0.08)',
        },
      },
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      formatter: (params: EChartsTooltipParams[]) => {
        const item = params[0]
        const dataItem = sortedData.find(d => d.name === item.name)
        return createGlassTooltip(`
          <div style="color: ${COLORS.textPrimary}; font-weight: 600; font-size: 14px; margin-bottom: 10px;">
            ${item.name}
          </div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 6px;">
            <span style="color: ${COLORS.textSecondary};">Units</span>
            <span style="color: ${COLORS.textPrimary}; font-weight: 600;">${formatChartNumber(item.value)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 6px;">
            <span style="color: ${COLORS.textSecondary};">Avg Price</span>
            <span style="color: ${COLORS.accent}; font-weight: 600;">${formatChartPrice(dataItem?.avg_price)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 24px;">
            <span style="color: ${COLORS.textSecondary};">Total Value</span>
            <span style="color: ${COLORS.success}; font-weight: 600;">${formatCompactValue(dataItem?.total_value)}</span>
          </div>
        `)
      },
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: COLORS.border,
          type: 'dashed',
          opacity: 0.5,
        },
      },
      axisLabel: {
        color: COLORS.textMuted,
        fontSize: 11,
        formatter: (value: number) => formatCompactValue(value, 'count'),
      },
    },
    yAxis: {
      type: 'category',
      data: sortedData.map(d => d.name.length > 18 ? d.name.slice(0, 16) + '...' : d.name).reverse(),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 500,
      },
    },
    series: [
      {
        type: 'bar',
        data: sortedData.map(d => d.count).reverse(),
        barWidth: '60%',
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: color },
            { offset: 1, color: echarts.color.modifyHSL(color, undefined, undefined, 0.15) },
          ]),
          shadowBlur: 12,
          shadowColor: glowColor,
          shadowOffsetX: 4,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 25,
            shadowColor: glowColor,
          },
        },
        universalTransition: true,
      },
    ],
  }

  const handleClick = (params: EChartsTooltipParams) => {
    if (onSelect && params.name) {
      // Reverse the truncation to find original name
      const originalItem = sortedData.find(d =>
        d.name === params.name ||
        (d.name.length > 18 && d.name.slice(0, 16) + '...' === params.name)
      )
      if (originalItem) {
        onSelect(originalItem.name)
      }
    }
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: 300 }}
      opts={{ renderer: 'canvas' }}
      onEvents={{ click: handleClick }}
    />
  )
}

// Premium Area Chart (for price distribution)
function PremiumAreaChart({ data }: { data: InventoryItem[] }) {
  const histogram = useMemo(() => {
    const prices = data.filter(d => d.sale_price != null && d.sale_price > 0)
    if (prices.length === 0) return { bins: [], labels: [] }

    const priceValues = prices.map(d => d.sale_price!)
    const min = Math.min(...priceValues)
    const max = Math.max(...priceValues)
    const binCount = 20
    const binWidth = (max - min) / binCount

    const bins = Array.from({ length: binCount }, () => ({ new: 0, used: 0 }))
    const labels = Array.from({ length: binCount }, (_, i) =>
      formatCompactValue(min + (i + 0.5) * binWidth)
    )

    prices.forEach(item => {
      const price = item.sale_price!
      const binIndex = Math.min(Math.floor((price - min) / binWidth), binCount - 1)
      if (item.condition === 'NEW') {
        bins[binIndex].new++
      } else {
        bins[binIndex].used++
      }
    })

    return { bins, labels }
  }, [data])

  if (histogram.bins.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p style={{ color: COLORS.textMuted }}>No price data available</p>
      </div>
    )
  }

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    animationDuration: 1500,
    animationEasing: 'cubicOut',
    grid: {
      left: '3%',
      right: '4%',
      top: '15%',
      bottom: '12%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: COLORS.primary,
          opacity: 0.3,
        },
        lineStyle: {
          color: COLORS.primary,
          opacity: 0.5,
        },
      },
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      formatter: (params: EChartsTooltipParams[]) => {
        const newVal = params.find((p) => p.seriesName === 'NEW')?.value || 0
        const usedVal = params.find((p) => p.seriesName === 'USED')?.value || 0
        return createGlassTooltip(`
          <div style="color: ${COLORS.textPrimary}; font-weight: 600; font-size: 14px; margin-bottom: 10px;">
            ${params[0]?.axisValue}
          </div>
          <div style="display: flex; justify-content: space-between; gap: 24px; margin-bottom: 6px;">
            <span style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${COLORS.success};"></span>
              <span style="color: ${COLORS.textSecondary};">NEW</span>
            </span>
            <span style="color: ${COLORS.textPrimary}; font-weight: 600;">${formatChartNumber(newVal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 24px;">
            <span style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: ${COLORS.warning};"></span>
              <span style="color: ${COLORS.textSecondary};">USED</span>
            </span>
            <span style="color: ${COLORS.textPrimary}; font-weight: 600;">${formatChartNumber(usedVal)}</span>
          </div>
        `)
      },
    },
    legend: {
      show: true,
      top: 0,
      right: 0,
      textStyle: {
        color: COLORS.textSecondary,
        fontSize: 12,
      },
      itemWidth: 12,
      itemHeight: 12,
      itemGap: 20,
    },
    xAxis: {
      type: 'category',
      data: histogram.labels,
      boundaryGap: false,
      axisLine: {
        lineStyle: { color: COLORS.border },
      },
      axisTick: { show: false },
      axisLabel: {
        color: COLORS.textMuted,
        fontSize: 10,
        interval: 3,
        rotate: 0,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: {
          color: COLORS.border,
          type: 'dashed',
          opacity: 0.4,
        },
      },
      axisLabel: {
        color: COLORS.textMuted,
        fontSize: 11,
        formatter: (value: number) => formatCompactValue(value, 'count'),
      },
    },
    series: [
      {
        name: 'NEW',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        sampling: 'lttb',
        showSymbol: false,
        lineStyle: {
          width: 3,
          color: COLORS.success,
          shadowBlur: 12,
          shadowColor: 'rgba(16, 185, 129, 0.5)',
        },
        itemStyle: {
          color: COLORS.success,
          shadowBlur: 15,
          shadowColor: 'rgba(16, 185, 129, 0.6)',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
            { offset: 0.5, color: 'rgba(16, 185, 129, 0.15)' },
            { offset: 1, color: 'rgba(16, 185, 129, 0)' },
          ]),
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 25,
            shadowColor: 'rgba(16, 185, 129, 0.8)',
          },
        },
        data: histogram.bins.map(b => b.new),
        universalTransition: true,
      },
      {
        name: 'USED',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        sampling: 'lttb',
        showSymbol: false,
        lineStyle: {
          width: 3,
          color: COLORS.warning,
          shadowBlur: 12,
          shadowColor: 'rgba(245, 158, 11, 0.5)',
        },
        itemStyle: {
          color: COLORS.warning,
          shadowBlur: 15,
          shadowColor: 'rgba(245, 158, 11, 0.6)',
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(245, 158, 11, 0.4)' },
            { offset: 0.5, color: 'rgba(245, 158, 11, 0.15)' },
            { offset: 1, color: 'rgba(245, 158, 11, 0)' },
          ]),
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 25,
            shadowColor: 'rgba(245, 158, 11, 0.8)',
          },
        },
        data: histogram.bins.map(b => b.used),
        universalTransition: true,
      },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: 280 }}
      opts={{ renderer: 'canvas' }}
    />
  )
}

// Condition Gauge Charts
function ConditionGauges({ data, onSelect }: { data: AggregationItem[], onSelect?: (condition: string) => void }) {
  const newData = data.find(c => c.name === 'NEW')
  const usedData = data.find(c => c.name === 'USED')
  const total = (newData?.count || 0) + (usedData?.count || 0)
  const newPct = total > 0 ? ((newData?.count || 0) / total) * 100 : 0

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    animationDuration: 1500,
    animationEasing: 'cubicOut',
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        splitNumber: 10,
        radius: '100%',
        center: ['50%', '75%'],
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [newPct / 100, new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: COLORS.success },
                { offset: 1, color: '#34d399' },
              ]) as unknown as string],
              [1, COLORS.warning],
            ],
          },
        },
        pointer: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        detail: {
          show: false,
        },
        title: {
          show: false,
        },
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(16, 185, 129, 0.4)',
        },
      },
    ],
  }

  return (
    <div className="space-y-4">
      <div className="relative h-40">
        <ReactECharts
          option={option}
          style={{ height: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
          <p
            className="text-4xl font-bold"
            style={{
              color: COLORS.textPrimary,
              textShadow: `0 0 30px ${COLORS.glow}`,
            }}
          >
            {newPct.toFixed(1)}%
          </p>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>NEW Inventory</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onSelect?.('NEW')}
          className="p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] text-left"
          style={{
            background: `linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)`,
            border: `1px solid rgba(16, 185, 129, 0.3)`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)' }} />
            <span className="text-emerald-400 font-semibold text-sm">NEW</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: COLORS.textPrimary }}>
            {formatChartNumber(newData?.count || 0)}
          </p>
          <p className="text-xs mt-1" style={{ color: COLORS.textSecondary }}>
            Avg: {formatChartPrice(newData?.avg_price)}
          </p>
        </button>

        <button
          onClick={() => onSelect?.('USED')}
          className="p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] text-left"
          style={{
            background: `linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)`,
            border: `1px solid rgba(245, 158, 11, 0.3)`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" style={{ boxShadow: '0 0 10px rgba(245, 158, 11, 0.8)' }} />
            <span className="text-amber-400 font-semibold text-sm">USED</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: COLORS.textPrimary }}>
            {formatChartNumber(usedData?.count || 0)}
          </p>
          <p className="text-xs mt-1" style={{ color: COLORS.textSecondary }}>
            Avg: {formatChartPrice(usedData?.avg_price)}
          </p>
        </button>
      </div>
    </div>
  )
}

// Geographic Radar/Rose Chart
function GeographicRoseChart({ data, onSelect }: { data: AggregationItem[], onSelect?: (state: string) => void }) {
  const topStates = [...data].sort((a, b) => b.count - a.count).slice(0, 12)
  const maxValue = Math.max(...topStates.map(d => d.count))

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    animationDuration: 1500,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      formatter: (params: EChartsTooltipParams) => {
        const item = topStates.find(d => d.name === params.name)
        return createGlassTooltip(`
          <div style="color: ${COLORS.textPrimary}; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
            ${params.name}
          </div>
          <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 4px;">
            <span style="color: ${COLORS.textSecondary};">Units</span>
            <span style="color: ${COLORS.textPrimary}; font-weight: 600;">${formatChartNumber(params.value)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 20px;">
            <span style="color: ${COLORS.textSecondary};">Avg Price</span>
            <span style="color: ${COLORS.accent}; font-weight: 600;">${formatChartPrice(item?.avg_price)}</span>
          </div>
        `)
      },
    },
    polar: {
      radius: ['15%', '80%'],
    },
    angleAxis: {
      type: 'category',
      data: topStates.map(d => d.name.length > 12 ? d.name.slice(0, 10) + '...' : d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
        interval: 0,
      },
    },
    radiusAxis: {
      max: maxValue * 1.1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: {
        lineStyle: {
          color: COLORS.border,
          type: 'dashed',
          opacity: 0.3,
        },
      },
    },
    series: [
      {
        type: 'bar',
        data: topStates.map((d) => ({
          value: d.count,
          name: d.name,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: COLORS.accent },
              { offset: 1, color: echarts.color.modifyHSL(COLORS.accent, undefined, undefined, -0.2) },
            ]),
            shadowBlur: 10,
            shadowColor: COLORS.glowSteel,
          },
        })),
        coordinateSystem: 'polar',
        roundCap: true,
        barWidth: 12,
        emphasis: {
          itemStyle: {
            shadowBlur: 25,
            shadowColor: COLORS.glowSteel,
          },
        },
        universalTransition: true,
      },
    ],
  }

  const handleClick = (params: EChartsTooltipParams) => {
    if (onSelect && params.name) {
      const originalItem = topStates.find(d =>
        d.name === params.name ||
        (d.name.length > 12 && d.name.slice(0, 10) + '...' === params.name)
      )
      if (originalItem) {
        onSelect(originalItem.name)
      }
    }
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: 320 }}
      opts={{ renderer: 'canvas' }}
      onEvents={{ click: handleClick }}
    />
  )
}

// Price Comparison Radar
function PriceRadarChart({ data }: { data: AggregationItem[] }) {
  const sortedData = [...data]
    .filter(d => d.avg_price > 0)
    .sort((a, b) => b.avg_price - a.avg_price)
    .slice(0, 8)

  const maxPrice = Math.max(...sortedData.map(d => d.avg_price))

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    animationDuration: 1500,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      formatter: (params: EChartsTooltipParams) => {
        return createGlassTooltip(`
          <div style="color: ${COLORS.textPrimary}; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
            ${params.name}
          </div>
          <div style="display: flex; justify-content: space-between; gap: 20px;">
            <span style="color: ${COLORS.textSecondary};">Avg Price</span>
            <span style="color: ${COLORS.primary}; font-weight: 600;">${formatChartPrice(params.value)}</span>
          </div>
        `)
      },
    },
    radar: {
      indicator: sortedData.map(d => ({
        name: d.name,
        max: maxPrice * 1.1,
      })),
      shape: 'polygon',
      splitNumber: 4,
      axisName: {
        color: COLORS.textSecondary,
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: COLORS.border,
          opacity: 0.5,
        },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['transparent', 'rgba(99, 102, 241, 0.03)'],
        },
      },
      axisLine: {
        lineStyle: {
          color: COLORS.border,
        },
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: sortedData.map(d => d.avg_price),
            name: 'Avg Price',
            symbol: 'circle',
            symbolSize: 8,
            lineStyle: {
              width: 2,
              color: COLORS.primary,
              shadowBlur: 15,
              shadowColor: COLORS.glow,
            },
            itemStyle: {
              color: COLORS.primary,
              shadowBlur: 10,
              shadowColor: COLORS.glow,
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(99, 102, 241, 0.4)' },
                { offset: 1, color: 'rgba(99, 102, 241, 0.05)' },
              ]),
            },
          },
        ],
        universalTransition: true,
      },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: 300 }}
      opts={{ renderer: 'canvas' }}
    />
  )
}

// Card wrapper with glassmorphism
function GlassCard({
  children,
  title,
  subtitle,
  badge,
  className = ''
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
  badge?: string
  className?: string
}) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${COLORS.bgCard} 0%, rgba(15, 15, 35, 0.95) 100%)`,
        border: `1px solid ${COLORS.border}`,
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Subtle top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${COLORS.primary}40, transparent)`,
        }}
      />

      {(title || badge) && (
        <div className="flex items-center justify-between p-5 pb-0">
          <div>
            {title && (
              <h3 className="text-base font-semibold" style={{ color: COLORS.textPrimary }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                {subtitle}
              </p>
            )}
          </div>
          {badge && (
            <span
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: `${COLORS.primary}20`,
                color: COLORS.primary,
                border: `1px solid ${COLORS.primary}40`,
              }}
            >
              {badge}
            </span>
          )}
        </div>
      )}

      <div className="p-5">
        {children}
      </div>
    </div>
  )
}

// Filter Banner
function FilterBannerV3() {
  const { filter, clearFilter, isAnyFiltered } = useCrossFilter()

  if (!isAnyFiltered()) return null

  return (
    <div
      className="mb-6 p-4 rounded-xl flex items-center justify-between"
      style={{
        background: `linear-gradient(135deg, ${COLORS.primary}15 0%, ${COLORS.secondary}10 100%)`,
        border: `1px solid ${COLORS.primary}30`,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ background: `${COLORS.primary}20` }}
        >
          <svg className="w-5 h-5" style={{ color: COLORS.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>Active Filter</p>
          <p className="text-xs" style={{ color: COLORS.textSecondary }}>
            {filter.dimension?.replace('_', ' ').toUpperCase()}: <span style={{ color: COLORS.primary }}>{filter.value}</span>
          </p>
        </div>
      </div>
      <button
        onClick={clearFilter}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105"
        style={{
          background: `${COLORS.primary}20`,
          color: COLORS.primary,
          border: `1px solid ${COLORS.primary}40`,
        }}
      >
        Clear Filter
      </button>
    </div>
  )
}

// Main Content Component
function AnalyticsContentV3({ summaryData, inventoryItems, loading: initialLoading }: AnalyticsTabV3Props) {
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

  // Loading skeleton
  if (loading || !displayData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="h-32 rounded-2xl animate-pulse"
              style={{ background: COLORS.bgCard }}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div
              key={i}
              className="h-80 rounded-2xl animate-pulse"
              style={{ background: COLORS.bgCard }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <FilterBannerV3 />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumKPICard
          title="Total Inventory"
          value={formatChartNumber(displayData.total_units)}
          subtitle="Active listings"
          icon="🚐"
          color={COLORS.primary}
          glowColor={COLORS.glow}
        />
        <PremiumKPICard
          title="Market Value"
          value={formatCompactValue(displayData.total_value)}
          subtitle="Total inventory value"
          icon="💎"
          color={COLORS.accent}
          glowColor={COLORS.glowSteel}
        />
        <PremiumKPICard
          title="Average Price"
          value={formatChartPrice(displayData.avg_price)}
          subtitle="Per unit"
          icon="📊"
          color={COLORS.secondary}
          glowColor="rgba(139, 92, 246, 0.4)"
        />
        <PremiumKPICard
          title="Price Range"
          value={`${formatCompactValue(displayData.min_price)} - ${formatCompactValue(displayData.max_price)}`}
          subtitle="Min to Max"
          icon="📈"
          color={COLORS.success}
          glowColor="rgba(16, 185, 129, 0.4)"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Market Share" subtitle="Click segments to filter" badge="Interactive">
          <PremiumDonutChart
            data={displayData.by_rv_type}
            onSelect={(name) => setFilter('rv_type', name, 'donut')}
          />
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {displayData.by_rv_type.slice(0, 6).map(item => (
              <button
                key={item.name}
                onClick={() => setFilter('rv_type', item.name, 'legend')}
                className="flex items-center gap-2 p-2 rounded-lg transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: filter.value === item.name ? `${RV_COLORS[item.name]?.main || COLORS.primary}20` : 'transparent',
                  border: `1px solid ${filter.value === item.name ? RV_COLORS[item.name]?.main || COLORS.primary : 'transparent'}`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: RV_COLORS[item.name]?.main || COLORS.primary,
                    boxShadow: `0 0 8px ${RV_COLORS[item.name]?.glow || COLORS.glow}`,
                  }}
                />
                <span className="text-xs truncate" style={{ color: COLORS.textSecondary }}>
                  {item.name}
                </span>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="Condition Analysis" subtitle="NEW vs USED inventory">
          <ConditionGauges
            data={displayData.by_condition}
            onSelect={(condition) => setFilter('condition', condition, 'gauge')}
          />
        </GlassCard>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Geographic Distribution" subtitle="Top states by inventory" badge="Click to Filter">
          <GeographicRoseChart
            data={displayData.by_state}
            onSelect={(state) => setFilter('state', state, 'rose')}
          />
        </GlassCard>

        <GlassCard title="Top Manufacturers" subtitle="By unit count">
          <PremiumBarChart
            data={displayData.by_manufacturer}
            title="Manufacturers"
            color={COLORS.secondary}
            glowColor="rgba(139, 92, 246, 0.4)"
            onSelect={(name) => setFilter('manufacturer', name, 'bar')}
          />
        </GlassCard>
      </div>

      {/* Price Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Price Distribution" subtitle="NEW vs USED pricing curves">
          <PremiumAreaChart data={displayInventory} />
        </GlassCard>

        <GlassCard title="Top Dealer Groups" subtitle="By unit count">
          <PremiumBarChart
            data={displayData.by_dealer_group}
            title="Dealer Groups"
            color={COLORS.accent}
            glowColor={COLORS.glowSteel}
            onSelect={(name) => setFilter('dealer_group', name, 'bar')}
          />
        </GlassCard>
      </div>

      {/* Price Radar */}
      <GlassCard title="Price Analysis by RV Type" subtitle="Average pricing comparison">
        <PriceRadarChart data={displayData.by_rv_type} />
      </GlassCard>

      {/* Footer */}
      <div
        className="p-4 rounded-xl flex items-center justify-between"
        style={{
          background: `linear-gradient(90deg, ${COLORS.bgCard} 0%, ${COLORS.bgDark} 100%)`,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: COLORS.success,
              boxShadow: `0 0 10px ${COLORS.success}`,
            }}
          />
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            Displaying <span style={{ color: COLORS.textPrimary }}>{formatChartNumber(displayData.total_units)}</span> units
            across <span style={{ color: COLORS.textPrimary }}>{displayData.by_state.length}</span> states
          </p>
        </div>
        <span
          className="text-xs px-3 py-1 rounded-full font-semibold"
          style={{
            background: `${COLORS.primary}15`,
            color: COLORS.primary,
          }}
        >
          Version C (Thor Premium)
        </span>
      </div>
    </div>
  )
}

// Main Export
export function AnalyticsTabV3(props: AnalyticsTabV3Props) {
  return (
    <div
      className="min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6"
      style={{ background: COLORS.bgDark }}
    >
      <CrossFilterProvider>
        <AnalyticsContentV3 {...props} />
      </CrossFilterProvider>
    </div>
  )
}
