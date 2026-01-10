/**
 * Mobile-Optimized Geographic Map Component
 *
 * A touch-friendly, mobile-first map visualization featuring:
 * - Simplified US map with tap-to-select states
 * - Region-based card list alternative view
 * - Swipeable state carousel
 * - Bottom sheet for state details
 * - Optimized for small screens and touch
 */

import { useState, useMemo, useCallback } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
} from 'react-simple-maps'
import { scaleQuantile } from 'd3-scale'
import { THOR_COLORS } from '../../styles/thorTheme'
import { formatChartNumber, formatChartPrice, formatCompactValue } from './chartUtils'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

interface AggregationItem {
  name: string
  count: number
  total_value: number
  avg_price: number
}

interface MobileGeoMapProps {
  stateData: AggregationItem[]
  regionData?: AggregationItem[]
  onStateSelect?: (stateName: string) => void
  selectedState?: string | null
}

// Region mapping
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
  'California': 'SOUTHWEST', 'Hawaii': 'SOUTHWEST',
  'Illinois': 'MIDWEST', 'Indiana': 'MIDWEST', 'Iowa': 'MIDWEST', 'Kansas': 'MIDWEST',
  'Michigan': 'MIDWEST', 'Minnesota': 'MIDWEST', 'Missouri': 'MIDWEST', 'Nebraska': 'MIDWEST',
  'North Dakota': 'MIDWEST', 'Ohio': 'MIDWEST', 'South Dakota': 'MIDWEST', 'Wisconsin': 'MIDWEST',
  'Colorado': 'NORTHWEST', 'Idaho': 'NORTHWEST', 'Montana': 'NORTHWEST', 'Nevada': 'NORTHWEST',
  'Oregon': 'NORTHWEST', 'Utah': 'NORTHWEST', 'Washington': 'NORTHWEST', 'Wyoming': 'NORTHWEST',
  'Alaska': 'NORTHWEST',
}

const REGION_COLORS: Record<string, string> = {
  'SOUTHEAST': THOR_COLORS.accent.sage,
  'NORTHEAST': THOR_COLORS.accent.steelBlue,
  'SOUTHWEST': THOR_COLORS.accent.gold,
  'MIDWEST': '#6b7a5e',
  'NORTHWEST': '#4a6673',
}

const REGION_ICONS: Record<string, string> = {
  'SOUTHEAST': '🌴',
  'NORTHEAST': '🏙️',
  'SOUTHWEST': '🌵',
  'MIDWEST': '🌾',
  'NORTHWEST': '🏔️',
}

