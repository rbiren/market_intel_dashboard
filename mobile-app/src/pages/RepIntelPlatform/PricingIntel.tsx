/**
 * Pricing Intelligence Page
 *
 * Surfaces pricing insights that help reps add value:
 * - MAP Violations - Units below Minimum Advertised Price
 * - Overpriced Units - Above market median (slow movers)
 * - Underpriced Units - Below market median (margin opportunity)
 * - Model Year Pricing Analysis
 */

import { useMemo, useState } from 'react'
import { useRepIntelContext } from '../../context/RepIntelContext'
import { useAggregatedData, useSalesVelocity } from '../../hooks/useSalesData'
import { StatCard } from '../../components/sales/StatCard'
import { StatCardSkeleton } from '../../components/sales/LoadingState'

type TabOption = 'overview' | 'overpriced' | 'underpriced' | 'model-year'

export function PricingIntel() {
  const { theme, viewMode, filters } = useRepIntelContext()
  const { data: aggData, loading } = useAggregatedData(filters)
  const { data: velocityData } = useSalesVelocity(filters)

  const [activeTab, setActiveTab] = useState<TabOption>('overview')

  const isDark = theme === 'dark'
  const isMobile = viewMode === 'mobile'

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  // Generate sample pricing data (in production, this would come from API)
  // Based on the data available: overpriced_unit, amount_over_median, percent_over_median
  const pricingAnalysis = useMemo(() => {
    if (!aggData) return null

    const avgPrice = aggData.avg_price || 0
    const minPrice = aggData.min_price || 0
    const maxPrice = aggData.max_price || 0

    // Simulated pricing breakdown (would be real data in production)
    const totalUnits = aggData.total_units || 0
    const overpricedCount = Math.round(totalUnits * 0.15) // ~15% overpriced
    const underpricedCount = Math.round(totalUnits * 0.08) // ~8% underpriced
    const mapViolationCount = Math.round(totalUnits * 0.02) // ~2% MAP violations

    return {
      avgPrice,
      minPrice,
      maxPrice,
      marketMedian: avgPrice * 0.95, // Approximation
      totalUnits,
      overpricedCount,
      underpricedCount,
      mapViolationCount,
      avgVsMarket: -2.3, // Placeholder - would be calculated
    }
  }, [aggData])

  // Sample overpriced units (would come from API)
  const overpricedUnits = useMemo(() => {
    if (!aggData?.by_manufacturer) return []

    return [
      { stockNumber: 'STK-2024-001', dealer: 'Camping World Orlando', model: '2023 Montana 3855BR', price: 89500, medianPrice: 77800, amountOver: 11700, percentOver: 15.0, daysOnLot: 94 },
      { stockNumber: 'STK-2024-002', dealer: 'General RV Tampa', model: '2023 Fuzion 430', price: 112000, medianPrice: 99500, amountOver: 12500, percentOver: 12.6, daysOnLot: 78 },
      { stockNumber: 'STK-2024-003', dealer: 'Lazydays RV', model: '2022 Raptor 423', price: 98000, medianPrice: 85400, amountOver: 12600, percentOver: 14.8, daysOnLot: 112 },
      { stockNumber: 'STK-2024-004', dealer: 'Camping World Jacksonville', model: '2023 Solitude 380FL', price: 95000, medianPrice: 87200, amountOver: 7800, percentOver: 8.9, daysOnLot: 67 },
      { stockNumber: 'STK-2024-005', dealer: 'PPL Motorhomes', model: '2024 Endeavor 40F', price: 425000, medianPrice: 398000, amountOver: 27000, percentOver: 6.8, daysOnLot: 45 },
    ]
  }, [aggData])

  // Sample underpriced units
  const underpricedUnits = useMemo(() => {
    return [
      { stockNumber: 'STK-2024-101', dealer: 'General RV Tampa', model: '2024 Jayflight 284BHS', price: 32500, medianPrice: 38200, amountUnder: 5700, percentUnder: 14.9, potentialGain: 4500 },
      { stockNumber: 'STK-2024-102', dealer: 'Camping World Orlando', model: '2024 Cougar 29RKS', price: 45000, medianPrice: 51800, amountUnder: 6800, percentUnder: 13.1, potentialGain: 5500 },
      { stockNumber: 'STK-2024-103', dealer: 'Lazydays RV', model: '2023 Passport 2401BH', price: 28900, medianPrice: 33200, amountUnder: 4300, percentUnder: 12.9, potentialGain: 3500 },
    ]
  }, [])

  // Sample MAP violations
  const mapViolations = useMemo(() => {
    return [
      { stockNumber: 'STK-2024-201', dealer: 'Camping World Orlando', model: '2024 Jayco Jayflight 284BHS', price: 42500, mapPrice: 45000, violationAmount: 2500, violationPercent: 5.5, daysInViolation: 12 },
      { stockNumber: 'STK-2024-202', dealer: 'General RV Tampa', model: '2024 Keystone Cougar 29RKS', price: 38900, mapPrice: 41500, violationAmount: 2600, violationPercent: 6.3, daysInViolation: 5 },
    ]
  }, [])

  // Model year pricing (would come from API)
  const modelYearPricing = useMemo(() => {
    return [
      { year: '2024', avgPrice: 58500, medianPrice: 52000, unitCount: 45000, avgDays: 28, percentOverpriced: 12 },
      { year: '2023', avgPrice: 49200, medianPrice: 44500, unitCount: 62000, avgDays: 45, percentOverpriced: 18 },
      { year: '2022', avgPrice: 42800, medianPrice: 38900, unitCount: 38000, avgDays: 68, percentOverpriced: 24 },
      { year: '2021', avgPrice: 36500, medianPrice: 33200, unitCount: 18000, avgDays: 92, percentOverpriced: 32 },
      { year: '2020', avgPrice: 31200, medianPrice: 28500, unitCount: 8500, avgDays: 115, percentOverpriced: 41 },
    ]
  }, [])

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'overpriced' as const, label: 'Overpriced', count: pricingAnalysis?.overpricedCount },
    { id: 'underpriced' as const, label: 'Underpriced', count: pricingAnalysis?.underpricedCount },
    { id: 'model-year' as const, label: 'By Model Year' },
  ]

  return (
    <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
      {/* Header */}
      <div className={`px-4 py-4`}>
        <h1 className={`text-xl font-bold mb-1 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Pricing Intelligence
        </h1>
        <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
          Identify pricing opportunities and risks
        </p>
      </div>

      {/* KPI Summary */}
      <div className={`px-4 mb-4 grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {loading ? (
          [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="MAP Violations"
              value={pricingAnalysis?.mapViolationCount || 0}
              subValue="requires action"
              color="sage"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <StatCard
              label="Overpriced Units"
              value={pricingAnalysis?.overpricedCount || 0}
              subValue="above median"
              color="gold"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
            <StatCard
              label="Underpriced Units"
              value={pricingAnalysis?.underpricedCount || 0}
              subValue="margin opportunity"
              color="steel"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Avg vs Market"
              value={`${pricingAnalysis?.avgVsMarket || 0}%`}
              subValue="price position"
              color="neutral"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
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
        <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-[#f7f4f0]'}`}>
          {tabs.map(tab => (
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
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === tab.id ? 'bg-white/20' : isDark ? 'bg-white/10' : 'bg-[#d9d6cf]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* MAP Violations Alert */}
            {mapViolations.length > 0 && (
              <div className={`
                p-4 rounded-xl border-l-4 border-l-red-500
                ${isDark ? 'bg-red-500/10' : 'bg-red-50'}
              `}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/20 text-red-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                      MAP Violations Detected
                    </h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                      {mapViolations.length} units are advertised below Minimum Advertised Price. Immediate action required.
                    </p>
                    <div className="mt-3 space-y-2">
                      {mapViolations.slice(0, 2).map(unit => (
                        <div key={unit.stockNumber} className={`flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                          <div>
                            <p className={`text-sm font-medium ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                              {unit.model}
                            </p>
                            <p className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                              {unit.dealer}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-red-500">
                              -{formatCurrency(unit.violationAmount)}
                            </p>
                            <p className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                              below MAP
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Price Distribution Summary */}
            <div className={`
              p-4 rounded-xl
              ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
            `}>
              <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Price Distribution Summary
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>Average Price</span>
                  <span className={`font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {formatCurrency(pricingAnalysis?.avgPrice || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>Market Median</span>
                  <span className={`font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {formatCurrency(pricingAnalysis?.marketMedian || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>Price Range</span>
                  <span className={`font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    {formatCurrency(pricingAnalysis?.minPrice || 0)} - {formatCurrency(pricingAnalysis?.maxPrice || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
              <div className={`
                p-4 rounded-xl border-l-4 border-l-[#a46807]
                ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
              `}>
                <p className={`text-xs uppercase font-semibold tracking-wider mb-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  Overpriced Inventory
                </p>
                <p className={`text-2xl font-bold text-[#a46807]`}>
                  {pricingAnalysis?.overpricedCount}
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  units above market median
                </p>
              </div>
              <div className={`
                p-4 rounded-xl border-l-4 border-l-[#495737]
                ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
              `}>
                <p className={`text-xs uppercase font-semibold tracking-wider mb-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  Underpriced Inventory
                </p>
                <p className={`text-2xl font-bold text-[#495737]`}>
                  {pricingAnalysis?.underpricedCount}
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  potential margin opportunity
                </p>
              </div>
              <div className={`
                p-4 rounded-xl border-l-4 border-l-[#577d91]
                ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
              `}>
                <p className={`text-xs uppercase font-semibold tracking-wider mb-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  Avg Days to Sell
                </p>
                <p className={`text-2xl font-bold text-[#577d91]`}>
                  {velocityData?.avg_days_to_sell ? Math.round(velocityData.avg_days_to_sell) : '--'}
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  market average
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overpriced' && (
          <div className={`
            rounded-xl overflow-hidden
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
          `}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}`}>
              <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Overpriced Units (Above Market Median)
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                These units may be slow movers due to pricing above market. Consider pricing adjustments.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-xs uppercase tracking-wider ${isDark ? 'text-[#8c8a7e] bg-white/5' : 'text-[#595755] bg-[#f7f4f0]'}`}>
                    <th className="text-left py-3 px-4">Model</th>
                    <th className="text-left py-3 px-2">Dealer</th>
                    <th className="text-right py-3 px-2">Price</th>
                    <th className="text-right py-3 px-2">vs Median</th>
                    <th className="text-right py-3 px-2">Days</th>
                    <th className="text-right py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overpricedUnits.map((unit, i) => (
                    <tr
                      key={unit.stockNumber}
                      className={`
                        ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#f7f4f0]'}
                        ${i < overpricedUnits.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
                      `}
                    >
                      <td className={`py-3 px-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        <div className="font-medium">{unit.model}</div>
                        <div className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>{unit.stockNumber}</div>
                      </td>
                      <td className={`py-3 px-2 text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        {unit.dealer}
                      </td>
                      <td className={`py-3 px-2 text-right font-medium ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        {formatCurrency(unit.price)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-[#a46807] font-bold">+{formatCurrency(unit.amountOver)}</span>
                        <div className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>+{unit.percentOver.toFixed(1)}%</div>
                      </td>
                      <td className={`py-3 px-2 text-right ${unit.daysOnLot > 90 ? 'text-[#a46807] font-bold' : isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        {unit.daysOnLot}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`
                          px-2 py-1 rounded text-xs font-semibold
                          ${unit.daysOnLot > 90 ? 'bg-[#a46807]/20 text-[#a46807]' : 'bg-[#577d91]/20 text-[#577d91]'}
                        `}>
                          {unit.daysOnLot > 90 ? 'Urgent' : 'Review'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'underpriced' && (
          <div className={`
            rounded-xl overflow-hidden
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
          `}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}`}>
              <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Underpriced Units (Margin Opportunity)
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                These units may have room for price increases based on market data.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-xs uppercase tracking-wider ${isDark ? 'text-[#8c8a7e] bg-white/5' : 'text-[#595755] bg-[#f7f4f0]'}`}>
                    <th className="text-left py-3 px-4">Model</th>
                    <th className="text-left py-3 px-2">Dealer</th>
                    <th className="text-right py-3 px-2">Current</th>
                    <th className="text-right py-3 px-2">Median</th>
                    <th className="text-right py-3 px-2">Potential</th>
                    <th className="text-right py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {underpricedUnits.map((unit, i) => (
                    <tr
                      key={unit.stockNumber}
                      className={`
                        ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#f7f4f0]'}
                        ${i < underpricedUnits.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
                      `}
                    >
                      <td className={`py-3 px-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        <div className="font-medium">{unit.model}</div>
                        <div className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>{unit.stockNumber}</div>
                      </td>
                      <td className={`py-3 px-2 text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        {unit.dealer}
                      </td>
                      <td className={`py-3 px-2 text-right font-medium ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        {formatCurrency(unit.price)}
                      </td>
                      <td className={`py-3 px-2 text-right ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        {formatCurrency(unit.medianPrice)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-[#495737] font-bold">+{formatCurrency(unit.potentialGain)}</span>
                        <div className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>margin</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-[#495737]/20 text-[#495737]">
                          Opportunity
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'model-year' && (
          <div className={`
            rounded-xl overflow-hidden
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
          `}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}`}>
              <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Pricing by Model Year
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                Average pricing and turn times by model year
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-xs uppercase tracking-wider ${isDark ? 'text-[#8c8a7e] bg-white/5' : 'text-[#595755] bg-[#f7f4f0]'}`}>
                    <th className="text-left py-3 px-4">Year</th>
                    <th className="text-right py-3 px-2">Avg Price</th>
                    <th className="text-right py-3 px-2">Median</th>
                    <th className="text-right py-3 px-2">Units</th>
                    <th className="text-right py-3 px-2">Avg Days</th>
                    <th className="text-right py-3 px-4">% Overpriced</th>
                  </tr>
                </thead>
                <tbody>
                  {modelYearPricing.map((year, i) => (
                    <tr
                      key={year.year}
                      className={`
                        ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#f7f4f0]'}
                        ${i < modelYearPricing.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
                      `}
                    >
                      <td className={`py-3 px-4 font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        {year.year}
                      </td>
                      <td className={`py-3 px-2 text-right font-medium ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        {formatCurrency(year.avgPrice)}
                      </td>
                      <td className={`py-3 px-2 text-right ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        {formatCurrency(year.medianPrice)}
                      </td>
                      <td className={`py-3 px-2 text-right ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        {year.unitCount.toLocaleString()}
                      </td>
                      <td className={`py-3 px-2 text-right ${year.avgDays > 60 ? 'text-[#a46807] font-bold' : isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        {year.avgDays}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`
                          px-2 py-1 rounded text-xs font-semibold
                          ${year.percentOverpriced > 25 ? 'bg-[#a46807]/20 text-[#a46807]' : isDark ? 'bg-white/10 text-[#8c8a7e]' : 'bg-[#f7f4f0] text-[#595755]'}
                        `}>
                          {year.percentOverpriced}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PricingIntel
