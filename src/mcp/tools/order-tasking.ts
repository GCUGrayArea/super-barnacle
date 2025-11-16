/**
 * Tasking Order MCP Tool
 *
 * This module implements the MCP tool for placing tasking orders.
 * Tasking orders request NEW satellite imagery to be captured.
 *
 * IMPORTANT: This tool involves significant costs - validation must be thorough.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SkyFiClient } from '../../skyfi/client.js';
import { placeTaskingOrder } from '../../skyfi/orders.js';
import { logger } from '../../lib/logger.js';
import {
  formatTaskingOrderResult,
  formatOrderError,
} from '../formatters/order-results.js';
import {
  TaskingOrderRequest,
  DeliveryDriver,
  ProductType,
  Resolution,
} from '../../types/orders.js';

/**
 * Zod schema for tasking order tool input
 */
const TaskingOrderInputSchema = z.object({
  aoi: z
    .string()
    .describe('Area of Interest in WKT POLYGON format: POLYGON((lon lat, lon lat, ...))'),
  deliveryDriver: z
    .nativeEnum(DeliveryDriver)
    .describe('Cloud storage delivery driver'),
  deliveryParams: z
    .record(z.unknown())
    .optional()
    .describe('Delivery configuration based on selected driver'),
  windowStart: z
    .string()
    .describe('Tasking window start time in ISO 8601 format (e.g., 2024-01-15T10:00:00Z)'),
  windowEnd: z
    .string()
    .describe('Tasking window end time in ISO 8601 format (e.g., 2024-01-20T10:00:00Z)'),
  productType: z
    .nativeEnum(ProductType)
    .describe('Type of satellite imagery product'),
  resolution: z
    .nativeEnum(Resolution)
    .describe('Image resolution level'),
  priorityItem: z
    .boolean()
    .optional()
    .describe('Mark as priority order (may affect pricing)'),
  maxCloudCoveragePercent: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .describe('Maximum acceptable cloud coverage percentage (0-100)'),
  maxOffNadirAngle: z
    .number()
    .int()
    .min(0)
    .max(45)
    .optional()
    .describe('Maximum off-nadir angle in degrees (0-45)'),
  requiredProvider: z
    .string()
    .optional()
    .describe('Specific satellite provider requirement'),
  sarProductTypes: z
    .array(z.string())
    .optional()
    .describe('SAR product types (required for SAR productType)'),
  sarPolarisation: z
    .string()
    .optional()
    .describe('SAR polarisation (required for SAR productType)'),
  sarGrazingAngleMin: z
    .number()
    .min(10)
    .max(80)
    .optional()
    .describe('Minimum SAR grazing angle (10-80)'),
  sarGrazingAngleMax: z
    .number()
    .min(10)
    .max(80)
    .optional()
    .describe('Maximum SAR grazing angle (10-80)'),
  sarAzimuthAngleMin: z
    .number()
    .min(0)
    .max(360)
    .optional()
    .describe('Minimum SAR azimuth angle (0-360)'),
  sarAzimuthAngleMax: z
    .number()
    .min(0)
    .max(360)
    .optional()
    .describe('Maximum SAR azimuth angle (0-360)'),
  sarNumberOfLooks: z
    .number()
    .int()
    .optional()
    .describe('SAR number of looks'),
  providerWindowId: z
    .string()
    .uuid()
    .optional()
    .describe('Provider-specific window ID (UUID) from pass prediction'),
  label: z
    .string()
    .optional()
    .describe('Optional label for the order'),
  orderLabel: z
    .string()
    .optional()
    .describe('Optional order-specific label'),
  metadata: z
    .record(z.unknown())
    .optional()
    .describe('Optional metadata key-value pairs'),
  webhookUrl: z
    .string()
    .url()
    .optional()
    .describe('Optional webhook URL for order status notifications (must be HTTPS)'),
});

/**
 * Tasking Order Tool Definition
 *
 * This tool allows ordering new satellite imagery captures.
 */
