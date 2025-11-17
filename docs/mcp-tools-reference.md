# SkyFi MCP Tools Reference

Complete reference documentation for all SkyFi Model Context Protocol (MCP) tools.

## Table of Contents

- [Overview](#overview)
- [Setup and Authentication](#setup-and-authentication)
- [Common Patterns](#common-patterns)
- [Archive Discovery Tools](#archive-discovery-tools)
  - [search_satellite_archives](#search_satellite_archives)
  - [get_archive_details](#get_archive_details)
- [Order Placement Tools](#order-placement-tools)
  - [order_archive_imagery](#order_archive_imagery)
  - [order_tasking_imagery](#order_tasking_imagery)
- [Feasibility Tools](#feasibility-tools)
  - [check_tasking_feasibility](#check_tasking_feasibility)
  - [predict_satellite_passes](#predict_satellite_passes)
- [Order Management Tools](#order-management-tools)
  - [list_orders](#list_orders)
  - [get_order_details](#get_order_details)
  - [trigger_order_redelivery](#trigger_order_redelivery)
- [Monitoring Tools](#monitoring-tools)
  - [create_monitoring_notification](#create_monitoring_notification)
  - [list_notifications](#list_notifications)
  - [delete_notification](#delete_notification)
- [Pricing Tools](#pricing-tools)
  - [get_pricing_info](#get_pricing_info)
- [Rate Limits and Quotas](#rate-limits-and-quotas)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

The SkyFi MCP server provides 13 tools for working with satellite imagery:

**Archive Discovery (2 tools):** Search and retrieve existing satellite imagery from the SkyFi catalog.

**Order Placement (2 tools):** Place orders for archive imagery or new satellite captures (tasking).

**Feasibility (2 tools):** Check feasibility and predict satellite passes for tasking orders.

**Order Management (3 tools):** List, retrieve, and manage imagery orders.

**Monitoring (3 tools):** Set up automated alerts for new imagery.

**Pricing (1 tool):** Get pricing information and cost estimates.

---

## Setup and Authentication

### API Key Configuration

All MCP tools require a valid SkyFi API key. Set your API key as an environment variable:

```bash
export SKYFI_API_KEY="your-api-key-here"
```

Or configure it in your MCP client settings (varies by client).

### Getting an API Key

1. Sign up at [https://app.skyfi.com](https://app.skyfi.com)
2. Navigate to Account Settings → API Keys
3. Generate a new API key
4. Store it securely - treat it like a password

### Base URL

The SkyFi API base URL is:
```
https://api.skyfi.com/v1
```

This is configured automatically in the MCP server.

---

## Common Patterns

### Working with WKT Polygons

Many tools require an Area of Interest (AOI) in WKT (Well-Known Text) POLYGON format:

```
POLYGON((lon1 lat1, lon2 lat2, lon3 lat3, lon4 lat4, lon1 lat1))
```

**Important rules:**
- Coordinates are in decimal degrees: longitude then latitude
- First and last coordinate must be identical (closed polygon)
- Maximum 500 vertices
- Maximum area: 500,000 km²
- Use counterclockwise winding order

**Example (Austin, TX):**
```
POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))
```

**Tools to create WKT:**
- [geojson.io](https://geojson.io) - Draw on map, copy coordinates
- QGIS - Professional GIS software
- Python: `shapely.wkt.dumps(polygon)`

### Date/Time Formats

All dates and times use ISO 8601 format in UTC:

```
2024-01-15T10:00:00Z
2024-01-15T10:00:00+00:00
```

**Best practices:**
- Always use UTC timezone (Z or +00:00)
- Use 24-hour format
- Include seconds for precision

### Delivery Configuration

Orders require delivery configuration. Three main options:

**1. AWS S3:**
```json
{
  "deliveryDriver": "S3",
  "deliveryParams": {
    "s3_bucket_id": "my-bucket",
    "aws_region": "us-east-1",
    "aws_access_key": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }
}
```

**2. Google Cloud Storage:**
```json
{
  "deliveryDriver": "GS",
  "deliveryParams": {
    "gs_project_id": "my-project",
    "gs_bucket_id": "my-bucket",
    "gs_credentials": {
      "type": "service_account",
      "project_id": "my-project",
      "private_key_id": "key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "service-account@my-project.iam.gserviceaccount.com",
      "client_id": "123456789",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
    }
  }
}
```

**3. Azure Blob Storage:**
```json
{
  "deliveryDriver": "AZURE",
  "deliveryParams": {
    "azure_container_id": "satellite-imagery",
    "azure_connection_string": "DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=...;EndpointSuffix=core.windows.net"
  }
}
```

### Product Types

| Product Type | Description | Use Cases |
|--------------|-------------|-----------|
| **DAY** | Standard optical daytime imagery | General purpose, vegetation analysis, urban mapping |
| **NIGHT** | Nighttime low-light imagery | Light pollution, emergency response, maritime monitoring |
| **VIDEO** | Video capture from satellite | Change detection, traffic analysis, dynamic events |
| **MULTISPECTRAL** | Multiple spectral bands (4-8 bands) | Agriculture, environmental monitoring, water quality |
| **HYPERSPECTRAL** | Many spectral bands (100+) | Mineral detection, precision agriculture, material identification |
| **SAR** | Synthetic Aperture Radar | All-weather imaging, terrain mapping, flood detection |
| **STEREO** | 3D terrain capture | Elevation models, volumetric calculations, topography |

### Resolution Categories

| Resolution | GSD Range | Example Use Cases |
|------------|-----------|-------------------|
| **LOW** | >10m/pixel | Regional monitoring, weather, large-scale agriculture |
| **MEDIUM** | 5-10m/pixel | County-level planning, forestry, large infrastructure |
| **HIGH** | 2-5m/pixel | City planning, road networks, field-level agriculture |
| **VERY HIGH** | 1-2m/pixel | Building identification, detailed urban analysis |
| **SUPER HIGH** | 0.5-1m/pixel | Individual trees, vehicle detection, infrastructure inspection |
| **ULTRA HIGH** | 0.3-0.5m/pixel | Detailed asset inspection, archaeology, precision mapping |
| **CM 30** | 30cm/pixel | Individual objects, detailed change detection |
| **CM 50** | 50cm/pixel | High-detail urban mapping, industrial monitoring |

---

## Archive Discovery Tools

### search_satellite_archives

Search SkyFi's satellite imagery archive for existing imagery.

**Tool Name:** `search_satellite_archives`

**Description:** Search for available satellite imagery based on location, date range, image quality, resolution, and other criteria. Returns a list of available images with pricing and metadata.

#### Input Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `aoi` | string | **Yes** | Area of Interest in WKT POLYGON format | Max 500 vertices, max 500k km² |
| `fromDate` | string | No | Start date for image capture (ISO 8601) | UTC format |
| `toDate` | string | No | End date for image capture (ISO 8601) | UTC format |
| `productTypes` | array[string] | No | Filter by product types | DAY, NIGHT, VIDEO, MULTISPECTRAL, HYPERSPECTRAL, SAR, STEREO |
| `resolutions` | array[string] | No | Filter by resolution categories | LOW, MEDIUM, HIGH, VERY HIGH, SUPER HIGH, ULTRA HIGH, CM 30, CM 50 |
| `providers` | array[string] | No | Filter by satellite providers | SIWEI, SATELLOGIC, UMBRA, PLANET, etc. |
| `maxCloudCoverage` | number | No | Maximum cloud coverage % | 0-100 |
| `maxOffNadirAngle` | number | No | Maximum off-nadir angle in degrees | 0-50 (0° is directly overhead) |
| `openDataOnly` | boolean | No | Return only free open data imagery | true/false |
| `minOverlapRatio` | number | No | Minimum overlap between image and AOI | 0-1 (0.8 = 80% overlap) |
| `pageSize` | number | No | Number of results per page | 1-100, default 20 |

#### Example Request

```json
{
  "aoi": "POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))",
  "fromDate": "2024-01-01T00:00:00Z",
  "toDate": "2024-12-31T23:59:59Z",
  "productTypes": ["DAY", "MULTISPECTRAL"],
  "resolutions": ["HIGH", "VERY HIGH"],
  "maxCloudCoverage": 20,
  "maxOffNadirAngle": 25,
  "pageSize": 50
}
```

#### Output Format

Returns formatted markdown with:
- Total number of results
- For each archive:
  - Archive ID (UUID)
  - Provider and constellation
  - Product type and resolution
  - Capture date/time
  - Cloud coverage and off-nadir angle
  - Pricing (per km², full scene, min/max order sizes)
  - Delivery time estimate
  - Preview thumbnail URLs
- Instructions for ordering or getting more details

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid AOI format | WKT polygon malformed | Verify polygon is closed, coordinates are lon/lat |
| AOI too large | Area exceeds 500,000 km² | Reduce AOI size or split into multiple searches |
| Invalid date format | Date not in ISO 8601 | Use format: YYYY-MM-DDTHH:mm:ssZ |
| Too many vertices | Polygon has >500 vertices | Simplify polygon geometry |
| Invalid enum value | Product type/resolution not recognized | Check valid options in parameters table |

#### Related Tools

- `get_archive_details` - Get complete details for a specific archive
- `order_archive_imagery` - Order imagery from search results
- `get_pricing_info` - Get pricing information before searching

#### Best Practices

1. **Start broad, then narrow:** Search with minimal filters first, then refine
2. **Cloud coverage matters:** For optical imagery, use maxCloudCoverage ≤ 20 for clear images
3. **Off-nadir angle:** Lower angles (< 20°) provide better quality and less distortion
4. **Date ranges:** Recent imagery (last 6 months) is more likely available quickly
5. **Pagination:** Use pageSize to control results, implement pagination for large result sets
6. **Open data first:** Check openDataOnly=true to find free imagery before purchasing

---

### get_archive_details

Get detailed information about a specific archive image by ID.

**Tool Name:** `get_archive_details`

**Description:** Retrieve comprehensive details for a single archive image, including complete metadata, pricing breakdown, coverage information, and preview thumbnails.

#### Input Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `archiveId` | string (UUID) | **Yes** | Unique archive identifier from search results | `354b783d-8fad-4050-a167-2eb069653777` |

#### Example Request

```json
{
  "archiveId": "354b783d-8fad-4050-a167-2eb069653777"
}
```

#### Output Format

Returns formatted markdown with:
- Complete metadata (provider, constellation, product type, resolution, GSD)
- Precise capture date and time
- Image quality metrics (cloud coverage, off-nadir angle)
- Full pricing breakdown (per km², full scene, min/max order sizes)
- Coverage information (total area, footprint geometry)
- Delivery time estimates
- Preview thumbnails and map tiles (if available)
- Ordering instructions with example

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Archive not found | Invalid archive ID | Verify ID from search_satellite_archives results |
| Invalid UUID format | Archive ID is not a valid UUID | Check format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| Access denied | Archive not accessible with API key | Contact SkyFi support |

#### Related Tools

- `search_satellite_archives` - Search for archives to get archive IDs
- `order_archive_imagery` - Order this archive image

#### Best Practices

1. **Preview before ordering:** Always check details before placing an order
2. **Verify pricing:** Confirm pricing matches your budget
3. **Check footprint:** Ensure footprint covers your AOI adequately
4. **Review quality metrics:** Cloud coverage and off-nadir angle affect quality
5. **Save archive IDs:** Keep a record of archive IDs you're interested in

---

## Order Placement Tools

⚠️ **COST WARNING:** These tools place real paid orders that will be charged to your account.

### order_archive_imagery

Order existing satellite imagery from SkyFi's archive catalog.

**Tool Name:** `order_archive_imagery`

**Description:** Place a paid order for satellite imagery that already exists in SkyFi's archive. Archive orders typically complete within minutes to hours.

#### Input Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `archiveId` | string (UUID) | **Yes** | Archive ID from catalog search | `354b783d-8fad-4050-a167-2eb069653777` |
| `aoi` | string | **Yes** | Area of Interest in WKT POLYGON format | `POLYGON((...))`  |
| `deliveryDriver` | string | **Yes** | Cloud storage delivery driver | S3, GS, AZURE, DELIVERY_CONFIG |
| `deliveryParams` | object | Conditional | Delivery configuration | See delivery config examples |
| `label` | string | No | Order label | `"Austin downtown imagery"` |
| `orderLabel` | string | No | Order-specific label | `"Q1-2024-monitoring"` |
| `metadata` | object | No | Custom metadata key-value pairs | `{"project": "urban-growth"}` |
| `webhookUrl` | string (URL) | No | HTTPS webhook for status notifications | `https://your-app.com/webhook` |

**Delivery Drivers:**
- `S3` - AWS S3 with IAM user credentials
- `GS` - Google Cloud Storage with service account
- `AZURE` - Azure Blob Storage with connection string or Entra app
- `S3_SERVICE_ACCOUNT` - AWS S3 with service account role
- `GS_SERVICE_ACCOUNT` - GCS with service account (alternative)
- `AZURE_SERVICE_ACCOUNT` - Azure with service principal
- `DELIVERY_CONFIG` - Use pre-configured delivery from SkyFi account
- `NONE` - No automatic delivery (download from SkyFi platform)

#### Example Request

```json
{
  "archiveId": "354b783d-8fad-4050-a167-2eb069653777",
  "aoi": "POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))",
  "deliveryDriver": "S3",
  "deliveryParams": {
    "s3_bucket_id": "my-satellite-imagery",
    "aws_region": "us-east-1",
    "aws_access_key": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  },
  "label": "Austin downtown monitoring",
  "webhookUrl": "https://myapp.com/skyfi-webhook",
  "metadata": {
    "project": "urban-growth-2024",
    "analyst": "john.doe"
  }
}
```

#### Output Format

Returns formatted markdown with:
- Order confirmation
- Order ID (UUID) for tracking
- Archive ID
- AOI specification
- Delivery configuration summary
- Payment warning
- Estimated delivery timeline
- Next steps for monitoring order
- Support information

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Archive not found | Invalid archive ID | Verify ID from search results |
| Invalid AOI | AOI outside archive footprint | Check archive footprint with get_archive_details |
| Delivery config error | Missing or invalid delivery params | Verify delivery params match driver requirements |
| Authentication failed | Invalid cloud storage credentials | Check credentials have correct permissions |
| Insufficient funds | Account balance too low | Add funds to SkyFi account |
| AOI too small/large | AOI outside min/max constraints | Check archive min/max km² requirements |

#### Related Tools

- `search_satellite_archives` - Find archives to order
- `get_archive_details` - Verify details before ordering
- `list_orders` - Check order status
- `get_order_details` - Get detailed order information

#### Best Practices

1. **Verify before ordering:** Always use get_archive_details to confirm pricing and coverage
2. **Test delivery first:** Place a small test order to verify delivery configuration
3. **Secure credentials:** Use service accounts with minimal necessary permissions
4. **Set webhooks:** Configure webhooks to get real-time order status updates
5. **Check AOI bounds:** Ensure AOI is within archive's min/max km² constraints
6. **Use metadata:** Add project/tracking metadata for easier order management
7. **Monitor costs:** Track spending with metadata and labels

---

### order_tasking_imagery

Order new satellite imagery to be captured (tasking order).

**Tool Name:** `order_tasking_imagery`

**Description:** Place a paid order for NEW satellite imagery to be captured. Tasking orders are more expensive than archive orders as they require scheduling a satellite capture. Success depends on weather, satellite availability, and imaging conditions.

⚠️ **HIGH COST WARNING:** Tasking orders involve significant costs.

#### Input Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `aoi` | string | **Yes** | Area of Interest in WKT POLYGON format | Max 500 vertices, max 500k km² |
| `deliveryDriver` | string | **Yes** | Cloud storage delivery driver | S3, GS, AZURE, DELIVERY_CONFIG |
| `deliveryParams` | object | Conditional | Delivery configuration | Required unless DELIVERY_CONFIG |
| `windowStart` | string | **Yes** | Tasking window start (ISO 8601) | Future date/time |
| `windowEnd` | string | **Yes** | Tasking window end (ISO 8601) | After windowStart |
| `productType` | string | **Yes** | Type of imagery | DAY, NIGHT, VIDEO, MULTISPECTRAL, HYPERSPECTRAL, SAR, STEREO |
| `resolution` | string | **Yes** | Image resolution | LOW, MEDIUM, HIGH, VERY HIGH, SUPER HIGH, ULTRA HIGH, CM 30, CM 50 |
| `priorityItem` | boolean | No | Priority order (higher cost, faster scheduling) | true/false |
| `maxCloudCoveragePercent` | integer | No | Max acceptable cloud coverage | 0-100 |
| `maxOffNadirAngle` | integer | No | Max off-nadir angle in degrees | 0-45 |
| `requiredProvider` | string | No | Specific satellite provider | PLANET, UMBRA, SATELLOGIC, etc. |
| `sarProductTypes` | array[string] | Conditional | SAR product types (required for SAR) | GRD, SLC, etc. |
| `sarPolarisation` | string | Conditional | SAR polarisation (required for SAR) | VV, HH, VH, HV |
| `sarGrazingAngleMin` | number | No | Min SAR grazing angle | 10-80 |
| `sarGrazingAngleMax` | number | No | Max SAR grazing angle | 10-80 |
| `sarAzimuthAngleMin` | number | No | Min SAR azimuth angle | 0-360 |
| `sarAzimuthAngleMax` | number | No | Max SAR azimuth angle | 0-360 |
| `sarNumberOfLooks` | integer | No | SAR number of looks | Provider-specific |
| `providerWindowId` | string (UUID) | Conditional | Provider window ID from feasibility check | **Required for Planet orders** |
| `label` | string | No | Order label | Up to 255 chars |
| `orderLabel` | string | No | Order-specific label | Up to 255 chars |
| `metadata` | object | No | Custom metadata | JSON object |
| `webhookUrl` | string (URL) | No | HTTPS webhook for notifications | Valid HTTPS URL |

#### Example Request

```json
{
  "aoi": "POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))",
  "windowStart": "2024-02-01T00:00:00Z",
  "windowEnd": "2024-02-07T23:59:59Z",
  "productType": "DAY",
  "resolution": "VERY HIGH",
  "maxCloudCoveragePercent": 10,
  "maxOffNadirAngle": 20,
  "deliveryDriver": "S3",
  "deliveryParams": {
    "s3_bucket_id": "my-satellite-imagery",
    "aws_region": "us-east-1",
    "aws_access_key": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  },
  "priorityItem": false,
  "providerWindowId": "abc123e4-5678-90ab-cdef-1234567890ab",
  "label": "Austin growth monitoring Feb 2024",
  "webhookUrl": "https://myapp.com/skyfi-webhook"
}
```

#### Output Format

Returns formatted markdown with:
- Order confirmation
- Order ID (UUID)
- Tasking window details
- Product type and resolution
- Imaging parameters
- Delivery configuration
- Payment warning and cost factors
- Estimated timeline
- Success factors (weather, satellite availability)
- Next steps
- Support information

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid window | windowStart after windowEnd | Verify dates are in correct order |
| Window in past | windowStart is in the past | Use future dates |
| Invalid product/resolution combo | Combination not available | Check get_pricing_info for valid combinations |
| Missing providerWindowId | Required for Planet orders | Run check_tasking_feasibility first |
| AOI too large | Exceeds provider limits | Reduce AOI size or split into multiple orders |
| Delivery config error | Invalid delivery parameters | Verify delivery configuration |
| Insufficient funds | Account balance too low | Add funds to account |

#### Related Tools

- `check_tasking_feasibility` - Check feasibility before ordering (RECOMMENDED)
- `predict_satellite_passes` - Find optimal capture times
- `get_pricing_info` - Get cost estimates
- `list_orders` - Monitor order status
- `get_order_details` - Get detailed order information

#### Best Practices

1. **Always check feasibility first:** Use check_tasking_feasibility before ordering
2. **Use providerWindowId:** For Planet orders, get providerWindowId from feasibility check
3. **Longer windows = higher success:** 7-14 day windows increase capture probability
4. **Weather matters:** Check weather forecasts for your AOI during tasking window
5. **Set realistic parameters:** Strict parameters (low cloud %, low angle) reduce success probability
6. **Use webhooks:** Configure webhooks for real-time updates on capture attempts
7. **Monitor costs:** Tasking is expensive - verify pricing with get_pricing_info first
8. **Priority orders:** Only use priorityItem when truly time-sensitive (increases cost)
9. **SAR for weather independence:** Consider SAR for areas with frequent cloud cover

---

## Feasibility Tools

### check_tasking_feasibility

Check if a satellite tasking order is viable for specific area and time window.

**Tool Name:** `check_tasking_feasibility`

**Description:** Check feasibility of capturing satellite imagery for a location and time window. Returns feasibility score, weather forecast, and available capture opportunities with provider_window_id required for Planet orders.

⚠️ **IMPORTANT:** Always run this tool before placing tasking orders. The `providerWindowId` from this tool is **required** for Planet tasking orders.

#### Input Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `aoi` | string | **Yes** | Area of Interest in WKT POLYGON format | Max 500 vertices, max 500k km² |
| `productType` | string | **Yes** | Product type | Day, Night, SAR |
| `resolution` | string | **Yes** | Image resolution | VeryLow, Low, Medium, High, VeryHigh |
| `windowStart` | string | **Yes** | Capture window start (ISO 8601) | Future date |
| `windowEnd` | string | **Yes** | Capture window end (ISO 8601) | After windowStart |
| `maxCloudCoverage` | number | No | Maximum acceptable cloud coverage | 0-100 (%) |
| `maxOffNadirAngle` | number | No | Maximum off-nadir angle | 0-90 (degrees) |
| `providers` | array[string] | No | Filter to specific providers | PLANET, UMBRA |

#### Example Request

```json
{
  "aoi": "POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))",
  "productType": "Day",
  "resolution": "High",
  "windowStart": "2025-01-20T00:00:00Z",
  "windowEnd": "2025-01-27T23:59:59Z",
  "maxCloudCoverage": 20,
  "maxOffNadirAngle": 30,
  "providers": ["PLANET"]
}
```

#### Output Format

Returns formatted markdown with:
- Overall feasibility score (0-100%)
- Feasibility level (EXCELLENT, GOOD, MODERATE, LOW)
- Weather forecast with cloud coverage by date
- Capture opportunities by provider:
  - Provider name and score
  - Available capture windows with:
    - Window start/end times
    - Duration
    - Satellite ID
    - **providerWindowId** (required for ordering)
    - Provider metadata
- Ordering instructions with providerWindowId usage
- Feasibility ID and expiration

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid window | Dates in wrong order | Verify windowStart before windowEnd |
| Window in past | Window already elapsed | Use future dates |
| Invalid product type | Product type not supported | Use: Day, Night, or SAR |
| Invalid resolution | Resolution not recognized | Use: VeryLow, Low, Medium, High, VeryHigh |
| AOI too large | Exceeds size limits | Reduce AOI size |

#### Related Tools

- `predict_satellite_passes` - Get detailed pass predictions
- `order_tasking_imagery` - Place order using providerWindowId
- `get_pricing_info` - Get cost estimates

#### Best Practices

1. **Check before ordering:** Always verify feasibility before placing tasking orders
2. **Save providerWindowId:** Required for Planet orders - save from opportunities list
3. **Interpret scores:**
   - 80-100%: Excellent - high probability of capture
   - 60-79%: Good - reasonable probability
   - 40-59%: Moderate - may require extended window
   - 0-39%: Low - consider extending window or changing parameters
4. **Weather forecast:** Review cloud coverage forecast to choose optimal window
5. **Multiple providers:** Check multiple providers to compare options
6. **Longer windows:** 7-14 day windows typically have higher feasibility
7. **Feasibility expiration:** Results expire - re-check if ordering much later

---

### predict_satellite_passes

Predict when satellites will pass over an area of interest.

**Tool Name:** `predict_satellite_passes`

**Description:** Get detailed predictions of satellite passes over an AOI during a specific time window. Returns timing, pricing, imaging parameters, and coverage information for each pass.

#### Input Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `aoi` | string | **Yes** | Area of Interest in WKT POLYGON format | Max 500 vertices, max 500k km² |
| `windowStart` | string | **Yes** | Prediction window start (ISO 8601) | Future or current date |
| `windowEnd` | string | **Yes** | Prediction window end (ISO 8601) | After windowStart |
| `productTypes` | array[string] | No | Filter by product types | Day, Night, SAR |
| `resolutions` | array[string] | No | Filter by resolutions | VeryLow, Low, Medium, High, VeryHigh |
| `maxOffNadirAngle` | number | No | Max off-nadir angle filter | 0-90 degrees, default 30 |

#### Example Request

```json
{
  "aoi": "POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))",
  "windowStart": "2025-01-20T00:00:00Z",
  "windowEnd": "2025-01-27T23:59:59Z",
  "productTypes": ["Day"],
  "resolutions": ["High", "VeryHigh"],
  "maxOffNadirAngle": 25
}
```

#### Output Format

Returns formatted markdown with:
- Total number of pass opportunities
- Recommended passes (top 3 by quality/cost score):
  - Satellite name and provider
  - Date/time of pass
  - Product type and resolution
  - Pricing (per km²)
  - Off-nadir angle
  - Coverage range (min-max km²)
  - Location (lat/lon)
  - Solar elevation angle (for optical)
  - Recommendation reasons
- All passes grouped by provider:
  - Same details as recommendations
  - Sorted by date/time

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid window | Dates in wrong order | Verify windowStart before windowEnd |
| No passes found | No satellites match criteria | Expand window, increase maxOffNadirAngle, or relax filters |
| Invalid product type | Unrecognized product type | Use: Day, Night, or SAR |
| AOI too large | Exceeds provider limits | Reduce AOI size |

#### Related Tools

- `check_tasking_feasibility` - Check overall feasibility
- `order_tasking_imagery` - Order imagery for a specific pass
- `get_pricing_info` - Get detailed pricing

#### Best Practices

1. **Use for planning:** Identify optimal capture times before ordering
2. **Compare passes:** Review all options to find best quality/cost balance
3. **Off-nadir angle:** Lower angles (< 20°) provide better image quality
4. **Pricing variation:** Prices can vary significantly by pass - compare options
5. **Solar elevation:** For optical imagery, higher solar elevation = better illumination
6. **Coverage area:** Verify coverage area meets your needs (min-max km²)
7. **Multiple providers:** Check passes from different providers
8. **Window length:** Longer windows (14+ days) show more options

---

## Order Management Tools

### list_orders

List satellite imagery orders with filtering and pagination.

**Tool Name:** `list_orders`

**Description:** Retrieve a list of your orders with optional filtering by type, status, and date range. Supports pagination for large result sets.

#### Input Parameters

| Parameter | Type | Required | Description | Options/Constraints |
|-----------|------|----------|-------------|---------------------|
| `orderType` | string | No | Filter by order type | ARCHIVE, TASKING |
| `status` | string | No | Filter by delivery status | PENDING, PROCESSING, DELIVERED, FAILED, etc. |
| `fromDate` | string | No | Orders created after this date (ISO 8601) | UTC format |
| `toDate` | string | No | Orders created before this date (ISO 8601) | UTC format |
| `pageNumber` | number | No | Page number (0-indexed) | Default: 0 |
| `pageSize` | number | No | Orders per page | 1-25, default: 10 |

#### Example Request

```json
{
  "orderType": "TASKING",
  "status": "DELIVERED",
  "fromDate": "2024-01-01T00:00:00Z",
  "toDate": "2024-12-31T23:59:59Z",
  "pageNumber": 0,
  "pageSize": 20
}
```

#### Output Format

Returns formatted markdown with:
- Total order count
- Current page information
- For each order:
  - Order ID
  - Order type (ARCHIVE or TASKING)
  - Status
  - Created date
  - Cost information
  - AOI summary
  - Delivery status
- Pagination information
- Next steps for viewing details

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid date format | Date not ISO 8601 | Use YYYY-MM-DDTHH:mm:ssZ format |
| Invalid page size | pageSize > 25 or < 1 | Use value between 1-25 |
| Invalid order type | Unrecognized type | Use ARCHIVE or TASKING |

#### Related Tools

- `get_order_details` - Get complete details for specific order
- `trigger_order_redelivery` - Retry delivery for failed orders

#### Best Practices

1. **Filter by status:** Use status filter to find orders needing attention
2. **Date ranges:** Use date filters to find orders from specific time periods
3. **Pagination:** Use reasonable page sizes (10-20) for performance
4. **Regular monitoring:** Check order status regularly for updates
5. **Save order IDs:** Keep record of important order IDs for tracking

---

### get_order_details

Get complete details for a specific order by ID.

**Tool Name:** `get_order_details`

**Description:** Retrieve comprehensive information about a specific order, including status, delivery timeline, download URLs, and actionable next steps.

#### Input Parameters

| Parameter | Type | Required | Description | Format |
|-----------|------|----------|-------------|--------|
| `orderId` | string | **Yes** | Order ID (UUID) | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |

#### Example Request

```json
{
  "orderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### Output Format

Returns formatted markdown with:
- Order summary (ID, type, status)
- Timeline information
- Imaging details (product type, resolution, capture time)
- Delivery information:
  - Delivery status
  - Cloud storage location
  - Download URLs (if available)
  - Delivery errors (if any)
- Cost breakdown
- Next steps based on status:
  - PENDING: What's happening next
  - PROCESSING: Expected completion time
  - DELIVERED: How to access imagery
  - FAILED: Error details and remediation
- Support information

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Order not found | Invalid order ID | Verify ID from list_orders |
| Invalid UUID | Order ID format incorrect | Check UUID format |
| Access denied | Order belongs to different account | Verify correct API key |

#### Related Tools

- `list_orders` - Get order IDs
- `trigger_order_redelivery` - Retry failed deliveries

#### Best Practices

1. **Check regularly:** Monitor order status for updates
2. **Save download URLs:** URLs may expire - download promptly
3. **Review errors:** For failed orders, review error details carefully
4. **Webhook alternative:** Use webhooks instead of polling for better efficiency
5. **Support reference:** Keep order ID for support inquiries

---

### trigger_order_redelivery

Trigger redelivery of an order with optional new delivery configuration.

**Tool Name:** `trigger_order_redelivery`

**Description:** Retry delivery of an order. Useful when delivery fails or when you need to deliver to a different storage location. Can optionally provide new delivery configuration.

#### Input Parameters

| Parameter | Type | Required | Description | Notes |
|-----------|------|----------|-------------|-------|
| `orderId` | string (UUID) | **Yes** | Order ID to redeliver | From get_order_details or list_orders |
| `deliveryDriver` | string | No | New delivery driver | If not provided, uses original config |
| `deliveryParams` | object | Conditional | New delivery parameters | Required if deliveryDriver provided |

**Note:** If neither deliveryDriver nor deliveryParams are provided, the tool uses the order's original delivery configuration.

#### Example Request (Use Original Config)

```json
{
  "orderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### Example Request (New Delivery Config)

```json
{
  "orderId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "deliveryDriver": "S3",
  "deliveryParams": {
    "s3_bucket_id": "my-new-bucket",
    "aws_region": "eu-west-1",
    "aws_access_key": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }
}
```

#### Output Format

Returns formatted markdown with:
- Redelivery confirmation
- Updated order details
- New delivery configuration (if changed)
- Expected timeline
- Next steps
- Monitoring instructions

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Order not found | Invalid order ID | Verify order ID |
| Order not delivered | Cannot redeliver undelivered order | Wait for initial delivery |
| Invalid delivery config | Delivery params incorrect | Verify params match driver requirements |
| No original config | Order has no delivery config | Must provide deliveryDriver and deliveryParams |
| Authentication failed | Invalid cloud credentials | Verify credentials |

#### Related Tools

- `get_order_details` - Check order status before redelivering
- `list_orders` - Find orders that need redelivery

#### Best Practices

1. **Check status first:** Use get_order_details to understand why delivery failed
2. **Fix root cause:** Address underlying issue (credentials, permissions, etc.)
3. **Test new config:** If changing delivery, verify new credentials first
4. **Monitor redelivery:** Watch for delivery status updates
5. **Contact support:** If redelivery fails repeatedly, contact SkyFi support
6. **Permissions:** Ensure cloud storage has write permissions for SkyFi

---

## Monitoring Tools

### create_monitoring_notification

Create automated alerts for new satellite imagery.

**Tool Name:** `create_monitoring_notification`

**Description:** Set up a monitoring notification that sends webhook POST requests when new satellite imagery matching your criteria becomes available in the SkyFi archive.

#### Input Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `aoi` | string | **Yes** | Area of Interest in WKT POLYGON format | Max 500 vertices, max 500k km² |
| `webhookUrl` | string (URL) | **Yes** | Webhook endpoint for notifications | Must be HTTPS (HTTP for local dev) |
| `filters` | object | No | Filter criteria for notifications | See filters below |
| `filters.productTypes` | array[string] | No | Product type filters | DAY, MULTISPECTRAL, SAR |
| `filters.resolutions` | array[string] | No | Resolution filters | LOW, MEDIUM, HIGH, VERY_HIGH |
| `filters.providers` | array[string] | No | Provider filters | PLANET, MAXAR, UMBRA, etc. |
| `filters.maxCloudCoveragePercent` | number | No | Max cloud coverage | 0-100 |
| `filters.maxOffNadirAngle` | number | No | Max off-nadir angle | 0-90 degrees |
| `filters.openData` | boolean | No | Only open data | true/false |
| `name` | string | No | Notification name/description | Max 255 chars |

#### Example Request

```json
{
  "aoi": "POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))",
  "webhookUrl": "https://myapp.com/webhooks/skyfi-imagery",
  "filters": {
    "productTypes": ["DAY", "MULTISPECTRAL"],
    "resolutions": ["HIGH", "VERY_HIGH"],
    "maxCloudCoveragePercent": 15,
    "providers": ["PLANET"]
  },
  "name": "Austin downtown monitoring"
}
```

#### Webhook Payload

Your webhook endpoint will receive POST requests with this payload:

```json
{
  "notificationId": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-01-15T14:30:00Z",
  "event": "NEW_IMAGERY_AVAILABLE",
  "archives": [
    {
      "archiveId": "abc12345-6789-0abc-def1-234567890abc",
      "provider": "PLANET",
      "productType": "DAY",
      "resolution": "VERY_HIGH",
      "captureTimestamp": "2024-01-15T10:00:00Z",
      "cloudCoveragePercent": 5,
      "footprint": "POLYGON((...)))",
      "thumbnailUrls": {
        "small": "https://...",
        "medium": "https://..."
      }
    }
  ]
}
```

#### Output Format

Returns formatted markdown with:
- Notification created confirmation
- Notification ID (for management)
- Webhook URL
- AOI details
- Active filters
- Webhook payload format
- Testing instructions
- Management instructions (how to list/delete)

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid webhook URL | URL not valid or not HTTPS | Use valid HTTPS URL (HTTP OK for localhost) |
| Webhook unreachable | URL not publicly accessible | Verify URL is reachable from internet |
| Invalid AOI | WKT polygon malformed | Check polygon format |
| AOI too large | Exceeds 500k km² | Reduce AOI size |
| Invalid filter values | Filter contains invalid enum | Check valid options for filters |

#### Related Tools

- `list_notifications` - View all notifications
- `delete_notification` - Remove notification
- `search_satellite_archives` - Use same filters to test

#### Best Practices

1. **Test webhook first:** Verify webhook endpoint works before creating notification
2. **Use webhook.site:** For testing, use webhook.site to get temporary URL
3. **Secure webhooks:** Validate incoming requests (check notification ID, timestamp)
4. **Handle retries:** Implement retry logic in case of temporary webhook failures
5. **Log webhook calls:** Keep logs for debugging and auditing
6. **Start broad:** Create notification with minimal filters first, then refine
7. **Rate limiting:** Be prepared for multiple notifications if many images match
8. **Idempotency:** Handle duplicate notifications (same archive may trigger multiple times)
9. **Local development:** Use ngrok or localtunnel to expose local server for testing

---

### list_notifications

List all monitoring notifications.

**Tool Name:** `list_notifications`

**Description:** Retrieve all monitoring notifications for your account, showing status, configuration, and trigger counts.

#### Input Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-------------|
| `page` | number | No | Page number (1-based) | Default: 1 |
| `pageSize` | number | No | Notifications per page | 1-100, default: 20 |
| `includeInactive` | boolean | No | Include inactive notifications | Default: false (active only) |

#### Example Request

```json
{
  "page": 1,
  "pageSize": 20,
  "includeInactive": false
}
```

#### Output Format

Returns formatted markdown with:
- Total notification count
- Pagination information
- For each notification:
  - Notification ID
  - Name (if set)
  - Webhook URL
  - Status (active/inactive)
  - Trigger count
  - AOI details
  - Filter configuration
  - Creation date
- Management instructions

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid page number | Page < 1 | Use page >= 1 |
| Invalid page size | Size < 1 or > 100 | Use 1-100 |

#### Related Tools

- `create_monitoring_notification` - Create new notification
- `delete_notification` - Delete notification

#### Best Practices

1. **Regular review:** Periodically review notifications to remove unused ones
2. **Monitor triggers:** Check trigger counts to see which notifications are active
3. **Inactive notifications:** Review and delete inactive notifications
4. **Pagination:** Use reasonable page sizes for performance

---

### delete_notification

Delete a monitoring notification.

**Tool Name:** `delete_notification`

**Description:** Permanently remove a monitoring notification and stop receiving webhooks.

⚠️ **Warning:** This action cannot be undone.

#### Input Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `notificationId` | string (UUID) | **Yes** | Notification ID to delete | From list_notifications |

#### Example Request

```json
{
  "notificationId": "123e4567-e89b-12d3-a456-426614174000"
}
```

#### Output Format

Returns formatted markdown with:
- Deletion confirmation
- Deleted notification ID
- Confirmation that webhook delivery has stopped
- Reminder that action is permanent

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Notification not found | Invalid notification ID | Verify ID from list_notifications |
| Invalid UUID | ID format incorrect | Check UUID format |
| Access denied | Notification belongs to different account | Verify correct API key |

#### Related Tools

- `list_notifications` - Get notification IDs
- `create_monitoring_notification` - Create new notification

#### Best Practices

1. **Verify before deleting:** Double-check notification ID before deletion
2. **List first:** Use list_notifications to confirm which notification to delete
3. **Recreate if needed:** Can create new notification anytime with same parameters
4. **Cleanup regularly:** Remove unused notifications to keep account organized

---

## Pricing Tools

### get_pricing_info

Get pricing information and cost estimates for satellite imagery.

**Tool Name:** `get_pricing_info`

**Description:** Retrieve comprehensive pricing information with optional filtering by product type, resolution, provider, and cost estimates for specific AOI sizes.

#### Input Parameters

| Parameter | Type | Required | Description | Options |
|-----------|------|----------|-------------|---------|
| `productType` | string | No | Filter by product type | DAY, NIGHT, VIDEO, MULTISPECTRAL, HYPERSPECTRAL, SAR, STEREO |
| `resolution` | string | No | Filter by resolution | LOW, MEDIUM, HIGH, VERY HIGH, SUPER HIGH, ULTRA HIGH, CM 30, CM 50 |
| `provider` | string | No | Filter by provider | PLANET, SATELLOGIC, UMBRA, MAXAR, etc. |
| `aoiSqkm` | number | No | AOI size in km² for cost estimates | 0.01 - 500,000 |

**Note:** All parameters are optional. Without parameters, returns complete pricing catalog.

#### Example Request (All Pricing)

```json
{}
```

#### Example Request (Filtered with Cost Estimate)

```json
{
  "productType": "DAY",
  "resolution": "VERY HIGH",
  "aoiSqkm": 25.5
}
```

#### Output Format

Returns formatted markdown with:
- Pricing tables grouped by product type and resolution
- For each provider:
  - Provider name
  - Price per km²
  - Minimum order size
  - Maximum order size
  - Delivery time estimate
  - Availability status
- If aoiSqkm provided:
  - Cost estimates for each matching option
  - Sorted by total cost (lowest first)
  - Base cost and total cost breakdown
- Warnings for large AOIs (> 10,000 km²)

#### Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid product type | Unrecognized type | Use valid product type from options |
| Invalid resolution | Unrecognized resolution | Use valid resolution from options |
| Invalid provider | Unrecognized provider | Use valid provider from options |
| Invalid AOI size | Size ≤ 0 or > 500k | Use 0.01 - 500,000 |

#### Related Tools

- `search_satellite_archives` - Find imagery with pricing
- `order_archive_imagery` - Order with known pricing
- `order_tasking_imagery` - Order tasking with cost estimate

#### Best Practices

1. **Check before ordering:** Always verify current pricing before placing orders
2. **Compare options:** Use filters to compare pricing across providers/resolutions
3. **Cost estimates:** Provide aoiSqkm to get accurate cost predictions
4. **Volume discounts:** Contact SkyFi for enterprise pricing on large orders
5. **Archive vs tasking:** Archive is typically cheaper than tasking for same area
6. **Resolution costs:** Higher resolutions cost significantly more per km²
7. **Provider variation:** Prices vary significantly by provider - compare options

---

## Rate Limits and Quotas

### API Rate Limits

- **Search operations:** 60 requests per minute
- **Order operations:** 30 requests per minute
- **Feasibility checks:** 20 requests per minute
- **Other operations:** 100 requests per minute

### Account Quotas

- **Maximum notifications:** 100 active notifications per account
- **Maximum AOI size:** 500,000 km² per request
- **Maximum polygon vertices:** 500 per polygon
- **Concurrent orders:** No hard limit, but large volumes may require approval

### Best Practices

1. **Implement backoff:** Use exponential backoff when rate limited
2. **Cache results:** Cache search and pricing results to reduce API calls
3. **Batch operations:** Combine multiple operations when possible
4. **Monitor usage:** Track API usage to stay within limits

---

## Error Handling

### Common Error Types

| Error Type | HTTP Code | Cause | Solution |
|------------|-----------|-------|----------|
| ValidationError | 400 | Invalid input parameters | Check parameter format and constraints |
| AuthenticationError | 401 | Invalid API key | Verify API key is correct |
| AuthorizationError | 403 | Insufficient permissions | Check account permissions |
| NotFoundError | 404 | Resource doesn't exist | Verify resource ID |
| RateLimitError | 429 | Too many requests | Implement backoff and retry |
| ServerError | 500 | Internal server error | Retry with exponential backoff |

### Error Response Format

All errors return formatted markdown with:
- Error description
- Possible causes
- Suggested solutions
- Support contact information

### Retry Strategy

**Recommended retry strategy:**
1. **Network errors:** Retry immediately up to 3 times
2. **Rate limits (429):** Exponential backoff: 1s, 2s, 4s, 8s
3. **Server errors (500-503):** Exponential backoff: 2s, 4s, 8s, 16s
4. **Client errors (400-404):** Don't retry - fix the request

---

## Best Practices

### General

1. **Authentication**
   - Store API keys securely (environment variables, key vault)
   - Never commit API keys to version control
   - Rotate keys periodically
   - Use separate keys for dev/staging/prod

2. **Error Handling**
   - Always check response format before parsing
   - Implement proper retry logic with backoff
   - Log errors with correlation IDs for debugging
   - Handle all error scenarios gracefully

3. **Performance**
   - Cache pricing and catalog results
   - Use pagination for large result sets
   - Implement request timeouts
   - Use webhooks instead of polling

### Archive Discovery

1. Start with broad search, then narrow filters
2. Check multiple date ranges for better coverage
3. Use openDataOnly first to find free imagery
4. Always get_archive_details before ordering
5. Save archive IDs for future reference

### Ordering

1. **Pre-order checklist:**
   - Verify pricing with get_pricing_info
   - Check archive details
   - Test delivery configuration
   - Review AOI bounds
   - Set up webhooks

2. **Archive orders:**
   - Preferred over tasking when imagery exists
   - Faster delivery (minutes to hours)
   - Lower cost
   - Predictable results

3. **Tasking orders:**
   - Always check feasibility first
   - Use providerWindowId for Planet orders
   - Allow 7-14 day windows for best results
   - Set realistic parameters (cloud %, angle)
   - Consider SAR for weather-independent capture

### Monitoring

1. Test webhooks before creating notifications
2. Implement webhook signature verification
3. Handle idempotent notifications
4. Log all webhook deliveries
5. Monitor trigger counts
6. Clean up unused notifications

### Cost Management

1. Always check pricing before ordering
2. Use archive imagery when available (cheaper)
3. Start with smaller test orders
4. Use metadata to track spending by project
5. Set up alerts for spending thresholds
6. Consider open data sources first

---

## Support and Resources

### Documentation

- **API Documentation:** [https://docs.skyfi.com](https://docs.skyfi.com)
- **Example Code:** See `/docs/examples/` directory
- **OpenAPI Spec:** `/docs/openapi.json`

### Support

- **Email:** support@skyfi.com
- **Dashboard:** [https://app.skyfi.com](https://app.skyfi.com)
- **Status Page:** [https://status.skyfi.com](https://status.skyfi.com)

### Example Files

- `docs/examples/search-archives.md` - Archive search examples
- `docs/examples/order-imagery.md` - Order placement examples
- `docs/examples/feasibility.md` - Feasibility check examples
- `docs/examples/monitoring.md` - Monitoring setup examples

---

**Last Updated:** 2025-01-17
**Version:** 1.0.0
**MCP Protocol Version:** 2024-11-05
