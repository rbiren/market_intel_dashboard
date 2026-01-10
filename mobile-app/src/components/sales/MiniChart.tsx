/**
 * Mini Chart Components
 *
 * Small, compact chart visualizations for dashboards and cards
 */

import { useSalesContext } from '../../context/SalesContext'

interface MiniBarChartProps {
  data: { name: string; value: number; color?: string }[]
  maxItems?: number
  showLabels?: boolean
  height?: number
}

export function MiniBarChart({
  data,
  maxItems = 5,
  showLabels = true,
  height = 120
}: MiniBarChartProps) {
  const { theme } = useSalesContext()
  const isDark = theme === 'dark'

  const items = data.slice(0, maxItems)
  const maxValue = Math.max(...items.map(d => d.value), 1)

  const defaultColors = ['#495737', '#a46807', '#577d91', '#8c8a7e', '#6b7a5e']

  return (
    <div style={{ height }} className="flex flex-col justify-between">
      {items.map((item, i) => (
        <div key={item.name} className="flex items-center gap-2">
          {showLabels && (
            <span className={`
              text-xs w-24 truncate font-medium
              ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}
            `}>
              {item.name}
            </span>
          )}
          <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color || defaultColors[i % defaultColors.length]
              }}
            />
          </div>
          <span className={`text-xs font-semibold w-12 text-right ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            {item.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

interface MiniDonutChartProps {
  value: number
  max: number
  label: string
  color?: string
  size?: number
}

export function MiniDonutChart({
  value,
  max,
  label,
  color = '#495737',
  size = 80
}: MiniDonutChartProps) {
  const { theme } = useSalesContext()
  const isDark = theme === 'dark'

  const percentage = (value / max) * 100
  const strokeWidth = size / 8
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke={color}
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease-out'
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold text-lg ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      <span className={`text-xs mt-2 font-medium ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
        {label}
      </span>
    </div>
  )
}

interface SparklineProps {
  data: number[]
  color?: string
  height?: number
  width?: number
}

export function Sparkline({
  data,
  color = '#495737',
  height = 40,
  width = 100
}: SparklineProps) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((value - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Area fill */}
      <polygon
        points={areaPoints}
        fill={`${color}20`}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
        r={3}
        fill={color}
      />
    </svg>
  )
}

interface ProgressBarProps {
  value: number
  max: number
  color?: string
  showLabel?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({
  value,
  max,
  color = '#495737',
  showLabel = true,
  label,
  size = 'md'
}: ProgressBarProps) {
  const { theme } = useSalesContext()
  const isDark = theme === 'dark'

  const percentage = Math.min((value / max) * 100, 100)

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className={`text-xs font-medium ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
              {label}
            </span>
          )}
          {showLabel && (
            <span className={`text-xs font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              {value.toLocaleString()} / {max.toLocaleString()}
            </span>
          )}
        </div>
      )}
      <div className={`
        w-full rounded-full overflow-hidden
        ${heightClasses[size]}
        ${isDark ? 'bg-white/10' : 'bg-[#d9d6cf]/50'}
      `}>
        <div
          className={`${heightClasses[size]} rounded-full transition-all duration-500 ease-out`}
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  )
}

interface MarketShareBarProps {
  items: { name: string; value: number; color?: string }[]
  total?: number
}

export function MarketShareBar({ items, total }: MarketShareBarProps) {
  const { theme } = useSalesContext()
  const isDark = theme === 'dark'

  const sum = total || items.reduce((acc, item) => acc + item.value, 0)
  const defaultColors = ['#495737', '#a46807', '#577d91', '#8c8a7e', '#6b7a5e', '#c4850d']

  return (
    <div className="w-full">
      {/* Stacked bar */}
      <div className={`
        flex h-3 rounded-full overflow-hidden
        ${isDark ? 'bg-white/10' : 'bg-[#d9d6cf]/30'}
      `}>
        {items.map((item, i) => (
          <div
            key={item.name}
            className="transition-all duration-500"
            style={{
              width: `${(item.value / sum) * 100}%`,
              backgroundColor: item.color || defaultColors[i % defaultColors.length]
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2">
        {items.map((item, i) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color || defaultColors[i % defaultColors.length] }}
            />
            <span className={`text-xs font-medium ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
              {item.name}
            </span>
            <span className={`text-xs font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              {Math.round((item.value / sum) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
