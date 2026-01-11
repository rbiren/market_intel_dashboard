/**
 * Sales Platform Data Hooks
 *
 * Specialized hooks for the Sales Rep Platform that build on
 * the existing OneLake inventory hooks.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { SalesFilters } from '../context/SalesContext'

const API_BASE = 'http://localhost:8000'

// Types
export interface DealerInfo {
  dealer_group: string
  dealership: string
  state: string
  region?: string
  city?: string
  county?: string
  total_units: number
  total_value: number
  avg_price: number
  new_units: number
  used_units: number
  rv_types: Record<string, number>
  brands: Record<string, number>
  avg_days_on_lot?: number
}

export interface TerritoryStats {
  total_dealers: number
  total_units: number
  total_value: number
  avg_price: number
  new_percentage: number
  used_percentage: number
  top_rv_types: { name: string; count: number; percentage: number }[]
  top_regions: { name: string; count: number; dealers: number }[]
  top_states: { name: string; count: number; dealers: number }[]
}

export interface MarketShare {
  name: string
  units: number
  value: number
  percentage: number
  trend?: 'up' | 'down' | 'stable'
}

export interface CompetitorAnalysis {
  by_manufacturer: MarketShare[]
  by_dealer_group: MarketShare[]
  by_rv_type: MarketShare[]
  by_region: MarketShare[]
}

export interface AggregationItem {
  name: string
  count: number
  total_value: number
  avg_price: number
  min_price: number
  max_price: number
  avg_days_on_lot?: number
}

export interface SalesVelocityItem {
  name: string
  sold_count: number
  avg_days_to_sell?: number
  total_value?: number
  avg_price?: number
}

export interface SalesVelocitySummary {
  total_sold: number
  avg_days_to_sell?: number
  avg_sale_price?: number
  by_rv_type: SalesVelocityItem[]
  by_condition: SalesVelocityItem[]
}

export interface SalesVelocityData {
  total_sold: number
  avg_days_to_sell?: number
  median_days_to_sell?: number
  min_days_to_sell?: number
  max_days_to_sell?: number
  avg_sale_price?: number
  total_sales_value?: number
  by_rv_type: SalesVelocityItem[]
  by_condition: SalesVelocityItem[]
  by_dealer_group: SalesVelocityItem[]
  by_manufacturer: SalesVelocityItem[]
  by_state: SalesVelocityItem[]
  by_region: SalesVelocityItem[]
  by_month: SalesVelocityItem[]
}

export interface DateRange {
  min_date: string | null
  max_date: string | null
}

export interface AggregatedData {
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
  // Sales velocity data (from sales history)
  avg_days_to_sell?: number
  sales_velocity?: SalesVelocitySummary
}

export interface FilterOptionsData {
  rv_types: string[]
  states: string[]
  conditions: string[]
  dealer_groups: string[]
  manufacturers: string[]
  models: string[]
  floorplans: string[]
  regions?: string[]
  cities?: string[]
}

export interface TopFloorplanItem {
  floorplan: string
  manufacturer: string
  model: string
  sold_count: number
  avg_days_to_sell?: number
  avg_sale_price?: number
  total_sales_value?: number
}

export interface TopFloorplansByCategory {
  category: string
  floorplans: TopFloorplanItem[]
}

export interface TopFloorplansData {
  categories: TopFloorplansByCategory[]
  date_range: {
    start_date: string | null
    end_date: string | null
  }
}

// Build URL params from filters
function buildFilterParams(filters: SalesFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.rvType) params.append('rv_class', filters.rvType)
  if (filters.dealerGroup) params.append('dealer_group', filters.dealerGroup)
  if (filters.manufacturer) params.append('manufacturer', filters.manufacturer)
  if (filters.model) params.append('model', filters.model)
  if (filters.floorplan) params.append('floorplan', filters.floorplan)
  if (filters.condition) params.append('condition', filters.condition)
  if (filters.state) params.append('state', filters.state)
  if (filters.minPrice !== undefined) params.append('min_price', filters.minPrice.toString())
  if (filters.maxPrice !== undefined) params.append('max_price', filters.maxPrice.toString())
  if (filters.startDate) params.append('start_date', filters.startDate)
  if (filters.endDate) params.append('end_date', filters.endDate)
  return params
}

/**
 * Hook for fetching aggregated data with filters
 */
