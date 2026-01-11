"""
Delta Lake Cache Builder
========================

Alternative to GraphQL-based caching. Reads Delta tables directly from Fabric Lakehouse.

Benefits over GraphQL:
- ~2-3 min startup vs 20-25 min
- No 100K record limit (full 187K inventory)
- Native pandas JOINs
- Simpler auth (just `az login`)

Usage:
    from deltalake_cache import build_cache, get_cache

    # Build cache at startup
    cache = build_cache()

    # Access cached data
    inventory = cache['inventory']          # Full inventory with joins
    products = cache['products']            # dim_product_model
    dealers = cache['dealers']              # dim_dealership
    sales = cache['sales']                  # fact_inventory_sales with joins
    aggregations = cache['aggregations']    # Pre-computed aggregations

Prerequisites:
    pip install deltalake azure-identity pandas
    az login
"""

import pandas as pd
from deltalake import DeltaTable
from azure.identity import DefaultAzureCredential
from typing import Optional, Dict, Any
import time

# =============================================================================
# CONFIGURATION
# =============================================================================

WORKSPACE_ID = '9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc'
LAKEHOUSE_ID = '06dc42ac-4151-4bb9-94fb-1a03edf49600'

# Tables to cache
CACHE_TABLES = {
    'fact_inventory_current': 'inventory_raw',
    'fact_inventory_sales': 'sales_raw',
    'dim_product_model': 'products',
    'dim_product': 'floorplans',
    'dim_dealership': 'dealers',
    'dim_date': 'dates',
}


# =============================================================================
# AUTHENTICATION
# =============================================================================

_token_cache = None

def get_token() -> str:
    """Get Azure token (cached)."""
    global _token_cache
    if _token_cache is None:
        credential = DefaultAzureCredential()
        _token_cache = credential.get_token("https://storage.azure.com/.default").token
    return _token_cache


def get_storage_options() -> dict:
    """Get storage options for deltalake."""
    return {
        "bearer_token": get_token(),
        "use_fabric_endpoint": "true",
    }


# =============================================================================
# TABLE ACCESS
# =============================================================================

def get_table_uri(table: str) -> str:
    """Build the abfss URI for a Delta table."""
    return f"abfss://{WORKSPACE_ID}@onelake.dfs.fabric.microsoft.com/{LAKEHOUSE_ID}/Tables/gold/{table}"


def read_table(table: str) -> Optional[pd.DataFrame]:
    """Read a Delta table into pandas DataFrame."""
    uri = get_table_uri(table)
    try:
        dt = DeltaTable(uri, storage_options=get_storage_options())
        return dt.to_pandas()
    except Exception as e:
        print(f"Error reading {table}: {e}")
        return None


# =============================================================================
# CACHE BUILDER
# =============================================================================

