# Archive Search and Order Scenario

## Overview
This scenario demonstrates how to search for existing satellite imagery in SkyFi's archive catalog and place an order for delivery. This is typically the fastest and most cost-effective way to acquire satellite imagery, as the imagery has already been captured.

## Scenario: Wildfire Damage Assessment

### Real-World Use Case
A disaster response team needs to assess the extent of wildfire damage in Northern California. They need high-resolution satellite imagery of the affected area from the past week to identify damaged infrastructure and plan recovery efforts.

### Goals
- Search SkyFi's archive for recent high-resolution imagery of the wildfire area
- Evaluate available imagery by date, resolution, and cloud cover
- Estimate the cost of acquiring the imagery
- Place an order for the most suitable imagery with delivery to AWS S3

## Prerequisites

### Environment Setup
Ensure you have the following environment variables configured:
```bash
SKYFI_API_KEY=your_skyfi_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### Required Information
- **Area of Interest (AOI)**: The geographic area you want to search
- **Time Range**: When the imagery should have been captured
- **Delivery Configuration**: Where you want the imagery delivered (S3, GCS, or Azure)

### AWS S3 Delivery Setup
For this scenario, you'll need an S3 bucket configured with:
- Bucket name and region
- Appropriate IAM permissions for SkyFi to write to your bucket
- Optional: prefix for organizing imagery files

## Step-by-Step Walkthrough

### Step 1: Define Your Area of Interest

For this scenario, we'll focus on a wildfire-affected area in Northern California.

**Location**: Area near Paradise, California (where the 2018 Camp Fire occurred)

**WKT Format**:
```
POLYGON((-121.65 39.70, -121.50 39.70, -121.50 39.85, -121.65 39.85, -121.65 39.70))
```

This polygon covers approximately 225 square kilometers around Paradise, CA.

**User Message to Agent**:
```
I need to search for satellite imagery of a wildfire area in Northern California.
The area is around Paradise, CA, defined by this polygon:
POLYGON((-121.65 39.70, -121.50 39.70, -121.50 39.85, -121.65 39.85, -121.65 39.70))

I need imagery from the past 7 days with the highest resolution available.
```

### Step 2: Agent Searches Archive

The agent will use the `search_archives` tool to find available imagery.

**Expected Agent Response**:
```
I'll search for high-resolution satellite imagery of the Paradise, CA area from the past week.

[Executing: search_archives]
Parameters:
- AOI: POLYGON((-121.65 39.70, -121.50 39.70, -121.50 39.85, -121.65 39.85, -121.65 39.70))
- Start Date: [7 days ago]
- End Date: [today]
- Resolution: Very High, High
- Sort by: capture date (newest first)
```

**Expected Search Results**:
The search will return a list of available archive items with details such as:
- Archive ID
- Capture date and time
- Satellite/sensor name
- Resolution (e.g., 0.5m, 3m)
- Cloud cover percentage
- Scene preview URL
- Product type (optical, SAR, multispectral)

**Sample Result**:
```json
{
  "results": [
    {
      "archiveId": "arch_abc123xyz",
      "captureDate": "2024-11-15T18:30:00Z",
      "satellite": "WorldView-3",
      "resolution": "0.5m",
      "cloudCover": 5,
      "productType": "OPTICAL",
      "sceneSizeKm2": 230,
      "previewUrl": "https://..."
    }
  ],
  "totalResults": 3
}
```

### Step 3: Review and Select Imagery

**User Message**:
```
Show me details about the first result. What's the cloud cover and resolution?
```

**Expected Agent Response**:
```
The first result is excellent for your needs:

Archive ID: arch_abc123xyz
- Captured: November 15, 2024 at 6:30 PM UTC (2 days ago)
- Satellite: WorldView-3 (commercial high-resolution satellite)
- Resolution: 0.5 meters per pixel (very high resolution)
- Cloud Cover: 5% (excellent - minimal clouds)
- Product Type: Optical (standard RGB imagery)
- Scene Size: 230 square kilometers

This is high-quality imagery with minimal cloud cover, perfect for damage assessment.
Would you like to check the pricing for this imagery?
```

### Step 4: Get Pricing Information

**User Message**:
```
Yes, what would this imagery cost?
```

**Expected Agent Response**:
```
Let me get the pricing information for you.

