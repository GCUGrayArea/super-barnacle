/**
 * Archive Search Functionality
 *
 * This module implements archive search methods for querying SkyFi's
 * satellite imagery catalog with comprehensive filtering and validation.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { logger } from '../lib/logger';
import { ValidationError, NotFoundError } from '../lib/errors';
import { SkyFiClient } from './client';
import type {
  ArchiveSearchParams,
  ArchiveSearchResponse,
  Archive,
  ArchiveSearchOptions,
} from '../types/archives';
import {
  ArchiveSearchParamsSchema,
  ArchiveSearchResponseSchema,
  ArchiveSchema,
} from '../schemas/archives.schemas';

/**
 * Search SkyFi's archive catalog for satellite imagery
 *
 * This method queries the SkyFi API to search for available satellite imagery
 * based on Area of Interest (AOI), date range, product type, resolution,
 * cloud coverage, and other filtering criteria.
 *
 * @param client - SkyFi API client instance
 * @param params - Search parameters including AOI, date range, and filters
 * @param options - Optional search options (e.g., correlation ID)
 * @returns Promise resolving to archive search results
 * @throws {ValidationError} If search parameters are invalid
 * @throws {SkyFiAPIError} If API request fails
 *
 * @example
 * const results = await searchArchives(client, {
 *   aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
 *   fromDate: '2025-01-01T00:00:00Z',
 *   toDate: '2025-01-31T23:59:59Z',
 *   productTypes: [ProductType.Day],
 *   maxCloudCoveragePercent: 20,
 *   resolutions: [Resolution.VeryHigh],
 *   pageSize: 20,
 * });
 */
export async function searchArchives(
  client: SkyFiClient,
  params: ArchiveSearchParams,
  options?: ArchiveSearchOptions,
): Promise<ArchiveSearchResponse> {
  const correlationId = options?.correlationId ?? 'archive-search-' + Date.now().toString();
  const startTime = Date.now();

  logger.info('Starting archive search', {
    correlationId,
    aoi: params.aoi.substring(0, 50) + '...',
    fromDate: params.fromDate,
    toDate: params.toDate,
    productTypes: params.productTypes,
    resolutions: params.resolutions,
  });

  try {
    // Validate search parameters
    const validatedParams = ArchiveSearchParamsSchema.parse(params);

    // Make API request
    const response = await client.post<ArchiveSearchResponse>('/archives', validatedParams);

    // Validate response
    const validatedResponse = ArchiveSearchResponseSchema.parse(response);

    const duration = Date.now() - startTime;
    logger.info('Archive search completed', {
      correlationId,
      resultCount: validatedResponse.archives.length,
      hasNextPage: !!validatedResponse.nextPage,
      durationMs: duration,
    });

    return validatedResponse;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      logger.error('Archive search validation failed', {
        correlationId,
        errors: error.errors,
        durationMs: duration,
      });
      throw new ValidationError(
        'Invalid archive search parameters: ' + error.errors.map((e) => e.path.join('.') + ': ' + e.message).join(', '),
        error.errors[0]?.path[0]?.toString(),
      );
    }

    logger.error('Archive search failed', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration,
    });

    throw error;
  }
}

/**
 * Continue paginating through archive search results
 *
 * This method fetches the next page of archive search results using
 * the nextPage URL from a previous search response.
 *
 * @param client - SkyFi API client instance
 * @param nextPageUrl - Next page URL from previous search response
 * @param options - Optional search options (e.g., correlation ID)
 * @returns Promise resolving to archive search results
 * @throws {ValidationError} If nextPageUrl is invalid
 * @throws {SkyFiAPIError} If API request fails
 *
 * @example
 * const firstPage = await searchArchives(client, params);
 * if (firstPage.nextPage) {
 *   const secondPage = await getNextArchivesPage(client, firstPage.nextPage);
 * }
 */
export async function getNextArchivesPage(
  client: SkyFiClient,
  nextPageUrl: string,
  options?: ArchiveSearchOptions,
): Promise<ArchiveSearchResponse> {
  const correlationId = options?.correlationId ?? 'archive-page-' + Date.now().toString();
  const startTime = Date.now();

  logger.info('Fetching next archive page', {
    correlationId,
    nextPageUrl: nextPageUrl.substring(0, 100) + '...',
  });

  try {
    if (!nextPageUrl) {
      throw new ValidationError('nextPageUrl is required');
    }

    // Extract page parameter from URL
    const url = new URL(nextPageUrl, 'https://app.skyfi.com');
    const page = url.searchParams.get('page');

    if (!page) {
      throw new ValidationError('Invalid nextPage URL: missing page parameter');
    }

    // Make API request
    const response = await client.get<ArchiveSearchResponse>('/archives', {
      params: { page },
    });

    // Validate response
    const validatedResponse = ArchiveSearchResponseSchema.parse(response);

    const duration = Date.now() - startTime;
    logger.info('Archive page fetch completed', {
      correlationId,
      resultCount: validatedResponse.archives.length,
      hasNextPage: !!validatedResponse.nextPage,
      durationMs: duration,
    });

    return validatedResponse;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      logger.error('Archive page validation failed', {
        correlationId,
        errors: error.errors,
        durationMs: duration,
      });
      throw new ValidationError(
        'Invalid archive page response: ' + error.errors.map((e) => e.path.join('.') + ': ' + e.message).join(', '),
        error.errors[0]?.path[0]?.toString(),
      );
    }

    logger.error('Archive page fetch failed', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration,
    });

    throw error;
  }
}

/**
 * Get detailed information for a specific archive image by ID
 *
 * This method retrieves complete details for a single archive image,
 * including pricing, footprint, resolution, and metadata.
 *
 * @param client - SkyFi API client instance
 * @param archiveId - Unique archive identifier
 * @param options - Optional search options (e.g., correlation ID)
 * @returns Promise resolving to archive details
 * @throws {NotFoundError} If archive is not found
 * @throws {SkyFiAPIError} If API request fails
 *
 * @example
 * const archive = await getArchiveById(client, '354b783d-8fad-4050-a167-2eb069653777');
 * console.log('Price: $' + archive.priceForOneSquareKm + '/sqkm');
 */
export async function getArchiveById(
  client: SkyFiClient,
  archiveId: string,
  options?: ArchiveSearchOptions,
): Promise<Archive> {
  const correlationId = options?.correlationId ?? 'archive-get-' + Date.now().toString();
  const startTime = Date.now();

  logger.info('Fetching archive by ID', {
    correlationId,
    archiveId,
  });

  try {
    if (!archiveId || archiveId.trim() === '') {
      throw new ValidationError('archiveId is required');
    }

    // Make API request
    const response = await client.get<Archive>('/archives/' + archiveId);

    // Validate response
    const validatedArchive = ArchiveSchema.parse(response);

    const duration = Date.now() - startTime;
    logger.info('Archive fetch completed', {
      correlationId,
      archiveId,
      provider: validatedArchive.provider,
      productType: validatedArchive.productType,
      durationMs: duration,
    });

    return validatedArchive;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      logger.error('Archive validation failed', {
        correlationId,
        archiveId,
        errors: error.errors,
        durationMs: duration,
      });
      throw new ValidationError(
        'Invalid archive response: ' + error.errors.map((e) => e.path.join('.') + ': ' + e.message).join(', '),
        error.errors[0]?.path[0]?.toString(),
      );
    }

    if (error instanceof NotFoundError) {
      logger.warn('Archive not found', {
        correlationId,
        archiveId,
        durationMs: duration,
      });
    } else {
      logger.error('Archive fetch failed', {
        correlationId,
        archiveId,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
    }

    throw error;
  }
}
