-- Migration: 002_indexes
-- Description: Create indexes for query performance optimization
-- Created: 2025-11-15

-- ============================================================================
-- Archive Searches Indexes
-- ============================================================================

-- Primary lookup: Find cache entry by cache_key
-- This is the most common query pattern for cache lookups
CREATE INDEX IF NOT EXISTS idx_archive_searches_cache_key
  ON archive_searches(cache_key);

-- Cache expiration cleanup: Find expired entries for removal
-- Used by background cleanup jobs
CREATE INDEX IF NOT EXISTS idx_archive_searches_expires_at
  ON archive_searches(cache_expires_at);

-- Cache validity check: Find non-expired entries
-- Used to verify cache is still valid during lookups
CREATE INDEX IF NOT EXISTS idx_archive_searches_valid_cache
  ON archive_searches(cache_expires_at)
  WHERE cache_expires_at > NOW();

-- Temporal queries: Find caches by date range
CREATE INDEX IF NOT EXISTS idx_archive_searches_date_range
  ON archive_searches(start_date, end_date);

-- Product filtering: Find caches by product type
CREATE INDEX IF NOT EXISTS idx_archive_searches_product_type
  ON archive_searches(product_type);

-- JSONB queries: Index on response_data for flexible querying
-- Allows fast queries on JSONB fields within response_data
CREATE INDEX IF NOT EXISTS idx_archive_searches_response_data
  ON archive_searches USING gin(response_data);

-- Access tracking: Find most recently accessed caches
CREATE INDEX IF NOT EXISTS idx_archive_searches_last_accessed
  ON archive_searches(last_accessed_at DESC NULLS LAST);

COMMENT ON INDEX idx_archive_searches_cache_key IS 'Primary cache lookup by key';
COMMENT ON INDEX idx_archive_searches_expires_at IS 'Find expired cache entries for cleanup';
COMMENT ON INDEX idx_archive_searches_valid_cache IS 'Partial index for valid (non-expired) caches';

-- ============================================================================
-- Orders Cache Indexes
-- ============================================================================

-- Primary lookup: Find order by SkyFi order_id
-- Most common query pattern for order retrieval
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_cache_order_id
  ON orders_cache(order_id);

-- Status filtering: Find orders by status
-- Used for listing orders by status (PENDING, COMPLETED, etc.)
CREATE INDEX IF NOT EXISTS idx_orders_cache_status
  ON orders_cache(order_status);

-- Type filtering: Find orders by type (ARCHIVE vs TASKING)
CREATE INDEX IF NOT EXISTS idx_orders_cache_type
  ON orders_cache(order_type);

-- Combined type + status: Common filtering pattern
CREATE INDEX IF NOT EXISTS idx_orders_cache_type_status
  ON orders_cache(order_type, order_status);

-- Temporal queries: Find orders by creation date
CREATE INDEX IF NOT EXISTS idx_orders_cache_created_at
  ON orders_cache(created_at DESC);

-- Temporal queries: Find orders by order date
CREATE INDEX IF NOT EXISTS idx_orders_cache_ordered_at
  ON orders_cache(ordered_at DESC NULLS LAST);

-- User reference lookup: Find orders by user's reference ID
CREATE INDEX IF NOT EXISTS idx_orders_cache_user_reference
  ON orders_cache(user_reference)
  WHERE user_reference IS NOT NULL;

-- Product filtering: Find orders by product type
CREATE INDEX IF NOT EXISTS idx_orders_cache_product_type
  ON orders_cache(product_type);

-- Delivery driver filtering: Find orders by delivery method
CREATE INDEX IF NOT EXISTS idx_orders_cache_delivery_driver
  ON orders_cache(delivery_driver);

-- JSONB queries: Index on order_data for flexible querying
CREATE INDEX IF NOT EXISTS idx_orders_cache_order_data
  ON orders_cache USING gin(order_data);

-- Sync tracking: Find orders that need re-syncing from API
CREATE INDEX IF NOT EXISTS idx_orders_cache_last_synced
  ON orders_cache(last_synced_at ASC);

-- Active orders: Find orders that are still in progress
CREATE INDEX IF NOT EXISTS idx_orders_cache_active
  ON orders_cache(order_status, updated_at DESC)
  WHERE order_status IN ('PENDING', 'PROCESSING');

