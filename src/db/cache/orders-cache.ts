/**
 * Orders Cache Implementation
 *
 * Provides caching for order information (both archive and tasking orders).
 * Orders are cached indefinitely (no TTL) as they are immutable once created,
 * though status updates will refresh the cache entry.
 *
 * @packageDocumentation
 */

import { logger } from '../../lib/logger.js';
import { query } from '../client.js';
import type {
  OrderCache,
  CreateOrderCache,
  UpdateOrderCache,
  OrderType,
  OrderStatus,
} from '../schema.js';
import type {
  OrderInfoResponse,
  ArchiveOrderInfoResponse,
  TaskingOrderInfoResponse,
  ListOrdersResponse,
} from '../../types/skyfi-api.js';

/**
 * Filter parameters for listing cached orders
 */
export interface OrderListFilters {
  /** Filter by order type */
  orderType?: OrderType;
  /** Filter by order status */
  orderStatus?: OrderStatus;
  /** Filter by date range - start date */
  startDate?: Date;
  /** Filter by date range - end date */
  endDate?: Date;
  /** Pagination - page number (0-indexed) */
  pageNumber?: number;
  /** Pagination - page size */
  pageSize?: number;
}

/**
 * Orders cache manager
 *
 * Provides methods for storing and retrieving cached order information.
 * Orders are cached indefinitely with no TTL, but can be updated when
 * status changes occur.
 */
export class OrdersCache {
  /**
   * Get cached order by ID
   *
   * Retrieves the cached order information for the given order ID.
   * Returns null if no cache entry exists.
   *
   * @param orderId - SkyFi order identifier
   * @returns Cached order data or null if cache miss
   *
   * @example
   * const cache = new OrdersCache();
   * const cached = await cache.get('order-123');
   * if (cached) {
   *   console.log('Cache hit!', cached.status);
   * } else {
   *   console.log('Cache miss, fetching from API...');
   * }
   */
  async get(orderId: string): Promise<OrderInfoResponse | null> {
    const startTime = Date.now();

    try {
      // Query for cache entry
      const result = await query<OrderCache>(
        `SELECT * FROM orders_cache
         WHERE order_id = $1
         LIMIT 1`,
        [orderId],
      );

      if (result.rows.length === 0) {
        const duration = Date.now() - startTime;
        logger.debug('Order cache miss', {
          orderId,
          durationMs: duration,
        });
        return null;
      }

      // Cache hit
      const cacheEntry = result.rows[0];
      if (!cacheEntry) {
        return null;
      }

      const duration = Date.now() - startTime;
      logger.info('Order cache hit', {
        orderId,
        orderType: cacheEntry.order_type,
        orderStatus: cacheEntry.order_status,
        ageMinutes: Math.floor((Date.now() - cacheEntry.created_at.getTime()) / 1000 / 60),
        durationMs: duration,
      });

      // Return cached order data
      return cacheEntry.order_data as unknown as OrderInfoResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Order cache get failed', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      // Return null on error to allow fallback to API
      return null;
    }
  }

