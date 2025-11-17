# Archive Search Examples

Comprehensive examples for searching and retrieving satellite imagery from SkyFi's archive catalog.

## Table of Contents

- [Basic Search](#basic-search)
- [Search with Date Range](#search-with-date-range)
- [Search with Cloud Coverage Filter](#search-with-cloud-coverage-filter)
- [Search with Resolution Filter](#search-with-resolution-filter)
- [Search with Multiple Filters](#search-with-multiple-filters)
- [Pagination](#pagination)
- [Getting Archive Details](#getting-archive-details)
- [Real-World Use Cases](#real-world-use-cases)

---

## Basic Search

Search for all available imagery in a specific area.

### Scenario

Find any satellite imagery covering downtown Austin, Texas.

### Request

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))"
}
```

### What This Does

- Searches entire archive for the AOI
- No filters applied
- Returns all product types, resolutions, and providers
- Default page size (20 results)

### When to Use

- Initial exploration of available imagery
- Maximum coverage area search
- Not sure what filters to apply

### Expected Results

- Wide variety of imagery from multiple providers
- Different resolutions and product types
- Various dates spanning archive history
- Mix of free (open data) and paid imagery

---

## Search with Date Range

Search for imagery captured during a specific time period.

### Scenario

Find imagery of San Francisco from the past 6 months to track urban development.

### Request

```json
{
  "aoi": "POLYGON((-122.4194 37.7749, -122.4194 37.8049, -122.3894 37.8049, -122.3894 37.7749, -122.4194 37.7749))",
  "fromDate": "2024-07-01T00:00:00Z",
  "toDate": "2024-12-31T23:59:59Z"
}
```

### What This Does

- Searches for imagery captured between July 1 and Dec 31, 2024
- Filters out all older imagery
- Useful for recent captures with faster delivery

### Tips

**Date Format:**
- Always use ISO 8601 format
- Include timezone (Z for UTC recommended)
- Can use +00:00 instead of Z

**Date Range Selection:**
- Recent imagery (< 6 months): Faster delivery, often more expensive
- Historical imagery (> 1 year): More options, potentially cheaper
- Specific events: Use narrow date range around event date

**Common Date Ranges:**
```json
// Last month
{
  "fromDate": "2024-11-01T00:00:00Z",
  "toDate": "2024-11-30T23:59:59Z"
}

// Last quarter
{
  "fromDate": "2024-10-01T00:00:00Z",
  "toDate": "2024-12-31T23:59:59Z"
}

// Specific week
{
  "fromDate": "2024-06-15T00:00:00Z",
  "toDate": "2024-06-22T23:59:59Z"
}
```

---

## Search with Cloud Coverage Filter

Find clear imagery with minimal cloud coverage.

### Scenario

Agricultural monitoring requiring cloud-free imagery of farmland in Iowa.

### Request

```json
{
  "aoi": "POLYGON((-93.6250 41.5868, -93.6250 41.6168, -93.5850 41.6168, -93.5850 41.5868, -93.6250 41.5868))",
  "productTypes": ["DAY", "MULTISPECTRAL"],
  "maxCloudCoverage": 10
}
```

### What This Does

- Only returns imagery with ≤ 10% cloud coverage
- Filters to optical imagery (DAY, MULTISPECTRAL)
- Ensures clear views for vegetation analysis

### Cloud Coverage Guidelines

| Use Case | Recommended Max % | Reasoning |
|----------|-------------------|-----------|
| **Agriculture/NDVI** | 5-10% | Need clear views of crops |
| **Urban mapping** | 20-30% | Buildings still visible with some clouds |
| **Change detection** | 15% | Consistent conditions across captures |
| **General survey** | 40% | Acceptable for overview analysis |
| **Emergency response** | 50%+ | Any visibility is valuable |

### Example: Very Clear Imagery

```json
{
  "aoi": "POLYGON((-122.4194 37.7749, -122.4194 37.8049, -122.3894 37.8049, -122.3894 37.7749, -122.4194 37.7749))",
  "maxCloudCoverage": 5,
  "productTypes": ["DAY"]
}
```

**Note:** Lower cloud coverage limits will return fewer results but higher quality imagery.

---

## Search with Resolution Filter

Find high-resolution imagery for detailed analysis.

### Scenario

Urban planning project needing detailed imagery of buildings and streets.

### Request

```json
{
  "aoi": "POLYGON((-118.2437 34.0522, -118.2437 34.0722, -118.2237 34.0722, -118.2237 34.0522, -118.2437 34.0522))",
  "resolutions": ["VERY HIGH", "SUPER HIGH", "ULTRA HIGH"],
  "maxOffNadirAngle": 20
}
```

### What This Does

- Filters to high-resolution imagery (< 2m/pixel)
- Includes maxOffNadirAngle to ensure good viewing angle
- Suitable for identifying individual buildings and vehicles

### Resolution Selection Guide

| Resolution | GSD | Best For | Example Use |
|------------|-----|----------|-------------|
| **LOW** | >10m | Regional monitoring | Weather, large-scale land use |
| **MEDIUM** | 5-10m | County planning | Forestry, major infrastructure |
| **HIGH** | 2-5m | City planning | Road networks, neighborhoods |
| **VERY HIGH** | 1-2m | Building detail | Urban analysis, property assessment |
| **SUPER HIGH** | 0.5-1m | Asset inspection | Individual trees, vehicles |
| **ULTRA HIGH** | 0.3-0.5m | Precision mapping | Detailed infrastructure |
| **CM 30/50** | 30-50cm | Maximum detail | Archaeological sites, precise measurements |

### Example: Maximum Resolution

```json
{
  "aoi": "POLYGON((-118.2437 34.0522, -118.2437 34.0622, -118.2337 34.0622, -118.2337 34.0522, -118.2437 34.0522))",
  "resolutions": ["CM 30", "CM 50"],
  "maxCloudCoverage": 5
}
```

**Note:** Higher resolutions are significantly more expensive per km².

---

## Search with Multiple Filters

Combine multiple filters for precise search criteria.

### Scenario

Disaster response: Find recent, clear, radar imagery for flood assessment (weather-independent).

### Request

```json
{
  "aoi": "POLYGON((-90.0715 29.9511, -90.0715 30.0511, -89.9715 30.0511, -89.9715 29.9511, -90.0715 29.9511))",
  "productTypes": ["SAR"],
  "fromDate": "2024-08-15T00:00:00Z",
  "toDate": "2024-08-20T23:59:59Z",
  "resolutions": ["MEDIUM", "HIGH", "VERY HIGH"],
  "maxOffNadirAngle": 30,
  "providers": ["UMBRA", "ICEYE_US"]
}
```

### What This Does

- SAR imagery (works through clouds and at night)
- Recent capture window (5 days)
- Multiple resolution options
- Specific SAR providers
- Reasonable off-nadir angle for quality

### Advanced Example: Agriculture Monitoring

```json
{
  "aoi": "POLYGON((-95.3698 29.7604, -95.3698 29.8004, -95.3298 29.8004, -95.3298 29.7604, -95.3698 29.7604))",
  "productTypes": ["MULTISPECTRAL"],
  "fromDate": "2024-06-01T00:00:00Z",
  "toDate": "2024-06-30T23:59:59Z",
  "resolutions": ["HIGH", "VERY HIGH"],
  "maxCloudCoverage": 10,
  "maxOffNadirAngle": 15,
  "providers": ["PLANET"],
  "minOverlapRatio": 0.9
}
```

**Filters explained:**
- MULTISPECTRAL: For NDVI/vegetation analysis
- June timeframe: Growing season monitoring
- LOW cloud coverage: Clear crop views
- LOW off-nadir: Minimal distortion
- Planet: Consistent revisit rate
- 90% overlap: Ensure complete AOI coverage

---

## Pagination

Handle large result sets with pagination.

### Scenario

Searching large urban area that returns 100+ results.

### First Page Request

```json
{
  "aoi": "POLYGON((-118.6682 34.1992, -118.6682 34.3392, -118.4682 34.3392, -118.4682 34.1992, -118.6682 34.1992))",
  "productTypes": ["DAY"],
  "pageSize": 50
}
```

### Understanding Results

The response will indicate:
- Total results available
- Current page results (50)
- Indication if more pages exist
- Page size used

### Best Practices

**Page Size Selection:**
```json
// Small pages - more requests, better performance
{"pageSize": 10}

// Medium pages - balanced
{"pageSize": 20}  // Default

// Large pages - fewer requests
{"pageSize": 50}

// Maximum allowed
{"pageSize": 100}
```

**Pagination Strategy:**

1. **First, check total results:**
   - Start with pageSize: 20
   - Review total count in response
   - Adjust strategy based on total

2. **For manageable result sets (< 100):**
   - Use pageSize: 50-100
   - Get all results in 1-2 requests

3. **For large result sets (> 100):**
   - Keep pageSize: 20-50
   - Implement client-side pagination
   - Consider adding more filters to narrow results

### Note

The SkyFi API uses cursor-based pagination. The `nextPage` URL is provided in results when more pages exist. MCP tools currently return first page only - implement multiple calls for full pagination.

---

## Getting Archive Details

After searching, get complete details for specific archives of interest.

### Workflow

1. Search for imagery
2. Review results
3. Get details for promising archives
4. Compare options
5. Order best match

### Example Workflow

**Step 1: Search**
```json
{
  "aoi": "POLYGON((-122.4194 37.7749, -122.4194 37.8049, -122.3894 37.8049, -122.3894 37.7749, -122.4194 37.7749))",
  "productTypes": ["DAY"],
  "resolutions": ["VERY HIGH"],
  "maxCloudCoverage": 10
}
```

**Step 2: Review Results**

Response returns 3 archives:
- Archive A: 1.5% cloud, $8.50/km², PLANET
- Archive B: 7.2% cloud, $6.20/km², SATELLOGIC
- Archive C: 4.1% cloud, $9.10/km², MAXAR

**Step 3: Get Details for Top Choices**

```json
{
  "archiveId": "354b783d-8fad-4050-a167-2eb069653777"
}
```

**Step 4: Compare Details**

Review for each archive:
- Exact capture time
- Full pricing (min order, full scene)
- Complete footprint
- Quality metrics
- Preview thumbnails
- Delivery time

**Step 5: Order**

See order-imagery.md for ordering examples.

### What to Check in Details

1. **Footprint Coverage:**
   - Does it fully cover your AOI?
   - Any gaps or edges?

2. **Pricing:**
   - Cost for your specific AOI size
   - Minimum order requirements
   - Full scene vs. partial

3. **Quality:**
   - Cloud coverage percentage
   - Off-nadir angle (lower is better)
   - GSD (ground sample distance)

4. **Timing:**
   - Capture date matches needs?
   - Delivery time acceptable?

5. **Previews:**
   - Check thumbnails
   - Verify image quality
   - Confirm covers area properly

---

## Real-World Use Cases

### Use Case 1: Disaster Response

**Objective:** Find the most recent imagery after Hurricane Katrina made landfall.

**Search Strategy:**
```json
{
  "aoi": "POLYGON((-90.0715 29.9511, -90.0715 30.0511, -89.9715 30.0511, -89.9715 29.9511, -90.0715 29.9511))",
  "productTypes": ["SAR", "DAY"],
  "fromDate": "2024-08-29T00:00:00Z",
  "toDate": "2024-09-02T23:59:59Z",
  "resolutions": ["MEDIUM", "HIGH", "VERY HIGH"]
}
```

**Rationale:**
- SAR for cloud-independent imaging during storm
- DAY for post-storm assessment
- Tight date range around landfall
- Various resolutions for different analysis needs

**Next Steps:**
1. Prioritize SAR images (weather-independent)
2. Check DAY images for cloud coverage
3. Get details on most recent captures
4. Order immediately for damage assessment

---

### Use Case 2: Agricultural Monitoring

**Objective:** Track crop health throughout growing season in Iowa.

**Search Strategy:**
```json
{
  "aoi": "POLYGON((-93.6250 41.5868, -93.6250 41.6168, -93.5850 41.6168, -93.5850 41.5868, -93.6250 41.5868))",
  "productTypes": ["MULTISPECTRAL"],
  "fromDate": "2024-04-01T00:00:00Z",
  "toDate": "2024-10-31T23:59:59Z",
  "resolutions": ["MEDIUM", "HIGH"],
  "maxCloudCoverage": 15,
  "providers": ["PLANET"]
}
```

**Rationale:**
- MULTISPECTRAL for NDVI calculations
- Full growing season (Apr-Oct)
- Planet for consistent revisit
- Low cloud coverage essential
- Medium-High resolution sufficient for field-level

**Analysis Workflow:**
1. Search for entire season
2. Select one image per month
3. Get details for all selected
4. Order time series
5. Calculate NDVI trends
6. Identify problem areas

---

### Use Case 3: Urban Development Tracking

**Objective:** Document construction progress of new development over 2 years.

**Search Strategy:**
```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "productTypes": ["DAY"],
  "fromDate": "2022-01-01T00:00:00Z",
  "toDate": "2024-12-31T23:59:59Z",
  "resolutions": ["VERY HIGH", "SUPER HIGH"],
  "maxCloudCoverage": 25,
  "maxOffNadirAngle": 20
}
```

**Workflow:**
1. Search full 2-year period
2. Filter results by quarter
3. Select best image per quarter (lowest cloud, best angle)
4. Get details for 8 images (2 years × 4 quarters)
5. Order time series
6. Create change detection analysis
7. Generate progress reports

**Tips:**
- Consistent sun angle: Search same season/time of day
- Same provider: Consistent color/quality
- Same resolution: Fair comparison
- Regular intervals: Quarterly or monthly

---

### Use Case 4: Environmental Monitoring

**Objective:** Monitor deforestation in Amazon rainforest.

**Search Strategy:**
```json
{
  "aoi": "POLYGON((-62.2163 -3.4653, -62.2163 -3.3653, -62.1163 -3.3653, -62.1163 -3.4653, -62.2163 -3.4653))",
  "productTypes": ["MULTISPECTRAL", "SAR"],
  "fromDate": "2024-01-01T00:00:00Z",
  "toDate": "2024-12-31T23:59:59Z",
  "resolutions": ["MEDIUM", "HIGH"],
  "maxCloudCoverage": 30,
  "minOverlapRatio": 0.95
}
```

**Rationale:**
- MULTISPECTRAL + SAR: Optical when clear, radar when cloudy
- Full year: Track seasonal changes
- 30% cloud acceptable: Frequent cloud cover in region
- High overlap: Ensure full coverage
- Medium-High res: Balance cost vs. detail

**Analysis Approach:**
1. Prioritize SAR during rainy season (Nov-Apr)
2. Use optical during dry season (May-Oct)
3. Create baseline from earliest clear image
4. Compare subsequent images
5. Identify cleared areas
6. Quantify forest loss

---

### Use Case 5: Infrastructure Inspection

**Objective:** Inspect pipeline corridor for encroachment and changes.

**Search Strategy:**
```json
{
  "aoi": "POLYGON((-95.3698 29.7604, -95.2698 29.7604, -95.2698 29.7504, -95.3698 29.7504, -95.3698 29.7604))",
  "productTypes": ["DAY"],
  "resolutions": ["SUPER HIGH", "ULTRA HIGH", "CM 30"],
  "maxCloudCoverage": 5,
  "maxOffNadirAngle": 15,
  "fromDate": "2024-06-01T00:00:00Z"
}
```

**Requirements:**
- Very high resolution: Identify vehicles, structures
- Low cloud coverage: Clear views essential
- Low off-nadir: Minimize distortion
- Recent imagery: Current conditions

**Inspection Workflow:**
1. Order highest resolution available
2. Create baseline corridor map
3. Schedule quarterly updates
4. Compare against baseline
5. Flag anomalies/changes
6. Plan field inspections

---

### Use Case 6: Finding Open Data

**Objective:** Find free satellite imagery for educational project.

**Search Strategy:**
```json
{
  "aoi": "POLYGON((-77.0369 38.9072, -77.0369 38.9272, -77.0169 38.9272, -77.0169 38.9072, -77.0369 38.9072))",
  "openDataOnly": true,
  "productTypes": ["DAY", "MULTISPECTRAL"],
  "maxCloudCoverage": 30
}
```

**Rationale:**
- openDataOnly: Free imagery (Sentinel, Landsat)
- Broader cloud tolerance: More results
- No date restriction: Maximum options

**Open Data Sources:**
- **Sentinel-2:** 10m resolution, 5-day revisit, multispectral
- **Landsat:** 30m resolution, 16-day revisit, multispectral
- Regional open data programs

**Tips for Open Data:**
- Higher cloud tolerance needed
- Lower resolution expected
- Longer delivery times sometimes
- Great for education, testing, proof-of-concept

---

## Search Tips and Best Practices

### Optimization Strategies

**1. Start Broad, Then Narrow**
```json
// First search - broad
{
  "aoi": "POLYGON((...)),",
  "fromDate": "2024-01-01T00:00:00Z"
}

// Then narrow based on results
{
  "aoi": "POLYGON((...)),",
  "fromDate": "2024-01-01T00:00:00Z",
  "productTypes": ["DAY"],
  "maxCloudCoverage": 20,
  "resolutions": ["HIGH", "VERY HIGH"]
}
```

**2. Use Geographic Context**
- Tropical regions: Higher cloud coverage tolerance needed
- Polar regions: Consider SAR (works in darkness)
- Urban areas: Higher resolution beneficial
- Agricultural: Medium resolution often sufficient

**3. Balance Cost vs. Quality**
```json
// Budget option
{
  "resolutions": ["MEDIUM", "HIGH"],
  "openDataOnly": true
}

// Premium option
{
  "resolutions": ["SUPER HIGH", "ULTRA HIGH"],
  "maxCloudCoverage": 5,
  "maxOffNadirAngle": 10
}
```

**4. Time of Day Matters**
- Morning/evening: Longer shadows (good for terrain)
- Midday: Minimal shadows (good for classification)
- Consistent timing: Important for time series

**5. Save Useful Searches**

Keep a library of search queries for common use cases:
```json
// "urban-high-quality"
{
  "resolutions": ["VERY HIGH", "SUPER HIGH"],
  "maxCloudCoverage": 10,
  "maxOffNadirAngle": 20
}

// "agriculture-ndvi"
{
  "productTypes": ["MULTISPECTRAL"],
  "resolutions": ["MEDIUM", "HIGH"],
  "maxCloudCoverage": 15,
  "providers": ["PLANET"]
}
```

---

## Common Mistakes to Avoid

### 1. AOI Too Specific
❌ **Wrong:**
```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7449 30.2672, -97.7449 30.2671, -97.7450 30.2671, -97.7450 30.2672))"
}
```
Too small - may miss imagery that partially covers area.

✅ **Right:**
```json
{
  "aoi": "POLYGON((-97.7500 30.2650, -97.7500 30.2750, -97.7400 30.2750, -97.7400 30.2650, -97.7500 30.2650))"
}
```
Reasonable buffer around area of interest.

### 2. Filters Too Restrictive
❌ **Wrong:**
```json
{
  "maxCloudCoverage": 0,
  "maxOffNadirAngle": 5,
  "resolutions": ["CM 30"]
}
```
May return zero results.

✅ **Right:**
```json
{
  "maxCloudCoverage": 10,
  "maxOffNadirAngle": 20,
  "resolutions": ["VERY HIGH", "SUPER HIGH", "CM 30"]
}
```
Strict but realistic filters.

### 3. Ignoring Open Data
❌ **Wrong:**
Never checking if free imagery exists.

✅ **Right:**
```json
// Always check for open data first
{
  "aoi": "POLYGON((...)),",
  "openDataOnly": true
}
```

### 4. Not Using Archive Details
❌ **Wrong:**
Ordering directly from search results without checking details.

✅ **Right:**
1. Search
2. Get details for candidates
3. Compare options
4. Order best choice

### 5. Wrong Date Format
❌ **Wrong:**
```json
{
  "fromDate": "01/15/2024",
  "toDate": "12/31/2024"
}
```

✅ **Right:**
```json
{
  "fromDate": "2024-01-15T00:00:00Z",
  "toDate": "2024-12-31T23:59:59Z"
}
```

---

## Quick Reference

### Common AOIs

**Small city area (1 km²):**
```
POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))
```

**Medium region (100 km²):**
```
POLYGON((-97.80 30.20, -97.80 30.30, -97.70 30.30, -97.70 30.20, -97.80 30.20))
```

**Large region (10,000 km²):**
```
POLYGON((-98.00 30.00, -98.00 31.00, -97.00 31.00, -97.00 30.00, -98.00 30.00))
```

### Quick Filter Combinations

**Clear optical imagery:**
```json
{
  "productTypes": ["DAY"],
  "maxCloudCoverage": 10
}
```

**Weather-independent:**
```json
{
  "productTypes": ["SAR"]
}
```

**Agriculture:**
```json
{
  "productTypes": ["MULTISPECTRAL"],
  "maxCloudCoverage": 15,
  "resolutions": ["MEDIUM", "HIGH"]
}
```

**Urban detail:**
```json
{
  "productTypes": ["DAY"],
  "resolutions": ["VERY HIGH", "SUPER HIGH"],
  "maxOffNadirAngle": 20
}
```

**Budget search:**
```json
{
  "openDataOnly": true,
  "maxCloudCoverage": 40
}
```

---

**Related Documentation:**
- [MCP Tools Reference](../mcp-tools-reference.md) - Complete tool documentation
- [Order Imagery Examples](order-imagery.md) - How to order found imagery
- [Feasibility Examples](feasibility.md) - Check tasking feasibility
