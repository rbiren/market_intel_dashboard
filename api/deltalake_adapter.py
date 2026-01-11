"""
Delta Lake Adapter for FastAPI
==============================

Provides the same interface as FabricGraphQLClient but uses Delta Lake for data access.
~50 second startup vs 20-25 minutes for GraphQL.

Usage:
    Set environment variable USE_DELTALAKE=true to enable.
"""

import os
import sys
from datetime import datetime
from typing import Optional, List, Dict, Any

import pandas as pd

# Add parquet_test to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'parquet_test'))

from deltalake_cache import build_cache, read_table


class DeltaLakeClient:
    """
    Client that provides the same interface as FabricGraphQLClient
    but uses Delta Lake for direct table access.
    """

    _instance = None
    _cache = None
    _cache_loaded = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load_cache(self):
        """Load dimension tables - delegated to build_cache."""
        pass  # Handled by load_inventory_cache

    def load_inventory_cache(self):
        """Load all data via Delta Lake."""
        if self._cache_loaded:
            return

        print("Loading Delta Lake cache...")
        start = datetime.now()
        self._cache = build_cache(verbose=True)
        elapsed = (datetime.now() - start).total_seconds()
        print(f"Delta Lake cache loaded in {elapsed:.1f} seconds")
        self._cache_loaded = True

    def build_aggregations_cache(self):
        """Aggregations are built as part of load_inventory_cache."""
        pass

    def build_filtered_aggregations_cache(self):
        """
        Pre-compute filtered aggregations for common filters.
        Delta Lake version computes on-demand since it's fast enough.
        """
        pass

    def get_filter_options(self) -> Dict[str, List[str]]:
        """Get available filter options."""
        inventory = self._cache.get('inventory')
        dealers = self._cache.get('dealers')

        if inventory is None:
            return {
                'rv_types': [],
                'states': [],
                'regions': [],
                'cities': [],
                'conditions': [],
                'dealer_groups': [],
                'manufacturers': []
            }

        return {
            'rv_types': sorted(inventory['rv_type'].dropna().unique().tolist()),
            'states': sorted(inventory['state'].dropna().unique().tolist()),
            'regions': sorted(inventory['region'].dropna().unique().tolist()) if 'region' in inventory.columns else [],
            'cities': sorted(inventory['city'].dropna().unique().tolist())[:500] if 'city' in inventory.columns else [],
            'conditions': sorted(inventory['condition'].dropna().unique().tolist()),
            'dealer_groups': sorted(inventory['dealer_group'].dropna().unique().tolist()),
            'manufacturers': sorted(inventory['manufacturer'].dropna().unique().tolist())
        }

    def list_dealers(self) -> List[str]:
        """Get list of dealer names."""
        dealers = self._cache.get('dealers')
        if dealers is None:
            return []
        return sorted(dealers['dealership'].dropna().unique().tolist())

    def get_cached_inventory(
        self,
        dealer: str = None,
        dealer_group: str = None,
        rv_type: str = None,
        manufacturer: str = None,
        condition: str = None,
        state: str = None,
        min_price: float = None,
        max_price: float = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get filtered inventory from cache."""
        inventory = self._cache.get('inventory')
        if inventory is None:
            return []

        df = inventory.copy()

        # Apply filters
        if dealer:
            df = df[df['dealership'] == dealer]
        if dealer_group:
            df = df[df['dealer_group'] == dealer_group]
        if rv_type:
            df = df[df['rv_type'] == rv_type]
        if manufacturer:
            df = df[df['manufacturer'] == manufacturer]
        if condition:
            df = df[df['condition'] == condition]
        if state:
            df = df[df['state'] == state]
        if min_price is not None:
            df = df[df['price'] >= min_price]
        if max_price is not None:
            df = df[df['price'] <= max_price]

        # Limit results
        df = df.head(limit)

        # Convert to list of dicts matching expected format
        results = []
        for _, row in df.iterrows():
            results.append({
                'stock_number': row.get('stock_number'),
                'title': None,  # Not in Delta tables
                'year': row.get('model_year'),
                'make': row.get('manufacturer'),
                'model': row.get('model'),
                'floorplan': row.get('floorplan'),
                'rv_class': row.get('rv_type'),
                'condition': row.get('condition'),
                'sale_price': float(row['price']) if pd.notna(row.get('price')) else None,
                'msrp': None,  # Not in fact_inventory_current
                'location': row.get('state'),
                'dealer_source': row.get('dealership'),
                'dealer_group': row.get('dealer_group'),
                'first_image': None,  # Not in fact_inventory_current
                'sleeps': None,
                'length': None,
                'weight': None,
                'vin': None,  # Not in fact_inventory_current
                'days_on_lot': int(row['days_on_lot']) if pd.notna(row.get('days_on_lot')) else None,
            })

        return results

    def get_fast_aggregations(self) -> Dict[str, Any]:
        """Get pre-computed aggregations (no filters)."""
        return self._build_aggregation_response()

    def get_filtered_aggregations_cached(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Get pre-computed filtered aggregations.
        Delta Lake computes on-demand since it's fast.
        """
        # Parse cache key (e.g., "condition:NEW" or "rv_type:TRAVEL TRAILER")
        parts = cache_key.split(':', 1)
        if len(parts) != 2:
            return None

        filter_type, filter_value = parts

        if filter_type == 'condition':
            return self.get_filtered_aggregations(condition=filter_value)
        elif filter_type == 'rv_type':
            return self.get_filtered_aggregations(rv_type=filter_value)

        return None

    def get_filtered_aggregations(
        self,
        rv_type: str = None,
        dealer_group: str = None,
        manufacturer: str = None,
        condition: str = None,
        state: str = None,
        min_price: float = None,
        max_price: float = None
    ) -> Dict[str, Any]:
        """Get aggregations with filters applied."""
        return self._build_aggregation_response(
            rv_type=rv_type,
            dealer_group=dealer_group,
            manufacturer=manufacturer,
            condition=condition,
            state=state,
            min_price=min_price,
            max_price=max_price
        )

    def _build_aggregation_response(
        self,
        rv_type: str = None,
        dealer_group: str = None,
        manufacturer: str = None,
        condition: str = None,
        state: str = None,
        min_price: float = None,
        max_price: float = None
    ) -> Dict[str, Any]:
        """Build aggregation response matching AggregatedSummaryResponse format."""
        inventory = self._cache.get('inventory')
        if inventory is None:
            return self._empty_aggregation_response()

        df = inventory.copy()

        # Apply filters
        if rv_type:
            df = df[df['rv_type'] == rv_type]
        if dealer_group:
            df = df[df['dealer_group'] == dealer_group]
        if manufacturer:
            df = df[df['manufacturer'] == manufacturer]
        if condition:
            df = df[df['condition'] == condition]
        if state:
            df = df[df['state'] == state]
        if min_price is not None:
            df = df[df['price'] >= min_price]
        if max_price is not None:
            df = df[df['price'] <= max_price]

        if len(df) == 0:
            return self._empty_aggregation_response()

        # Calculate totals
        total_units = len(df)
        total_value = float(df['price'].sum()) if 'price' in df.columns else 0
        avg_price = float(df['price'].mean()) if 'price' in df.columns else 0
        min_price_val = float(df['price'].min()) if 'price' in df.columns else 0
        max_price_val = float(df['price'].max()) if 'price' in df.columns else 0

        return {
            'total_units': total_units,
            'total_value': total_value,
            'avg_price': avg_price,
            'min_price': min_price_val,
            'max_price': max_price_val,
            'by_rv_type': self._aggregate_by(df, 'rv_type'),
            'by_dealer_group': self._aggregate_by(df, 'dealer_group', limit=20),
            'by_manufacturer': self._aggregate_by(df, 'manufacturer', limit=20),
            'by_condition': self._aggregate_by(df, 'condition'),
            'by_state': self._aggregate_by(df, 'state', limit=65),
            'by_region': self._aggregate_by(df, 'region') if 'region' in df.columns else [],
            'by_city': self._aggregate_by(df, 'city', limit=50) if 'city' in df.columns else [],
            'by_county': self._aggregate_by(df, 'county', limit=50) if 'county' in df.columns else [],
        }

    def _aggregate_by(self, df: pd.DataFrame, column: str, limit: int = None) -> List[Dict]:
        """Aggregate dataframe by column."""
        if column not in df.columns:
            return []

        # Group by column
        grouped = df.groupby(column).agg({
            'stock_number': 'count',
            'price': ['sum', 'mean', 'min', 'max'],
            'days_on_lot': 'mean'
        }).reset_index()

        # Flatten column names
        grouped.columns = [column, 'count', 'total_value', 'avg_price', 'min_price', 'max_price', 'avg_days_on_lot']

        # Sort by count descending
        grouped = grouped.sort_values('count', ascending=False)

        # Limit if specified
        if limit:
            grouped = grouped.head(limit)

        # Convert to list of dicts
        results = []
        for _, row in grouped.iterrows():
            results.append({
                'name': str(row[column]) if pd.notna(row[column]) else 'Unknown',
                'count': int(row['count']),
                'total_value': float(row['total_value']) if pd.notna(row['total_value']) else 0,
                'avg_price': float(row['avg_price']) if pd.notna(row['avg_price']) else 0,
                'min_price': float(row['min_price']) if pd.notna(row['min_price']) else 0,
                'max_price': float(row['max_price']) if pd.notna(row['max_price']) else 0,
                'avg_days_on_lot': float(row['avg_days_on_lot']) if pd.notna(row['avg_days_on_lot']) else None,
            })

        return results

    def _empty_aggregation_response(self) -> Dict[str, Any]:
        """Return empty aggregation response."""
        return {
            'total_units': 0,
            'total_value': 0,
            'avg_price': 0,
            'min_price': 0,
            'max_price': 0,
            'by_rv_type': [],
            'by_dealer_group': [],
            'by_manufacturer': [],
            'by_condition': [],
            'by_state': [],
            'by_region': [],
            'by_city': [],
            'by_county': [],
        }

    # Additional methods for sales data
    def get_sales_velocity(self) -> Dict[str, Any]:
        """Get sales velocity metrics from sales data."""
        sales = self._cache.get('sales')
        if sales is None:
            return {}

        agg = self._cache.get('aggregations', {})
        return {
            'avg_days_to_sell': agg.get('avg_days_to_sell'),
            'by_rv_type': agg.get('sales_velocity_by_rv_type', []),
            'by_condition': agg.get('sales_velocity_by_condition', []),
        }
