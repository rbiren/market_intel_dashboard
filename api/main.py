"""
FastAPI backend for Fabric GraphQL API queries.
Serves inventory data from gold tables to the React frontend.

Run with: uvicorn main:app --reload --port 8000

Environment variables:
    USE_DELTALAKE=true  - Use Delta Lake direct access (50s startup)
    USE_DELTALAKE=false - Use GraphQL API (20-25 min startup, default)
"""

import os
from datetime import datetime
from typing import Optional, List
from collections import defaultdict

import requests
from azure.identity import DefaultAzureCredential
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Check if we should use Delta Lake instead of GraphQL
USE_DELTALAKE = os.getenv('USE_DELTALAKE', 'false').lower() == 'true'

if USE_DELTALAKE:
    from deltalake_adapter import DeltaLakeClient

# Configuration
WORKSPACE_ID = "9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc"
GRAPHQL_ID = "5c282d47-9d39-475c-ba43-5145fdc021b8"
GRAPHQL_ENDPOINT = f"https://{WORKSPACE_ID.replace('-', '')}.z9c.graphql.fabric.microsoft.com/v1/workspaces/{WORKSPACE_ID}/graphqlapis/{GRAPHQL_ID}/graphql"


app = FastAPI(
    title="RV Market Intelligence API",
    description="Fabric GraphQL API for RV inventory data",
    version="3.0.0"
)

