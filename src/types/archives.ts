/**
 * Archive-specific Type Definitions
 *
 * This module contains types for archive search functionality
 * based on the SkyFi OpenAPI specification.
 *
 * @packageDocumentation
 */

import type { ProductType, Provider, Resolution } from './skyfi-api';

/**
 * Archive search request parameters
 */
export interface ArchiveSearchParams {
  /** WKT representation of user cropped area */
  aoi: string;
  /** Start date in ISO 8601 format (24-hour UTC) */
  fromDate?: string;
  /** End date in ISO 8601 format (24-hour UTC) */
  toDate?: string;
  /** Maximum cloud coverage percentage (0-100) */
  maxCloudCoveragePercent?: number;
  /** Maximum off-nadir angle (0-50) */
  maxOffNadirAngle?: number;
  /** Filter by resolutions */
  resolutions?: Resolution[];
  /** Filter by product types */
  productTypes?: ProductType[];
  /** Filter by providers */
  providers?: Provider[];
  /** Filter for open data only */
  openData?: boolean;
  /** Minimum overlap ratio (0-1) */
  minOverlapRatio?: number;
  /** Number of results per page (1-100) */
  pageSize?: number;
}

/**
 * Individual archive result
 */
export interface Archive {
  /** Unique archive identifier */
  archiveId: string;
  /** Satellite provider */
  provider: Provider;
  /** Satellite constellation name */
  constellation: string;
  /** Product type */
  productType: ProductType;
  /** Platform nominal/nadir resolution in cm */
  platformResolution: number;
  /** Resolution category */
  resolution: Resolution;
  /** Image capture timestamp (ISO 8601) */
  captureTimestamp: string;
  /** Cloud coverage percentage (0-100) */
  cloudCoveragePercent?: number;
  /** Off-nadir angle (-90 to 90) */
  offNadirAngle?: number;
  /** WKT representation of image footprint */
  footprint: string;
  /** Minimum order size in square kilometers */
  minSqKm: number;
  /** Maximum order size in square kilometers */
  maxSqKm: number;
  /** Price per square kilometer in USD */
  priceForOneSquareKm: number;
  /** Price per square kilometer in cents */
  priceForOneSquareKmCents: number;
  /** Price for full scene in USD */
  priceFullScene: number;
  /** Whether this is open data */
  openData: boolean;
  /** Total area in square kilometers */
  totalAreaSquareKm: number;
  /** Estimated delivery time in hours */
  deliveryTimeHours: number;
  /** Thumbnail URLs by resolution */
  thumbnailUrls?: Record<string, string>;
  /** Ground Sample Distance of the image */
  gsd: number;
  /** Tiles URL for the image */
  tilesUrl?: string;
}

/**
 * Archive search response
 */
export interface ArchiveSearchResponse {
  /** Original request parameters */
  request: Partial<ArchiveSearchParams>;
  /** List of matching archives */
  archives: Archive[];
  /** Next page URL for pagination */
  nextPage?: string;
  /** Total number of matching archives */
  total?: number;
}

/**
 * Archive search options for internal use
 */
export interface ArchiveSearchOptions {
  /** Correlation ID for request tracing */
  correlationId?: string;
}
