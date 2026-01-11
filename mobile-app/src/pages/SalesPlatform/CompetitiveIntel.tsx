/**
 * Competitive Intelligence
 *
 * Market analysis and competitive insights for sales reps
 * Shows market share, competitor analysis, and trend data
 */

import { useMemo, useState } from 'react'
import { useSalesContext } from '../../context/SalesContext'
import { useCompetitiveAnalysis, useAggregatedData, useSalesVelocity, useTopFloorplans } from '../../hooks/useSalesData'
import { StatCard } from '../../components/sales/StatCard'
import { MiniBarChart, MarketShareBar } from '../../components/sales/MiniChart'
import { StatCardSkeleton, ChartSkeleton } from '../../components/sales/LoadingState'

type TabOption = 'manufacturers' | 'dealers' | 'types' | 'regions' | 'velocity' | 'floorplans'

export function CompetitiveIntel() {
  const { theme, viewMode, filters } = useSalesContext()
  const { analysis, loading } = useCompetitiveAnalysis(filters)
  const { data: aggData } = useAggregatedData(filters)
  const { data: velocityData, loading: velocityLoading } = useSalesVelocity(filters)
  const { data: floorplansData, loading: floorplansLoading } = useTopFloorplans(filters.startDate, filters.endDate, 10)

  const [activeTab, setActiveTab] = useState<TabOption>('manufacturers')

  const isDark = theme === 'dark'
  const isMobile = viewMode === 'mobile'

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toLocaleString()
  }

  // Get data for current tab
  const tabData = useMemo(() => {
    if (!analysis) return []
    switch (activeTab) {
      case 'manufacturers':
        return analysis.by_manufacturer.slice(0, 15)
      case 'dealers':
        return analysis.by_dealer_group.slice(0, 15)
      case 'types':
        return analysis.by_rv_type.slice(0, 10)
      case 'regions':
        return analysis.by_region.slice(0, 10)
      default:
        return []
    }
  }, [analysis, activeTab])

  // Top 5 for pie chart
  const top5 = useMemo(() => {
    return tabData.slice(0, 5).map(item => ({
      name: item.name,
      value: item.units,
      color: undefined
    }))
  }, [tabData])

  const tabs: { id: TabOption; label: string; icon: string }[] = [
    { id: 'manufacturers', label: 'Manufacturers', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'dealers', label: 'Dealers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'types', label: 'RV Types', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { id: 'regions', label: 'Regions', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'velocity', label: 'Velocity', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'floorplans', label: 'Floorplans', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  ]

  return (
    <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
      {/* Header */}
      <div className={`px-4 py-4`}>
        <h1 className={`text-xl font-bold mb-1 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Competitive Intelligence
        </h1>
        <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
          Market analysis and competitor insights
        </p>
      </div>

      {/* KPI Summary */}
      <div className={`px-4 mb-4 grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {loading ? (
          [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Market"
              value={formatNumber(aggData?.total_units || 0)}
              subValue="units tracked"
              color="sage"
              size="sm"
            />
            <StatCard
              label="Market Value"
              value={formatCurrency(aggData?.total_value || 0)}
              color="gold"
              size="sm"
            />
            <StatCard
              label="Manufacturers"
              value={analysis?.by_manufacturer?.length || 0}
              color="steel"
              size="sm"
            />
            <StatCard
              label="Dealer Groups"
              value={analysis?.by_dealer_group?.length || 0}
              color="neutral"
              size="sm"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className={`
        sticky top-14 z-30 px-4 py-2
        ${isDark ? 'bg-[#181817]/95' : 'bg-[#fffdfa]/95'}
        backdrop-blur-md
      `}>
        <div className={`
          flex gap-1 p-1 rounded-xl
          ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}
        `}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-[#495737] text-white shadow-md'
                  : isDark
                    ? 'text-[#8c8a7e] hover:text-[#fffdfa] hover:bg-white/5'
                    : 'text-[#595755] hover:text-[#181817] hover:bg-white'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {!isMobile && <span>{tab.label}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {/* Velocity Tab Content */}
        {activeTab === 'velocity' ? (
          velocityLoading ? (
            <ChartSkeleton height={400} />
          ) : velocityData ? (
            <div className="space-y-4">
              {/* Velocity KPIs */}
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}`}>
                  <div className={`text-xs uppercase font-semibold tracking-wider mb-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    Total Sold
                  </div>
                  <div className={`text-2xl font-bold text-[#495737]`}>
                    {velocityData.total_sold.toLocaleString()}
                  </div>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}`}>
                  <div className={`text-xs uppercase font-semibold tracking-wider mb-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    Avg Days to Sell
                  </div>
                  <div className={`text-2xl font-bold text-[#a46807]`}>
                    {velocityData.avg_days_to_sell ? Math.round(velocityData.avg_days_to_sell) : '-'}
                  </div>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}`}>
                  <div className={`text-xs uppercase font-semibold tracking-wider mb-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    Avg Sale Price
                  </div>
                  <div className={`text-2xl font-bold text-[#577d91]`}>
                    {velocityData.avg_sale_price ? formatCurrency(velocityData.avg_sale_price) : '-'}
                  </div>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}`}>
                  <div className={`text-xs uppercase font-semibold tracking-wider mb-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    Total Sales Value
                  </div>
                  <div className={`text-2xl font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {velocityData.total_sales_value ? formatCurrency(velocityData.total_sales_value) : '-'}
                  </div>
                </div>
              </div>

              {/* Velocity by RV Type */}
              <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}`}>
                  <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    Days to Sell by RV Type
                  </h3>
                  <div className="space-y-3">
                    {velocityData.by_rv_type?.slice(0, 8).map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className={`text-sm ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                          {item.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                            {item.sold_count.toLocaleString()} sold
                          </span>
                          <span className={`font-bold ${i < 3 ? 'text-[#495737]' : isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                            {item.avg_days_to_sell ? `${Math.round(item.avg_days_to_sell)} days` : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`p-4 rounded-xl ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}`}>
                  <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    Days to Sell by Condition
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {velocityData.by_condition?.map((item) => (
                      <div key={item.name} className={`p-4 rounded-lg text-center ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}`}>
                        <div className={`text-3xl font-bold mb-1 ${item.name === 'NEW' ? 'text-[#495737]' : 'text-[#a46807]'}`}>
                          {item.avg_days_to_sell ? Math.round(item.avg_days_to_sell) : '-'}
                        </div>
                        <div className={`text-xs uppercase font-semibold tracking-wider ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                          {item.name} Days Avg
                        </div>
                        <div className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                          {item.sold_count.toLocaleString()} units
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Dealers by Velocity */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}`}>
                <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  Fastest Selling - Top Dealers
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`text-xs uppercase tracking-wider ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        <th className="text-left py-2">#</th>
                        <th className="text-left py-2">Dealer Group</th>
                        <th className="text-right py-2">Sold</th>
                        <th className="text-right py-2">Avg Days</th>
                        <th className="text-right py-2">Avg Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {velocityData.by_dealer_group?.slice(0, 10).map((item, i) => (
                        <tr key={item.name} className={i < velocityData.by_dealer_group!.length - 1 ? (isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50') : ''}>
                          <td className={`py-2 font-semibold ${i < 3 ? 'text-[#a46807]' : isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>{i + 1}</td>
                          <td className={`py-2 font-medium ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>{item.name}</td>
                          <td className={`py-2 text-right ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>{item.sold_count.toLocaleString()}</td>
                          <td className={`py-2 text-right font-bold ${item.avg_days_to_sell && item.avg_days_to_sell < (velocityData.avg_days_to_sell || 999) ? 'text-[#495737]' : isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                            {item.avg_days_to_sell ? Math.round(item.avg_days_to_sell) : '-'}
                          </td>
                          <td className={`py-2 text-right ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                            {item.avg_price ? formatCurrency(item.avg_price) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className={`text-center py-12 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
              <p>No sales velocity data available</p>
            </div>
          )
        ) : activeTab === 'floorplans' ? (
          floorplansLoading ? (
            <ChartSkeleton height={400} />
          ) : floorplansData?.categories && floorplansData.categories.length > 0 ? (
            <div className="space-y-6">
              {/* Top Floorplans by Category */}
              {floorplansData.categories.map((category) => (
                <div
                  key={category.category}
                  className={`rounded-xl overflow-hidden ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}`}
                >
                  {/* Category Header */}
                  <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10 bg-white/5' : 'border-[#d9d6cf] bg-[#f7f4f0]'}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        {category.category}
                      </h3>
                      <span className={`text-sm px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-[#8c8a7e]' : 'bg-[#d9d6cf]/50 text-[#595755]'}`}>
                        Top {category.floorplans.length}
                      </span>
                    </div>
                  </div>

                  {/* Floorplans Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`text-xs uppercase tracking-wider ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                          <th className="text-left py-3 px-4 w-10">#</th>
                          <th className="text-left py-3 px-2">Floorplan</th>
                          <th className="text-left py-3 px-2">Manufacturer</th>
                          <th className="text-right py-3 px-2">Sold</th>
                          <th className="text-right py-3 px-2">Avg Days</th>
                          <th className="text-right py-3 px-4">Avg Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {category.floorplans.map((item, i) => (
                          <tr
                            key={`${category.category}-${item.floorplan}-${i}`}
                            className={`
                              transition-colors
                              ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#f7f4f0]'}
                              ${i < category.floorplans.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
                            `}
                          >
                            <td className={`py-3 px-4 font-bold ${i < 3 ? 'text-[#a46807]' : isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                              {i + 1}
                            </td>
                            <td className={`py-3 px-2 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                              <div className="font-semibold truncate max-w-[200px]">{item.floorplan || 'N/A'}</div>
                              {item.model && (
                                <div className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                                  {item.model}
                                </div>
                              )}
                            </td>
                            <td className={`py-3 px-2 text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                              {item.manufacturer || 'Unknown'}
                            </td>
                            <td className={`py-3 px-2 text-right font-bold ${i === 0 ? 'text-[#495737]' : isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                              {item.sold_count.toLocaleString()}
                            </td>
                            <td className={`py-3 px-2 text-right ${item.avg_days_to_sell && item.avg_days_to_sell < 60 ? 'text-[#495737] font-semibold' : isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                              {item.avg_days_to_sell ? Math.round(item.avg_days_to_sell) : '-'}
                            </td>
                            <td className={`py-3 px-4 text-right ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                              {item.avg_sale_price ? formatCurrency(item.avg_sale_price) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* Date Range Info */}
              {floorplansData.date_range && (floorplansData.date_range.start_date || floorplansData.date_range.end_date) && (
                <div className={`text-center text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  Data from: {floorplansData.date_range.start_date || 'All time'} to {floorplansData.date_range.end_date || 'Present'}
                </div>
              )}
            </div>
          ) : (
            <div className={`text-center py-12 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
              <p>No floorplan data available</p>
              <p className="text-sm mt-1">Try adjusting your date filters</p>
            </div>
          )
        ) : loading ? (
          <ChartSkeleton height={400} />
        ) : (
          <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
            {/* Market Share Overview */}
            <div className={`
              p-4 rounded-xl
              ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
            `}>
              <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Market Share - Top 5
              </h3>
              <MarketShareBar items={top5} />
              <div className="mt-4 space-y-2">
                {top5.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`
                        w-5 h-5 rounded flex items-center justify-center text-xs font-bold
                        ${i === 0 ? 'bg-[#495737] text-white' : isDark ? 'bg-white/10 text-[#8c8a7e]' : 'bg-[#f7f4f0] text-[#595755]'}
                      `}>
                        {i + 1}
                      </span>
                      <span className={`text-sm font-medium ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        {item.name}
                      </span>
                    </div>
                    <span className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                      {item.value.toLocaleString()} units
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className={`
              p-4 rounded-xl
              ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
            `}>
              <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Distribution by Units
              </h3>
              <MiniBarChart
                data={tabData.slice(0, 8).map(item => ({
                  name: item.name,
                  value: item.units
                }))}
                maxItems={8}
                height={280}
              />
            </div>
          </div>
        )}

        {/* Full Rankings Table */}
        <div className={`
          mt-4 rounded-xl overflow-hidden
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          <div className={`
            px-4 py-3 border-b
            ${isDark ? 'border-white/10 bg-white/5' : 'border-[#d9d6cf] bg-[#f7f4f0]'}
          `}>
            <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              Full Rankings - {tabs.find(t => t.id === activeTab)?.label}
            </h3>
          </div>

          {/* Table Header */}
          <div className={`
            grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider
            ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}
          `}>
            <div className="col-span-1">#</div>
            <div className="col-span-5">Name</div>
            <div className="col-span-2 text-right">Units</div>
            <div className="col-span-2 text-right">Share</div>
            <div className="col-span-2 text-right">Value</div>
          </div>

          {/* Table Rows */}
          <div className="max-h-[400px] overflow-y-auto">
            {tabData.map((item, i) => {
              const totalUnits = aggData?.total_units || 1
              const percentage = (item.units / totalUnits) * 100
              return (
                <div
                  key={item.name}
                  className={`
                    grid grid-cols-12 gap-2 px-4 py-3 transition-colors
                    ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#f7f4f0]'}
                    ${i < tabData.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
                  `}
                >
                  <div className={`col-span-1 font-semibold ${i < 3 ? 'text-[#a46807]' : isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    {i + 1}
                  </div>
                  <div className={`col-span-5 font-medium truncate ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {item.name}
                  </div>
                  <div className={`col-span-2 text-right font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {item.units.toLocaleString()}
                  </div>
                  <div className={`col-span-2 text-right ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    {percentage.toFixed(1)}%
                  </div>
                  <div className={`col-span-2 text-right ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    {formatCurrency(item.value)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Insights Section */}
        <div className="mt-6">
          <h3 className={`font-semibold mb-3 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Key Insights
          </h3>
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {[
              {
                title: 'Market Leader',
                value: tabData[0]?.name || 'N/A',
                detail: `${((tabData[0]?.units || 0) / (aggData?.total_units || 1) * 100).toFixed(1)}% market share`,
                color: 'sage'
              },
              {
                title: 'Fastest Growing',
                value: tabData[1]?.name || 'N/A',
                detail: 'Based on recent inventory changes',
                color: 'gold'
              },
              {
                title: 'Highest Avg Price',
                value: analysis?.by_manufacturer?.[0]?.name || 'N/A',
                detail: 'Premium segment leader',
                color: 'steel'
              }
            ].map((insight, i) => (
              <div
                key={i}
                className={`
                  p-4 rounded-xl border-l-4
                  ${insight.color === 'sage' ? 'border-l-[#495737]' : ''}
                  ${insight.color === 'gold' ? 'border-l-[#a46807]' : ''}
                  ${insight.color === 'steel' ? 'border-l-[#577d91]' : ''}
                  ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
                `}
              >
                <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  {insight.title}
                </p>
                <p className={`font-bold text-lg truncate ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {insight.value}
                </p>
                <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  {insight.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompetitiveIntel
