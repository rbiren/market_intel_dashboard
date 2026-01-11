# Gold Table Schema Reference

Complete schema for all 13 Delta tables in the Fabric Lakehouse gold layer.

## Table Summary

| Table | Rows | Cols | Key Use |
|-------|------|------|---------|
| **fact_inventory_current** | 187,241 | 15 | Current inventory (main cache) |
| **fact_inventory** | 44,515,578 | 37 | Full history (too large for memory) |
| **fact_inventory_sales** | 562,213 | 12 | Sold units with days_to_sell |
| **fact_inventory_snapshot** | 36,761,170 | 16 | Daily aggregations (too large) |
| **dim_product** | 153,913 | 9 | Floorplan lookup |
| **dim_product_model** | 29,433 | 13 | RV type, manufacturer, model |
| **dim_dealership** | 12,368 | 15 | Dealer info, region, city |
| **dim_date** | 8,766 | 23 | Calendar with fiscal periods |
| **dim_date_period** | 489 | 4 | Period comparisons |
| **dim_power_bi_report** | 970 | 7 | PBI report metadata |
| **dim_power_bi_user** | 230 | 5 | PBI user metadata |
| **fact_power_bi_usage** | 29,680 | 11 | PBI usage tracking |
| **fact_statistical_survey_registration** | 15,986,119 | 42 | Registration data (large) |

**Total: 98,248,170 rows across 13 tables**

---

## Essential Tables for Caching (~380 MB)

These 5 tables are all you need for the dashboard:

| Table | Rows | Memory |
|-------|------|--------|
| fact_inventory_current | 187,241 | 121 MB |
| dim_product_model | 29,433 | 63 MB |
| dim_product | 153,913 | 63 MB |
| dim_dealership | 12,368 | 38 MB |
| dim_date | 8,766 | 6 MB |
| **Total** | **391,721** | **~380 MB** |

---

## Detailed Schemas

### fact_inventory_current (187,241 rows)
Current inventory snapshot - the primary table for the dashboard.

| Column | Type | Description |
|--------|------|-------------|
| stock_number | string | Unique stock identifier |
| dim_dealership_skey | long | FK to dim_dealership |
| dim_product_model_skey | long | FK to dim_product_model |
| dim_product_skey | long | FK to dim_product |
| condition | string | NEW or USED |
| first_seen_date | date | When first appeared |
| last_seen_date | date | Most recent sighting |
| days_on_lot | integer | Days since first seen |
| days_in_pending | long | Days in pending status |
| price | decimal(12,2) | Current price |
| median_price | decimal(12,2) | Median for this model |
| overpriced_unit | integer | 1 if above median |
| amount_over_median | decimal(12,2) | $ above median |
| percent_over_median | decimal(12,2) | % above median |
| current_stock | integer | Always 1 |

---

### fact_inventory (44,515,578 rows) - LARGE
Full historical inventory - every daily snapshot. **Too large for memory caching.**

| Column | Type | Description |
|--------|------|-------------|
| stock_number | string | Stock identifier |
| inventory_date_skey | integer | FK to dim_date |
| dim_dealership_skey | long | FK to dim_dealership |
| dim_product_model_skey | long | FK to dim_product_model |
| dim_product_skey | long | FK to dim_product |
| created_or_updated_timestamp | timestamp | Record timestamp |
| vin | string | Vehicle ID number |
| web_title | string | Listing title |
| listing_url | string | URL to listing |
| image_url | string | Primary image URL |
| tags | string | Listing tags |
| condition | string | NEW or USED |
| inventory_status | string | Current status |
| inventory_on_lot | integer | On lot flag |
| age | integer | Vehicle age |
| cost | decimal(12,2) | Dealer cost |
| discount | decimal(12,2) | Discount amount |
| msrp | decimal(12,2) | MSRP |
| sale_or_regular_price | decimal(12,2) | Sale or regular |
| sale_price | decimal(12,2) | Sale price |
| price | decimal(12,2) | Current price |
| median_price | decimal(12,2) | Median price |
| amount_over_median | decimal(12,2) | $ over median |
| percent_over_median | decimal(12,2) | % over median |
| minimum_price | decimal(12,2) | Min price seen |
| maximum_price | decimal(12,2) | Max price seen |
| inventory_added | integer | Added flag |
| inventory_transferred_in | integer | Transfer in flag |
| transfer_from_dealership | string | Source dealer |
| inventory_transferred_out | integer | Transfer out flag |
| transfer_to_dealership | string | Dest dealer |
| inventory_pending | integer | Pending flag |
| days_in_pending | integer | Days pending |
| inventory_sold | integer | Sold flag |
| current_stock | integer | Stock flag |
| overpriced_unit | integer | Overpriced flag |
| stock_count | integer | Count |

---

