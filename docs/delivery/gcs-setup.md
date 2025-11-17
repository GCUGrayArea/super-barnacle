# Google Cloud Storage Delivery Configuration Guide

## Overview

This guide provides step-by-step instructions for configuring Google Cloud Storage (GCS) as your delivery destination for SkyFi satellite imagery. GCS offers scalable, secure, and cost-effective storage with global availability.

## Prerequisites

Before setting up GCS delivery, ensure you have:

- An active Google Cloud Platform (GCP) account
- A GCP project with billing enabled
- Appropriate permissions to create buckets and service accounts
- `gcloud` CLI installed (optional, for verification)

## Step 1: Create a GCP Project (If Needed)

If you don't already have a GCP project:

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click **"New Project"**
4. Enter project name (e.g., `satellite-imagery-storage`)
5. Select billing account
6. Click **"Create"**

### Enable Billing

⚠️ **Important:** GCS requires an active billing account.

1. Navigate to **"Billing"** in the left menu
2. Link a billing account to your project
3. Verify billing is enabled

## Step 2: Create a GCS Bucket

### 2.1 Navigate to Cloud Storage

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **"Cloud Storage"** → **"Buckets"**
4. Click **"Create Bucket"**

### 2.2 Configure Bucket Settings

**Step 1: Name your bucket**

- Choose a globally unique name (e.g., `my-satellite-imagery-2024`)
- Naming rules:
  - Lowercase letters, numbers, hyphens, and underscores only
  - Must start and end with letter or number
  - 3-63 characters in length
  - Cannot contain "google" or close misspellings
  - Must be globally unique across all GCS

**Step 2: Choose where to store your data**

**Location Type:**
- **Region** (Recommended for most use cases)
  - Lowest latency for specific region
  - Lower cost than multi-region
  - Examples: `us-east1`, `us-central1`, `europe-west1`

- **Dual-region** (High availability)
  - Data replicated across two regions
  - Higher availability SLA
  - Moderate cost increase

- **Multi-region** (Highest availability)
  - Data replicated across multiple regions
  - Highest availability and redundancy
  - Higher cost
  - Examples: `US`, `EU`, `ASIA`

**Recommendation:** Choose `us-east1` or `us-central1` for cost-effectiveness and good performance.

**Step 3: Choose a storage class**

- **Standard** (Recommended)
  - Best for frequently accessed data
  - No retrieval cost
  - Ideal for active satellite imagery

- **Nearline** (30-day minimum)
  - Lower storage cost
  - Retrieval fees apply
  - Good for archival after processing

- **Coldline** (90-day minimum)
  - Even lower storage cost
  - Higher retrieval fees
  - For long-term archival

- **Archive** (365-day minimum)
  - Lowest storage cost
  - Highest retrieval fees
  - For compliance/legal archival

**Recommendation:** Use **Standard** for active imagery delivery.

**Step 4: Access control**

- **Uniform** (Recommended)
  - Uses IAM only
  - Simpler permission management
  - Consistent across all objects

- **Fine-grained**
  - Uses ACLs per object
  - More complex
  - Legacy option

**Recommendation:** Choose **Uniform** access control.

**Step 5: Protection tools**

- **Object versioning:** ✅ Enable (protects against accidental deletion)
- **Retention policy:** Optional (for compliance requirements)
- **Encryption:** Google-managed keys (default, no action needed)

### 2.3 Create the Bucket

Click **"Create"** to finalize bucket creation.

## Step 3: Create a Service Account

### 3.1 Navigate to IAM & Admin

1. In Google Cloud Console, navigate to **"IAM & Admin"** → **"Service Accounts"**
2. Ensure you're in the correct project
3. Click **"Create Service Account"**

### 3.2 Configure Service Account

**Step 1: Service account details**

- **Service account name:** `skyfi-delivery` (or your preferred name)
- **Service account ID:** `skyfi-delivery` (auto-generated from name)
- **Description:** "Service account for SkyFi satellite imagery delivery"
- Click **"Create and Continue"**