export const taskingOrderTool = {
  name: 'order_tasking_imagery',
  description: `Order NEW satellite imagery to be captured by scheduling satellite tasking.

This tool places a PAID TASKING ORDER for new satellite imagery. This is more expensive
than ordering archive imagery as it requires scheduling a satellite to capture your area.

COST WARNING: Tasking orders involve significant payment. Costs depend on:
- Resolution requested (higher resolution = higher cost)
- Area size
- Priority settings
- Product type

Make absolutely sure all parameters are correct before placing a tasking order.

How Tasking Works:
1. You specify a time window when you want imagery captured
2. SkyFi schedules a satellite to pass over your area during this window
3. The satellite captures imagery when weather/conditions are favorable
4. Imagery is processed and delivered to your cloud storage
5. Timeline: Typically 24-48 hours after capture for processing + delivery

Prerequisites:
1. Define your Area of Interest (AOI) in WKT POLYGON format
2. Choose tasking window (start and end times in ISO 8601 format)
3. Select product type and resolution
4. Configure delivery to your cloud storage (S3, GCS, or Azure)

Product Types:
- DAY: Standard daytime optical imagery
- NIGHT: Nighttime imagery (limited satellites)
- VIDEO: Video capture (limited satellites)
- MULTISPECTRAL: Multiple spectral bands
- HYPERSPECTRAL: Many spectral bands (limited satellites)
- SAR: Synthetic Aperture Radar (weather/cloud independent)
- STEREO: 3D terrain capture (limited satellites)

Resolution Levels:
- LOW: >10m per pixel
- MEDIUM: 5-10m per pixel
- HIGH: 2-5m per pixel
- VERY HIGH: 1-2m per pixel
- SUPER HIGH: 0.5-1m per pixel
- ULTRA HIGH: 0.3-0.5m per pixel
- CM 30: 0.3m per pixel
- CM 50: 0.5m per pixel

Delivery Configuration Examples:

AWS S3:
{
  "deliveryDriver": "S3",
  "deliveryParams": {
    "s3_bucket_id": "my-satellite-imagery",
    "aws_region": "us-east-1",
    "aws_access_key": "AKIAIOSFODNN7EXAMPLE",
    "aws_secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }
}

Google Cloud Storage:
{
  "deliveryDriver": "GS",
  "deliveryParams": {
    "gs_project_id": "my-gcp-project",
    "gs_bucket_id": "my-satellite-imagery",
    "gs_credentials": {
      "type": "service_account",
      "project_id": "my-gcp-project",
      "private_key_id": "key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
      "client_email": "service-account@my-gcp-project.iam.gserviceaccount.com",
      "client_id": "123456789",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/service-account%40my-gcp-project.iam.gserviceaccount.com"
    }
  }
}

Azure (Connection String):
{
  "deliveryDriver": "AZURE",
  "deliveryParams": {
    "azure_container_id": "satellite-imagery",
    "azure_connection_string": "DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=...;EndpointSuffix=core.windows.net"
  }
}

Azure (Entra App):
{
  "deliveryDriver": "AZURE",
  "deliveryParams": {
    "azure_storage_account_name": "mystorageaccount",
    "azure_container_id": "satellite-imagery",
    "azure_tenant_id": "12345678-1234-1234-1234-123456789012",
    "azure_client_id": "87654321-4321-4321-4321-210987654321",
    "azure_client_secret": "client-secret-value"
  }
}

Optional Parameters:
- priorityItem: Mark as priority (faster scheduling, higher cost)
- maxCloudCoveragePercent: Maximum acceptable cloud coverage (0-100)
- maxOffNadirAngle: Maximum satellite viewing angle (0-45 degrees)
- requiredProvider: Specify a particular satellite provider
- providerWindowId: Specific provider window from pass prediction
- webhookUrl: HTTPS URL for order status notifications

Success depends on:
- Clear weather during satellite passes
- Satellite availability and scheduling
- Meeting specified imaging parameters`,
  inputSchema: zodToJsonSchema(TaskingOrderInputSchema),
};

/**
 * Tasking Order Tool Handler
 *
 * Executes the tasking order placement using the SkyFi API.
 *
 * @param args - Tool arguments validated against the input schema
 * @param client - SkyFi API client instance
 * @returns Formatted order confirmation or error message
 */
export async function handleTaskingOrder(
  args: unknown,
  client: SkyFiClient
): Promise<string> {
  // Validate and parse input
  const validatedArgs = TaskingOrderInputSchema.parse(args);
  logger.info('Handling tasking order request', {
    productType: validatedArgs.productType,
    resolution: validatedArgs.resolution,
    windowStart: validatedArgs.windowStart,
    windowEnd: validatedArgs.windowEnd,
    deliveryDriver: validatedArgs.deliveryDriver,
  });

  try {
    // Convert MCP tool input to API request format
    const orderRequest: TaskingOrderRequest = {
      aoi: validatedArgs.aoi,
      deliveryDriver: validatedArgs.deliveryDriver,
      deliveryParams: validatedArgs.deliveryParams,
      windowStart: validatedArgs.windowStart,
      windowEnd: validatedArgs.windowEnd,
      productType: validatedArgs.productType,
      resolution: validatedArgs.resolution,
      priorityItem: validatedArgs.priorityItem,
      maxCloudCoveragePercent: validatedArgs.maxCloudCoveragePercent,
      maxOffNadirAngle: validatedArgs.maxOffNadirAngle,
      requiredProvider: validatedArgs.requiredProvider,
      sarProductTypes: validatedArgs.sarProductTypes,
      sarPolarisation: validatedArgs.sarPolarisation,
      sarGrazingAngleMin: validatedArgs.sarGrazingAngleMin,
      sarGrazingAngleMax: validatedArgs.sarGrazingAngleMax,
      sarAzimuthAngleMin: validatedArgs.sarAzimuthAngleMin,
      sarAzimuthAngleMax: validatedArgs.sarAzimuthAngleMax,
      sarNumberOfLooks: validatedArgs.sarNumberOfLooks,
      providerWindowId: validatedArgs.providerWindowId,
      label: validatedArgs.label,
      orderLabel: validatedArgs.orderLabel,
      metadata: validatedArgs.metadata,
      webhookUrl: validatedArgs.webhookUrl,
    };

    // Place the order using SkyFi API
    const response = await placeTaskingOrder(client, orderRequest);

    // Format and return the result
    const formattedResult = formatTaskingOrderResult(response);

    logger.info('Tasking order placed successfully', {
      orderId: response.id,
      productType: validatedArgs.productType,
      resolution: validatedArgs.resolution,
    });

    return formattedResult;
  } catch (error) {
    logger.error('Tasking order placement failed', {
      productType: validatedArgs.productType,
      resolution: validatedArgs.resolution,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return formatOrderError(error);
  }
}