# CORS - allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175", "http://localhost:5176", "http://localhost:5177", "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FabricGraphQLClient:
    """Client for querying Fabric GraphQL API with caching."""

    _instance = None
    _token = None
    _token_expires = None

    # Caches for dimension tables
    _products_cache = None  # {dim_product_model_skey: {rv_type, manufacturer, model}}
    _floorplan_cache = None  # {dim_product_skey: {floorplan}}
    _dealers_cache = None   # {dim_dealership_skey: {dealer_group, state, dealership}}
    _cache_loaded = False

    # Cache for aggregated results (computed at startup)
    _aggregations_cache = None

    # Cache for filtered aggregations (pre-computed for common filters)
    _filtered_aggregations_cache = None  # {"condition:NEW": {...}, "rv_type:TRAVEL TRAILER": {...}}

    # Cache for inventory data (for fast filtered queries)
    _inventory_cache = None  # List of inventory items with joined dimension data

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.credential = DefaultAzureCredential()
        return cls._instance

    def _get_token(self):
        """Get or refresh the access token."""
        now = datetime.now().timestamp()
        if self._token is None or (self._token_expires and now > self._token_expires - 300):
            print("DEBUG: Getting new token...")
            token_response = self.credential.get_token("https://analysis.windows.net/powerbi/api/.default")
            self._token = token_response.token
            self._token_expires = token_response.expires_on
            print(f"DEBUG: Token obtained, expires at {self._token_expires}")
        return self._token

    def execute_query(self, query: str, variables: dict = None) -> dict:
        """Execute a GraphQL query and return results."""
        headers = {
            "Authorization": f"Bearer {self._get_token()}",
            "Content-Type": "application/json"
        }

        payload = {"query": query}
        if variables:
            payload["variables"] = variables

        print(f"DEBUG: Calling endpoint: {GRAPHQL_ENDPOINT}")
        response = requests.post(GRAPHQL_ENDPOINT, headers=headers, json=payload)
        print(f"DEBUG: Response status: {response.status_code}")

        if response.status_code != 200:
            raise Exception(f"GraphQL request failed: {response.status_code} - {response.text}")

        result = response.json()
        if "errors" in result:
            print(f"DEBUG: Full response: {result}")
            raise Exception(f"GraphQL errors: {result['errors']}")

        return result.get("data", {})

    def load_cache(self):
        """Load all products and dealers into cache. Call once at startup or on first request."""
        if self._cache_loaded:
            return

        print("Loading dimension table caches...")
        start = datetime.now()

        # Load all products (up to 100k)
        self._products_cache = {}
        query = """
        {
            dim_product_models(first: 100000) {
                items {
                    dim_product_model_skey
                    rv_type
                    manufacturer
                    model
                }
            }
        }
        """
        result = self.execute_query(query)
        items = result.get("dim_product_models", {}).get("items", [])
        for p in items:
            self._products_cache[p["dim_product_model_skey"]] = {
                "rv_type": p.get("rv_type"),
                "manufacturer": p.get("manufacturer"),
                "model": p.get("model")
            }
        print(f"  Loaded {len(self._products_cache)} product models")

        # Load all floorplans from dim_products (separate table with dim_product_skey)
        self._floorplan_cache = {}
        query = """
        {
            dim_products(first: 100000) {
                items {
                    dim_product_skey
                    floorplan
                }
            }
        }
        """
        result = self.execute_query(query)
        items = result.get("dim_products", {}).get("items", [])
        for p in items:
            self._floorplan_cache[p["dim_product_skey"]] = {
                "floorplan": p.get("floorplan")
            }
        print(f"  Loaded {len(self._floorplan_cache)} floorplans")

        # Load all dealers (up to 10k)
        self._dealers_cache = {}
        query = """
        {
            dim_dealerships(first: 10000) {
                items {
                    dim_dealership_skey
                    dealer_group
                    state
                    dealership
                    region
                    city
                    county
                }
            }
        }
        """
        result = self.execute_query(query)
        items = result.get("dim_dealerships", {}).get("items", [])
        for d in items:
            self._dealers_cache[d["dim_dealership_skey"]] = {
                "dealer_group": d.get("dealer_group"),
                "state": d.get("state"),
                "dealership": d.get("dealership"),
                "region": d.get("region"),
                "city": d.get("city"),
                "county": d.get("county")
            }
        print(f"  Loaded {len(self._dealers_cache)} dealers")

        self._cache_loaded = True
        elapsed = (datetime.now() - start).total_seconds()
        print(f"Cache loaded: {len(self._products_cache)} product models, {len(self._floorplan_cache)} floorplans, {len(self._dealers_cache)} dealers in {elapsed:.1f}s")

    def get_product(self, skey):
        """Get product from cache."""
        if not self._cache_loaded:
            self.load_cache()
        return self._products_cache.get(skey, {})

    def get_dealer(self, skey):
        """Get dealer from cache."""
        if not self._cache_loaded:
            self.load_cache()
        return self._dealers_cache.get(skey, {})

    def fetch_dimension_data_for_skeys(self, table_name: str, key_field: str, skeys: list, fields: list) -> dict:
        """Fetch dimension data for specific skeys using batch queries.

        This ensures we get dimension data for ALL skeys found in inventory,
        not just those in the pre-loaded cache (which may be limited to 100k).
        """
        results = {}
        if not skeys:
            return results

        BATCH_SIZE = 100  # GraphQL IN operator limit
        fields_str = "\n                        ".join(fields)
        unique_skeys = list(set(skeys))  # Deduplicate

        print(f"  Fetching {table_name} data for {len(unique_skeys)} skeys in {len(unique_skeys) // BATCH_SIZE + 1} batches...")

        for i in range(0, len(unique_skeys), BATCH_SIZE):
            batch = unique_skeys[i:i + BATCH_SIZE]
            batch_str = ', '.join(str(k) for k in batch)

            query = f"""
            {{
                {table_name}(first: 1000, filter: {{ {key_field}: {{ in: [{batch_str}] }} }}) {{
                    items {{
                        {fields_str}
                    }}
                }}
            }}
            """
            result = self.execute_query(query)
            items = result.get(table_name, {}).get("items", [])
            for item in items:
                results[item[key_field]] = {f: item.get(f) for f in fields}

        print(f"  Fetched {len(results)} {table_name} records")
        return results

    def list_dealers(self) -> list[str]:
        """Get list of available dealers from CACHED dim_dealerships - instant!"""
        # Ensure cache is loaded
        self.load_cache()

        # Get unique dealership names from cache
        dealers = list(set(d.get("dealership") for d in self._dealers_cache.values() if d.get("dealership")))
        dealers.sort()
        return dealers

    def fetch_all_inventory(self, fields: list[str], filter_str: str = "", include_nested: bool = False) -> list[dict]:
        """Fetch inventory records (max 100k - Fabric's limit).

        Args:
            fields: List of fact_inventory_currents fields to fetch
            filter_str: GraphQL filter string (e.g. ', filter: { condition: { eq: "NEW" } }')
            include_nested: If True, includes nested dim_product_models and dim_dealerships via relationships
        """
        fields_str = "\n                    ".join(fields)

        # Add nested dimension data if relationships are configured
        # NOTE: Excludes manufacturer_logo_small to avoid 64MB response limit on bulk fetches
        nested_str = ""
        if include_nested:
            nested_str = """
                    dim_product_models {
                        rv_type
                        manufacturer
                        model
                        model_year
                        floorplan
                    }
                    dim_dealerships {
                        dealer_group
                        state
                        dealership
                        city
                    }"""

        # When using nested queries, fetch in batches to avoid timeout
        # Fabric API times out on large nested queries
        if include_nested:
            all_items = []
            batch_size = 50000
            # Fetch two batches to get ~100k records
            for offset in [0, 50000]:
                # Use price ordering with offset simulation via condition filter
                if offset == 0:
                    batch_filter = filter_str
                else:
                    # Get items with lower prices (second batch)
                    # Skip items we already have by using price < min price from first batch
                    if all_items:
                        min_price = min(item.get("price") or 0 for item in all_items)
                        batch_filter = f', filter: {{ price: {{ lt: {min_price} }} }}'
                    else:
                        batch_filter = filter_str

                query = f"""
                {{
                    fact_inventory_currents(first: {batch_size}, orderBy: {{ price: DESC }}{batch_filter}) {{
                        items {{
                            {fields_str}{nested_str}
                        }}
                    }}
                }}
                """
                result = self.execute_query(query)
                items = result.get("fact_inventory_currents", {}).get("items", [])
                print(f"  Batch {offset//batch_size + 1}: fetched {len(items)} items")
                all_items.extend(items)

                if len(items) < batch_size:
                    break  # No more items

            print(f"  Total fetched: {len(all_items)} inventory items")
            return all_items
        else:
            query = f"""
            {{
                fact_inventory_currents(first: 100000{filter_str}) {{
                    items {{
                        {fields_str}{nested_str}
                    }}
                }}
            }}
            """
            result = self.execute_query(query)
            items = result.get("fact_inventory_currents", {}).get("items", [])
            print(f"  Fetched {len(items)} inventory items")
            return items

    def get_filter_options(self) -> dict:
        """Get available filter options from CACHED dimension tables - instant response!"""
        # Ensure cache is loaded
        self.load_cache()

        # Get RV types and manufacturers from cached products
        rv_types = set()
        manufacturers = set()
        for product in self._products_cache.values():
            if product.get("rv_type"):
                rv_types.add(product["rv_type"])
            if product.get("manufacturer"):
                manufacturers.add(product["manufacturer"])

        # Get states, regions, cities and dealer groups from cached dealers
        states = set()
        regions = set()
        cities = set()
        dealer_groups = set()
        for dealer in self._dealers_cache.values():
            if dealer.get("state"):
                states.add(dealer["state"])
            if dealer.get("region"):
                regions.add(dealer["region"])
            if dealer.get("city"):
                cities.add(dealer["city"])
            if dealer.get("dealer_group"):
                dealer_groups.add(dealer["dealer_group"])

        # Conditions are just NEW/USED - hardcode for speed
        conditions = ["NEW", "USED"]

        return {
            "rv_types": sorted(list(rv_types)),
            "states": sorted(list(states)),
            "regions": sorted(list(regions)),
            "cities": sorted(list(cities)),
            "conditions": conditions,
            "dealer_groups": sorted(list(dealer_groups)),
            "manufacturers": sorted(list(manufacturers))
        }

    def get_inventory(
        self,
        dealer: Optional[str] = None,
        dealer_group: Optional[str] = None,
        rv_type: Optional[str] = None,
        manufacturer: Optional[str] = None,
        condition: Optional[str] = None,
        state: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        limit: int = 100
    ) -> list[dict]:
        """Get current inventory with nested dimension data via GraphQL relationships.

        Uses a single query with nested dim_product_models/dim_dealerships - no batch fetching needed!
        """

        # Build filter conditions for fact_inventory_currents
        filters = []
        if condition:
            filters.append(f'condition: {{ eq: "{condition}" }}')
        if min_price is not None:
            filters.append(f'price: {{ gte: {min_price} }}')
        if max_price is not None:
            filters.append(f'price: {{ lte: {max_price} }}')

        # Determine fetch count - higher when we have dimension filters (need to post-filter)
        has_dimension_filters = bool(rv_type or dealer or manufacturer or state or dealer_group)
        fetch_count = min(10000, limit * 10) if has_dimension_filters else min(5000, limit * 3)

        filter_str = ""
        if filters:
            filter_str = f", filter: {{ {', '.join(filters)} }}"

        # Single query with nested dimension data via relationships
        # NOTE: Excludes manufacturer_logo_small to avoid 64MB response limit
        query = f"""
        {{
            fact_inventory_currents(first: {fetch_count}, orderBy: {{ price: DESC }}{filter_str}) {{
                items {{
                    stock_number
                    condition
                    price
                    days_on_lot
                    dim_product_models {{
                        rv_type
                        manufacturer
                        model
                        model_year
                        floorplan
                    }}
                    dim_dealerships {{
                        dealership
                        dealer_group
                        city
                        state
                    }}
                }}
            }}
        }}
        """

        result = self.execute_query(query)
        inventory_items = result.get("fact_inventory_currents", {}).get("items", [])

        if not inventory_items:
            return []

        # Apply dimension filters and format results
        results = []
        for item in inventory_items:
            product = item.get("dim_product_models") or {}
            dealership = item.get("dim_dealerships") or {}

            dealer_name = dealership.get("dealership")
            product_rv_type = product.get("rv_type")
            product_manufacturer = product.get("manufacturer")
            dealer_state = dealership.get("state")
            dealer_city = dealership.get("city")
            dealer_grp = dealership.get("dealer_group")
            location = f"{dealer_city}, {dealer_state}" if dealer_city and dealer_state else dealer_state or ""

            # Apply filters on nested dimension data
            if dealer and dealer_name != dealer:
                continue
            if rv_type and product_rv_type != rv_type:
                continue
            if manufacturer and product_manufacturer != manufacturer:
                continue
            if state and dealer_state != state:
                continue
            if dealer_group and dealer_grp != dealer_group:
                continue

            results.append({
                "stock_number": item.get("stock_number"),
                "title": f"{product.get('model_year', '')} {product.get('manufacturer', '')} {product.get('model', '')}".strip(),
                "year": product.get("model_year"),
                "make": product.get("manufacturer"),
                "model": product.get("model"),
                "floorplan": product.get("floorplan"),
                "rv_class": product_rv_type,
                "condition": item.get("condition"),
                "sale_price": item.get("price"),
                "msrp": None,
                "location": location,
                "dealer_source": dealer_name,
                "dealer_group": dealer_grp,
                "first_image": None,  # Logo excluded from nested query to avoid 64MB limit
                "sleeps": None,
                "length": None,
                "weight": None,
                "vin": None,
                "days_on_lot": item.get("days_on_lot"),
            })

            if len(results) >= limit:
                break

        return results

    def get_inventory_summary(self, dealer: Optional[str] = None) -> dict:
        """Get summary statistics for inventory."""
        query = """
        {
            fact_inventory_currents(first: 10000) {
                items {
                    price
                    condition
                    dim_product_model_skey
                    dim_dealership_skey
                }
            }
        }
        """
        result = self.execute_query(query)
        items = result.get("fact_inventory_currents", {}).get("items", [])

        if not items:
            return {
                "total_units": 0,
                "unique_makes": 0,
                "unique_models": 0,
                "dealers_with_data": 0,
                "avg_price": 0,
                "min_price": 0,
                "max_price": 0,
                "by_class": {},
                "by_condition": {}
            }

        # Get product and dealer info
        product_keys = list(set(item["dim_product_model_skey"] for item in items if item.get("dim_product_model_skey")))
        dealer_keys = list(set(item["dim_dealership_skey"] for item in items if item.get("dim_dealership_skey")))

        # Batch queries to avoid GraphQL IN operator limit of 100
        BATCH_SIZE = 100
        products = {}
        for i in range(0, len(product_keys), BATCH_SIZE):
            batch = product_keys[i:i + BATCH_SIZE]
            product_query = f"""
            {{
                dim_product_models(first: 1000, filter: {{ dim_product_model_skey: {{ in: [{', '.join(str(k) for k in batch)}] }} }}) {{
                    items {{
                        dim_product_model_skey
                        manufacturer
                        model
                        rv_type
                    }}
                }}
            }}
            """
            product_result = self.execute_query(product_query)
            for p in product_result.get("dim_product_models", {}).get("items", []):
                products[p["dim_product_model_skey"]] = p

        dealerships = {}
        for i in range(0, len(dealer_keys), BATCH_SIZE):
            batch = dealer_keys[i:i + BATCH_SIZE]
            dealer_query = f"""
            {{
                dim_dealerships(first: 500, filter: {{ dim_dealership_skey: {{ in: [{', '.join(str(k) for k in batch)}] }} }}) {{
                    items {{
                        dim_dealership_skey
                        dealership
                    }}
                }}
            }}
            """
            dealer_result = self.execute_query(dealer_query)
            for d in dealer_result.get("dim_dealerships", {}).get("items", []):
                dealerships[d["dim_dealership_skey"]] = d

        # Filter by dealer if specified
        filtered_items = items
        if dealer:
            filtered_items = [
                item for item in items
                if dealerships.get(item.get("dim_dealership_skey"), {}).get("dealership") == dealer
            ]

        # Calculate statistics
        prices = [item["price"] for item in filtered_items if item.get("price")]
        makes = set()
        models = set()
        dealers_set = set()
        by_class = {}
        by_condition = {}

        for item in filtered_items:
            product = products.get(item.get("dim_product_model_skey"), {})
            dealership = dealerships.get(item.get("dim_dealership_skey"), {})

            if product.get("manufacturer"):
                makes.add(product["manufacturer"])
            if product.get("model"):
                models.add(product["model"])
            if dealership.get("dealership"):
                dealers_set.add(dealership["dealership"])

            rv_type = product.get("rv_type")
            if rv_type:
                by_class[rv_type] = by_class.get(rv_type, 0) + 1

            condition = item.get("condition")
            if condition:
                by_condition[condition] = by_condition.get(condition, 0) + 1

        return {
            "total_units": len(filtered_items),
            "unique_makes": len(makes),
            "unique_models": len(models),
            "dealers_with_data": len(dealers_set),
            "avg_price": sum(prices) / len(prices) if prices else 0,
            "min_price": min(prices) if prices else 0,
            "max_price": max(prices) if prices else 0,
            "by_class": by_class,
            "by_condition": by_condition
        }

    def get_aggregated_summaries(
        self,
        rv_type: Optional[str] = None,
        dealer_group: Optional[str] = None,
        manufacturer: Optional[str] = None,
        condition: Optional[str] = None,
        state: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None
    ) -> dict:
        """Get comprehensive aggregated summaries with breakdowns by rv_type, dealer_group, and manufacturer."""

        # Build filters for inventory query
        filters = []
        if condition:
            filters.append(f'condition: {{ eq: "{condition}" }}')
        if min_price is not None:
            filters.append(f'price: {{ gte: {min_price} }}')
        if max_price is not None:
            filters.append(f'price: {{ lte: {max_price} }}')

        filter_str = f", filter: {{ {', '.join(filters)} }}" if filters else ""

        # Fetch ALL inventory records using pagination
        print("Fetching all inventory for aggregation...")
        all_items = self.fetch_all_inventory(
            fields=["stock_number", "price", "condition", "days_on_lot", "dim_product_model_skey", "dim_dealership_skey"],
            filter_str=filter_str
        )

        if not all_items:
            return {
                "total_units": 0,
                "total_value": 0,
                "avg_price": 0,
                "by_rv_type": [],
                "by_dealer_group": [],
                "by_manufacturer": [],
                "by_condition": [],
                "by_state": []
            }

        # Get unique keys
        product_keys = list(set(item["dim_product_model_skey"] for item in all_items if item.get("dim_product_model_skey")))
        dealer_keys = list(set(item["dim_dealership_skey"] for item in all_items if item.get("dim_dealership_skey")))

        # Batch fetch products
        BATCH_SIZE = 100
        products = {}
        for i in range(0, len(product_keys), BATCH_SIZE):
            batch = product_keys[i:i + BATCH_SIZE]
            product_query = f"""
            {{
                dim_product_models(first: 1000, filter: {{ dim_product_model_skey: {{ in: [{', '.join(str(k) for k in batch)}] }} }}) {{
                    items {{
                        dim_product_model_skey
                        manufacturer
                        model
                        rv_type
                    }}
                }}
            }}
            """
            product_result = self.execute_query(product_query)
            for p in product_result.get("dim_product_models", {}).get("items", []):
                products[p["dim_product_model_skey"]] = p

        # Batch fetch dealerships
        dealerships = {}
        for i in range(0, len(dealer_keys), BATCH_SIZE):
            batch = dealer_keys[i:i + BATCH_SIZE]
            dealer_query = f"""
            {{
                dim_dealerships(first: 500, filter: {{ dim_dealership_skey: {{ in: [{', '.join(str(k) for k in batch)}] }} }}) {{
                    items {{
                        dim_dealership_skey
                        dealership
                        dealer_group
                        state
                    }}
                }}
            }}
            """
            dealer_result = self.execute_query(dealer_query)
            for d in dealer_result.get("dim_dealerships", {}).get("items", []):
                dealerships[d["dim_dealership_skey"]] = d

        # Apply dimension filters and aggregate
        by_rv_type = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": [], "days_on_lot": []})
        by_dealer_group = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": [], "days_on_lot": []})
        by_manufacturer = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": [], "days_on_lot": []})
        by_condition = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": []})
        by_state = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": []})

        total_value = 0
        all_prices = []
        filtered_count = 0

        for item in all_items:
            product = products.get(item.get("dim_product_model_skey"), {})
            dealership = dealerships.get(item.get("dim_dealership_skey"), {})

            item_rv_type = product.get("rv_type")
            item_manufacturer = product.get("manufacturer")
            item_dealer_group = dealership.get("dealer_group")
            item_state = dealership.get("state")
            item_condition = item.get("condition")
            price = item.get("price") or 0
            days = item.get("days_on_lot") or 0

            # Apply dimension filters
            if rv_type and item_rv_type != rv_type:
                continue
            if dealer_group and item_dealer_group != dealer_group:
                continue
            if manufacturer and item_manufacturer != manufacturer:
                continue
            if state and item_state != state:
                continue

            filtered_count += 1
            total_value += price
            if price > 0:
                all_prices.append(price)

            # Aggregate by rv_type
            if item_rv_type:
                by_rv_type[item_rv_type]["count"] += 1
                by_rv_type[item_rv_type]["total_value"] += price
                if price > 0:
                    by_rv_type[item_rv_type]["prices"].append(price)
                if days > 0:
                    by_rv_type[item_rv_type]["days_on_lot"].append(days)

            # Aggregate by dealer_group
            if item_dealer_group:
                by_dealer_group[item_dealer_group]["count"] += 1
                by_dealer_group[item_dealer_group]["total_value"] += price
                if price > 0:
                    by_dealer_group[item_dealer_group]["prices"].append(price)
                if days > 0:
                    by_dealer_group[item_dealer_group]["days_on_lot"].append(days)

            # Aggregate by manufacturer
            if item_manufacturer:
                by_manufacturer[item_manufacturer]["count"] += 1
                by_manufacturer[item_manufacturer]["total_value"] += price
                if price > 0:
                    by_manufacturer[item_manufacturer]["prices"].append(price)
                if days > 0:
                    by_manufacturer[item_manufacturer]["days_on_lot"].append(days)

            # Aggregate by condition
            if item_condition:
                by_condition[item_condition]["count"] += 1
                by_condition[item_condition]["total_value"] += price
                if price > 0:
                    by_condition[item_condition]["prices"].append(price)

            # Aggregate by state
            if item_state:
                by_state[item_state]["count"] += 1
                by_state[item_state]["total_value"] += price
                if price > 0:
                    by_state[item_state]["prices"].append(price)

        def format_aggregation(agg_dict):
            result = []
            for key, data in sorted(agg_dict.items(), key=lambda x: x[1]["count"], reverse=True):
                prices = data["prices"]
                entry = {
                    "name": key,
                    "count": data["count"],
                    "total_value": data["total_value"],
                    "avg_price": sum(prices) / len(prices) if prices else 0,
                    "min_price": min(prices) if prices else 0,
                    "max_price": max(prices) if prices else 0,
                }
                if "days_on_lot" in data and data["days_on_lot"]:
                    entry["avg_days_on_lot"] = sum(data["days_on_lot"]) / len(data["days_on_lot"])
                result.append(entry)
            return result

        return {
            "total_units": filtered_count,
            "total_value": total_value,
            "avg_price": sum(all_prices) / len(all_prices) if all_prices else 0,
            "min_price": min(all_prices) if all_prices else 0,
            "max_price": max(all_prices) if all_prices else 0,
            "by_rv_type": format_aggregation(by_rv_type)[:10],  # Top 10 RV types
            "by_dealer_group": format_aggregation(by_dealer_group)[:5],  # Top 5 dealer groups
            "by_manufacturer": format_aggregation(by_manufacturer)[:5],  # Top 5 manufacturers
            "by_condition": format_aggregation(by_condition),  # All conditions (just 2)
            "by_state": format_aggregation(by_state)[:65]  # All US states + Canadian provinces
        }

    def build_aggregations_cache(self):
        """Build aggregations cache at startup - runs groupBy queries once."""
        print("Building aggregations cache...")
        start = datetime.now()

        # 1. Get condition aggregations (fast - only 2 groups)
        condition_query = """
        {
            fact_inventory_currents(first: 100) {
                groupBy(fields: [condition]) {
                    fields { condition }
                    aggregations {
                        count(field: price)
                        sum(field: price)
                        avg(field: price)
                        min(field: price)
                        max(field: price)
                    }
                }
            }
        }
        """
        cond_result = self.execute_query(condition_query)
        cond_groups = cond_result.get("fact_inventory_currents", {}).get("groupBy", [])

        by_condition = []
        total_units = 0
        total_value = 0.0

        for g in cond_groups:
            cond = g.get("fields", {}).get("condition")
            aggs = g.get("aggregations", {})
            if cond:
                count = aggs.get("count") or 0
                total = aggs.get("sum") or 0
                by_condition.append({
                    "name": cond,
                    "count": count,
                    "total_value": total,
                    "avg_price": aggs.get("avg") or 0,
                    "min_price": aggs.get("min") or 0,
                    "max_price": aggs.get("max") or 0
                })
                total_units += count
                total_value += total
        print(f"  Condition aggregations: {total_units} total units")

        # 2. Get product-level aggregations (for rv_type, manufacturer)
        product_query = """
        {
            fact_inventory_currents(first: 100000) {
                groupBy(fields: [dim_product_model_skey]) {
                    fields { dim_product_model_skey }
                    aggregations {
                        count(field: price)
                        sum(field: price)
                        avg(field: price)
                    }
                }
            }
        }
        """
        prod_result = self.execute_query(product_query)
        prod_groups = prod_result.get("fact_inventory_currents", {}).get("groupBy", [])

        # Collect ALL product skeys from inventory groupBy (these represent ALL 184k units)
        inventory_product_skeys = [
            g.get("fields", {}).get("dim_product_model_skey")
            for g in prod_groups
            if g.get("fields", {}).get("dim_product_model_skey")
        ]
        product_skey_to_aggs = {
            g.get("fields", {}).get("dim_product_model_skey"): g.get("aggregations", {})
            for g in prod_groups
            if g.get("fields", {}).get("dim_product_model_skey")
        }

        # Fetch dimension data specifically for skeys found in inventory (not from pre-loaded cache)
        # This ensures we get data for ALL inventory products, even if dimension cache was limited
        products_for_inventory = self.fetch_dimension_data_for_skeys(
            "dim_product_models", "dim_product_model_skey",
            inventory_product_skeys,
            ["dim_product_model_skey", "rv_type", "manufacturer"]
        )

        by_rv_type = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
        by_manufacturer = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
        missing_product_count = 0
        missing_product_inventory = 0

        for pkey in inventory_product_skeys:
            aggs = product_skey_to_aggs.get(pkey, {})
            product = products_for_inventory.get(pkey, {})

            count = aggs.get("count") or 0
            total = aggs.get("sum") or 0
            avg_p = aggs.get("avg") or 0

            rv_type = product.get("rv_type")
            mfr = product.get("manufacturer")

            if not rv_type and not mfr:
                missing_product_count += 1
                missing_product_inventory += count

            if rv_type:
                by_rv_type[rv_type]["count"] += count
                by_rv_type[rv_type]["total_value"] += total
                if avg_p > 0:
                    by_rv_type[rv_type]["avg_prices"].append((avg_p, count))

            if mfr:
                by_manufacturer[mfr]["count"] += count
                by_manufacturer[mfr]["total_value"] += total
                if avg_p > 0:
                    by_manufacturer[mfr]["avg_prices"].append((avg_p, count))

        if missing_product_count > 0:
            print(f"  WARNING: {missing_product_count} products not found in dim_product_models ({missing_product_inventory} inventory units)")
        print(f"  Product aggregations: {len(prod_groups)} product groups -> {len(by_rv_type)} rv_types, {len(by_manufacturer)} manufacturers")

        # 3. Get dealer-level aggregations (for dealer_group, state)
        dealer_query = """
        {
            fact_inventory_currents(first: 100000) {
                groupBy(fields: [dim_dealership_skey]) {
                    fields { dim_dealership_skey }
                    aggregations {
                        count(field: price)
                        sum(field: price)
                        avg(field: price)
                    }
                }
            }
        }
        """
        dealer_result = self.execute_query(dealer_query)
        dealer_groups = dealer_result.get("fact_inventory_currents", {}).get("groupBy", [])

        # Collect ALL dealer skeys from inventory groupBy (these represent ALL 184k units)
        inventory_dealer_skeys = [
            g.get("fields", {}).get("dim_dealership_skey")
            for g in dealer_groups
            if g.get("fields", {}).get("dim_dealership_skey")
        ]
        dealer_skey_to_aggs = {
            g.get("fields", {}).get("dim_dealership_skey"): g.get("aggregations", {})
            for g in dealer_groups
            if g.get("fields", {}).get("dim_dealership_skey")
        }

        # Fetch dimension data specifically for skeys found in inventory (not from pre-loaded cache)
        # This ensures we get data for ALL inventory dealers, even if dimension cache was limited
        dealers_for_inventory = self.fetch_dimension_data_for_skeys(
            "dim_dealerships", "dim_dealership_skey",
            inventory_dealer_skeys,
            ["dim_dealership_skey", "dealer_group", "state", "region", "city", "county"]
        )

        by_dealer_group = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
        by_state = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
        by_region = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
        by_city = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
        by_county = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
        missing_dealer_count = 0
        missing_dealer_inventory = 0

        for dkey in inventory_dealer_skeys:
            aggs = dealer_skey_to_aggs.get(dkey, {})
            dealer = dealers_for_inventory.get(dkey, {})

            count = aggs.get("count") or 0
            total = aggs.get("sum") or 0
            avg_p = aggs.get("avg") or 0

            dg = dealer.get("dealer_group")
            state = dealer.get("state")
            region = dealer.get("region")
            city = dealer.get("city")
            county = dealer.get("county")

            if not dg and not state:
                missing_dealer_count += 1
                missing_dealer_inventory += count

            if dg:
                by_dealer_group[dg]["count"] += count
                by_dealer_group[dg]["total_value"] += total
                if avg_p > 0:
                    by_dealer_group[dg]["avg_prices"].append((avg_p, count))

            if state:
                by_state[state]["count"] += count
                by_state[state]["total_value"] += total
                if avg_p > 0:
                    by_state[state]["avg_prices"].append((avg_p, count))

            if region:
                by_region[region]["count"] += count
                by_region[region]["total_value"] += total
                if avg_p > 0:
                    by_region[region]["avg_prices"].append((avg_p, count))

            if city:
                by_city[city]["count"] += count
                by_city[city]["total_value"] += total
                if avg_p > 0:
                    by_city[city]["avg_prices"].append((avg_p, count))

            if county:
                by_county[county]["count"] += count
                by_county[county]["total_value"] += total
                if avg_p > 0:
                    by_county[county]["avg_prices"].append((avg_p, count))

        if missing_dealer_count > 0:
            print(f"  WARNING: {missing_dealer_count} dealers not found in dim_dealerships ({missing_dealer_inventory} inventory units)")
        print(f"  Dealer aggregations: {len(dealer_groups)} dealer groups -> {len(by_dealer_group)} dealer_groups, {len(by_state)} states, {len(by_region)} regions, {len(by_city)} cities")

        def format_agg(agg_dict, limit=None):
            result = []
            for key, data in sorted(agg_dict.items(), key=lambda x: x[1]["count"], reverse=True):
                total_weighted = sum(p * c for p, c in data["avg_prices"])
                total_count = sum(c for _, c in data["avg_prices"])
                avg_p = total_weighted / total_count if total_count > 0 else 0
                result.append({
                    "name": key,
                    "count": data["count"],
                    "total_value": data["total_value"],
                    "avg_price": avg_p,
                    "min_price": 0,
                    "max_price": 0
                })
            return result[:limit] if limit else result

        overall_avg = total_value / total_units if total_units > 0 else 0

        self._aggregations_cache = {
            "total_units": total_units,
            "total_value": total_value,
            "avg_price": overall_avg,
            "min_price": min((c["min_price"] for c in by_condition if c["min_price"] > 0), default=0),
            "max_price": max((c["max_price"] for c in by_condition), default=0),
            "by_rv_type": format_agg(by_rv_type, 10),
            "by_dealer_group": format_agg(by_dealer_group, 10),
            "by_manufacturer": format_agg(by_manufacturer, 10),
            "by_condition": sorted(by_condition, key=lambda x: x["count"], reverse=True),
            "by_state": format_agg(by_state, 65),  # All US states + Canadian provinces
            "by_region": format_agg(by_region, 10),
            "by_city": format_agg(by_city, 20),  # More cities, so show top 20
            "by_county": format_agg(by_county, 15)
        }

        elapsed = (datetime.now() - start).total_seconds()
        print(f"Aggregations cache built in {elapsed:.1f}s")

    def get_fast_aggregations(self) -> dict:
        """Return cached aggregations - instant response!"""
        if self._aggregations_cache is None:
            self.build_aggregations_cache()
        return self._aggregations_cache

    def build_filtered_aggregations_cache(self):
        """Pre-compute aggregations for common filter combinations at startup."""
        print("Building filtered aggregations cache...")
        start = datetime.now()

        self._filtered_aggregations_cache = {}

        # Define filters to pre-compute
        condition_filters = ["NEW", "USED"]
        rv_type_filters = ["TRAVEL TRAILER", "FIFTH WHEEL", "CLASS A", "CLASS B", "CLASS C", "OTHER", "CAMPING TRAILER", "PARK MODEL"]

        # Helper to build aggregations for a single filter
        def build_for_filter(filter_field: str, filter_value: str, filter_key: str):
            """Build aggregations for a specific filter using native groupBy."""
            print(f"  Building aggregations for {filter_key}...")

            # Build filter string for GraphQL
            filter_str = f', filter: {{ {filter_field}: {{ eq: "{filter_value}" }} }}'

            # 1. Get totals from condition groupBy (with filter)
            condition_query = f"""
            {{
                fact_inventory_currents(first: 100{filter_str}) {{
                    groupBy(fields: [condition]) {{
                        fields {{ condition }}
                        aggregations {{
                            count(field: price)
                            sum(field: price)
                            avg(field: price)
                            min(field: price)
                            max(field: price)
                        }}
                    }}
                }}
            }}
            """
            cond_result = self.execute_query(condition_query)
            cond_groups = cond_result.get("fact_inventory_currents", {}).get("groupBy", [])

            by_condition = []
            total_units = 0
            total_value = 0.0
            min_price = float('inf')
            max_price = 0

            for g in cond_groups:
                cond = g.get("fields", {}).get("condition")
                aggs = g.get("aggregations", {})
                if cond:
                    count = aggs.get("count") or 0
                    total = aggs.get("sum") or 0
                    by_condition.append({
                        "name": cond,
                        "count": count,
                        "total_value": total,
                        "avg_price": aggs.get("avg") or 0,
                        "min_price": aggs.get("min") or 0,
                        "max_price": aggs.get("max") or 0
                    })
                    total_units += count
                    total_value += total
                    if aggs.get("min") and aggs.get("min") > 0:
                        min_price = min(min_price, aggs.get("min"))
                    if aggs.get("max"):
                        max_price = max(max_price, aggs.get("max"))

            if min_price == float('inf'):
                min_price = 0

            # 2. Get product-level aggregations (for rv_type, manufacturer)
            product_query = f"""
            {{
                fact_inventory_currents(first: 100000{filter_str}) {{
                    groupBy(fields: [dim_product_model_skey]) {{
                        fields {{ dim_product_model_skey }}
                        aggregations {{
                            count(field: price)
                            sum(field: price)
                            avg(field: price)
                        }}
                    }}
                }}
            }}
            """
            prod_result = self.execute_query(product_query)
            prod_groups = prod_result.get("fact_inventory_currents", {}).get("groupBy", [])

            # Collect product skeys and fetch dimension data
            inventory_product_skeys = [
                g.get("fields", {}).get("dim_product_model_skey")
                for g in prod_groups
                if g.get("fields", {}).get("dim_product_model_skey")
            ]
            product_skey_to_aggs = {
                g.get("fields", {}).get("dim_product_model_skey"): g.get("aggregations", {})
                for g in prod_groups
                if g.get("fields", {}).get("dim_product_model_skey")
            }

            products_for_inventory = self.fetch_dimension_data_for_skeys(
                "dim_product_models", "dim_product_model_skey",
                inventory_product_skeys,
                ["dim_product_model_skey", "rv_type", "manufacturer"]
            )

            by_rv_type = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
            by_manufacturer = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})

            for pkey in inventory_product_skeys:
                aggs = product_skey_to_aggs.get(pkey, {})
                product = products_for_inventory.get(pkey, {})
                count = aggs.get("count") or 0
                total = aggs.get("sum") or 0
                avg_p = aggs.get("avg") or 0

                rv_type = product.get("rv_type")
                if rv_type:
                    by_rv_type[rv_type]["count"] += count
                    by_rv_type[rv_type]["total_value"] += total
                    if avg_p > 0:
                        by_rv_type[rv_type]["avg_prices"].append((avg_p, count))

                mfr = product.get("manufacturer")
                if mfr:
                    by_manufacturer[mfr]["count"] += count
                    by_manufacturer[mfr]["total_value"] += total
                    if avg_p > 0:
                        by_manufacturer[mfr]["avg_prices"].append((avg_p, count))

            # 3. Get dealer-level aggregations (for dealer_group, state)
            dealer_query = f"""
            {{
                fact_inventory_currents(first: 100000{filter_str}) {{
                    groupBy(fields: [dim_dealership_skey]) {{
                        fields {{ dim_dealership_skey }}
                        aggregations {{
                            count(field: price)
                            sum(field: price)
                            avg(field: price)
                        }}
                    }}
                }}
            }}
            """
            dealer_result = self.execute_query(dealer_query)
            dealer_groups = dealer_result.get("fact_inventory_currents", {}).get("groupBy", [])

            inventory_dealer_skeys = [
                g.get("fields", {}).get("dim_dealership_skey")
                for g in dealer_groups
                if g.get("fields", {}).get("dim_dealership_skey")
            ]
            dealer_skey_to_aggs = {
                g.get("fields", {}).get("dim_dealership_skey"): g.get("aggregations", {})
                for g in dealer_groups
                if g.get("fields", {}).get("dim_dealership_skey")
            }

            dealers_for_inventory = self.fetch_dimension_data_for_skeys(
                "dim_dealerships", "dim_dealership_skey",
                inventory_dealer_skeys,
                ["dim_dealership_skey", "dealer_group", "state", "region", "city", "county"]
            )

            by_dealer_group = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
            by_state = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
            by_region = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
            by_city = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
            by_county = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})

            for dkey in inventory_dealer_skeys:
                aggs = dealer_skey_to_aggs.get(dkey, {})
                dealer = dealers_for_inventory.get(dkey, {})
                count = aggs.get("count") or 0
                total = aggs.get("sum") or 0
                avg_p = aggs.get("avg") or 0

                dg = dealer.get("dealer_group")
                if dg:
                    by_dealer_group[dg]["count"] += count
                    by_dealer_group[dg]["total_value"] += total
                    if avg_p > 0:
                        by_dealer_group[dg]["avg_prices"].append((avg_p, count))

                state = dealer.get("state")
                if state:
                    by_state[state]["count"] += count
                    by_state[state]["total_value"] += total
                    if avg_p > 0:
                        by_state[state]["avg_prices"].append((avg_p, count))

                region = dealer.get("region")
                if region:
                    by_region[region]["count"] += count
                    by_region[region]["total_value"] += total
                    if avg_p > 0:
                        by_region[region]["avg_prices"].append((avg_p, count))

                city = dealer.get("city")
                if city:
                    by_city[city]["count"] += count
                    by_city[city]["total_value"] += total
                    if avg_p > 0:
                        by_city[city]["avg_prices"].append((avg_p, count))

                county = dealer.get("county")
                if county:
                    by_county[county]["count"] += count
                    by_county[county]["total_value"] += total
                    if avg_p > 0:
                        by_county[county]["avg_prices"].append((avg_p, count))

            # Format results
            def format_agg(agg_dict, limit=None):
                result = []
                for key, data in sorted(agg_dict.items(), key=lambda x: x[1]["count"], reverse=True):
                    total_weighted = sum(p * c for p, c in data["avg_prices"])
                    total_count = sum(c for _, c in data["avg_prices"])
                    avg_p = total_weighted / total_count if total_count > 0 else 0
                    result.append({
                        "name": key,
                        "count": data["count"],
                        "total_value": data["total_value"],
                        "avg_price": avg_p,
                        "min_price": 0,
                        "max_price": 0
                    })
                return result[:limit] if limit else result

            overall_avg = total_value / total_units if total_units > 0 else 0

            return {
                "total_units": total_units,
                "total_value": total_value,
                "avg_price": overall_avg,
                "min_price": min_price,
                "max_price": max_price,
                "by_rv_type": format_agg(by_rv_type, 10),
                "by_dealer_group": format_agg(by_dealer_group, 10),
                "by_manufacturer": format_agg(by_manufacturer, 10),
                "by_condition": sorted(by_condition, key=lambda x: x["count"], reverse=True),
                "by_state": format_agg(by_state, 65),  # All US states + Canadian provinces
                "by_region": format_agg(by_region, 10),
                "by_city": format_agg(by_city, 20),
                "by_county": format_agg(by_county, 15)
            }

        # Build caches for condition filters
        for cond in condition_filters:
            key = f"condition:{cond}"
            try:
                self._filtered_aggregations_cache[key] = build_for_filter("condition", cond, key)
                print(f"    {key}: {self._filtered_aggregations_cache[key]['total_units']:,} units")
            except Exception as e:
                print(f"    {key}: FAILED - {str(e)[:100]}")

        # Build caches for RV type filters
        for rv_type in rv_type_filters:
            key = f"rv_type:{rv_type}"
            try:
                self._filtered_aggregations_cache[key] = build_for_filter("rv_type", rv_type, key)
                print(f"    {key}: {self._filtered_aggregations_cache[key]['total_units']:,} units")
            except Exception as e:
                print(f"    {key}: FAILED - {str(e)[:100]}")

        elapsed = (datetime.now() - start).total_seconds()
        print(f"Filtered aggregations cache built in {elapsed:.1f}s ({len(self._filtered_aggregations_cache)} filter combinations)")

    def get_filtered_aggregations_cached(self, filter_key: str) -> dict:
        """Return pre-computed filtered aggregations if available."""
        if self._filtered_aggregations_cache is None:
            return None
        return self._filtered_aggregations_cache.get(filter_key)

    def _build_aggregations_for_product_skeys(self, product_skeys: list, rv_type_name: str) -> dict:
        """Build aggregations for inventory items matching given product skeys."""
        # For large sets, we need to batch the queries
        # Use condition groupBy with product skey filter
        BATCH_SIZE = 100  # GraphQL IN operator limited to 100 values

        total_units = 0
        total_value = 0.0
        min_price = float('inf')
        max_price = 0
        by_condition = defaultdict(lambda: {"count": 0, "total_value": 0, "min_price": float('inf'), "max_price": 0})
        by_dealer_group = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
        by_state = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
        by_region = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
        by_city = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
        by_county = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})
        by_manufacturer = defaultdict(lambda: {"count": 0, "total_value": 0, "avg_prices": []})

        # Process in batches
        for i in range(0, len(product_skeys), BATCH_SIZE):
            batch = product_skeys[i:i + BATCH_SIZE]
            batch_str = ', '.join(str(k) for k in batch)
            filter_str = f', filter: {{ dim_product_model_skey: {{ in: [{batch_str}] }} }}'

            # Get condition aggregations for this batch
            cond_query = f"""
            {{
                fact_inventory_currents(first: 100{filter_str}) {{
                    groupBy(fields: [condition]) {{
                        fields {{ condition }}
                        aggregations {{
                            count(field: price)
                            sum(field: price)
                            avg(field: price)
                            min(field: price)
                            max(field: price)
                        }}
                    }}
                }}
            }}
            """
            cond_result = self.execute_query(cond_query)
            for g in cond_result.get("fact_inventory_currents", {}).get("groupBy", []):
                cond = g.get("fields", {}).get("condition")
                aggs = g.get("aggregations", {})
                if cond:
                    count = aggs.get("count") or 0
                    total = aggs.get("sum") or 0
                    by_condition[cond]["count"] += count
                    by_condition[cond]["total_value"] += total
                    total_units += count
                    total_value += total
                    if aggs.get("min") and aggs.get("min") > 0:
                        by_condition[cond]["min_price"] = min(by_condition[cond]["min_price"], aggs.get("min"))
                        min_price = min(min_price, aggs.get("min"))
                    if aggs.get("max"):
                        by_condition[cond]["max_price"] = max(by_condition[cond]["max_price"], aggs.get("max"))
                        max_price = max(max_price, aggs.get("max"))

            # Get dealer aggregations for this batch
            dealer_query = f"""
            {{
                fact_inventory_currents(first: 100000{filter_str}) {{
                    groupBy(fields: [dim_dealership_skey]) {{
                        fields {{ dim_dealership_skey }}
                        aggregations {{
                            count(field: price)
                            sum(field: price)
                            avg(field: price)
                        }}
                    }}
                }}
            }}
            """
            dealer_result = self.execute_query(dealer_query)
            dealer_groups = dealer_result.get("fact_inventory_currents", {}).get("groupBy", [])

            dealer_skeys = [g.get("fields", {}).get("dim_dealership_skey") for g in dealer_groups if g.get("fields", {}).get("dim_dealership_skey")]
            dealers_data = self.fetch_dimension_data_for_skeys(
                "dim_dealerships", "dim_dealership_skey", dealer_skeys,
                ["dim_dealership_skey", "dealer_group", "state", "region", "city", "county"]
            )

            for g in dealer_groups:
                dkey = g.get("fields", {}).get("dim_dealership_skey")
                aggs = g.get("aggregations", {})
                dealer = dealers_data.get(dkey, {})
                count = aggs.get("count") or 0
                total = aggs.get("sum") or 0
                avg_p = aggs.get("avg") or 0

                dg = dealer.get("dealer_group")
                if dg:
                    by_dealer_group[dg]["count"] += count
                    by_dealer_group[dg]["total_value"] += total
                    if avg_p > 0:
                        by_dealer_group[dg]["avg_prices"].append((avg_p, count))

                state = dealer.get("state")
                if state:
                    by_state[state]["count"] += count
                    by_state[state]["total_value"] += total
                    if avg_p > 0:
                        by_state[state]["avg_prices"].append((avg_p, count))

                region = dealer.get("region")
                if region:
                    by_region[region]["count"] += count
                    by_region[region]["total_value"] += total
                    if avg_p > 0:
                        by_region[region]["avg_prices"].append((avg_p, count))

                city = dealer.get("city")
                if city:
                    by_city[city]["count"] += count
                    by_city[city]["total_value"] += total
                    if avg_p > 0:
                        by_city[city]["avg_prices"].append((avg_p, count))

                county = dealer.get("county")
                if county:
                    by_county[county]["count"] += count
                    by_county[county]["total_value"] += total
                    if avg_p > 0:
                        by_county[county]["avg_prices"].append((avg_p, count))

        # Get manufacturers from the product skeys we already have
        products_data = self.fetch_dimension_data_for_skeys(
            "dim_product_models", "dim_product_model_skey", product_skeys,
            ["dim_product_model_skey", "manufacturer"]
        )

        # We need to get manufacturer counts from inventory
        # Re-query with product skey batches
        for i in range(0, len(product_skeys), BATCH_SIZE):
            batch = product_skeys[i:i + BATCH_SIZE]
            batch_str = ', '.join(str(k) for k in batch)
            filter_str = f', filter: {{ dim_product_model_skey: {{ in: [{batch_str}] }} }}'

            prod_query = f"""
            {{
                fact_inventory_currents(first: 100000{filter_str}) {{
                    groupBy(fields: [dim_product_model_skey]) {{
                        fields {{ dim_product_model_skey }}
                        aggregations {{
                            count(field: price)
                            sum(field: price)
                            avg(field: price)
                        }}
                    }}
                }}
            }}
            """
            prod_result = self.execute_query(prod_query)
            for g in prod_result.get("fact_inventory_currents", {}).get("groupBy", []):
                pkey = g.get("fields", {}).get("dim_product_model_skey")
                aggs = g.get("aggregations", {})
                product = products_data.get(pkey, {})
                count = aggs.get("count") or 0
                total = aggs.get("sum") or 0
                avg_p = aggs.get("avg") or 0

                mfr = product.get("manufacturer")
                if mfr:
                    by_manufacturer[mfr]["count"] += count
                    by_manufacturer[mfr]["total_value"] += total
                    if avg_p > 0:
                        by_manufacturer[mfr]["avg_prices"].append((avg_p, count))

        if min_price == float('inf'):
            min_price = 0

        # Format results
        def format_agg(agg_dict, limit=None):
            result = []
            for key, data in sorted(agg_dict.items(), key=lambda x: x[1]["count"], reverse=True):
                if "avg_prices" in data:
                    total_weighted = sum(p * c for p, c in data["avg_prices"])
                    total_count = sum(c for _, c in data["avg_prices"])
                    avg_p = total_weighted / total_count if total_count > 0 else 0
                else:
                    avg_p = 0
                result.append({
                    "name": key,
                    "count": data["count"],
                    "total_value": data["total_value"],
                    "avg_price": avg_p,
                    "min_price": data.get("min_price", 0) if data.get("min_price") != float('inf') else 0,
                    "max_price": data.get("max_price", 0)
                })
            return result[:limit] if limit else result

        overall_avg = total_value / total_units if total_units > 0 else 0

        # Format condition results
        cond_list = []
        for cond, data in by_condition.items():
            cond_list.append({
                "name": cond,
                "count": data["count"],
                "total_value": data["total_value"],
                "avg_price": data["total_value"] / data["count"] if data["count"] > 0 else 0,
                "min_price": data["min_price"] if data["min_price"] != float('inf') else 0,
                "max_price": data["max_price"]
            })

        return {
            "total_units": total_units,
            "total_value": total_value,
            "avg_price": overall_avg,
            "min_price": min_price,
            "max_price": max_price,
            "by_rv_type": [{"name": rv_type_name, "count": total_units, "total_value": total_value, "avg_price": overall_avg, "min_price": min_price, "max_price": max_price}],
            "by_dealer_group": format_agg(by_dealer_group, 10),
            "by_manufacturer": format_agg(by_manufacturer, 10),
            "by_condition": sorted(cond_list, key=lambda x: x["count"], reverse=True),
            "by_state": format_agg(by_state, 65),  # All US states + Canadian provinces
            "by_region": format_agg(by_region, 10),
            "by_city": format_agg(by_city, 20),
            "by_county": format_agg(by_county, 15)
        }

    def load_inventory_cache(self):
        """Load all inventory with joined dimension data for fast filtered queries AND display.

        Uses manual joins from dimension caches since Fabric relationships aren't configured.
        """
        if self._inventory_cache is not None:
            return

        print("Loading inventory cache (using manual joins)...")
        start = datetime.now()

        # Ensure dimension caches are loaded first
        self.load_cache()

        # Fetch inventory WITHOUT nested data (relationships not configured in Fabric)
        items = self.fetch_all_inventory(
            fields=["stock_number", "price", "condition", "days_on_lot", "dim_product_model_skey", "dim_product_skey", "dim_dealership_skey"],
            include_nested=False
        )

        # Build cache by joining with dimension caches
        self._inventory_cache = []
        for item in items:
            # Join with dimension caches using skeys
            product_model = self._products_cache.get(item.get("dim_product_model_skey")) or {}
            floorplan_data = self._floorplan_cache.get(item.get("dim_product_skey")) or {}
            dealer = self._dealers_cache.get(item.get("dim_dealership_skey")) or {}

            dealer_city = dealer.get("city")
            dealer_state = dealer.get("state")
            location = f"{dealer_city}, {dealer_state}" if dealer_city and dealer_state else dealer_state or ""

            self._inventory_cache.append({
                "stock_number": item.get("stock_number"),
                "price": item.get("price") or 0,
                "condition": item.get("condition"),
                "days_on_lot": item.get("days_on_lot") or 0,
                "rv_type": product_model.get("rv_type"),
                "manufacturer": product_model.get("manufacturer"),
                "model": product_model.get("model"),
                "model_year": product_model.get("model_year"),
                "floorplan": floorplan_data.get("floorplan"),
                "manufacturer_logo_small": None,  # Excluded from nested query to avoid 64MB limit
                "dealer_group": dealer.get("dealer_group"),
                "state": dealer.get("state"),
                "region": dealer.get("region"),
                "city": dealer.get("city"),
                "county": dealer.get("county"),
                "dealership": dealer.get("dealership"),
                "location": location,
                "dim_product_model_skey": item.get("dim_product_model_skey"),
                "dim_product_skey": item.get("dim_product_skey"),
                "dim_dealership_skey": item.get("dim_dealership_skey"),
            })

        elapsed = (datetime.now() - start).total_seconds()
        print(f"Inventory cache loaded: {len(self._inventory_cache)} items in {elapsed:.1f}s")

    def get_cached_inventory(
        self,
        dealer: Optional[str] = None,
        dealer_group: Optional[str] = None,
        rv_type: Optional[str] = None,
        manufacturer: Optional[str] = None,
        condition: Optional[str] = None,
        state: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        limit: int = 100
    ) -> list[dict]:
        """Get inventory from cache with filters - instant response!"""
        self.load_inventory_cache()

        # Filter in memory
        filtered = self._inventory_cache
        if dealer:
            filtered = [i for i in filtered if i.get("dealership") == dealer]
        if dealer_group:
            filtered = [i for i in filtered if i.get("dealer_group") == dealer_group]
        if rv_type:
            filtered = [i for i in filtered if i.get("rv_type") == rv_type]
        if manufacturer:
            filtered = [i for i in filtered if i.get("manufacturer") == manufacturer]
        if condition:
            filtered = [i for i in filtered if i.get("condition") == condition]
        if state:
            filtered = [i for i in filtered if i.get("state") == state]
        if min_price is not None:
            filtered = [i for i in filtered if (i.get("price") or 0) >= min_price]
        if max_price is not None:
            filtered = [i for i in filtered if (i.get("price") or 0) <= max_price]

        # Sort by price DESC and limit
        filtered.sort(key=lambda x: x.get("price") or 0, reverse=True)
        filtered = filtered[:limit]

        # Format for response
        results = []
        for item in filtered:
            title = f"{item.get('model_year', '')} {item.get('manufacturer', '')} {item.get('model', '')}".strip()
            results.append({
                "stock_number": item.get("stock_number"),
                "title": title,
                "year": item.get("model_year"),
                "make": item.get("manufacturer"),
                "model": item.get("model"),
                "floorplan": item.get("floorplan"),
                "rv_class": item.get("rv_type"),
                "condition": item.get("condition"),
                "sale_price": item.get("price"),
                "msrp": None,
                "location": item.get("location"),
                "dealer_source": item.get("dealership"),
                "dealer_group": item.get("dealer_group"),
                "first_image": item.get("manufacturer_logo_small"),
                "sleeps": None,
                "length": None,
                "weight": None,
                "vin": None,
                "days_on_lot": item.get("days_on_lot"),
            })

        return results

    def get_filtered_aggregations(
        self,
        rv_type: Optional[str] = None,
        dealer_group: Optional[str] = None,
        manufacturer: Optional[str] = None,
        condition: Optional[str] = None,
        state: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None
    ) -> dict:
        """Get aggregations with filters - uses cached inventory data (fast!)."""
        # Ensure inventory cache is loaded
        self.load_inventory_cache()

        # Filter in memory (instant!)
        filtered = self._inventory_cache
        if rv_type:
            filtered = [i for i in filtered if i["rv_type"] == rv_type]
        if dealer_group:
            filtered = [i for i in filtered if i["dealer_group"] == dealer_group]
        if manufacturer:
            filtered = [i for i in filtered if i["manufacturer"] == manufacturer]
        if condition:
            filtered = [i for i in filtered if i["condition"] == condition]
        if state:
            filtered = [i for i in filtered if i["state"] == state]
        if min_price is not None:
            filtered = [i for i in filtered if i["price"] >= min_price]
        if max_price is not None:
            filtered = [i for i in filtered if i["price"] <= max_price]

        # Aggregate
        by_rv_type = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": []})
        by_dealer_group = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": []})
        by_manufacturer = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": []})
        by_condition = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": []})
        by_state = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": []})
        by_region = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": []})
        by_city = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": []})
        by_county = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": []})

        total_value = 0.0
        all_prices = []

        for item in filtered:
            price = item["price"]
            total_value += price
            if price > 0:
                all_prices.append(price)

            if item["rv_type"]:
                by_rv_type[item["rv_type"]]["count"] += 1
                by_rv_type[item["rv_type"]]["total_value"] += price
                if price > 0:
                    by_rv_type[item["rv_type"]]["prices"].append(price)

            if item["dealer_group"]:
                by_dealer_group[item["dealer_group"]]["count"] += 1
                by_dealer_group[item["dealer_group"]]["total_value"] += price

            if item["manufacturer"]:
                by_manufacturer[item["manufacturer"]]["count"] += 1
                by_manufacturer[item["manufacturer"]]["total_value"] += price

            if item["condition"]:
                by_condition[item["condition"]]["count"] += 1
                by_condition[item["condition"]]["total_value"] += price
                if price > 0:
                    by_condition[item["condition"]]["prices"].append(price)

            if item["state"]:
                by_state[item["state"]]["count"] += 1
                by_state[item["state"]]["total_value"] += price

            if item.get("region"):
                by_region[item["region"]]["count"] += 1
                by_region[item["region"]]["total_value"] += price

            if item.get("city"):
                by_city[item["city"]]["count"] += 1
                by_city[item["city"]]["total_value"] += price

            if item.get("county"):
                by_county[item["county"]]["count"] += 1
                by_county[item["county"]]["total_value"] += price

        def format_agg(agg_dict, limit=10):
            result = []
            for key, data in sorted(agg_dict.items(), key=lambda x: x[1]["count"], reverse=True):
                prices = data.get("prices", [])
                result.append({
                    "name": key,
                    "count": data["count"],
                    "total_value": data["total_value"],
                    "avg_price": sum(prices) / len(prices) if prices else (data["total_value"] / data["count"] if data["count"] > 0 else 0),
                    "min_price": min(prices) if prices else 0,
                    "max_price": max(prices) if prices else 0,
                })
            return result[:limit]

        return {
            "total_units": len(filtered),
            "total_value": total_value,
            "avg_price": sum(all_prices) / len(all_prices) if all_prices else 0,
            "min_price": min(all_prices) if all_prices else 0,
            "max_price": max(all_prices) if all_prices else 0,
            "by_rv_type": format_agg(by_rv_type, 10),
            "by_dealer_group": format_agg(by_dealer_group, 10),
            "by_manufacturer": format_agg(by_manufacturer, 10),
            "by_condition": format_agg(by_condition),
            "by_state": format_agg(by_state, 65),  # All US states + Canadian provinces
            "by_region": format_agg(by_region, 10),
            "by_city": format_agg(by_city, 20),
            "by_county": format_agg(by_county, 15),
        }

    def get_native_aggregations(self) -> dict:
        """
        Use Fabric GraphQL native groupBy aggregations to get accurate totals
        for all inventory without sampling.
        """
        # 1. Get aggregations by condition (NEW/USED) using native groupBy
        condition_query = """
        {
            fact_inventory_currents(first: 1) {
                groupBy(fields: [condition]) {
                    fields {
                        condition
                    }
                    aggregations {
                        count(field: price)
                        sum(field: price)
                        avg(field: price)
                        min(field: price)
                        max(field: price)
                    }
                }
            }
        }
        """
        condition_result = self.execute_query(condition_query)
        condition_groups = condition_result.get("fact_inventory_currents", {}).get("groupBy", [])

        by_condition = []
        total_units = 0
        total_value = 0.0
        all_prices = []

        for group in condition_groups:
            fields = group.get("fields", {})
            aggs = group.get("aggregations", {})
            cond = fields.get("condition")
            count = aggs.get("count") or 0
            total = aggs.get("sum") or 0
            avg_p = aggs.get("avg") or 0
            min_p = aggs.get("min") or 0
            max_p = aggs.get("max") or 0

            if cond:
                by_condition.append({
                    "name": cond,
                    "count": count,
                    "total_value": total,
                    "avg_price": avg_p,
                    "min_price": min_p,
                    "max_price": max_p
                })
                total_units += count
                total_value += total
                if avg_p > 0:
                    all_prices.extend([avg_p] * count)  # Approximate for overall avg

        # 2. Get aggregations by product to map to rv_type
        product_query = """
        {
            fact_inventory_currents(first: 1) {
                groupBy(fields: [dim_product_model_skey]) {
                    fields {
                        dim_product_model_skey
                    }
                    aggregations {
                        count(field: price)
                        sum(field: price)
                        avg(field: price)
                        min(field: price)
                        max(field: price)
                    }
                }
            }
        }
        """
        product_result = self.execute_query(product_query)
        product_groups = product_result.get("fact_inventory_currents", {}).get("groupBy", [])

        # Get all unique product keys
        product_keys = [g.get("fields", {}).get("dim_product_model_skey") for g in product_groups if g.get("fields", {}).get("dim_product_model_skey")]

        # Fetch product details in batches
        products = {}
        BATCH_SIZE = 100
        for i in range(0, len(product_keys), BATCH_SIZE):
            batch = product_keys[i:i + BATCH_SIZE]
            pq = f"""
            {{
                dim_product_models(first: 1000, filter: {{ dim_product_model_skey: {{ in: [{', '.join(str(k) for k in batch)}] }} }}) {{
                    items {{
                        dim_product_model_skey
                        rv_type
                        manufacturer
                    }}
                }}
            }}
            """
            pr = self.execute_query(pq)
            for p in pr.get("dim_product_models", {}).get("items", []):
                products[p["dim_product_model_skey"]] = p

        # Aggregate by rv_type
        by_rv_type_dict = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": []})
        by_manufacturer_dict = defaultdict(lambda: {"count": 0, "total_value": 0, "prices": []})

        for group in product_groups:
            fields = group.get("fields", {})
            aggs = group.get("aggregations", {})
            pkey = fields.get("dim_product_model_skey")
            product = products.get(pkey, {})

            rv_type = product.get("rv_type")
            manufacturer = product.get("manufacturer")
            count = aggs.get("count") or 0
            total = aggs.get("sum") or 0
            avg_p = aggs.get("avg") or 0

            if rv_type:
                by_rv_type_dict[rv_type]["count"] += count
                by_rv_type_dict[rv_type]["total_value"] += total
                if avg_p > 0:
                    by_rv_type_dict[rv_type]["prices"].append((avg_p, count))

            if manufacturer:
                by_manufacturer_dict[manufacturer]["count"] += count
                by_manufacturer_dict[manufacturer]["total_value"] += total
                if avg_p > 0:
                    by_manufacturer_dict[manufacturer]["prices"].append((avg_p, count))

        def format_dict_aggregation(agg_dict):
            result = []
            for key, data in sorted(agg_dict.items(), key=lambda x: x[1]["count"], reverse=True):
                # Weighted average price
                total_weighted = sum(p * c for p, c in data["prices"])
                total_count = sum(c for _, c in data["prices"])
                avg_p = total_weighted / total_count if total_count > 0 else 0

                prices_only = [p for p, _ in data["prices"]]
                result.append({
                    "name": key,
                    "count": data["count"],
                    "total_value": data["total_value"],
                    "avg_price": avg_p,
                    "min_price": min(prices_only) if prices_only else 0,
                    "max_price": max(prices_only) if prices_only else 0
                })
            return result

        # Calculate overall stats
        overall_avg = total_value / total_units if total_units > 0 else 0
        all_mins = [c["min_price"] for c in by_condition if c["min_price"] > 0]
        all_maxs = [c["max_price"] for c in by_condition if c["max_price"] > 0]

        return {
            "total_units": total_units,
            "total_value": total_value,
            "avg_price": overall_avg,
            "min_price": min(all_mins) if all_mins else 0,
            "max_price": max(all_maxs) if all_maxs else 0,
            "by_rv_type": format_dict_aggregation(by_rv_type_dict),
            "by_condition": by_condition,
            "by_manufacturer": format_dict_aggregation(by_manufacturer_dict)
        }