def build_cache(verbose: bool = True) -> Dict[str, Any]:
    """
    Build the complete cache from Delta tables.

    Returns dict with:
        - inventory: Full inventory with product/dealer joins (187K rows)
        - sales: Sales data with product/dealer joins (562K rows)
        - products: Product model dimension (29K rows)
        - floorplans: Product/floorplan dimension (154K rows)
        - dealers: Dealer dimension (12K rows)
        - dates: Date dimension (9K rows)
        - aggregations: Pre-computed aggregations for charts

    Estimated time: ~2-3 minutes
    Estimated memory: ~500-600 MB
    """
    start_time = time.time()
    cache = {}

    def log(msg):
        if verbose:
            elapsed = time.time() - start_time
            print(f"[{elapsed:6.1f}s] {msg}")

    log("Starting Delta Lake cache build...")

    # -------------------------------------------------------------------------
    # Step 1: Load dimension tables
    # -------------------------------------------------------------------------
    log("Loading dimension tables...")

    log("  - dim_product_model...")
    cache['products'] = read_table('dim_product_model')
    if cache['products'] is not None:
        log(f"    Loaded {len(cache['products']):,} product models")

    log("  - dim_product (floorplans)...")
    cache['floorplans'] = read_table('dim_product')
    if cache['floorplans'] is not None:
        log(f"    Loaded {len(cache['floorplans']):,} floorplans")

    log("  - dim_dealership...")
    cache['dealers'] = read_table('dim_dealership')
    if cache['dealers'] is not None:
        log(f"    Loaded {len(cache['dealers']):,} dealers")

    log("  - dim_date...")
    cache['dates'] = read_table('dim_date')
    if cache['dates'] is not None:
        log(f"    Loaded {len(cache['dates']):,} dates")

    # -------------------------------------------------------------------------
    # Step 2: Load fact tables
    # -------------------------------------------------------------------------
    log("Loading fact tables...")

    log("  - fact_inventory_current...")
    inventory_raw = read_table('fact_inventory_current')
    if inventory_raw is not None:
        log(f"    Loaded {len(inventory_raw):,} inventory items")

    log("  - fact_inventory_sales...")
    sales_raw = read_table('fact_inventory_sales')
    if sales_raw is not None:
        log(f"    Loaded {len(sales_raw):,} sales records")

    # -------------------------------------------------------------------------
    # Step 3: Join inventory with dimensions
    # -------------------------------------------------------------------------
    log("Joining inventory with dimensions...")

    if inventory_raw is not None and cache['products'] is not None:
        # Join product model info (rv_type, manufacturer, model)
        inventory = inventory_raw.merge(
            cache['products'][['dim_product_model_skey', 'rv_type', 'manufacturer', 'model',
                               'parent_company', 'company', 'model_year']],
            on='dim_product_model_skey',
            how='left'
        )
        log(f"  - Joined product models")

        # Join floorplan info
        if cache['floorplans'] is not None:
            inventory = inventory.merge(
                cache['floorplans'][['dim_product_skey', 'floorplan']],
                on='dim_product_skey',
                how='left'
            )
            log(f"  - Joined floorplans")

        # Join dealer info
        if cache['dealers'] is not None:
            inventory = inventory.merge(
                cache['dealers'][['dim_dealership_skey', 'dealer_group', 'dealership',
                                  'state', 'region', 'city', 'county']],
                on='dim_dealership_skey',
                how='left'
            )
            log(f"  - Joined dealers")

        cache['inventory'] = inventory
        log(f"  Final inventory: {len(inventory):,} rows, {len(inventory.columns)} columns")

    # -------------------------------------------------------------------------
    # Step 4: Join sales with dimensions
    # -------------------------------------------------------------------------
    log("Joining sales with dimensions...")

    if sales_raw is not None and cache['products'] is not None:
        # Join product model info
        sales = sales_raw.merge(
            cache['products'][['dim_product_model_skey', 'rv_type', 'manufacturer', 'model',
                               'parent_company', 'company', 'model_year']],
            on='dim_product_model_skey',
            how='left'
        )
        log(f"  - Joined product models")

        # Join floorplan info
        if cache['floorplans'] is not None:
            sales = sales.merge(
                cache['floorplans'][['dim_product_skey', 'floorplan']],
                on='dim_product_skey',
                how='left'
            )
            log(f"  - Joined floorplans")

        # Join dealer info
        if cache['dealers'] is not None:
            sales = sales.merge(
                cache['dealers'][['dim_dealership_skey', 'dealer_group', 'dealership',
                                  'state', 'region', 'city', 'county']],
                on='dim_dealership_skey',
                how='left'
            )
            log(f"  - Joined dealers")

        # Join date info for sold_date
        if cache['dates'] is not None:
            sales = sales.merge(
                cache['dates'][['dim_date_skey', 'calendar_date', 'month_year', 'quarter_year']],
                left_on='sold_date_skey',
                right_on='dim_date_skey',
                how='left'
            )
            log(f"  - Joined dates")

        cache['sales'] = sales
        log(f"  Final sales: {len(sales):,} rows, {len(sales.columns)} columns")

    # -------------------------------------------------------------------------
    # Step 5: Build aggregations
    # -------------------------------------------------------------------------
    log("Building aggregations...")
    cache['aggregations'] = build_aggregations(cache)

    # -------------------------------------------------------------------------
    # Done
    # -------------------------------------------------------------------------
    elapsed = time.time() - start_time

    # Calculate memory usage
    total_memory = 0
    for key, df in cache.items():
        if isinstance(df, pd.DataFrame):
            mem = df.memory_usage(deep=True).sum() / (1024*1024)
            total_memory += mem
            if verbose:
                log(f"  {key}: {mem:.1f} MB")

    log(f"Cache build complete!")
    log(f"  Total time: {elapsed:.1f} seconds")
    log(f"  Total memory: {total_memory:.1f} MB")

    return cache


