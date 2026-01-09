import type { FactInventoryCurrent } from '../graphql/types/inventory'
import type { DimDealership, DealershipLookup } from '../graphql/types/dealership'
import type { DimProduct, ProductLookup } from '../graphql/types/product'

// Enriched inventory item with joined data from dimension tables
export interface EnrichedInventoryItem {
  // From fact table
  stock_number: string
  price: number
  days_on_lot: number
  condition: string
  overpriced_unit: boolean
  percent_over_median: number
  first_seen_date: string

  // From dim_product
  manufacturer: string
  model: string
  rv_type: string
  floorplan: string
  manufacturer_logo: string | null

  // From dim_dealership
  dealership_name: string
  dealer_group: string
  city: string
  state: string
  region: string
}

/**
 * Enriches inventory items with product and dealership data using lookup maps.
 * This is our client-side join strategy since Fabric GraphQL doesn't support server-side joins.
 */
export function enrichInventoryItems(
  inventoryItems: FactInventoryCurrent[],
  productLookup: ProductLookup,
  dealershipLookup: DealershipLookup
): EnrichedInventoryItem[] {
  return inventoryItems
    .filter((item) => item.stock_number !== null)
    .map((item) => {
      const product = item.dim_product_skey
        ? productLookup.get(item.dim_product_skey)
        : null
      const dealership = item.dim_dealership_skey
        ? dealershipLookup.get(item.dim_dealership_skey)
        : null

      return {
        stock_number: item.stock_number!,
        price: parseFloat(item.price || '0'),
        days_on_lot: item.days_on_lot || 0,
        condition: item.condition || 'Unknown',
        overpriced_unit: item.overpriced_unit === 1,
        percent_over_median: parseFloat(item.percent_over_median || '0'),
        first_seen_date: item.first_seen_date || '',

        manufacturer: product?.manufacturer || 'Unknown',
        model: product?.model || 'Unknown',
        rv_type: product?.rv_type || 'Unknown',
        floorplan: product?.floorplan || '',
        manufacturer_logo: product?.manufacturer_logo_small || null,

        dealership_name: dealership?.dealership || 'Unknown',
        dealer_group: dealership?.dealer_group || 'Unknown',
        city: dealership?.city || '',
        state: dealership?.state || '',
        region: dealership?.region || 'Unknown',
      }
    })
}

/**
 * Build a lookup map from dealership data for O(1) lookups
 */
export function buildDealershipLookup(items: DimDealership[]): DealershipLookup {
  const map: DealershipLookup = new Map()
  for (const item of items) {
    if (item.dim_dealership_skey !== null) {
      map.set(item.dim_dealership_skey, item)
    }
  }
  return map
}

/**
 * Build a lookup map from product data for O(1) lookups
 */
export function buildProductLookup(items: DimProduct[]): ProductLookup {
  const map: ProductLookup = new Map()
  for (const item of items) {
    if (item.dim_product_skey !== null) {
      map.set(item.dim_product_skey, item)
    }
  }
  return map
}
