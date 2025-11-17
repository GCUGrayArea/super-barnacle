/**
 * Cache Key Generation Utilities
 *
 * Provides deterministic cache key generation for archive search parameters.
 * Ensures that identical search parameters always produce the same cache key,
 * regardless of parameter order or WKT polygon formatting.
 *
 * @packageDocumentation
 */

import { createHash } from 'crypto';
import type { ArchiveSearchParams } from '../types/archives.js';

/**
 * Normalize WKT polygon string for consistent cache keys
 *
 * Different WKT representations of the same polygon should produce
 * the same normalized form. This includes:
 * - Removing extra whitespace
 * - Normalizing coordinate precision
 * - Ensuring consistent formatting
 *
 * @param wkt - WKT polygon string
 * @returns Normalized WKT string
 *
 * @example
 * normalizeWKT('POLYGON (( -97.72 30.28, -97.72 30.29 ))')
 * // Returns: "POLYGON((-97.72 30.28,-97.72 30.29))"
 */
export function normalizeWKT(wkt: string): string {
  if (!wkt) {
    return '';
  }

  // Remove extra whitespace and normalize formatting
  let normalized = wkt
    .trim()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/\(\s+/g, '(') // Remove space after opening parenthesis
    .replace(/\s+\)/g, ')') // Remove space before closing parenthesis
    .replace(/,\s*/g, ',') // Remove space after comma
    .replace(/\s*,/g, ','); // Remove space before comma

  // Ensure consistent POLYGON keyword casing
  normalized = normalized.replace(/^polygon/i, 'POLYGON');
  normalized = normalized.replace(/^multipolygon/i, 'MULTIPOLYGON');
  normalized = normalized.replace(/^point/i, 'POINT');
  normalized = normalized.replace(/^linestring/i, 'LINESTRING');

  // Remove space between geometry type and opening parenthesis
  normalized = normalized.replace(/^(POLYGON|MULTIPOLYGON|POINT|LINESTRING)\s+\(/, '$1(');

  return normalized;
}

/**
 * Sort and normalize array values for consistent serialization
 *
 * Ensures arrays are always in the same order for cache key generation.
 *
 * @param arr - Array of strings or undefined
 * @returns Sorted array or undefined
 */
function sortArray<T extends string | number>(arr: T[] | undefined): T[] | undefined {
  if (!arr || arr.length === 0) {
    return undefined;
  }
  return [...arr].sort();
}

/**
 * Create a normalized, deterministic object from search parameters
 *
 * This ensures that equivalent search parameters always produce
 * the same cache key, regardless of:
 * - Property order in the object
 * - Array element order
 * - WKT formatting differences
 * - Undefined vs missing properties
 *
 * @param params - Archive search parameters
 * @returns Normalized parameters object
 */
export function normalizeSearchParams(params: ArchiveSearchParams): Record<string, any> {
  const normalized: Record<string, any> = {};

  // Normalize AOI (required)
  normalized['aoi'] = normalizeWKT(params.aoi);

  // Normalize dates (if present)
  if (params.fromDate) {
    normalized['fromDate'] = params.fromDate;
  }
  if (params.toDate) {
    normalized['toDate'] = params.toDate;
  }

  // Normalize numeric filters (if present)
  if (params.maxCloudCoveragePercent !== undefined) {
    normalized['maxCloudCoveragePercent'] = params.maxCloudCoveragePercent;
  }
  if (params.maxOffNadirAngle !== undefined) {
    normalized['maxOffNadirAngle'] = params.maxOffNadirAngle;
  }
  if (params.minOverlapRatio !== undefined) {
    normalized['minOverlapRatio'] = params.minOverlapRatio;
  }

  // Normalize boolean filters (if present)
  if (params.openData !== undefined) {
    normalized['openData'] = params.openData;
  }

  // Normalize arrays (sorted for consistency)
  if (params.resolutions && params.resolutions.length > 0) {
    normalized['resolutions'] = sortArray(params.resolutions);
  }
  if (params.productTypes && params.productTypes.length > 0) {
    normalized['productTypes'] = sortArray(params.productTypes);
  }
  if (params.providers && params.providers.length > 0) {
    normalized['providers'] = sortArray(params.providers);
  }

  // Page size affects results, so include it
  if (params.pageSize !== undefined) {
    normalized['pageSize'] = params.pageSize;
  }

  return normalized;
}

