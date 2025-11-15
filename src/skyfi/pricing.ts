/**
 * SkyFi Pricing API Methods
 *
 * This module provides methods for retrieving pricing information from the
 * SkyFi API, including cost estimates for different product types, resolutions,
 * and AOI sizes.
 *
 * @packageDocumentation
 */

import { SkyFiClient } from './client';
import { logger } from '../lib/logger';
import { ValidationError } from '../lib/errors';
import {
  PricingRequest,
  PricingResponse,
  StructuredPricing,
  ProductTypePricing,
  ResolutionPricing,
  ProviderPricing,
} from '../types/pricing';
import { ProductType, Resolution, Provider } from '../types/skyfi-api';
import {
  validatePricingRequest,
  validatePricingResponse,
} from '../schemas/pricing.schemas';

/**
 * Get pricing information from SkyFi API
 *
 * Retrieves comprehensive pricing information for all product types,
 * resolutions, and providers. Optionally accepts an AOI to get
 * location-specific pricing.
 *
 * @param client - SkyFi API client instance
 * @param params - Pricing request parameters
 * @returns Promise resolving to pricing response
 * @throws {ValidationError} If request parameters are invalid
 * @throws {SkyFiAPIError} If API request fails
 *
 * @example
 * ```typescript
 * const client = new SkyFiClient({ apiKey: 'your-api-key' });
 * const pricing = await getPricing(client, {
 *   aoi: 'POLYGON((-97.72 30.28, ...))',
 * });
 * console.log(pricing.productTypes);
 * ```
 */
export async function getPricing(
  client: SkyFiClient,
  params?: PricingRequest,
): Promise<PricingResponse> {
  try {
    // Validate request parameters
    const validatedParams = params ? validatePricingRequest(params) : {};

    logger.debug('Fetching pricing information', {
      hasAoi: !!validatedParams.aoi,
    });

    // Make API request
    const response = await client.post<PricingResponse>('/pricing', validatedParams);

    // Validate response
    const validatedResponse = validatePricingResponse(response);

    logger.info('Pricing information retrieved successfully', {
      hasAoi: !!params?.aoi,
    });

    return validatedResponse;
  } catch (error) {
    logger.error('Failed to fetch pricing information', { error });
    throw error;
  }
}

/**
 * Parse raw pricing response into structured format
 *
 * Transforms the raw API response into a more structured format
 * that's easier to work with programmatically.
 *
 * @param response - Raw pricing response from API
 * @returns Structured pricing information
 */
export function parseStructuredPricing(response: PricingResponse): StructuredPricing {
  const productTypes: ProductTypePricing[] = [];

  // Parse the productTypes object
  if (response.productTypes && typeof response.productTypes === 'object') {
    for (const [productTypeKey, productTypeValue] of Object.entries(
      response.productTypes,
    )) {
      // Skip if not a valid product type value
      if (!productTypeValue || typeof productTypeValue !== 'object') {
        continue;
      }

      const resolutions: ResolutionPricing[] = [];

      // Parse resolutions for this product type
      const productData = productTypeValue as Record<string, unknown>;
      if (productData['resolutions'] && typeof productData['resolutions'] === 'object') {
        const resolutionsData = productData['resolutions'] as Record<string, unknown>;

        for (const [resolutionKey, resolutionValue] of Object.entries(resolutionsData)) {
          if (!resolutionValue || typeof resolutionValue !== 'object') {
            continue;
          }

          const providers: ProviderPricing[] = [];
          const resData = resolutionValue as Record<string, unknown>;

          // Parse providers for this resolution
          if (resData['providers'] && typeof resData['providers'] === 'object') {
            const providersData = resData['providers'] as Record<string, unknown>;

            for (const [providerKey, providerValue] of Object.entries(providersData)) {
              if (!providerValue || typeof providerValue !== 'object') {
                continue;
              }

              const provData = providerValue as Record<string, unknown>;

              providers.push({
                provider: providerKey as Provider,
                pricePerSqKm:
                  typeof provData['pricePerSqKm'] === 'number'
                    ? provData['pricePerSqKm']
                    : 0,
                minPrice:
                  typeof provData['minPrice'] === 'number' ? provData['minPrice'] : 0,
                maxPrice:
                  typeof provData['maxPrice'] === 'number'
                    ? provData['maxPrice']
                    : undefined,
                currency:
                  typeof provData['currency'] === 'string' ? provData['currency'] : 'USD',
                notes: typeof provData['notes'] === 'string' ? provData['notes'] : undefined,
                available:
                  typeof provData['available'] === 'boolean'
                    ? provData['available']
                    : true,
              });
            }
          }

          resolutions.push({
            resolution: resolutionKey as Resolution,
            providers,
            gsd: typeof resData['gsd'] === 'string' ? resData['gsd'] : undefined,
            useCases:
              Array.isArray(resData['useCases']) &&
              resData['useCases'].every((item) => typeof item === 'string')
                ? (resData['useCases'] as string[])
                : undefined,
          });
        }
      }

      productTypes.push({
        productType: productTypeKey as ProductType,
        resolutions,
        description:
          typeof productData['description'] === 'string'
            ? productData['description']
            : undefined,
        deliveryTime:
          typeof productData['deliveryTime'] === 'string'
            ? productData['deliveryTime']
            : undefined,
      });
    }
  }

  return {
    productTypes,
    currency: response.metadata?.currency ?? 'USD',
    lastUpdated: response.metadata?.lastUpdated,
    pricingGuideUrl: response.metadata?.pricingGuideUrl,
  };
}