COMMENT ON INDEX idx_orders_cache_order_id IS 'Primary order lookup by SkyFi order ID';
COMMENT ON INDEX idx_orders_cache_type_status IS 'Combined index for filtering by type and status';
COMMENT ON INDEX idx_orders_cache_active IS 'Partial index for active (non-completed) orders';

-- ============================================================================
-- Feasibility Cache Indexes
-- ============================================================================

-- Primary lookup: Find cache entry by cache_key
CREATE INDEX IF NOT EXISTS idx_feasibility_cache_cache_key
  ON feasibility_cache(cache_key);

-- Cache expiration cleanup: Find expired entries for removal
CREATE INDEX IF NOT EXISTS idx_feasibility_cache_expires_at
  ON feasibility_cache(cache_expires_at);

-- Cache validity check: Find non-expired entries
CREATE INDEX IF NOT EXISTS idx_feasibility_cache_valid_cache
  ON feasibility_cache(cache_expires_at)
  WHERE cache_expires_at > NOW();

-- Temporal queries: Find caches by time window
CREATE INDEX IF NOT EXISTS idx_feasibility_cache_date_range
  ON feasibility_cache(start_date, end_date);

-- Product filtering: Find caches by product type
CREATE INDEX IF NOT EXISTS idx_feasibility_cache_product_type
  ON feasibility_cache(product_type);

-- Feasibility score filtering: Find high-feasibility results
CREATE INDEX IF NOT EXISTS idx_feasibility_cache_score
  ON feasibility_cache(feasibility_score DESC NULLS LAST);

-- Provider filtering: Find caches by providers
-- Uses GIN index for array containment queries
CREATE INDEX IF NOT EXISTS idx_feasibility_cache_providers
  ON feasibility_cache USING gin(providers);

-- JSONB queries: Index on response_data for flexible querying
CREATE INDEX IF NOT EXISTS idx_feasibility_cache_response_data
  ON feasibility_cache USING gin(response_data);

-- JSONB queries: Index on provider_windows for Planet provider_window_id queries
CREATE INDEX IF NOT EXISTS idx_feasibility_cache_provider_windows
  ON feasibility_cache USING gin(provider_windows);

-- Access tracking: Find most recently accessed caches
CREATE INDEX IF NOT EXISTS idx_feasibility_cache_last_accessed
  ON feasibility_cache(last_accessed_at DESC NULLS LAST);

COMMENT ON INDEX idx_feasibility_cache_cache_key IS 'Primary cache lookup by key';
COMMENT ON INDEX idx_feasibility_cache_expires_at IS 'Find expired cache entries for cleanup';
COMMENT ON INDEX idx_feasibility_cache_valid_cache IS 'Partial index for valid (non-expired) caches';
COMMENT ON INDEX idx_feasibility_cache_providers IS 'GIN index for provider array queries';

-- ============================================================================
-- Schema Migrations Index
-- ============================================================================

-- Ensure fast lookup of applied migrations
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version
  ON schema_migrations(version);

COMMENT ON INDEX idx_schema_migrations_version IS 'Fast lookup of migration status by version';

-- ============================================================================
-- Performance Notes
-- ============================================================================
--
-- Cache Key Lookups:
--   - All cache tables have indexes on cache_key for O(log n) lookup
--   - Cache keys are VARCHAR(64) SHA-256 hashes for consistent size
--
-- Cache Expiration:
--   - Indexes on cache_expires_at enable efficient cleanup queries
--   - Partial indexes on valid caches improve query performance
--
-- JSONB Indexes (GIN):
--   - Enable fast queries on JSON fields without full table scans
--   - Support containment queries (@>, ?, etc.)
--   - Trade-off: Larger index size, slower writes
--
-- Partial Indexes:
--   - Used for common filtered queries (valid caches, active orders)
--   - Smaller index size, faster queries for specific conditions
--
-- Composite Indexes:
--   - Created for common multi-column query patterns
--   - Order matters: most selective column first
--
-- ============================================================================
-- Record migration
-- ============================================================================
INSERT INTO schema_migrations (version, description)
VALUES ('002_indexes', 'Create performance indexes for all cache tables')
ON CONFLICT (version) DO NOTHING;
