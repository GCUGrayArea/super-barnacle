/**
 * Pricing Calculator Helper
 *
 * Helper utilities for calculating costs, comparing prices, and applying
 * pricing tiers based on AOI size and product selections.
 *
 * @packageDocumentation
 */

import { logger } from './logger';
import { ValidationError } from './errors';
import {
  CostEstimate,
  CostEstimateParams,
  PriceComparison,
  PricingTier,
  StructuredPricing,
  ProviderPricing,
} from '@/types/pricing';
import { ProductType, Resolution, Provider } from '@/types/skyfi-api';
import { validateCostEstimateParams } from '@/schemas/pricing.schemas';

/**
 * Calculate cost estimate for imagery order
 *
 * Calculates the total cost for ordering imagery based on product type,
 * resolution, area, and provider.
 *
 * @param params - Cost estimation parameters
 * @param pricing - Structured pricing information from API
 * @returns Cost estimate
 * @throws {ValidationError} If parameters are invalid or pricing not available
 *
 * @example
 * ```typescript
 * const estimate = calculateCost({
 *   productType: ProductType.Day,
 *   resolution: Resolution.High,
 *   areaSqKm: 100,
 *   provider: Provider.Planet,
 * }, pricingData);
 * console.log(`Total cost: $${estimate.totalCost}`);
 * ```
 */
export function calculateCost(
  params: CostEstimateParams,
  pricing: StructuredPricing,
): CostEstimate {
  // Validate parameters
  const validatedParams = validateCostEstimateParams(params);

  const { productType, resolution, areaSqKm, provider } = validatedParams;

  // Find product type pricing
  const productPricing = pricing.productTypes.find((p) => p.productType === productType);

  if (!productPricing) {
    throw new ValidationError(
      `Pricing not available for product type: ${productType}`,
      'productType',
    );
  }

  // Find resolution pricing
  const resolutionPricing = productPricing.resolutions.find(
    (r) => r.resolution === resolution,
  );

  if (!resolutionPricing) {
    throw new ValidationError(
      `Pricing not available for resolution: ${resolution} in product type: ${productType}`,
      'resolution',
    );
  }

  // Find provider pricing
  let providerPricing: ProviderPricing | undefined;

  if (provider) {
    providerPricing = resolutionPricing.providers.find((p) => p.provider === provider);

    if (!providerPricing) {
      throw new ValidationError(
        `Pricing not available for provider: ${provider}`,
        'provider',
      );
    }

    if (!providerPricing.available) {
      throw new ValidationError(
        `Provider ${provider} is not currently available for ${productType} at ${resolution}`,
        'provider',
      );
    }
  } else {
    // Select cheapest available provider
    const availableProviders = resolutionPricing.providers.filter((p) => p.available);

    if (availableProviders.length === 0) {
      throw new ValidationError(
        `No providers available for ${productType} at ${resolution}`,
        'provider',
      );
    }

    providerPricing = availableProviders.reduce((cheapest, current) =>
      current.pricePerSqKm < cheapest.pricePerSqKm ? current : cheapest,
    );

    logger.debug('Auto-selected cheapest provider', {
      provider: providerPricing.provider,
      pricePerSqKm: providerPricing.pricePerSqKm,
    });
  }

  // Find applicable pricing tier
  const tier = findApplicableTier(areaSqKm, resolutionPricing.tiers);

  // Use tier pricing if available, otherwise use base pricing
  const pricePerSqKm = tier?.pricePerSqKm ?? providerPricing.pricePerSqKm;

  // Calculate base cost
  const baseCost = areaSqKm * pricePerSqKm;

  // Apply minimum price
  const totalCost = Math.max(baseCost, providerPricing.minPrice);

  // Apply maximum price if set
  const finalCost = providerPricing.maxPrice
    ? Math.min(totalCost, providerPricing.maxPrice)
    : totalCost;

  const estimate: CostEstimate = {
    totalCost: Math.round(finalCost * 100) / 100, // Round to 2 decimal places
    currency: providerPricing.currency,
    pricePerSqKm,
    areaSqKm,
    productType,
    resolution,
    provider: providerPricing.provider,
    tier,
    breakdown: {
      baseCost: Math.round(baseCost * 100) / 100,
      discounts: tier ? Math.round((baseCost - finalCost) * 100) / 100 : undefined,
    },
  };

  logger.debug('Cost estimate calculated', {
    totalCost: estimate.totalCost,
    provider: estimate.provider,
    tier: tier?.label,
  });

  return estimate;
}

