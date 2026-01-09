import { gql } from '@apollo/client/core'

// Get all dealerships for lookup map (heavily cached)
export const GET_ALL_DEALERSHIPS = gql`
  query GetAllDealerships($first: Int, $after: String) {
    dim_dealerships(first: $first, after: $after) {
      items {
        dim_dealership_skey
        dealership_id
        dealer_group
        dealership
        city
        state
        region
        bta
        country
        dealer_group_logo_small
      }
      endCursor
      hasNextPage
    }
  }
`

// Get unique regions for filter dropdown
export const GET_REGIONS = gql`
  query GetRegions {
    dim_dealerships(first: 1000) {
      groupBy(fields: [region]) {
        fields {
          region
        }
        aggregations {
          count(field: dim_dealership_skey)
        }
      }
    }
  }
`

// Get dealerships by region for filtering inventory
export const GET_DEALERSHIPS_BY_REGION = gql`
  query GetDealershipsByRegion($region: String!) {
    dim_dealerships(filter: { region: { eq: $region } }, first: 500) {
      items {
        dim_dealership_skey
        dealership
        dealer_group
        city
        state
      }
    }
  }
`

// Get unique states for filter dropdown
export const GET_STATES = gql`
  query GetStates {
    dim_dealerships(first: 1000) {
      groupBy(fields: [state]) {
        fields {
          state
        }
        aggregations {
          count(field: dim_dealership_skey)
        }
      }
    }
  }
`