def build_aggregations(cache: Dict[str, Any]) -> Dict[str, Any]:
    """Build pre-computed aggregations for dashboard charts."""
    agg = {}

    inventory = cache.get('inventory')
    if inventory is None:
        return agg

    # Total counts
    agg['total_units'] = len(inventory)
    agg['total_value'] = float(inventory['price'].sum()) if 'price' in inventory.columns else 0
    agg['avg_price'] = float(inventory['price'].mean()) if 'price' in inventory.columns else 0

    # By RV Type
    if 'rv_type' in inventory.columns:
        by_rv_type = inventory.groupby('rv_type').agg({
            'stock_number': 'count',
            'price': ['sum', 'mean']
        }).reset_index()
        by_rv_type.columns = ['rv_type', 'count', 'total_value', 'avg_price']
        agg['by_rv_type'] = by_rv_type.to_dict('records')

    # By Condition
    if 'condition' in inventory.columns:
        by_condition = inventory.groupby('condition').agg({
            'stock_number': 'count',
            'price': ['sum', 'mean']
        }).reset_index()
        by_condition.columns = ['condition', 'count', 'total_value', 'avg_price']
        agg['by_condition'] = by_condition.to_dict('records')

    # By State
    if 'state' in inventory.columns:
        by_state = inventory.groupby('state').agg({
            'stock_number': 'count',
            'price': ['sum', 'mean']
        }).reset_index()
        by_state.columns = ['state', 'count', 'total_value', 'avg_price']
        by_state = by_state.sort_values('count', ascending=False)
        agg['by_state'] = by_state.to_dict('records')

    # By Region
    if 'region' in inventory.columns:
        by_region = inventory.groupby('region').agg({
            'stock_number': 'count',
            'price': ['sum', 'mean']
        }).reset_index()
        by_region.columns = ['region', 'count', 'total_value', 'avg_price']
        agg['by_region'] = by_region.to_dict('records')

    # By Dealer Group (all - no limit)
    if 'dealer_group' in inventory.columns:
        by_dealer = inventory.groupby('dealer_group').agg({
            'stock_number': 'count',
            'price': ['sum', 'mean']
        }).reset_index()
        by_dealer.columns = ['dealer_group', 'count', 'total_value', 'avg_price']
        by_dealer = by_dealer.sort_values('count', ascending=False)
        agg['by_dealer_group'] = by_dealer.to_dict('records')

    # By Manufacturer (all - no limit)
    if 'manufacturer' in inventory.columns:
        by_mfr = inventory.groupby('manufacturer').agg({
            'stock_number': 'count',
            'price': ['sum', 'mean']
        }).reset_index()
        by_mfr.columns = ['manufacturer', 'count', 'total_value', 'avg_price']
        by_mfr = by_mfr.sort_values('count', ascending=False)
        agg['by_manufacturer'] = by_mfr.to_dict('records')

    # By City (top 50)
    if 'city' in inventory.columns:
        by_city = inventory.groupby('city').agg({
            'stock_number': 'count',
            'price': ['sum', 'mean']
        }).reset_index()
        by_city.columns = ['city', 'count', 'total_value', 'avg_price']
        by_city = by_city.sort_values('count', ascending=False).head(50)
        agg['by_city'] = by_city.to_dict('records')

    # Sales velocity (from sales table)
    sales = cache.get('sales')
    if sales is not None and 'days_to_sell' in sales.columns:
        agg['avg_days_to_sell'] = float(sales['days_to_sell'].mean())

        # Days to sell by RV type
        if 'rv_type' in sales.columns:
            velocity = sales.groupby('rv_type').agg({
                'stock_number': 'count',
                'days_to_sell': 'mean',
                'sale_price': 'mean'
            }).reset_index()
            velocity.columns = ['rv_type', 'sold_count', 'avg_days_to_sell', 'avg_sale_price']
            agg['sales_velocity_by_rv_type'] = velocity.to_dict('records')

        # Days to sell by condition
        if 'condition' in sales.columns:
            velocity = sales.groupby('condition').agg({
                'stock_number': 'count',
                'days_to_sell': 'mean',
                'sale_price': 'mean'
            }).reset_index()
            velocity.columns = ['condition', 'sold_count', 'avg_days_to_sell', 'avg_sale_price']
            agg['sales_velocity_by_condition'] = velocity.to_dict('records')

    return agg


