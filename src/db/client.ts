/**
 * PostgreSQL Database Client
 *
 * Provides connection pooling and database access for the SkyFi MCP caching layer.
 * Supports configuration via DATABASE_URL or individual environment variables.
 *
 * @packageDocumentation
 */

import { Pool, PoolClient, PoolConfig, QueryResultRow } from 'pg';
import { logger } from '../lib/logger.js';
import type { DatabaseConfig } from './schema.js';

/**
 * Global connection pool instance
 */
let pool: Pool | null = null;

/**
 * Flag to track if pool is shutting down
 */
let isShuttingDown = false;

/**
 * Get database configuration from environment variables
 *
 * Supports two configuration methods:
 * 1. DATABASE_URL connection string
 * 2. Individual variables: POSTGRES_HOST, POSTGRES_PORT, etc.
 *
 * @returns Database configuration object
 */
export function getDatabaseConfig(): DatabaseConfig {
  const env = process.env;

  // Check for DATABASE_URL first
  if (env['DATABASE_URL']) {
    const url = new URL(env['DATABASE_URL']);

    return {
      host: url.hostname,
      port: parseInt(url.port || '5432', 10),
      database: url.pathname.slice(1), // Remove leading slash
      user: url.username,
      password: url.password,
      max: parseInt(env['POSTGRES_MAX_CONNECTIONS'] || '10', 10),
      idleTimeoutMillis: parseInt(env['POSTGRES_IDLE_TIMEOUT'] || '30000', 10),
      connectionTimeoutMillis: parseInt(env['POSTGRES_CONNECTION_TIMEOUT'] || '2000', 10),
      ssl: env['POSTGRES_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
    };
  }

  // Fall back to individual environment variables
  return {
    host: env['POSTGRES_HOST'] || 'localhost',
    port: parseInt(env['POSTGRES_PORT'] || '5432', 10),
    database: env['POSTGRES_DB'] || 'skyfi_mcp',
    user: env['POSTGRES_USER'] || 'postgres',
    password: env['POSTGRES_PASSWORD'] || '',
    max: parseInt(env['POSTGRES_MAX_CONNECTIONS'] || '10', 10),
    idleTimeoutMillis: parseInt(env['POSTGRES_IDLE_TIMEOUT'] || '30000', 10),
    connectionTimeoutMillis: parseInt(env['POSTGRES_CONNECTION_TIMEOUT'] || '2000', 10),
    ssl: env['POSTGRES_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
  };
}

/**
 * Create and configure a new connection pool
 *
 * @param config - Optional database configuration (defaults to env vars)
 * @returns Configured Pool instance
 */
function createPool(config?: DatabaseConfig): Pool {
  const dbConfig = config || getDatabaseConfig();

  const poolConfig: PoolConfig = {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    max: dbConfig.max || 10,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis || 2000,
    ssl: dbConfig.ssl || false,
  };

  const newPool = new Pool(poolConfig);

  // Log pool errors
  newPool.on('error', (err) => {
    logger.error('Unexpected error on idle client', {
      error: err.message,
      stack: err.stack,
    });
  });

  // Log pool connection events
  newPool.on('connect', () => {
    logger.debug('New client connected to database pool');
  });

  newPool.on('remove', () => {
    logger.debug('Client removed from database pool');
  });

  logger.info('Database connection pool created', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    maxConnections: poolConfig.max,
  });

  return newPool;
}

/**
 * Get the database connection pool
 *
 * Creates a new pool if one doesn't exist or if the existing pool is shutting down.
 * The pool is a singleton to ensure efficient connection reuse.
 *
 * @param config - Optional database configuration
 * @returns Pool instance for database operations
 */
export function getPool(config?: DatabaseConfig): Pool {
  if (!pool || isShuttingDown) {
    pool = createPool(config);
    isShuttingDown = false;
  }
  return pool;
}

/**
 * Get a client from the connection pool
 *
 * The client must be released back to the pool using client.release()
 * when done. Consider using query() or transaction() instead for
 * automatic client management.
 *
 * @returns Promise resolving to a PoolClient
 * @throws Error if unable to connect to database
 *
 * @example
 * const client = await getClient();
 * try {
 *   await client.query('SELECT * FROM archive_searches');
 * } finally {
 *   client.release();
 * }
 */
export async function getClient(): Promise<PoolClient> {
  try {
    const client = await getPool().connect();
    logger.debug('Client acquired from pool');
    return client;
  } catch (error) {
    logger.error('Failed to get database client', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Execute a query using the connection pool
 *
 * Automatically handles client acquisition and release.
 * For multiple queries, consider using transaction() instead.
 *
 * @param text - SQL query text
 * @param params - Query parameters (optional)
 * @returns Promise resolving to query result
 * @throws Error if query fails
 *
 * @example
 * const result = await query(
 *   'SELECT * FROM archive_searches WHERE cache_key = $1',
 *   ['abc123']
 * );
 */
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  const startTime = Date.now();
  const client = await getClient();

  try {
    const result = await client.query<T>(text, params);
    const duration = Date.now() - startTime;

    logger.debug('Query executed', {
      query: text.substring(0, 100),
      rowCount: result.rowCount,
      durationMs: duration,
    });

    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Query failed', {
      query: text.substring(0, 100),
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute multiple queries in a transaction
 *
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 * If the callback throws an error, the transaction is rolled back.
 *
 * @param callback - Function that executes queries using the provided client
 * @returns Promise resolving to the callback's return value
 * @throws Error if transaction fails
 *
 * @example
 * const result = await transaction(async (client) => {
 *   await client.query('INSERT INTO archive_searches ...');
 *   await client.query('UPDATE archive_searches ...');
 *   return { success: true };
 * });
 */
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();
  const startTime = Date.now();

  try {
    await client.query('BEGIN');
    logger.debug('Transaction started');

    const result = await callback(client);

    await client.query('COMMIT');
    const duration = Date.now() - startTime;
    logger.debug('Transaction committed', { durationMs: duration });

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    const duration = Date.now() - startTime;
    logger.error('Transaction rolled back', {
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if the database connection is healthy
 *
 * Performs a simple query to verify connectivity.
 * Used for health checks and monitoring.
 *
 * @returns Promise resolving to true if healthy, false otherwise
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health');
    return result.rows.length === 1 && result.rows[0].health === 1;
  } catch (error) {
    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Get pool statistics for monitoring
 *
 * @returns Pool statistics including total, idle, and waiting client counts
 */
export function getPoolStats() {
  const currentPool = pool;
  if (!currentPool) {
    return {
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0,
    };
  }

  return {
    totalCount: currentPool.totalCount,
    idleCount: currentPool.idleCount,
    waitingCount: currentPool.waitingCount,
  };
}

/**
 * Gracefully close the database connection pool
 *
 * Waits for all active clients to finish and then closes the pool.
 * Should be called during application shutdown.
 *
 * @returns Promise that resolves when pool is closed
 */
export async function closePool(): Promise<void> {
  if (!pool) {
    logger.debug('No pool to close');
    return;
  }

  isShuttingDown = true;
  logger.info('Closing database connection pool');

  try {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  } catch (error) {
    logger.error('Error closing database pool', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Set up graceful shutdown handlers
 *
 * Automatically closes the pool on process exit signals.
 * Call this once during application initialization.
 */
export function setupShutdownHandlers(): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, closing database connections`);
    try {
      await closePool();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
