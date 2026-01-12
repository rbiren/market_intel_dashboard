/**
 * Dealer Intelligence Page
 *
 * Deep dive into a specific dealer with action-oriented insights
 *
 * Features:
 * - Dealer overview with KPIs
 * - Opportunities with priority ranking
 * - Talking points for meetings
 * - Thor vs. competitor analysis
 * - Inventory breakdown
 */

import { useMemo } from 'react'
import { useRepIntelContext } from '../../context/RepIntelContext'
import { useDealerDetail, useSalesVelocity, useAggregatedData } from '../../hooks/useSalesData'
import { StatCard } from '../../components/sales/StatCard'
import { MiniBarChart, MiniDonutChart, ProgressBar } from '../../components/sales/MiniChart'
import { StatCardSkeleton } from '../../components/sales/LoadingState'

// Thor brands for comparison
const THOR_BRANDS = [
  'AIRSTREAM', 'JAYCO', 'KEYSTONE', 'HEARTLAND',
  'CRUISER RV', 'DUTCHMEN', 'ENTEGRA', 'DYNAMAX',
  'THOR MOTOR COACH', 'TIFFIN', 'VANLEIGH', 'REDWOOD',
  'HIGHLAND RIDGE', 'GRAND DESIGN', 'CROSSROADS'
]

