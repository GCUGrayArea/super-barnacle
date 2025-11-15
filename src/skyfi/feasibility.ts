/**
 * Feasibility checking and satellite pass prediction
 *
 * Methods for checking task feasibility and predicting satellite passes
 * over areas of interest.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { logger } from '../lib/logger.js';
import { ValidationError } from '../lib/errors.js';
import { SkyFiClient } from './client.js';
import type {
  PassPredictionRequest,
  PassPredictionResponse,
  FeasibilityCheckRequest,
  FeasibilityCheckResponse,
  FeasibilityOptions,
} from '../types/feasibility.js';
import {
  validatePassPredictionRequest,
  validateFeasibilityCheckRequest,
  validatePassPredictionResponse,
  validateFeasibilityCheckResponse,
} from '../schemas/feasibility.schemas.js';

/**
 * Feasibility service for checking task feasibility and predicting satellite passes
 */
export class FeasibilityService {
  constructor(private readonly client: SkyFiClient) {}

  /**
   * Predict satellite passes over an area of interest
   *
   * Find satellites that can observe a ground location at specific times.
   * This helps plan tasking orders by showing when satellites will be overhead.
   *
   * @param request - Pass prediction parameters
   * @param options - Optional request options
   * @returns Pass prediction results with satellite opportunities
   * @throws {ValidationError} If request parameters are invalid
   * @throws {SkyFiAPIError} If API request fails
   *
   * @example
   * ```typescript
   * const passes = await feasibility.predictPasses({
   *   aoi: 'POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
   *   fromDate: '2025-01-15T00:00:00Z',
   *   toDate: '2025-01-22T23:59:59Z',
   *   productTypes: [ProductType.Day],
   *   resolutions: [Resolution.High, Resolution.VeryHigh],
   *   maxOffNadirAngle: 30,
   * });
   *
   * console.log(`Found ${passes.passes.length} satellite passes`);
   * passes.passes.forEach(pass => {
   *   console.log(`${pass.satname} - ${pass.passDate} - $${pass.priceForOneSquareKm}/sq km`);
   * });
   * ```
   */
  async predictPasses(
    request: PassPredictionRequest,
    options?: FeasibilityOptions,
  ): Promise<PassPredictionResponse> {
    // Validate request
    try {
      validatePassPredictionRequest(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        throw new ValidationError(
          `Invalid pass prediction request: ${errorMessages}`,
        );
      }
      throw error;
    }

    logger.info('Predicting satellite passes', {
      correlationId: options?.correlationId,
      fromDate: request.fromDate,
      toDate: request.toDate,
      productTypes: request.productTypes,
      resolutions: request.resolutions,
    });

    const startTime = Date.now();

    // Make API request
    const response = await this.client.post<unknown>(
      '/feasibility/pass-prediction',
      request,
      options,
    );

    // Validate and parse response
    const validatedResponse = validatePassPredictionResponse(response);

    const duration = Date.now() - startTime;
    logger.info('Satellite pass prediction completed', {
      correlationId: options?.correlationId,
      passCount: validatedResponse.passes.length,
      durationMs: duration,
    });

    return validatedResponse;
  }

  /**
   * Check feasibility of a tasking order
   *
   * Analyzes whether a tasking order can be fulfilled for the specified
   * area, time window, and requirements. Returns a feasibility score and
   * available capture opportunities with provider_window_id for ordering.
   *
   * @param request - Feasibility check parameters
   * @param options - Optional request options
   * @returns Feasibility check result with score and opportunities
   * @throws {ValidationError} If request parameters are invalid
   * @throws {SkyFiAPIError} If API request fails
   *
   * @example
   * ```typescript
   * const feasibility = await feasibility.checkFeasibility({
   *   aoi: 'POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
   *   productType: ProductType.Day,
   *   resolution: Resolution.High,
   *   startDate: '2025-01-15T00:00:00Z',
   *   endDate: '2025-01-22T23:59:59Z',
   *   maxCloudCoveragePercent: 20,
   *   requiredProvider: 'PLANET',
   * });
   *
   * if (feasibility.overallScore && feasibility.overallScore.feasibility > 0.7) {
   *   console.log('Order is highly feasible!');
   *   console.log(`Feasibility score: ${feasibility.overallScore.feasibility}`);
   * }
   * ```
   */
  async checkFeasibility(
    request: FeasibilityCheckRequest,
    options?: FeasibilityOptions,
  ): Promise<FeasibilityCheckResponse> {
    // Validate request
    try {
      validateFeasibilityCheckRequest(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        throw new ValidationError(
          `Invalid feasibility check request: ${errorMessages}`,
        );
      }
      throw error;
    }

    logger.info('Checking task feasibility', {
      correlationId: options?.correlationId,
      productType: request.productType,
      resolution: request.resolution,
      startDate: request.startDate,
      endDate: request.endDate,
      requiredProvider: request.requiredProvider,
    });

    const startTime = Date.now();

    // Make API request
    const response = await this.client.post<unknown>(
      '/feasibility',
      request,
      options,
    );

    // Validate and parse response
    const validatedResponse = validateFeasibilityCheckResponse(response);

    const duration = Date.now() - startTime;
    logger.info('Feasibility check completed', {
      correlationId: options?.correlationId,
      feasibilityId: validatedResponse.id,
      score: validatedResponse.overallScore?.feasibility,
      durationMs: duration,
    });

    return validatedResponse;
  }

