/**
 * MCP Pricing Tool Input Schemas
 *
 * JSON Schema definitions for the get_pricing_info MCP tool input parameters.
 *
 * @packageDocumentation
 */

/**
 * Input schema for get_pricing_info tool
 *
 * All parameters are optional to allow flexible queries:
 * - No parameters: Return all pricing information
 * - productType only: Filter by product type
 * - resolution only: Filter by resolution across all products
 * - provider only: Filter by provider across all products/resolutions
 * - aoiSqkm: Include cost estimates for the given AOI size
 */
export const GetPricingInfoSchema = {
  type: 'object' as const,
  properties: {
    productType: {
      type: 'string' as const,
      enum: ['DAY', 'NIGHT', 'VIDEO', 'MULTISPECTRAL', 'HYPERSPECTRAL', 'SAR', 'STEREO'],
      description:
        'Optional product type to filter pricing. If not specified, returns pricing for all product types.',
    },
    resolution: {
      type: 'string' as const,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY HIGH', 'SUPER HIGH', 'ULTRA HIGH', 'CM 30', 'CM 50'],
      description:
        'Optional resolution to filter pricing. If not specified, returns pricing for all resolutions.',
    },
    provider: {
      type: 'string' as const,
      enum: [
        'SIWEI',
        'SATELLOGIC',
        'UMBRA',
        'TAILWIND',
        'GEOSAT',
        'SENTINEL2',
        'SENTINEL2_CREODIAS',
        'PLANET',
        'IMPRO',
        'URBAN_SKY',
        'NSL',
        'VEXCEL',
        'ICEYE_US',
      ],
      description:
        'Optional provider to filter pricing. If not specified, returns pricing for all providers.',
    },
    aoiSqkm: {
      type: 'number' as const,
      minimum: 0.01,
      maximum: 500000,
      description:
        'Optional area of interest in square kilometers. When provided, includes cost estimates for this area size.',
    },
  },
  additionalProperties: false,
};

/**
 * Type definition for get_pricing_info input parameters
 */
export interface GetPricingInfoInput {
  productType?: string;
  resolution?: string;
  provider?: string;
  aoiSqkm?: number;
}
