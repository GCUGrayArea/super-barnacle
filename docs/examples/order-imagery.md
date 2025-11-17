# Order Imagery Examples

Comprehensive examples for ordering satellite imagery from SkyFi (both archive and tasking orders).

⚠️ **COST WARNING:** All examples in this document involve real paid orders that will charge your account.

## Table of Contents

- [Archive Order Workflow](#archive-order-workflow)
- [Tasking Order Workflow](#tasking-order-workflow)
- [Delivery Configuration Examples](#delivery-configuration-examples)
- [Order with Webhooks](#order-with-webhooks)
- [Complete End-to-End Example](#complete-end-to-end-example)
- [Cost Estimation](#cost-estimation)
- [Order Management](#order-management)

---

## Archive Order Workflow

Archive orders are for existing satellite imagery in SkyFi's catalog. This is the recommended approach when imagery exists for your area.

### Benefits of Archive Orders

- **Fast delivery:** Minutes to hours (vs. days for tasking)
- **Lower cost:** Significantly cheaper than tasking
- **Predictable results:** See exactly what you're getting
- **No weather dependency:** Image already captured

### Complete Workflow

#### Step 1: Search for Imagery

First, find available imagery using `search_satellite_archives`:

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "productTypes": ["DAY"],
  "resolutions": ["VERY HIGH"],
  "maxCloudCoverage": 10,
  "fromDate": "2024-06-01T00:00:00Z",
  "toDate": "2024-12-31T23:59:59Z"
}
```

**Results:** Returns list of available archives with IDs, pricing, and metadata.

#### Step 2: Get Archive Details

Review detailed information for promising archives:

```json
{
  "archiveId": "354b783d-8fad-4050-a167-2eb069653777"
}
```

**Check:**
- Full footprint covers your AOI
- Pricing matches budget
- Cloud coverage acceptable
- Capture date meets requirements
- Preview thumbnails look good

#### Step 3: Calculate Cost

From archive details:
- Price per km²: $8.50
- Your AOI size: 3.2 km²
- Estimated cost: 3.2 × $8.50 = **$27.20**
- Minimum order: 1 km² (✓ OK)
- Maximum order: 100 km² (✓ OK)

#### Step 4: Order Imagery

```json
{
  "archiveId": "354b783d-8fad-4050-a167-2eb069653777",
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "deliveryDriver": "S3",
  "deliveryParams": {
    "s3_bucket_id": "my-satellite-imagery",
    "aws_region": "us-east-1",
    "aws_access_key": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  },
  "label": "Austin downtown - June 2024",
  "metadata": {
    "project": "urban-monitoring",
    "quarter": "Q2-2024",
    "analyst": "john.doe"
  }
}
```

#### Step 5: Monitor Order Status

Use `list_orders` or `get_order_details` to check status:

```json
{
  "orderId": "abc12345-6789-0abc-def1-234567890abc"
}
```

**Order statuses:**
- PENDING: Order received, queued for processing
- PROCESSING: Imagery being prepared and delivered
- DELIVERED: Imagery available in your cloud storage
- FAILED: Delivery failed (check error details)

---

## Tasking Order Workflow

Tasking orders request NEW satellite captures. Use when archive imagery doesn't exist or isn't suitable.

### When to Use Tasking

- No suitable archive imagery exists
- Need very recent imagery
- Specific capture requirements (angle, time of day)
- Time-series with consistent parameters

### Complete Workflow

#### Step 1: Check Feasibility

**CRITICAL:** Always check feasibility before ordering. This provides:
- Feasibility score (probability of success)
- Weather forecast
- Capture opportunities
- **providerWindowId** (required for Planet orders)

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "productType": "Day",
  "resolution": "High",
  "windowStart": "2025-01-20T00:00:00Z",
  "windowEnd": "2025-01-27T23:59:59Z",
  "maxCloudCoverage": 15,
  "maxOffNadirAngle": 25
}
```

**Results:**
- Overall feasibility: 78% (GOOD)
- Weather score: 65% (some clouds expected)
- Provider opportunities with providerWindowId values

#### Step 2: Review Feasibility Results

Check the response for:

1. **Feasibility Score:**
   - 80-100%: Excellent - proceed with order
   - 60-79%: Good - reasonable success probability
   - 40-59%: Moderate - consider extending window
   - 0-39%: Low - extend window or adjust parameters

2. **Weather Forecast:**
   - Review cloud coverage by date
   - Identify best capture days

3. **Capture Opportunities:**
   - Note providerWindowId for each opportunity
   - Review capture window times
   - Check satellite IDs

#### Step 3: Get Pricing Estimate

```json
{
  "productType": "DAY",
  "resolution": "VERY HIGH",
  "aoiSqkm": 3.2
}
```

**Example result:**
- Price per km²: $45.00
- Estimated cost: 3.2 × $45.00 = **$144.00**

**Note:** Tasking is typically 3-5x more expensive than archive.

#### Step 4: Place Tasking Order

```json
{
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "windowStart": "2025-01-20T00:00:00Z",
  "windowEnd": "2025-01-27T23:59:59Z",
  "productType": "DAY",
  "resolution": "VERY HIGH",
  "maxCloudCoveragePercent": 15,
  "maxOffNadirAngle": 25,
  "providerWindowId": "abc123e4-5678-90ab-cdef-1234567890ab",
  "deliveryDriver": "S3",
  "deliveryParams": {
    "s3_bucket_id": "my-satellite-imagery",
    "aws_region": "us-east-1",
    "aws_access_key": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  },
  "label": "Austin tasking - January 2025",
  "webhookUrl": "https://myapp.com/skyfi-webhook",
  "metadata": {
    "project": "urban-monitoring",
    "order_type": "tasking",
    "priority": "normal"
  }
}
```

**Key parameters:**
- `providerWindowId`: From feasibility check (required for Planet)
- `windowStart/windowEnd`: 7-day window for better success
- `maxCloudCoveragePercent`: 15% is reasonable
- `webhookUrl`: Get real-time updates

#### Step 5: Monitor Tasking Progress

Tasking orders go through multiple stages:

1. **PENDING:** Order received, satellite scheduling in progress
2. **SCHEDULED:** Satellite pass scheduled during window
3. **CAPTURING:** Satellite attempting capture
4. **PROCESSING:** Imagery captured, being processed
5. **DELIVERED:** Imagery delivered to cloud storage

**Timeline:**
- Scheduling: 1-24 hours
- Capture window: Up to 7 days
- Processing: 24-48 hours after capture
- Total: Typically 3-10 days

---

## Delivery Configuration Examples

### AWS S3 (IAM User)

Standard S3 delivery with IAM user credentials.

```json
{
  "deliveryDriver": "S3",
  "deliveryParams": {
    "s3_bucket_id": "my-satellite-imagery",
    "aws_region": "us-east-1",
    "aws_access_key": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }
}
```

**Required IAM permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::my-satellite-imagery/*"
    }
  ]
}
```

**Best practices:**
- Create dedicated IAM user for SkyFi
- Use minimal permissions (PutObject only)
- Rotate access keys regularly
- Enable CloudTrail for audit logging

### Google Cloud Storage

GCS delivery with service account credentials.

```json
{
  "deliveryDriver": "GS",
  "deliveryParams": {
    "gs_project_id": "my-gcp-project",
    "gs_bucket_id": "my-satellite-imagery",
    "gs_credentials": {
      "type": "service_account",
      "project_id": "my-gcp-project",
      "private_key_id": "abc123def456",
      "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n",
      "client_email": "skyfi-delivery@my-gcp-project.iam.gserviceaccount.com",
      "client_id": "123456789012345678901",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/skyfi-delivery%40my-gcp-project.iam.gserviceaccount.com"
    }
  }
}
```

**Required GCS permissions:**
- Storage Object Creator role on bucket

**Creating service account:**
```bash
# Create service account
gcloud iam service-accounts create skyfi-delivery \
  --display-name="SkyFi Imagery Delivery"

# Grant bucket permissions
gcloud storage buckets add-iam-policy-binding gs://my-satellite-imagery \
  --member="serviceAccount:skyfi-delivery@my-gcp-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"

# Create and download key
gcloud iam service-accounts keys create skyfi-key.json \
  --iam-account=skyfi-delivery@my-gcp-project.iam.gserviceaccount.com
```

### Azure Blob Storage (Connection String)

Azure delivery using connection string authentication.

```json
{
  "deliveryDriver": "AZURE",
  "deliveryParams": {
    "azure_container_id": "satellite-imagery",
    "azure_connection_string": "DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=abc123def456...==;EndpointSuffix=core.windows.net"
  }
}
```

**Getting connection string:**
1. Azure Portal → Storage Account
2. Access Keys → Show keys
3. Copy connection string

**Security notes:**
- Connection string has full account access
- Consider using SAS tokens for limited access
- Rotate keys regularly

### Azure Blob Storage (Entra App / Service Principal)

More secure Azure delivery using Entra application.

```json
{
  "deliveryDriver": "AZURE",
  "deliveryParams": {
    "azure_storage_account_name": "mystorageaccount",
    "azure_container_id": "satellite-imagery",
    "azure_tenant_id": "12345678-1234-1234-1234-123456789012",
    "azure_client_id": "87654321-4321-4321-4321-210987654321",
    "azure_client_secret": "client-secret-value-here"
  }
}
```

**Creating Entra app:**
```bash
# Create app registration
az ad app create --display-name "SkyFi Delivery"

# Create service principal
az ad sp create --id <app-id>

# Assign Storage Blob Data Contributor role
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee <service-principal-id> \
  --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.Storage/storageAccounts/<storage-account>/blobServices/default/containers/satellite-imagery

# Create client secret
az ad app credential reset --id <app-id>
```

### Pre-configured Delivery

Use delivery configuration saved in your SkyFi account.

```json
{
  "deliveryDriver": "DELIVERY_CONFIG",
  "deliveryParams": {}
}
```

**Setting up:**
1. Log in to [app.skyfi.com](https://app.skyfi.com)
2. Go to Account Settings → Delivery Configuration
3. Add and verify cloud storage credentials
4. Use `DELIVERY_CONFIG` in orders

**Benefits:**
- Credentials stored securely by SkyFi
- Easy to update without code changes
- Reusable across multiple orders

### No Automatic Delivery

Order without automatic cloud delivery (download from SkyFi platform).

```json
{
  "deliveryDriver": "NONE",
  "deliveryParams": {}
}
```

**When to use:**
- Testing orders
- One-time downloads
- Not ready to set up cloud storage
- Prefer manual download

**Note:** Must download from SkyFi dashboard after delivery.

---

## Order with Webhooks

Webhooks provide real-time order status updates instead of polling.

### Setting Up Webhooks

#### Basic Webhook Order

```json
{
  "archiveId": "354b783d-8fad-4050-a167-2eb069653777",
  "aoi": "POLYGON((-97.7450 30.2672, -97.7450 30.2750, -97.7350 30.2750, -97.7350 30.2672, -97.7450 30.2672))",
  "deliveryDriver": "S3",
  "deliveryParams": {
    "s3_bucket_id": "my-satellite-imagery",
    "aws_region": "us-east-1",
    "aws_access_key": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  },
  "webhookUrl": "https://myapp.com/webhooks/skyfi"
}
```

### Webhook Payload

Your endpoint will receive POST requests with this payload:

```json
{
  "orderId": "abc12345-6789-0abc-def1-234567890abc",
  "status": "DELIVERED",
  "timestamp": "2024-01-15T14:30:00Z",
  "orderType": "ARCHIVE",
  "deliveryLocation": {
    "driver": "S3",
    "bucket": "my-satellite-imagery",
    "path": "/orders/abc12345/imagery.tif"
  },
  "downloadUrls": [
    "https://s3.amazonaws.com/my-satellite-imagery/orders/abc12345/imagery.tif"
  ],
  "metadata": {
    "label": "Austin downtown - June 2024",
    "project": "urban-monitoring"
  }
}
```

### Webhook Implementation Example

**Node.js/Express:**
```javascript
app.post('/webhooks/skyfi', async (req, res) => {
  const { orderId, status, downloadUrls, metadata } = req.body;

  // Acknowledge receipt immediately
  res.status(200).send('OK');

  // Process asynchronously
  try {
    console.log(`Order ${orderId} status: ${status}`);

    if (status === 'DELIVERED') {
      // Order complete - process imagery
      await processImagery(orderId, downloadUrls, metadata);

      // Send notification
      await sendNotification(`Order ${orderId} delivered`);

    } else if (status === 'FAILED') {
      // Order failed - log and alert
      console.error(`Order ${orderId} failed`);
      await sendAlert(`Order ${orderId} delivery failed`);
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
  }
});
```

**Python/Flask:**
```python
@app.route('/webhooks/skyfi', methods=['POST'])
def skyfi_webhook():
    data = request.json
    order_id = data['orderId']
    status = data['status']

    # Acknowledge immediately
    response = make_response('OK', 200)

    # Process in background
    if status == 'DELIVERED':
        # Queue processing task
        process_imagery.delay(
            order_id=order_id,
            download_urls=data['downloadUrls'],
            metadata=data['metadata']
        )

    return response
```

### Webhook Security

**1. Verify HTTPS:**
```python
if request.scheme != 'https':
    abort(400, 'HTTPS required')
```

**2. Validate payload:**
```python
required_fields = ['orderId', 'status', 'timestamp']
if not all(field in request.json for field in required_fields):
    abort(400, 'Missing required fields')
```

**3. Verify order ownership:**
```python
order = get_order(order_id)
if not order or order.user_id != current_user.id:
    abort(403, 'Unauthorized')
```

**4. Implement idempotency:**
```python
# Check if already processed
if webhook_already_processed(order_id, timestamp):
    return 'OK', 200

# Process and mark as handled
process_webhook(data)
mark_webhook_processed(order_id, timestamp)
```

### Testing Webhooks

**Use webhook.site for testing:**
1. Go to [webhook.site](https://webhook.site)
2. Copy unique URL
3. Use in order:
```json
{
  "webhookUrl": "https://webhook.site/abc-def-123"
}
```
4. View received payloads in browser

**Local testing with ngrok:**
```bash
# Start your local server
python app.py  # Running on localhost:5000

# Expose with ngrok
ngrok http 5000

# Use ngrok URL in orders
# https://abc123.ngrok.io/webhooks/skyfi
```

---

## Complete End-to-End Example

Real-world example: Agricultural monitoring project.

### Project Requirements

- **Objective:** Monitor 50 km² farmland in Iowa
- **Frequency:** Monthly during growing season (Apr-Oct)
- **Type:** Multispectral for NDVI analysis
- **Quality:** <15% cloud coverage
- **Budget:** $500/month

### Month 1: Archive Search & Order

#### Step 1: Search Archive
```json
{
  "aoi": "POLYGON((-93.6250 41.5868, -93.6250 41.6168, -93.5850 41.6168, -93.5850 41.5868, -93.6250 41.5868))",
  "productTypes": ["MULTISPECTRAL"],
  "fromDate": "2024-04-01T00:00:00Z",
  "toDate": "2024-04-30T23:59:59Z",
  "resolutions": ["MEDIUM", "HIGH"],
  "maxCloudCoverage": 15,
  "providers": ["PLANET"]
}
```

**Results:** Found 3 suitable images from April 15-28.

#### Step 2: Get Details & Compare
```json
// Check each archive
{"archiveId": "archive-1-id"}
{"archiveId": "archive-2-id"}
{"archiveId": "archive-3-id"}
```

**Comparison:**
- Archive 1: Apr 15, 8% clouds, $12/km², 4-band
- Archive 2: Apr 22, 5% clouds, $14/km², 4-band ← **Best choice**
- Archive 3: Apr 28, 12% clouds, $11/km², 4-band

#### Step 3: Calculate Cost
- Selected: Archive 2
- Price: $14/km²
- Area: 50 km²
- **Total: $700** (over budget)

**Optimization:** Reduce to HIGH resolution only
- New price: $9/km²
- **Total: $450** ✓ Within budget

#### Step 4: Order
```json
{
  "archiveId": "archive-2-id",
  "aoi": "POLYGON((-93.6250 41.5868, -93.6250 41.6168, -93.5850 41.6168, -93.5850 41.5868, -93.6250 41.5868))",
  "deliveryDriver": "S3",
  "deliveryParams": {
    "s3_bucket_id": "iowa-farm-imagery",
    "aws_region": "us-east-1",
    "aws_access_key": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  },
  "label": "Iowa farm - April 2024 - NDVI",
  "webhookUrl": "https://myapp.com/webhooks/skyfi",
  "metadata": {
    "project": "iowa-farm-monitoring",
    "month": "2024-04",
    "field_id": "farm-001",
    "analysis_type": "ndvi"
  }
}
```

**Result:** Order placed, delivered in 2 hours.

### Month 2: No Archive Available - Tasking Order

#### Step 1: Check Archive (May)
```json
{
  "aoi": "POLYGON((-93.6250 41.5868, -93.6250 41.6168, -93.5850 41.6168, -93.5850 41.5868, -93.6250 41.5868))",
  "productTypes": ["MULTISPECTRAL"],
  "fromDate": "2024-05-01T00:00:00Z",
  "toDate": "2024-05-31T23:59:59Z",
  "maxCloudCoverage": 15
}
```

**Results:** No suitable imagery found. Must use tasking.

#### Step 2: Check Feasibility
```json
{
  "aoi": "POLYGON((-93.6250 41.5868, -93.6250 41.6168, -93.5850 41.6168, -93.5850 41.5868, -93.6250 41.5868))",
  "productType": "Day",
  "resolution": "High",
  "windowStart": "2024-05-10T00:00:00Z",
  "windowEnd": "2024-05-20T23:59:59Z",
  "maxCloudCoverage": 15,
  "providers": ["PLANET"]
}
```

**Results:**
- Feasibility: 72% (GOOD)
- Weather: 60% chance of clear conditions
- 5 capture opportunities
- providerWindowId: "window-abc-123"

#### Step 3: Get Pricing
```json
{
  "productType": "MULTISPECTRAL",
  "resolution": "HIGH",
  "aoiSqkm": 50
}
```

**Estimate:** $18/km² × 50 km² = **$900** (over budget)

**Decision:** Accept overage for this month, plan better for June.

#### Step 4: Place Tasking Order
```json
{
  "aoi": "POLYGON((-93.6250 41.5868, -93.6250 41.6168, -93.5850 41.6168, -93.5850 41.5868, -93.6250 41.5868))",
  "windowStart": "2024-05-10T00:00:00Z",
  "windowEnd": "2024-05-20T23:59:59Z",
  "productType": "DAY",
  "resolution": "HIGH",
  "maxCloudCoveragePercent": 15,
  "providerWindowId": "window-abc-123",
  "deliveryDriver": "S3",
  "deliveryParams": {
    "s3_bucket_id": "iowa-farm-imagery",
    "aws_region": "us-east-1",
    "aws_access_key": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  },
  "label": "Iowa farm - May 2024 - NDVI (tasking)",
  "webhookUrl": "https://myapp.com/webhooks/skyfi",
  "metadata": {
    "project": "iowa-farm-monitoring",
    "month": "2024-05",
    "field_id": "farm-001",
    "analysis_type": "ndvi",
    "order_type": "tasking"
  }
}
```

**Timeline:**
- Order placed: May 5
- Capture scheduled: May 12-14
- Captured: May 13 (clear conditions)
- Delivered: May 15

### Months 3-7: Repeat Process

Continue monthly pattern:
- Search archive first (cheaper)
- Use tasking when needed (more expensive)
- Build time-series dataset
- Track NDVI changes

### Analysis Workflow

After each delivery:
1. Download from S3
2. Calculate NDVI from multispectral bands
3. Compare to previous months
4. Identify problem areas (disease, water stress)
5. Generate field reports

---

## Cost Estimation

### Before Ordering: Calculate Costs

Always estimate costs before ordering.

#### Archive Order Cost Calculation

```
Total Cost = Price per km² × AOI Size (km²)
```

**Example:**
```
Price: $8.50/km²
AOI: 25 km²
Total: $8.50 × 25 = $212.50
```

**Check constraints:**
- Minimum order: Must order at least min km²
- Maximum order: Cannot exceed max km²
- Full scene option: Sometimes cheaper for large areas

#### Tasking Order Cost Calculation

```
Total Cost = Price per km² × AOI Size (km²)
Note: Tasking prices typically 3-5x higher than archive
```

**Example:**
```
Price: $45/km²
AOI: 10 km²
Total: $45 × 10 = $450
```

#### Using get_pricing_info

Get accurate pricing before ordering:

```json
{
  "productType": "DAY",
  "resolution": "VERY HIGH",
  "provider": "PLANET",
  "aoiSqkm": 25.5
}
```

**Response includes:**
- Price per km² for matching options
- Cost estimate for your AOI size
- Minimum/maximum order sizes
- Delivery time estimates

### Cost Optimization Strategies

#### 1. Archive vs. Tasking

**Always check archive first:**
```
Archive: $8/km² × 50 km² = $400
Tasking: $45/km² × 50 km² = $2,250
Savings: $1,850 (82%)
```

#### 2. Resolution Trade-offs

```
ULTRA HIGH: $85/km² × 10 km² = $850
VERY HIGH:  $45/km² × 10 km² = $450
HIGH:       $18/km² × 10 km² = $180
MEDIUM:     $8/km²  × 10 km² = $80
```

Choose lowest resolution that meets requirements.

#### 3. Cloud Coverage Tolerance

```
<5% clouds:  Limited results, higher prices
<20% clouds: Good balance
<40% clouds: Maximum results, best prices
```

Higher tolerance = more options = lower prices.

#### 4. Provider Comparison

Different providers, different prices:
```
Provider A: $12/km²
Provider B: $15/km²
Provider C: $9/km²  ← Best price
```

Always compare pricing across providers.

#### 5. Open Data

```
Open Data (Sentinel-2): $0/km²
Commercial: $15/km²
Savings: 100%
```

Check open data options first.

#### 6. Full Scene vs. Custom AOI

For large areas, full scene may be cheaper:
```
Custom 80 km²: $15/km² × 80 = $1,200
Full scene 100 km²: $1,000 (flat price)
Savings: $200 + get extra 20 km²
```

---

## Order Management

### Listing Orders

View all your orders with filters:

```json
{
  "orderType": "ARCHIVE",
  "status": "DELIVERED",
  "fromDate": "2024-01-01T00:00:00Z",
  "toDate": "2024-12-31T23:59:59Z",
  "pageNumber": 0,
  "pageSize": 20
}
```

**Common filters:**
- Recent orders: Last 30 days
- Failed orders: status = "FAILED"
- Tasking orders: orderType = "TASKING"
- Specific project: Filter by metadata (client-side)

### Getting Order Details

```json
{
  "orderId": "abc12345-6789-0abc-def1-234567890abc"
}
```

**Details include:**
- Current status
- Order timeline
- Delivery information
- Download URLs (if delivered)
- Error messages (if failed)
- Next steps based on status

### Handling Failed Deliveries

If delivery fails:

#### 1. Check error details
```json
{
  "orderId": "failed-order-id"
}
```

Review error message for cause.

#### 2. Common failure causes

**Access Denied:**
- Fix: Verify cloud storage credentials
- Fix: Check IAM/permissions
- Fix: Ensure bucket exists

**Bucket Not Found:**
- Fix: Verify bucket name spelling
- Fix: Check bucket region
- Fix: Create missing bucket

**Invalid Credentials:**
- Fix: Regenerate access keys
- Fix: Update credentials
- Fix: Check expiration

#### 3. Trigger redelivery

After fixing issue:

```json
{
  "orderId": "failed-order-id"
}
```

Uses original delivery config (fixed on cloud side).

**Or update delivery config:**

```json
{
  "orderId": "failed-order-id",
  "deliveryDriver": "S3",
  "deliveryParams": {
    "s3_bucket_id": "my-new-bucket",
    "aws_region": "us-west-2",
    "aws_access_key": "NEWAKIAIOSFODNN7EXAMPLE",
    "aws_secret_key": "NEWwJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }
}
```

---

## Best Practices Summary

### Before Ordering

1. ✅ Search archive first (cheaper, faster)
2. ✅ Get archive details and verify coverage
3. ✅ Calculate cost estimate
4. ✅ Test delivery configuration
5. ✅ Review budget and approve spend

### Archive Orders

1. ✅ Always get details before ordering
2. ✅ Check preview thumbnails
3. ✅ Verify footprint covers AOI
4. ✅ Compare pricing across providers
5. ✅ Check open data option first

### Tasking Orders

1. ✅ **Always check feasibility first**
2. ✅ Use providerWindowId (required for Planet)
3. ✅ Allow 7-14 day windows
4. ✅ Set realistic parameters (cloud %, angle)
5. ✅ Use webhooks for status updates
6. ✅ Understand weather dependency
7. ✅ Budget for higher costs (3-5x archive)

### Delivery Configuration

1. ✅ Test with small order first
2. ✅ Use minimal permissions
3. ✅ Secure credentials properly
4. ✅ Set up webhooks
5. ✅ Monitor delivery logs
6. ✅ Have fallback plan for failures

### Cost Management

1. ✅ Get pricing info before ordering
2. ✅ Start with open data when possible
3. ✅ Choose appropriate resolution
4. ✅ Use metadata to track spending
5. ✅ Set project budgets
6. ✅ Review costs regularly

---

**Related Documentation:**
- [MCP Tools Reference](../mcp-tools-reference.md) - Complete tool documentation
- [Search Archives Examples](search-archives.md) - Finding imagery
- [Feasibility Examples](feasibility.md) - Tasking feasibility checks
- [Monitoring Examples](monitoring.md) - Automated imagery alerts
