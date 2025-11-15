/**
 * Integration Tests for Archive Search Functionality
 *
 * These tests verify the complete archive search flow with high-fidelity mocked API responses.
 * Tests cover success cases, error scenarios, and edge cases.
 */

import axios from 'axios';
import { SkyFiClient } from '../../src/skyfi/client';
import { createConfigFromEnv } from '../../src/skyfi/config';
import { searchArchives, getArchiveById, getNextArchivesPage } from '../../src/skyfi/archives';
import { ProductType, Resolution, Provider } from '../../src/types/skyfi-api';
import {
  mockArchiveSearchResponse,
  mockArchive,
  mockOpenDataArchive,
  mockEmptyArchiveSearchResponse,
  validWKTPolygon,
  validWKTPolygonLarge,
  mockValidationError,
  mockAuthenticationError,
  mockNotFoundError,
  mockRateLimitError,
  mockServerError,
} from '../fixtures/skyfi-responses';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Archive Search Integration Tests', () => {
  let client: SkyFiClient;
  let mockAxiosInstance: any;

  beforeAll(() => {
    process.env['SKYFI_API_KEY'] = 'test-api-key';
    process.env['SKYFI_BASE_URL'] = 'https://api.test.skyfi.com';
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
    client = new SkyFiClient(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchArchives - Success Cases', () => {
    it('should successfully search archives with complete parameters', async () => {
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
      expect(result.total).toBe(42);
      expect(result.nextPage).toBeDefined();
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/archives',
        expect.objectContaining({
          aoi: validWKTPolygon,
          fromDate: '2025-01-01T00:00:00Z',
          toDate: '2025-01-31T23:59:59Z',
        }),
      );
    });

    it('should search archives with minimal parameters (AOI only)', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockArchiveSearchResponse,
        status: 200,
      });

      const result = await searchArchives(client, {
        aoi: validWKTPolygon,
      });

      expect(result.archives).toHaveLength(1);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/archives',
        expect.objectContaining({
          aoi: validWKTPolygon,
        }),
      );
    });

    it('should search for open data archives only', async () => {
      const openDataResponse = {
        ...mockArchiveSearchResponse,
        archives: [mockOpenDataArchive],
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: openDataResponse,
        status: 200,
      });

      const result = await searchArchives(client, {
        aoi: validWKTPolygon,
        openData: true,
      });

      expect(result.archives).toHaveLength(1);
      expect(result.archives[0].openData).toBe(true);
      expect(result.archives[0].priceForOneSquareKm).toBe(0);
    });

    it('should filter by multiple product types and resolutions', async () => {
      const multiProductResponse = {
        ...mockArchiveSearchResponse,
        archives: [
          mockArchive,
          { ...mockArchive, archiveId: 'archive-2', productType: ProductType.Multispectral },
        ],
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

    it('should handle empty search results', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockEmptyArchiveSearchResponse,
        status: 200,
      });

      const result = await searchArchives(client, {
        aoi: validWKTPolygon,
      });

      expect(result.archives).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should filter by specific providers', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockArchiveSearchResponse,
        status: 200,
      });

      const result = await searchArchives(client, {
        aoi: validWKTPolygon,
        providers: [Provider.Planet, Provider.Maxar],
      });

      expect(result.archives).toBeDefined();
    });
  });

  describe('getArchiveById - Success Cases', () => {
    it('should successfully retrieve archive by ID', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockArchive,
        status: 200,
      });

      const result = await getArchiveById(client, mockArchive.archiveId);

      expect(result.archiveId).toBe(mockArchive.archiveId);
      expect(result.provider).toBe(Provider.Satellogic);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/archives/${mockArchive.archiveId}`);
    });

    it('should retrieve open data archive details', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockOpenDataArchive,
        status: 200,
      });

      const result = await getArchiveById(client, mockOpenDataArchive.archiveId);

      expect(result.openData).toBe(true);
      expect(result.priceForOneSquareKm).toBe(0);
    });
  });

  describe('getNextArchivesPage - Success Cases', () => {
    it('should successfully fetch next page of results', async () => {
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

  describe('Error Scenarios', () => {
    it('should handle 401 authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).response = {
        status: 401,
        data: mockAuthenticationError,
      };
      (authError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(authError);

      await expect(
        searchArchives(client, {
          aoi: validWKTPolygon,
        }),
      ).rejects.toThrow();
    });

    it('should handle 404 not found errors', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as any).response = {
        status: 404,
        data: mockNotFoundError,
      };
      (notFoundError as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(notFoundError);

      await expect(getArchiveById(client, 'non-existent-id')).rejects.toThrow();
    });

    it('should handle 422 validation errors', async () => {
      const validationError = new Error('Validation failed');
      (validationError as any).response = {
        status: 422,
        data: mockValidationError,
      };
      (validationError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(validationError);

      await expect(
        searchArchives(client, {
          aoi: validWKTPolygon,
        }),
      ).rejects.toThrow();
    });

    it('should handle 429 rate limit errors', async () => {
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as any).response = {
        status: 429,
        data: mockRateLimitError,
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

    it('should handle 500 server errors', async () => {
      const serverError = new Error('Server error');
      (serverError as any).response = {
        status: 500,
        data: mockServerError,
      };
      (serverError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(serverError);

      await expect(
        searchArchives(client, {
          aoi: validWKTPolygon,
        }),
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      (networkError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(networkError);

      await expect(
        searchArchives(client, {
          aoi: validWKTPolygon,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle pagination correctly', async () => {
      const page1Response = {
        ...mockArchiveSearchResponse,
        nextPage: 'https://app.skyfi.com/platform-api/archives?page=page2',
      };

      const page2Response = {
        ...mockArchiveSearchResponse,
        archives: [{ ...mockArchive, archiveId: 'different-archive' }],
        nextPage: undefined,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: page1Response,
        status: 200,
      });

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: page2Response,
        status: 200,
      });

      const result1 = await searchArchives(client, { aoi: validWKTPolygon });
      expect(result1.nextPage).toBeDefined();

      const result2 = await getNextArchivesPage(client, result1.nextPage!);
      expect(result2.nextPage).toBeUndefined();
    });

    it('should handle large polygon AOI', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockArchiveSearchResponse,
        status: 200,
      });

      const result = await searchArchives(client, {
        aoi: validWKTPolygonLarge,
      });

      expect(result.archives).toBeDefined();
    });

    it('should handle date range filters correctly', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockArchiveSearchResponse,
        status: 200,
      });

      const result = await searchArchives(client, {
        aoi: validWKTPolygon,
        fromDate: '2024-01-01T00:00:00Z',
        toDate: '2024-12-31T23:59:59Z',
      });

      expect(result.archives).toBeDefined();
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/archives',
        expect.objectContaining({
          fromDate: '2024-01-01T00:00:00Z',
          toDate: '2024-12-31T23:59:59Z',
        }),
      );
    });
  });
});
