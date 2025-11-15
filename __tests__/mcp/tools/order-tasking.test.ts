/**
 * Tests for Tasking Order MCP Tool
 */

import { handleTaskingOrder, taskingOrderTool } from '../../../src/mcp/tools/order-tasking.js';
import { SkyFiClient } from '../../../src/skyfi/client.js';
import * as ordersModule from '../../../src/skyfi/orders.js';
import {
  TaskingOrderResponse,
  DeliveryDriver,
  OrderType,
  ProductType,
  Resolution,
} from '../../../src/types/orders.js';

// Mock the orders module
jest.mock('../../../src/skyfi/orders.js');

describe('Tasking Order Tool', () => {
  let mockClient: jest.Mocked<SkyFiClient>;
  const mockPlaceTaskingOrder = ordersModule.placeTaskingOrder as jest.MockedFunction<
    typeof ordersModule.placeTaskingOrder
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
      expect(taskingOrderTool.name).toBe('order_tasking_imagery');
    });

    it('should have detailed description with examples', () => {
      expect(taskingOrderTool.description).toContain('tasking');
      expect(taskingOrderTool.description).toContain('COST WARNING');
      expect(taskingOrderTool.description).toContain('Product Types');
      expect(taskingOrderTool.description).toContain('Resolution Levels');
      expect(taskingOrderTool.description).toContain('AWS S3');
      expect(taskingOrderTool.description).toContain('Google Cloud Storage');
      expect(taskingOrderTool.description).toContain('Azure');
    });

    it('should have valid input schema', () => {
      expect(taskingOrderTool.inputSchema).toBeDefined();
      expect(taskingOrderTool.inputSchema.type).toBe('object');
      expect(taskingOrderTool.inputSchema.required).toContain('aoi');
      expect(taskingOrderTool.inputSchema.required).toContain('deliveryDriver');
      expect(taskingOrderTool.inputSchema.required).toContain('windowStart');
      expect(taskingOrderTool.inputSchema.required).toContain('windowEnd');
      expect(taskingOrderTool.inputSchema.required).toContain('productType');
      expect(taskingOrderTool.inputSchema.required).toContain('resolution');
    });
  });

  describe('handleTaskingOrder', () => {
    const validAoi = 'POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))';
    const windowStart = '2024-06-01T10:00:00Z';
    const windowEnd = '2024-06-05T10:00:00Z';

    const mockResponse: TaskingOrderResponse = {
      id: 'order-456',
      orderType: OrderType.Tasking,
      aoi: validAoi,
      deliveryDriver: DeliveryDriver.S3,
      deliveryParams: {
        s3_bucket_id: 'test-bucket',
        aws_region: 'us-east-1',
        aws_access_key: 'AKIATEST',
        aws_secret_key: 'test-secret',
      },
      windowStart,
      windowEnd,
      productType: ProductType.Day,
      resolution: Resolution.High,
    };

    it('should successfully place tasking order with S3 delivery', async () => {
      mockPlaceTaskingOrder.mockResolvedValue(mockResponse);

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

      // Verify API was called
      expect(mockPlaceTaskingOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          aoi: validAoi,
          deliveryDriver: 'S3',
          windowStart,
          windowEnd,
          productType: 'DAY',
          resolution: 'HIGH',
        }),
        mockClient
      );

      // Verify result formatting
      expect(result).toContain('Tasking Order Placed Successfully');
      expect(result).toContain('order-456');
      expect(result).toContain('DAY');
      expect(result).toContain('HIGH');
      expect(result).toContain('AWS S3 Bucket: test-bucket');
    });

    it('should successfully place tasking order with GCS delivery', async () => {
      const gcsResponse: TaskingOrderResponse = {
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

      mockPlaceTaskingOrder.mockResolvedValue(gcsResponse);

      const args = {
        aoi: validAoi,
        deliveryDriver: 'GS',
        deliveryParams: gcsResponse.deliveryParams,
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(mockPlaceTaskingOrder).toHaveBeenCalled();
      expect(result).toContain('Tasking Order Placed Successfully');
      expect(result).toContain('Google Cloud Storage Bucket: test-bucket');
    });

    it('should successfully place tasking order with Azure delivery', async () => {
      const azureResponse: TaskingOrderResponse = {
        ...mockResponse,
        deliveryDriver: DeliveryDriver.AZURE,
        deliveryParams: {
          azure_container_id: 'test-container',
          azure_connection_string: 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=key',
        },
      };

      mockPlaceTaskingOrder.mockResolvedValue(azureResponse);

      const args = {
        aoi: validAoi,
        deliveryDriver: 'AZURE',
        deliveryParams: azureResponse.deliveryParams,
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(mockPlaceTaskingOrder).toHaveBeenCalled();
      expect(result).toContain('Tasking Order Placed Successfully');
      expect(result).toContain('Azure Container: test-container');
    });

    it('should include optional imaging parameters in result', async () => {
      const responseWithParams: TaskingOrderResponse = {
        ...mockResponse,
        maxCloudCoveragePercent: 20,
        maxOffNadirAngle: 15,
        priorityItem: true,
      };

      mockPlaceTaskingOrder.mockResolvedValue(responseWithParams);

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
        maxCloudCoveragePercent: 20,
        maxOffNadirAngle: 15,
        priorityItem: true,
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('Max Cloud Coverage: 20%');
      expect(result).toContain('Max Off-Nadir Angle: 15°');
      expect(result).toContain('Priority Order: Yes');
    });

    it('should include optional order fields in result', async () => {
      const responseWithOptionals: TaskingOrderResponse = {
        ...mockResponse,
        label: 'Test Label',
        orderLabel: 'Test Order',
        webhookUrl: 'https://example.com/webhook',
      };

      mockPlaceTaskingOrder.mockResolvedValue(responseWithOptionals);

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
        label: 'Test Label',
        orderLabel: 'Test Order',
        webhookUrl: 'https://example.com/webhook',
        metadata: { key: 'value' },
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('Test Label');
      expect(result).toContain('Test Order');
      expect(result).toContain('https://example.com/webhook');
    });

    it('should calculate and display window duration', async () => {
      mockPlaceTaskingOrder.mockResolvedValue(mockResponse);

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('Duration:');
      expect(result).toContain('day');
    });

    it('should handle all product types', async () => {
      const productTypes = ['DAY', 'NIGHT', 'VIDEO', 'MULTISPECTRAL', 'HYPERSPECTRAL', 'SAR', 'STEREO'];

      for (const productType of productTypes) {
        const response: TaskingOrderResponse = {
          ...mockResponse,
          productType: productType as ProductType,
        };

        mockPlaceTaskingOrder.mockResolvedValue(response);

        const args = {
          aoi: validAoi,
          deliveryDriver: 'S3',
          deliveryParams: mockResponse.deliveryParams,
          windowStart,
          windowEnd,
          productType,
          resolution: 'HIGH',
        };

        const result = await handleTaskingOrder(args, mockClient);

        expect(result).toContain('Tasking Order Placed Successfully');
        expect(result).toContain(productType);
      }
    });

    it('should handle all resolution levels', async () => {
      const resolutions = ['LOW', 'MEDIUM', 'HIGH', 'VERY HIGH', 'SUPER HIGH', 'ULTRA HIGH', 'CM 30', 'CM 50'];

      for (const resolution of resolutions) {
        const response: TaskingOrderResponse = {
          ...mockResponse,
          resolution: resolution as Resolution,
        };

        mockPlaceTaskingOrder.mockResolvedValue(response);

        const args = {
          aoi: validAoi,
          deliveryDriver: 'S3',
          deliveryParams: mockResponse.deliveryParams,
          windowStart,
          windowEnd,
          productType: 'DAY',
          resolution,
        };

        const result = await handleTaskingOrder(args, mockClient);

        expect(result).toContain('Tasking Order Placed Successfully');
        expect(result).toContain(resolution);
      }
    });

    it('should handle SAR-specific parameters', async () => {
      const sarResponse: TaskingOrderResponse = {
        ...mockResponse,
        productType: ProductType.SAR,
      };

      mockPlaceTaskingOrder.mockResolvedValue(sarResponse);

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
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
      expect(result).toContain('SAR');
    });

    it('should handle provider window ID', async () => {
      mockPlaceTaskingOrder.mockResolvedValue(mockResponse);

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
        providerWindowId: '12345678-1234-1234-1234-123456789012',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(mockPlaceTaskingOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          providerWindowId: '12345678-1234-1234-1234-123456789012',
        }),
        mockClient
      );

      expect(result).toContain('Tasking Order Placed Successfully');
    });

    it('should handle order placement errors', async () => {
      mockPlaceTaskingOrder.mockRejectedValue(new Error('Invalid product type'));

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('Order Placement Failed');
      expect(result).toContain('Invalid product type');
      expect(result).toContain('Common Issues');
    });

    it('should handle validation errors', async () => {
      mockPlaceTaskingOrder.mockRejectedValue(
        new Error('Invalid tasking order parameters: Window start must be before window end')
      );

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('Order Placement Failed');
      expect(result).toContain('Window start must be before window end');
    });

    it('should include cost warnings in result', async () => {
      mockPlaceTaskingOrder.mockResolvedValue(mockResponse);

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('Payment');
      expect(result).toContain('TASKING order');
      expect(result).toContain('significant payment');
      expect(result).toContain('charged');
    });

    it('should include delivery timeline information', async () => {
      mockPlaceTaskingOrder.mockResolvedValue(mockResponse);

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('Delivery Timeline');
      expect(result).toContain('Tasking window');
      expect(result).toContain('satellite');
    });

    it('should include success factors', async () => {
      mockPlaceTaskingOrder.mockResolvedValue(mockResponse);

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('Success Factors');
      expect(result).toContain('weather');
      expect(result).toContain('satellite');
    });

    it('should include order management links', async () => {
      mockPlaceTaskingOrder.mockResolvedValue(mockResponse);

      const args = {
        aoi: validAoi,
        deliveryDriver: 'S3',
        deliveryParams: mockResponse.deliveryParams,
        windowStart,
        windowEnd,
        productType: 'DAY',
        resolution: 'HIGH',
      };

      const result = await handleTaskingOrder(args, mockClient);

      expect(result).toContain('https://app.skyfi.com/orders');
      expect(result).toContain('order-456');
    });
  });
});
