/**
 * MCP Tool: Predict Satellite Passes
 *
 * Predicts when satellites will pass over an area of interest during a
 * specified time window. Returns detailed pass information including timing,
 * pricing, and imaging parameters.
 */

import { z } from 'zod';
import { logger } from '../../lib/logger.js';
import { FeasibilityService } from '../../skyfi/feasibility.js';
import { SkyFiClient } from '../../skyfi/client.js';
import { ProductType, Resolution } from '../../types/skyfi-api.js';
import { PredictSatellitePassesInputSchema } from '../schemas/feasibility.schemas.js';
import { formatPassPredictionResult } from '../formatters/feasibility-results.js';

/**
 * Map user-friendly product types to API enums
 */
function mapProductTypes(productTypes?: string[]): ProductType[] | undefined {
  if (!productTypes) return undefined;

  const mapping: Record<string, ProductType> = {
    Day: ProductType.Day,
    Night: ProductType.Night,
    SAR: ProductType.SAR,
  };

  return productTypes.map((pt) => mapping[pt] || ProductType.Day);
}

/**
 * Map user-friendly resolutions to API enums
 */
function mapResolutions(resolutions?: string[]): Resolution[] | undefined {
  if (!resolutions) return undefined;

  const mapping: Record<string, Resolution> = {
    VeryLow: Resolution.Low,
    Low: Resolution.Low,
    Medium: Resolution.Medium,
    High: Resolution.High,
    VeryHigh: Resolution.VeryHigh,
  };

  return resolutions.map((res) => mapping[res] || Resolution.Medium);
}

/**
 * Tool definition for MCP server
 */
export const predictSatellitePassesTool = {
  name: 'predict_satellite_passes',
  description:
    'Predict when satellites will pass over an area of interest. ' +
    'Returns detailed information about satellite passes including timing, pricing, ' +
    'off-nadir angles, and coverage areas. Use this tool to plan tasking orders ' +
    'and identify optimal capture opportunities.',
  inputSchema: {
    type: 'object',
    properties: {
      aoi: {
        type: 'string',
        description:
          'Area of interest in WKT POLYGON format. Example: POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
      },
      windowStart: {
        type: 'string',
        description:
          'Start of prediction window in ISO 8601 format. Example: 2025-01-15T00:00:00Z',
      },
      windowEnd: {
        type: 'string',
        description:
          'End of prediction window in ISO 8601 format. Example: 2025-01-22T23:59:59Z',
      },
      productTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['Day', 'Night', 'SAR'],
        },
        description:
          'Filter by product types: Day (optical daytime), Night (optical nighttime), or SAR (radar)',
      },
      resolutions: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['VeryLow', 'Low', 'Medium', 'High', 'VeryHigh'],
        },
        description:
          'Filter by image resolutions: VeryLow (>5m), Low (2.5-5m), Medium (1.5-2.5m), High (0.75-1.5m), VeryHigh (<0.75m)',
      },
      maxOffNadirAngle: {
        type: 'number',
        description:
          'Maximum off-nadir angle in degrees (0-90). Lower angles give better image quality. Default: 30',
        minimum: 0,
        maximum: 90,
        default: 30.0,
      },
    },
    required: ['aoi', 'windowStart', 'windowEnd'],
  } as const,
};

/**
 * Execute the predict_satellite_passes tool
 */
export async function executePredictSatellitePasses(
  client: SkyFiClient,
  args: unknown,
): Promise<string> {
  try {
    // Validate input
    const input = PredictSatellitePassesInputSchema.parse(args);

    logger.info('Executing predict_satellite_passes tool', {
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      productTypes: input.productTypes,
      resolutions: input.resolutions,
      maxOffNadirAngle: input.maxOffNadirAngle,
    });

    // Create feasibility service
    const feasibilityService = new FeasibilityService(client);

    // Map input to API request format
    const request = {
      aoi: input.aoi,
      fromDate: input.windowStart,
      toDate: input.windowEnd,
      productTypes: mapProductTypes(input.productTypes),
      resolutions: mapResolutions(input.resolutions),
      maxOffNadirAngle: input.maxOffNadirAngle,
    };

    // Call SkyFi API
    const result = await feasibilityService.predictPasses(request);

    logger.info('Satellite pass prediction completed', {
      passCount: result.passes.length,
    });

    // Format result for MCP output
    return formatPassPredictionResult(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      logger.error('Invalid input for predict_satellite_passes', {
        errors: errorMessages,
      });
      return `❌ Invalid input parameters:\n\n${errorMessages}\n\nPlease check the tool documentation for required parameters and formats.`;
    }

    logger.error('Error executing predict_satellite_passes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return `❌ Error predicting satellite passes: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support if the issue persists.`;
  }
}
