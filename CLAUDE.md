# RV Market Intelligence Dashboard

## Quick Start

```bash
# Terminal 1: FastAPI backend - Choose one:

# Option A: Delta Lake (FAST - ~50 seconds, full 187K inventory)
cd api && USE_DELTALAKE=true python -m uvicorn main:app --port 8000

# Option B: GraphQL (SLOW - 20-25 min, 100K limit)
cd api && python -m uvicorn main:app --port 8000

# Terminal 2: React frontend
cd mobile-app && npm run dev -- --port 5175
```

**Open http://localhost:5175**

**Routes:**
- `/` or `/sales/*` - Sales Platform (main entry point)
- `/analytics` - Legacy Analytics Dashboard (A/B/C/M versions)

---

## Architecture (Updated January 2025)

### Two Backend Modes

| Mode | Startup | Memory | Inventory | How to Enable |
|------|---------|--------|-----------|---------------|
| **Delta Lake** | ~50 sec | ~1.1 GB | Full 187K | `USE_DELTALAKE=true` |
| **GraphQL** | 20-25 min | ~400 MB | 100K limit | Default (no env var) |

### Delta Lake Mode (Recommended)

Reads Delta tables directly from Fabric Lakehouse using `deltalake` library:

```
Server Startup (~52 seconds)
  └─ build_cache()
       ├─ dim_product_model (29,437)      → products cache (63 MB)
       ├─ dim_product (153,913)           → floorplans cache (63 MB)
       ├─ dim_dealership (12,368)         → dealers cache (38 MB)
       ├─ dim_date (8,766)                → dates cache (6 MB)
       ├─ fact_inventory_current (187,600) → inventory + pandas JOINs (263 MB)
       ├─ fact_inventory_sales (562,754)   → sales data with days_to_sell (695 MB)
       ├─ Pre-compute aggregations (~2 sec) → _aggregations_cache (instant unfiltered responses)
       └─ Total memory: ~1.1 GB
```

**Pros:** 10x faster startup, full data (no 100K limit), includes sales velocity data, instant unfiltered responses
**Requires:** `az login` for authentication

**Performance Note:** Unfiltered `/inventory/aggregated` requests return in ~300-400ms (from pre-computed cache) vs 3+ seconds for filtered requests. See Issue #25 for details.

### GraphQL Mode (Legacy)

Uses Fabric GraphQL API with multiple cache-building passes:

```
Server Startup (~20-25 min)
  ├─ load_cache()                      → Fetch dimensions (~1 min)
  ├─ load_inventory_cache()            → Fetch 100k inventory (~6 min)
  ├─ build_aggregations_cache()        → groupBy queries (~4 min)
  └─ build_filtered_aggregations_cache() → Pre-compute filters (~12 min)
```

**Pros:** Battle-tested, lower memory usage
**Cons:** Slow startup, 100K inventory limit, complex auth

### Request Time (Both Modes)

All requests are instant (in-memory):
- `/filters` → Filter options from dimension caches
- `/dealers` → Dealer list from cache
- `/inventory` → Filter inventory in memory
- `/aggregated` → Pre-computed or on-demand aggregations

---

## Key Files

### Backend
| File | Purpose |
|------|---------|
| `api/main.py` | FastAPI backend - endpoints, GraphQL client, env var switch |
| `api/deltalake_adapter.py` | Delta Lake client (same interface as GraphQL client) |
| `api/start_server.bat` | Windows batch file to start server with Delta Lake mode |
| `parquet_test/deltalake_cache.py` | Delta Lake cache builder with pandas JOINs |
| `parquet_test/gold_table_reader.py` | Low-level Delta table reader |
| `parquet_test/SCHEMA.md` | Complete schema for all 13 gold tables |

### Sales Platform (Main App)
| File | Purpose |
|------|---------|
| `mobile-app/src/App.tsx` | Router config - Sales Platform at `/`, Analytics at `/analytics` |
| `mobile-app/src/pages/SalesPlatform/index.tsx` | Sales Platform shell with sidebar, header, mobile nav |
| `mobile-app/src/pages/SalesPlatform/SalesDashboard.tsx` | Territory overview with KPIs and quick actions |
| `mobile-app/src/pages/SalesPlatform/DealerDirectory.tsx` | Dealer list with search and filters |
| `mobile-app/src/pages/SalesPlatform/DealerDetail.tsx` | Individual dealer details page |
| `mobile-app/src/pages/SalesPlatform/TerritoryMap.tsx` | Interactive territory map |
| `mobile-app/src/pages/SalesPlatform/CompetitiveIntel.tsx` | Competitive landscape analysis |
| `mobile-app/src/pages/SalesPlatform/ProductCatalog.tsx` | Product catalog for presentations |
| `mobile-app/src/pages/SalesPlatform/MeetingPrep.tsx` | Meeting preparation tool |
| `mobile-app/src/context/SalesContext.tsx` | Sales Platform state (theme, view, filters) - supports multi-select arrays |
| `mobile-app/src/hooks/useSalesData.ts` | Sales Platform data hooks - builds comma-separated filter params |
| `mobile-app/src/components/sales/FilterPanel.tsx` | Multi-select searchable dropdowns for dealer/manufacturer/model |
| `mobile-app/src/components/sales/` | Sales components (Sidebar, Header, etc.) |

