/**
 * Order Result Formatters for MCP Tools
 *
 * This module provides formatting utilities for order placement results.
 * These formatters ensure consistent, user-friendly responses from MCP tools
 * with appropriate warnings about costs and next steps.
 *
 * @packageDocumentation
 */

import {
  ArchiveOrderResponse,
  TaskingOrderResponse,
  DeliveryDriver,
  DeliveryParams,
} from '../../types/orders.js';

/**
 * Format delivery configuration for display
 */
function formatDeliveryConfig(
  driver: DeliveryDriver | null | undefined,
  params: DeliveryParams | null | undefined
): string {
  if (!driver || driver === DeliveryDriver.NONE) {
    return 'No automatic delivery configured - imagery will be available via SkyFi platform';
  }

  if (driver === DeliveryDriver.DELIVERY_CONFIG) {
    return 'Using pre-configured delivery settings from your SkyFi account';
  }

  // Format based on driver type
  switch (driver) {
    case DeliveryDriver.S3:
    case DeliveryDriver.S3_SERVICE_ACCOUNT: {
      const s3Params = params as any;
      return `AWS S3 Bucket: ${s3Params?.s3_bucket_id ?? 'unknown'}\nRegion: ${s3Params?.aws_region ?? 'unknown'}`;
    }

    case DeliveryDriver.GS:
    case DeliveryDriver.GS_SERVICE_ACCOUNT: {
      const gcsParams = params as any;
      return `Google Cloud Storage Bucket: ${gcsParams?.gs_bucket_id ?? 'unknown'}\nProject: ${gcsParams?.gs_project_id ?? 'unknown'}`;
    }

    case DeliveryDriver.AZURE:
    case DeliveryDriver.AZURE_SERVICE_ACCOUNT: {
      const azureParams = params as any;
      if (azureParams?.azure_storage_account_name) {
        return `Azure Storage Account: ${azureParams.azure_storage_account_name}\nContainer: ${azureParams?.azure_container_id ?? 'unknown'}`;
      }
      return `Azure Container: ${azureParams?.azure_container_id ?? 'unknown'}`;
    }

    default:
      return `Delivery Driver: ${driver}`;
  }
}

/**
 * Format archive order response for MCP tool output
 *
 * @param response - Archive order response from SkyFi API
 * @returns Formatted text response for MCP client
 */
export function formatArchiveOrderResult(
  response: ArchiveOrderResponse
): string {
  const deliveryInfo = formatDeliveryConfig(
    response.deliveryDriver,
    response.deliveryParams
  );

  const sections = [
    '# Archive Order Placed Successfully',
    '',
    '## Order Details',
    `- Order ID: ${response.id}`,
    `- Archive ID: ${response.archiveId}`,
    `- Order Type: Archive`,
    '',
    '## Area of Interest',
    `\`\`\``,
    response.aoi,
    `\`\`\``,
    '',
    '## Delivery Configuration',
    deliveryInfo,
  ];

  // Add optional fields if present
  if (response.label) {
    sections.push('', `## Label`, response.label);
  }

  if (response.orderLabel) {
    sections.push('', `## Order Label`, response.orderLabel);
  }

  if (response.webhookUrl) {
    sections.push('', `## Webhook`, `Notifications will be sent to: ${response.webhookUrl}`);
  }

  if (response.metadata && Object.keys(response.metadata).length > 0) {
    sections.push('', `## Metadata`, '```json', JSON.stringify(response.metadata, null, 2), '```');
  }

  // Add important warnings and next steps
  sections.push(
    '',
    '## Important Notes',
    '',
    '### Payment',
    '⚠️  This order involves payment. You will be charged according to SkyFi pricing.',
    'Archive imagery is typically delivered within minutes to hours.',
    '',
    '### Next Steps',
    '1. Monitor order status via SkyFi dashboard or webhook notifications',
    '2. Check your delivery destination for imagery files',
    '3. Verify delivery configuration is correct to avoid failed deliveries',
    '',
    '### Order Management',
    '- View order status: https://app.skyfi.com/orders',
    `- Order ID for reference: ${response.id}`,
    '',
    '### Support',
    'If you have questions about this order, contact SkyFi support with the Order ID above.'
  );

  return sections.join('\n');
}

/**
 * Format tasking order response for MCP tool output
 *
 * @param response - Tasking order response from SkyFi API
 * @returns Formatted text response for MCP client
 */
