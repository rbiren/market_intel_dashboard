# RV Market Intelligence Dashboard

## Quick Start

```bash
# Terminal 1: FastAPI backend (wait for "Server ready!" before using)
cd api && python -m uvicorn main:app --port 8000

# Terminal 2: React frontend
cd mobile-app && npm run dev -- --port 5175
```

**Open http://localhost:5175** (backend startup takes ~20-25 min to build all caches including RV type filters)

---

## Architecture (Updated January 2025)

### The Caching Strategy

All data is loaded into RAM at server startup for **instant responses**:

| Cache | Records | Purpose |
|-------|---------|---------|
| `_products_cache` | 100,000 | Product details (rv_type, manufacturer, model, year) |
| `_dealers_cache` | 10,000 | Dealer details (dealer_group, state, dealership) |
| `_inventory_cache` | 100,000 | Full inventory with joined product/dealer data |
| `_aggregations_cache` | Pre-computed | 185,160 units aggregated by rv_type, dealer, state, condition |
| `_filtered_aggregations_cache` | Pre-computed | Condition filters (NEW/USED) + RV type filters (8 types) |

### Why This Approach?

1. **GraphQL has no JOINs** - Fabric GraphQL exposes tables separately; relationships must be configured manually in Fabric portal (not done)
2. **100k record limit** - Fabric GraphQL `first` param maxes at 100,000
3. **groupBy works on full data** - Native `groupBy` aggregations scan ALL records (185,160), not just fetched ones
4. **Azure credentials are flaky** - Live API calls intermittently fail; caching eliminates this

### Data Flow

```
Server Startup (~20-25 min)
  ├─ load_cache()                      → Fetch 100k products + 10k dealers (~1 min)
  ├─ load_inventory_cache()            → Fetch 100k inventory + join with dimensions (~6 min)
  ├─ build_aggregations_cache()        → Run groupBy queries for full 185k aggregations (~4 min)
  └─ build_filtered_aggregations_cache() → Pre-compute filters:
       ├─ Condition: NEW, USED (~5 min)
       └─ RV Types: 8 types (~8 min)

Request Time (instant)
  ├─ /filters        → Read from _products_cache + _dealers_cache
  ├─ /dealers        → Read from _dealers_cache
  ├─ /inventory      → Filter _inventory_cache in memory
  └─ /aggregated     → Return _aggregations_cache or _filtered_aggregations_cache
```

---

## Key Files

| File | Purpose |
|------|---------|
| `api/main.py` | **THE** backend - all caching logic, GraphQL queries, endpoints |
| `mobile-app/src/pages/Dashboard.tsx` | Main dashboard UI with tabs + A/B/C/M version toggle |
| `mobile-app/src/components/analytics/AnalyticsTab.tsx` | Version A: Recharts (original) |
| `mobile-app/src/components/analytics/AnalyticsTabV2.tsx` | Version B: Tremor library |
| `mobile-app/src/components/analytics/AnalyticsTabV3.tsx` | Version C: ECharts Premium (Thor Industries branded) |
| `mobile-app/src/components/analytics/AnalyticsTabMobile.tsx` | Version M: Mobile-optimized (touch-friendly, vertical layout) |
| `mobile-app/src/styles/thorTheme.ts` | Thor Industries brand style guide constants |
| `mobile-app/src/context/CrossFilterContext.tsx` | Cross-filter state management |
| `mobile-app/src/components/charts/` | Chart components (MarketShareDonut, TopBarChart, etc.) |
| `mobile-app/src/hooks/useOneLakeInventory.ts` | React hooks for API calls |

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
```

### Frontend Dependencies for Charts
```json
{
  "recharts": "^2.x",           // Version A
  "@tremor/react": "^3.x",      // Version B (requires --legacy-peer-deps for React 19)
  "echarts": "^5.x",            // Version C
  "echarts-for-react": "^3.x"   // Version C React wrapper
}
```

---

## Known Issue: 35K vs 19K Discrepancy

**Problem:** Pie chart shows FIFTH WHEEL = 35,414 units, but clicking it shows ~19,447 units.

**Cause:**
- Pie chart totals come from `groupBy` on full 185K dataset
- Filtered data comes from pre-computed cache based on 100K cached inventory

**Workaround:** The numbers in filtered view are accurate for the cached subset. For fully consistent numbers, see `PROPOSAL-GraphQL-Architecture.md` for recommended solutions (Materialized Views).

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/filters` | GET | Filter options (rv_types, states, conditions, dealer_groups) |
| `/dealers` | GET | List of dealership names |
| `/inventory` | GET | Inventory items with filters |
| `/inventory/aggregated` | GET | Aggregated stats (KPIs, charts) |
| `/inventory/totals` | GET | Quick totals via native groupBy |

**Common Params**: `rv_class`, `dealer_group`, `manufacturer`, `condition`, `state`, `min_price`, `max_price`, `limit`

---

## Fabric Config

```
Workspace ID:   9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc
GraphQL API ID: 5c282d47-9d39-475c-ba43-5145fdc021b8
Azure Client:   7c59a81d-6b68-47a5-b491-7eed93fe6b13
Azure Tenant:   5e57ec01-060b-4ff9-899f-972a9ca7499c
```

**Tables**: `dim_product`, `dim_dealership`, `fact_inventory_current` (gold layer)

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
Edit `api/main.py` - look for:
- `load_cache()` - dimension table loading
- `load_inventory_cache()` - inventory + joins
- `build_aggregations_cache()` - groupBy aggregations (uses on-demand dimension fetching)
- `build_filtered_aggregations_cache()` - pre-computed filters (condition + RV types)
- `fetch_dimension_data_for_skeys()` - batch fetch dimension data for specific skeys
- `get_cached_inventory()` - filtered inventory queries
- `get_filtered_aggregations()` - filtered aggregations

### To add new filters:
1. Add parameter to endpoint function
2. Add filter logic in `get_cached_inventory()` and `get_filtered_aggregations()`
3. Update `get_filter_options()` if new dimension needed

### To change frontend:
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

- **185,160** total inventory units (from groupBy, reconciled in sub-tables)
- **131,546** NEW units, **53,614** USED units (pre-computed, instant)
- **100,000** cached inventory items (GraphQL limit)
- **RV Types**: TRAVEL TRAILER (120k), FIFTH WHEEL (35k), CLASS C (14k), CLASS A (7k), CLASS B (4k), OTHER, CAMPING TRAILER, PARK MODEL
- **Conditions**: NEW, USED
- **States**: Full names ("Arizona" not "AZ")
- **62** states/provinces, **575** dealer groups

---

## Future Improvements

See `PROPOSAL-GraphQL-Architecture.md` for detailed analysis and recommendations:

1. **Short-term**: Use real-time `groupBy` for consistent filtered numbers
2. **Medium-term**: Configure relationships in Fabric portal
3. **Long-term**: Implement Materialized Views in Lakehouse for instant, consistent aggregations
