import { gql } from '@apollo/client/core'

// Get all products for lookup map (heavily cached)
export const GET_ALL_PRODUCTS = gql`
  query GetAllProducts($first: Int, $after: String) {
    dim_products(first: $first, after: $after) {
      items {
        dim_product_skey
        product_id
        manufacturer
        model
        full_model
        floorplan
        rv_type
        rv_subtype
        model_year
        manufacturer_logo_small
        division
        company
        parent_company
      }
      endCursor
      hasNextPage
    }
  }
`

// Get unique RV types for filter dropdown
export const GET_RV_TYPES = gql`
  query GetRVTypes {
    dim_products(first: 1000) {
      groupBy(fields: [rv_type]) {
        fields {
          rv_type
        }
        aggregations {
          count(field: dim_product_skey)
        }
      }
    }
  }
`

// Get unique manufacturers for filter dropdown
export const GET_MANUFACTURERS = gql`
  query GetManufacturers {
    dim_products(first: 1000) {
      groupBy(fields: [manufacturer]) {
        fields {
          manufacturer
        }
        aggregations {
          count(field: dim_product_skey)
        }
      }
    }
  }
`

// Get products by manufacturer (for model dropdown)
export const GET_PRODUCTS_BY_MANUFACTURER = gql`
  query GetProductsByManufacturer($manufacturer: String!) {
    dim_products(filter: { manufacturer: { eq: $manufacturer } }, first: 500) {
      items {
        dim_product_skey
        model
        floorplan
        rv_type
      }
    }
  }
`

// Get unique models for a manufacturer
export const GET_MODELS_BY_MANUFACTURER = gql`
  query GetModelsByManufacturer($manufacturer: String!) {
    dim_products(filter: { manufacturer: { eq: $manufacturer } }, first: 1000) {
      groupBy(fields: [model]) {
        fields {
          model
        }
        aggregations {
          count(field: dim_product_skey)
        }
      }
    }
  }
`