  /**
   * Get feasibility check results by ID
   *
   * Retrieve the status and results of a previously created feasibility check.
   * Useful for polling long-running feasibility analyses.
   *
   * @param feasibilityId - UUID of the feasibility check
   * @param options - Optional request options
   * @returns Feasibility check result, or null if not found
   * @throws {ValidationError} If feasibilityId is not a valid UUID
   * @throws {SkyFiAPIError} If API request fails
   *
   * @example
   * ```typescript
   * const result = await feasibility.getFeasibilityById(
   *   '123e4567-e89b-12d3-a456-426614174000'
   * );
   *
   * if (result) {
   *   console.log(`Status: ${result.overallScore?.providerScore.score}`);
   * }
   * ```
   */
  async getFeasibilityById(
    feasibilityId: string,
    options?: FeasibilityOptions,
  ): Promise<FeasibilityCheckResponse | null> {
    // Validate UUID format
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(feasibilityId)) {
      throw new ValidationError(
        `Invalid feasibility ID: must be a valid UUID`,
        'feasibilityId',
      );
    }

    logger.info('Fetching feasibility check by ID', {
      correlationId: options?.correlationId,
      feasibilityId,
    });

    const startTime = Date.now();

    // Make API request
    const response = await this.client.get<unknown>(
      `/feasibility/${feasibilityId}`,
      options,
    );

    // Handle null response (feasibility not found)
    if (response === null || response === undefined) {
      logger.warn('Feasibility check not found', {
        correlationId: options?.correlationId,
        feasibilityId,
      });
      return null;
    }

    // Validate and parse response
    const validatedResponse = validateFeasibilityCheckResponse(response);

    const duration = Date.now() - startTime;
    logger.info('Feasibility check retrieved', {
      correlationId: options?.correlationId,
      feasibilityId,
      score: validatedResponse.overallScore?.feasibility,
      durationMs: duration,
    });

    return validatedResponse;
  }
}

/**
 * Create a new feasibility service instance
 *
 * @param client - SkyFi API client
 * @returns Feasibility service
 */
export function createFeasibilityService(client: SkyFiClient): FeasibilityService {
  return new FeasibilityService(client);
}

// Export convenience functions for direct use

/**
 * Predict satellite passes (convenience function)
 *
 * @param client - SkyFi API client
 * @param request - Pass prediction parameters
 * @param options - Optional request options
 * @returns Pass prediction results
 */
export async function predictPasses(
  client: SkyFiClient,
  request: PassPredictionRequest,
  options?: FeasibilityOptions,
): Promise<PassPredictionResponse> {
  const service = new FeasibilityService(client);
  return service.predictPasses(request, options);
}

/**
 * Check task feasibility (convenience function)
 *
 * @param client - SkyFi API client
 * @param request - Feasibility check parameters
 * @param options - Optional request options
 * @returns Feasibility check result
 */
export async function checkFeasibility(
  client: SkyFiClient,
  request: FeasibilityCheckRequest,
  options?: FeasibilityOptions,
): Promise<FeasibilityCheckResponse> {
  const service = new FeasibilityService(client);
  return service.checkFeasibility(request, options);
}

/**
 * Get feasibility check by ID (convenience function)
 *
 * @param client - SkyFi API client
 * @param feasibilityId - UUID of the feasibility check
 * @param options - Optional request options
 * @returns Feasibility check result, or null if not found
 */
export async function getFeasibilityById(
  client: SkyFiClient,
  feasibilityId: string,
  options?: FeasibilityOptions,
): Promise<FeasibilityCheckResponse | null> {
  const service = new FeasibilityService(client);
  return service.getFeasibilityById(feasibilityId, options);
}
