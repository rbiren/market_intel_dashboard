/**
 * Rep Intel Platform Context
 *
 * Manages global state for the Rep Intel platform including:
 * - Theme (light/dark mode)
 * - View mode (mobile/desktop)
 * - Current filters
 * - Selected dealer
 * - Navigation state
 * - Alert preferences
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'

// Types
export type ThemeMode = 'light' | 'dark'
export type ViewMode = 'mobile' | 'desktop'
export type RepIntelView =
  | 'command'        // Territory Command Center (home)
  | 'dealers'        // Dealer Directory with priority ranking
  | 'dealer-intel'   // Dealer Intelligence (deep dive)
  | 'meeting-mode'   // Meeting Mode (mobile-optimized)
  | 'opportunities'  // All opportunities across territory
  | 'pricing'        // Pricing Intelligence
  | 'aging'          // Aging Inventory Analysis
  | 'floorplans'     // Floorplan Performance Rankings
  | 'market'         // Market Demand
  | 'map'            // Territory Map
  | 'products'       // Product Catalog
  | 'actions'        // Tasks & follow-ups

export interface RepIntelFilters {
  region?: string
  state?: string
  city?: string
  dealerGroup?: string | string[]
  rvType?: string
  condition?: string
  manufacturer?: string | string[]
  model?: string | string[]
  floorplan?: string
  minPrice?: number
  maxPrice?: number
  searchQuery?: string
  startDate?: string
  endDate?: string
  minDaysOnLot?: number
  maxDaysOnLot?: number
  priorityLevel?: 'high' | 'medium' | 'low'
}

export interface SelectedDealer {
  id: string
  name: string
  dealerGroup: string
  state: string
  city?: string
  region?: string
}

export interface Alert {
  id: string
  type: 'warning' | 'opportunity' | 'risk' | 'info'
  message: string
  dealer?: string
  dealerGroup?: string
  action?: string
  priority: 'high' | 'medium' | 'low'
  timestamp: Date
  dismissed: boolean
}

interface RepIntelContextType {
  // Theme
  theme: ThemeMode
  toggleTheme: () => void
  setTheme: (theme: ThemeMode) => void

  // View Mode
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Navigation
  currentView: RepIntelView
  setCurrentView: (view: RepIntelView) => void
  navigateToDealer: (dealer: SelectedDealer) => void

  // Filters
  filters: RepIntelFilters
  setFilters: (filters: RepIntelFilters) => void
  updateFilter: (key: keyof RepIntelFilters, value: string | number | string[] | undefined) => void
  clearFilters: () => void
  activeFilterCount: number

  // Selected Dealer
  selectedDealer: SelectedDealer | null
  setSelectedDealer: (dealer: SelectedDealer | null) => void

  // Alerts
  alerts: Alert[]
  dismissAlert: (id: string) => void
  clearAllAlerts: () => void
  activeAlertCount: number

  // UI State
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  filterPanelOpen: boolean
  setFilterPanelOpen: (open: boolean) => void
}

const RepIntelContext = createContext<RepIntelContextType | undefined>(undefined)

export function RepIntelProvider({ children }: { children: ReactNode }) {
  // Theme
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rep-intel-theme')
      if (saved === 'light' || saved === 'dark') return saved
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'mobile' : 'desktop'
    }
    return 'desktop'
  })

  // Navigation
  const [currentView, setCurrentView] = useState<RepIntelView>('command')

  // Filters
  const [filters, setFilters] = useState<RepIntelFilters>({})

  // Selected Dealer
  const [selectedDealer, setSelectedDealer] = useState<SelectedDealer | null>(null)

  // Alerts (sample alerts for demo)
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'warning',
      message: '5 Thor units aged 90+ days at Camping World Orlando',
      dealer: 'Camping World Orlando',
      dealerGroup: 'CAMPING WORLD RV SALES',
      action: 'Review aging inventory',
      priority: 'high',
      timestamp: new Date(),
      dismissed: false
    },
    {
      id: '2',
      type: 'opportunity',
      message: 'General RV Tampa: Class B opportunity identified',
      dealer: 'General RV Tampa',
      dealerGroup: 'GENERAL RV CENTER',
      action: 'Present Thor Sequence lineup',
      priority: 'medium',
      timestamp: new Date(),
      dismissed: false
    },
    {
      id: '3',
      type: 'risk',
      message: 'Lazydays: Thor share dropped 5% this month',
      dealer: 'Lazydays Tampa',
      dealerGroup: 'LAZYDAYS RV',
      action: 'Schedule dealer visit',
      priority: 'high',
      timestamp: new Date(),
      dismissed: false
    }
  ])

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('rep-intel-theme', next)
      return next
    })
  }, [])

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme)
    localStorage.setItem('rep-intel-theme', newTheme)
  }, [])

  // Navigate to dealer
  const navigateToDealer = useCallback((dealer: SelectedDealer) => {
    setSelectedDealer(dealer)
    setCurrentView('dealer-intel')
  }, [])

  // Update single filter
  const updateFilter = useCallback((key: keyof RepIntelFilters, value: string | number | string[] | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(v => {
    if (v === undefined || v === '') return false
    if (Array.isArray(v)) return v.length > 0
    return true
  }).length

  // Dismiss alert
  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === id ? { ...alert, dismissed: true } : alert
    ))
  }, [])

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setAlerts(prev => prev.map(alert => ({ ...alert, dismissed: true })))
  }, [])

  // Active alert count
  const activeAlertCount = alerts.filter(a => !a.dismissed).length

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 768 ? 'mobile' : 'desktop')
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const value: RepIntelContextType = {
    theme,
    toggleTheme,
    setTheme,
    viewMode,
    setViewMode,
    currentView,
    setCurrentView,
    navigateToDealer,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    activeFilterCount,
    selectedDealer,
    setSelectedDealer,
    alerts,
    dismissAlert,
    clearAllAlerts,
    activeAlertCount,
    sidebarOpen,
    setSidebarOpen,
    filterPanelOpen,
    setFilterPanelOpen,
  }

  return (
    <RepIntelContext.Provider value={value}>
      {children}
    </RepIntelContext.Provider>
  )
}

export function useRepIntelContext() {
  const context = useContext(RepIntelContext)
  if (!context) {
    throw new Error('useRepIntelContext must be used within a RepIntelProvider')
  }
  return context
}

export default RepIntelContext