### Analytics Dashboard (Legacy)
| File | Purpose |
|------|---------|
| `mobile-app/src/pages/Dashboard.tsx` | Analytics dashboard UI with tabs + A/B/C/M version toggle |
| `mobile-app/src/components/analytics/AnalyticsTab.tsx` | Version A: Recharts (original) |
| `mobile-app/src/components/analytics/AnalyticsTabV2.tsx` | Version B: Tremor library |
| `mobile-app/src/components/analytics/AnalyticsTabV3.tsx` | Version C: ECharts Premium (Thor Industries branded) |
| `mobile-app/src/components/analytics/AnalyticsTabMobile.tsx` | Version M: Mobile-optimized (touch-friendly, vertical layout) |
| `mobile-app/src/context/CrossFilterContext.tsx` | Cross-filter state management |
| `mobile-app/src/components/charts/` | Chart components (MarketShareDonut, TopBarChart, etc.) |
| `mobile-app/src/hooks/useOneLakeInventory.ts` | React hooks for API calls |

### Shared
| File | Purpose |
|------|---------|
| `mobile-app/src/styles/thorTheme.ts` | Thor Industries brand style guide constants |

**Documentation:**
- `PROPOSAL-GraphQL-Architecture.md` - Future architecture improvements proposal

**Archived files in `/archive`** - old connectors, scripts, docs (not used)

---

## Thor Industries Style Guide

The dashboard uses Thor Industries' brand design system. Based on [thorindustries.com](https://www.thorindustries.com).

### Color Palette

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| **Charcoal** | `#181817` | `--thor-charcoal` | Primary text, dark backgrounds |
| **Off-White** | `#fffdfa` | `--thor-off-white` | Light backgrounds, contrast text |
| **Sage Green** | `#495737` | `--thor-sage` | Primary accent, buttons, success states |
| **Gold/Amber** | `#a46807` | `--thor-gold` | Action buttons, prices, warnings |
| **Steel Blue** | `#577d91` | `--thor-steel-blue` | Info buttons, secondary accents |
| **Light Beige** | `#f7f4f0` | `--thor-light-beige` | Page backgrounds |
| **Medium Gray** | `#8c8a7e` | `--thor-medium-gray` | Muted text |
| **Border Gray** | `#d9d6cf` | `--thor-border-gray` | Dividers, borders |
| **Warm Gray** | `#595755` | `--thor-warm-gray` | Secondary text |

### Typography

| Element | Font | Weight | Style |
|---------|------|--------|-------|
| **Headings** | Montserrat | 700-800 | -0.025em tracking |
| **Labels** | Montserrat | 700 | UPPERCASE, 0.1em tracking |
| **Body** | Open Sans | 400-600 | Normal |

### CSS Classes

```css
/* Buttons */
.btn-thor-sage      /* Primary sage green button */
.btn-thor-gold      /* Gold/amber action button */
.btn-thor-steel     /* Steel blue info button */
.btn-thor-outline   /* Transparent with border */

/* Cards */
.card-thor          /* White card with border */
.card-thor-glass    /* Dark mode glassmorphism card */

/* Inputs */
.input-thor         /* Styled input with sage focus ring */

/* Labels */
.thor-label         /* Uppercase label text */
.thor-heading-uppercase  /* Bold uppercase heading */

/* Badges */
.badge-thor-new     /* Sage green NEW badge */
.badge-thor-used    /* Gold USED badge */

/* Decorative */
.thor-accent-line   /* Gradient accent line (sage-gold-steel) */
```

### Style Guide Files

| File | Purpose |
|------|---------|
| `mobile-app/src/styles/thorTheme.ts` | TypeScript constants for colors, typography, spacing |
| `mobile-app/src/index.css` | CSS custom properties, Tailwind theme, utility classes |

### Using Thor Theme in Components

```typescript
// Import theme constants
import { THOR_COLORS, THOR_DARK } from '../styles/thorTheme'

// Use in inline styles
style={{ color: THOR_COLORS.accent.sage }}

// Use CSS variables in Tailwind classes
className="text-[var(--thor-sage)] bg-[var(--thor-light-beige)]"

// Use utility classes
className="card-thor btn-thor-sage thor-label"
```

### Design Philosophy

Thor Industries uses an **outdoor adventure aesthetic** with:
- Earthy color palette (sage, gold, warm grays)
- Modern minimalism with clean layouts
- Accessibility-focused typography hierarchy
- Subtle hover effects and smooth transitions
- Large imagery with text contrast

---

## Sales Platform Filter Panel

The Sales Platform includes a powerful filter panel with **multi-select searchable dropdowns** for filtering inventory data.