export function formatTaskingOrderResult(
  response: TaskingOrderResponse
): string {
  const deliveryInfo = formatDeliveryConfig(
    response.deliveryDriver,
    response.deliveryParams
  );

  const sections = [
    '# Tasking Order Placed Successfully',
    '',
    '## Order Details',
    `- Order ID: ${response.id}`,
    `- Order Type: Tasking`,
    `- Product Type: ${response.productType}`,
    `- Resolution: ${response.resolution}`,
    '',
    '## Tasking Window',
    `- Start: ${response.windowStart}`,
    `- End: ${response.windowEnd}`,
  ];

  // Calculate window duration
  const start = new Date(response.windowStart);
  const end = new Date(response.windowEnd);
  const durationDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  sections.push(`- Duration: ${durationDays} day${durationDays !== 1 ? 's' : ''}`);

  sections.push(
    '',
    '## Area of Interest',
    `\`\`\``,
    response.aoi,
    `\`\`\``
  );

  // Add imaging parameters if present
  const imagingParams = [];
  if (response.maxCloudCoveragePercent !== undefined) {
    imagingParams.push(`- Max Cloud Coverage: ${response.maxCloudCoveragePercent}%`);
  }
  if (response.maxOffNadirAngle !== undefined) {
    imagingParams.push(`- Max Off-Nadir Angle: ${response.maxOffNadirAngle}°`);
  }
  if (response.priorityItem) {
    imagingParams.push(`- Priority Order: Yes`);
  }

  if (imagingParams.length > 0) {
    sections.push('', '## Imaging Parameters', ...imagingParams);
  }

  sections.push('', '## Delivery Configuration', deliveryInfo);

  // Add optional fields if present
  if (response.label) {
    sections.push('', `## Label`, response.label);
  }

  if (response.orderLabel) {
    sections.push('', `## Order Label`, response.orderLabel);
  }

  if (response.webhookUrl) {
    sections.push('', `## Webhook`, `Notifications will be sent to: ${response.webhookUrl}`);
  }

  // Add important warnings and next steps
  sections.push(
    '',
    '## Important Notes',
    '',
    '### Payment',
    '⚠️  This is a TASKING order and involves significant payment.',
    'Tasking orders are more expensive than archive orders as they require scheduling new satellite captures.',
    'You will be charged according to SkyFi pricing for the requested resolution and area.',
    '',
    '### Delivery Timeline',
    `- Tasking window: ${durationDays} day${durationDays !== 1 ? 's' : ''}`,
    '- Satellite must pass over your AOI during the window with suitable conditions',
    '- Weather and cloud coverage may affect capture success',
    '- Processing and delivery typically occurs within 24-48 hours after successful capture',
    '',
    '### Success Factors',
    '- Clear weather during satellite passes',
    '- Satellite availability and scheduling',
    '- Meeting specified imaging parameters (cloud coverage, angle, etc.)',
    '',
    '### Next Steps',
    '1. Monitor order status via SkyFi dashboard or webhook notifications',
    '2. Wait for satellite pass during the tasking window',
    '3. SkyFi will attempt capture when conditions are favorable',
    '4. Check your delivery destination for imagery files after processing',
    '5. Review capture quality and metadata',
    '',
    '### Order Management',
    '- View order status: https://app.skyfi.com/orders',
    `- Order ID for reference: ${response.id}`,
    '',
    '### Support',
    'If you have questions about this order, contact SkyFi support with the Order ID above.'
  );

  return sections.join('\n');
}

/**
 * Format order placement error for MCP tool output
 *
 * @param error - Error from order placement
 * @returns Formatted error message
 */
export function formatOrderError(error: unknown): string {
  const errorMessage =
    error instanceof Error ? error.message : String(error);

  const sections = [
    '# Order Placement Failed',
    '',
    '## Error',
    errorMessage,
    '',
    '## Common Issues',
    '',
    '### Delivery Configuration',
    '- Ensure delivery driver matches your configuration',
    '- Verify all required fields for your selected driver',
    '- Check credentials are valid and have correct permissions',
    '',
    '### Archive Orders',
    '- Verify archive ID is a valid UUID from SkyFi catalog',
    '- Ensure archive item is available for ordering',
    '',
    '### Tasking Orders',
    '- Verify window start is before window end',
    '- Ensure window times are in ISO 8601 format',
    '- Check product type and resolution are valid combinations',
    '',
    '### Area of Interest',
    '- AOI must be in WKT POLYGON format',
    '- Format: POLYGON((lon lat, lon lat, lon lat, lon lat, lon lat))',
    '- First and last coordinates must be identical (closed polygon)',
    '- Coordinates should be in decimal degrees (longitude, latitude)',
    '',
    '### Authentication',
    '- Verify your SkyFi API key is valid',
    '- Check API key has permissions for order placement',
    '',
    '## Need Help?',
    '- Review SkyFi API documentation: https://docs.skyfi.com',
    '- Contact SkyFi support: support@skyfi.com',
    '- Check order history: https://app.skyfi.com/orders',
  ];

  return sections.join('\n');
}
