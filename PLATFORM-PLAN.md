# RV Rep Intelligence Platform - Implementation Plan

**Version**: 1.0
**For**: Claude Code Implementation
**Priority**: Build A/B/C testing framework first

---

## IMPLEMENTATION INSTRUCTIONS FOR CLAUDE

### WHAT TO BUILD FIRST

Create a **Landing/Fork Page** at the root route (`/`) that allows users to choose between 3 platform versions for A/B/C testing:

```
ROUTE STRUCTURE:
/                    → Landing Page (version selector)
/rep-intel/*         → Version A: NEW Rep Intelligence Platform
/sales/*             → Version B: Current Sales Hub (existing)
/analytics           → Version C: Analytics Dashboard (existing)
```

### LANDING PAGE REQUIREMENTS

Create a clean, professional landing page at `/` with:

1. **Header**: "RV Market Intelligence Platform"
2. **Subtitle**: "Select your experience"
3. **3 Cards/Options**:

```
┌─────────────────────────────────────────────────────────────────┐
│                   RV MARKET INTELLIGENCE                         │
│                   Select your experience                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │   VERSION A      │  │   VERSION B      │  │   VERSION C      │
│  │   ───────────    │  │   ───────────    │  │   ───────────    │
│  │                  │  │                  │  │                  │
│  │   REP INTEL      │  │   SALES HUB      │  │   ANALYTICS      │
│  │   PLATFORM       │  │                  │  │   DASHBOARD      │
│  │                  │  │                  │  │                  │
│  │   NEW - Field    │  │   Current sales  │  │   Data viz &     │
│  │   rep focused    │  │   platform with  │  │   market         │
│  │   intelligence   │  │   dealer views   │  │   analysis       │
│  │   & actions      │  │   & filters      │  │                  │
│  │                  │  │                  │  │                  │
│  │   [LAUNCH →]     │  │   [LAUNCH →]     │  │   [LAUNCH →]     │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

4. **Styling**: Use Thor Industries theme (already in codebase)
5. **Persistence**: Remember last choice in localStorage

---

## FILE CHANGES REQUIRED

### 1. Update Router (mobile-app/src/App.tsx)

```typescript
// Current routes to preserve:
// - /sales/* → existing SalesPlatform (rename to Version B)
// - /analytics → existing Dashboard (rename to Version C)