[Executing: get_pricing_info]

Based on current pricing:
- Product Type: OPTICAL
- Resolution: Very High (0.5m)
- Scene Size: 230 km²

Estimated Cost: $1,150 - $1,725
(Pricing is approximately $5-7.50 per square kilometer for very high-resolution optical imagery)

Note: Final pricing may vary based on your SkyFi account tier and any applicable discounts.
```

### Step 5: Configure Delivery

**User Message**:
```
That works for our budget. I want to order this imagery and have it delivered to my S3 bucket.

Bucket: disaster-response-imagery
Region: us-west-2
Prefix: wildfire-assessment/paradise-2024/
```

**Expected Agent Response**:
```
Perfect! I'll prepare the order with S3 delivery.

Order Summary:
- Archive ID: arch_abc123xyz
- Imagery: WorldView-3, 0.5m resolution, captured Nov 15, 2024
- Cloud Cover: 5%
- Estimated Cost: $1,150 - $1,725

Delivery Configuration:
- Provider: AWS S3
- Bucket: disaster-response-imagery
- Region: us-west-2
- Prefix: wildfire-assessment/paradise-2024/

The imagery will be delivered as GeoTIFF files to your S3 bucket within 4-24 hours
after order placement.

WARNING: This order will charge your SkyFi account and cannot be undone.

Would you like to proceed with this order? Please confirm by typing 'yes'.
```

### Step 6: Place the Order

**User Message**:
```
yes
```

**Expected Agent Response**:
```
[Executing: order_archive_imagery]
Parameters:
- Archive ID: arch_abc123xyz
- Delivery Driver: S3
- Bucket: disaster-response-imagery
- Region: us-west-2
- Prefix: wildfire-assessment/paradise-2024/

Order placed successfully!

Order ID: ord_xyz789abc
Status: Processing
Estimated Delivery: 4-24 hours

You can check the order status anytime by asking:
"What's the status of order ord_xyz789abc?"

The imagery will be delivered to:
s3://disaster-response-imagery/wildfire-assessment/paradise-2024/

You'll receive the following files:
- GeoTIFF image file(s)
- Metadata files (capture info, calibration data)
- Preview/thumbnail images
```

### Step 7: Monitor Order Status

**User Message** (later):
```
Check the status of order ord_xyz789abc
```

**Expected Agent Response**:
```
[Executing: get_order_details]

Order Status: Completed

Order Details:
- Order ID: ord_xyz789abc
- Status: Completed
- Created: November 16, 2024
- Completed: November 16, 2024
- Processing Time: 6 hours

Delivery Information:
- Location: s3://disaster-response-imagery/wildfire-assessment/paradise-2024/
- Files Delivered: 4 files
- Total Size: 2.3 GB

Files:
1. paradise_20241115_183000_optical.tif (1.8 GB)
2. paradise_20241115_183000_metadata.json (15 KB)
3. paradise_20241115_183000_preview.jpg (450 KB)
4. paradise_20241115_183000_calibration.xml (25 KB)

