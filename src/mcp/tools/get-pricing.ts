/**
 * Get Pricing Info MCP Tool
 *
 * MCP tool for retrieving SkyFi pricing information and cost estimates.
 * Provides comprehensive pricing data with optional filtering by product type,
 * resolution, provider, and cost estimates for specific AOI sizes.
 *
 * @packageDocumentation
 */

import { SkyFiClient } from '../../skyfi/client.js';
import { getPricing, parseStructuredPricing } from '../../skyfi/pricing.js';
import { calculateCost } from '../../lib/pricing-calculator.js';
import { ProductType, Resolution, Provider } from '../../types/skyfi-api.js';
import { CostEstimate, StructuredPricing } from '../../types/pricing.js';
import { logger } from '../../lib/logger.js';
import {
  formatPricingResults,
  formatPricingError,
  formatLargeAOIWarning,
} from '../formatters/pricing-results.js';
import {
  GetPricingInfoSchema,
  GetPricingInfoInput,
} from '../schemas/pricing.schemas.js';

/**
 * Large AOI threshold in square kilometers
 * AOIs larger than this will trigger a warning
 */
const LARGE_AOI_THRESHOLD = 10000;

/**
 * Get pricing information tool
 *
 * Retrieves comprehensive pricing information from SkyFi API,
 * with optional filtering and cost estimates.
 *
 * @param client - SkyFi API client instance
 * @param input - Tool input parameters
 * @returns Formatted pricing information
 */
export async function getPricingInfo(
  client: SkyFiClient,
  input: GetPricingInfoInput = {},
): Promise<string> {
  try {
    logger.info('Getting pricing information', {
      productType: input.productType,
      resolution: input.resolution,
      provider: input.provider,
      aoiSqkm: input.aoiSqkm,
    });

    // Validate inputs
    const validatedInput = validatePricingInput(input);

    // Fetch pricing from API
    const pricingResponse = await getPricing(client);
    const structuredPricing = parseStructuredPricing(pricingResponse);

    // Apply filters to structured pricing
    const filteredPricing = applyFilters(structuredPricing, validatedInput);

    // Calculate cost estimates if AOI size provided
    let costEstimates: CostEstimate[] | undefined;
    if (validatedInput.aoiSqkm) {
      costEstimates = calculateCostEstimates(filteredPricing, validatedInput.aoiSqkm);
    }

    // Format results
    let result = formatPricingResults(
      filteredPricing,
      {
        productType: validatedInput.productType,
        resolution: validatedInput.resolution,
        provider: validatedInput.provider,
        aoiSqkm: validatedInput.aoiSqkm,
      },
      costEstimates,
    );

    // Add warning for large AOIs
    if (validatedInput.aoiSqkm && validatedInput.aoiSqkm > LARGE_AOI_THRESHOLD) {
      result += formatLargeAOIWarning(validatedInput.aoiSqkm);
    }

    logger.info('Pricing information retrieved successfully');
    return result;
  } catch (error) {
    logger.error('Failed to get pricing information', { error });
    return formatPricingError(error, 'Retrieving pricing information');
  }
}

/**
 * Validate pricing tool input
 *
 * @param input - Raw input parameters
 * @returns Validated input with proper types
 */
function validatePricingInput(input: GetPricingInfoInput): {
  productType?: ProductType;
  resolution?: Resolution;
  provider?: Provider;
  aoiSqkm?: number;
} {
  const validated: {
    productType?: ProductType;
    resolution?: Resolution;
    provider?: Provider;
    aoiSqkm?: number;
  } = {};

  // Validate product type
  if (input.productType) {
    if (!Object.values(ProductType).includes(input.productType as ProductType)) {
      throw new Error(
        `Invalid product type: ${input.productType}. Valid options: ${Object.values(ProductType).join(', ')}`,
      );
    }
    validated.productType = input.productType as ProductType;
  }

  // Validate resolution
  if (input.resolution) {
    if (!Object.values(Resolution).includes(input.resolution as Resolution)) {
      throw new Error(
        `Invalid resolution: ${input.resolution}. Valid options: ${Object.values(Resolution).join(', ')}`,
      );
    }
    validated.resolution = input.resolution as Resolution;
  }

  // Validate provider
  if (input.provider) {
    if (!Object.values(Provider).includes(input.provider as Provider)) {
      throw new Error(
        `Invalid provider: ${input.provider}. Valid options: ${Object.values(Provider).join(', ')}`,
      );
    }
    validated.provider = input.provider as Provider;
  }

  // Validate AOI size
  if (input.aoiSqkm !== undefined) {
    if (typeof input.aoiSqkm !== 'number' || input.aoiSqkm <= 0) {
      throw new Error('AOI size must be a positive number');
    }
    if (input.aoiSqkm > 500000) {
      throw new Error('AOI size must not exceed 500,000 square kilometers');
    }
    validated.aoiSqkm = input.aoiSqkm;
  }

  return validated;
}

