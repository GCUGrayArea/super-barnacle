# AWS S3 Delivery Configuration Guide

## Overview

This guide walks you through configuring AWS S3 as your delivery destination for SkyFi satellite imagery orders. When you place an order with SkyFi, the captured imagery will be automatically delivered to your specified S3 bucket.

## Prerequisites

Before setting up S3 delivery, ensure you have:

- An active AWS account
- Appropriate permissions to create S3 buckets and IAM users
- AWS CLI installed (optional, but recommended for verification)

## Step 1: Create an S3 Bucket

### 1.1 Navigate to S3 Console

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/)
2. Navigate to the S3 service (search for "S3" in the search bar)
3. Click **"Create bucket"**

### 1.2 Configure Bucket Settings

**Bucket Name:**
- Choose a globally unique name (e.g., `my-satellite-imagery-2024`)
- Use lowercase letters, numbers, and hyphens only
- Must be between 3-63 characters
- Cannot contain underscores or uppercase letters

**Region:**
- Select a region close to your primary location for lower latency
- Common choices: `us-east-1`, `us-west-2`, `eu-west-1`
- Note the region name - you'll need it for configuration

**Object Ownership:**
- Select **"ACLs disabled (recommended)"**
- Ensures bucket owner has full control

**Block Public Access Settings:**
- ⚠️ **IMPORTANT**: Keep all "Block public access" settings **ENABLED**
- Satellite imagery should never be publicly accessible
- Your access will be via IAM credentials, not public URLs

**Bucket Versioning:**
- ✅ **Recommended**: Enable versioning
- Protects against accidental deletions or overwrites
- Allows recovery of previous versions of imagery files

**Default Encryption:**
- ✅ **Recommended**: Enable server-side encryption
- Choose **"Amazon S3-managed keys (SSE-S3)"** for simplicity
- Or use **"AWS KMS"** for enhanced control

**Object Lock:**
- Not required for typical satellite imagery workflows
- Leave disabled unless you have compliance requirements

### 1.3 Create the Bucket

Click **"Create bucket"** to finalize the creation.

## Step 2: Configure IAM Access

### 2.1 Create an IAM User for SkyFi Delivery

1. Navigate to **IAM** service in AWS Console
2. Click **"Users"** in the left sidebar
3. Click **"Create user"**
4. Enter username: `skyfi-delivery` (or your preferred name)
5. Click **"Next"**

### 2.2 Set Permissions

Choose **"Attach policies directly"** and click **"Create policy"**

In the policy editor, switch to the **JSON** tab and use this least-privilege policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SkyFiDeliveryAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-satellite-imagery",
        "arn:aws:s3:::my-satellite-imagery/*"
      ]
    }
  ]
}
```

**Important:** Replace `my-satellite-imagery` with your actual bucket name.

**Explanation of Permissions:**
- `s3:PutObject` - Allows SkyFi to upload imagery files
- `s3:PutObjectAcl` - Allows setting object permissions
- `s3:GetObject` - Allows reading uploaded files (for verification)
- `s3:ListBucket` - Allows listing bucket contents

Click **"Next"**, name the policy (e.g., `SkyFiDeliveryPolicy`), and create it.

### 2.3 Attach Policy to User

1. Return to the user creation flow
2. Search for and select your newly created `SkyFiDeliveryPolicy`
3. Click **"Next"** and **"Create user"**

### 2.4 Generate Access Keys

1. Click on the newly created user
2. Navigate to the **"Security credentials"** tab
3. Scroll to **"Access keys"** section
4. Click **"Create access key"**
5. Select **"Third-party service"** as the use case
6. Check the confirmation box
7. Click **"Create access key"**

⚠️ **CRITICAL**: Save both the **Access Key ID** and **Secret Access Key** immediately. The secret key will only be shown once.

**Example:**
```
Access Key ID: AKIAIOSFODNN7EXAMPLE
Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### 2.5 Access Key Best Practices

