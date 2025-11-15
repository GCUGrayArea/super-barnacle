/**
 * Unit tests for SkyFi Pricing API
 */

import { SkyFiClient } from '../../src/skyfi/client';
import {
  getPricing,
  parseStructuredPricing,
  getPricingForProduct,
  getAvailableProductTypes,
  getAvailableResolutions,
  getAvailableProviders,
  formatPricingDisplay,
} from '../../src/skyfi/pricing';
import { ProductType, Resolution, Provider } from '../../src/types/skyfi-api';
import { PricingResponse } from '../../src/types/pricing';

// Mock the client module
jest.mock('../../src/skyfi/client');
jest.mock('../../src/lib/logger');

describe('SkyFi Pricing API', () => {
  let mockClient: jest.Mocked<SkyFiClient>;

  const mockPricingResponse: PricingResponse = {
    productTypes: {
      DAY: {
        description: 'Daytime optical imagery',
        deliveryTime: '24-48 hours',
        resolutions: {
          HIGH: {
            gsd: '0.5m',
            useCases: ['Urban planning', 'Infrastructure monitoring'],
            providers: {
              PLANET: {
                pricePerSqKm: 10.5,
                minPrice: 100,
                maxPrice: 10000,
                currency: 'USD',
                available: true,
                notes: 'High quality daytime imagery',
              },
              SATELLOGIC: {
                pricePerSqKm: 8.0,
                minPrice: 80,
                currency: 'USD',
                available: true,
              },
            },
          },
          MEDIUM: {
            gsd: '3m',
            providers: {
              PLANET: {
                pricePerSqKm: 5.0,
                minPrice: 50,
                currency: 'USD',
                available: true,
              },
            },
          },
        },
      },
      SAR: {
        description: 'Synthetic Aperture Radar imagery',
        resolutions: {
          HIGH: {
            gsd: '1m',
            providers: {
              UMBRA: {
                pricePerSqKm: 15.0,
                minPrice: 150,
                currency: 'USD',
                available: true,
              },
            },
          },
        },
      },
    },
    metadata: {
      currency: 'USD',
      lastUpdated: '2025-01-15T00:00:00Z',
      pricingGuideUrl: 'https://skyfi.com/pricing',
    },
  };

  beforeEach(() => {
    mockClient = new SkyFiClient({ apiKey: 'test-key' }) as jest.Mocked<SkyFiClient>;
    jest.clearAllMocks();
  });

  describe('getPricing', () => {
    it('should fetch pricing without AOI', async () => {
      mockClient.post = jest.fn().mockResolvedValue(mockPricingResponse);

      const result = await getPricing(mockClient);

      expect(mockClient.post).toHaveBeenCalledWith('/pricing', {});
      expect(result).toEqual(mockPricingResponse);
    });

    it('should fetch pricing with AOI', async () => {
      mockClient.post = jest.fn().mockResolvedValue(mockPricingResponse);

      const aoi = 'POLYGON((-97.72 30.28, -97.72 30.18, -97.62 30.18, -97.62 30.28, -97.72 30.28))';
      const result = await getPricing(mockClient, { aoi });

      expect(mockClient.post).toHaveBeenCalledWith('/pricing', { aoi });
      expect(result).toEqual(mockPricingResponse);
    });

    it('should validate AOI format', async () => {
      const invalidAoi = 'INVALID_WKT';

      await expect(getPricing(mockClient, { aoi: invalidAoi })).rejects.toThrow();
    });

    it('should handle API errors', async () => {
      mockClient.post = jest.fn().mockRejectedValue(new Error('API Error'));

      await expect(getPricing(mockClient)).rejects.toThrow('API Error');
    });
  });

  describe('parseStructuredPricing', () => {
    it('should parse pricing response into structured format', () => {
      const structured = parseStructuredPricing(mockPricingResponse);

      expect(structured.productTypes).toHaveLength(2);
      expect(structured.currency).toBe('USD');
      expect(structured.lastUpdated).toBe('2025-01-15T00:00:00Z');
      expect(structured.pricingGuideUrl).toBe('https://skyfi.com/pricing');

      // Check DAY product type
      const dayProduct = structured.productTypes.find((p) => p.productType === ProductType.Day);
      expect(dayProduct).toBeDefined();
      expect(dayProduct?.description).toBe('Daytime optical imagery');
      expect(dayProduct?.resolutions).toHaveLength(2);

      // Check HIGH resolution
      const highRes = dayProduct?.resolutions.find((r) => r.resolution === Resolution.High);
      expect(highRes).toBeDefined();
      expect(highRes?.gsd).toBe('0.5m');
      expect(highRes?.providers).toHaveLength(2);

      // Check PLANET provider
      const planetProvider = highRes?.providers.find((p) => p.provider === Provider.Planet);
      expect(planetProvider).toBeDefined();
      expect(planetProvider?.pricePerSqKm).toBe(10.5);
      expect(planetProvider?.minPrice).toBe(100);
      expect(planetProvider?.available).toBe(true);
    });

    it('should handle empty product types', () => {
      const emptyResponse: PricingResponse = {
        productTypes: {},
      };

      const structured = parseStructuredPricing(emptyResponse);

      expect(structured.productTypes).toHaveLength(0);
      expect(structured.currency).toBe('USD');
    });
  });

  describe('getPricingForProduct', () => {
    beforeEach(() => {
      mockClient.post = jest.fn().mockResolvedValue(mockPricingResponse);
    });

    it('should get pricing for specific product and resolution', async () => {
      const result = await getPricingForProduct(
        mockClient,
        ProductType.Day,
        Resolution.High,
      );

      expect(result).toBeDefined();
      expect(result?.resolution).toBe(Resolution.High);
      expect(result?.providers).toHaveLength(2);
    });

    it('should return null for non-existent product type', async () => {
      const result = await getPricingForProduct(
        mockClient,
        ProductType.Video,
        Resolution.High,
      );

      expect(result).toBeNull();
    });

    it('should return null for non-existent resolution', async () => {
      const result = await getPricingForProduct(
        mockClient,
        ProductType.Day,
        Resolution.VeryHigh,
      );

      expect(result).toBeNull();
    });

    it('should support AOI parameter', async () => {
      const aoi = 'POLYGON((-97.72 30.28, -97.72 30.18, -97.62 30.18, -97.62 30.28, -97.72 30.28))';

      await getPricingForProduct(mockClient, ProductType.Day, Resolution.High, aoi);

      expect(mockClient.post).toHaveBeenCalledWith('/pricing', { aoi });
    });
  });

  describe('getAvailableProductTypes', () => {
    beforeEach(() => {
      mockClient.post = jest.fn().mockResolvedValue(mockPricingResponse);
    });

    it('should return all available product types', async () => {
      const result = await getAvailableProductTypes(mockClient);

      expect(result).toHaveLength(2);
      expect(result).toContain(ProductType.Day);
      expect(result).toContain(ProductType.SAR);
    });
  });

  describe('getAvailableResolutions', () => {
    beforeEach(() => {
      mockClient.post = jest.fn().mockResolvedValue(mockPricingResponse);
    });

    it('should return available resolutions for product type', async () => {
      const result = await getAvailableResolutions(mockClient, ProductType.Day);

      expect(result).toHaveLength(2);
      expect(result).toContain(Resolution.High);
      expect(result).toContain(Resolution.Medium);
    });

    it('should return empty array for non-existent product type', async () => {
      const result = await getAvailableResolutions(mockClient, ProductType.Video);

      expect(result).toHaveLength(0);
    });
  });

  describe('getAvailableProviders', () => {
    beforeEach(() => {
      mockClient.post = jest.fn().mockResolvedValue(mockPricingResponse);
    });

    it('should return available providers for product and resolution', async () => {
      const result = await getAvailableProviders(
        mockClient,
        ProductType.Day,
        Resolution.High,
      );

      expect(result).toHaveLength(2);
      expect(result).toContain(Provider.Planet);
      expect(result).toContain(Provider.Satellogic);
    });

    it('should return empty array for non-existent product', async () => {
      const result = await getAvailableProviders(
        mockClient,
        ProductType.Video,
        Resolution.High,
      );

      expect(result).toHaveLength(0);
    });

    it('should return empty array for non-existent resolution', async () => {
      const result = await getAvailableProviders(
        mockClient,
        ProductType.Day,
        Resolution.VeryHigh,
      );

      expect(result).toHaveLength(0);
    });

    it('should only return available providers', async () => {
      const responseWithUnavailable: PricingResponse = {
        productTypes: {
          DAY: {
            resolutions: {
              HIGH: {
                providers: {
                  PLANET: {
                    pricePerSqKm: 10.5,
                    minPrice: 100,
                    currency: 'USD',
                    available: true,
                  },
                  SATELLOGIC: {
                    pricePerSqKm: 8.0,
                    minPrice: 80,
                    currency: 'USD',
                    available: false,
                  },
                },
              },
            },
          },
        },
      };

      mockClient.post = jest.fn().mockResolvedValue(responseWithUnavailable);

      const result = await getAvailableProviders(
        mockClient,
        ProductType.Day,
        Resolution.High,
      );

      expect(result).toHaveLength(1);
      expect(result).toContain(Provider.Planet);
      expect(result).not.toContain(Provider.Satellogic);
    });
  });

  describe('formatPricingDisplay', () => {
    it('should format pricing for display', () => {
      const structured = parseStructuredPricing(mockPricingResponse);
      const formatted = formatPricingDisplay(structured);

      expect(formatted).toContain('=== SkyFi Pricing Information ===');
      expect(formatted).toContain('Currency: USD');
      expect(formatted).toContain('Product Type: DAY');
      expect(formatted).toContain('Product Type: SAR');
      expect(formatted).toContain('PLANET: $10.5/sqkm (min: $100)');
      expect(formatted).toContain('SATELLOGIC: $8/sqkm (min: $80)');
      expect(formatted).toContain('https://skyfi.com/pricing');
    });

    it('should handle pricing without metadata', () => {
      const structured = parseStructuredPricing({
        productTypes: mockPricingResponse.productTypes,
      });
      const formatted = formatPricingDisplay(structured);

      expect(formatted).toContain('=== SkyFi Pricing Information ===');
      expect(formatted).toContain('Currency: USD');
      expect(formatted).not.toContain('Last Updated:');
      expect(formatted).not.toContain('visit:');
    });
  });
});
