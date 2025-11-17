# Monitoring Notification Examples

Comprehensive examples for setting up automated satellite imagery monitoring with webhooks.

## Table of Contents

- [Overview](#overview)
- [Creating Basic Notification](#creating-basic-notification)
- [Webhook Setup](#webhook-setup)
- [Filter Criteria](#filter-criteria)
- [Managing Notifications](#managing-notifications)
- [Real-World Scenarios](#real-world-scenarios)
- [Webhook Payload Examples](#webhook-payload-examples)
- [Automated Workflows](#automated-workflows)
- [Best Practices](#best-practices)

---

## Overview

Monitoring notifications automatically alert you when new satellite imagery matching your criteria becomes available in the SkyFi archive.

### Key Concepts

**Notifications:**
- Set up once, run continuously
- Monitor specific Area of Interest (AOI)
- Filter by product type, resolution, clouds, etc.
- Send webhook POST requests when imagery matches

**Webhooks:**
- Your public HTTPS endpoint
- Receives POST requests with imagery details
- Process automatically (download, analyze, alert)
- Real-time vs. polling

**Use Cases:**
- Construction site monitoring
- Environmental change detection
- Disaster response preparation
- Automated data pipelines
- Research time-series collection

---

## Creating Basic Notification

Set up a simple monitoring notification.

### Scenario

Monitor downtown Austin for any new high-resolution imagery.

### Request

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "webhookUrl": "https://myapp.com/webhooks/skyfi-imagery",
  "name": "Austin downtown monitoring"
}
```

### Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| aoi | WKT POLYGON | Area to monitor (downtown Austin) |
| webhookUrl | HTTPS URL | Your endpoint for notifications |
| name | String | Descriptive name for notification |

### Response

```
✅ Monitoring Notification Created Successfully!

**Notification ID:** 123e4567-e89b-12d3-a456-426614174000

**Webhook URL:** https://myapp.com/webhooks/skyfi-imagery

**Area of Interest:**
- Location: Austin, TX (downtown)
- Coverage: ~8 km²

**Active Filters:** None (all imagery types)

**Status:** Active ✅

---

## Webhook Payload Format

When new imagery matches your criteria, you'll receive:

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
      "footprint": "POLYGON((...)",
      "thumbnailUrls": {
        "small": "https://...",
        "medium": "https://..."
      }
    }
  ]
}
```

---

## Management

**List notifications:**
Use `list_notifications` to view all active notifications.

**Delete notification:**
Use `delete_notification` with the notification ID when no longer needed.

---

## Next Steps

1. Verify webhook endpoint is accessible
2. Test webhook with webhook.site or ngrok
3. Implement webhook handler (see examples below)
4. Monitor notification trigger count
5. Adjust filters as needed
```

### What Happens Next

1. **Notification is active** - SkyFi monitors for new imagery
2. **New imagery arrives** - Matching your AOI
3. **Webhook fires** - POST request sent to your endpoint
4. **You receive data** - Archive ID and metadata
5. **Take action** - Review, download, order, analyze

---

## Webhook Setup

### Public Webhook Endpoint Required

Your webhook URL must be:
- ✅ Publicly accessible from internet
- ✅ HTTPS (recommended) or HTTP (local dev only)
- ✅ Return 200 OK response
- ✅ Process requests quickly (<30s timeout)

### Testing: webhook.site

For quick testing without writing code:

**1. Get temporary webhook URL:**
```
Visit: https://webhook.site
Copy your unique URL: https://webhook.site/abc-123-def-456
```

**2. Create notification:**
```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "webhookUrl": "https://webhook.site/abc-123-def-456",
  "name": "Testing webhooks"
}
```

**3. View incoming requests:**
- Return to webhook.site
- See real-time webhook deliveries
- Inspect payload structure
- Test before implementing

### Local Development: ngrok

Expose local server for testing:

**1. Start your local server:**
```bash
# Python Flask example
python app.py
# Running on http://localhost:5000
```

**2. Expose with ngrok:**
```bash
ngrok http 5000
# Forwarding https://abc123.ngrok.io → http://localhost:5000
```

**3. Use ngrok URL in notification:**
```json
{
  "aoi": "POLYGON((...)",
  "webhookUrl": "https://abc123.ngrok.io/webhooks/skyfi",
  "name": "Local development testing"
}
```

**4. Develop and test locally**
- Receive real webhooks on local machine
- Debug with breakpoints
- Iterate quickly

### Production Webhook Implementation

**Node.js / Express:**
```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhooks/skyfi-imagery', async (req, res) => {
  // Acknowledge receipt immediately
  res.status(200).send('OK');

  // Process asynchronously
  const { notificationId, timestamp, archives } = req.body;

  try {
    for (const archive of archives) {
      console.log(`New imagery: ${archive.archiveId}`);
      console.log(`Provider: ${archive.provider}`);
      console.log(`Captured: ${archive.captureTimestamp}`);
      console.log(`Clouds: ${archive.cloudCoveragePercent}%`);

      // Your processing logic
      await processNewImagery(archive);

      // Send alert
      await sendSlackNotification(
        `New ${archive.provider} imagery available!`
      );
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
  }
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

**Python / Flask:**
```python
from flask import Flask, request, jsonify
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

@app.route('/webhooks/skyfi-imagery', methods=['POST'])
def skyfi_webhook():
    # Acknowledge immediately
    data = request.json
    logging.info(f"Received notification: {data['notificationId']}")

    # Process in background task
    for archive in data['archives']:
        logging.info(f"New imagery: {archive['archiveId']}")
        logging.info(f"Provider: {archive['provider']}")
        logging.info(f"Captured: {archive['captureTimestamp']}")
        logging.info(f"Clouds: {archive['cloudCoveragePercent']}%")

        # Your processing logic
        process_imagery.delay(archive)  # Celery task

        # Send alert
        send_email_alert(
            f"New {archive['provider']} imagery available!"
        )

    return jsonify({'status': 'OK'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

**Go:**
```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
)

type WebhookPayload struct {
    NotificationID string    `json:"notificationId"`
    Timestamp      string    `json:"timestamp"`
    Event          string    `json:"event"`
    Archives       []Archive `json:"archives"`
}

type Archive struct {
    ArchiveID            string  `json:"archiveId"`
    Provider             string  `json:"provider"`
    ProductType          string  `json:"productType"`
    CloudCoveragePercent float64 `json:"cloudCoveragePercent"`
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    // Acknowledge immediately
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))

    // Parse payload
    var payload WebhookPayload
    if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
        log.Printf("Error decoding payload: %v", err)
        return
    }

    // Process asynchronously
    go func() {
        for _, archive := range payload.Archives {
            log.Printf("New imagery: %s", archive.ArchiveID)
            log.Printf("Provider: %s", archive.Provider)

            // Your processing logic
            processImagery(archive)

            // Send alert
            sendAlert(archive)
        }
    }()
}

func main() {
    http.HandleFunc("/webhooks/skyfi-imagery", webhookHandler)
    log.Println("Webhook server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

---

## Filter Criteria

Control which imagery triggers notifications.

### No Filters (All Imagery)

Receive notifications for ANY new imagery in AOI:

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "webhookUrl": "https://myapp.com/webhooks/skyfi"
}
```

**Triggers:** Every new image in AOI (may be many!)

### Product Type Filter

Only specific imagery types:

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "webhookUrl": "https://myapp.com/webhooks/skyfi",
  "filters": {
    "productTypes": ["DAY", "MULTISPECTRAL"]
  }
}
```

**Triggers:** Only DAY and MULTISPECTRAL imagery

### Resolution Filter

Only high-resolution imagery:

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "webhookUrl": "https://myapp.com/webhooks/skyfi",
  "filters": {
    "resolutions": ["HIGH", "VERY_HIGH"]
  }
}
```

**Triggers:** Only HIGH and VERY_HIGH resolution

### Cloud Coverage Filter

Only clear imagery:

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "webhookUrl": "https://myapp.com/webhooks/skyfi",
  "filters": {
    "maxCloudCoveragePercent": 15
  }
}
```

**Triggers:** Only imagery with ≤15% cloud coverage

### Provider Filter

Only specific satellite providers:

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "webhookUrl": "https://myapp.com/webhooks/skyfi",
  "filters": {
    "providers": ["PLANET", "MAXAR"]
  }
}
```

**Triggers:** Only PLANET and MAXAR imagery

### Combined Filters

Multiple filters for precise control:

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "webhookUrl": "https://myapp.com/webhooks/skyfi",
  "filters": {
    "productTypes": ["DAY"],
    "resolutions": ["VERY_HIGH"],
    "maxCloudCoveragePercent": 10,
    "maxOffNadirAngle": 20,
    "providers": ["PLANET"]
  },
  "name": "Austin - High quality optical only"
}
```

**Triggers:** Only imagery matching ALL filters

### Open Data Only

Only free imagery:

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "webhookUrl": "https://myapp.com/webhooks/skyfi",
  "filters": {
    "openData": true
  },
  "name": "Austin - Open data only"
}
```

**Triggers:** Only free open data imagery (Sentinel, Landsat)

---

## Managing Notifications

### Listing All Notifications

View all your active notifications:

**Request:**
```json
{
  "page": 1,
  "pageSize": 20,
  "includeInactive": false
}
```

**Response:**
```
## Monitoring Notifications (5 active)

### 1. Austin downtown monitoring
- **ID:** 123e4567-e89b-12d3-a456-426614174000
- **Status:** ✅ Active
- **Webhook:** https://myapp.com/webhooks/skyfi
- **Triggers:** 12 times
- **Filters:** None (all imagery)
- **Created:** 2024-01-01

### 2. San Francisco - High quality only
- **ID:** 234f5678-e89b-12d3-a456-426614174111
- **Status:** ✅ Active
- **Webhook:** https://myapp.com/webhooks/skyfi
- **Triggers:** 5 times
- **Filters:**
  - Product Types: DAY
  - Resolutions: VERY_HIGH
  - Max Clouds: 10%
- **Created:** 2024-01-05

[... more notifications ...]
```

### Viewing Specific Notification

Get details by ID from list:

```json
{
  "page": 1,
  "pageSize": 100
}
```

Filter client-side to find specific notification.

### Deleting Notification

Remove when no longer needed:

**Request:**
```json
{
  "notificationId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response:**
```
✅ Notification Deleted Successfully

**Deleted ID:** 123e4567-e89b-12d3-a456-426614174000

Your webhook will no longer receive notifications for this AOI.

⚠️ This action cannot be undone.
```

**When to delete:**
- Project completed
- Monitoring no longer needed
- Changing requirements (create new notification)
- Reducing active notifications

---

## Real-World Scenarios

### Scenario 1: Construction Site Monitoring

**Objective:** Monthly progress photos of construction site.

**Requirements:**
- High resolution for details
- Clear imagery only
- Monthly check-ins sufficient
- Automated reports

**Setup:**

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2720, -97.7400 30.2720, -97.7400 30.2672, -97.7450 30.2672))",
  "webhookUrl": "https://construction-monitor.com/webhooks/skyfi",
  "filters": {
    "productTypes": ["DAY"],
    "resolutions": ["VERY_HIGH", "SUPER_HIGH"],
    "maxCloudCoveragePercent": 10,
    "maxOffNadirAngle": 20
  },
  "name": "Austin Construction Site #42"
}
```

**Webhook Handler:**
```python
@app.route('/webhooks/skyfi', methods=['POST'])
def construction_webhook():
    data = request.json

    for archive in data['archives']:
        # Check if > 30 days since last imagery
        if days_since_last_image('site-42') > 30:
            # Automatically order imagery
            order_id = order_archive_imagery(
                archive_id=archive['archiveId'],
                site_id='site-42'
            )

            # Generate progress report
            generate_report(
                site_id='site-42',
                archive=archive,
                order_id=order_id
            )

            # Email stakeholders
            send_email(
                to='project-team@company.com',
                subject='New Construction Progress Image',
                body=f"New imagery captured on {archive['captureTimestamp']}"
            )

    return jsonify({'status': 'OK'}), 200
```

**Workflow:**
1. New imagery arrives monthly
2. Webhook fires
3. Auto-order if >30 days since last
4. Generate progress report
5. Email team

---

### Scenario 2: Disaster Response Preparation

**Objective:** Immediate alerts for new imagery in hurricane-prone regions.

**Requirements:**
- All imagery types (optical + SAR)
- Immediate notification
- Any conditions acceptable
- 24/7 monitoring

**Setup:**

```json
{
  "aoi": "POLYGON((-90.0715 29.9511, -90.0715 30.0511, -89.9715 30.0511, -89.9715 29.9511, -90.0715 29.9511))",
  "webhookUrl": "https://disaster-response.org/webhooks/skyfi",
  "filters": {
    "productTypes": ["DAY", "SAR"]
  },
  "name": "New Orleans - Hurricane Monitoring"
}
```

**Webhook Handler:**
```javascript
app.post('/webhooks/skyfi', async (req, res) => {
  res.status(200).send('OK');

  const { archives } = req.body;

  for (const archive of archives) {
    // Immediate alert to response team
    await sendPagerDutyAlert({
      title: 'New Imagery: New Orleans',
      severity: 'high',
      details: {
        provider: archive.provider,
        type: archive.productType,
        captured: archive.captureTimestamp,
        clouds: archive.cloudCoveragePercent
      }
    });

    // Auto-order SAR imagery (weather-independent)
    if (archive.productType === 'SAR') {
      await orderImagery(archive.archiveId);
    }

    // Post to Slack #disaster-response
    await postToSlack('#disaster-response', {
      text: `🛰️ New ${archive.productType} imagery available`,
      fields: [
        { title: 'Provider', value: archive.provider },
        { title: 'Captured', value: archive.captureTimestamp },
        { title: 'Archive ID', value: archive.archiveId }
      ]
    });
  }
});
```

**Workflow:**
1. Any new imagery triggers alert
2. PagerDuty notification to on-call team
3. Auto-order SAR imagery
4. Post to Slack for visibility
5. Team reviews and responds

---

### Scenario 3: Agricultural Time-Series

**Objective:** Build monthly NDVI time-series for crop health analysis.

**Requirements:**
- Multispectral imagery
- Clear skies essential
- Monthly cadence
- Automated data pipeline

**Setup:**

```json
{
  "aoi": "POLYGON((-93.6250 41.5868, -93.6250 41.6168, -93.5850 41.6168, -93.5850 41.5868, -93.6250 41.5868))",
  "webhookUrl": "https://ag-analytics.farm/webhooks/skyfi",
  "filters": {
    "productTypes": ["MULTISPECTRAL"],
    "resolutions": ["MEDIUM", "HIGH"],
    "maxCloudCoveragePercent": 15,
    "providers": ["PLANET"]
  },
  "name": "Iowa Farm #127 - NDVI Monitoring"
}
```

**Webhook Handler:**
```python
@app.route('/webhooks/skyfi', methods=['POST'])
def agriculture_webhook():
    data = request.json

    for archive in data['archives']:
        # Check if we need this month's imagery
        capture_month = parse_month(archive['captureTimestamp'])

        if not has_imagery_for_month('farm-127', capture_month):
            # Order imagery
            order = order_imagery(
                archive_id=archive['archiveId'],
                farm_id='farm-127'
            )

            # Queue for processing
            process_queue.add({
                'farm_id': 'farm-127',
                'order_id': order['id'],
                'month': capture_month,
                'task': 'calculate_ndvi'
            })

            # Log to database
            db.imagery_logs.insert({
                'farm_id': 'farm-127',
                'archive_id': archive['archiveId'],
                'month': capture_month,
                'status': 'ordered'
            })

    return jsonify({'status': 'OK'}), 200
```

**Data Pipeline:**
1. Monthly imagery arrives
2. Webhook triggers
3. Check if month needs imagery
4. Auto-order if needed
5. Queue NDVI calculation
6. Update database
7. Generate monthly report

---

### Scenario 4: Environmental Change Detection

**Objective:** Detect deforestation in protected rainforest area.

**Requirements:**
- Both optical and SAR (clouds common)
- Any resolution acceptable
- Frequent checks
- Change detection analysis

**Setup:**

```json
{
  "aoi": "POLYGON((-62.2163 -3.4653, -62.2163 -3.3653, -62.1163 -3.3653, -62.1163 -3.4653, -62.2163 -3.4653))",
  "webhookUrl": "https://forest-watch.org/webhooks/skyfi",
  "filters": {
    "productTypes": ["DAY", "MULTISPECTRAL", "SAR"],
    "maxCloudCoveragePercent": 40
  },
  "name": "Amazon Rainforest - Deforestation Monitoring"
}
```

**Webhook Handler:**
```javascript
app.post('/webhooks/skyfi', async (req, res) => {
  res.status(200).send('OK');

  const { archives } = req.body;

  for (const archive of archives) {
    // Prioritize SAR (cloud-independent)
    const priority = archive.productType === 'SAR' ? 'high' : 'normal';

    // Order imagery
    const order = await orderImagery({
      archiveId: archive.archiveId,
      priority: priority
    });

    // Queue change detection analysis
    await queueAnalysis({
      orderId: order.id,
      analysisType: 'deforestation-detection',
      baselineDate: '2024-01-01',
      alertThreshold: 0.05  // 5% forest loss
    });

    // If SAR, run immediate pre-processing
    if (archive.productType === 'SAR') {
      await preprocessSAR(order.id);
    }
  }
});
```

**Analysis Workflow:**
1. New imagery → webhook fires
2. Auto-order imagery
3. Queue change detection
4. Compare to baseline
5. If >5% loss detected:
   - Alert authorities
   - Generate detailed report
   - Plot affected areas
6. Update baseline quarterly

---

### Scenario 5: Research Data Collection

**Objective:** Collect all Sentinel-2 open data for research project.

**Requirements:**
- Only open data (free)
- All resolutions acceptable
- Comprehensive collection
- Minimal filtering

**Setup:**

```json
{
  "aoi": "POLYGON((-122.4194 37.7749, -122.4194 37.8049, -122.3894 37.8049, -122.3894 37.7749, -122.4194 37.7749))",
  "webhookUrl": "https://research.university.edu/webhooks/skyfi",
  "filters": {
    "openData": true,
    "providers": ["SENTINEL2"]
  },
  "name": "SF Bay Area - Sentinel-2 Collection"
}
```

**Webhook Handler:**
```python
@app.route('/webhooks/skyfi', methods=['POST'])
def research_webhook():
    data = request.json

    for archive in data['archives']:
        # Log to research database
        db.sentinel2_collection.insert({
            'archive_id': archive['archiveId'],
            'capture_date': archive['captureTimestamp'],
            'cloud_coverage': archive['cloudCoveragePercent'],
            'provider': archive['provider'],
            'status': 'available'
        })

        # Free imagery - order everything
        order = order_free_imagery(archive['archiveId'])

        # Add to processing queue
        processing_queue.add({
            'order_id': order['id'],
            'archive_id': archive['archiveId'],
            'priority': 'low',  # Not urgent
            'tasks': [
                'atmospheric_correction',
                'cloud_masking',
                'index_calculation'
            ]
        })

        # Update collection statistics
        update_statistics('sentinel2', {
            'total_images': increment(),
            'last_update': now()
        })

    return jsonify({'status': 'OK'}), 200
```

**Data Collection:**
1. All Sentinel-2 → webhook
2. Log to database
3. Auto-order (free!)
4. Queue processing
5. Generate indices (NDVI, NDWI, etc.)
6. Archive for research

---

## Webhook Payload Examples

### Single Archive

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
      "cloudCoveragePercent": 5.2,
      "offNadirAngle": 12.5,
      "footprint": "POLYGON((-97.75 30.26, -97.75 30.28, -97.73 30.28, -97.73 30.26, -97.75 30.26))",
      "thumbnailUrls": {
        "small": "https://skyfi-thumbnails.s3.amazonaws.com/abc123/small.jpg",
        "medium": "https://skyfi-thumbnails.s3.amazonaws.com/abc123/medium.jpg"
      }
    }
  ]
}
```

### Multiple Archives (Batch)

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
      "cloudCoveragePercent": 5.2,
      "footprint": "POLYGON((...)",
      "thumbnailUrls": { "small": "...", "medium": "..." }
    },
    {
      "archiveId": "def45678-9012-3def-4567-890123456def",
      "provider": "SATELLOGIC",
      "productType": "MULTISPECTRAL",
      "resolution": "HIGH",
      "captureTimestamp": "2024-01-15T14:20:00Z",
      "cloudCoveragePercent": 8.7,
      "footprint": "POLYGON((...)",
      "thumbnailUrls": { "small": "...", "medium": "..." }
    }
  ]
}
```

### Open Data (Sentinel-2)

```json
{
  "notificationId": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-01-15T14:30:00Z",
  "event": "NEW_IMAGERY_AVAILABLE",
  "archives": [
    {
      "archiveId": "ghi78901-2345-6ghi-7890-123456789ghi",
      "provider": "SENTINEL2",
      "productType": "MULTISPECTRAL",
      "resolution": "MEDIUM",
      "captureTimestamp": "2024-01-15T11:00:00Z",
      "cloudCoveragePercent": 15.3,
      "openData": true,
      "footprint": "POLYGON((...)",
      "thumbnailUrls": { "small": "...", "medium": "..." }
    }
  ]
}
```

---

## Automated Workflows

### Workflow 1: Auto-Order and Process

```python
@app.route('/webhooks/skyfi', methods=['POST'])
def auto_order_workflow():
    data = request.json

    for archive in data['archives']:
        # 1. Evaluate if we want this imagery
        should_order = evaluate_imagery(archive)

        if should_order:
            # 2. Place order
            order = order_archive_imagery(
                archive_id=archive['archiveId'],
                delivery_config=get_s3_config()
            )

            # 3. Wait for delivery (webhook or polling)
            # ... order webhook handler ...

            # 4. Download from S3
            imagery_path = download_from_s3(order['s3_path'])

            # 5. Process
            processed = process_imagery(imagery_path, [
                'atmospheric_correction',
                'cloud_masking',
                'index_calculation'
            ])

            # 6. Analyze
            results = analyze_imagery(processed)

            # 7. Store results
            save_results(results)

            # 8. Alert if needed
            if results['anomaly_detected']:
                send_alert(results)

    return jsonify({'status': 'OK'}), 200
```

### Workflow 2: Quality Check and Conditional Order

```javascript
app.post('/webhooks/skyfi', async (req, res) => {
  res.status(200).send('OK');

  const { archives } = req.body;

  for (const archive of archives) {
    // Quality checks
    const quality = {
      clouds: archive.cloudCoveragePercent,
      angle: archive.offNadirAngle,
      resolution: archive.resolution
    };

    // Scoring
    let score = 100;
    score -= quality.clouds;  // Penalize clouds
    score -= quality.angle / 2;  // Penalize angle

    // Decision
    if (score >= 80) {
      // Excellent - order immediately
      await orderImagery(archive.archiveId, { priority: 'normal' });
    } else if (score >= 60) {
      // Good - order if no better option in 48h
      await scheduleConditionalOrder(archive.archiveId, {
        waitHours: 48,
        scoreThreshold: 80
      });
    } else {
      // Poor - skip
      console.log(`Skipping low quality imagery: score ${score}`);
    }
  }
});
```

### Workflow 3: Multi-Region Coordination

```python
# Global monitoring with regional coordination
@app.route('/webhooks/skyfi', methods=['POST'])
def multi_region_workflow():
    data = request.json

    for archive in data['archives']:
        # Determine region
        region = identify_region(archive['footprint'])

        # Regional processing
        if region == 'north-america':
            process_with_us_server(archive)
        elif region == 'europe':
            process_with_eu_server(archive)
        elif region == 'asia':
            process_with_asia_server(archive)

        # Global database update
        global_db.update({
            'region': region,
            'archive_id': archive['archiveId'],
            'timestamp': archive['captureTimestamp']
        })

        # Cross-region analysis
        check_global_patterns()

    return jsonify({'status': 'OK'}), 200
```

---

## Best Practices

### 1. Start with Broad Filters, Then Narrow

❌ **Too specific initially:**
```json
{
  "filters": {
    "productTypes": ["DAY"],
    "resolutions": ["ULTRA_HIGH"],
    "maxCloudCoveragePercent": 5,
    "maxOffNadirAngle": 10,
    "providers": ["PLANET"]
  }
}
```
May never trigger!

✅ **Start broad:**
```json
{
  "filters": {
    "productTypes": ["DAY"],
    "maxCloudCoveragePercent": 20
  }
}
```
See what's available, then refine.

### 2. Return 200 OK Quickly

❌ **Slow processing:**
```python
@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    # Long processing...
    process_imagery(data)  # 5 minutes!
    download_imagery(data)  # 10 minutes!
    return 'OK', 200
```

✅ **Acknowledge and process async:**
```python
@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    # Acknowledge immediately
    response = 'OK', 200

    # Process in background
    celery_app.send_task('process_webhook', args=[data])

    return response
```

### 3. Handle Idempotency

Same notification may arrive multiple times:

✅ **Track processed notifications:**
```python
@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    notification_id = data['notificationId']
    timestamp = data['timestamp']

    # Check if already processed
    key = f"{notification_id}:{timestamp}"
    if redis.exists(key):
        return 'Already processed', 200

    # Process
    process_webhook(data)

    # Mark as processed (expire in 7 days)
    redis.setex(key, 604800, '1')

    return 'OK', 200
```

### 4. Implement Error Handling

✅ **Graceful error handling:**
```python
@app.route('/webhook', methods=['POST'])
def webhook():
    try:
        data = request.json

        # Validate payload
        if 'archives' not in data:
            logging.error('Invalid payload: missing archives')
            return 'Invalid payload', 400

        # Process
        for archive in data['archives']:
            try:
                process_archive(archive)
            except Exception as e:
                logging.error(f'Error processing {archive["archiveId"]}: {e}')
                # Continue with other archives

        return 'OK', 200

    except Exception as e:
        logging.error(f'Webhook error: {e}')
        return 'Error', 500
```

### 5. Monitor and Log

✅ **Comprehensive logging:**
```python
@app.route('/webhook', methods=['POST'])
def webhook():
    start_time = time.time()
    data = request.json

    logging.info(f"Webhook received: {data['notificationId']}")
    logging.info(f"Archives count: {len(data['archives'])}")

    for archive in data['archives']:
        logging.info(f"Processing: {archive['archiveId']}")
        logging.info(f"  Provider: {archive['provider']}")
        logging.info(f"  Type: {archive['productType']}")
        logging.info(f"  Captured: {archive['captureTimestamp']}")
        logging.info(f"  Clouds: {archive['cloudCoveragePercent']}%")

        process_archive(archive)

    duration = time.time() - start_time
    logging.info(f"Webhook processed in {duration:.2f}s")

    return 'OK', 200
```

### 6. Test Thoroughly

✅ **Testing checklist:**
- [ ] Test with webhook.site first
- [ ] Test with ngrok locally
- [ ] Verify 200 OK response
- [ ] Test error scenarios
- [ ] Test duplicate notifications
- [ ] Test batch notifications
- [ ] Monitor production logs
- [ ] Set up alerts for failures

### 7. Clean Up Unused Notifications

Regularly review and delete:

```python
# Monthly cleanup script
def cleanup_notifications():
    notifications = list_all_notifications()

    for notif in notifications:
        # Delete if no triggers in 90 days
        if notif['last_triggered'] < 90_days_ago():
            delete_notification(notif['id'])
            logging.info(f"Deleted inactive: {notif['name']}")
```

### 8. Document Your Notifications

Keep a registry:

```yaml
# notifications.yml
notifications:
  - name: "Austin Construction Site #42"
    id: "123e4567-..."
    purpose: "Monthly progress monitoring"
    owner: "john.doe@company.com"
    created: "2024-01-01"
    filters:
      product_types: ["DAY"]
      resolutions: ["VERY_HIGH"]
      max_clouds: 10

  - name: "SF Disaster Response"
    id: "234f5678-..."
    purpose: "Emergency imagery alerts"
    owner: "emergency-team@company.com"
    created: "2024-01-05"
    filters:
      product_types: ["SAR", "DAY"]
```

---

## Troubleshooting

### Issue: Webhook Not Firing

**Possible causes:**
1. Webhook URL not publicly accessible
2. HTTPS certificate invalid
3. Endpoint returning errors
4. Filters too restrictive

**Solutions:**
1. Test with webhook.site
2. Check SSL certificate
3. Review endpoint logs
4. Relax filters temporarily

### Issue: Too Many Notifications

**Problem:**
Webhook firing constantly.

**Solution:**
Add more filters:
```json
{
  "filters": {
    "maxCloudCoveragePercent": 15,  // Add cloud filter
    "resolutions": ["VERY_HIGH"],    // Limit to high-res
    "providers": ["PLANET"]          // Single provider
  }
}
```

### Issue: Duplicates

**Problem:**
Same imagery triggering multiple times.

**Solution:**
Implement idempotency (see best practices #3).

### Issue: Missing Imagery

**Problem:**
Expected imagery not triggering notification.

**Solution:**
1. Check filters aren't too restrictive
2. Verify AOI is correct
3. List notifications to confirm active
4. Check webhook endpoint is working

---

## Quick Reference

### Monitoring Patterns

**Construction monitoring:**
```json
{
  "productTypes": ["DAY"],
  "resolutions": ["VERY_HIGH", "SUPER_HIGH"],
  "maxCloudCoveragePercent": 10,
  "maxOffNadirAngle": 20
}
```

**Agriculture:**
```json
{
  "productTypes": ["MULTISPECTRAL"],
  "resolutions": ["MEDIUM", "HIGH"],
  "maxCloudCoveragePercent": 15,
  "providers": ["PLANET"]
}
```

**Disaster response:**
```json
{
  "productTypes": ["SAR", "DAY"]
  // Minimal filters for maximum coverage
}
```

**Research:**
```json
{
  "openData": true,
  "providers": ["SENTINEL2"]
}
```

---

**Related Documentation:**
- [MCP Tools Reference](../mcp-tools-reference.md) - Complete tool documentation
- [Search Archives Examples](search-archives.md) - Finding imagery
- [Order Imagery Examples](order-imagery.md) - Placing orders
- [Feasibility Examples](feasibility.md) - Tasking feasibility
