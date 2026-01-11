"""
OneLake Parquet File Reader
===========================
Read parquet files directly from Microsoft Fabric Lakehouse.
No GraphQL - direct OneLake access via REST API.

Prerequisites:
    pip install azure-identity requests pyarrow pandas

Authentication:
    Run `az login` before executing this script
"""

import requests
import io
import pyarrow.parquet as pq
import pandas as pd
from azure.identity import DefaultAzureCredential

# =============================================================================
# CONFIGURATION
# =============================================================================

WORKSPACE_ID = '9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc'
LAKEHOUSE_ID = '06dc42ac-4151-4bb9-94fb-1a03edf49600'
BASE_URL = f'https://onelake.dfs.fabric.microsoft.com/{WORKSPACE_ID}/{LAKEHOUSE_ID}'


# =============================================================================
# AUTHENTICATION
# =============================================================================

def get_token():
    """Get Azure access token for OneLake storage."""
    credential = DefaultAzureCredential()
    token = credential.get_token('https://storage.azure.com/.default')
    return token.token


# =============================================================================
# PARQUET READING
# =============================================================================

def read_parquet(file_path: str, token: str = None) -> pd.DataFrame:
    """
    Read a parquet file from OneLake.

    Args:
        file_path: Full path to parquet file (e.g., 'Tables/gold/fact_inventory_current/part-00000.parquet')
        token: Azure access token

    Returns:
        pandas DataFrame
    """
    if token is None:
        token = get_token()

    url = f'{BASE_URL}/{file_path}'
    headers = {'Authorization': f'Bearer {token}'}

    print(f"Reading: {file_path}")
    resp = requests.get(url, headers=headers)

    if resp.status_code != 200:
        raise Exception(f'Failed to read file: {resp.status_code} - {resp.text[:200]}')

    buffer = io.BytesIO(resp.content)
    return pq.read_table(buffer).to_pandas()


def get_parquet_schema(file_path: str, token: str = None) -> dict:
    """
    Get the schema of a parquet file without reading all data.

    Args:
        file_path: Full path to parquet file
        token: Azure access token

    Returns:
        Dict with schema info
    """
    if token is None:
        token = get_token()

    url = f'{BASE_URL}/{file_path}'
    headers = {
        'Authorization': f'Bearer {token}',
        'Range': 'bytes=0-1048576'  # Read first 1MB only for schema
    }

    print(f"Reading schema: {file_path}")
    resp = requests.get(url, headers=headers)

    if resp.status_code not in [200, 206]:
        raise Exception(f'Failed to read file: {resp.status_code}')

    buffer = io.BytesIO(resp.content)
    try:
        parquet_file = pq.ParquetFile(buffer)
        schema = parquet_file.schema_arrow

        return {
            'num_columns': len(schema),
            'num_row_groups': parquet_file.metadata.num_row_groups,
            'num_rows': parquet_file.metadata.num_rows,
            'columns': [
                {
                    'name': field.name,
                    'type': str(field.type)
                }
                for field in schema
            ]
        }
    except Exception as e:
        # If partial read failed, try full read
        df = read_parquet(file_path, token)
        return {
            'num_columns': len(df.columns),
            'num_rows': len(df),
            'columns': [
                {'name': col, 'type': str(df[col].dtype)}
                for col in df.columns
            ]
        }


def list_and_read_table(schema: str, table: str, limit: int = 10, token: str = None) -> pd.DataFrame:
    """
    List parquet files in a Delta table and read them.

    Args:
        schema: Schema name (e.g., 'gold', 'silver', 'bronze')
        table: Table name (e.g., 'fact_inventory_current')
        limit: Max rows to return
        token: Azure access token

    Returns:
        pandas DataFrame with combined data
    """
    if token is None:
        token = get_token()

    # List files in the table directory
    from discover_parquet import list_files, find_parquet_files

    table_path = f'Tables/{schema}/{table}'
    parquet_files = find_parquet_files(table_path, token=token)

    if not parquet_files:
        print(f"No parquet files found in {table_path}")
        return pd.DataFrame()

    print(f"Found {len(parquet_files)} parquet files in {table_path}")

    # Read first file(s) up to limit
    all_dfs = []
    rows_read = 0

    for file_info in parquet_files:
        if rows_read >= limit:
            break

        file_path = file_info['name']
        df = read_parquet(file_path, token=token)

        remaining = limit - rows_read
        all_dfs.append(df.head(remaining))
        rows_read += len(df)

    if all_dfs:
        return pd.concat(all_dfs, ignore_index=True).head(limit)
    return pd.DataFrame()


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

def demo_read_gold_tables():
    """Demo reading from gold layer tables."""
    token = get_token()
    print("\nAuthenticated successfully!")

    # Key gold tables to check
    gold_tables = [
        'fact_inventory_current',
        'dim_product',
        'dim_dealership',
        'fact_inventory'
    ]

    for table in gold_tables:
        print(f"\n{'='*60}")
        print(f"Table: gold.{table}")
        print('='*60)

        try:
            df = list_and_read_table('gold', table, limit=5, token=token)
            if not df.empty:
                print(f"\nSchema ({len(df.columns)} columns):")
                for col in df.columns:
                    print(f"  {col}: {df[col].dtype}")
                print(f"\nSample data ({len(df)} rows):")
                print(df.to_string())
            else:
                print("  (table is empty or not accessible)")
        except Exception as e:
            print(f"  Error: {e}")


def demo_read_single_file():
    """Demo reading a single parquet file."""
    token = get_token()

    # Example: Read a specific parquet file
    # Update this path based on discovery results
    sample_paths = [
        'Tables/gold/dim_dealership',  # Try finding a file here
        'Tables/silver/dealer_scrapes',
    ]

    from discover_parquet import find_parquet_files

    for table_path in sample_paths:
        print(f"\nLooking for parquet files in: {table_path}")
        files = find_parquet_files(table_path, token=token)

        if files:
            first_file = files[0]['name']
            print(f"Found: {first_file}")

            schema = get_parquet_schema(first_file, token=token)
            print(f"\nSchema: {schema['num_rows']} rows, {schema['num_columns']} columns")
            for col in schema['columns'][:10]:  # Show first 10 columns
                print(f"  {col['name']}: {col['type']}")

            if schema['num_columns'] > 10:
                print(f"  ... and {schema['num_columns'] - 10} more columns")

            # Read sample data
            df = read_parquet(first_file, token=token)
            print(f"\nSample data (first 5 rows):")
            print(df.head(5).to_string())
            return


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import sys

    print("OneLake Parquet Reader")
    print("="*60)

    if len(sys.argv) > 1:
        # Read specific file passed as argument
        file_path = sys.argv[1]
        token = get_token()

        df = read_parquet(file_path, token=token)
        print(f"\nRead {len(df)} rows, {len(df.columns)} columns")
        print("\nColumns:")
        for col in df.columns:
            print(f"  {col}: {df[col].dtype}")
        print("\nSample data:")
        print(df.head(10).to_string())
    else:
        # Run demo
        print("\nUsage: python read_parquet.py <file_path>")
        print("       python read_parquet.py  # Run demo")
        print("\nRunning demo...")

        try:
            demo_read_single_file()
        except Exception as e:
            print(f"\nError: {e}")
            print("\nTroubleshooting:")
            print("1. Run 'az login' first")
            print("2. Run discover_parquet.py to find available files")
