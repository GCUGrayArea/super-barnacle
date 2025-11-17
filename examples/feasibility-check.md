# Feasibility Check and Tasking Order Scenario

## Overview
This scenario demonstrates how to check if a satellite can capture new imagery of a specific location (tasking feasibility), predict when satellites will pass overhead, and place a tasking order for new imagery capture. Unlike archive imagery, tasking orders request satellites to capture fresh imagery specifically for you.

## Scenario: Infrastructure Construction Monitoring

### Real-World Use Case
A construction company is building a new solar farm in rural Arizona and needs to monitor construction progress monthly. They need fresh, high-resolution imagery captured at specific intervals to track project milestones, ensure contractors are meeting deadlines, and document progress for stakeholders.

### Goals
- Check if tasking is feasible for the construction site location
- Predict when satellites will pass over the area
- Understand capture windows and weather constraints
- Estimate the cost of tasking imagery
- Place a tasking order for new satellite capture
- Monitor order status until imagery is delivered

## Prerequisites

### Environment Setup
Ensure you have the following environment variables configured:
```bash
SKYFI_API_KEY=your_skyfi_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### Required Information
- **Area of Interest (AOI)**: The construction site location
- **Capture Window**: When you need the imagery captured
- **Resolution Requirements**: Level of detail needed
- **Delivery Configuration**: Where you want imagery delivered

### Cloud Storage Setup
For this scenario, we'll use Google Cloud Storage:
- GCS bucket name
- Appropriate IAM permissions for SkyFi
- Optional: prefix for organizing imagery

## Step-by-Step Walkthrough

### Step 1: Define Your Requirements

**Location**: Solar farm construction site near Phoenix, Arizona

**WKT Format**:
```
POLYGON((-112.25 33.40, -112.20 33.40, -112.20 33.45, -112.25 33.45, -112.25 33.40))
```

This polygon covers approximately 35 square kilometers of the construction site.

**User Message to Agent**:
```
I'm monitoring a solar farm construction project in Arizona. I need to check if I can
order new satellite imagery of this location:
POLYGON((-112.25 33.40, -112.20 33.40, -112.20 33.45, -112.25 33.45, -112.25 33.40))

I need imagery captured sometime in the next 7 days at the highest resolution available.
Can you check if this is feasible?
```

### Step 2: Check Tasking Feasibility

The agent will use the `check_tasking_feasibility` tool to determine if satellites can capture your area.

**Expected Agent Response**:
```
I'll check if we can order new satellite imagery of your construction site.

[Executing: check_tasking_feasibility]
Parameters:
- AOI: POLYGON((-112.25 33.40, -112.20 33.40, -112.20 33.45, -112.25 33.45, -112.25 33.40))
- Start Date: [today]
- End Date: [7 days from now]
- Product Type: OPTICAL
- Resolution: Very High, High
```

**Expected Feasibility Results**:
```json
{
  "feasible": true,
  "feasibilityScore": 85,
  "captureOpportunities": 12,
  "constraints": [
    {
      "type": "weather",
      "severity": "low",
      "description": "Clear skies expected for next 5 days"
    },
    {
      "type": "sun_angle",
      "severity": "low",
      "description": "Optimal sun angles available in afternoon passes"
    }
  ],
  "recommendedCaptureWindows": [
    {
      "start": "2024-11-18T19:30:00Z",
      "end": "2024-11-18T19:35:00Z",
      "satellite": "WorldView-3",
      "sunElevation": 45.2,
      "probability": 0.92
    },
    {
      "start": "2024-11-19T19:15:00Z",
      "end": "2024-11-19T19:20:00Z",
      "satellite": "Pleiades-1B",
      "sunElevation": 43.8,
      "probability": 0.88
    }
  ],
  "estimatedDelivery": "2024-11-25T00:00:00Z"
}
```

**Agent Interpretation**:
```
Good news! Tasking is highly feasible for your location.

