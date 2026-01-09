"""
OneLake Direct Query Script

Query Microsoft Fabric OneLake data directly without GraphQL API.
Bypasses IT approval requirements by using Azure AD authentication
directly to OneLake storage.

Usage:
    python onelake_query.py                    # Query today's data
    python onelake_query.py --date 2026-01-01  # Query specific date
    python onelake_query.py --dealer ac_nelsen # Query specific dealer
    python onelake_query.py --list-dealers     # List available dealers

Requirements:
    pip install azure-identity pyarrow pandas requests
"""

import argparse
import io
from datetime import datetime
from typing import Optional

import pandas as pd
import pyarrow.parquet as pq
import requests
from azure.identity import DefaultAzureCredential

# Configuration
WORKSPACE_ID = '9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc'
LAKEHOUSE_ID = '06dc42ac-4151-4bb9-94fb-1a03edf49600'
BASE_URL = f'https://onelake.dfs.fabric.microsoft.com/{WORKSPACE_ID}/{LAKEHOUSE_ID}'


class OneLakeClient:
    """Client for querying OneLake data directly."""

    def __init__(self):
        self.credential = DefaultAzureCredential()
        self.token = self.credential.get_token('https://storage.azure.com/.default')

    def _get_headers(self, include_version: bool = False) -> dict:
        headers = {'Authorization': f'Bearer {self.token.token}'}
        if include_version:
            headers['x-ms-version'] = '2021-06-08'
        return headers

    def list_files(self, directory: str, recursive: bool = True) -> list:
        """List files in an OneLake directory."""
        url = f'{BASE_URL}?resource=filesystem&recursive={str(recursive).lower()}&directory={directory}'
        resp = requests.get(url, headers=self._get_headers(include_version=True))

        if resp.status_code != 200:
            raise Exception(f'Failed to list {directory}: {resp.status_code}')

        return resp.json().get('paths', [])

    def read_parquet(self, file_path: str) -> pd.DataFrame:
        """Read a parquet file from OneLake."""
        download_url = f'{BASE_URL}/{file_path}'
        resp = requests.get(download_url, headers=self._get_headers())

        if resp.status_code != 200:
            raise Exception(f'Failed to read {file_path}: {resp.status_code}')

        buffer = io.BytesIO(resp.content)
        return pq.read_table(buffer).to_pandas()

    def list_dealers(self) -> list:
        """Get list of available dealers."""
        files = self.list_files('Files/landing/dealer_scrapes', recursive=False)
        return sorted([
            f['name'].split('/')[-1]
            for f in files
            if f.get('isDirectory') == 'true'
        ])

    def get_inventory(
        self,
        date: str,
        dealer: Optional[str] = None,
        limit: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Get inventory data for a specific date.

        Args:
            date: Date in YYYY-MM-DD format
            dealer: Specific dealer name, or None for all dealers
            limit: Max rows to return per dealer

        Returns:
            DataFrame with inventory data
        """
        year, month, day = date.split('-')
        all_data = []

        dealers = [dealer] if dealer else self.list_dealers()

        for d in dealers:
            try:
                day_path = f'Files/landing/dealer_scrapes/{d}/{year}/{month}/{day}'
                day_files = self.list_files(day_path, recursive=False)
                parquet = [f for f in day_files if f['name'].endswith('.parquet')]

                if parquet:
                    df = self.read_parquet(parquet[0]['name'])
                    if limit:
                        df = df.head(limit)
                    all_data.append(df)
                    print(f'  {d}: {len(df)} units')
            except Exception:
                # Dealer may not have data for this date
                pass

        if all_data:
            return pd.concat(all_data, ignore_index=True)
        return pd.DataFrame()


def main():
    parser = argparse.ArgumentParser(description='Query OneLake inventory data')
    parser.add_argument('--date', type=str, default=datetime.now().strftime('%Y-%m-%d'),
                        help='Date to query (YYYY-MM-DD)')
    parser.add_argument('--dealer', type=str, help='Specific dealer to query')
    parser.add_argument('--limit', type=int, default=10, help='Max rows per dealer')
    parser.add_argument('--list-dealers', action='store_true', help='List available dealers')
    parser.add_argument('--output', type=str, help='Output CSV file path')

    args = parser.parse_args()

    print('Connecting to OneLake...')
    client = OneLakeClient()
    print('Connected!\n')

    if args.list_dealers:
        dealers = client.list_dealers()
        print(f'Available dealers ({len(dealers)}):')
        for d in dealers:
            print(f'  - {d}')
        return

    print(f'Querying inventory for {args.date}...')
    if args.dealer:
        print(f'Dealer filter: {args.dealer}')

    df = client.get_inventory(args.date, dealer=args.dealer, limit=args.limit)

    if df.empty:
        print('\nNo data found for the specified criteria.')
        return

    print(f'\nTotal rows: {len(df)}')
    print(f'Columns: {list(df.columns)}\n')

    # Display summary
    print('=== Inventory Summary ===')
    print(f"Unique makes: {df['make'].nunique()}")
    print(f"Unique models: {df['model'].nunique()}")
    if 'sale_price' in df.columns:
        prices = df['sale_price'].dropna()
        if len(prices) > 0:
            print(f"Avg sale price: ${prices.astype(float).mean():,.2f}")
    if 'class' in df.columns:
        print(f"RV Classes: {df['class'].unique().tolist()}")

    print('\n=== Sample Data (first 10 rows) ===')
    display_cols = ['stock_number', 'year', 'make', 'model', 'class', 'sale_price', 'location']
    display_cols = [c for c in display_cols if c in df.columns]
    print(df[display_cols].head(10).to_string())

    if args.output:
        df.to_csv(args.output, index=False)
        print(f'\nData saved to: {args.output}')


if __name__ == '__main__':
    main()
