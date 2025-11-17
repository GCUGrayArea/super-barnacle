/**
 * Unit tests for order placement methods
 */

import { placeArchiveOrder, placeTaskingOrder } from '@/skyfi/orders';
import { SkyFiClient } from '@/skyfi/client';
import { DeliveryDriver, ProductType, Resolution } from '@/types/orders';
import { ValidationError } from '@/lib/errors';

// Mock the SkyFi client
jest.mock('@/skyfi/client');
jest.mock('@/lib/logger');

describe('placeArchiveOrder', () => {
  let mockClient: jest.Mocked<SkyFiClient>;

  beforeEach(() => {
    mockClient = {
      post: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully place an archive order with valid S3 delivery', async () => {
    const mockResponse = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      orderType: 'ARCHIVE',
      archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      deliveryDriver: DeliveryDriver.S3,
    };

    mockClient.post.mockResolvedValue(mockResponse);

    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
      deliveryDriver: DeliveryDriver.S3,
      deliveryParams: {
        s3_bucket_id: 'my-bucket',
        aws_region: 'us-east-1',
        aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
        aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      },
    };

    const result = await placeArchiveOrder(mockClient, params);

    expect(result).toEqual(mockResponse);
    expect(mockClient.post).toHaveBeenCalledWith('/order-archive', params);
  });

  it('should successfully place an archive order without delivery', async () => {
    const mockResponse = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      orderType: 'ARCHIVE',
      archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
    };

    mockClient.post.mockResolvedValue(mockResponse);

    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
    };

    const result = await placeArchiveOrder(mockClient, params);

    expect(result).toEqual(mockResponse);
    expect(mockClient.post).toHaveBeenCalledWith('/order-archive', params);
  });

  it('should reject invalid archive ID format', async () => {
    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      archiveId: 'not-a-uuid',
    };

    await expect(placeArchiveOrder(mockClient, params)).rejects.toThrow(ValidationError);
    expect(mockClient.post).not.toHaveBeenCalled();
  });

  it('should reject invalid AOI format', async () => {
    const params = {
      aoi: 'INVALID AOI FORMAT',
      archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
    };

    await expect(placeArchiveOrder(mockClient, params)).rejects.toThrow(ValidationError);
    expect(mockClient.post).not.toHaveBeenCalled();
  });

  it('should validate webhook URL when provided', async () => {
    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
      webhookUrl: 'http://insecure-url.com/webhook',
    };

    await expect(placeArchiveOrder(mockClient, params)).rejects.toThrow();
    expect(mockClient.post).not.toHaveBeenCalled();
  });

  it('should accept valid HTTPS webhook URL', async () => {
    const mockResponse = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      orderType: 'ARCHIVE',
      archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      webhookUrl: 'https://secure-url.com/webhook',
    };

    mockClient.post.mockResolvedValue(mockResponse);

    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
      webhookUrl: 'https://secure-url.com/webhook',
    };

    const result = await placeArchiveOrder(mockClient, params);
    expect(result).toEqual(mockResponse);
  });

  it('should include metadata in request', async () => {
    const mockResponse = {
      id: '123e4567-e89b-12d3-a456-426614174003',
      orderType: 'ARCHIVE',
      archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      metadata: { project: 'test-project', user: 'test-user' },
    };

    mockClient.post.mockResolvedValue(mockResponse);

    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      archiveId: 'a66f7b5e-215f-44af-981a-500d89ee3f43',
      metadata: { project: 'test-project', user: 'test-user' },
    };

    const result = await placeArchiveOrder(params, mockClient);
    expect(result.metadata).toEqual(params.metadata);
  });
});