export function DealerIntel() {
  const { theme, viewMode, selectedDealer, setCurrentView } = useRepIntelContext()

  // Fetch dealer-specific data
  const { data, loading } = useDealerDetail(selectedDealer?.name || null)

  // Fetch sales velocity for this dealer
  const dealerFilters = useMemo(() => ({
    dealerGroup: selectedDealer?.name
  }), [selectedDealer?.name])
  const { data: velocityData, loading: velocityLoading } = useSalesVelocity(dealerFilters)

  // Fetch market data for comparison
  const { data: marketData } = useAggregatedData({})

  const isDark = theme === 'dark'
  const isMobile = viewMode === 'mobile'

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  // Calculate Thor share at this dealer
  const thorAnalysis = useMemo(() => {
    if (!data?.by_manufacturer) return null

    const thorUnits = data.by_manufacturer
      .filter(m => THOR_BRANDS.some(brand => m.name.toUpperCase().includes(brand)))
      .reduce((sum, m) => sum + m.count, 0)

    const competitorUnits = data.by_manufacturer
      .filter(m => !THOR_BRANDS.some(brand => m.name.toUpperCase().includes(brand)))
      .reduce((sum, m) => sum + m.count, 0)

    const totalUnits = thorUnits + competitorUnits
    const thorShare = totalUnits > 0 ? (thorUnits / totalUnits) * 100 : 0

    // Market Thor share for comparison
    const marketThorUnits = marketData?.by_manufacturer
      ?.filter(m => THOR_BRANDS.some(brand => m.name.toUpperCase().includes(brand)))
      .reduce((sum, m) => sum + m.count, 0) || 0
    const marketTotalUnits = marketData?.total_units || 1
    const marketThorShare = (marketThorUnits / marketTotalUnits) * 100

    return {
      thorUnits,
      competitorUnits,
      totalUnits,
      thorShare,
      marketThorShare,
      shareVsMarket: thorShare - marketThorShare,
      thorBrands: data.by_manufacturer.filter(m =>
        THOR_BRANDS.some(brand => m.name.toUpperCase().includes(brand))
      ),
      topCompetitors: data.by_manufacturer
        .filter(m => !THOR_BRANDS.some(brand => m.name.toUpperCase().includes(brand)))
        .slice(0, 5)
    }
  }, [data, marketData])

  // Generate opportunities based on dealer data
  const opportunities = useMemo(() => {
    if (!data) return []
    const opps: Array<{
      id: string
      type: string
      headline: string
      detail: string
      priority: 'high' | 'medium' | 'low'
      suggestedAction: string
    }> = []

    // Check for aging Thor units
    if (data.avg_days_on_lot && data.avg_days_on_lot > 60) {
      opps.push({
        id: '1',
        type: 'aging_risk',
        headline: 'Thor units aging on lot',
        detail: `Average days on lot is ${Math.round(data.avg_days_on_lot)} days. Check for units 90+ days.`,
        priority: 'high',
        suggestedAction: 'Review aging inventory and discuss promotional options'
      })
    }

    // Check for missing RV types
    const currentTypes = new Set(data.by_rv_type?.map(t => t.name) || [])
    const allTypes = ['TRAVEL TRAILER', 'FIFTH WHEEL', 'CLASS A', 'CLASS B', 'CLASS C']
    const missingTypes = allTypes.filter(t => !currentTypes.has(t))

    if (missingTypes.includes('CLASS B')) {
      opps.push({
        id: '2',
        type: 'inventory_gap',
        headline: 'No Class B inventory',
        detail: 'Dealer has no Class B units. Thor Sequence is trending in market.',
        priority: 'medium',
        suggestedAction: 'Present Thor Sequence lineup'
      })
    }

    if (missingTypes.includes('CLASS C')) {
      opps.push({
        id: '3',
        type: 'inventory_gap',
        headline: 'Class C opportunity',
        detail: 'No Class C motorhomes in inventory.',
        priority: 'medium',
        suggestedAction: 'Review Thor Compass/Chateau options'
      })
    }

    // Check Thor share vs market
    if (thorAnalysis && thorAnalysis.shareVsMarket < -5) {
      opps.push({
        id: '4',
        type: 'share_recovery',
        headline: 'Thor share below market average',
        detail: `Thor share is ${thorAnalysis.thorShare.toFixed(1)}% vs market ${thorAnalysis.marketThorShare.toFixed(1)}%`,
        priority: 'high',
        suggestedAction: 'Discuss competitive positioning and incentives'
      })
    }

    // Check for low new inventory
    const newUnits = data.by_condition?.find(c => c.name === 'NEW')?.count || 0
    const totalUnits = data.total_units || 1
    if (newUnits / totalUnits < 0.5) {
      opps.push({
        id: '5',
        type: 'inventory_gap',
        headline: 'Low new inventory mix',
        detail: `Only ${Math.round((newUnits / totalUnits) * 100)}% new units. Industry average is 60%+`,
        priority: 'low',
        suggestedAction: 'Propose new unit stocking program'
      })
    }

    return opps.slice(0, 5)
  }, [data, thorAnalysis])

  // Generate talking points
  const talkingPoints = useMemo(() => {
    if (!data) return []
    const points: Array<{
      category: 'positive' | 'concern' | 'opportunity'
      headline: string
      detail: string
      supportingData: string
    }> = []

    // Positive: Good velocity
    const marketAvgDays = marketData?.avg_days_on_lot || 60
    if (velocityData?.avg_days_to_sell && velocityData.avg_days_to_sell < marketAvgDays) {
      points.push({
        category: 'positive',
        headline: 'Units turning faster than market',
        detail: `Your average turn time is ${Math.round(velocityData.avg_days_to_sell)} days vs market ${Math.round(marketAvgDays)} days`,
        supportingData: `${velocityData.total_sold.toLocaleString()} units sold`
      })
    }

    // Concern: Aging inventory
    if (data.avg_days_on_lot && data.avg_days_on_lot > 60) {
      points.push({
        category: 'concern',
        headline: 'Some units aging on lot',
        detail: `Average days on lot is ${Math.round(data.avg_days_on_lot)}. Let's look at aged units.`,
        supportingData: `${data.total_units} total units`
      })
    }

    // Opportunity: Missing segments
    const currentTypes = new Set(data.by_rv_type?.map(t => t.name) || [])
    if (!currentTypes.has('CLASS B')) {
      points.push({
        category: 'opportunity',
        headline: 'Class B segment opportunity',
        detail: 'No Class B inventory. Thor Sequence is our fastest-selling Class B.',
        supportingData: 'Van market up 15% YoY'
      })
    }

    // Positive: Strong Thor presence (if applicable)
    if (thorAnalysis && thorAnalysis.thorShare > 30) {
      points.push({
        category: 'positive',
        headline: 'Strong Thor partnership',
        detail: `Thor brands represent ${thorAnalysis.thorShare.toFixed(1)}% of your inventory`,
        supportingData: `${thorAnalysis.thorUnits} Thor units`
      })
    }

    return points
  }, [data, velocityData, marketData, thorAnalysis])

  // Prepare chart data
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
          <div className="flex gap-2">
            <button className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-[#f7f4f0] hover:bg-[#e8e5e0]'}`}>
              <svg className={`w-5 h-5 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="p-2 rounded-lg bg-[#495737] text-white hover:bg-[#3d4a2e] transition-colors">
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
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
            />
            <StatCard
              label="Thor Share"
              value={thorAnalysis ? `${thorAnalysis.thorShare.toFixed(0)}%` : '--'}
              subValue={thorAnalysis && thorAnalysis.shareVsMarket > 0 ? `+${thorAnalysis.shareVsMarket.toFixed(1)}% vs mkt` : thorAnalysis ? `${thorAnalysis.shareVsMarket.toFixed(1)}% vs mkt` : undefined}
              color="gold"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            />
            <StatCard
              label="Avg Days"
              value={velocityData?.avg_days_to_sell ? Math.round(velocityData.avg_days_to_sell) : '--'}
              subValue="to sell"
              color="steel"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              label="Inventory Value"
              value={formatCurrency(data?.total_value || 0)}
              color="neutral"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </>
        )}
      </div>

      {/* Opportunities Section */}
      {opportunities.length > 0 && (
        <div className="px-4 mb-6">
          <div className={`
            rounded-xl overflow-hidden
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
          `}>
            <div className={`
              flex items-center gap-2 px-4 py-3 border-b
              ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}
            `}>
              <svg className="w-5 h-5 text-[#a46807]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Opportunities
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#a46807]/20 text-[#a46807]">
                {opportunities.length}
              </span>
            </div>
            <div className="divide-y divide-[#d9d6cf]/50 dark:divide-white/5">
              {opportunities.map(opp => (
                <div key={opp.id} className="p-4">
                  <div className="flex items-start gap-3">
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
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                          {opp.headline}
                        </h4>
                        <span className={`
                          text-xs font-semibold uppercase px-1.5 py-0.5 rounded
                          ${opp.priority === 'high' ? 'bg-[#a46807]/10 text-[#a46807]' : ''}
                          ${opp.priority === 'medium' ? 'bg-[#577d91]/10 text-[#577d91]' : ''}
                          ${opp.priority === 'low' ? 'bg-[#495737]/10 text-[#495737]' : ''}
                        `}>
                          {opp.priority}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        {opp.detail}
                      </p>
                      <p className={`text-sm mt-2 font-medium ${
                        opp.priority === 'high' ? 'text-[#a46807]' :
                        opp.priority === 'medium' ? 'text-[#577d91]' : 'text-[#495737]'
                      }`}>
                        {opp.suggestedAction}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Talking Points */}
      {talkingPoints.length > 0 && (
        <div className="px-4 mb-6">
          <h3 className={`font-semibold mb-3 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Talking Points
          </h3>
          <div className="space-y-3">
            {talkingPoints.map((point, i) => (
              <div
                key={i}
                className={`
                  p-4 rounded-xl border-l-4
                  ${point.category === 'positive' ? 'border-l-[#495737]' : ''}
                  ${point.category === 'concern' ? 'border-l-[#a46807]' : ''}
                  ${point.category === 'opportunity' ? 'border-l-[#577d91]' : ''}
                  ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${point.category === 'positive' ? 'bg-[#495737]/20 text-[#495737]' : ''}
                    ${point.category === 'concern' ? 'bg-[#a46807]/20 text-[#a46807]' : ''}
                    ${point.category === 'opportunity' ? 'bg-[#577d91]/20 text-[#577d91]' : ''}
                  `}>
                    {point.category === 'positive' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {point.category === 'concern' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                    {point.category === 'opportunity' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                      "{point.headline}"
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                      {point.detail}
                    </p>
                    <p className={`text-xs mt-2 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                      {point.supportingData}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Breakdown */}
      <div className={`px-4 mb-6 ${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
        {/* Condition */}
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
                <MiniDonutChart value={conditionData.new} max={conditionData.total} label="NEW" color="#495737" size={80} />
                <MiniDonutChart value={conditionData.used} max={conditionData.total} label="USED" color="#a46807" size={80} />
              </div>
              <div className="space-y-2">
                <ProgressBar value={conditionData.new} max={conditionData.total} label="New Units" color="#495737" />
                <ProgressBar value={conditionData.used} max={conditionData.total} label="Used Units" color="#a46807" />
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
      </div>

      {/* Thor vs Competitors */}
      {thorAnalysis && (
        <div className="px-4 mb-6">
          <div className={`
            p-4 rounded-xl
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
          `}>
            <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              Thor vs. Competitors
            </h3>
            <div className="space-y-4">
              {/* Share Bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#495737] font-medium">Thor Brands ({thorAnalysis.thorShare.toFixed(1)}%)</span>
                  <span className={`${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    Competitors ({(100 - thorAnalysis.thorShare).toFixed(1)}%)
                  </span>
                </div>
                <div className={`h-4 rounded-full overflow-hidden flex ${isDark ? 'bg-white/10' : 'bg-[#d9d6cf]'}`}>
                  <div
                    className="h-full bg-[#495737] transition-all duration-500"
                    style={{ width: `${thorAnalysis.thorShare}%` }}
                  />
                </div>
              </div>

              {/* Thor Brands List */}
              {thorAnalysis.thorBrands.length > 0 && (
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    Thor Brands at Dealer
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {thorAnalysis.thorBrands.slice(0, 5).map(brand => (
                      <span
                        key={brand.name}
                        className={`px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-[#495737]/20 text-[#495737]' : 'bg-[#495737]/10 text-[#495737]'}`}
                      >
                        {brand.name} ({brand.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Competitors */}
              {thorAnalysis.topCompetitors.length > 0 && (
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    Top Competitors
                  </p>
                  <div className="space-y-2">
                    {thorAnalysis.topCompetitors.map(comp => (
                      <div key={comp.name} className="flex items-center justify-between">
                        <span className={`text-sm ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                          {comp.name}
                        </span>
                        <span className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                          {comp.count} units
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DealerIntel
