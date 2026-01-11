# Delta Lake Data Access

Direct access to Microsoft Fabric Lakehouse data - **no GraphQL required!**

## Two Cache Options

The dashboard can use either of two caching approaches:

| Approach | Startup Time | Memory | Record Limit | Location |
|----------|--------------|--------|--------------|----------|
| **GraphQL** (current) | 20-25 min | ~400 MB | 100K inventory | `api/main.py` |
| **Delta Lake** (new) | 2-3 min | ~500 MB | Full 187K | `parquet_test/deltalake_cache.py` |

### Option 1: GraphQL Cache (Current Production)

The existing approach in `api/main.py`:

```bash
cd api && python -m uvicorn main:app --port 8000
```

**Pros:**
- Battle-tested, production-ready
- Already integrated with frontend

**Cons:**
- 20-25 minute startup
- Limited to 100K inventory records
- Complex credential handling

### Option 2: Delta Lake Cache (New Alternative)

Direct Delta table access via `deltalake` library:

```bash
cd parquet_test
python deltalake_cache.py        # Build cache and show stats
python deltalake_cache.py test   # Quick connection test
```

**Pros:**
- ~10x faster startup (2-3 min)
- Full 187K inventory (no limits)
- Includes sales data (562K records)
- Native pandas JOINs
- Simpler auth (`az login`)

**Cons:**
- Not yet integrated with FastAPI
- New code, less tested

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

## Tables Cached

| Table | Rows | Memory | Purpose |
|-------|------|--------|---------|
| fact_inventory_current | 187,241 | 121 MB | Current inventory |
| fact_inventory_sales | 562,213 | 200 MB | Sales with days_to_sell |
| dim_product_model | 29,433 | 63 MB | RV type, manufacturer |
| dim_product | 153,913 | 63 MB | Floorplan |
| dim_dealership | 12,368 | 38 MB | Dealer info |
| dim_date | 8,766 | 6 MB | Calendar |
| **Total** | **~950K** | **~500 MB** | |

### Tables NOT Cached (Too Large)

| Table | Rows | Why Excluded |
|-------|------|--------------|
| fact_inventory | 44.5M | Full history - would need 15-20 GB |
| fact_inventory_snapshot | 36.8M | Daily snapshots - 8-10 GB |
| fact_statistical_survey_registration | 16M | Registration data - 5-8 GB |

---

## Aggregations Included

The cache pre-computes these aggregations:

- `total_units`, `total_value`, `avg_price`
- `by_rv_type` - count, value, avg price per RV type
- `by_condition` - NEW vs USED breakdown
- `by_state` - all 65 states/provinces
- `by_region` - 7 regions
- `by_dealer_group` - top 20 dealer groups
- `by_manufacturer` - top 20 manufacturers
- `by_city` - top 50 cities
- `avg_days_to_sell` - from sales data
- `sales_velocity_by_rv_type` - sales metrics per RV type
- `sales_velocity_by_condition` - sales metrics NEW vs USED

---

## Files

| File | Purpose |
|------|---------|
| `deltalake_cache.py` | **Main cache builder** - builds complete cache with joins |
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

## Integration with FastAPI

To use Delta Lake cache in the API (future):

```python
# In api/main.py, add alternative startup

import sys
sys.path.insert(0, '../parquet_test')
from deltalake_cache import build_cache, get_inventory, get_aggregations

# At startup
USE_DELTALAKE = os.getenv('USE_DELTALAKE', 'false').lower() == 'true'

if USE_DELTALAKE:
    print("Using Delta Lake cache...")
    _deltalake_cache = build_cache()
else:
    print("Using GraphQL cache...")
    # existing load_cache() code
```

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
The cache needs ~500 MB RAM. If you're low on memory, you can exclude sales:
```python
# Modify CACHE_TABLES in deltalake_cache.py to exclude fact_inventory_sales
```