### Filter Panel Features
- **Multi-select support**: Select multiple values for dealer group, manufacturer, and model filters
- **Type-to-search**: Filter large option lists by typing in the search box
- **Chip display**: Selected values shown as removable chips
- **Clear all**: One-click to clear all selections for a filter
- **No item limits**: All options displayed (659 dealer groups, 281 manufacturers, 1,223 models)

### Available Filters
| Filter | Type | Options |
|--------|------|---------|
| Region | Single select | 7 regions |
| State | Single select | 60 states/provinces |
| City | Single select | 4,510 cities |
| Dealer Group | **Multi-select** | 659 dealer groups |
| RV Type | Single select | 9 RV types |
| Condition | Single select | NEW, USED |
| Manufacturer | **Multi-select** | 281 manufacturers |
| Model | **Multi-select** | 1,223 models |
| Price Range | Min/Max inputs | Numeric |

### Multi-Select Implementation

**Frontend (FilterPanel.tsx)**:
```typescript
// SearchableSelect component with multi-select
const selectedValues: string[] = Array.isArray(rawValue)
  ? rawValue
  : (rawValue ? [rawValue] : [])

// Toggle selection
const handleToggle = (option: string) => {
  if (isSelected) {
    updateFilter(filterKey, selectedValues.filter(v => v !== option))
  } else {
    updateFilter(filterKey, [...selectedValues, option])
  }
}
```

**Context (SalesContext.tsx)**:
```typescript
export interface SalesFilters {
  dealerGroup?: string | string[]    // Supports multi-select
  manufacturer?: string | string[]   // Supports multi-select
  model?: string | string[]          // Supports multi-select
  // ... other single-select filters
}
```

**Data Hooks (useSalesData.ts)**:
```typescript
// Arrays become comma-separated URL params
if (filters.dealerGroup) {
  const value = Array.isArray(filters.dealerGroup)
    ? filters.dealerGroup.join(',')
    : filters.dealerGroup
  if (value) params.append('dealer_group', value)
}
```

**Backend (deltalake_adapter.py)**:
```python
def _parse_multi_value(self, value: str) -> List[str]:
    """Parse comma-separated filter values into a list."""
    return [v.strip() for v in value.split(',') if v.strip()]

def _apply_filter(self, df: pd.DataFrame, column: str, value: str) -> pd.DataFrame:
    """Apply filter supporting both single and comma-separated values."""
    values = self._parse_multi_value(value)
    if len(values) == 1:
        return df[df[column] == values[0]]
    return df[df[column].isin(values)]
```

### Filter Panel Files
| File | Purpose |
|------|---------|
| `FilterPanel.tsx` | UI component with SearchableSelect |
| `SalesContext.tsx` | Filter state with array type support |
| `useSalesData.ts` | API param building with comma-join |
| `deltalake_adapter.py` | Backend filtering with `.isin()` |

---

## Analytics Tab & Cross-Filtering

The Analytics tab supports **A/B/C/M testing** with four visualization implementations:

### A/B/C/M Version Toggle
Dashboard.tsx includes a toggle to switch between versions:
- **Version A** (Recharts): Original implementation with standard charts
- **Version B** (Tremor): Dashboard component library with card-based layout
- **Version C** (Thor Premium): Dark mode with Thor Industries branding
- **Version M** (Mobile): Mobile-first design optimized for touch devices

### Version C (Thor Premium) Features
- Dark mode using Thor charcoal background (`#181817`)
- Thor-branded colors (sage, gold, steel blue gradients)
- Glassmorphism effects (`backdrop-filter: blur(20px)`)
- Gradient fills using `echarts.graphic.LinearGradient`
- Glow effects with Thor accent colors
- Smooth animations (1500ms, `cubicOut` easing)
- Universal transitions for morphing between chart states
- Charts: Donut, Area, Rose diagram, Radar, Gauges

### Version M (Mobile) Features
- **Mobile-first layout**: All content stacks vertically for small screens
- **2x2 KPI Grid**: Compact stats cards (Total Units, Value, Avg Price, RV Types)
- **Collapsible Sections**: Accordion-style headers to reduce scroll depth
- **Touch-friendly Charts**: Large tap targets on donut chart legend items
- **Custom Bar Visualization**: Progress-bar style horizontal bars (no Recharts BarChart)
- **Condition Cards**: Large tappable NEW/USED cards with stats
- **Price Analysis Card**: Dark-themed card showing avg/min/max
- **Bottom Navigation**: Fixed nav bar for quick section jumping (Overview, Types, Condition, Dealers)
- **Floating Filter Banner**: Shows active cross-filter at bottom with clear button
- **Mobile Loading Skeleton**: Optimized placeholder UI during data fetch
- Best viewed at viewport width < 640px

### How Cross-Filtering Works
1. User clicks a chart element (pie segment, bar, condition card)
2. `CrossFilterContext` stores the filter (dimension + value)
3. `AnalyticsTab` calls API with filter params: `/inventory/aggregated?rv_class=FIFTH%20WHEEL`
4. All charts update with filtered data from API response

### Charts Available (Version A)
- Market Share by RV Type (donut)
- Condition Analysis (NEW vs USED cards + bar)
- Geographic Distribution (treemap)
- Top Manufacturers (bar)
- Price Distribution (histogram)
- Top Dealer Groups (bar)
- Average Price by RV Type (bar)

