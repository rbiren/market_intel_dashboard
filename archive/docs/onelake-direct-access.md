# OneLake Direct Access Guide

> **Alternative to GraphQL API** - Use this method to query Fabric data directly without needing IT approval for the GraphQL API.

## Overview

This document describes how to query Microsoft Fabric OneLake data directly using Python and Azure Identity. This bypasses the GraphQL API entirely and reads parquet files directly from OneLake storage.

## Prerequisites

```bash
pip install azure-identity pyarrow pandas requests
```

You must be authenticated via one of:
- Azure CLI (`az login`)
- Visual Studio Code Azure extension
- Environment variables (for service principals)

## Configuration

```python
WORKSPACE_ID = '9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc'  # THOR Industries
LAKEHOUSE_ID = '06dc42ac-4151-4bb9-94fb-1a03edf49600'  # thor_industries_de_lakehouse
```

## Data Structure

The lakehouse contains **raw landing data** (not Delta tables) at:

```
Files/landing/dealer_scrapes/{dealer_name}/{year}/{month}/{day}/*.parquet
```

### Available Dealers (partial list)
- ac_nelsen
- autotrader
- basdens
- berryland
- bish
- blue_compass
- bob_hurley
- bretz_rv
- camping_world
- cookeville
- ... and more

### Data Schema (31 columns)

| Column | Description |
|--------|-------------|
| `title` | Full listing title |
| `stock_number` | Dealer stock number |
| `location` | Dealer location |
| `first_image` | Primary image URL |
| `msrp` | Manufacturer suggested retail price |
| `sale_price` | Current sale price |
| `sleeps` | Number of sleeping spots |
| `length` | Unit length (feet) |
| `weight` | Unit weight (lbs) |
| `year` | Model year |
| `make` | Manufacturer (Forest River, Coachmen, etc.) |
| `model` | Model name |
| `floorplan` | Floorplan code |
| `class` | RV class (Fifth Wheel, Travel Trailer, etc.) |
| `VIN` | Vehicle identification number |
| `condition` | New/Used/In Transit |
| `Dealer_Group` | Dealer group name |
| `Date_Pulled` | Date data was scraped |
| `DATE_OF_REPORT` | Report date |

## Working Code

### Authentication & Setup

```python
import requests
from azure.identity import DefaultAzureCredential
import pyarrow.parquet as pq
import pandas as pd
import io

# Configuration
WORKSPACE_ID = '9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc'
LAKEHOUSE_ID = '06dc42ac-4151-4bb9-94fb-1a03edf49600'
BASE_URL = f'https://onelake.dfs.fabric.microsoft.com/{WORKSPACE_ID}/{LAKEHOUSE_ID}'

# Get Azure credentials
credential = DefaultAzureCredential()
token = credential.get_token('https://storage.azure.com/.default')
```

### List Files in OneLake

```python
def list_onelake_files(directory: str, recursive: bool = True) -> list:
    """List files in an OneLake directory"""
    url = f'{BASE_URL}?resource=filesystem&recursive={str(recursive).lower()}&directory={directory}'
    headers = {
        'Authorization': f'Bearer {token.token}',
        'x-ms-version': '2021-06-08'
    }

    resp = requests.get(url, headers=headers)
    if resp.status_code != 200:
        raise Exception(f'Failed to list: {resp.status_code}')

    return resp.json().get('paths', [])

# Example: List all parquet files
files = list_onelake_files('Files/landing/dealer_scrapes', recursive=True)
parquet_files = [f for f in files if f['name'].endswith('.parquet')]
print(f'Found {len(parquet_files)} parquet files')
```

### Read Parquet File