export function MobileGeoMap({
  stateData,
  regionData,
  onStateSelect,
  selectedState = null,
}: MobileGeoMapProps) {
  // Note: regionData is received but we compute our own regionAggregates from stateData for accuracy
  void regionData // Acknowledge the prop to satisfy linter
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'regions'>('map')
  const [activeStateDetail, setActiveStateDetail] = useState<AggregationItem | null>(null)

  // Create data lookup
  const stateDataMap = useMemo(() => {
    const map = new Map<string, AggregationItem>()
    stateData.forEach(item => map.set(item.name, item))
    return map
  }, [stateData])

  // Color scale
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const colorScale = useMemo(() => {
    const counts = stateData.map(d => d.count).filter(c => c > 0)
    if (counts.length === 0) return () => 'rgba(73, 87, 55, 0.1)'

    return scaleQuantile<string>()
      .domain(counts)
      .range([
        'rgba(73, 87, 55, 0.15)',
        'rgba(73, 87, 55, 0.3)',
        'rgba(73, 87, 55, 0.5)',
        'rgba(73, 87, 55, 0.7)',
        THOR_COLORS.accent.sage,
      ])
  }, [stateData])

  // Top states for list view
  const topStates = useMemo(() => {
    return [...stateData].sort((a, b) => b.count - a.count).slice(0, 15)
  }, [stateData])

  // Aggregate by region
  const regionAggregates = useMemo(() => {
    const regions = new Map<string, { count: number; value: number; states: string[] }>()

    stateData.forEach(state => {
      const region = STATE_REGIONS[state.name]
      if (!region) return

      const current = regions.get(region) || { count: 0, value: 0, states: [] }
      current.count += state.count
      current.value += state.total_value
      current.states.push(state.name)
      regions.set(region, current)
    })

    return Array.from(regions.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
  }, [stateData])

  // Handle state tap
  const handleStateTap = useCallback((geo: { properties: { name: string } }) => {
    const stateName = geo.properties.name
    const data = stateDataMap.get(stateName)

    if (data) {
      setActiveStateDetail(data)
    }
  }, [stateDataMap])

  // Handle state select (filter)
  const handleStateFilter = useCallback(() => {
    if (activeStateDetail && onStateSelect) {
      onStateSelect(activeStateDetail.name)
      setActiveStateDetail(null)
    }
  }, [activeStateDetail, onStateSelect])

  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-[var(--thor-border-gray)]">
      {/* View Mode Tabs */}
      <div className="flex border-b border-[var(--thor-border-gray)]">
        {(['map', 'list', 'regions'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className="flex-1 py-3 text-sm font-semibold transition-colors"
            style={{
              color: viewMode === mode ? THOR_COLORS.accent.sage : THOR_COLORS.neutral.warmGray,
              borderBottom: viewMode === mode ? `2px solid ${THOR_COLORS.accent.sage}` : '2px solid transparent',
              background: viewMode === mode ? 'rgba(73, 87, 55, 0.05)' : 'transparent',
            }}
          >
            {mode === 'map' && '🗺️ '}
            {mode === 'list' && '📋 '}
            {mode === 'regions' && '🌎 '}
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="relative">
          <ComposableMap
            projection="geoAlbersUsa"
            projectionConfig={{ scale: 900 }}
            style={{ width: '100%', height: 280 }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName = geo.properties.name
                  const data = stateDataMap.get(stateName)
                  const isSelected = selectedState === stateName
                  const isActive = activeStateDetail?.name === stateName

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => handleStateTap(geo)}
                      style={{
                        default: {
                          fill: isSelected || isActive
                            ? THOR_COLORS.accent.gold
                            : data
                              ? colorScale(data.count)
                              : 'rgba(247, 244, 240, 0.8)',
                          stroke: isActive ? THOR_COLORS.accent.gold : 'rgba(0,0,0,0.1)',
                          strokeWidth: isActive ? 2 : 0.5,
                          outline: 'none',
                          transition: 'all 0.15s ease',
                        },
                        hover: {
                          fill: data ? THOR_COLORS.accent.sage : 'rgba(247, 244, 240, 0.8)',
                          stroke: THOR_COLORS.accent.sage,
                          strokeWidth: 1.5,
                          outline: 'none',
                        },
                        pressed: {
                          fill: THOR_COLORS.accent.gold,
                          stroke: THOR_COLORS.accent.gold,
                          strokeWidth: 2,
                          outline: 'none',
                        },
                      }}
                    />
                  )
                })
              }
            </Geographies>
          </ComposableMap>

          {/* Tap hint */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs">
            Tap a state for details
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="max-h-[320px] overflow-y-auto">
          {topStates.map((state, idx) => (
            <button
              key={state.name}
              onClick={() => setActiveStateDetail(state)}
              className="w-full flex items-center gap-3 p-3 border-b border-[var(--thor-border-gray)] transition-colors active:bg-[var(--thor-light-beige)]"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: THOR_COLORS.accent.sage }}
              >
                {idx + 1}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm" style={{ color: THOR_COLORS.primary.charcoal }}>
                  {state.name}
                </p>
                <p className="text-xs" style={{ color: THOR_COLORS.neutral.warmGray }}>
                  {STATE_REGIONS[state.name] || 'Unknown Region'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm" style={{ color: THOR_COLORS.accent.sage }}>
                  {formatChartNumber(state.count)}
                </p>
                <p className="text-xs" style={{ color: THOR_COLORS.neutral.warmGray }}>
                  units
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Regions View */}
      {viewMode === 'regions' && (
        <div className="p-3 space-y-2">
          {regionAggregates.map(region => (
            <div
              key={region.name}
              className="p-4 rounded-xl"
              style={{
                background: `linear-gradient(135deg, ${REGION_COLORS[region.name]}15 0%, ${REGION_COLORS[region.name]}05 100%)`,
                border: `1px solid ${REGION_COLORS[region.name]}30`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{REGION_ICONS[region.name]}</span>
                  <span className="font-bold" style={{ color: REGION_COLORS[region.name] }}>
                    {region.name}
                  </span>
                </div>
                <span
                  className="text-lg font-bold"
                  style={{ color: THOR_COLORS.primary.charcoal }}
                >
                  {formatChartNumber(region.count)}
                </span>
              </div>
              <div className="flex justify-between text-xs" style={{ color: THOR_COLORS.neutral.warmGray }}>
                <span>{region.states.length} states</span>
                <span>{formatCompactValue(region.value)} value</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(region.count / (regionAggregates[0]?.count || 1)) * 100}%`,
                    background: REGION_COLORS[region.name],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* State Detail Bottom Sheet */}
      {activeStateDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setActiveStateDetail(null)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-white rounded-t-3xl p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Handle */}
            <div className="w-12 h-1 rounded-full bg-gray-300 mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold" style={{ color: THOR_COLORS.primary.charcoal }}>
                  📍 {activeStateDetail.name}
                </h3>
                <p className="text-sm" style={{ color: THOR_COLORS.neutral.warmGray }}>
                  {STATE_REGIONS[activeStateDetail.name] || 'Region'}
                </p>
              </div>
              <button
                onClick={() => setActiveStateDetail(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ background: THOR_COLORS.neutral.lightBeige }}
              >
                ×
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div
                className="p-3 rounded-xl text-center"
                style={{ background: `${THOR_COLORS.accent.sage}10` }}
              >
                <p className="text-2xl font-bold" style={{ color: THOR_COLORS.accent.sage }}>
                  {formatChartNumber(activeStateDetail.count)}
                </p>
                <p className="text-xs" style={{ color: THOR_COLORS.neutral.warmGray }}>Units</p>
              </div>
              <div
                className="p-3 rounded-xl text-center"
                style={{ background: `${THOR_COLORS.accent.gold}10` }}
              >
                <p className="text-2xl font-bold" style={{ color: THOR_COLORS.accent.gold }}>
                  {formatCompactValue(activeStateDetail.total_value)}
                </p>
                <p className="text-xs" style={{ color: THOR_COLORS.neutral.warmGray }}>Value</p>
              </div>
              <div
                className="p-3 rounded-xl text-center"
                style={{ background: `${THOR_COLORS.accent.steelBlue}10` }}
              >
                <p className="text-2xl font-bold" style={{ color: THOR_COLORS.accent.steelBlue }}>
                  {formatChartPrice(activeStateDetail.avg_price)}
                </p>
                <p className="text-xs" style={{ color: THOR_COLORS.neutral.warmGray }}>Avg Price</p>
              </div>
            </div>

            {/* Filter Button */}
            <button
              onClick={handleStateFilter}
              className="w-full py-4 rounded-xl font-semibold text-white transition-transform active:scale-98"
              style={{
                background: `linear-gradient(135deg, ${THOR_COLORS.accent.sage} 0%, ${THOR_COLORS.accent.gold} 100%)`,
              }}
            >
              Filter by {activeStateDetail.name}
            </button>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div
        className="grid grid-cols-3 gap-2 p-3 text-center"
        style={{ borderTop: `1px solid ${THOR_COLORS.neutral.borderGray}` }}
      >
        <div>
          <p className="text-lg font-bold" style={{ color: THOR_COLORS.accent.sage }}>
            {stateData.filter(d => d.count > 0).length}
          </p>
          <p className="text-xs" style={{ color: THOR_COLORS.neutral.warmGray }}>States</p>
        </div>
        <div>
          <p className="text-lg font-bold" style={{ color: THOR_COLORS.accent.gold }}>
            {formatCompactValue(stateData.reduce((s, d) => s + d.count, 0), 'count')}
          </p>
          <p className="text-xs" style={{ color: THOR_COLORS.neutral.warmGray }}>Total Units</p>
        </div>
        <div>
          <p className="text-lg font-bold" style={{ color: THOR_COLORS.accent.steelBlue }}>
            {regionAggregates.length}
          </p>
          <p className="text-xs" style={{ color: THOR_COLORS.neutral.warmGray }}>Regions</p>
        </div>
      </div>
    </div>
  )
}

export default MobileGeoMap