### Key Components
```
AnalyticsTab.tsx          - Version A: Recharts, API-based filtering
AnalyticsTabV2.tsx        - Version B: Tremor components
AnalyticsTabV3.tsx        - Version C: Thor Premium (ECharts + Thor branding)
AnalyticsTabMobile.tsx    - Version M: Mobile-optimized (custom touch UI)
CrossFilterContext.tsx    - React Context for filter state
ChartCard.tsx            - Wrapper with loading states
MarketShareDonut.tsx     - Pie chart with click handlers
TopBarChart.tsx          - Horizontal/vertical bar charts
ConditionComparison.tsx  - NEW/USED comparison
StateTreemap.tsx         - Geographic treemap
PriceDistributionChart.tsx - Price histogram
EChartsGeoMap.tsx        - ECharts USA choropleth map (Version C)
USAMap.tsx               - react-simple-maps choropleth (Versions A, B, D-J)
MobileGeoMap.tsx         - Mobile geo map with region aggregation
```

### Frontend Dependencies
```json
{
  "react-router-dom": "^7.x",   // Routing between Sales Platform and Analytics
  "recharts": "^2.x",           // Version A charts
  "@tremor/react": "^3.x",      // Version B (requires --legacy-peer-deps for React 19)
  "echarts": "^5.x",            // Version C charts
  "echarts-for-react": "^3.x"   // Version C React wrapper
}
```

---

## Known Issue: Full Dataset vs Cached Subset Discrepancy

**Problem:** Pie chart shows FIFTH WHEEL = ~36K units, but clicking it shows ~19K units.

**Cause:**
- Pie chart totals come from `groupBy` on full 186K dataset
- Filtered data comes from pre-computed cache based on 100K cached inventory

**Workaround:** The numbers in filtered view are accurate for the cached subset. For fully consistent numbers, see `PROPOSAL-GraphQL-Architecture.md` for recommended solutions (Materialized Views).

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/debug/columns` | GET | Debug endpoint showing inventory DataFrame columns (Delta Lake mode only) |
| `/filters` | GET | Filter options (rv_types, states, regions, cities, conditions, dealer_groups, manufacturers, models, floorplans) |
| `/dealers` | GET | List of dealership names |
| `/inventory` | GET | Inventory items with filters |
| `/inventory/aggregated` | GET | Aggregated stats (KPIs, charts) with by_region, by_city, by_county. Includes `avg_days_to_sell` and `sales_velocity` |
| `/inventory/totals` | GET | Quick totals via native groupBy |
| `/inventory/sales-velocity` | GET | Sales velocity metrics (Delta Lake mode only) - days to sell, sale prices, breakdowns by dimension (no limits) |
| `/inventory/sales-date-range` | GET | Available date range for sales data (min_date, max_date) |
| `/inventory/top-floorplans` | GET | Top selling floorplans by RV category (Delta Lake mode only) |

**Common Params**: `rv_class`, `dealer_group`, `manufacturer`, `condition`, `state`, `model`, `floorplan`, `min_price`, `max_price`, `limit`

**Multi-Select Params** (comma-separated values supported):
- `dealer_group=CAMPING WORLD RV SALES,CAMPERS INN RV` - Filter by multiple dealer groups
- `manufacturer=KEYSTONE,FOREST RIVER` - Filter by multiple manufacturers
- `model=COUGAR,MONTANA` - Filter by multiple models

**Sales Velocity Params**: `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD) - Filter sales by date range

**Top Floorplans Params**: `start_date`, `end_date`, `limit` (default 10) - Returns array of categories with floorplans

---

## Fabric Config

```
Workspace ID:   9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc
GraphQL API ID: 5c282d47-9d39-475c-ba43-5145fdc021b8
Azure Client:   7c59a81d-6b68-47a5-b491-7eed93fe6b13
Azure Tenant:   5e57ec01-060b-4ff9-899f-972a9ca7499c
GraphQL URL:    https://{workspace_id}.z9c.graphql.fabric.microsoft.com/v1/workspaces/{workspace_id}/graphqlapis/{api_id}/graphql
```

**Tables** (Lakehouse → GraphQL query names):
| Lakehouse Table | GraphQL Query | Key Field | Fields |
|-----------------|---------------|-----------|--------|
| `dim_product_model` | `dim_product_models` | `dim_product_model_skey` | rv_type, manufacturer, model |
| `dim_product` | `dim_products` | `dim_product_skey` | floorplan |
| `dim_dealership` | `dim_dealerships` | `dim_dealership_skey` | dealer_group, state, dealership, region, city, county |
| `fact_inventory_current` | `fact_inventory_currents` | - | stock_number, price, condition, days_on_lot, dim_product_model_skey, dim_product_skey, dim_dealership_skey |

---

## Issues We Hit & How to Avoid

### 1. GraphQL `first` Limits groupBy Results Too
**Problem**: `first: 1` on the query also limits groupBy to 1 group
**Solution**: Use `first: 100000` to get all groups in groupBy queries

