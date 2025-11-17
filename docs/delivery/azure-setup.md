# Azure Blob Storage Delivery Configuration Guide

## Overview

This guide provides comprehensive instructions for configuring Azure Blob Storage as your delivery destination for SkyFi satellite imagery. Azure Blob Storage offers enterprise-grade security, scalability, and global availability with multiple authentication methods.

## Prerequisites

Before setting up Azure Blob Storage delivery, ensure you have:

- An active Microsoft Azure subscription
- Appropriate permissions to create storage accounts and containers
- Azure CLI installed (optional, for verification)
- Access to Azure Portal

## Step 1: Create an Azure Storage Account

### 1.1 Navigate to Storage Accounts

1. Log in to [Azure Portal](https://portal.azure.com/)
2. Click **"Create a resource"** or search for "Storage accounts"
3. Click **"Storage accounts"**
4. Click **"+ Create"**

### 1.2 Configure Basic Settings

**Project Details:**

- **Subscription:** Select your Azure subscription
- **Resource Group:**
  - Select existing or create new
  - Example: `satellite-imagery-rg`
  - Resource groups help organize related Azure resources

**Instance Details:**

- **Storage account name:**
  - Must be globally unique across all Azure
  - 3-24 characters
  - Lowercase letters and numbers only
  - Example: `skyfiimagestore2024`

- **Region:**
  - Select region closest to your location
  - Examples: `East US`, `West US 2`, `West Europe`
  - Affects latency and pricing

- **Performance:**
  - **Standard** (Recommended)
    - Cost-effective for most workloads
    - HDD-backed storage
    - Good for satellite imagery

  - **Premium**
    - SSD-backed storage
    - Higher cost
    - Only needed for high-IOPS workloads

- **Redundancy:**
  - **LRS (Locally Redundant Storage)** - Most cost-effective
    - 3 copies in single datacenter
    - Protects against hardware failures
    - Lowest cost

  - **ZRS (Zone-Redundant Storage)** - Recommended for production
    - 3 copies across availability zones
    - Protects against datacenter failures
    - Moderate cost

  - **GRS (Geo-Redundant Storage)** - High availability
    - 6 copies across two regions
    - Protects against regional outages
    - Higher cost

  - **GZRS (Geo-Zone-Redundant Storage)** - Maximum availability
    - Highest redundancy and availability
    - Highest cost

**Recommendation:** Use **Standard** performance with **ZRS** or **LRS** redundancy.

### 1.3 Advanced Settings

**Security:**

- **Require secure transfer:** ✅ Enable (HTTPS only)
- **Allow Blob public access:** ❌ Disable (keep imagery private)
- **Enable storage account key access:** ✅ Enable (for connection string method)
- **Minimum TLS version:** TLS 1.2 (recommended)

**Data Lake Storage Gen2:**
- Leave disabled unless you need hierarchical namespace

**Blob Storage:**
- **Access tier:** Hot (for frequently accessed imagery)

**Azure Files:**
- Not needed for blob delivery

### 1.4 Networking

- **Network connectivity:** Public endpoint (all networks)
  - Or restrict to specific VNets if required
- **Network routing:** Microsoft network routing (recommended)

### 1.5 Data Protection

- **Recovery:**
  - ✅ Enable soft delete for blobs (7-14 day retention)
  - ✅ Enable soft delete for containers
  - ✅ Enable versioning (protects against overwrites)

- **Tracking:**
  - ✅ Enable blob change feed (optional, for auditing)

### 1.6 Encryption

- **Encryption type:** Microsoft-managed keys (recommended)
  - Or use customer-managed keys for enhanced control
- **Enable infrastructure encryption:** Optional (double encryption)

### 1.7 Review and Create

1. Review all settings
2. Click **"Create"**
3. Wait for deployment to complete (1-2 minutes)
4. Click **"Go to resource"**

## Step 2: Create a Blob Container

### 2.1 Navigate to Containers

1. In your storage account, click **"Containers"** in the left menu
2. Click **"+ Container"**

### 2.2 Configure Container

- **Name:** `satellite-imagery` (lowercase, hyphens allowed)
- **Public access level:** **Private (no anonymous access)**
  - ⚠️ Never use Blob or Container level public access for sensitive imagery

Click **"Create"**

## Step 3: Choose Authentication Method

Azure Blob Storage supports two authentication methods for SkyFi delivery:

1. **Connection String** (Simpler, recommended for getting started)
2. **Microsoft Entra App** (More secure, recommended for production)

---

## Method 1: Connection String Authentication

### 3.1 Retrieve Connection String

1. In your storage account, navigate to **"Access keys"** in the left menu
2. Click **"Show keys"** at the top
3. Under **key1** or **key2**, click **"Show"** next to connection string
4. Click the copy icon to copy the full connection string

**Example connection string:**
```
DefaultEndpointsProtocol=https;AccountName=skyfiimagestore2024;AccountKey=abcd1234...==;EndpointSuffix=core.windows.net
```

⚠️ **Security Warning:** Connection strings contain sensitive credentials. Never commit to version control.

### 3.2 Configure SkyFi Delivery

```json
{
  "delivery_driver": "AZURE",
  "delivery_params": {
    "container": "satellite-imagery",
    "connection_string": "DefaultEndpointsProtocol=https;AccountName=skyfiimagestore2024;AccountKey=abcd1234...==;EndpointSuffix=core.windows.net"
  }
}
```

### Configuration Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `delivery_driver` | Yes | Must be `"AZURE"` | `"AZURE"` |
| `container` | Yes | Blob container name | `"satellite-imagery"` |
| `connection_string` | Yes | Full Azure connection string | `"DefaultEndpoints..."` |

### 3.3 Connection String Best Practices

1. **Use Environment Variables**
   ```bash
   export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;..."
   ```

2. **Rotate Access Keys Regularly**
   - Azure provides two keys (key1 and key2)
   - Rotation process:
     1. Regenerate key2
     2. Update applications to use key2
     3. Test thoroughly
     4. Regenerate key1
   - Recommended rotation: Every 90 days

3. **Monitor Key Usage**
   - Enable storage analytics
   - Review access logs
   - Set up alerts for unusual activity

---

## Method 2: Microsoft Entra App Authentication (Recommended for Production)

Microsoft Entra ID (formerly Azure AD) provides more granular access control and better security.

### 3.1 Create an Entra App Registration

1. Navigate to **"Microsoft Entra ID"** in Azure Portal
2. Click **"App registrations"** in the left menu
3. Click **"+ New registration"**

**Configure Registration:**

- **Name:** `SkyFi Delivery App`
- **Supported account types:** Single tenant (recommended)
- **Redirect URI:** Leave empty
- Click **"Register"**

### 3.2 Note Application Details

After creation, note these values (you'll need them):

- **Application (client) ID:** `12345678-1234-1234-1234-123456789abc`
- **Directory (tenant) ID:** `87654321-4321-4321-4321-abc123456789`

### 3.3 Create Client Secret

1. In your app registration, click **"Certificates & secrets"**
2. Click **"+ New client secret"**
3. **Description:** `SkyFi delivery secret`
4. **Expires:**
   - 180 days (recommended for security)
   - Or 12/24 months (requires rotation discipline)
5. Click **"Add"**

⚠️ **CRITICAL:** Copy the secret **Value** immediately. It will only be shown once.

**Example secret:** `abcdef123456~ABCdef.123456abcdef`

### 3.4 Grant Storage Permissions

Now grant the Entra App access to your storage account:

1. Navigate back to your **Storage Account**
2. Click **"Access Control (IAM)"** in the left menu
3. Click **"+ Add"** → **"Add role assignment"**
4. **Role tab:**
   - Search for and select **"Storage Blob Data Contributor"**
   - Click **"Next"**
5. **Members tab:**
   - **Assign access to:** User, group, or service principal
   - Click **"+ Select members"**
   - Search for your app name: `SkyFi Delivery App`
   - Select it and click **"Select"**
   - Click **"Next"**
6. **Review + assign:** Click **"Review + assign"**

### 3.5 Configure SkyFi Delivery

```json
{
  "delivery_driver": "AZURE",
  "delivery_params": {
    "container": "satellite-imagery",
    "account_name": "skyfiimagestore2024",
    "entra_app_id": "12345678-1234-1234-1234-123456789abc",
    "entra_app_secret": "abcdef123456~ABCdef.123456abcdef",
    "entra_tenant_id": "87654321-4321-4321-4321-abc123456789"
  }
}
```

### Configuration Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `delivery_driver` | Yes | Must be `"AZURE"` | `"AZURE"` |
| `container` | Yes | Blob container name | `"satellite-imagery"` |
| `account_name` | Yes | Storage account name | `"skyfiimagestore2024"` |
| `entra_app_id` | Yes | Application (client) ID | `"12345678-..."` |
| `entra_app_secret` | Yes | Client secret value | `"abcdef123456~..."` |
| `entra_tenant_id` | Yes | Directory (tenant) ID | `"87654321-..."` |

### 3.6 Entra App Best Practices

1. **Rotate Secrets Regularly**
   - Set calendar reminders before expiration
   - Create new secret before old one expires
   - Update configuration
   - Delete old secret

2. **Use Managed Identities (When Possible)**
   - If running in Azure (VM, App Service, Functions)
   - No secrets to manage
   - Automatic credential rotation
   - Enhanced security

3. **Apply Least Privilege**
   - Use "Storage Blob Data Contributor" for read/write
   - Use "Storage Blob Data Reader" for read-only
   - Avoid "Contributor" or "Owner" roles

4. **Monitor App Activity**
   - Enable Azure AD sign-in logs
   - Review activity regularly
   - Set up alerts for suspicious behavior

---

## Step 4: Verify Delivery Setup

### 4.1 Using Azure CLI

If you have Azure CLI installed:

**With Connection String:**
```bash
# Set connection string
export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;..."

# List containers
az storage container list

# Upload test file
echo "test" > test.txt
az storage blob upload \
  --container-name satellite-imagery \
  --name test.txt \
  --file test.txt

# List blobs
az storage blob list --container-name satellite-imagery
```

**With Entra App:**
```bash
# Login with service principal
az login --service-principal \
  --username 12345678-1234-1234-1234-123456789abc \
  --password abcdef123456~ABCdef.123456abcdef \
  --tenant 87654321-4321-4321-4321-abc123456789

# Upload test file
az storage blob upload \
  --account-name skyfiimagestore2024 \
  --container-name satellite-imagery \
  --name test.txt \
  --file test.txt \
  --auth-mode login
```

### 4.2 Manual Verification

1. Navigate to your storage account in Azure Portal
2. Click **"Containers"**
3. Click on your container name
4. Check for delivered files after order completion
5. Verify file properties and metadata

## Security Best Practices

### Credential Management

1. **Never Commit Credentials to Git**
   ```bash
   # Add to .gitignore
   .env
   azure-credentials.json
   connection-string.txt
   ```

2. **Use Azure Key Vault (Production)**
   - Store connection strings and secrets
   - Centralized secret management
   - Automatic rotation support
   - Access audit logging

   ```bash
   # Store in Key Vault
   az keyvault secret set \
     --vault-name my-keyvault \
     --name skyfi-connection-string \
     --value "DefaultEndpointsProtocol=..."

   # Retrieve from Key Vault
   az keyvault secret show \
     --vault-name my-keyvault \
     --name skyfi-connection-string \
     --query value -o tsv
   ```

3. **Use Environment Variables**
   ```bash
   export AZURE_STORAGE_ACCOUNT=skyfiimagestore2024
   export AZURE_STORAGE_KEY=abcd1234...
   # Or
   export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpoints..."
   ```

4. **Implement Secret Rotation**
   - Set expiration dates for all secrets
   - Use calendar reminders
   - Rotate before expiration
   - Test new credentials before deleting old

### Storage Account Security

1. **Enable Soft Delete**
   - Protects against accidental deletion
   - Configurable retention period (7-365 days)
   - Minimal cost impact

2. **Enable Versioning**
   - Maintains previous versions of blobs
   - Recover from accidental overwrites
   - Slightly higher storage cost

3. **Configure Network Rules**
   - Restrict access to specific IP addresses
   - Use private endpoints for Azure VNets
   - Enable firewall rules

   **Example: Allow specific IP:**
   ```bash
   az storage account network-rule add \
     --account-name skyfiimagestore2024 \
     --ip-address 203.0.113.10
   ```

4. **Enable Advanced Threat Protection**
   - Detects unusual access patterns
   - Alerts on potential security threats
   - Available with Microsoft Defender for Storage

5. **Use HTTPS Only**
   - Always enabled by default in new accounts
   - Ensures encryption in transit
   - Prevents man-in-the-middle attacks

6. **Enable Diagnostic Logging**
   - Navigate to **"Diagnostic settings"**
   - Log to Log Analytics workspace
   - Monitor: StorageRead, StorageWrite, StorageDelete
   - Set up alerts for anomalies

7. **Configure CORS (If Needed)**
   - Only if accessing from web browsers
   - Restrict to specific origins
   - Minimize allowed methods

### Container Security

1. **Never Enable Public Access**
   - Always keep containers private
   - Use SAS tokens for temporary sharing
   - Use Azure AD authentication when possible

2. **Set Container-Level Access Policies**
   - Define stored access policies
   - Enable easier permission management
   - Support revocation without key rotation

3. **Enable Legal Hold (If Required)**
   - For compliance and regulatory requirements
   - Prevents deletion even by administrators
   - Immutable storage support

## Troubleshooting

### Error: "Authentication Failed"

**Symptom:** 401 Unauthorized error

**Possible Causes:**
1. Invalid connection string or credentials
2. Access key has been regenerated
3. Entra App secret has expired
4. Incorrect tenant ID

**Solutions:**
- Verify connection string is current
- Check access keys haven't been rotated
- Confirm Entra App secret is valid and not expired
- Verify tenant ID matches your Azure AD

### Error: "Authorization Permission Mismatch" (403 Forbidden)

**Symptom:** Permission denied when uploading

**Possible Causes:**
1. Insufficient RBAC permissions
2. Storage account firewall blocking access
3. Container doesn't exist
4. Network access restrictions

**Solutions:**
- Verify Entra App has "Storage Blob Data Contributor" role
- Check storage account firewall settings
- Confirm container exists and name is correct
- Verify source IP is allowed (if network rules configured)

### Error: "Container Not Found" (404)

**Symptom:** Specified container does not exist

**Possible Causes:**
1. Container name is incorrect
2. Container hasn't been created
3. Wrong storage account

**Solutions:**
- Verify container name (case-sensitive)
- Create container in Azure Portal
- Confirm account_name in configuration
- Check you're accessing correct storage account

### Error: "Account Key Not Found"

**Symptom:** Cannot authenticate with connection string

**Possible Causes:**
1. Storage account key access is disabled
2. Connection string format is incorrect
3. Access key has been regenerated

**Solutions:**
- Enable "Allow storage account key access" in Configuration
- Verify connection string format is correct
- Regenerate and retrieve new access key
- Check for extra spaces or line breaks in connection string

### Error: "Request Rate Exceeded" (503)

**Symptom:** Too many requests error

**Possible Causes:**
1. Exceeded storage account limits
2. Too many concurrent operations
3. Throttling by Azure

**Solutions:**
- Implement exponential backoff and retry logic
- Reduce concurrent upload operations
- Consider upgrading to Premium storage for higher IOPS
- Contact Azure support for limit increases

### Slow Upload Performance

**Symptom:** Uploads slower than expected

**Possible Causes:**
1. Storage account in distant region
2. Network latency or bandwidth limitations
3. Not using parallel uploads

**Solutions:**
- Choose storage region closer to upload source
- Enable Azure CDN for download acceleration
- Verify network connectivity
- Use larger block sizes for uploads
- Check Azure Service Health for regional issues

### Error: "Entra App Not Found"

**Symptom:** Cannot find service principal

**Possible Causes:**
1. App registration was deleted
2. Incorrect app ID
3. App in different tenant

**Solutions:**
- Verify app exists in Entra ID portal
- Check app ID is copied correctly (no extra characters)
- Ensure using correct tenant ID
- Recreate app registration if deleted

## Cost Optimization

### Storage Costs (as of 2024)

**Hot Tier Pricing (East US):**
- LRS: $0.018 per GB/month
- ZRS: $0.0225 per GB/month
- GRS: $0.036 per GB/month

**Typical costs:**
- 100 GB satellite imagery with LRS: ~$1.80/month
- 1 TB satellite imagery with LRS: ~$18.00/month

### Optimization Strategies

1. **Choose Appropriate Access Tier**
   - **Hot:** Frequently accessed data (imagery in active use)
   - **Cool:** Infrequently accessed, stored 30+ days
   - **Cold:** Rarely accessed, stored 90+ days
   - **Archive:** Long-term storage, stored 180+ days

2. **Implement Lifecycle Management**

   Navigate to **"Lifecycle management"** in storage account:

   **Example policy:**
   - Move to Cool tier after 30 days
   - Move to Archive tier after 90 days
   - Delete after 365 days

   ```json
   {
     "rules": [
       {
         "enabled": true,
         "name": "moveToArchive",
         "type": "Lifecycle",
         "definition": {
           "actions": {
             "baseBlob": {
               "tierToCool": {
                 "daysAfterModificationGreaterThan": 30
               },
               "tierToArchive": {
                 "daysAfterModificationGreaterThan": 90
               },
               "delete": {
                 "daysAfterModificationGreaterThan": 365
               }
             }
           },
           "filters": {
             "blobTypes": ["blockBlob"],
             "prefixMatch": ["satellite-imagery/"]
           }
         }
       }
     ]
   }
   ```

3. **Choose Regional Storage**
   - LRS is cheapest
   - Only use GRS if you need geo-redundancy
   - ZRS is good balance of cost and availability

4. **Delete Unnecessary Blob Versions**
   - If versioning enabled, versions consume storage
   - Configure lifecycle to delete old versions
   - Example: Delete versions after 30 days

5. **Compress Data**
   - Compress imagery files before upload (if format allows)
   - Use GeoTIFF compression options
   - Can reduce storage by 50%+ depending on imagery type

6. **Monitor Costs**
   - Enable **"Cost Management + Billing"**
   - Set up budget alerts
   - Review storage analytics
   - Identify unused or old data

### Transaction Costs

- Write operations: $0.065 per 10,000 transactions (Hot tier)
- Read operations: $0.0044 per 10,000 transactions (Hot tier)
- Typical impact: < $0.01 per order

### Data Transfer Costs

- Ingress (upload): Free
- Egress (download):
  - First 100 GB/month: Free
  - Next 9.9 TB: $0.087 per GB
  - Additional tiers available

## Additional Resources

- [Azure Blob Storage Documentation](https://docs.microsoft.com/azure/storage/blobs/)
- [Microsoft Entra ID Best Practices](https://docs.microsoft.com/azure/active-directory/develop/identity-platform-integration-checklist)
- [Azure Storage Security Guide](https://docs.microsoft.com/azure/storage/common/storage-security-guide)
- [Azure Storage Pricing](https://azure.microsoft.com/pricing/details/storage/blobs/)
- [Azure CLI Reference](https://docs.microsoft.com/cli/azure/storage)

## Support

If you encounter issues with Azure Blob Storage delivery:

1. Verify all configuration parameters
2. Check authentication method (connection string vs Entra App)
3. Review Azure Activity Logs for errors
4. Test connectivity with Azure CLI
5. Check storage account firewall and network rules
6. Contact SkyFi support with error details and order ID

---

**Next Steps:**
- [Configure AWS S3 Storage ←](./s3-setup.md)
- [Configure Google Cloud Storage ←](./gcs-setup.md)
- [Learn about AOI Polygons →](./aoi-polygons.md)
