# RV Market Intelligence Mobile App - Implementation Plan

## Overview

Build a mobile interface for RV manufacturer sales reps to access market intelligence data from Fabric gold tables. Optimized for fast, filtered access to inventory, sales, and market data.

**Target Users:** RV manufacturer sales reps
**Key Filters:** Region, Model, Type Code
**Data Source:** Fabric Lakehouse gold tables

---

## Architecture Decision: Fabric GraphQL API + PWA

### Why This Stack?

| Factor | Fabric GraphQL API | Custom FastAPI |
|--------|-------------------|----------------|
| Setup Complexity | Minutes (point & click) | Hours (code, deploy, maintain) |
| Infrastructure | Zero (managed by Fabric) | Redis, App Service, monitoring |
| Lakehouse Access | Native via SQL Analytics Endpoint | Via pyodbc connector |
| Filtering/Sorting | Auto-generated | Must build manually |
| Pagination | Built-in (100 per page, 100K max) | Must implement |
| Authentication | Azure AD SSO | Must wire up MSAL |
| Write Operations | Read-only for Lakehouse | Full CRUD |
| Custom Logic | Limited | Full control |

**Decision:** Fabric GraphQL API is ideal for read-only sales rep use case.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE LAYER (PWA)                       │
├─────────────────────────────────────────────────────────────┤
│  React + TypeScript + Apollo Client                         │
│  • GraphQL queries with caching                             │
│  • Offline support via Apollo Cache                         │
│  • MSAL.js for Azure AD auth                                │
│  • Tailwind CSS for mobile-first UI                         │
└────────────────────────┬────────────────────────────────────┘
                         │ GraphQL over HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           (OPTIONAL) Azure API Management                   │
├─────────────────────────────────────────────────────────────┤
│  • Rate limiting                                            │
│  • Response caching                                         │
│  • Analytics/monitoring                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Fabric GraphQL API Endpoint                    │
├─────────────────────────────────────────────────────────────┤
│  Auto-generated from gold tables:                           │
│  • dim_product, dim_dealership, dim_date                    │
│  • fact_inventory_current, fact_inventory_sales             │
│  • fact_statistical_survey_registration                     │
└────────────────────────┬────────────────────────────────────┘
                         │ SQL Analytics Endpoint
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Fabric Lakehouse (Gold Layer)                  │
│  Workspace: THOR Industries                                 │
│  Lakehouse: thor_industries_de_lakehouse                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Gold Tables to Expose

| Endpoint | Gold Table(s) | Filters | Use Case |
|----------|---------------|---------|----------|
| Inventory | `fact_inventory_current` + `dim_product` | region, model, type_code, price_range | "What's available now?" |
| Sales | `fact_inventory_sales` + `dim_product` | region, model, date_range, type_code | "How are we selling?" |
| Registrations | `fact_statistical_survey_registration` | region, type_code, period | "Market trends" |
| Dealerships | `dim_dealership` | region, state | "Dealer lookup" |
| Products | `dim_product` | type_code, manufacturer | "Product catalog" |
| Filters | All dims | n/a | Populate dropdowns |

---

## GraphQL Query Examples

### Get Current Inventory
```graphql
query GetInventory {
  fact_inventory_current(
    filter: {
      region: { eq: "Midwest" }
      type_code: { eq: "CLASS_A" }
    }
    orderBy: { days_on_lot: ASC }
    first: 50
  ) {
    items {
      product_name
      dealership_name
      region
      price
      days_on_lot
    }
  }
}
```

