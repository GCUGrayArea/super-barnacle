/**
 * Unit Tests for Archive Search Functionality
 */

import { searchArchives, getArchiveById, getNextArchivesPage } from '../../src/skyfi/archives';
import { SkyFiClient } from '../../src/skyfi/client';
import { ValidationError, NotFoundError } from '../../src/lib/errors';
import { ProductType, Resolution } from '../../src/types/skyfi-api';
import {
  mockArchive,
  mockArchiveSearchResponse,
  mockEmptySearchResponse,
  validWKTPolygon,
  invalidWKTPolygon,
  tooLargeWKTPolygon,
} from '../fixtures/archive-responses';

// Mock the SkyFiClient
jest.mock('../../src/skyfi/client');

describe('searchArchives', () => {
  let mockClient: jest.Mocked<SkyFiClient>;

  beforeEach(() => {
    mockClient = {
      post: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return archive results for valid parameters', async () => {
    mockClient.post.mockResolvedValue(mockArchiveSearchResponse);

    const result = await searchArchives(mockClient, {
      aoi: validWKTPolygon,
      fromDate: '2025-01-01T00:00:00Z',
      toDate: '2025-01-31T23:59:59Z',
      productTypes: [ProductType.Day],
      resolutions: [Resolution.VeryHigh],
      maxCloudCoveragePercent: 20,
    });

    expect(result).toEqual(mockArchiveSearchResponse);
    expect(result.archives).toHaveLength(1);
    expect(result.archives[0].archiveId).toBe(mockArchive.archiveId);
    expect(mockClient.post).toHaveBeenCalledWith('/archives', expect.any(Object));
  });

  it('should handle empty search results', async () => {
    mockClient.post.mockResolvedValue(mockEmptySearchResponse);

    const result = await searchArchives(mockClient, {
      aoi: validWKTPolygon,
    });

    expect(result.archives).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should throw ValidationError for invalid WKT polygon', async () => {
    await expect(
      searchArchives(mockClient, {
        aoi: invalidWKTPolygon,
      }),
    ).rejects.toThrow(ValidationError);

    expect(mockClient.post).not.toHaveBeenCalled();
  });

  it('should throw ValidationError for polygon exceeding max area', async () => {
    await expect(
      searchArchives(mockClient, {
        aoi: tooLargeWKTPolygon,
      }),
    ).rejects.toThrow(ValidationError);

    expect(mockClient.post).not.toHaveBeenCalled();
  });

  it('should throw ValidationError for invalid date range', async () => {
    await expect(
      searchArchives(mockClient, {
        aoi: validWKTPolygon,
        fromDate: '2025-01-31T23:59:59Z',
        toDate: '2025-01-01T00:00:00Z',
      }),
    ).rejects.toThrow(ValidationError);

    expect(mockClient.post).not.toHaveBeenCalled();
  });

  it('should throw ValidationError for invalid cloud coverage percentage', async () => {
    await expect(
      searchArchives(mockClient, {
        aoi: validWKTPolygon,
        maxCloudCoveragePercent: 150,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid off-nadir angle', async () => {
    await expect(
      searchArchives(mockClient, {
        aoi: validWKTPolygon,
        maxOffNadirAngle: 100,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid page size', async () => {
    await expect(
      searchArchives(mockClient, {
        aoi: validWKTPolygon,
        pageSize: 200,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should accept valid optional parameters', async () => {
    mockClient.post.mockResolvedValue(mockArchiveSearchResponse);

    await searchArchives(mockClient, {
      aoi: validWKTPolygon,
      maxCloudCoveragePercent: 50,
      maxOffNadirAngle: 30,
      minOverlapRatio: 0.5,
      pageSize: 50,
      openData: true,
    });

    expect(mockClient.post).toHaveBeenCalledWith(
      '/archives',
      expect.objectContaining({
        aoi: validWKTPolygon,
        maxCloudCoveragePercent: 50,
        maxOffNadirAngle: 30,
        minOverlapRatio: 0.5,
        pageSize: 50,
        openData: true,
      }),
    );
  });
});

describe('getNextArchivesPage', () => {
  let mockClient: jest.Mocked<SkyFiClient>;

  beforeEach(() => {
    mockClient = {
      post: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch next page using nextPageUrl', async () => {
    const nextPageResponse = {
      ...mockArchiveSearchResponse,
      nextPage: undefined,
    };
    mockClient.get.mockResolvedValue(nextPageResponse);

    const result = await getNextArchivesPage(
      mockClient,
      'https://app.skyfi.com/platform-api/archives?page=abc123',
    );

    expect(result).toEqual(nextPageResponse);
    expect(mockClient.get).toHaveBeenCalledWith('/archives', {
      params: { page: 'abc123' },
    });
  });

  it('should throw ValidationError for empty nextPageUrl', async () => {
    await expect(getNextArchivesPage(mockClient, '')).rejects.toThrow(ValidationError);

    expect(mockClient.get).not.toHaveBeenCalled();
  });

  it('should throw ValidationError for invalid nextPageUrl format', async () => {
    await expect(
      getNextArchivesPage(mockClient, 'https://app.skyfi.com/platform-api/archives'),
    ).rejects.toThrow(ValidationError);

    expect(mockClient.get).not.toHaveBeenCalled();
  });
});

describe('getArchiveById', () => {
  let mockClient: jest.Mocked<SkyFiClient>;

  beforeEach(() => {
    mockClient = {
      post: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return archive details for valid ID', async () => {
    mockClient.get.mockResolvedValue(mockArchive);

    const result = await getArchiveById(mockClient, mockArchive.archiveId);

    expect(result).toEqual(mockArchive);
    expect(result.archiveId).toBe(mockArchive.archiveId);
    expect(mockClient.get).toHaveBeenCalledWith('/archives/' + mockArchive.archiveId);
  });

  it('should throw ValidationError for empty archive ID', async () => {
    await expect(getArchiveById(mockClient, '')).rejects.toThrow(ValidationError);

    expect(mockClient.get).not.toHaveBeenCalled();
  });

  it('should throw ValidationError for whitespace-only archive ID', async () => {
    await expect(getArchiveById(mockClient, '   ')).rejects.toThrow(ValidationError);

    expect(mockClient.get).not.toHaveBeenCalled();
  });

  it('should propagate NotFoundError from API', async () => {
    mockClient.get.mockRejectedValue(
      new NotFoundError('Archive not found', 'archive', 'invalid-id'),
    );

    await expect(getArchiveById(mockClient, 'invalid-id')).rejects.toThrow(NotFoundError);
  });

  it('should validate response schema', async () => {
    const invalidArchive = {
      archiveId: mockArchive.archiveId,
      // Missing required fields
    };

    mockClient.get.mockResolvedValue(invalidArchive);

    await expect(getArchiveById(mockClient, mockArchive.archiveId)).rejects.toThrow(
      ValidationError,
    );
  });
});
