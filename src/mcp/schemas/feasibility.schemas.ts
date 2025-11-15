/**
 * MCP Tool Input Schemas for Feasibility Checking
 *
 * Zod schemas for validating MCP tool input parameters for feasibility
 * checking and satellite pass prediction.
 */

import { z } from 'zod';

/**
 * Validate WKT polygon format
 */
function isValidWKT(wkt: string): boolean {
  const wktPattern = /^POLYGON\s*\(\s*\(.+\)\s*\)$/i;
  return wktPattern.test(wkt.trim());
}

/**
 * Validate ISO 8601 datetime string
 */
function isValidISO8601(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !Number.isNaN(date.getTime());
}

/**
 * Schema for check_tasking_feasibility tool input
 */
export const CheckTaskingFeasibilityInputSchema = z.object({
  aoi: z
    .string()
    .refine(isValidWKT, {
      message: 'AOI must be a valid WKT POLYGON format (e.g., POLYGON((lon lat, lon lat, ...)))',
    })
    .describe('Area of interest in WKT POLYGON format'),

  productType: z
    .enum(['Day', 'Night', 'SAR'])
    .describe('Product type: Day (optical daytime), Night (optical nighttime), or SAR (radar)'),

  resolution: z
    .enum(['VeryLow', 'Low', 'Medium', 'High', 'VeryHigh'])
    .describe('Image resolution: VeryLow (>5m), Low (2.5-5m), Medium (1.5-2.5m), High (0.75-1.5m), VeryHigh (<0.75m)'),

  windowStart: z
    .string()
    .refine(isValidISO8601, {
      message: 'windowStart must be a valid ISO 8601 datetime (e.g., 2025-01-15T00:00:00Z)',
    })
    .describe('Start of capture window in ISO 8601 format'),

  windowEnd: z
    .string()
    .refine(isValidISO8601, {
      message: 'windowEnd must be a valid ISO 8601 datetime (e.g., 2025-01-22T23:59:59Z)',
    })
    .describe('End of capture window in ISO 8601 format'),

  maxCloudCoverage: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Maximum acceptable cloud coverage percentage (0-100). Lower values increase feasibility score.'),

  maxOffNadirAngle: z
    .number()
    .min(0)
    .max(90)
    .optional()
    .describe('Maximum off-nadir angle in degrees (0-90). Lower angles give better image quality.'),

  providers: z
    .array(z.enum(['PLANET', 'UMBRA']))
    .optional()
    .describe('Optional filter for specific satellite providers'),
});

/**
 * Schema for predict_satellite_passes tool input
 */
export const PredictSatellitePassesInputSchema = z.object({
  aoi: z
    .string()
    .refine(isValidWKT, {
      message: 'AOI must be a valid WKT POLYGON format (e.g., POLYGON((lon lat, lon lat, ...)))',
    })
    .describe('Area of interest in WKT POLYGON format'),

  windowStart: z
    .string()
    .refine(isValidISO8601, {
      message: 'windowStart must be a valid ISO 8601 datetime (e.g., 2025-01-15T00:00:00Z)',
    })
    .describe('Start of prediction window in ISO 8601 format'),

  windowEnd: z
    .string()
    .refine(isValidISO8601, {
      message: 'windowEnd must be a valid ISO 8601 datetime (e.g., 2025-01-22T23:59:59Z)',
    })
    .describe('End of prediction window in ISO 8601 format'),

  productTypes: z
    .array(z.enum(['Day', 'Night', 'SAR']))
    .optional()
    .describe('Filter by product types (optical day/night or SAR radar)'),

  resolutions: z
    .array(z.enum(['VeryLow', 'Low', 'Medium', 'High', 'VeryHigh']))
    .optional()
    .describe('Filter by image resolutions'),

  maxOffNadirAngle: z
    .number()
    .min(0)
    .max(90)
    .optional()
    .default(30.0)
    .describe('Maximum off-nadir angle in degrees (default: 30). Lower angles give better image quality.'),
});

/**
 * Infer TypeScript types from schemas
 */
export type CheckTaskingFeasibilityInput = z.infer<typeof CheckTaskingFeasibilityInputSchema>;
export type PredictSatellitePassesInput = z.infer<typeof PredictSatellitePassesInputSchema>;
