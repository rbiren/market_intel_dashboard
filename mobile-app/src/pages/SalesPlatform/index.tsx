/**
 * Sales Platform - Main Entry Point
 *
 * RV Sales Rep Platform for Thor Industries
 * Comprehensive tool for sales representatives to:
 * - View territory overview and KPIs
 * - Browse and research dealers
 * - Analyze competitive landscape
 * - Present products to dealers
 * - Prepare for meetings
 *
 * Features:
 * - Responsive design (mobile & desktop)
 * - Light & dark mode
 * - Full filtering capabilities
 * - Interactive maps and charts
 */

import { SalesProvider, useSalesContext } from '../../context/SalesContext'

// Pages
import SalesDashboard from './SalesDashboard'
import DealerDirectory from './DealerDirectory'
import DealerDetail from './DealerDetail'
import TerritoryMap from './TerritoryMap'
import CompetitiveIntel from './CompetitiveIntel'
import ProductCatalog from './ProductCatalog'
import MeetingPrep from './MeetingPrep'

// Components
import Sidebar from '../../components/sales/Sidebar'
import MobileNav from '../../components/sales/MobileNav'
import Header from '../../components/sales/Header'
import FilterPanel from '../../components/sales/FilterPanel'

function SalesPlatformContent() {
  const {
    theme,
    viewMode,
    currentView,
    setCurrentView,
    sidebarOpen,
    filterPanelOpen,
    setFilterPanelOpen
  } = useSalesContext()

  const isDark = theme === 'dark'
  const isMobile = viewMode === 'mobile'

  // Get page title based on current view
  const getPageTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return undefined // No title on dashboard (shows logo)
      case 'dealers':
        return 'Dealer Directory'
      case 'dealer-detail':
        return 'Dealer Details'
      case 'map':
        return 'Territory Map'
      case 'competitive':
        return 'Competitive Intel'
      case 'products':
        return 'Product Catalog'
      case 'meeting-prep':
        return 'Meeting Prep'
      default:
        return undefined
    }
  }

  // Handle back navigation
  const handleBack = () => {
    if (currentView === 'dealer-detail') {
      setCurrentView('dealers')
    } else {
      setCurrentView('dashboard')
    }
  }

  // Render current view
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <SalesDashboard />
      case 'dealers':
        return <DealerDirectory />
      case 'dealer-detail':
        return <DealerDetail />
      case 'map':
        return <TerritoryMap />
      case 'competitive':
        return <CompetitiveIntel />
      case 'products':
        return <ProductCatalog />
      case 'meeting-prep':
        return <MeetingPrep />
      default:
        return <SalesDashboard />
    }
  }

  return (
    <div className={`
      min-h-screen
      ${isDark ? 'bg-[#181817] text-[#fffdfa]' : 'bg-[#f7f4f0] text-[#181817]'}
    `}>
      {/* Sidebar (desktop) */}
      {!isMobile && <Sidebar />}

      {/* Sidebar (mobile - conditional render based on sidebarOpen) */}
      {isMobile && sidebarOpen && <Sidebar />}

      {/* Main content area */}
      <div className={`
        min-h-screen
        ${!isMobile ? 'ml-64' : ''}
      `}>
        {/* Header */}
        <Header
          title={getPageTitle()}
          showBack={currentView !== 'dashboard'}
          onBack={handleBack}
        />

        {/* Page content */}
        <main className="relative">
          {renderContent()}
        </main>

        {/* Mobile bottom navigation */}
        {isMobile && <MobileNav />}
      </div>

      {/* Filter panel slide-out (mobile) */}
      {filterPanelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setFilterPanelOpen(false)}
          />
          {/* Panel */}
          <FilterPanel
            mode="panel"
            onClose={() => setFilterPanelOpen(false)}
          />
        </>
      )}
    </div>
  )
}

// Main export with provider wrapper
export function SalesPlatform() {
  return (
    <SalesProvider>
      <SalesPlatformContent />
    </SalesProvider>
  )
}

export default SalesPlatform
