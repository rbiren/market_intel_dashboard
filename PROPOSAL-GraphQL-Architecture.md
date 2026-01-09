# Proposal: Optimizing Fabric GraphQL Data Architecture

**Date:** January 2025
**Status:** Draft
**Author:** Claude (AI Assistant)

---

## Executive Summary

The current RV Market Intelligence Dashboard faces data consistency issues where **pie charts show 35K units** for FIFTH WHEEL but **filtered views show only 19K units**. This discrepancy stems from architectural constraints in how we fetch and aggregate data from Microsoft Fabric's GraphQL API.

This proposal outlines the root causes, evaluates Fabric GraphQL capabilities, and recommends solutions ranging from quick fixes to optimal long-term approaches.

---

## Current Problems

### 1. The 100K Record Limit
- Fabric GraphQL has a **hard limit of 100,000 records per request**
- Our inventory has **185,160 total units**
- We can only cache ~54% of inventory (100K/185K)

### 2. Data Source Mismatch
| Data Display | Source | Records Covered |
|--------------|--------|-----------------|
| Pie chart totals | Native `groupBy` aggregation | **185K** (full dataset) |
| Filtered views | Python filtering on cached inventory | **100K** (partial) |

This causes the confusing UX where clicking a segment shows fewer units than displayed.

### 3. Slow Startup (15-25 minutes)
Current approach runs multiple `groupBy` queries at startup to build caches:
- Condition filters (NEW/USED): ~5 min
- RV type filters (8 types): ~8 min additional
- Each filter requires 3 GraphQL calls (condition, product, dealer groupBy)

---

## Fabric GraphQL Capabilities

### What It CAN Do

| Feature | Description | Our Use Case |
|---------|-------------|--------------|
| **`groupBy` Aggregations** | `count`, `sum`, `avg`, `min`, `max` on full dataset | Get accurate totals for 185K records |
| **Cursor Pagination** | `after` token with `hasNextPage` for iteration | Could fetch all 185K in batches |
| **Filtered Aggregations** | `groupBy` with `filter` clause | Get aggregations for specific conditions |
| **Relationships** | Configure JOINs in Fabric portal | Eliminate need for manual dimension lookups |
| **Materialized Views** | Pre-computed Delta tables in Lakehouse | Store pre-aggregated data for instant access |

### Hard Limits (Cannot Change)

| Limit | Value | Impact |
|-------|-------|--------|
| Max records per request | **100,000** | Cannot fetch all 185K in one call |
| Max response size | **64 MB** | Large result sets may fail |
| Request timeout | **100 seconds** | Complex queries may timeout |
| Max query depth | **10 levels** | Limits nested relationship traversal |
| `IN` operator | **100 values** | Must batch dimension lookups |