// New routes to add:
// - / → new LandingPage (version selector)
// - /rep-intel/* → new RepIntelPlatform (Version A)
```

### 2. Create New Files

```
mobile-app/src/pages/
├── LandingPage.tsx                    # NEW - Version selector
├── RepIntelPlatform/                  # NEW - Version A
│   ├── index.tsx                      # Shell/layout
│   ├── TerritoryCommand.tsx           # Home dashboard
│   ├── DealerIntel.tsx                # Dealer deep dive
│   ├── MeetingMode.tsx                # Field mode
│   ├── Opportunities.tsx              # AI insights
│   └── components/
│       ├── HealthScore.tsx
│       ├── PriorityDealer.tsx
│       ├── OpportunityCard.tsx
│       ├── TalkingPoints.tsx
│       └── AlertBanner.tsx
├── SalesPlatform/                     # EXISTING - Version B (keep as-is)
└── Dashboard.tsx                      # EXISTING - Version C (keep as-is)
```

### 3. Landing Page Component

Create `mobile-app/src/pages/LandingPage.tsx`:

```typescript
// Requirements:
// - 3 clickable cards for each version
// - Thor Industries styling (use existing thorTheme.ts)
// - Cards should have:
//   - Version label (A/B/C)
//   - Title
//   - Description (2-3 lines)
//   - "Launch" button
// - Remember last choice in localStorage
// - Show "Last used: Version X" if returning user
// - Responsive: stack on mobile, side-by-side on desktop
```

---

## VERSION A: REP INTEL PLATFORM (NEW BUILD)

### Core Philosophy
**Every screen answers "What do I do next?"** - drive action, not just display data.

### Information Architecture

```
/rep-intel/                    → Territory Command Center (home)
/rep-intel/dealers             → Dealer Directory with priority ranking
/rep-intel/dealer/:id          → Dealer Intelligence (deep dive)
/rep-intel/dealer/:id/meeting  → Meeting Mode (mobile-optimized)
/rep-intel/dealer/:id/pricing  → Pricing Analysis for dealer
/rep-intel/opportunities       → All opportunities across territory
/rep-intel/pricing             → Pricing Intelligence (MAP, over/under)
/rep-intel/aging               → Aging Inventory Analysis
/rep-intel/floorplans          → Floorplan Performance Rankings
/rep-intel/market              → Market Demand (registrations)
/rep-intel/map                 → Territory Map with route planning
/rep-intel/products            → Thor Product Catalog
/rep-intel/actions             → Tasks & follow-ups
```

### Territory Command Center (Home)

```
┌─────────────────────────────────────────────────────────────────┐
│  Good morning, John                        [Filter] [Settings]  │
│  Your territory at a glance                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ HEALTH      │  │ DEALERS     │  │ THOR SHARE  │  │ VELOCITY│ │
│  │ SCORE       │  │             │  │             │  │         │ │
│  │   78/100    │  │    47       │  │   24.5%     │  │  32 days│ │
│  │   ▲ +3      │  │             │  │   ▲ +2.1%   │  │  ▼ -4   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🔔 ALERTS                                              [3]  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ⚠️ 5 Thor units aged 90+ days at Camping World Orlando     ││
│  │ 📈 General RV Tampa: Class B opportunity identified        ││
│  │ 📉 Lazydays: Thor share dropped 5% this month              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  PRIORITY DEALERS                                    [View All] │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ Camping World    │  │ General RV       │  │ Lazydays       │ │
│  │ Orlando          │  │ Tampa            │  │ Tampa          │ │
│  │ ──────────────── │  │ ──────────────── │  │ ────────────── │ │
│  │ Opportunity: 92  │  │ Opportunity: 87  │  │ Risk: HIGH     │ │
│  │ Last visit: 12d  │  │ Last visit: 5d   │  │ Last visit: 31d│ │
│  │ Action: VISIT    │  │ Action: FOLLOW   │  │ Action: VISIT  │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                  │
│  QUICK ACTIONS                                                   │
│  [📍 View Map] [🔍 Find Dealer] [📋 Prep Meeting] [📦 Products] │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components to Build

#### 1. Health Score Widget
```typescript
interface HealthScore {
  score: number;           // 0-100
  trend: 'up' | 'down' | 'flat';
  trendValue: number;      // +/- change
  components: {
    thorShare: number;     // 0-25 points
    velocity: number;      // 0-25 points
    engagement: number;    // 0-25 points
    opportunities: number; // 0-25 points
  };
}
```

#### 2. Priority Dealer Card
```typescript
interface PriorityDealer {
  id: string;
  name: string;
  location: string;
  opportunityScore: number;  // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  lastVisit: Date | null;
  daysSinceVisit: number;
  recommendedAction: 'visit' | 'call' | 'email' | 'monitor';
  topOpportunity: string;    // one-liner
}
```

#### 3. Alert Banner
```typescript
interface Alert {
  id: string;
  type: 'warning' | 'opportunity' | 'risk' | 'info';
  icon: string;
  message: string;
  dealer?: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}
```

#### 4. Opportunity Card
```typescript
interface Opportunity {
  id: string;
  type: 'inventory_gap' | 'aging_risk' | 'share_recovery' | 'new_product';
  dealer: string;
  headline: string;
  detail: string;
  potentialValue: number;
  suggestedAction: string;
  priority: 'high' | 'medium' | 'low';
}
```

#### 5. Talking Points Component
```typescript
interface TalkingPoint {
  category: 'positive' | 'concern' | 'opportunity';
  headline: string;
  detail: string;
  supportingData: string;
}
```

