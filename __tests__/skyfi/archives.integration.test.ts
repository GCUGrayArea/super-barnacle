/**
 * Integration Tests for Archive Search Functionality
 *
 * These tests verify the archive search functionality with mocked API responses
 * simulating realistic API interactions.
 */

import axios from 'axios';
import { SkyFiClient } from '../../src/skyfi/client';
import { createConfigFromEnv } from '../../src/skyfi/config';
import { searchArchives, getArchiveById, getNextArchivesPage } from '../../src/skyfi/archives';
import { ProductType, Resolution, Provider } from '../../src/types/skyfi-api';
import { AuthenticationError, RateLimitError, NotFoundError } from '../../src/lib/errors';
import {
  mockArchive,
  mockArchiveSearchResponse,
  validWKTPolygon,
} from '../fixtures/archive-responses';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Archive Search Integration Tests', () => {
  let client: SkyFiClient;
  let mockAxiosInstance: any;

  beforeAll(() => {
    // Set up environment for testing
    process.env['SKYFI_API_KEY'] = 'test-api-key';
    process.env['SKYFI_BASE_URL'] = 'https://api.test.skyfi.com';
  });

  beforeEach(() => {
    // Create mock axios instance
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

    // Mock axios.create to return our mock instance
    mockedAxios.create = jest.fn(() => mockAxiosInstance) as unknown as typeof axios.create;

    const config = createConfigFromEnv();
    client = new SkyFiClient(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchArchives - API Integration', () => {
    it('should successfully search archives with full API flow', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockArchiveSearchResponse,
        status: 200,
      });

      const result = await searchArchives(client, {
        aoi: validWKTPolygon,
        fromDate: '2025-01-01T00:00:00Z',
        toDate: '2025-01-31T23:59:59Z',
        productTypes: [ProductType.Day],
        resolutions: [Resolution.VeryHigh],
        maxCloudCoveragePercent: 20,
      });

      expect(result.archives).toHaveLength(1);
      expect(result.nextPage).toBeDefined();
    });

    it('should handle 401 authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).response = {
        status: 401,
        data: { message: 'Invalid API key' },
      };
      (authError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(authError);

      await expect(
        searchArchives(client, {
          aoi: validWKTPolygon,
        }),
      ).rejects.toThrow();
    });

    it('should handle 429 rate limit errors with retry', async () => {
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as any).response = {
        status: 429,
        data: { message: 'Too many requests' },
        headers: { 'retry-after': '60' },
      };
      (rateLimitError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(rateLimitError);

      await expect(
        searchArchives(client, {
          aoi: validWKTPolygon,
        }),
      ).rejects.toThrow();
    });

    it('should handle 422 validation errors', async () => {
      const validationError = new Error('Validation failed');
      (validationError as any).response = {
        status: 422,
        data: {
          message: 'Invalid parameters',
          detail: [{ loc: ['aoi'], msg: 'Invalid WKT', type: 'value_error' }],
        },
      };
      (validationError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(validationError);

      await expect(
        searchArchives(client, {
          aoi: validWKTPolygon,
        }),
      ).rejects.toThrow();
    });
  });

  describe('getArchiveById - API Integration', () => {
    it('should successfully fetch archive by ID', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockArchive,
        status: 200,
      });

      const result = await getArchiveById(client, mockArchive.archiveId);

      expect(result.archiveId).toBe(mockArchive.archiveId);
      expect(result.provider).toBe(Provider.Satellogic);
    });

    it('should handle 404 not found errors', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as any).response = {
        status: 404,
        data: { message: 'Archive not found' },
      };
      (notFoundError as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(notFoundError);

      await expect(getArchiveById(client, 'non-existent-id')).rejects.toThrow();
    });
  });

  describe('getNextArchivesPage - API Integration', () => {
    it('should successfully fetch next page', async () => {
      const nextPageResponse = {
        ...mockArchiveSearchResponse,
        nextPage: undefined,
      };
      mockAxiosInstance.get.mockResolvedValue({
        data: nextPageResponse,
        status: 200,
      });

      const result = await getNextArchivesPage(
        client,
        'https://app.skyfi.com/platform-api/archives?page=abc123',
      );

      expect(result.archives).toHaveLength(1);
      expect(result.nextPage).toBeUndefined();
    });
  });

  describe('Complex Archive Search Scenarios', () => {
    it('should search with multiple product types and resolutions', async () => {
      const multiProductResponse = {
        request: {},
        archives: [
          { ...mockArchive, productType: ProductType.Day },
          { ...mockArchive, archiveId: 'archive-2', productType: ProductType.Multispectral },
        ],
        total: 2,
      };
      mockAxiosInstance.post.mockResolvedValue({
        data: multiProductResponse,
        status: 200,
      });

      const result = await searchArchives(client, {
        aoi: validWKTPolygon,
        productTypes: [ProductType.Day, ProductType.Multispectral],
        resolutions: [Resolution.VeryHigh, Resolution.High],
      });

      expect(result.archives.length).toBeGreaterThan(0);
    });

    it('should filter by cloud coverage and off-nadir angle', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockArchiveSearchResponse,
        status: 200,
      });

      const result = await searchArchives(client, {
        aoi: validWKTPolygon,
        maxCloudCoveragePercent: 10,
        maxOffNadirAngle: 15,
      });

      expect(result.archives[0].cloudCoveragePercent).toBeLessThanOrEqual(10);
      expect(result.archives[0].offNadirAngle).toBeLessThanOrEqual(15);
    });

    it('should filter for open data only', async () => {
      const openDataResponse = {
        ...mockArchiveSearchResponse,
        archives: [{ ...mockArchive, openData: true }],
      };
      mockAxiosInstance.post.mockResolvedValue({
        data: openDataResponse,
        status: 200,
      });

      const result = await searchArchives(client, {
        aoi: validWKTPolygon,
        openData: true,
      });

      expect(result.archives.every((a) => a.openData)).toBe(true);
    });
  });
});
