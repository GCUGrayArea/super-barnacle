/**
 * Pricing-specific type definitions
 *
 * Type definitions for SkyFi pricing API requests and responses
 *
 * @packageDocumentation
 */

import { ProductType, Resolution, Provider } from './skyfi-api.js';

/**
 * Request payload for pricing API
 */
export interface PricingRequest {
  /** Optional Area of Interest in WKT format to get location-specific pricing */
  aoi?: string | null;
}

/**
 * Pricing information for a specific provider
 */
export interface ProviderPricing {
  /** Provider name */
  provider: Provider;

  /** Base price per square kilometer */
  pricePerSqKm: number;

  /** Minimum order price */
  minPrice: number;

  /** Maximum order price (if applicable) */
  maxPrice?: number;

  /** Currency code (e.g., 'USD') */
  currency: string;

  /** Additional pricing notes or constraints */
  notes?: string;

  /** Whether this provider is currently available */
  available: boolean;
}

/**
 * Pricing tier based on AOI size
 */
export interface PricingTier {
  /** Minimum area in square kilometers for this tier */
  minAreaSqKm: number;

  /** Maximum area in square kilometers for this tier */
  maxAreaSqKm?: number;

  /** Price per square kilometer at this tier */
  pricePerSqKm: number;

  /** Tier label (e.g., 'Small', 'Medium', 'Large') */
  label: string;
}

/**
 * Pricing information for a specific resolution
 */
export interface ResolutionPricing {
  /** Resolution level */
  resolution: Resolution;

  /** Pricing by provider for this resolution */
  providers: ProviderPricing[];

  /** Pricing tiers for volume discounts */
  tiers?: PricingTier[];

  /** Typical use cases for this resolution */
  useCases?: string[];

  /** Ground sample distance in meters */
  gsd?: string;
}

/**
 * Pricing information for a specific product type
 */
export interface ProductTypePricing {
  /** Product type */
  productType: ProductType;

  /** Pricing by resolution */
  resolutions: ResolutionPricing[];

  /** Product description */
  description?: string;

  /** Typical delivery time */
  deliveryTime?: string;
}

/**
 * Complete pricing response from SkyFi API
 */
export interface PricingResponse {
  /** Pricing matrix organized by product type */
  productTypes: Record<string, unknown>;

  /** Optional pricing metadata */
  metadata?: {
    /** When pricing was last updated */
    lastUpdated?: string;

    /** Currency for all prices */
    currency?: string;

    /** Link to detailed pricing documentation */
    pricingGuideUrl?: string;
  };
}

/**
 * Structured pricing information (parsed from API response)
 */
export interface StructuredPricing {
  /** Pricing by product type */
  productTypes: ProductTypePricing[];

  /** Overall currency */
  currency: string;

  /** Last updated timestamp */
  lastUpdated?: string;

  /** Link to pricing guide */
  pricingGuideUrl?: string;
}

/**
 * Cost estimate parameters
 */
export interface CostEstimateParams {
  /** Product type */
  productType: ProductType;

  /** Resolution */
  resolution: Resolution;

  /** Area in square kilometers */
  areaSqKm: number;

  /** Preferred provider (optional) */
  provider?: Provider;
}

/**
 * Cost estimate result
 */
export interface CostEstimate {
  /** Estimated cost */
  totalCost: number;

  /** Currency */
  currency: string;

  /** Price per square kilometer used */
  pricePerSqKm: number;

  /** Area in square kilometers */
  areaSqKm: number;

  /** Product type */
  productType: ProductType;

  /** Resolution */
  resolution: Resolution;

  /** Provider */
  provider: Provider;

  /** Applicable pricing tier */
  tier?: PricingTier;

  /** Cost breakdown */
  breakdown?: {
    baseCost: number;
    discounts?: number;
    fees?: number;
  };
}

/**
 * Price comparison result
 */
export interface PriceComparison {
  /** Original cost estimate */
  original: CostEstimate;

  /** Alternative estimates (different providers or resolutions) */
  alternatives: CostEstimate[];

  /** Cheapest option */
  cheapest: CostEstimate;

  /** Potential savings */
  potentialSavings: number;
}