# =============================================================================
# CACHE ACCESS HELPERS
# =============================================================================

_cache = None

def get_cache() -> Dict[str, Any]:
    """Get the global cache (builds if not exists)."""
    global _cache
    if _cache is None:
        _cache = build_cache()
    return _cache


def get_inventory(
    rv_type: str = None,
    condition: str = None,
    state: str = None,
    dealer_group: str = None,
    min_price: float = None,
    max_price: float = None,
    limit: int = None
) -> pd.DataFrame:
    """Get filtered inventory from cache."""
    cache = get_cache()
    df = cache.get('inventory')

    if df is None:
        return pd.DataFrame()

    # Apply filters
    if rv_type:
        df = df[df['rv_type'] == rv_type]
    if condition:
        df = df[df['condition'] == condition]
    if state:
        df = df[df['state'] == state]
    if dealer_group:
        df = df[df['dealer_group'] == dealer_group]
    if min_price is not None:
        df = df[df['price'] >= min_price]
    if max_price is not None:
        df = df[df['price'] <= max_price]

    if limit:
        df = df.head(limit)

    return df


def get_aggregations(
    rv_type: str = None,
    condition: str = None,
    state: str = None
) -> Dict[str, Any]:
    """
    Get aggregations, optionally filtered.

    For unfiltered requests, returns pre-computed aggregations.
    For filtered requests, computes on the fly.
    """
    cache = get_cache()

    # If no filters, return pre-computed
    if not any([rv_type, condition, state]):
        return cache.get('aggregations', {})

    # Otherwise compute filtered aggregations
    inventory = get_inventory(rv_type=rv_type, condition=condition, state=state)

    return {
        'total_units': len(inventory),
        'total_value': float(inventory['price'].sum()) if len(inventory) > 0 else 0,
        'avg_price': float(inventory['price'].mean()) if len(inventory) > 0 else 0,
        'by_rv_type': inventory.groupby('rv_type').size().to_dict() if 'rv_type' in inventory.columns else {},
        'by_condition': inventory.groupby('condition').size().to_dict() if 'condition' in inventory.columns else {},
        'by_state': inventory.groupby('state').size().to_dict() if 'state' in inventory.columns else {},
    }


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import sys

    print("="*70)
    print("Delta Lake Cache Builder")
    print("="*70)

    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        # Quick test without full build
        print("\nTesting connection...")
        df = read_table('dim_product_model')
        if df is not None:
            print(f"Success! Read {len(df):,} product models")
            print(f"Columns: {list(df.columns)}")
        else:
            print("Failed to read table")
    else:
        # Full build
        cache = build_cache(verbose=True)

        print("\n" + "="*70)
        print("CACHE SUMMARY")
        print("="*70)

        for key, value in cache.items():
            if isinstance(value, pd.DataFrame):
                print(f"{key}: {len(value):,} rows, {len(value.columns)} columns")
            elif isinstance(value, dict):
                print(f"{key}: {len(value)} aggregation groups")

        # Show sample aggregations
        agg = cache.get('aggregations', {})
        print("\nSample Aggregations:")
        print(f"  Total units: {agg.get('total_units', 0):,}")
        print(f"  Total value: ${agg.get('total_value', 0):,.0f}")
        print(f"  Avg price: ${agg.get('avg_price', 0):,.0f}")

        if 'avg_days_to_sell' in agg:
            print(f"  Avg days to sell: {agg['avg_days_to_sell']:.1f}")

        if 'by_rv_type' in agg:
            print("\n  By RV Type:")
            for item in agg['by_rv_type'][:5]:
                print(f"    {item['rv_type']}: {item['count']:,} units")
