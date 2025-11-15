/**
 * Zod validation schemas for feasibility checking
 *
 * Runtime validation schemas for feasibility and pass prediction requests
 * and responses.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { ProductType, Resolution, Provider } from '../types/skyfi-api';
import { FeasibilityCheckStatus } from '../types/feasibility';

/**
 * Validate WKT polygon format
 */
function isValidWKT(wkt: string): boolean {
  // Basic WKT polygon validation
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
 * Schema for ProductType enum
 */
export const ProductTypeSchema = z.nativeEnum(ProductType);

/**
 * Schema for Resolution enum
 */
export const ResolutionSchema = z.nativeEnum(Resolution);

/**
 * Schema for Provider enum
 */
export const ProviderSchema = z.nativeEnum(Provider);

/**
 * Schema for FeasibilityCheckStatus enum
 */
export const FeasibilityCheckStatusSchema = z.nativeEnum(FeasibilityCheckStatus);

/**
 * Schema for pass prediction request
 */
export const PassPredictionRequestSchema = z.object({
  aoi: z
    .string()
    .refine(isValidWKT, 'AOI must be a valid WKT POLYGON format')
    .describe('Area of interest in WKT format'),
  fromDate: z
    .string()
    .refine(isValidISO8601, 'fromDate must be a valid ISO 8601 datetime')
    .describe('Start date for pass prediction search'),
  toDate: z
    .string()
    .refine(isValidISO8601, 'toDate must be a valid ISO 8601 datetime')
    .describe('End date for pass prediction search'),
  productTypes: z.array(ProductTypeSchema).optional(),
  resolutions: z.array(ResolutionSchema).optional(),
  maxOffNadirAngle: z.number().min(0).max(90).optional().default(30.0),
});

/**
 * Schema for satellite pass
 */
export const SatellitePassSchema = z.object({
  provider: ProviderSchema,
  satname: z.string(),
  satid: z.string(),
  noradid: z.string(),
  node: z.string(),
  productType: ProductTypeSchema,
  resolution: ResolutionSchema,
  lat: z.number(),
  lon: z.number(),
  passDate: z.string(),
  meanT: z.number(),
  offNadirAngle: z.number(),
  solarElevationAngle: z.number(),
  minSquareKms: z.number(),
  maxSquareKms: z.number(),
  priceForOneSquareKm: z.number(),
  priceForOneSquareKmCents: z.number().optional(),
  gsdDegMin: z.number(),
  gsdDegMax: z.number(),
});

/**
 * Schema for pass prediction response
 */
export const PassPredictionResponseSchema = z.object({
  passes: z.array(SatellitePassSchema),
});

/**
 * Schema for feasibility check request
 */
export const FeasibilityCheckRequestSchema = z.object({
  aoi: z
    .string()
    .refine(isValidWKT, 'AOI must be a valid WKT POLYGON format')
    .describe('Area of interest in WKT format'),
  productType: ProductTypeSchema.describe('Product type for feasibility check'),
  resolution: ResolutionSchema.describe('Resolution for feasibility check'),
  startDate: z
    .string()
    .refine(isValidISO8601, 'startDate must be a valid ISO 8601 datetime')
    .describe('Start date for feasibility check'),
  endDate: z
    .string()
    .refine(isValidISO8601, 'endDate must be a valid ISO 8601 datetime')
    .describe('End date for feasibility check'),
  maxCloudCoveragePercent: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Maximum cloud coverage percentage (0-100)'),
  priorityItem: z.boolean().optional(),
  requiredProvider: z.enum(['PLANET', 'UMBRA']).optional(),
  sarParameters: z.record(z.unknown()).optional().default({}),
});

/**
 * Schema for capture opportunity
 */
export const OpportunitySchema = z.object({
  windowStart: z.string(),
  windowEnd: z.string(),
  satelliteId: z.string().optional(),
  providerWindowId: z.string().uuid().optional(),
  providerMetadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for provider score
 */
export const ProviderScoreSchema = z.object({
  provider: z.string().optional(),
  score: z.number(),
  status: FeasibilityCheckStatusSchema.optional(),
  reference: z.string().optional(),
  opportunities: z.array(OpportunitySchema).default([]),
});

/**
 * Schema for cloud coverage
 */
export const CloudCoverageSchema = z.object({
  date: z.string(),
  coverage: z.number().min(0).max(100),
});

/**
 * Schema for weather details
 */
export const WeatherDetailsSchema = z.object({
  weatherScore: z.number(),
  clouds: z.array(CloudCoverageSchema).optional(),
});

/**
 * Schema for weather score
 */
export const WeatherScoreSchema = z.object({
  weatherScore: z.number(),
  weatherDetails: WeatherDetailsSchema.optional(),
});

/**
 * Schema for provider combined score
 */
export const ProviderCombinedScoreSchema = z.object({
  score: z.number(),
  providerScores: z.array(ProviderScoreSchema).optional(),
});

/**
 * Schema for feasibility score
 */
export const FeasibilityScoreSchema = z.object({
  feasibility: z.number(),
  weatherScore: WeatherScoreSchema.optional(),
  providerScore: ProviderCombinedScoreSchema,
});

/**
 * Schema for feasibility check response
 */
export const FeasibilityCheckResponseSchema = z.object({
  id: z.string().uuid(),
  validUntil: z.string(),
  overallScore: FeasibilityScoreSchema.nullable(),
});

/**
 * Validate and parse pass prediction request
 *
 * @param data - Request data to validate
 * @returns Validated request
 * @throws {z.ZodError} If validation fails
 */
export function validatePassPredictionRequest(data: unknown) {
  return PassPredictionRequestSchema.parse(data);
}

/**
 * Validate and parse feasibility check request
 *
 * @param data - Request data to validate
 * @returns Validated request
 * @throws {z.ZodError} If validation fails
 */
export function validateFeasibilityCheckRequest(data: unknown) {
  return FeasibilityCheckRequestSchema.parse(data);
}

/**
 * Validate and parse pass prediction response
 *
 * @param data - Response data to validate
 * @returns Validated response
 * @throws {z.ZodError} If validation fails
 */
export function validatePassPredictionResponse(data: unknown) {
  return PassPredictionResponseSchema.parse(data);
}

/**
 * Validate and parse feasibility check response
 *
 * @param data - Response data to validate
 * @returns Validated response
 * @throws {z.ZodError} If validation fails
 */
export function validateFeasibilityCheckResponse(data: unknown) {
  return FeasibilityCheckResponseSchema.parse(data);
}
