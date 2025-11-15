/**
 * Pricing Results Formatter
 *
 * Formats pricing information and cost estimates for display in MCP tool responses.
 * Provides clear, structured output with tables, estimates, and guidance.
 *
 * @packageDocumentation
 */

import { StructuredPricing, CostEstimate } from '../../types/pricing.js';
import { ProductType, Resolution, Provider } from '../../types/skyfi-api.js';

/**
 * Format pricing information for MCP tool response
 *
 * Creates a comprehensive, human-readable pricing guide with tables,
 * cost estimates (if AOI size provided), and helpful guidance.
 *
 * @param pricing - Structured pricing information from API
 * @param filters - Optional filters applied
 * @param costEstimates - Optional cost estimates for specific AOI size
 * @returns Formatted pricing information
 */
export function formatPricingResults(
  pricing: StructuredPricing,
  filters?: {
    productType?: ProductType;
    resolution?: Resolution;
    provider?: Provider;
    aoiSqkm?: number;
  },
  costEstimates?: CostEstimate[],
): string {
  const sections: string[] = [];

  // Header
  sections.push('# SkyFi Satellite Imagery Pricing');
  sections.push('');

  // Filters applied section
  if (filters && Object.keys(filters).length > 0) {
    const appliedFilters: string[] = [];
    if (filters.productType) appliedFilters.push(`Product Type: ${filters.productType}`);
    if (filters.resolution) appliedFilters.push(`Resolution: ${filters.resolution}`);
    if (filters.provider) appliedFilters.push(`Provider: ${filters.provider}`);
    if (filters.aoiSqkm) appliedFilters.push(`AOI Size: ${filters.aoiSqkm} sq km`);

    if (appliedFilters.length > 0) {
      sections.push('**Filters Applied:**');
      appliedFilters.forEach((filter) => sections.push(`- ${filter}`));
      sections.push('');
    }
  }

  // Cost estimates section (if provided)
  if (costEstimates && costEstimates.length > 0) {
    sections.push('## Cost Estimates');
    sections.push('');
    sections.push(
      `For an area of ${filters?.aoiSqkm ?? 'N/A'} square kilometers:`,
    );
    sections.push('');

    // Create table
    sections.push('| Product Type | Resolution | Provider | Price/sq km | Total Cost |');
    sections.push('|--------------|------------|----------|-------------|------------|');

    for (const estimate of costEstimates) {
      sections.push(
        `| ${estimate.productType} | ${estimate.resolution} | ${estimate.provider} | ${estimate.currency} ${estimate.pricePerSqKm.toFixed(2)} | **${estimate.currency} ${estimate.totalCost.toFixed(2)}** |`,
      );
    }

    sections.push('');
  }

  // Pricing tiers section
  sections.push('## Pricing Tiers');
  sections.push('');

  // Filter product types based on filters
  let productTypes = pricing.productTypes;
  if (filters?.productType) {
    productTypes = productTypes.filter((p) => p.productType === filters.productType);
  }

  for (const product of productTypes) {
    sections.push(`### ${product.productType}`);
    sections.push('');

    if (product.description) {
      sections.push(`**Description:** ${product.description}`);
      sections.push('');
    }

    if (product.deliveryTime) {
      sections.push(`**Typical Delivery Time:** ${product.deliveryTime}`);
      sections.push('');
    }

    // Filter resolutions based on filters
    let resolutions = product.resolutions;
    if (filters?.resolution) {
      resolutions = resolutions.filter((r) => r.resolution === filters.resolution);
    }

    for (const resolution of resolutions) {
      sections.push(`#### ${resolution.resolution}`);

      if (resolution.gsd) {
        sections.push(`*Ground Sample Distance: ${resolution.gsd}*`);
      }

      sections.push('');

      // Filter providers based on filters
      let providers = resolution.providers;
      if (filters?.provider) {
        providers = providers.filter((p) => p.provider === filters.provider);
      }

      // Create provider pricing table
      sections.push('| Provider | Price/sq km | Min Order | Availability | Notes |');
      sections.push('|----------|-------------|-----------|--------------|-------|');

      for (const provider of providers) {
        const availability = provider.available ? 'Available' : 'Not Available';
        const notes = provider.notes ?? '-';
        sections.push(
          `| ${provider.provider} | ${provider.currency} ${provider.pricePerSqKm.toFixed(2)} | ${provider.currency} ${provider.minPrice.toFixed(2)} | ${availability} | ${notes} |`,
        );
      }

      sections.push('');

      // Use cases
      if (resolution.useCases && resolution.useCases.length > 0) {
        sections.push('**Use Cases:**');
        resolution.useCases.forEach((useCase) => sections.push(`- ${useCase}`));
        sections.push('');
      }
    }
  }

  // Guidance section
  sections.push('## Pricing Information & Guidance');
  sections.push('');
  sections.push('### Key Factors Affecting Price');
  sections.push('- **Product Type:** Different imagery types have different pricing');
  sections.push('- **Resolution:** Higher resolution typically costs more per square kilometer');
  sections.push(
    '- **Provider:** Prices vary by satellite provider based on sensor capabilities',
  );
  sections.push('- **Area Size:** Larger areas may qualify for volume discounts');
  sections.push('- **Location:** Some regions may have different pricing or availability');
  sections.push('');

  // Open data opportunities
  sections.push('### Open Data Opportunities');
  sections.push(
    '**Sentinel-2** and **Sentinel-2 CREODIAS** provide free, open-access imagery:',
  );
  sections.push('- 10-30m resolution multispectral imagery');
  sections.push('- Global coverage every 5 days');
  sections.push('- Ideal for large-area monitoring and change detection');
  sections.push('- Archive data available at minimal or no cost');
  sections.push('');

  // Getting exact quotes
  sections.push('### Getting Exact Quotes');
  sections.push(
    'The prices shown are base rates. For exact quotes on your specific order:',
  );
  sections.push('1. Provide your specific AOI (area of interest)');
  sections.push('2. Specify your required product type and resolution');
  sections.push('3. Consider timing requirements (tasking vs. archive)');
  sections.push('4. Contact SkyFi for enterprise pricing on large orders');
  sections.push('');

  // Metadata section
  if (pricing.currency || pricing.lastUpdated) {
    sections.push('---');
    sections.push('');
    if (pricing.currency) {
      sections.push(`**Currency:** ${pricing.currency}`);
    }
    if (pricing.lastUpdated) {
      sections.push(`**Last Updated:** ${pricing.lastUpdated}`);
    }
    if (pricing.pricingGuideUrl) {
      sections.push(`**Official Pricing Guide:** ${pricing.pricingGuideUrl}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Format a single cost estimate for display
 *
 * @param estimate - Cost estimate to format
 * @returns Formatted cost estimate
 */
export function formatCostEstimate(estimate: CostEstimate): string {
  const lines: string[] = [];

  lines.push('## Cost Estimate');
  lines.push('');
  lines.push(`**Product:** ${estimate.productType}`);
  lines.push(`**Resolution:** ${estimate.resolution}`);
  lines.push(`**Provider:** ${estimate.provider}`);
  lines.push(`**Area:** ${estimate.areaSqKm} sq km`);
  lines.push('');
  lines.push(
    `**Price per sq km:** ${estimate.currency} ${estimate.pricePerSqKm.toFixed(2)}`,
  );

  if (estimate.tier) {
    lines.push(`**Pricing Tier:** ${estimate.tier.label}`);
  }

  if (estimate.breakdown) {
    lines.push('');
    lines.push('**Breakdown:**');
    lines.push(`- Base Cost: ${estimate.currency} ${estimate.breakdown.baseCost.toFixed(2)}`);

    if (estimate.breakdown.discounts && estimate.breakdown.discounts !== 0) {
      lines.push(
        `- Discounts: ${estimate.currency} ${estimate.breakdown.discounts.toFixed(2)}`,
      );
    }

    if (estimate.breakdown.fees) {
      lines.push(`- Fees: ${estimate.currency} ${estimate.breakdown.fees.toFixed(2)}`);
    }
  }

  lines.push('');
  lines.push(`**TOTAL COST: ${estimate.currency} ${estimate.totalCost.toFixed(2)}**`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Format error message for pricing tool
 *
 * @param error - Error to format
 * @param context - Additional context about what was being attempted
 * @returns Formatted error message
 */
export function formatPricingError(error: unknown, context?: string): string {
  const lines: string[] = [];

  lines.push('# Pricing Information Error');
  lines.push('');

  if (context) {
    lines.push(`**Context:** ${context}`);
    lines.push('');
  }

  if (error instanceof Error) {
    lines.push(`**Error:** ${error.message}`);
  } else {
    lines.push(`**Error:** ${String(error)}`);
  }

  lines.push('');
  lines.push('## Troubleshooting');
  lines.push('- Verify product type is one of: DAY, NIGHT, VIDEO, MULTISPECTRAL, HYPERSPECTRAL, SAR, STEREO');
  lines.push('- Verify resolution is one of: LOW, MEDIUM, HIGH, VERY HIGH, SUPER HIGH, ULTRA HIGH, CM 30, CM 50');
  lines.push('- Verify provider is valid (e.g., PLANET, SATELLOGIC, UMBRA, etc.)');
  lines.push('- Check that AOI size is between 0.01 and 500,000 square kilometers');
  lines.push('');

  return lines.join('\n');
}

/**
 * Format warning message for large AOI
 *
 * @param aoiSqkm - AOI size that triggered warning
 * @returns Formatted warning message
 */
export function formatLargeAOIWarning(aoiSqkm: number): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**WARNING: Large Area of Interest**');
  lines.push('');
  lines.push(
    `Your requested area (${aoiSqkm.toLocaleString()} sq km) is very large and may result in significant costs.`,
  );
  lines.push('');
  lines.push('**Recommendations:**');
  lines.push('- Consider breaking into smaller tiles for more efficient processing');
  lines.push('- Check if lower resolution imagery meets your needs');
  lines.push('- Explore open data options (Sentinel-2) for large-area monitoring');
  lines.push('- Contact SkyFi for enterprise pricing on orders over 10,000 sq km');
  lines.push('');

  return lines.join('\n');
}