/**
 * Generate a deterministic cache key from search parameters
 *
 * Creates a SHA-256 hash of the normalized search parameters.
 * Identical parameters always produce the same cache key.
 *
 * @param params - Archive search parameters
 * @returns 64-character hex string (SHA-256 hash)
 *
 * @example
 * const key = generateCacheKey({
 *   aoi: 'POLYGON((-97.72 30.28, ...))',
 *   fromDate: '2025-01-01T00:00:00Z',
 *   toDate: '2025-01-31T23:59:59Z',
 *   maxCloudCoveragePercent: 20,
 * });
 * // Returns: "a1b2c3d4e5f6..." (64 chars)
 */
export function generateCacheKey(params: ArchiveSearchParams): string {
  // Normalize parameters for consistent hashing
  const normalized = normalizeSearchParams(params);

  // Sort keys to ensure consistent JSON serialization
  const sortedKeys = Object.keys(normalized).sort();
  const sortedNormalized: Record<string, any> = {};
  for (const key of sortedKeys) {
    sortedNormalized[key] = normalized[key] as any;
  }

  // Create deterministic JSON string
  const jsonString = JSON.stringify(sortedNormalized);

  // Generate SHA-256 hash
  const hash = createHash('sha256');
  hash.update(jsonString);
  return hash.digest('hex');
}

/**
 * Generate a human-readable cache key prefix
 *
 * Creates a short, readable prefix that can be used for debugging
 * or organizing cache entries. Not guaranteed to be unique.
 *
 * @param params - Archive search parameters
 * @returns Human-readable prefix (e.g., "archive_2025-01_20cloud")
 */
export function generateCacheKeyPrefix(params: ArchiveSearchParams): string {
  const parts: string[] = ['archive'];

  // Add date range info
  if (params.fromDate) {
    const date = new Date(params.fromDate);
    parts.push(date.toISOString().slice(0, 7)); // YYYY-MM
  }

  // Add cloud coverage filter
  if (params.maxCloudCoveragePercent !== undefined) {
    parts.push(`${params.maxCloudCoveragePercent}cloud`);
  }

  // Add resolution filter
  if (params.resolutions && params.resolutions.length > 0) {
    const firstResolution = params.resolutions[0];
    if (firstResolution) {
      parts.push(firstResolution.toLowerCase());
    }
  }

  return parts.join('_');
}

/**
 * Validate that two cache keys match
 *
 * Useful for debugging and testing cache key generation.
 *
 * @param key1 - First cache key
 * @param key2 - Second cache key
 * @returns True if keys match
 */
export function validateCacheKeyMatch(key1: string, key2: string): boolean {
  return key1 === key2;
}

/**
 * Extract parameters from normalized cache data (for debugging)
 *
 * This is the inverse of normalizeSearchParams, used for
 * cache inspection and debugging.
 *
 * @param normalized - Normalized parameters object
 * @returns Human-readable summary
 */
export function summarizeCacheParams(normalized: Record<string, any>): string {
  const parts: string[] = [];

  if (normalized['aoi']) {
    // Truncate WKT for readability
    const aoi = String(normalized['aoi']).substring(0, 50) + '...';
    parts.push(`AOI: ${aoi}`);
  }

  if (normalized['fromDate'] || normalized['toDate']) {
    const from = normalized['fromDate'] || 'N/A';
    const to = normalized['toDate'] || 'N/A';
    parts.push(`Dates: ${from} to ${to}`);
  }

  if (normalized['maxCloudCoveragePercent'] !== undefined) {
    parts.push(`Max Cloud: ${normalized['maxCloudCoveragePercent']}%`);
  }

  if (normalized['resolutions']) {
    parts.push(`Resolutions: ${normalized['resolutions'].join(', ')}`);
  }

  if (normalized['productTypes']) {
    parts.push(`Products: ${normalized['productTypes'].join(', ')}`);
  }

  return parts.join(' | ');
}