### 2. No Native JOINs in Fabric GraphQL
**Problem**: Can't query `fact_inventory.dim_product.rv_type` directly
**Solution**: Cache dimension tables, join in Python, or configure relationships in Fabric portal

### 3. Azure Credential Failures
**Problem**: `AzurePowerShellCredential.get_token failed` errors intermittently
**Solution**: Cache everything at startup; avoid live API calls during requests

### 4. SQL Endpoint Blocked by Firewall
**Problem**: TDS traffic (port 1433) blocked; SQL approach failed
**Solution**: Stick with GraphQL API (HTTPS, port 443)

### 5. 100k Record Limit
**Problem**: Can only fetch 100k inventory items; total is 185k
**Solution**: Use native `groupBy` for aggregations (scans full dataset); accept that `/inventory` and filtered queries only cover cached 100k

### 6. Server Won't Reload with `--reload`
**Problem**: WatchFiles detects changes but old code keeps running
**Solution**: Kill python processes manually, restart without `--reload` for production

### 7. GraphQL IN Operator Limited to 100 Values
**Problem**: `filter: { field: { in: [...] } }` can only accept 100 values max
**Solution**: Batch queries with 100 items per batch; use `fetch_dimension_data_for_skeys()` helper

### 8. Sub-Table Aggregations Must Use On-Demand Dimension Fetching
**Problem**: Sub-tables (by_rv_type, by_dealer_group) only added to 100k because dimension cache was incomplete
**Solution**: `build_aggregations_cache()` now fetches dimension data specifically for skeys found in inventory groupBy results, ensuring all 185k records are properly mapped

### 9. Cross-Filter Data Mismatch
**Problem**: Clicking chart elements showed wrong counts (e.g., 3 units instead of 35K)
**Solution**: Changed from client-side filtering (500 items) to API-based filtering. `AnalyticsTab.tsx` now calls `/inventory/aggregated?filter=value` for accurate data.

### 10. Tremor + React 19 Compatibility
**Problem**: `@tremor/react` has peer dependency on React 18, fails to install with React 19
**Solution**: Use `npm install @tremor/react --legacy-peer-deps`

### 11. Tremor Color Type Not Exported
**Problem**: `import { Color } from '@tremor/react'` fails - type not exported
**Solution**: Define custom `TremorColor` type in component:
```typescript
type TremorColor = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'
```

### 12. Vite "Outdated Optimize Dep" 504 Error
**Problem**: After installing new dependencies, Vite returns 504 errors for cached modules
**Solution**: Clear Vite cache: `rm -rf node_modules/.vite` and restart dev server

### 13. React Components Created During Render (ESLint Warning)
**Problem**: CustomTooltip components defined inside chart component functions cause React reconciliation issues and ESLint warnings
**Solution**: Move tooltip components outside the parent component as standalone functions:
```typescript
// Bad - defined inside component
function MyChart() {
  const CustomTooltip = ({ active, payload }) => { ... }
  return <Chart><Tooltip content={<CustomTooltip />} /></Chart>
}

// Good - defined outside component
function ChartTooltip({ active, payload }) { ... }

function MyChart() {
  return <Chart><Tooltip content={<ChartTooltip />} /></Chart>
}
```

### 14. ECharts Type Safety
**Problem**: ECharts callback params typed as `any` cause TypeScript errors
**Solution**: Define interface for ECharts tooltip params in `AnalyticsTabV3.tsx`:
```typescript
interface EChartsTooltipParams {
  name: string
  value: number
  percent?: number
  color: string
  seriesName?: string
  axisValue?: string
}
```

### 15. Schema Change: dim_product Split into Two Tables (January 2025)
**Problem**: Original `dim_product` table was split into `dim_product_model` (rv_type, manufacturer, model) and `dim_product` (floorplan). Old code using `dim_product_skey` for product lookups failed.
**Solution**:
- Use `dim_product_model_skey` for rv_type/manufacturer/model lookups
- Use `dim_product_skey` for floorplan lookups
- Inventory table (`fact_inventory_current`) has BOTH foreign keys
- Load two separate caches: `_products_cache` and `_floorplan_cache`

### 16. GraphQL Table Naming Convention
**Problem**: Lakehouse tables are singular (`dim_product`), but GraphQL queries are plural (`dim_products`). Easy to get confused.
**Solution**: Always use plural form in GraphQL queries. The API automatically pluralizes table names.

### 17. Geo Map State Name Case Mismatch (January 2025)
**Problem**: API returns state names in UPPERCASE ("TEXAS", "CALIFORNIA"), but GeoJSON/TopoJSON files use Title Case ("Texas", "California"). Maps showed no data because lookups failed.
**Solution**: Add `toTitleCase()` helper function to convert API names when building lookup maps, and convert back to UPPERCASE in click handlers for API calls:
```typescript
// Helper function (add to end of geo map components)
function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

// When building data lookup map
const dataMap = useMemo(() => {
  const map = new Map<string, AggregationItem>()
  data.forEach(item => {
    const titleCaseName = toTitleCase(item.name)  // Convert UPPERCASE to Title Case
    map.set(titleCaseName, item)
  })
  return map
}, [data])

// When handling click (send UPPERCASE back to API)
const handleStateClick = (geo: { properties: { name: string } }) => {
  onStateSelect(geo.properties.name.toUpperCase())  // Convert Title Case back to UPPERCASE
}
```