Feasibility Summary:
- Feasibility Score: 85/100 (Excellent)
- Capture Opportunities: 12 satellite passes in the next 7 days
- Estimated Delivery: Within 7-10 days after capture

Optimal Capture Windows:
1. November 18, 2024 at 7:30 PM UTC
   - Satellite: WorldView-3
   - Success Probability: 92%
   - Sun Angle: 45.2° (optimal for optical imagery)

2. November 19, 2024 at 7:15 PM UTC
   - Satellite: Pleiades-1B
   - Success Probability: 88%
   - Sun Angle: 43.8° (good conditions)

Weather Conditions: Clear skies expected for the next 5 days - excellent for capture!

Would you like to see detailed satellite pass predictions for your area?
```

### Step 3: Predict Satellite Passes

**User Message**:
```
Yes, show me all satellite passes for the next 3 days
```

**Expected Agent Response**:
```
[Executing: predict_satellite_passes]
Parameters:
- AOI: POLYGON((-112.25 33.40, -112.20 33.40, -112.20 33.45, -112.25 33.45, -112.25 33.40))
- Start Date: 2024-11-17
- End Date: 2024-11-20
- Satellites: WorldView-3, Pleiades-1B, GeoEye-1
```

**Expected Pass Predictions**:
```
Satellite Pass Predictions (Next 3 Days):

November 17, 2024:
  10:45 AM UTC - GeoEye-1 (North to South)
    - Elevation: 42°, Off-nadir: 15°
    - Resolution: 0.5m capable
    - Conditions: Partly cloudy (60% clear)

  7:20 PM UTC - WorldView-3 (South to North)
    - Elevation: 38°, Off-nadir: 12°
    - Resolution: 0.3m capable
    - Conditions: Clear (95% clear)

November 18, 2024:
  10:30 AM UTC - Pleiades-1B (North to South)
    - Elevation: 45°, Off-nadir: 10°
    - Resolution: 0.5m capable
    - Conditions: Clear (98% clear)

  7:30 PM UTC - WorldView-3 (South to North) ⭐ RECOMMENDED
    - Elevation: 48°, Off-nadir: 8°
    - Resolution: 0.3m capable
    - Conditions: Clear (99% clear)

November 19, 2024:
  7:15 PM UTC - Pleiades-1B (South to North)
    - Elevation: 44°, Off-nadir: 11°
    - Resolution: 0.5m capable
    - Conditions: Clear (96% clear)

The November 18 evening pass is optimal due to:
- Highest elevation angle (48°)
- Best atmospheric conditions (99% clear)
- Optimal sun angle for shadows and detail
- Lowest off-nadir angle (8°) for minimal distortion
```

### Step 4: Get Pricing Estimate

**User Message**:
```
What would it cost to order tasking imagery at 0.5m resolution for this area?
```

**Expected Agent Response**:
```
[Executing: get_pricing_info]
Parameters:
- Product Type: OPTICAL
- Resolution: Very High (0.5m)
- Type: Tasking

Tasking Imagery Pricing:

For your 35 km² construction site:
- Resolution: 0.5 meters (very high resolution)
- Product Type: Optical (standard RGB)
- Capture Type: New Tasking

Base Cost Estimate: $2,450 - $3,150
- Per km² rate: $70-90 for very high-resolution tasking
- Area: 35 km²
- Priority: Standard (7-14 day delivery)

Cost Breakdown:
- Imagery capture fee: $2,100 - $2,700
- Processing and delivery: $350 - $450

Additional Options:
- Rush delivery (3-5 days): +$750
- Monthly subscription (4 captures): -15% discount
- Lower resolution (3m): $875 - $1,050 (save 60%)

Note: Tasking is more expensive than archive imagery because satellites are
specifically tasked to capture your area. However, you get guaranteed fresh
imagery captured exactly when you need it.

Would you like to proceed with the order?
```

### Step 5: Configure Tasking Order

**User Message**:
```
Yes, let's proceed with the standard delivery. I want the imagery delivered to
Google Cloud Storage.

