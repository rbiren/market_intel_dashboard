// GraphQL response types for dealership data

export interface DimDealership {
  dim_dealership_skey: number | null
  dealership_id: number | null
  dealer_group: string | null
  dealership: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  county: string | null
  bta: string | null
  region: string | null
  dealer_group_logo_small: string | null
  country: string | null
}

// Connection type for pagination
export interface DimDealershipConnection {
  items: DimDealership[]
  endCursor: string | null
  hasNextPage: boolean
}

// Lookup map for efficient client-side joins
export type DealershipLookup = Map<number, DimDealership>

// GroupBy result for filter options
export interface DealershipGroupByResult {
  fields: {
    region?: string | null
    state?: string | null
    dealer_group?: string | null
  }
  aggregations: {
    count: number
  }
}

// Query response types
export interface GetAllDealershipsResponse {
  dim_dealerships: DimDealershipConnection
}

export interface GetRegionsResponse {
  dim_dealerships: {
    groupBy: DealershipGroupByResult[]
  }
}