**Affected files**:
- `EChartsGeoMap.tsx` - ECharts geo map (Version C)
- `USAMap.tsx` - react-simple-maps (Versions A, B, D-J)
- `MobileGeoMap.tsx` - Mobile version with region aggregation

### 18. API State Limit Was Too Low
**Problem**: API only returned 10 states in `by_state` aggregation, causing maps to show incomplete data.
**Solution**: Changed state limit from 10 to 65 in `api/main.py` (5 locations in aggregation queries).

### 19. Missing react-router-dom After Git Pull
**Problem**: After pulling Sales Platform code from main, Vite failed with "Failed to resolve import react-router-dom".
**Solution**: Install the missing dependency with legacy peer deps:
```bash
npm install react-router-dom --legacy-peer-deps
```

### 20. Pydantic Response Model Missing Fields (January 2025)
**Problem**: `FilterOptionsResponse` Pydantic model didn't include `models` and `floorplans` fields, causing these to be silently dropped from API responses even though the backend was returning them.
**Solution**: Add missing fields to the Pydantic model in `api/main.py`:
```python
class FilterOptionsResponse(BaseModel):
    rv_types: list[str]
    states: list[str]
    regions: list[str] = []
    cities: list[str] = []
    conditions: list[str]
    dealer_groups: list[str] = []
    manufacturers: list[str] = []
    models: list[str] = []        # Added
    floorplans: list[str] = []    # Added
```

### 21. Top Floorplans API Response Format Mismatch (January 2025)
**Problem**: `/inventory/top-floorplans` endpoint returned `categories` as an object `{"CLASS A": {...}}` but frontend TypeScript expected an array `[{category: "CLASS A", ...}]`. Also used `top_floorplans` key but frontend expected `floorplans`.
**Solution**: Changed API to return array format with correct keys:
```python
# Before (wrong)
result['categories'][category] = {'top_floorplans': [...]}

# After (correct)
result['categories'].append({
    'category': category,
    'floorplans': [...]  # Changed from 'top_floorplans'
})
```

### 22. Aggregation Limits Too Restrictive (January 2025)
**Problem**: Aggregation queries had hardcoded limits (100 for dealer_group/manufacturer, 65 for state) that truncated data.
**Solution**: Removed limits in `api/deltalake_adapter.py` to return all data:
```python
# Before
'by_dealer_group': self._aggregate_by(df, 'dealer_group', limit=200),
'by_manufacturer': self._aggregate_by(df, 'manufacturer', limit=200),

# After
'by_dealer_group': self._aggregate_by(df, 'dealer_group'),  # No limit
'by_manufacturer': self._aggregate_by(df, 'manufacturer'),  # No limit
```

### 23. Server Running Old Code After Git Pull
**Problem**: After `git pull`, the running server still had old code without new endpoints (e.g., `/inventory/sales-velocity` returning 404).
**Solution**: Always restart the backend server after pulling new code:
```bash
# Kill existing python processes
taskkill /F /IM python.exe

# Restart with Delta Lake mode
cd api && USE_DELTALAKE=true python -m uvicorn main:app --port 8000
```

### 24. Multi-Select Filters Return Zero Results (January 2025)
**Problem**: After adding multi-select filter support, single select worked (53,089 units) but multi-select returned 0 results. The `_apply_filter` helper with `.isin()` was added to `deltalake_adapter.py` but the server wasn't restarted.
**Solution**: Python caches imported modules. Backend code changes require server restart:
```bash
# Kill existing python processes
taskkill /F /IM python.exe

# Restart with Delta Lake mode (use Anaconda Python if not in PATH)
cd api && USE_DELTALAKE=true python -m uvicorn main:app --port 8000

# Or with explicit Anaconda path on Windows:
cd api && set USE_DELTALAKE=true && C:\Users\rbiren\AppData\Local\anaconda3\python.exe -m uvicorn main:app --port 8000
```
**Verification**: Test with curl:
```bash
# Single select - should return ~53,089
curl "http://localhost:8000/inventory/aggregated?dealer_group=CAMPING+WORLD+RV+SALES"

# Multi-select - should return ~60,830 (sum of both)
curl "http://localhost:8000/inventory/aggregated?dealer_group=CAMPING+WORLD+RV+SALES,CAMPERS+INN+RV"
```

### 25. Slow Aggregated Endpoint Response Times (January 2025)
**Problem**: `/inventory/aggregated` was taking 3,300ms+ per request, causing slow page loads. Two contributing factors:
1. **Frontend**: React Strict Mode caused duplicate API calls; filter object instability caused unnecessary re-fetches
2. **Backend**: Aggregations computed on every request using slow `iterrows()` instead of `to_dict('records')`

