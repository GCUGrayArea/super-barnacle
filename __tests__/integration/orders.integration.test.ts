/**
 * Integration Tests for Order Placement
 *
 * Tests complete order placement flows for both archive and tasking orders
 * with various delivery configurations (S3, GCS, Azure).
 */

import axios from 'axios';
import { SkyFiClient } from '../../src/skyfi/client';
import { createConfigFromEnv } from '../../src/skyfi/config';
import { placeArchiveOrder, placeTaskingOrder } from '../../src/skyfi/orders';
import { DeliveryDriver, ProductType, Resolution } from '../../src/types/skyfi-api';
import {
  mockArchiveOrder,
  mockTaskingOrder,
  validWKTPolygonLarge,
  mockS3DeliveryParams,
  mockGCSDeliveryParams,
  mockAzureDeliveryParams,
  mockValidationError,
  mockAuthenticationError,
  mockRateLimitError,
  mockServerError,
} from '../fixtures/skyfi-responses';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Order Placement Integration Tests', () => {
  let client: SkyFiClient;
  let mockAxiosInstance: any;

  beforeAll(() => {
    process.env['SKYFI_API_KEY'] = 'test-api-key';
    process.env['SKYFI_BASE_URL'] = 'https://api.test.skyfi.com';
  });

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    };

    mockedAxios.create = jest.fn(() => mockAxiosInstance) as unknown as typeof axios.create;

    const config = createConfigFromEnv();
    client = new SkyFiClient(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Archive Order Placement - Success Cases', () => {
    it('should place archive order with S3 delivery', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: mockArchiveOrder,
        status: 200,
      });

      const result = await placeArchiveOrder(client, {
        aoi: validWKTPolygonLarge,
        archiveId: 'db4794dd-da6a-45b4-ac6e-b9e50e36bb29',
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: mockS3DeliveryParams,
      });

      expect(result.orderId).toBe(mockArchiveOrder.orderId);
      expect(result.deliveryDriver).toBe(DeliveryDriver.S3);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/order-archive',
        }),
      );
    });

    it('should place archive order with GCS delivery', async () => {
      const gcsOrder = {
        ...mockArchiveOrder,
        deliveryDriver: DeliveryDriver.GS,
        deliveryParams: mockGCSDeliveryParams,
      };

      mockAxiosInstance.request.mockResolvedValue({
        data: gcsOrder,
        status: 200,
      });

      const result = await placeArchiveOrder(client, {
        aoi: validWKTPolygonLarge,
        archiveId: 'db4794dd-da6a-45b4-ac6e-b9e50e36bb29',
        deliveryDriver: DeliveryDriver.GS,
        deliveryParams: mockGCSDeliveryParams,
      });

      expect(result.deliveryDriver).toBe(DeliveryDriver.GS);
    });

    it('should place archive order with Azure delivery', async () => {
      const azureOrder = {
        ...mockArchiveOrder,
        deliveryDriver: DeliveryDriver.AZURE,
        deliveryParams: mockAzureDeliveryParams,
      };

      mockAxiosInstance.request.mockResolvedValue({
        data: azureOrder,
        status: 200,
      });

      const result = await placeArchiveOrder(client, {
        aoi: validWKTPolygonLarge,
        archiveId: 'db4794dd-da6a-45b4-ac6e-b9e50e36bb29',
        deliveryDriver: DeliveryDriver.AZURE,
        deliveryParams: mockAzureDeliveryParams,
      });

      expect(result.deliveryDriver).toBe(DeliveryDriver.AZURE);
    });

    it('should place archive order with webhook URL', async () => {
      const orderWithWebhook = {
        ...mockArchiveOrder,
        webhookUrl: 'https://example.com/webhook',
      };

      mockAxiosInstance.request.mockResolvedValue({
        data: orderWithWebhook,
        status: 200,
      });

      const result = await placeArchiveOrder(client, {
        aoi: validWKTPolygonLarge,
        archiveId: 'db4794dd-da6a-45b4-ac6e-b9e50e36bb29',
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: mockS3DeliveryParams,
        webhookUrl: 'https://example.com/webhook',
      });

      expect(result.webhookUrl).toBe('https://example.com/webhook');
    });

    it('should place archive order with metadata', async () => {
      const orderWithMetadata = {
        ...mockArchiveOrder,
        metadata: { project: 'test-project', team: 'engineering' },
      };

      mockAxiosInstance.request.mockResolvedValue({
        data: orderWithMetadata,
        status: 200,
      });

      const result = await placeArchiveOrder(client, {
        aoi: validWKTPolygonLarge,
        archiveId: 'db4794dd-da6a-45b4-ac6e-b9e50e36bb29',
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: mockS3DeliveryParams,
        metadata: { project: 'test-project', team: 'engineering' },
      });

      expect(result.metadata).toEqual({ project: 'test-project', team: 'engineering' });
    });

    it('should place open data archive order', async () => {
      const openDataOrder = {
        ...mockArchiveOrder,
        orderCost: 0,
      };

      mockAxiosInstance.request.mockResolvedValue({
        data: openDataOrder,
        status: 200,
      });

      const result = await placeArchiveOrder(client, {
        aoi: validWKTPolygonLarge,
        archiveId: 'db4794dd-da6a-45b4-ac6e-b9e50e36bb29',
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: mockS3DeliveryParams,
      });

      expect(result.orderCost).toBe(0);
    });
  });

  describe('Tasking Order Placement - Success Cases', () => {
    it('should place tasking order with complete parameters', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: mockTaskingOrder,
        status: 200,
      });

      const result = await placeTaskingOrder(client, {
        aoi: mockTaskingOrder.aoi!,
        windowStart: '2025-01-20T00:00:00Z',
        windowEnd: '2025-01-25T23:59:59Z',
        productType: ProductType.Day,
        resolution: Resolution.VeryHigh,
        deliveryDriver: DeliveryDriver.GS,
        deliveryParams: mockGCSDeliveryParams,
        maxCloudCoveragePercent: 20,
        maxOffNadirAngle: 30,
      });

      expect(result.orderId).toBe(mockTaskingOrder.orderId);
      expect(result.orderType).toBe('TASKING');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/order-tasking',
        }),
      );
    });

    it('should place SAR tasking order with specialized parameters', async () => {
      const sarOrder = {
        ...mockTaskingOrder,
        productType: ProductType.SAR,
        sarPolarisation: 'HH',
        sarGrazingAngleMin: 30,
        sarGrazingAngleMax: 50,
        sarProductTypes: ['SICD', 'GEC'],
      };

      mockAxiosInstance.request.mockResolvedValue({
        data: sarOrder,
        status: 200,
      });

      const result = await placeTaskingOrder(client, {
        aoi: mockTaskingOrder.aoi!,
        windowStart: '2025-01-20T00:00:00Z',
        windowEnd: '2025-01-25T23:59:59Z',
        productType: ProductType.SAR,
        resolution: Resolution.VeryHigh,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: mockS3DeliveryParams,
        sarPolarisation: 'HH',
        sarGrazingAngleMin: 30,
        sarGrazingAngleMax: 50,
        sarProductTypes: ['SICD', 'GEC'],
      });

      expect(result.productType).toBe(ProductType.SAR);
    });

    it('should place tasking order with provider window ID', async () => {
      const orderWithWindowId = {
        ...mockTaskingOrder,
        providerWindowId: '987e6543-e21b-43d1-b789-123456789abc',
      };

      mockAxiosInstance.request.mockResolvedValue({
        data: orderWithWindowId,
        status: 200,
      });

      const result = await placeTaskingOrder(client, {
        aoi: mockTaskingOrder.aoi!,
        windowStart: '2025-01-20T00:00:00Z',
        windowEnd: '2025-01-25T23:59:59Z',
        productType: ProductType.Day,
        resolution: Resolution.VeryHigh,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: mockS3DeliveryParams,
        providerWindowId: '987e6543-e21b-43d1-b789-123456789abc',
      });

      expect(result.providerWindowId).toBe('987e6543-e21b-43d1-b789-123456789abc');
    });

    it('should place priority tasking order', async () => {
      const priorityOrder = {
        ...mockTaskingOrder,
        priorityItem: true,
      };

      mockAxiosInstance.request.mockResolvedValue({
        data: priorityOrder,
        status: 200,
      });

      const result = await placeTaskingOrder(client, {
        aoi: mockTaskingOrder.aoi!,
        windowStart: '2025-01-20T00:00:00Z',
        windowEnd: '2025-01-25T23:59:59Z',
        productType: ProductType.Day,
        resolution: Resolution.VeryHigh,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: mockS3DeliveryParams,
        priorityItem: true,
      });

      expect(result.priorityItem).toBe(true);
    });

    it('should place tasking order with required provider', async () => {
      const providerOrder = {
        ...mockTaskingOrder,
        requiredProvider: 'PLANET',
      };

      mockAxiosInstance.request.mockResolvedValue({
        data: providerOrder,
        status: 200,
      });

      const result = await placeTaskingOrder(client, {
        aoi: mockTaskingOrder.aoi!,
        windowStart: '2025-01-20T00:00:00Z',
        windowEnd: '2025-01-25T23:59:59Z',
        productType: ProductType.Day,
        resolution: Resolution.VeryHigh,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: mockS3DeliveryParams,
        requiredProvider: 'PLANET',
      });

      expect(result.requiredProvider).toBe('PLANET');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle validation errors for invalid AOI', async () => {
      const validationError = new Error('Validation failed');
      (validationError as any).response = {
        status: 422,
        data: mockValidationError,
      };
      (validationError as any).isAxiosError = true;
      mockAxiosInstance.request.mockRejectedValue(validationError);

      await expect(
        placeArchiveOrder(client, {
          aoi: 'INVALID WKT',
          archiveId: 'test-archive',
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: mockS3DeliveryParams,
        }),
      ).rejects.toThrow();
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).response = {
        status: 401,
        data: mockAuthenticationError,
      };
      (authError as any).isAxiosError = true;
      mockAxiosInstance.request.mockRejectedValue(authError);

      await expect(
        placeArchiveOrder(client, {
          aoi: validWKTPolygonLarge,
          archiveId: 'test-archive',
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: mockS3DeliveryParams,
        }),
      ).rejects.toThrow();
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as any).response = {
        status: 429,
        data: mockRateLimitError,
        headers: { 'retry-after': '60' },
      };
      (rateLimitError as any).isAxiosError = true;
      mockAxiosInstance.request.mockRejectedValue(rateLimitError);

      await expect(
        placeTaskingOrder(client, {
          aoi: mockTaskingOrder.aoi!,
          windowStart: '2025-01-20T00:00:00Z',
          windowEnd: '2025-01-25T23:59:59Z',
          productType: ProductType.Day,
          resolution: Resolution.VeryHigh,
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: mockS3DeliveryParams,
        }),
      ).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Server error');
      (serverError as any).response = {
        status: 500,
        data: mockServerError,
      };
      (serverError as any).isAxiosError = true;
      mockAxiosInstance.request.mockRejectedValue(serverError);

      await expect(
        placeArchiveOrder(client, {
          aoi: validWKTPolygonLarge,
          archiveId: 'test-archive',
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: mockS3DeliveryParams,
        }),
      ).rejects.toThrow();
    });

    it('should handle invalid delivery parameters', async () => {
      const validationError = new Error('Invalid delivery params');
      (validationError as any).response = {
        status: 422,
        data: {
          detail: [
            {
              loc: ['body', 'deliveryParams'],
              msg: 'Invalid S3 credentials',
              type: 'value_error',
            },
          ],
        },
      };
      (validationError as any).isAxiosError = true;
      mockAxiosInstance.request.mockRejectedValue(validationError);

      await expect(
        placeArchiveOrder(client, {
          aoi: validWKTPolygonLarge,
          archiveId: 'test-archive',
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: {
            s3_bucket_id: 'invalid',
            aws_region: 'invalid',
            aws_access_key: '',
            aws_secret_key: '',
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal archive order parameters', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: mockArchiveOrder,
        status: 200,
      });

      const result = await placeArchiveOrder(client, {
        aoi: validWKTPolygonLarge,
        archiveId: 'test-archive',
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: mockS3DeliveryParams,
      });

      expect(result.orderId).toBeDefined();
    });

    it('should handle tasking order with all optional parameters', async () => {
      const completeOrder = {
        ...mockTaskingOrder,
        metadata: { project: 'test' },
        webhookUrl: 'https://example.com/webhook',
        priorityItem: true,
        requiredProvider: 'PLANET',
        providerWindowId: 'test-window-id',
      };

      mockAxiosInstance.request.mockResolvedValue({
        data: completeOrder,
        status: 200,
      });

      const result = await placeTaskingOrder(client, {
        aoi: mockTaskingOrder.aoi!,
        windowStart: '2025-01-20T00:00:00Z',
        windowEnd: '2025-01-25T23:59:59Z',
        productType: ProductType.Day,
        resolution: Resolution.VeryHigh,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: mockS3DeliveryParams,
        metadata: { project: 'test' },
        webhookUrl: 'https://example.com/webhook',
        priorityItem: true,
        requiredProvider: 'PLANET',
        providerWindowId: 'test-window-id',
      });

      expect(result).toBeDefined();
    });
  });
});
