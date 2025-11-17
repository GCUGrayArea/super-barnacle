/**
 * PG-Mem Schema Helper
 *
 * Helper functions for setting up database schema in pg-mem for tests.
 * pg-mem doesn't support all PostgreSQL features (like COMMENT ON statements),
 * so we need to strip those out before executing migrations.
 */

import fs from 'fs/promises';
import path from 'path';
import type { IMemoryDb } from 'pg-mem';

/**
 * Strips unsupported SQL statements from migration files for pg-mem compatibility
 *
 * pg-mem doesn't support:
 * - COMMENT ON TABLE/COLUMN statements
 * - CREATE TRIGGER statements (use EXECUTE FUNCTION syntax)
 * - DECIMAL(precision, scale) - only supports DECIMAL without params
 * - PL/pgSQL functions (CREATE FUNCTION...LANGUAGE plpgsql)
 * - Some other advanced PostgreSQL features
 *
 * @param sql - The raw SQL migration content
 * @returns SQL with unsupported statements removed
 */
export function stripUnsupportedStatements(sql: string): string {
  let result = sql;

  // Remove all COMMENT ON statements
  result = result.replace(/COMMENT ON [^;]+;/gs, '');

  // Remove PL/pgSQL functions
  // Functions look like:
  // CREATE OR REPLACE FUNCTION name()
  // RETURNS type AS $$
  // ...
  // $$ LANGUAGE plpgsql;
  result = result.replace(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+[^$]*\$\$[^$]*\$\$\s*LANGUAGE\s+plpgsql\s*;/gis, '');

  // Remove CREATE TRIGGER statements
  // Triggers look like:
  // CREATE TRIGGER trigger_name
  //   BEFORE UPDATE ON table_name
  //   FOR EACH ROW
  //   EXECUTE FUNCTION function_name();
  result = result.replace(/CREATE TRIGGER [^;]+;/gs, '');

  // Replace DECIMAL(precision, scale) with just DECIMAL
  // pg-mem doesn't support precision/scale parameters
  result = result.replace(/DECIMAL\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, 'DECIMAL');

  // Clean up any excessive blank lines that might result
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

/**
 * Loads a migration file and executes it in pg-mem, stripping unsupported statements
 *
 * @param db - The pg-mem database instance
 * @param migrationFileName - Name of migration file (e.g., '001_initial_schema.sql')
 * @returns Promise that resolves when migration is complete
 */
export async function loadMigrationForPgMem(
  db: IMemoryDb,
  migrationFileName: string,
): Promise<void> {
  const migrationsPath = path.join(process.cwd(), 'migrations', migrationFileName);
  const rawSql = await fs.readFile(migrationsPath, 'utf-8');
  const compatibleSql = stripUnsupportedStatements(rawSql);

  // Debug: uncomment to see filtered SQL
  // console.log('=== FILTERED SQL ===');
  // console.log(compatibleSql);
  // console.log('=== END FILTERED SQL ===');

  // Execute the compatible SQL
  await db.public.none(compatibleSql);
}

/**
 * Sets up the initial database schema for cache tests
 *
 * @param db - The pg-mem database instance
 * @returns Promise that resolves when schema is set up
 */
export async function setupCacheTestSchema(db: IMemoryDb): Promise<void> {
  await loadMigrationForPgMem(db, '001_initial_schema.sql');
}
