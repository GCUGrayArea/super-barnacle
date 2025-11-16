/**
 * Database Schema Type Definitions
 *
 * TypeScript interfaces representing the Postgres database schema
 * for the SkyFi MCP caching layer.
 *
 * Tables:
 * - schema_migrations: Migration tracking
 * - archive_searches: Cache for archive search results (24h TTL)
 * - orders_cache: Cache for order information (no TTL)
 * - feasibility_cache: Cache for feasibility results (24h TTL)
 */

// ============================================================================
// Schema Migrations Table
// ============================================================================

/**
 * Tracks which database migrations have been applied
 */
export interface SchemaMigration {
  id: number;
  version: string;
  applied_at: Date;
  description: string | null;
}

// ============================================================================
// Archive Searches Cache
// ============================================================================

/**
 * Cache entry for archive search results
 * TTL: 24 hours
 */
export interface ArchiveSearchCache {
  id: number;

  /** SHA-256 hash of normalized search parameters */
  cache_key: string;

  /** Area of Interest in Well-Known Text format */
  aoi_wkt: string | null;

  /** Start of date range for search */
  start_date: Date | null;

  /** End of date range for search */
  end_date: Date | null;

  /** Product type filter (e.g., 'OPTICAL', 'SAR') */
  product_type: string | null;

  /** Resolution filter (e.g., 'HIGH', 'MEDIUM', 'LOW') */
  resolution: string | null;

  /** Maximum cloud coverage percentage (0-100) */
  max_cloud_coverage: number | null;

  /** Whether to filter to open data only */
  open_data_only: boolean;

  /** Complete SkyFi API response stored as JSONB */
  response_data: Record<string, unknown>;

  /** Number of imagery results in the response */
  result_count: number;

  /** Timestamp when cache entry was created */
  created_at: Date;

  /** Timestamp when cache entry was last updated */
  updated_at: Date;

  /** Timestamp when cache entry expires (24 hours from creation) */
  cache_expires_at: Date;

  /** Number of times this cache entry has been accessed */
  hit_count: number;

  /** Timestamp when cache entry was last accessed */
  last_accessed_at: Date | null;
}

/**
 * Input parameters for creating an archive search cache entry
 */
export interface CreateArchiveSearchCache {
  cache_key: string;
  aoi_wkt?: string;
  start_date?: Date;
  end_date?: Date;
  product_type?: string;
  resolution?: string;
  max_cloud_coverage?: number;
  open_data_only?: boolean;
  response_data: Record<string, unknown>;
  result_count: number;
  cache_expires_at: Date;
}

// ============================================================================
// Orders Cache
// ============================================================================

/**
 * Order type enumeration
 */
export type OrderType = 'ARCHIVE' | 'TASKING';

/**
 * Order status enumeration
 */
export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Delivery driver enumeration
 */
export type DeliveryDriver = 'S3' | 'GS' | 'AZURE';

/**
 * Cache entry for order information
 * No TTL - orders cached indefinitely
 */
export interface OrderCache {
  id: number;

  /** Unique SkyFi order identifier */
  order_id: string;

  /** Type of order: ARCHIVE or TASKING */
  order_type: OrderType;

  /** Current order status */
  order_status: OrderStatus;

  /** Complete order details stored as JSONB */
  order_data: Record<string, unknown>;

  /** User-provided reference ID (optional) */
  user_reference: string | null;

  /** Area of Interest in Well-Known Text format */
  aoi_wkt: string | null;

  /** Product type (e.g., 'OPTICAL', 'SAR') */
  product_type: string | null;

  /** Resolution (e.g., 'HIGH', 'MEDIUM', 'LOW') */
  resolution: string | null;

  /** Delivery driver (S3, GS, AZURE) */
  delivery_driver: string | null;

  /** Delivery bucket/container name */
  delivery_bucket: string | null;

  /** Total order cost in USD */
  total_cost_usd: number | null;

  /** Timestamp when cache entry was created */
  created_at: Date;

  /** Timestamp when cache entry was last updated */
  updated_at: Date;

  /** Timestamp when order was placed with SkyFi */
  ordered_at: Date | null;

  /** Timestamp when order was completed/delivered */
  completed_at: Date | null;