# Response models
class InventoryItem(BaseModel):
    stock_number: Optional[str] = None
    title: Optional[str] = None
    year: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    floorplan: Optional[str] = None
    rv_class: Optional[str] = None
    condition: Optional[str] = None
    sale_price: Optional[float] = None
    msrp: Optional[float] = None
    location: Optional[str] = None
    dealer_source: Optional[str] = None
    dealer_group: Optional[str] = None
    first_image: Optional[str] = None
    sleeps: Optional[str] = None
    length: Optional[str] = None
    weight: Optional[str] = None
    vin: Optional[str] = None
    days_on_lot: Optional[int] = None


class InventoryResponse(BaseModel):
    items: list[InventoryItem]
    total: int
    dealers_queried: int


class DealersResponse(BaseModel):
    dealers: list[str]
    count: int


class FilterOptionsResponse(BaseModel):
    rv_types: list[str]
    states: list[str]
    regions: list[str] = []
    cities: list[str] = []
    conditions: list[str]
    dealer_groups: list[str] = []
    manufacturers: list[str] = []


class AggregationItem(BaseModel):
    name: str
    count: int
    total_value: float
    avg_price: float
    min_price: float
    max_price: float
    avg_days_on_lot: Optional[float] = None


class AggregatedSummaryResponse(BaseModel):
    total_units: int
    total_value: float
    avg_price: float
    min_price: float
    max_price: float
    by_rv_type: List[AggregationItem]
    by_dealer_group: List[AggregationItem]
    by_manufacturer: List[AggregationItem]
    by_condition: List[AggregationItem]
    by_state: List[AggregationItem]
    by_region: Optional[List[AggregationItem]] = None
    by_city: Optional[List[AggregationItem]] = None
    by_county: Optional[List[AggregationItem]] = None


