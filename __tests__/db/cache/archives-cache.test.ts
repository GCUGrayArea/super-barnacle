/**
 * Archive Search Cache Tests
 *
 * Comprehensive unit tests for the archive search caching implementation.
 * Uses pg-mem (in-memory Postgres) for fast, isolated testing without
 * requiring a real database connection.
 */

import { newDb } from 'pg-mem';
import type { IMemoryDb } from 'pg-mem';
import { ArchivesCache } from '../../../src/db/cache/archives-cache.js';
import { generateCacheKey } from '../../../src/lib/cache-key.js';
import type { ArchiveSearchParams, ArchiveSearchResponse } from '../../../src/types/archives.js';
import { ProductType, Provider, Resolution } from '../../../src/types/skyfi-api.js';
import { setupCacheTestSchema } from '../../helpers/pg-mem-schema.js';

// Mock the database client to use pg-mem
jest.mock('../../../src/db/client.js', () => {
  let memDb: IMemoryDb | null = null;

  return {
    query: async (text: string, params?: any[]) => {
      if (!memDb) {
        throw new Error('Database not initialized');
      }
      const client = memDb.adapters.createPg().Client;
      const pgClient = new client();
      await pgClient.connect();
      const result = await pgClient.query(text, params);
      await pgClient.end();
      return result;
    },
    transaction: async (callback: any) => {
      if (!memDb) {
        throw new Error('Database not initialized');
      }
      const client = memDb.adapters.createPg().Client;
      const pgClient = new client();
      await pgClient.connect();
      await pgClient.query('BEGIN');
      try {
        const result = await callback(pgClient);
        await pgClient.query('COMMIT');
        return result;
      } catch (error) {
        await pgClient.query('ROLLBACK');
        throw error;
      } finally {
        await pgClient.end();
      }
    },
    getClient: async () => {
      if (!memDb) {
        throw new Error('Database not initialized');
      }
      const client = memDb.adapters.createPg().Client;
      const pgClient = new client();
      await pgClient.connect();
      return pgClient;
    },
    __setMemDb: (db: IMemoryDb) => {
      memDb = db;
    },
  };
});

// Import after mocking
const { __setMemDb } = jest.requireMock('../../../src/db/client.js');

