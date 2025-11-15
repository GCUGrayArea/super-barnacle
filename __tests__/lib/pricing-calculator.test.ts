/**
 * Unit tests for Pricing Calculator
 */

import {
  calculateCost,
  findApplicableTier,
  comparePrices,
  calculateTieredCosts,
  formatCostEstimate,
  formatPriceComparison,
  calculatePricingTierBreakdown,
} from '@/lib/pricing-calculator';
import { ValidationError } from '@/lib/errors';
import { ProductType, Resolution, Provider } from '@/types/skyfi-api';
import { StructuredPricing, PricingTier } from '@/types/pricing';

jest.mock('@/lib/logger');

describe('Pricing Calculator', () => {
  const mockPricing: StructuredPricing = {
    productTypes: [
      {
        productType: ProductType.Day,
        resolutions: [
          {
            resolution: Resolution.High,
            providers: [
              {
                provider: Provider.Planet,
                pricePerSqKm: 10.0,
                minPrice: 100,
                maxPrice: 10000,
                currency: 'USD',
                available: true,
              },
              {
                provider: Provider.Satellogic,
                pricePerSqKm: 8.0,
                minPrice: 80,
                currency: 'USD',
                available: true,
              },
              {
                provider: Provider.Umbra,
                pricePerSqKm: 7.0,
                minPrice: 70,
                currency: 'USD',
                available: false, // Unavailable provider
              },
            ],
            tiers: [
              {
                minAreaSqKm: 0,
                maxAreaSqKm: 99.99,
                pricePerSqKm: 10.0,
                label: 'Small',
              },
              {
                minAreaSqKm: 100,
                maxAreaSqKm: 999.99,
                pricePerSqKm: 8.0,
                label: 'Medium',
              },
              {
                minAreaSqKm: 1000,
                pricePerSqKm: 6.0,
                label: 'Large',
              },
            ],
          },
          {
            resolution: Resolution.Medium,
            providers: [
              {
                provider: Provider.Planet,
                pricePerSqKm: 5.0,
                minPrice: 50,
                currency: 'USD',
                available: true,
              },
            ],
          },
        ],
      },
      {
        productType: ProductType.SAR,
        resolutions: [
          {
            resolution: Resolution.High,
            providers: [
              {
                provider: Provider.Umbra,
                pricePerSqKm: 15.0,
                minPrice: 150,
                currency: 'USD',
                available: true,
              },
            ],
          },
        ],
      },
    ],
    currency: 'USD',
  };

  describe('calculateCost', () => {
    it('should calculate cost for specified provider', () => {
      const result = calculateCost(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 50,
          provider: Provider.Planet,
        },
        mockPricing,
      );

      expect(result.totalCost).toBe(500); // 50 * 10
      expect(result.pricePerSqKm).toBe(10.0);
      expect(result.provider).toBe(Provider.Planet);
      expect(result.currency).toBe('USD');
    });

    it('should auto-select cheapest provider when not specified', () => {
      const result = calculateCost(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 50,
        },
        mockPricing,
      );

      expect(result.provider).toBe(Provider.Satellogic); // Cheaper than Planet
      // Uses tier pricing: 50 * $10/sqkm = $500 (Small tier)
      expect(result.totalCost).toBe(500);
      expect(result.tier?.label).toBe('Small');
    });

    it('should apply minimum price', () => {
      const result = calculateCost(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 5, // Would be $50, but min is $100
          provider: Provider.Planet,
        },
        mockPricing,
      );

      expect(result.totalCost).toBe(100); // Min price
      expect(result.breakdown?.baseCost).toBe(50);
    });

    it('should apply maximum price', () => {
      const result = calculateCost(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 2000, // Would be $20,000, but max is $10,000
          provider: Provider.Planet,
        },
        mockPricing,
      );

      expect(result.totalCost).toBe(10000); // Max price
    });

    it('should apply pricing tiers', () => {
      // Small tier (0-100 sqkm): $10/sqkm
      const smallResult = calculateCost(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 50,
          provider: Provider.Planet,
        },
        mockPricing,
      );

      expect(smallResult.pricePerSqKm).toBe(10.0);
      expect(smallResult.tier?.label).toBe('Small');

      // Medium tier (100-1000 sqkm): $8/sqkm
      const mediumResult = calculateCost(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 500,
          provider: Provider.Planet,
        },
        mockPricing,
      );

      expect(mediumResult.pricePerSqKm).toBe(8.0);
      expect(mediumResult.tier?.label).toBe('Medium');

      // Large tier (1000+ sqkm): $6/sqkm
      const largeResult = calculateCost(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 2000,
          provider: Provider.Planet,
        },
        mockPricing,
      );

      expect(largeResult.pricePerSqKm).toBe(6.0);
      expect(largeResult.tier?.label).toBe('Large');
    });

    it('should throw error for invalid product type', () => {
      expect(() =>
        calculateCost(
          {
            productType: ProductType.Video,
            resolution: Resolution.High,
            areaSqKm: 100,
          },
          mockPricing,
        ),
      ).toThrow(ValidationError);
    });

    it('should throw error for invalid resolution', () => {
      expect(() =>
        calculateCost(
          {
            productType: ProductType.Day,
            resolution: Resolution.VeryHigh,
            areaSqKm: 100,
          },
          mockPricing,
        ),
      ).toThrow(ValidationError);
    });

    it('should throw error for unavailable provider', () => {
      expect(() =>
        calculateCost(
          {
            productType: ProductType.Day,
            resolution: Resolution.High,
            areaSqKm: 100,
            provider: Provider.Umbra, // Unavailable
          },
          mockPricing,
        ),
      ).toThrow(ValidationError);
    });

    it('should throw error when no providers available', () => {
      const noPricingAvailable: StructuredPricing = {
        productTypes: [
          {
            productType: ProductType.Day,
            resolutions: [
              {
                resolution: Resolution.High,
                providers: [
                  {
                    provider: Provider.Planet,
                    pricePerSqKm: 10.0,
                    minPrice: 100,
                    currency: 'USD',
                    available: false,
                  },
                ],
              },
            ],
          },
        ],
        currency: 'USD',
      };

      expect(() =>
        calculateCost(
          {
            productType: ProductType.Day,
            resolution: Resolution.High,
            areaSqKm: 100,
          },
          noPricingAvailable,
        ),
      ).toThrow(ValidationError);
    });

    it('should validate area does not exceed maximum', () => {
      expect(() =>
        calculateCost(
          {
            productType: ProductType.Day,
            resolution: Resolution.High,
            areaSqKm: 600000, // Exceeds 500,000 limit
          },
          mockPricing,
        ),
      ).toThrow();
    });
  });

  describe('findApplicableTier', () => {
    const tiers: PricingTier[] = [
      {
        minAreaSqKm: 0,
        maxAreaSqKm: 99.99,
        pricePerSqKm: 10.0,
        label: 'Small',
      },
      {
        minAreaSqKm: 100,
        maxAreaSqKm: 999.99,
        pricePerSqKm: 8.0,
        label: 'Medium',
      },
      {
        minAreaSqKm: 1000,
        pricePerSqKm: 6.0,
        label: 'Large',
      },
    ];

    it('should find correct tier for area', () => {
      expect(findApplicableTier(50, tiers)?.label).toBe('Small');
      expect(findApplicableTier(500, tiers)?.label).toBe('Medium');
      expect(findApplicableTier(5000, tiers)?.label).toBe('Large');
    });

    it('should handle boundary conditions', () => {
      expect(findApplicableTier(100, tiers)?.label).toBe('Medium'); // Exactly at boundary
      expect(findApplicableTier(1000, tiers)?.label).toBe('Large');
    });

    it('should return undefined when no tiers provided', () => {
      expect(findApplicableTier(100, undefined)).toBeUndefined();
      expect(findApplicableTier(100, [])).toBeUndefined();
    });
  });

  describe('comparePrices', () => {
    it('should compare prices across providers', () => {
      const comparison = comparePrices(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 100,
          provider: Provider.Planet,
        },
        mockPricing,
      );

      expect(comparison.original.provider).toBe(Provider.Planet);
      // Uses tier pricing: 100 * $8/sqkm = $800 (Medium tier)
      expect(comparison.original.totalCost).toBe(800);

      expect(comparison.alternatives).toHaveLength(1); // Satellogic
      expect(comparison.alternatives[0]?.provider).toBe(Provider.Satellogic);
      // Both use same tier pricing, so same cost
      expect(comparison.alternatives[0]?.totalCost).toBe(800);

      // Both are same price, so no savings
      expect(comparison.potentialSavings).toBe(0);
    });

    it('should handle case when selected provider is cheapest', () => {
      const comparison = comparePrices(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 100,
          provider: Provider.Satellogic,
        },
        mockPricing,
      );

      expect(comparison.original.provider).toBe(Provider.Satellogic);
      expect(comparison.cheapest.provider).toBe(Provider.Satellogic);
      expect(comparison.potentialSavings).toBe(0);
    });

    it('should exclude unavailable providers from comparison', () => {
      const comparison = comparePrices(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 100,
          provider: Provider.Planet,
        },
        mockPricing,
      );

      // Should not include Umbra (unavailable)
      const hasUmbra = comparison.alternatives.some((alt) => alt.provider === Provider.Umbra);
      expect(hasUmbra).toBe(false);
    });
  });

  describe('calculateTieredCosts', () => {
    it('should calculate costs for multiple areas', () => {
      const areas = [10, 50, 200, 1500];
      const results = calculateTieredCosts(
        ProductType.Day,
        Resolution.High,
        areas,
        mockPricing,
        Provider.Planet,
      );

      expect(results).toHaveLength(4);
      expect(results[0]?.areaSqKm).toBe(10);
      expect(results[1]?.areaSqKm).toBe(50);
      expect(results[2]?.areaSqKm).toBe(200);
      expect(results[3]?.areaSqKm).toBe(1500);

      // Verify tiers are applied correctly
      expect(results[0]?.tier?.label).toBe('Small');
      expect(results[1]?.tier?.label).toBe('Small');
      expect(results[2]?.tier?.label).toBe('Medium');
      expect(results[3]?.tier?.label).toBe('Large');
    });

    it('should work without specified provider', () => {
      const areas = [100];
      const results = calculateTieredCosts(
        ProductType.Day,
        Resolution.High,
        areas,
        mockPricing,
      );

      expect(results).toHaveLength(1);
      expect(results[0]?.provider).toBe(Provider.Satellogic); // Cheapest
    });
  });

  describe('formatCostEstimate', () => {
    it('should format cost estimate for display', () => {
      const estimate = calculateCost(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 500,
          provider: Provider.Planet,
        },
        mockPricing,
      );

      const formatted = formatCostEstimate(estimate);

      expect(formatted).toContain('=== Cost Estimate ===');
      expect(formatted).toContain('Product: DAY');
      expect(formatted).toContain('Resolution: HIGH');
      expect(formatted).toContain('Provider: PLANET');
      expect(formatted).toContain('Area: 500 sq km');
      expect(formatted).toContain('TOTAL: USD 4000.00');
      expect(formatted).toContain('Pricing Tier: Medium');
    });

    it('should format without tier information', () => {
      const estimate = calculateCost(
        {
          productType: ProductType.Day,
          resolution: Resolution.Medium,
          areaSqKm: 100,
          provider: Provider.Planet,
        },
        mockPricing,
      );

      const formatted = formatCostEstimate(estimate);

      expect(formatted).not.toContain('Pricing Tier:');
    });
  });

  describe('formatPriceComparison', () => {
    it('should format price comparison for display', () => {
      const comparison = comparePrices(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 100,
          provider: Provider.Planet,
        },
        mockPricing,
      );

      const formatted = formatPriceComparison(comparison);

      expect(formatted).toContain('=== Price Comparison ===');
      expect(formatted).toContain('Selected: PLANET');
      // Both providers use same tier pricing
      expect(formatted).toContain('Cost: USD 800.00');
      expect(formatted).toContain('Alternatives:');
      expect(formatted).toContain('SATELLOGIC');
      // No savings since both are same price
      expect(formatted).toContain('You have selected the cheapest option!');
    });

    it('should show message when selected is cheapest', () => {
      const comparison = comparePrices(
        {
          productType: ProductType.Day,
          resolution: Resolution.High,
          areaSqKm: 100,
          provider: Provider.Satellogic,
        },
        mockPricing,
      );

      const formatted = formatPriceComparison(comparison);

      expect(formatted).toContain('You have selected the cheapest option!');
    });
  });

  describe('calculatePricingTierBreakdown', () => {
    it('should calculate pricing across area ranges', () => {
      const breakdown = calculatePricingTierBreakdown(
        ProductType.Day,
        Resolution.High,
        mockPricing,
        Provider.Planet,
      );

      expect(breakdown.length).toBeGreaterThan(0);

      // Check that pricing changes with tiers
      const smallArea = breakdown.find((b) => b.areaSqKm === 50);
      const mediumArea = breakdown.find((b) => b.areaSqKm === 500);
      const largeArea = breakdown.find((b) => b.areaSqKm === 5000);

      expect(smallArea?.tier).toBe('Small');
      expect(mediumArea?.tier).toBe('Medium');
      expect(largeArea?.tier).toBe('Large');

      // Price per sqkm should decrease with tier
      expect(smallArea?.pricePerSqKm).toBeGreaterThan(mediumArea?.pricePerSqKm ?? 0);
      expect(mediumArea?.pricePerSqKm).toBeGreaterThan(largeArea?.pricePerSqKm ?? 0);
    });

    it('should handle pricing without tiers', () => {
      const breakdown = calculatePricingTierBreakdown(
        ProductType.Day,
        Resolution.Medium, // No tiers
        mockPricing,
        Provider.Planet,
      );

      expect(breakdown.length).toBeGreaterThan(0);

      // All should have same price per sqkm
      const prices = breakdown.map((b) => b.pricePerSqKm).filter((p) => p > 0);
      const uniquePrices = new Set(prices);
      expect(uniquePrices.size).toBe(1);
    });
  });
});