/**
 * Get pricing for a specific product type and resolution
 *
 * Convenience method to get pricing for a specific product/resolution combination.
 *
 * @param client - SkyFi API client instance
 * @param productType - Product type to get pricing for
 * @param resolution - Resolution to get pricing for
 * @param aoi - Optional AOI for location-specific pricing
 * @returns Promise resolving to resolution pricing information
 * @throws {ValidationError} If product type or resolution not found in pricing
 */
export async function getPricingForProduct(
  client: SkyFiClient,
  productType: ProductType,
  resolution: Resolution,
  aoi?: string,
): Promise<ResolutionPricing | null> {
  const pricingResponse = await getPricing(client, aoi ? { aoi } : undefined);
  const structured = parseStructuredPricing(pricingResponse);

  // Find the product type
  const product = structured.productTypes.find((p) => p.productType === productType);

  if (!product) {
    logger.warn('Product type not found in pricing', { productType });
    return null;
  }

  // Find the resolution
  const resolutionPricing = product.resolutions.find((r) => r.resolution === resolution);

  if (!resolutionPricing) {
    logger.warn('Resolution not found in pricing for product type', {
      productType,
      resolution,
    });
    return null;
  }

  return resolutionPricing;
}

/**
 * Get all available product types from pricing
 *
 * @param client - SkyFi API client instance
 * @returns Promise resolving to array of available product types
 */
export async function getAvailableProductTypes(
  client: SkyFiClient,
): Promise<ProductType[]> {
  const pricingResponse = await getPricing(client);
  const structured = parseStructuredPricing(pricingResponse);

  return structured.productTypes.map((p) => p.productType);
}

/**
 * Get all available resolutions for a product type
 *
 * @param client - SkyFi API client instance
 * @param productType - Product type to get resolutions for
 * @returns Promise resolving to array of available resolutions
 */
export async function getAvailableResolutions(
  client: SkyFiClient,
  productType: ProductType,
): Promise<Resolution[]> {
  const pricingResponse = await getPricing(client);
  const structured = parseStructuredPricing(pricingResponse);

  const product = structured.productTypes.find((p) => p.productType === productType);

  if (!product) {
    return [];
  }

  return product.resolutions.map((r) => r.resolution);
}

/**
 * Get all available providers for a product type and resolution
 *
 * @param client - SkyFi API client instance
 * @param productType - Product type
 * @param resolution - Resolution
 * @returns Promise resolving to array of available providers
 */
export async function getAvailableProviders(
  client: SkyFiClient,
  productType: ProductType,
  resolution: Resolution,
): Promise<Provider[]> {
  const resolutionPricing = await getPricingForProduct(client, productType, resolution);

  if (!resolutionPricing) {
    return [];
  }

  return resolutionPricing.providers
    .filter((p) => p.available)
    .map((p) => p.provider);
}

/**
 * Format pricing information for human-readable display
 *
 * @param pricing - Structured pricing information
 * @returns Formatted string representation
 */
export function formatPricingDisplay(pricing: StructuredPricing): string {
  const lines: string[] = [];

  lines.push('=== SkyFi Pricing Information ===');
  lines.push(`Currency: ${pricing.currency}`);

  if (pricing.lastUpdated) {
    lines.push(`Last Updated: ${pricing.lastUpdated}`);
  }

  lines.push('');

  for (const product of pricing.productTypes) {
    lines.push(`Product Type: ${product.productType}`);

    if (product.description) {
      lines.push(`  Description: ${product.description}`);
    }

    if (product.deliveryTime) {
      lines.push(`  Delivery Time: ${product.deliveryTime}`);
    }

    lines.push('  Resolutions:');

    for (const resolution of product.resolutions) {
      lines.push(`    ${resolution.resolution}${resolution.gsd ? ` (${resolution.gsd})` : ''}`);

      if (resolution.useCases && resolution.useCases.length > 0) {
        lines.push(`      Use Cases: ${resolution.useCases.join(', ')}`);
      }

      lines.push('      Providers:');

      for (const provider of resolution.providers) {
        const available = provider.available ? '✓' : '✗';
        lines.push(
          `        [${available}] ${provider.provider}: $${provider.pricePerSqKm}/sqkm (min: $${provider.minPrice})`,
        );

        if (provider.notes) {
          lines.push(`            Note: ${provider.notes}`);
        }
      }
    }

    lines.push('');
  }

  if (pricing.pricingGuideUrl) {
    lines.push(`For detailed pricing information, visit: ${pricing.pricingGuideUrl}`);
  }

  return lines.join('\n');
}
