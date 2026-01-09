// Filter and sort types for inventory queries

export interface InventoryFilters {
  region?: string
  rv_type?: string
  manufacturer?: string
  condition?: string
  priceMin?: number
  priceMax?: number
  daysOnLotMax?: number
}

export type SortField = 'price' | 'days_on_lot' | 'first_seen_date' | 'stock_number'
export type SortDirection = 'ASC' | 'DESC'

export interface SortOption {
  field: SortField
  direction: SortDirection
  label: string
}

export interface FilterOption {
  value: string
  label: string
}

// GraphQL filter input types
export interface StringFilterInput {
  eq?: string
  contains?: string
  startsWith?: string
  in?: string[]
}

export interface IntFilterInput {
  eq?: number
  gt?: number
  gte?: number
  lt?: number
  lte?: number
}

export interface DecimalFilterInput {
  eq?: string
  gt?: string
  gte?: string
  lt?: string
  lte?: string
}

export interface FactInventoryCurrentFilterInput {
  stock_number?: StringFilterInput
  condition?: StringFilterInput
  price?: DecimalFilterInput
  days_on_lot?: IntFilterInput
  and?: FactInventoryCurrentFilterInput[]
  or?: FactInventoryCurrentFilterInput[]
}

export interface FactInventoryCurrentOrderByInput {
  stock_number?: SortDirection
  price?: SortDirection
  days_on_lot?: SortDirection
  first_seen_date?: SortDirection
  last_seen_date?: SortDirection
}