### fact_inventory_sales (562,213 rows)
Sold inventory with sales metrics.

| Column | Type | Description |
|--------|------|-------------|
| stock_number | string | Stock identifier |
| sold_date_skey | integer | FK to dim_date |
| dim_dealership_skey | long | FK to dim_dealership |
| dim_product_model_skey | long | FK to dim_product_model |
| dim_product_skey | long | FK to dim_product |
| condition | string | NEW or USED |
| first_seen_date | date | When first seen |
| last_seen_date | date | Last seen (sale date) |
| days_to_sell | integer | Days from first seen to sold |
| days_in_pending | long | Days in pending |
| sale_price | decimal(12,2) | Final sale price |
| sold_unit | integer | Always 1 |

---

### fact_inventory_snapshot (36,761,170 rows) - LARGE
Daily aggregated snapshots. **Too large for memory caching.**

| Column | Type | Description |
|--------|------|-------------|
| inventory_date_skey | integer | FK to dim_date |
| dim_dealership_skey | long | FK to dim_dealership |
| dim_product_model_skey | long | FK to dim_product_model |
| dim_product_skey | long | FK to dim_product |
| condition | string | NEW or USED |
| inventory_coming_soon | long | Coming soon count |
| inventory_added | long | Added count |
| inventory_transferred_in | long | Transferred in |
| inventory_transferred_out | long | Transferred out |
| inventory_pending | long | Pending count |
| inventory_sold | long | Sold count |
| inventory_on_lot | long | On lot count |
| overpriced_units | long | Overpriced count |
| median_price | decimal(12,2) | Median price |
| minimum_price | decimal(12,2) | Min price |
| maximum_price | decimal(12,2) | Max price |

---

### dim_product (153,913 rows)
Product/floorplan dimension.

| Column | Type | Description |
|--------|------|-------------|
| dim_product_skey | long | Primary key |
| dim_product_model_skey | long | FK to dim_product_model |
| created_or_updated_timestamp | timestamp | Record timestamp |
| product_id | integer | Product ID |
| floorplan | string | Floorplan name |
| manufacturer_floorplan | string | Mfr + floorplan |
| full_model_floorplan | string | Full model + floorplan |
| manufacturer_full_model_floorplan | string | Full combined name |
| product_lookup_key | array<string> | Lookup keys |

---

### dim_product_model (29,433 rows)
Product model dimension with RV type and manufacturer.

| Column | Type | Description |
|--------|------|-------------|
| dim_product_model_skey | long | Primary key |
| created_or_updated_timestamp | timestamp | Record timestamp |
| parent_company | string | Parent company (e.g., Thor) |
| company | string | Company name |
| manufacturer | string | Manufacturer name |
| model_year | string | Model year |
| full_model | string | Full model name |
| model | string | Model name |
| rv_type | string | RV type (TRAVEL TRAILER, FIFTH WHEEL, etc.) |
| rv_subtype | string | RV subtype |
| manufacturer_model | string | Mfr + model |
| manufacturer_full_model | string | Mfr + full model |
| manufacturer_logo_small | string | Logo URL |

---

### dim_dealership (12,368 rows)
Dealership dimension with location info.

| Column | Type | Description |
|--------|------|-------------|
| dim_dealership_skey | long | Primary key |
| created_or_updated_timestamp | timestamp | Record timestamp |
| dealership_id | integer | Dealership ID |
| dealer_group | string | Dealer group name |
| dealership | string | Dealership name |
| address_line1 | string | Street address |
| city | string | City |
| state | string | State (full name, UPPERCASE) |
| postal_code | string | ZIP/postal code |
| county | string | County |
| bta | string | BTA region |
| region | string | Region (SOUTHEAST, NORTHEAST, etc.) |
| country | string | Country |
| dealer_group_logo_small | string | Logo URL |
| dealership_lookup_key | array<string> | Lookup keys |

---

### dim_date (8,766 rows)
Calendar dimension with fiscal periods.

| Column | Type | Description |
|--------|------|-------------|
| dim_date_skey | integer | Primary key (YYYYMMDD) |
| calendar_date | date | Calendar date |
| year | integer | Year |
| quarter | string | Quarter (Q1-Q4) |
| quarter_year | string | Quarter + Year |
| month_number | integer | Month (1-12) |
| month_name | string | Month name |
| month_name_abbr | string | Month abbreviation |
| month_year | string | Month + Year |
| month_key | string | Month key |
| fiscal_year | string | Fiscal year |
| fiscal_month | string | Fiscal month |
| fiscal_quarter | string | Fiscal quarter |
| fiscal_period | string | Fiscal period |
| week_of_year | integer | Week number |
| weekday | string | Day name |
| day_of_week | integer | Day of week (1-7) |
| day_of_month | integer | Day of month |
| day_of_year | integer | Day of year |
| is_weekend | integer | Weekend flag |
| is_last_day_of_month | integer | Last day flag |
| first_day_of_month | date | First of month |
| last_day_of_month | date | Last of month |