### Dealer Intelligence Page

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                                    [📞 Call] [📅 Meet]  │
│                                                                  │
│  CAMPING WORLD ORLANDO                                          │
│  Orlando, FL  •  Last visit: 12 days ago                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ TOTAL UNITS │  │ THOR SHARE  │  │ AVG DAYS    │  │ VALUE   │ │
│  │    234      │  │   18.4%     │  │    45       │  │  $12.3M │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 💡 OPPORTUNITIES                                       [3]  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ 🔴 HIGH: 5 Thor Fifth Wheels aged 90+ days                  ││
│  │    → Discuss promotional pricing or transfer                ││
│  │                                                              ││
│  │ 🟡 MED: No Class B inventory - Thor Sequence trending       ││
│  │    → Present Thor Sequence line opportunity                 ││
│  │                                                              ││
│  │ 🟢 LOW: Travel Trailer segment underrepresented             ││
│  │    → Review Jayco Jayflight options                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  📊 INVENTORY BREAKDOWN                                          │
│  [By RV Type] [By Condition] [By Manufacturer] [Aging]          │
│                                                                  │
│  [Chart: Thor vs Competitors]                                   │
│                                                                  │
│  💬 TALKING POINTS                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✅ "Your Class C units are turning 25% faster than market"  ││
│  │ ⚠️ "8 Fifth Wheels on lot 60+ days - 3 are Thor"            ││
│  │ 💡 "No Thor Travel Trailers under $30K - high demand"       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [Prepare Meeting]  [View Full Inventory]  [Compare to Market]  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## PRICING INTELLIGENCE MODULE (CRITICAL)

### Overview
Pricing is where reps add the most value. This module surfaces:
- **MAP Violations** - Units advertised below Minimum Advertised Price
- **Overpriced Units** - Above market median (slow movers)
- **Underpriced Units** - Below market median (margin opportunity)
- **Model Year Pricing** - Age vs. price analysis

### Data Available (from fact_inventory_current)
```
price              → Current advertised price
msrp               → Manufacturer's Suggested Retail Price (in fact_inventory)
median_price       → Median price for this model across market
overpriced_unit    → 1 if price > median_price
amount_over_median → $ difference from median
percent_over_median→ % difference from median
```

### Pricing Alerts to Surface

#### 1. MAP Violations (HIGH PRIORITY)
```typescript
interface MAPViolation {
  stockNumber: string;
  dealer: string;
  manufacturer: string;
  model: string;
  floorplan: string;
  advertisedPrice: number;
  mapPrice: number;          // From MAP table or MSRP proxy
  violationAmount: number;   // How far below MAP
  violationPercent: number;
  daysInViolation: number;   // How long advertised below MAP
  listingUrl: string;
}

// Detection logic
MAP_VIOLATION = price < (msrp * 0.95)  // Example: 5% below MSRP threshold
```

#### 2. Overpriced Units (Slow Movers)
```typescript
interface OverpricedUnit {
  stockNumber: string;
  dealer: string;
  model: string;
  floorplan: string;
  modelYear: string;
  price: number;
  medianPrice: number;
  amountOverMedian: number;
  percentOverMedian: number;
  daysOnLot: number;
  suggestedAction: string;  // "Reduce by $X to match market"
}

// Already flagged in data: overpriced_unit = 1
// Filter: percent_over_median > 10 AND days_on_lot > 60
```

#### 3. Underpriced Units (Margin Opportunity)
```typescript
interface UnderpricedUnit {
  stockNumber: string;
  dealer: string;
  model: string;
  price: number;
  medianPrice: number;
  amountUnderMedian: number;
  percentUnderMedian: number;
  potentialMarginGain: number;
  suggestedAction: string;  // "Room to increase $X"
}

// Detection: percent_over_median < -10 (negative = under median)
```

#### 4. Model Year Pricing Analysis
```typescript
interface ModelYearPricing {
  modelYear: string;
  model: string;
  manufacturer: string;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  unitCount: number;
  avgDaysOnLot: number;
  percentOverpriced: number;
  yearOverYearChange: number;  // vs previous model year
}

// Group by model_year from dim_product_model
// Compare current year vs prior years
```

