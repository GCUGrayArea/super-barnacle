/**
 * SkyFi API Schema Validation Tests
 *
 * Tests for Zod validation schemas to ensure they correctly validate
 * API requests and responses according to the OpenAPI specification.
 */

import { describe, it, expect } from '@jest/globals';

import {
  // Enum schemas
  ProductTypeSchema,
  ResolutionSchema,
  DeliveryDriverSchema,
  OrderTypeSchema,
  DeliveryStatusSchema,
  FeasibilityCheckStatusSchema,
  ApiProviderSchema,
  SarProductTypeSchema,
  SarPolarisationSchema,
  // Request schemas
  GetArchivesRequestSchema,
  ArchiveOrderRequestSchema,
  TaskingOrderRequestSchema,
  PlatformApiFeasibilityTaskRequestSchema,
  PlatformApiPassPredictionRequestSchema,
  CreateNotificationRequestSchema,
  ListNotificationsRequestSchema,
  ListOrdersRequestSchema,
  PricingRequestSchema,
  // Response schemas
  GetArchivesResponseSchema,
  ArchiveOrderResponseSchema,
  TaskingOrderResponseSchema,
  PlatformFeasibilityTaskResponseSchema,
  PlatformPassPredictionResponseSchema,
  NotificationResponseSchema,
  ListNotificationsResponseSchema,
  ListOrdersResponseSchema,
  // Base schemas
  ArchiveSchema,
  PlatformPassSchema,
  CloudCoverageSchema,
} from '../../src/schemas/skyfi.schemas';

describe('Enum Schemas', () => {
  describe('ProductTypeSchema', () => {
    it('should validate correct product types', () => {
      expect(() => ProductTypeSchema.parse('DAY')).not.toThrow();
      expect(() => ProductTypeSchema.parse('MULTISPECTRAL')).not.toThrow();
      expect(() => ProductTypeSchema.parse('SAR')).not.toThrow();
    });

    it('should reject invalid product types', () => {
      expect(() => ProductTypeSchema.parse('INVALID')).toThrow();
      expect(() => ProductTypeSchema.parse('day')).toThrow();
      expect(() => ProductTypeSchema.parse('')).toThrow();
    });
  });

  describe('ResolutionSchema', () => {
    it('should validate correct resolutions', () => {
      expect(() => ResolutionSchema.parse('LOW')).not.toThrow();
      expect(() => ResolutionSchema.parse('HIGH')).not.toThrow();
      expect(() => ResolutionSchema.parse('VERY HIGH')).not.toThrow();
    });

    it('should reject invalid resolutions', () => {
      expect(() => ResolutionSchema.parse('INVALID')).toThrow();
      expect(() => ResolutionSchema.parse('low')).toThrow();
    });
  });

  describe('DeliveryDriverSchema', () => {
    it('should validate correct delivery drivers', () => {
      expect(() => DeliveryDriverSchema.parse('S3')).not.toThrow();
      expect(() => DeliveryDriverSchema.parse('GS')).not.toThrow();
      expect(() => DeliveryDriverSchema.parse('AZURE')).not.toThrow();
    });

    it('should reject invalid delivery drivers', () => {
      expect(() => DeliveryDriverSchema.parse('INVALID')).toThrow();
      expect(() => DeliveryDriverSchema.parse('s3')).toThrow();
    });
  });

  describe('OrderTypeSchema', () => {
    it('should validate correct order types', () => {
      expect(() => OrderTypeSchema.parse('ARCHIVE')).not.toThrow();
      expect(() => OrderTypeSchema.parse('TASKING')).not.toThrow();
    });

    it('should reject invalid order types', () => {
      expect(() => OrderTypeSchema.parse('INVALID')).toThrow();
    });
  });

  describe('DeliveryStatusSchema', () => {
    it('should validate correct delivery statuses', () => {
      expect(() => DeliveryStatusSchema.parse('CREATED')).not.toThrow();
      expect(() => DeliveryStatusSchema.parse('DELIVERY_COMPLETED')).not.toThrow();
      expect(() => DeliveryStatusSchema.parse('PROVIDER_FAILED')).not.toThrow();
    });

    it('should reject invalid delivery statuses', () => {
      expect(() => DeliveryStatusSchema.parse('INVALID')).toThrow();
    });
  });

  describe('ApiProviderSchema', () => {
    it('should validate correct providers', () => {
      expect(() => ApiProviderSchema.parse('PLANET')).not.toThrow();
      expect(() => ApiProviderSchema.parse('UMBRA')).not.toThrow();
      expect(() => ApiProviderSchema.parse('SATELLOGIC')).not.toThrow();
      expect(() => ApiProviderSchema.parse('ICEYE_US')).not.toThrow();
    });

    it('should reject invalid providers', () => {
      expect(() => ApiProviderSchema.parse('INVALID')).toThrow();
    });
  });
});

