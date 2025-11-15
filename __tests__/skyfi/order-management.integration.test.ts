/**
 * Integration tests for Order Management Module
 *
 * These tests use mocked API responses to simulate real-world scenarios
 */

import axios from 'axios';
import { OrderManagement, createOrderManagement } from '../../src/skyfi/order-management';
import { SkyFiClient } from '../../src/skyfi/client';
import { createConfigFromEnv } from '../../src/skyfi/config';
import { OrderType, DeliveryStatus } from '../../src/types/order-status';
import { DeliveryDriver } from '../../src/types/skyfi-api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger to avoid console output during tests
jest.mock('../../src/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  createChildLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('OrderManagement Integration Tests', () => {
  let orderManagement: OrderManagement;
  let mockAxiosInstance: any;

  beforeAll(() => {
    // Set up environment variable for API key
    process.env.SKYFI_API_KEY = 'test-api-key-123';
  });

  beforeEach(() => {
    // Create mock axios instance
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

    // Mock axios.create to return our mock instance
    mockedAxios.create = jest.fn(() => mockAxiosInstance) as unknown as typeof axios.create;

    // Create client and order management instance
    const config = createConfigFromEnv();
    const client = new SkyFiClient(config);
    orderManagement = createOrderManagement(client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listOrders with realistic API responses', () => {
    it('should handle a typical list orders response', async () => {
      const mockResponse = {
        data: {
          request: {
            orderType: null,
            pageNumber: 0,
            pageSize: 10,
          },
          total: 3,
          orders: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              orderType: OrderType.ARCHIVE,
              orderCost: 5000,
              ownerId: '123e4567-e89b-12d3-a456-426614174000',
              status: DeliveryStatus.DELIVERY_COMPLETED,
              aoi: 'POLYGON((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
              aoiSqkm: 16.5,
              deliveryDriver: DeliveryDriver.S3,
              deliveryParams: {
                s3_bucket_id: 'my-imagery-bucket',
                aws_region: 'us-east-1',
              },
              downloadImageUrl: 'https://skyfi.com/downloads/image-123.tif',
              downloadPayloadUrl: 'https://skyfi.com/downloads/payload-123.zip',
              orderCode: 'ORD-2025-001',
              createdAt: '2025-01-15T10:30:00Z',
              orderId: '550e8400-e29b-41d4-a716-446655440000',
              itemId: '550e8400-e29b-41d4-a716-446655440001',
              archiveId: 'db4794dd-da6a-45b4-ac6e-b9e50e36bb29',
            },
            {
              id: '660f9511-f3ac-52e5-b827-557766551111',
              orderType: OrderType.TASKING,
              orderCost: 15000,
              ownerId: '123e4567-e89b-12d3-a456-426614174000',
              status: DeliveryStatus.PROVIDER_PENDING,
              aoi: 'POLYGON((-122.42 37.77, -122.42 37.75, -122.40 37.75, -122.40 37.77, -122.42 37.77))',
              aoiSqkm: 2.5,
              deliveryDriver: DeliveryDriver.GS,
              deliveryParams: {
                gs_project_id: 'my-gcp-project',
                gs_bucket_id: 'skyfi-imagery',
              },
              downloadImageUrl: null,
              downloadPayloadUrl: null,
              orderCode: 'ORD-2025-002',
              createdAt: '2025-01-16T14:20:00Z',
              orderId: '660f9511-f3ac-52e5-b827-557766551111',
              itemId: '660f9511-f3ac-52e5-b827-557766551112',
              windowStart: '2025-01-20T00:00:00Z',
              windowEnd: '2025-01-25T23:59:59Z',
              productType: 'DAY',
              resolution: 'VERY HIGH',
              priorityItem: false,
              maxCloudCoveragePercent: 20,
              maxOffNadirAngle: 30,
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await orderManagement.listOrders();

      expect(result.total).toBe(3);
      expect(result.orders).toHaveLength(2);
      expect(result.orders[0].orderType).toBe(OrderType.ARCHIVE);
      expect(result.orders[1].orderType).toBe(OrderType.TASKING);
    });

    it('should handle filtering by order type', async () => {
      const mockResponse = {
        data: {
          request: {
            orderType: OrderType.TASKING,
            pageNumber: 0,
            pageSize: 10,
          },
          total: 1,
          orders: [
            {
              id: '660f9511-f3ac-52e5-b827-557766551111',
              orderType: OrderType.TASKING,
              orderCost: 15000,
              ownerId: '123e4567-e89b-12d3-a456-426614174000',
              status: DeliveryStatus.PROVIDER_PENDING,
              aoi: 'POLYGON((-122.42 37.77, -122.42 37.75, -122.40 37.75, -122.40 37.77, -122.42 37.77))',
              aoiSqkm: 2.5,
              deliveryDriver: DeliveryDriver.GS,
              deliveryParams: {
                gs_project_id: 'my-gcp-project',
                gs_bucket_id: 'skyfi-imagery',
              },
              downloadImageUrl: null,
              downloadPayloadUrl: null,
              orderCode: 'ORD-2025-002',
              createdAt: '2025-01-16T14:20:00Z',
              orderId: '660f9511-f3ac-52e5-b827-557766551111',
              itemId: '660f9511-f3ac-52e5-b827-557766551112',
              windowStart: '2025-01-20T00:00:00Z',
              windowEnd: '2025-01-25T23:59:59Z',
              productType: 'DAY',
              resolution: 'VERY HIGH',
              priorityItem: false,
              maxCloudCoveragePercent: 20,
              maxOffNadirAngle: 30,
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await orderManagement.listOrdersByType(OrderType.TASKING);

      expect(result.total).toBe(1);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderType).toBe(OrderType.TASKING);
    });
  });

  describe('getOrderById with realistic API responses', () => {
    it('should retrieve complete order details with event history', async () => {
      const mockResponse = {
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          orderType: OrderType.ARCHIVE,
          orderCost: 5000,
          ownerId: '123e4567-e89b-12d3-a456-426614174000',
          status: DeliveryStatus.DELIVERY_COMPLETED,
          aoi: 'POLYGON((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
          aoiSqkm: 16.5,
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: {
            s3_bucket_id: 'my-imagery-bucket',
            aws_region: 'us-east-1',
            aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
          },
          downloadImageUrl: 'https://skyfi.com/downloads/image-123.tif',
          downloadPayloadUrl: 'https://skyfi.com/downloads/payload-123.zip',
          orderCode: 'ORD-2025-001',
          geocodeLocation: 'Austin, TX',
          createdAt: '2025-01-15T10:30:00Z',
          orderId: '550e8400-e29b-41d4-a716-446655440000',
          itemId: '550e8400-e29b-41d4-a716-446655440001',
          archiveId: 'db4794dd-da6a-45b4-ac6e-b9e50e36bb29',
          events: [
            {
              status: DeliveryStatus.CREATED,
              timestamp: '2025-01-15T10:30:00Z',
              message: 'Order created successfully',
            },
            {
              status: DeliveryStatus.STARTED,
              timestamp: '2025-01-15T10:31:00Z',
              message: 'Processing started',
            },
            {
              status: DeliveryStatus.PROVIDER_PENDING,
              timestamp: '2025-01-15T10:32:00Z',
              message: 'Sent to provider',
            },
            {
              status: DeliveryStatus.PROVIDER_COMPLETE,
              timestamp: '2025-01-15T12:00:00Z',
              message: 'Provider completed capture',
            },
            {
              status: DeliveryStatus.PROCESSING_PENDING,
              timestamp: '2025-01-15T12:05:00Z',
              message: 'Processing imagery',
            },
            {
              status: DeliveryStatus.PROCESSING_COMPLETE,
              timestamp: '2025-01-15T14:00:00Z',
              message: 'Processing complete',
            },
            {
              status: DeliveryStatus.DELIVERY_PENDING,
              timestamp: '2025-01-15T14:01:00Z',
              message: 'Uploading to delivery bucket',
            },
            {
              status: DeliveryStatus.DELIVERY_COMPLETED,
              timestamp: '2025-01-15T14:30:00Z',
              message: 'Delivery completed successfully',
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await orderManagement.getOrderById('550e8400-e29b-41d4-a716-446655440000');

      expect(result.orderId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.status).toBe(DeliveryStatus.DELIVERY_COMPLETED);
      expect(result.events).toHaveLength(8);
      expect(result.events[0].status).toBe(DeliveryStatus.CREATED);
      expect(result.events[7].status).toBe(DeliveryStatus.DELIVERY_COMPLETED);
    });
  });

  describe('triggerRedelivery with realistic API responses', () => {
    it('should successfully trigger redelivery to a different S3 bucket', async () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440000';
      const redeliveryParams = {
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: {
          s3_bucket_id: 'new-bucket-for-redelivery',
          aws_region: 'us-west-2',
          aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
          aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          subfolder: 'skyfi-orders/2025/january',
        },
      };

      const mockResponse = {
        data: {
          id: orderId,
          orderType: OrderType.ARCHIVE,
          orderCost: 5000,
          ownerId: '123e4567-e89b-12d3-a456-426614174000',
          status: DeliveryStatus.DELIVERY_PENDING,
          aoi: 'POLYGON((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
          aoiSqkm: 16.5,
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: redeliveryParams.deliveryParams,
          downloadImageUrl: 'https://skyfi.com/downloads/image-123.tif',
          downloadPayloadUrl: 'https://skyfi.com/downloads/payload-123.zip',
          orderCode: 'ORD-2025-001',
          createdAt: '2025-01-15T10:30:00Z',
          orderId,
          itemId: '550e8400-e29b-41d4-a716-446655440001',
          archiveId: 'db4794dd-da6a-45b4-ac6e-b9e50e36bb29',
          events: [
            {
              status: DeliveryStatus.DELIVERY_COMPLETED,
              timestamp: '2025-01-15T14:30:00Z',
              message: 'Original delivery completed',
            },
            {
              status: DeliveryStatus.DELIVERY_PENDING,
              timestamp: '2025-01-16T09:00:00Z',
              message: 'Redelivery triggered - uploading to new destination',
            },
          ],
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await orderManagement.triggerRedelivery(orderId, redeliveryParams);

      expect(result.orderId).toBe(orderId);
      expect(result.status).toBe(DeliveryStatus.DELIVERY_PENDING);
      expect(result.deliveryDriver).toBe(DeliveryDriver.S3);
      expect(result.deliveryParams).toEqual(redeliveryParams.deliveryParams);
      expect(result.events).toHaveLength(2);
      expect(result.events[1].message).toContain('Redelivery triggered');
    });

    it('should handle redelivery to Google Cloud Storage', async () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440000';
      const redeliveryParams = {
        deliveryDriver: DeliveryDriver.GS,
        deliveryParams: {
          gs_project_id: 'my-gcp-project-456',
          gs_bucket_id: 'skyfi-imagery-backup',
          gs_credentials: {
            type: 'service_account',
            project_id: 'my-gcp-project-456',
            private_key_id: 'key123',
            private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
            client_email: 'service@my-gcp-project-456.iam.gserviceaccount.com',
          },
        },
      };

      const mockResponse = {
        data: {
          id: orderId,
          orderType: OrderType.ARCHIVE,
          orderCost: 5000,
          ownerId: '123e4567-e89b-12d3-a456-426614174000',
          status: DeliveryStatus.DELIVERY_PENDING,
          aoi: 'POLYGON((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
          aoiSqkm: 16.5,
          deliveryDriver: DeliveryDriver.GS,
          deliveryParams: redeliveryParams.deliveryParams,
          downloadImageUrl: 'https://skyfi.com/downloads/image-123.tif',
          downloadPayloadUrl: 'https://skyfi.com/downloads/payload-123.zip',
          orderCode: 'ORD-2025-001',
          createdAt: '2025-01-15T10:30:00Z',
          orderId,
          itemId: '550e8400-e29b-41d4-a716-446655440001',
          archiveId: 'db4794dd-da6a-45b4-ac6e-b9e50e36bb29',
          events: [
            {
              status: DeliveryStatus.DELIVERY_PENDING,
              timestamp: '2025-01-16T10:00:00Z',
              message: 'Redelivery to GCS initiated',
            },
          ],
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await orderManagement.triggerRedelivery(orderId, redeliveryParams);

      expect(result.deliveryDriver).toBe(DeliveryDriver.GS);
      expect(result.status).toBe(DeliveryStatus.DELIVERY_PENDING);
    });
  });

  describe('Error scenarios', () => {
    it('should handle 404 Not Found errors', async () => {
      const error = new Error('Not found');
      (error as any).response = {
        status: 404,
        data: { detail: 'Order not found' },
      };
      (error as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(
        orderManagement.getOrderById('550e8400-e29b-41d4-a716-446655440000'),
      ).rejects.toThrow();
    });

    it('should handle 401 Unauthorized errors', async () => {
      const error = new Error('Unauthorized');
      (error as any).response = {
        status: 401,
        data: { detail: 'Invalid API key' },
      };
      (error as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(orderManagement.listOrders()).rejects.toThrow();
    });
  });
});