### Pricing Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  PRICING INTELLIGENCE                         [Dealer ▼] [Date]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ MAP         │  │ OVERPRICED  │  │ UNDERPRICED │  │ AVG VS  │ │
│  │ VIOLATIONS  │  │ UNITS       │  │ UNITS       │  │ MARKET  │ │
│  │   🔴 12     │  │   ⚠️ 47     │  │   💰 23     │  │  -2.3%  │ │
│  │   ▲ +3      │  │   ▲ +8      │  │   ▼ -5      │  │         │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                                  │
│  🔴 MAP VIOLATIONS (Requires Immediate Action)            [12]  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Unit          │ Dealer           │ Price    │ MAP    │ Gap  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ 2024 Jayco    │ Camping World    │ $42,500  │ $45,000│-$2.5K││
│  │ Jayflight 284 │ Orlando          │          │        │ -5.5%││
│  │ [View] [Flag] │ Listed: 12 days  │          │        │      ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ 2024 Keystone │ General RV       │ $38,900  │ $41,500│-$2.6K││
│  │ Cougar 29RKS  │ Tampa            │          │        │ -6.3%││
│  │ [View] [Flag] │ Listed: 5 days   │          │        │      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ⚠️ OVERPRICED UNITS (Aging Risk)                          [47] │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Model Year │ Model        │ Price vs Median │ Days │ Action ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ 2023       │ Montana 3855 │ +$8,200 (+12%)  │ 94   │ Reduce ││
│  │ 2023       │ Fuzion 430   │ +$6,100 (+9%)   │ 78   │ Review ││
│  │ 2022       │ Raptor 423   │ +$11,400 (+15%) │ 112  │ Urgent ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  📊 PRICING BY MODEL YEAR                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [Chart: Avg Price by Model Year - 2022 vs 2023 vs 2024]    ││
│  │  Shows depreciation curve and pricing sweet spots           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoints for Pricing

```python
# Pricing intelligence endpoints
GET /pricing/map-violations
GET /pricing/map-violations?dealer_group={dealer}
GET /pricing/overpriced?threshold=10&min_days=60
GET /pricing/underpriced?threshold=10
GET /pricing/by-model-year?manufacturer={mfr}&model={model}
GET /pricing/market-comparison?dealer_group={dealer}

# Response structure
{
  "map_violations": [...],
  "overpriced_units": [...],
  "underpriced_units": [...],
  "summary": {
    "total_violations": 12,
    "total_overpriced": 47,
    "total_underpriced": 23,
    "avg_vs_market_percent": -2.3
  }
}
```

---

## AGING INVENTORY ANALYSIS (CRITICAL)

### Days on Lot Breakdown
```typescript
interface AgingAnalysis {
  brackets: {
    fresh: number;      // 0-30 days
    normal: number;     // 31-60 days
    aging: number;      // 61-90 days
    stale: number;      // 91-120 days
    critical: number;   // 120+ days
  };
  avgDaysOnLot: number;
  oldestUnit: {
    stockNumber: string;
    daysOnLot: number;
    model: string;
  };
  byCondition: {
    new: AgingBrackets;
    used: AgingBrackets;
  };
  byRvType: AgingByRvType[];
  byManufacturer: AgingByManufacturer[];
}
```

### Aging Alerts
```python
AGING_ALERTS = [
    {"threshold": 90, "priority": "high", "message": "Unit aged 90+ days"},
    {"threshold": 120, "priority": "critical", "message": "Unit aged 120+ days - urgent action"},
    {"threshold": 180, "priority": "severe", "message": "Unit aged 180+ days - floor plan concern"},
]
```

### Aging Visualization
```
┌─────────────────────────────────────────────────────────────────┐
│  AGING ANALYSIS                              [Dealer ▼] [Type ▼]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DAYS ON LOT DISTRIBUTION                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 0-30    ████████████████████████████░░░░░░░░░░░░░  45%     ││
│  │ 31-60   ██████████████████░░░░░░░░░░░░░░░░░░░░░░░  28%     ││
│  │ 61-90   ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  15%     ││
│  │ 91-120  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   8%     ││
│  │ 120+    ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   4%  ⚠️ ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  🚨 CRITICAL AGING (120+ Days)                             [18] │
│  [Table of oldest units with suggested actions]                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## WHOLESALE & MARKET DEMAND

### Registration Data (16M records)
The `fact_statistical_survey_registration` table contains true market demand signals:

```typescript
interface MarketDemand {
  // From registration data
  registrationsByRvType: {
    rvType: string;
    registrations: number;
    trend: 'up' | 'down' | 'flat';
    percentChange: number;  // vs prior period
  }[];

  registrationsByManufacturer: {
    manufacturer: string;
    registrations: number;
    marketShare: number;
    trend: 'up' | 'down' | 'flat';
  }[];

  registrationsByState: {
    state: string;
    registrations: number;
    thorShare: number;  // is_thor flag in data
  }[];

  // Thor-specific
  thorVsMarket: {
    thorRegistrations: number;
    totalRegistrations: number;
    thorShare: number;
    trend: number;
  };
}
```

### Wholesale Opportunity Detection
```typescript
interface WholesaleOpportunity {
  // Units that should be wholesaled
  candidateUnits: {
    stockNumber: string;
    dealer: string;
    model: string;
    modelYear: string;
    daysOnLot: number;
    currentPrice: number;
    estimatedWholesaleValue: number;
    reason: 'aging' | 'overpriced' | 'low_demand' | 'model_year';
  }[];

