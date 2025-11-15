/**
 * Archive Search MCP Tool
 *
 * This module implements the search_satellite_archives MCP tool for searching
 * SkyFi's satellite imagery catalog through the Model Context Protocol.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SkyFiClient } from '../../skyfi/client.js';
import { searchArchives } from '../../skyfi/archives.js';
import { formatArchiveResults } from '../formatters/archive-results.js';
import { ProductType, Resolution, Provider } from '../../types/skyfi-api.js';
import { logger } from '../../lib/logger.js';
import type { ArchiveSearchParams } from '../../types/archives.js';

/**
 * Input schema for search_satellite_archives tool
 *
 * This schema defines and validates the parameters accepted by the tool.
 */
const SearchArchivesInputSchema = z.object({
  aoi: z
    .string()
    .describe(
      'Area of Interest as a WKT (Well-Known Text) polygon. Must be less than 500,000 km². ' +
        'Example: POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28)). ' +
        'You can use https://geojson.io to draw a polygon and copy the WKT format.'
    ),
  fromDate: z
    .string()
    .optional()
    .describe(
      'Start date for image capture in ISO 8601 format (24-hour UTC). ' +
        'Example: 2024-01-01T00:00:00Z or 2024-01-01T00:00:00+00:00'
    ),
  toDate: z
    .string()
    .optional()
    .describe(
      'End date for image capture in ISO 8601 format (24-hour UTC). ' +
        'Example: 2024-12-31T23:59:59Z or 2024-12-31T23:59:59+00:00'
    ),
  productTypes: z
    .array(z.enum(['DAY', 'NIGHT', 'VIDEO', 'MULTISPECTRAL', 'HYPERSPECTRAL', 'SAR', 'STEREO']))
    .optional()
    .describe(
      'Filter by product types. Options: DAY (standard optical), NIGHT (low-light), VIDEO, ' +
        'MULTISPECTRAL (multiple spectral bands), HYPERSPECTRAL, SAR (Synthetic Aperture Radar - weather independent), STEREO (3D imaging)'
    ),
  resolutions: z
    .array(
      z.enum([
        'LOW',
        'MEDIUM',
        'HIGH',
        'VERY HIGH',
        'SUPER HIGH',
        'ULTRA HIGH',
        'CM 30',
        'CM 50',
      ])
    )
    .optional()
    .describe(
      'Filter by resolution categories. Options: LOW, MEDIUM, HIGH, VERY HIGH, SUPER HIGH, ULTRA HIGH, CM 30, CM 50. ' +
        'Higher resolutions provide more detail but may be more expensive.'
    ),
  providers: z
    .array(
      z.enum([
        'SIWEI',
        'SATELLOGIC',
        'UMBRA',
        'TAILWIND',
        'GEOSAT',
        'SENTINEL2',
        'SENTINEL2_CREODIAS',
        'PLANET',
        'IMPRO',
        'URBAN_SKY',
        'NSL',
        'VEXCEL',
        'ICEYE_US',
      ])
    )
    .optional()
    .describe('Filter by satellite providers. Leave empty to search all providers.'),
  maxCloudCoverage: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe(
      'Maximum acceptable cloud coverage percentage (0-100). Lower values return clearer images but may reduce results. ' +
        'Example: 20 for max 20% cloud coverage'
    ),
  maxOffNadirAngle: z
    .number()
    .min(0)
    .max(50)
    .optional()
    .describe(
      'Maximum off-nadir angle in degrees (0-50). Lower angles provide more direct overhead views. ' +
        '0° is directly overhead, higher angles are more oblique.'
    ),
  openDataOnly: z
    .boolean()
    .optional()
    .describe('If true, only return free open data imagery. If false or omitted, include all imagery.'),
  minOverlapRatio: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      'Minimum overlap ratio between image footprint and AOI (0-1). ' +
        'Higher values ensure more complete coverage. Example: 0.8 for 80% overlap'
    ),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Number of results to return per page (1-100). Default is 20.'),
});

/**
 * MCP tool definition for search_satellite_archives
 */
export const searchArchivesToolDefinition = {
  name: 'search_satellite_archives',
  description: `Search SkyFi's satellite imagery archive catalog for existing satellite images.

This tool allows you to search for available satellite imagery based on location, date range,
image quality, resolution, and other criteria. The archive contains historical satellite imagery
from multiple providers that can be ordered and delivered quickly.

Use this tool when you need to:
- Find existing satellite imagery for a specific location
- Compare different satellite images by date, resolution, or provider
- Check availability and pricing before placing an order
- Discover what imagery is available for an area of interest

The tool returns a list of available images with details including:
- Capture date and time
- Resolution and image quality metrics (cloud coverage, off-nadir angle)
- Pricing information (per km² and full scene)
- Provider and satellite constellation
- Delivery time estimates

Common use cases:
1. Historical analysis: "Find all images of this area from the past year"
2. Quality search: "Find the clearest image (low cloud coverage) from last month"
3. Budget planning: "What's the cheapest high-resolution image available?"
4. Quick delivery: "Find recently captured images for fast delivery"`,
  inputSchema: zodToJsonSchema(SearchArchivesInputSchema, {
    name: 'SearchArchivesInput',
    $refStrategy: 'none',
  }),
};

/**
 * Execute the search_satellite_archives tool
 *
 * @param args - Unvalidated input arguments from MCP client
 * @param client - SkyFi API client instance
 * @returns Formatted markdown string with search results
 * @throws {z.ZodError} If input validation fails
 * @throws {ValidationError} If search parameters are invalid
 * @throws {SkyFiAPIError} If API request fails
 */
export async function executeSearchArchives(
  args: unknown,
  client: SkyFiClient
): Promise<string> {
  const correlationId = 'mcp-search-' + Date.now().toString();

  logger.info('Executing search_satellite_archives tool', {
    correlationId,
  });

  try {
    // Validate input using Zod schema
    const validated = SearchArchivesInputSchema.parse(args);

    logger.debug('Input validated', {
      correlationId,
      hasDateRange: !!(validated.fromDate || validated.toDate),
      productTypes: validated.productTypes?.length ?? 0,
      resolutions: validated.resolutions?.length ?? 0,
    });

    // Map MCP input to SkyFi API parameters
    const searchParams: ArchiveSearchParams = {
      aoi: validated.aoi,
      fromDate: validated.fromDate,
      toDate: validated.toDate,
      productTypes: validated.productTypes as ProductType[] | undefined,
      resolutions: validated.resolutions as Resolution[] | undefined,
      providers: validated.providers as Provider[] | undefined,
      maxCloudCoveragePercent: validated.maxCloudCoverage,
      maxOffNadirAngle: validated.maxOffNadirAngle,
      openData: validated.openDataOnly,
      minOverlapRatio: validated.minOverlapRatio,
      pageSize: validated.pageSize,
    };

    // Execute search
    const results = await searchArchives(client, searchParams, { correlationId });

    logger.info('Archive search completed', {
      correlationId,
      resultCount: results.archives.length,
      hasNextPage: !!results.nextPage,
    });

    // Format results for AI consumption
    return formatArchiveResults(results);
  } catch (error) {
    logger.error('Search archives tool execution failed', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Re-throw for MCP error handling
    throw error;
  }
}
