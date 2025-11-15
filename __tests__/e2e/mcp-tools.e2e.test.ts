/**
 * End-to-End Integration Tests for MCP Tools
 *
 * These tests verify that all MCP tools work correctly end-to-end
 * with real tool execution and mocked SkyFi API responses.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MockSkyFiServer } from '../helpers/mock-skyfi-server.js';
import { SkyFiClient } from '../../src/skyfi/client.js';
import { DeliveryDriver, Provider, ProductType, Resolution } from '../../src/types/skyfi-api.js';
import { DeliveryStatus } from '../../src/types/order-status.js';

// Import all tool executors
import { executeSearchArchives } from '../../src/mcp/tools/search-archives.js';
import { executeGetArchive } from '../../src/mcp/tools/get-archive.js';
import { handleArchiveOrder } from '../../src/mcp/tools/order-archive.js';
import { handleTaskingOrder } from '../../src/mcp/tools/order-tasking.js';
import { executeCheckTaskingFeasibility } from '../../src/mcp/tools/check-feasibility.js';
import { executePredictSatellitePasses } from '../../src/mcp/tools/predict-passes.js';
import { executeListOrders } from '../../src/mcp/tools/list-orders.js';
import { executeGetOrderDetails } from '../../src/mcp/tools/get-order.js';
import { executeTriggerRedelivery } from '../../src/mcp/tools/redelivery.js';
import { executeCreateNotification } from '../../src/mcp/tools/create-notification.js';
import { executeListNotifications } from '../../src/mcp/tools/list-notifications.js';
import { executeDeleteNotification } from '../../src/mcp/tools/delete-notification.js';
import { getPricingInfo } from '../../src/mcp/tools/get-pricing.js';

describe('MCP Tools E2E Integration Tests', () => {
  let mockSkyFi: MockSkyFiServer;
  let skyfiClient: SkyFiClient;

  beforeAll(() => {
    // Set up environment
    process.env.SKYFI_API_KEY = 'test-api-key';
    process.env.SKYFI_BASE_URL = 'https://api.skyfi.com';

    // Create and start mock SkyFi API server
    mockSkyFi = new MockSkyFiServer('https://api.skyfi.com');
    mockSkyFi.start();

    // Create SkyFi client
    skyfiClient = new SkyFiClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.skyfi.com',
      timeout: 30000,
      maxRetries: 0,
      debug: false,
    });
  });

  afterAll(() => {
    mockSkyFi.stop();
  });

  beforeEach(() => {
    mockSkyFi.reset();
  });

  describe('Tool: search_satellite_archives', () => {
    it('should search for archives successfully', async () => {
      mockSkyFi.mockArchiveSearch();

      const result = await executeSearchArchives(
        {
          aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
          fromDate: '2024-01-01T00:00:00Z',
          toDate: '2024-12-31T23:59:59Z',
        },
        skyfiClient
      );

      expect(result).toContain('Archive Search Results');
      expect(result).toContain('354b783d-8fad-4050-a167-2eb069653777');
    });

    it('should handle search with filters', async () => {
      mockSkyFi.mockArchiveSearch();

      const result = await executeSearchArchives(
        {
          aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
          productTypes: ['DAY'],
          resolutions: ['VERY HIGH'],
          maxCloudCoverage: 10,
        },
        skyfiClient
      );

      expect(result).toContain('Archive Search Results');
    });
  });

  describe('Tool: get_archive_details', () => {
    it('should get archive details successfully', async () => {
      const archiveId = '354b783d-8fad-4050-a167-2eb069653777';
      mockSkyFi.mockGetArchive(archiveId);

      const result = await executeGetArchive({ archiveId }, skyfiClient);

      expect(result).toContain('Archive Details');
      expect(result).toContain(archiveId);
      expect(result).toContain('Satellogic');
    });
  });

  describe('Tool: order_archive_imagery', () => {
    it('should place an archive order successfully', async () => {
      mockSkyFi.mockArchiveOrder('order-123');

      const result = await handleArchiveOrder(
        {
          archiveId: '354b783d-8fad-4050-a167-2eb069653777',
          aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: {
            s3_bucket_id: 'test-bucket',
            aws_region: 'us-east-1',
            aws_access_key: 'test-key',
            aws_secret_key: 'test-secret',
          },
        },
        skyfiClient
      );

      expect(result).toContain('Order Confirmation');
      expect(result).toContain('order-123');
    });
  });

  describe('Tool: order_tasking_imagery', () => {
    it('should place a tasking order successfully', async () => {
      mockSkyFi.mockTaskingOrder('tasking-order-123');

      const result = await handleTaskingOrder(
        {
          aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
          captureStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          captureEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          productType: ProductType.Day,
          resolution: Resolution.VeryHigh,
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: {
            s3_bucket_id: 'test-bucket',
            aws_region: 'us-east-1',
            aws_access_key: 'test-key',
            aws_secret_key: 'test-secret',
          },
        },
        skyfiClient
      );

      expect(result).toContain('Order Confirmation');
      expect(result).toContain('tasking-order-123');
    });
  });

  describe('Tool: check_tasking_feasibility', () => {
    it('should check feasibility successfully (feasible)', async () => {
      mockSkyFi.mockFeasibilityCheck(true);

      const result = await executeCheckTaskingFeasibility(skyfiClient, {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        productType: ProductType.Day,
        resolution: Resolution.VeryHigh,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(result).toContain('Feasibility');
      expect(result).toContain('95');
    });

    it('should check feasibility successfully (not feasible)', async () => {
      mockSkyFi.mockFeasibilityCheck(false);

      const result = await executeCheckTaskingFeasibility(skyfiClient, {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        productType: ProductType.Day,
        resolution: Resolution.VeryHigh,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(result).toContain('Feasibility');
      expect(result).toContain('10');
    });
  });

  describe('Tool: predict_satellite_passes', () => {
    it('should predict satellite passes successfully', async () => {
      mockSkyFi.mockPredictPasses();

      const result = await executePredictSatellitePasses(skyfiClient, {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        fromDate: new Date().toISOString(),
        toDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(result).toContain('Satellite Pass');
      expect(result).toContain('Satellogic');
    });
  });

  describe('Tool: list_orders', () => {
    it('should list orders successfully', async () => {
      mockSkyFi.mockListOrders();

      const response = await executeListOrders(skyfiClient, {});

      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).toContain('Orders');
      expect(response.content[0].text).toContain('order-1');
    });

    it('should list orders with pagination', async () => {
      mockSkyFi.mockListOrders();

      const response = await executeListOrders(skyfiClient, {
        pageNumber: 0,
        pageSize: 5,
      });

      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).toContain('Orders');
    });
  });

  describe('Tool: get_order_details', () => {
    it('should get order details successfully', async () => {
      const orderId = 'order-123';
      mockSkyFi.mockGetOrder(orderId, DeliveryStatus.CREATED);

      const response = await executeGetOrderDetails(skyfiClient, { orderId });

      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).toContain('Order Details');
      expect(response.content[0].text).toContain(orderId);
    });
  });

  describe('Tool: trigger_order_redelivery', () => {
    it('should trigger redelivery successfully', async () => {
      const orderId = 'order-123';
      mockSkyFi.mockRedelivery(orderId);

      const response = await executeTriggerRedelivery(skyfiClient, { orderId });

      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).toContain('Redelivery');
      expect(response.content[0].text).toContain(orderId);
    });
  });

  describe('Tool: create_monitoring_notification', () => {
    it('should create a notification successfully', async () => {
      const notificationId = '550e8400-e29b-41d4-a716-446655440000';
      mockSkyFi.mockCreateNotification(notificationId);

      const response = await executeCreateNotification(skyfiClient, {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
      });

      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).toContain('Notification');
      expect(response.content[0].text).toContain(notificationId);
    });
  });

  describe('Tool: list_notifications', () => {
    it('should list notifications successfully', async () => {
      mockSkyFi.mockListNotifications();

      const response = await executeListNotifications(skyfiClient, {});

      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).toContain('Notification');
    });
  });

  describe('Tool: delete_notification', () => {
    it('should delete a notification successfully', async () => {
      const notificationId = '550e8400-e29b-41d4-a716-446655440000';
      mockSkyFi.mockDeleteNotification(notificationId);

      const response = await executeDeleteNotification(skyfiClient, { notificationId });

      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).toContain('deleted');
      expect(response.content[0].text).toContain(notificationId);
    });
  });

  describe('Tool: get_pricing_info', () => {
    it('should get pricing info successfully', async () => {
      mockSkyFi.mockGetPricing();

      const result = await getPricingInfo(skyfiClient, {});

      expect(result).toContain('Pricing');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockSkyFi.mockError('/archives', 'POST', 500, 'Internal server error');

      await expect(
        executeSearchArchives(
          {
            aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
          },
          skyfiClient
        )
      ).rejects.toThrow();
    });
  });
});
