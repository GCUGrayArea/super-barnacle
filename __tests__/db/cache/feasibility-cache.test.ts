/**
 * Feasibility Cache Tests
 *
 * Comprehensive unit tests for the feasibility caching implementation.
 * Uses pg-mem (in-memory Postgres) for fast, isolated testing without
 * requiring a real database connection.
 */

import { newDb } from 'pg-mem';
import type { IMemoryDb } from 'pg-mem';
import { FeasibilityCache, DEFAULT_FEASIBILITY_TTL } from '../../../src/db/cache/feasibility-cache.js';
import type {
  FeasibilityCheckRequest,
  FeasibilityCheckResponse,
  PassPredictionRequest,
  PassPredictionResponse,
} from '../../../src/types/feasibility.js';
import { ProductType, Resolution, Provider } from '../../../src/types/skyfi-api.js';
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

describe('FeasibilityCache', () => {
  let db: IMemoryDb;
  let cache: FeasibilityCache;

  // Sample feasibility check request for testing
  const baseFeasibilityRequest: FeasibilityCheckRequest = {
    aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
    productType: ProductType.Day,
    resolution: Resolution.High,
    startDate: '2025-02-01T00:00:00Z',
    endDate: '2025-02-07T23:59:59Z',
    maxCloudCoveragePercent: 20,
    requiredProvider: 'PLANET',
  };

  // Sample feasibility response for testing
  const mockFeasibilityResponse: FeasibilityCheckResponse = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    validUntil: '2025-02-08T23:59:59Z',
    overallScore: {
      feasibility: 0.85,
      weatherScore: {
        weatherScore: 0.9,
        weatherDetails: {
          weatherScore: 0.9,
          clouds: [
            {
              date: '2025-02-02T00:00:00Z',
              coverage: 10,
            },
          ],
        },
      },
      providerScore: {
        score: 0.8,
        providerScores: [
          {
            provider: 'PLANET',
            score: 0.8,
            status: 'COMPLETE' as any,
            opportunities: [
              {
                windowStart: '2025-02-02T10:00:00Z',
                windowEnd: '2025-02-02T10:15:00Z',
                satelliteId: 'PLANET-SAT-1',
                providerWindowId: 'planet-window-123',
              },
            ],
          },
        ],
      },
    },
  };

  // Sample pass prediction request for testing
  const basePassRequest: PassPredictionRequest = {
    aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
    fromDate: '2025-02-01T00:00:00Z',
    toDate: '2025-02-07T23:59:59Z',
    productTypes: [ProductType.Day],
    resolutions: [Resolution.High, Resolution.VeryHigh],
    maxOffNadirAngle: 30,
  };

  // Sample pass prediction response for testing
  const mockPassResponse: PassPredictionResponse = {
    passes: [
      {
        provider: Provider.Planet,
        satname: 'PLANET-SAT-1',
        satid: 'sat-001',
        noradid: 'NORAD-001',
        node: 'ASCENDING',
        productType: ProductType.Day,
        resolution: Resolution.High,
        lat: 30.285,
        lon: -97.715,
        passDate: '2025-02-02T10:00:00Z',
        meanT: 15.5,
        offNadirAngle: 15,
        solarElevationAngle: 45,
        minSquareKms: 1,
        maxSquareKms: 100,
        priceForOneSquareKm: 25,
        priceForOneSquareKmCents: 2500,
        gsdDegMin: 0.5,
        gsdDegMax: 1.0,
      },
    ],
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
    cache = new FeasibilityCache();
  });

  afterEach(async () => {
    // Clear all cache entries between tests
    await db.public.none('DELETE FROM feasibility_cache');
  });

  describe('Feasibility Check Caching', () => {
    describe('get()', () => {
      it('should return null for cache miss', async () => {
        const result = await cache.get(baseFeasibilityRequest);
        expect(result).toBeNull();
      });

      it('should return cached feasibility check on cache hit', async () => {
        // Store in cache
        await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);

        // Retrieve from cache
        const cached = await cache.get(baseFeasibilityRequest);

        expect(cached).not.toBeNull();
        expect((cached as FeasibilityCheckResponse).id).toBe(mockFeasibilityResponse.id);
        expect((cached as FeasibilityCheckResponse).overallScore?.feasibility).toBe(0.85);
      });

      it('should return null for expired cache entries', async () => {
        // Store with very short TTL
        await cache.set(baseFeasibilityRequest, mockFeasibilityResponse, -1);

        const cached = await cache.get(baseFeasibilityRequest);
        expect(cached).toBeNull();
      });

      it('should handle database errors gracefully', async () => {
        // Create request with problematic data
        const badRequest = { ...baseFeasibilityRequest, aoi: '' };
        const result = await cache.get(badRequest);
        // Should return null on error instead of throwing
        expect(result).toBeNull();
      });
    });

    describe('set()', () => {
      it('should store feasibility check with default TTL', async () => {
        await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);

        const cached = await cache.get(baseFeasibilityRequest);
        expect(cached).not.toBeNull();
      });

      it('should store feasibility check with custom TTL', async () => {
        const customTTL = 3600; // 1 hour
        await cache.set(baseFeasibilityRequest, mockFeasibilityResponse, customTTL);

        const cached = await cache.get(baseFeasibilityRequest);
        expect(cached).not.toBeNull();

        // Verify TTL in database
        const result = await db.public.many(
          'SELECT cache_expires_at FROM feasibility_cache LIMIT 1',
        );
        expect(result[0].cache_expires_at).toBeTruthy();
      });

      it('should update existing entry on conflict', async () => {
        // Store initial
        await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);

        // Store updated response
        const updatedResponse = {
          ...mockFeasibilityResponse,
          overallScore: {
            ...mockFeasibilityResponse.overallScore!,
            feasibility: 0.95,
          },
        };
        await cache.set(baseFeasibilityRequest, updatedResponse);

        // Verify update
        const cached = await cache.get(baseFeasibilityRequest) as FeasibilityCheckResponse;
        expect(cached.overallScore?.feasibility).toBe(0.95);
      });

      it('should extract and store feasibility metrics', async () => {
        await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);

        // Query database directly
        const result = await db.public.many(
          'SELECT feasibility_score, provider_windows FROM feasibility_cache LIMIT 1',
        );

        expect(parseFloat(result[0].feasibility_score)).toBe(0.85);
        expect(result[0].provider_windows).toBeTruthy();
      });
    });
  });

  describe('Pass Prediction Caching', () => {
    describe('get()', () => {
      it('should return cached pass prediction on cache hit', async () => {
        await cache.set(basePassRequest, mockPassResponse);

        const cached = await cache.get(basePassRequest);

        expect(cached).not.toBeNull();
        expect((cached as PassPredictionResponse).passes).toBeDefined();
        expect((cached as PassPredictionResponse).passes.length).toBe(1);
      });

      it('should differentiate between pass prediction and feasibility check', async () => {
        await cache.set(basePassRequest, mockPassResponse);
        await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);

        const passResult = await cache.get(basePassRequest);
        const feasibilityResult = await cache.get(baseFeasibilityRequest);

        expect((passResult as PassPredictionResponse).passes).toBeDefined();
        expect((feasibilityResult as FeasibilityCheckResponse).id).toBeDefined();
      });
    });

    describe('set()', () => {
      it('should store pass prediction with pass count', async () => {
        await cache.set(basePassRequest, mockPassResponse);

        // Query database directly
        const result = await db.public.many(
          'SELECT pass_count FROM feasibility_cache LIMIT 1',
        );

        expect(result[0].pass_count).toBe(1);
      });
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for identical parameters', async () => {
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);
      const cached1 = await cache.get(baseFeasibilityRequest);

      await cache.clear(baseFeasibilityRequest);
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);
      const cached2 = await cache.get(baseFeasibilityRequest);

      expect(cached1).not.toBeNull();
      expect(cached2).not.toBeNull();
    });

    it('should generate different cache keys for different parameters', async () => {
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);

      const differentRequest = {
        ...baseFeasibilityRequest,
        maxCloudCoveragePercent: 30, // Different parameter
      };

      const cached = await cache.get(differentRequest);
      expect(cached).toBeNull(); // Should not find the first entry
    });

    it('should normalize WKT polygons for consistent keys', async () => {
      const request1 = { ...baseFeasibilityRequest };
      const request2 = {
        ...baseFeasibilityRequest,
        aoi: 'POLYGON (( -97.72 30.28,  -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28 ))', // Different spacing
      };

      await cache.set(request1, mockFeasibilityResponse);
      const cached = await cache.get(request2);

      // Should find cached entry despite different WKT formatting
      expect(cached).not.toBeNull();
    });

    it('should handle array parameter sorting for pass prediction', async () => {
      const request1 = {
        ...basePassRequest,
        resolutions: [Resolution.High, Resolution.VeryHigh],
      };
      const request2 = {
        ...basePassRequest,
        resolutions: [Resolution.VeryHigh, Resolution.High], // Different order
      };

      await cache.set(request1, mockPassResponse);
      const cached = await cache.get(request2);

      // Should find cached entry despite different array order
      expect(cached).not.toBeNull();
    });
  });

  describe('clear()', () => {
    it('should remove specific cache entry', async () => {
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);
      await cache.clear(baseFeasibilityRequest);

      const cached = await cache.get(baseFeasibilityRequest);
      expect(cached).toBeNull();
    });

    it('should not error when clearing non-existent entry', async () => {
      await expect(cache.clear(baseFeasibilityRequest)).resolves.not.toThrow();
    });
  });

  describe('clearAll()', () => {
    it('should remove all cache entries', async () => {
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);
      await cache.set(basePassRequest, mockPassResponse);

      const cleared = await cache.clearAll();
      expect(cleared).toBe(2);

      const stats = await cache.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('clearExpired()', () => {
    it('should remove only expired entries', async () => {
      // Store one with short TTL (will expire)
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse, -1);

      // Store one with long TTL (won't expire)
      await cache.set(basePassRequest, mockPassResponse, 86400);

      const cleared = await cache.clearExpired();
      expect(cleared).toBeGreaterThanOrEqual(1);

      // Non-expired entry should still exist
      const cached = await cache.get(basePassRequest);
      expect(cached).not.toBeNull();
    });

    it('should return 0 when no entries are expired', async () => {
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse, 86400);

      const cleared = await cache.clearExpired();
      expect(cleared).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should return zero stats for empty cache', async () => {
      const stats = await cache.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.avgHitsPerEntry).toBe(0);
      expect(stats.lastAccessed).toBeNull();
    });

    it('should return correct stats for populated cache', async () => {
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);
      await cache.set(basePassRequest, mockPassResponse);

      const stats = await cache.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
    });

    it('should track hit counts', async () => {
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);

      // Access multiple times
      await cache.get(baseFeasibilityRequest);
      await cache.get(baseFeasibilityRequest);
      await cache.get(baseFeasibilityRequest);

      const stats = await cache.getStats();
      expect(stats.totalHits).toBeGreaterThan(0);
    });
  });

  describe('TTL Behavior', () => {
    it('should use default TTL of 24 hours', async () => {
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);

      const result = await db.public.many(
        'SELECT cache_expires_at FROM feasibility_cache LIMIT 1',
      );

      const expiresAt = new Date(result[0].cache_expires_at);
      const now = new Date();
      const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      expect(hoursDiff).toBeGreaterThan(23);
      expect(hoursDiff).toBeLessThan(25);
    });

    it('should respect custom TTL', async () => {
      const customTTL = 3600; // 1 hour
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse, customTTL);

      const result = await db.public.many(
        'SELECT cache_expires_at FROM feasibility_cache LIMIT 1',
      );

      const expiresAt = new Date(result[0].cache_expires_at);
      const now = new Date();
      const minutesDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60);

      expect(minutesDiff).toBeGreaterThan(55);
      expect(minutesDiff).toBeLessThan(65);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle multiple simultaneous reads', async () => {
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);

      const promises = Array.from({ length: 10 }, () =>
        cache.get(baseFeasibilityRequest),
      );

      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result).not.toBeNull();
      });
    });

    it('should handle multiple simultaneous writes', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        cache.set(
          { ...baseFeasibilityRequest, maxCloudCoveragePercent: 10 + i },
          mockFeasibilityResponse,
        ),
      );

      await Promise.all(promises);

      const stats = await cache.getStats();
      expect(stats.totalEntries).toBe(5);
    });
  });

  describe('Provider Window Storage', () => {
    it('should store provider windows for Planet orders', async () => {
      await cache.set(baseFeasibilityRequest, mockFeasibilityResponse);

      const result = await db.public.many(
        'SELECT provider_windows FROM feasibility_cache LIMIT 1',
      );

      expect(result[0].provider_windows).toBeTruthy();
      // pg-mem returns JSONB as objects, not strings
      const windows = typeof result[0].provider_windows === 'string'
        ? JSON.parse(result[0].provider_windows)
        : result[0].provider_windows;
      expect(windows.providers).toBeDefined();
      expect(windows.providers[0].opportunities).toBeDefined();
    });
  });
});