export function useAggregatedData(filters: SalesFilters = {}) {
  const [data, setData] = useState<AggregatedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = buildFilterParams(filters)
      const response = await fetch(`${API_BASE}/inventory/aggregated?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Hook for fetching filter options
 */
export function useFilterOptions() {
  const [data, setData] = useState<FilterOptionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFilters() {
      try {
        const response = await fetch(`${API_BASE}/filters`)
        if (!response.ok) throw new Error(`API error: ${response.status}`)
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch filters')
      } finally {
        setLoading(false)
      }
    }
    fetchFilters()
  }, [])

  return { data, loading, error }
}

/**
 * Hook for territory statistics derived from aggregated data
 */
export function useTerritoryStats(filters: SalesFilters = {}) {
  const { data: aggData, loading, error } = useAggregatedData(filters)

  const stats = useMemo<TerritoryStats | null>(() => {
    if (!aggData) return null

    const conditionData = aggData.by_condition || []
    const newData = conditionData.find(c => c.name === 'NEW')
    const usedData = conditionData.find(c => c.name === 'USED')

    const newUnits = newData?.count || 0
    const usedUnits = usedData?.count || 0
    const totalUnits = aggData.total_units || (newUnits + usedUnits)

    return {
      total_dealers: aggData.by_dealer_group?.length || 0,
      total_units: totalUnits,
      total_value: aggData.total_value || 0,
      avg_price: aggData.avg_price || 0,
      new_percentage: totalUnits > 0 ? (newUnits / totalUnits) * 100 : 0,
      used_percentage: totalUnits > 0 ? (usedUnits / totalUnits) * 100 : 0,
      top_rv_types: (aggData.by_rv_type || []).slice(0, 5).map(item => ({
        name: item.name,
        count: item.count,
        percentage: totalUnits > 0 ? (item.count / totalUnits) * 100 : 0
      })),
      top_regions: (aggData.by_region || []).slice(0, 5).map(item => ({
        name: item.name,
        count: item.count,
        dealers: 0 // Would need additional data
      })),
      top_states: (aggData.by_state || []).slice(0, 10).map(item => ({
        name: item.name,
        count: item.count,
        dealers: 0
      }))
    }
  }, [aggData])

  return { stats, loading, error }
}

/**
 * Hook for dealer list with filtering and search
 */
export function useDealerList(filters: SalesFilters = {}) {
  const { data: aggData, loading, error } = useAggregatedData(filters)

  const dealers = useMemo<DealerInfo[]>(() => {
    if (!aggData?.by_dealer_group) return []

    return aggData.by_dealer_group.map(dealer => ({
      dealer_group: dealer.name,
      dealership: dealer.name,
      state: '',
      total_units: dealer.count,
      total_value: dealer.total_value,
      avg_price: dealer.avg_price,
      new_units: 0,
      used_units: 0,
      rv_types: {},
      brands: {},
      avg_days_on_lot: dealer.avg_days_on_lot
    }))
  }, [aggData])

  // Filter by search query
  const filteredDealers = useMemo(() => {
    if (!filters.searchQuery) return dealers
    const query = filters.searchQuery.toLowerCase()
    return dealers.filter(d =>
      d.dealer_group.toLowerCase().includes(query) ||
      d.dealership.toLowerCase().includes(query)
    )
  }, [dealers, filters.searchQuery])

  return { dealers: filteredDealers, loading, error }
}

/**
 * Hook for competitive analysis
 */
export function useCompetitiveAnalysis(filters: SalesFilters = {}) {
  const { data: aggData, loading, error } = useAggregatedData(filters)

  const analysis = useMemo<CompetitorAnalysis | null>(() => {
    if (!aggData) return null

    const totalUnits = aggData.total_units || 1

    const mapToMarketShare = (items: AggregationItem[]): MarketShare[] =>
      items.map(item => ({
        name: item.name,
        units: item.count,
        value: item.total_value,
        percentage: (item.count / totalUnits) * 100,
        trend: 'stable' as const
      }))

    return {
      by_manufacturer: mapToMarketShare(aggData.by_manufacturer || []),
      by_dealer_group: mapToMarketShare(aggData.by_dealer_group || []).slice(0, 20),
      by_rv_type: mapToMarketShare(aggData.by_rv_type || []),
      by_region: mapToMarketShare(aggData.by_region || [])
    }
  }, [aggData])

  return { analysis, loading, error }
}

/**
 * Hook for getting dealer details by name
 */
export function useDealerDetail(dealerName: string | null) {
  const [data, setData] = useState<AggregatedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!dealerName) {
      setData(null)
      return
    }

    async function fetchDealerData() {
      if (!dealerName) return
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        params.append('dealer_group', dealerName)

        const response = await fetch(`${API_BASE}/inventory/aggregated?${params.toString()}`)
        if (!response.ok) throw new Error(`API error: ${response.status}`)

        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dealer data')
      } finally {
        setLoading(false)
      }
    }

    fetchDealerData()
  }, [dealerName])

  return { data, loading, error }
}

/**
 * Product catalog mock data (would come from API in real implementation)
 */
export interface Product {
  id: string
  name: string
  rvType: string
  manufacturer: string
  model: string
  year: number
  msrp: number
  features: string[]
  sleeps: number
  length: string
  weight: string
  imageUrl?: string
  description: string
}

export function useProductCatalog(filters: { rvType?: string; manufacturer?: string } = {}) {
  // Mock data - in real implementation, this would come from an API
  const products = useMemo<Product[]>(() => {
    const allProducts: Product[] = [
      {
        id: '1',
        name: 'Jayco Eagle HT',
        rvType: 'FIFTH WHEEL',
        manufacturer: 'JAYCO',
        model: 'Eagle HT 28.5RSTS',
        year: 2024,
        msrp: 65999,
        features: ['Residential Fridge', 'Theater Seating', 'Outside Kitchen', 'Solar Prep'],
        sleeps: 6,
        length: '32\'',
        weight: '9,850 lbs',
        description: 'The Eagle HT combines luxury with lightweight construction for easy towing.'
      },
      {
        id: '2',
        name: 'Airstream Basecamp',
        rvType: 'TRAVEL TRAILER',
        manufacturer: 'AIRSTREAM',
        model: 'Basecamp 20X',
        year: 2024,
        msrp: 52900,
        features: ['Off-Grid Ready', 'Panoramic Windows', 'Convertible Dinette', 'Adventure Rack'],
        sleeps: 4,
        length: '20\'',
        weight: '3,500 lbs',
        description: 'Built for the adventurous spirit, the Basecamp goes where others cannot.'
      },
      {
        id: '3',
        name: 'Thor Magnitude',
        rvType: 'CLASS C',
        manufacturer: 'THOR',
        model: 'Magnitude SV34',
        year: 2024,
        msrp: 189995,
        features: ['Super C Diesel', 'King Bed', 'Washer/Dryer Prep', 'Generator'],
        sleeps: 8,
        length: '36\'',
        weight: '18,500 lbs',
        description: 'The ultimate in Class C luxury with Super C power and capabilities.'
      },
      {
        id: '4',
        name: 'Winnebago Vista',
        rvType: 'CLASS A',
        manufacturer: 'WINNEBAGO',
        model: 'Vista 31B',
        year: 2024,
        msrp: 159995,
        features: ['Full Paint', 'Bunk Beds', 'Drop-Down Bed', 'King Bed Master'],
        sleeps: 10,
        length: '32\'',
        weight: '16,000 lbs',
        description: 'Family-friendly Class A with sleeping for up to 10.'
      },
      {
        id: '5',
        name: 'Coachmen Beyond',
        rvType: 'CLASS B',
        manufacturer: 'COACHMEN',
        model: 'Beyond 22C',
        year: 2024,
        msrp: 124995,
        features: ['AWD Chassis', 'Pop-Top', 'Lithium Batteries', 'Solar Standard'],
        sleeps: 4,
        length: '22\'',
        weight: '8,500 lbs',
        description: 'Adventure-ready Class B with all-wheel drive and off-grid capabilities.'
      },
    ]

    let filtered = allProducts
    if (filters.rvType) {
      filtered = filtered.filter(p => p.rvType === filters.rvType)
    }
    if (filters.manufacturer) {
      filtered = filtered.filter(p => p.manufacturer === filters.manufacturer)
    }
    return filtered
  }, [filters.rvType, filters.manufacturer])

  return { products, loading: false, error: null }
}

/**
 * Hook for fetching sales velocity data with filters
 */
export function useSalesVelocity(filters: SalesFilters = {}) {
  const [data, setData] = useState<SalesVelocityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = buildFilterParams(filters)
      const response = await fetch(`${API_BASE}/inventory/sales-velocity?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales velocity data')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

/**
 * Hook for fetching available sales date range
 */
export function useSalesDateRange() {
  const [data, setData] = useState<DateRange | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDateRange() {
      try {
        const response = await fetch(`${API_BASE}/inventory/sales-date-range`)
        if (!response.ok) throw new Error(`API error: ${response.status}`)
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch date range')
      } finally {
        setLoading(false)
      }
    }
    fetchDateRange()
  }, [])

  return { data, loading, error }
}

