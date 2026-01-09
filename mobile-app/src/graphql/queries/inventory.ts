import { gql } from '@apollo/client/core'

// Main query for current inventory with pagination, filtering, and sorting
export const GET_INVENTORY_CURRENT = gql`
  query GetInventoryCurrent(
    $first: Int
    $after: String
    $filter: fact_inventory_currentFilterInput
    $orderBy: fact_inventory_currentOrderByInput
  ) {
    fact_inventory_currents(
      first: $first
      after: $after
      filter: $filter
      orderBy: $orderBy
    ) {
      items {
        stock_number
        dim_dealership_skey
        dim_product_skey
        first_seen_date
        last_seen_date
        days_on_lot
        days_in_pending
        price
        median_price
        overpriced_unit
        current_stock
        condition
        amount_over_median
        percent_over_median
      }
      endCursor
      hasNextPage
    }
  }
`

// Query for full inventory details (when user taps on an item)
export const GET_INVENTORY_DETAIL = gql`
  query GetInventoryDetail($stockNumber: String!) {
    fact_inventories(filter: { stock_number: { eq: $stockNumber } }, first: 1) {
      items {
        stock_number
        vin
        web_title
        listing_url
        image_url
        tags
        condition
        inventory_status
        inventory_on_lot
        age
        cost
        discount
        msrp
        sale_or_regular_price
        sale_price
        price
        dim_dealership_skey
        dim_product_skey
        median_price
        overpriced_unit
        amount_over_median
        percent_over_median
      }
    }
  }
`

// Query for inventory count/aggregations (for dashboard/summary)
export const GET_INVENTORY_SUMMARY = gql`
  query GetInventorySummary($filter: fact_inventory_currentFilterInput) {
    fact_inventory_currents(filter: $filter, first: 1) {
      groupBy(fields: [condition]) {
        fields {
          condition
        }
        aggregations {
          count(field: current_stock)
          avg(field: price)
          avg(field: days_on_lot)
        }
      }
    }
  }
`
