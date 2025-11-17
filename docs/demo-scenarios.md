# Demo Scenarios Guide

## Table of Contents

- [Introduction](#introduction)
- [Running Scenarios](#running-scenarios)
- [Scenario 1: Archive Search and Order](#scenario-1-archive-search-and-order)
- [Scenario 2: Feasibility Check and Tasking Order](#scenario-2-feasibility-check-and-tasking-order)
- [Scenario 3: Monitoring Setup](#scenario-3-monitoring-setup)
- [Scenario 4: Cost Estimation and Planning](#scenario-4-cost-estimation-and-planning)
- [Custom Scenarios](#custom-scenarios)

## Introduction

### Overview of Available Scenarios

The SkyFi Demo Agent includes four pre-built scenarios that demonstrate common satellite imagery workflows. Each scenario is designed to showcase specific capabilities and provide a complete end-to-end experience.

| Scenario | Primary Goal | Key Tools Used | Runtime | Estimated Cost |
|----------|-------------|----------------|---------|----------------|
| Archive Search & Order | Find and order existing imagery | search_archives, order_archive_imagery, get_pricing_info | ~60s | $0.50 |
| Feasibility & Tasking | Order new satellite captures | check_tasking_feasibility, predict_satellite_passes, order_tasking_imagery | ~90s | $0.75 |
| Monitoring Setup | Configure imagery alerts | create_monitoring_notification, list_notifications | ~45s | $0.30 |
| Cost Estimation | Explore pricing and plan budgets | get_pricing_info, comparative analysis | ~60s | $0.40 |

**Total estimated cost to run all scenarios**: $1.95-2.50 (OpenAI API costs only, no imagery purchases)

### How to Run Scenarios

#### Basic Usage

```bash
# Run all scenarios in sequence (dry-run mode)
npm run scenarios

# Run a specific scenario
npm run scenarios search-and-order
npm run scenarios feasibility-check
npm run scenarios monitoring-setup
npm run scenarios cost-estimation

# View available scenarios
npm run scenarios -- --list
```

#### Dry-Run vs Live Mode

**Dry-Run Mode (Default)**:
- No real orders are placed
- Tools are executed, but order confirmations are simulated
- Safe for testing and learning
- **Recommended for first-time users**

```bash
# Dry-run mode (default)
npm run scenarios search-and-order
```

**Live Mode**:
- Real orders are placed and will charge your SkyFi account
- Use only when you intend to purchase imagery
- Requires valid payment method on SkyFi account
- **⚠️ WARNING: This will spend real money!**

```bash
# Live mode (places real orders)
npm run scenarios search-and-order --live
```

### Understanding Scenario Output

Scenarios provide detailed output showing:

1. **Agent Thoughts**: What the agent is planning to do
2. **Tool Calls**: Which MCP tools are being executed
3. **Tool Parameters**: What data is being sent to each tool
4. **Tool Results**: Response from SkyFi API
5. **Agent Response**: Natural language interpretation
6. **Statistics**: Token usage, cost, execution time

Example output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scenario: Archive Search and Order
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/5] Starting scenario...
Agent: I'll search for satellite imagery of the specified area.

[2/5] Executing tool: search_archives
Parameters:
  - aoi: POLYGON(...)
  - startDate: 2024-11-01
  - endDate: 2024-11-17
  - maxCloudCover: 20

Tool Result: Found 5 matching archive items

[3/5] Agent response:
I found 5 results matching your criteria...
[Detailed response]

[4/5] Statistics:
  - Tokens used: 1,247
  - Cost: $0.028
  - Execution time: 3.2s

[5/5] Scenario completed successfully ✅
```

## Scenario 1: Archive Search and Order

### Objective and Use Case

**Goal**: Search for existing satellite imagery and place an order with delivery to cloud storage.

**Real-World Use Case**: A disaster response team needs to assess wildfire damage in Northern California. They search for recent high-resolution imagery, review quality metrics, get pricing, and order the imagery for delivery to AWS S3.

**Why This Matters**: Archive imagery is the fastest and most cost-effective way to acquire satellite data. This scenario teaches you how to find, evaluate, and order pre-existing imagery.

### Step-by-Step Walkthrough

#### Running the Scenario

```bash
# Dry-run mode (recommended first time)
npm run scenarios search-and-order

# Live mode (places real order)
npm run scenarios search-and-order --live
```

#### Conversation Flow

The scenario simulates this conversation:

**Step 1: Define Search Criteria**

```
User: I need to search for satellite imagery of a wildfire area in Northern
California. The area is around Paradise, CA, defined by this polygon:
POLYGON((-121.65 39.70, -121.50 39.70, -121.50 39.85, -121.65 39.85, -121.65 39.70))

I need imagery from the past 7 days with the highest resolution available.
```

**Expected Agent Actions**:
1. Parse the request and identify search parameters
2. Execute `search_archives` tool with:
   - AOI: Provided polygon
   - Date range: Last 7 days
   - Resolution: Priority on very high and high resolution
   - Cloud cover: Prefer < 20% for imagery quality

**Step 2: Review Search Results**

```
Agent: I found 3 results matching your criteria. Here are the details:

1. WorldView-3 Capture
   Archive ID: arch_abc123xyz
   Captured: November 15, 2024 at 6:30 PM UTC
   Satellite: WorldView-3
   Resolution: 0.5m (very high resolution)
   Cloud Cover: 5% (excellent quality)
   Scene Size: 230 km²

2. Sentinel-2 Capture
   Archive ID: arch_def456uvw
   Captured: November 14, 2024 at 10:15 AM UTC
   Satellite: Sentinel-2
   Resolution: 10m (medium resolution)
   Cloud Cover: 8% (good quality)
   Scene Size: 245 km²

3. Planet SkySat Capture
   Archive ID: arch_ghi789rst
   Captured: November 13, 2024 at 3:45 PM UTC
   Satellite: Planet SkySat
   Resolution: 3m (high resolution)
   Cloud Cover: 18% (acceptable quality)
   Scene Size: 235 km²

Which would you like to order, or would you like more details?
```

**Step 3: Get Detailed Information**

```
User: Tell me more about the WorldView-3 capture

Agent: [Executes: get_archive_by_id]

WorldView-3 Capture - Detailed Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Capture Details:
- Archive ID: arch_abc123xyz
- Satellite: WorldView-3 (commercial very high-resolution)
- Capture Date: November 15, 2024, 18:30 UTC
- Sun Elevation: 38° (good lighting)

Quality Metrics:
- Resolution: 0.5 meters per pixel
- Cloud Cover: 5% (excellent)
- Off-nadir Angle: 12° (acceptable distortion)
- Quality Score: 9.1/10

Technical Details:
- Bands: Red, Green, Blue, Near-Infrared, 4 additional spectral bands
- Bit Depth: 16-bit
- Spatial Reference: WGS84 / UTM Zone 10N
- Processing Level: Orthorectified

This is high-quality imagery perfect for detailed damage assessment.
```

**Step 4: Get Pricing**

```
User: What would this imagery cost?

Agent: [Executes: get_pricing_info]

Pricing Estimate:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Product: WorldView-3 Archive Imagery
Resolution: Very High (0.5m)
Area: 230 km²

Estimated Cost: $1,725 - $2,300
Breakdown:
- Base rate: $7.50-10.00 per km²
- Scene size: 230 km²
- Calculation: 230 × $7.50-10 = $1,725-2,300

Delivery: Included (S3, GCS, or Azure)
Processing: Basic orthorectification included
Rush delivery: +$200 (optional)

Note: Exact pricing depends on your account tier and any volume discounts.
```

**Step 5: Configure Order**

```
User: That works for our budget. I want to order this imagery and have it
delivered to my S3 bucket.

Bucket: disaster-response-imagery
Region: us-west-2
Prefix: wildfire-assessment/paradise-2024/

Agent: Perfect! Let me prepare the order summary.

Order Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Archive ID: arch_abc123xyz
Imagery: WorldView-3, 0.5m resolution, Nov 15, 2024
Cloud Cover: 5%
Estimated Cost: $1,725 - $2,300

Delivery Configuration:
- Provider: AWS S3
- Bucket: disaster-response-imagery
- Region: us-west-2
- Prefix: wildfire-assessment/paradise-2024/
- Format: GeoTIFF + metadata

Delivery Timeline: 4-24 hours after order placement

⚠️ WARNING: This order will charge your SkyFi account.

To proceed, type 'confirm' (or 'cancel' to abort).
```

**Step 6: Place Order**

```
User: confirm

Agent: [Executes: order_archive_imagery]

✅ Order placed successfully!

Order Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order ID: ord_xyz789abc
Status: Processing
Created: November 17, 2024, 10:30 UTC

Imagery Details:
- Archive ID: arch_abc123xyz
- Resolution: 0.5m WorldView-3
- Scene Size: 230 km²

Delivery:
- Location: s3://disaster-response-imagery/wildfire-assessment/paradise-2024/
- Estimated: 4-24 hours
- Format: GeoTIFF, metadata JSON, preview JPEG

You can check order status by asking:
"What's the status of order ord_xyz789abc?"

Thank you for your order!
```

### Expected Tool Calls and API Interactions

1. **search_archives**
   - Input: AOI, date range, resolution preferences
   - Output: List of matching archive items with metadata
   - API endpoint: `POST /api/v1/archive/search`

2. **get_archive_by_id**
   - Input: Archive ID
   - Output: Detailed archive item information
   - API endpoint: `GET /api/v1/archive/{archiveId}`

3. **get_pricing_info**
   - Input: Product type, resolution, area
   - Output: Pricing breakdown
   - API endpoint: `GET /api/v1/pricing`

4. **order_archive_imagery**
   - Input: Archive ID, delivery config
   - Output: Order confirmation with order ID
   - API endpoint: `POST /api/v1/orders/archive`

### Success Criteria

✅ Scenario is successful when:
- Search returns relevant archive items
- Detailed information is retrieved correctly
- Pricing estimate is provided
- Order is placed (or simulated in dry-run)
- Order ID is returned

### Estimated Runtime and Cost

**Runtime**:
- Total execution time: 45-75 seconds
- Search query: 5-10s
- Detail retrieval: 3-5s
- Pricing query: 2-4s
- Order placement: 2-5s
- Agent processing: 30-50s

**Cost Breakdown**:
- OpenAI API: $0.40-0.60 (GPT-4 Turbo)
- SkyFi API calls: Free (search and pricing)
- Imagery order: $1,725-2,300 (only if --live mode)

**Dry-run mode**: ~$0.50 total (OpenAI only)
**Live mode**: ~$1,725-2,300 (includes imagery)

### Troubleshooting Tips

#### No Results Found

**Problem**: Search returns no archive items

**Solutions**:
- Expand date range (try 30 days instead of 7)
- Increase area size (archives may have broader coverage)
- Remove cloud cover restrictions
- Check AOI coordinates are valid
- Try different resolution levels

#### High Cloud Cover

**Problem**: All results have >50% cloud cover

**Solutions**:
- Search different time periods
- Consider SAR imagery (cloud-penetrating)
- Use tasking scenario instead for fresh capture
- Accept best available and plan for partial coverage

#### Order Placement Fails

**Problem**: Order API returns error

**Common Errors**:
```
Error: Invalid delivery configuration
→ Check bucket name, region, and permissions

Error: Payment method required
→ Add payment method in SkyFi dashboard

Error: Insufficient permissions
→ Verify API key has ordering permissions

Error: Archive item no longer available
→ Archive was sold exclusively or removed
```

## Scenario 2: Feasibility Check and Tasking Order

### Objective and Use Case

**Goal**: Check if a satellite can capture new imagery of a specific location, predict satellite passes, and place a tasking order.

**Real-World Use Case**: A construction company monitors a solar farm being built in Arizona. They need fresh, high-resolution imagery captured at specific intervals to track progress and document milestones.

**Why This Matters**: Tasking allows you to order new satellite captures when archive imagery isn't recent enough or doesn't exist. This scenario teaches feasibility checking and satellite pass prediction.

### Step-by-Step Walkthrough

#### Running the Scenario

```bash
# Dry-run mode
npm run scenarios feasibility-check

# Live mode (places real tasking order)
npm run scenarios feasibility-check --live
```

#### Conversation Flow

**Step 1: Define Requirements**

```
User: I'm monitoring a solar farm construction project in Arizona. I need to
check if I can order new satellite imagery of this location:
POLYGON((-112.25 33.40, -112.20 33.40, -112.20 33.45, -112.25 33.45, -112.25 33.40))

I need imagery captured sometime in the next 7 days at the highest resolution
available. Can you check if this is feasible?
```

**Step 2: Feasibility Check**

```
Agent: I'll check if we can order new satellite imagery of your construction site.

[Executes: check_tasking_feasibility]

Tasking Feasibility Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feasibility: FEASIBLE ✅
Feasibility Score: 85/100 (Excellent)

Capture Opportunities: 12 satellite passes in the next 7 days

Constraints:
✓ Weather: Clear skies expected for next 5 days (excellent)
✓ Sun Angle: Optimal angles available in afternoon passes
✓ Satellite Availability: Multiple satellites can capture this area

Recommended Capture Windows:
1. November 18, 2024 at 7:30 PM UTC
   - Satellite: WorldView-3
   - Success Probability: 92%
   - Sun Elevation: 45.2° (optimal)

2. November 19, 2024 at 7:15 PM UTC
   - Satellite: Pleiades-1B
   - Success Probability: 88%
   - Sun Elevation: 43.8° (good)

Estimated Delivery: 7-10 days after successful capture

Tasking is highly feasible for your location!
```

**Step 3: Predict Satellite Passes**

```
User: Show me all satellite passes for the next 3 days

Agent: [Executes: predict_satellite_passes]

Satellite Pass Predictions:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

November 17, 2024:
  10:45 AM UTC - GeoEye-1
    Elevation: 42° | Off-nadir: 15°
    Resolution capable: 0.5m
    Conditions: Partly cloudy (60% clear)

  7:20 PM UTC - WorldView-3
    Elevation: 38° | Off-nadir: 12°
    Resolution capable: 0.3m
    Conditions: Clear (95% clear)

November 18, 2024:
  10:30 AM UTC - Pleiades-1B
    Elevation: 45° | Off-nadir: 10°
    Resolution capable: 0.5m
    Conditions: Clear (98% clear)

  7:30 PM UTC - WorldView-3 ⭐ RECOMMENDED
    Elevation: 48° | Off-nadir: 8°
    Resolution capable: 0.3m
    Conditions: Clear (99% clear)

November 19, 2024:
  7:15 PM UTC - Pleiades-1B
    Elevation: 44° | Off-nadir: 11°
    Resolution capable: 0.5m
    Conditions: Clear (96% clear)

The November 18 evening pass is optimal due to:
- Highest elevation angle (48°)
- Best atmospheric conditions (99% clear)
- Optimal sun angle for shadows and detail
- Lowest off-nadir angle (minimal distortion)

Would you like to proceed with ordering?
```

**Step 4: Get Pricing**

```
User: What would it cost to order tasking imagery at 0.5m resolution for this area?

Agent: [Executes: get_pricing_info]

Tasking Imagery Pricing:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Area: 35 km² (your construction site)
Resolution: 0.5 meters (very high resolution)
Product Type: Optical RGB
Capture Type: New Tasking

Base Cost Estimate: $2,450 - $3,150

Cost Breakdown:
- Per km² rate: $70-90 for very high-resolution tasking
- Area: 35 km²
- Calculation: 35 × $70-90 = $2,450-3,150

Additional Costs:
- Processing & delivery: Included
- Standard delivery (7-14 days): Included
- Rush delivery (3-5 days): +$750
- Monthly subscription (4 captures): -15% discount

Alternative Options:
- 3m resolution tasking: $875-1,050 (save 60%)
- Archive imagery: $175-350 (if available)

Note: Tasking is more expensive because satellites are specifically
tasked to capture your area, but you get guaranteed fresh imagery.
```

**Step 5: Configure and Confirm Order**

```
User: Yes, let's proceed with standard delivery. Deliver to Google Cloud Storage.

Bucket: solar-farm-monitoring
Prefix: monthly-captures/november-2024/

Agent: Perfect! Let me prepare your tasking order.

Tasking Order Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Location: Solar farm, Arizona (35 km²)
Resolution: 0.5 meters (very high resolution)
Product Type: Optical RGB

Capture Window:
- Preferred: November 18, 2024, 7:30 PM UTC (WorldView-3)
- Backup: November 19, 2024, 7:15 PM UTC (Pleiades-1B)
- Window: 7 days from order placement

Delivery Configuration:
- Provider: Google Cloud Storage
- Bucket: solar-farm-monitoring
- Prefix: monthly-captures/november-2024/
- Format: GeoTIFF with metadata

Timeline:
- Order placement: Today
- Capture attempt: Nov 18-19, 2024
- Processing: 2-3 days after capture
- Delivery: 7-10 days from order

Estimated Cost: $2,450 - $3,150

Important Notes:
- Weather-dependent: Auto-reschedule if clouds prevent capture
- No charge if capture fails due to weather/technical issues
- Cannot cancel after satellites are tasked

⚠️ This tasking order will charge your SkyFi account.

Type 'confirm' to proceed or 'cancel' to abort.
```

**Step 6: Place Tasking Order**

```
User: confirm

Agent: [Executes: order_tasking_imagery]

✅ Tasking order placed successfully!

Order Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order ID: ord_task_abc123xyz
Status: Scheduled
Created: November 17, 2024, 11:00 UTC

Capture Schedule:
- Primary Window: Nov 18, 2024, 19:30 UTC (WorldView-3)
- Backup Window: Nov 19, 2024, 19:15 UTC (Pleiades-1B)
- Weather monitoring: Active
- Auto-retry on clouds: Enabled

Next Steps:
1. Satellites tasked for Nov 18-19 capture
2. Weather monitored automatically
3. Email notification on successful capture
4. Processing begins after capture
5. Delivery to GCS within 48-72 hours of processing

You can check status anytime by asking:
"What's the status of order ord_task_abc123xyz?"

Your order is now in the queue!
```

### Understanding Feasibility Scores

Feasibility scores range from 0-100 and indicate how likely a successful capture is:

| Score | Rating | Meaning | Recommendation |
|-------|--------|---------|----------------|
| 90-100 | Excellent | Very high probability of success | Proceed with confidence |
| 70-89 | Good | Good probability, minor constraints | Recommended |
| 50-69 | Fair | Moderate probability, some challenges | Consider alternatives |
| 30-49 | Poor | Low probability, significant constraints | Not recommended |
| 0-29 | Very Poor | Very low or no probability | Try different timeframe |

**Factors Affecting Score**:
- Weather forecast (cloud probability)
- Satellite availability and orbits
- Sun angle and lighting conditions
- Geographic constraints (latitude, terrain)
- Competing tasking requests

### Satellite Pass Predictions

**Understanding Pass Parameters**:

**Elevation Angle**:
- Angle of satellite above horizon
- Higher is better (less atmospheric distortion)
- 30°: Minimum for good quality
- 45°+: Optimal quality
- 60°+: Excellent (rare)

**Off-Nadir Angle**:
- Angle from directly overhead
- Lower is better (less distortion)
- 0-10°: Excellent (minimal distortion)
- 10-20°: Good (acceptable distortion)
- 20-30°: Fair (noticeable distortion)
- 30°+: Poor (significant distortion)

**Sun Elevation**:
- Angle of sun above horizon
- Affects shadows and contrast
- 30-60°: Optimal range
- <20°: Long shadows (can obscure features)
- >70°: Minimal shadows (flat appearance)

### Provider Window IDs

When ordering tasking, you may receive provider window IDs:

```json
{
  "providerWindows": [
    {
      "providerId": "wv3_20241118_193000",
      "satellite": "WorldView-3",
      "startTime": "2024-11-18T19:30:00Z",
      "endTime": "2024-11-18T19:35:00Z",
      "priority": 1
    }
  ]
}
```

These IDs can be used to:
- Track specific capture attempts
- Query capture status
- Request specific satellite passes

### Estimated Runtime and Cost

**Runtime**: 60-120 seconds
- Feasibility check: 10-15s
- Pass prediction: 8-12s
- Pricing query: 3-5s
- Order placement: 3-5s
- Agent processing: 40-80s

**Cost**:
- OpenAI API: $0.60-0.90 (GPT-4 Turbo)
- SkyFi API calls: Free (feasibility and pricing)
- Tasking order: $2,450-3,150 (only if --live)

**Dry-run**: ~$0.75
**Live**: ~$2,450-3,150

### Troubleshooting Tips

#### Low Feasibility Score

**Problem**: Feasibility check returns <50 score

**Solutions**:
- Extend capture window (14 days instead of 7)
- Try different season/time of year
- Consider SAR imagery (weather-independent)
- Check if location is in satellite coverage area
- Reduce resolution requirements

#### Capture Failed/Delayed

**Problem**: Satellite couldn't capture due to weather

**What Happens**:
- Order automatically retries within capture window
- No charge if all attempts fail
- Email notification of delays

**Solutions**:
- Extend capture window when ordering
- Enable extended retry option
- Use SAR for critical time-sensitive needs

## Scenario 3: Monitoring Setup

### Objective and Use Case

**Goal**: Set up automated monitoring notifications to receive alerts when new satellite imagery becomes available.

**Real-World Use Case**: A coastal management agency monitors beach erosion along 50km of coastline. Instead of manually checking for new imagery, they set up automated notifications to alert them whenever fresh imagery matching their criteria is captured.

**Why This Matters**: Monitoring eliminates manual checking and ensures you don't miss important imagery. Perfect for ongoing projects requiring regular updates.

### Step-by-Step Walkthrough

#### Running the Scenario

```bash
npm run scenarios monitoring-setup
```

#### Conversation Flow

**Step 1: Define Monitoring Area**

```
User: I need to set up monitoring for a coastal area in Southern California.
I want to be notified whenever new high-resolution satellite imagery becomes available.

Area: POLYGON((-118.65 34.00, -118.50 34.00, -118.50 34.05, -118.65 34.05, -118.65 34.00))

Requirements:
- Resolution: 5 meters or better
- Cloud cover: Less than 20%
- Product type: Optical imagery
- Notification webhook: https://api.coastal-monitoring.org/webhooks/skyfi-alerts
```

**Step 2: Create Notification**

```
Agent: I'll set up monitoring notifications for your coastal area.

[Executes: create_monitoring_notification]

✅ Monitoring notification created successfully!

Notification Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Notification ID: notif_abc123xyz
Status: Active ✅
Created: November 17, 2024

Monitoring Area:
- Location: Southern California coastline
- Area Size: ~80 km²
- Coverage: Coastal zone from Santa Monica to Malibu

Alert Criteria:
- Resolution: 5 meters or better
- Cloud Cover: Maximum 20%
- Product Type: Optical imagery
- Frequency: Immediate (real-time alerts)

Notification Delivery:
- Webhook: https://api.coastal-monitoring.org/webhooks/skyfi-alerts
- Method: HTTP POST
- Format: JSON payload

What This Means:
You'll receive webhook notifications whenever new satellite imagery matching
your criteria becomes available. Each notification includes:
- Archive ID and capture details
- Quality metrics (cloud cover, resolution)
- Preview URL
- Ordering information

Your webhook should expect POST requests with JSON payloads.
Would you like to see an example notification payload?
```

**Step 3: Review Payload Format**

```
User: Yes, show me what the notification payload will look like

Agent: Here's an example of what your webhook will receive:

```json
{
  "notificationId": "notif_abc123xyz",
  "eventType": "new_imagery_available",
  "timestamp": "2024-11-18T14:30:00Z",
  "imagery": {
    "archiveId": "arch_xyz789def",
    "captureDate": "2024-11-18T18:45:00Z",
    "satellite": "Sentinel-2",
    "resolution": 3.0,
    "cloudCover": 8,
    "productType": "OPTICAL",
    "sceneSizeKm2": 85,
    "previewUrl": "https://api.skyfi.com/previews/arch_xyz789def.jpg",
    "bounds": {
      "type": "Polygon",
      "coordinates": [[...]]
    }
  },
  "orderInfo": {
    "estimatedCost": 255.00,
    "deliveryTime": "4-24 hours",
    "orderUrl": "https://api.skyfi.com/orders/archive/arch_xyz789def"
  }
}
```

Your webhook handler should:
1. Verify the notification signature
2. Extract archive ID and imagery details
3. Preview imagery using preview URL (optional)
4. Decide whether to auto-order or flag for review
5. Respond with HTTP 200 to acknowledge
```

**Step 4: Set Up Multiple Areas**

```
User: I also need to monitor Port of Los Angeles for ship traffic.
Location: POINT(-118.27 33.74)
Higher resolution required: 1m or better, 5% cloud cover max

Agent: [Executes: create_monitoring_notification]

✅ Additional notification created!

Notification #2 - Port of Los Angeles:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Notification ID: notif_port_la_456
Status: Active ✅
Location: POINT(-118.27 33.74)
Alert Criteria:
- Resolution: 1 meter or better
- Cloud Cover: Maximum 5%
- Product Type: Optical
- Use Case: Ship traffic monitoring

Summary of Active Monitoring:
1. Southern California coastline - 5m, 20% cloud
2. Port of Los Angeles - 1m, 5% cloud

Total monitored area: ~80 km² (coastline) + point of interest (port)

All notifications send to: https://api.coastal-monitoring.org/webhooks/skyfi-alerts
```

**Step 5: List All Notifications**

```
User: Show me all my active monitoring notifications

Agent: [Executes: list_notifications]

Active Monitoring Notifications:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Southern California Coastline
   ID: notif_abc123xyz
   Status: Active ✅
   Created: Nov 17, 2024
   Area: 80 km² polygon
   Criteria: ≤5m res, ≤20% cloud, OPTICAL
   Alerts Sent: 3 (last: 1 day ago)

2. Port of Los Angeles Ship Traffic
   ID: notif_port_la_456
   Status: Active ✅
   Created: Nov 17, 2024
   Area: Point of interest
   Criteria: ≤1m res, ≤5% cloud, OPTICAL
   Alerts Sent: 0 (never)

Total: 2 active notifications
Webhook: https://api.coastal-monitoring.org/webhooks/skyfi-alerts

Notification Activity (Last 30 Days):
- Total Alerts: 3
- Average per Week: 2
- Most Active: Coastline monitoring (3 alerts)
```

### Webhook Configuration

**Requirements**:
- Publicly accessible HTTPS endpoint
- Valid SSL certificate
- Returns HTTP 200 within 30 seconds
- Handles JSON POST requests

**Example Webhook Handler (Python/Flask)**:

```python
from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)

@app.route('/webhooks/skyfi-alerts', methods=['POST'])
def handle_skyfi_notification():
    # 1. Verify signature (if configured)
    signature = request.headers.get('X-SkyFi-Signature')
    # verify_signature(signature, request.data)

    # 2. Parse payload
    payload = request.json
    archive_id = payload['imagery']['archiveId']
    cloud_cover = payload['imagery']['cloudCover']
    resolution = payload['imagery']['resolution']

    # 3. Log notification
    print(f"New imagery: {archive_id}")
    print(f"Quality: {resolution}m, {cloud_cover}% clouds")

    # 4. Auto-order logic
    if cloud_cover < 10 and resolution <= 3:
        # Trigger automatic order
        auto_order_imagery(archive_id)
        status = "auto_ordered"
    else:
        # Flag for manual review
        flag_for_review(archive_id)
        status = "flagged_for_review"

    # 5. Return success
    return jsonify({
        'status': 'received',
        'action': status,
        'archiveId': archive_id
    }), 200

def auto_order_imagery(archive_id):
    # Place order via SkyFi API
    pass

def flag_for_review(archive_id):
    # Send to review queue
    pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

### Filter Criteria Selection

**Resolution**:
- Very High (< 1m): Detailed features, individual objects
- High (1-5m): General features, buildings, roads
- Medium (5-30m): Large features, land use, forests
- All: Receive all available resolutions

**Cloud Cover**:
- < 5%: Near perfect imagery
- < 10%: Excellent quality
- < 20%: Good quality (minor clouds)
- < 50%: Acceptable (some cloud coverage)
- Any: All imagery regardless of clouds

**Product Types**:
- OPTICAL: Standard RGB imagery
- SAR: Radar imagery (cloud-penetrating)
- MULTISPECTRAL: Multiple spectral bands
- All: Receive all product types

**Frequency**:
- Immediate: Real-time alerts as imagery becomes available
- Daily Digest: One email per day with all new imagery
- Weekly Digest: One email per week
- Custom: Set specific interval

### Testing Notifications

**Test Endpoint**:
```bash
# Use webhook.site for testing
# 1. Visit https://webhook.site
# 2. Copy your unique URL
# 3. Use that URL when creating notification
# 4. View incoming webhooks in browser
```

**Simulate Notification**:
```bash
# Test your webhook endpoint
curl -X POST https://your-endpoint.com/webhooks/skyfi-alerts \
  -H "Content-Type: application/json" \
  -d '{
    "notificationId": "test_123",
    "eventType": "new_imagery_available",
    "imagery": {
      "archiveId": "test_arch_456",
      "resolution": 3.0,
      "cloudCover": 8
    }
  }'
```

### Estimated Runtime and Cost

**Runtime**: 30-60 seconds
**Cost**: $0.25-0.40 (OpenAI API only)

**Note**: Creating and maintaining notifications is **free** on SkyFi. You only pay for:
- OpenAI API usage during setup (~$0.30)
- Actual imagery orders (when you decide to order)

### Troubleshooting Tips

**Webhook Not Receiving Alerts**:
- Verify URL is publicly accessible
- Check SSL certificate is valid
- Test endpoint with curl
- Review webhook server logs
- Check firewall rules
- Use webhook.site for testing

**Too Many Alerts**:
- Tighten filter criteria (lower cloud cover, higher resolution)
- Add minimum time between alerts
- Enable digest mode
- Add cost ceiling filter

**Missing Important Imagery**:
- Relax filter criteria
- Add multiple product types (OPTICAL + SAR)
- Verify AOI covers intended area
- Check notification is active

## Scenario 4: Cost Estimation and Planning

### Objective and Use Case

**Goal**: Explore pricing for different imagery products and optimize costs within budget constraints.

**Real-World Use Case**: An environmental NGO plans a year-long project monitoring deforestation across 5 Amazon rainforest sites. With a limited budget of $5,000/month, they need to determine the most cost-effective imagery acquisition strategy.

**Why This Matters**: Understanding costs upfront helps with budgeting, grant proposals, and choosing the right balance between quality and price.

### Running the Scenario

```bash
npm run scenarios cost-estimation
```

This scenario demonstrates:
- Getting general pricing information
- Comparing archive vs tasking costs
- Analyzing different resolutions and product types
- Creating annual budget projections
- Identifying cost-saving opportunities

For detailed walkthrough, see [`examples/cost-estimation.md`](../examples/cost-estimation.md).

### Key Takeaways

**Archive vs Tasking**:
- Archive: 7-10x cheaper, immediate delivery
- Tasking: Higher cost, guaranteed fresh imagery

**Cost Optimization Strategies**:
- Volume discounts (15-20% for large orders)
- Annual contracts (additional 5-10% savings)
- Free satellite data (Sentinel, Landsat) with processing fees
- Tiered monitoring (high-res for priority areas only)
- Seasonal planning (avoid rainy season for optical)

**Budget Planning Tips**:
- Add 10-20% buffer for unexpected costs
- Reserve funds for change detection follow-up
- Consider both OpenAI and imagery costs
- Plan for processing and storage costs

### Estimated Runtime and Cost

**Runtime**: 45-90 seconds
**Cost**: $0.30-0.50 (OpenAI API)

## Custom Scenarios

### Creating Your Own Scenarios

You can create custom scenarios for your specific use cases.

#### Scenario Template

```typescript
// src/agent/scenarios.ts

export async function runMyCustomScenario(
  agent: SkyFiAgent,
  dryRun = true
): Promise<ScenarioResult> {
  console.log('Starting custom scenario...');

  const results: AgentResponse[] = [];

  try {
    // Step 1: Define your first interaction
    const step1 = await agent.chat(
      'Your first query here'
    );
    results.push(step1);

    if (!step1.success) {
      throw new Error('Step 1 failed');
    }

    // Step 2: Follow-up interaction
    const step2 = await agent.chat(
      'Your second query here'
    );
    results.push(step2);

    // Step 3: Conditional logic
    if (shouldContinue(step2)) {
      const step3 = await agent.chat(
        'Your third query'
      );
      results.push(step3);
    }

    // Calculate totals
    const totalTokens = results.reduce((sum, r) => sum + r.tokensUsed, 0);
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);

    return {
      success: true,
      results,
      totalTokens,
      totalCost,
      executionTime: Date.now() - startTime,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
    };
  }
}

function shouldContinue(response: AgentResponse): boolean {
  // Your logic here
  return response.success && someCondition;
}
```

#### Example: Custom Monitoring Scenario

```typescript
export async function runQuarterlyMonitoringScenario(
  agent: SkyFiAgent,
  sites: string[],  // Array of WKT polygons
  dryRun = true
): Promise<ScenarioResult> {
  const results: AgentResponse[] = [];

  for (const site of sites) {
    // Search for archive imagery
    const search = await agent.chat(
      `Search for archive imagery of area ${site} from the last 3 months with resolution better than 5m`
    );
    results.push(search);

    // Get pricing
    const pricing = await agent.chat(
      'What would the highest quality result cost?'
    );
    results.push(pricing);

    if (!dryRun) {
      // Place order in live mode
      const order = await agent.chat(
        `Order the best quality imagery with delivery to S3 bucket: monitoring-${Date.now()}`
      );
      results.push(order);
    }
  }

  return {
    success: true,
    results,
    summary: `Processed ${sites.length} monitoring sites`,
  };
}
```

### Running Custom Scenarios

```typescript
import { SkyFiAgent } from './src/agent/agent.js';
import { runMyCustomScenario } from './src/agent/scenarios.js';

const agent = new SkyFiAgent({ verbose: true });

const result = await runMyCustomScenario(agent, true);  // dry-run

console.log(`Success: ${result.success}`);
console.log(`Cost: $${result.totalCost.toFixed(2)}`);
console.log(`Tokens: ${result.totalTokens}`);
```

### Sharing Scenarios

To share scenarios with others:

1. **Add to scenarios.ts**:
   ```typescript
   export async function runMyScenario(agent, dryRun) { ... }
   ```

2. **Document in this file**:
   - Add section describing your scenario
   - Include use case and expected outcomes
   - Provide example output

3. **Create example file**:
   ```markdown
   # examples/my-scenario.md

   ## Overview
   [Detailed walkthrough of your scenario]
   ```

4. **Submit PR** with:
   - Scenario implementation
   - Documentation
   - Example file
   - Tests (optional)

---

## Additional Resources

- [Demo Agent Guide](./demo-agent.md) - Main agent documentation
- [Agent Customization](./agent-customization.md) - Advanced customization
- [MCP Tools Reference](./mcp-tools-reference.md) - Complete tool documentation
- [Example Scenarios](../examples/) - Full scenario walkthroughs

## Next Steps

1. **Run all scenarios** to understand capabilities
2. **Modify scenarios** to match your use cases
3. **Create custom scenarios** for your workflows
4. **Build production integration** using MCP tools directly

For production use, see the [main README](../README.md) for direct MCP server integration.
