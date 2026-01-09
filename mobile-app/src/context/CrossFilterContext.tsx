/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// Types for cross-filter dimensions
export type FilterDimension = 'rv_type' | 'condition' | 'state' | 'dealer_group' | 'manufacturer' | null

export interface CrossFilterState {
  dimension: FilterDimension
  value: string | null
  source: string | null  // Which chart triggered the filter
}

interface CrossFilterContextType {
  filter: CrossFilterState
  setFilter: (dimension: FilterDimension, value: string | null, source: string) => void
  clearFilter: () => void
  isFiltered: (dimension: FilterDimension, value: string) => boolean
  isAnyFiltered: () => boolean
}

const CrossFilterContext = createContext<CrossFilterContextType | null>(null)

export function CrossFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState<CrossFilterState>({
    dimension: null,
    value: null,
    source: null
  })

  const setFilter = useCallback((dimension: FilterDimension, value: string | null, source: string) => {
    // Toggle off if clicking the same value
    if (filter.dimension === dimension && filter.value === value) {
      setFilterState({ dimension: null, value: null, source: null })
    } else {
      setFilterState({ dimension, value, source })
    }
  }, [filter.dimension, filter.value])

  const clearFilter = useCallback(() => {
    setFilterState({ dimension: null, value: null, source: null })
  }, [])

  const isFiltered = useCallback((dimension: FilterDimension, value: string) => {
    return filter.dimension === dimension && filter.value === value
  }, [filter.dimension, filter.value])

  const isAnyFiltered = useCallback(() => {
    return filter.value !== null
  }, [filter.value])

  return (
    <CrossFilterContext.Provider value={{ filter, setFilter, clearFilter, isFiltered, isAnyFiltered }}>
      {children}
    </CrossFilterContext.Provider>
  )
}

export function useCrossFilter() {
  const context = useContext(CrossFilterContext)
  if (!context) {
    throw new Error('useCrossFilter must be used within CrossFilterProvider')
  }
  return context
}