  // Wholesale recommendations
  recommendations: {
    dealer: string;
    totalUnits: number;
    totalValue: number;
    suggestedAction: string;
  }[];
}

// Detection: days_on_lot > 120 AND (overpriced OR low_velocity_segment)
```

---

## FLOORPLAN PERFORMANCE

### Top/Bottom Floorplan Analysis
```typescript
interface FloorplanPerformance {
  floorplan: string;
  manufacturer: string;
  model: string;
  rvType: string;

  // Inventory metrics
  currentUnits: number;
  avgPrice: number;
  avgDaysOnLot: number;

  // Sales metrics
  soldLast30: number;
  soldLast90: number;
  avgDaysToSell: number;
  avgSalePrice: number;

  // Comparison
  velocityVsCategory: number;  // vs RV type average
  priceVsCategory: number;     // vs RV type average

  // Ranking
  rank: number;
  trend: 'hot' | 'normal' | 'slow' | 'dead';
}
```

### Floorplan Recommendations
```
TOP PERFORMING FLOORPLANS (Push More)
┌────────────────────────────────────────────────────┐
│ 1. Jayco Jayflight 284BHS  │ 18 days avg │ HOT 🔥 │
│ 2. Keystone Cougar 29RKS   │ 22 days avg │ HOT 🔥 │
│ 3. Grand Design 2800BH     │ 25 days avg │ STRONG │
└────────────────────────────────────────────────────┘

