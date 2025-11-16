-- Migration: 001_initial_schema
-- Description: Initial database schema for SkyFi MCP caching layer
-- Created: 2025-11-15

-- Create migrations tracking table (if not exists)
-- This table tracks which migrations have been applied
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  description TEXT
);

-- Comment on migrations table
COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations';
COMMENT ON COLUMN schema_migrations.version IS 'Unique migration version identifier (e.g., 001_initial_schema)';
COMMENT ON COLUMN schema_migrations.applied_at IS 'Timestamp when migration was applied';

-- ============================================================================
-- Archive Searches Cache Table
-- ============================================================================
-- Caches archive search results to reduce API calls to SkyFi
-- TTL: 24 hours (searches change as new imagery becomes available)
CREATE TABLE IF NOT EXISTS archive_searches (
  id SERIAL PRIMARY KEY,

  -- Cache key is a deterministic hash of search parameters
  -- Includes: AOI polygon, date range, product type, resolution, cloud coverage, filters
  cache_key VARCHAR(64) NOT NULL UNIQUE,

  -- Search parameters stored for debugging and cache invalidation
  aoi_wkt TEXT,  -- Well-Known Text format of Area of Interest
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  product_type VARCHAR(50),
  resolution VARCHAR(50),
  max_cloud_coverage INTEGER,
  open_data_only BOOLEAN DEFAULT FALSE,

  -- Cached response data from SkyFi API
  -- Stored as JSONB for flexible querying and indexing
  response_data JSONB NOT NULL,

  -- Number of results in the cached response
  result_count INTEGER NOT NULL DEFAULT 0,

  -- Cache metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- TTL: Cache expires after 24 hours
  cache_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Track cache hits for metrics
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Comments for archive_searches table
COMMENT ON TABLE archive_searches IS 'Caches archive search results with 24-hour TTL';
COMMENT ON COLUMN archive_searches.cache_key IS 'SHA-256 hash of normalized search parameters';
COMMENT ON COLUMN archive_searches.aoi_wkt IS 'Area of Interest in WKT format (for debugging)';
COMMENT ON COLUMN archive_searches.response_data IS 'Complete SkyFi API response stored as JSONB';
COMMENT ON COLUMN archive_searches.result_count IS 'Number of imagery results in response';
COMMENT ON COLUMN archive_searches.cache_expires_at IS 'Expiration timestamp (24 hours from creation)';
COMMENT ON COLUMN archive_searches.hit_count IS 'Number of times this cache entry was used';

-- ============================================================================
-- Orders Cache Table
-- ============================================================================
-- Caches order information (both archive and tasking orders)
-- No TTL: Orders are immutable once created and should be cached indefinitely
CREATE TABLE IF NOT EXISTS orders_cache (
  id SERIAL PRIMARY KEY,

  -- SkyFi order ID (unique identifier from API)
  order_id VARCHAR(255) NOT NULL UNIQUE,

  -- Order type: ARCHIVE or TASKING
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('ARCHIVE', 'TASKING')),

  -- Order status: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
  order_status VARCHAR(50) NOT NULL,

  -- Complete order data from SkyFi API
  order_data JSONB NOT NULL,

  -- Extracted fields for filtering and querying
  user_reference VARCHAR(255),  -- User-provided reference ID
  aoi_wkt TEXT,  -- Area of Interest
  product_type VARCHAR(50),
  resolution VARCHAR(50),

  -- Delivery configuration
  delivery_driver VARCHAR(20),  -- S3, GS, AZURE
  delivery_bucket VARCHAR(255),

  -- Pricing information
  total_cost_usd DECIMAL(10, 2),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Order date from SkyFi (when order was placed)
  ordered_at TIMESTAMP WITH TIME ZONE,

  -- Completion/delivery date
  completed_at TIMESTAMP WITH TIME ZONE,

  -- No cache_expires_at - orders cached indefinitely
  -- Status updates will refresh the cache entry

  -- Track when this cache entry was last updated from API
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Comments for orders_cache table
COMMENT ON TABLE orders_cache IS 'Caches order information indefinitely (no TTL)';
COMMENT ON COLUMN orders_cache.order_id IS 'Unique SkyFi order identifier';
COMMENT ON COLUMN orders_cache.order_type IS 'Type of order: ARCHIVE or TASKING';
COMMENT ON COLUMN orders_cache.order_status IS 'Current order status from SkyFi API';
COMMENT ON COLUMN orders_cache.order_data IS 'Complete order details stored as JSONB';
COMMENT ON COLUMN orders_cache.total_cost_usd IS 'Total order cost in USD';
COMMENT ON COLUMN orders_cache.last_synced_at IS 'Last time order data was refreshed from API';

-- ============================================================================
-- Feasibility Cache Table
-- ============================================================================
-- Caches feasibility check and pass prediction results
-- TTL: 24 hours (satellite positions and opportunities change)
CREATE TABLE IF NOT EXISTS feasibility_cache (
  id SERIAL PRIMARY KEY,

  -- Cache key is a deterministic hash of feasibility parameters
  -- Includes: AOI polygon, time window, product type, resolution, providers
  cache_key VARCHAR(64) NOT NULL UNIQUE,

  -- Feasibility parameters stored for debugging
  aoi_wkt TEXT,  -- Well-Known Text format of Area of Interest
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  product_type VARCHAR(50),
  resolution VARCHAR(50),
  providers TEXT[],  -- Array of provider names (PLANET, UMBRA, etc.)

  -- Cached response data from SkyFi API
  response_data JSONB NOT NULL,

  -- Extracted feasibility metrics
  feasibility_score DECIMAL(3, 2),  -- Score from 0.00 to 1.00
  pass_count INTEGER,  -- Number of pass opportunities

  -- Provider-specific data (for Planet provider_window_id support)
  provider_windows JSONB,  -- Array of provider window opportunities

  -- Cache metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- TTL: Cache expires after 24 hours
  cache_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Track cache hits for metrics
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Comments for feasibility_cache table
COMMENT ON TABLE feasibility_cache IS 'Caches feasibility check results with 24-hour TTL';
COMMENT ON COLUMN feasibility_cache.cache_key IS 'SHA-256 hash of normalized feasibility parameters';
COMMENT ON COLUMN feasibility_cache.aoi_wkt IS 'Area of Interest in WKT format';
COMMENT ON COLUMN feasibility_cache.response_data IS 'Complete feasibility response as JSONB';
COMMENT ON COLUMN feasibility_cache.feasibility_score IS 'Overall feasibility score (0-1)';
COMMENT ON COLUMN feasibility_cache.pass_count IS 'Number of satellite pass opportunities';
COMMENT ON COLUMN feasibility_cache.provider_windows IS 'Provider-specific pass windows with provider_window_id';
COMMENT ON COLUMN feasibility_cache.cache_expires_at IS 'Expiration timestamp (24 hours from creation)';

-- ============================================================================
-- Triggers for automatic timestamp updates
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for archive_searches
CREATE TRIGGER update_archive_searches_updated_at
  BEFORE UPDATE ON archive_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for orders_cache
CREATE TRIGGER update_orders_cache_updated_at
  BEFORE UPDATE ON orders_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for feasibility_cache
CREATE TRIGGER update_feasibility_cache_updated_at
  BEFORE UPDATE ON feasibility_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Record migration
-- ============================================================================
INSERT INTO schema_migrations (version, description)
VALUES ('001_initial_schema', 'Initial database schema with archive_searches, orders_cache, and feasibility_cache tables')
ON CONFLICT (version) DO NOTHING;