**Step 2: Grant permissions**

- Click **"Select a role"**
- Search for "Storage Object Admin"
- Select **"Storage Object Admin"**
- Click **"Continue"**

**Alternative: Least Privilege Custom Role**

For enhanced security, create a custom role with only required permissions:

1. Navigate to **"IAM & Admin"** → **"Roles"**
2. Click **"Create Role"**
3. Name: `SkyFi Delivery Role`
4. Add permissions:
   - `storage.objects.create`
   - `storage.objects.delete`
   - `storage.objects.get`
   - `storage.objects.list`
5. Click **"Create"**
6. Assign this custom role to the service account

**Step 3: Grant access (optional)**

- Skip this step unless you need to grant users access to this service account
- Click **"Done"**

### 3.3 Generate JSON Key File

1. Click on the newly created service account
2. Navigate to the **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Select **"JSON"** as the key type
5. Click **"Create"**

⚠️ **CRITICAL:** The JSON key file will be automatically downloaded. Store it securely immediately.

**Example JSON structure:**
```json
{
  "type": "service_account",
  "project_id": "satellite-imagery-storage",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "skyfi-delivery@satellite-imagery-storage.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### 3.4 Set Bucket-Level Permissions

1. Navigate back to **"Cloud Storage"** → **"Buckets"**
2. Click on your bucket name
3. Go to the **"Permissions"** tab
4. Click **"Grant Access"**
5. In "New principals," enter your service account email:
   - Format: `skyfi-delivery@satellite-imagery-storage.iam.gserviceaccount.com`
6. Select role: **"Storage Object Admin"**
7. Click **"Save"**

## Step 4: Configure SkyFi Delivery

When placing an order through SkyFi's MCP tools, use the following delivery configuration:

```json
{
  "delivery_driver": "GS",
  "delivery_params": {
    "bucket": "my-satellite-imagery-2024",
    "service_account": "{\"type\":\"service_account\",\"project_id\":\"satellite-imagery-storage\",\"private_key_id\":\"abc123...\",\"private_key\":\"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n\",\"client_email\":\"skyfi-delivery@satellite-imagery-storage.iam.gserviceaccount.com\",\"client_id\":\"123456789...\",\"auth_uri\":\"https://accounts.google.com/o/oauth2/auth\",\"token_uri\":\"https://oauth2.googleapis.com/token\",\"auth_provider_x509_cert_url\":\"https://www.googleapis.com/oauth2/v1/certs\",\"client_x509_cert_url\":\"https://www.googleapis.com/robot/v1/metadata/x509/...\"}"
  }
}
```

### Configuration Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `delivery_driver` | Yes | Must be `"GS"` | `"GS"` |
| `bucket` | Yes | Your GCS bucket name | `"my-satellite-imagery-2024"` |
| `service_account` | Yes | Entire JSON key file as string | `"{...}"` |

### Important Notes on Service Account JSON

1. **The entire JSON key file must be provided as a single string**
2. **Escape internal quotes** with backslashes: `\"` instead of `"`
3. **Preserve newlines** in the private key using `\n`
4. **Do not add extra whitespace** or formatting

**Example of proper escaping:**
```json
{
  "delivery_driver": "GS",
  "delivery_params": {
    "bucket": "my-bucket",
    "service_account": "{\"type\":\"service_account\",\"project_id\":\"my-project\",...}"
  }
}
```

### Alternative: Using Environment Variables

Store the JSON key file separately and reference it:

```bash
# Save JSON key to file
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Reference in your application
```

## Step 5: Verify Delivery Setup

### 5.1 Using gcloud CLI

If you have `gcloud` CLI installed:

```bash
# Authenticate with service account
gcloud auth activate-service-account \
  --key-file=/path/to/service-account-key.json

# Set project
gcloud config set project satellite-imagery-storage

# List bucket contents
gsutil ls gs://my-satellite-imagery-2024/

# Test upload
echo "test" > test.txt
gsutil cp test.txt gs://my-satellite-imagery-2024/test.txt