**Sources:** [Microsoft Fabric GraphQL Limits](https://learn.microsoft.com/en-us/fabric/data-engineering/api-graphql-limits)

---

## Solution Options

### Option 1: Use `groupBy` for Everything (Quick Fix)

**Approach:** Always use native `groupBy` aggregations, never filter on cached inventory.

**How it works:**
```graphql
# Instead of filtering 100K cached records, query the full dataset:
fact_inventory_currents(first: 100, filter: { rv_type: { eq: "FIFTH WHEEL" } }) {
  groupBy(fields: [condition]) {
    fields { condition }
    aggregations {
      count(field: price)
      sum(field: price)
    }
  }
}
```

**Pros:**
- Numbers always consistent (both use 185K dataset)
- No code changes to frontend
- Quick to implement

**Cons:**
- Each filter click = 3+ API calls (condition, product, dealer groupBy)
- ~2-3 second latency per filter change
- Still hitting API on every interaction

**Effort:** Low (1-2 days)

---

### Option 2: Configure Relationships in Fabric Portal (Medium)

**Approach:** Set up relationships between `fact_inventory_current`, `dim_product`, and `dim_dealership` in Fabric portal.

**Current Problem:**
```python
# We do this in Python because GraphQL doesn't know about relationships:
products_for_inventory = fetch_dimension_data_for_skeys(...)
for item in inventory:
    item['rv_type'] = products_for_inventory[item['product_skey']]['rv_type']
```

**With Relationships Configured:**
```graphql
# GraphQL can traverse relationships automatically:
fact_inventory_currents(first: 1000, filter: { rv_type: { eq: "FIFTH WHEEL" } }) {
  items {
    price
    condition
    dim_product {
      rv_type
      manufacturer
    }
    dim_dealership {
      dealer_group
      state
    }
  }
}
```

**Pros:**
- Eliminates batch dimension lookups
- Simpler queries
- Better performance (single query vs multiple)

**Cons:**
- Requires Fabric portal configuration
- Still limited to 100K per request
- May not solve aggregation discrepancy

**Effort:** Medium (3-5 days, includes testing)

**Reference:** [Fabric GraphQL Relationships](https://www.mssqltips.com/sqlservertip/8112/microsoft-fabric-graphql-api-relationships/)

---

### Option 3: Materialized Views (Recommended)

**Approach:** Create pre-aggregated views in the Lakehouse that GraphQL can query instantly.

**Implementation:**

1. **Create aggregation views in Lakehouse using Spark SQL:**

```sql
-- View: inventory_by_rv_type_condition
CREATE MATERIALIZED VIEW gold.inventory_aggregations AS
SELECT
  rv_type,
  condition,
  dealer_group,
  state,
  manufacturer,
  COUNT(*) as unit_count,
  SUM(price) as total_value,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM gold.fact_inventory_current f
JOIN gold.dim_product p ON f.dim_product_skey = p.dim_product_skey
JOIN gold.dim_dealership d ON f.dim_dealership_skey = d.dim_dealership_skey
GROUP BY rv_type, condition, dealer_group, state, manufacturer
```

2. **Expose view via GraphQL API**

3. **Query pre-aggregated data:**
```graphql
inventory_aggregations(filter: { rv_type: { eq: "FIFTH WHEEL" } }) {
  items {
    condition
    unit_count
    total_value
    avg_price
  }
}
```

**Pros:**
- **Instant responses** - data already aggregated
- **No 100K limit issue** - aggregated data is small (hundreds of rows, not 185K)
- **Consistent numbers** - single source of truth
- **No Python-side caching** - eliminates 15-25 min startup
- **Automatic refresh** - Fabric handles dependency tracking

**Cons:**
- Requires Lakehouse schema changes
- Need to set up refresh schedule
- Different query patterns in frontend

**Effort:** Medium-High (1-2 weeks)

**Reference:** [Materialized Views in Fabric Lakehouse](https://blog.fabric.microsoft.com/en-us/blog/exposing-lakehouse-materialized-views-to-applications-in-minutes-with-graphql-apis-in-microsoft-fabric/)

---

### Option 4: Hybrid Cursor Pagination (Complex)

**Approach:** Use cursor-based pagination to fetch ALL 185K records into cache.

**How it works:**
```graphql
# First request
fact_inventory_currents(first: 100000, orderBy: { id: ASC }) {
  items { ... }
  pageInfo {
    hasNextPage
    endCursor
  }
}

# Subsequent requests
fact_inventory_currents(first: 100000, after: "cursor_token", orderBy: { id: ASC }) {
  items { ... }
  pageInfo {
    hasNextPage
    endCursor
  }
}
```

**Pros:**
- Can cache full 185K dataset
- Client-side filtering on complete data
- Consistent numbers everywhere

**Cons:**
- 2+ API calls at startup (100K + 85K)
- Longer startup time
- More memory usage
- Still need to handle dimension joins

**Effort:** Medium (3-5 days)

---

## Comparison Matrix

| Criteria | Option 1: groupBy | Option 2: Relationships | Option 3: Mat. Views | Option 4: Pagination |
|----------|-------------------|------------------------|---------------------|---------------------|
| **Consistency** | Yes | Partial | Yes | Yes |
| **Response Time** | 2-3s per filter | 1-2s per filter | <100ms | N/A (cached) |
| **Startup Time** | 15-25 min | 15-25 min | <1 min | 20-30 min |
| **API Calls** | Many | Fewer | Minimal | 2 at startup |
| **Complexity** | Low | Medium | Medium-High | Medium |
| **Long-term Scalability** | Poor | Good | Excellent | Fair |

---

## Recommendation

### Short-term (This Week)
**Option 1: Use `groupBy` for filtered queries**
- Modify `AnalyticsTab.tsx` to call real-time `groupBy` queries instead of using pre-cached filtered aggregations
- Accept 2-3s latency per filter change
- Numbers will be consistent

### Medium-term (Next Month)
**Option 2: Configure Relationships in Fabric Portal**
- Set up proper relationships in the Fabric workspace
- Simplify GraphQL queries
- Reduce API call count

### Long-term (Q2 2025)
**Option 3: Implement Materialized Views**
- Create aggregation views in Lakehouse
- Expose via GraphQL
- Achieve instant responses with consistent data
- Eliminate Python caching entirely

---

## Implementation Plan

### Phase 1: Immediate Fix (2-3 days)
1. Modify `/inventory/aggregated` endpoint to use real-time `groupBy` when filters are applied
2. Remove reliance on `_filtered_aggregations_cache` for RV type filters
3. Accept slightly higher latency for filter operations

### Phase 2: Relationship Configuration (1 week)
1. Access Fabric portal and configure relationships:
   - `fact_inventory_current.dim_product_skey` → `dim_product.dim_product_skey`
   - `fact_inventory_current.dim_dealership_skey` → `dim_dealership.dim_dealership_skey`
2. Update GraphQL queries to use traversal
3. Remove batch dimension lookup code

### Phase 3: Materialized Views (2-3 weeks)
1. Design aggregation schema
2. Create materialized views in Lakehouse
3. Set up refresh schedule (hourly/daily)
4. Expose views via GraphQL
5. Update frontend to query new endpoints
6. Remove Python caching layer entirely

---

## Appendix: Useful Resources

### Official Documentation
- [Fabric GraphQL Limits](https://learn.microsoft.com/en-us/fabric/data-engineering/api-graphql-limits)
- [Fabric GraphQL Aggregations](https://learn.microsoft.com/en-us/fabric/data-engineering/api-graphql-aggregations)
- [Fabric GraphQL Performance Best Practices](https://learn.microsoft.com/en-us/fabric/data-engineering/api-graphql-performance)

### Blog Posts & Guides
- [Introducing Aggregations in Fabric GraphQL](https://blog.fabric.microsoft.com/en-US/blog/introducing-aggregations-in-fabric-api-for-graphql-query-smarter-not-harder/)
- [Materialized Views with GraphQL](https://blog.fabric.microsoft.com/en-us/blog/exposing-lakehouse-materialized-views-to-applications-in-minutes-with-graphql-apis-in-microsoft-fabric/)
- [GraphQL in Microsoft Fabric - Data Meerkat](https://datameerkat.com/graphql-in-microsoft-fabric)

### Sample Code
- [GraphQL Performance Test Notebook](https://github.com/microsoft/fabric-samples/blob/main/docs-samples/data-engineering/GraphQL/benchmarking/graphql_performance_test_notebook.ipynb)

---

## Questions for Discussion

1. **Data freshness requirements:** How often does inventory data change? (affects materialized view refresh strategy)
2. **Fabric portal access:** Do we have admin access to configure relationships?
3. **Lakehouse schema changes:** Can we add materialized views to the gold layer?
4. **Acceptable latency:** Is 2-3s per filter click acceptable short-term?

---

## Implementation Guide: Materialized Views (Option 3)

This section provides step-by-step instructions for implementing the recommended Materialized Views solution.

### Where Each Step Happens

| Step | Location | Tool |
|------|----------|------|
| 1. Create the aggregation view | **Lakehouse** | Spark Notebook or SQL Endpoint |
| 2. Expose view to GraphQL | **GraphQL API** | Fabric Portal |
| 3. Query from app | **Python API** | GraphQL calls |
| 4. Update frontend | **React App** | Use new endpoint |

---

### Step 1: Create View in Lakehouse

Open a **Spark Notebook** in your Fabric workspace and run:

```sql
%%sql
-- Main aggregation view for dashboard analytics
CREATE OR REPLACE VIEW gold.inventory_aggregations AS
SELECT
  p.rv_type,
  f.condition,
  d.dealer_group,
  d.state,
  p.manufacturer,
  COUNT(*) as unit_count,
  SUM(f.price) as total_value,
  AVG(f.price) as avg_price,
  MIN(f.price) as min_price,
  MAX(f.price) as max_price,
  AVG(f.days_on_lot) as avg_days_on_lot
FROM gold.fact_inventory_current f
JOIN gold.dim_product p ON f.dim_product_skey = p.dim_product_skey
JOIN gold.dim_dealership d ON f.dim_dealership_skey = d.dim_dealership_skey
GROUP BY p.rv_type, f.condition, d.dealer_group, d.state, p.manufacturer
```

**Expected result:** ~2,000-5,000 rows (vs 185K in fact table)

#### Optional: Additional Aggregation Views

```sql
%%sql
-- Summary by RV Type only (for pie charts)
CREATE OR REPLACE VIEW gold.inventory_by_rv_type AS
SELECT
  p.rv_type,
  COUNT(*) as unit_count,
  SUM(f.price) as total_value,
  AVG(f.price) as avg_price
FROM gold.fact_inventory_current f
JOIN gold.dim_product p ON f.dim_product_skey = p.dim_product_skey
GROUP BY p.rv_type;

-- Summary by State (for geographic charts)
CREATE OR REPLACE VIEW gold.inventory_by_state AS
SELECT
  d.state,
  COUNT(*) as unit_count,
  SUM(f.price) as total_value,
  AVG(f.price) as avg_price
FROM gold.fact_inventory_current f
JOIN gold.dim_dealership d ON f.dim_dealership_skey = d.dim_dealership_skey
GROUP BY d.state;

-- Summary by Condition (for NEW vs USED comparison)
CREATE OR REPLACE VIEW gold.inventory_by_condition AS
SELECT
  f.condition,
  COUNT(*) as unit_count,
  SUM(f.price) as total_value,
  AVG(f.price) as avg_price
FROM gold.fact_inventory_current f
GROUP BY f.condition;

-- Summary by Dealer Group (for top dealers chart)
CREATE OR REPLACE VIEW gold.inventory_by_dealer_group AS
SELECT
  d.dealer_group,
  d.state,
  COUNT(*) as unit_count,
  SUM(f.price) as total_value,
  AVG(f.price) as avg_price
FROM gold.fact_inventory_current f
JOIN gold.dim_dealership d ON f.dim_dealership_skey = d.dim_dealership_skey
GROUP BY d.dealer_group, d.state;

-- Summary by Manufacturer (for top manufacturers chart)
CREATE OR REPLACE VIEW gold.inventory_by_manufacturer AS
SELECT
  p.manufacturer,
  p.rv_type,
  COUNT(*) as unit_count,
  SUM(f.price) as total_value,
  AVG(f.price) as avg_price
FROM gold.fact_inventory_current f
JOIN gold.dim_product p ON f.dim_product_skey = p.dim_product_skey
GROUP BY p.manufacturer, p.rv_type;
```

---

### Step 2: Expose Views to GraphQL API

1. Navigate to your **GraphQL API** in Fabric Portal
   - Workspace: `9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc`
   - GraphQL API: `5c282d47-9d39-475c-ba43-5145fdc021b8`

2. Click **"Get data"** or the **"+"** button to add data sources

3. Select your Lakehouse and choose the new views:
   - `gold.inventory_aggregations`
   - `gold.inventory_by_rv_type`
   - `gold.inventory_by_state`
   - `gold.inventory_by_condition`
   - `gold.inventory_by_dealer_group`
   - `gold.inventory_by_manufacturer`

4. GraphQL will auto-generate the schema for each view

---

### Step 3: Test GraphQL Queries

Once exposed, test in the GraphQL editor:

```graphql
# Get all RV type totals (for pie chart)
{
  inventory_by_rv_types {
    items {
      rv_type
      unit_count
      total_value
      avg_price
    }
  }
}

# Get filtered aggregations (e.g., FIFTH WHEEL breakdown)
{
  inventory_aggregations(filter: { rv_type: { eq: "FIFTH WHEEL" } }) {
    items {
      condition
      state
      manufacturer
      unit_count
      total_value
      avg_price
    }
  }
}

# Get condition totals
{
  inventory_by_conditions {
    items {
      condition
      unit_count
      total_value
    }
  }
}
```

---

### Step 4: Update Python API

Add new endpoint to `api/main.py`:

```python
@app.get("/inventory/aggregations")
async def get_inventory_aggregations(
    rv_type: Optional[str] = None,
    condition: Optional[str] = None,
    state: Optional[str] = None,
    dealer_group: Optional[str] = None,
    manufacturer: Optional[str] = None
):
    """Get pre-aggregated inventory data from materialized view."""

    # Build filter
    filters = []
    if rv_type:
        filters.append(f'rv_type: {{ eq: "{rv_type}" }}')
    if condition:
        filters.append(f'condition: {{ eq: "{condition}" }}')
    if state:
        filters.append(f'state: {{ eq: "{state}" }}')
    if dealer_group:
        filters.append(f'dealer_group: {{ eq: "{dealer_group}" }}')
    if manufacturer:
        filters.append(f'manufacturer: {{ eq: "{manufacturer}" }}')

    filter_str = ""
    if filters:
        filter_str = f"filter: {{ {', '.join(filters)} }}"

    query = f"""
    {{
        inventory_aggregations({filter_str}) {{
            items {{
                rv_type
                condition
                dealer_group
                state
                manufacturer
                unit_count
                total_value
                avg_price
                min_price
                max_price
                avg_days_on_lot
            }}
        }}
    }}
    """

    result = client.execute_query(query)
    items = result.get("inventory_aggregations", {}).get("items", [])

    # Aggregate results for response
    total_units = sum(item["unit_count"] for item in items)
    total_value = sum(item["total_value"] for item in items)

    return {
        "total_units": total_units,
        "total_value": total_value,
        "avg_price": total_value / total_units if total_units > 0 else 0,
        "by_rv_type": aggregate_by_field(items, "rv_type"),
        "by_condition": aggregate_by_field(items, "condition"),
        "by_state": aggregate_by_field(items, "state"),
        "by_dealer_group": aggregate_by_field(items, "dealer_group"),
        "by_manufacturer": aggregate_by_field(items, "manufacturer"),
    }
```

---

### Step 5: Update Frontend

Modify `AnalyticsTab.tsx` to use the new endpoint:

```typescript
// Before: Using cached data with inconsistent counts
const { data } = useAggregatedData(filters);

// After: Using materialized view endpoint
const fetchAggregations = async (filters) => {
  const params = new URLSearchParams();
  if (filters.rv_type) params.append('rv_type', filters.rv_type);
  if (filters.condition) params.append('condition', filters.condition);
  // ... other filters

  const response = await fetch(`/inventory/aggregations?${params}`);
  return response.json();
};
```

---

### Benefits After Implementation

| Metric | Before (Cached) | After (Materialized Views) |
|--------|-----------------|---------------------------|
| Startup time | 15-25 minutes | **< 1 minute** |
| Filter response | Inconsistent numbers | **Consistent (single source)** |
| API latency | 2-3s (groupBy) | **< 100ms** |
| Data freshness | Stale until restart | **Auto-refreshed** |
| Memory usage | High (100K+ items in RAM) | **Low (no caching needed)** |

---

### Refresh Strategy

Views automatically reflect current data when queried. For true materialized views with scheduled refresh:

```sql
%%sql
-- Create as Delta table for better performance
CREATE OR REPLACE TABLE gold.inventory_aggregations_mat
USING DELTA
AS
SELECT
  p.rv_type,
  f.condition,
  d.dealer_group,
  d.state,
  p.manufacturer,
  COUNT(*) as unit_count,
  SUM(f.price) as total_value,
  AVG(f.price) as avg_price,
  MIN(f.price) as min_price,
  MAX(f.price) as max_price,
  AVG(f.days_on_lot) as avg_days_on_lot,
  current_timestamp() as last_updated
FROM gold.fact_inventory_current f
JOIN gold.dim_product p ON f.dim_product_skey = p.dim_product_skey
JOIN gold.dim_dealership d ON f.dim_dealership_skey = d.dim_dealership_skey
GROUP BY p.rv_type, f.condition, d.dealer_group, d.state, p.manufacturer;
```

Then schedule a Data Pipeline or Notebook to refresh this table hourly/daily.
