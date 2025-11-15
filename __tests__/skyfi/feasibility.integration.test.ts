/**
 * Integration tests for feasibility checking with mocked API responses
 */

import axios from 'axios';
import { SkyFiClient } from '../../src/skyfi/client';
import { createConfigFromEnv } from '../../src/skyfi/config';
import { FeasibilityService } from '../../src/skyfi/feasibility';
import { ProductType, Resolution, Provider } from '../../src/types/skyfi-api';
import type {
  PassPredictionRequest,
  PassPredictionResponse,
  FeasibilityCheckRequest,
  FeasibilityCheckResponse,
} from '../../src/types/feasibility';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Feasibility Integration Tests', () => {
  const API_BASE_URL = 'https://app.skyfi.com/platform-api';
  const TEST_API_KEY = 'test-api-key';

  let client: SkyFiClient;
  let service: FeasibilityService;
  let mockAxiosInstance: any;

  beforeAll(() => {
    // Set environment variables for testing
    process.env['SKYFI_API_KEY'] = TEST_API_KEY;
    process.env['SKYFI_API_BASE_URL'] = API_BASE_URL;
  });

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create = jest.fn(() => mockAxiosInstance) as unknown as typeof axios.create;

    const config = createConfigFromEnv();
    client = new SkyFiClient(config);
    service = new FeasibilityService(client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Pass Prediction Integration', () => {
    const request: PassPredictionRequest = {
      aoi: 'POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
      fromDate: '2025-01-15T00:00:00Z',
      toDate: '2025-01-22T23:59:59Z',
      productTypes: [ProductType.Day, ProductType.SAR],
      resolutions: [Resolution.High, Resolution.VeryHigh],
      maxOffNadirAngle: 30,
    };

    const mockApiResponse = {
      passes: [
        {
          provider: 'PLANET',
          satname: 'SKYSAT-15',
          satid: 'SKYSAT-15',
          noradid: '44931',
          node: 'DESCENDING',
          productType: 'DAY',
          resolution: 'HIGH',
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
        {
          provider: 'UMBRA',
          satname: 'UMBRA-SAR-01',
          satid: 'UMBRA-SAR-01',
          noradid: '48915',
          node: 'ASCENDING',
          productType: 'SAR',
          resolution: 'VERY HIGH',
          lat: 30.28,
          lon: -97.72,
          passDate: '2025-01-17T02:15:00Z',
          meanT: 285,
          offNadirAngle: 25.0,
          solarElevationAngle: 0.0,
          minSquareKms: 5,
          maxSquareKms: 50,
          priceForOneSquareKm: 25.0,
          priceForOneSquareKmCents: 2500,
          gsdDegMin: 0.25,
          gsdDegMax: 0.5,
        },
      ],
    };

    it('should successfully predict satellite passes', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockApiResponse,
        status: 200,
      });

      const result = await service.predictPasses(request);

      expect(result.passes).toHaveLength(2);
      expect(result.passes[0].provider).toBe(Provider.Planet);
      expect(result.passes[0].satname).toBe('SKYSAT-15');
      expect(result.passes[0].productType).toBe(ProductType.Day);
      expect(result.passes[1].provider).toBe(Provider.Umbra);
      expect(result.passes[1].productType).toBe(ProductType.SAR);
    });

    it('should handle empty pass results', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { passes: [] },
        status: 200,
      });

      const result = await service.predictPasses(request);

      expect(result.passes).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('Validation failed');
      (error as any).response = {
        status: 422,
        data: { detail: 'Invalid AOI polygon' },
      };
      (error as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(service.predictPasses(request)).rejects.toThrow();
    });

    it('should retry on rate limit errors', async () => {
      // First call returns rate limit error, second call succeeds
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as any).response = {
        status: 429,
        data: { detail: 'Rate limit exceeded' },
        headers: { 'retry-after': '1' },
      };
      (rateLimitError as any).isAxiosError = true;

      mockAxiosInstance.post
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          data: mockApiResponse,
          status: 200,
        });

      const result = await service.predictPasses(request);

      expect(result.passes).toHaveLength(2);
    });
  });

  describe('Feasibility Check Integration', () => {
    const request: FeasibilityCheckRequest = {
      aoi: 'POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
      productType: ProductType.Day,
      resolution: Resolution.High,
      startDate: '2025-01-15T00:00:00Z',
      endDate: '2025-01-22T23:59:59Z',
      maxCloudCoveragePercent: 20,
      priorityItem: false,
      requiredProvider: 'PLANET',
    };

    const mockApiResponse = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      validUntil: '2025-01-23T00:00:00Z',
      overallScore: {
        feasibility: 0.85,
        weatherScore: {
          weatherScore: 0.9,
          weatherDetails: {
            weatherScore: 0.9,
            clouds: [
              {
                date: '2025-01-16T00:00:00Z',
                coverage: 15,
              },
              {
                date: '2025-01-17T00:00:00Z',
                coverage: 10,
              },
            ],
          },
        },
        providerScore: {
          score: 0.8,
          providerScores: [
            {
              provider: 'PLANET',
              score: 0.8,
              status: 'COMPLETE',
              reference: 'ref-123',
              opportunities: [
                {
                  windowStart: '2025-01-16T14:00:00Z',
                  windowEnd: '2025-01-16T15:00:00Z',
                  satelliteId: 'SKYSAT-15',
                  providerWindowId: '987e6543-e21b-43d1-b789-123456789abc',
                  providerMetadata: {
                    satellite_family: 'SkySat',
                  },
                },
                {
                  windowStart: '2025-01-18T09:30:00Z',
                  windowEnd: '2025-01-18T10:30:00Z',
                  satelliteId: 'SKYSAT-18',
                  providerWindowId: '456e7890-f1ab-34c5-d678-901234567890',
                },
              ],
            },
          ],
        },
      },
    };

    it('should successfully check feasibility', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockApiResponse,
        status: 201,
      });

      const result = await service.checkFeasibility(request);

      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.overallScore).not.toBeNull();
      expect(result.overallScore?.feasibility).toBe(0.85);
      expect(result.overallScore?.weatherScore?.weatherScore).toBe(0.9);
      expect(result.overallScore?.providerScore.score).toBe(0.8);
    });

    it('should handle provider opportunities with window IDs', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockApiResponse,
        status: 201,
      });

      const result = await service.checkFeasibility(request);

      const providerScores = result.overallScore?.providerScore.providerScores;
      expect(providerScores).toHaveLength(1);

      const opportunities = providerScores?.[0].opportunities;
      expect(opportunities).toHaveLength(2);

      // Check first opportunity has provider window ID (required for Planet orders)
      expect(opportunities?.[0].providerWindowId).toBe(
        '987e6543-e21b-43d1-b789-123456789abc',
      );
      expect(opportunities?.[0].satelliteId).toBe('SKYSAT-15');
      expect(opportunities?.[0].providerMetadata).toBeDefined();

      // Check second opportunity
      expect(opportunities?.[1].providerWindowId).toBe(
        '456e7890-f1ab-34c5-d678-901234567890',
      );
      expect(opportunities?.[1].satelliteId).toBe('SKYSAT-18');
    });

    it('should handle null overall score', async () => {
      const responseWithNullScore = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        validUntil: '2025-01-23T00:00:00Z',
        overallScore: null,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: responseWithNullScore,
        status: 201,
      });

      const result = await service.checkFeasibility(request);

      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.overallScore).toBeNull();
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Unauthorized');
      (error as any).response = {
        status: 401,
        data: { detail: 'Authentication failed' },
      };
      (error as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(service.checkFeasibility(request)).rejects.toThrow();
    });

    it('should handle validation errors from API', async () => {
      const error = new Error('Validation failed');
      (error as any).response = {
        status: 422,
        data: { detail: 'Invalid request parameters' },
      };
      (error as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(service.checkFeasibility(request)).rejects.toThrow();
    });
  });

  describe('Get Feasibility By ID Integration', () => {
    const feasibilityId = '123e4567-e89b-12d3-a456-426614174000';

    const mockApiResponse = {
      id: feasibilityId,
      validUntil: '2025-01-23T00:00:00Z',
      overallScore: {
        feasibility: 0.85,
        providerScore: {
          score: 0.8,
          providerScores: [
            {
              provider: 'PLANET',
              score: 0.8,
              status: 'COMPLETE',
              opportunities: [
                {
                  windowStart: '2025-01-16T14:00:00Z',
                  windowEnd: '2025-01-16T15:00:00Z',
                  providerWindowId: '987e6543-e21b-43d1-b789-123456789abc',
                },
              ],
            },
          ],
        },
      },
    };

    it('should successfully retrieve feasibility by ID', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockApiResponse,
        status: 200,
      });

      const result = await service.getFeasibilityById(feasibilityId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(feasibilityId);
      expect(result?.overallScore?.feasibility).toBe(0.85);
    });

    it('should handle pending feasibility checks', async () => {
      const pendingResponse = {
        id: feasibilityId,
        validUntil: '2025-01-23T00:00:00Z',
        overallScore: null,
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: pendingResponse,
        status: 200,
      });

      const result = await service.getFeasibilityById(feasibilityId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(feasibilityId);
      expect(result?.overallScore).toBeNull();
    });

    it('should return null for non-existent feasibility', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: null,
        status: 200,
      });

      const result = await service.getFeasibilityById(feasibilityId);

      expect(result).toBeNull();
    });

    it('should handle 404 errors', async () => {
      const error = new Error('Not found');
      (error as any).response = {
        status: 404,
        data: { detail: 'Feasibility check not found' },
      };
      (error as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(service.getFeasibilityById(feasibilityId)).rejects.toThrow();
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full feasibility workflow', async () => {
      // Step 1: Check feasibility
      const feasibilityRequest: FeasibilityCheckRequest = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
        productType: ProductType.Day,
        resolution: Resolution.High,
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-22T23:59:59Z',
        requiredProvider: 'PLANET',
      };

      const feasibilityResponse = {
        id: 'abc12345-e89b-12d3-a456-426614174000',
        validUntil: '2025-01-23T00:00:00Z',
        overallScore: null, // Initially pending
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: feasibilityResponse,
        status: 201,
      });

      const checkResult = await service.checkFeasibility(feasibilityRequest);
      expect(checkResult.id).toBe('abc12345-e89b-12d3-a456-426614174000');
      expect(checkResult.overallScore).toBeNull();

      // Step 2: Poll for results
      const completedResponse = {
        id: 'abc12345-e89b-12d3-a456-426614174000',
        validUntil: '2025-01-23T00:00:00Z',
        overallScore: {
          feasibility: 0.9,
          providerScore: {
            score: 0.9,
            providerScores: [
              {
                provider: 'PLANET',
                score: 0.9,
                status: 'COMPLETE',
                opportunities: [
                  {
                    windowStart: '2025-01-16T14:00:00Z',
                    windowEnd: '2025-01-16T15:00:00Z',
                    providerWindowId: '111e2222-e33b-44d5-e678-999999999999',
                  },
                ],
              },
            ],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: completedResponse,
        status: 200,
      });

      const pollResult = await service.getFeasibilityById(checkResult.id);
      expect(pollResult?.overallScore).not.toBeNull();
      expect(pollResult?.overallScore?.feasibility).toBe(0.9);
    });
  });
});