# Initialize clients based on environment variable
if USE_DELTALAKE:
    print("=" * 60)
    print("USING DELTA LAKE DIRECT ACCESS")
    print("  Expected startup time: ~50 seconds")
    print("  Full 187K inventory (no limits)")
    print("=" * 60)
    client = DeltaLakeClient()
else:
    print("=" * 60)
    print("USING GRAPHQL API")
    print("  Expected startup time: 20-25 minutes")
    print("  Set USE_DELTALAKE=true for faster startup")
    print("=" * 60)
    client = FabricGraphQLClient()


@app.on_event("startup")
async def startup_event():
    """Pre-load all caches at server startup for instant responses."""
    if USE_DELTALAKE:
        print("Server starting - loading Delta Lake cache...")
        client.load_inventory_cache()  # Delta Lake loads everything in one step
        print("Server ready - Delta Lake cache loaded!")
    else:
        print("Server starting - pre-loading GraphQL caches...")
        client.load_cache()  # Products + Dealers dimension tables
        client.load_inventory_cache()  # Inventory with joined dimensions
        client.build_aggregations_cache()  # Pre-computed aggregations (no filters)
        client.build_filtered_aggregations_cache()  # Pre-computed aggregations for common filters
        print("Server ready - all GraphQL caches loaded!")


