// GraphQL response types for product data

export interface DimProduct {
  dim_product_skey: number | null
  product_id: number | null
  parent_company: string | null
  division: string | null
  company: string | null
  manufacturer: string | null
  model_year: string | null
  full_model: string | null
  model: string | null
  floorplan: string | null
  rv_type: string | null
  rv_subtype: string | null
  manufacturer_model: string | null
  manufacturer_full_model: string | null
  model_floorplan: string | null
  full_model_floorplan: string | null
  manufacturer_logo_small: string | null
  manufacturer_floorplan: string | null
  manufacturer_full_model_floorplan: string | null
}

// Connection type for pagination
export interface DimProductConnection {
  items: DimProduct[]
  endCursor: string | null
  hasNextPage: boolean
}

// Lookup map for efficient client-side joins
export type ProductLookup = Map<number, DimProduct>

// GroupBy result for filter options
export interface ProductGroupByResult {
  fields: {
    rv_type?: string | null
    manufacturer?: string | null
    model?: string | null
  }
  aggregations: {
    count: number
  }
}

// Query response types
export interface GetAllProductsResponse {
  dim_products: DimProductConnection
}

export interface GetRvTypesResponse {
  dim_products: {
    groupBy: ProductGroupByResult[]
  }
}

export interface GetManufacturersResponse {
  dim_products: {
    groupBy: ProductGroupByResult[]
  }
}