Bucket: solar-farm-monitoring
Prefix: monthly-captures/november-2024/
```

**Expected Agent Response**:
```
Perfect! I'll prepare your tasking order.

Tasking Order Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Location: Solar farm construction site, Arizona
Area: 35 km² (POLYGON defined)
Resolution: 0.5 meters (very high resolution)
Product Type: Optical (RGB)

Capture Window:
- Preferred: November 18, 2024, 7:30 PM UTC
- Backup: November 19, 2024, 7:15 PM UTC
- Window: 7 days from order placement

Delivery Configuration:
- Provider: Google Cloud Storage
- Bucket: solar-farm-monitoring
- Prefix: monthly-captures/november-2024/
- Format: GeoTIFF with metadata

Estimated Timeline:
- Order placement: Today
- Capture attempt: November 18-19, 2024
- Processing: 2-3 days after capture
- Delivery: 7-10 days from order

Estimated Cost: $2,450 - $3,150

Important Notes:
- Weather-dependent: If clouds prevent capture on Nov 18-19, the next
  available clear pass will be used within your 7-day window
- No charge if capture fails due to weather/technical issues
- Processing begins immediately after successful capture
- Delivery typically within 2-3 days of capture

WARNING: This is a tasking order that will charge your SkyFi account.
Tasking orders cannot be cancelled after satellites are tasked.

Type 'confirm' to place the tasking order, or 'cancel' to abort.
```

### Step 6: Confirm and Place Tasking Order

**User Message**:
```
confirm
```

**Expected Agent Response**:
```
[Executing: order_tasking_imagery]
Parameters:
- AOI: POLYGON((-112.25 33.40, -112.20 33.40, -112.20 33.45, -112.25 33.45, -112.25 33.40))
- Product Type: OPTICAL
- Resolution: Very High (0.5m)
- Capture Window Start: 2024-11-18T00:00:00Z
- Capture Window End: 2024-11-25T00:00:00Z
- Delivery Driver: GS
- Bucket: solar-farm-monitoring
- Prefix: monthly-captures/november-2024/

Tasking order placed successfully!

Order Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order ID: ord_task_abc123xyz
Status: Scheduled
Created: November 17, 2024

Capture Schedule:
- Primary Window: Nov 18, 2024, 19:30 UTC (WorldView-3)
- Backup Window: Nov 19, 2024, 19:15 UTC (Pleiades-1B)
- Weather monitoring: Active
- Auto-retry on cloud cover: Enabled

Next Steps:
1. Satellites tasked for capture on November 18-19
2. Weather monitoring active - will auto-reschedule if needed
3. Email notification when capture is successful
4. Processing begins immediately after capture
5. Delivery to GCS within 48-72 hours of processing

You can check order status anytime by asking:
"What's the status of order ord_task_abc123xyz?"

I'll monitor the capture windows and keep you updated on progress!
```

### Step 7: Monitor Order Status (Day 2)

**User Message**:
```
Check the status of my tasking order ord_task_abc123xyz
```

**Expected Agent Response**:
```
[Executing: get_order_details]

Tasking Order Status Update:

Order ID: ord_task_abc123xyz
Current Status: Captured
Progress: 40% (Capture complete, processing in progress)

Timeline:
✅ November 17 - Order placed and satellites tasked
✅ November 18 - Capture successful at 19:32 UTC
🔄 November 19 - Processing (atmospheric correction in progress)
⏳ November 20 - Expected: Processing complete
⏳ November 21 - Expected: Delivery to GCS

Capture Details:
- Satellite: WorldView-3
- Capture Time: November 18, 2024, 19:32 UTC
- Cloud Cover: 2% (excellent quality)
- Sun Elevation: 45.8°
- Off-nadir Angle: 8.2°
- Quality Score: 9.2/10

Processing Status:
- Geometric correction: Complete ✅
- Radiometric calibration: Complete ✅
- Atmospheric correction: In progress 🔄
- Orthorectification: Pending ⏳
- Cloud masking: Pending ⏳

