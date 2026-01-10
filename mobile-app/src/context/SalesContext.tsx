/**
 * Sales Rep Platform Context
 *
 * Manages global state for the sales rep platform including:
 * - Theme (light/dark mode)
 * - View mode (mobile/desktop)
 * - Current filters
 * - Selected dealer
 * - Navigation state
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'

// Types
export type ThemeMode = 'light' | 'dark'
export type ViewMode = 'mobile' | 'desktop'
export type PlatformView = 'dashboard' | 'dealers' | 'dealer-detail' | 'map' | 'competitive' | 'products' | 'meeting-prep'

export interface SalesFilters {
  region?: string
  state?: string
  city?: string
  dealerGroup?: string
  rvType?: string
  condition?: string
  manufacturer?: string
  minPrice?: number
  maxPrice?: number
  searchQuery?: string
}

export interface SelectedDealer {
  id: string
  name: string
  dealerGroup: string
  state: string
  city?: string
  region?: string
}

interface SalesContextType {
  // Theme
  theme: ThemeMode
  toggleTheme: () => void
  setTheme: (theme: ThemeMode) => void

  // View Mode
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Navigation
  currentView: PlatformView
  setCurrentView: (view: PlatformView) => void

  // Filters
  filters: SalesFilters
  setFilters: (filters: SalesFilters) => void
  updateFilter: (key: keyof SalesFilters, value: string | number | undefined) => void
  clearFilters: () => void
  activeFilterCount: number

  // Selected Dealer
  selectedDealer: SelectedDealer | null
  setSelectedDealer: (dealer: SelectedDealer | null) => void

  // UI State
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  filterPanelOpen: boolean
  setFilterPanelOpen: (open: boolean) => void
}

const SalesContext = createContext<SalesContextType | undefined>(undefined)

export function SalesProvider({ children }: { children: ReactNode }) {
  // Theme - check localStorage and system preference
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sales-theme')
      if (saved === 'light' || saved === 'dark') return saved
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  // View Mode - detect screen size
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'mobile' : 'desktop'
    }
    return 'desktop'
  })

  // Navigation
  const [currentView, setCurrentView] = useState<PlatformView>('dashboard')

  // Filters
  const [filters, setFilters] = useState<SalesFilters>({})

  // Selected Dealer
  const [selectedDealer, setSelectedDealer] = useState<SelectedDealer | null>(null)

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  // Theme toggle
  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('sales-theme', next)
      return next
    })
  }, [])

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme)
    localStorage.setItem('sales-theme', newTheme)
  }, [])

  // Update single filter
  const updateFilter = useCallback((key: keyof SalesFilters, value: string | number | undefined) => {
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
  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '').length

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

  const value: SalesContextType = {
    theme,
    toggleTheme,
    setTheme,
    viewMode,
    setViewMode,
    currentView,
    setCurrentView,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    activeFilterCount,
    selectedDealer,
    setSelectedDealer,
    sidebarOpen,
    setSidebarOpen,
    filterPanelOpen,
    setFilterPanelOpen,
  }

  return (
    <SalesContext.Provider value={value}>
      {children}
    </SalesContext.Provider>
  )
}

export function useSalesContext() {
  const context = useContext(SalesContext)
  if (!context) {
    throw new Error('useSalesContext must be used within a SalesProvider')
  }
  return context
}

export default SalesContext