describe('Base Type Schemas', () => {
  describe('CloudCoverageSchema', () => {
    it('should validate valid cloud coverage', () => {
      expect(() =>
        CloudCoverageSchema.parse({
          percentage: 25.5,
          source: 'satellite',
        })).not.toThrow();
    });

    it('should accept null values', () => {
      expect(() =>
        CloudCoverageSchema.parse({
          percentage: null,
          source: null,
        })).not.toThrow();
    });

    it('should reject invalid percentage ranges', () => {
      expect(() =>
        CloudCoverageSchema.parse({
          percentage: -10,
        })).toThrow();

      expect(() =>
        CloudCoverageSchema.parse({
          percentage: 150,
        })).toThrow();
    });
  });

  describe('ArchiveSchema', () => {
    it('should validate valid archive data', () => {
      const validArchive = {
        id: 'archive-123',
        aoiSqkm: 100.5,
        provider: 'PLANET',
        productType: 'DAY',
        resolution: 'HIGH',
        cloudCoveragePercent: 15,
        offNadirAngle: 10,
        captureDate: '2025-01-15T10:30:00Z',
        catalogId: 'catalog-456',
        previewUrl: 'https://example.com/preview.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        metadata: { key: 'value' },
      };

      expect(() => ArchiveSchema.parse(validArchive)).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const invalidArchive = {
        id: 'archive-123',
        // Missing required fields
      };

      expect(() => ArchiveSchema.parse(invalidArchive)).toThrow();
    });

    it('should reject invalid datetime format', () => {
      const invalidArchive = {
        id: 'archive-123',
        aoiSqkm: 100.5,
        provider: 'PLANET',
        productType: 'DAY',
        resolution: 'HIGH',
        captureDate: 'invalid-date',
        catalogId: 'catalog-456',
      };

      expect(() => ArchiveSchema.parse(invalidArchive)).toThrow();
    });
  });

  describe('PlatformPassSchema', () => {
    it('should validate valid platform pass', () => {
      const validPass = {
        provider: 'PLANET',
        startTime: '2025-01-20T10:00:00Z',
        endTime: '2025-01-20T10:30:00Z',
        maxElevation: 45.5,
        minElevation: 10.2,
        providerWindowId: '550e8400-e29b-41d4-a716-446655440000',
      };

      expect(() => PlatformPassSchema.parse(validPass)).not.toThrow();
    });

    it('should validate with optional fields as null', () => {
      const validPass = {
        provider: 'UMBRA',
        startTime: '2025-01-20T10:00:00Z',
        endTime: '2025-01-20T10:30:00Z',
        maxElevation: null,
        minElevation: null,
        weatherDetails: null,
        providerWindowId: null,
      };

      expect(() => PlatformPassSchema.parse(validPass)).not.toThrow();
    });
  });
});