Your imagery is ready for analysis!
```

## Expected Outcomes

### Successful Completion
- Found relevant archive imagery matching search criteria
- Reviewed imagery quality (resolution, cloud cover, date)
- Obtained pricing estimate
- Placed order with proper delivery configuration
- Received order confirmation with Order ID
- Can monitor order status and download imagery when ready

### Deliverables
- High-resolution satellite imagery in GeoTIFF format
- Metadata files with capture details and calibration information
- Preview images for quick visualization
- All files organized in your S3 bucket with specified prefix

## Troubleshooting Tips

### No Results Found
**Problem**: Search returns no results for your area and timeframe.

**Solutions**:
- Expand the date range (try 30 days instead of 7)
- Increase the area size (archives may cover larger areas)
- Remove cloud cover restrictions
- Try different resolution levels
- Consider tasking new imagery instead (see feasibility-check.md)

### High Cloud Cover
**Problem**: All results have high cloud cover (>50%).

**Solutions**:
- Search different time periods (different weather patterns)
- Consider SAR imagery (works through clouds)
- Wait for better weather and use tasking instead
- Accept higher cloud cover if it's the best available

### Pricing Too High
**Problem**: Estimated cost exceeds your budget.

**Solutions**:
- Search for lower resolution imagery (3m vs 0.5m)
- Reduce the area of interest
- Check for older imagery (may be less expensive)
- Consider purchasing multiple smaller scenes instead of one large scene

### Delivery Failures
**Problem**: Order completes but imagery doesn't appear in S3.

**Solutions**:
- Verify S3 bucket permissions (SkyFi needs write access)
- Check bucket name and region are correct
- Verify prefix doesn't have typos
- Check CloudTrail logs for access denied errors
- Use trigger_redelivery to retry delivery

### Order Stuck in Processing
**Problem**: Order remains in "Processing" status for >24 hours.

**Solutions**:
- Check order details for any error messages
- Contact SkyFi support with your Order ID
- Verify delivery configuration is valid
- Consider triggering redelivery if order shows as completed

## Real-World Applications

### Disaster Response
- Assess damage from wildfires, floods, hurricanes
- Plan evacuation routes and emergency response
- Monitor recovery progress over time
- Document damage for insurance claims

### Infrastructure Monitoring
- Inspect remote facilities and equipment
- Monitor construction progress
- Detect unauthorized changes to property
- Plan maintenance and repairs

### Environmental Monitoring
- Track deforestation and land use changes
- Monitor water bodies and coastlines
- Assess agricultural conditions
- Study wildlife habitats

### Urban Planning
- Analyze development patterns
- Plan transportation infrastructure
- Assess green space distribution
- Monitor urban sprawl

## Cost Estimation Guidelines

### Archive Imagery Pricing (Approximate)
- **Very High Resolution** (0.3-1m): $5-10 per km²
- **High Resolution** (1-5m): $2-5 per km²
- **Medium Resolution** (5-30m): $0.50-2 per km²
- **Low Resolution** (>30m): $0.10-0.50 per km²

### Factors Affecting Cost
- Scene age (newer = more expensive)
- Resolution (higher = more expensive)
- Scene size (bulk discounts may apply)
- Product type (multispectral > optical)
- Account tier (enterprise customers get discounts)

### Budget Planning
For this scenario (225 km² at 0.5m resolution):
- Estimated cost: $1,125 - $2,250
- Delivery time: 4-24 hours
- Storage cost (S3): ~$0.05-0.10/month for 2-3 GB

## Next Steps

### After Completing This Scenario
1. **Analyze the Imagery**: Use GIS software (QGIS, ArcGIS) to analyze the delivered GeoTIFF files
2. **Set Up Monitoring**: Create a notification to alert you when new imagery of this area becomes available (see monitoring-setup.md)
3. **Order New Imagery**: If you need more recent imagery, check tasking feasibility (see feasibility-check.md)
4. **Compare Changes**: Order imagery from multiple dates to track changes over time

### Related Scenarios
- **feasibility-check.md**: How to order new satellite imagery captures
- **monitoring-setup.md**: Set up alerts for new imagery in your area of interest
- **cost-estimation.md**: Detailed pricing comparison for different imagery types

## Additional Resources

### WKT Format Tools
- [geojson.io](https://geojson.io) - Draw polygons and convert to WKT
- [WKT Playground](https://wktmap.com) - Visualize and edit WKT geometries

### Satellite Imagery Guides
- [Understanding Resolution](https://www.skyfi.com/docs/resolution-guide)
- [Cloud Cover and Quality](https://www.skyfi.com/docs/quality-metrics)
- [Product Types Comparison](https://www.skyfi.com/docs/product-types)

### AWS S3 Configuration
- [S3 Bucket Permissions for SkyFi](https://www.skyfi.com/docs/s3-setup)
- [S3 Pricing Calculator](https://calculator.aws)

## Notes
- Archive searches are free - you only pay when placing an order
- Preview URLs allow you to visually inspect imagery before ordering
- You can search the same area multiple times with different parameters
- Archive imagery is typically available immediately, unlike tasking which can take days or weeks
- Always verify delivery configuration before confirming orders to avoid redelivery fees