describe('ArchivesCache', () => {
  let db: IMemoryDb;
  let cache: ArchivesCache;

  // Sample search parameters for testing
  const baseSearchParams: ArchiveSearchParams = {
    aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
    fromDate: '2025-01-01T00:00:00Z',
    toDate: '2025-01-31T23:59:59Z',
    maxCloudCoveragePercent: 20,
    resolutions: [Resolution.VeryHigh],
    productTypes: [ProductType.Day],
  };

  // Sample API response for testing
  const mockApiResponse: ArchiveSearchResponse = {
    request: baseSearchParams,
    archives: [
      {
        archiveId: '354b783d-8fad-4050-a167-2eb069653777',
        provider: Provider.Umbra,
        constellation: 'Umbra SAR',
        productType: ProductType.Day,
        platformResolution: 25,
        resolution: Resolution.VeryHigh,
        captureTimestamp: '2025-01-15T14:30:00Z',
        cloudCoveragePercent: 10,
        offNadirAngle: 5,
        footprint: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        minSqKm: 1,
        maxSqKm: 100,
        priceForOneSquareKm: 50,
        priceForOneSquareKmCents: 5000,
        priceFullScene: 500,
        openData: false,
        totalAreaSquareKm: 10,
        deliveryTimeHours: 24,
        gsd: 0.25,
      },
    ],
    total: 1,
  };

  beforeAll(async () => {
    // Create in-memory database
    db = newDb();

    // Load and execute the schema migration (with pg-mem compatibility)
    await setupCacheTestSchema(db);

    // Set the database for the mock
    __setMemDb(db);
  });

  beforeEach(() => {
    // Create a fresh cache instance for each test
    cache = new ArchivesCache();
  });

  afterEach(async () => {
    // Clear all cache entries between tests
    await db.public.none('DELETE FROM archive_searches');
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for identical parameters', () => {
      const key1 = generateCacheKey(baseSearchParams);
      const key2 = generateCacheKey(baseSearchParams);

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA-256 hash length
    });

    it('should generate different cache keys for different parameters', () => {
      const params2: ArchiveSearchParams = {
        ...baseSearchParams,
        maxCloudCoveragePercent: 30,
      };

      const key1 = generateCacheKey(baseSearchParams);
      const key2 = generateCacheKey(params2);

      expect(key1).not.toBe(key2);
    });

    it('should generate same cache key regardless of array order', () => {
      const params1: ArchiveSearchParams = {
        ...baseSearchParams,
        resolutions: [Resolution.VeryHigh, Resolution.High],
      };

      const params2: ArchiveSearchParams = {
        ...baseSearchParams,
        resolutions: [Resolution.High, Resolution.VeryHigh],
      };

      const key1 = generateCacheKey(params1);
      const key2 = generateCacheKey(params2);

      expect(key1).toBe(key2);
    });
  });

  describe('Cache Miss', () => {
    it('should return null for cache miss', async () => {
      const result = await cache.get(baseSearchParams);
      expect(result).toBeNull();
    });

    it('should return null for expired cache entry', async () => {
      // Store a cache entry that expires immediately
      await cache.set(baseSearchParams, mockApiResponse, -1);

      // Should return null because entry is expired
      const result = await cache.get(baseSearchParams);
      expect(result).toBeNull();
    });
  });

  describe('Cache Hit', () => {
    it('should store and retrieve cache entry', async () => {
      // Store in cache
      await cache.set(baseSearchParams, mockApiResponse);

      // Retrieve from cache
      const result = await cache.get(baseSearchParams);

      expect(result).not.toBeNull();
      expect(result?.archives).toHaveLength(1);
      expect(result?.archives[0].archiveId).toBe('354b783d-8fad-4050-a167-2eb069653777');
    });

    it('should increment hit count on cache access', async () => {
      // Store in cache
      await cache.set(baseSearchParams, mockApiResponse);

      // Access cache multiple times
      await cache.get(baseSearchParams);
      await cache.get(baseSearchParams);
      await cache.get(baseSearchParams);

      // Check hit count in database
      const cacheKey = generateCacheKey(baseSearchParams);
      const rows = await db.public.many(
        'SELECT hit_count FROM archive_searches WHERE cache_key = $1',
        [cacheKey],
      );

      expect(rows[0].hit_count).toBe(3);
    });

    it('should update last_accessed_at timestamp on cache hit', async () => {
      // Store in cache
      await cache.set(baseSearchParams, mockApiResponse);

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Access cache
      await cache.get(baseSearchParams);

      // Check last_accessed_at is set
      const cacheKey = generateCacheKey(baseSearchParams);
      const rows = await db.public.many(
        'SELECT last_accessed_at FROM archive_searches WHERE cache_key = $1',
        [cacheKey],
      );

      expect(rows[0].last_accessed_at).not.toBeNull();
    });
  });

  describe('Cache Storage', () => {
    it('should store cache with correct TTL', async () => {
      const ttl = 3600; // 1 hour
      await cache.set(baseSearchParams, mockApiResponse, ttl);

      const cacheKey = generateCacheKey(baseSearchParams);
      const rows = await db.public.many(
        'SELECT cache_expires_at, created_at FROM archive_searches WHERE cache_key = $1',
        [cacheKey],
      );

      const expiresAt = new Date(rows[0].cache_expires_at);
      const createdAt = new Date(rows[0].created_at);
      const actualTTL = Math.floor((expiresAt.getTime() - createdAt.getTime()) / 1000);

      expect(actualTTL).toBeCloseTo(ttl, -1); // Within 10 seconds
    });

    it('should store search parameters correctly', async () => {
      await cache.set(baseSearchParams, mockApiResponse);

      const cacheKey = generateCacheKey(baseSearchParams);
      const rows = await db.public.many(
        'SELECT * FROM archive_searches WHERE cache_key = $1',
        [cacheKey],
      );

      const entry = rows[0];
      expect(entry.aoi_wkt).toContain('POLYGON');
      expect(new Date(entry.start_date).toISOString()).toBe(baseSearchParams.fromDate);
      expect(new Date(entry.end_date).toISOString()).toBe(baseSearchParams.toDate);
      expect(entry.max_cloud_coverage).toBe(baseSearchParams.maxCloudCoveragePercent);
      expect(entry.result_count).toBe(1);
    });

    it('should update existing cache entry on duplicate key', async () => {
      // Store initial cache
      await cache.set(baseSearchParams, mockApiResponse);

      // Store again with different data
      const updatedResponse: ArchiveSearchResponse = {
        ...mockApiResponse,
        archives: [mockApiResponse.archives[0], mockApiResponse.archives[0]],
      };
      await cache.set(baseSearchParams, updatedResponse);

      // Should have updated, not duplicated
      const cacheKey = generateCacheKey(baseSearchParams);
      const rows = await db.public.many(
        'SELECT result_count FROM archive_searches WHERE cache_key = $1',
        [cacheKey],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].result_count).toBe(2);
    });

    it('should reset hit count when cache is updated', async () => {
      // Store and access cache
      await cache.set(baseSearchParams, mockApiResponse);
      await cache.get(baseSearchParams);
      await cache.get(baseSearchParams);

      // Update cache
      await cache.set(baseSearchParams, mockApiResponse);

      // Hit count should be reset to 0
      const cacheKey = generateCacheKey(baseSearchParams);
      const rows = await db.public.many(
        'SELECT hit_count FROM archive_searches WHERE cache_key = $1',
        [cacheKey],
      );

      expect(rows[0].hit_count).toBe(0);
    });
  });

  describe('Cache Clearing', () => {
    it('should clear specific cache entry', async () => {
      // Store cache
      await cache.set(baseSearchParams, mockApiResponse);

      // Clear it
      await cache.clear(baseSearchParams);

      // Should return null now
      const result = await cache.get(baseSearchParams);
      expect(result).toBeNull();
    });

    it('should clear all cache entries', async () => {
      // Store multiple cache entries
      await cache.set(baseSearchParams, mockApiResponse);

      const params2: ArchiveSearchParams = {
        ...baseSearchParams,
        maxCloudCoveragePercent: 30,
      };
      await cache.set(params2, mockApiResponse);

      // Clear all
      const cleared = await cache.clearAll();
      expect(cleared).toBe(2);

      // Both should be null now
      expect(await cache.get(baseSearchParams)).toBeNull();
      expect(await cache.get(params2)).toBeNull();
    });

    it('should clear only expired entries', async () => {
      // Store one expired entry
      await cache.set(baseSearchParams, mockApiResponse, -1);

      // Store one valid entry
      const params2: ArchiveSearchParams = {
        ...baseSearchParams,
        maxCloudCoveragePercent: 30,
      };
      await cache.set(params2, mockApiResponse, 3600);

      // Clear expired
      const cleared = await cache.clearExpired();
      expect(cleared).toBe(1);

      // Expired should be null, valid should still exist
      expect(await cache.get(baseSearchParams)).toBeNull();
      expect(await cache.get(params2)).not.toBeNull();
    });
  });

  describe('Cache Statistics', () => {
    it('should return correct cache statistics', async () => {
      // Store multiple entries
      await cache.set(baseSearchParams, mockApiResponse);

      const params2: ArchiveSearchParams = {
        ...baseSearchParams,
        maxCloudCoveragePercent: 30,
      };
      await cache.set(params2, mockApiResponse);

      // Access first entry multiple times
      await cache.get(baseSearchParams);
      await cache.get(baseSearchParams);

      // Get stats
      const stats = await cache.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.totalHits).toBe(2);
      expect(stats.avgHitsPerEntry).toBe(1); // 2 hits / 2 entries
      expect(stats.lastAccessed).not.toBeNull();
    });

    it('should count expired entries correctly', async () => {
      // Store one expired entry
      await cache.set(baseSearchParams, mockApiResponse, -1);

      // Store one valid entry
      const params2: ArchiveSearchParams = {
        ...baseSearchParams,
        maxCloudCoveragePercent: 30,
      };
      await cache.set(params2, mockApiResponse, 3600);

      const stats = await cache.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.expiredEntries).toBe(1);
    });

    it('should return zeros for empty cache', async () => {
      const stats = await cache.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.avgHitsPerEntry).toBe(0);
      expect(stats.lastAccessed).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should return null on database error during get', async () => {
      // Create a cache instance with invalid setup to trigger errors
      const badCache = new ArchivesCache();

      // Temporarily break the database connection
      __setMemDb(null as any);

      const result = await badCache.get(baseSearchParams);
      expect(result).toBeNull();

      // Restore database connection
      __setMemDb(db);
    });

    it('should not throw error on cache set failure', async () => {
      const badCache = new ArchivesCache();

      // Temporarily break the database connection
      __setMemDb(null as any);

      // Should not throw
      await expect(badCache.set(baseSearchParams, mockApiResponse)).resolves.not.toThrow();

      // Restore database connection
      __setMemDb(db);
    });
  });

  describe('WKT Normalization', () => {
    it('should handle different WKT formatting', () => {
      const params1: ArchiveSearchParams = {
        ...baseSearchParams,
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      };

      const params2: ArchiveSearchParams = {
        ...baseSearchParams,
        aoi: 'POLYGON(( -97.72 30.28 , -97.72 30.29 , -97.71 30.29 , -97.71 30.28 , -97.72 30.28 ))',
      };

      const key1 = generateCacheKey(params1);
      const key2 = generateCacheKey(params2);

      expect(key1).toBe(key2);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle cache with no date filters', async () => {
      const params: ArchiveSearchParams = {
        aoi: baseSearchParams.aoi,
        maxCloudCoveragePercent: 20,
      };

      await cache.set(params, mockApiResponse);
      const result = await cache.get(params);

      expect(result).not.toBeNull();
      expect(result?.archives).toHaveLength(1);
    });

    it('should handle cache with multiple filters', async () => {
      const params: ArchiveSearchParams = {
        aoi: baseSearchParams.aoi,
        fromDate: '2025-01-01T00:00:00Z',
        toDate: '2025-01-31T23:59:59Z',
        maxCloudCoveragePercent: 20,
        maxOffNadirAngle: 10,
        resolutions: [Resolution.VeryHigh, Resolution.High],
        productTypes: [ProductType.Day, ProductType.Night],
        providers: [Provider.Umbra, Provider.Planet],
        openData: false,
        minOverlapRatio: 0.8,
        pageSize: 50,
      };

      await cache.set(params, mockApiResponse);
      const result = await cache.get(params);

      expect(result).not.toBeNull();
    });

    it('should handle concurrent cache operations', async () => {
      // Simulate concurrent cache sets
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const params: ArchiveSearchParams = {
          ...baseSearchParams,
          maxCloudCoveragePercent: 10 + i * 5,
        };
        promises.push(cache.set(params, mockApiResponse));
      }

      await Promise.all(promises);

      // All should be stored
      const stats = await cache.getStats();
      expect(stats.totalEntries).toBe(5);
    });
  });
});