  /** Last time order data was refreshed from SkyFi API */
  last_synced_at: Date;
}

/**
 * Input parameters for creating an order cache entry
 */
export interface CreateOrderCache {
  order_id: string;
  order_type: OrderType;
  order_status: OrderStatus;
  order_data: Record<string, unknown>;
  user_reference?: string;
  aoi_wkt?: string;
  product_type?: string;
  resolution?: string;
  delivery_driver?: string;
  delivery_bucket?: string;
  total_cost_usd?: number;
  ordered_at?: Date;
  completed_at?: Date;
}

/**
 * Input parameters for updating an order cache entry
 */
export interface UpdateOrderCache {
  order_status?: OrderStatus;
  order_data?: Record<string, unknown>;
  completed_at?: Date;
}

// ============================================================================
// Feasibility Cache
// ============================================================================

/**
 * Cache entry for feasibility check results
 * TTL: 24 hours
 */
export interface FeasibilityCache {
  id: number;

  /** SHA-256 hash of normalized feasibility parameters */
  cache_key: string;

  /** Area of Interest in Well-Known Text format */
  aoi_wkt: string | null;

  /** Start of time window for feasibility check */
  start_date: Date | null;

  /** End of time window for feasibility check */
  end_date: Date | null;

  /** Product type (e.g., 'OPTICAL', 'SAR') */
  product_type: string | null;

  /** Resolution (e.g., 'HIGH', 'MEDIUM', 'LOW') */
  resolution: string | null;

  /** Array of provider names (e.g., ['PLANET', 'UMBRA']) */
  providers: string[] | null;

  /** Complete feasibility response stored as JSONB */
  response_data: Record<string, unknown>;

  /** Overall feasibility score (0.00 to 1.00) */
  feasibility_score: number | null;

  /** Number of satellite pass opportunities */
  pass_count: number | null;

  /** Provider-specific pass windows with provider_window_id */
  provider_windows: Record<string, unknown> | null;

  /** Timestamp when cache entry was created */
  created_at: Date;

  /** Timestamp when cache entry was last updated */
  updated_at: Date;

  /** Timestamp when cache entry expires (24 hours from creation) */
  cache_expires_at: Date;

  /** Number of times this cache entry has been accessed */
  hit_count: number;

  /** Timestamp when cache entry was last accessed */
  last_accessed_at: Date | null;
}

/**
 * Input parameters for creating a feasibility cache entry
 */
export interface CreateFeasibilityCache {
  cache_key: string;
  aoi_wkt?: string;
  start_date?: Date;
  end_date?: Date;
  product_type?: string;
  resolution?: string;
  providers?: string[];
  response_data: Record<string, unknown>;
  feasibility_score?: number;
  pass_count?: number;
  provider_windows?: Record<string, unknown>;
  cache_expires_at: Date;
}

// ============================================================================
// Database Configuration
// ============================================================================

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /** Postgres host (default: localhost) */
  host: string;

  /** Postgres port (default: 5432) */
  port: number;

  /** Database name */
  database: string;

  /** Database user */
  user: string;

  /** Database password */
  password: string;

  /** Maximum number of clients in the connection pool (default: 10) */
  max?: number;

  /** Idle timeout in milliseconds (default: 30000) */
  idleTimeoutMillis?: number;

  /** Connection timeout in milliseconds (default: 2000) */
  connectionTimeoutMillis?: number;

  /** Enable SSL/TLS (default: false for local, true for production) */
  ssl?: boolean | { rejectUnauthorized: boolean };
}

// ============================================================================
// Query Result Types
// ============================================================================

/**
 * Result of a cache lookup operation
 */
export interface CacheLookupResult<T> {
  /** Whether the cache key was found */
  hit: boolean;

  /** The cached data (if hit is true) */
  data?: T;

  /** Whether the cache entry has expired */
  expired?: boolean;
}

/**
 * Statistics about cache performance
 */
export interface CacheStats {
  /** Total number of cache entries */
  total_entries: number;

  /** Number of expired cache entries */
  expired_entries: number;

  /** Total number of cache hits across all entries */
  total_hits: number;

  /** Average hit count per entry */
  avg_hits_per_entry: number;

  /** Most recently accessed cache entry */
  last_accessed: Date | null;
}
