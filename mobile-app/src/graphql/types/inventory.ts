// GraphQL response types for inventory data

export interface FactInventoryCurrent {
  stock_number: string | null
  dim_dealership_skey: number | null
  dim_product_skey: number | null
  first_seen_date: string | null
  last_seen_date: string | null
  days_on_lot: number | null
  days_in_pending: number | null
  price: string | null // Decimal comes as string from GraphQL
  median_price: string | null
  overpriced_unit: number | null
  current_stock: number | null
  condition: string | null
  amount_over_median: string | null
  percent_over_median: string | null
}

export interface FactInventory {
  stock_number: string | null
  inventory_date_skey: number | null
  dim_dealership_skey: number | null
  dim_product_skey: number | null
  vin: string | null
  web_title: string | null
  listing_url: string | null
  image_url: string | null
  tags: string | null
  condition: string | null
  inventory_status: string | null
  inventory_on_lot: number | null
  age: number | null
  cost: string | null
  discount: string | null
  msrp: string | null
  sale_or_regular_price: string | null
  sale_price: string | null
  price: string | null
  median_price: string | null
  overpriced_unit: number | null
  amount_over_median: string | null
  percent_over_median: string | null
}

// Connection types for pagination
export interface FactInventoryCurrentConnection {
  items: FactInventoryCurrent[]
  endCursor: string | null
  hasNextPage: boolean
}

export interface FactInventoryConnection {
  items: FactInventory[]
  endCursor: string | null
  hasNextPage: boolean
}

// Query response types
export interface GetInventoryCurrentResponse {
  fact_inventory_currents: FactInventoryCurrentConnection
}

export interface GetInventoryDetailResponse {
  fact_inventories: FactInventoryConnection
}
