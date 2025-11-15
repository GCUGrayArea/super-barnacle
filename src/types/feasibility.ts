/**
 * Feasibility and pass prediction type definitions
 *
 * Type definitions for SkyFi feasibility checking and satellite pass
 * prediction functionality.
 *
 * @packageDocumentation
 */

import type { ProductType, Resolution, Provider } from './skyfi-api.js';

/**
 * Feasibility check status
 */
export enum FeasibilityCheckStatus {
  Pending = 'PENDING',
  Started = 'STARTED',
  Complete = 'COMPLETE',
  Error = 'ERROR',
}

/**
 * Request parameters for pass prediction
 */
export interface PassPredictionRequest {
  /** Area of interest in WKT format */
  aoi: string;
  /** Start date for pass prediction search (ISO 8601) */
  fromDate: string;
  /** End date for pass prediction search (ISO 8601) */
  toDate: string;
  /** Filter by product types */
  productTypes?: ProductType[];
  /** Filter by resolutions */
  resolutions?: Resolution[];
  /** Maximum off-nadir angle in degrees (default: 30.0) */
  maxOffNadirAngle?: number;
}

/**
 * Satellite pass opportunity
 */
export interface SatellitePass {
  /** Satellite provider */
  provider: Provider;
  /** Satellite name */
  satname: string;
  /** Satellite ID */
  satid: string;
  /** NORAD ID */
  noradid: string;
  /** Node type */
  node: string;
  /** Product type */
  productType: ProductType;
  /** Resolution */
  resolution: Resolution;
  /** Latitude */
  lat: number;
  /** Longitude */
  lon: number;
  /** Pass date and time (ISO 8601) */
  passDate: string;
  /** Mean temperature */
  meanT: number;
  /** Off-nadir angle in degrees */
  offNadirAngle: number;
  /** Solar elevation angle in degrees */
  solarElevationAngle: number;
  /** Minimum square kilometers */
  minSquareKms: number;
  /** Maximum square kilometers */
  maxSquareKms: number;
  /** Price per square kilometer (USD) */
  priceForOneSquareKm: number;
  /** Price per square kilometer in cents */
  priceForOneSquareKmCents?: number;
  /** Minimum GSD */
  gsdDegMin: number;
  /** Maximum GSD */
  gsdDegMax: number;
}

/**
 * Pass prediction response
 */
export interface PassPredictionResponse {
  /** Array of satellite passes */
  passes: SatellitePass[];
}

/**
 * Request parameters for feasibility check
 */
export interface FeasibilityCheckRequest {
  /** Area of interest in WKT format */
  aoi: string;
  /** Product type for feasibility check */
  productType: ProductType;
  /** Resolution for feasibility check */
  resolution: Resolution;
  /** Start date for feasibility check (ISO 8601) */
  startDate: string;
  /** End date for feasibility check (ISO 8601) */
  endDate: string;
  /** Maximum cloud coverage percentage (0-100) */
  maxCloudCoveragePercent?: number;
  /** Whether this is a priority request */
  priorityItem?: boolean;
  /** Required provider (PLANET or UMBRA) */
  requiredProvider?: 'PLANET' | 'UMBRA';
  /** SAR-specific parameters */
  sarParameters?: Record<string, unknown>;
}

/**
 * Capture opportunity within a feasibility result
 */
export interface Opportunity {
  /** Window start time (ISO 8601) */
  windowStart: string;
  /** Window end time (ISO 8601) */
  windowEnd: string;
  /** Satellite ID */
  satelliteId?: string;
  /** Provider window ID (required for Planet orders) */
  providerWindowId?: string;
  /** Additional provider-specific metadata */
  providerMetadata?: Record<string, unknown>;
}

/**
 * Provider-specific feasibility score
 */
export interface ProviderScore {
  /** Provider name */
  provider?: string;
  /** Feasibility score (0-1) */
  score: number;
  /** Check status */
  status?: FeasibilityCheckStatus;
  /** Reference ID */
  reference?: string;
  /** Available capture opportunities */
  opportunities: Opportunity[];
}

/**
 * Cloud coverage forecast
 */
export interface CloudCoverage {
  /** Forecast date (ISO 8601) */
  date: string;
  /** Cloud coverage percentage (0-100) */
  coverage: number;
}

/**
 * Weather details for feasibility
 */
export interface WeatherDetails {
  /** Overall weather score (0-1) */
  weatherScore: number;
  /** Cloud coverage forecast */
  clouds?: CloudCoverage[];
}

/**
 * Weather score component
 */
export interface WeatherScore {
  /** Weather score (0-1) */
  weatherScore: number;
  /** Detailed weather information */
  weatherDetails?: WeatherDetails;
}

/**
 * Combined provider scores
 */
export interface ProviderCombinedScore {
  /** Overall provider score (0-1) */
  score: number;
  /** Individual provider scores */
  providerScores?: ProviderScore[];
}

/**
 * Overall feasibility score
 */
export interface FeasibilityScore {
  /** Overall feasibility score (0-1) */
  feasibility: number;
  /** Weather score component */
  weatherScore?: WeatherScore;
  /** Provider score component */
  providerScore: ProviderCombinedScore;
}

/**
 * Feasibility check response
 */
export interface FeasibilityCheckResponse {
  /** Feasibility task ID (UUID) */
  id: string;
  /** Expiration date for this feasibility result (ISO 8601) */
  validUntil: string;
  /** Overall feasibility score */
  overallScore: FeasibilityScore | null;
}

/**
 * Options for feasibility operations
 */
export interface FeasibilityOptions {
  /** Optional correlation ID for request tracing */
  correlationId?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}
