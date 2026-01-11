/**
 * Rep Intel Platform - Main Entry Point
 *
 * Action-oriented intelligence platform for RV sales reps
 * Every screen answers "What do I do next?"
 *
 * Key Features:
 * - Territory health score and priority dealers
 * - Smart alerts and opportunities
 * - Pricing intelligence (MAP, over/underpriced)
 * - Aging inventory analysis
 * - Meeting mode for field visits
 */

import { useNavigate } from 'react-router-dom'
import { RepIntelProvider, useRepIntelContext } from '../../context/RepIntelContext'

// Pages
import TerritoryCommand from './TerritoryCommand'
import DealerIntel from './DealerIntel'
import PricingIntel from './PricingIntel'
import AgingAnalysis from './AgingAnalysis'

// Reuse components from Sales Platform
import { ThemeToggle } from '../../components/sales/ThemeToggle'

// Types
type RepIntelView = 'command' | 'dealers' | 'dealer-intel' | 'meeting-mode' | 'opportunities' | 'pricing' | 'aging' | 'floorplans' | 'market' | 'map' | 'products' | 'actions'

// Navigation items for sidebar
const navItems: { id: RepIntelView; label: string; icon: string }[] = [
  { id: 'command', label: 'Command Center', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'dealers', label: 'Priority Dealers', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'opportunities', label: 'Opportunities', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { id: 'pricing', label: 'Pricing Intel', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'aging', label: 'Aging Analysis', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'floorplans', label: 'Floorplans', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'map', label: 'Territory Map', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  { id: 'products', label: 'Products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
]

function RepIntelSidebar() {
  const { theme, currentView, setCurrentView, activeAlertCount } = useRepIntelContext()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  return (
    <aside className={`
      fixed top-0 left-0 h-full w-64 z-40
      ${isDark ? 'bg-[#181817] border-r border-white/10' : 'bg-white border-r border-[#d9d6cf]'}
    `}>
      {/* Logo / Brand */}
      <div className={`
        h-14 flex items-center gap-3 px-4 border-b
        ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}
      `}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#495737] to-[#577d91] flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 className={`font-bold text-sm ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
            Rep Intel
          </h1>
          <span className={`text-xs ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
            Version A
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 overflow-y-auto" style={{ height: 'calc(100% - 56px - 60px)' }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
              ${currentView === item.id
                ? 'bg-[#495737] text-white'
                : isDark
                  ? 'text-[#8c8a7e] hover:text-[#fffdfa] hover:bg-white/5'
                  : 'text-[#595755] hover:text-[#181817] hover:bg-[#f7f4f0]'
              }
            `}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            <span className="flex-1 text-left">{item.label}</span>
            {item.id === 'opportunities' && activeAlertCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#a46807] text-white">
                {activeAlertCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className={`
        absolute bottom-0 left-0 right-0 p-3 border-t
        ${isDark ? 'border-white/10' : 'border-[#d9d6cf]'}
      `}>
        <button
          onClick={() => navigate('/')}
          className={`
            w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
            ${isDark ? 'text-[#8c8a7e] hover:text-[#fffdfa] hover:bg-white/5' : 'text-[#595755] hover:text-[#181817] hover:bg-[#f7f4f0]'}
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Switch Platform
        </button>
      </div>
    </aside>
  )
}

function RepIntelHeader() {
  const { theme, currentView, setCurrentView, selectedDealer, filterPanelOpen, setFilterPanelOpen } = useRepIntelContext()
  const isDark = theme === 'dark'

  const getTitle = () => {
    switch (currentView) {
      case 'command': return 'Territory Command Center'
      case 'dealers': return 'Priority Dealers'
      case 'dealer-intel': return selectedDealer?.name || 'Dealer Intelligence'
      case 'meeting-mode': return 'Meeting Mode'
      case 'opportunities': return 'Opportunities'
      case 'pricing': return 'Pricing Intelligence'
      case 'aging': return 'Aging Analysis'
      case 'floorplans': return 'Floorplan Performance'
      case 'market': return 'Market Demand'
      case 'map': return 'Territory Map'
      case 'products': return 'Product Catalog'
      case 'actions': return 'Actions & Follow-ups'
      default: return 'Rep Intel'
    }
  }

  const showBack = currentView !== 'command'

  return (
    <header className={`
      sticky top-0 z-30 h-14 flex items-center justify-between px-4
      ${isDark ? 'bg-[#181817]/95 border-b border-white/10' : 'bg-[#fffdfa]/95 border-b border-[#d9d6cf]'}
      backdrop-blur-md
    `}>
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => {
              if (currentView === 'dealer-intel') {
                setCurrentView('dealers')
              } else {
                setCurrentView('command')
              }
            }}
            className={`
              p-1.5 rounded-lg transition-colors
              ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f7f4f0]'}
            `}
          >
            <svg className={`w-5 h-5 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className={`font-semibold ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`}>
          {getTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterPanelOpen(!filterPanelOpen)}
          className={`
            p-2 rounded-lg transition-colors relative
            ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f7f4f0]'}
          `}
        >
          <svg className={`w-5 h-5 ${isDark ? 'text-[#fffdfa]' : 'text-[#181817]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}

function RepIntelMobileNav() {
  const { theme, currentView, setCurrentView, activeAlertCount } = useRepIntelContext()
  const isDark = theme === 'dark'

  const mobileNavItems = [
    { id: 'command' as const, label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'dealers' as const, label: 'Dealers', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' },
    { id: 'opportunities' as const, label: 'Alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', badge: activeAlertCount },
    { id: 'pricing' as const, label: 'Pricing', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1' },
    { id: 'aging' as const, label: 'Aging', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ]

  return (
    <nav className={`
      fixed bottom-0 left-0 right-0 z-50 h-16
      ${isDark ? 'bg-[#181817] border-t border-white/10' : 'bg-white border-t border-[#d9d6cf]'}
    `}>
      <div className="flex items-center justify-around h-full px-2">
        {mobileNavItems.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`
              flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg transition-colors relative
              ${currentView === item.id
                ? isDark ? 'text-[#495737]' : 'text-[#495737]'
                : isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'
              }
            `}
          >
            <div className="relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] font-bold rounded-full bg-[#a46807] text-white">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

function RepIntelPlatformContent() {
  const { theme, viewMode, currentView } = useRepIntelContext()

  const isDark = theme === 'dark'
  const isMobile = viewMode === 'mobile'

  // Render current view
  const renderContent = () => {
    switch (currentView) {
      case 'command':
        return <TerritoryCommand />
      case 'dealers':
        return <TerritoryCommand showDealersOnly />
      case 'dealer-intel':
        return <DealerIntel />
      case 'pricing':
        return <PricingIntel />
      case 'aging':
        return <AgingAnalysis />
      case 'opportunities':
        return <TerritoryCommand showAlertsOnly />
      // Placeholder for other views
      default:
        return (
          <div className={`flex items-center justify-center min-h-[60vh] ${isDark ? 'text-[#8c8a7e]' : 'text-[#595755]'}`}>
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
              <p className="text-sm">This section is under development</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className={`
      min-h-screen
      ${isDark ? 'bg-[#181817] text-[#fffdfa]' : 'bg-[#f7f4f0] text-[#181817]'}
    `}>
      {/* Sidebar (desktop) */}
      {!isMobile && <RepIntelSidebar />}

      {/* Main content area */}
      <div className={`min-h-screen ${!isMobile ? 'ml-64' : ''}`}>
        {/* Header */}
        <RepIntelHeader />

        {/* Page content */}
        <main className={`relative ${isMobile ? 'pb-20' : ''}`}>
          {renderContent()}
        </main>

        {/* Mobile bottom navigation */}
        {isMobile && <RepIntelMobileNav />}
      </div>
    </div>
  )
}

// Main export with provider wrapper
export function RepIntelPlatform() {
  return (
    <RepIntelProvider>
      <RepIntelPlatformContent />
    </RepIntelProvider>
  )
}

export default RepIntelPlatform