/**
 * Hook for sales velocity statistics derived from velocity data
 */
export function useSalesVelocityStats(filters: SalesFilters = {}) {
  const { data: velocityData, loading, error } = useSalesVelocity(filters)

  const stats = useMemo(() => {
    if (!velocityData) return null

    return {
      totalSold: velocityData.total_sold,
      avgDaysToSell: velocityData.avg_days_to_sell,
      medianDaysToSell: velocityData.median_days_to_sell,
      minDaysToSell: velocityData.min_days_to_sell,
      maxDaysToSell: velocityData.max_days_to_sell,
      avgSalePrice: velocityData.avg_sale_price,
      totalSalesValue: velocityData.total_sales_value,
      topRvTypes: velocityData.by_rv_type?.slice(0, 5) || [],
      topDealerGroups: velocityData.by_dealer_group?.slice(0, 10) || [],
      topManufacturers: velocityData.by_manufacturer?.slice(0, 10) || [],
      byCondition: velocityData.by_condition || [],
      monthlyTrend: velocityData.by_month || [],
    }
  }, [velocityData])

  return { stats, loading, error }
}

/**
 * Hook for fetching top selling floorplans by RV category
 */
export function useTopFloorplans(startDate?: string, endDate?: string, limit: number = 10) {
  const [data, setData] = useState<TopFloorplansData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      params.append('limit', limit.toString())

      const response = await fetch(`${API_BASE}/inventory/top-floorplans?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch top floorplans data')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, limit])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
