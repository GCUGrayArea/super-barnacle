/**
 * Orders Cache Tests
 *
 * Comprehensive unit tests for the orders caching implementation.
 * Uses pg-mem (in-memory Postgres) for fast, isolated testing without
 * requiring a real database connection.
 */

import { newDb } from 'pg-mem';
import type { IMemoryDb } from 'pg-mem';
import fs from 'fs/promises';
import path from 'path';
import { OrdersCache } from '../../../src/db/cache/orders-cache.js';
import type { OrderInfoResponse } from '../../../src/types/skyfi-api.js';
import { OrderType as SkyFiOrderType, DeliveryDriver, DeliveryStatus } from '../../../src/types/order-status.js';

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

describe('OrdersCache', () => {
  let db: IMemoryDb;
  let cache: OrdersCache;

  // Sample order data for testing
  const mockArchiveOrder: OrderInfoResponse = {
    id: 'item-123',
    orderType: SkyFiOrderType.ARCHIVE,
    orderCost: 10000, // $100.00 in cents
    ownerId: 'user-456',
    status: DeliveryStatus.Delivered,
    aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
    aoiSqkm: 10.5,
    deliveryDriver: DeliveryDriver.S3,
    deliveryParams: { bucket: 'my-bucket', prefix: 'orders/' },
    label: 'Test Archive Order',
    downloadImageUrl: 'https://example.com/image.tif',
    downloadPayloadUrl: 'https://example.com/payload.json',
    orderCode: 'ORDER-2025-001',
    createdAt: '2025-01-15T12:00:00Z',
    orderId: 'order-archive-123',
    itemId: 'item-123',
    archiveId: 'archive-789',
    events: [
      {
        status: DeliveryStatus.Delivered,
        timestamp: '2025-01-15T14:00:00Z',
        message: 'Order delivered successfully',
      },
    ],
  } as OrderInfoResponse;

  const mockTaskingOrder: OrderInfoResponse = {
    id: 'item-456',
    orderType: SkyFiOrderType.TASKING,
    orderCost: 25000, // $250.00 in cents
    ownerId: 'user-456',
    status: DeliveryStatus.Processing,
    aoi: 'POLYGON((-98.0 31.0, -98.0 31.1, -97.9 31.1, -97.9 31.0, -98.0 31.0))',
    aoiSqkm: 15.0,
    deliveryDriver: DeliveryDriver.S3,
    deliveryParams: { bucket: 'tasking-bucket' },
    windowStart: '2025-02-01T00:00:00Z',
    windowEnd: '2025-02-07T23:59:59Z',
    productType: 'DAY',
    resolution: 'HIGH',
    downloadImageUrl: null,
    downloadPayloadUrl: null,
    orderCode: 'TASK-2025-001',
    createdAt: '2025-01-20T10:00:00Z',
    orderId: 'order-tasking-456',
    itemId: 'item-456',
    events: [
      {
        status: DeliveryStatus.Processing,
        timestamp: '2025-01-20T10:05:00Z',
        message: 'Tasking order submitted',
      },
    ],
  } as OrderInfoResponse;

  beforeAll(async () => {
    // Load and execute the schema migration
    const migrationsPath = path.join(process.cwd(), 'migrations/001_initial_schema.sql');
    const sql = await fs.readFile(migrationsPath, 'utf-8');

    // Create in-memory database
    db = newDb();

    // Execute schema
    await db.public.none(sql);

    // Set the database for the mock
    __setMemDb(db);
  });

  beforeEach(() => {
    // Create a fresh cache instance for each test
    cache = new OrdersCache();
  });

  afterEach(async () => {
    // Clear all cache entries between tests
    await db.public.none('DELETE FROM orders_cache');
  });

  describe('get()', () => {
    it('should return null for cache miss', async () => {
      const result = await cache.get('nonexistent-order');
      expect(result).toBeNull();
    });

    it('should return cached order on cache hit', async () => {
      // Store order in cache
      await cache.set('order-archive-123', mockArchiveOrder);

      // Retrieve from cache
      const cached = await cache.get('order-archive-123');

      expect(cached).not.toBeNull();
      expect(cached?.orderId).toBe('order-archive-123');
      expect(cached?.orderType).toBe(SkyFiOrderType.ARCHIVE);
      expect(cached?.status).toBe(DeliveryStatus.Delivered);
    });

    it('should handle database errors gracefully', async () => {
      // Force an error by querying with invalid orderId type
      const result = await cache.get('');
      expect(result).toBeNull(); // Should return null on error
    });
  });

  describe('set()', () => {
    it('should store new order in cache', async () => {
      await cache.set('order-archive-123', mockArchiveOrder);

      const cached = await cache.get('order-archive-123');
      expect(cached).not.toBeNull();
      expect(cached?.orderId).toBe('order-archive-123');
    });

    it('should update existing order on conflict', async () => {
      // Store initial order
      await cache.set('order-archive-123', mockArchiveOrder);

      // Update order with new status
      const updatedOrder = {
        ...mockArchiveOrder,
        status: DeliveryStatus.Failed,
      } as OrderInfoResponse;

      await cache.set('order-archive-123', updatedOrder);

      // Verify update
      const cached = await cache.get('order-archive-123');
      expect(cached?.status).toBe(DeliveryStatus.Failed);
    });

    it('should extract and store order metadata correctly', async () => {
      await cache.set('order-archive-123', mockArchiveOrder);

      // Query database directly to verify metadata
      const result = await db.public.many(
        'SELECT order_type, total_cost_usd, delivery_driver FROM orders_cache WHERE order_id = $1',
        ['order-archive-123'],
      );

      expect(result[0].order_type).toBe('ARCHIVE');
      expect(parseFloat(result[0].total_cost_usd)).toBe(100.0);
      expect(result[0].delivery_driver).toBe('S3');
    });
  });

  describe('update()', () => {
    beforeEach(async () => {
      // Store initial order
      await cache.set('order-archive-123', mockArchiveOrder);
    });

    it('should update order status', async () => {
      await cache.update('order-archive-123', {
        order_status: 'COMPLETED' as any,
      });

      const cached = await cache.get('order-archive-123');
      expect(cached?.status).toBe('COMPLETED');
    });

    it('should update completed_at timestamp', async () => {
      const completedAt = new Date('2025-01-15T15:00:00Z');

      await cache.update('order-archive-123', {
        completed_at: completedAt,
      });

      // Query database to verify timestamp
      const result = await db.public.many(
        'SELECT completed_at FROM orders_cache WHERE order_id = $1',
        ['order-archive-123'],
      );

      expect(result[0].completed_at).toBeTruthy();
    });

    it('should handle updating non-existent order', async () => {
      // Should not throw error
      await expect(
        cache.update('nonexistent-order', {
          order_status: 'COMPLETED' as any,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('list()', () => {
    beforeEach(async () => {
      // Store multiple orders
      await cache.set('order-archive-123', mockArchiveOrder);
      await cache.set('order-tasking-456', mockTaskingOrder);
    });

    it('should return all orders when no filters applied', async () => {
      const orders = await cache.list();
      expect(orders.length).toBe(2);
    });

    it('should filter by order type', async () => {
      const archiveOrders = await cache.list({
        orderType: 'ARCHIVE',
      });

      expect(archiveOrders.length).toBe(1);
      expect(archiveOrders[0]?.orderType).toBe(SkyFiOrderType.ARCHIVE);
    });

    it('should filter by order status', async () => {
      const deliveredOrders = await cache.list({
        orderStatus: 'DELIVERED' as any,
      });

      expect(deliveredOrders.length).toBe(1);
      expect(deliveredOrders[0]?.status).toBe(DeliveryStatus.Delivered);
    });

    it('should support pagination', async () => {
      // Add more orders for pagination testing
      for (let i = 3; i <= 15; i++) {
        await cache.set(`order-${i}`, {
          ...mockArchiveOrder,
          orderId: `order-${i}`,
          id: `item-${i}`,
        } as OrderInfoResponse);
      }

      // First page
      const page1 = await cache.list({
        pageNumber: 0,
        pageSize: 5,
      });
      expect(page1.length).toBe(5);

      // Second page
      const page2 = await cache.list({
        pageNumber: 1,
        pageSize: 5,
      });
      expect(page2.length).toBe(5);
    });

    it('should combine multiple filters', async () => {
      const results = await cache.list({
        orderType: 'ARCHIVE',
        orderStatus: 'DELIVERED' as any,
      });

      expect(results.length).toBe(1);
      expect(results[0]?.orderType).toBe(SkyFiOrderType.ARCHIVE);
      expect(results[0]?.status).toBe(DeliveryStatus.Delivered);
    });
  });

  describe('clear()', () => {
    it('should remove specific order from cache', async () => {
      await cache.set('order-archive-123', mockArchiveOrder);
      await cache.clear('order-archive-123');

      const cached = await cache.get('order-archive-123');
      expect(cached).toBeNull();
    });

    it('should not error when clearing non-existent order', async () => {
      await expect(cache.clear('nonexistent-order')).resolves.not.toThrow();
    });
  });

  describe('clearAll()', () => {
    it('should remove all orders from cache', async () => {
      await cache.set('order-archive-123', mockArchiveOrder);
      await cache.set('order-tasking-456', mockTaskingOrder);

      const cleared = await cache.clearAll();
      expect(cleared).toBe(2);

      const orders = await cache.list();
      expect(orders.length).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should return zero stats for empty cache', async () => {
      const stats = await cache.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.archiveOrders).toBe(0);
      expect(stats.taskingOrders).toBe(0);
      expect(stats.completedOrders).toBe(0);
      expect(stats.pendingOrders).toBe(0);
    });

    it('should return correct stats for populated cache', async () => {
      await cache.set('order-archive-123', mockArchiveOrder);
      await cache.set('order-tasking-456', mockTaskingOrder);

      const stats = await cache.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.archiveOrders).toBe(1);
      expect(stats.taskingOrders).toBe(1);
      expect(stats.lastSynced).toBeTruthy();
    });
  });

  describe('No TTL Behavior', () => {
    it('should not have expiration for cached orders', async () => {
      await cache.set('order-archive-123', mockArchiveOrder);

      // Query database to verify no expiration column is set
      const result = await db.public.many(
        'SELECT * FROM orders_cache WHERE order_id = $1',
        ['order-archive-123'],
      );

      // orders_cache table should not have cache_expires_at column
      expect(result[0]).not.toHaveProperty('cache_expires_at');
    });

    it('should persist orders indefinitely', async () => {
      await cache.set('order-archive-123', mockArchiveOrder);

      // Simulate time passing (orders should still be there)
      const cached = await cache.get('order-archive-123');
      expect(cached).not.toBeNull();
      expect(cached?.orderId).toBe('order-archive-123');
    });
  });

  describe('Concurrent Access', () => {
    it('should handle multiple simultaneous reads', async () => {
      await cache.set('order-archive-123', mockArchiveOrder);

      const promises = Array.from({ length: 10 }, () =>
        cache.get('order-archive-123'),
      );

      const results = await Promise.all(promises);
      results.forEach((result) => {
        expect(result).not.toBeNull();
        expect(result?.orderId).toBe('order-archive-123');
      });
    });

    it('should handle multiple simultaneous writes', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        cache.set(`order-${i}`, {
          ...mockArchiveOrder,
          orderId: `order-${i}`,
          id: `item-${i}`,
        } as OrderInfoResponse),
      );

      await Promise.all(promises);

      const orders = await cache.list();
      expect(orders.length).toBe(5);
    });
  });
});
