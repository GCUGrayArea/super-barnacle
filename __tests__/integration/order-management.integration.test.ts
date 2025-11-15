/**
 * Integration Tests for Order Management
 *
 * Tests complete order management workflow including listing orders,
 * retrieving order details, and triggering redelivery.
 */

import axios from 'axios';
import { SkyFiClient } from '../../src/skyfi/client';
import { createConfigFromEnv } from '../../src/skyfi/config';
import { OrderManagement, createOrderManagement } from '../../src/skyfi/order-management';
import { OrderType, DeliveryStatus } from '../../src/types/order-status';
import { DeliveryDriver } from '../../src/types/skyfi-api';
import {
  mockOrdersListResponse,
  mockArchiveOrder,
  mockTaskingOrder,
  mockS3DeliveryParams,
  mockGCSDeliveryParams,
  mockValidationError,
  mockAuthenticationError,
  mockNotFoundError,
  mockRateLimitError,
  mockServerError,
} from '../fixtures/skyfi-responses';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

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

describe('Order Management Integration Tests', () => {
  let orderManagement: OrderManagement;
  let mockAxiosInstance: any;

  beforeAll(() => {
    process.env.SKYFI_API_KEY = 'test-api-key-123';
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
    const client = new SkyFiClient(config);
    orderManagement = createOrderManagement(client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('List Orders - Success Cases', () => {
    it('should list all orders with default pagination', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockOrdersListResponse,
      });

      const result = await orderManagement.listOrders();

      expect(result.total).toBe(2);
      expect(result.orders).toHaveLength(2);
      expect(result.orders[0].orderType).toBe(OrderType.ARCHIVE);
      expect(result.orders[1].orderType).toBe(OrderType.TASKING);
    });

    it('should filter orders by type', async () => {
      const archiveOnlyResponse = {
        ...mockOrdersListResponse,
        orders: [mockArchiveOrder],
        total: 1,
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: archiveOnlyResponse,
      });

      const result = await orderManagement.listOrdersByType(OrderType.ARCHIVE);

      expect(result.total).toBe(1);
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].orderType).toBe(OrderType.ARCHIVE);
    });

    it('should list orders with custom pagination', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          ...mockOrdersListResponse,
          request: {
            ...mockOrdersListResponse.request,
            pageNumber: 1,
            pageSize: 5,
          },
        },
      });

      const result = await orderManagement.listOrders({ pageNumber: 1, pageSize: 5 });

      expect(result.orders).toBeDefined();
    });

    it('should list orders with status filter', async () => {
      const completedOrdersResponse = {
        ...mockOrdersListResponse,
        orders: [mockArchiveOrder],
        total: 1,
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: completedOrdersResponse,
      });

      const result = await orderManagement.listOrders({
        status: DeliveryStatus.DELIVERY_COMPLETED,
      });

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].status).toBe(DeliveryStatus.DELIVERY_COMPLETED);
    });

    it('should handle empty order list', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          request: {},
          total: 0,
          orders: [],
        },
      });

      const result = await orderManagement.listOrders();

      expect(result.total).toBe(0);
      expect(result.orders).toHaveLength(0);
    });
  });

  describe('Get Order By ID - Success Cases', () => {
    it('should retrieve complete order details with event history', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockArchiveOrder,
      });

      const result = await orderManagement.getOrderById(mockArchiveOrder.orderId);

      expect(result.orderId).toBe(mockArchiveOrder.orderId);
      expect(result.status).toBe(DeliveryStatus.DELIVERY_COMPLETED);
      expect(result.events).toHaveLength(4);
      expect(result.events[0].status).toBe(DeliveryStatus.CREATED);
    });

    it('should retrieve tasking order in progress', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockTaskingOrder,
      });

      const result = await orderManagement.getOrderById(mockTaskingOrder.orderId);

      expect(result.orderId).toBe(mockTaskingOrder.orderId);
      expect(result.orderType).toBe(OrderType.TASKING);
      expect(result.status).toBe(DeliveryStatus.PROVIDER_PENDING);
    });

    it('should retrieve order with download URLs', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockArchiveOrder,
      });

      const result = await orderManagement.getOrderById(mockArchiveOrder.orderId);

      expect(result.downloadImageUrl).toBeDefined();
      expect(result.downloadPayloadUrl).toBeDefined();
    });

    it('should retrieve order with delivery parameters', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockArchiveOrder,
      });

      const result = await orderManagement.getOrderById(mockArchiveOrder.orderId);

      expect(result.deliveryDriver).toBe(DeliveryDriver.S3);
      expect(result.deliveryParams).toBeDefined();
    });
  });

  describe('Trigger Redelivery - Success Cases', () => {
    it('should trigger redelivery to different S3 bucket', async () => {
      const redeliveryOrder = {
        ...mockArchiveOrder,
        status: DeliveryStatus.DELIVERY_PENDING,
        deliveryParams: mockS3DeliveryParams,
        events: [
          ...mockArchiveOrder.events!,
          {
            status: DeliveryStatus.DELIVERY_PENDING,
            timestamp: '2025-01-16T09:00:00Z',
            message: 'Redelivery triggered',
          },
        ],
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: redeliveryOrder,
      });

      const result = await orderManagement.triggerRedelivery(mockArchiveOrder.orderId, {
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: mockS3DeliveryParams,
      });

      expect(result.orderId).toBe(mockArchiveOrder.orderId);
      expect(result.status).toBe(DeliveryStatus.DELIVERY_PENDING);
      expect(result.deliveryDriver).toBe(DeliveryDriver.S3);
    });

    it('should trigger redelivery to GCS bucket', async () => {
      const gcsRedelivery = {
        ...mockArchiveOrder,
        status: DeliveryStatus.DELIVERY_PENDING,
        deliveryDriver: DeliveryDriver.GS,
        deliveryParams: mockGCSDeliveryParams,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: gcsRedelivery,
      });

      const result = await orderManagement.triggerRedelivery(mockArchiveOrder.orderId, {
        deliveryDriver: DeliveryDriver.GS,
        deliveryParams: mockGCSDeliveryParams,
      });

      expect(result.deliveryDriver).toBe(DeliveryDriver.GS);
    });

    it('should trigger redelivery with subfolder parameter', async () => {
      const redeliveryParams = {
        ...mockS3DeliveryParams,
        subfolder: 'new-subfolder/2025',
      };

      const redeliveryOrder = {
        ...mockArchiveOrder,
        deliveryParams: redeliveryParams,
        status: DeliveryStatus.DELIVERY_PENDING,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: redeliveryOrder,
      });

      const result = await orderManagement.triggerRedelivery(mockArchiveOrder.orderId, {
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: redeliveryParams,
      });

      expect(result.deliveryParams.subfolder).toBe('new-subfolder/2025');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle 401 authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).response = {
        status: 401,
        data: mockAuthenticationError,
      };
      (authError as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(authError);

      await expect(orderManagement.listOrders()).rejects.toThrow();
    });

    it('should handle 404 not found errors', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as any).response = {
        status: 404,
        data: mockNotFoundError,
      };
      (notFoundError as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(notFoundError);

      await expect(orderManagement.getOrderById('non-existent-id')).rejects.toThrow();
    });

    it('should handle validation errors for redelivery', async () => {
      const validationError = new Error('Validation failed');
      (validationError as any).response = {
        status: 422,
        data: mockValidationError,
      };
      (validationError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(validationError);

      await expect(
        orderManagement.triggerRedelivery(mockArchiveOrder.orderId, {
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: {
            s3_bucket_id: '',
            aws_region: '',
            aws_access_key: '',
            aws_secret_key: '',
          },
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
      mockAxiosInstance.get.mockRejectedValue(rateLimitError);

      await expect(orderManagement.listOrders()).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Server error');
      (serverError as any).response = {
        status: 500,
        data: mockServerError,
      };
      (serverError as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(serverError);

      await expect(orderManagement.getOrderById(mockArchiveOrder.orderId)).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle orders with no events', async () => {
      const orderNoEvents = {
        ...mockArchiveOrder,
        events: [],
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: orderNoEvents,
      });

      const result = await orderManagement.getOrderById(mockArchiveOrder.orderId);

      expect(result.events).toHaveLength(0);
    });

    it('should handle orders with null download URLs', async () => {
      const orderNoDownloads = {
        ...mockTaskingOrder,
        downloadImageUrl: null,
        downloadPayloadUrl: null,
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: orderNoDownloads,
      });

      const result = await orderManagement.getOrderById(mockTaskingOrder.orderId);

      expect(result.downloadImageUrl).toBeNull();
      expect(result.downloadPayloadUrl).toBeNull();
    });

    it('should handle large page sizes', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockOrdersListResponse,
      });

      const result = await orderManagement.listOrders({ pageSize: 100 });

      expect(result.orders).toBeDefined();
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full order tracking workflow', async () => {
      // Step 1: List orders to find the order
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockOrdersListResponse,
      });

      const list = await orderManagement.listOrders();
      expect(list.orders).toHaveLength(2);

      // Step 2: Get details for first order
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockArchiveOrder,
      });

      const details = await orderManagement.getOrderById(list.orders[0].orderId);
      expect(details.orderId).toBe(mockArchiveOrder.orderId);
      expect(details.events).toBeDefined();

      // Step 3: If delivery failed, trigger redelivery
      if (details.status === DeliveryStatus.DELIVERY_FAILED) {
        mockAxiosInstance.post.mockResolvedValueOnce({
          data: {
            ...details,
            status: DeliveryStatus.DELIVERY_PENDING,
          },
        });

        const redelivered = await orderManagement.triggerRedelivery(details.orderId, {
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: mockS3DeliveryParams,
        });

        expect(redelivered.status).toBe(DeliveryStatus.DELIVERY_PENDING);
      }
    });

    it('should monitor order progress through polling', async () => {
      // Initial status: PROVIDER_PENDING
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockTaskingOrder,
      });

      const initial = await orderManagement.getOrderById(mockTaskingOrder.orderId);
      expect(initial.status).toBe(DeliveryStatus.PROVIDER_PENDING);

      // After some time: DELIVERY_COMPLETED
      const completedOrder = {
        ...mockTaskingOrder,
        status: DeliveryStatus.DELIVERY_COMPLETED,
        downloadImageUrl: 'https://skyfi.com/downloads/image-456.tif',
        downloadPayloadUrl: 'https://skyfi.com/downloads/payload-456.zip',
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: completedOrder,
      });

      const completed = await orderManagement.getOrderById(mockTaskingOrder.orderId);
      expect(completed.status).toBe(DeliveryStatus.DELIVERY_COMPLETED);
      expect(completed.downloadImageUrl).toBeDefined();
    });
  });
});