**Solution - Frontend** (`useSalesData.ts`, `SalesDashboard.tsx`):
- Removed duplicate `useAggregatedData` call from `SalesDashboard.tsx`
- Added `useMemo` to stabilize filter objects and prevent unnecessary API calls:
```typescript
const stableFilters = useMemo(() => filters, [JSON.stringify(filters)])
```

**Solution - Backend** (`deltalake_adapter.py`):
- Added `_aggregations_cache` class variable to store pre-computed unfiltered aggregations
- Added `_compute_aggregations_no_filter()` method called at startup (~2 seconds)
- Changed `_aggregate_by_fast()` to use `to_dict('records')` instead of `iterrows()` (~10x faster)
- Modified `_build_aggregation_response()` to return cached results when no filters applied
- Used mask-based filtering instead of chained `.copy()` operations

**Results**:
- Unfiltered `/inventory/aggregated`: **3,300ms → 378ms** (~9x improvement)
- Filtered requests still compute on-demand but use optimized methods
- `/inventory/sales-velocity`: **5,600ms → 2,637ms** (~2x improvement)

**Key methods added**:
```python
class DeltaLakeClient:
    _aggregations_cache: Dict[str, Any] = {}  # Pre-computed unfiltered aggregations

    def _compute_aggregations_no_filter(self):
        """Pre-compute aggregations at startup for instant unfiltered responses."""

    def _aggregate_by_fast(self, df, column, limit=None):
        """Fast aggregation using to_dict('records') instead of iterrows()."""
```

---

## Code Quality

### Linting
```bash
# Run ESLint
cd mobile-app && npm run lint

# Run TypeScript check
cd mobile-app && npx tsc --noEmit
```

### Chart Component Patterns
- **Tooltips**: Define as standalone components outside chart functions
- **Click handlers**: Type params explicitly (e.g., `EChartsTooltipParams`)
- **Unused variables**: Remove or prefix with `_` if intentionally unused

---

## Making Changes

### To modify caching logic:

**Delta Lake Mode** (`api/deltalake_adapter.py`):
- `DeltaLakeClient` class provides same interface as GraphQL client
- `get_filter_options()` - returns all filter values from inventory DataFrame
- `get_inventory()` - filtered inventory queries with pandas
- `get_aggregations()` - on-demand aggregations (no limits)
- `get_sales_velocity_filtered()` - sales metrics with date range support
- `get_top_floorplans()` - top selling floorplans by RV category
- `_parse_multi_value()` - splits comma-separated filter values into list
- `_apply_filter()` - applies single or multi-value filter using `.isin()`
- `_aggregations_cache` - stores pre-computed unfiltered aggregations (built at startup)
- `_compute_aggregations_no_filter()` - pre-computes aggregations at startup (~2 sec)
- `_aggregate_by_fast()` - optimized aggregation using `to_dict('records')`
- `_build_aggregation_response()` - returns cached results when no filters applied

**GraphQL Mode** (`api/main.py`):
- `load_cache()` - dimension table loading (products, floorplans, dealers)
  - `_products_cache` keyed by `dim_product_model_skey` (rv_type, manufacturer, model)
  - `_floorplan_cache` keyed by `dim_product_skey` (floorplan)
  - `_dealers_cache` keyed by `dim_dealership_skey` (dealer_group, state, region, city, county)
- `load_inventory_cache()` - inventory + manual joins with all three dimension caches
- `build_aggregations_cache()` - groupBy aggregations (uses on-demand dimension fetching)
- `build_filtered_aggregations_cache()` - pre-computed filters (condition + RV types)
- `fetch_dimension_data_for_skeys()` - batch fetch dimension data for specific skeys
- `get_cached_inventory()` - filtered inventory queries
- `get_filtered_aggregations()` - filtered aggregations

**Cache Building** (`parquet_test/deltalake_cache.py`):
- `build_cache()` - builds complete cache with pandas JOINs
- Loads dimension tables: dim_product_model, dim_product, dim_dealership, dim_date
- Loads fact tables: fact_inventory_current, fact_inventory_sales
- Performs pandas merge operations for denormalized views

### To add new filters:
1. Add parameter to endpoint function in `api/main.py`
2. Add filter logic in `get_cached_inventory()` and `get_filtered_aggregations()`
3. Update `get_filter_options()` if new dimension needed

### To add multi-select support to a filter:
1. **Backend** (`deltalake_adapter.py`): Use `_apply_filter()` helper which handles comma-separated values
2. **Context** (`SalesContext.tsx`): Change type from `string` to `string | string[]`
3. **Hooks** (`useSalesData.ts`): Join arrays with comma before adding to URL params
4. **UI** (`FilterPanel.tsx`): Use `SearchableSelect` component with checkbox selection
5. **Restart server**: Backend code changes require server restart

### To change frontend:

**Sales Platform (main app):**
- Router: `mobile-app/src/App.tsx`
- Platform shell: `mobile-app/src/pages/SalesPlatform/index.tsx`
- Pages: `mobile-app/src/pages/SalesPlatform/*.tsx`
- Components: `mobile-app/src/components/sales/`
- Context: `mobile-app/src/context/SalesContext.tsx`
- Data hooks: `mobile-app/src/hooks/useSalesData.ts`