@app.get("/")
async def root():
    return {
        "message": "RV Market Intelligence API",
        "version": "5.0.0",
        "source": "Delta Lake Direct Access" if USE_DELTALAKE else "Fabric GraphQL API",
        "mode": "deltalake" if USE_DELTALAKE else "graphql",
        "docs": "/docs",
        "endpoints": ["/dealers", "/inventory", "/inventory/summary", "/inventory/aggregated", "/inventory/totals", "/filters"]
    }


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.get("/test-relationship")
async def test_relationship():
    """Test if GraphQL relationships are set up for nested queries."""
    # Try nested query with dim_product_models relationship
    query = """
    {
        fact_inventory_currents(first: 3) {
            items {
                price
                condition
                dim_product_models {
                    rv_type
                    manufacturer
                }
            }
        }
    }
    """
    try:
        result = client.execute_query(query)
        return {"success": True, "data": result, "message": "Relationship works! Can use nested queries."}
    except Exception as e:
        return {"success": False, "error": str(e), "message": "Relationship not set up - need to configure in Fabric GraphQL editor."}


@app.get("/filters", response_model=FilterOptionsResponse)
async def get_filters():
    """Get available filter options (RV types, states, conditions)."""
    try:
        options = client.get_filter_options()
        return FilterOptionsResponse(**options)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/dealers", response_model=DealersResponse)