/**
 * Find applicable pricing tier based on area
 *
 * @param areaSqKm - Area in square kilometers
 * @param tiers - Available pricing tiers
 * @returns Applicable tier or undefined
 */
export function findApplicableTier(
  areaSqKm: number,
  tiers?: PricingTier[],
): PricingTier | undefined {
  if (!tiers || tiers.length === 0) {
    return undefined;
  }

  // Find tier where area falls within range
  return tiers.find((tier) => {
    const meetsMin = areaSqKm >= tier.minAreaSqKm;
    const meetsMax = !tier.maxAreaSqKm || areaSqKm <= tier.maxAreaSqKm;
    return meetsMin && meetsMax;
  });
}

/**
 * Compare pricing across different providers for same product/resolution
 *
 * @param params - Base cost estimation parameters
 * @param pricing - Structured pricing information
 * @returns Price comparison with alternatives
 */
export function comparePrices(
  params: CostEstimateParams,
  pricing: StructuredPricing,
): PriceComparison {
  // Calculate original estimate
  const original = calculateCost(params, pricing);

  // Find all available providers for this product/resolution
  const productPricing = pricing.productTypes.find(
    (p) => p.productType === params.productType,
  );

  if (!productPricing) {
    throw new ValidationError(
      `Product type not found: ${params.productType}`,
      'productType',
    );
  }

  const resolutionPricing = productPricing.resolutions.find(
    (r) => r.resolution === params.resolution,
  );

  if (!resolutionPricing) {
    throw new ValidationError(
      `Resolution not found: ${params.resolution}`,
      'resolution',
    );
  }

  // Calculate estimates for all available providers
  const alternatives: CostEstimate[] = [];

  for (const providerPricing of resolutionPricing.providers) {
    if (!providerPricing.available) {
      continue;
    }

    // Skip the original provider
    if (providerPricing.provider === original.provider) {
      continue;
    }

    try {
      const estimate = calculateCost(
        {
          ...params,
          provider: providerPricing.provider,
        },
        pricing,
      );
      alternatives.push(estimate);
    } catch (error) {
      // Skip providers that fail validation
      logger.debug('Skipping provider in price comparison', {
        provider: providerPricing.provider,
        error,
      });
    }
  }

  // Find cheapest option
  const allEstimates = [original, ...alternatives];
  const cheapest = allEstimates.reduce((min, current) =>
    current.totalCost < min.totalCost ? current : min,
  );

  // Calculate potential savings
  const potentialSavings = original.totalCost - cheapest.totalCost;

  return {
    original,
    alternatives,
    cheapest,
    potentialSavings: Math.round(potentialSavings * 100) / 100,
  };
}

/**
 * Calculate cost for multiple AOI sizes (for tier comparison)
 *
 * @param productType - Product type
 * @param resolution - Resolution
 * @param areas - Array of areas in square kilometers
 * @param pricing - Structured pricing information
 * @param provider - Optional specific provider
 * @returns Array of cost estimates
 */
export function calculateTieredCosts(
  productType: ProductType,
  resolution: Resolution,
  areas: number[],
  pricing: StructuredPricing,
  provider?: Provider,
): CostEstimate[] {
  return areas.map((areaSqKm) =>
    calculateCost(
      {
        productType,
        resolution,
        areaSqKm,
        provider,
      },
      pricing,
    ),
  );
}

/**
 * Format cost estimate for human-readable display
 *
 * @param estimate - Cost estimate
 * @returns Formatted string
 */
