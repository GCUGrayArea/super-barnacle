/**
 * Archive Validation Schemas
 *
 * This module contains Zod schemas for validating archive search
 * requests and responses.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { ProductType, Provider, Resolution } from '../types/skyfi-api';

/**
 * Maximum area in square kilometers for archive search AOI
 */
const MAX_AOI_AREA_SQKM = 500000;

/**
 * Maximum number of vertices allowed in WKT polygon
 */
const MAX_POLYGON_VERTICES = 500;

/**
 * Validate WKT polygon format and constraints
 */
function validateWKT(wkt: string): boolean {
  // Basic WKT polygon format check
  if (!wkt.match(/^POLYGON\s*\(\(/i)) {
    return false;
  }

  // Extract coordinates
  const coordMatch = wkt.match(/POLYGON\s*\(\(([\d\s.,\-+]+)\)\)/i);
  if (!coordMatch) {
    return false;
  }

  // Count vertices
  const coords = coordMatch[1]?.split(',');
  if (!coords || coords.length > MAX_POLYGON_VERTICES) {
    return false;
  }

  // Validate each coordinate pair
  for (const coord of coords) {
    const parts = coord.trim().split(/\s+/);
    if (parts.length !== 2) {
      return false;
    }
    const lon = Number(parts[0]);
    const lat = Number(parts[1]);
    if (Number.isNaN(lon) || Number.isNaN(lat)) {
      return false;
    }
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate approximate area of WKT polygon (rough estimate)
 */
function estimatePolygonArea(wkt: string): number {
  const coordMatch = wkt.match(/POLYGON\s*\(\(([\d\s.,\-+]+)\)\)/i);
  if (!coordMatch || !coordMatch[1]) {
    return 0;
  }

  const coords = coordMatch[1].split(',').map((c) => {
    const parts = c.trim().split(/\s+/);
    return { lon: parseFloat(parts[0] ?? '0'), lat: parseFloat(parts[1] ?? '0') };
  });

  if (coords.length < 3) {
    return 0;
  }

  // Rough estimate using bounding box
  const lons = coords.map((c) => c.lon ?? 0);
  const lats = coords.map((c) => c.lat ?? 0);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  // Approximate km per degree at equator
  const kmPerDegreeLon = 111.32;
  const kmPerDegreeLat = 110.57;

  const avgLat = (minLat + maxLat) / 2;
  const width = (maxLon - minLon) * kmPerDegreeLon * Math.cos((avgLat * Math.PI) / 180);
  const height = (maxLat - minLat) * kmPerDegreeLat;

  return Math.abs(width * height);
}

/**
 * Zod schema for Product Type enum
 */
const ProductTypeSchema = z.nativeEnum(ProductType);

/**
 * Zod schema for Resolution enum
 */
const ResolutionSchema = z.nativeEnum(Resolution);

/**
 * Zod schema for Provider enum
 */
const ProviderSchema = z.nativeEnum(Provider);

/**
 * Zod schema for WKT polygon validation
 */
const WKTPolygonSchema = z
  .string()
  .refine(validateWKT, {
    message: 'AOI must be a valid WKT polygon with max 500 vertices and valid coordinates',
  })
  .refine((wkt) => estimatePolygonArea(wkt) <= MAX_AOI_AREA_SQKM, {
    message: 'AOI must be less than 500,000 square kilometers',
  });

/**
 * Zod schema for ISO 8601 datetime validation
 */
const ISO8601DateSchema = z.string().datetime({
  message: 'Date must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SS+00:00)',
});

/**
 * Zod schema for archive search parameters
 */
export const ArchiveSearchParamsSchema = z
  .object({
    aoi: WKTPolygonSchema,
    fromDate: ISO8601DateSchema.optional(),
    toDate: ISO8601DateSchema.optional(),
    maxCloudCoveragePercent: z.number().min(0).max(100).optional(),
    maxOffNadirAngle: z.number().min(0).max(50).optional(),
    resolutions: z.array(ResolutionSchema).optional(),
    productTypes: z.array(ProductTypeSchema).optional(),
    providers: z.array(ProviderSchema).optional(),
    openData: z.boolean().optional(),
    minOverlapRatio: z.number().min(0).max(1).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  })
  .refine(
    (data) => {
      if (data.fromDate && data.toDate) {
        return new Date(data.fromDate) <= new Date(data.toDate);
      }
      return true;
    },
    {
      message: 'fromDate must be before or equal to toDate',
      path: ['fromDate'],
    },
  );

/**
 * Zod schema for individual archive result
 */
export const ArchiveSchema = z.object({
  archiveId: z.string(),
  provider: ProviderSchema,
  constellation: z.string(),
  productType: ProductTypeSchema,
  platformResolution: z.number().min(0),
  resolution: ResolutionSchema,
  captureTimestamp: z.string(),
  cloudCoveragePercent: z.number().min(0).max(100).optional(),
  offNadirAngle: z.number().min(-90).max(90).optional(),
  footprint: z.string(),
  minSqKm: z.number().min(0),
  maxSqKm: z.number().min(0),
  priceForOneSquareKm: z.number().min(0),
  priceForOneSquareKmCents: z.number().int().min(0),
  priceFullScene: z.number().min(0),
  openData: z.boolean(),
  totalAreaSquareKm: z.number().min(0),
  deliveryTimeHours: z.number().min(0),
  thumbnailUrls: z.record(z.string()).optional(),
  gsd: z.number(),
  tilesUrl: z.string().optional(),
});

/**
 * Zod schema for archive search response
 */
export const ArchiveSearchResponseSchema = z.object({
  request: z.object({}).passthrough(),
  archives: z.array(ArchiveSchema),
  nextPage: z.string().optional(),
  total: z.number().int().optional(),
});

/**
 * Helper to validate archive search parameters
 */
export function validateArchiveSearchParams(params: unknown) {
  return ArchiveSearchParamsSchema.parse(params);
}

/**
 * Helper to validate archive search response
 */
export function validateArchiveSearchResponse(response: unknown) {
  return ArchiveSearchResponseSchema.parse(response);
}