Estimated Delivery: November 21, 2024 (in 2 days)

The capture was successful with excellent quality! Processing is on track for
delivery in 2 days to your GCS bucket.
```

### Step 8: Delivery Confirmation (Day 5)

**User Message**:
```
Is my tasking order complete?
```

**Expected Agent Response**:
```
[Executing: get_order_details]

Congratulations! Your tasking order is complete and delivered.

Order ID: ord_task_abc123xyz
Status: Completed ✅
Delivered: November 21, 2024

Capture Summary:
- Captured: November 18, 2024 at 19:32 UTC
- Satellite: WorldView-3
- Resolution: 0.5 meters per pixel
- Cloud Cover: 2%
- Quality: Excellent (9.2/10)

Delivered Files:
Location: gs://solar-farm-monitoring/monthly-captures/november-2024/

Files (Total: 3.8 GB):
1. solar_farm_20241118_193200_optical_0.5m.tif (3.2 GB)
   - Main imagery file (GeoTIFF, 4-band)
   - Bands: Red, Green, Blue, Near-Infrared
   - Spatial Reference: WGS84 / UTM Zone 12N

2. solar_farm_20241118_193200_metadata.json (28 KB)
   - Capture metadata and satellite parameters
   - Calibration coefficients
   - Sun/satellite geometry

3. solar_farm_20241118_193200_preview.jpg (580 KB)
   - RGB preview for quick visualization

4. solar_farm_20241118_193200_cloud_mask.tif (120 MB)
   - Cloud coverage mask
   - Quality assessment layer

Processing Applied:
- Geometric correction (orthorectified)
- Radiometric calibration
- Atmospheric correction (DOS method)
- Terrain correction using SRTM DEM

Your fresh satellite imagery is ready for analysis!