# Verify upload
gsutil ls gs://my-satellite-imagery-2024/
```

### 5.2 Manual Verification

1. Navigate to Cloud Storage Console
2. Open your bucket
3. Check for delivered files after order completion
4. Verify file metadata and permissions

## Security Best Practices

### Service Account Key Management

1. **Treat JSON Keys Like Passwords**
   - Never commit to version control
   - Never share via email or messaging
   - Store in secure password manager or secrets management system

2. **Key Rotation**
   - Rotate service account keys every 90 days
   - Delete old keys after rotation
   - Steps:
     1. Create new key for service account
     2. Update application configuration
     3. Test new key thoroughly
     4. Delete old key

3. **Principle of Least Privilege**
   - Grant only necessary permissions
   - Use custom roles when possible
   - Avoid project-wide "Owner" or "Editor" roles

4. **Monitor Key Usage**
   - Enable Cloud Audit Logs
   - Review service account activity regularly
   - Set up alerts for unusual access patterns

### Bucket Security

1. **Enable Uniform Access Control**
   - Simpler permission management
   - Prevents object-level ACL confusion
   - Recommended for all new buckets

2. **Encryption at Rest**
   - Default: Google-managed encryption keys
   - Enhanced: Customer-managed encryption keys (CMEK)
   - Maximum: Customer-supplied encryption keys (CSEK)

   For most use cases, default encryption is sufficient.

3. **Enable Object Versioning**
   - Protects against accidental deletions
   - Allows recovery of previous versions
   - Minimal additional cost

4. **Configure Object Lifecycle Management**
   ```json
   {
     "lifecycle": {
       "rule": [
         {
           "action": {
             "type": "SetStorageClass",
             "storageClass": "NEARLINE"
           },
           "condition": {
             "age": 90
           }
         },
         {
           "action": {
             "type": "Delete"
           },
           "condition": {
             "age": 365,
             "isLive": true
           }
         }
       ]
     }
   }
   ```

5. **Enable Audit Logging**
   - Navigate to **"IAM & Admin"** → **"Audit Logs"**
   - Enable "Data Read" and "Data Write" for Cloud Storage
   - Review logs regularly for unauthorized access

6. **Configure Bucket Policies**
   - Require HTTPS for all connections
   - Restrict by IP range if applicable
   - Set up VPC Service Controls for additional isolation

### Environment Variables (Recommended)

```bash
# Store service account JSON path
export GOOGLE_APPLICATION_CREDENTIALS=/secure/path/to/key.json

# Or store as environment variable (less common)
export GCS_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

Add to `.gitignore`:
```
service-account-key.json
gcs-credentials.json
.env
credentials/
```

## Troubleshooting

### Error: "Authentication Failed"

**Symptom:** 401 Unauthorized or authentication error

**Possible Causes:**
1. Invalid or malformed service account JSON
2. Service account key has been deleted or revoked
3. JSON escaping issues in configuration

**Solutions:**
- Regenerate service account key
- Verify JSON is properly escaped (use online JSON validator)
- Check that service account still exists and is enabled
- Ensure no extra whitespace or line breaks in JSON string

### Error: "Permission Denied" (403 Forbidden)

**Symptom:** Access denied when uploading to bucket

**Possible Causes:**
1. Service account lacks necessary permissions
2. Bucket-level permissions not configured
3. Organization policies blocking access

**Solutions:**
- Verify service account has "Storage Object Admin" role
- Check bucket permissions tab for service account
- Review organization policies (if applicable)
- Ensure bucket and service account are in same project (or permissions are properly configured)

### Error: "Bucket Not Found" (404)

**Symptom:** Bucket does not exist error

**Possible Causes:**
1. Bucket name is incorrect
2. Service account doesn't have `storage.buckets.get` permission
3. Bucket is in different project

**Solutions:**
- Verify exact bucket name (case-sensitive)
- Check bucket exists in Cloud Storage console
- Ensure service account has access to the correct project
- Grant "Storage Object Viewer" or higher role