  /**
   * Store order in cache
   *
   * Stores the complete order information with no TTL.
   * If a cache entry already exists for this order ID, it is updated.
   *
   * @param orderId - SkyFi order identifier
   * @param orderData - Complete order information from API
   * @returns Promise that resolves when cache is stored
   *
   * @example
   * const cache = new OrdersCache();
   * const order = await fetchFromAPI(orderId);
   * await cache.set(orderId, order);
   */
  async set(orderId: string, orderData: OrderInfoResponse): Promise<void> {
    const startTime = Date.now();

    try {
      // Extract fields from order data for indexing
      const cacheData: CreateOrderCache = {
        order_id: orderId,
        order_type: orderData.orderType as OrderType,
        order_status: (orderData.status as unknown as OrderStatus) || ('PENDING' as OrderStatus),
        order_data: orderData as unknown as Record<string, unknown>,
        user_reference: orderData.label || orderData.orderLabel || undefined,
        aoi_wkt: orderData.aoi || undefined,
        product_type:
          orderData.orderType === 'TASKING'
            ? (orderData as TaskingOrderInfoResponse).productType
            : (orderData as ArchiveOrderInfoResponse).archive?.productType,
        resolution:
          orderData.orderType === 'TASKING'
            ? (orderData as TaskingOrderInfoResponse).resolution
            : (orderData as ArchiveOrderInfoResponse).archive?.resolution,
        delivery_driver: orderData.deliveryDriver
          ? (orderData.deliveryDriver as string)
          : undefined,
        delivery_bucket:
          orderData.deliveryParams && typeof orderData.deliveryParams === 'object'
            ? (orderData.deliveryParams as any).bucket || undefined
            : undefined,
        total_cost_usd: orderData.orderCost ? orderData.orderCost / 100 : undefined,
        ordered_at: orderData.createdAt ? new Date(orderData.createdAt) : undefined,
        completed_at: orderData.status === 'DELIVERED' ? new Date() : undefined,
      };

      // Insert or update cache entry
      await query(
        `INSERT INTO orders_cache (
          order_id, order_type, order_status, order_data, user_reference,
          aoi_wkt, product_type, resolution, delivery_driver, delivery_bucket,
          total_cost_usd, ordered_at, completed_at, last_synced_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (order_id)
        DO UPDATE SET
          order_type = EXCLUDED.order_type,
          order_status = EXCLUDED.order_status,
          order_data = EXCLUDED.order_data,
          user_reference = EXCLUDED.user_reference,
          aoi_wkt = EXCLUDED.aoi_wkt,
          product_type = EXCLUDED.product_type,
          resolution = EXCLUDED.resolution,
          delivery_driver = EXCLUDED.delivery_driver,
          delivery_bucket = EXCLUDED.delivery_bucket,
          total_cost_usd = EXCLUDED.total_cost_usd,
          ordered_at = EXCLUDED.ordered_at,
          completed_at = EXCLUDED.completed_at,
          last_synced_at = NOW()`,
        [
          cacheData.order_id,
          cacheData.order_type,
          cacheData.order_status,
          JSON.stringify(cacheData.order_data),
          cacheData.user_reference,
          cacheData.aoi_wkt,
          cacheData.product_type,
          cacheData.resolution,
          cacheData.delivery_driver,
          cacheData.delivery_bucket,
          cacheData.total_cost_usd,
          cacheData.ordered_at,
          cacheData.completed_at,
        ],
      );

      const duration = Date.now() - startTime;
      logger.info('Order cache stored', {
        orderId,
        orderType: cacheData.order_type,
        orderStatus: cacheData.order_status,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Order cache set failed', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      // Don't throw - caching is optional, API call already succeeded
    }
  }

  /**
   * Update cached order (for status changes)
   *
   * Updates specific fields in the cached order without replacing the entire entry.
   * Useful for status updates and partial refreshes.
   *
   * @param orderId - SkyFi order identifier
   * @param updates - Fields to update
   * @returns Promise that resolves when cache is updated
   *
   * @example
   * const cache = new OrdersCache();
   * await cache.update('order-123', {
   *   order_status: 'COMPLETED',
   *   completed_at: new Date(),
   * });
   */
  async update(orderId: string, updates: UpdateOrderCache): Promise<void> {
    const startTime = Date.now();

    try {
      // If updating order_status but not order_data, we need to fetch and update the JSONB
      let updatedOrderData = updates.order_data;

      if (updates.order_status !== undefined && updates.order_data === undefined) {
        // Fetch current order_data to update the status field within it
        const current = await query<OrderCache>(
          `SELECT order_data FROM orders_cache WHERE order_id = $1`,
          [orderId],
        );

        if (current.rows.length > 0 && current.rows[0]) {
          const currentData = current.rows[0].order_data as unknown as Record<string, unknown>;
          updatedOrderData = {
            ...currentData,
            status: updates.order_status,
          };
        }
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.order_status !== undefined) {
        updateFields.push(`order_status = $${paramIndex++}`);
        updateValues.push(updates.order_status);
      }

      if (updatedOrderData !== undefined) {
        updateFields.push(`order_data = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updatedOrderData));
      }

      if (updates.completed_at !== undefined) {
        updateFields.push(`completed_at = $${paramIndex++}`);
        updateValues.push(updates.completed_at);
      }

      // Always update last_synced_at
      updateFields.push(`last_synced_at = NOW()`);

      if (updateFields.length === 1) {
        // No actual updates besides last_synced_at
        logger.debug('Order cache update skipped - no changes', { orderId });
        return;
      }

      // Add orderId as the last parameter
      updateValues.push(orderId);

      const result = await query(
        `UPDATE orders_cache
         SET ${updateFields.join(', ')}
         WHERE order_id = $${paramIndex}`,
        updateValues,
      );

      const duration = Date.now() - startTime;
      if (result.rowCount > 0) {
        logger.info('Order cache updated', {
          orderId,
          fields: updateFields,
          durationMs: duration,
        });
      } else {
        logger.warn('Order cache update - order not found', {
          orderId,
          durationMs: duration,
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Order cache update failed', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      throw error;
    }
  }

  /**
   * List orders with optional filtering
   *
   * Retrieves orders from cache with support for filtering by type, status,
   * date range, and pagination.
   *
   * @param filters - Optional filter parameters
   * @returns Array of cached orders
   *
   * @example
   * const cache = new OrdersCache();
   * const orders = await cache.list({
   *   orderType: 'TASKING',
   *   orderStatus: 'COMPLETED',
   *   pageNumber: 0,
   *   pageSize: 10,
   * });
   */
  async list(filters?: OrderListFilters): Promise<OrderInfoResponse[]> {
    const startTime = Date.now();

    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Build WHERE clause from filters
      if (filters?.orderType) {
        conditions.push(`order_type = $${paramIndex++}`);
        params.push(filters.orderType);
      }

      if (filters?.orderStatus) {
        conditions.push(`order_status = $${paramIndex++}`);
        params.push(filters.orderStatus);
      }

      if (filters?.startDate) {
        conditions.push(`ordered_at >= $${paramIndex++}`);
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        conditions.push(`ordered_at <= $${paramIndex++}`);
        params.push(filters.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Build pagination
      const pageNumber = filters?.pageNumber ?? 0;
      const pageSize = filters?.pageSize ?? 10;
      const offset = pageNumber * pageSize;

      // Execute query
      const result = await query<OrderCache>(
        `SELECT * FROM orders_cache
         ${whereClause}
         ORDER BY ordered_at DESC NULLS LAST, created_at DESC
         LIMIT $${paramIndex++}
         OFFSET $${paramIndex++}`,
        [...params, pageSize, offset],
      );

      const duration = Date.now() - startTime;
      logger.info('Order cache list', {
        filters,
        resultCount: result.rows.length,
        durationMs: duration,
      });

      // Map to order data
      return result.rows.map((row) => row.order_data as unknown as OrderInfoResponse);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Order cache list failed', {
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      throw error;
    }
  }

  /**
   * Clear a specific order from cache
   *
   * Removes the cache entry for the given order ID.
   * Useful for forced cache invalidation.
   *
   * @param orderId - SkyFi order identifier
   * @returns Promise that resolves when cache is cleared
   *
   * @example
   * const cache = new OrdersCache();
   * await cache.clear('order-123');
   */
  async clear(orderId: string): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await query(
        `DELETE FROM orders_cache
         WHERE order_id = $1`,
        [orderId],
      );

      const duration = Date.now() - startTime;
      logger.info('Order cache entry cleared', {
        orderId,
        deleted: result.rowCount > 0,
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Order cache clear failed', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      throw error;
    }
  }

  /**
   * Clear all order cache entries
   *
   * Removes all cache entries from the orders_cache table.
   * Use with caution - this affects all cached orders.
   *
   * @returns Promise that resolves to number of entries cleared
   *
   * @example
   * const cache = new OrdersCache();
   * const cleared = await cache.clearAll();
   * console.log(`Cleared ${cleared} cache entries`);
   */
  async clearAll(): Promise<number> {
    const startTime = Date.now();

    try {
      const result = await query(`DELETE FROM orders_cache`);

      const duration = Date.now() - startTime;
      logger.warn('All order cache entries cleared', {
        entriesCleared: result.rowCount,
        durationMs: duration,
      });

      return result.rowCount;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Order cache clear all failed', {
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
   * entries by type and status.
   *
   * @returns Promise that resolves to cache statistics
   *
   * @example
   * const cache = new OrdersCache();
   * const stats = await cache.getStats();
   * console.log('Total orders:', stats.totalEntries);
   */
  async getStats(): Promise<{
    totalEntries: number;
    archiveOrders: number;
    taskingOrders: number;
    completedOrders: number;
    pendingOrders: number;
    lastSynced: Date | null;
  }> {
    try {
      // pg-mem doesn't support COUNT(*) FILTER syntax properly, so we use subqueries
      const result = await query<{
        total_entries: number;
        archive_orders: number;
        tasking_orders: number;
        completed_orders: number;
        pending_orders: number;
        last_synced: Date | null;
      }>(
        `SELECT
          COUNT(*) as total_entries,
          (SELECT COUNT(*) FROM orders_cache WHERE order_type = 'ARCHIVE') as archive_orders,
          (SELECT COUNT(*) FROM orders_cache WHERE order_type = 'TASKING') as tasking_orders,
          (SELECT COUNT(*) FROM orders_cache WHERE order_status = 'COMPLETED') as completed_orders,
          (SELECT COUNT(*) FROM orders_cache WHERE order_status = 'PENDING') as pending_orders,
          MAX(last_synced_at) as last_synced
         FROM orders_cache`,
      );

      const stats = result.rows[0];
      if (!stats) {
        return {
          totalEntries: 0,
          archiveOrders: 0,
          taskingOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          lastSynced: null,
        };
      }

      return {
        totalEntries: parseInt(stats.total_entries.toString(), 10),
        archiveOrders: parseInt(stats.archive_orders.toString(), 10),
        taskingOrders: parseInt(stats.tasking_orders.toString(), 10),
        completedOrders: parseInt(stats.completed_orders.toString(), 10),
        pendingOrders: parseInt(stats.pending_orders.toString(), 10),
        lastSynced: stats.last_synced,
      };
    } catch (error) {
      logger.error('Failed to get order cache stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

/**
 * Singleton instance of OrdersCache
 *
 * Use this for most operations to avoid creating multiple instances.
 */
export const ordersCache = new OrdersCache();
