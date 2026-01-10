/**
 * Interactive USA Map Component
 *
 * A rich, interactive choropleth map for visualizing geographic distribution
 * of RV inventory across US states. Supports:
 * - State-level choropleth coloring based on inventory count
 * - Interactive hover tooltips with detailed stats
 * - Click-to-filter functionality
 * - Zoom and pan controls
 * - Thor Industries branded styling
 */

import { useState, useMemo, useCallback } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps'
import { scaleQuantile } from 'd3-scale'
import { THOR_COLORS, THOR_DARK } from '../../styles/thorTheme'
import { formatChartNumber, formatChartPrice, formatCompactValue } from './chartUtils'

// TopoJSON URL for US states
const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

// State name to abbreviation mapping
const STATE_ABBR: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC', 'Puerto Rico': 'PR',
}

interface AggregationItem {
  name: string
  count: number
  total_value: number
  avg_price: number
  min_price?: number
  max_price?: number
}

interface USAMapProps {
  data: AggregationItem[]
  onStateSelect?: (stateName: string) => void
  selectedState?: string | null
  height?: number
  colorScheme?: 'sage' | 'gold' | 'steel' | 'gradient'
  showLegend?: boolean
  darkMode?: boolean
  title?: string
  subtitle?: string
}

// Color scales for different themes
const COLOR_SCALES = {
  sage: [
    'rgba(73, 87, 55, 0.1)',
    'rgba(73, 87, 55, 0.25)',
    'rgba(73, 87, 55, 0.4)',
    'rgba(73, 87, 55, 0.6)',
    'rgba(73, 87, 55, 0.8)',
    THOR_COLORS.accent.sage,
  ],
  gold: [
    'rgba(164, 104, 7, 0.1)',
    'rgba(164, 104, 7, 0.25)',
    'rgba(164, 104, 7, 0.4)',
    'rgba(164, 104, 7, 0.6)',
    'rgba(164, 104, 7, 0.8)',
    THOR_COLORS.accent.gold,
  ],
  steel: [
    'rgba(87, 125, 145, 0.1)',
    'rgba(87, 125, 145, 0.25)',
    'rgba(87, 125, 145, 0.4)',
    'rgba(87, 125, 145, 0.6)',
    'rgba(87, 125, 145, 0.8)',
    THOR_COLORS.accent.steelBlue,
  ],
  gradient: [
    'rgba(73, 87, 55, 0.2)',
    'rgba(73, 87, 55, 0.5)',
    THOR_COLORS.accent.sage,
    'rgba(164, 104, 7, 0.7)',
    THOR_COLORS.accent.gold,
    '#c4850d',
  ],
}

