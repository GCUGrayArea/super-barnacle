/**
 * MCP Tool: Create Monitoring Notification
 *
 * This tool enables creating monitoring notifications (webhooks) that trigger
 * when new satellite imagery matching specific criteria becomes available in the
 * SkyFi archive.
 */

import { z } from 'zod';
import { SkyFiClient } from '../../skyfi/client.js';
import { createNotification } from '../../skyfi/notifications.js';
import { ValidationError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { CreateNotificationInputSchema } from '../schemas/notifications.schemas.js';
import {
  formatCreateNotificationResult,
  formatValidationError,
} from '../formatters/notification-results.js';
import type { CreateNotificationParams } from '../../types/notifications.js';
import { ProductType, Resolution, Provider } from '../../types/notifications.js';

/**
 * Tool name for MCP registration
 */
export const TOOL_NAME = 'create_monitoring_notification';

/**
 * Tool description for MCP clients
 */
export const TOOL_DESCRIPTION = `Create a new monitoring notification to receive webhooks when new satellite imagery becomes available.

This tool sets up automated alerts for your specified Area of Interest (AOI). When new imagery matching your criteria is added to the SkyFi archive, your webhook endpoint will receive a POST request with details about the new imagery.

Use Cases:
- Monitor construction sites for progress updates
- Track environmental changes in specific regions
- Get alerts for new disaster/emergency imagery
- Automate imagery ingestion pipelines

Requirements:
- Webhook URL must be publicly accessible via HTTPS (HTTP allowed for local dev/testing)
- AOI must be in WKT POLYGON format (max 500 vertices, max 500k sqkm)
- All filters are optional - without filters, all new imagery in the AOI will trigger notifications

For local development/testing, consider using:
- webhook.site: Get a temporary webhook URL for testing
- ngrok: Tunnel your local server to a public HTTPS URL
- localtunnel: Another option for tunneling

The webhook will receive POST requests with this payload:
{
  "notificationId": "uuid",
  "timestamp": "ISO-8601 timestamp",
  "event": "NEW_IMAGERY_AVAILABLE",
  "archives": [{
    "archiveId": "uuid",
    "provider": "MAXAR|PLANET|etc",
    "productType": "DAY|MULTISPECTRAL|SAR",
    "resolution": "HIGH|MEDIUM|etc",
    "captureTimestamp": "ISO-8601 timestamp",
    "cloudCoveragePercent": 5,
    "footprint": "WKT POLYGON",
    "thumbnailUrls": {"small": "url", "medium": "url"}
  }]
}`;

/**
 * Tool input schema for MCP
 */
export const TOOL_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    aoi: {
      type: 'string',
      description:
        'Area of Interest in WKT POLYGON format. Example: "POLYGON((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))". Maximum 500 vertices, max 500,000 sqkm area.',
    },
    webhookUrl: {
      type: 'string',
      description:
        'Webhook URL to receive POST notifications. Must be publicly accessible via HTTPS (HTTP allowed for local dev). Example: "https://your-app.com/webhooks/skyfi"',
    },
    filters: {
      type: 'object',
      description: 'Optional filter criteria for imagery notifications',
      properties: {
        productTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['DAY', 'MULTISPECTRAL', 'SAR'],
          },
          description: 'Product types to monitor (DAY, MULTISPECTRAL, SAR)',
        },
        resolutions: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
          },
          description: 'Resolution levels to monitor',
        },
        providers: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['PLANET', 'MAXAR', 'UMBRA', 'CAPELLA', 'AIRBUS', 'BLACKSKY', 'SENTINEL2'],
          },
          description: 'Satellite providers to monitor',
        },
        maxCloudCoveragePercent: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'Maximum cloud coverage percentage (0-100)',
        },
        maxOffNadirAngle: {
          type: 'number',
          minimum: 0,
          maximum: 90,
          description: 'Maximum off-nadir angle in degrees (0-90)',
        },
        openData: {
          type: 'boolean',
          description: 'Filter for open data only',
        },
      },
    },
    name: {
      type: 'string',
      description: 'Optional name/description for the notification (max 255 characters)',
    },
  },
  required: ['aoi', 'webhookUrl'],
} as const;

/**
 * Convert string enum values to typed enums
 */
function convertFilters(filters?: {
  productTypes?: string[];
  resolutions?: string[];
  providers?: string[];
  maxCloudCoveragePercent?: number;
  maxOffNadirAngle?: number;
  openData?: boolean;
}): CreateNotificationParams['filters'] {
  if (!filters) {
    return undefined;
  }

  return {
    productTypes: filters.productTypes?.map((pt) => pt as ProductType),
    resolutions: filters.resolutions?.map((r) => r as Resolution),
    providers: filters.providers?.map((p) => p as Provider),
    maxCloudCoveragePercent: filters.maxCloudCoveragePercent,
    maxOffNadirAngle: filters.maxOffNadirAngle,
    openData: filters.openData,
  };
}

/**
 * Execute the create notification tool
 */
export async function executeCreateNotification(
  client: SkyFiClient,
  args: unknown
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('MCP Tool: create_monitoring_notification called', { args });

  try {
    // Validate input
    const validatedInput = CreateNotificationInputSchema.parse(args);

    // Convert to API params
    const params: CreateNotificationParams = {
      aoi: validatedInput.aoi,
      webhookUrl: validatedInput.webhookUrl,
      filters: convertFilters(validatedInput.filters),
      name: validatedInput.name,
    };

    // Call SkyFi API
    const response = await createNotification(client, params);

    // Format result
    const formattedResult = formatCreateNotificationResult(response);

    logger.info('MCP Tool: create_monitoring_notification completed', {
      notificationId: response.notification.id,
    });

    return {
      content: [
        {
          type: 'text',
          text: formattedResult,
        },
      ],
    };
  } catch (error) {
    logger.error('MCP Tool: create_monitoring_notification failed', { error });

    // Format validation errors nicely
    if (error instanceof z.ZodError) {
      const validationError = new ValidationError(
        error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
      throw new Error(formatValidationError(validationError));
    }

    if (error instanceof ValidationError) {
      throw new Error(formatValidationError(error));
    }

    // Re-throw other errors
    throw error;
  }
}