export function formatCostEstimate(estimate: CostEstimate): string {
  const lines: string[] = [];

  lines.push('=== Cost Estimate ===');
  lines.push(`Product: ${estimate.productType}`);
  lines.push(`Resolution: ${estimate.resolution}`);
  lines.push(`Provider: ${estimate.provider}`);
  lines.push(`Area: ${estimate.areaSqKm} sq km`);
  lines.push('');
  lines.push(`Price per sq km: ${estimate.currency} ${estimate.pricePerSqKm.toFixed(2)}`);

  if (estimate.tier) {
    lines.push(`Pricing Tier: ${estimate.tier.label}`);
  }

  if (estimate.breakdown) {
    lines.push('');
    lines.push('Breakdown:');
    lines.push(`  Base Cost: ${estimate.currency} ${estimate.breakdown.baseCost.toFixed(2)}`);

    if (estimate.breakdown.discounts) {
      lines.push(
        `  Discounts: -${estimate.currency} ${Math.abs(estimate.breakdown.discounts).toFixed(2)}`,
      );
    }

    if (estimate.breakdown.fees) {
      lines.push(`  Fees: ${estimate.currency} ${estimate.breakdown.fees.toFixed(2)}`);
    }
  }

  lines.push('');
  lines.push(`TOTAL: ${estimate.currency} ${estimate.totalCost.toFixed(2)}`);

  return lines.join('\n');
}

/**
 * Format price comparison for human-readable display
 *
 * @param comparison - Price comparison
 * @returns Formatted string
 */
export function formatPriceComparison(comparison: PriceComparison): string {
  const lines: string[] = [];

  lines.push('=== Price Comparison ===');
  lines.push('');
  lines.push(`Selected: ${comparison.original.provider}`);
  lines.push(`  Cost: ${comparison.original.currency} ${comparison.original.totalCost.toFixed(2)}`);
  lines.push('');

  if (comparison.alternatives.length > 0) {
    lines.push('Alternatives:');

    for (const alt of comparison.alternatives) {
      const diff = alt.totalCost - comparison.original.totalCost;
      const diffStr =
        diff > 0
          ? `+${comparison.original.currency} ${diff.toFixed(2)}`
          : `-${comparison.original.currency} ${Math.abs(diff).toFixed(2)}`;

      lines.push(`  ${alt.provider}: ${alt.currency} ${alt.totalCost.toFixed(2)} (${diffStr})`);
    }

    lines.push('');
  }

  if (comparison.potentialSavings > 0) {
    lines.push(`Cheapest: ${comparison.cheapest.provider}`);
    lines.push(`  Cost: ${comparison.cheapest.currency} ${comparison.cheapest.totalCost.toFixed(2)}`);
    lines.push(
      `  Savings: ${comparison.original.currency} ${comparison.potentialSavings.toFixed(2)}`,
    );
  } else {
    lines.push('You have selected the cheapest option!');
  }

  return lines.join('\n');
}

/**
 * Calculate price per square kilometer across a range of areas
 * to demonstrate volume discounts
 *
 * @param productType - Product type
 * @param resolution - Resolution
 * @param pricing - Structured pricing information
 * @param provider - Optional specific provider
 * @returns Array of area/price pairs showing pricing tiers
 */
export function calculatePricingTierBreakdown(
  productType: ProductType,
  resolution: Resolution,
  pricing: StructuredPricing,
  provider?: Provider,
): Array<{ areaSqKm: number; pricePerSqKm: number; totalCost: number; tier?: string }> {
  // Sample areas: 1, 10, 50, 100, 500, 1000, 5000, 10000, 50000 sq km
  const sampleAreas = [1, 10, 50, 100, 500, 1000, 5000, 10000, 50000];

  return sampleAreas.map((areaSqKm) => {
    try {
      const estimate = calculateCost(
        {
          productType,
          resolution,
          areaSqKm,
          provider,
        },
        pricing,
      );

      return {
        areaSqKm,
        pricePerSqKm: estimate.pricePerSqKm,
        totalCost: estimate.totalCost,
        tier: estimate.tier?.label,
      };
    } catch (error) {
      // If calculation fails for this area, return 0
      logger.warn('Failed to calculate tier for area', { areaSqKm, error });
      return {
        areaSqKm,
        pricePerSqKm: 0,
        totalCost: 0,
      };
    }
  });
}