describe('Request Schemas', () => {
  describe('GetArchivesRequestSchema', () => {
    it('should validate valid archive search request', () => {
      const validRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        fromDate: '2025-01-01T00:00:00Z',
        toDate: '2025-01-31T23:59:59Z',
        maxCloudCoveragePercent: 20,
        maxOffNadirAngle: 15,
        resolutions: ['HIGH', 'VERY HIGH'],
        productTypes: ['DAY', 'MULTISPECTRAL'],
        providers: ['PLANET', 'SATELLOGIC'],
        openData: false,
        minOverlapRatio: 0.8,
        pageNumber: 0,
        pageSize: 50,
      };

      expect(() => GetArchivesRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should validate minimal archive search request', () => {
      const minimalRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
      };

      expect(() => GetArchivesRequestSchema.parse(minimalRequest)).not.toThrow();
    });

    it('should reject empty AOI', () => {
      const invalidRequest = {
        aoi: '',
      };

      expect(() => GetArchivesRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid cloud coverage percentage', () => {
      const invalidRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        maxCloudCoveragePercent: 150,
      };

      expect(() => GetArchivesRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid off nadir angle', () => {
      const invalidRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        maxOffNadirAngle: 60,
      };

      expect(() => GetArchivesRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('ArchiveOrderRequestSchema', () => {
    it('should validate valid archive order request', () => {
      const validRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        archiveId: 'archive-123',
        deliveryDriver: 'S3',
        deliveryParams: {
          bucket: 'my-bucket',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
        },
        label: 'My order',
        webhookUrl: 'https://example.com/webhook',
      };

      expect(() => ArchiveOrderRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should validate minimal archive order request', () => {
      const minimalRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        archiveId: 'archive-123',
      };

      expect(() => ArchiveOrderRequestSchema.parse(minimalRequest)).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const invalidRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        // Missing archiveId
      };

      expect(() => ArchiveOrderRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject invalid webhook URL', () => {
      const invalidRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        archiveId: 'archive-123',
        webhookUrl: 'not-a-valid-url',
      };

      expect(() => ArchiveOrderRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('TaskingOrderRequestSchema', () => {
    it('should validate valid tasking order request', () => {
      const validRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        windowStart: '2025-02-01T00:00:00Z',
        windowEnd: '2025-02-28T23:59:59Z',
        productType: 'DAY',
        resolution: 'HIGH',
        deliveryDriver: 'S3',
        deliveryParams: { bucket: 'my-bucket' },
        priorityItem: true,
        maxCloudCoveragePercent: 10,
        maxOffNadirAngle: 20,
        requiredProvider: 'PLANET',
        providerWindowId: '550e8400-e29b-41d4-a716-446655440000',
      };

      expect(() => TaskingOrderRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should validate SAR tasking order', () => {
      const sarRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        windowStart: '2025-02-01T00:00:00Z',
        windowEnd: '2025-02-28T23:59:59Z',
        productType: 'SAR',
        resolution: 'VERY HIGH',
        sarProductTypes: ['GEC', 'SICD'],
        sarPolarisation: 'HH',
        sarGrazingAngleMin: 20,
        sarGrazingAngleMax: 45,
        sarAzimuthAngleMin: 0,
        sarAzimuthAngleMax: 180,
        sarNumberOfLooks: 3,
      };

      expect(() => TaskingOrderRequestSchema.parse(sarRequest)).not.toThrow();
    });

    it('should reject invalid SAR angles', () => {
      const invalidRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        windowStart: '2025-02-01T00:00:00Z',
        windowEnd: '2025-02-28T23:59:59Z',
        productType: 'SAR',
        resolution: 'HIGH',
        sarGrazingAngleMin: 5, // Too low (min is 10)
      };

      expect(() => TaskingOrderRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('PlatformApiFeasibilityTaskRequestSchema', () => {
    it('should validate valid feasibility request', () => {
      const validRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        productType: 'DAY',
        resolution: 'HIGH',
        startDate: '2025-02-01T00:00:00Z',
        endDate: '2025-02-28T23:59:59Z',
        maxCloudCoveragePercent: 15,
        priorityItem: true,
        requiredProvider: 'PLANET',
      };

      expect(() => PlatformApiFeasibilityTaskRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should validate feasibility request with SAR parameters', () => {
      const sarRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        productType: 'SAR',
        resolution: 'HIGH',
        startDate: '2025-02-01T00:00:00Z',
        endDate: '2025-02-28T23:59:59Z',
        sarParameters: {
          productTypes: ['GEC'],
          polarisation: 'VV',
          grazingAngleMin: 25,
          grazingAngleMax: 40,
        },
      };

      expect(() => PlatformApiFeasibilityTaskRequestSchema.parse(sarRequest)).not.toThrow();
    });
  });

  describe('CreateNotificationRequestSchema', () => {
    it('should validate valid notification request', () => {
      const validRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
        gsdMin: 30,
        gsdMax: 50,
        productType: 'DAY',
      };

      expect(() => CreateNotificationRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject invalid webhook URL', () => {
      const invalidRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        webhookUrl: 'not-a-url',
      };

      expect(() => CreateNotificationRequestSchema.parse(invalidRequest)).toThrow();
    });
  });
});

describe('Response Schemas', () => {
  describe('GetArchivesResponseSchema', () => {
    it('should validate valid archive search response', () => {
      const validResponse = {
        request: {
          aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
          fromDate: '2025-01-01T00:00:00Z',
          toDate: '2025-01-31T23:59:59Z',
        },
        archives: [
          {
            id: 'archive-1',
            aoiSqkm: 100.5,
            provider: 'PLANET',
            productType: 'DAY',
            resolution: 'HIGH',
            captureDate: '2025-01-15T10:30:00Z',
            catalogId: 'catalog-1',
          },
        ],
        nextPage: null,
        total: 1,
      };

      expect(() => GetArchivesResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe('ArchiveOrderResponseSchema', () => {
    it('should validate valid archive order response', () => {
      const validResponse = {
        id: 'order-123',
        orderId: 'order-123',
        itemId: 'item-456',
        orderType: 'ARCHIVE',
        orderCost: 1000,
        ownerId: 'user-789',
        status: 'CREATED',
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        aoiSqkm: 100.5,
        archiveId: 'archive-123',
        orderCode: 'ORDER-2025-001',
        createdAt: '2025-01-15T10:00:00Z',
        downloadImageUrl: null,
        downloadPayloadUrl: null,
        archive: {
          id: 'archive-123',
          aoiSqkm: 100.5,
          provider: 'PLANET',
          productType: 'DAY',
          resolution: 'HIGH',
          captureDate: '2025-01-15T10:30:00Z',
          catalogId: 'catalog-456',
        },
      };

      expect(() => ArchiveOrderResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe('TaskingOrderResponseSchema', () => {
    it('should validate valid tasking order response', () => {
      const validResponse = {
        id: 'order-123',
        orderId: 'order-123',
        itemId: 'item-456',
        orderType: 'TASKING',
        orderCost: 5000,
        ownerId: 'user-789',
        status: 'PROVIDER_PENDING',
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        aoiSqkm: 100.5,
        windowStart: '2025-02-01T00:00:00Z',
        windowEnd: '2025-02-28T23:59:59Z',
        productType: 'DAY',
        resolution: 'HIGH',
        orderCode: 'TASKING-2025-001',
        createdAt: '2025-01-15T10:00:00Z',
        downloadImageUrl: null,
        downloadPayloadUrl: null,
      };

      expect(() => TaskingOrderResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe('PlatformFeasibilityTaskResponseSchema', () => {
    it('should validate valid feasibility response', () => {
      const validResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        validUntil: '2025-02-15T23:59:59Z',
        overallScore: {
          score: 0.85,
          reasoning: 'High probability of successful capture',
        },
      };

      expect(() => PlatformFeasibilityTaskResponseSchema.parse(validResponse)).not.toThrow();
    });

    it('should validate with null overall score', () => {
      const validResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        validUntil: '2025-02-15T23:59:59Z',
        overallScore: null,
      };

      expect(() => PlatformFeasibilityTaskResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe('PlatformPassPredictionResponseSchema', () => {
    it('should validate valid pass prediction response', () => {
      const validResponse = {
        passes: [
          {
            provider: 'PLANET',
            startTime: '2025-02-05T10:00:00Z',
            endTime: '2025-02-05T10:30:00Z',
            maxElevation: 45.5,
            minElevation: 10.2,
            providerWindowId: '550e8400-e29b-41d4-a716-446655440000',
          },
          {
            provider: 'UMBRA',
            startTime: '2025-02-06T14:00:00Z',
            endTime: '2025-02-06T14:25:00Z',
          },
        ],
      };

      expect(() => PlatformPassPredictionResponseSchema.parse(validResponse)).not.toThrow();
    });

    it('should validate empty passes array', () => {
      const validResponse = {
        passes: [],
      };

      expect(() => PlatformPassPredictionResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe('NotificationResponseSchema', () => {
    it('should validate valid notification response', () => {
      const validResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        ownerId: 'user-123',
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
        gsdMin: 30,
        gsdMax: 50,
        productType: 'DAY',
        webhookUrl: 'https://example.com/webhook',
        createdAt: '2025-01-15T10:00:00Z',
      };

      expect(() => NotificationResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe('ListOrdersResponseSchema', () => {
    it('should validate valid list orders response', () => {
      const validResponse = {
        request: {
          orderType: 'ARCHIVE',
          pageNumber: 0,
          pageSize: 50,
        },
        total: 2,
        orders: [
          {
            order: {
              id: 'order-1',
              orderId: 'order-1',
              itemId: 'item-1',
              orderType: 'ARCHIVE',
              orderCost: 1000,
              ownerId: 'user-123',
              status: 'DELIVERY_COMPLETED',
              aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
              aoiSqkm: 100,
              archiveId: 'archive-1',
              orderCode: 'ORDER-001',
              createdAt: '2025-01-15T10:00:00Z',
              downloadImageUrl: null,
              downloadPayloadUrl: null,
            },
            event: {
              eventType: 'DELIVERY_COMPLETE',
              timestamp: '2025-01-15T12:00:00Z',
              message: 'Delivery completed successfully',
            },
          },
        ],
      };

      expect(() => ListOrdersResponseSchema.parse(validResponse)).not.toThrow();
    });
  });
});

describe('Schema Integration Tests', () => {
  it('should handle nested schemas correctly', () => {
    const archiveResponse = {
      request: {
        aoi: 'POLYGON((-97.72 30.28, -97.71 30.28, -97.71 30.27, -97.72 30.27, -97.72 30.28))',
      },
      archives: [
        {
          id: 'archive-1',
          aoiSqkm: 100.5,
          provider: 'PLANET',
          productType: 'DAY',
          resolution: 'HIGH',
          captureDate: '2025-01-15T10:30:00Z',
          catalogId: 'catalog-1',
          cloudCoveragePercent: 15,
        },
      ],
      total: 1,
    };

    expect(() => GetArchivesResponseSchema.parse(archiveResponse)).not.toThrow();
  });

  it('should provide clear error messages for validation failures', () => {
    try {
      GetArchivesRequestSchema.parse({
        aoi: '', // Invalid: empty AOI
        maxCloudCoveragePercent: 150, // Invalid: out of range
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error).toBeDefined();
      // Zod errors contain detailed path and message information
    }
  });
});
