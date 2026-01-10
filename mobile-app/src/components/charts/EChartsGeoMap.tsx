/**
 * ECharts Premium Geo Map Component
 *
 * A stunning, interactive USA map built with ECharts featuring:
 * - Choropleth coloring with gradient fills
 * - Scatter overlay for cities
 * - Interactive drill-down from region → state → city
 * - Animated transitions
 * - Thor Industries branded dark mode styling
 * - Glow effects and glassmorphism tooltips
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
// Thor theme colors are defined locally for this component
import { formatChartNumber, formatChartPrice, formatCompactValue } from './chartUtils'

// US GeoJSON will be registered dynamically
const US_GEO_JSON_URL = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json'

interface AggregationItem {
  name: string
  count: number
  total_value: number
  avg_price: number
  min_price?: number
  max_price?: number
}

interface EChartsGeoMapProps {
  stateData: AggregationItem[]
  regionData?: AggregationItem[]
  cityData?: AggregationItem[]
  onStateSelect?: (stateName: string) => void
  onRegionSelect?: (regionName: string) => void
  onCitySelect?: (cityName: string) => void
  selectedState?: string | null
  height?: number
  showCities?: boolean
  showRegions?: boolean
  title?: string
  subtitle?: string
}

// ECharts tooltip params interface
interface EChartsTooltipParams {
  name: string
  value: number | number[]
  data?: {
    name?: string
    value?: number | number[]
    count?: number
    total_value?: number
    avg_price?: number
  }
  color?: string
  seriesType?: string
  componentType?: string
}

// Thor-branded color palette
const COLORS = {
  primary: '#495737',
  secondary: '#a46807',
  accent: '#577d91',
  bgDark: '#181817',
  bgCard: '#232322',
  textPrimary: '#fffdfa',
  textSecondary: '#8c8a7e',
  textMuted: '#595755',
  border: 'rgba(217, 214, 207, 0.15)',
  glow: 'rgba(73, 87, 55, 0.4)',
  glowGold: 'rgba(164, 104, 7, 0.4)',
  glowSteel: 'rgba(87, 125, 145, 0.4)',
}

// Region color mapping
const REGION_COLORS: Record<string, string> = {
  'SOUTHEAST': '#495737',
  'NORTHEAST': '#577d91',
  'SOUTHWEST': '#a46807',
  'MIDWEST': '#6b7a5e',
  'NORTHWEST': '#4a6673',
  'CANADA': '#8c8a7e',
  'ONLINE': '#c4850d',
}

// State to region mapping
const STATE_REGIONS: Record<string, string> = {
  'Alabama': 'SOUTHEAST', 'Florida': 'SOUTHEAST', 'Georgia': 'SOUTHEAST',
  'Kentucky': 'SOUTHEAST', 'Mississippi': 'SOUTHEAST', 'North Carolina': 'SOUTHEAST',
  'South Carolina': 'SOUTHEAST', 'Tennessee': 'SOUTHEAST', 'Virginia': 'SOUTHEAST',
  'West Virginia': 'SOUTHEAST', 'Louisiana': 'SOUTHEAST', 'Arkansas': 'SOUTHEAST',
  'Connecticut': 'NORTHEAST', 'Delaware': 'NORTHEAST', 'Maine': 'NORTHEAST',
  'Maryland': 'NORTHEAST', 'Massachusetts': 'NORTHEAST', 'New Hampshire': 'NORTHEAST',
  'New Jersey': 'NORTHEAST', 'New York': 'NORTHEAST', 'Pennsylvania': 'NORTHEAST',
  'Rhode Island': 'NORTHEAST', 'Vermont': 'NORTHEAST',
  'Arizona': 'SOUTHWEST', 'New Mexico': 'SOUTHWEST', 'Oklahoma': 'SOUTHWEST', 'Texas': 'SOUTHWEST',
  'Illinois': 'MIDWEST', 'Indiana': 'MIDWEST', 'Iowa': 'MIDWEST', 'Kansas': 'MIDWEST',
  'Michigan': 'MIDWEST', 'Minnesota': 'MIDWEST', 'Missouri': 'MIDWEST', 'Nebraska': 'MIDWEST',
  'North Dakota': 'MIDWEST', 'Ohio': 'MIDWEST', 'South Dakota': 'MIDWEST', 'Wisconsin': 'MIDWEST',
  'Colorado': 'NORTHWEST', 'Idaho': 'NORTHWEST', 'Montana': 'NORTHWEST', 'Nevada': 'NORTHWEST',
  'Oregon': 'NORTHWEST', 'Utah': 'NORTHWEST', 'Washington': 'NORTHWEST', 'Wyoming': 'NORTHWEST',
  'California': 'SOUTHWEST', 'Hawaii': 'SOUTHWEST', 'Alaska': 'NORTHWEST',
}

// Approximate state center coordinates for city bubbles
const STATE_CENTERS: Record<string, [number, number]> = {
  'Alabama': [-86.9, 32.8], 'Alaska': [-153.5, 64.3], 'Arizona': [-111.4, 34.3],
  'Arkansas': [-92.4, 34.8], 'California': [-119.4, 36.8], 'Colorado': [-105.3, 39.0],
  'Connecticut': [-72.7, 41.6], 'Delaware': [-75.5, 39.0], 'Florida': [-81.5, 27.7],
  'Georgia': [-83.6, 32.7], 'Hawaii': [-155.5, 19.9], 'Idaho': [-114.5, 44.1],
  'Illinois': [-89.4, 40.0], 'Indiana': [-86.3, 40.0], 'Iowa': [-93.5, 42.0],
  'Kansas': [-98.4, 38.5], 'Kentucky': [-85.8, 37.8], 'Louisiana': [-92.0, 31.0],
  'Maine': [-69.4, 45.3], 'Maryland': [-76.6, 39.0], 'Massachusetts': [-71.5, 42.2],
  'Michigan': [-84.5, 44.3], 'Minnesota': [-94.6, 46.4], 'Mississippi': [-89.7, 32.7],
  'Missouri': [-91.8, 38.5], 'Montana': [-110.4, 47.0], 'Nebraska': [-99.9, 41.5],
  'Nevada': [-116.9, 38.8], 'New Hampshire': [-71.6, 43.2], 'New Jersey': [-74.4, 40.1],
  'New Mexico': [-105.9, 34.5], 'New York': [-75.5, 43.0], 'North Carolina': [-79.8, 35.5],
  'North Dakota': [-100.5, 47.4], 'Ohio': [-82.8, 40.4], 'Oklahoma': [-97.5, 35.5],
  'Oregon': [-120.5, 44.0], 'Pennsylvania': [-77.2, 41.2], 'Rhode Island': [-71.5, 41.7],
  'South Carolina': [-81.0, 33.8], 'South Dakota': [-100.2, 44.4], 'Tennessee': [-86.3, 35.9],
  'Texas': [-99.3, 31.5], 'Utah': [-111.7, 39.3], 'Vermont': [-72.6, 44.0],
  'Virginia': [-78.2, 37.5], 'Washington': [-120.5, 47.4], 'West Virginia': [-80.4, 38.9],
  'Wisconsin': [-89.6, 44.4], 'Wyoming': [-107.3, 43.0],
}

// Glassmorphism tooltip formatter
const createGlassTooltip = (content: string) => `
  <div style="
    background: rgba(15, 15, 35, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    padding: 16px 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 60px rgba(73, 87, 55, 0.15);
    font-family: 'Montserrat', 'Inter', -apple-system, sans-serif;
    min-width: 220px;
  ">
    ${content}
  </div>
`

export function EChartsGeoMap({
  stateData,
  regionData = [],
  cityData = [],
  onStateSelect,
  onRegionSelect,
  onCitySelect,
  selectedState = null,
  height = 500,
  showCities = true,
  showRegions = false,
  title,
  subtitle,
}: EChartsGeoMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [viewMode, setViewMode] = useState<'states' | 'regions' | 'heatmap'>('states')
  const chartRef = useRef<ReactECharts>(null)

  // Load and register US map
  useEffect(() => {
    const loadMap = async () => {
      try {
        // Check if map is already registered
        if (echarts.getMap('USA')) {
          setMapLoaded(true)
          return
        }

        const response = await fetch(US_GEO_JSON_URL)
        const geoJson = await response.json()
        echarts.registerMap('USA', geoJson)
        setMapLoaded(true)
      } catch (error) {
        console.error('Failed to load US map:', error)
      }
    }
    loadMap()
  }, [])

  // Create state data lookup
  const stateDataMap = useMemo(() => {
    const map = new Map<string, AggregationItem>()
    stateData.forEach(item => {
      const titleCaseName = toTitleCase(item.name)
      map.set(titleCaseName, item)
    })
    return map
  }, [stateData])

  // Calculate max values for scaling
  const maxStateCount = useMemo(() => {
    return Math.max(...stateData.map(d => d.count), 1)
  }, [stateData])

  // Prepare map data
  const mapSeriesData = useMemo(() => {
    // Convert selectedState to title case for comparison (API returns uppercase)
    const selectedStateTitleCase = selectedState ? toTitleCase(selectedState) : null

    return stateData.map(item => {
      const stateName = toTitleCase(item.name)
      const region = STATE_REGIONS[stateName]
      const baseColor = showRegions && region
        ? REGION_COLORS[region] || COLORS.primary
        : COLORS.primary
      const isSelected = selectedStateTitleCase === stateName

      return {
        name: stateName,
        value: item.count,
        count: item.count,
        total_value: item.total_value,
        avg_price: item.avg_price,
        itemStyle: {
          areaColor: isSelected
            ? COLORS.secondary
            : `rgba(${hexToRgb(baseColor)}, ${0.2 + (item.count / maxStateCount) * 0.7})`,
          borderColor: isSelected
            ? COLORS.secondary
            : 'rgba(255, 255, 255, 0.15)',
          borderWidth: isSelected ? 2 : 0.5,
          shadowBlur: isSelected ? 20 : 0,
          shadowColor: isSelected ? COLORS.glowGold : 'transparent',
        },
        emphasis: {
          itemStyle: {
            areaColor: COLORS.primary,
            borderColor: COLORS.primary,
            borderWidth: 2,
            shadowBlur: 15,
            shadowColor: COLORS.glow,
          },
        },
      }
    })
  }, [stateData, maxStateCount, selectedState, showRegions])

  // Prepare city scatter data
  const cityScatterData = useMemo(() => {
    if (!showCities || cityData.length === 0) return []

    const maxCityCount = Math.max(...cityData.map(d => d.count), 1)

    return cityData.slice(0, 30).map(city => {
      // Try to find state center for this city (simplified - in real app, would use city coords)
      const stateMatch = stateData.find(s => city.name.includes(s.name.split(' ')[0]))
      const coords = stateMatch ? STATE_CENTERS[stateMatch.name] : null

      if (!coords) return null

      const size = 8 + (city.count / maxCityCount) * 25

      return {
        name: city.name,
        value: [...coords, city.count],
        count: city.count,
        total_value: city.total_value,
        avg_price: city.avg_price,
        symbolSize: size,
        itemStyle: {
          color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
            { offset: 0, color: 'rgba(164, 104, 7, 0.9)' },
            { offset: 0.5, color: 'rgba(164, 104, 7, 0.5)' },
            { offset: 1, color: 'rgba(164, 104, 7, 0.1)' },
          ]),
          shadowBlur: 15,
          shadowColor: COLORS.glowGold,
        },
      }
    }).filter(Boolean)
  }, [cityData, stateData, showCities])

  // ECharts option
  const option = useMemo((): echarts.EChartsOption => {
    if (!mapLoaded) return {}

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
        formatter: (params: EChartsTooltipParams | EChartsTooltipParams[]) => {
          const p = Array.isArray(params) ? params[0] : params

          if (p.seriesType === 'scatter') {
            // City tooltip
            const data = p.data as { name?: string; count?: number; total_value?: number; avg_price?: number }
            return createGlassTooltip(`
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                <span style="font-size: 20px;">🏙️</span>
                <div>
                  <div style="color: ${COLORS.textPrimary}; font-weight: 700; font-size: 15px;">
                    ${data?.name || p.name}
                  </div>
                  <div style="color: ${COLORS.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
                    City
                  </div>
                </div>
              </div>
              <div style="display: grid; gap: 8px;">
                <div style="display: flex; justify-content: space-between; gap: 24px;">
                  <span style="color: ${COLORS.textSecondary};">Units</span>
                  <span style="color: ${COLORS.secondary}; font-weight: 600;">${formatChartNumber(data?.count || 0)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 24px;">
                  <span style="color: ${COLORS.textSecondary};">Total Value</span>
                  <span style="color: ${COLORS.primary}; font-weight: 600;">${formatCompactValue(data?.total_value)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 24px;">
                  <span style="color: ${COLORS.textSecondary};">Avg Price</span>
                  <span style="color: ${COLORS.accent}; font-weight: 600;">${formatChartPrice(data?.avg_price)}</span>
                </div>
              </div>
            `)
          }

          // State tooltip
          const stateInfo = stateDataMap.get(p.name)
          const region = STATE_REGIONS[p.name]

          return createGlassTooltip(`
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
              <span style="font-size: 20px;">📍</span>
              <div>
                <div style="color: ${COLORS.textPrimary}; font-weight: 700; font-size: 15px;">
                  ${p.name}
                </div>
                ${region ? `<div style="color: ${REGION_COLORS[region]}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
                  ${region}
                </div>` : ''}
              </div>
            </div>
            ${stateInfo ? `
              <div style="display: grid; gap: 8px;">
                <div style="display: flex; justify-content: space-between; gap: 24px;">
                  <span style="color: ${COLORS.textSecondary};">Inventory</span>
                  <span style="color: ${COLORS.primary}; font-weight: 600;">${formatChartNumber(stateInfo.count)} units</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 24px;">
                  <span style="color: ${COLORS.textSecondary};">Total Value</span>
                  <span style="color: ${COLORS.secondary}; font-weight: 600;">${formatCompactValue(stateInfo.total_value)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; gap: 24px;">
                  <span style="color: ${COLORS.textSecondary};">Avg Price</span>
                  <span style="color: ${COLORS.accent}; font-weight: 600;">${formatChartPrice(stateInfo.avg_price)}</span>
                </div>
              </div>
              <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                <span style="color: ${COLORS.primary}; font-size: 11px;">Click to filter by state</span>
              </div>
            ` : `
              <div style="color: ${COLORS.textMuted}; font-size: 13px;">
                No inventory data available
              </div>
            `}
          `)
        },
      },
      visualMap: {
        show: true,
        type: 'continuous',
        min: 0,
        max: maxStateCount,
        left: 'left',
        top: 'bottom',
        text: ['High', 'Low'],
        textStyle: {
          color: COLORS.textSecondary,
          fontSize: 11,
        },
        inRange: {
          color: [
            'rgba(73, 87, 55, 0.15)',
            'rgba(73, 87, 55, 0.35)',
            'rgba(73, 87, 55, 0.55)',
            'rgba(73, 87, 55, 0.75)',
            COLORS.primary,
          ],
        },
        calculable: true,
        itemWidth: 12,
        itemHeight: 120,
        formatter: (value: number) => formatCompactValue(value, 'count'),
      },
      geo: {
        map: 'USA',
        roam: true,
        zoom: 1.2,
        center: [-96, 38],
        scaleLimit: {
          min: 0.8,
          max: 6,
        },
        itemStyle: {
          areaColor: '#2a2a29',
          borderColor: 'rgba(255, 255, 255, 0.4)',
          borderWidth: 1.5,
        },
        emphasis: {
          disabled: false,
          itemStyle: {
            areaColor: COLORS.primary,
            borderColor: COLORS.primary,
            borderWidth: 2,
            shadowBlur: 20,
            shadowColor: COLORS.glow,
          },
          label: {
            show: true,
            color: COLORS.textPrimary,
            fontSize: 12,
            fontWeight: 600,
          },
        },
        select: {
          itemStyle: {
            areaColor: COLORS.secondary,
            borderColor: COLORS.secondary,
            borderWidth: 2,
          },
        },
        label: {
          show: false,
          color: COLORS.textSecondary,
          fontSize: 10,
        },
        regions: mapSeriesData.map(d => ({
          name: d.name,
          itemStyle: d.itemStyle,
          emphasis: d.emphasis,
        })),
      },
      series: [
        // Map series
        {
          type: 'map',
          map: 'USA',
          geoIndex: 0,
          data: mapSeriesData,
          animationDurationUpdate: 800,
          universalTransition: true,
        },
        // City scatter series
        ...(showCities && cityScatterData.length > 0 ? [{
          type: 'scatter',
          coordinateSystem: 'geo',
          data: cityScatterData,
          symbol: 'circle',
          animationDelay: 500,
          animationDuration: 1000,
          zlevel: 2,
        }] : []) as echarts.SeriesOption[],
      ],
    }
  }, [mapLoaded, mapSeriesData, cityScatterData, showCities, maxStateCount, stateDataMap])

  // Handle map click
  const handleClick = useCallback((params: EChartsTooltipParams) => {
    if (params.seriesType === 'scatter' && onCitySelect) {
      const data = params.data as { name?: string }
      if (data?.name) onCitySelect(data.name)
    } else if (params.componentType === 'geo' || params.seriesType === 'map') {
      if (onStateSelect && params.name) {
        // Convert title case back to uppercase for API compatibility
        onStateSelect(params.name.toUpperCase())
      }
    }
  }, [onStateSelect, onCitySelect])

  if (!mapLoaded) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center"
        style={{
          height,
          background: `linear-gradient(135deg, ${COLORS.bgCard} 0%, ${COLORS.bgDark} 100%)`,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 animate-pulse"
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary}40 0%, ${COLORS.secondary}40 100%)`,
              boxShadow: `0 0 40px ${COLORS.glow}`,
            }}
          />
          <p style={{ color: COLORS.textSecondary }}>Loading map data...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${COLORS.bgCard} 0%, ${COLORS.bgDark} 100%)`,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {/* Decorative top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${COLORS.primary}60, ${COLORS.secondary}60, transparent)`,
        }}
      />

      {/* Header */}
      {(title || subtitle) && (
        <div className="p-5 pb-0 flex items-center justify-between">
          <div>
            {title && (
              <h3
                className="text-lg font-bold tracking-tight"
                style={{ color: COLORS.textPrimary }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                {subtitle}
              </p>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex gap-1">
            {(['states', 'regions', 'heatmap'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: viewMode === mode ? `${COLORS.primary}30` : 'transparent',
                  color: viewMode === mode ? COLORS.primary : COLORS.textMuted,
                  border: `1px solid ${viewMode === mode ? COLORS.primary : 'transparent'}`,
                }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height }}
        opts={{ renderer: 'canvas' }}
        onEvents={{
          click: handleClick,
        }}
      />

      {/* Interactive hint */}
      <div
        className="absolute bottom-4 right-4 px-3 py-2 rounded-lg flex items-center gap-2"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <span style={{ color: COLORS.textMuted }} className="text-xs">
          Scroll to zoom • Drag to pan
        </span>
      </div>

      {/* Region legend (when in region mode) */}
      {showRegions && regionData.length > 0 && (
        <div className="p-4 pt-0">
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
            {regionData.map(region => (
              <button
                key={region.name}
                onClick={() => onRegionSelect?.(region.name)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all hover:scale-105"
                style={{
                  background: `${REGION_COLORS[region.name] || COLORS.primary}20`,
                  border: `1px solid ${REGION_COLORS[region.name] || COLORS.primary}40`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: REGION_COLORS[region.name] || COLORS.primary,
                    boxShadow: `0 0 8px ${REGION_COLORS[region.name] || COLORS.primary}`,
                  }}
                />
                <span className="text-xs truncate" style={{ color: COLORS.textSecondary }}>
                  {region.name.slice(0, 6)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div
        className="grid grid-cols-4 gap-3 p-4"
        style={{ borderTop: `1px solid ${COLORS.border}` }}
      >
        <div className="text-center">
          <p className="text-xl font-bold" style={{ color: COLORS.primary }}>
            {stateData.filter(d => d.count > 0).length}
          </p>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>States</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold" style={{ color: COLORS.secondary }}>
            {formatCompactValue(stateData.reduce((s, d) => s + d.count, 0), 'count')}
          </p>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>Units</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold" style={{ color: COLORS.accent }}>
            {formatCompactValue(stateData.reduce((s, d) => s + d.total_value, 0))}
          </p>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>Value</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold" style={{ color: COLORS.textPrimary }}>
            {regionData.length || Object.keys(REGION_COLORS).length}
          </p>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>Regions</p>
        </div>
      </div>
    </div>
  )
}

// Helper: Convert hex to RGB values
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '73, 87, 55'
}

export default EChartsGeoMap

// Helper: Convert state name to Title Case (e.g., "CALIFORNIA" -> "California")
function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}
