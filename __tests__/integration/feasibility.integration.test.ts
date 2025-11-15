/**
 * Integration Tests for Feasibility Checking and Pass Prediction
 *
 * Tests complete feasibility checking workflow including pass prediction,
 * feasibility scoring, and opportunity retrieval.
 */

import axios from 'axios';
import { SkyFiClient } from '../../src/skyfi/client';
import { createConfigFromEnv } from '../../src/skyfi/config';
import { FeasibilityService } from '../../src/skyfi/feasibility';
import { ProductType, Resolution, Provider } from '../../src/types/skyfi-api';
import {
  mockPassPredictionResponse,
  mockFeasibilityCheckResponse,
  mockPendingFeasibilityCheckResponse,
  validWKTPolygon,
  mockValidationError,
  mockAuthenticationError,
  mockNotFoundError,
  mockRateLimitError,
  mockServerError,
} from '../fixtures/skyfi-responses';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Feasibility Integration Tests', () => {
  let client: SkyFiClient;
  let service: FeasibilityService;
  let mockAxiosInstance: any;

  beforeAll(() => {
    process.env['SKYFI_API_KEY'] = 'test-api-key';
    process.env['SKYFI_API_BASE_URL'] = 'https://api.test.skyfi.com';
  });

  beforeEach(() => {
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

    mockedAxios.create = jest.fn(() => mockAxiosInstance) as unknown as typeof axios.create;

    const config = createConfigFromEnv();
    client = new SkyFiClient(config);
    service = new FeasibilityService(client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Pass Prediction - Success Cases', () => {
    it('should successfully predict satellite passes with complete parameters', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockPassPredictionResponse,
        status: 200,
      });

      const result = await service.predictPasses({
        aoi: validWKTPolygon,
        fromDate: '2025-01-15T00:00:00Z',
        toDate: '2025-01-22T23:59:59Z',
        productTypes: [ProductType.Day, ProductType.SAR],
        resolutions: [Resolution.High, Resolution.VeryHigh],
        maxOffNadirAngle: 30,
      });

      expect(result.passes).toHaveLength(2);
      expect(result.passes[0].provider).toBe(Provider.Planet);
      expect(result.passes[1].provider).toBe(Provider.Umbra);
    });

    it('should predict passes with minimal parameters', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockPassPredictionResponse,
        status: 200,
      });

      const result = await service.predictPasses({
        aoi: validWKTPolygon,
        fromDate: '2025-01-15T00:00:00Z',
        toDate: '2025-01-22T23:59:59Z',
      });

      expect(result.passes).toHaveLength(2);
    });

    it('should handle empty pass prediction results', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { passes: [] },
        status: 200,
      });

      const result = await service.predictPasses({
        aoi: validWKTPolygon,
        fromDate: '2025-01-15T00:00:00Z',
        toDate: '2025-01-22T23:59:59Z',
      });

      expect(result.passes).toHaveLength(0);
    });

    it('should filter passes by specific providers', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          passes: [mockPassPredictionResponse.passes[0]],
        },
        status: 200,
      });

      const result = await service.predictPasses({
        aoi: validWKTPolygon,
        fromDate: '2025-01-15T00:00:00Z',
        toDate: '2025-01-22T23:59:59Z',
        providers: [Provider.Planet],
      });

      expect(result.passes).toHaveLength(1);
      expect(result.passes[0].provider).toBe(Provider.Planet);
    });

    it('should predict SAR passes specifically', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          passes: [mockPassPredictionResponse.passes[1]],
        },
        status: 200,
      });

      const result = await service.predictPasses({
        aoi: validWKTPolygon,
        fromDate: '2025-01-15T00:00:00Z',
        toDate: '2025-01-22T23:59:59Z',
        productTypes: [ProductType.SAR],
      });

      expect(result.passes).toHaveLength(1);
      expect(result.passes[0].productType).toBe(ProductType.SAR);
    });
  });

  describe('Feasibility Check - Success Cases', () => {
    it('should successfully check feasibility with complete scoring', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockFeasibilityCheckResponse,
        status: 201,
      });

      const result = await service.checkFeasibility({
        aoi: validWKTPolygon,
        productType: ProductType.Day,
        resolution: Resolution.High,
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-22T23:59:59Z',
      });

      expect(result.id).toBe(mockFeasibilityCheckResponse.id);
      expect(result.overallScore).not.toBeNull();
      expect(result.overallScore?.feasibility).toBe(0.85);
      expect(result.overallScore?.weatherScore?.weatherScore).toBe(0.9);
      expect(result.overallScore?.providerScore.score).toBe(0.8);
    });

    it('should check feasibility with required provider', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockFeasibilityCheckResponse,
        status: 201,
      });

      const result = await service.checkFeasibility({
        aoi: validWKTPolygon,
        productType: ProductType.Day,
        resolution: Resolution.High,
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-22T23:59:59Z',
        requiredProvider: 'PLANET',
      });

      expect(result.overallScore?.providerScore.providerScores[0].provider).toBe(Provider.Planet);
    });

    it('should handle provider opportunities with window IDs', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockFeasibilityCheckResponse,
        status: 201,
      });

      const result = await service.checkFeasibility({
        aoi: validWKTPolygon,
        productType: ProductType.Day,
        resolution: Resolution.High,
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-22T23:59:59Z',
        requiredProvider: 'PLANET',
      });

      const opportunities = result.overallScore?.providerScore.providerScores[0].opportunities;
      expect(opportunities).toHaveLength(2);
      expect(opportunities?.[0].providerWindowId).toBe(
        '987e6543-e21b-43d1-b789-123456789abc',
      );
      expect(opportunities?.[1].providerWindowId).toBe(
        '456e7890-f1ab-34c5-d678-901234567890',
      );
    });

    it('should handle null overall score (pending feasibility)', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockPendingFeasibilityCheckResponse,
        status: 201,
      });

      const result = await service.checkFeasibility({
        aoi: validWKTPolygon,
        productType: ProductType.Day,
        resolution: Resolution.High,
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-22T23:59:59Z',
      });

      expect(result.id).toBe(mockPendingFeasibilityCheckResponse.id);
      expect(result.overallScore).toBeNull();
    });

    it('should check feasibility with cloud coverage constraints', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockFeasibilityCheckResponse,
        status: 201,
      });

      const result = await service.checkFeasibility({
        aoi: validWKTPolygon,
        productType: ProductType.Day,
        resolution: Resolution.High,
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-22T23:59:59Z',
        maxCloudCoveragePercent: 20,
      });

      expect(result.overallScore).not.toBeNull();
    });

    it('should check feasibility for priority item', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockFeasibilityCheckResponse,
        status: 201,
      });

      const result = await service.checkFeasibility({
        aoi: validWKTPolygon,
        productType: ProductType.Day,
        resolution: Resolution.High,
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-22T23:59:59Z',
        priorityItem: true,
      });

      expect(result.id).toBeDefined();
    });
  });

  describe('Get Feasibility By ID - Success Cases', () => {
    it('should successfully retrieve completed feasibility by ID', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockFeasibilityCheckResponse,
        status: 200,
      });

      const result = await service.getFeasibilityById(mockFeasibilityCheckResponse.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockFeasibilityCheckResponse.id);
      expect(result?.overallScore?.feasibility).toBe(0.85);
    });

    it('should retrieve pending feasibility check', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockPendingFeasibilityCheckResponse,
        status: 200,
      });

      const result = await service.getFeasibilityById(mockPendingFeasibilityCheckResponse.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockPendingFeasibilityCheckResponse.id);
      expect(result?.overallScore).toBeNull();
    });

    it('should return null for non-existent feasibility', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: null,
        status: 200,
      });

      const result = await service.getFeasibilityById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).response = {
        status: 401,
        data: mockAuthenticationError,
      };
      (authError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(authError);

      await expect(
        service.checkFeasibility({
          aoi: validWKTPolygon,
          productType: ProductType.Day,
          resolution: Resolution.High,
          startDate: '2025-01-15T00:00:00Z',
          endDate: '2025-01-22T23:59:59Z',
        }),
      ).rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation failed');
      (validationError as any).response = {
        status: 422,
        data: mockValidationError,
      };
      (validationError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(validationError);

      await expect(
        service.predictPasses({
          aoi: 'INVALID WKT',
          fromDate: '2025-01-15T00:00:00Z',
          toDate: '2025-01-22T23:59:59Z',
        }),
      ).rejects.toThrow();
    });

    it('should handle 404 errors for getFeasibilityById', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as any).response = {
        status: 404,
        data: mockNotFoundError,
      };
      (notFoundError as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(notFoundError);

      await expect(service.getFeasibilityById('non-existent-id')).rejects.toThrow();
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as any).response = {
        status: 429,
        data: mockRateLimitError,
        headers: { 'retry-after': '60' },
      };
      (rateLimitError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(rateLimitError);

      await expect(
        service.predictPasses({
          aoi: validWKTPolygon,
          fromDate: '2025-01-15T00:00:00Z',
          toDate: '2025-01-22T23:59:59Z',
        }),
      ).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Server error');
      (serverError as any).response = {
        status: 500,
        data: mockServerError,
      };
      (serverError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(serverError);

      await expect(
        service.checkFeasibility({
          aoi: validWKTPolygon,
          productType: ProductType.Day,
          resolution: Resolution.High,
          startDate: '2025-01-15T00:00:00Z',
          endDate: '2025-01-22T23:59:59Z',
        }),
      ).rejects.toThrow();
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full feasibility workflow with polling', async () => {
      // Step 1: Check feasibility (initially pending)
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockPendingFeasibilityCheckResponse,
        status: 201,
      });

      const checkResult = await service.checkFeasibility({
        aoi: validWKTPolygon,
        productType: ProductType.Day,
        resolution: Resolution.High,
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-22T23:59:59Z',
      });

      expect(checkResult.id).toBe(mockPendingFeasibilityCheckResponse.id);
      expect(checkResult.overallScore).toBeNull();

      // Step 2: Poll for results (now completed)
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockFeasibilityCheckResponse,
        status: 200,
      });

      const pollResult = await service.getFeasibilityById(checkResult.id);

      expect(pollResult?.overallScore).not.toBeNull();
      expect(pollResult?.overallScore?.feasibility).toBe(0.85);
    });

    it('should predict passes and then check feasibility', async () => {
      // Step 1: Predict passes
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockPassPredictionResponse,
        status: 200,
      });

      const passes = await service.predictPasses({
        aoi: validWKTPolygon,
        fromDate: '2025-01-15T00:00:00Z',
        toDate: '2025-01-22T23:59:59Z',
        productTypes: [ProductType.Day],
      });

      expect(passes.passes).toHaveLength(2);

      // Step 2: Check feasibility for the same parameters
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockFeasibilityCheckResponse,
        status: 201,
      });

      const feasibility = await service.checkFeasibility({
        aoi: validWKTPolygon,
        productType: ProductType.Day,
        resolution: Resolution.High,
        startDate: '2025-01-15T00:00:00Z',
        endDate: '2025-01-22T23:59:59Z',
      });

      expect(feasibility.overallScore).not.toBeNull();
    });
  });
});
