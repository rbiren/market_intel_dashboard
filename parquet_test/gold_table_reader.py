"""
Gold Table Reader - Read Delta Tables from Microsoft Fabric Lakehouse
======================================================================

Successfully reads Delta tables directly using the deltalake library.
No GraphQL required!

Prerequisites:
    pip install deltalake azure-identity pandas

Authentication:
    Run `az login` before executing this script
"""

import pandas as pd
from deltalake import DeltaTable
from azure.identity import DefaultAzureCredential
from typing import Optional, List
import json

# =============================================================================
# CONFIGURATION
# =============================================================================

WORKSPACE_ID = '9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc'
LAKEHOUSE_ID = '06dc42ac-4151-4bb9-94fb-1a03edf49600'

# Gold tables available
GOLD_TABLES = [
    'fact_inventory_current',
    'fact_inventory',
    'fact_inventory_sales',
    'fact_inventory_snapshot',
    'dim_product',
    'dim_product_model',
    'dim_dealership',
    'dim_date',
    'dim_date_period',
    'dim_power_bi_report',
    'dim_power_bi_user',
    'fact_power_bi_usage',
    'fact_statistical_survey_registration',
]


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

def get_table_uri(schema: str, table: str) -> str:
    """Build the abfss URI for a Delta table."""
    return f"abfss://{WORKSPACE_ID}@onelake.dfs.fabric.microsoft.com/{LAKEHOUSE_ID}/Tables/{schema}/{table}"


def open_table(schema: str, table: str) -> Optional[DeltaTable]:
    """
    Open a Delta table.

    Args:
        schema: Schema name (e.g., 'gold')
        table: Table name (e.g., 'fact_inventory_current')

    Returns:
        DeltaTable object or None if failed
    """
    uri = get_table_uri(schema, table)
    try:
        return DeltaTable(uri, storage_options=get_storage_options())
    except Exception as e:
        print(f"Error opening {schema}.{table}: {e}")
        return None


def read_table(schema: str, table: str, columns: List[str] = None, limit: int = None) -> Optional[pd.DataFrame]:
    """
    Read a Delta table into a pandas DataFrame.

    Args:
        schema: Schema name
        table: Table name
        columns: List of columns to read (None for all)
        limit: Max rows to return (None for all)

    Returns:
        pandas DataFrame or None if failed
    """
    dt = open_table(schema, table)
    if dt is None:
        return None

    # Read to pandas
    if columns:
        df = dt.to_pandas(columns=columns)
    else:
        df = dt.to_pandas()

    if limit:
        df = df.head(limit)

    return df


def get_table_info(schema: str, table: str) -> Optional[dict]:
    """
    Get metadata about a Delta table.

    Args:
        schema: Schema name
        table: Table name

    Returns:
        Dict with table info or None if failed
    """
    dt = open_table(schema, table)
    if dt is None:
        return None

    schema_obj = dt.schema()

    # Try to get file count (method varies by deltalake version)
    try:
        num_files = len(dt.file_uris())
    except:
        try:
            num_files = len(dt.files())
        except:
            num_files = "?"

    return {
        'table': f"{schema}.{table}",
        'version': dt.version(),
        'num_files': num_files,
        'columns': [
            {'name': field.name, 'type': str(field.type), 'nullable': field.nullable}
            for field in schema_obj.fields
        ]
    }


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def get_inventory() -> pd.DataFrame:
    """Get the current inventory fact table."""
    return read_table('gold', 'fact_inventory_current')


def get_products() -> pd.DataFrame:
    """Get the product dimension table."""
    return read_table('gold', 'dim_product')


def get_product_models() -> pd.DataFrame:
    """Get the product model dimension table."""
    return read_table('gold', 'dim_product_model')


def get_dealers() -> pd.DataFrame:
    """Get the dealership dimension table."""
    return read_table('gold', 'dim_dealership')


def get_inventory_with_details() -> pd.DataFrame:
    """
    Get inventory with joined product and dealer details.
    Performs the joins that GraphQL couldn't do!
    """
    # Read all tables
    inventory = get_inventory()
    products = get_product_models()
    dealers = get_dealers()

    if inventory is None or products is None or dealers is None:
        print("Failed to read one or more tables")
        return None

    # Join product info
    if 'dim_product_model_skey' in inventory.columns and 'dim_product_model_skey' in products.columns:
        inventory = inventory.merge(
            products[['dim_product_model_skey', 'rv_type', 'manufacturer', 'model']],
            on='dim_product_model_skey',
            how='left'
        )

    # Join dealer info
    if 'dim_dealership_skey' in inventory.columns and 'dim_dealership_skey' in dealers.columns:
        inventory = inventory.merge(
            dealers[['dim_dealership_skey', 'dealer_group', 'dealership', 'state', 'region', 'city', 'county']],
            on='dim_dealership_skey',
            how='left'
        )

    return inventory


# =============================================================================
# DISCOVERY
# =============================================================================

def discover_all_tables():
    """Discover and print info about all gold tables."""
    print("="*70)
    print("GOLD LAYER TABLES")
    print("="*70)

    results = []
    for table in GOLD_TABLES:
        info = get_table_info('gold', table)
        if info:
            print(f"\n{info['table']} (v{info['version']}, {info['num_files']} files)")
            print(f"  Columns ({len(info['columns'])}):")
            for col in info['columns']:
                print(f"    {col['name']}: {col['type']}")
            results.append(info)
        else:
            print(f"\n{table}: NOT ACCESSIBLE")

    return results


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import sys

    print("Gold Table Reader - Microsoft Fabric Lakehouse")
    print("="*70)

    if len(sys.argv) > 1:
        if sys.argv[1] == 'discover':
            # Discover all tables
            discover_all_tables()

        elif sys.argv[1] == 'inventory':
            # Read inventory with details
            print("Reading inventory with joined details...")
            df = get_inventory_with_details()
            if df is not None:
                print(f"\nTotal rows: {len(df)}")
                print(f"Columns: {list(df.columns)}")
                print("\nSample data:")
                print(df.head(10).to_string())

                # Save to CSV
                df.to_csv('inventory_full.csv', index=False)
                print(f"\nSaved to: inventory_full.csv")

        else:
            # Read specific table
            table = sys.argv[1]
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
            df = read_table('gold', table, limit=limit)
            if df is not None:
                print(f"Table: gold.{table}")
                print(f"Rows: {len(df)}")
                print(f"Columns: {list(df.columns)}")
                print("\nData:")
                print(df.to_string())

    else:
        print("""
Usage:
    python gold_table_reader.py discover              # List all tables
    python gold_table_reader.py inventory             # Get full inventory with joins
    python gold_table_reader.py <table_name> [limit]  # Read specific table

Examples:
    python gold_table_reader.py fact_inventory_current 10
    python gold_table_reader.py dim_dealership 50
    python gold_table_reader.py dim_product_model

Available tables:
""")
        for t in GOLD_TABLES:
            print(f"    {t}")

        print("\nQuick test - reading fact_inventory_current...")
        df = read_table('gold', 'fact_inventory_current', limit=5)
        if df is not None:
            print(f"\nSuccess! {len(df)} rows loaded.")
            print(f"Columns: {list(df.columns)}")
