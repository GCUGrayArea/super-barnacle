/**
 * Integration Tests for Archive Search MCP Tools
 *
 * These tests verify the integration between MCP tools, formatters,
 * and the SkyFi API client (with mocked responses).
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  executeSearchArchives,
  searchArchivesToolDefinition,
} from '../../../src/mcp/tools/search-archives.js';
import {
  executeGetArchive,
  getArchiveToolDefinition,
} from '../../../src/mcp/tools/get-archive.js';
import { SkyFiClient } from '../../../src/skyfi/client.js';
import { ProductType, Resolution, Provider } from '../../../src/types/skyfi-api.js';
import type { ArchiveSearchResponse, Archive } from '../../../src/types/archives.js';

// Mock the HTTP client
jest.mock('../../../src/skyfi/client.js');

// Mock the logger
jest.mock('../../../src/lib/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Archive Search MCP Tools Integration', () => {
  let mockClient: jest.Mocked<SkyFiClient>;

  // Sample archive data for testing
  const sampleArchive1: Archive = {
    archiveId: '354b783d-8fad-4050-a167-2eb069653777',
    provider: Provider.Satellogic,
    constellation: 'Satellogic',
    productType: ProductType.Day,
    platformResolution: 70,
    resolution: Resolution.VeryHigh,
    captureTimestamp: '2024-01-15T12:00:00Z',
    cloudCoveragePercent: 5.2,
    offNadirAngle: 10.5,
    footprint:
      'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
    minSqKm: 1,
    maxSqKm: 100,
    priceForOneSquareKm: 5.0,
    priceForOneSquareKmCents: 500,
    priceFullScene: 250.0,
    openData: false,
    totalAreaSquareKm: 50.5,
    deliveryTimeHours: 24,
    thumbnailUrls: {
      small: 'https://example.com/thumb-small.jpg',
    },
    gsd: 0.7,
    tilesUrl: 'https://tiles.example.com/{z}/{x}/{y}',
  };

  const sampleArchive2: Archive = {
    archiveId: 'abc123-def456-ghi789',
    provider: Provider.Planet,
    constellation: 'PlanetScope',
    productType: ProductType.Multispectral,
    platformResolution: 300,
    resolution: Resolution.High,
    captureTimestamp: '2024-02-20T14:30:00Z',
    cloudCoveragePercent: 15.0,
    offNadirAngle: 5.0,
    footprint:
      'POLYGON((-97.73 30.27, -97.73 30.30, -97.70 30.30, -97.70 30.27, -97.73 30.27))',
    minSqKm: 5,
    maxSqKm: 500,
    priceForOneSquareKm: 3.5,
    priceForOneSquareKmCents: 350,
    priceFullScene: 175.0,
    openData: false,
    totalAreaSquareKm: 75.0,
    deliveryTimeHours: 48,
    gsd: 3.0,
  };

  const openDataArchive: Archive = {
    archiveId: 'sentinel-12345',
    provider: Provider.Sentinel2,
    constellation: 'Sentinel-2',
    productType: ProductType.Multispectral,
    platformResolution: 1000,
    resolution: Resolution.Medium,
    captureTimestamp: '2024-03-01T10:00:00Z',
    cloudCoveragePercent: 25.0,
    footprint:
      'POLYGON((-97.75 30.25, -97.75 30.35, -97.65 30.35, -97.65 30.25, -97.75 30.25))',
    minSqKm: 1,
    maxSqKm: 1000,
    priceForOneSquareKm: 0,
    priceForOneSquareKmCents: 0,
    priceFullScene: 0,
    openData: true,
    totalAreaSquareKm: 200.0,
    deliveryTimeHours: 1,
    gsd: 10.0,
  };

  beforeEach(() => {
    // Create a fresh mock client for each test
    mockClient = {
      post: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('search_satellite_archives integration', () => {
    it('should search archives and format results correctly', async () => {
      const mockResponse: ArchiveSearchResponse = {
        request: {
          aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
          fromDate: '2024-01-01T00:00:00Z',
          toDate: '2024-12-31T23:59:59Z',
        },
        archives: [sampleArchive1, sampleArchive2],
        total: 2,
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const input = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        fromDate: '2024-01-01T00:00:00Z',
        toDate: '2024-12-31T23:59:59Z',
      };

      const result = await executeSearchArchives(input, mockClient);

      // Verify API was called
      expect(mockClient.post).toHaveBeenCalledWith(
        '/archives',
        expect.objectContaining({
          aoi: input.aoi,
          fromDate: input.fromDate,
          toDate: input.toDate,
        })
      );

      // Verify formatted output
      expect(result).toContain('Found **2** satellite images');
      expect(result).toContain('354b783d-8fad-4050-a167-2eb069653777');
      expect(result).toContain('abc123-def456-ghi789');
      expect(result).toContain('Satellogic');
      expect(result).toContain('Planet');
      expect(result).toContain('$5.00');
      expect(result).toContain('$3.50');
      expect(result).toContain('Next Steps');
      expect(result).toContain('order_archive_imagery');
    });

    it('should handle search with filters', async () => {
      const mockResponse: ArchiveSearchResponse = {
        request: {},
        archives: [sampleArchive1],
        total: 1,
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const input = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        productTypes: ['DAY'],
        resolutions: ['VERY HIGH'],
        maxCloudCoverage: 10,
        maxOffNadirAngle: 15,
      };

      const result = await executeSearchArchives(input, mockClient);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/archives',
        expect.objectContaining({
          productTypes: ['DAY'],
          resolutions: ['VERY HIGH'],
          maxCloudCoveragePercent: 10,
          maxOffNadirAngle: 15,
        })
      );

      expect(result).toContain('Found **1** satellite image');
      expect(result).toContain('5.2%'); // Cloud coverage
      expect(result).toContain('10.5°'); // Off-nadir angle
    });

    it('should handle open data search', async () => {
      const mockResponse: ArchiveSearchResponse = {
        request: {},
        archives: [openDataArchive],
        total: 1,
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const input = {
        aoi: 'POLYGON((-97.75 30.25, -97.75 30.35, -97.65 30.35, -97.65 30.25, -97.75 30.25))',
        openDataOnly: true,
      };

      const result = await executeSearchArchives(input, mockClient);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/archives',
        expect.objectContaining({
          openData: true,
        })
      );

      expect(result).toContain('sentinel-12345');
      expect(result).toContain('Open Data');
      expect(result).toContain('Free');
    });

    it('should handle pagination', async () => {
      const archives = Array.from({ length: 20 }, (_, i) => ({
        ...sampleArchive1,
        archiveId: `archive-${i}`,
      }));

      const mockResponse: ArchiveSearchResponse = {
        request: {},
        archives,
        nextPage: 'https://api.skyfi.com/archives?page=2',
        total: 100,
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const input = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        pageSize: 20,
      };

      const result = await executeSearchArchives(input, mockClient);

      expect(result).toContain('showing 20 of 100 total');
      expect(result).toContain('More results available');
    });

    it('should handle empty results with helpful message', async () => {
      const mockResponse: ArchiveSearchResponse = {
        request: {},
        archives: [],
        total: 0,
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const input = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        maxCloudCoverage: 1, // Very restrictive
      };

      const result = await executeSearchArchives(input, mockClient);

      expect(result).toContain('No satellite imagery found');
      expect(result).toContain('Suggestions to find imagery');
      expect(result).toContain('Expand your date range');
      expect(result).toContain('Reduce filters');
    });

    it('should handle multi-provider search', async () => {
      const mockResponse: ArchiveSearchResponse = {
        request: {},
        archives: [sampleArchive1, sampleArchive2],
        total: 2,
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const input = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        providers: ['SATELLOGIC', 'PLANET'],
      };

      const result = await executeSearchArchives(input, mockClient);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/archives',
        expect.objectContaining({
          providers: ['SATELLOGIC', 'PLANET'],
        })
      );

      expect(result).toContain('Satellogic');
      expect(result).toContain('Planet');
    });
  });

  describe('get_archive_details integration', () => {
    it('should get archive details and format correctly', async () => {
      mockClient.get.mockResolvedValue(sampleArchive1);

      const input = {
        archiveId: '354b783d-8fad-4050-a167-2eb069653777',
      };

      const result = await executeGetArchive(input, mockClient);

      expect(mockClient.get).toHaveBeenCalledWith(
        '/archives/354b783d-8fad-4050-a167-2eb069653777'
      );

      expect(result).toContain('Archive Details');
      expect(result).toContain('354b783d-8fad-4050-a167-2eb069653777');
      expect(result).toContain('Basic Information');
      expect(result).toContain('Satellogic');
      expect(result).toContain('DAY');
      expect(result).toContain('VERY HIGH');
      expect(result).toContain('Coverage');
      expect(result).toContain('50.50 km²');
      expect(result).toContain('Pricing');
      expect(result).toContain('$5.00');
      expect(result).toContain('$250.00');
      expect(result).toContain('Delivery');
      expect(result).toContain('24 hours');
      expect(result).toContain('Preview Thumbnails');
      expect(result).toContain('Map Tiles');
      expect(result).toContain('How to Order');
    });

    it('should get open data archive details', async () => {
      mockClient.get.mockResolvedValue(openDataArchive);

      const input = {
        archiveId: 'sentinel-12345',
      };

      const result = await executeGetArchive(input, mockClient);

      expect(result).toContain('sentinel-12345');
      expect(result).toContain('Yes (Free)');
      expect(result).toContain('open data and is free to order');
      expect(result).toContain('$0.00');
    });

    it('should handle archive without optional fields', async () => {
      const minimalArchive: Archive = {
        archiveId: 'minimal-archive',
        provider: Provider.Satellogic,
        constellation: 'Satellogic',
        productType: ProductType.Day,
        platformResolution: 70,
        resolution: Resolution.VeryHigh,
        captureTimestamp: '2024-01-15T12:00:00Z',
        footprint: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
        minSqKm: 1,
        maxSqKm: 100,
        priceForOneSquareKm: 5.0,
        priceForOneSquareKmCents: 500,
        priceFullScene: 250.0,
        openData: false,
        totalAreaSquareKm: 50,
        deliveryTimeHours: 24,
        gsd: 0.7,
      };

      mockClient.get.mockResolvedValue(minimalArchive);

      const input = {
        archiveId: 'minimal-archive',
      };

      const result = await executeGetArchive(input, mockClient);

      expect(result).toContain('minimal-archive');
      expect(result).toContain('Basic Information');
      expect(result).toContain('Pricing');
      // Should not contain optional fields
      expect(result).not.toContain('Cloud Coverage');
      expect(result).not.toContain('Off-Nadir Angle');
      expect(result).not.toContain('Preview Thumbnails');
      expect(result).not.toContain('Map Tiles');
    });
  });

  describe('tool definitions', () => {
    it('should have valid search tool schema', () => {
      const schema = searchArchivesToolDefinition.inputSchema;

      expect(schema.definitions).toBeDefined();
      expect(schema.definitions.SearchArchivesInput).toBeDefined();
      const inputSchema = schema.definitions.SearchArchivesInput;
      expect(inputSchema.type).toBe('object');
      expect(inputSchema.properties).toBeDefined();
      expect(inputSchema.required).toContain('aoi');
      expect(inputSchema.properties.aoi).toBeDefined();
      expect(inputSchema.properties.fromDate).toBeDefined();
      expect(inputSchema.properties.toDate).toBeDefined();
      expect(inputSchema.properties.productTypes).toBeDefined();
      expect(inputSchema.properties.resolutions).toBeDefined();
      expect(inputSchema.properties.maxCloudCoverage).toBeDefined();
    });

    it('should have valid get archive tool schema', () => {
      const schema = getArchiveToolDefinition.inputSchema;

      expect(schema.definitions).toBeDefined();
      expect(schema.definitions.GetArchiveInput).toBeDefined();
      const inputSchema = schema.definitions.GetArchiveInput;
      expect(inputSchema.type).toBe('object');
      expect(inputSchema.properties).toBeDefined();
      expect(inputSchema.required).toContain('archiveId');
      expect(inputSchema.properties.archiveId).toBeDefined();
    });

    it('should have descriptive tool names', () => {
      expect(searchArchivesToolDefinition.name).toBe('search_satellite_archives');
      expect(getArchiveToolDefinition.name).toBe('get_archive_details');
    });

    it('should have comprehensive tool descriptions', () => {
      expect(searchArchivesToolDefinition.description.length).toBeGreaterThan(100);
      expect(getArchiveToolDefinition.description.length).toBeGreaterThan(100);

      expect(searchArchivesToolDefinition.description).toContain('search');
      expect(searchArchivesToolDefinition.description).toContain('archive');
      expect(getArchiveToolDefinition.description).toContain('details');
    });
  });

  describe('error handling integration', () => {
    it('should propagate API errors from search', async () => {
      const apiError = new Error('API rate limit exceeded');
      mockClient.post.mockRejectedValue(apiError);

      const input = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      };

      await expect(executeSearchArchives(input, mockClient)).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('should propagate API errors from get archive', async () => {
      const apiError = new Error('Archive not found');
      mockClient.get.mockRejectedValue(apiError);

      const input = {
        archiveId: 'non-existent',
      };

      await expect(executeGetArchive(input, mockClient)).rejects.toThrow('Archive not found');
    });

    it('should validate input before making API calls', async () => {
      const input = {
        // Missing required 'aoi' field
        fromDate: '2024-01-01T00:00:00Z',
      };

      await expect(executeSearchArchives(input, mockClient)).rejects.toThrow();

      // API should not be called if validation fails
      expect(mockClient.post).not.toHaveBeenCalled();
    });
  });
});
