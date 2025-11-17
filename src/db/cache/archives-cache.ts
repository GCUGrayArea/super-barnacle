/**
 * Archive Search Cache Implementation
 *
 * Provides caching for archive search results with 24-hour TTL.
 * Uses PostgreSQL for persistent storage and deterministic cache keys
 * for consistent cache hits across identical search parameters.
 *
 * @packageDocumentation
 */

import { logger } from '../../lib/logger.js';
import { query } from '../client.js';
import { generateCacheKey, normalizeSearchParams, summarizeCacheParams } from '../../lib/cache-key.js';
import type { ArchiveSearchParams, ArchiveSearchResponse } from '../../types/archives.js';
import type { ArchiveSearchCache, CreateArchiveSearchCache } from '../schema.js';

/**
 * Default cache TTL in seconds (24 hours)
 */
export const DEFAULT_CACHE_TTL = 24 * 60 * 60; // 86400 seconds

/**
 * Archive search cache manager
 *
 * Provides methods for storing and retrieving cached archive search results.
 * Implements automatic expiration based on TTL and tracks cache hit metrics.
 */
export class ArchivesCache {
  /**
   * Get cached archive search results
   *
   * Checks if a cache entry exists for the given search parameters.
   * Returns null if:
   * - No cache entry exists
   * - Cache entry has expired
   *
   * Updates hit count and last_accessed_at timestamp on cache hit.
   *
   * @param params - Archive search parameters
   * @returns Cached search results or null if cache miss
   *
   * @example
   * const cache = new ArchivesCache();
   * const cached = await cache.get(searchParams);
   * if (cached) {
   *   console.log('Cache hit!', cached.archives.length, 'results');
   * } else {
   *   console.log('Cache miss, fetching from API...');
   * }
   */
  async get(params: ArchiveSearchParams): Promise<ArchiveSearchResponse | null> {
    const cacheKey = generateCacheKey(params);
    const startTime = Date.now();

    try {
      // Query for cache entry
      const result = await query<ArchiveSearchCache>(
        `SELECT * FROM archive_searches
         WHERE cache_key = $1
         AND cache_expires_at > NOW()
         LIMIT 1`,
        [cacheKey],
      );

      if (result.rows.length === 0) {
        const duration = Date.now() - startTime;
        logger.debug('Archive cache miss', {
          cacheKey: cacheKey.substring(0, 16) + '...',
          durationMs: duration,
        });
        return null;
      }

      // Cache hit - update metrics asynchronously
      const cacheEntry = result.rows[0];
      if (!cacheEntry) {
        return null;
      }

      this.updateHitMetrics(cacheKey).catch((error) => {
        logger.warn('Failed to update cache hit metrics', {
          cacheKey: cacheKey.substring(0, 16) + '...',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

      const duration = Date.now() - startTime;
      logger.info('Archive cache hit', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        resultCount: cacheEntry.result_count,
        hitCount: cacheEntry.hit_count + 1,
        ageMinutes: Math.floor((Date.now() - cacheEntry.created_at.getTime()) / 1000 / 60),
        durationMs: duration,
      });

      // Return cached response
      return cacheEntry.response_data as unknown as ArchiveSearchResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Archive cache get failed', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      // Return null on error to allow fallback to API
      return null;
    }
  }

  /**
   * Store archive search results in cache
   *
   * Stores the complete API response with the specified TTL.
   * If a cache entry already exists for these parameters, it is updated.
   *
   * @param params - Archive search parameters
   * @param results - Archive search results from API
   * @param ttl - Time to live in seconds (default: 24 hours)
   * @returns Promise that resolves when cache is stored
   *
   * @example
   * const cache = new ArchivesCache();
   * const results = await fetchFromAPI(params);
   * await cache.set(params, results); // Cache for 24 hours
   * await cache.set(params, results, 3600); // Cache for 1 hour
   */
  async set(
    params: ArchiveSearchParams,
    results: ArchiveSearchResponse,
    ttl: number = DEFAULT_CACHE_TTL,
  ): Promise<void> {
    const cacheKey = generateCacheKey(params);
    const normalized = normalizeSearchParams(params);
    const startTime = Date.now();

    try {
      const expiresAt = new Date(Date.now() + ttl * 1000);

      // Extract search parameters for storage
      const cacheData: CreateArchiveSearchCache = {
        cache_key: cacheKey,
        aoi_wkt: normalized['aoi'] as string | undefined,
        start_date: normalized['fromDate'] ? new Date(normalized['fromDate'] as string) : undefined,
        end_date: normalized['toDate'] ? new Date(normalized['toDate'] as string) : undefined,
        product_type: normalized['productTypes'] ? (normalized['productTypes'] as string[]).join(',') : undefined,
        resolution: normalized['resolutions'] ? (normalized['resolutions'] as string[]).join(',') : undefined,
        max_cloud_coverage: normalized['maxCloudCoveragePercent'] as number | undefined,
        open_data_only: (normalized['openData'] as boolean) || false,
        response_data: results as unknown as Record<string, unknown>,
        result_count: results.archives.length,
        cache_expires_at: expiresAt,
      };

      // Insert or update cache entry
      await query(
        `INSERT INTO archive_searches (
          cache_key, aoi_wkt, start_date, end_date, product_type, resolution,
          max_cloud_coverage, open_data_only, response_data, result_count, cache_expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (cache_key)
        DO UPDATE SET
          aoi_wkt = EXCLUDED.aoi_wkt,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          product_type = EXCLUDED.product_type,
          resolution = EXCLUDED.resolution,
          max_cloud_coverage = EXCLUDED.max_cloud_coverage,
          open_data_only = EXCLUDED.open_data_only,
          response_data = EXCLUDED.response_data,
          result_count = EXCLUDED.result_count,
          cache_expires_at = EXCLUDED.cache_expires_at,
          hit_count = 0,
          last_accessed_at = NULL`,
        [
          cacheData.cache_key,
          cacheData.aoi_wkt,
          cacheData.start_date,
          cacheData.end_date,
          cacheData.product_type,
          cacheData.resolution,
          cacheData.max_cloud_coverage,
          cacheData.open_data_only,
          JSON.stringify(cacheData.response_data),
          cacheData.result_count,
          cacheData.cache_expires_at,
        ],
      );

      const duration = Date.now() - startTime;
      logger.info('Archive cache stored', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        resultCount: results.archives.length,
        ttlSeconds: ttl,
        expiresAt: expiresAt.toISOString(),
        summary: summarizeCacheParams(normalized),
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Archive cache set failed', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      // Don't throw - caching is optional, API call already succeeded
    }
  }

  /**
   * Update cache hit metrics
   *
   * Increments hit count and updates last_accessed_at timestamp.
   * Called asynchronously when a cache hit occurs.
   *
   * @param cacheKey - Cache key to update
   * @returns Promise that resolves when metrics are updated
   */
  private async updateHitMetrics(cacheKey: string): Promise<void> {
    await query(
      `UPDATE archive_searches
       SET hit_count = hit_count + 1,
           last_accessed_at = NOW()
       WHERE cache_key = $1`,
      [cacheKey],
    );
  }

  /**
   * Clear a specific cache entry
   *
   * Removes the cache entry for the given search parameters.
   * Useful for forced cache invalidation.
   *
   * @param params - Archive search parameters
   * @returns Promise that resolves when cache is cleared
   *
   * @example
   * const cache = new ArchivesCache();
   * await cache.clear(searchParams);
   */
  async clear(params: ArchiveSearchParams): Promise<void> {
    const cacheKey = generateCacheKey(params);
    const startTime = Date.now();

    try {
      const result = await query(
        `DELETE FROM archive_searches
         WHERE cache_key = $1`,
        [cacheKey],
      );

      const duration = Date.now() - startTime;
      logger.info('Archive cache entry cleared', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        deleted: result.rowCount > 0,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Archive cache clear failed', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      throw error;
    }
  }

  /**
   * Clear all archive cache entries
   *
   * Removes all cache entries from the archive_searches table.
   * Use with caution - this affects all cached searches.
   *
   * @returns Promise that resolves to number of entries cleared
   *
   * @example
   * const cache = new ArchivesCache();
   * const cleared = await cache.clearAll();
   * console.log(`Cleared ${cleared} cache entries`);
   */
  async clearAll(): Promise<number> {
    const startTime = Date.now();

    try {
      const result = await query(`DELETE FROM archive_searches`);

      const duration = Date.now() - startTime;
      logger.warn('All archive cache entries cleared', {
        entriesCleared: result.rowCount,
        durationMs: duration,
      });

      return result.rowCount;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Archive cache clear all failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      throw error;
    }
  }

  /**
   * Clear expired cache entries
   *
   * Removes cache entries where cache_expires_at < NOW().
   * Useful for cleanup tasks and freeing storage.
   *
   * @returns Promise that resolves to number of entries cleared
   *
   * @example
   * const cache = new ArchivesCache();
   * const cleared = await cache.clearExpired();
   * console.log(`Cleared ${cleared} expired entries`);
   */
  async clearExpired(): Promise<number> {
    const startTime = Date.now();

    try {
      const result = await query(
        `DELETE FROM archive_searches
         WHERE cache_expires_at < NOW()`,
      );

      const duration = Date.now() - startTime;
      if (result.rowCount > 0) {
        logger.info('Expired archive cache entries cleared', {
          entriesCleared: result.rowCount,
          durationMs: duration,
        });
      }

      return result.rowCount;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Archive cache clear expired failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      throw error;
    }
  }

  /**
   * Get cache statistics
   *
   * Returns metrics about cache usage including total entries,
   * expired entries, and hit counts.
   *
   * @returns Promise that resolves to cache statistics
   *
   * @example
   * const cache = new ArchivesCache();
   * const stats = await cache.getStats();
   * console.log('Cache hit rate:', stats.avgHitsPerEntry);
   */
  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    totalHits: number;
    avgHitsPerEntry: number;
    lastAccessed: Date | null;
  }> {
    try {
      const result = await query<{
        total_entries: number;
        expired_entries: number;
        total_hits: number;
        avg_hits: number;
        last_accessed: Date | null;
      }>(
        `SELECT
          COUNT(*) as total_entries,
          COUNT(*) FILTER (WHERE cache_expires_at < NOW()) as expired_entries,
          COALESCE(SUM(hit_count), 0) as total_hits,
          COALESCE(AVG(hit_count), 0) as avg_hits,
          MAX(last_accessed_at) as last_accessed
         FROM archive_searches`,
      );

      const stats = result.rows[0];
      if (!stats) {
        return {
          totalEntries: 0,
          expiredEntries: 0,
          totalHits: 0,
          avgHitsPerEntry: 0,
          lastAccessed: null,
        };
      }

      return {
        totalEntries: parseInt(stats.total_entries.toString(), 10),
        expiredEntries: parseInt(stats.expired_entries.toString(), 10),
        totalHits: parseInt(stats.total_hits.toString(), 10),
        avgHitsPerEntry: parseFloat(stats.avg_hits.toString()),
        lastAccessed: stats.last_accessed,
      };
    } catch (error) {
      logger.error('Failed to get archive cache stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

/**
 * Singleton instance of ArchivesCache
 *
 * Use this for most operations to avoid creating multiple instances.
 */
export const archivesCache = new ArchivesCache();
