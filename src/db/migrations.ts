/**
 * Database Migration Runner
 *
 * Manages database migrations with support for:
 * - Running migrations in order
 * - Tracking which migrations have been applied
 * - Rolling back migrations (down)
 * - Creating new migration files
 *
 * Migration files are stored in the migrations/ directory
 * and are named with a version prefix (e.g., 001_initial_schema.sql)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import type { DatabaseConfig, SchemaMigration } from './schema.js';
import { logger } from '../lib/logger.js';

const { Pool } = pg;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration file information
 */
interface MigrationFile {
  /** Version identifier (e.g., '001_initial_schema') */
  version: string;

  /** Full file path */
  filePath: string;

  /** File name */
  fileName: string;

  /** Migration description extracted from version */
  description: string;
}

/**
 * Migration runner class
 */
export class MigrationRunner {
  private pool: pg.Pool;

  private migrationsDir: string;

  /**
   * Create a new migration runner
   * @param config Database configuration
   * @param migrationsDir Path to migrations directory (default: ./migrations)
   */
  constructor(
    config: DatabaseConfig,
    migrationsDir?: string,
  ) {
    this.pool = new Pool(config);

    // Default migrations directory is at project root
    this.migrationsDir = migrationsDir || path.join(__dirname, '../../migrations');
  }

  /**
   * Initialize the migrations tracking table
   * This must be run before any migrations can be applied
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          description TEXT
        )
      `);

      logger.info('Migration tracking table initialized');
    } catch (error) {
      logger.error('Failed to initialize migration tracking table', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all migration files from the migrations directory
   * @returns Array of migration files sorted by version
   */
  async getMigrationFiles(): Promise<MigrationFile[]> {
    try {
      const files = await fs.readdir(this.migrationsDir);

      // Filter for .sql files and parse version
      const migrations = files
        .filter((file) => file.endsWith('.sql'))
        .map((fileName) => {
          const version = fileName.replace('.sql', '');
          const description = version.replace(/^\d+_/, '').replace(/_/g, ' ');

          return {
            version,
            fileName,
            filePath: path.join(this.migrationsDir, fileName),
            description,
          };
        })
        // Sort by version (numeric prefix)
        .sort((a, b) => {
          const aNum = parseInt(a.version.split('_')[0], 10);
          const bNum = parseInt(b.version.split('_')[0], 10);
          return aNum - bNum;
        });

      return migrations;
    } catch (error) {
      logger.error('Failed to read migration files', { error, dir: this.migrationsDir });
      throw error;
    }
  }

