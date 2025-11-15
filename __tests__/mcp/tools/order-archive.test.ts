/**
 * Tests for Archive Order MCP Tool
 */

import { handleArchiveOrder, archiveOrderTool } from '../../../src/mcp/tools/order-archive.js';
import { SkyFiClient } from '../../../src/skyfi/client.js';
import * as ordersModule from '../../../src/skyfi/orders.js';
import { ArchiveOrderResponse, DeliveryDriver, OrderType } from '../../../src/types/orders.js';

// Mock the orders module
jest.mock('../../../src/skyfi/orders.js');

describe('Archive Order Tool', () => {
  let mockClient: jest.Mocked<SkyFiClient>;
  const mockPlaceArchiveOrder = ordersModule.placeArchiveOrder as jest.MockedFunction<
    typeof ordersModule.placeArchiveOrder
  >;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      post: jest.fn(),
      get: jest.fn(),
    } as any;

    jest.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool name', () => {
      expect(archiveOrderTool.name).toBe('order_archive_imagery');
    });

    it('should have detailed description with examples', () => {
      expect(archiveOrderTool.description).toContain('archive');
      expect(archiveOrderTool.description).toContain('COST WARNING');
      expect(archiveOrderTool.description).toContain('AWS S3');
      expect(archiveOrderTool.description).toContain('Google Cloud Storage');
      expect(archiveOrderTool.description).toContain('Azure');
    });

    it('should have valid input schema', () => {
      expect(archiveOrderTool.inputSchema).toBeDefined();
      expect(archiveOrderTool.inputSchema.type).toBe('object');
      expect(archiveOrderTool.inputSchema.required).toContain('archiveId');
      expect(archiveOrderTool.inputSchema.required).toContain('aoi');
      expect(archiveOrderTool.inputSchema.required).toContain('deliveryDriver');
    });
  });

  describe('handleArchiveOrder', () => {
    const validArchiveId = '12345678-1234-1234-1234-123456789012';
    const validAoi = 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))';

    const mockResponse: ArchiveOrderResponse = {
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
    };

    it('should successfully place archive order with S3 delivery', async () => {
      mockPlaceArchiveOrder.mockResolvedValue(mockResponse);

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
      };

      const result = await handleArchiveOrder(args, mockClient);

      // Verify API was called
      expect(mockPlaceArchiveOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          archiveId: validArchiveId,
          aoi: validAoi,
          deliveryDriver: 'S3',
        }),
        mockClient
      );

      // Verify result formatting
      expect(result).toContain('Archive Order Placed Successfully');
      expect(result).toContain('order-123');
      expect(result).toContain(validArchiveId);
      expect(result).toContain('AWS S3 Bucket: test-bucket');
    });

    it('should successfully place archive order with GCS delivery', async () => {
      const gcsResponse: ArchiveOrderResponse = {
        ...mockResponse,
        deliveryDriver: DeliveryDriver.GS,
        deliveryParams: {
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
      };

      mockPlaceArchiveOrder.mockResolvedValue(gcsResponse);

      const args = {
        archiveId: validArchiveId,
        aoi: validAoi,
        deliveryDriver: 'GS',
        deliveryParams: gcsResponse.deliveryParams,
      };

      const result = await handleArchiveOrder(args, mockClient);

      expect(mockPlaceArchiveOrder).toHaveBeenCalled();
      expect(result).toContain('Archive Order Placed Successfully');
      expect(result).toContain('Google Cloud Storage Bucket: test-bucket');
    });

    it('should successfully place archive order with Azure delivery', async () => {
      const azureResponse: ArchiveOrderResponse = {
        ...mockResponse,
        deliveryDriver: DeliveryDriver.AZURE,
        deliveryParams: {
          azure_container_id: 'test-container',
          azure_connection_string: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key',
        },
      };

      mockPlaceArchiveOrder.mockResolvedValue(azureResponse);

      const args = {
        archiveId: validArchiveId,
        aoi: validAoi,
        deliveryDriver: 'AZURE',
        deliveryParams: azureResponse.deliveryParams,
      };

      const result = await handleArchiveOrder(args, mockClient);

      expect(mockPlaceArchiveOrder).toHaveBeenCalled();
      expect(result).toContain('Archive Order Placed Successfully');
      expect(result).toContain('Azure Container: test-container');
    });

    it('should include optional fields in result', async () => {
      const responseWithOptionals: ArchiveOrderResponse = {
        ...mockResponse,
        label: 'Test Label',
        orderLabel: 'Test Order',
        webhookUrl: 'https://example.com/webhook',
        metadata: { key: 'value' },
      };

      mockPlaceArchiveOrder.mockResolvedValue(responseWithOptionals);

      const args = {
        archiveId: validArchiveId,
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
        label: 'Test Label',
        orderLabel: 'Test Order',
        webhookUrl: 'https://example.com/webhook',
        metadata: { key: 'value' },
      };

      const result = await handleArchiveOrder(args, mockClient);

      expect(result).toContain('Test Label');
      expect(result).toContain('Test Order');
      expect(result).toContain('https://example.com/webhook');
      expect(result).toContain('key');
    });

    it('should handle order placement errors', async () => {
      mockPlaceArchiveOrder.mockRejectedValue(new Error('Invalid archive ID'));

      const args = {
        archiveId: validArchiveId,
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
      };

      const result = await handleArchiveOrder(args, mockClient);

      expect(result).toContain('Order Placement Failed');
      expect(result).toContain('Invalid archive ID');
      expect(result).toContain('Common Issues');
    });

    it('should handle validation errors', async () => {
      mockPlaceArchiveOrder.mockRejectedValue(
        new Error('Invalid archive order parameters: Archive ID must be a valid UUID')
      );

      const args = {
        archiveId: validArchiveId,
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
      };

      const result = await handleArchiveOrder(args, mockClient);

      expect(result).toContain('Order Placement Failed');
      expect(result).toContain('Archive ID must be a valid UUID');
    });

    it('should handle delivery validation errors', async () => {
      mockPlaceArchiveOrder.mockRejectedValue(
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
      expect(result).toContain('Common Issues');
    });

    it('should include cost warnings in result', async () => {
      mockPlaceArchiveOrder.mockResolvedValue(mockResponse);

      const args = {
        archiveId: validArchiveId,
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
      };

      const result = await handleArchiveOrder(args, mockClient);

      expect(result).toContain('Payment');
      expect(result).toContain('charged');
      expect(result).toContain('Next Steps');
    });

    it('should include order management links', async () => {
      mockPlaceArchiveOrder.mockResolvedValue(mockResponse);

      const args = {
        archiveId: validArchiveId,
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
      };

      const result = await handleArchiveOrder(args, mockClient);

      expect(result).toContain('https://app.skyfi.com/orders');
      expect(result).toContain('order-123');
    });
  });
});