### Error: "Quota Exceeded"

**Symptom:** Quota or rate limit error

**Possible Causes:**
1. Exceeded free tier limits
2. Request rate too high
3. Storage quota reached

**Solutions:**
- Check billing account is active
- Review quotas in **"IAM & Admin"** → **"Quotas"**
- Request quota increase if needed
- Implement exponential backoff for retries

### Error: "Invalid Service Account JSON"

**Symptom:** Parsing error or invalid format

**Possible Causes:**
1. JSON not properly escaped
2. Newlines in private key not preserved
3. Extra characters or formatting

**Solutions:**
- Use a JSON validator to check format
- Ensure `\n` characters in private_key field
- Escape all double quotes: `\"` instead of `"`
- Test with online JSON escape tool
- Read JSON from file instead of inline string

### Slow Upload Performance

**Symptom:** Uploads taking longer than expected

**Possible Causes:**
1. Bucket location far from upload source
2. Network connectivity issues
3. Large file size without parallel uploads

**Solutions:**
- Choose bucket location closer to `us-east1` or `us-central1`
- Enable parallel composite uploads (automatically handled by most clients)
- Check network connectivity and bandwidth
- Use Cloud CDN for download acceleration (if applicable)

## Cost Optimization

### Storage Costs (as of 2024)

**Standard Storage (us-east1):**
- $0.020 per GB/month
- Typical order: 1-10 GB
- Monthly cost for 100 GB: ~$2.00

**Multi-region Storage (US):**
- $0.026 per GB/month
- Higher availability, higher cost

### Optimization Strategies

1. **Choose Regional Storage**
   - 23% cheaper than multi-region
   - Sufficient for most use cases
   - Use multi-region only if high availability required

2. **Implement Lifecycle Policies**
   ```bash
   # Example: Move to Nearline after 30 days, delete after 1 year
   gsutil lifecycle set lifecycle.json gs://my-satellite-imagery-2024/
   ```

   **lifecycle.json:**
   ```json
   {
     "lifecycle": {
       "rule": [
         {
           "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
           "condition": {"age": 30}
         },
         {
           "action": {"type": "Delete"},
           "condition": {"age": 365}
         }
       ]
     }
   }
   ```

3. **Delete Unneeded Versions**
   - If versioning enabled, old versions accumulate
   - Set lifecycle policy to delete non-current versions
   - Example: Delete versions older than 30 days

4. **Use Autoclass (Recommended)**
   - Automatically moves objects to optimal storage class
   - Based on access patterns
   - Reduces manual management

   ```bash
   gsutil autoclass set on gs://my-satellite-imagery-2024/
   ```

5. **Monitor Costs**
   - Enable billing exports to BigQuery
   - Set up budget alerts in Cloud Console
   - Review Cloud Storage usage reports monthly

### Request Costs

- Class A operations (uploads): $0.05 per 10,000 operations
- Class B operations (downloads): $0.004 per 10,000 operations
- Typical impact: < $0.01 per order

### Free Tier

GCP offers free tier benefits:
- 5 GB of regional storage per month
- Not applicable to multi-region storage
- Useful for testing and small deployments

## Additional Resources

- [Google Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [GCS Security Best Practices](https://cloud.google.com/storage/docs/best-practices)
- [Cloud Storage Pricing](https://cloud.google.com/storage/pricing)
- [gsutil Tool Documentation](https://cloud.google.com/storage/docs/gsutil)

## Support

If you encounter issues with GCS delivery:

1. Verify all configuration parameters
2. Check service account permissions
3. Review Cloud Audit Logs for access attempts
4. Test with `gsutil` CLI for debugging
5. Contact SkyFi support with error details and order ID

---

**Next Steps:**
- [Configure AWS S3 Storage ←](./s3-setup.md)
- [Configure Azure Blob Storage →](./azure-setup.md)
- [Learn about AOI Polygons →](./aoi-polygons.md)
