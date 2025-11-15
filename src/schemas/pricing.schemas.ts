/**
 * Zod validation schemas for pricing API
 *
 * Runtime validation schemas for pricing requests and responses
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { ProductType, Resolution, Provider } from '@/types/skyfi-api';

/**
 * WKT (Well-Known Text) polygon validation
 * Basic validation - checks for POLYGON prefix
 */
const wktPolygonRegex = /^POLYGON\s*\(\(/i;

/**
 * Validate WKT polygon format
 */
export function isValidWKT(value: string): boolean {
  return wktPolygonRegex.test(value.trim());
}

/**
 * Product type enum schema
 */
export const ProductTypeSchema = z.nativeEnum(ProductType);

/**
 * Resolution enum schema
 */
export const ResolutionSchema = z.nativeEnum(Resolution);

/**
 * Provider enum schema
 */
export const ProviderSchema = z.nativeEnum(Provider);

/**
 * Pricing request schema
 */
export const PricingRequestSchema = z.object({
  aoi: z
    .string()
    .refine(isValidWKT, {
      message: 'AOI must be a valid WKT POLYGON',
    })
    .optional()
    .nullable(),
});

/**
 * Provider pricing schema
 */
export const ProviderPricingSchema = z.object({
  provider: ProviderSchema,
  pricePerSqKm: z.number().positive(),
  minPrice: z.number().nonnegative(),
  maxPrice: z.number().positive().optional(),
  currency: z.string().length(3), // e.g., 'USD'
  notes: z.string().optional(),
  available: z.boolean(),
});

/**
 * Pricing tier schema
 */
export const PricingTierSchema = z.object({
  minAreaSqKm: z.number().nonnegative(),
  maxAreaSqKm: z.number().positive().optional(),
  pricePerSqKm: z.number().positive(),
  label: z.string(),
});

/**
 * Resolution pricing schema
 */
export const ResolutionPricingSchema = z.object({
  resolution: ResolutionSchema,
  providers: z.array(ProviderPricingSchema),
  tiers: z.array(PricingTierSchema).optional(),
  useCases: z.array(z.string()).optional(),
  gsd: z.string().optional(),
});

/**
 * Product type pricing schema
 */
export const ProductTypePricingSchema = z.object({
  productType: ProductTypeSchema,
  resolutions: z.array(ResolutionPricingSchema),
  description: z.string().optional(),
  deliveryTime: z.string().optional(),
});

/**
 * Pricing response schema
 */
export const PricingResponseSchema = z.object({
  productTypes: z.record(z.unknown()),
  metadata: z
    .object({
      lastUpdated: z.string().optional(),
      currency: z.string().optional(),
      pricingGuideUrl: z.string().url().optional(),
    })
    .optional(),
});

/**
 * Structured pricing schema
 */
export const StructuredPricingSchema = z.object({
  productTypes: z.array(ProductTypePricingSchema),
  currency: z.string().length(3),
  lastUpdated: z.string().optional(),
  pricingGuideUrl: z.string().url().optional(),
});

/**
 * Cost estimate parameters schema
 */
export const CostEstimateParamsSchema = z.object({
  productType: ProductTypeSchema,
  resolution: ResolutionSchema,
  areaSqKm: z.number().positive().max(500000, {
    message: 'Area must not exceed 500,000 square kilometers',
  }),
  provider: ProviderSchema.optional(),
});

/**
 * Cost estimate result schema
 */
export const CostEstimateSchema = z.object({
  totalCost: z.number().nonnegative(),
  currency: z.string().length(3),
  pricePerSqKm: z.number().positive(),
  areaSqKm: z.number().positive(),
  productType: ProductTypeSchema,
  resolution: ResolutionSchema,
  provider: ProviderSchema,
  tier: PricingTierSchema.optional(),
  breakdown: z
    .object({
      baseCost: z.number().nonnegative(),
      discounts: z.number().optional(),
      fees: z.number().optional(),
    })
    .optional(),
});

/**
 * Price comparison schema
 */
export const PriceComparisonSchema = z.object({
  original: CostEstimateSchema,
  alternatives: z.array(CostEstimateSchema),
  cheapest: CostEstimateSchema,
  potentialSavings: z.number().nonnegative(),
});

/**
 * Validate pricing request
 *
 * @param data - Pricing request data
 * @returns Validated pricing request
 * @throws {z.ZodError} If validation fails
 */
export function validatePricingRequest(data: unknown): z.infer<typeof PricingRequestSchema> {
  return PricingRequestSchema.parse(data);
}

/**
 * Validate pricing response
 *
 * @param data - Pricing response data
 * @returns Validated pricing response
 * @throws {z.ZodError} If validation fails
 */
export function validatePricingResponse(data: unknown): z.infer<typeof PricingResponseSchema> {
  return PricingResponseSchema.parse(data);
}

/**
 * Validate cost estimate parameters
 *
 * @param data - Cost estimate parameters
 * @returns Validated parameters
 * @throws {z.ZodError} If validation fails
 */
export function validateCostEstimateParams(
  data: unknown,
): z.infer<typeof CostEstimateParamsSchema> {
  return CostEstimateParamsSchema.parse(data);
}