  /**
   * Get list of applied migrations from the database
   * @returns Array of applied migration versions
   */
  async getAppliedMigrations(): Promise<SchemaMigration[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query<SchemaMigration>(
        'SELECT * FROM schema_migrations ORDER BY version ASC',
      );

      return result.rows;
    } catch (error) {
      // If table doesn't exist, return empty array
      if ((error as { code?: string }).code === '42P01') {
        return [];
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get list of pending (not yet applied) migrations
   * @returns Array of migration files that haven't been applied
   */
  async getPendingMigrations(): Promise<MigrationFile[]> {
    const allMigrations = await this.getMigrationFiles();
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map((m) => m.version));

    return allMigrations.filter((m) => !appliedVersions.has(m.version));
  }

  /**
   * Run a single migration file
   * @param migration Migration file to run
   */
  async runMigration(migration: MigrationFile): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Read migration file
      const sql = await fs.readFile(migration.filePath, 'utf-8');

      logger.info('Running migration', {
        version: migration.version,
        description: migration.description,
      });

      // Begin transaction
      await client.query('BEGIN');

      try {
        // Execute migration SQL
        await client.query(sql);

        // Record migration in tracking table
        // (Note: migration file itself inserts into schema_migrations,
        // but we do it here as well for safety in case it's missing)
        await client.query(
          `
          INSERT INTO schema_migrations (version, description)
          VALUES ($1, $2)
          ON CONFLICT (version) DO NOTHING
        `,
          [migration.version, migration.description],
        );

        // Commit transaction
        await client.query('COMMIT');

        logger.info('Migration completed', { version: migration.version });
      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Migration failed', {
        version: migration.version,
        error,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   * @returns Number of migrations applied
   */
  async up(): Promise<number> {
    // Ensure tracking table exists
    await this.initialize();

    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      logger.info('No pending migrations');
      return 0;
    }

    logger.info('Running pending migrations', { count: pending.length });

    for (const migration of pending) {
      await this.runMigration(migration);
    }

    logger.info('All migrations completed', { count: pending.length });
    return pending.length;
  }

  /**
   * Rollback the last applied migration
   * Note: This requires a corresponding down migration file
   * (e.g., 001_initial_schema.down.sql)
   *
   * @returns True if a migration was rolled back, false if none to rollback
   */
  async down(): Promise<boolean> {
    const applied = await this.getAppliedMigrations();

    if (applied.length === 0) {
      logger.info('No migrations to rollback');
      return false;
    }

    // Get the last applied migration
    const lastMigration = applied[applied.length - 1];

    // Look for corresponding down migration file
    const downFileName = `${lastMigration.version}.down.sql`;
    const downFilePath = path.join(this.migrationsDir, downFileName);

    try {
      await fs.access(downFilePath);
    } catch {
      logger.error('Down migration file not found', {
        version: lastMigration.version,
        expectedFile: downFileName,
      });
      throw new Error(
        `Down migration file not found: ${downFileName}. ` +
          'Create a .down.sql file to rollback this migration.',
      );
    }

    const client = await this.pool.connect();

    try {
      // Read down migration file
      const sql = await fs.readFile(downFilePath, 'utf-8');

      logger.info('Rolling back migration', {
        version: lastMigration.version,
      });

      // Begin transaction
      await client.query('BEGIN');

      try {
        // Execute down migration SQL
        await client.query(sql);

        // Remove migration from tracking table
        await client.query(
          'DELETE FROM schema_migrations WHERE version = $1',
          [lastMigration.version],
        );

        // Commit transaction
        await client.query('COMMIT');

        logger.info('Migration rolled back', { version: lastMigration.version });
        return true;
      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Rollback failed', {
        version: lastMigration.version,
        error,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get current migration status
   * @returns Migration status information
   */
  async status(): Promise<{
    applied: SchemaMigration[];
    pending: MigrationFile[];
    total: number;
  }> {
    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();
    const allMigrations = await this.getMigrationFiles();

    return {
      applied,
      pending,
      total: allMigrations.length,
    };
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Create a new migration file
 * @param name Migration name (e.g., 'add_user_table')
 * @param migrationsDir Path to migrations directory
 * @returns Path to the created migration file
 */
export async function createMigration(
  name: string,
  migrationsDir?: string,
): Promise<string> {
  const dir = migrationsDir || path.join(__dirname, '../../migrations');

  // Get list of existing migrations to determine next version number
  const files = await fs.readdir(dir);
  const migrationFiles = files.filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'));

  // Find highest version number
  let nextVersion = 1;
  for (const file of migrationFiles) {
    const match = file.match(/^(\d+)_/);
    if (match) {
      const version = parseInt(match[1], 10);
      if (version >= nextVersion) {
        nextVersion = version + 1;
      }
    }
  }

  // Format version with leading zeros
  const versionStr = String(nextVersion).padStart(3, '0');
  const fileName = `${versionStr}_${name}.sql`;
  const filePath = path.join(dir, fileName);

  // Create migration file template
  const template = `-- Migration: ${versionStr}_${name}
-- Description: ${name.replace(/_/g, ' ')}
-- Created: ${new Date().toISOString().split('T')[0]}

-- Add your migration SQL here

-- ============================================================================
-- Record migration
-- ============================================================================
INSERT INTO schema_migrations (version, description)
VALUES ('${versionStr}_${name}', '${name.replace(/_/g, ' ')}')
ON CONFLICT (version) DO NOTHING;
`;

  await fs.writeFile(filePath, template, 'utf-8');

  logger.info('Migration file created', { path: filePath });
  return filePath;
}

/**
 * Get database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'skyfi_mcp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '2000', 10),
    ssl: process.env.DB_SSL === 'true',
  };
}

/**
 * CLI entry point for migration commands
 * Usage: node dist/db/migrations.js [up|down|status|create <name>]
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  const config = getDatabaseConfig();
  const runner = new MigrationRunner(config);

  (async () => {
    try {
      switch (command) {
        case 'up':
          {
            const count = await runner.up();
            console.log(`Applied ${count} migration(s)`);
          }
          break;

        case 'down':
          {
            const rolled = await runner.down();
            console.log(rolled ? 'Rolled back 1 migration' : 'No migrations to rollback');
          }
          break;

        case 'status':
          {
            const status = await runner.status();
            console.log('Migration Status:');
            console.log(`  Total migrations: ${status.total}`);
            console.log(`  Applied: ${status.applied.length}`);
            console.log(`  Pending: ${status.pending.length}`);

            if (status.pending.length > 0) {
              console.log('\nPending migrations:');
              status.pending.forEach((m) => console.log(`  - ${m.version}: ${m.description}`));
            }
          }
          break;

        case 'create':
          {
            const name = process.argv[3];
            if (!name) {
              console.error('Error: Migration name required');
              console.log('Usage: npm run migrate:create <name>');
              process.exit(1);
            }
            const filePath = await createMigration(name);
            console.log(`Created migration: ${filePath}`);
          }
          break;

        default:
          console.log('Usage: npm run migrate:[up|down|status]');
          console.log('       npm run migrate:create <name>');
          process.exit(1);
      }

      await runner.close();
      process.exit(0);
    } catch (error) {
      console.error('Migration error:', error);
      await runner.close();
      process.exit(1);
    }
  })();
}