### Get Sales Data
```graphql
query GetSales($region: String!, $startDate: Date!, $endDate: Date!) {
  fact_inventory_sales(
    filter: {
      region: { eq: $region }
      sale_date: { gte: $startDate, lte: $endDate }
    }
    orderBy: { sale_date: DESC }
    first: 100
  ) {
    items {
      product_name
      sale_price
      sale_date
      dealership_name
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

---

## Fabric GraphQL API Limitations

| Limit | Value | Impact |
|-------|-------|--------|
| Read-only for Lakehouse | No mutations | Fine - sales reps only view data |
| Items per page | 100 (default) | Good for mobile performance |
| Max items per query | 100,000 | Unlikely to hit with filters |
| Max response size | 64 MB | Fine with proper field selection |
| Request timeout | 100 seconds | Monitor query performance |
| Max query depth | 10 levels | Sufficient for this use case |

---

## Implementation Phases

### Phase 1: Fabric GraphQL Setup
1. Create GraphQL API in Fabric Portal
2. Connect to Lakehouse SQL Analytics Endpoint
3. Select gold tables to expose
4. Define table relationships (foreign keys)
5. Test queries in built-in API Explorer

### Phase 2: PWA Foundation
1. Scaffold React + TypeScript + Vite project
2. Configure Tailwind CSS for mobile-first design
3. Set up MSAL.js for Azure AD authentication
4. Configure Apollo Client for GraphQL
5. Create PWA manifest and service worker

### Phase 3: Core Features
1. Dashboard with key metrics
2. Inventory browser with filters
3. Sales data view
4. Dealership lookup
5. Offline caching strategy

### Phase 4: Polish & Deploy
1. Loading states and error handling
2. Pull-to-refresh
3. "Add to Home Screen" prompt
4. Deploy to Azure Static Web Apps
5. (Optional) Wrap with Capacitor for app stores

---

## Project Structure

```
rv-market-intel/
├── src/
│   ├── components/
│   │   ├── ui/                  # Reusable UI components
│   │   ├── FilterBar.tsx        # Region/Model/Type filters
│   │   ├── InventoryList.tsx    # Virtualized inventory list
│   │   ├── SalesChart.tsx       # Sales visualization
│   │   └── DealerCard.tsx       # Dealer info card
│   ├── pages/
│   │   ├── Dashboard.tsx        # Home with quick stats
│   │   ├── Inventory.tsx        # Inventory browser
│   │   ├── Sales.tsx            # Sales data
│   │   └── Dealerships.tsx      # Dealer lookup
│   ├── graphql/
│   │   ├── queries.ts           # GraphQL query definitions
│   │   └── client.ts            # Apollo Client setup
│   ├── hooks/
│   │   ├── useAuth.ts           # MSAL authentication
│   │   ├── useFilters.ts        # Filter state management
│   │   └── useOffline.ts        # Offline detection
│   ├── lib/
│   │   ├── auth.ts              # MSAL configuration
│   │   └── utils.ts             # Helper functions
│   ├── App.tsx
│   ├── main.tsx
│   └── service-worker.ts        # PWA offline support
├── public/
│   ├── manifest.json            # PWA manifest
│   └── icons/                   # App icons
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Tech Stack

### Frontend (PWA)
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **GraphQL Client:** Apollo Client
- **Auth:** MSAL.js (@azure/msal-browser)
- **State:** Zustand (lightweight)
- **Offline:** Workbox
- **Optional Native:** Capacitor

### Backend (Managed)
- **API:** Fabric GraphQL API
- **Data:** Fabric Lakehouse (gold tables)
- **Auth:** Azure AD / Entra ID

### Hosting
- **PWA:** Azure Static Web Apps
- **CDN:** Azure Front Door (optional)

---

## User Experience Flow

```
┌──────────────────────────────────────────────────────────────┐
│  Dashboard                                           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│  │ Inventory  │ │   Sales    │ │   Market   │       │
│  │            │ │            │ │            │       │
│  └────────────┘ └────────────┘ └────────────┘       │
│                                                      │
│  Quick Stats (your region)                          │
│  - Units in Stock: 1,247                           │
│  - MTD Sales: 89                                   │
│  - Avg Days on Lot: 42                             │
└──────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│  Filter Bar (persistent)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Region ▼ │ │ Type ▼   │ │ Model ▼  │  [Apply]  │
│  │ Midwest  │ │ Class A  │ │ All      │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                      │
│  Results: 347 units matching                        │
│  ┌────────────────────────────────────────────┐     │
│  │ 2024 Thor Aria 4000   │  Midwest  │ $185K  │     │
│  │ ABC RV Dealership     │  12 days  │        │     │
│  ├────────────────────────────────────────────┤     │
│  │ 2024 Thor Magnitude   │  Midwest  │ $245K  │     │
│  │ XYZ Motors            │  3 days   │        │     │
│  └────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

---

## Fabric Configuration Reference

```
Workspace ID: 9c727ce4-5f7e-4008-b31e-f3e3bd8e0adc
Workspace Name: THOR Industries
Lakehouse ID: 06dc42ac-4151-4bb9-94fb-1a03edf49600
Lakehouse Name: thor_industries_de_lakehouse
SQL Endpoint: ahwfoxqla34u7cm7s4vjzj2jtq-4r6hfhd6l4eebmy66pr33dqk3q.datawarehouse.fabric.microsoft.com
```

---

## References

- [Microsoft Fabric API for GraphQL Overview](https://learn.microsoft.com/en-us/fabric/data-engineering/api-graphql-overview)
- [Exposing Lakehouse Materialized Views with GraphQL](https://blog.fabric.microsoft.com/en-US/blog/exposing-lakehouse-materialized-views-to-applications-in-minutes-with-graphql-apis-in-microsoft-fabric/)
- [API for GraphQL Limitations](https://learn.microsoft.com/en-us/fabric/data-engineering/api-graphql-limits)
- [Connect Apps to Fabric GraphQL](https://learn.microsoft.com/en-us/fabric/data-engineering/connect-apps-api-graphql)
- [Integrating Azure API Management with Fabric GraphQL](https://blog.fabric.microsoft.com/en-US/blog/integrating-azure-api-management-with-fabric-api-for-graphql/)