/**
 * Apply filters to pricing data
 *
 * @param pricing - Structured pricing data
 * @param filters - Filters to apply
 * @returns Filtered pricing data
 */
function applyFilters(
  pricing: StructuredPricing,
  filters: {
    productType?: ProductType;
    resolution?: Resolution;
    provider?: Provider;
  },
): StructuredPricing {
  let productTypes = pricing.productTypes;

  // Filter by product type
  if (filters.productType) {
    productTypes = productTypes.filter((p) => p.productType === filters.productType);
  }

  // Filter by resolution
  if (filters.resolution) {
    productTypes = productTypes
      .map((p) => ({
        ...p,
        resolutions: p.resolutions.filter((r) => r.resolution === filters.resolution),
      }))
      .filter((p) => p.resolutions.length > 0);
  }

  // Filter by provider
  if (filters.provider) {
    productTypes = productTypes
      .map((p) => ({
        ...p,
        resolutions: p.resolutions
          .map((r) => ({
            ...r,
            providers: r.providers.filter((prov) => prov.provider === filters.provider),
          }))
          .filter((r) => r.providers.length > 0),
      }))
      .filter((p) => p.resolutions.length > 0);
  }

  return {
    ...pricing,
    productTypes,
  };
}

/**
 * Calculate cost estimates for all matching product/resolution/provider combinations
 *
 * @param pricing - Filtered pricing data
 * @param aoiSqkm - AOI size in square kilometers
 * @returns Array of cost estimates
 */
function calculateCostEstimates(
  pricing: StructuredPricing,
  aoiSqkm: number,
): CostEstimate[] {
  const estimates: CostEstimate[] = [];

  for (const product of pricing.productTypes) {
    for (const resolution of product.resolutions) {
      for (const provider of resolution.providers) {
        if (!provider.available) {
          continue;
        }

        try {
          const estimate = calculateCost(
            {
              productType: product.productType,
              resolution: resolution.resolution,
              areaSqKm: aoiSqkm,
              provider: provider.provider,
            },
            pricing,
          );
          estimates.push(estimate);
        } catch (error) {
          // Skip combinations that fail calculation
          logger.debug('Skipping cost estimate calculation', {
            productType: product.productType,
            resolution: resolution.resolution,
            provider: provider.provider,
            error,
          });
        }
      }
    }
  }

  // Sort by total cost (ascending)
  estimates.sort((a, b) => a.totalCost - b.totalCost);

  return estimates;
}

/**
 * Get the tool definition for MCP server registration
 *
 * @returns MCP tool definition
 */
export function getPricingInfoToolDefinition() {
  return {
    name: 'get_pricing_info',
    description:
      'Get pricing information and cost estimates for SkyFi satellite imagery. ' +
      'Returns comprehensive pricing tables with rates per square kilometer, minimum order sizes, ' +
      'and delivery times. Optionally provide AOI size to get cost estimates. ' +
      'Filter by product type (DAY, NIGHT, VIDEO, etc.), resolution (LOW, MEDIUM, HIGH, etc.), ' +
      'or provider (PLANET, SATELLOGIC, etc.).',
    inputSchema: GetPricingInfoSchema,
  };
}

/**
 * Create a tool handler for the MCP server
 *
 * @param client - SkyFi API client instance
 * @returns Tool handler function
 */
export function createPricingToolHandler(client: SkyFiClient) {
  return async (input: GetPricingInfoInput): Promise<string> => {
    return getPricingInfo(client, input);
  };
}