describe('placeTaskingOrder', () => {
  let mockClient: jest.Mocked<SkyFiClient>;

  beforeEach(() => {
    mockClient = {
      post: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully place a tasking order with valid parameters', async () => {
    const mockResponse = {
      id: '223e4567-e89b-12d3-a456-426614174000',
      orderType: 'TASKING',
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      windowStart: '2025-12-01T00:00:00Z',
      windowEnd: '2025-12-15T23:59:59Z',
      productType: ProductType.Day,
      resolution: Resolution.High,
      deliveryDriver: DeliveryDriver.S3,
    };

    mockClient.post.mockResolvedValue(mockResponse);

    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      windowStart: '2025-12-01T00:00:00Z',
      windowEnd: '2025-12-15T23:59:59Z',
      productType: ProductType.Day,
      resolution: Resolution.High,
      deliveryDriver: DeliveryDriver.S3,
      deliveryParams: {
        s3_bucket_id: 'my-bucket',
        aws_region: 'us-east-1',
        aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
        aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      },
    };

    const result = await placeTaskingOrder(mockClient, params);

    expect(result).toEqual(mockResponse);
    expect(mockClient.post).toHaveBeenCalledWith('/order-tasking', params);
  });

  it('should reject tasking order with window start after window end', async () => {
    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      windowStart: '2025-12-15T00:00:00Z',
      windowEnd: '2025-12-01T23:59:59Z',
      productType: ProductType.Day,
      resolution: Resolution.High,
    };

    await expect(placeTaskingOrder(mockClient, params)).rejects.toThrow(ValidationError);
    expect(mockClient.post).not.toHaveBeenCalled();
  });

  it('should reject tasking order with invalid datetime format', async () => {
    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      windowStart: 'not-a-date',
      windowEnd: '2025-12-15T23:59:59Z',
      productType: ProductType.Day,
      resolution: Resolution.High,
    };

    await expect(placeTaskingOrder(mockClient, params)).rejects.toThrow(ValidationError);
    expect(mockClient.post).not.toHaveBeenCalled();
  });

  it('should accept tasking order with cloud coverage and off-nadir constraints', async () => {
    const mockResponse = {
      id: '223e4567-e89b-12d3-a456-426614174001',
      orderType: 'TASKING',
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      windowStart: '2025-12-01T00:00:00Z',
      windowEnd: '2025-12-15T23:59:59Z',
      productType: ProductType.Day,
      resolution: Resolution.High,
      maxCloudCoveragePercent: 20,
      maxOffNadirAngle: 30,
    };

    mockClient.post.mockResolvedValue(mockResponse);

    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      windowStart: '2025-12-01T00:00:00Z',
      windowEnd: '2025-12-15T23:59:59Z',
      productType: ProductType.Day,
      resolution: Resolution.High,
      maxCloudCoveragePercent: 20,
      maxOffNadirAngle: 30,
    };

    const result = await placeTaskingOrder(mockClient, params);
    expect(result).toEqual(mockResponse);
  });

  it('should reject invalid cloud coverage percentage', async () => {
    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      windowStart: '2025-12-01T00:00:00Z',
      windowEnd: '2025-12-15T23:59:59Z',
      productType: ProductType.Day,
      resolution: Resolution.High,
      maxCloudCoveragePercent: 150,
    };

    await expect(placeTaskingOrder(mockClient, params)).rejects.toThrow(ValidationError);
    expect(mockClient.post).not.toHaveBeenCalled();
  });

  it('should reject invalid off-nadir angle', async () => {
    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      windowStart: '2025-12-01T00:00:00Z',
      windowEnd: '2025-12-15T23:59:59Z',
      productType: ProductType.Day,
      resolution: Resolution.High,
      maxOffNadirAngle: 60,
    };

    await expect(placeTaskingOrder(mockClient, params)).rejects.toThrow(ValidationError);
    expect(mockClient.post).not.toHaveBeenCalled();
  });

  it('should accept tasking order with provider window ID', async () => {
    const mockResponse = {
      id: '223e4567-e89b-12d3-a456-426614174002',
      orderType: 'TASKING',
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      windowStart: '2025-12-01T00:00:00Z',
      windowEnd: '2025-12-15T23:59:59Z',
      productType: ProductType.Day,
      resolution: Resolution.High,
      providerWindowId: '323e4567-e89b-12d3-a456-426614174003',
    };

    mockClient.post.mockResolvedValue(mockResponse);

    const params = {
      aoi: 'POLYGON((-97.74 30.27, -97.74 30.29, -97.72 30.29, -97.72 30.27, -97.74 30.27))',
      windowStart: '2025-12-01T00:00:00Z',
      windowEnd: '2025-12-15T23:59:59Z',
      productType: ProductType.Day,
      resolution: Resolution.High,
      providerWindowId: '323e4567-e89b-12d3-a456-426614174003',
    };

    const result = await placeTaskingOrder(mockClient, params);
    expect(result).toEqual(mockResponse);
  });
});
