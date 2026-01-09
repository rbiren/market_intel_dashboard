/**
 * Hook for fetching inventory data from OneLake via the FastAPI backend.
 * This bypasses GraphQL and queries the data lake directly.
 */

import { useState, useEffect, useCallback } from 'react'

const API_BASE = 'http://localhost:8000'

export interface InventoryItem {
  stock_number: string | null
  title: string | null
  year: string | null
  make: string | null
  model: string | null
  floorplan: string | null
  rv_class: string | null
  condition: string | null
  sale_price: number | null
  msrp: number | null
  location: string | null
  dealer_source: string | null
  dealer_group: string | null
  first_image: string | null
  sleeps: string | null
  length: string | null
  weight: string | null
  vin: string | null
  days_on_lot: number | null
}

export interface InventoryResponse {
  items: InventoryItem[]
  total: number
  date: string
  dealers_queried: number
}

export interface InventorySummary {
  total_units: number
  unique_makes: number
  unique_models: number
  dealers_with_data: number
  by_class: Record<string, number>
  by_condition: Record<string, number>
  avg_price?: number
  min_price?: number
  max_price?: number
}

export interface DealersResponse {
  dealers: string[]
  count: number
}

interface UseOneLakeInventoryOptions {
  date?: string
  dealer?: string
  dealer_group?: string
  limit?: number
  rv_class?: string
  manufacturer?: string
  make?: string
  location?: string
  state?: string
  condition?: string
  min_price?: number
  max_price?: number
}

interface UseOneLakeInventoryResult {
  data: InventoryResponse | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useOneLakeInventory(options: UseOneLakeInventoryOptions = {}): UseOneLakeInventoryResult {
  const [data, setData] = useState<InventoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.date) params.append('date', options.date)
      if (options.dealer) params.append('dealer', options.dealer)
      if (options.dealer_group) params.append('dealer_group', options.dealer_group)
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.rv_class) params.append('rv_class', options.rv_class)
      if (options.manufacturer) params.append('manufacturer', options.manufacturer)
      if (options.make) params.append('make', options.make)
      if (options.location) params.append('location', options.location)
      if (options.state) params.append('state', options.state)
      if (options.condition) params.append('condition', options.condition)
      if (options.min_price !== undefined) params.append('min_price', options.min_price.toString())
      if (options.max_price !== undefined) params.append('max_price', options.max_price.toString())

      const url = `${API_BASE}/inventory?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const result: InventoryResponse = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory')
    } finally {
      setLoading(false)
    }
  }, [options.date, options.dealer, options.dealer_group, options.limit, options.rv_class, options.manufacturer, options.make, options.location, options.state, options.condition, options.min_price, options.max_price])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  return { data, loading, error, refetch: fetchInventory }
}

export function useOneLakeDealers(): {
  dealers: string[]
  loading: boolean
  error: string | null
} {
  const [dealers, setDealers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDealers() {
      try {
        const response = await fetch(`${API_BASE}/dealers`)
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        const result: DealersResponse = await response.json()
        setDealers(result.dealers)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dealers')
      } finally {
        setLoading(false)
      }
    }

    fetchDealers()
  }, [])

  return { dealers, loading, error }
}

export function useOneLakeSummary(date?: string, dealer?: string): {
  summary: InventorySummary | null
  loading: boolean
  error: string | null
} {
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSummary() {
      try {
        const params = new URLSearchParams()
        if (date) params.append('date', date)
        if (dealer) params.append('dealer', dealer)

        const response = await fetch(`${API_BASE}/inventory/summary?${params.toString()}`)
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        const result = await response.json()
        setSummary(result.summary)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch summary')
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [date, dealer])

  return { summary, loading, error }
}

export interface FilterOptions {
  rv_types: string[]
  states: string[]
  conditions: string[]
  dealer_groups: string[]
  manufacturers: string[]
}

export function useFilterOptions(): {
  filters: FilterOptions | null
  loading: boolean
  error: string | null
} {
  const [filters, setFilters] = useState<FilterOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFilters() {
      try {
        const response = await fetch(`${API_BASE}/filters`)
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        const result: FilterOptions = await response.json()
        setFilters(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch filter options')
      } finally {
        setLoading(false)
      }
    }

    fetchFilters()
  }, [])

  return { filters, loading, error }
}

// Aggregated Summary types and hooks
export interface AggregationItem {
  name: string
  count: number
  total_value: number
  avg_price: number
  min_price: number
  max_price: number
  avg_days_on_lot?: number
}

export interface AggregatedSummary {
  total_units: number
  total_value: number
  avg_price: number
  min_price: number
  max_price: number
  by_rv_type: AggregationItem[]
  by_dealer_group: AggregationItem[]
  by_manufacturer: AggregationItem[]
  by_condition: AggregationItem[]
  by_state: AggregationItem[]
  by_region?: AggregationItem[]
  by_city?: AggregationItem[]
  by_county?: AggregationItem[]
}

interface UseAggregatedSummaryOptions {
  rv_class?: string
  dealer_group?: string
  manufacturer?: string
  condition?: string
  state?: string
  min_price?: number
  max_price?: number
}

export function useAggregatedSummary(options: UseAggregatedSummaryOptions = {}): {
  data: AggregatedSummary | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const [data, setData] = useState<AggregatedSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.rv_class) params.append('rv_class', options.rv_class)
      if (options.dealer_group) params.append('dealer_group', options.dealer_group)
      if (options.manufacturer) params.append('manufacturer', options.manufacturer)
      if (options.condition) params.append('condition', options.condition)
      if (options.state) params.append('state', options.state)
      if (options.min_price !== undefined) params.append('min_price', options.min_price.toString())
      if (options.max_price !== undefined) params.append('max_price', options.max_price.toString())

      const url = `${API_BASE}/inventory/aggregated?${params.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const result: AggregatedSummary = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch aggregated summary')
    } finally {
      setLoading(false)
    }
  }, [options.rv_class, options.dealer_group, options.manufacturer, options.condition, options.state, options.min_price, options.max_price])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return { data, loading, error, refetch: fetchSummary }
}
