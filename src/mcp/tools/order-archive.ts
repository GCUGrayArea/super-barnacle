/**
 * Archive Order MCP Tool
 *
 * This module implements the MCP tool for placing archive orders.
 * Archive orders request existing satellite imagery from SkyFi's catalog.
 *
 * IMPORTANT: This tool involves real costs - validation must be thorough.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SkyFiClient } from '../../skyfi/client.js';
import { placeArchiveOrder } from '../../skyfi/orders.js';
import { logger } from '../../lib/logger.js';
import {
  formatArchiveOrderResult,
  formatOrderError,
} from '../formatters/order-results.js';
import { ArchiveOrderRequest, DeliveryDriver } from '../../types/orders.js';

/**
 * Zod schema for archive order tool input
 */
const ArchiveOrderInputSchema = z.object({
  archiveId: z
    .string()
    .uuid()
    .describe('Archive ID (UUID) from SkyFi catalog search'),
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
 * Archive Order Tool Definition
 *
 * This tool allows ordering existing satellite imagery from SkyFi's archive.
 */
export const archiveOrderTool = {
  name: 'order_archive_imagery',
  description: `Order existing satellite imagery from SkyFi's archive catalog.

This tool places a PAID ORDER for satellite imagery that already exists in SkyFi's archive.
Once the order is placed, you will be charged according to SkyFi's pricing.

COST WARNING: This action involves payment. Make sure all parameters are correct before placing the order.

Prerequisites:
1. You must have searched the catalog to find archive imagery
2. You need the Archive ID (UUID) from the search results
3. You must configure delivery to your cloud storage (S3, GCS, or Azure)

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

The imagery will be delivered to your specified cloud storage location.
Archive orders typically complete within minutes to hours.`,
  inputSchema: zodToJsonSchema(ArchiveOrderInputSchema),
};

/**
 * Archive Order Tool Handler
 *
 * Executes the archive order placement using the SkyFi API.
 *
 * @param args - Tool arguments validated against the input schema
 * @param client - SkyFi API client instance
 * @returns Formatted order confirmation or error message
 */
export async function handleArchiveOrder(
  args: unknown,
  client: SkyFiClient
): Promise<string> {
  // Validate and parse input
  const validatedArgs = ArchiveOrderInputSchema.parse(args);
  logger.info('Handling archive order request', {
    archiveId: validatedArgs.archiveId,
    deliveryDriver: validatedArgs.deliveryDriver,
  });

  try {
    // Convert MCP tool input to API request format
    const orderRequest: ArchiveOrderRequest = {
      archiveId: validatedArgs.archiveId,
      aoi: validatedArgs.aoi,
      deliveryDriver: validatedArgs.deliveryDriver,
      deliveryParams: validatedArgs.deliveryParams,
      label: validatedArgs.label,
      orderLabel: validatedArgs.orderLabel,
      metadata: validatedArgs.metadata,
      webhookUrl: validatedArgs.webhookUrl,
    };

    // Place the order using SkyFi API
    const response = await placeArchiveOrder(client, orderRequest);

    // Format and return the result
    const formattedResult = formatArchiveOrderResult(response);

    logger.info('Archive order placed successfully', {
      orderId: response.id,
      archiveId: validatedArgs.archiveId,
    });

    return formattedResult;
  } catch (error) {
    logger.error('Archive order placement failed', {
      archiveId: validatedArgs.archiveId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return formatOrderError(error);
  }
}
