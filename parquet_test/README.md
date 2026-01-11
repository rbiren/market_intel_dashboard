# Delta Lake Data Access

Direct access to Microsoft Fabric Lakehouse data - **no GraphQL required!**

## Two Cache Options

The dashboard can use either of two caching approaches:

| Approach | Startup Time | Memory | Record Limit | Location |
|----------|--------------|--------|--------------|----------|
| **Delta Lake** (recommended) | ~50 sec | ~1.1 GB | Full 187K | `api/deltalake_adapter.py` |
| **GraphQL** (legacy) | 20-25 min | ~400 MB | 100K inventory | `api/main.py` |

### Option 1: Delta Lake Cache (Recommended - Production)

Direct Delta table access via `deltalake` library, fully integrated with FastAPI:

```bash
cd api && USE_DELTALAKE=true python -m uvicorn main:app --port 8000

# Or use the Windows batch file:
cd api && start_server.bat
```

**Pros:**
- ~52 second startup (10x faster than GraphQL)
- Full 187K inventory (no limits)
- Includes sales data (562K records)
- Native pandas JOINs
- Simpler auth (`az login`)
- Multi-select filter support (comma-separated values)
- No aggregation limits (all dealer groups, manufacturers returned)
- **Pre-computed aggregations** for instant unfiltered responses (~300-400ms)

**Cons:**
- Higher memory usage (~1.1 GB vs ~400 MB)

### Option 2: GraphQL Cache (Legacy)

The legacy approach in `api/main.py`:

```bash
cd api && python -m uvicorn main:app --port 8000
```

**Pros:**
- Lower memory usage (~400 MB)
- Battle-tested

**Cons:**
- 20-25 minute startup
- Limited to 100K inventory records
- Complex credential handling
- No sales velocity data

---

## Quick Start (Delta Lake)

```bash
# 1. Install dependencies
pip install deltalake azure-identity pandas pyarrow

# 2. Login to Azure
az login

# 3. Build cache
python deltalake_cache.py
```

## Usage

### Low-Level Table Access

```python
from gold_table_reader import read_table, get_inventory_with_details

# Read any gold table
df = read_table('gold', 'fact_inventory_current')      # 187K rows
df = read_table('gold', 'dim_product_model')           # Product details
df = read_table('gold', 'dim_dealership')              # Dealer details

# Get inventory with all joins
df = get_inventory_with_details()
```

### High-Level Cache Access

```python
from deltalake_cache import build_cache, get_inventory, get_aggregations

# Build complete cache (includes sales data)
cache = build_cache()

# Access cached DataFrames
inventory = cache['inventory']     # 187K rows with joins
sales = cache['sales']             # 562K sales with joins
products = cache['products']       # 29K product models
dealers = cache['dealers']         # 12K dealers

# Get pre-computed aggregations
agg = cache['aggregations']
print(f"Total units: {agg['total_units']:,}")
print(f"Avg days to sell: {agg['avg_days_to_sell']:.1f}")

# Get filtered inventory
df = get_inventory(rv_type='FIFTH WHEEL', condition='NEW', limit=100)
```

---

## Tables Cached (as of January 2025)

| Table | Rows | Memory | Purpose |
|-------|------|--------|---------|
| fact_inventory_current | 187,600 | 263 MB | Current inventory |
| fact_inventory_sales | 562,754 | 695 MB | Sales with days_to_sell |
| dim_product_model | 29,437 | 63 MB | RV type, manufacturer |
| dim_product | 153,913 | 63 MB | Floorplan |
| dim_dealership | 12,368 | 38 MB | Dealer info |
| dim_date | 8,766 | 6 MB | Calendar |
| **Total** | **~954K** | **~1.1 GB** | |

### Tables NOT Cached (Too Large)

| Table | Rows | Why Excluded |
|-------|------|--------------|
| fact_inventory | 44.5M | Full history - would need 15-20 GB |
| fact_inventory_snapshot | 36.8M | Daily snapshots - 8-10 GB |
| fact_statistical_survey_registration | 16M | Registration data - 5-8 GB |

---

## Aggregations Included

The cache computes aggregations with **pre-computed unfiltered results** for instant responses:

**Pre-computed at startup (~2 sec):**
- Unfiltered aggregations cached in `_aggregations_cache`
- Response time for unfiltered `/inventory/aggregated`: **~300-400ms** (vs 3+ seconds previously)

**On-demand (filtered requests):**
- `total_units`, `total_value`, `avg_price`
- `by_rv_type` - count, value, avg price per RV type (9 types)
- `by_condition` - NEW vs USED breakdown
- `by_state` - all 60 states/provinces (no limit)
- `by_region` - 7 regions
- `by_dealer_group` - all 659 dealer groups (no limit)
- `by_manufacturer` - all 281 manufacturers (no limit)
- `by_city` - all 4,510 cities (no limit)
- `by_county` - all counties (no limit)
- `avg_days_to_sell` - from sales data
- `sales_velocity_by_rv_type` - sales metrics per RV type
- `sales_velocity_by_condition` - sales metrics NEW vs USED

**Multi-select filtering supported**: All aggregation endpoints support comma-separated values for dealer_group, manufacturer, and model filters.

---

## Files

| File | Purpose |
|------|---------|
| `../api/deltalake_adapter.py` | **Production adapter** - FastAPI integration with multi-select support |
| `deltalake_cache.py` | Cache builder - builds complete cache with joins |
| `gold_table_reader.py` | Low-level table reader |
| `SCHEMA.md` | Complete schema for all 13 tables |
| `list_all_parquet.py` | Utility - list all files in lakehouse |
| `read_parquet.py` | Utility - read raw parquet via REST |
| `requirements.txt` | Python dependencies |

---

## Configuration

```python
WORKSPACE_ID = '9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc'
LAKEHOUSE_ID = '06dc42ac-4151-4bb9-94fb-1a03edf49600'
```

---

## Integration with FastAPI (Implemented)

Delta Lake is fully integrated with the FastAPI backend via `api/deltalake_adapter.py`:

```bash
# Start with Delta Lake (recommended)
cd api && USE_DELTALAKE=true python -m uvicorn main:app --port 8000
```

The integration provides:
- `DeltaLakeClient` class with same interface as GraphQL client
- Automatic cache building at startup (~50 seconds)
- Multi-select filter support via `_apply_filter()` helper
- On-demand aggregations with no limits
- Sales velocity endpoints (`/inventory/sales-velocity`, `/inventory/top-floorplans`)

Key files:
- `api/deltalake_adapter.py` - Main Delta Lake client
- `parquet_test/deltalake_cache.py` - Cache builder with pandas JOINs
- `parquet_test/gold_table_reader.py` - Low-level table reader

---

## Troubleshooting

### Authentication Error
```bash
az login  # Re-authenticate with Azure
```

### Table Not Found
```python
from gold_table_reader import discover_all_tables
discover_all_tables()
```

### Memory Issues
The cache needs ~1.1 GB RAM. If you're low on memory, use GraphQL mode instead:
```bash
# GraphQL mode uses ~400 MB
cd api && python -m uvicorn main:app --port 8000
```