SLOW MOVERS (Review Placement)
┌────────────────────────────────────────────────────┐
│ 1. Heartland Bighorn 3955FL│ 95 days avg │ SLOW ⚠️│
│ 2. Keystone Montana 3855BR │ 88 days avg │ SLOW ⚠️│
│ 3. Vanleigh Beacon 42RDB   │ 102 days avg│ DEAD 🔴│
└────────────────────────────────────────────────────┘
```

---

## COMPLETE DATA POINTS CHECKLIST

### Inventory Data (fact_inventory_current)
- [x] Total units by dealer
- [x] Inventory value
- [x] By RV type breakdown
- [x] By condition (NEW/USED)
- [x] By manufacturer
- [x] Days on lot (aging)
- [x] Price analysis (over/under median)
- [x] Overpriced unit flags
- [ ] MAP violation detection (needs MAP table or MSRP proxy)

### Sales Data (fact_inventory_sales - 562K records)
- [x] Units sold
- [x] Days to sell (velocity)
- [x] Sale price
- [x] By condition
- [x] By RV type
- [x] By manufacturer
- [ ] By floorplan (top sellers)
- [ ] Trend over time

### Product Data (dim_product_model)
- [x] RV type
- [x] Manufacturer
- [x] Model
- [x] Model year
- [x] Parent company (Thor vs competitor)
- [ ] MSRP (in fact_inventory, not dim)

### Dealer Data (dim_dealership)
- [x] Dealer group
- [x] Location (city, state, region)
- [x] County
- [ ] Contact info (not in data)
- [ ] Relationship tier (not in data - needs manual)

### Market Data (fact_statistical_survey_registration - 16M records)
- [x] Registration counts
- [x] By RV type
- [x] By manufacturer
- [x] By state/region
- [x] Thor vs market (is_thor flag)
- [x] Price groups
- [ ] Trend analysis (needs date filtering)

---

## VERSION B: SALES HUB (EXISTING)

**Location**: `/sales/*`
**Status**: Keep as-is, already built
**Files**: `mobile-app/src/pages/SalesPlatform/`

Current features:
- Territory dashboard
- Dealer directory
- Dealer detail
- Territory map
- Competitive intel
- Product catalog
- Meeting prep

---

## VERSION C: ANALYTICS DASHBOARD (EXISTING)

**Location**: `/analytics`
**Status**: Keep as-is, already built
**Files**: `mobile-app/src/pages/Dashboard.tsx`

Current features:
- A/B/C/M version toggle (Recharts/Tremor/ECharts/Mobile)
- Cross-filtering
- Market share analysis
- Geographic distribution
- Price distribution

---

## IMPLEMENTATION ORDER

### Step 1: Create Landing Page
1. Create `LandingPage.tsx`
2. Update `App.tsx` router
3. Test navigation to all 3 versions

### Step 2: Scaffold Version A Structure
1. Create `RepIntelPlatform/` folder
2. Create `index.tsx` shell with sidebar/header
3. Create placeholder pages for each route
4. Wire up navigation

### Step 3: Build Territory Command Center
1. Health Score component
2. Alert Banner component
3. Priority Dealers list
4. Quick Actions grid
5. Connect to existing API hooks

### Step 4: Build Dealer Intelligence
1. Enhanced dealer header
2. Opportunity cards
3. Talking points generator
4. Thor vs. Competitor view
5. Inventory breakdown tabs

### Step 5: Build Meeting Mode
1. Mobile-optimized layout
2. Quick stats bar (sticky)
3. Inventory browser
4. Note capture
5. Offline indicator

---

## API ENDPOINTS NEEDED

### New Endpoints to Create

```python
# Territory-level
GET /territory/health-score
GET /territory/priority-dealers?limit=10
GET /territory/alerts

# Dealer intelligence
GET /dealer/{dealer_group}/opportunities
GET /dealer/{dealer_group}/talking-points
GET /dealer/{dealer_group}/thor-analysis

# Already exist (reuse):
GET /inventory/aggregated
GET /inventory/sales-velocity
GET /filters
```

### Health Score Calculation
```python
def calculate_health_score(territory_data):
    thor_share_score = min(territory_data.thor_share / target_share * 25, 25)
    velocity_score = min(market_avg_days / territory_data.avg_days * 25, 25)
    engagement_score = calculate_engagement(territory_data.visits) * 25
    opportunity_score = calculate_opportunity_capture(territory_data) * 25

    return thor_share_score + velocity_score + engagement_score + opportunity_score
```

### Opportunity Detection
```python
OPPORTUNITY_TYPES = [
    "aging_inventory",      # Thor units > 90 days
    "inventory_gap",        # Missing Thor segment dealer sells
    "share_decline",        # Thor share dropped >5%
    "competitor_growth",    # Competitor gaining share
    "velocity_mismatch",    # Thor selling slower than comp
    "seasonal_prep",        # Upcoming high season
]
```

---

## THOR BRANDS REFERENCE

```python
THOR_BRANDS = [
    'AIRSTREAM', 'JAYCO', 'KEYSTONE', 'HEARTLAND',
    'CRUISER RV', 'DUTCHMEN', 'ENTEGRA', 'DYNAMAX',
    'THOR MOTOR COACH', 'TIFFIN', 'VANLEIGH', 'REDWOOD',
    'HIGHLAND RIDGE', 'GRAND DESIGN', 'CROSSROADS'
]
```

Use this list to:
- Calculate Thor share at dealers
- Filter Thor vs. competitor inventory
- Identify Thor opportunities

---

## DESIGN SYSTEM

Use existing Thor theme from `mobile-app/src/styles/thorTheme.ts`:

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `#fffdfa` | `#181817` |
| Card | `#ffffff` | `#232322` |
| Primary (Sage) | `#495737` | `#495737` |
| Accent (Gold) | `#a46807` | `#a46807` |
| Info (Steel) | `#577d91` | `#577d91` |
| Text | `#181817` | `#fffdfa` |
| Muted | `#595755` | `#8c8a7e` |
| Border | `#d9d6cf` | `rgba(255,255,255,0.1)` |

---

## SUCCESS CRITERIA

After implementation, user should be able to:

1. ✅ Land on `/` and choose between 3 versions
2. ✅ Version A: See territory health score and priority dealers
3. ✅ Version A: Click dealer and see opportunities + talking points
4. ✅ Version B: Use existing Sales Hub (unchanged)
5. ✅ Version C: Use existing Analytics Dashboard (unchanged)
6. ✅ Navigate between versions via landing page
7. ✅ Last used version remembered

---

## QUESTIONS FOR USER

Before implementing, Claude should confirm:

1. Should landing page have a "Remember my choice" checkbox?
2. Should there be a quick switcher in the header of each version?
3. Should Version A have dark mode support from start?
4. What dealer data should show in Priority Dealers? (Top 5? Top 10?)
5. Should opportunities be AI-generated text or template-based?

---

*Ready for Claude Code implementation*
