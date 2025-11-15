/**
 * Unit Tests for Get Pricing Info MCP Tool
 */

import { SkyFiClient } from '../../../src/skyfi/client.js';
import {
  getPricingInfo,
  getPricingInfoToolDefinition,
  createPricingToolHandler,
} from '../../../src/mcp/tools/get-pricing.ts';
import { ProductType, Resolution, Provider } from '../../../src/types/skyfi-api.js';
import { PricingResponse } from '../../../src/types/pricing.js';

// Mock only the logger
jest.mock('../../../src/lib/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Get Pricing Info MCP Tool', () => {
  let mockClient: jest.Mocked<SkyFiClient>;
  let mockPricingResponse: PricingResponse;

  beforeEach(() => {
    // Create mock client with mocked post method
    mockClient = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;

    // Create mock pricing response
    mockPricingResponse = {
      productTypes: {
        [ProductType.Day]: {
          description: 'Daytime optical imagery',
          deliveryTime: '24-48 hours',
          resolutions: {
            [Resolution.High]: {
              gsd: '3-5m',
              useCases: ['Urban planning', 'Agriculture monitoring'],
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
                  notes: undefined,
                  available: true,
                },
              },
            },
            [Resolution.VeryHigh]: {
              gsd: '0.5-1m',
              useCases: ['Infrastructure inspection'],
              providers: {
                [Provider.Planet]: {
                  pricePerSqKm: 10.0,
                  minPrice: 100,
                  maxPrice: undefined,
                  currency: 'USD',
                  notes: undefined,
                  available: true,
                },
              },
            },
          },
        },
        [ProductType.SAR]: {
          description: 'Synthetic Aperture Radar imagery',
          deliveryTime: '24-72 hours',
          resolutions: {
            [Resolution.High]: {
              gsd: '3m',
              useCases: ['All-weather monitoring'],
              providers: {
                [Provider.Umbra]: {
                  pricePerSqKm: 15.0,
                  minPrice: 200,
                  maxPrice: undefined,
                  currency: 'USD',
                  notes: undefined,
                  available: true,
                },
              },
            },
          },
        },
      },
      metadata: {
        lastUpdated: '2025-01-01',
        currency: 'USD',
        pricingGuideUrl: 'https://skyfi.com/pricing',
      },
    };

    mockClient.post.mockResolvedValue(mockPricingResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPricingInfo', () => {
    it('should retrieve all pricing information with no filters', async () => {
      const result = await getPricingInfo(mockClient, {});

      expect(mockClient.post).toHaveBeenCalledWith('/pricing', {});
      expect(result).toContain('SkyFi Satellite Imagery Pricing');
      expect(result).toContain(ProductType.Day);
      expect(result).toContain(ProductType.SAR);
      expect(result).toContain('Pricing Tiers');
    });

    it('should filter pricing by product type', async () => {
      const result = await getPricingInfo(mockClient, {
        productType: ProductType.Day,
      });

      expect(result).toContain(ProductType.Day);
      expect(result).not.toContain(ProductType.SAR);
      expect(result).toContain('Filters Applied');
      expect(result).toContain('Product Type: DAY');
    });

    it('should filter pricing by resolution', async () => {
      const result = await getPricingInfo(mockClient, {
        resolution: Resolution.High,
      });

      expect(result).toContain(Resolution.High);
      expect(result).not.toContain(Resolution.VeryHigh);
      expect(result).toContain('Filters Applied');
      expect(result).toContain('Resolution: HIGH');
    });

    it('should filter pricing by provider', async () => {
      const result = await getPricingInfo(mockClient, {
        provider: Provider.Planet,
      });

      expect(result).toContain(Provider.Planet);
      expect(result).not.toContain(Provider.Umbra);
      expect(result).toContain('Filters Applied');
      expect(result).toContain('Provider: PLANET');
    });

    it('should calculate cost estimates when AOI size provided', async () => {
      const result = await getPricingInfo(mockClient, {
        aoiSqkm: 100,
      });

      expect(result).toContain('Cost Estimates');
      expect(result).toContain('For an area of 100 square kilometers');
      expect(result).toContain('Total Cost');
    });

    it('should combine filters and cost estimates', async () => {
      const result = await getPricingInfo(mockClient, {
        productType: ProductType.Day,
        resolution: Resolution.High,
        aoiSqkm: 50,
      });

      expect(result).toContain('Filters Applied');
      expect(result).toContain('Product Type: DAY');
      expect(result).toContain('Resolution: HIGH');
      expect(result).toContain('Cost Estimates');
      expect(result).toContain('For an area of 50 square kilometers');
    });

    it('should include warning for large AOI', async () => {
      const result = await getPricingInfo(mockClient, {
        aoiSqkm: 15000,
      });

      expect(result).toContain('WARNING: Large Area of Interest');
      expect(result).toContain('15,000');
    });

    it('should include pricing guidance section', async () => {
      const result = await getPricingInfo(mockClient, {});

      expect(result).toContain('Pricing Information & Guidance');
      expect(result).toContain('Key Factors Affecting Price');
      expect(result).toContain('Open Data Opportunities');
      expect(result).toContain('Getting Exact Quotes');
    });

    it('should include metadata in results', async () => {
      const result = await getPricingInfo(mockClient, {});

      expect(result).toContain('**Currency:** USD');
      expect(result).toContain('**Last Updated:** 2025-01-01');
      expect(result).toContain('**Official Pricing Guide:** https://skyfi.com/pricing');
    });

    it('should handle invalid product type', async () => {
      const result = await getPricingInfo(mockClient, {
        productType: 'INVALID' as ProductType,
      });

      expect(result).toContain('Pricing Information Error');
      expect(result).toContain('Invalid product type');
      expect(result).toContain('Troubleshooting');
    });

    it('should handle invalid resolution', async () => {
      const result = await getPricingInfo(mockClient, {
        resolution: 'INVALID' as Resolution,
      });

      expect(result).toContain('Pricing Information Error');
      expect(result).toContain('Invalid resolution');
    });

    it('should handle invalid provider', async () => {
      const result = await getPricingInfo(mockClient, {
        provider: 'INVALID' as Provider,
      });

      expect(result).toContain('Pricing Information Error');
      expect(result).toContain('Invalid provider');
    });

    it('should handle invalid AOI size (negative)', async () => {
      const result = await getPricingInfo(mockClient, {
        aoiSqkm: -10,
      });

      expect(result).toContain('Pricing Information Error');
      expect(result).toContain('must be a positive number');
    });

    it('should handle invalid AOI size (too large)', async () => {
      const result = await getPricingInfo(mockClient, {
        aoiSqkm: 600000,
      });

      expect(result).toContain('Pricing Information Error');
      expect(result).toContain('must not exceed 500,000');
    });

    it('should handle API errors gracefully', async () => {
      mockClient.post.mockRejectedValue(new Error('API connection failed'));

      const result = await getPricingInfo(mockClient, {});

      expect(result).toContain('Pricing Information Error');
      expect(result).toContain('API connection failed');
      expect(result).toContain('Troubleshooting');
    });
  });

  describe('getPricingInfoToolDefinition', () => {
    it('should return valid tool definition', () => {
      const definition = getPricingInfoToolDefinition();

      expect(definition).toHaveProperty('name', 'get_pricing_info');
      expect(definition).toHaveProperty('description');
      expect(definition).toHaveProperty('inputSchema');
      expect(definition.inputSchema).toHaveProperty('type', 'object');
      expect(definition.inputSchema).toHaveProperty('properties');
    });

    it('should have all required input parameters in schema', () => {
      const definition = getPricingInfoToolDefinition();
      const properties = definition.inputSchema.properties;

      expect(properties).toHaveProperty('productType');
      expect(properties).toHaveProperty('resolution');
      expect(properties).toHaveProperty('provider');
      expect(properties).toHaveProperty('aoiSqkm');
    });

    it('should have correct parameter types', () => {
      const definition = getPricingInfoToolDefinition();
      const properties = definition.inputSchema.properties;

      expect(properties.productType).toHaveProperty('type', 'string');
      expect(properties.resolution).toHaveProperty('type', 'string');
      expect(properties.provider).toHaveProperty('type', 'string');
      expect(properties.aoiSqkm).toHaveProperty('type', 'number');
    });

    it('should have enums for product type', () => {
      const definition = getPricingInfoToolDefinition();
      const productType = definition.inputSchema.properties.productType;

      expect(productType).toHaveProperty('enum');
      expect(productType.enum).toContain('DAY');
      expect(productType.enum).toContain('NIGHT');
      expect(productType.enum).toContain('SAR');
    });
  });

  describe('createPricingToolHandler', () => {
    it('should create a handler function', () => {
      const handler = createPricingToolHandler(mockClient);

      expect(handler).toBeInstanceOf(Function);
    });

    it('should handle tool calls correctly', async () => {
      const handler = createPricingToolHandler(mockClient);

      const result = await handler({
        productType: ProductType.Day,
      });

      expect(mockClient.post).toHaveBeenCalledWith('/pricing', {});
      expect(result).toContain('SkyFi Satellite Imagery Pricing');
      expect(result).toContain(ProductType.Day);
    });

    it('should pass through errors as formatted responses', async () => {
      mockClient.post.mockRejectedValue(new Error('Test error'));

      const handler = createPricingToolHandler(mockClient);
      const result = await handler({});

      expect(result).toContain('Pricing Information Error');
      expect(result).toContain('Test error');
    });
  });

  describe('edge cases', () => {
    it('should handle empty pricing response', async () => {
      mockClient.post.mockResolvedValue({
        productTypes: {},
        metadata: {},
      });

      const result = await getPricingInfo(mockClient, {});

      expect(result).toContain('SkyFi Satellite Imagery Pricing');
      expect(result).toContain('Pricing Tiers');
    });

    it('should handle missing metadata', async () => {
      mockClient.post.mockResolvedValue({
        productTypes: mockPricingResponse.productTypes,
      });

      const result = await getPricingInfo(mockClient, {});

      expect(result).toContain('SkyFi Satellite Imagery Pricing');
      // Should not crash without metadata
    });

    it('should handle zero AOI size gracefully', async () => {
      const result = await getPricingInfo(mockClient, {
        aoiSqkm: 0,
      });

      expect(result).toContain('Pricing Information Error');
    });

    it('should handle very small AOI size', async () => {
      const result = await getPricingInfo(mockClient, {
        aoiSqkm: 0.01,
      });

      expect(result).toContain('Cost Estimates');
      expect(result).toContain('For an area of 0.01 square kilometers');
    });

    it('should handle AOI at threshold (10000)', async () => {
      const result = await getPricingInfo(mockClient, {
        aoiSqkm: 10000,
      });

      // Should not include warning at exactly 10000
      expect(result).not.toContain('WARNING: Large Area of Interest');
    });

    it('should handle AOI just above threshold', async () => {
      const result = await getPricingInfo(mockClient, {
        aoiSqkm: 10001,
      });

      // Should include warning just above 10000
      expect(result).toContain('WARNING: Large Area of Interest');
    });
  });
});
