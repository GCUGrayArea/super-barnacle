/**
 * Unit tests for MCP Order Management Tools
 */

import { SkyFiClient } from '../../../src/skyfi/client';
import { executeListOrders } from '../../../src/mcp/tools/list-orders';
import { executeGetOrderDetails } from '../../../src/mcp/tools/get-order';
import { executeTriggerRedelivery } from '../../../src/mcp/tools/redelivery';
import { OrderType, DeliveryStatus } from '../../../src/types/order-status';
import { DeliveryDriver } from '../../../src/types/skyfi-api';

// Mock dependencies
jest.mock('../../../src/skyfi/client');
jest.mock('../../../src/lib/logger');

describe('MCP Order Management Tools', () => {
  let mockClient: jest.Mocked<SkyFiClient>;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeListOrders', () => {
    const mockOrder = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      orderType: OrderType.ARCHIVE,
      orderCost: 1000,
      ownerId: '123e4567-e89b-12d3-a456-426614174000',
      status: DeliveryStatus.DELIVERY_COMPLETED,
      aoi: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
      aoiSqkm: 100,
      deliveryDriver: DeliveryDriver.S3,
      deliveryParams: { s3_bucket_id: 'test-bucket' },
      downloadImageUrl: 'https://example.com/image.tif',
      downloadPayloadUrl: 'https://example.com/payload.zip',
      orderCode: 'ORD-001',
      createdAt: '2025-01-01T00:00:00Z',
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      itemId: '550e8400-e29b-41d4-a716-446655440001',
      archiveId: 'arch-001',
      events: [
        {
          status: DeliveryStatus.CREATED,
          timestamp: '2025-01-01T00:00:00Z',
          message: 'Order created',
        },
        {
          status: DeliveryStatus.DELIVERY_COMPLETED,
          timestamp: '2025-01-01T12:00:00Z',
          message: null,
        },
      ],
    };

    it('should list orders with default parameters', async () => {
      const mockResponse = {
        request: {
          orderType: null,
          pageNumber: 0,
          pageSize: 10,
        },
        total: 1,
        orders: [mockOrder],
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await executeListOrders(mockClient, {});

      expect(mockClient.get).toHaveBeenCalledWith('/orders', {
        params: {
          orderType: undefined,
          pageNumber: 0,
          pageSize: 10,
        },
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('ORD-001');
      expect(result.content[0]?.text).toContain('✅'); // Success emoji
    });

    it('should filter orders by type', async () => {
      const mockResponse = {
        request: {
          orderType: OrderType.TASKING,
          pageNumber: 0,
          pageSize: 10,
        },
        total: 0,
        orders: [],
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await executeListOrders(mockClient, {
        orderType: OrderType.TASKING,
      });

      expect(mockClient.get).toHaveBeenCalledWith('/orders', {
        params: {
          orderType: OrderType.TASKING,
          pageNumber: 0,
          pageSize: 10,
        },
      });

      expect(result.content[0]?.text).toContain('No orders found');
    });

    it('should filter orders by status', async () => {
      const mockResponse = {
        request: {
          orderType: null,
          pageNumber: 0,
          pageSize: 10,
        },
        total: 2,
        orders: [
          mockOrder,
          {
            ...mockOrder,
            id: '550e8400-e29b-41d4-a716-446655440001',
            orderId: '550e8400-e29b-41d4-a716-446655440001',
            status: DeliveryStatus.PROCESSING_PENDING,
          },
        ],
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await executeListOrders(mockClient, {
        status: DeliveryStatus.DELIVERY_COMPLETED,
      });

      expect(result.content[0]?.text).toContain('ORD-001');
      expect(result.content[0]?.text).not.toContain('PROCESSING_PENDING');
    });

    it('should apply pagination', async () => {
      const mockResponse = {
        request: {
          orderType: null,
          pageNumber: 1,
          pageSize: 5,
        },
        total: 10,
        orders: [],
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await executeListOrders(mockClient, {
        pageNumber: 1,
        pageSize: 5,
      });

      expect(mockClient.get).toHaveBeenCalledWith('/orders', {
        params: {
          orderType: undefined,
          pageNumber: 1,
          pageSize: 5,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      mockClient.get.mockRejectedValue(new Error('API Error'));

      const result = await executeListOrders(mockClient, {});

      expect(result.content[0]?.text).toContain('Error listing orders');
      expect(result.content[0]?.text).toContain('API Error');
    });

    it('should validate invalid order type', async () => {
      const result = await executeListOrders(mockClient, {
        orderType: 'INVALID_TYPE',
      });

      expect(result.content[0]?.text).toContain('Error listing orders');
    });
  });

  describe('executeGetOrderDetails', () => {
    const mockOrderDetails = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      orderType: OrderType.ARCHIVE,
      orderCost: 1000,
      ownerId: '123e4567-e89b-12d3-a456-426614174000',
      status: DeliveryStatus.DELIVERY_COMPLETED,
      aoi: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
      aoiSqkm: 100,
      deliveryDriver: DeliveryDriver.S3,
      deliveryParams: { s3_bucket_id: 'test-bucket' },
      downloadImageUrl: 'https://example.com/image.tif',
      downloadPayloadUrl: 'https://example.com/payload.zip',
      orderCode: 'ORD-001',
      createdAt: '2025-01-01T00:00:00Z',
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      itemId: '550e8400-e29b-41d4-a716-446655440001',
      archiveId: 'arch-001',
      events: [
        {
          status: DeliveryStatus.CREATED,
          timestamp: '2025-01-01T00:00:00Z',
          message: 'Order created',
        },
        {
          status: DeliveryStatus.DELIVERY_COMPLETED,
          timestamp: '2025-01-01T12:00:00Z',
          message: 'Delivery completed successfully',
        },
      ],
    };

    it('should get order details by ID', async () => {
      mockClient.get.mockResolvedValue(mockOrderDetails);

      const result = await executeGetOrderDetails(mockClient, {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/orders/550e8400-e29b-41d4-a716-446655440000',
      );

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('Order Status: DELIVERY_COMPLETED');
      expect(result.content[0]?.text).toContain('✅'); // Success emoji
      expect(result.content[0]?.text).toContain('Delivery Timeline');
      expect(result.content[0]?.text).toContain('Next Steps');
    });

    it('should show download URLs for completed orders', async () => {
      mockClient.get.mockResolvedValue(mockOrderDetails);

      const result = await executeGetOrderDetails(mockClient, {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.content[0]?.text).toContain(mockOrderDetails.downloadImageUrl);
    });

    it('should show failure status with error emoji', async () => {
      const failedOrder = {
        ...mockOrderDetails,
        status: DeliveryStatus.DELIVERY_FAILED,
        events: [
          {
            status: DeliveryStatus.DELIVERY_FAILED,
            timestamp: '2025-01-01T12:00:00Z',
            message: 'Failed to deliver to S3',
          },
        ],
      };

      mockClient.get.mockResolvedValue(failedOrder);

      const result = await executeGetOrderDetails(mockClient, {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.content[0]?.text).toContain('❌'); // Failure emoji
      expect(result.content[0]?.text).toContain('DELIVERY_FAILED');
      expect(result.content[0]?.text).toContain('Trigger redelivery');
    });

    it('should show in-progress status with warning emoji', async () => {
      const inProgressOrder = {
        ...mockOrderDetails,
        status: DeliveryStatus.PROCESSING_PENDING,
        downloadImageUrl: null,
        downloadPayloadUrl: null,
      };

      mockClient.get.mockResolvedValue(inProgressOrder);

      const result = await executeGetOrderDetails(mockClient, {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.content[0]?.text).toContain('⚠️'); // Warning emoji
      expect(result.content[0]?.text).toContain('PROCESSING_PENDING');
    });

    it('should handle invalid order ID format', async () => {
      const result = await executeGetOrderDetails(mockClient, {
        orderId: 'invalid-id',
      });

      expect(result.content[0]?.text).toContain('Error retrieving order details');
      expect(result.content[0]?.text).toContain('valid UUID');
    });

    it('should handle missing orderId', async () => {
      const result = await executeGetOrderDetails(mockClient, {});

      expect(result.content[0]?.text).toContain('Error retrieving order details');
      expect(result.content[0]?.text).toContain('orderId is required');
    });

    it('should handle API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Order not found'));

      const result = await executeGetOrderDetails(mockClient, {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.content[0]?.text).toContain('Error retrieving order details');
      expect(result.content[0]?.text).toContain('Order not found');
    });
  });

  describe('executeTriggerRedelivery', () => {
    const mockOrder = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      orderType: OrderType.ARCHIVE,
      orderCost: 1000,
      ownerId: '123e4567-e89b-12d3-a456-426614174000',
      status: DeliveryStatus.DELIVERY_FAILED,
      aoi: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
      aoiSqkm: 100,
      deliveryDriver: DeliveryDriver.S3,
      deliveryParams: { s3_bucket_id: 'old-bucket' },
      downloadImageUrl: 'https://example.com/image.tif',
      downloadPayloadUrl: 'https://example.com/payload.zip',
      orderCode: 'ORD-001',
      createdAt: '2025-01-01T00:00:00Z',
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      itemId: '550e8400-e29b-41d4-a716-446655440001',
      archiveId: 'arch-001',
      events: [
        {
          status: DeliveryStatus.DELIVERY_FAILED,
          timestamp: '2025-01-01T12:00:00Z',
          message: 'Failed to deliver',
        },
      ],
    };

    it('should trigger redelivery with new configuration', async () => {
      const updatedOrder = {
        ...mockOrder,
        status: DeliveryStatus.DELIVERY_PENDING,
        deliveryParams: { s3_bucket_id: 'new-bucket' },
        events: [
          ...mockOrder.events,
          {
            status: DeliveryStatus.DELIVERY_PENDING,
            timestamp: '2025-01-02T00:00:00Z',
            message: 'Redelivery triggered',
          },
        ],
      };

      mockClient.get.mockResolvedValue(mockOrder);
      mockClient.post.mockResolvedValue(updatedOrder);

      const result = await executeTriggerRedelivery(mockClient, {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: { s3_bucket_id: 'new-bucket' },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        '/orders/550e8400-e29b-41d4-a716-446655440000',
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        '/orders/550e8400-e29b-41d4-a716-446655440000/redelivery',
        {
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: { s3_bucket_id: 'new-bucket' },
        },
      );

      expect(result.content[0]?.text).toContain('Redelivery triggered successfully');
      expect(result.content[0]?.text).toContain('DELIVERY_PENDING');
    });

    it('should use existing configuration if not provided', async () => {
      const updatedOrder = {
        ...mockOrder,
        status: DeliveryStatus.DELIVERY_PENDING,
      };

      mockClient.get.mockResolvedValue(mockOrder);
      mockClient.post.mockResolvedValue(updatedOrder);

      const result = await executeTriggerRedelivery(mockClient, {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/orders/550e8400-e29b-41d4-a716-446655440000/redelivery',
        {
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: { s3_bucket_id: 'old-bucket' },
        },
      );

      expect(result.content[0]?.text).toContain('Redelivery triggered successfully');
    });

    it('should error if no delivery config exists and none provided', async () => {
      const orderWithoutDelivery = {
        ...mockOrder,
        deliveryDriver: null,
        deliveryParams: null,
      };

      mockClient.get.mockResolvedValue(orderWithoutDelivery);

      const result = await executeTriggerRedelivery(mockClient, {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.content[0]?.text).toContain('Error triggering redelivery');
      expect(result.content[0]?.text).toContain('no existing delivery configuration');
    });

    it('should validate orderId is required', async () => {
      const result = await executeTriggerRedelivery(mockClient, {});

      expect(result.content[0]?.text).toContain('Error triggering redelivery');
      expect(result.content[0]?.text).toContain('orderId is required');
    });

    it('should validate orderId format', async () => {
      const result = await executeTriggerRedelivery(mockClient, {
        orderId: 'invalid-uuid',
      });

      expect(result.content[0]?.text).toContain('Error triggering redelivery');
      expect(result.content[0]?.text).toContain('valid UUID');
    });

    it('should validate deliveryParams when deliveryDriver provided', async () => {
      const result = await executeTriggerRedelivery(mockClient, {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        deliveryDriver: DeliveryDriver.S3,
      });

      expect(result.content[0]?.text).toContain('Error triggering redelivery');
      expect(result.content[0]?.text).toContain('deliveryParams is required');
    });

    it('should handle API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Order not found'));

      const result = await executeTriggerRedelivery(mockClient, {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.content[0]?.text).toContain('Error triggering redelivery');
      expect(result.content[0]?.text).toContain('Order not found');
    });
  });
});
