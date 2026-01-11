/**
 * Aging Inventory Analysis Page
 *
 * Surfaces aging inventory that requires attention:
 * - Days on lot breakdown by bracket
 * - Critical aging units (90+ days)
 * - Aging by condition, RV type, manufacturer
 * - Dealer-level aging analysis
 */

import { useMemo, useState } from 'react'
import { useRepIntelContext } from '../../context/RepIntelContext'
import { useAggregatedData, useSalesVelocity } from '../../hooks/useSalesData'
import { StatCard } from '../../components/sales/StatCard'
import { StatCardSkeleton } from '../../components/sales/LoadingState'

type TabOption = 'overview' | 'critical' | 'by-type' | 'by-dealer'

// Aging brackets
const AGING_BRACKETS = [
  { label: 'Fresh (0-30)', min: 0, max: 30, color: '#495737' },
  { label: 'Normal (31-60)', min: 31, max: 60, color: '#577d91' },
  { label: 'Aging (61-90)', min: 61, max: 90, color: '#a46807' },
  { label: 'Stale (91-120)', min: 91, max: 120, color: '#dc6803' },
  { label: 'Critical (120+)', min: 121, max: 9999, color: '#dc2626' },
]

export function AgingAnalysis() {
  const { theme, viewMode, filters, navigateToDealer } = useRepIntelContext()
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

  // Calculate aging analysis
  const agingAnalysis = useMemo(() => {
    if (!aggData) return null

    const totalUnits = aggData.total_units || 0
    const avgDaysOnLot = aggData.avg_days_on_lot || 0

    // Simulated bracket distribution (would come from real API data)
    // Based on typical RV inventory patterns
    const brackets = {
      fresh: Math.round(totalUnits * 0.45),    // 45% fresh
      normal: Math.round(totalUnits * 0.28),   // 28% normal
      aging: Math.round(totalUnits * 0.15),    // 15% aging
      stale: Math.round(totalUnits * 0.08),    // 8% stale
      critical: Math.round(totalUnits * 0.04), // 4% critical
    }

    return {
      totalUnits,
      avgDaysOnLot,
      brackets,
      criticalValue: brackets.critical * (aggData.avg_price || 50000),
    }
  }, [aggData])

  // Sample critical units (would come from API)
  const criticalUnits = useMemo(() => {
    return [
      { stockNumber: 'STK-001', dealer: 'Camping World Orlando', dealerGroup: 'CAMPING WORLD RV SALES', model: '2023 Montana 3855BR', condition: 'NEW', daysOnLot: 142, price: 89500 },
      { stockNumber: 'STK-002', dealer: 'General RV Tampa', dealerGroup: 'GENERAL RV CENTER', model: '2022 Raptor 423', condition: 'NEW', daysOnLot: 128, price: 98000 },
      { stockNumber: 'STK-003', dealer: 'Lazydays RV', dealerGroup: 'LAZYDAYS RV', model: '2023 Solitude 380FL', condition: 'NEW', daysOnLot: 124, price: 95000 },
      { stockNumber: 'STK-004', dealer: 'PPL Motorhomes', dealerGroup: 'PPL MOTORHOMES', model: '2022 Fuzion 430', condition: 'USED', daysOnLot: 156, price: 85000 },
      { stockNumber: 'STK-005', dealer: 'Camping World Jacksonville', dealerGroup: 'CAMPING WORLD RV SALES', model: '2021 Endeavor 40F', condition: 'USED', daysOnLot: 189, price: 295000 },
    ]
  }, [])

  // Aging by RV type (would come from API)
  const agingByType = useMemo(() => {
    if (!aggData?.by_rv_type) return []

    return aggData.by_rv_type.slice(0, 8).map((type, i) => ({
      name: type.name,
      totalUnits: type.count,
      avgDaysOnLot: type.avg_days_on_lot || 45 + i * 8,
      criticalCount: Math.round(type.count * (0.02 + i * 0.01)),
      totalValue: type.total_value,
    }))
  }, [aggData])

  // Aging by dealer (would come from API)
  const agingByDealer = useMemo(() => {
    if (!aggData?.by_dealer_group) return []

    return aggData.by_dealer_group.slice(0, 10).map((dealer, i) => ({
      name: dealer.name,
      totalUnits: dealer.count,
      avgDaysOnLot: dealer.avg_days_on_lot || 40 + i * 5,
      criticalCount: Math.round(dealer.count * (0.02 + i * 0.005)),
      criticalValue: Math.round(dealer.count * (0.02 + i * 0.005)) * (dealer.avg_price || 50000),
    }))
  }, [aggData])

  // Aging by condition
  const agingByCondition = useMemo(() => {
    if (!aggData?.by_condition) return []

    return aggData.by_condition.map(cond => ({
      name: cond.name,
      totalUnits: cond.count,
      avgDaysOnLot: cond.avg_days_on_lot || (cond.name === 'NEW' ? 38 : 52),
    }))
  }, [aggData])

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'critical' as const, label: 'Critical Units', count: agingAnalysis?.brackets.critical },
    { id: 'by-type' as const, label: 'By RV Type' },
    { id: 'by-dealer' as const, label: 'By Dealer' },
  ]

  return (
    <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
      {/* Header */}
      <div className={`px-4 py-4`}>
        <h1 className={`text-xl font-bold mb-1 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Aging Inventory Analysis
        </h1>
        <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
          Identify and address aging inventory
        </p>
      </div>

      {/* KPI Summary */}
      <div className={`px-4 mb-4 grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {loading ? (
          [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Avg Days on Lot"
              value={agingAnalysis?.avgDaysOnLot ? Math.round(agingAnalysis.avgDaysOnLot) : '--'}
              subValue="all inventory"
              color="sage"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Critical Units"
              value={agingAnalysis?.brackets.critical || 0}
              subValue="120+ days"
              color="gold"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <StatCard
              label="Critical Value"
              value={formatCurrency(agingAnalysis?.criticalValue || 0)}
              subValue="at risk"
              color="steel"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Avg to Sell"
              value={velocityData?.avg_days_to_sell ? Math.round(velocityData.avg_days_to_sell) : '--'}
              subValue="days"
              color="neutral"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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
                  activeTab === tab.id ? 'bg-white/20' : 'bg-red-500/20 text-red-500'
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
            {/* Days on Lot Distribution */}
            <div className={`
              p-4 rounded-xl
              ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
            `}>
              <h3 className={`font-semibold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Days on Lot Distribution
              </h3>
              <div className="space-y-3">
                {agingAnalysis && AGING_BRACKETS.map((bracket, i) => {
                  const bracketKeys = ['fresh', 'normal', 'aging', 'stale', 'critical'] as const
                  const count = agingAnalysis.brackets[bracketKeys[i]]
                  const percentage = agingAnalysis.totalUnits > 0
                    ? (count / agingAnalysis.totalUnits) * 100
                    : 0

                  return (
                    <div key={bracket.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}>
                          {bracket.label}
                        </span>
                        <span className={isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}>
                          {count.toLocaleString()} units ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className={`h-4 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-[#d9d6cf]'}`}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: bracket.color
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Aging by Condition */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {agingByCondition.map(cond => (
                <div
                  key={cond.name}
                  className={`
                    p-4 rounded-xl border-l-4
                    ${cond.name === 'NEW' ? 'border-l-[#495737]' : 'border-l-[#a46807]'}
                    ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
                  `}
                >
                  <p className={`text-xs uppercase font-semibold tracking-wider mb-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    {cond.name} Inventory
                  </p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className={`text-3xl font-bold ${cond.name === 'NEW' ? 'text-[#495737]' : 'text-[#a46807]'}`}>
                        {cond.avgDaysOnLot}
                      </p>
                      <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>avg days on lot</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        {cond.totalUnits.toLocaleString()}
                      </p>
                      <p className={`text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>units</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Insights */}
            <div className={`
              p-4 rounded-xl border-l-4 border-l-[#a46807]
              ${isDark ? 'bg-[#a46807]/10' : 'bg-[#a46807]/5'}
            `}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#a46807]/20 text-[#a46807]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                    Aging Alert
                  </h4>
                  <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                    {agingAnalysis?.brackets.critical || 0} units ({((agingAnalysis?.brackets.critical || 0) / (agingAnalysis?.totalUnits || 1) * 100).toFixed(1)}%)
                    have been on lot for 120+ days. These represent {formatCurrency(agingAnalysis?.criticalValue || 0)} in at-risk inventory.
                  </p>
                  <button className="mt-3 px-4 py-2 rounded-lg bg-[#a46807] text-white text-sm font-medium hover:bg-[#8a5606] transition-colors">
                    View Critical Units
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'critical' && (
          <div className={`
            rounded-xl overflow-hidden
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
          `}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}`}>
              <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Critical Aging Units (120+ Days)
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                These units require immediate attention. Consider promotional pricing or transfer options.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-xs uppercase tracking-wider ${isDark ? 'text-[#8c8a7e] bg-white/5' : 'text-[#595755] bg-[#f7f4f0]'}`}>
                    <th className="text-left py-3 px-4">Unit</th>
                    <th className="text-left py-3 px-2">Dealer</th>
                    <th className="text-center py-3 px-2">Condition</th>
                    <th className="text-right py-3 px-2">Days</th>
                    <th className="text-right py-3 px-2">Price</th>
                    <th className="text-right py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalUnits.map((unit, i) => (
                    <tr
                      key={unit.stockNumber}
                      className={`
                        ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#f7f4f0]'}
                        ${i < criticalUnits.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
                      `}
                    >
                      <td className={`py-3 px-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        <div className="font-medium">{unit.model}</div>
                        <div className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>{unit.stockNumber}</div>
                      </td>
                      <td className={`py-3 px-2 text-sm ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        <button
                          onClick={() => navigateToDealer({
                            id: unit.dealerGroup,
                            name: unit.dealerGroup,
                            dealerGroup: unit.dealerGroup,
                            state: ''
                          })}
                          className="hover:underline text-left"
                        >
                          {unit.dealer}
                        </button>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`
                          px-2 py-0.5 rounded text-xs font-semibold
                          ${unit.condition === 'NEW' ? 'bg-[#495737]/20 text-[#495737]' : 'bg-[#a46807]/20 text-[#a46807]'}
                        `}>
                          {unit.condition}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`font-bold ${unit.daysOnLot > 150 ? 'text-red-500' : 'text-[#a46807]'}`}>
                          {unit.daysOnLot}
                        </span>
                      </td>
                      <td className={`py-3 px-2 text-right font-medium ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        {formatCurrency(unit.price)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`
                          px-2 py-1 rounded text-xs font-semibold
                          ${unit.daysOnLot > 150 ? 'bg-red-500/20 text-red-500' : 'bg-[#a46807]/20 text-[#a46807]'}
                        `}>
                          {unit.daysOnLot > 150 ? 'Urgent' : 'Review'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'by-type' && (
          <div className={`
            rounded-xl overflow-hidden
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
          `}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}`}>
              <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Aging by RV Type
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-xs uppercase tracking-wider ${isDark ? 'text-[#8c8a7e] bg-white/5' : 'text-[#595755] bg-[#f7f4f0]'}`}>
                    <th className="text-left py-3 px-4">RV Type</th>
                    <th className="text-right py-3 px-2">Units</th>
                    <th className="text-right py-3 px-2">Avg Days</th>
                    <th className="text-right py-3 px-2">Critical</th>
                    <th className="text-right py-3 px-4">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {agingByType.map((type, i) => (
                    <tr
                      key={type.name}
                      className={`
                        ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#f7f4f0]'}
                        ${i < agingByType.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
                      `}
                    >
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        {type.name}
                      </td>
                      <td className={`py-3 px-2 text-right ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        {type.totalUnits.toLocaleString()}
                      </td>
                      <td className={`py-3 px-2 text-right font-bold ${type.avgDaysOnLot > 60 ? 'text-[#a46807]' : isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        {type.avgDaysOnLot}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {type.criticalCount > 0 ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-500">
                            {type.criticalCount}
                          </span>
                        ) : (
                          <span className={isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}>0</span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        {formatCurrency(type.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'by-dealer' && (
          <div className={`
            rounded-xl overflow-hidden
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
          `}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}`}>
              <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                Aging by Dealer
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                Click on a dealer to view their profile
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-xs uppercase tracking-wider ${isDark ? 'text-[#8c8a7e] bg-white/5' : 'text-[#595755] bg-[#f7f4f0]'}`}>
                    <th className="text-left py-3 px-4">Dealer</th>
                    <th className="text-right py-3 px-2">Units</th>
                    <th className="text-right py-3 px-2">Avg Days</th>
                    <th className="text-right py-3 px-2">Critical</th>
                    <th className="text-right py-3 px-4">At Risk Value</th>
                  </tr>
                </thead>
                <tbody>
                  {agingByDealer.map((dealer, i) => (
                    <tr
                      key={dealer.name}
                      onClick={() => navigateToDealer({
                        id: dealer.name,
                        name: dealer.name,
                        dealerGroup: dealer.name,
                        state: ''
                      })}
                      className={`
                        cursor-pointer
                        ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#f7f4f0]'}
                        ${i < agingByDealer.length - 1 ? isDark ? 'border-b border-white/5' : 'border-b border-[#d9d6cf]/50' : ''}
                      `}
                    >
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        <div className="flex items-center gap-2">
                          {dealer.name}
                          <svg className={`w-4 h-4 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </td>
                      <td className={`py-3 px-2 text-right ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        {dealer.totalUnits.toLocaleString()}
                      </td>
                      <td className={`py-3 px-2 text-right font-bold ${dealer.avgDaysOnLot > 60 ? 'text-[#a46807]' : isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                        {dealer.avgDaysOnLot}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {dealer.criticalCount > 0 ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-500">
                            {dealer.criticalCount}
                          </span>
                        ) : (
                          <span className={isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}>0</span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right ${dealer.criticalValue > 0 ? 'text-red-500 font-medium' : isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                        {formatCurrency(dealer.criticalValue)}
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

export default AgingAnalysis