**Analytics Dashboard (legacy):**
- Dashboard: `mobile-app/src/pages/Dashboard.tsx`
- Analytics Version A (Recharts): `mobile-app/src/components/analytics/AnalyticsTab.tsx`
- Analytics Version B (Tremor): `mobile-app/src/components/analytics/AnalyticsTabV2.tsx`
- Analytics Version C (ECharts): `mobile-app/src/components/analytics/AnalyticsTabV3.tsx`
- Analytics Version M (Mobile): `mobile-app/src/components/analytics/AnalyticsTabMobile.tsx`
- Charts: `mobile-app/src/components/charts/`
- API hooks: `mobile-app/src/hooks/useOneLakeInventory.ts`

### To add new charting dependencies:
```bash
# For React 19 compatibility with older libraries
npm install <package> --legacy-peer-deps

# Clear Vite cache after adding new deps
rm -rf node_modules/.vite
```

### After code changes:
```bash
# Kill existing python processes
taskkill /F /IM python.exe

# Restart backend (wait for "Server ready!")
cd api && python -m uvicorn main:app --port 8000
```

---

## Data Reference

### Inventory Data (as of January 2025)
- **187,600** total inventory units (full dataset in Delta Lake mode)
- **100,000** cached inventory items (GraphQL mode limit only)

### Sales History Data (Delta Lake mode only)
- **562,754** total sold units with days_to_sell metrics
- Date range available via `/inventory/sales-date-range` endpoint

### Dimensions (No Limits - Full Data)
- **RV Types**: 9 types - TRAVEL TRAILER (121k), FIFTH WHEEL (36k), CLASS C (14k), CLASS A (7k), CLASS B (4.5k), OTHER, CAMPING TRAILER, PARK MODEL, TOY HAULER
- **Conditions**: NEW, USED
- **States**: Full names ("Arizona" not "AZ") - **60** states/provinces
- **Regions**: 7 regions (SOUTHEAST, NORTHEAST, SOUTHWEST, CANADA, NORTHWEST, ONLINE)
- **Cities**: **4,510** unique cities (all returned, no limit)
- **Counties**: All returned in aggregations (no limit)
- **Dealer Groups**: **659** dealer groups (all returned, no limit)
- **Manufacturers**: **281** manufacturers (all returned, no limit)
- **Models**: **1,223** models
- **Floorplans**: **16,265** floorplans

---

## Direct Delta Table Access (Alternative to GraphQL)

**Location:** `parquet_test/`

A standalone Python solution that reads gold Delta tables directly using the `deltalake` library - **no GraphQL required**.

### Quick Start

```bash
cd parquet_test
pip install deltalake azure-identity pandas pyarrow
az login
python gold_table_reader.py discover    # List all tables
python gold_table_reader.py inventory   # Get 187K rows with joins
```

### Key Benefits Over GraphQL

| Aspect | deltalake | GraphQL |
|--------|-----------|---------|
| Record Limit | **None** (full 187K) | 100k max |
| Joins | Native pandas | Not supported |
| Startup Time | Seconds | 20-25 min cache build |
| Auth | `az login` | Complex credential chain |

### How It Works

```python
from gold_table_reader import read_table, get_inventory_with_details

# Read any gold table
df = read_table('gold', 'fact_inventory_current')  # 187,241 rows
df = read_table('gold', 'dim_product_model')       # rv_type, manufacturer
df = read_table('gold', 'dim_dealership')          # dealer_group, state

# Get inventory with all joins
df = get_inventory_with_details()
# Columns: stock_number, price, condition, rv_type, manufacturer,
#          dealer_group, state, region, city, county, days_on_lot
```

### URI Format

```
abfss://{WORKSPACE_ID}@onelake.dfs.fabric.microsoft.com/{LAKEHOUSE_ID}/Tables/gold/{table}
```

### Available Gold Tables

- `fact_inventory_current` (187K rows) - Current inventory
- `fact_inventory` (37 cols) - Full history
- `fact_inventory_sales` - Sold units
- `dim_product_model` - rv_type, manufacturer, model
- `dim_product` - floorplan
- `dim_dealership` - dealer_group, state, region, city, county
- `dim_date` - Calendar with fiscal periods
- `fact_statistical_survey_registration` - 42 cols registration data

### Files

| File | Purpose |
|------|---------|
| `parquet_test/gold_table_reader.py` | Main Delta table reader with joins |
| `parquet_test/list_all_parquet.py` | List raw parquet files |
| `parquet_test/README.md` | Full documentation |

---

## Future Improvements

See `PROPOSAL-GraphQL-Architecture.md` for detailed analysis and recommendations:

1. **Short-term**: Use real-time `groupBy` for consistent filtered numbers
2. **Medium-term**: Configure relationships in Fabric portal
3. **Long-term**: Implement Materialized Views in Lakehouse for instant, consistent aggregations
