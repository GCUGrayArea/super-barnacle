/**
 * End-to-End Scenario Tests for MCP Tools
 *
 * These tests verify realistic workflows and scenarios that users would follow,
 * testing multiple tools in sequence.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MockSkyFiServer } from '../helpers/mock-skyfi-server.js';
import { SkyFiClient } from '../../src/skyfi/client.js';
import { DeliveryDriver, ProductType, Resolution } from '../../src/types/orders.js';
import { DeliveryStatus } from '../../src/types/order-status.js';

// Import tool executors
import { executeSearchArchives } from '../../src/mcp/tools/search-archives.js';
import { executeGetArchive } from '../../src/mcp/tools/get-archive.js';
import { handleArchiveOrder } from '../../src/mcp/tools/order-archive.js';
import { executeGetOrderDetails } from '../../src/mcp/tools/get-order.js';
import { executeListOrders } from '../../src/mcp/tools/list-orders.js';
import { executeTriggerRedelivery } from '../../src/mcp/tools/redelivery.js';
import { executeCheckTaskingFeasibility } from '../../src/mcp/tools/check-feasibility.js';
import { executePredictSatellitePasses } from '../../src/mcp/tools/predict-passes.js';
import { handleTaskingOrder } from '../../src/mcp/tools/order-tasking.js';
import { executeCreateNotification } from '../../src/mcp/tools/create-notification.js';
import { executeListNotifications } from '../../src/mcp/tools/list-notifications.js';
import { executeDeleteNotification } from '../../src/mcp/tools/delete-notification.js';
import { getPricingInfo } from '../../src/mcp/tools/get-pricing.js';

describe('MCP Tools Scenario Tests', () => {
  let mockSkyFi: MockSkyFiServer;
  let skyfiClient: SkyFiClient;

  beforeAll(() => {
    // Set up environment
    process.env.SKYFI_API_KEY = 'test-api-key';
    process.env.SKYFI_BASE_URL = 'https://api.skyfi.com';

    // Create SkyFi client
    skyfiClient = new SkyFiClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.skyfi.com',
      timeout: 30000,
      maxRetries: 0,
      debug: false,
    });

    // Create and start mock SkyFi API server with the client's axios instance
    mockSkyFi = new MockSkyFiServer('https://api.skyfi.com');
    mockSkyFi.start(skyfiClient.getAxiosInstance());
  });

  afterAll(() => {
    mockSkyFi.stop();
  });

  beforeEach(() => {
    mockSkyFi.reset();
  });

  describe('Scenario: Archive Imagery Purchase Workflow', () => {
    it('should complete full archive purchase workflow', async () => {
      const archiveId = '354b783d-8fad-4050-a167-2eb069653777';
      const orderId = '550e8400-e29b-41d4-a716-446655440010';
      const aoi =
        'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))';

      // Step 1: Search for archives
      mockSkyFi.mockArchiveSearch();
      const searchResult = await executeSearchArchives(
        {
          aoi,
          fromDate: '2024-01-01T00:00:00Z',
          toDate: '2024-12-31T23:59:59Z',
          maxCloudCoverage: 10,
        },
        skyfiClient
      );
      expect(searchResult).toContain('Archive Search Results');
      expect(searchResult).toContain(archiveId);

      // Step 2: Get detailed information about a specific archive
      mockSkyFi.mockGetArchive(archiveId);
      const detailsResult = await executeGetArchive({ archiveId }, skyfiClient);
      expect(detailsResult).toContain('Archive Details');
      expect(detailsResult).toContain(archiveId);

      // Step 3: Check pricing
      mockSkyFi.mockGetPricing();
      const pricingResult = await getPricingInfo(skyfiClient, {});
      expect(pricingResult).toContain('Pricing');

      // Step 4: Place the order
      mockSkyFi.mockArchiveOrder(orderId);
      const orderResult = await handleArchiveOrder(
        {
          archiveId,
          aoi,
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: {
            s3_bucket_id: 'my-satellite-images',
            aws_region: 'us-east-1',
            aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
            aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
          label: 'Test Archive Order',
        },
        skyfiClient
      );
      expect(orderResult).toContain('Order Placed Successfully');
      expect(orderResult).toContain(orderId);

      // Step 5: Check order status
      mockSkyFi.mockGetOrder(orderId, DeliveryStatus.PROCESSING);
      const statusResponse = await executeGetOrderDetails(skyfiClient, { orderId });
      expect(statusResponse.content[0].text).toContain('Order Details');
      expect(statusResponse.content[0].text).toContain(orderId);
    });
  });

  describe('Scenario: Tasking Imagery Workflow', () => {
    it('should complete full tasking workflow with feasibility check', async () => {
      const aoi =
        'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))';
      const captureStartDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const captureEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const orderId = '550e8400-e29b-41d4-a716-446655440020';

      // Step 1: Check feasibility
      mockSkyFi.mockFeasibilityCheck(true);
      const feasibilityResult = await executeCheckTaskingFeasibility(skyfiClient, {
        aoi,
        productType: 'Day',
        resolution: 'VeryHigh',
        windowStart: captureStartDate,
        windowEnd: captureEndDate,
      });
      expect(feasibilityResult).toContain('Feasibility');
      expect(feasibilityResult).toContain('95');

      // Step 2: Predict satellite passes
      mockSkyFi.mockPredictPasses();
      const passesResult = await executePredictSatellitePasses(skyfiClient, {
        aoi,
        fromDate: captureStartDate,
        toDate: captureEndDate,
      });
      expect(passesResult).toContain('Satellite Pass');

      // Step 3: Check pricing
      mockSkyFi.mockGetPricing();
      const pricingResult = await getPricingInfo(skyfiClient, {});
      expect(pricingResult).toContain('Pricing');

      // Step 4: Place tasking order
      mockSkyFi.mockTaskingOrder(orderId);
      const orderResult = await handleTaskingOrder(
        {
          aoi,
          windowStart: captureStartDate,
          windowEnd: captureEndDate,
          productType: ProductType.Day,
          resolution: Resolution.VeryHigh,
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: {
            s3_bucket_id: 'satellite-imagery',
            aws_region: 'us-east-1',
            aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
            aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
          label: 'Test Tasking Order',
        },
        skyfiClient
      );
      expect(orderResult).toContain('Order Placed Successfully');
      expect(orderResult).toContain(orderId);

      // Step 5: Check order status
      mockSkyFi.mockGetOrder(orderId, DeliveryStatus.CREATED);
      const statusResponse = await executeGetOrderDetails(skyfiClient, { orderId });
      expect(statusResponse.content[0].text).toContain('Order Details');
      expect(statusResponse.content[0].text).toContain(orderId);
    });

    it('should handle infeasible tasking request', async () => {
      const aoi =
        'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))';
      const captureStartDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
      const captureEndDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

      // Step 1: Check feasibility (not feasible)
      mockSkyFi.mockFeasibilityCheck(false);
      const feasibilityResult = await executeCheckTaskingFeasibility(skyfiClient, {
        aoi,
        productType: 'Day',
        resolution: 'VeryHigh',
        windowStart: captureStartDate,
        windowEnd: captureEndDate,
      });
      expect(feasibilityResult).toContain('Feasibility');
      expect(feasibilityResult).toContain('10');
    });
  });

  describe('Scenario: Order Management Workflow', () => {
    it('should list, view, and manage orders', async () => {
      const orderId = '550e8400-e29b-41d4-a716-446655440099';

      // Step 1: List all orders
      mockSkyFi.mockListOrders();
      const listResponse = await executeListOrders(skyfiClient, { pageSize: 10 });
      expect(listResponse.content[0].text).toContain('orders');

      // Step 2: Get specific order details
      mockSkyFi.mockGetOrder(orderId, DeliveryStatus.DELIVERY_COMPLETED);
      const detailsResponse = await executeGetOrderDetails(skyfiClient, { orderId });
      expect(detailsResponse.content[0].text).toContain('Order Details');
      expect(detailsResponse.content[0].text).toContain(orderId);

      // Step 3: Trigger redelivery
      mockSkyFi.mockRedelivery(orderId);
      const redeliveryResponse = await executeTriggerRedelivery(skyfiClient, { orderId });
      expect(redeliveryResponse.content[0].text).toContain('Redelivery');
      expect(redeliveryResponse.content[0].text).toContain(orderId);
    });
  });

  describe('Scenario: Notification Management Workflow', () => {
    it('should create, list, and delete notifications', async () => {
      const notificationId = '550e8400-e29b-41d4-a716-446655440000';

      // Step 1: Create webhook notification
      mockSkyFi.mockCreateNotification(notificationId);
      const createResponse = await executeCreateNotification(skyfiClient, {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
      });
      expect(createResponse.content[0].text).toContain('Notification');
      expect(createResponse.content[0].text).toContain(notificationId);

      // Step 2: List all notifications
      mockSkyFi.mockListNotifications();
      const listResponse = await executeListNotifications(skyfiClient, {});
      expect(listResponse.content[0].text).toContain('Notification');

      // Step 3: Delete notification
      mockSkyFi.mockDeleteNotification(notificationId);
      const deleteResponse = await executeDeleteNotification(skyfiClient, { notificationId });
      expect(deleteResponse.content[0].text).toContain('deleted');
      expect(deleteResponse.content[0].text).toContain(notificationId);
    });
  });

  describe('Scenario: Complete Order Lifecycle', () => {
    it('should track an order from creation to completion', async () => {
      const archiveId = '354b783d-8fad-4050-a167-2eb069653777';
      const orderId = '550e8400-e29b-41d4-a716-446655440030';
      const aoi =
        'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))';
      const notificationId = '550e8400-e29b-41d4-a716-446655440000';

      // Step 1: Set up notification for order updates
      mockSkyFi.mockCreateNotification(notificationId);
      const notifResponse = await executeCreateNotification(skyfiClient, {
        aoi,
        webhookUrl: 'https://example.com/order-updates',
      });
      expect(notifResponse.content[0].text).toContain('Notification');

      // Step 2: Place order
      mockSkyFi.mockArchiveOrder(orderId);
      const orderResult = await handleArchiveOrder(
        {
          archiveId,
          aoi,
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: {
            s3_bucket_id: 'test-bucket',
            aws_region: 'us-east-1',
            aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
            aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
        },
        skyfiClient
      );
      expect(orderResult).toContain('Order Placed Successfully');

      // Step 3: Check order status (pending)
      mockSkyFi.mockGetOrder(orderId, DeliveryStatus.CREATED);
      let statusResponse = await executeGetOrderDetails(skyfiClient, { orderId });
      expect(statusResponse.content[0].text).toContain('CREATED');

      // Step 4: Check order status (processing)
      mockSkyFi.mockGetOrder(orderId, DeliveryStatus.PROCESSING);
      statusResponse = await executeGetOrderDetails(skyfiClient, { orderId });
      expect(statusResponse.content[0].text).toContain('PROCESSING');

      // Step 5: Check order status (completed)
      mockSkyFi.mockGetOrder(orderId, DeliveryStatus.DELIVERY_COMPLETED);
      statusResponse = await executeGetOrderDetails(skyfiClient, { orderId });
      expect(statusResponse.content[0].text).toContain('DELIVERY_COMPLETED');

      // Step 6: List orders to verify it appears
      mockSkyFi.mockListOrders();
      const listResponse = await executeListOrders(skyfiClient, {});
      expect(listResponse.content[0].text).toContain('orders');
    });
  });
});
