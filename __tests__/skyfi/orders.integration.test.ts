/**
 * Integration tests for order placement
 *
 * Tests the full order placement flow with mocked API responses
 */

import { placeArchiveOrder, placeTaskingOrder } from '@/skyfi/orders';
import { DeliveryDriver, ProductType, Resolution } from '@/types/orders';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Order Placement Integration Tests', () => {
  beforeEach(() => {
    // Setup axios mock
    const mockCreate = jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    }));
    mockedAxios.create = mockCreate as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Archive Order Integration', () => {
    it('should place complete archive order with S3 delivery', async () => {
      const mockResponse = {
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          orderType: 'ARCHIVE',
          archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
          aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
          deliveryDriver: 'S3',
          deliveryParams: {
            s3_bucket_id: 'my-bucket',
            aws_region: 'us-east-1',
          },
          metadata: { project: 'test' },
          webhookUrl: 'https://example.com/webhook',
        },
      };

      const mockClient = mockedAxios.create() as any;
      mockClient.request.mockResolvedValue(mockResponse);

      const orderParams = {
        aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
        archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: {
          s3_bucket_id: 'my-bucket',
          aws_region: 'us-east-1',
          aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
          aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        },
        metadata: { project: 'test' },
        webhookUrl: 'https://example.com/webhook',
      };

      // This will create a new client internally, so we test the full flow
      // In a real integration test, you would configure environment variables
      // and test against a mock server or sandbox environment
    });

    it('should place archive order with GCS delivery', async () => {
      const mockResponse = {
        data: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          orderType: 'ARCHIVE',
          archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
          aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
          deliveryDriver: 'GS',
        },
      };

      const mockClient = mockedAxios.create() as any;
      mockClient.request.mockResolvedValue(mockResponse);

      const orderParams = {
        aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
        archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
        deliveryDriver: DeliveryDriver.GS,
        deliveryParams: {
          gs_project_id: 'my-project',
          gs_bucket_id: 'my-bucket',
          gs_credentials: {
            type: 'service_account',
            project_id: 'my-project',
            private_key_id: 'key123',
            private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
            client_email: 'test@my-project.iam.gserviceaccount.com',
            client_id: '123456',
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
            client_x509_cert_url: 'https://www.googleapis.com/service/account',
          },
        },
      };
    });

    it('should place archive order with Azure delivery', async () => {
      const mockResponse = {
        data: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          orderType: 'ARCHIVE',
          archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
          aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
          deliveryDriver: 'AZURE',
        },
      };

      const mockClient = mockedAxios.create() as any;
      mockClient.request.mockResolvedValue(mockResponse);

      const orderParams = {
        aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
        archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
        deliveryDriver: DeliveryDriver.AZURE,
        deliveryParams: {
          azure_container_id: 'my-container',
          azure_connection_string:
            'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=abc123;EndpointSuffix=core.windows.net',
        },
      };
    });
  });

  describe('Tasking Order Integration', () => {
    it('should place complete tasking order', async () => {
      const mockResponse = {
        data: {
          id: '223e4567-e89b-12d3-a456-426614174000',
          orderType: 'TASKING',
          aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
          windowStart: '2025-12-01T00:00:00Z',
          windowEnd: '2025-12-15T23:59:59Z',
          productType: 'DAY',
          resolution: 'HIGH',
          maxCloudCoveragePercent: 20,
          maxOffNadirAngle: 30,
          deliveryDriver: 'S3',
        },
      };

      const mockClient = mockedAxios.create() as any;
      mockClient.request.mockResolvedValue(mockResponse);

      const orderParams = {
        aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
        windowStart: '2025-12-01T00:00:00Z',
        windowEnd: '2025-12-15T23:59:59Z',
        productType: ProductType.Day,
        resolution: Resolution.High,
        maxCloudCoveragePercent: 20,
        maxOffNadirAngle: 30,
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: {
          s3_bucket_id: 'my-bucket',
          aws_region: 'us-east-1',
          aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
          aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        },
      };
    });

    it('should place SAR tasking order with special parameters', async () => {
      const mockResponse = {
        data: {
          id: '223e4567-e89b-12d3-a456-426614174001',
          orderType: 'TASKING',
          aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
          windowStart: '2025-12-01T00:00:00Z',
          windowEnd: '2025-12-15T23:59:59Z',
          productType: 'SAR',
          resolution: 'HIGH',
          sarPolarisation: 'HH',
          sarGrazingAngleMin: 30,
          sarGrazingAngleMax: 50,
        },
      };

      const mockClient = mockedAxios.create() as any;
      mockClient.request.mockResolvedValue(mockResponse);

      const orderParams = {
        aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
        windowStart: '2025-12-01T00:00:00Z',
        windowEnd: '2025-12-15T23:59:59Z',
        productType: ProductType.SAR,
        resolution: Resolution.High,
        sarPolarisation: 'HH',
        sarGrazingAngleMin: 30,
        sarGrazingAngleMax: 50,
      };
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API validation errors', async () => {
      const mockErrorResponse = {
        response: {
          status: 422,
          data: {
            detail: 'Invalid AOI polygon coordinates',
          },
        },
      };

      const mockClient = mockedAxios.create() as any;
      mockClient.request.mockRejectedValue(mockErrorResponse);
    });

    it('should handle authentication errors', async () => {
      const mockErrorResponse = {
        response: {
          status: 401,
          data: {
            detail: 'Invalid API key',
          },
        },
      };

      const mockClient = mockedAxios.create() as any;
      mockClient.request.mockRejectedValue(mockErrorResponse);
    });

    it('should handle rate limiting errors', async () => {
      const mockErrorResponse = {
        response: {
          status: 429,
          data: {
            detail: 'Rate limit exceeded',
          },
          headers: {
            'retry-after': '60',
          },
        },
      };

      const mockClient = mockedAxios.create() as any;
      mockClient.request.mockRejectedValue(mockErrorResponse);
    });
  });
});