To view: Use QGIS, ArcGIS, or any GIS software that supports GeoTIFF files.
```

## Expected Outcomes

### Successful Completion
- Confirmed tasking is feasible for the target location
- Identified optimal capture windows based on satellite passes
- Understood weather and geometric constraints
- Obtained accurate pricing estimate
- Placed tasking order with proper delivery configuration
- Monitored capture and processing status
- Received fresh satellite imagery in specified cloud storage

### Deliverables
- Fresh satellite imagery captured on specified date
- High-resolution GeoTIFF file with geometric and radiometric correction
- Comprehensive metadata including capture parameters
- Cloud mask and quality assessment layers
- Preview images for quick visualization

## Troubleshooting Tips

### Low Feasibility Score
**Problem**: Feasibility check returns a low score (<50%).

**Solutions**:
- Expand the capture window (e.g., 14 days instead of 7)
- Choose a different season (weather patterns vary)
- Consider SAR imagery (weather-independent)
- Check if location is within satellite coverage zones
- Reduce resolution requirements (easier to capture)

### No Satellite Passes
**Problem**: No satellite passes predicted for your timeframe.

**Solutions**:
- Extend the time window
- Verify AOI is not in a restricted area
- Check if location is within satellite coverage (most satellites cover ±60° latitude)
- Consider different satellite constellations

### Weather Delays
**Problem**: Capture repeatedly delayed due to cloud cover.

**Solutions**:
- Extend the capture window
- Choose a different season with better weather
- Use SAR imagery (penetrates clouds)
- Enable extended retry window
- Consider archive imagery as backup

### Capture Failed
**Problem**: Order status shows "Capture Failed".

**Solutions**:
- Check failure reason in order details
- Weather failure: Order will auto-retry within window
- Technical failure: SkyFi will retry or issue refund
- Contact support with Order ID for assistance

### Processing Delays
**Problem**: Imagery captured but processing takes longer than expected.

**Solutions**:
- Check for processing queue backlogs (holidays, high demand)
- Verify no quality issues requiring manual review
- Contact support if >5 days with no updates
- Normal processing is 2-4 days; complex orders may take longer

### Delivery Not Received
**Problem**: Order shows "Completed" but files not in GCS bucket.

**Solutions**:
- Verify GCS bucket name and prefix are correct
- Check GCS IAM permissions for SkyFi service account
- Review GCS audit logs for access attempts
- Use trigger_redelivery to retry
- Check for typos in bucket name or prefix

## Real-World Applications

### Construction Monitoring
- Track progress on large infrastructure projects
- Verify contractor work completion
- Document milestones for stakeholders
- Detect delays or issues early
- Generate progress reports with time-series imagery

### Agricultural Monitoring
- Monitor crop health throughout growing season
- Detect irrigation issues
- Estimate yield predictions
- Track harvest progress
- Plan field operations based on current conditions

### Environmental Compliance
- Monitor mining or logging operations
- Verify environmental impact assessments
- Document restoration activities
- Track wildlife habitat changes
- Ensure regulatory compliance

### Security and Surveillance
- Monitor remote assets and facilities
- Detect unauthorized activities
- Track border changes
- Verify access control compliance
- Document security incidents

### Change Detection
- Before/after analysis of natural disasters
- Urban development tracking
- Coastline erosion monitoring
- Glacier and ice monitoring
- Land use change detection

## Cost Comparison: Tasking vs Archive

### When to Use Tasking
- Need very recent or future imagery
- Specific capture date/time required
- Archive search found no suitable imagery
- Monitoring project requiring regular captures
- Time-sensitive applications

### When to Use Archive
- Historical analysis acceptable
- Cost is primary concern
- Immediate delivery needed
- Flexible on exact capture date
- Popular locations (more archive options)

### Pricing Comparison (35 km² example)
| Type | Resolution | Cost | Delivery Time |
|------|-----------|------|---------------|
| Archive | 0.5m | $175-350 | 4-24 hours |
| Archive | 3m | $70-105 | 4-24 hours |
| Tasking | 0.5m | $2,450-3,150 | 7-14 days |
| Tasking | 3m | $875-1,050 | 7-14 days |

Tasking typically costs 7-10x more than archive but guarantees fresh imagery.

## Next Steps

### After Completing This Scenario
1. **Analyze Imagery**: Use GIS software to analyze the delivered imagery
2. **Set Up Regular Captures**: Create a subscription for monthly monitoring (see monitoring-setup.md)
3. **Compare with Archives**: Order archive imagery from before construction started for change detection
4. **Automate Workflow**: Use the scenarios.ts runner to automate regular tasking orders

### Related Scenarios
- **search-and-order.md**: How to search and order archive imagery
- **monitoring-setup.md**: Set up automated alerts for new imagery
- **cost-estimation.md**: Detailed cost analysis for different imagery products

## Additional Resources

### Satellite Pass Prediction Tools
- [N2YO Satellite Tracker](https://www.n2yo.com)
- [Heavens Above](https://www.heavens-above.com)

### Weather Resources
- [Satellite Weather Forecasts](https://weather.com/weather/satellite)
- [Cloud Cover Predictions](https://www.yr.no)

### GeoTIFF Processing Tools
- [QGIS](https://qgis.org) - Free, open-source GIS software
- [GDAL](https://gdal.org) - Command-line tools for geospatial data
- [Rasterio](https://rasterio.readthedocs.io) - Python library for raster data

### SkyFi Documentation
- [Tasking Best Practices](https://www.skyfi.com/docs/tasking-guide)
- [Understanding Feasibility Scores](https://www.skyfi.com/docs/feasibility)
- [Satellite Capabilities](https://www.skyfi.com/docs/satellites)

## Notes
- Tasking orders require satellites to deviate from normal operations, hence higher cost
- Weather is the most common reason for capture delays - build in buffer time
- Multiple backup capture windows increase success probability
- Processing time varies based on imagery complexity and queue depth
- Rush delivery options available for time-critical applications (+50-100% cost)
- Consider standing orders for regular monitoring needs (monthly/quarterly subscriptions save 10-20%)
