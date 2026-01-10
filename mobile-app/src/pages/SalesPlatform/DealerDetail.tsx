/**
 * Dealer Detail Page
 *
 * Deep dive view for a specific dealer
 * Shows inventory, brand mix, opportunities, and meeting prep
 */

import { useMemo } from 'react'
import { useSalesContext } from '../../context/SalesContext'
import { useDealerDetail } from '../../hooks/useSalesData'
import { StatCard } from '../../components/sales/StatCard'
import { MiniBarChart, MiniDonutChart, ProgressBar } from '../../components/sales/MiniChart'
import { StatCardSkeleton } from '../../components/sales/LoadingState'

export function DealerDetail() {
  const { theme, viewMode, selectedDealer, setCurrentView } = useSalesContext()
  const { data, loading } = useDealerDetail(selectedDealer?.name || null)

  const isDark = theme === 'dark'
  const isMobile = viewMode === 'mobile'

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  // Prepare data
  const rvTypeData = useMemo(() => {
    if (!data?.by_rv_type) return []
    return data.by_rv_type.slice(0, 5).map(item => ({
      name: item.name,
      value: item.count
    }))
  }, [data])

  const conditionData = useMemo(() => {
    if (!data?.by_condition) return { new: 0, used: 0, total: 0 }
    const newItem = data.by_condition.find(c => c.name === 'NEW')
    const usedItem = data.by_condition.find(c => c.name === 'USED')
    return {
      new: newItem?.count || 0,
      used: usedItem?.count || 0,
      total: (newItem?.count || 0) + (usedItem?.count || 0)
    }
  }, [data])

  const manufacturerData = useMemo(() => {
    if (!data?.by_manufacturer) return []
    return data.by_manufacturer.slice(0, 5).map(item => ({
      name: item.name,
      value: item.count
    }))
  }, [data])

  if (!selectedDealer) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isMobile ? 'pb-20' : ''}`}>
        <div className="text-center">
          <svg className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-[#8c8a7e]/30' : 'text-[#d9d6cf]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className={`font-semibold mb-2 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            No Dealer Selected
          </h3>
          <button
            onClick={() => setCurrentView('dealers')}
            className="px-4 py-2 rounded-lg bg-[#495737] text-white font-medium hover:bg-[#3d4a2e] transition-colors"
          >
            Browse Dealers
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
      {/* Dealer Header */}
      <div className={`
        px-4 py-6
        ${isDark ? 'bg-gradient-to-br from-[#495737]/20 to-transparent' : 'bg-gradient-to-br from-[#495737]/5 to-transparent'}
      `}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              {selectedDealer.name}
            </h1>
            <div className="flex items-center gap-2">
              <svg className={`w-4 h-4 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className={`${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                {selectedDealer.city ? `${selectedDealer.city}, ${selectedDealer.state}` : selectedDealer.state || 'Multiple Locations'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('meeting-prep')}
              className={`
                p-2 rounded-lg transition-colors
                ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-[#f7f4f0] hover:bg-[#e8e5e0]'}
              `}
            >
              <svg className={`w-5 h-5 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              className={`
                p-2 rounded-lg bg-[#495737] text-white hover:bg-[#3d4a2e] transition-colors
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={`px-4 mb-6 grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {loading ? (
          [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Units"
              value={data?.total_units || 0}
              color="sage"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
            />
            <StatCard
              label="Inventory Value"
              value={formatCurrency(data?.total_value || 0)}
              color="gold"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Avg Price"
              value={formatCurrency(data?.avg_price || 0)}
              color="steel"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatCard
              label="RV Types"
              value={data?.by_rv_type?.length || 0}
              color="neutral"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              }
            />
          </>
        )}
      </div>

      {/* Main Content */}
      <div className={`px-4 ${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
        {/* Condition Breakdown */}
        <div className={`
          p-4 rounded-xl
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Inventory Condition
          </h3>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#495737] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-around">
                <MiniDonutChart
                  value={conditionData.new}
                  max={conditionData.total}
                  label="NEW"
                  color="#495737"
                  size={80}
                />
                <MiniDonutChart
                  value={conditionData.used}
                  max={conditionData.total}
                  label="USED"
                  color="#a46807"
                  size={80}
                />
              </div>
              <div className="space-y-2">
                <ProgressBar
                  value={conditionData.new}
                  max={conditionData.total}
                  label="New Units"
                  color="#495737"
                />
                <ProgressBar
                  value={conditionData.used}
                  max={conditionData.total}
                  label="Used Units"
                  color="#a46807"
                />
              </div>
            </div>
          )}
        </div>

        {/* RV Type Mix */}
        <div className={`
          p-4 rounded-xl
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            RV Type Mix
          </h3>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#495737] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <MiniBarChart data={rvTypeData} maxItems={5} height={150} />
          )}
        </div>

        {/* Brand Mix */}
        <div className={`
          p-4 rounded-xl
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Top Manufacturers
          </h3>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#495737] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <MiniBarChart data={manufacturerData} maxItems={5} height={150} />
          )}
        </div>

        {/* Price Analysis */}
        <div className={`
          p-4 rounded-xl
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Price Analysis
          </h3>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#495737] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}`}>
                <span className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>Average</span>
                <span className={`font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {formatCurrency(data?.avg_price || 0)}
                </span>
              </div>
              <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}`}>
                <span className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>Minimum</span>
                <span className={`font-bold text-[#495737]`}>
                  {formatCurrency(data?.min_price || 0)}
                </span>
              </div>
              <div className={`flex justify-between items-center p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}`}>
                <span className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>Maximum</span>
                <span className={`font-bold text-[#a46807]`}>
                  {formatCurrency(data?.max_price || 0)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Opportunities Section */}
      <div className="px-4 mt-6 mb-6">
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Opportunities
        </h3>
        <div className={`
          p-4 rounded-xl
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          {[
            { type: 'gap', text: 'Low inventory of Fifth Wheels - consider pitching Keystone models', priority: 'high' },
            { type: 'trend', text: 'Class C units moving faster than average - highlight Thor Compass', priority: 'medium' },
            { type: 'opportunity', text: 'No Class B inventory - potential new segment opportunity', priority: 'low' },
          ].map((opp, i) => (
            <div
              key={i}
              className={`
                flex items-start gap-3 py-3
                ${i < 2 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
              `}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                ${opp.priority === 'high' ? 'bg-[#a46807]/20 text-[#a46807]' : ''}
                ${opp.priority === 'medium' ? 'bg-[#577d91]/20 text-[#577d91]' : ''}
                ${opp.priority === 'low' ? 'bg-[#495737]/20 text-[#495737]' : ''}
              `}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {opp.text}
                </p>
                <span className={`
                  text-xs font-medium uppercase mt-1 inline-block px-2 py-0.5 rounded
                  ${opp.priority === 'high' ? 'bg-[#a46807]/10 text-[#a46807]' : ''}
                  ${opp.priority === 'medium' ? 'bg-[#577d91]/10 text-[#577d91]' : ''}
                  ${opp.priority === 'low' ? 'bg-[#495737]/10 text-[#495737]' : ''}
                `}>
                  {opp.priority} priority
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 mb-6">
        <div className={`flex gap-3 ${isMobile ? 'flex-col' : ''}`}>
          <button
            onClick={() => setCurrentView('meeting-prep')}
            className="flex-1 py-3 px-4 rounded-xl bg-[#495737] text-white font-semibold hover:bg-[#3d4a2e] transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Prepare Meeting
          </button>
          <button
            onClick={() => setCurrentView('products')}
            className={`
              flex-1 py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2
              ${isDark
                ? 'bg-white/10 text-[#fffdfa] hover:bg-white/20 border border-white/10'
                : 'bg-[#f7f4f0] text-[#181817] hover:bg-[#e8e5e0] border border-[#d9d6cf]'
              }
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            View Products
          </button>
        </div>
      </div>
    </div>
  )
}

export default DealerDetail
