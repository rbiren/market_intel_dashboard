/**
 * Territory Command Center
 *
 * Main dashboard for Rep Intel Platform
 * Every element answers "What do I do next?"
 *
 * Features:
 * - Territory health score
 * - Active alerts
 * - Priority dealers
 * - Quick actions
 */

import { useMemo } from 'react'
import { useRepIntelContext } from '../../context/RepIntelContext'
import { useTerritoryStats, useSalesVelocityStats } from '../../hooks/useSalesData'
import { StatCard } from '../../components/sales/StatCard'
import { StatCardSkeleton, DealerCardSkeleton } from '../../components/sales/LoadingState'

interface TerritoryCommandProps {
  showDealersOnly?: boolean
  showAlertsOnly?: boolean
}

// Thor brands for calculating Thor share
const THOR_BRANDS = [
  'AIRSTREAM', 'JAYCO', 'KEYSTONE', 'HEARTLAND',
  'CRUISER RV', 'DUTCHMEN', 'ENTEGRA', 'DYNAMAX',
  'THOR MOTOR COACH', 'TIFFIN', 'VANLEIGH', 'REDWOOD',
  'HIGHLAND RIDGE', 'GRAND DESIGN', 'CROSSROADS'
]

export function TerritoryCommand({ showDealersOnly, showAlertsOnly }: TerritoryCommandProps) {
  const {
    theme,
    viewMode,
    filters,
    alerts,
    dismissAlert,
    setCurrentView,
    navigateToDealer
  } = useRepIntelContext()

  const { stats, aggData, loading: statsLoading } = useTerritoryStats(filters)
  const { stats: velocityStats, loading: velocityLoading } = useSalesVelocityStats(filters)

  const isDark = theme === 'dark'
  const isMobile = viewMode === 'mobile'
  const loading = statsLoading

  // Active (non-dismissed) alerts
  const activeAlerts = alerts.filter(a => !a.dismissed)

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

  // Calculate health score (0-100)
  const healthScore = useMemo(() => {
    if (!aggData) return { score: 0, trend: 'flat' as const, components: {} }

    // Component calculations (simplified for demo)
    const avgDaysToSell = velocityStats?.avgDaysToSell || 60
    const velocityScore = Math.min(25, Math.max(0, 25 - (avgDaysToSell - 30) / 3))

    // Thor share calculation from manufacturer data
    const thorUnits = aggData.by_manufacturer
      ?.filter(m => THOR_BRANDS.some(brand => m.name.toUpperCase().includes(brand)))
      .reduce((sum, m) => sum + m.count, 0) || 0
    const totalUnits = aggData.total_units || 1
    const thorSharePercent = (thorUnits / totalUnits) * 100
    const thorShareScore = Math.min(25, thorSharePercent)

    // Engagement score (placeholder - would come from visit data)
    const engagementScore = 18

    // Opportunity score (based on alerts)
    const opportunityScore = Math.min(25, 25 - activeAlerts.filter(a => a.priority === 'high').length * 3)

    const total = Math.round(velocityScore + thorShareScore + engagementScore + opportunityScore)

    return {
      score: total,
      trend: total >= 70 ? 'up' : total >= 50 ? 'flat' : 'down' as 'up' | 'flat' | 'down',
      trendValue: 3, // Placeholder
      components: {
        velocity: velocityScore,
        thorShare: thorShareScore,
        engagement: engagementScore,
        opportunities: opportunityScore
      }
    }
  }, [aggData, velocityStats, activeAlerts])

  // Priority dealers (top dealers with calculated scores)
  const priorityDealers = useMemo(() => {
    if (!aggData?.by_dealer_group) return []

    return aggData.by_dealer_group.slice(0, 6).map((dealer, i) => {
      // Calculate opportunity score (simplified)
      const opportunityScore = Math.max(0, 100 - i * 8 - Math.random() * 10)
      const riskLevel = opportunityScore > 80 ? 'low' : opportunityScore > 60 ? 'medium' : 'high'
      const daysSinceVisit = Math.floor(Math.random() * 30) + 1

      return {
        id: dealer.name,
        name: dealer.name,
        location: '',
        totalUnits: dealer.count,
        totalValue: dealer.total_value,
        avgDaysOnLot: dealer.avg_days_on_lot,
        opportunityScore: Math.round(opportunityScore),
        riskLevel: riskLevel as 'low' | 'medium' | 'high',
        lastVisit: new Date(Date.now() - daysSinceVisit * 24 * 60 * 60 * 1000),
        daysSinceVisit,
        recommendedAction: daysSinceVisit > 14 ? 'visit' : daysSinceVisit > 7 ? 'call' : 'monitor' as 'visit' | 'call' | 'email' | 'monitor',
        topOpportunity: i % 3 === 0
          ? 'Thor Fifth Wheels aging 90+ days'
          : i % 3 === 1
            ? 'Class B segment opportunity'
            : 'Expand Travel Trailer selection'
      }
    })
  }, [aggData])

  // Quick actions
  const quickActions = [
    { label: 'View Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', view: 'map' as const },
    { label: 'Pricing Intel', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', view: 'pricing' as const },
    { label: 'Aging Analysis', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', view: 'aging' as const },
    { label: 'Products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', view: 'products' as const },
  ]

  // If showing dealers only
  if (showDealersOnly) {
    return (
      <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
        <div className="px-4 py-4">
          <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Priority Dealers
          </h2>
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {loading ? (
              [...Array(6)].map((_, i) => <DealerCardSkeleton key={i} />)
            ) : (
              priorityDealers.map(dealer => (
                <PriorityDealerCard key={dealer.id} dealer={dealer} onSelect={navigateToDealer} />
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  // If showing alerts only
  if (showAlertsOnly) {
    return (
      <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
        <div className="px-4 py-4">
          <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Alerts & Opportunities
          </h2>
          {activeAlerts.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-semibold mb-2">All caught up!</h3>
              <p className="text-sm">No active alerts in your territory</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

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
          Your territory at a glance
        </p>
      </div>

      {/* Health Score + KPIs Row */}
      <div className={`px-4 mb-6 grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-5'}`}>
        {/* Health Score Card */}
        <div className={`
          ${isMobile ? 'col-span-2' : 'col-span-1'}
          p-4 rounded-xl
          ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
        `}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
              Health Score
            </span>
            <span className={`
              text-xs font-semibold px-2 py-0.5 rounded-full
              ${healthScore.trend === 'up' ? 'bg-[#495737]/20 text-[#495737]' : ''}
              ${healthScore.trend === 'flat' ? 'bg-[#a46807]/20 text-[#a46807]' : ''}
              ${healthScore.trend === 'down' ? 'bg-red-500/20 text-red-500' : ''}
            `}>
              {healthScore.trend === 'up' ? '+' : healthScore.trend === 'down' ? '-' : ''}{healthScore.trendValue}
            </span>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              {loading ? '--' : healthScore.score}
            </span>
            <span className={`text-lg mb-1 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>/100</span>
          </div>
          {/* Mini progress bar */}
          <div className={`mt-2 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-[#d9d6cf]'}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                healthScore.score >= 70 ? 'bg-[#495737]' :
                healthScore.score >= 50 ? 'bg-[#a46807]' : 'bg-red-500'
              }`}
              style={{ width: `${healthScore.score}%` }}
            />
          </div>
        </div>

        {/* KPI Cards */}
        {loading ? (
          [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Dealers"
              value={stats?.total_dealers || 0}
              subValue="in territory"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
              color="sage"
              onClick={() => setCurrentView('dealers')}
            />
            <StatCard
              label="Thor Share"
              value={`${Math.round((healthScore.components.thorShare || 0) / 25 * 100)}%`}
              subValue="of inventory"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
              color="gold"
            />
            <StatCard
              label="Velocity"
              value={velocityLoading ? '--' : `${Math.round(velocityStats?.avgDaysToSell || 0)} days`}
              subValue="avg to sell"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="steel"
            />
            <StatCard
              label="Total Units"
              value={formatNumber(stats?.total_units || 0)}
              subValue={formatCurrency(stats?.total_value || 0)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
              color="neutral"
            />
          </>
        )}
      </div>

      {/* Alerts Section */}
      {activeAlerts.length > 0 && (
        <div className="px-4 mb-6">
          <div className={`
            rounded-xl overflow-hidden
            ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
          `}>
            <div className={`
              flex items-center justify-between px-4 py-3 border-b
              ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}
            `}>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#a46807]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>Alerts</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#a46807] text-white">
                  {activeAlerts.length}
                </span>
              </div>
              <button
                onClick={() => setCurrentView('opportunities')}
                className={`text-xs font-medium ${isDark ? 'text-[#577d91]' : 'text-[#577d91]'} hover:underline`}
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-[#d9d6cf]/50 dark:divide-white/5">
              {activeAlerts.slice(0, 3).map(alert => (
                <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} compact />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Priority Dealers */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Priority Dealers
          </h3>
          <button
            onClick={() => setCurrentView('dealers')}
            className={`text-sm font-medium ${isDark ? 'text-[#577d91]' : 'text-[#577d91]'} hover:underline`}
          >
            View All
          </button>
        </div>
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
          {loading ? (
            [...Array(3)].map((_, i) => <DealerCardSkeleton key={i} />)
          ) : (
            priorityDealers.slice(0, isMobile ? 3 : 6).map(dealer => (
              <PriorityDealerCard key={dealer.id} dealer={dealer} onSelect={navigateToDealer} />
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-6">
        <h3 className={`font-semibold mb-3 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          Quick Actions
        </h3>
        <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          {quickActions.map((action) => (
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
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#495737] to-[#577d91]">
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
    </div>
  )
}

// Alert Card Component
interface AlertCardProps {
  alert: {
    id: string
    type: 'warning' | 'opportunity' | 'risk' | 'info'
    message: string
    dealer?: string
    dealerGroup?: string
    action?: string
    priority: 'high' | 'medium' | 'low'
  }
  onDismiss: (id: string) => void
  compact?: boolean
}

function AlertCard({ alert, onDismiss, compact }: AlertCardProps) {
  const { theme } = useRepIntelContext()
  const isDark = theme === 'dark'

  const getIcon = () => {
    switch (alert.type) {
      case 'warning':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
      case 'opportunity':
        return 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
      case 'risk':
        return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  }

  const getColor = () => {
    switch (alert.type) {
      case 'warning': return '#a46807'
      case 'opportunity': return '#495737'
      case 'risk': return '#dc2626'
      default: return '#577d91'
    }
  }

  if (compact) {
    return (
      <div className={`flex items-start gap-3 p-3 ${isDark ? 'hover:bg-white/5' : 'hover:bg-[#f7f4f0]'}`}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${getColor()}20`, color: getColor() }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIcon()} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            {alert.message}
          </p>
          {alert.action && (
            <p className="text-xs mt-0.5" style={{ color: getColor() }}>
              {alert.action}
            </p>
          )}
        </div>
        <button
          onClick={() => onDismiss(alert.id)}
          className={`p-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#d9d6cf]'}`}
        >
          <svg className={`w-4 h-4 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className={`
      p-4 rounded-xl border-l-4
      ${isDark ? 'bg-[#232322] border border-white/10' : 'bg-white border border-[#d9d6cf] shadow-sm'}
    `} style={{ borderLeftColor: getColor() }}>
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${getColor()}20`, color: getColor() }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIcon()} />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <p className={`font-medium ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
                {alert.message}
              </p>
              {alert.dealer && (
                <p className={`text-sm mt-0.5 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
                  {alert.dealer}
                </p>
              )}
            </div>
            <span className={`
              text-xs font-semibold uppercase px-2 py-0.5 rounded ml-2
              ${alert.priority === 'high' ? 'bg-red-500/10 text-red-500' : ''}
              ${alert.priority === 'medium' ? 'bg-[#a46807]/10 text-[#a46807]' : ''}
              ${alert.priority === 'low' ? 'bg-[#495737]/10 text-[#495737]' : ''}
            `}>
              {alert.priority}
            </span>
          </div>
          {alert.action && (
            <div className="flex items-center gap-2 mt-3">
              <button
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: getColor() }}
              >
                {alert.action}
              </button>
              <button
                onClick={() => onDismiss(alert.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'text-[#8c8a7e] hover:bg-white/10' : 'text-[#595755] hover:bg-[#f7f4f0]'}`}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Priority Dealer Card Component
interface PriorityDealerCardProps {
  dealer: {
    id: string
    name: string
    location: string
    totalUnits: number
    totalValue: number
    avgDaysOnLot?: number
    opportunityScore: number
    riskLevel: 'low' | 'medium' | 'high'
    lastVisit: Date
    daysSinceVisit: number
    recommendedAction: 'visit' | 'call' | 'email' | 'monitor'
    topOpportunity: string
  }
  onSelect: (dealer: { id: string; name: string; dealerGroup: string; state: string }) => void
}

function PriorityDealerCard({ dealer, onSelect }: PriorityDealerCardProps) {
  const { theme } = useRepIntelContext()
  const isDark = theme === 'dark'

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toLocaleString()}`
  }

  const getActionColor = () => {
    switch (dealer.recommendedAction) {
      case 'visit': return '#a46807'
      case 'call': return '#577d91'
      case 'email': return '#495737'
      default: return '#8c8a7e'
    }
  }

  return (
    <div
      onClick={() => onSelect({
        id: dealer.id,
        name: dealer.name,
        dealerGroup: dealer.name,
        state: ''
      })}
      className={`
        p-4 rounded-xl cursor-pointer transition-all duration-200
        ${isDark ? 'bg-[#232322] border border-white/10 hover:bg-[#2a2a29]' : 'bg-white border border-[#d9d6cf] shadow-sm hover:shadow-md'}
        hover:scale-[1.01]
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold truncate ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            {dealer.name}
          </h4>
          <p className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
            Last visit: {dealer.daysSinceVisit}d ago
          </p>
        </div>
        {/* Opportunity Score */}
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold
          ${dealer.opportunityScore >= 80 ? 'bg-[#495737]/20 text-[#495737]' : ''}
          ${dealer.opportunityScore >= 60 && dealer.opportunityScore < 80 ? 'bg-[#a46807]/20 text-[#a46807]' : ''}
          ${dealer.opportunityScore < 60 ? 'bg-red-500/20 text-red-500' : ''}
        `}>
          {dealer.opportunityScore}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 mb-3">
        <div>
          <p className={`text-lg font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            {dealer.totalUnits}
          </p>
          <p className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>units</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            {formatCurrency(dealer.totalValue)}
          </p>
          <p className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>value</p>
        </div>
        {dealer.avgDaysOnLot && (
          <div>
            <p className={`text-lg font-bold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
              {Math.round(dealer.avgDaysOnLot)}
            </p>
            <p className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>avg days</p>
          </div>
        )}
      </div>

      {/* Top Opportunity */}
      <p className={`text-sm mb-3 ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
        {dealer.topOpportunity}
      </p>

      {/* Action Badge */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase px-2 py-1 rounded"
          style={{ backgroundColor: `${getActionColor()}20`, color: getActionColor() }}
        >
          {dealer.recommendedAction}
        </span>
        {dealer.riskLevel === 'high' && (
          <span className="text-xs font-semibold uppercase px-2 py-1 rounded bg-red-500/10 text-red-500">
            Risk: HIGH
          </span>
        )}
      </div>
    </div>
  )
}

export default TerritoryCommand
