/**
 * Integration Tests for Order MCP Tools
 *
 * These tests verify that the order tools integrate correctly with the
 * SkyFi API client and delivery validators.
 */

import { handleArchiveOrder } from '../../../src/mcp/tools/order-archive.js';
import { handleTaskingOrder } from '../../../src/mcp/tools/order-tasking.js';
import { SkyFiClient } from '../../../src/skyfi/client.js';
import { DeliveryDriver, OrderType } from '../../../src/types/orders.js';

// Mock the SkyFi client
jest.mock('../../../src/skyfi/client.js');

describe('Order Tools Integration', () => {
  let mockClient: jest.Mocked<SkyFiClient>;

  beforeEach(() => {
    // Create mock client with post method
    mockClient = {
      post: jest.fn(),
      get: jest.fn(),
    } as any;

    jest.clearAllMocks();
  });

  describe('Archive Order Integration', () => {
    const validArchiveId = '12345678-1234-1234-1234-123456789012';
    const validAoi = 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))';

    it('should successfully place order with all delivery drivers', async () => {
      const deliveryConfigs = [
        {
          driver: 'S3' as const,
          params: {
            s3_bucket_id: 'test-bucket',
            aws_region: 'us-east-1',
            aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
            aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
        },
        {
          driver: 'GS' as const,
          params: {
            gs_project_id: 'test-project',
            gs_bucket_id: 'test-bucket',
            gs_credentials: {
              type: 'service_account',
              project_id: 'test-project',
              private_key_id: 'key-id',
              private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
              client_email: 'test@test-project.iam.gserviceaccount.com',
              client_id: '123',
              auth_uri: 'https://accounts.google.com/o/oauth2/auth',
              token_uri: 'https://oauth2.googleapis.com/token',
              auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
              client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test',
            },
          },
        },
        {
          driver: 'AZURE' as const,
          params: {
            azure_container_id: 'test-container',
            azure_connection_string:
              'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=testkey;EndpointSuffix=core.windows.net',
          },
        },
      ];

      for (const config of deliveryConfigs) {
        mockClient.post.mockResolvedValue({
          id: 'order-123',
          orderType: OrderType.Archive,
          archiveId: validArchiveId,
          aoi: validAoi,
          deliveryDriver: config.driver,
          deliveryParams: config.params,
        });

        const args = {
          archiveId: validArchiveId,
          aoi: validAoi,
          deliveryDriver: config.driver,
          deliveryParams: config.params,
        };

        const result = await handleArchiveOrder(args, mockClient);

        expect(result).toContain('Archive Order Placed Successfully');
        expect(mockClient.post).toHaveBeenCalledWith(
          '/order-archive',
          expect.objectContaining({
            archiveId: validArchiveId,
            aoi: validAoi,
            deliveryDriver: config.driver,
          })
        );
      }
    });

    it('should handle delivery validation errors gracefully', async () => {
      mockClient.post.mockRejectedValue(
        new Error('AWS access key should start with AKIA or ASIA')
      );

      const args = {
        archiveId: validArchiveId,
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: {
          s3_bucket_id: 'test-bucket',
          aws_region: 'us-east-1',
          aws_access_key: 'INVALID',
          aws_secret_key: 'test-secret',
        },
      };

      const result = await handleArchiveOrder(args, mockClient);

      expect(result).toContain('Order Placement Failed');
      expect(result).toContain('Delivery Configuration');
    });

    it('should handle API errors gracefully', async () => {
      mockClient.post.mockRejectedValue(new Error('Network error'));

      const args = {
        archiveId: validArchiveId,
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: {
          s3_bucket_id: 'test-bucket',
          aws_region: 'us-east-1',
          aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
          aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        },
      };

      const result = await handleArchiveOrder(args, mockClient);

      expect(result).toContain('Order Placement Failed');
      expect(result).toContain('Network error');
    });

    it('should include webhook URL when provided', async () => {
      mockClient.post.mockResolvedValue({
        id: 'order-123',
        orderType: OrderType.Archive,
        archiveId: validArchiveId,
        aoi: validAoi,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: {
          s3_bucket_id: 'test-bucket',
          aws_region: 'us-east-1',
          aws_access_key: 'AKIATEST',
          aws_secret_key: 'test-secret',
        },
        webhookUrl: 'https://example.com/webhook',
      });

      const args = {
        archiveId: validArchiveId,
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: {
          s3_bucket_id: 'test-bucket',
          aws_region: 'us-east-1',
          aws_access_key: 'AKIATEST',
          aws_secret_key: 'test-secret',
        },
        webhookUrl: 'https://example.com/webhook',
      };

      const result = await handleArchiveOrder(args, mockClient);

      expect(result).toContain('https://example.com/webhook');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/order-archive',
        expect.objectContaining({
          webhookUrl: 'https://example.com/webhook',
        })
      );
    });
  });

  describe('Tasking Order Integration', () => {
    const validAoi = 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))';
    const windowStart = '2024-06-01T10:00:00Z';
    const windowEnd = '2024-06-05T10:00:00Z';

    it('should successfully place order with all delivery drivers', async () => {
      const deliveryConfigs = [
        {
          driver: 'S3' as const,
          params: {
            s3_bucket_id: 'test-bucket',
            aws_region: 'us-east-1',
            aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
            aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
        },
        {
          driver: 'GS' as const,
          params: {
            gs_project_id: 'test-project',
            gs_bucket_id: 'test-bucket',
            gs_credentials: {
              type: 'service_account',
              project_id: 'test-project',
              private_key_id: 'key-id',
              private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
              client_email: 'test@test-project.iam.gserviceaccount.com',
              client_id: '123',
              auth_uri: 'https://accounts.google.com/o/oauth2/auth',
              token_uri: 'https://oauth2.googleapis.com/token',
              auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
              client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test',
            },
          },
        },
        {
          driver: 'AZURE' as const,
          params: {
            azure_container_id: 'test-container',
            azure_connection_string:
              'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=testkey;EndpointSuffix=core.windows.net',
          },
        },
      ];

      for (const config of deliveryConfigs) {
        mockClient.post.mockResolvedValue({
          id: 'order-456',
          orderType: OrderType.Tasking,
          aoi: validAoi,
          deliveryDriver: config.driver,
          deliveryParams: config.params,
          windowStart,
          windowEnd,
          productType: 'DAY',
          resolution: 'HIGH',
        });

        const args = {
          aoi: validAoi,
          deliveryDriver: config.driver,
          deliveryParams: config.params,
          windowStart,
          windowEnd,
          productType: 'DAY',
          resolution: 'HIGH',
        };

        const result = await handleTaskingOrder(args, mockClient);

        expect(result).toContain('Tasking Order Placed Successfully');
        expect(mockClient.post).toHaveBeenCalledWith(
          '/order-tasking',
          expect.objectContaining({
            aoi: validAoi,
            deliveryDriver: config.driver,
            windowStart,
            windowEnd,
            productType: 'DAY',
            resolution: 'HIGH',
          })
        );
      }
    });

    it('should handle all product and resolution combinations', async () => {
      const combinations = [
        { productType: 'DAY', resolution: 'HIGH' },
        { productType: 'NIGHT', resolution: 'MEDIUM' },
        { productType: 'SAR', resolution: 'VERY HIGH' },
        { productType: 'MULTISPECTRAL', resolution: 'SUPER HIGH' },
      ];

      for (const combo of combinations) {
        mockClient.post.mockResolvedValue({
          id: 'order-456',
          orderType: OrderType.Tasking,
          aoi: validAoi,
          deliveryDriver: DeliveryDriver.S3,
          deliveryParams: {},
          windowStart,
          windowEnd,
          productType: combo.productType,
          resolution: combo.resolution,
        });

        const args = {
          aoi: validAoi,
          deliveryDriver: 'S3',
          deliveryParams: {
            s3_bucket_id: 'test-bucket',
            aws_region: 'us-east-1',
            aws_access_key: 'AKIATEST',
            aws_secret_key: 'test-secret',
          },
          windowStart,
          windowEnd,
          productType: combo.productType,
          resolution: combo.resolution,
        };

        const result = await handleTaskingOrder(args, mockClient);

        expect(result).toContain('Tasking Order Placed Successfully');
        expect(result).toContain(combo.productType);
        expect(result).toContain(combo.resolution);
      }
    });

    it('should include all optional parameters when provided', async () => {
      mockClient.post.mockResolvedValue({
        id: 'order-456',
        orderType: OrderType.Tasking,
        aoi: validAoi,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: {},
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
        maxCloudCoveragePercent: 20,
        maxOffNadirAngle: 15,
        priorityItem: true,
      });

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: {
          s3_bucket_id: 'test-bucket',
          aws_region: 'us-east-1',
          aws_access_key: 'AKIATEST',
          aws_secret_key: 'test-secret',
        },
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
        maxCloudCoveragePercent: 20,
        maxOffNadirAngle: 15,
        priorityItem: true,
        requiredProvider: 'Planet',
        label: 'Test Order',
        orderLabel: 'Integration Test',
        metadata: { test: 'value' },
        webhookUrl: 'https://example.com/webhook',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('Tasking Order Placed Successfully');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/order-tasking',
        expect.objectContaining({
          maxCloudCoveragePercent: 20,
          maxOffNadirAngle: 15,
          priorityItem: true,
          requiredProvider: 'Planet',
          label: 'Test Order',
          orderLabel: 'Integration Test',
          metadata: { test: 'value' },
          webhookUrl: 'https://example.com/webhook',
        })
      );
    });

    it('should handle SAR-specific parameters', async () => {
      mockClient.post.mockResolvedValue({
        id: 'order-456',
        orderType: OrderType.Tasking,
        aoi: validAoi,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: {},
        windowStart,
        windowEnd,
        productType: 'SAR',
        resolution: 'HIGH',
      });

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: {
          s3_bucket_id: 'test-bucket',
          aws_region: 'us-east-1',
          aws_access_key: 'AKIATEST',
          aws_secret_key: 'test-secret',
        },
        windowStart,
        windowEnd,
        productType: 'SAR',
        resolution: 'HIGH',
        sarProductTypes: ['SLC', 'GRD'],
        sarPolarisation: 'VV',
        sarGrazingAngleMin: 20,
        sarGrazingAngleMax: 45,
        sarAzimuthAngleMin: 0,
        sarAzimuthAngleMax: 180,
        sarNumberOfLooks: 4,
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('Tasking Order Placed Successfully');
      expect(mockClient.post).toHaveBeenCalledWith(
        '/order-tasking',
        expect.objectContaining({
          productType: 'SAR',
          sarProductTypes: ['SLC', 'GRD'],
          sarPolarisation: 'VV',
          sarGrazingAngleMin: 20,
          sarGrazingAngleMax: 45,
          sarAzimuthAngleMin: 0,
          sarAzimuthAngleMax: 180,
          sarNumberOfLooks: 4,
        })
      );
    });

    it('should handle delivery validation errors gracefully', async () => {
      mockClient.post.mockRejectedValue(
        new Error('GCS project ID must match the project ID in credentials')
      );

      const args = {
        aoi: validAoi,
        deliveryDriver: 'GS',
        deliveryParams: {
          gs_project_id: 'wrong-project',
          gs_bucket_id: 'test-bucket',
          gs_credentials: {
            type: 'service_account',
            project_id: 'correct-project',
            private_key_id: 'key-id',
            private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
            client_email: 'test@correct-project.iam.gserviceaccount.com',
            client_id: '123',
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test',
          },
        },
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('Order Placement Failed');
      expect(result).toContain('Delivery Configuration');
    });

    it('should handle API errors gracefully', async () => {
      mockClient.post.mockRejectedValue(new Error('API timeout'));

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: {
          s3_bucket_id: 'test-bucket',
          aws_region: 'us-east-1',
          aws_access_key: 'AKIATEST',
          aws_secret_key: 'test-secret',
        },
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('Order Placement Failed');
      expect(result).toContain('API timeout');
    });
  });

  describe('Error Message Quality', () => {
    it('should provide helpful error messages for common mistakes', async () => {
      const errorScenarios = [
        {
          error: 'Invalid archive order parameters: Archive ID must be a valid UUID',
          shouldContain: ['Order Placement Failed', 'Common Issues'],
        },
        {
          error: 'Invalid tasking order parameters: Window start must be before window end',
          shouldContain: ['Order Placement Failed', 'Common Issues'],
        },
        {
          error: 'AWS access key should start with AKIA or ASIA',
          shouldContain: ['Order Placement Failed', 'Delivery Configuration'],
        },
        {
          error: 'AOI must be a valid WKT POLYGON format',
          shouldContain: ['Order Placement Failed', 'Area of Interest'],
        },
      ];

      for (const scenario of errorScenarios) {
        mockClient.post.mockRejectedValue(new Error(scenario.error));

        const result = await handleArchiveOrder(
          {
            archiveId: '12345678-1234-1234-1234-123456789012',
            aoi: 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))',
            deliveryDriver: 'S3',
            deliveryParams: {},
          },
          mockClient
        );

        // All error messages should contain these basic elements
        expect(result).toContain('Order Placement Failed');
        expect(result).toContain('Common Issues');
        expect(result).toContain('Need Help?');
      }
    });
  });
});
