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

    # =========================================================================
    # REP INTEL PLATFORM ENDPOINTS
    # =========================================================================

    # Thor brands for calculating Thor share
    THOR_BRANDS = [
        'AIRSTREAM', 'JAYCO', 'KEYSTONE', 'HEARTLAND',
        'CRUISER RV', 'DUTCHMEN', 'ENTEGRA', 'DYNAMAX',
        'THOR MOTOR COACH', 'TIFFIN', 'VANLEIGH', 'REDWOOD',
        'HIGHLAND RIDGE', 'GRAND DESIGN', 'CROSSROADS'
    ]

    def _is_thor_brand(self, manufacturer: str) -> bool:
        """Check if a manufacturer is a Thor brand."""
        if not manufacturer:
            return False
        upper = manufacturer.upper()
        return any(brand in upper for brand in self.THOR_BRANDS)

    def get_territory_health_score(
        self,
        region: str = None,
        state: str = None,
    ) -> Dict[str, Any]:
        """
        Calculate territory health score (0-100) based on:
        - Thor share (0-25 points)
        - Sales velocity (0-25 points)
        - Inventory freshness (0-25 points)
        - Opportunity capture (0-25 points)
        """
        inventory = self._cache.get('inventory')
        sales = self._cache.get('sales')

        if inventory is None:
            return self._empty_health_score_response()

        # Apply territory filters
        df = inventory
        if region:
            df = df[df['region'] == region]
        if state:
            df = df[df['state'] == state]

        if len(df) == 0:
            return self._empty_health_score_response()

        # Calculate Thor share score (0-25)
        thor_units = df[df['manufacturer'].apply(self._is_thor_brand)].shape[0]
        total_units = len(df)
        thor_share_percent = (thor_units / total_units * 100) if total_units > 0 else 0
        thor_share_score = min(25, thor_share_percent)  # Max 25 points at 25%+ share

        # Calculate velocity score (0-25) - based on avg days to sell vs market
        sales_df = sales
        if sales_df is not None and len(sales_df) > 0:
            if region and 'region' in sales_df.columns:
                sales_df = sales_df[sales_df['region'] == region]
            if state and 'state' in sales_df.columns:
                sales_df = sales_df[sales_df['state'] == state]

            if 'days_to_sell' in sales_df.columns and len(sales_df) > 0:
                avg_days = sales_df['days_to_sell'].mean()
                # Score: 25 at 30 days, 0 at 90 days
                velocity_score = max(0, min(25, 25 - ((avg_days - 30) / 60 * 25)))
            else:
                velocity_score = 12.5  # Default middle score
        else:
            velocity_score = 12.5

        # Calculate freshness score (0-25) - based on avg days on lot
        if 'days_on_lot' in df.columns:
            avg_days_on_lot = df['days_on_lot'].mean()
            # Score: 25 at 30 days, 0 at 120 days
            freshness_score = max(0, min(25, 25 - ((avg_days_on_lot - 30) / 90 * 25)))
        else:
            freshness_score = 12.5

        # Calculate opportunity score (0-25) - based on coverage of RV types
        if 'rv_type' in df.columns:
            rv_types_covered = df['rv_type'].nunique()
            total_rv_types = 9  # Total RV types in market
            opportunity_score = min(25, (rv_types_covered / total_rv_types) * 25)
        else:
            opportunity_score = 12.5

        total_score = round(thor_share_score + velocity_score + freshness_score + opportunity_score)

        return {
            'score': total_score,
            'max_score': 100,
            'trend': 'up' if total_score >= 70 else 'flat' if total_score >= 50 else 'down',
            'trend_value': 3,  # Placeholder - would need historical data
            'components': {
                'thor_share': round(thor_share_score, 1),
                'velocity': round(velocity_score, 1),
                'freshness': round(freshness_score, 1),
                'opportunities': round(opportunity_score, 1),
            },
            'metrics': {
                'thor_share_percent': round(thor_share_percent, 1),
                'thor_units': thor_units,
                'total_units': total_units,
                'avg_days_on_lot': round(df['days_on_lot'].mean(), 1) if 'days_on_lot' in df.columns else None,
                'total_dealers': df['dealer_group'].nunique() if 'dealer_group' in df.columns else 0,
            }
        }

    def _empty_health_score_response(self) -> Dict[str, Any]:
        """Return empty health score response."""
        return {
            'score': 0,
            'max_score': 100,
            'trend': 'flat',
            'trend_value': 0,
            'components': {
                'thor_share': 0,
                'velocity': 0,
                'freshness': 0,
                'opportunities': 0,
            },
            'metrics': {
                'thor_share_percent': 0,
                'thor_units': 0,
                'total_units': 0,
                'avg_days_on_lot': None,
                'total_dealers': 0,
            }
        }

    def get_priority_dealers(
        self,
        region: str = None,
        state: str = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get priority dealers ranked by opportunity score.
        """
        inventory = self._cache.get('inventory')

        if inventory is None:
            return []

        # Apply territory filters
        df = inventory
        if region:
            df = df[df['region'] == region]
        if state:
            df = df[df['state'] == state]

        if len(df) == 0:
            return []

        # Market averages for comparison
        market_thor_share = df[df['manufacturer'].apply(self._is_thor_brand)].shape[0] / len(df) * 100
        market_avg_days = df['days_on_lot'].mean() if 'days_on_lot' in df.columns else 45

        # Group by dealer
        dealers = []
        for dealer_group, group in df.groupby('dealer_group'):
            if pd.isna(dealer_group):
                continue

            total_units = len(group)
            total_value = group['price'].sum() if 'price' in group.columns else 0
            avg_price = group['price'].mean() if 'price' in group.columns else 0
            avg_days_on_lot = group['days_on_lot'].mean() if 'days_on_lot' in group.columns else 0

            # Calculate Thor share at this dealer
            thor_units = group[group['manufacturer'].apply(self._is_thor_brand)].shape[0]
            thor_share = (thor_units / total_units * 100) if total_units > 0 else 0

            # Calculate opportunity score (0-100)
            score_components = []

            # Thor share gap (up to 40 points if low Thor share)
            thor_gap = max(0, market_thor_share - thor_share)
            thor_score = min(40, thor_gap * 2)
            score_components.append(thor_score)

            # Aging inventory (up to 30 points if high aging)
            if avg_days_on_lot > 60:
                aging_score = min(30, (avg_days_on_lot - 60) / 2)
            else:
                aging_score = 0
            score_components.append(aging_score)

            # Inventory size (up to 20 points for larger dealers)
            size_score = min(20, total_units / 50)
            score_components.append(size_score)

            # RV type coverage gap (up to 10 points)
            rv_types_at_dealer = group['rv_type'].nunique() if 'rv_type' in group.columns else 0
            coverage_score = max(0, 10 - rv_types_at_dealer)
            score_components.append(coverage_score)

            opportunity_score = sum(score_components)

            # Determine risk level
            if thor_share < market_thor_share * 0.5 or avg_days_on_lot > 90:
                risk_level = 'high'
            elif thor_share < market_thor_share * 0.75 or avg_days_on_lot > 60:
                risk_level = 'medium'
            else:
                risk_level = 'low'

            # Determine recommended action
            if avg_days_on_lot > 90:
                recommended_action = 'visit'
            elif thor_share < market_thor_share * 0.5:
                recommended_action = 'call'
            else:
                recommended_action = 'monitor'

            # Get location info
            location = group['city'].iloc[0] if 'city' in group.columns and pd.notna(group['city'].iloc[0]) else ''
            state_val = group['state'].iloc[0] if 'state' in group.columns else ''

            dealers.append({
                'id': str(dealer_group),
                'name': str(dealer_group),
                'location': f"{location}, {state_val}" if location else state_val,
                'state': state_val,
                'total_units': int(total_units),
                'total_value': float(total_value),
                'avg_price': float(avg_price),
                'avg_days_on_lot': round(avg_days_on_lot, 1),
                'thor_units': int(thor_units),
                'thor_share': round(thor_share, 1),
                'opportunity_score': round(opportunity_score),
                'risk_level': risk_level,
                'recommended_action': recommended_action,
                'top_opportunity': self._get_top_opportunity(group, thor_share, market_thor_share),
            })

        # Sort by opportunity score descending
        dealers.sort(key=lambda x: x['opportunity_score'], reverse=True)

        return dealers[:limit]

    def _get_top_opportunity(self, dealer_df: pd.DataFrame, thor_share: float, market_thor_share: float) -> str:
        """Generate top opportunity text for a dealer."""
        # Check for aging Thor units
        if 'days_on_lot' in dealer_df.columns:
            aging_thor = dealer_df[
                (dealer_df['manufacturer'].apply(self._is_thor_brand)) &
                (dealer_df['days_on_lot'] > 90)
            ]
            if len(aging_thor) > 0:
                return f"Thor units aging 90+ days ({len(aging_thor)} units)"

        # Check for low Thor share
        if thor_share < market_thor_share * 0.5:
            return "Thor share significantly below market average"

        # Check for missing RV types
        if 'rv_type' in dealer_df.columns:
            current_types = set(dealer_df['rv_type'].dropna().unique())
            all_types = {'TRAVEL TRAILER', 'FIFTH WHEEL', 'CLASS A', 'CLASS B', 'CLASS C'}
            missing = all_types - current_types
            if 'CLASS B' in missing:
                return "No Class B inventory - Thor Sequence opportunity"
            if missing:
                return f"Missing RV types: {', '.join(list(missing)[:2])}"

        return "Strengthen partnership with volume incentives"

    def get_territory_alerts(
        self,
        region: str = None,
        state: str = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """Get AI-generated alerts for the territory."""
        inventory = self._cache.get('inventory')

        if inventory is None:
            return []

        # Apply territory filters
        df = inventory
        if region:
            df = df[df['region'] == region]
        if state:
            df = df[df['state'] == state]

        alerts = []
        alert_id = 1

        # Check for aging Thor inventory (90+ days)
        if 'days_on_lot' in df.columns:
            aging_thor = df[
                (df['manufacturer'].apply(self._is_thor_brand)) &
                (df['days_on_lot'] > 90)
            ]
            if len(aging_thor) > 0:
                top_dealer = aging_thor.groupby('dealer_group').size().idxmax()
                count_at_dealer = aging_thor[aging_thor['dealer_group'] == top_dealer].shape[0]
                alerts.append({
                    'id': str(alert_id),
                    'type': 'warning',
                    'priority': 'high',
                    'message': f"{count_at_dealer} Thor units aged 90+ days at {top_dealer}",
                    'dealer': str(top_dealer),
                    'dealer_group': str(top_dealer),
                    'action': 'Review aging inventory',
                    'metric_value': count_at_dealer,
                })
                alert_id += 1

        # Check for dealers with low Thor share
        for dealer_group, group in df.groupby('dealer_group'):
            if pd.isna(dealer_group):
                continue

            total = len(group)
            thor_units = group[group['manufacturer'].apply(self._is_thor_brand)].shape[0]
            thor_share = (thor_units / total * 100) if total > 0 else 0

            if thor_share < 10 and total > 50:
                alerts.append({
                    'id': str(alert_id),
                    'type': 'risk',
                    'priority': 'high',
                    'message': f"{dealer_group}: Thor share only {thor_share:.1f}%",
                    'dealer': str(dealer_group),
                    'dealer_group': str(dealer_group),
                    'action': 'Schedule dealer visit',
                    'metric_value': round(thor_share, 1),
                })
                alert_id += 1
                if len(alerts) >= limit:
                    break

        # Check for Class B opportunity
        dealers_without_class_b = []
        for dealer_group, group in df.groupby('dealer_group'):
            if pd.isna(dealer_group):
                continue
            if 'rv_type' in group.columns:
                rv_types = set(group['rv_type'].dropna().unique())
                if 'CLASS B' not in rv_types and len(group) > 30:
                    dealers_without_class_b.append(dealer_group)

        if dealers_without_class_b and len(alerts) < limit:
            dealer = dealers_without_class_b[0]
            alerts.append({
                'id': str(alert_id),
                'type': 'opportunity',
                'priority': 'medium',
                'message': f"{dealer}: Class B opportunity identified",
                'dealer': str(dealer),
                'dealer_group': str(dealer),
                'action': 'Present Thor Sequence lineup',
                'metric_value': len(dealers_without_class_b),
            })

        return alerts[:limit]

    def get_pricing_analysis(
        self,
        dealer_group: str = None,
        rv_type: str = None,
        condition: str = None,
        threshold_percent: float = 10.0,
    ) -> Dict[str, Any]:
        """Get pricing analysis with overpriced/underpriced units."""
        inventory = self._cache.get('inventory')

        if inventory is None:
            return self._empty_pricing_response()

        df = inventory.copy()

        # Apply filters
        if dealer_group:
            df = self._apply_filter(df, 'dealer_group', dealer_group)
        if rv_type:
            df = self._apply_filter(df, 'rv_type', rv_type)
        if condition:
            df = self._apply_filter(df, 'condition', condition)

        if len(df) == 0 or 'price' not in df.columns:
            return self._empty_pricing_response()

        # Calculate median prices by model
        group_col = 'model' if 'model' in df.columns else 'manufacturer'
        median_prices = df.groupby(group_col)['price'].median()

        # Calculate over/under for each unit
        df['median_price'] = df[group_col].map(median_prices)
        df['price_diff'] = df['price'] - df['median_price']
        df['price_diff_percent'] = (df['price_diff'] / df['median_price'] * 100).fillna(0)

        # Identify overpriced and underpriced
        overpriced_mask = df['price_diff_percent'] > threshold_percent
        underpriced_mask = df['price_diff_percent'] < -threshold_percent

        overpriced_df = df[overpriced_mask].nlargest(20, 'price_diff_percent')
        underpriced_df = df[underpriced_mask].nsmallest(20, 'price_diff_percent')

        overpriced_units = []
        for _, row in overpriced_df.iterrows():
            overpriced_units.append({
                'stock_number': row.get('stock_number', ''),
                'dealer': row.get('dealership', ''),
                'dealer_group': row.get('dealer_group', ''),
                'model': f"{row.get('model_year', '')} {row.get('manufacturer', '')} {row.get('model', '')}".strip(),
                'condition': row.get('condition', ''),
                'price': float(row['price']),
                'median_price': float(row['median_price']),
                'amount_over': float(row['price_diff']),
                'percent_over': round(row['price_diff_percent'], 1),
                'days_on_lot': int(row['days_on_lot']) if pd.notna(row.get('days_on_lot')) else None,
            })

        underpriced_units = []
        for _, row in underpriced_df.iterrows():
            underpriced_units.append({
                'stock_number': row.get('stock_number', ''),
                'dealer': row.get('dealership', ''),
                'dealer_group': row.get('dealer_group', ''),
                'model': f"{row.get('model_year', '')} {row.get('manufacturer', '')} {row.get('model', '')}".strip(),
                'condition': row.get('condition', ''),
                'price': float(row['price']),
                'median_price': float(row['median_price']),
                'amount_under': abs(float(row['price_diff'])),
                'percent_under': abs(round(row['price_diff_percent'], 1)),
                'potential_gain': abs(float(row['price_diff'])) * 0.8,
            })

        return {
            'total_units': len(df),
            'avg_price': float(df['price'].mean()),
            'median_price': float(df['price'].median()),
            'min_price': float(df['price'].min()),
            'max_price': float(df['price'].max()),
            'overpriced_count': int(overpriced_mask.sum()),
            'underpriced_count': int(underpriced_mask.sum()),
            'threshold_percent': threshold_percent,
            'overpriced_units': overpriced_units,
            'underpriced_units': underpriced_units,
        }

    def _empty_pricing_response(self) -> Dict[str, Any]:
        """Return empty pricing response."""
        return {
            'total_units': 0,
            'avg_price': 0,
            'median_price': 0,
            'min_price': 0,
            'max_price': 0,
            'overpriced_count': 0,
            'underpriced_count': 0,
            'threshold_percent': 10.0,
            'overpriced_units': [],
            'underpriced_units': [],
        }

    def get_aging_analysis(
        self,
        dealer_group: str = None,
        rv_type: str = None,
        condition: str = None,
    ) -> Dict[str, Any]:
        """Get aging inventory analysis with bracket breakdown."""
        inventory = self._cache.get('inventory')

        if inventory is None or 'days_on_lot' not in inventory.columns:
            return self._empty_aging_response()

        df = inventory.copy()

        # Apply filters
        if dealer_group:
            df = self._apply_filter(df, 'dealer_group', dealer_group)
        if rv_type:
            df = self._apply_filter(df, 'rv_type', rv_type)
        if condition:
            df = self._apply_filter(df, 'condition', condition)

        if len(df) == 0:
            return self._empty_aging_response()

        # Calculate brackets
        brackets = {
            'fresh': int(((df['days_on_lot'] >= 0) & (df['days_on_lot'] <= 30)).sum()),
            'normal': int(((df['days_on_lot'] > 30) & (df['days_on_lot'] <= 60)).sum()),
            'aging': int(((df['days_on_lot'] > 60) & (df['days_on_lot'] <= 90)).sum()),
            'stale': int(((df['days_on_lot'] > 90) & (df['days_on_lot'] <= 120)).sum()),
            'critical': int((df['days_on_lot'] > 120).sum()),
        }

        total = len(df)
        bracket_percentages = {k: round(v / total * 100, 1) for k, v in brackets.items()}

        # Get critical units
        critical_df = df[df['days_on_lot'] > 120].nlargest(20, 'days_on_lot')
        critical_units = []
        for _, row in critical_df.iterrows():
            critical_units.append({
                'stock_number': row.get('stock_number', ''),
                'dealer': row.get('dealership', ''),
                'dealer_group': row.get('dealer_group', ''),
                'model': f"{row.get('model_year', '')} {row.get('manufacturer', '')} {row.get('model', '')}".strip(),
                'condition': row.get('condition', ''),
                'days_on_lot': int(row['days_on_lot']),
                'price': float(row['price']) if pd.notna(row.get('price')) else None,
            })

        # Aging by condition
        by_condition = []
        if 'condition' in df.columns:
            for cond, group in df.groupby('condition'):
                if pd.isna(cond):
                    continue
                by_condition.append({
                    'name': str(cond),
                    'total_units': len(group),
                    'avg_days_on_lot': round(group['days_on_lot'].mean(), 1),
                    'critical_count': int((group['days_on_lot'] > 120).sum()),
                })

        # Aging by RV type
        by_rv_type = []
        if 'rv_type' in df.columns:
            for rv, group in df.groupby('rv_type'):
                if pd.isna(rv):
                    continue
                by_rv_type.append({
                    'name': str(rv),
                    'total_units': len(group),
                    'avg_days_on_lot': round(group['days_on_lot'].mean(), 1),
                    'critical_count': int((group['days_on_lot'] > 120).sum()),
                    'total_value': float(group['price'].sum()) if 'price' in group.columns else 0,
                })
            by_rv_type.sort(key=lambda x: x['avg_days_on_lot'], reverse=True)

        # Aging by dealer
        by_dealer = []
        if 'dealer_group' in df.columns:
            for dealer, group in df.groupby('dealer_group'):
                if pd.isna(dealer):
                    continue
                critical_count = int((group['days_on_lot'] > 120).sum())
                critical_value = float(group[group['days_on_lot'] > 120]['price'].sum()) if 'price' in group.columns else 0
                by_dealer.append({
                    'name': str(dealer),
                    'total_units': len(group),
                    'avg_days_on_lot': round(group['days_on_lot'].mean(), 1),
                    'critical_count': critical_count,
                    'critical_value': critical_value,
                })
            by_dealer.sort(key=lambda x: x['avg_days_on_lot'], reverse=True)

        # Find oldest unit
        oldest_idx = df['days_on_lot'].idxmax()
        oldest_row = df.loc[oldest_idx]
        oldest_unit = {
            'stock_number': oldest_row.get('stock_number', ''),
            'days_on_lot': int(oldest_row['days_on_lot']),
            'model': f"{oldest_row.get('model_year', '')} {oldest_row.get('manufacturer', '')} {oldest_row.get('model', '')}".strip(),
        }

        return {
            'total_units': total,
            'avg_days_on_lot': round(df['days_on_lot'].mean(), 1),
            'brackets': brackets,
            'bracket_percentages': bracket_percentages,
            'critical_value': float(df[df['days_on_lot'] > 120]['price'].sum()) if 'price' in df.columns else 0,
            'oldest_unit': oldest_unit,
            'critical_units': critical_units[:20],
            'by_condition': by_condition,
            'by_rv_type': by_rv_type[:10],
            'by_dealer': by_dealer[:10],
        }

    def _empty_aging_response(self) -> Dict[str, Any]:
        """Return empty aging response."""
        return {
            'total_units': 0,
            'avg_days_on_lot': 0,
            'brackets': {'fresh': 0, 'normal': 0, 'aging': 0, 'stale': 0, 'critical': 0},
            'bracket_percentages': {'fresh': 0, 'normal': 0, 'aging': 0, 'stale': 0, 'critical': 0},
            'critical_value': 0,
            'oldest_unit': None,
            'critical_units': [],
            'by_condition': [],
            'by_rv_type': [],
            'by_dealer': [],
        }

    def get_dealer_opportunities(self, dealer_group: str) -> List[Dict[str, Any]]:
        """Get opportunities specific to a dealer."""
        inventory = self._cache.get('inventory')

        if inventory is None or not dealer_group:
            return []

        df = inventory[inventory['dealer_group'] == dealer_group]
        if len(df) == 0:
            return []

        opportunities = []
        opp_id = 1

        # Market averages
        market_thor_share = inventory[inventory['manufacturer'].apply(self._is_thor_brand)].shape[0] / len(inventory) * 100
        market_avg_days = inventory['days_on_lot'].mean() if 'days_on_lot' in inventory.columns else 45

        # Dealer metrics
        thor_units = df[df['manufacturer'].apply(self._is_thor_brand)].shape[0]
        thor_share = (thor_units / len(df) * 100) if len(df) > 0 else 0
        avg_days = df['days_on_lot'].mean() if 'days_on_lot' in df.columns else 0

        # Check for aging Thor units
        if 'days_on_lot' in df.columns:
            aging_thor = df[
                (df['manufacturer'].apply(self._is_thor_brand)) &
                (df['days_on_lot'] > 90)
            ]
            if len(aging_thor) > 0:
                opportunities.append({
                    'id': str(opp_id),
                    'type': 'aging_risk',
                    'headline': 'Thor units aging on lot',
                    'detail': f"{len(aging_thor)} Thor units have been on lot 90+ days",
                    'priority': 'high',
                    'suggested_action': 'Review aging inventory and discuss promotional options',
                    'potential_value': float(aging_thor['price'].sum()) if 'price' in aging_thor.columns else 0,
                })
                opp_id += 1

        # Check Thor share vs market
        if thor_share < market_thor_share - 5:
            opportunities.append({
                'id': str(opp_id),
                'type': 'share_recovery',
                'headline': 'Thor share below market average',
                'detail': f"Thor share is {thor_share:.1f}% vs market {market_thor_share:.1f}%",
                'priority': 'high',
                'suggested_action': 'Discuss competitive positioning and incentives',
                'potential_value': None,
            })
            opp_id += 1

        # Check for missing RV types
        if 'rv_type' in df.columns:
            current_types = set(df['rv_type'].dropna().unique())
            all_types = {'TRAVEL TRAILER', 'FIFTH WHEEL', 'CLASS A', 'CLASS B', 'CLASS C'}
            missing = all_types - current_types

            if 'CLASS B' in missing:
                opportunities.append({
                    'id': str(opp_id),
                    'type': 'inventory_gap',
                    'headline': 'No Class B inventory',
                    'detail': 'Dealer has no Class B units. Thor Sequence is trending.',
                    'priority': 'medium',
                    'suggested_action': 'Present Thor Sequence lineup',
                    'potential_value': None,
                })
                opp_id += 1

        # Check velocity vs market
        if avg_days > market_avg_days + 15:
            opportunities.append({
                'id': str(opp_id),
                'type': 'velocity_mismatch',
                'headline': 'Inventory turning slower than market',
                'detail': f"Avg {avg_days:.0f} days on lot vs market {market_avg_days:.0f} days",
                'priority': 'medium',
                'suggested_action': 'Review pricing and marketing support',
                'potential_value': None,
            })

        return opportunities

    def get_dealer_talking_points(self, dealer_group: str) -> List[Dict[str, Any]]:
        """Get auto-generated talking points for a dealer meeting."""
        inventory = self._cache.get('inventory')

        if inventory is None or not dealer_group:
            return []

        df = inventory[inventory['dealer_group'] == dealer_group]
        if len(df) == 0:
            return []

        talking_points = []

        # Market averages
        market_avg_days = inventory['days_on_lot'].mean() if 'days_on_lot' in inventory.columns else 45
        market_thor_share = inventory[inventory['manufacturer'].apply(self._is_thor_brand)].shape[0] / len(inventory) * 100

        # Dealer metrics
        thor_units = df[df['manufacturer'].apply(self._is_thor_brand)].shape[0]
        thor_share = (thor_units / len(df) * 100) if len(df) > 0 else 0
        avg_days = df['days_on_lot'].mean() if 'days_on_lot' in df.columns else 0

        # Positive: Good velocity
        if avg_days < market_avg_days - 5:
            talking_points.append({
                'category': 'positive',
                'headline': 'Units turning faster than market',
                'detail': f"Your average turn time is {avg_days:.0f} days vs market {market_avg_days:.0f} days",
                'supporting_data': f'{len(df)} total units in inventory',
            })

        # Positive: Strong Thor presence
        if thor_share > market_thor_share:
            talking_points.append({
                'category': 'positive',
                'headline': 'Strong Thor partnership',
                'detail': f"Thor brands represent {thor_share:.1f}% of your inventory",
                'supporting_data': f'{thor_units} Thor units',
            })

        # Concern: Aging inventory
        if avg_days > market_avg_days + 10:
            talking_points.append({
                'category': 'concern',
                'headline': 'Some units aging on lot',
                'detail': f"Average days on lot is {avg_days:.0f}. Let's look at aged units.",
                'supporting_data': f'{len(df)} total units',
            })

        # Opportunity: Missing segments
        if 'rv_type' in df.columns:
            current_types = set(df['rv_type'].dropna().unique())
            if 'CLASS B' not in current_types:
                talking_points.append({
                    'category': 'opportunity',
                    'headline': 'Class B segment opportunity',
                    'detail': 'No Class B inventory. Thor Sequence is our fastest-selling Class B.',
                    'supporting_data': 'Van market up 15% YoY',
                })

        # Condition mix analysis
        if 'condition' in df.columns:
            new_count = len(df[df['condition'] == 'NEW'])
            new_pct = (new_count / len(df) * 100) if len(df) > 0 else 0
            if new_pct < 50:
                talking_points.append({
                    'category': 'concern',
                    'headline': 'New inventory mix below industry average',
                    'detail': f"Only {new_pct:.0f}% new units. Industry average is 60%+",
                    'supporting_data': f'{new_count} new units, {len(df) - new_count} used',
                })

        return talking_points