- ✅ Store keys in a secure password manager
- ✅ Use environment variables, never hardcode in source code
- ✅ Rotate keys every 90 days
- ✅ Delete unused or compromised keys immediately
- ✅ Enable MFA on your AWS root account
- ❌ Never commit keys to version control
- ❌ Never share keys via email or messaging

## Step 3: Configure SkyFi Delivery

When placing an order through SkyFi's MCP tools, use the following delivery configuration:

```json
{
  "delivery_driver": "S3",
  "delivery_params": {
    "bucket": "my-satellite-imagery",
    "access_key": "AKIAIOSFODNN7EXAMPLE",
    "secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "region": "us-east-1",
    "path": "skyfi/orders/"
  }
}
```

### Configuration Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `delivery_driver` | Yes | Must be `"S3"` | `"S3"` |
| `bucket` | Yes | Your S3 bucket name | `"my-satellite-imagery"` |
| `access_key` | Yes | IAM user access key ID | `"AKIA..."` |
| `secret_key` | Yes | IAM user secret key | `"wJalr..."` |
| `region` | Yes | AWS region of bucket | `"us-east-1"` |
| `path` | No | Prefix/folder path in bucket | `"skyfi/orders/"` |

### Path Organization

The `path` parameter helps organize your imagery:

```
my-satellite-imagery/
  └── skyfi/
      └── orders/
          ├── order-abc123/
          │   ├── imagery.tif
          │   └── metadata.json
          └── order-def456/
              ├── imagery.tif
              └── metadata.json
```

## Step 4: Verify Delivery Setup

### 4.1 Using AWS CLI

If you have AWS CLI installed, verify bucket access:

```bash
# Configure AWS CLI with your keys (one-time setup)
aws configure set aws_access_key_id AKIAIOSFODNN7EXAMPLE
aws configure set aws_secret_access_key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
aws configure set region us-east-1

# Test bucket access
aws s3 ls s3://my-satellite-imagery/

# Test upload capability
echo "test" > test.txt
aws s3 cp test.txt s3://my-satellite-imagery/skyfi/test.txt
```

### 4.2 Manual Verification

1. Navigate to S3 Console
2. Open your bucket
3. Check for delivered files after order completion
4. Verify file permissions and metadata

## Security Best Practices

### Credential Management

1. **Environment Variables (Recommended)**
   ```bash
   export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   export AWS_REGION=us-east-1
   ```

2. **AWS Secrets Manager (Production)**
   - Store credentials in AWS Secrets Manager
   - Retrieve programmatically
   - Enable automatic rotation

3. **Never Commit to Git**
   ```bash
   # Add to .gitignore
   .env
   credentials.json
   aws-credentials.txt
   ```

### Bucket Security

1. **Enable Encryption**
   - All data encrypted at rest
   - Uses AES-256 encryption
   - No performance impact

2. **Enable Bucket Versioning**
   - Protect against accidental deletions
   - Recover previous file versions
   - Minimal storage cost increase

3. **Configure Lifecycle Policies**
   - Transition old imagery to Glacier for archival
   - Automatically delete old versions after X days
   - Reduce storage costs

   **Example Lifecycle Rule:**
   ```json
   {
     "Rules": [
       {
         "Id": "ArchiveOldImagery",
         "Status": "Enabled",
         "Transitions": [
           {
             "Days": 90,
             "StorageClass": "GLACIER"
           }
         ],
         "NoncurrentVersionExpiration": {
           "NoncurrentDays": 30
         }
       }
     ]
   }
   ```

4. **Enable S3 Access Logging**
   - Track all access to your bucket
   - Identify unauthorized access attempts
   - Required for compliance in many industries

