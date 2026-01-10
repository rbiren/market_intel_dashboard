/**
 * Territory Map
 *
 * Geographic visualization of dealers in the territory
 * Shows dealer density, opportunity hotspots, and allows filtering by region
 */

import { useMemo, useState } from 'react'
import { useSalesContext } from '../../context/SalesContext'
import { useAggregatedData } from '../../hooks/useSalesData'
import { StatCard } from '../../components/sales/StatCard'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

export function TerritoryMap() {
  const { theme, viewMode, filters, updateFilter, setCurrentView } = useSalesContext()
  const { data, loading } = useAggregatedData(filters)

  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [hoveredState, setHoveredState] = useState<string | null>(null)

  const isDark = theme === 'dark'
  const isMobile = viewMode === 'mobile'

  // Prepare state data
  const stateData = useMemo(() => {
    if (!data?.by_state) return new Map()
    const map = new Map<string, { count: number; value: number }>()
    data.by_state.forEach(item => {
      const titleCase = item.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      map.set(titleCase, { count: item.count, value: item.total_value })
    })
    return map
  }, [data])

  const maxCount = useMemo(() => {
    if (!data?.by_state) return 1
    return Math.max(...data.by_state.map(s => s.count), 1)
  }, [data])

  // Color scale
  const getStateColor = (stateName: string) => {
    const stateInfo = stateData.get(stateName)
    if (!stateInfo) return isDark ? '#2a2928' : '#e8e5e0'

    const intensity = stateInfo.count / maxCount
    if (isDark) {
      // Dark mode: sage green gradient
      const r = Math.round(73 + (73 - 73) * (1 - intensity))
      const g = Math.round(87 + (87 - 40) * intensity)
      const b = Math.round(55 + (55 - 55) * (1 - intensity))
      return `rgb(${r}, ${g}, ${b})`
    } else {
      // Light mode: sage green gradient
      const opacity = 0.2 + intensity * 0.8
      return `rgba(73, 87, 55, ${opacity})`
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  const selectedStateData = selectedState ? stateData.get(selectedState) : null

  // Top states list
  const topStates = useMemo(() => {
    if (!data?.by_state) return []
    return data.by_state.slice(0, 10)
  }, [data])

  return (
    <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
      {/* Header Stats */}
      <div className={`px-4 py-4 grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <StatCard
          label="States"
          value={data?.by_state?.length || 0}
          color="sage"
          size="sm"
        />
        <StatCard
          label="Total Units"
          value={data?.total_units?.toLocaleString() || '0'}
          color="gold"
          size="sm"
        />
        <StatCard
          label="Regions"
          value={data?.by_region?.length || 0}
          color="steel"
          size="sm"
        />
        <StatCard
          label="Avg Value"
          value={formatCurrency(data?.avg_price || 0)}
          color="neutral"
          size="sm"
        />
      </div>

      {/* Map Container */}
      <div className="px-4 mb-4">
        <div className={`
          rounded-xl overflow-hidden
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-[#495737] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  Loading territory data...
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <ComposableMap
                projection="geoAlbersUsa"
                style={{ width: '100%', height: isMobile ? 300 : 400 }}
              >
                <ZoomableGroup center={[-96, 38]} zoom={isMobile ? 0.8 : 1}>
                  <Geographies geography={geoUrl}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const stateName = geo.properties.name
                        const stateInfo = stateData.get(stateName)

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onMouseEnter={() => setHoveredState(stateName)}
                            onMouseLeave={() => setHoveredState(null)}
                            onClick={() => {
                              setSelectedState(stateName)
                              updateFilter('state', stateName.toUpperCase())
                            }}
                            style={{
                              default: {
                                fill: getStateColor(stateName),
                                stroke: isDark ? '#181817' : '#ffffff',
                                strokeWidth: 0.5,
                                outline: 'none',
                                cursor: 'pointer',
                              },
                              hover: {
                                fill: stateInfo ? '#a46807' : isDark ? '#3a3938' : '#d9d6cf',
                                stroke: isDark ? '#181817' : '#ffffff',
                                strokeWidth: 1,
                                outline: 'none',
                                cursor: 'pointer',
                              },
                              pressed: {
                                fill: '#577d91',
                                stroke: isDark ? '#181817' : '#ffffff',
                                strokeWidth: 1,
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

              {/* Hover tooltip */}
              {hoveredState && stateData.get(hoveredState) && (
                <div className={`
                  absolute top-4 right-4 p-3 rounded-lg shadow-lg z-10
                  ${isDark ? 'bg-[#181817] border border-white/20' : 'bg-white border border-[#d9d6cf]'}
                `}>
                  <p className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {hoveredState}
                  </p>
                  <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    {stateData.get(hoveredState)?.count.toLocaleString()} units
                  </p>
                  <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    {formatCurrency(stateData.get(hoveredState)?.value || 0)}
                  </p>
                </div>
              )}

              {/* Legend */}
              <div className={`
                absolute bottom-4 left-4 p-2 rounded-lg
                ${isDark ? 'bg-[#181817]/90' : 'bg-white/90'}
              `}>
                <p className={`text-xs font-medium mb-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  Inventory Density
                </p>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 rounded-sm bg-[#495737]/20" />
                  <div className="w-4 h-2 rounded-sm bg-[#495737]/40" />
                  <div className="w-4 h-2 rounded-sm bg-[#495737]/60" />
                  <div className="w-4 h-2 rounded-sm bg-[#495737]/80" />
                  <div className="w-4 h-2 rounded-sm bg-[#495737]" />
                </div>
                <div className="flex justify-between text-[10px] text-[#8c8a7e] mt-0.5">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected State Details */}
      {selectedState && selectedStateData && (
        <div className="px-4 mb-4">
          <div className={`
            p-4 rounded-xl
            ${isDark ? 'bg-[#495737]/20 border border-[#495737]/30' : 'bg-[#495737]/10 border border-[#495737]/20'}
          `}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className={`font-bold text-lg ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {selectedState}
                </h3>
                <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  Selected State
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedState(null)
                  updateFilter('state', undefined)
                }}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}
                `}
              >
                <svg className={`w-5 h-5 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-white/10' : 'bg-white'}`}>
                <p className={`text-xs font-medium uppercase ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>Units</p>
                <p className={`text-xl font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {selectedStateData.count.toLocaleString()}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-white/10' : 'bg-white'}`}>
                <p className={`text-xs font-medium uppercase ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>Value</p>
                <p className={`text-xl font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {formatCurrency(selectedStateData.value)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentView('dealers')}
              className="w-full mt-3 py-2 px-4 rounded-lg bg-[#495737] text-white font-medium hover:bg-[#3d4a2e] transition-colors"
            >
              View Dealers in {selectedState}
            </button>
          </div>
        </div>
      )}

      {/* Top States List */}
      <div className="px-4 mb-6">
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Top States by Inventory
        </h3>
        <div className={`
          rounded-xl overflow-hidden
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          {topStates.map((state, i) => {
            const percentage = (state.count / maxCount) * 100
            return (
              <div
                key={state.name}
                onClick={() => {
                  const titleCase = state.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
                  setSelectedState(titleCase)
                  updateFilter('state', state.name)
                }}
                className={`
                  flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                  ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#f7f4f0]'}
                  ${i < topStates.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
                `}
              >
                <span className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${i < 3 ? 'bg-[#a46807] text-white' : isDark ? 'bg-white/10 text-[#8c8a7e]' : 'bg-[#f7f4f0] text-[#595755]'}
                `}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {state.name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <div className={`
                    h-1.5 mt-1 rounded-full overflow-hidden
                    ${isDark ? 'bg-white/10' : 'bg-[#d9d6cf]/30'}
                  `}>
                    <div
                      className="h-full rounded-full bg-[#495737] transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {state.count.toLocaleString()}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    units
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Regions Quick View */}
      {data?.by_region && data.by_region.length > 0 && (
        <div className="px-4 mb-6">
          <h3 className={`font-semibold mb-3 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            By Region
          </h3>
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-6'}`}>
            {data.by_region.slice(0, 6).map((region) => (
              <button
                key={region.name}
                onClick={() => updateFilter('region', region.name)}
                className={`
                  p-3 rounded-xl text-center transition-all
                  ${filters.region === region.name
                    ? 'bg-[#495737] text-white'
                    : isDark
                      ? 'bg-[#232322] border border-white/10 hover:border-[#495737]/50'
                      : 'bg-white border border-[#d9d6cf] hover:border-[#495737]/50 shadow-sm'
                  }
                `}
              >
                <p className={`font-semibold text-sm ${filters.region === region.name ? 'text-white' : isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {region.name}
                </p>
                <p className={`text-xs ${filters.region === region.name ? 'text-white/80' : isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  {region.count.toLocaleString()} units
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TerritoryMap
