import { useQuery } from '@apollo/client/react'
import { useMemo, useCallback } from 'react'
import { GET_INVENTORY_CURRENT } from '../graphql/queries/inventory'
import { GET_ALL_DEALERSHIPS } from '../graphql/queries/dealerships'
import { GET_ALL_PRODUCTS } from '../graphql/queries/products'
import {
  enrichInventoryItems,
  buildDealershipLookup,
  buildProductLookup,
} from '../utils/dataEnrichment'
import type { InventoryFilters, SortField, SortDirection } from '../graphql/types/filters'
import type { GetInventoryCurrentResponse } from '../graphql/types/inventory'
import type { GetAllDealershipsResponse } from '../graphql/types/dealership'
import type { GetAllProductsResponse } from '../graphql/types/product'

const PAGE_SIZE = 20

interface UseInventoryOptions {
  filters: InventoryFilters
  sortField: SortField
  sortDirection: SortDirection
}

/**
 * Main hook for fetching and enriching inventory data.
 * Handles:
 * - Fetching dimension tables with cache-first policy
 * - Fetching inventory with cache-and-network policy
 * - Client-side filtering by dimension fields (region, rv_type, manufacturer)
 * - Data enrichment via lookup maps
 * - Pagination via fetchMore
 */
export function useInventory({ filters, sortField, sortDirection }: UseInventoryOptions) {
  // Build GraphQL filter from InventoryFilters
  // Only include filters that can be applied server-side (fact table columns)
  const graphqlFilter = useMemo(() => {
    const conditions: Record<string, unknown>[] = []

    if (filters.condition) {
      conditions.push({ condition: { eq: filters.condition } })
    }
    if (filters.priceMin !== undefined) {
      conditions.push({ price: { gte: filters.priceMin.toString() } })
    }
    if (filters.priceMax !== undefined) {
      conditions.push({ price: { lte: filters.priceMax.toString() } })
    }
    if (filters.daysOnLotMax !== undefined) {
      conditions.push({ days_on_lot: { lte: filters.daysOnLotMax } })
    }

    return conditions.length > 0 ? { and: conditions } : undefined
  }, [filters.condition, filters.priceMin, filters.priceMax, filters.daysOnLotMax])

  // Build orderBy
  const orderBy = useMemo(
    () => ({
      [sortField]: sortDirection,
    }),
    [sortField, sortDirection]
  )

  // Fetch dimension tables (cached heavily)
  const { data: dealershipData } = useQuery<GetAllDealershipsResponse>(GET_ALL_DEALERSHIPS, {
    variables: { first: 1000 },
    fetchPolicy: 'cache-first',
  })

  const { data: productData } = useQuery<GetAllProductsResponse>(GET_ALL_PRODUCTS, {
    variables: { first: 5000 },
    fetchPolicy: 'cache-first',
  })

  // Fetch inventory
  const {
    data: inventoryData,
    loading,
    error,
    fetchMore,
    refetch,
  } = useQuery<GetInventoryCurrentResponse>(GET_INVENTORY_CURRENT, {
    variables: {
      first: PAGE_SIZE,
      filter: graphqlFilter,
      orderBy,
    },
    fetchPolicy: 'cache-and-network',
  })

  // Build lookup maps
  const dealershipLookup = useMemo(() => {
    if (!dealershipData?.dim_dealerships?.items) return new Map()
    return buildDealershipLookup(dealershipData.dim_dealerships.items)
  }, [dealershipData])

  const productLookup = useMemo(() => {
    if (!productData?.dim_products?.items) return new Map()
    return buildProductLookup(productData.dim_products.items)
  }, [productData])

  // Enrich inventory data and apply client-side filters
  const enrichedItems = useMemo(() => {
    if (!inventoryData?.fact_inventory_currents?.items) return []

    // Client-side filtering by region, rv_type, manufacturer
    // (These require joining to dimension tables)
    let items = inventoryData.fact_inventory_currents.items

    if (filters.region || filters.rv_type || filters.manufacturer) {
      items = items.filter((item) => {
        const product = item.dim_product_skey
          ? productLookup.get(item.dim_product_skey)
          : null
        const dealership = item.dim_dealership_skey
          ? dealershipLookup.get(item.dim_dealership_skey)
          : null

        if (filters.region && dealership?.region !== filters.region) {
          return false
        }
        if (filters.rv_type && product?.rv_type !== filters.rv_type) {
          return false
        }
        if (filters.manufacturer && product?.manufacturer !== filters.manufacturer) {
          return false
        }
        return true
      })
    }

    return enrichInventoryItems(items, productLookup, dealershipLookup)
  }, [inventoryData, productLookup, dealershipLookup, filters])

  // Load more handler for infinite scroll
  const loadMore = useCallback(() => {
    const endCursor = inventoryData?.fact_inventory_currents?.endCursor
    if (endCursor && inventoryData?.fact_inventory_currents?.hasNextPage) {
      fetchMore({
        variables: { after: endCursor },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev
          return {
            fact_inventory_currents: {
              ...fetchMoreResult.fact_inventory_currents,
              items: [
                ...prev.fact_inventory_currents.items,
                ...fetchMoreResult.fact_inventory_currents.items,
              ],
            },
          }
        },
      })
    }
  }, [inventoryData, fetchMore])

  return {
    items: enrichedItems,
    loading,
    error,
    hasMore: inventoryData?.fact_inventory_currents?.hasNextPage ?? false,
    loadMore,
    refetch,
    totalLoaded: enrichedItems.length,
  }
}