5. **Configure Bucket Policies**
   - Restrict access to specific IP ranges (optional)
   - Require SSL/TLS for all connections
   - Enforce encryption

   **Example Bucket Policy (Require SSL):**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "DenyInsecureTransport",
         "Effect": "Deny",
         "Principal": "*",
         "Action": "s3:*",
         "Resource": [
           "arn:aws:s3:::my-satellite-imagery",
           "arn:aws:s3:::my-satellite-imagery/*"
         ],
         "Condition": {
           "Bool": {
             "aws:SecureTransport": "false"
           }
         }
       }
     ]
   }
   ```

## Troubleshooting

### Error: "Access Denied"

**Symptom:** Delivery fails with "AccessDenied" error

**Possible Causes:**
1. Incorrect IAM permissions
2. Bucket policy blocking access
3. Wrong bucket name
4. Incorrect region

**Solutions:**
- Verify IAM policy includes `s3:PutObject` permission
- Check bucket policy for deny statements
- Confirm bucket name matches exactly (case-sensitive)
- Ensure region in configuration matches bucket region

### Error: "Invalid Credentials"

**Symptom:** Authentication fails

**Possible Causes:**
1. Incorrect access key or secret key
2. Keys have been rotated or deleted
3. Typo in credentials

**Solutions:**
- Regenerate access keys in IAM console
- Verify no extra spaces or characters in keys
- Check if IAM user is active and not disabled

### Error: "Bucket Not Found" (NoSuchBucket)

**Symptom:** 404 error when accessing bucket

**Possible Causes:**
1. Bucket name is incorrect
2. Bucket is in a different region
3. Bucket was deleted

**Solutions:**
- Verify bucket name (check for typos)
- Confirm bucket exists in S3 console
- Check that region parameter matches bucket region

### Error: "Region Mismatch"

**Symptom:** Requests fail with region-related errors

**Possible Causes:**
1. Bucket is in different region than specified
2. Region name is incorrect

**Solutions:**
- Check bucket region in S3 console (bucket properties)
- Use correct region name format (e.g., `us-east-1`, not `US East`)
- Update `region` parameter in delivery configuration

### Slow Upload Speeds

**Symptom:** Delivery takes longer than expected

**Possible Causes:**
1. Bucket region far from SkyFi's upload location
2. Network connectivity issues

**Solutions:**
- Choose a bucket region closer to `us-east-1` (SkyFi's primary region)
- Enable S3 Transfer Acceleration (additional cost)
- Check AWS Service Health Dashboard

### Files Not Appearing in Expected Path

**Symptom:** Files delivered but not in specified path

**Possible Causes:**
1. Path parameter format incorrect
2. Permissions issue with path prefix

**Solutions:**
- Ensure path ends with `/` if it's a folder
- Verify IAM policy allows access to the full path
- Check S3 console for actual delivery location

## Cost Optimization

### Storage Costs

**Current S3 Standard Pricing (us-east-1):**
- First 50 TB: $0.023 per GB/month
- Typical satellite imagery order: 1-10 GB
- Monthly cost for 100 GB: ~$2.30

### Optimization Strategies

1. **Use Lifecycle Policies**
   - Move to S3 Intelligent-Tiering after 30 days
   - Archive to Glacier after 90 days
   - Delete after 1 year if not needed

2. **Enable Intelligent-Tiering**
   - Automatically moves objects between access tiers
   - No retrieval fees
   - Small monthly monitoring fee

3. **Compress Large Files**
   - Use compression before storage (if format allows)
   - GeoTIFF supports internal compression

4. **Delete Temporary Files**
   - Remove processing artifacts
   - Clean up failed deliveries

5. **Monitor with AWS Cost Explorer**
   - Track S3 spending
   - Set up billing alerts
   - Identify unexpected costs

### Request Costs

- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests
- Typical impact: < $0.01 per order

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [AWS Cost Management](https://aws.amazon.com/aws-cost-management/)
- [S3 Storage Classes](https://aws.amazon.com/s3/storage-classes/)

## Support

If you encounter issues with S3 delivery:

1. Verify all configuration parameters
2. Check IAM permissions and bucket policies
3. Review AWS CloudTrail logs for access attempts
4. Contact SkyFi support with error details and order ID

---

**Next Steps:**
- [Configure Google Cloud Storage →](./gcs-setup.md)
- [Configure Azure Blob Storage →](./azure-setup.md)
- [Learn about AOI Polygons →](./aoi-polygons.md)
