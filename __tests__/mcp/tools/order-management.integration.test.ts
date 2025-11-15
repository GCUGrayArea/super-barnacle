/**
 * Integration tests for MCP Order Management Tools
 *
 * These tests use mocked axios to simulate API responses
 */

import axios from 'axios';
import { SkyFiClient } from '../../../src/skyfi/client';
import { createConfigFromEnv } from '../../../src/skyfi/config';
import { executeListOrders } from '../../../src/mcp/tools/list-orders';
import { executeGetOrderDetails } from '../../../src/mcp/tools/get-order';
import { executeTriggerRedelivery } from '../../../src/mcp/tools/redelivery';
import { OrderType, DeliveryStatus } from '../../../src/types/order-status';
import { DeliveryDriver } from '../../../src/types/skyfi-api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger to avoid console output during tests
jest.mock('../../../src/lib/logger');

describe('MCP Order Management Tools - Integration', () => {
  let client: SkyFiClient;
  let mockAxiosInstance: any;

  beforeAll(() => {
    // Set up environment variable for API key
    process.env['SKYFI_API_KEY'] = 'test-api-key';
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

    // Create client
    const config = createConfigFromEnv();
    client = new SkyFiClient(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    delete process.env['SKYFI_API_KEY'];
  });

  describe('list_orders integration', () => {
    it('should list orders from API', async () => {
      const mockApiResponse = {
        data: {
          request: {
            orderType: null,
            pageNumber: 0,
            pageSize: 10,
          },
          total: 2,
          orders: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              orderType: OrderType.ARCHIVE,
              orderCost: 1500,
              ownerId: '123e4567-e89b-12d3-a456-426614174000',
              status: DeliveryStatus.DELIVERY_COMPLETED,
              aoi: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
              aoiSqkm: 150,
              deliveryDriver: DeliveryDriver.S3,
              deliveryParams: { s3_bucket_id: 'test-bucket' },
              downloadImageUrl: 'https://example.com/image1.tif',
              downloadPayloadUrl: 'https://example.com/payload1.zip',
              orderCode: 'ORD-001',
              createdAt: '2025-01-01T00:00:00Z',
              orderId: '550e8400-e29b-41d4-a716-446655440000',
              itemId: '550e8400-e29b-41d4-a716-446655440001',
              archiveId: 'arch-001',
              events: [],
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440002',
              orderType: OrderType.TASKING,
              orderCost: 2500,
              ownerId: '123e4567-e89b-12d3-a456-426614174000',
              status: DeliveryStatus.PROCESSING_PENDING,
              aoi: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
              aoiSqkm: 200,
              deliveryDriver: DeliveryDriver.S3,
              deliveryParams: { s3_bucket_id: 'test-bucket' },
              downloadImageUrl: null,
              downloadPayloadUrl: null,
              orderCode: 'ORD-002',
              createdAt: '2025-01-02T00:00:00Z',
              orderId: '550e8400-e29b-41d4-a716-446655440002',
              itemId: '550e8400-e29b-41d4-a716-446655440003',
              windowStart: '2025-01-10T00:00:00Z',
              windowEnd: '2025-01-20T00:00:00Z',
              productType: 'DAY',
              resolution: 'HIGH',
              events: [],
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockApiResponse);

      const result = await executeListOrders(client, {
        pageNumber: 0,
        pageSize: 10,
      });

      expect(result.content[0]?.text).toContain('Showing orders 1-2 of 2');
      expect(result.content[0]?.text).toContain('ORD-001');
      expect(result.content[0]?.text).toContain('ORD-002');
      expect(result.content[0]?.text).toContain('✅'); // Completed order
      expect(result.content[0]?.text).toContain('⚠️'); // Pending order
    });

    it('should filter orders by type', async () => {
      const mockApiResponse = {
        data: {
          request: {
            orderType: OrderType.ARCHIVE,
            pageNumber: 0,
            pageSize: 10,
          },
          total: 1,
          orders: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              orderType: OrderType.ARCHIVE,
              orderCost: 1500,
              ownerId: '123e4567-e89b-12d3-a456-426614174000',
              status: DeliveryStatus.DELIVERY_COMPLETED,
              aoi: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
              aoiSqkm: 150,
              deliveryDriver: DeliveryDriver.S3,
              deliveryParams: { s3_bucket_id: 'test-bucket' },
              downloadImageUrl: 'https://example.com/image.tif',
              downloadPayloadUrl: 'https://example.com/payload.zip',
              orderCode: 'ORD-001',
              createdAt: '2025-01-01T00:00:00Z',
              orderId: '550e8400-e29b-41d4-a716-446655440000',
              itemId: '550e8400-e29b-41d4-a716-446655440001',
              archiveId: 'arch-001',
              events: [],
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockApiResponse);

      const result = await executeListOrders(client, {
        orderType: OrderType.ARCHIVE,
      });

      expect(result.content[0]?.text).toContain('ORD-001');
      expect(result.content[0]?.text).toContain('ARCHIVE');
    });

    it('should handle empty results', async () => {
      const mockApiResponse = {
        data: {
          request: {
            orderType: null,
            pageNumber: 0,
            pageSize: 10,
          },
          total: 0,
          orders: [],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockApiResponse);

      const result = await executeListOrders(client, {});

      expect(result.content[0]?.text).toContain('No orders found');
    });

    it('should handle API errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Internal server error'));

      const result = await executeListOrders(client, {});

      expect(result.content[0]?.text).toContain('Error listing orders');
    });
  });

  describe('get_order_details integration', () => {
    const orderId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get order details from API', async () => {
      const mockApiResponse = {
        data: {
          id: orderId,
          orderType: OrderType.ARCHIVE,
          orderCost: 1500,
          ownerId: '123e4567-e89b-12d3-a456-426614174000',
          status: DeliveryStatus.DELIVERY_COMPLETED,
          aoi: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
          aoiSqkm: 150,
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: { s3_bucket_id: 'test-bucket' },
          downloadImageUrl: 'https://example.com/image.tif',
          downloadPayloadUrl: 'https://example.com/payload.zip',
          orderCode: 'ORD-001',
          geocodeLocation: 'San Francisco, CA',
          createdAt: '2025-01-01T00:00:00Z',
          orderId,
          itemId: '550e8400-e29b-41d4-a716-446655440001',
          archiveId: 'arch-001',
          events: [
            {
              status: DeliveryStatus.CREATED,
              timestamp: '2025-01-01T00:00:00Z',
              message: 'Order created',
            },
            {
              status: DeliveryStatus.STARTED,
              timestamp: '2025-01-01T00:05:00Z',
              message: null,
            },
            {
              status: DeliveryStatus.PROVIDER_PENDING,
              timestamp: '2025-01-01T00:10:00Z',
              message: 'Sent to provider',
            },
            {
              status: DeliveryStatus.PROVIDER_COMPLETE,
              timestamp: '2025-01-01T06:00:00Z',
              message: 'Provider captured imagery',
            },
            {
              status: DeliveryStatus.PROCESSING_COMPLETE,
              timestamp: '2025-01-01T08:00:00Z',
              message: null,
            },
            {
              status: DeliveryStatus.DELIVERY_COMPLETED,
              timestamp: '2025-01-01T09:00:00Z',
              message: 'Successfully delivered to S3',
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockApiResponse);

      const result = await executeGetOrderDetails(client, { orderId });

      const text = result.content[0]?.text ?? '';

      expect(text).toContain('Order Status: DELIVERY_COMPLETED');
      expect(text).toContain('✅');
      expect(text).toContain('ORD-001');
      expect(text).toContain('ARCHIVE');
      expect(text).toContain('$15.00');
      expect(text).toContain('150.00 sq km');
      expect(text).toContain('San Francisco, CA');
      expect(text).toContain('Delivery Timeline');
      expect(text).toContain('Next Steps');
      expect(text).toContain('Download imagery from:');
      expect(text).toContain('https://example.com/image.tif');
    });

    it('should handle failed orders', async () => {
      const mockApiResponse = {
        data: {
          id: orderId,
          orderType: OrderType.ARCHIVE,
          orderCost: 1500,
          ownerId: '123e4567-e89b-12d3-a456-426614174000',
          status: DeliveryStatus.DELIVERY_FAILED,
          aoi: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
          aoiSqkm: 150,
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: { s3_bucket_id: 'test-bucket' },
          downloadImageUrl: null,
          downloadPayloadUrl: null,
          orderCode: 'ORD-001',
          createdAt: '2025-01-01T00:00:00Z',
          orderId,
          itemId: '550e8400-e29b-41d4-a716-446655440001',
          archiveId: 'arch-001',
          events: [
            {
              status: DeliveryStatus.DELIVERY_FAILED,
              timestamp: '2025-01-01T09:00:00Z',
              message: 'Failed to connect to S3 bucket',
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockApiResponse);

      const result = await executeGetOrderDetails(client, { orderId });

      const text = result.content[0]?.text ?? '';

      expect(text).toContain('Order Status: DELIVERY_FAILED');
      expect(text).toContain('❌');
      expect(text).toContain('Check your delivery configuration');
      expect(text).toContain('Trigger redelivery');
    });

    it('should handle in-progress orders', async () => {
      const mockApiResponse = {
        data: {
          id: orderId,
          orderType: OrderType.TASKING,
          orderCost: 2500,
          ownerId: '123e4567-e89b-12d3-a456-426614174000',
          status: DeliveryStatus.PROCESSING_PENDING,
          aoi: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
          aoiSqkm: 200,
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: { s3_bucket_id: 'test-bucket' },
          downloadImageUrl: null,
          downloadPayloadUrl: null,
          orderCode: 'ORD-002',
          createdAt: '2025-01-02T00:00:00Z',
          orderId,
          itemId: '550e8400-e29b-41d4-a716-446655440003',
          windowStart: '2025-01-10T00:00:00Z',
          windowEnd: '2025-01-20T00:00:00Z',
          productType: 'DAY',
          resolution: 'HIGH',
          events: [
            {
              status: DeliveryStatus.PROCESSING_PENDING,
              timestamp: '2025-01-02T00:00:00Z',
              message: 'Processing imagery',
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockApiResponse);

      const result = await executeGetOrderDetails(client, { orderId });

      const text = result.content[0]?.text ?? '';

      expect(text).toContain('Order Status: PROCESSING_PENDING');
      expect(text).toContain('⚠️');
      expect(text).toContain('Order is in progress');
    });

    it('should handle 404 errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Order not found'));

      const result = await executeGetOrderDetails(client, { orderId });

      expect(result.content[0]?.text).toContain('Error retrieving order details');
    });
  });

  describe('trigger_order_redelivery integration', () => {
    const orderId = '550e8400-e29b-41d4-a716-446655440000';

    it('should trigger redelivery with new config', async () => {
      const existingOrder = {
        id: orderId,
        orderType: OrderType.ARCHIVE,
        orderCost: 1500,
        ownerId: '123e4567-e89b-12d3-a456-426614174000',
        status: DeliveryStatus.DELIVERY_FAILED,
        aoi: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
        aoiSqkm: 150,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: { s3_bucket_id: 'old-bucket' },
        downloadImageUrl: null,
        downloadPayloadUrl: null,
        orderCode: 'ORD-001',
        createdAt: '2025-01-01T00:00:00Z',
        orderId,
        itemId: '550e8400-e29b-41d4-a716-446655440001',
        archiveId: 'arch-001',
        events: [
          {
            status: DeliveryStatus.DELIVERY_FAILED,
            timestamp: '2025-01-01T09:00:00Z',
            message: 'Failed to deliver',
          },
        ],
      };

      const updatedOrder = {
        ...existingOrder,
        status: DeliveryStatus.DELIVERY_PENDING,
        deliveryParams: { s3_bucket_id: 'new-bucket' },
        events: [
          ...existingOrder.events,
          {
            status: DeliveryStatus.DELIVERY_PENDING,
            timestamp: '2025-01-02T00:00:00Z',
            message: 'Redelivery triggered',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: existingOrder });
      mockAxiosInstance.post.mockResolvedValue({ data: updatedOrder });

      const result = await executeTriggerRedelivery(client, {
        orderId,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: { s3_bucket_id: 'new-bucket' },
      });

      const text = result.content[0]?.text ?? '';

      expect(text).toContain('Redelivery triggered successfully');
      expect(text).toContain('DELIVERY_PENDING');
      expect(text).toContain('⚠️');
    });

    it('should trigger redelivery with existing config', async () => {
      const existingOrder = {
        id: orderId,
        orderType: OrderType.ARCHIVE,
        orderCost: 1500,
        ownerId: '123e4567-e89b-12d3-a456-426614174000',
        status: DeliveryStatus.DELIVERY_FAILED,
        aoi: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
        aoiSqkm: 150,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: { s3_bucket_id: 'existing-bucket' },
        downloadImageUrl: null,
        downloadPayloadUrl: null,
        orderCode: 'ORD-001',
        createdAt: '2025-01-01T00:00:00Z',
        orderId,
        itemId: '550e8400-e29b-41d4-a716-446655440001',
        archiveId: 'arch-001',
        events: [],
      };

      const updatedOrder = {
        ...existingOrder,
        status: DeliveryStatus.DELIVERY_PENDING,
      };

      mockAxiosInstance.get.mockResolvedValue({ data: existingOrder });
      mockAxiosInstance.post.mockResolvedValue({ data: updatedOrder });

      const result = await executeTriggerRedelivery(client, { orderId });

      expect(result.content[0]?.text).toContain('Redelivery triggered successfully');
    });

    it('should handle API errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Order not found'));

      const result = await executeTriggerRedelivery(client, { orderId });

      expect(result.content[0]?.text).toContain('Error triggering redelivery');
    });
  });
});