async def get_dealers():
    """Get list of available dealers."""
    try:
        dealers = client.list_dealers()
        return DealersResponse(dealers=dealers, count=len(dealers))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inventory", response_model=InventoryResponse)
async def get_inventory(
    dealer: Optional[str] = Query(default=None, description="Filter by dealer name"),
    dealer_group: Optional[str] = Query(default=None, description="Filter by dealer group"),
    limit: int = Query(default=100, ge=1, le=10000, description="Max items to return"),
    rv_class: Optional[str] = Query(default=None, description="Filter by RV type"),
    manufacturer: Optional[str] = Query(default=None, description="Filter by manufacturer/brand"),
    state: Optional[str] = Query(default=None, description="Filter by state"),
    condition: Optional[str] = Query(default=None, description="Filter by condition (New, Used, In Transit)"),
    min_price: Optional[float] = Query(default=None, description="Minimum price"),
    max_price: Optional[float] = Query(default=None, description="Maximum price")
):
    """
    Get inventory data from CACHED data - instant response!

    - **dealer**: Optional dealer filter
    - **dealer_group**: Optional dealer group filter
    - **limit**: Max items (1-10000)
    - **rv_class**: Filter by RV type (e.g., "CLASS A", "TRAVEL TRAILER")
    - **manufacturer**: Filter by manufacturer/brand
    - **state**: Filter by state (e.g., "Arizona", "Minnesota")
    - **condition**: Filter by condition (NEW/USED)
    - **min_price**: Minimum sale price
    - **max_price**: Maximum sale price
    """
    try:
        # Use cached inventory for instant response
        results = client.get_cached_inventory(
            dealer=dealer,
            dealer_group=dealer_group,
            rv_type=rv_class,
            manufacturer=manufacturer,
            condition=condition,
            state=state,
            min_price=min_price,
            max_price=max_price,
            limit=limit
        )

        items = []
        for row in results:
            items.append(InventoryItem(
                stock_number=str(row.get('stock_number')) if row.get('stock_number') else None,
                title=str(row.get('title')) if row.get('title') else None,
                year=str(row.get('year')) if row.get('year') else None,
                make=str(row.get('make')) if row.get('make') else None,
                model=str(row.get('model')) if row.get('model') else None,
                floorplan=str(row.get('floorplan')) if row.get('floorplan') else None,
                rv_class=str(row.get('rv_class')) if row.get('rv_class') else None,
                condition=str(row.get('condition')) if row.get('condition') else None,
                sale_price=float(row['sale_price']) if row.get('sale_price') else None,
                msrp=float(row['msrp']) if row.get('msrp') else None,
                location=str(row.get('location')) if row.get('location') else None,
                dealer_source=str(row.get('dealer_source')) if row.get('dealer_source') else None,
                dealer_group=str(row.get('dealer_group')) if row.get('dealer_group') else None,
                first_image=str(row.get('first_image')) if row.get('first_image') else None,
                sleeps=str(row.get('sleeps')) if row.get('sleeps') else None,
                length=str(row.get('length')) if row.get('length') else None,
                weight=str(row.get('weight')) if row.get('weight') else None,
                vin=str(row.get('vin')) if row.get('vin') else None,
                days_on_lot=row.get('days_on_lot'),
            ))

        dealers_in_results = len(set(item.dealer_source for item in items if item.dealer_source))

        return InventoryResponse(
            items=items,
            total=len(items),
            dealers_queried=dealers_in_results
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inventory/summary")
async def get_inventory_summary(
    dealer: Optional[str] = Query(default=None, description="Filter by dealer name")
):
    """Get summary statistics for inventory."""
    try:
        summary = client.get_inventory_summary(dealer=dealer)
        return {"summary": summary}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inventory/totals")
async def get_exact_totals():
    """
    Get FAST totals using single GraphQL groupBy query.

    Returns exact counts for NEW/USED in ~2-3 seconds.
    """
    try:
        # Single API call - groupBy condition only (fastest possible)
        # Note: first: 100 ensures we get all condition groups (only 2: NEW/USED)
        condition_query = """
        {
            fact_inventory_currents(first: 100) {
                groupBy(fields: [condition]) {
                    fields { condition }
                    aggregations {
                        count(field: price)
                        sum(field: price)
                        avg(field: price)
                        min(field: price)
                        max(field: price)
                    }
                }
            }
        }
        """
        result = client.execute_query(condition_query)
        groups = result.get("fact_inventory_currents", {}).get("groupBy", [])

        by_condition = []
        total_units = 0
        total_value = 0.0

        for group in groups:
            fields = group.get("fields", {})
            aggs = group.get("aggregations", {})
            cond = fields.get("condition")
            count = aggs.get("count") or 0
            total = aggs.get("sum") or 0

            if cond:
                by_condition.append({
                    "name": cond,
                    "count": count,
                    "total_value": total,
                    "avg_price": aggs.get("avg") or 0,
                    "min_price": aggs.get("min") or 0,
                    "max_price": aggs.get("max") or 0
                })
                total_units += count
                total_value += total

        return {
            "total_units": total_units,
            "total_value": total_value,
            "by_condition": sorted(by_condition, key=lambda x: x["count"], reverse=True)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/counts")
async def get_table_counts():
    """Get row counts for all tables using groupBy aggregations."""
    try:
        # Count dim_product_models using groupBy on rv_type
        prod_query = """{ dim_product_models(first: 100) { groupBy(fields: [rv_type]) { aggregations { count(field: dim_product_model_skey) } } } }"""
        prod_result = client.execute_query(prod_query)
        prod_groups = prod_result.get("dim_product_models", {}).get("groupBy", [])
        prod_count = sum(g.get("aggregations", {}).get("count", 0) for g in prod_groups)

        # Count dim_dealerships using groupBy on state
        dealer_query = """{ dim_dealerships(first: 100) { groupBy(fields: [state]) { aggregations { count(field: dim_dealership_skey) } } } }"""
        dealer_result = client.execute_query(dealer_query)
        dealer_groups = dealer_result.get("dim_dealerships", {}).get("groupBy", [])
        dealer_count = sum(g.get("aggregations", {}).get("count", 0) for g in dealer_groups)

        # Count fact_inventory using groupBy on condition
        inv_query = """{ fact_inventory_currents(first: 100) { groupBy(fields: [condition]) { aggregations { count(field: price) } } } }"""
        inv_result = client.execute_query(inv_query)
        inv_groups = inv_result.get("fact_inventory_currents", {}).get("groupBy", [])
        inv_count = sum(g.get("aggregations", {}).get("count", 0) for g in inv_groups)

        return {
            "dim_product_models": prod_count,
            "dim_dealerships": dealer_count,
            "fact_inventory_currents": inv_count,
            "note": "Counts via groupBy aggregation"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inventory/agg/rv_type")
async def get_agg_rv_type(limit: Optional[int] = None):
    """Get RV types with counts - uses cached product data. No limit = all."""
    try:
        # Ensure cache is loaded
        client.load_cache()

        # Fetch ALL inventory with pagination
        items = client.fetch_all_inventory(fields=["dim_product_model_skey", "price"])

        # Aggregate by rv_type using CACHED products (no API calls!)
        by_type = defaultdict(lambda: {"count": 0, "total_value": 0})
        for item in items:
            product = client.get_product(item.get("dim_product_model_skey"))
            rv_type = product.get("rv_type")
            if rv_type:
                by_type[rv_type]["count"] += 1
                by_type[rv_type]["total_value"] += item.get("price") or 0

        # Sort (and optionally limit)
        sorted_types = sorted(by_type.items(), key=lambda x: x[1]["count"], reverse=True)
        if limit:
            sorted_types = sorted_types[:limit]
        return {
            "total_sample": len(items),
            "by_rv_type": [{"name": k, "count": v["count"], "total_value": v["total_value"]} for k, v in sorted_types]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inventory/agg/dealer_group")
async def get_agg_dealer_group(limit: Optional[int] = None):
    """Get dealer groups with counts - uses cached dealer data. No limit = all."""
    try:
        # Ensure cache is loaded
        client.load_cache()

        # Fetch ALL inventory with pagination
        items = client.fetch_all_inventory(fields=["dim_dealership_skey", "price"])

        # Aggregate using CACHED dealers (no API calls!)
        by_group = defaultdict(lambda: {"count": 0, "total_value": 0})
        for item in items:
            dealer = client.get_dealer(item.get("dim_dealership_skey"))
            group = dealer.get("dealer_group")
            if group:
                by_group[group]["count"] += 1
                by_group[group]["total_value"] += item.get("price") or 0

        sorted_groups = sorted(by_group.items(), key=lambda x: x[1]["count"], reverse=True)
        if limit:
            sorted_groups = sorted_groups[:limit]
        return {
            "total_sample": len(items),
            "by_dealer_group": [{"name": k, "count": v["count"], "total_value": v["total_value"]} for k, v in sorted_groups]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inventory/agg/manufacturer")
async def get_agg_manufacturer(limit: Optional[int] = None):
    """Get manufacturers with counts - uses cached product data. No limit = all."""
    try:
        # Ensure cache is loaded
        client.load_cache()

        # Fetch ALL inventory with pagination
        items = client.fetch_all_inventory(fields=["dim_product_model_skey", "price"])

        # Aggregate using CACHED products (no API calls!)
        by_mfr = defaultdict(lambda: {"count": 0, "total_value": 0})
        for item in items:
            product = client.get_product(item.get("dim_product_model_skey"))
            mfr = product.get("manufacturer")
            if mfr:
                by_mfr[mfr]["count"] += 1
                by_mfr[mfr]["total_value"] += item.get("price") or 0

        sorted_mfrs = sorted(by_mfr.items(), key=lambda x: x[1]["count"], reverse=True)
        if limit:
            sorted_mfrs = sorted_mfrs[:limit]
        return {
            "total_sample": len(items),
            "by_manufacturer": [{"name": k, "count": v["count"], "total_value": v["total_value"]} for k, v in sorted_mfrs]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inventory/agg/state")
async def get_agg_state(limit: Optional[int] = None):
    """Get states with counts - uses cached dealer data. No limit = all."""
    try:
        # Ensure cache is loaded
        client.load_cache()

        # Fetch ALL inventory with pagination
        items = client.fetch_all_inventory(fields=["dim_dealership_skey", "price"])

        # Aggregate using CACHED dealers (no API calls!)
        by_state = defaultdict(lambda: {"count": 0, "total_value": 0})
        for item in items:
            dealer = client.get_dealer(item.get("dim_dealership_skey"))
            state = dealer.get("state")
            if state:
                by_state[state]["count"] += 1
                by_state[state]["total_value"] += item.get("price") or 0

        sorted_states = sorted(by_state.items(), key=lambda x: x[1]["count"], reverse=True)
        if limit:
            sorted_states = sorted_states[:limit]
        return {
            "total_sample": len(items),
            "by_state": [{"name": k, "count": v["count"], "total_value": v["total_value"]} for k, v in sorted_states]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inventory/aggregated")
async def get_aggregated_summaries(
    rv_class: Optional[str] = Query(default=None, description="Filter by RV type"),
    dealer_group: Optional[str] = Query(default=None, description="Filter by dealer group"),
    manufacturer: Optional[str] = Query(default=None, description="Filter by manufacturer/brand"),
    condition: Optional[str] = Query(default=None, description="Filter by condition"),
    state: Optional[str] = Query(default=None, description="Filter by state"),
    min_price: Optional[float] = Query(default=None, description="Minimum price"),
    max_price: Optional[float] = Query(default=None, description="Maximum price")
):
    """
    Get FAST aggregated summaries using native GraphQL groupBy (server-side aggregation).

    No filters = instant response using cached groupBy results.
    With filters = falls back to fetching filtered data.
    """
    try:
        # If no filters, use FAST native GraphQL aggregations
        has_filters = any([rv_class, dealer_group, manufacturer, condition, state, min_price, max_price])

        if not has_filters:
            # FAST PATH: Return cached aggregations (instant!)
            return client.get_fast_aggregations()

        # Check for pre-computed single-filter caches (instant!)
        # Only works for single filters without price range
        single_filter_count = sum([
            1 if rv_class else 0,
            1 if condition else 0,
            1 if dealer_group else 0,
            1 if manufacturer else 0,
            1 if state else 0
        ])
        has_price_filter = min_price is not None or max_price is not None

        if single_filter_count == 1 and not has_price_filter:
            # Try pre-computed cache
            if condition:
                cached = client.get_filtered_aggregations_cached(f"condition:{condition}")
                if cached:
                    return cached
            elif rv_class:
                cached = client.get_filtered_aggregations_cached(f"rv_type:{rv_class}")
                if cached:
                    return cached

        # FILTERED PATH: Use cached inventory data + filter in memory
        # (Falls back here for multi-filter or non-cached single filters)
        return client.get_filtered_aggregations(
            rv_type=rv_class,
            dealer_group=dealer_group,
            manufacturer=manufacturer,
            condition=condition,
            state=state,
            min_price=min_price,
            max_price=max_price
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# SALES VELOCITY ENDPOINTS
# =============================================================================

@app.get("/inventory/sales-velocity")
async def get_sales_velocity(
    rv_class: Optional[str] = Query(default=None, description="Filter by RV type"),
    dealer_group: Optional[str] = Query(default=None, description="Filter by dealer group"),
    manufacturer: Optional[str] = Query(default=None, description="Filter by manufacturer/brand"),
    condition: Optional[str] = Query(default=None, description="Filter by condition (NEW/USED)"),
    state: Optional[str] = Query(default=None, description="Filter by state"),
    start_date: Optional[str] = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date (YYYY-MM-DD)")
):
    """
    Get sales velocity metrics including days to sell, sales trends, and breakdowns by dimensions.

    Returns comprehensive sales history data:
    - Total units sold
    - Average/median/min/max days to sell
    - Average sale price and total sales value
    - Breakdowns by RV type, condition, dealer group, manufacturer, state, region
    - Monthly sales trends
    """
    try:
        # Only Delta Lake mode supports sales velocity
        if not USE_DELTALAKE:
            return {
                "error": "Sales velocity data requires Delta Lake mode (USE_DELTALAKE=true)",
                "total_sold": 0,
                "avg_days_to_sell": None,
            }

        return client.get_sales_velocity_filtered(
            rv_type=rv_class,
            dealer_group=dealer_group,
            manufacturer=manufacturer,
            condition=condition,
            state=state,
            start_date=start_date,
            end_date=end_date
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inventory/sales-date-range")
async def get_sales_date_range():
    """
    Get the available date range for sales data.

    Returns the earliest and latest dates in the sales history,
    useful for populating date picker UI components.
    """
    try:
        if not USE_DELTALAKE:
            return {"min_date": None, "max_date": None}

        return client.get_date_range()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

