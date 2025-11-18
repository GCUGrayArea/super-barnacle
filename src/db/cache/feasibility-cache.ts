/**
 * Feasibility Cache Implementation
 *
 * Provides caching for feasibility check and pass prediction results with 24-hour TTL.
 * Uses PostgreSQL for persistent storage and deterministic cache keys
 * for consistent cache hits across identical feasibility parameters.
 *
 * @packageDocumentation
 */

import { logger } from '../../lib/logger.js';
import { query } from '../client.js';
import { normalizeWKT } from '../../lib/cache-key.js';
import type { FeasibilityCache as FeasibilityCacheRow, CreateFeasibilityCache } from '../schema.js';
import type {
  FeasibilityCheckRequest,
  FeasibilityCheckResponse,
  PassPredictionRequest,
  PassPredictionResponse,
} from '../../types/feasibility.js';

/**
 * Default cache TTL in seconds (24 hours)
 */
export const DEFAULT_FEASIBILITY_TTL = 24 * 60 * 60; // 86400 seconds

/**
 * Normalized feasibility parameters for cache key generation
 */
interface NormalizedFeasibilityParams {
  aoi: string;
  startDate?: string;
  endDate?: string;
  productType?: string;
  resolution?: string;
  providers?: string[];
  maxCloudCoveragePercent?: number;
  maxOffNadirAngle?: number;
  requiredProvider?: string;
}

/**
 * Normalize feasibility check parameters for consistent cache keys
 *
 * @param params - Feasibility check parameters
 * @returns Normalized parameters object
 */
function normalizeFeasibilityParams(
  params: FeasibilityCheckRequest | PassPredictionRequest,
): NormalizedFeasibilityParams {
  const normalized: NormalizedFeasibilityParams = {
    aoi: normalizeWKT(params.aoi),
  };

  // Check if it's a FeasibilityCheckRequest
  if ('startDate' in params && params.startDate) {
    normalized.startDate = params.startDate;
  } else if ('fromDate' in params && params.fromDate) {
    normalized.startDate = params.fromDate;
  }

  if ('endDate' in params && params.endDate) {
    normalized.endDate = params.endDate;
  } else if ('toDate' in params && params.toDate) {
    normalized.endDate = params.toDate;
  }

  // Product type (single value for feasibility check)
  if ('productType' in params && params.productType) {
    normalized.productType = params.productType;
  }

  // Product types (array for pass prediction) - normalize to comma-separated string
  if ('productTypes' in params && params.productTypes && params.productTypes.length > 0) {
    normalized.productType = [...params.productTypes].sort().join(',');
  }

  // Resolution (single value for feasibility check)
  if ('resolution' in params && params.resolution) {
    normalized.resolution = params.resolution;
  }

  // Resolutions (array for pass prediction) - normalize to comma-separated string
  if ('resolutions' in params && params.resolutions && params.resolutions.length > 0) {
    normalized.resolution = [...params.resolutions].sort().join(',');
  }

  // Cloud coverage
  if ('maxCloudCoveragePercent' in params && params.maxCloudCoveragePercent !== undefined) {
    normalized.maxCloudCoveragePercent = params.maxCloudCoveragePercent;
  }

  // Off nadir angle (for pass prediction)
  if ('maxOffNadirAngle' in params && params.maxOffNadirAngle !== undefined) {
    normalized.maxOffNadirAngle = params.maxOffNadirAngle;
  }

  // Required provider
  if ('requiredProvider' in params && params.requiredProvider) {
    normalized.requiredProvider = params.requiredProvider;
  }

  return normalized;
}

/**
 * Generate cache key for feasibility parameters
 *
 * @param params - Feasibility or pass prediction parameters
 * @returns SHA-256 hash of normalized parameters
 */
function generateFeasibilityCacheKey(
  params: FeasibilityCheckRequest | PassPredictionRequest,
): string {
  const normalized = normalizeFeasibilityParams(params);

  // Sort keys to ensure consistent JSON serialization
  const sortedKeys = Object.keys(normalized).sort();
  const sortedNormalized: Record<string, any> = {};
  for (const key of sortedKeys) {
    sortedNormalized[key] = normalized[key as keyof NormalizedFeasibilityParams];
  }

  // Create deterministic JSON string and hash it
  const jsonString = JSON.stringify(sortedNormalized);
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  hash.update(jsonString);
  return hash.digest('hex');
}

/**
 * Feasibility cache manager
 *
 * Provides methods for storing and retrieving cached feasibility results.
 * Implements automatic expiration based on 24-hour TTL and tracks cache hit metrics.
 */
