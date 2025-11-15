/**
 * Get Archive Details MCP Tool
 *
 * This module implements the get_archive_details MCP tool for retrieving
 * detailed information about a specific archive image by ID.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SkyFiClient } from '../../skyfi/client.js';
import { getArchiveById } from '../../skyfi/archives.js';
import { formatArchiveDetails } from '../formatters/archive-results.js';
import { logger } from '../../lib/logger.js';

/**
 * Input schema for get_archive_details tool
 *
 * This schema defines and validates the parameters accepted by the tool.
 */
const GetArchiveInputSchema = z.object({
  archiveId: z
    .string()
    .min(1)
    .describe(
      'Unique archive identifier (UUID). This ID is provided in search results. ' +
        'Example: 354b783d-8fad-4050-a167-2eb069653777'
    ),
});

/**
 * MCP tool definition for get_archive_details
 */
export const getArchiveToolDefinition = {
  name: 'get_archive_details',
  description: `Get detailed information about a specific satellite archive image by its ID.

This tool retrieves comprehensive details for a single archive image, including:
- Complete metadata (provider, constellation, product type, resolution)
- Precise capture date and time
- Image quality metrics (cloud coverage, off-nadir angle, GSD)
- Full pricing breakdown (per km², full scene, min/max order sizes)
- Coverage information (total area, footprint geometry)
- Delivery time estimates
- Preview thumbnails and map tiles (if available)
- Instructions on how to order the image

Use this tool when you:
- Need complete details about a specific image from search results
- Want to verify pricing before placing an order
- Need to check the exact footprint or coverage area
- Want to preview thumbnails or view map tiles
- Need technical specifications (GSD, off-nadir angle, etc.)

The archive ID can be obtained from search_satellite_archives results.`,
  inputSchema: zodToJsonSchema(GetArchiveInputSchema, {
    name: 'GetArchiveInput',
    $refStrategy: 'none',
  }),
};

/**
 * Execute the get_archive_details tool
 *
 * @param args - Unvalidated input arguments from MCP client
 * @param client - SkyFi API client instance
 * @returns Formatted markdown string with archive details
 * @throws {z.ZodError} If input validation fails
 * @throws {NotFoundError} If archive is not found
 * @throws {SkyFiAPIError} If API request fails
 */
export async function executeGetArchive(args: unknown, client: SkyFiClient): Promise<string> {
  const correlationId = 'mcp-get-archive-' + Date.now().toString();

  logger.info('Executing get_archive_details tool', {
    correlationId,
  });

  try {
    // Validate input using Zod schema
    const validated = GetArchiveInputSchema.parse(args);

    logger.debug('Input validated', {
      correlationId,
      archiveId: validated.archiveId,
    });

    // Fetch archive details
    const archive = await getArchiveById(client, validated.archiveId, { correlationId });

    logger.info('Archive details retrieved', {
      correlationId,
      archiveId: validated.archiveId,
      provider: archive.provider,
      productType: archive.productType,
    });

    // Format details for AI consumption
    return formatArchiveDetails(archive);
  } catch (error) {
    logger.error('Get archive tool execution failed', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Re-throw for MCP error handling
    throw error;
  }
}
