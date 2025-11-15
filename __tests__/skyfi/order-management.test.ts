/**
 * Unit tests for Order Management Module
 */

import { OrderManagement } from '../../src/skyfi/order-management';
import { SkyFiClient } from '../../src/skyfi/client';
import { OrderType, DeliveryStatus } from '../../src/types/order-status';
import { DeliveryDriver } from '../../src/types/skyfi-api';
import { ValidationError, NotFoundError } from '../../src/lib/errors';

// Mock the SkyFiClient
jest.mock('../../src/skyfi/client');
jest.mock('../../src/lib/logger');

describe('OrderManagement', () => {
  let orderManagement: OrderManagement;
  let mockClient: jest.Mocked<SkyFiClient>;

  beforeEach(() => {
    // Create a mocked client
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;

    orderManagement = new OrderManagement(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listOrders', () => {
    it('should list all orders with default pagination', async () => {
      const mockResponse = {
        request: {
          orderType: null,
          pageNumber: 0,
          pageSize: 10,
        },
        total: 25,
        orders: [
          {
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
          },
        ],
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await orderManagement.listOrders();

      expect(mockClient.get).toHaveBeenCalledWith('/orders', {
        params: {
          orderType: undefined,
          pageNumber: 0,
          pageSize: 10,
        },
      });
      expect(result).toEqual(mockResponse);
      expect(result.total).toBe(25);
      expect(result.orders).toHaveLength(1);
    });

    it('should filter orders by type', async () => {
      const mockResponse = {
        request: {
          orderType: OrderType.TASKING,
          pageNumber: 0,
          pageSize: 10,
        },
        total: 10,
        orders: [],
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await orderManagement.listOrders({
        orderType: OrderType.TASKING,
      });

      expect(mockClient.get).toHaveBeenCalledWith('/orders', {
        params: {
          orderType: OrderType.TASKING,
          pageNumber: 0,
          pageSize: 10,
        },
      });
      expect(result.total).toBe(10);
    });

    it('should apply custom pagination', async () => {
      const mockResponse = {
        request: {
          orderType: null,
          pageNumber: 2,
          pageSize: 25,
        },
        total: 100,
        orders: [],
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await orderManagement.listOrders({
        pageNumber: 2,
        pageSize: 25,
      });

      expect(mockClient.get).toHaveBeenCalledWith('/orders', {
        params: {
          orderType: undefined,
          pageNumber: 2,
          pageSize: 25,
        },
      });
      expect(result.total).toBe(100);
    });

    it('should throw ValidationError for invalid page size', async () => {
      await expect(
        orderManagement.listOrders({
          pageSize: 30, // Max is 25
        }),
      ).rejects.toThrow();
    });

    it('should throw ValidationError for negative page number', async () => {
      await expect(
        orderManagement.listOrders({
          pageNumber: -1,
        }),
      ).rejects.toThrow();
    });
  });

  describe('getOrderById', () => {
    it('should retrieve order details by ID', async () => {
      const mockResponse = {
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

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await orderManagement.getOrderById('550e8400-e29b-41d4-a716-446655440000');

      expect(mockClient.get).toHaveBeenCalledWith(
        '/orders/550e8400-e29b-41d4-a716-446655440000',
      );
      expect(result).toEqual(mockResponse);
      expect(result.events).toHaveLength(2);
    });

    it('should throw ValidationError for invalid UUID', async () => {
      await expect(orderManagement.getOrderById('invalid-uuid')).rejects.toThrow();
    });

    it('should throw NotFoundError for non-existent order', async () => {
      mockClient.get.mockRejectedValue(new NotFoundError('Order not found'));

      await expect(
        orderManagement.getOrderById('550e8400-e29b-41d4-a716-446655440000'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('triggerRedelivery', () => {
    it('should trigger redelivery with new delivery parameters', async () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440000';
      const redeliveryParams = {
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: {
          s3_bucket_id: 'new-bucket',
          aws_region: 'us-west-2',
          aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
          aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        },
      };

      const mockResponse = {
        id: orderId,
        orderType: OrderType.ARCHIVE,
        orderCost: 1000,
        ownerId: '123e4567-e89b-12d3-a456-426614174000',
        status: DeliveryStatus.DELIVERY_PENDING,
        aoi: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
        aoiSqkm: 100,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: redeliveryParams.deliveryParams,
        downloadImageUrl: 'https://example.com/image.tif',
        downloadPayloadUrl: 'https://example.com/payload.zip',
        orderCode: 'ORD-001',
        createdAt: '2025-01-01T00:00:00Z',
        orderId,
        itemId: '550e8400-e29b-41d4-a716-446655440001',
        archiveId: 'arch-001',
        events: [
          {
            status: DeliveryStatus.DELIVERY_PENDING,
            timestamp: '2025-01-02T00:00:00Z',
            message: 'Redelivery triggered',
          },
        ],
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await orderManagement.triggerRedelivery(orderId, redeliveryParams);

      expect(mockClient.post).toHaveBeenCalledWith(
        `/orders/${orderId}/redelivery`,
        redeliveryParams,
      );
      expect(result).toEqual(mockResponse);
      expect(result.status).toBe(DeliveryStatus.DELIVERY_PENDING);
    });

    it('should throw ValidationError for invalid order ID', async () => {
      await expect(
        orderManagement.triggerRedelivery('invalid-uuid', {
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: {},
        }),
      ).rejects.toThrow();
    });

    it('should throw ValidationError for empty delivery parameters', async () => {
      await expect(
        orderManagement.triggerRedelivery('550e8400-e29b-41d4-a716-446655440000', {
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: {},
        }),
      ).rejects.toThrow();
    });
  });

  describe('listOrdersByType', () => {
    it('should list archive orders', async () => {
      const mockResponse = {
        request: {
          orderType: OrderType.ARCHIVE,
          pageNumber: 0,
          pageSize: 10,
        },
        total: 15,
        orders: [],
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await orderManagement.listOrdersByType(OrderType.ARCHIVE);

      expect(mockClient.get).toHaveBeenCalledWith('/orders', {
        params: {
          orderType: OrderType.ARCHIVE,
          pageNumber: 0,
          pageSize: 10,
        },
      });
      expect(result.total).toBe(15);
    });

    it('should list tasking orders with custom pagination', async () => {
      const mockResponse = {
        request: {
          orderType: OrderType.TASKING,
          pageNumber: 1,
          pageSize: 20,
        },
        total: 50,
        orders: [],
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await orderManagement.listOrdersByType(OrderType.TASKING, 1, 20);

      expect(mockClient.get).toHaveBeenCalledWith('/orders', {
        params: {
          orderType: OrderType.TASKING,
          pageNumber: 1,
          pageSize: 20,
        },
      });
      expect(result.total).toBe(50);
    });
  });

  describe('getAllOrders', () => {
    it('should get all orders with default pagination', async () => {
      const mockResponse = {
        request: {
          orderType: null,
          pageNumber: 0,
          pageSize: 10,
        },
        total: 100,
        orders: [],
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await orderManagement.getAllOrders();

      expect(mockClient.get).toHaveBeenCalledWith('/orders', {
        params: {
          orderType: undefined,
          pageNumber: 0,
          pageSize: 10,
        },
      });
      expect(result.total).toBe(100);
    });

    it('should get all orders with custom pagination', async () => {
      const mockResponse = {
        request: {
          orderType: null,
          pageNumber: 3,
          pageSize: 25,
        },
        total: 200,
        orders: [],
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await orderManagement.getAllOrders(3, 25);

      expect(mockClient.get).toHaveBeenCalledWith('/orders', {
        params: {
          orderType: undefined,
          pageNumber: 3,
          pageSize: 25,
        },
      });
      expect(result.total).toBe(200);
    });
  });
});
