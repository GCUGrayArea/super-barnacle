/**
 * MCP Tool: Check Tasking Feasibility
 *
 * Checks if a satellite tasking order is viable for the specified area,
 * time window, and requirements. Returns feasibility score and capture
 * opportunities with provider_window_id for ordering.
 */

import { z } from 'zod';
import { logger } from '../../lib/logger.js';
import { FeasibilityService } from '../../skyfi/feasibility.js';
import { SkyFiClient } from '../../skyfi/client.js';
import { ProductType, Resolution } from '../../types/skyfi-api.js';
import { CheckTaskingFeasibilityInputSchema } from '../schemas/feasibility.schemas.js';
import { formatFeasibilityCheckResult } from '../formatters/feasibility-results.js';

/**
 * Map user-friendly product type to API enum
 */
function mapProductType(productType: string): ProductType {
  const mapping: Record<string, ProductType> = {
    Day: ProductType.Day,
    Night: ProductType.Night,
    SAR: ProductType.SAR,
  };
  return mapping[productType] || ProductType.Day;
}

/**
 * Map user-friendly resolution to API enum
 */
function mapResolution(resolution: string): Resolution {
  const mapping: Record<string, Resolution> = {
    VeryLow: Resolution.Low,
    Low: Resolution.Low,
    Medium: Resolution.Medium,
    High: Resolution.High,
    VeryHigh: Resolution.VeryHigh,
  };
  return mapping[resolution] || Resolution.Medium;
}

/**
 * Tool definition for MCP server
 */
export const checkTaskingFeasibilityTool = {
  name: 'check_tasking_feasibility',
  description:
    'Check if a satellite tasking order is viable for a specific area and time window. ' +
    'Returns a feasibility score, weather forecast, and available capture opportunities. ' +
    'IMPORTANT: The response includes provider_window_id which is REQUIRED for Planet orders. ' +
    'Use this tool before placing an order to ensure the request can be fulfilled.',
  inputSchema: {
    type: 'object',
    properties: {
      aoi: {
        type: 'string',
        description:
          'Area of interest in WKT POLYGON format. Example: POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
      },
      productType: {
        type: 'string',
        enum: ['Day', 'Night', 'SAR'],
        description:
          'Product type: Day (optical daytime), Night (optical nighttime), or SAR (radar)',
      },
      resolution: {
        type: 'string',
        enum: ['VeryLow', 'Low', 'Medium', 'High', 'VeryHigh'],
        description:
          'Image resolution: VeryLow (>5m), Low (2.5-5m), Medium (1.5-2.5m), High (0.75-1.5m), VeryHigh (<0.75m)',
      },
      windowStart: {
        type: 'string',
        description:
          'Start of capture window in ISO 8601 format. Example: 2025-01-15T00:00:00Z',
      },
      windowEnd: {
        type: 'string',
        description:
          'End of capture window in ISO 8601 format. Example: 2025-01-22T23:59:59Z',
      },
      maxCloudCoverage: {
        type: 'number',
        description:
          'Maximum acceptable cloud coverage percentage (0-100). Lower values increase feasibility score.',
        minimum: 0,
        maximum: 100,
      },
      maxOffNadirAngle: {
        type: 'number',
        description:
          'Maximum off-nadir angle in degrees (0-90). Lower angles give better image quality.',
        minimum: 0,
        maximum: 90,
      },
      providers: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['PLANET', 'UMBRA'],
        },
        description: 'Optional filter for specific satellite providers',
      },
    },
    required: ['aoi', 'productType', 'resolution', 'windowStart', 'windowEnd'],
  } as const,
};

/**
 * Execute the check_tasking_feasibility tool
 */
export async function executeCheckTaskingFeasibility(
  client: SkyFiClient,
  args: unknown,
): Promise<string> {
  try {
    // Validate input
    const input = CheckTaskingFeasibilityInputSchema.parse(args);

    logger.info('Executing check_tasking_feasibility tool', {
      productType: input.productType,
      resolution: input.resolution,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
    });

    // Create feasibility service
    const feasibilityService = new FeasibilityService(client);

    // Map input to API request format
    const request = {
      aoi: input.aoi,
      productType: mapProductType(input.productType),
      resolution: mapResolution(input.resolution),
      startDate: input.windowStart,
      endDate: input.windowEnd,
      maxCloudCoveragePercent: input.maxCloudCoverage,
      requiredProvider: input.providers?.[0] as 'PLANET' | 'UMBRA' | undefined,
    };

    // Call SkyFi API
    const result = await feasibilityService.checkFeasibility(request);

    logger.info('Feasibility check completed', {
      feasibilityId: result.id,
      score: result.overallScore?.feasibility,
    });

    // Format result for MCP output
    return formatFeasibilityCheckResult(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      logger.error('Invalid input for check_tasking_feasibility', {
        errors: errorMessages,
      });
      return `❌ Invalid input parameters:\n\n${errorMessages}\n\nPlease check the tool documentation for required parameters and formats.`;
    }

    logger.error('Error executing check_tasking_feasibility', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return `❌ Error checking feasibility: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support if the issue persists.`;
  }
}
