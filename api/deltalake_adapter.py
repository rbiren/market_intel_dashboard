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
    _aggregations_cache = None  # Cache for unfiltered aggregations
    _sales_velocity_cache = None  # Cache for unfiltered sales velocity

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

        # Pre-compute unfiltered aggregations for instant responses
        print("Pre-computing aggregations...")
        agg_start = datetime.now()
        self._aggregations_cache = self._compute_aggregations_no_filter()
        agg_elapsed = (datetime.now() - agg_start).total_seconds()
        print(f"Aggregations pre-computed in {agg_elapsed:.1f} seconds")

        # Pre-compute unfiltered sales velocity for instant responses
        print("Pre-computing sales velocity...")
        sales_start = datetime.now()
        self._sales_velocity_cache = self._compute_sales_velocity_no_filter()
        sales_elapsed = (datetime.now() - sales_start).total_seconds()
        print(f"Sales velocity pre-computed in {sales_elapsed:.1f} seconds")

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

    def _parse_multi_value(self, value: str) -> List[str]:
        """Parse comma-separated filter values into a list."""
        if not value:
            return []
        return [v.strip() for v in value.split(',') if v.strip()]

    def _apply_filter(self, df: pd.DataFrame, column: str, value: str) -> pd.DataFrame:
        """Apply filter supporting both single and comma-separated values."""
        if not value or column not in df.columns:
            return df
        values = self._parse_multi_value(value)
        if len(values) == 1:
            return df[df[column] == values[0]]
        return df[df[column].isin(values)]

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
                'manufacturers': [],
                'models': [],
                'floorplans': []
            }

        return {
            'rv_types': sorted(inventory['rv_type'].dropna().unique().tolist()),
            'states': sorted(inventory['state'].dropna().unique().tolist()),
            'regions': sorted(inventory['region'].dropna().unique().tolist()) if 'region' in inventory.columns else [],
            'cities': sorted(inventory['city'].dropna().unique().tolist()) if 'city' in inventory.columns else [],
            'conditions': sorted(inventory['condition'].dropna().unique().tolist()),
            'dealer_groups': sorted(inventory['dealer_group'].dropna().unique().tolist()),
            'manufacturers': sorted(inventory['manufacturer'].dropna().unique().tolist()),
            'models': sorted(inventory['model'].dropna().unique().tolist()) if 'model' in inventory.columns else [],
            'floorplans': sorted(inventory['floorplan'].dropna().unique().tolist()) if 'floorplan' in inventory.columns else []
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
        model: str = None,
        floorplan: str = None,
        min_price: float = None,
        max_price: float = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get filtered inventory from cache."""
        inventory = self._cache.get('inventory')
        if inventory is None:
            return []

        df = inventory.copy()

        # Apply filters (supports comma-separated multi-values)
        df = self._apply_filter(df, 'dealership', dealer)
        df = self._apply_filter(df, 'dealer_group', dealer_group)
        df = self._apply_filter(df, 'rv_type', rv_type)
        df = self._apply_filter(df, 'manufacturer', manufacturer)
        df = self._apply_filter(df, 'condition', condition)
        df = self._apply_filter(df, 'state', state)
        df = self._apply_filter(df, 'model', model)
        df = self._apply_filter(df, 'floorplan', floorplan)
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
        model: str = None,
        floorplan: str = None,
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
            model=model,
            floorplan=floorplan,
            min_price=min_price,
            max_price=max_price
        )

    def _compute_aggregations_no_filter(self) -> Dict[str, Any]:
        """Pre-compute aggregations for unfiltered requests (called once at startup)."""
        inventory = self._cache.get('inventory')
        sales = self._cache.get('sales')

        if inventory is None:
            return self._empty_aggregation_response()

        # Calculate totals
        total_units = len(inventory)
        total_value = float(inventory['price'].sum()) if 'price' in inventory.columns else 0
        avg_price = float(inventory['price'].mean()) if 'price' in inventory.columns else 0
        min_price_val = float(inventory['price'].min()) if 'price' in inventory.columns else 0
        max_price_val = float(inventory['price'].max()) if 'price' in inventory.columns else 0

        # Pre-compute all aggregations
        result = {
            'total_units': total_units,
            'total_value': total_value,
            'avg_price': avg_price,
            'min_price': min_price_val,
            'max_price': max_price_val,
            'by_rv_type': self._aggregate_by_fast(inventory, 'rv_type'),
            'by_dealer_group': self._aggregate_by_fast(inventory, 'dealer_group'),
            'by_manufacturer': self._aggregate_by_fast(inventory, 'manufacturer'),
            'by_condition': self._aggregate_by_fast(inventory, 'condition'),
            'by_state': self._aggregate_by_fast(inventory, 'state', limit=65),
            'by_region': self._aggregate_by_fast(inventory, 'region') if 'region' in inventory.columns else [],
            'by_city': self._aggregate_by_fast(inventory, 'city') if 'city' in inventory.columns else [],
            'by_county': self._aggregate_by_fast(inventory, 'county') if 'county' in inventory.columns else [],
        }

        # Pre-compute sales velocity
        if sales is not None and 'days_to_sell' in sales.columns:
            result['avg_days_to_sell'] = float(sales['days_to_sell'].mean())
            result['sales_velocity'] = {
                'total_sold': len(sales),
                'avg_days_to_sell': float(sales['days_to_sell'].mean()),
                'avg_sale_price': float(sales['sale_price'].mean()) if 'sale_price' in sales.columns else None,
                'by_rv_type': self._aggregate_sales_by_fast(sales, 'rv_type'),
                'by_condition': self._aggregate_sales_by_fast(sales, 'condition'),
            }
        else:
            result['avg_days_to_sell'] = None
            result['sales_velocity'] = {'total_sold': 0, 'avg_days_to_sell': None, 'avg_sale_price': None, 'by_rv_type': [], 'by_condition': []}

        return result

    def _compute_sales_velocity_no_filter(self) -> Dict[str, Any]:
        """Pre-compute full sales velocity for unfiltered requests (called once at startup)."""
        sales = self._cache.get('sales')
        if sales is None:
            return self._empty_sales_velocity_response()

        df = sales

        return {
            'total_sold': len(df),
            'avg_days_to_sell': float(df['days_to_sell'].mean()) if 'days_to_sell' in df.columns else None,
            'median_days_to_sell': float(df['days_to_sell'].median()) if 'days_to_sell' in df.columns else None,
            'min_days_to_sell': int(df['days_to_sell'].min()) if 'days_to_sell' in df.columns else None,
            'max_days_to_sell': int(df['days_to_sell'].max()) if 'days_to_sell' in df.columns else None,
            'avg_sale_price': float(df['sale_price'].mean()) if 'sale_price' in df.columns else None,
            'total_sales_value': float(df['sale_price'].sum()) if 'sale_price' in df.columns else None,
            'by_rv_type': self._aggregate_sales_by_fast_v2(df, 'rv_type'),
            'by_condition': self._aggregate_sales_by_fast_v2(df, 'condition'),
            'by_dealer_group': self._aggregate_sales_by_fast_v2(df, 'dealer_group'),
            'by_manufacturer': self._aggregate_sales_by_fast_v2(df, 'manufacturer'),
            'by_state': self._aggregate_sales_by_fast_v2(df, 'state'),
            'by_region': self._aggregate_sales_by_fast_v2(df, 'region') if 'region' in df.columns else [],
            'by_month': self._aggregate_sales_by_month_fast(df) if 'calendar_date' in df.columns else [],
        }

    def _aggregate_sales_by_fast_v2(self, df: pd.DataFrame, column: str, limit: int = None) -> List[Dict]:
        """Aggregate sales data by a column - optimized version using to_dict."""
        if column not in df.columns:
            return []

        agg_dict = {'stock_number': 'count'}
        if 'days_to_sell' in df.columns:
            agg_dict['days_to_sell'] = 'mean'
        if 'sale_price' in df.columns:
            agg_dict['sale_price'] = ['sum', 'mean']

        grouped = df.groupby(column).agg(agg_dict).reset_index()

        # Flatten column names
        if 'sale_price' in agg_dict:
            grouped.columns = [column, 'sold_count', 'avg_days_to_sell', 'total_value', 'avg_price']
        elif 'days_to_sell' in agg_dict:
            grouped.columns = [column, 'sold_count', 'avg_days_to_sell']
        else:
            grouped.columns = [column, 'sold_count']

        grouped = grouped.sort_values('sold_count', ascending=False)

        if limit:
            grouped = grouped.head(limit)

        # Convert to list of dicts - much faster than iterrows
        grouped['name'] = grouped[column].fillna('Unknown').astype(str)
        grouped['sold_count'] = grouped['sold_count'].astype(int)

        cols_to_keep = ['name', 'sold_count']
        if 'avg_days_to_sell' in grouped.columns:
            cols_to_keep.append('avg_days_to_sell')
        if 'total_value' in grouped.columns:
            grouped['total_value'] = grouped['total_value'].fillna(0)
            cols_to_keep.append('total_value')
        if 'avg_price' in grouped.columns:
            grouped['avg_price'] = grouped['avg_price'].fillna(0)
            cols_to_keep.append('avg_price')

        return grouped[cols_to_keep].to_dict('records')

    def _aggregate_sales_by_month_fast(self, df: pd.DataFrame) -> List[Dict]:
        """Aggregate sales by month for trend analysis - optimized version."""
        if 'month_year' not in df.columns:
            return []

        agg_dict = {'stock_number': 'count'}
        if 'days_to_sell' in df.columns:
            agg_dict['days_to_sell'] = 'mean'
        if 'sale_price' in df.columns:
            agg_dict['sale_price'] = 'sum'

        grouped = df.groupby('month_year').agg(agg_dict).reset_index()

        if 'sale_price' in agg_dict:
            grouped.columns = ['month', 'sold_count', 'avg_days_to_sell', 'total_value']
        elif 'days_to_sell' in agg_dict:
            grouped.columns = ['month', 'sold_count', 'avg_days_to_sell']
        else:
            grouped.columns = ['month', 'sold_count']

        # Sort by month
        grouped = grouped.sort_values('month')

        # Convert to list of dicts - much faster than iterrows
        grouped['name'] = grouped['month'].fillna('Unknown').astype(str)
        grouped['sold_count'] = grouped['sold_count'].astype(int)

        cols_to_keep = ['name', 'sold_count']
        if 'avg_days_to_sell' in grouped.columns:
            cols_to_keep.append('avg_days_to_sell')
        if 'total_value' in grouped.columns:
            grouped['total_value'] = grouped['total_value'].fillna(0)
            cols_to_keep.append('total_value')

        return grouped[cols_to_keep].to_dict('records')

    def _build_aggregation_response(
        self,
        rv_type: str = None,
        dealer_group: str = None,
        manufacturer: str = None,
        condition: str = None,
        state: str = None,
        model: str = None,
        floorplan: str = None,
        min_price: float = None,
        max_price: float = None
    ) -> Dict[str, Any]:
        """Build aggregation response matching AggregatedSummaryResponse format."""
        # Return cached aggregations if no filters applied (instant response)
        if all(f is None for f in [rv_type, dealer_group, manufacturer, condition, state, model, floorplan, min_price, max_price]):
            if self._aggregations_cache:
                return self._aggregations_cache

        inventory = self._cache.get('inventory')
        if inventory is None:
            return self._empty_aggregation_response()

        # Use view instead of copy when possible, only copy if we need to filter
        has_filters = any(f is not None for f in [rv_type, dealer_group, manufacturer, condition, state, model, floorplan, min_price, max_price])
        df = inventory

        if has_filters:
            # Build mask for filtering (more efficient than chained filtering)
            mask = pd.Series(True, index=inventory.index)

            if rv_type:
                values = self._parse_multi_value(rv_type)
                mask &= inventory['rv_type'].isin(values) if len(values) > 1 else (inventory['rv_type'] == values[0])
            if dealer_group:
                values = self._parse_multi_value(dealer_group)
                mask &= inventory['dealer_group'].isin(values) if len(values) > 1 else (inventory['dealer_group'] == values[0])
            if manufacturer:
                values = self._parse_multi_value(manufacturer)
                mask &= inventory['manufacturer'].isin(values) if len(values) > 1 else (inventory['manufacturer'] == values[0])
            if condition:
                values = self._parse_multi_value(condition)
                mask &= inventory['condition'].isin(values) if len(values) > 1 else (inventory['condition'] == values[0])
            if state:
                values = self._parse_multi_value(state)
                mask &= inventory['state'].isin(values) if len(values) > 1 else (inventory['state'] == values[0])
            if model and 'model' in inventory.columns:
                values = self._parse_multi_value(model)
                mask &= inventory['model'].isin(values) if len(values) > 1 else (inventory['model'] == values[0])
            if floorplan and 'floorplan' in inventory.columns:
                values = self._parse_multi_value(floorplan)
                mask &= inventory['floorplan'].isin(values) if len(values) > 1 else (inventory['floorplan'] == values[0])
            if min_price is not None:
                mask &= inventory['price'] >= min_price
            if max_price is not None:
                mask &= inventory['price'] <= max_price

            df = inventory[mask]

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
            'by_rv_type': self._aggregate_by_fast(df, 'rv_type'),
            'by_dealer_group': self._aggregate_by_fast(df, 'dealer_group'),
            'by_manufacturer': self._aggregate_by_fast(df, 'manufacturer'),
            'by_condition': self._aggregate_by_fast(df, 'condition'),
            'by_state': self._aggregate_by_fast(df, 'state', limit=65),
            'by_region': self._aggregate_by_fast(df, 'region') if 'region' in df.columns else [],
            'by_city': self._aggregate_by_fast(df, 'city') if 'city' in df.columns else [],
            'by_county': self._aggregate_by_fast(df, 'county') if 'county' in df.columns else [],
            # Sales velocity data (only compute if filters applied, otherwise use cached)
            'avg_days_to_sell': self._get_avg_days_to_sell_fast(rv_type, dealer_group, manufacturer, condition, state),
            'sales_velocity': self._get_sales_velocity_summary_fast(rv_type, dealer_group, manufacturer, condition, state),
        }

    def _aggregate_by_fast(self, df: pd.DataFrame, column: str, limit: int = None) -> List[Dict]:
        """Aggregate dataframe by column - optimized version using to_dict instead of iterrows."""
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

        # Convert to list of dicts - much faster than iterrows
        grouped = grouped.fillna({'total_value': 0, 'avg_price': 0, 'min_price': 0, 'max_price': 0})
        grouped['name'] = grouped[column].fillna('Unknown').astype(str)
        grouped['count'] = grouped['count'].astype(int)

        return grouped[['name', 'count', 'total_value', 'avg_price', 'min_price', 'max_price', 'avg_days_on_lot']].to_dict('records')

    def _aggregate_sales_by_fast(self, df: pd.DataFrame, column: str) -> List[Dict]:
        """Aggregate sales data by column - optimized version."""
        if column not in df.columns:
            return []

        grouped = df.groupby(column).agg({
            'stock_number': 'count',
            'days_to_sell': 'mean',
            'sale_price': 'mean'
        }).reset_index()
        grouped.columns = ['name', 'sold_count', 'avg_days_to_sell', 'avg_sale_price']
        grouped = grouped.sort_values('sold_count', ascending=False)
        grouped['name'] = grouped['name'].fillna('Unknown').astype(str)
        grouped['sold_count'] = grouped['sold_count'].astype(int)

        return grouped.to_dict('records')

    def _get_avg_days_to_sell_fast(
        self,
        rv_type: str = None,
        dealer_group: str = None,
        manufacturer: str = None,
        condition: str = None,
        state: str = None,
    ) -> Optional[float]:
        """Get average days to sell - returns cached value if no filters."""
        # Return cached if no filters
        if all(f is None for f in [rv_type, dealer_group, manufacturer, condition, state]):
            if self._aggregations_cache:
                return self._aggregations_cache.get('avg_days_to_sell')

        sales = self._cache.get('sales')
        if sales is None or 'days_to_sell' not in sales.columns:
            return None

        # Build mask instead of chained filtering
        mask = pd.Series(True, index=sales.index)
        if rv_type:
            values = self._parse_multi_value(rv_type)
            mask &= sales['rv_type'].isin(values)
        if dealer_group:
            values = self._parse_multi_value(dealer_group)
            mask &= sales['dealer_group'].isin(values)
        if manufacturer:
            values = self._parse_multi_value(manufacturer)
            mask &= sales['manufacturer'].isin(values)
        if condition:
            values = self._parse_multi_value(condition)
            mask &= sales['condition'].isin(values)
        if state:
            values = self._parse_multi_value(state)
            mask &= sales['state'].isin(values)

        filtered = sales[mask]
        if len(filtered) == 0:
            return None

        return float(filtered['days_to_sell'].mean())

    def _get_sales_velocity_summary_fast(
        self,
        rv_type: str = None,
        dealer_group: str = None,
        manufacturer: str = None,
        condition: str = None,
        state: str = None,
    ) -> Dict[str, Any]:
        """Get sales velocity summary - returns cached value if no filters."""
        # Return cached if no filters
        if all(f is None for f in [rv_type, dealer_group, manufacturer, condition, state]):
            if self._aggregations_cache:
                return self._aggregations_cache.get('sales_velocity', {})

        sales = self._cache.get('sales')
        if sales is None or 'days_to_sell' not in sales.columns:
            return {'total_sold': 0, 'avg_days_to_sell': None, 'avg_sale_price': None, 'by_rv_type': [], 'by_condition': []}

        # Build mask instead of chained filtering
        mask = pd.Series(True, index=sales.index)
        if rv_type:
            values = self._parse_multi_value(rv_type)
            mask &= sales['rv_type'].isin(values)
        if dealer_group:
            values = self._parse_multi_value(dealer_group)
            mask &= sales['dealer_group'].isin(values)
        if manufacturer:
            values = self._parse_multi_value(manufacturer)
            mask &= sales['manufacturer'].isin(values)
        if condition:
            values = self._parse_multi_value(condition)
            mask &= sales['condition'].isin(values)
        if state:
            values = self._parse_multi_value(state)
            mask &= sales['state'].isin(values)

        df = sales[mask]
        if len(df) == 0:
            return {'total_sold': 0, 'avg_days_to_sell': None, 'avg_sale_price': None, 'by_rv_type': [], 'by_condition': []}

        return {
            'total_sold': len(df),
            'avg_days_to_sell': float(df['days_to_sell'].mean()),
            'avg_sale_price': float(df['sale_price'].mean()) if 'sale_price' in df.columns else None,
            'by_rv_type': self._aggregate_sales_by_fast(df, 'rv_type'),
            'by_condition': self._aggregate_sales_by_fast(df, 'condition'),
        }

    def _aggregate_by(self, df: pd.DataFrame, column: str, limit: int = None) -> List[Dict]:
        """Aggregate dataframe by column (legacy - use _aggregate_by_fast instead)."""
        return self._aggregate_by_fast(df, column, limit)

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

    def _get_avg_days_to_sell(
        self,
        rv_type: str = None,
        dealer_group: str = None,
        manufacturer: str = None,
        condition: str = None,
        state: str = None,
    ) -> Optional[float]:
        """Get average days to sell with optional filters."""
        sales = self._cache.get('sales')
        if sales is None or 'days_to_sell' not in sales.columns:
            return None

        df = sales.copy()

        # Apply filters (supports comma-separated multi-values)
        df = self._apply_filter(df, 'rv_type', rv_type)
        df = self._apply_filter(df, 'dealer_group', dealer_group)
        df = self._apply_filter(df, 'manufacturer', manufacturer)
        df = self._apply_filter(df, 'condition', condition)
        df = self._apply_filter(df, 'state', state)

        if len(df) == 0:
            return None

        return float(df['days_to_sell'].mean())

    def _get_sales_velocity_summary(
        self,
        rv_type: str = None,
        dealer_group: str = None,
        manufacturer: str = None,
        condition: str = None,
        state: str = None,
    ) -> Dict[str, Any]:
        """Get sales velocity summary with optional filters."""
        sales = self._cache.get('sales')
        if sales is None or 'days_to_sell' not in sales.columns:
            return {
                'total_sold': 0,
                'avg_days_to_sell': None,
                'avg_sale_price': None,
                'by_rv_type': [],
                'by_condition': [],
            }

        df = sales.copy()

        # Apply filters (supports comma-separated multi-values)
        df = self._apply_filter(df, 'rv_type', rv_type)
        df = self._apply_filter(df, 'dealer_group', dealer_group)
        df = self._apply_filter(df, 'manufacturer', manufacturer)
        df = self._apply_filter(df, 'condition', condition)
        df = self._apply_filter(df, 'state', state)

        if len(df) == 0:
            return {
                'total_sold': 0,
                'avg_days_to_sell': None,
                'avg_sale_price': None,
                'by_rv_type': [],
                'by_condition': [],
            }

        # Build summary
        by_rv_type = []
        if 'rv_type' in df.columns:
            velocity = df.groupby('rv_type').agg({
                'stock_number': 'count',
                'days_to_sell': 'mean',
                'sale_price': 'mean'
            }).reset_index()
            velocity.columns = ['name', 'sold_count', 'avg_days_to_sell', 'avg_sale_price']
            velocity = velocity.sort_values('sold_count', ascending=False)
            by_rv_type = velocity.to_dict('records')

        by_condition = []
        if 'condition' in df.columns:
            velocity = df.groupby('condition').agg({
                'stock_number': 'count',
                'days_to_sell': 'mean',
                'sale_price': 'mean'
            }).reset_index()
            velocity.columns = ['name', 'sold_count', 'avg_days_to_sell', 'avg_sale_price']
            by_condition = velocity.to_dict('records')

        return {
            'total_sold': len(df),
            'avg_days_to_sell': float(df['days_to_sell'].mean()),
            'avg_sale_price': float(df['sale_price'].mean()) if 'sale_price' in df.columns else None,
            'by_rv_type': by_rv_type,
            'by_condition': by_condition,
        }

    def get_sales_velocity_filtered(
        self,
        rv_type: str = None,
        dealer_group: str = None,
        manufacturer: str = None,
        condition: str = None,
        state: str = None,
        model: str = None,
        floorplan: str = None,
        start_date: str = None,
        end_date: str = None,
    ) -> Dict[str, Any]:
        """
        Get comprehensive sales velocity data with filters and date range support.

        Returns detailed velocity breakdown by multiple dimensions.
        """
        # Return cached result if no filters applied (instant response)
        if all(f is None for f in [rv_type, dealer_group, manufacturer, condition, state, model, floorplan, start_date, end_date]):
            if self._sales_velocity_cache:
                return self._sales_velocity_cache

        sales = self._cache.get('sales')
        if sales is None:
            return self._empty_sales_velocity_response()

        # Use mask-based filtering instead of chained .copy()
        has_filters = any(f is not None for f in [rv_type, dealer_group, manufacturer, condition, state, model, floorplan, start_date, end_date])

        if has_filters:
            mask = pd.Series(True, index=sales.index)

            if rv_type:
                values = self._parse_multi_value(rv_type)
                mask &= sales['rv_type'].isin(values) if len(values) > 1 else (sales['rv_type'] == values[0])
            if dealer_group:
                values = self._parse_multi_value(dealer_group)
                mask &= sales['dealer_group'].isin(values) if len(values) > 1 else (sales['dealer_group'] == values[0])
            if manufacturer:
                values = self._parse_multi_value(manufacturer)
                mask &= sales['manufacturer'].isin(values) if len(values) > 1 else (sales['manufacturer'] == values[0])
            if condition:
                values = self._parse_multi_value(condition)
                mask &= sales['condition'].isin(values) if len(values) > 1 else (sales['condition'] == values[0])
            if state:
                values = self._parse_multi_value(state)
                mask &= sales['state'].isin(values) if len(values) > 1 else (sales['state'] == values[0])
            if model and 'model' in sales.columns:
                values = self._parse_multi_value(model)
                mask &= sales['model'].isin(values) if len(values) > 1 else (sales['model'] == values[0])
            if floorplan and 'floorplan' in sales.columns:
                values = self._parse_multi_value(floorplan)
                mask &= sales['floorplan'].isin(values) if len(values) > 1 else (sales['floorplan'] == values[0])

            # Apply date filters
            if 'calendar_date' in sales.columns:
                if start_date:
                    try:
                        start_dt = pd.to_datetime(start_date)
                        mask &= pd.to_datetime(sales['calendar_date']) >= start_dt
                    except Exception:
                        pass
                if end_date:
                    try:
                        end_dt = pd.to_datetime(end_date)
                        mask &= pd.to_datetime(sales['calendar_date']) <= end_dt
                    except Exception:
                        pass

            df = sales[mask]
        else:
            df = sales

        if len(df) == 0:
            return self._empty_sales_velocity_response()

        # Build comprehensive response using optimized aggregation methods
        return {
            'total_sold': len(df),
            'avg_days_to_sell': float(df['days_to_sell'].mean()) if 'days_to_sell' in df.columns else None,
            'median_days_to_sell': float(df['days_to_sell'].median()) if 'days_to_sell' in df.columns else None,
            'min_days_to_sell': int(df['days_to_sell'].min()) if 'days_to_sell' in df.columns else None,
            'max_days_to_sell': int(df['days_to_sell'].max()) if 'days_to_sell' in df.columns else None,
            'avg_sale_price': float(df['sale_price'].mean()) if 'sale_price' in df.columns else None,
            'total_sales_value': float(df['sale_price'].sum()) if 'sale_price' in df.columns else None,
            'by_rv_type': self._aggregate_sales_by_fast_v2(df, 'rv_type'),
            'by_condition': self._aggregate_sales_by_fast_v2(df, 'condition'),
            'by_dealer_group': self._aggregate_sales_by_fast_v2(df, 'dealer_group'),
            'by_manufacturer': self._aggregate_sales_by_fast_v2(df, 'manufacturer'),
            'by_state': self._aggregate_sales_by_fast_v2(df, 'state'),
            'by_region': self._aggregate_sales_by_fast_v2(df, 'region') if 'region' in df.columns else [],
            'by_month': self._aggregate_sales_by_month_fast(df) if 'calendar_date' in df.columns else [],
        }

    def _aggregate_sales_by(self, df: pd.DataFrame, column: str, limit: int = None) -> List[Dict]:
        """Aggregate sales data by a column."""
        if column not in df.columns:
            return []

        agg_dict = {'stock_number': 'count'}
        if 'days_to_sell' in df.columns:
            agg_dict['days_to_sell'] = 'mean'
        if 'sale_price' in df.columns:
            agg_dict['sale_price'] = ['sum', 'mean']

        grouped = df.groupby(column).agg(agg_dict).reset_index()

        # Flatten column names
        if 'sale_price' in agg_dict:
            grouped.columns = [column, 'sold_count', 'avg_days_to_sell', 'total_value', 'avg_price']
        elif 'days_to_sell' in agg_dict:
            grouped.columns = [column, 'sold_count', 'avg_days_to_sell']
        else:
            grouped.columns = [column, 'sold_count']

        grouped = grouped.sort_values('sold_count', ascending=False)

        if limit:
            grouped = grouped.head(limit)

        results = []
        for _, row in grouped.iterrows():
            item = {
                'name': str(row[column]) if pd.notna(row[column]) else 'Unknown',
                'sold_count': int(row['sold_count']),
            }
            if 'avg_days_to_sell' in grouped.columns:
                item['avg_days_to_sell'] = float(row['avg_days_to_sell']) if pd.notna(row['avg_days_to_sell']) else None
            if 'total_value' in grouped.columns:
                item['total_value'] = float(row['total_value']) if pd.notna(row['total_value']) else 0
            if 'avg_price' in grouped.columns:
                item['avg_price'] = float(row['avg_price']) if pd.notna(row['avg_price']) else 0
            results.append(item)

        return results

    def _aggregate_sales_by_month(self, df: pd.DataFrame) -> List[Dict]:
        """Aggregate sales by month for trend analysis."""
        if 'month_year' not in df.columns:
            return []

        agg_dict = {'stock_number': 'count'}
        if 'days_to_sell' in df.columns:
            agg_dict['days_to_sell'] = 'mean'
        if 'sale_price' in df.columns:
            agg_dict['sale_price'] = 'sum'

        grouped = df.groupby('month_year').agg(agg_dict).reset_index()

        if 'sale_price' in agg_dict:
            grouped.columns = ['month', 'sold_count', 'avg_days_to_sell', 'total_value']
        elif 'days_to_sell' in agg_dict:
            grouped.columns = ['month', 'sold_count', 'avg_days_to_sell']
        else:
            grouped.columns = ['month', 'sold_count']

        # Sort by month
        grouped = grouped.sort_values('month')

        results = []
        for _, row in grouped.iterrows():
            item = {
                'name': str(row['month']) if pd.notna(row['month']) else 'Unknown',
                'sold_count': int(row['sold_count']),
            }
            if 'avg_days_to_sell' in grouped.columns:
                item['avg_days_to_sell'] = float(row['avg_days_to_sell']) if pd.notna(row['avg_days_to_sell']) else None
            if 'total_value' in grouped.columns:
                item['total_value'] = float(row['total_value']) if pd.notna(row['total_value']) else 0
            results.append(item)

        return results

    def _empty_sales_velocity_response(self) -> Dict[str, Any]:
        """Return empty sales velocity response."""
        return {
            'total_sold': 0,
            'avg_days_to_sell': None,
            'median_days_to_sell': None,
            'min_days_to_sell': None,
            'max_days_to_sell': None,
            'avg_sale_price': None,
            'total_sales_value': None,
            'by_rv_type': [],
            'by_condition': [],
            'by_dealer_group': [],
            'by_manufacturer': [],
            'by_state': [],
            'by_region': [],
            'by_month': [],
        }

    def get_date_range(self) -> Dict[str, str]:
        """Get the available date range in the sales data."""
        sales = self._cache.get('sales')
        if sales is None or 'calendar_date' not in sales.columns:
            return {'min_date': None, 'max_date': None}

        dates = pd.to_datetime(sales['calendar_date'])
        return {
            'min_date': dates.min().strftime('%Y-%m-%d') if not dates.empty else None,
            'max_date': dates.max().strftime('%Y-%m-%d') if not dates.empty else None,
        }

    def get_top_floorplans(
        self,
        start_date: str = None,
        end_date: str = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get top selling floorplans by RV type category.

        Returns top 10 floorplans for each RV type category:
        - CLASS A, CLASS B, CLASS C (Motorized)
        - FIFTH WHEEL (Towable)
        - TRAVEL TRAILER (Towable)
        - Other categories
        """
        sales = self._cache.get('sales')
        if sales is None or 'floorplan' not in sales.columns:
            return self._empty_top_floorplans_response()

        # Use mask-based filtering for date range
        has_date_filters = start_date is not None or end_date is not None

        if has_date_filters and 'calendar_date' in sales.columns:
            mask = pd.Series(True, index=sales.index)
            if start_date:
                try:
                    start_dt = pd.to_datetime(start_date)
                    mask &= pd.to_datetime(sales['calendar_date']) >= start_dt
                except Exception:
                    pass
            if end_date:
                try:
                    end_dt = pd.to_datetime(end_date)
                    mask &= pd.to_datetime(sales['calendar_date']) <= end_dt
                except Exception:
                    pass
            df = sales[mask]
        else:
            df = sales

        if len(df) == 0:
            return self._empty_top_floorplans_response()

        # Define RV type categories
        categories = {
            'CLASS A': ['CLASS A'],
            'CLASS B': ['CLASS B'],
            'CLASS C': ['CLASS C'],
            'FIFTH WHEEL': ['FIFTH WHEEL'],
            'TRAVEL TRAILER': ['TRAVEL TRAILER'],
            'OTHER': []  # Will capture everything else
        }

        # Get all unique RV types
        all_rv_types = df['rv_type'].dropna().unique().tolist() if 'rv_type' in df.columns else []
        categorized = set()
        for cat_types in categories.values():
            categorized.update(cat_types)
        categories['OTHER'] = [t for t in all_rv_types if t not in categorized]

        result = {
            'total_sold': len(df),
            'categories': [],  # Return as array for frontend compatibility
            'date_range': {
                'start_date': start_date,
                'end_date': end_date
            }
        }

        # Build top floorplans for each category
        for category, rv_types in categories.items():
            if not rv_types:
                continue

            cat_df = df[df['rv_type'].isin(rv_types)]
            if len(cat_df) == 0:
                continue

            # Group by floorplan and aggregate
            floorplan_stats = cat_df.groupby(['floorplan', 'manufacturer', 'model']).agg({
                'stock_number': 'count',
                'days_to_sell': 'mean',
                'sale_price': ['sum', 'mean']
            }).reset_index()

            floorplan_stats.columns = ['floorplan', 'manufacturer', 'model', 'sold_count', 'avg_days_to_sell', 'total_value', 'avg_price']
            floorplan_stats = floorplan_stats.sort_values('sold_count', ascending=False).head(limit)

            # Convert to list of dicts - much faster than iterrows
            floorplan_stats['floorplan'] = floorplan_stats['floorplan'].fillna('Unknown').astype(str)
            floorplan_stats['manufacturer'] = floorplan_stats['manufacturer'].fillna('Unknown').astype(str)
            floorplan_stats['model'] = floorplan_stats['model'].fillna('Unknown').astype(str)
            floorplan_stats['sold_count'] = floorplan_stats['sold_count'].astype(int)
            floorplan_stats['total_value'] = floorplan_stats['total_value'].fillna(0)
            floorplan_stats['avg_price'] = floorplan_stats['avg_price'].fillna(0)
            category_items = floorplan_stats[['floorplan', 'manufacturer', 'model', 'sold_count', 'avg_days_to_sell', 'total_value', 'avg_price']].to_dict('records')

            if category_items:
                # Use 'floorplans' key to match frontend TypeScript interface
                result['categories'].append({
                    'category': category,
                    'rv_types': rv_types,
                    'total_sold': int(cat_df['stock_number'].count()),
                    'avg_days_to_sell': float(cat_df['days_to_sell'].mean()) if 'days_to_sell' in cat_df.columns else None,
                    'floorplans': category_items
                })

        return result

    def _empty_top_floorplans_response(self) -> Dict[str, Any]:
        """Return empty top floorplans response."""
        return {
            'total_sold': 0,
            'categories': [],
            'date_range': {'start_date': None, 'end_date': None}
        }