export class FeasibilityCache {
  /**
   * Get cached feasibility check results
   *
   * Checks if a cache entry exists for the given feasibility parameters.
   * Returns null if:
   * - No cache entry exists
   * - Cache entry has expired
   *
   * Updates hit count and last_accessed_at timestamp on cache hit.
   *
   * @param params - Feasibility check parameters
   * @returns Cached feasibility results or null if cache miss
   *
   * @example
   * const cache = new FeasibilityCache();
   * const cached = await cache.get(feasibilityParams);
   * if (cached) {
   *   console.log('Cache hit!', cached.overallScore);
   * } else {
   *   console.log('Cache miss, fetching from API...');
   * }
   */
  async get(
    params: FeasibilityCheckRequest | PassPredictionRequest,
  ): Promise<FeasibilityCheckResponse | PassPredictionResponse | null> {
    const cacheKey = generateFeasibilityCacheKey(params);
    const startTime = Date.now();

    try {
      // Query for cache entry
      const result = await query<FeasibilityCacheRow>(
        `SELECT * FROM feasibility_cache
         WHERE cache_key = $1
         AND cache_expires_at > NOW()
         LIMIT 1`,
        [cacheKey],
      );

      if (result.rows.length === 0) {
        const duration = Date.now() - startTime;
        logger.debug('Feasibility cache miss', {
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
      logger.info('Feasibility cache hit', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        feasibilityScore: cacheEntry.feasibility_score,
        passCount: cacheEntry.pass_count,
        hitCount: cacheEntry.hit_count + 1,
        ageMinutes: Math.floor((Date.now() - cacheEntry.created_at.getTime()) / 1000 / 60),
        durationMs: duration,
      });

      // Return cached response
      return cacheEntry.response_data as unknown as FeasibilityCheckResponse | PassPredictionResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Feasibility cache get failed', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      // Return null on error to allow fallback to API
      return null;
    }
  }

  /**
   * Store feasibility results in cache
   *
   * Stores the complete API response with the specified TTL (default: 24 hours).
   * If a cache entry already exists for these parameters, it is updated.
   *
   * @param params - Feasibility check or pass prediction parameters
   * @param results - Feasibility results from API
   * @param ttl - Time to live in seconds (default: 24 hours)
   * @returns Promise that resolves when cache is stored
   *
   * @example
   * const cache = new FeasibilityCache();
   * const results = await fetchFromAPI(params);
   * await cache.set(params, results); // Cache for 24 hours
   * await cache.set(params, results, 3600); // Cache for 1 hour
   */
  async set(
    params: FeasibilityCheckRequest | PassPredictionRequest,
    results: FeasibilityCheckResponse | PassPredictionResponse,
    ttl: number = DEFAULT_FEASIBILITY_TTL,
  ): Promise<void> {
    const cacheKey = generateFeasibilityCacheKey(params);
    const normalized = normalizeFeasibilityParams(params);
    const startTime = Date.now();

    try {
      const expiresAt = new Date(Date.now() + ttl * 1000);

      // Extract feasibility metrics
      let feasibilityScore: number | undefined;
      let passCount: number | undefined;
      let providerWindows: Record<string, unknown> | undefined;

      if ('overallScore' in results && results.overallScore) {
        feasibilityScore = results.overallScore.feasibility;

        // Extract provider windows for ordering
        if (results.overallScore.providerScore?.providerScores) {
          providerWindows = {
            providers: results.overallScore.providerScore.providerScores.map((ps) => ({
              provider: ps.provider,
              score: ps.score,
              opportunities: ps.opportunities,
            })),
          };
        }
      }

      if ('passes' in results && results.passes) {
        passCount = results.passes.length;
      }

      // Prepare cache data
      const cacheData: CreateFeasibilityCache = {
        cache_key: cacheKey,
        aoi_wkt: normalized.aoi,
        start_date: normalized.startDate ? new Date(normalized.startDate) : undefined,
        end_date: normalized.endDate ? new Date(normalized.endDate) : undefined,
        product_type: normalized.productType,
        resolution: normalized.resolution,
        providers: normalized.requiredProvider ? [normalized.requiredProvider] : undefined,
        response_data: results as unknown as Record<string, unknown>,
        feasibility_score: feasibilityScore,
        pass_count: passCount,
        provider_windows: providerWindows,
        cache_expires_at: expiresAt,
      };

      // Insert or update cache entry
      await query(
        `INSERT INTO feasibility_cache (
          cache_key, aoi_wkt, start_date, end_date, product_type, resolution,
          providers, response_data, feasibility_score, pass_count, provider_windows, cache_expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (cache_key)
        DO UPDATE SET
          aoi_wkt = EXCLUDED.aoi_wkt,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          product_type = EXCLUDED.product_type,
          resolution = EXCLUDED.resolution,
          providers = EXCLUDED.providers,
          response_data = EXCLUDED.response_data,
          feasibility_score = EXCLUDED.feasibility_score,
          pass_count = EXCLUDED.pass_count,
          provider_windows = EXCLUDED.provider_windows,
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
          cacheData.providers,
          JSON.stringify(cacheData.response_data),
          cacheData.feasibility_score,
          cacheData.pass_count,
          cacheData.provider_windows ? JSON.stringify(cacheData.provider_windows) : null,
          cacheData.cache_expires_at,
        ],
      );

      const duration = Date.now() - startTime;
      logger.info('Feasibility cache stored', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        feasibilityScore,
        passCount,
        ttlSeconds: ttl,
        expiresAt: expiresAt.toISOString(),
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Feasibility cache set failed', {
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
      `UPDATE feasibility_cache
       SET hit_count = hit_count + 1,
           last_accessed_at = NOW()
       WHERE cache_key = $1`,
      [cacheKey],
    );
  }

  /**
   * Clear a specific cache entry
   *
   * Removes the cache entry for the given feasibility parameters.
   * Useful for forced cache invalidation.
   *
   * @param params - Feasibility check or pass prediction parameters
   * @returns Promise that resolves when cache is cleared
   *
   * @example
   * const cache = new FeasibilityCache();
   * await cache.clear(feasibilityParams);
   */
  async clear(params: FeasibilityCheckRequest | PassPredictionRequest): Promise<void> {
    const cacheKey = generateFeasibilityCacheKey(params);
    const startTime = Date.now();

    try {
      const result = await query(
        `DELETE FROM feasibility_cache
         WHERE cache_key = $1`,
        [cacheKey],
      );

      const duration = Date.now() - startTime;
      logger.info('Feasibility cache entry cleared', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        deleted: result.rowCount > 0,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Feasibility cache clear failed', {
        cacheKey: cacheKey.substring(0, 16) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      throw error;
    }
  }

  /**
   * Clear all feasibility cache entries
   *
   * Removes all cache entries from the feasibility_cache table.
   * Use with caution - this affects all cached feasibility results.
   *
   * @returns Promise that resolves to number of entries cleared
   *
   * @example
   * const cache = new FeasibilityCache();
   * const cleared = await cache.clearAll();
   * console.log(`Cleared ${cleared} cache entries`);
   */
  async clearAll(): Promise<number> {
    const startTime = Date.now();

    try {
      const result = await query(`DELETE FROM feasibility_cache`);

      const duration = Date.now() - startTime;
      logger.warn('All feasibility cache entries cleared', {
        entriesCleared: result.rowCount,
        durationMs: duration,
      });

      return result.rowCount;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Feasibility cache clear all failed', {
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
   * const cache = new FeasibilityCache();
   * const cleared = await cache.clearExpired();
   * console.log(`Cleared ${cleared} expired entries`);
   */
  async clearExpired(): Promise<number> {
    const startTime = Date.now();

    try {
      const result = await query(
        `DELETE FROM feasibility_cache
         WHERE cache_expires_at < NOW()`,
      );

      const duration = Date.now() - startTime;
      if (result.rowCount > 0) {
        logger.info('Expired feasibility cache entries cleared', {
          entriesCleared: result.rowCount,
          durationMs: duration,
        });
      }

      return result.rowCount;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Feasibility cache clear expired failed', {
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
   * const cache = new FeasibilityCache();
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
      // pg-mem doesn't support COUNT(*) FILTER syntax properly, so we use subqueries
      const result = await query<{
        total_entries: number;
        expired_entries: number;
        total_hits: number;
        avg_hits: number;
        last_accessed: Date | null;
      }>(
        `SELECT
          COUNT(*) as total_entries,
          (SELECT COUNT(*) FROM feasibility_cache WHERE cache_expires_at < NOW()) as expired_entries,
          COALESCE(SUM(hit_count), 0) as total_hits,
          COALESCE(AVG(hit_count), 0) as avg_hits,
          MAX(last_accessed_at) as last_accessed
         FROM feasibility_cache`,
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
      logger.error('Failed to get feasibility cache stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

/**
 * Singleton instance of FeasibilityCache
 *
 * Use this for most operations to avoid creating multiple instances.
 */
export const feasibilityCache = new FeasibilityCache();