---

### dim_date_period (489 rows)
Date period mappings for comparisons.

| Column | Type | Description |
|--------|------|-------------|
| dim_current_date_skey | integer | Current date key |
| dim_previous_date_skey | integer | Previous date key |
| date_period | string | Period name |
| sort_order | long | Sort order |

---

### dim_power_bi_report (970 rows)
Power BI report metadata.

| Column | Type | Description |
|--------|------|-------------|
| dim_power_bi_report_skey | integer | Primary key |
| report_guid | string | Report GUID |
| report_page_guid | string | Page GUID |
| created_or_updated_timestamp | timestamp | Timestamp |
| report_full_name | string | Full report name |
| report_name | string | Report name |
| report_page_name | string | Page name |

---

### dim_power_bi_user (230 rows)
Power BI user metadata.

| Column | Type | Description |
|--------|------|-------------|
| dim_power_bi_user_skey | integer | Primary key |
| user_guid | string | User GUID |
| created_or_updated_timestamp | timestamp | Timestamp |
| user_key | string | User key |
| username | string | Username |

---

### fact_power_bi_usage (29,680 rows)
Power BI usage tracking.

| Column | Type | Description |
|--------|------|-------------|
| usage_date_skey | integer | FK to dim_date |
| dim_power_bi_report_skey | integer | FK to report |
| dim_power_bi_user_skey | integer | FK to user |
| report_session_start_datetime | timestamp | Session start |
| report_session_end_datetime | timestamp | Session end |
| created_or_updated_timestamp | timestamp | Timestamp |
| session_id | integer | Session ID |
| usage_type | string | Usage type |
| report_view_count | integer | View count |
| report_page_view_count | integer | Page view count |
| time_spent_viewing | integer | Time spent (seconds) |

---

### fact_statistical_survey_registration (15,986,119 rows) - LARGE
RV registration data from statistical surveys. **Large but valuable for market analysis.**

| Column | Type | Description |
|--------|------|-------------|
| unique_number | integer | Primary key |
| registration_date_skey | integer | FK to dim_date |
| dim_dealership_skey | long | FK to dealership |
| dim_product_model_skey | long | FK to product model |
| created_or_updated_timestamp | timestamp | Timestamp |
| rolling_3_months_registration_date | date | Rolling 3-month date |
| new_used | string | NEW or USED |
| lien | string | Lien status |
| is_rental | string | Rental flag |
| is_thor | integer | Thor product flag |
| motorized_towable | string | Motorized or Towable |
| thor_operating_company | string | Thor OpCo |
| model_year | string | Model year |
| rv_type | string | RV type |
| rv_subtype | string | RV subtype |
| manufacturer | string | Manufacturer |
| division | string | Division |
| rv_model | string | Model |
| drive_type | string | Drive type |
| number_of_axles | string | Axle count |
| chassis | string | Chassis make |
| chassis_model | string | Chassis model |
| engine | string | Engine type |
| fuel | string | Fuel type |
| length | string | Length |
| gross_vehicle_weight | string | GVW |
| dealer_group | string | Dealer group |
| dealership | string | Dealership |
| dealership_bta | string | Dealer BTA |
| dealership_city | string | Dealer city |
| dealership_county | string | Dealer county |
| dealership_state | string | Dealer state |
| dealership_country | string | Dealer country |
| placement_bta | string | Placement BTA |
| placement_city | string | Placement city |
| placement_county | string | Placement county |
| placement_state | string | Placement state |
| placement_zip | string | Placement ZIP |
| placement_country | string | Placement country |
| price_group | string | Price group |
| price | double | Price |
| registration_count | integer | Count (always 1) |

---

## Foreign Key Relationships

```
fact_inventory_current
  ├── dim_dealership_skey    → dim_dealership.dim_dealership_skey
  ├── dim_product_model_skey → dim_product_model.dim_product_model_skey
  └── dim_product_skey       → dim_product.dim_product_skey

dim_product
  └── dim_product_model_skey → dim_product_model.dim_product_model_skey

fact_inventory_sales
  ├── sold_date_skey         → dim_date.dim_date_skey
  ├── dim_dealership_skey    → dim_dealership.dim_dealership_skey
  ├── dim_product_model_skey → dim_product_model.dim_product_model_skey
  └── dim_product_skey       → dim_product.dim_product_skey
```

---

## Access Method

```python
from gold_table_reader import read_table, get_inventory_with_details

# Read any table
df = read_table('gold', 'fact_inventory_current')

# Get inventory with all joins
df = get_inventory_with_details()
```

See `gold_table_reader.py` for full implementation.
