/**
 * Unit Tests for Archive Search MCP Tools
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  executeSearchArchives,
  searchArchivesToolDefinition,
} from '../../../src/mcp/tools/search-archives.js';
import {
  executeGetArchive,
  getArchiveToolDefinition,
} from '../../../src/mcp/tools/get-archive.js';
import {
  formatArchiveResults,
  formatArchiveDetails,
} from '../../../src/mcp/formatters/archive-results.js';
import type { ArchiveSearchResponse, Archive } from '../../../src/types/archives.js';
import type { SkyFiClient } from '../../../src/skyfi/client.js';
import { ProductType, Resolution, Provider } from '../../../src/types/skyfi-api.js';

// Mock the archives module
jest.mock('../../../src/skyfi/archives.js', () => ({
  searchArchives: jest.fn(),
  getArchiveById: jest.fn(),
}));

// Mock the logger
jest.mock('../../../src/lib/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { searchArchives, getArchiveById } from '../../../src/skyfi/archives.js';

const mockSearchArchives = searchArchives as jest.MockedFunction<typeof searchArchives>;
const mockGetArchiveById = getArchiveById as jest.MockedFunction<typeof getArchiveById>;

describe('MCP Archive Search Tools', () => {
  let mockClient: SkyFiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {} as SkyFiClient;
  });

  describe('searchArchivesToolDefinition', () => {
    it('should have correct tool name', () => {
      expect(searchArchivesToolDefinition.name).toBe('search_satellite_archives');
    });

    it('should have a description', () => {
      expect(searchArchivesToolDefinition.description).toBeTruthy();
      expect(searchArchivesToolDefinition.description.length).toBeGreaterThan(50);
    });

    it('should have a valid JSON schema', () => {
      expect(searchArchivesToolDefinition.inputSchema).toBeDefined();
      const schema = searchArchivesToolDefinition.inputSchema;
      // zod-to-json-schema creates a schema with definitions
      expect(schema.definitions).toBeDefined();
      expect(schema.definitions.SearchArchivesInput).toBeDefined();
      expect(schema.definitions.SearchArchivesInput.type).toBe('object');
      expect(schema.definitions.SearchArchivesInput.properties).toBeDefined();
      expect(schema.definitions.SearchArchivesInput.properties.aoi).toBeDefined();
    });
  });

  describe('getArchiveToolDefinition', () => {
    it('should have correct tool name', () => {
      expect(getArchiveToolDefinition.name).toBe('get_archive_details');
    });

    it('should have a description', () => {
      expect(getArchiveToolDefinition.description).toBeTruthy();
      expect(getArchiveToolDefinition.description.length).toBeGreaterThan(50);
    });

    it('should have a valid JSON schema', () => {
      expect(getArchiveToolDefinition.inputSchema).toBeDefined();
      const schema = getArchiveToolDefinition.inputSchema;
      // zod-to-json-schema creates a schema with definitions
      expect(schema.definitions).toBeDefined();
      expect(schema.definitions.GetArchiveInput).toBeDefined();
      expect(schema.definitions.GetArchiveInput.type).toBe('object');
      expect(schema.definitions.GetArchiveInput.properties).toBeDefined();
      expect(schema.definitions.GetArchiveInput.properties.archiveId).toBeDefined();
    });
  });

  describe('executeSearchArchives', () => {
    const mockArchive: Archive = {
      archiveId: '354b783d-8fad-4050-a167-2eb069653777',
      provider: Provider.Satellogic,
      constellation: 'Satellogic',
      productType: ProductType.Day,
      platformResolution: 70,
      resolution: Resolution.VeryHigh,
      captureTimestamp: '2024-01-15T12:00:00Z',
      cloudCoveragePercent: 5,
      offNadirAngle: 10,
      footprint: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
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

    const mockResponse: ArchiveSearchResponse = {
      request: {},
      archives: [mockArchive],
      total: 1,
    };

    it('should execute search with valid parameters', async () => {
      mockSearchArchives.mockResolvedValue(mockResponse);

      const input = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        fromDate: '2024-01-01T00:00:00Z',
        toDate: '2024-12-31T23:59:59Z',
      };

      const result = await executeSearchArchives(input, mockClient);

      expect(mockSearchArchives).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          aoi: input.aoi,
          fromDate: input.fromDate,
          toDate: input.toDate,
        }),
        expect.objectContaining({
          correlationId: expect.stringContaining('mcp-search-'),
        })
      );

      expect(result).toContain('Archive Search Results');
      expect(result).toContain('354b783d-8fad-4050-a167-2eb069653777');
    });

    it('should execute search with all optional parameters', async () => {
      mockSearchArchives.mockResolvedValue(mockResponse);

      const input = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        fromDate: '2024-01-01T00:00:00Z',
        toDate: '2024-12-31T23:59:59Z',
        productTypes: ['DAY'],
        resolutions: ['VERY HIGH'],
        providers: ['SATELLOGIC'],
        maxCloudCoverage: 20,
        maxOffNadirAngle: 15,
        openDataOnly: false,
        minOverlapRatio: 0.8,
        pageSize: 50,
      };

      const result = await executeSearchArchives(input, mockClient);

      expect(mockSearchArchives).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          aoi: input.aoi,
          productTypes: ['DAY'],
          resolutions: ['VERY HIGH'],
          providers: ['SATELLOGIC'],
          maxCloudCoveragePercent: 20,
          maxOffNadirAngle: 15,
          openData: false,
          minOverlapRatio: 0.8,
          pageSize: 50,
        }),
        expect.any(Object)
      );

      expect(result).toBeTruthy();
    });

    it('should throw error for invalid input', async () => {
      const input = {
        // Missing required 'aoi' field
        fromDate: '2024-01-01T00:00:00Z',
      };

      await expect(executeSearchArchives(input, mockClient)).rejects.toThrow();
    });

    it('should throw error for invalid date format', async () => {
      const input = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        fromDate: 'invalid-date',
      };

      await expect(executeSearchArchives(input, mockClient)).rejects.toThrow();
    });

    it('should throw error for invalid cloud coverage range', async () => {
      const input = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        maxCloudCoverage: 150, // Invalid: must be 0-100
      };

      await expect(executeSearchArchives(input, mockClient)).rejects.toThrow();
    });

    it('should handle empty results', async () => {
      const emptyResponse: ArchiveSearchResponse = {
        request: {},
        archives: [],
        total: 0,
      };

      mockSearchArchives.mockResolvedValue(emptyResponse);

      const input = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      };

      const result = await executeSearchArchives(input, mockClient);

      expect(result).toContain('No satellite imagery found');
      expect(result).toContain('Suggestions to find imagery');
    });

    it('should handle API errors gracefully', async () => {
      mockSearchArchives.mockRejectedValue(new Error('API Error'));

      const input = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      };

      await expect(executeSearchArchives(input, mockClient)).rejects.toThrow('API Error');
    });
  });

  describe('executeGetArchive', () => {
    const mockArchive: Archive = {
      archiveId: '354b783d-8fad-4050-a167-2eb069653777',
      provider: Provider.Satellogic,
      constellation: 'Satellogic',
      productType: ProductType.Day,
      platformResolution: 70,
      resolution: Resolution.VeryHigh,
      captureTimestamp: '2024-01-15T12:00:00Z',
      cloudCoveragePercent: 5,
      offNadirAngle: 10,
      footprint: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
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

    it('should execute get archive with valid ID', async () => {
      mockGetArchiveById.mockResolvedValue(mockArchive);

      const input = {
        archiveId: '354b783d-8fad-4050-a167-2eb069653777',
      };

      const result = await executeGetArchive(input, mockClient);

      expect(mockGetArchiveById).toHaveBeenCalledWith(
        mockClient,
        input.archiveId,
        expect.objectContaining({
          correlationId: expect.stringContaining('mcp-get-archive-'),
        })
      );

      expect(result).toContain('Archive Details');
      expect(result).toContain('354b783d-8fad-4050-a167-2eb069653777');
      expect(result).toContain('Satellogic');
    });

    it('should throw error for missing archive ID', async () => {
      const input = {};

      await expect(executeGetArchive(input, mockClient)).rejects.toThrow();
    });

    it('should throw error for empty archive ID', async () => {
      const input = {
        archiveId: '',
      };

      await expect(executeGetArchive(input, mockClient)).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      mockGetArchiveById.mockRejectedValue(new Error('Archive not found'));

      const input = {
        archiveId: 'non-existent-id',
      };

      await expect(executeGetArchive(input, mockClient)).rejects.toThrow('Archive not found');
    });
  });

  describe('formatArchiveResults', () => {
    it('should format empty results with suggestions', () => {
      const emptyResponse: ArchiveSearchResponse = {
        request: {},
        archives: [],
      };

      const result = formatArchiveResults(emptyResponse);

      expect(result).toContain('No satellite imagery found');
      expect(result).toContain('Suggestions to find imagery');
      expect(result).toContain('Expand your date range');
    });

    it('should format single result', () => {
      const mockArchive: Archive = {
        archiveId: '354b783d-8fad-4050-a167-2eb069653777',
        provider: Provider.Satellogic,
        constellation: 'Satellogic',
        productType: ProductType.Day,
        platformResolution: 70,
        resolution: Resolution.VeryHigh,
        captureTimestamp: '2024-01-15T12:00:00Z',
        cloudCoveragePercent: 5,
        offNadirAngle: 10,
        footprint: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
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

      const response: ArchiveSearchResponse = {
        request: {},
        archives: [mockArchive],
      };

      const result = formatArchiveResults(response);

      expect(result).toContain('Found **1** satellite image');
      expect(result).toContain('354b783d-8fad-4050-a167-2eb069653777');
      expect(result).toContain('Satellogic');
      expect(result).toContain('$5.00');
      expect(result).toContain('Next Steps');
    });

    it('should format multiple results', () => {
      const mockArchive1: Archive = {
        archiveId: 'archive-1',
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

      const mockArchive2: Archive = {
        ...mockArchive1,
        archiveId: 'archive-2',
        provider: Provider.Planet,
        constellation: 'Planet',
      };

      const response: ArchiveSearchResponse = {
        request: {},
        archives: [mockArchive1, mockArchive2],
      };

      const result = formatArchiveResults(response);

      expect(result).toContain('Found **2** satellite images');
      expect(result).toContain('archive-1');
      expect(result).toContain('archive-2');
    });

    it('should indicate pagination when nextPage exists', () => {
      const mockArchive: Archive = {
        archiveId: '354b783d-8fad-4050-a167-2eb069653777',
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

      const response: ArchiveSearchResponse = {
        request: {},
        archives: [mockArchive],
        nextPage: 'https://api.skyfi.com/archives?page=2',
        total: 100,
      };

      const result = formatArchiveResults(response);

      expect(result).toContain('showing 1 of 100 total');
      expect(result).toContain('More results available');
    });

    it('should format open data indicator', () => {
      const mockArchive: Archive = {
        archiveId: '354b783d-8fad-4050-a167-2eb069653777',
        provider: Provider.Sentinel2,
        constellation: 'Sentinel-2',
        productType: ProductType.Multispectral,
        platformResolution: 1000,
        resolution: Resolution.Medium,
        captureTimestamp: '2024-01-15T12:00:00Z',
        footprint: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
        minSqKm: 1,
        maxSqKm: 100,
        priceForOneSquareKm: 0,
        priceForOneSquareKmCents: 0,
        priceFullScene: 0,
        openData: true,
        totalAreaSquareKm: 50,
        deliveryTimeHours: 1,
        gsd: 10,
      };

      const response: ArchiveSearchResponse = {
        request: {},
        archives: [mockArchive],
      };

      const result = formatArchiveResults(response);

      expect(result).toContain('Open Data');
      expect(result).toContain('Free');
    });
  });

  describe('formatArchiveDetails', () => {
    it('should format archive details with all fields', () => {
      const mockArchive: Archive = {
        archiveId: '354b783d-8fad-4050-a167-2eb069653777',
        provider: Provider.Satellogic,
        constellation: 'Satellogic',
        productType: ProductType.Day,
        platformResolution: 70,
        resolution: Resolution.VeryHigh,
        captureTimestamp: '2024-01-15T12:00:00Z',
        cloudCoveragePercent: 5,
        offNadirAngle: 10,
        footprint: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        minSqKm: 1,
        maxSqKm: 100,
        priceForOneSquareKm: 5.0,
        priceForOneSquareKmCents: 500,
        priceFullScene: 250.0,
        openData: false,
        totalAreaSquareKm: 50,
        deliveryTimeHours: 24,
        thumbnailUrls: {
          small: 'https://example.com/thumb-small.jpg',
          large: 'https://example.com/thumb-large.jpg',
        },
        gsd: 0.7,
        tilesUrl: 'https://tiles.example.com/{z}/{x}/{y}',
      };

      const result = formatArchiveDetails(mockArchive);

      expect(result).toContain('Archive Details');
      expect(result).toContain('354b783d-8fad-4050-a167-2eb069653777');
      expect(result).toContain('Satellogic');
      expect(result).toContain('5.0%');
      expect(result).toContain('10.0°');
      expect(result).toContain('$5.00');
      expect(result).toContain('$250.00');
      expect(result).toContain('Preview Thumbnails');
      expect(result).toContain('Map Tiles');
      expect(result).toContain('How to Order');
    });

    it('should format archive details without optional fields', () => {
      const mockArchive: Archive = {
        archiveId: '354b783d-8fad-4050-a167-2eb069653777',
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

      const result = formatArchiveDetails(mockArchive);

      expect(result).toContain('Archive Details');
      expect(result).toContain('354b783d-8fad-4050-a167-2eb069653777');
      expect(result).not.toContain('Cloud Coverage');
      expect(result).not.toContain('Off-Nadir Angle');
      expect(result).not.toContain('Preview Thumbnails');
    });

    it('should indicate open data archives', () => {
      const mockArchive: Archive = {
        archiveId: 'sentinel-archive',
        provider: Provider.Sentinel2,
        constellation: 'Sentinel-2',
        productType: ProductType.Multispectral,
        platformResolution: 1000,
        resolution: Resolution.Medium,
        captureTimestamp: '2024-01-15T12:00:00Z',
        footprint: 'POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))',
        minSqKm: 1,
        maxSqKm: 100,
        priceForOneSquareKm: 0,
        priceForOneSquareKmCents: 0,
        priceFullScene: 0,
        openData: true,
        totalAreaSquareKm: 50,
        deliveryTimeHours: 1,
        gsd: 10,
      };

      const result = formatArchiveDetails(mockArchive);

      expect(result).toContain('Yes (Free)');
      expect(result).toContain('open data and is free to order');
    });
  });
});
