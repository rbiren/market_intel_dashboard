/**
 * Sales Dashboard
 *
 * Main dashboard view for RV sales representatives
 * Provides territory overview, key metrics, and quick actions
 */

import { useMemo } from 'react'
import { useSalesContext } from '../../context/SalesContext'
import { useTerritoryStats, useAggregatedData, useSalesVelocityStats } from '../../hooks/useSalesData'
import { StatCard } from '../../components/sales/StatCard'
import { DealerCard } from '../../components/sales/DealerCard'
import { MiniBarChart, MiniDonutChart, MarketShareBar } from '../../components/sales/MiniChart'
import { StatCardSkeleton, DealerCardSkeleton } from '../../components/sales/LoadingState'

export function SalesDashboard() {
  const { theme, viewMode, filters, setCurrentView, setSelectedDealer } = useSalesContext()
  const { stats, loading: statsLoading } = useTerritoryStats(filters)
  const { data: aggData, loading: aggLoading } = useAggregatedData(filters)
  const { stats: velocityStats, loading: velocityLoading } = useSalesVelocityStats(filters)

  const isDark = theme === 'dark'
  const isMobile = viewMode === 'mobile'
  const loading = statsLoading || aggLoading

  // Format helpers
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

  // Prepare chart data
  const rvTypeData = useMemo(() => {
    if (!aggData?.by_rv_type) return []
    return aggData.by_rv_type.slice(0, 5).map(item => ({
      name: item.name,
      value: item.count
    }))
  }, [aggData])

  const topDealers = useMemo(() => {
    if (!aggData?.by_dealer_group) return []
    return aggData.by_dealer_group.slice(0, 5).map(item => ({
      dealer_group: item.name,
      dealership: item.name,
      state: '',
      total_units: item.count,
      total_value: item.total_value,
      avg_price: item.avg_price,
      new_units: 0,
      used_units: 0,
      rv_types: {},
      brands: {},
      avg_days_on_lot: item.avg_days_on_lot
    }))
  }, [aggData])

  const conditionData = useMemo(() => {
    if (!aggData?.by_condition) return []
    return aggData.by_condition.map(item => ({
      name: item.name,
      value: item.count,
      color: item.name === 'NEW' ? '#495737' : '#a46807'
    }))
  }, [aggData])

  return (
    <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
      {/* Welcome Section */}
      <div className={`
        px-4 py-6 mb-4
        ${isDark ? 'bg-gradient-to-br from-[#495737]/20 to-transparent' : 'bg-gradient-to-br from-[#495737]/5 to-transparent'}
      `}>
        <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, John
        </h1>
        <p className={`${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
          Here's your territory overview for today
        </p>
      </div>

      {/* KPI Cards */}
      <div className={`px-4 mb-6 grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {loading ? (
          [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total Dealers"
              value={stats?.total_dealers || 0}
              subValue="in your territory"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
              color="sage"
              onClick={() => setCurrentView('dealers')}
            />
            <StatCard
              label="Total Units"
              value={formatNumber(stats?.total_units || 0)}
              subValue="across all dealers"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
              color="gold"
            />
            <StatCard
              label="Inventory Value"
              value={formatCurrency(stats?.total_value || 0)}
              subValue="total market value"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="steel"
            />
            <StatCard
              label="Avg Price"
              value={formatCurrency(stats?.avg_price || 0)}
              subValue="per unit"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
              color="neutral"
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className={`px-4 ${isMobile ? 'space-y-4' : 'grid grid-cols-3 gap-4'}`}>
        {/* Inventory by Condition */}
        <div className={`
          p-4 rounded-xl
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Inventory by Condition
          </h3>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#495737] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex items-center justify-around">
              {conditionData.map(item => (
                <MiniDonutChart
                  key={item.name}
                  value={item.value}
                  max={stats?.total_units || 1}
                  label={item.name}
                  color={item.color}
                  size={isMobile ? 70 : 90}
                />
              ))}
            </div>
          )}
        </div>

        {/* RV Type Distribution */}
        <div className={`
          p-4 rounded-xl
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              Top RV Types
            </h3>
            <button
              onClick={() => setCurrentView('competitive')}
              className={`text-xs font-medium ${isDark ? 'text-[#577d91]' : 'text-[#577d91]'} hover:underline`}
            >
              View All
            </button>
          </div>
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#495737] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <MiniBarChart data={rvTypeData} maxItems={5} height={140} />
          )}
        </div>

        {/* Market Share Overview */}
        <div className={`
          p-4 rounded-xl
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Market Share
          </h3>
          {loading ? (
            <div className="h-20 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-[#495737] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <MarketShareBar items={rvTypeData.slice(0, 4)} />
          )}
        </div>
      </div>

      {/* Sales Velocity Section */}
      <div className="px-4 mt-6">
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Sales Velocity
        </h3>
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {velocityLoading ? (
            [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                label="Total Sold"
                value={formatNumber(velocityStats?.totalSold || 0)}
                subValue="historical sales"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="sage"
              />
              <StatCard
                label="Avg Days to Sell"
                value={velocityStats?.avgDaysToSell ? Math.round(velocityStats.avgDaysToSell) : '-'}
                subValue="turn time"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="gold"
              />
              <StatCard
                label="Avg Sale Price"
                value={velocityStats?.avgSalePrice ? formatCurrency(velocityStats.avgSalePrice) : '-'}
                subValue="sold units"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
                color="steel"
              />
              <StatCard
                label="Total Sales Value"
                value={velocityStats?.totalSalesValue ? formatCurrency(velocityStats.totalSalesValue) : '-'}
                subValue="all time"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
                color="neutral"
              />
            </>
          )}
        </div>

        {/* Velocity by Condition */}
        {!velocityLoading && velocityStats?.byCondition && velocityStats.byCondition.length > 0 && (
          <div className={`
            mt-4 p-4 rounded-xl grid grid-cols-2 gap-4
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
          `}>
            {velocityStats.byCondition.map((item) => (
              <div key={item.name} className="text-center">
                <div className={`text-2xl font-bold ${item.name === 'NEW' ? 'text-[#495737]' : 'text-[#a46807]'}`}>
                  {item.avg_days_to_sell ? Math.round(item.avg_days_to_sell) : '-'}
                </div>
                <div className={`text-xs uppercase font-semibold tracking-wider ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  {item.name} Days Avg
                </div>
                <div className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  {formatNumber(item.sold_count)} sold
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-6">
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Quick Actions
        </h3>
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {[
            { label: 'View Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', view: 'map' as const },
            { label: 'Find Dealers', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', view: 'dealers' as const },
            { label: 'Prep Meeting', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', view: 'meeting-prep' as const },
            { label: 'Products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', view: 'products' as const },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => setCurrentView(action.view)}
              className={`
                flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                ${isDark
                  ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                  : 'bg-[#f7f4f0] hover:bg-[#e8e5e0] border border-[#d9d6cf]'
                }
                hover:scale-[1.02]
              `}
            >
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                bg-gradient-to-br from-[#495737] to-[#577d91]
              `}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                </svg>
              </div>
              <span className={`font-medium ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Top Dealers */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Top Dealers
          </h3>
          <button
            onClick={() => setCurrentView('dealers')}
            className={`text-sm font-medium ${isDark ? 'text-[#577d91]' : 'text-[#577d91]'} hover:underline`}
          >
            View All
          </button>
        </div>
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
          {loading ? (
            [...Array(3)].map((_, i) => <DealerCardSkeleton key={i} />)
          ) : (
            topDealers.slice(0, isMobile ? 3 : 6).map((dealer) => (
              <DealerCard
                key={dealer.dealer_group}
                dealer={dealer}
                onClick={() => {
                  setSelectedDealer({
                    id: dealer.dealer_group,
                    name: dealer.dealer_group,
                    dealerGroup: dealer.dealer_group,
                    state: dealer.state
                  })
                  setCurrentView('dealer-detail')
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Activity Feed (placeholder) */}
      <div className="px-4 mt-6 mb-6">
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Recent Activity
        </h3>
        <div className={`
          p-4 rounded-xl
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          {[
            { action: 'New inventory added', dealer: 'General RV', time: '2 hours ago', type: 'add' },
            { action: 'Price update', dealer: 'Camping World', time: '5 hours ago', type: 'update' },
            { action: 'Dealer visit scheduled', dealer: 'Lazydays RV', time: 'Yesterday', type: 'meeting' },
          ].map((activity, i) => (
            <div
              key={i}
              className={`
                flex items-center gap-3 py-3
                ${i < 2 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
              `}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center
                ${activity.type === 'add' ? 'bg-[#495737]/20 text-[#495737]' : ''}
                ${activity.type === 'update' ? 'bg-[#a46807]/20 text-[#a46807]' : ''}
                ${activity.type === 'meeting' ? 'bg-[#577d91]/20 text-[#577d91]' : ''}
              `}>
                {activity.type === 'add' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
                {activity.type === 'update' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {activity.type === 'meeting' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className={`font-medium text-sm ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                  {activity.action}
                </p>
                <p className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  {activity.dealer}
                </p>
              </div>
              <span className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SalesDashboard