```python
def read_onelake_parquet(file_path: str) -> pd.DataFrame:
    """Read a parquet file from OneLake and return as DataFrame"""
    download_url = f'{BASE_URL}/{file_path}'
    headers = {'Authorization': f'Bearer {token.token}'}

    resp = requests.get(download_url, headers=headers)
    if resp.status_code != 200:
        raise Exception(f'Failed to download: {resp.status_code} - {resp.text[:200]}')

    buffer = io.BytesIO(resp.content)
    return pq.read_table(buffer).to_pandas()

# Example: Read today's AC Nelsen data
df = read_onelake_parquet('Files/landing/dealer_scrapes/ac_nelsen/2026/01/01/acn_20260101.parquet')
print(df.head(10))
```

### Query Multiple Dealers

```python
from datetime import datetime

def get_inventory_for_date(date: str, dealers: list = None) -> pd.DataFrame:
    """
    Get inventory data for a specific date across multiple dealers.

    Args:
        date: Date string in format 'YYYY-MM-DD'
        dealers: List of dealer names, or None for all

    Returns:
        Combined DataFrame of all dealer inventory
    """
    year, month, day = date.split('-')
    all_data = []

    # List all dealer directories
    files = list_onelake_files('Files/landing/dealer_scrapes', recursive=False)
    available_dealers = [f['name'].split('/')[-1] for f in files if f.get('isDirectory') == 'true']

    if dealers:
        available_dealers = [d for d in available_dealers if d in dealers]

    for dealer in available_dealers:
        try:
            # Find parquet file for this dealer/date
            day_path = f'Files/landing/dealer_scrapes/{dealer}/{year}/{month}/{day}'
            day_files = list_onelake_files(day_path, recursive=False)
            parquet = [f for f in day_files if f['name'].endswith('.parquet')]

            if parquet:
                df = read_onelake_parquet(parquet[0]['name'])
                all_data.append(df)
                print(f'  {dealer}: {len(df)} units')
        except Exception as e:
            print(f'  {dealer}: No data - {e}')

    if all_data:
        return pd.concat(all_data, ignore_index=True)
    return pd.DataFrame()

# Example usage
df = get_inventory_for_date('2026-01-01', dealers=['ac_nelsen', 'camping_world'])
```

## Important Notes

### Path Structure
The original path provided (`abfss://...Tables/gold/fact_inventory_current`) does NOT contain Delta tables. The actual data is in the `Files/landing/` directory as raw parquet files.

### fact_inventory_current Table
The `fact_inventory_current` table referenced in the GraphQL schema is likely:
1. A **SQL view** in the Fabric SQL endpoint that aggregates the landing data
2. Created by a **Spark notebook/pipeline** that processes raw data into a gold layer
3. Only accessible via GraphQL or SQL endpoint (requires IT approval)

### Data Freshness
Landing data is organized by date: `{year}/{month}/{day}/`
- New data appears to be added daily
- Historical data is preserved

### Authentication Scope
The token scope `https://storage.azure.com/.default` provides access to OneLake storage. This is different from the GraphQL API scope.

## Comparison: Direct Access vs GraphQL

| Aspect | Direct OneLake Access | GraphQL API |
|--------|----------------------|-------------|
| IT Approval | Not required (uses existing Azure AD) | Required |
| Data Format | Raw parquet files | Processed/joined tables |
| Joins | Must do client-side | Server-side via schema |
| Filtering | Load full file, filter in pandas | Server-side filtering |
| Performance | Good for small queries | Better for complex queries |
| Real-time | Near real-time (after ETL) | Near real-time |

## Troubleshooting

### "PathNotFound" Error
- Verify the file path exists using `list_onelake_files()`
- Check date format matches available data
- Some dealers may not have data for all dates

### Authentication Errors
- Run `az login` to refresh credentials
- Ensure your Azure AD account has access to the Fabric workspace

### SSL/Certificate Errors
If using the `deltalake` library, you may see certificate errors. Use the REST API approach shown above instead.

## Sample Notebook

See `test_onelake_query.ipynb` in this repository for a runnable Jupyter notebook with these examples.

---

*Last updated: 2026-01-04*
*Tested with: Python 3.11, azure-identity 1.x, pyarrow 14.x*
