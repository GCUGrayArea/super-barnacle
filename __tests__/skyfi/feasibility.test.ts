/**
 * Unit tests for feasibility checking and pass prediction
 */

import { z } from 'zod';
import { ValidationError, SkyFiAPIError } from '../../src/lib/errors';
import { SkyFiClient } from '../../src/skyfi/client';
import {
  FeasibilityService,
  predictPasses,
  checkFeasibility,
  getFeasibilityById,
} from '../../src/skyfi/feasibility';
import { ProductType, Resolution, Provider } from '../../src/types/skyfi-api';
import type {
  PassPredictionRequest,
  PassPredictionResponse,
  FeasibilityCheckRequest,
  FeasibilityCheckResponse,
} from '../../src/types/feasibility';

// Mock the SkyFiClient
jest.mock('../../src/skyfi/client');

describe('FeasibilityService', () => {
  let mockClient: jest.Mocked<SkyFiClient>;
  let service: FeasibilityService;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;
    service = new FeasibilityService(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('predictPasses', () => {
    const validRequest: PassPredictionRequest = {
      aoi: 'POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
      fromDate: '2025-01-15T00:00:00Z',
      toDate: '2025-01-22T23:59:59Z',
      productTypes: [ProductType.Day],
      resolutions: [Resolution.High],
      maxOffNadirAngle: 30,
    };

    const mockResponse: PassPredictionResponse = {
      passes: [
        {
          provider: Provider.Planet,
          satname: 'SKYSAT-1',
          satid: 'SKYSAT-1',
          noradid: '12345',
          node: 'DESCENDING',
          productType: ProductType.Day,
          resolution: Resolution.High,
          lat: 30.29,
          lon: -97.71,
          passDate: '2025-01-16T14:30:00Z',
          meanT: 298,
          offNadirAngle: 15.5,
          solarElevationAngle: 45.2,
          minSquareKms: 10,
          maxSquareKms: 100,
          priceForOneSquareKm: 15.5,
          priceForOneSquareKmCents: 1550,
          gsdDegMin: 0.5,
          gsdDegMax: 1.0,
        },
      ],
    };

    it('should successfully predict satellite passes', async () => {
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await service.predictPasses(validRequest);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/feasibility/pass-prediction',
        validRequest,
        undefined,
      );
      expect(result).toEqual(mockResponse);
      expect(result.passes).toHaveLength(1);
      expect(result.passes[0].satname).toBe('SKYSAT-1');
    });

    it('should pass options to client', async () => {
      mockClient.post.mockResolvedValue(mockResponse);

      const options = { correlationId: 'test-123', timeout: 5000 };
      await service.predictPasses(validRequest, options);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/feasibility/pass-prediction',
        validRequest,
        options,
      );
    });

    it('should throw ValidationError for invalid AOI format', async () => {
      const invalidRequest = {
        ...validRequest,
        aoi: 'INVALID WKT',
      };

      await expect(service.predictPasses(invalidRequest)).rejects.toThrow(
        ValidationError,
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid date format', async () => {
      const invalidRequest = {
        ...validRequest,
        fromDate: 'not-a-date',
      };

      await expect(service.predictPasses(invalidRequest)).rejects.toThrow(
        ValidationError,
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid off-nadir angle', async () => {
      const invalidRequest = {
        ...validRequest,
        maxOffNadirAngle: 95, // > 90 degrees
      };

      await expect(service.predictPasses(invalidRequest)).rejects.toThrow(
        ValidationError,
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const apiError = new SkyFiAPIError('API Error', 500);
      mockClient.post.mockRejectedValue(apiError);

      await expect(service.predictPasses(validRequest)).rejects.toThrow(
        SkyFiAPIError,
      );
    });

    it('should validate response schema', async () => {
      const invalidResponse = {
        passes: [{ invalid: 'data' }],
      };
      mockClient.post.mockResolvedValue(invalidResponse);

      await expect(service.predictPasses(validRequest)).rejects.toThrow();
    });
  });

  describe('checkFeasibility', () => {
    const validRequest: FeasibilityCheckRequest = {
      aoi: 'POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
      productType: ProductType.Day,
      resolution: Resolution.High,
      startDate: '2025-01-15T00:00:00Z',
      endDate: '2025-01-22T23:59:59Z',
      maxCloudCoveragePercent: 20,
      requiredProvider: 'PLANET',
    };

    const mockResponse: FeasibilityCheckResponse = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      validUntil: '2025-01-23T00:00:00Z',
      overallScore: {
        feasibility: 0.85,
        weatherScore: {
          weatherScore: 0.9,
        },
        providerScore: {
          score: 0.8,
          providerScores: [
            {
              provider: 'PLANET',
              score: 0.8,
              opportunities: [
                {
                  windowStart: '2025-01-16T14:00:00Z',
                  windowEnd: '2025-01-16T15:00:00Z',
                  satelliteId: 'SKYSAT-1',
                  providerWindowId: '987e6543-e21b-43d1-b789-123456789abc',
                },
              ],
            },
          ],
        },
      },
    };

    it('should successfully check feasibility', async () => {
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await service.checkFeasibility(validRequest);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/feasibility',
        validRequest,
        undefined,
      );
      expect(result).toEqual(mockResponse);
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.overallScore?.feasibility).toBe(0.85);
    });

    it('should pass options to client', async () => {
      mockClient.post.mockResolvedValue(mockResponse);

      const options = { correlationId: 'test-456', timeout: 10000 };
      await service.checkFeasibility(validRequest, options);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/feasibility',
        validRequest,
        options,
      );
    });

    it('should throw ValidationError for invalid AOI format', async () => {
      const invalidRequest = {
        ...validRequest,
        aoi: 'LINESTRING(0 0, 1 1)',
      };

      await expect(service.checkFeasibility(invalidRequest)).rejects.toThrow(
        ValidationError,
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid cloud coverage', async () => {
      const invalidRequest = {
        ...validRequest,
        maxCloudCoveragePercent: 150, // > 100
      };

      await expect(service.checkFeasibility(invalidRequest)).rejects.toThrow(
        ValidationError,
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid provider', async () => {
      const invalidRequest = {
        ...validRequest,
        requiredProvider: 'INVALID_PROVIDER' as 'PLANET',
      };

      await expect(service.checkFeasibility(invalidRequest)).rejects.toThrow(
        ValidationError,
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const apiError = new SkyFiAPIError('API Error', 422);
      mockClient.post.mockRejectedValue(apiError);

      await expect(service.checkFeasibility(validRequest)).rejects.toThrow(
        SkyFiAPIError,
      );
    });

    it('should handle null overallScore', async () => {
      const responseWithNullScore: FeasibilityCheckResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        validUntil: '2025-01-23T00:00:00Z',
        overallScore: null,
      };
      mockClient.post.mockResolvedValue(responseWithNullScore);

      const result = await service.checkFeasibility(validRequest);

      expect(result.overallScore).toBeNull();
    });

    it('should include provider_window_id in opportunities', async () => {
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await service.checkFeasibility(validRequest);

      const opportunity =
        result.overallScore?.providerScore.providerScores?.[0].opportunities[0];
      expect(opportunity?.providerWindowId).toBe(
        '987e6543-e21b-43d1-b789-123456789abc',
      );
    });
  });

  describe('getFeasibilityById', () => {
    const validId = '123e4567-e89b-12d3-a456-426614174000';

    const mockResponse: FeasibilityCheckResponse = {
      id: validId,
      validUntil: '2025-01-23T00:00:00Z',
      overallScore: {
        feasibility: 0.85,
        providerScore: {
          score: 0.8,
        },
      },
    };

    it('should successfully retrieve feasibility by ID', async () => {
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await service.getFeasibilityById(validId);

      expect(mockClient.get).toHaveBeenCalledWith(
        `/feasibility/${validId}`,
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should pass options to client', async () => {
      mockClient.get.mockResolvedValue(mockResponse);

      const options = { correlationId: 'test-789' };
      await service.getFeasibilityById(validId, options);

      expect(mockClient.get).toHaveBeenCalledWith(
        `/feasibility/${validId}`,
        options,
      );
    });

    it('should throw ValidationError for invalid UUID format', async () => {
      const invalidId = 'not-a-uuid';

      await expect(service.getFeasibilityById(invalidId)).rejects.toThrow(
        ValidationError,
      );
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('should return null if feasibility not found', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await service.getFeasibilityById(validId);

      expect(result).toBeNull();
    });

    it('should handle undefined response', async () => {
      mockClient.get.mockResolvedValue(undefined);

      const result = await service.getFeasibilityById(validId);

      expect(result).toBeNull();
    });

    it('should handle API errors', async () => {
      const apiError = new SkyFiAPIError('Not Found', 404);
      mockClient.get.mockRejectedValue(apiError);

      await expect(service.getFeasibilityById(validId)).rejects.toThrow(
        SkyFiAPIError,
      );
    });
  });
});

describe('Convenience functions', () => {
  let mockClient: jest.Mocked<SkyFiClient>;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('predictPasses', () => {
    it('should create service and call predictPasses', async () => {
      const request: PassPredictionRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
        fromDate: '2025-01-15T00:00:00Z',
        toDate: '2025-01-22T23:59:59Z',
      };

      const mockResponse: PassPredictionResponse = { passes: [] };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await predictPasses(mockClient, request);

      expect(result).toEqual(mockResponse);
      expect(mockClient.post).toHaveBeenCalled();
    });
  });

  describe('checkFeasibility', () => {
    it('should create service and call checkFeasibility', async () => {
      const request: FeasibilityCheckRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
        productType: ProductType.Day,
        resolution: Resolution.High,
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-22T23:59:59Z',
      };

      const mockResponse: FeasibilityCheckResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        validUntil: '2025-01-23T00:00:00Z',
        overallScore: null,
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await checkFeasibility(mockClient, request);

      expect(result).toEqual(mockResponse);
      expect(mockClient.post).toHaveBeenCalled();
    });
  });

  describe('getFeasibilityById', () => {
    it('should create service and call getFeasibilityById', async () => {
      const feasibilityId = '123e4567-e89b-12d3-a456-426614174000';

      const mockResponse: FeasibilityCheckResponse = {
        id: feasibilityId,
        validUntil: '2025-01-23T00:00:00Z',
        overallScore: null,
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await getFeasibilityById(mockClient, feasibilityId);

      expect(result).toEqual(mockResponse);
      expect(mockClient.get).toHaveBeenCalled();
    });
  });
});