export function USAMap({
  data,
  onStateSelect,
  selectedState = null,
  height = 400,
  colorScheme = 'sage',
  showLegend = true,
  darkMode = false,
  title,
  subtitle,
}: USAMapProps) {
  const [tooltipContent, setTooltipContent] = useState<{
    name: string
    data: AggregationItem | null
    x: number
    y: number
  } | null>(null)
  const [position, setPosition] = useState({ coordinates: [-96, 38] as [number, number], zoom: 1 })

  // Create data lookup map
  const dataMap = useMemo(() => {
    const map = new Map<string, AggregationItem>()
    data.forEach(item => {
      map.set(item.name, item)
      // Also map by abbreviation
      const abbr = STATE_ABBR[item.name]
      if (abbr) map.set(abbr, item)
    })
    return map
  }, [data])

  // Create color scale based on data values
  const colorScale = useMemo(() => {
    const counts = data.map(d => d.count).filter(c => c > 0)
    if (counts.length === 0) return () => COLOR_SCALES[colorScheme][0]

    return scaleQuantile<string>()
      .domain(counts)
      .range(COLOR_SCALES[colorScheme])
  }, [data, colorScheme])

  // Get color for a state
  const getStateColor = useCallback((stateName: string) => {
    const stateData = dataMap.get(stateName)
    if (!stateData || stateData.count === 0) {
      return darkMode ? 'rgba(35, 35, 34, 0.5)' : 'rgba(247, 244, 240, 0.8)'
    }
    return colorScale(stateData.count)
  }, [dataMap, colorScale, darkMode])

  // Handle state hover
  const handleMouseEnter = useCallback((geo: { properties: { name: string } }, event: React.MouseEvent) => {
    const stateName = geo.properties.name
    const stateData = dataMap.get(stateName) || null
    setTooltipContent({
      name: stateName,
      data: stateData,
      x: event.clientX,
      y: event.clientY,
    })
  }, [dataMap])

  const handleMouseLeave = useCallback(() => {
    setTooltipContent(null)
  }, [])

  // Handle state click
  const handleStateClick = useCallback((geo: { properties: { name: string } }) => {
    const stateName = geo.properties.name
    if (onStateSelect) {
      onStateSelect(stateName)
    }
  }, [onStateSelect])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (position.zoom >= 4) return
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }))
  }, [position.zoom])

  const handleZoomOut = useCallback(() => {
    if (position.zoom <= 1) return
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }))
  }, [position.zoom])

  const handleReset = useCallback(() => {
    setPosition({ coordinates: [-96, 38], zoom: 1 })
  }, [])

  const handleMoveEnd = useCallback((pos: { coordinates: [number, number]; zoom: number }) => {
    setPosition(pos)
  }, [])

  // Get legend values
  const legendValues = useMemo(() => {
    const counts = data.map(d => d.count).filter(c => c > 0).sort((a, b) => a - b)
    if (counts.length === 0) return []

    const quantiles = colorScale.quantiles()
    return [0, ...quantiles, counts[counts.length - 1]]
  }, [data, colorScale])

  const bgColor = darkMode ? THOR_DARK.bgDark : THOR_COLORS.neutral.lightBeige
  const borderColor = darkMode ? THOR_DARK.border : THOR_COLORS.neutral.borderGray
  const textColor = darkMode ? THOR_DARK.textPrimary : THOR_COLORS.primary.charcoal
  const textSecondary = darkMode ? THOR_DARK.textSecondary : THOR_COLORS.neutral.warmGray

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="p-4 pb-0">
          {title && (
            <h3
              className="text-base font-semibold"
              style={{ color: textColor }}
            >
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: textSecondary }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Map Container */}
      <div className="relative" style={{ height }}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{
            scale: 1000,
          }}
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            maxZoom={4}
            minZoom={1}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName = geo.properties.name
                  const isSelected = selectedState === stateName
                  const stateData = dataMap.get(stateName)

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(e) => handleMouseEnter(geo, e)}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => handleStateClick(geo)}
                      style={{
                        default: {
                          fill: getStateColor(stateName),
                          stroke: isSelected ? THOR_COLORS.accent.sage : (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                          strokeWidth: isSelected ? 2 : 0.5,
                          outline: 'none',
                          cursor: stateData ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                        },
                        hover: {
                          fill: stateData ? THOR_COLORS.accent.sage : getStateColor(stateName),
                          stroke: THOR_COLORS.accent.sage,
                          strokeWidth: 1.5,
                          outline: 'none',
                          cursor: stateData ? 'pointer' : 'default',
                        },
                        pressed: {
                          fill: THOR_COLORS.accent.gold,
                          stroke: THOR_COLORS.accent.sage,
                          strokeWidth: 2,
                          outline: 'none',
                        },
                      }}
                    />
                  )
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Zoom Controls */}
        <div
          className="absolute top-4 right-4 flex flex-col gap-1"
          style={{ zIndex: 10 }}
        >
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-all hover:scale-105"
            style={{
              background: darkMode ? THOR_DARK.bgCard : 'white',
              color: textColor,
              border: `1px solid ${borderColor}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold transition-all hover:scale-105"
            style={{
              background: darkMode ? THOR_DARK.bgCard : 'white',
              color: textColor,
              border: `1px solid ${borderColor}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            −
          </button>
          <button
            onClick={handleReset}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:scale-105 mt-1"
            style={{
              background: darkMode ? THOR_DARK.bgCard : 'white',
              color: textColor,
              border: `1px solid ${borderColor}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
            title="Reset zoom"
          >
            ⟲
          </button>
        </div>

        {/* Tooltip */}
        {tooltipContent && (
          <div
            className="fixed pointer-events-none z-50"
            style={{
              left: tooltipContent.x + 15,
              top: tooltipContent.y - 10,
            }}
          >
            <div
              className="rounded-xl p-4 min-w-[200px]"
              style={{
                background: darkMode
                  ? 'rgba(15, 15, 35, 0.95)'
                  : 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : THOR_COLORS.neutral.borderGray}`,
                boxShadow: darkMode
                  ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(73, 87, 55, 0.1)'
                  : '0 4px 20px rgba(0, 0, 0, 0.15)',
              }}
            >
              <div
                className="font-semibold text-sm mb-2 flex items-center gap-2"
                style={{ color: textColor }}
              >
                <span className="text-lg">📍</span>
                {tooltipContent.name}
                {STATE_ABBR[tooltipContent.name] && (
                  <span style={{ color: textSecondary }}>
                    ({STATE_ABBR[tooltipContent.name]})
                  </span>
                )}
              </div>

              {tooltipContent.data ? (
                <div className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <span style={{ color: textSecondary }}>Units</span>
                    <span className="font-semibold" style={{ color: THOR_COLORS.accent.sage }}>
                      {formatChartNumber(tooltipContent.data.count)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span style={{ color: textSecondary }}>Total Value</span>
                    <span className="font-semibold" style={{ color: THOR_COLORS.accent.gold }}>
                      {formatCompactValue(tooltipContent.data.total_value)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span style={{ color: textSecondary }}>Avg Price</span>
                    <span className="font-semibold" style={{ color: THOR_COLORS.accent.steelBlue }}>
                      {formatChartPrice(tooltipContent.data.avg_price)}
                    </span>
                  </div>
                  <div
                    className="text-xs mt-2 pt-2"
                    style={{
                      color: THOR_COLORS.accent.sage,
                      borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : THOR_COLORS.neutral.borderGray}`,
                    }}
                  >
                    Click to filter by this state
                  </div>
                </div>
              ) : (
                <div style={{ color: textSecondary }} className="text-sm">
                  No inventory data
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && legendValues.length > 0 && (
        <div className="p-4 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: textSecondary }}>
              Low
            </span>
            <div className="flex-1 flex h-3 rounded-full overflow-hidden">
              {COLOR_SCALES[colorScheme].map((color, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{ background: color }}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: textSecondary }}>
              High
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: textSecondary }}>
              {formatCompactValue(legendValues[0], 'count')}
            </span>
            <span className="text-xs font-medium" style={{ color: textColor }}>
              Units
            </span>
            <span className="text-xs" style={{ color: textSecondary }}>
              {formatCompactValue(legendValues[legendValues.length - 1], 'count')}
            </span>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div
        className="grid grid-cols-3 gap-2 p-4 pt-0"
      >
        <div
          className="text-center p-2 rounded-lg"
          style={{ background: darkMode ? 'rgba(73, 87, 55, 0.1)' : 'rgba(73, 87, 55, 0.08)' }}
        >
          <p className="text-lg font-bold" style={{ color: THOR_COLORS.accent.sage }}>
            {data.filter(d => d.count > 0).length}
          </p>
          <p className="text-xs" style={{ color: textSecondary }}>States</p>
        </div>
        <div
          className="text-center p-2 rounded-lg"
          style={{ background: darkMode ? 'rgba(164, 104, 7, 0.1)' : 'rgba(164, 104, 7, 0.08)' }}
        >
          <p className="text-lg font-bold" style={{ color: THOR_COLORS.accent.gold }}>
            {formatCompactValue(data.reduce((sum, d) => sum + d.count, 0), 'count')}
          </p>
          <p className="text-xs" style={{ color: textSecondary }}>Total Units</p>
        </div>
        <div
          className="text-center p-2 rounded-lg"
          style={{ background: darkMode ? 'rgba(87, 125, 145, 0.1)' : 'rgba(87, 125, 145, 0.08)' }}
        >
          <p className="text-lg font-bold" style={{ color: THOR_COLORS.accent.steelBlue }}>
            {formatCompactValue(data.reduce((sum, d) => sum + d.total_value, 0))}
          </p>
          <p className="text-xs" style={{ color: textSecondary }}>Total Value</p>
        </div>
      </div>
    </div>
  )
}

export default USAMap
