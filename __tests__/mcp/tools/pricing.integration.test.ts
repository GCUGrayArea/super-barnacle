/**
 * Integration Tests for Get Pricing Info MCP Tool
 *
 * These tests verify the tool works end-to-end with real pricing data structures
 * and properly integrates with the pricing service and calculator.
 */

import { SkyFiClient } from '../../../src/skyfi/client.js';
import {
  getPricingInfo,
  createPricingToolHandler,
} from '../../../src/mcp/tools/get-pricing.ts';
import { getPricing, parseStructuredPricing } from '../../../src/skyfi/pricing.js';
import { calculateCost } from '../../../src/lib/pricing-calculator.js';
import { ProductType, Resolution, Provider } from '../../../src/types/skyfi-api.js';
import { PricingResponse, StructuredPricing } from '../../../src/types/pricing.js';

// Mock only the API client's HTTP methods
jest.mock('../../../src/skyfi/client.js');
jest.mock('../../../src/lib/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Get Pricing Info MCP Tool - Integration Tests', () => {
  let mockClient: jest.Mocked<SkyFiClient>;
  let comprehensivePricingResponse: PricingResponse;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;

    // Create comprehensive pricing response covering multiple scenarios
    comprehensivePricingResponse = {
      productTypes: {
        [ProductType.Day]: {
          description: 'Daytime optical imagery with visible spectrum',
          deliveryTime: '24-48 hours for archive, 2-7 days for tasking',
          resolutions: {
            [Resolution.High]: {
              gsd: '3-5m',
              useCases: ['Urban planning', 'Agriculture monitoring', 'Environmental tracking'],
              providers: {
                [Provider.Planet]: {
                  pricePerSqKm: 2.5,
                  minPrice: 50,
                  maxPrice: undefined,
                  currency: 'USD',
                  notes: undefined,
                  available: true,
                },
                [Provider.Satellogic]: {
                  pricePerSqKm: 2.0,
                  minPrice: 40,
                  maxPrice: undefined,
                  currency: 'USD',
                  notes: 'Volume discounts available',
                  available: true,
                },
                [Provider.Siwei]: {
                  pricePerSqKm: 1.8,
                  minPrice: 35,
                  maxPrice: undefined,
                  currency: 'USD',
                  notes: undefined,
                  available: true,
                },
              },
            },
            [Resolution.VeryHigh]: {
              gsd: '0.5-1m',
              useCases: ['Infrastructure inspection', 'Detailed mapping', 'Security'],
              providers: {
                [Provider.Planet]: {
                  pricePerSqKm: 10.0,
                  minPrice: 100,
                  maxPrice: 5000,
                  currency: 'USD',
                  notes: undefined,
                  available: true,
                },
                [Provider.Satellogic]: {
                  pricePerSqKm: 8.5,
                  minPrice: 85,
                  maxPrice: undefined,
                  currency: 'USD',
                  notes: undefined,
                  available: true,
                },
              },
            },
            [Resolution.Low]: {
              gsd: '10-30m',
              useCases: ['Large area monitoring', 'Climate studies'],
              providers: {
                [Provider.Sentinel2]: {
                  pricePerSqKm: 0,
                  minPrice: 0,
                  maxPrice: undefined,
                  currency: 'USD',
                  notes: 'Free open data',
                  available: true,
                },
              },
            },
          },
        },
        [ProductType.SAR]: {
          description: 'Synthetic Aperture Radar - all-weather imaging',
          deliveryTime: '24-72 hours',
          resolutions: {
            [Resolution.High]: {
              gsd: '3m',
              useCases: ['All-weather monitoring', 'Change detection', 'Maritime surveillance'],
              providers: {
                [Provider.Umbra]: {
                  pricePerSqKm: 15.0,
                  minPrice: 200,
                  maxPrice: undefined,
                  currency: 'USD',
                  notes: 'High-resolution SAR',
                  available: true,
                },
                [Provider.IceyeUS]: {
                  pricePerSqKm: 12.0,
                  minPrice: 180,
                  maxPrice: undefined,
                  currency: 'USD',
                  notes: undefined,
                  available: true,
                },
              },
            },
          },
        },
        [ProductType.Night]: {
          description: 'Nighttime imagery',
          deliveryTime: '48-96 hours',
          resolutions: {
            [Resolution.Medium]: {
              gsd: '5-10m',
              useCases: ['Light pollution studies', 'Urban development'],
              providers: {
                [Provider.UrbanSky]: {
                  pricePerSqKm: 5.0,
                  minPrice: 75,
                  maxPrice: undefined,
                  currency: 'USD',
                  notes: undefined,
                  available: false, // Test unavailable provider
                },
              },
            },
          },
        },
      },
      metadata: {
        lastUpdated: '2025-01-15',
        currency: 'USD',
        pricingGuideUrl: 'https://skyfi.com/pricing-guide.pdf',
      },
    };

    // Mock the getPricing API call
    mockClient.post.mockResolvedValue(comprehensivePricingResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-end pricing retrieval', () => {
    it('should retrieve and format complete pricing information', async () => {
      const result = await getPricingInfo(mockClient, {});

      // Verify API was called
      expect(mockClient.post).toHaveBeenCalledWith('/pricing', {});

      // Verify structure
      expect(result).toContain('# SkyFi Satellite Imagery Pricing');
      expect(result).toContain('## Pricing Tiers');

      // Verify all product types present
      expect(result).toContain('### DAY');
      expect(result).toContain('### SAR');
      expect(result).toContain('### NIGHT');

      // Verify metadata
      expect(result).toContain('**Currency:** USD');
      expect(result).toContain('**Last Updated:** 2025-01-15');
      expect(result).toContain('https://skyfi.com/pricing-guide.pdf');
    });

    it('should calculate accurate cost estimates with real pricing', async () => {
      const aoiSqkm = 100;
      const result = await getPricingInfo(mockClient, { aoiSqkm });

      // Verify cost estimates section exists
      expect(result).toContain('## Cost Estimates');
      expect(result).toContain(`For an area of ${aoiSqkm} square kilometers`);

      // Verify table headers
      expect(result).toContain('| Product Type | Resolution | Provider | Price/sq km | Total Cost |');

      // Verify specific cost calculations
      // Planet DAY HIGH: 100 * 2.5 = 250 (above min of 50)
      expect(result).toContain('PLANET');
      expect(result).toContain('USD 2.50');

      // Should include cheaper Satellogic option
      expect(result).toContain('SATELLOGIC');
      expect(result).toContain('USD 2.00');

      // Should include free Sentinel-2
      expect(result).toContain('SENTINEL2');
      expect(result).toContain('USD 0.00');
    });

    it('should handle minimum price constraints in cost estimates', async () => {
      // Small AOI that triggers minimum pricing
      const aoiSqkm = 10; // 10 * 2.5 = 25, less than min of 50
      const result = await getPricingInfo(mockClient, { aoiSqkm });

      expect(result).toContain('## Cost Estimates');
      // The calculator should apply minimum price of 50 instead of calculated 25
      expect(result).toContain('USD 50.00'); // Minimum price for Planet HIGH
    });

    it('should filter by product type correctly', async () => {
      const result = await getPricingInfo(mockClient, {
        productType: ProductType.Day,
      });

      expect(result).toContain('**Filters Applied:**');
      expect(result).toContain('Product Type: DAY');
      expect(result).toContain('### DAY');
      expect(result).not.toContain('### SAR');
      expect(result).not.toContain('### NIGHT');
    });

    it('should filter by resolution correctly', async () => {
      const result = await getPricingInfo(mockClient, {
        resolution: Resolution.High,
      });

      expect(result).toContain('Resolution: HIGH');
      expect(result).toContain('#### HIGH');
      expect(result).not.toContain('#### VERY HIGH');
      expect(result).not.toContain('#### MEDIUM');

      // Should show both DAY and SAR products that have HIGH resolution
      expect(result).toContain('### DAY');
      expect(result).toContain('### SAR');
    });

    it('should filter by provider correctly', async () => {
      const result = await getPricingInfo(mockClient, {
        provider: Provider.Planet,
      });

      expect(result).toContain('Provider: PLANET');
      expect(result).toContain('| PLANET |');
      expect(result).not.toContain('| SATELLOGIC |');
      expect(result).not.toContain('| UMBRA |');

      // Should show products/resolutions where Planet is available
      expect(result).toContain('### DAY');
      expect(result).toContain('#### HIGH');
      expect(result).toContain('#### VERY HIGH');
    });

    it('should combine multiple filters', async () => {
      const result = await getPricingInfo(mockClient, {
        productType: ProductType.Day,
        resolution: Resolution.High,
        provider: Provider.Satellogic,
      });

      expect(result).toContain('Product Type: DAY');
      expect(result).toContain('Resolution: HIGH');
      expect(result).toContain('Provider: SATELLOGIC');

      // Should only show the specific combination
      expect(result).toContain('### DAY');
      expect(result).toContain('#### HIGH');
      expect(result).toContain('| SATELLOGIC |');

      // Should not show other options
      expect(result).not.toContain('| PLANET |');
      expect(result).not.toContain('#### VERY HIGH');
      expect(result).not.toContain('### SAR');
    });

    it('should calculate cost estimates with filters', async () => {
      const result = await getPricingInfo(mockClient, {
        productType: ProductType.Day,
        resolution: Resolution.High,
        aoiSqkm: 50,
      });

      expect(result).toContain('## Cost Estimates');
      expect(result).toContain('For an area of 50 square kilometers');

      // Should only show estimates for DAY + HIGH combinations
      // Planet: 50 * 2.5 = 125
      // Satellogic: 50 * 2.0 = 100
      // Siwei: 50 * 1.8 = 90

      expect(result).toContain('PLANET');
      expect(result).toContain('SATELLOGIC');
      expect(result).toContain('SIWEI');

      // Should not show SAR or other resolutions
      expect(result).not.toContain('UMBRA');
    });
  });

  describe('Special cases and edge conditions', () => {
    it('should exclude unavailable providers from cost estimates', async () => {
      const result = await getPricingInfo(mockClient, {
        productType: ProductType.Night,
        aoiSqkm: 100,
      });

      // NIGHT product has URBAN_SKY provider but it's marked as unavailable
      expect(result).toContain('### NIGHT');
      expect(result).toContain('Not Available'); // In the pricing table

      // Should not appear in cost estimates
      const costEstimatesSection = result.split('## Pricing Tiers')[0];
      if (costEstimatesSection.includes('## Cost Estimates')) {
        // If cost estimates exist, they should not include unavailable providers
        expect(costEstimatesSection).not.toContain('URBAN_SKY');
      }
    });

    it('should highlight free/open data options', async () => {
      const result = await getPricingInfo(mockClient, {
        productType: ProductType.Day,
        resolution: Resolution.Low,
      });

      expect(result).toContain('SENTINEL2');
      expect(result).toContain('USD 0.00');
      expect(result).toContain('Free open data');

      // Should mention open data in guidance
      expect(result).toContain('Open Data Opportunities');
      expect(result).toContain('Sentinel-2');
    });

    it('should warn about large AOI sizes', async () => {
      const result = await getPricingInfo(mockClient, {
        aoiSqkm: 50000,
      });

      expect(result).toContain('WARNING: Large Area of Interest');
      expect(result).toContain('50,000');
      expect(result).toContain('Recommendations:');
      expect(result).toContain('breaking into smaller tiles');
      expect(result).toContain('enterprise pricing');
    });

    it('should not warn for AOI at threshold', async () => {
      const result = await getPricingInfo(mockClient, {
        aoiSqkm: 10000,
      });

      expect(result).not.toContain('WARNING: Large Area of Interest');
    });

    it('should sort cost estimates by price (ascending)', async () => {
      const result = await getPricingInfo(mockClient, {
        productType: ProductType.Day,
        resolution: Resolution.High,
        aoiSqkm: 100,
      });

      const lines = result.split('\n');
      const costEstimateLines = lines.filter((line) => line.includes('| DAY | HIGH |'));

      // Verify estimates are present and ordered
      expect(costEstimateLines.length).toBeGreaterThan(0);

      // Extract costs and verify they're in ascending order
      const costs = costEstimateLines.map((line) => {
        const match = line.match(/\*\*USD (\d+\.\d+)\*\*/);
        return match ? parseFloat(match[1]) : 0;
      });

      for (let i = 1; i < costs.length; i++) {
        expect(costs[i]).toBeGreaterThanOrEqual(costs[i - 1]);
      }
    });
  });

  describe('Integration with pricing service and calculator', () => {
    it('should use actual parseStructuredPricing function', async () => {
      const result = await getPricingInfo(mockClient, {});

      // The real parseStructuredPricing should have processed the response
      expect(result).toContain('### DAY');
      expect(result).toContain('Daytime optical imagery');
      expect(result).toContain('24-48 hours for archive');
    });

    it('should use actual calculateCost function for estimates', async () => {
      const result = await getPricingInfo(mockClient, {
        productType: ProductType.Day,
        resolution: Resolution.VeryHigh,
        aoiSqkm: 20,
      });

      // calculateCost should apply min price logic
      // Planet VeryHigh: 20 * 10.0 = 200, min is 100, so should be 200
      expect(result).toContain('USD 200.00');

      // Satellogic VeryHigh: 20 * 8.5 = 170, min is 85, so should be 170
      expect(result).toContain('USD 170.00');
    });

    it('should handle complex provider notes', async () => {
      const result = await getPricingInfo(mockClient, {});

      // Should contain various provider notes from different products
      expect(result).toContain('Volume discounts available');
      expect(result).toContain('Free open data');
      expect(result).toContain('High-resolution SAR');
    });
  });

  describe('Tool handler integration', () => {
    it('should work through createPricingToolHandler', async () => {
      const handler = createPricingToolHandler(mockClient);

      const result = await handler({
        productType: ProductType.SAR,
        aoiSqkm: 25,
      });

      expect(result).toContain('### SAR');
      expect(result).toContain('## Cost Estimates');
      expect(result).toContain('For an area of 25 square kilometers');

      // SAR providers: Umbra (15.0) and IceyeUS (12.0)
      // 25 * 15.0 = 375, min 200, so 375
      // 25 * 12.0 = 300, min 180, so 300
      expect(result).toContain('USD 15.00'); // Price per sq km
      expect(result).toContain('USD 12.00'); // Price per sq km
    });
  });

  describe('Guidance and informational content', () => {
    it('should include comprehensive guidance section', async () => {
      const result = await getPricingInfo(mockClient, {});

      expect(result).toContain('## Pricing Information & Guidance');
      expect(result).toContain('### Key Factors Affecting Price');
      expect(result).toContain('Product Type');
      expect(result).toContain('Resolution');
      expect(result).toContain('Provider');
      expect(result).toContain('Area Size');
      expect(result).toContain('Location');

      expect(result).toContain('### Open Data Opportunities');
      expect(result).toContain('Sentinel-2');

      expect(result).toContain('### Getting Exact Quotes');
    });

    it('should include use cases for resolutions', async () => {
      const result = await getPricingInfo(mockClient, {
        productType: ProductType.Day,
      });

      expect(result).toContain('**Use Cases:**');
      expect(result).toContain('Urban planning');
      expect(result).toContain('Agriculture monitoring');
      expect(result).toContain('Infrastructure inspection');
      expect(result).toContain('Large area monitoring');
    });

    it('should include GSD information', async () => {
      const result = await getPricingInfo(mockClient, {
        productType: ProductType.Day,
      });

      expect(result).toContain('Ground Sample Distance: 3-5m');
      expect(result).toContain('Ground Sample Distance: 0.5-1m');
      expect(result).toContain('Ground Sample Distance: 10-30m');
    });
  });
});
