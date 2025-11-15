/**
 * Unit tests for MCP Feasibility Tools
 */

import { SkyFiClient } from '../../../src/skyfi/client.js';
import { FeasibilityService } from '../../../src/skyfi/feasibility.js';
import {
  executeCheckTaskingFeasibility,
  checkTaskingFeasibilityTool,
} from '../../../src/mcp/tools/check-feasibility.js';
import {
  executePredictSatellitePasses,
  predictSatellitePassesTool,
} from '../../../src/mcp/tools/predict-passes.js';
import type {
  FeasibilityCheckResponse,
  PassPredictionResponse,
} from '../../../src/types/feasibility.js';
import { ProductType, Resolution, Provider } from '../../../src/types/skyfi-api.js';
import { FeasibilityCheckStatus } from '../../../src/types/feasibility.js';

// Mock the feasibility service
jest.mock('../../../src/skyfi/feasibility.js');

describe('MCP Feasibility Tools', () => {
  let mockClient: jest.Mocked<SkyFiClient>;
  let mockFeasibilityService: jest.Mocked<FeasibilityService>;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;

    // Create mock feasibility service
    mockFeasibilityService = {
      checkFeasibility: jest.fn(),
      predictPasses: jest.fn(),
      getFeasibilityById: jest.fn(),
    } as unknown as jest.Mocked<FeasibilityService>;

    // Mock the FeasibilityService constructor
    (FeasibilityService as jest.MockedClass<typeof FeasibilityService>).mockImplementation(
      () => mockFeasibilityService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkTaskingFeasibilityTool', () => {
    describe('tool definition', () => {
      it('should have correct name and description', () => {
        expect(checkTaskingFeasibilityTool.name).toBe('check_tasking_feasibility');
        expect(checkTaskingFeasibilityTool.description).toContain('feasibility');
        expect(checkTaskingFeasibilityTool.description).toContain('provider_window_id');
      });

      it('should require correct parameters', () => {
        const required = checkTaskingFeasibilityTool.inputSchema.required;
        expect(required).toContain('aoi');
        expect(required).toContain('productType');
        expect(required).toContain('resolution');
        expect(required).toContain('windowStart');
        expect(required).toContain('windowEnd');
      });

      it('should define optional parameters', () => {
        const properties = checkTaskingFeasibilityTool.inputSchema.properties;
        expect(properties.maxCloudCoverage).toBeDefined();
        expect(properties.maxOffNadirAngle).toBeDefined();
        expect(properties.providers).toBeDefined();
      });
    });

    describe('executeCheckTaskingFeasibility', () => {
      const validInput = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
        productType: 'Day',
        resolution: 'High',
        windowStart: '2025-01-15T00:00:00Z',
        windowEnd: '2025-01-22T23:59:59Z',
      };

      const mockFeasibilityResponse: FeasibilityCheckResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        validUntil: '2025-01-23T00:00:00Z',
        overallScore: {
          feasibility: 0.85,
          weatherScore: {
            weatherScore: 0.9,
            weatherDetails: {
              weatherScore: 0.9,
              clouds: [
                { date: '2025-01-15', coverage: 10 },
                { date: '2025-01-16', coverage: 20 },
              ],
            },
          },
          providerScore: {
            score: 0.8,
            providerScores: [
              {
                provider: 'PLANET',
                score: 0.8,
                status: FeasibilityCheckStatus.Complete,
                opportunities: [
                  {
                    windowStart: '2025-01-15T10:00:00Z',
                    windowEnd: '2025-01-15T10:30:00Z',
                    satelliteId: 'sat-123',
                    providerWindowId: 'abc-123-def',
                  },
                ],
              },
            ],
          },
        },
      };

      it('should execute feasibility check with valid input', async () => {
        mockFeasibilityService.checkFeasibility.mockResolvedValue(mockFeasibilityResponse);

        const result = await executeCheckTaskingFeasibility(mockClient, validInput);

        expect(result).toContain('Tasking Feasibility Check Results');
        expect(result).toContain('85%'); // Feasibility score
        expect(result).toContain('PLANET');
        expect(result).toContain('abc-123-def'); // Provider window ID
        expect(mockFeasibilityService.checkFeasibility).toHaveBeenCalledWith({
          aoi: validInput.aoi,
          productType: ProductType.Day,
          resolution: Resolution.High,
          startDate: validInput.windowStart,
          endDate: validInput.windowEnd,
          maxCloudCoveragePercent: undefined,
          requiredProvider: undefined,
        });
      });

      it('should include provider filter when specified', async () => {
        mockFeasibilityService.checkFeasibility.mockResolvedValue(mockFeasibilityResponse);

        const inputWithProvider = {
          ...validInput,
          providers: ['PLANET'],
        };

        await executeCheckTaskingFeasibility(mockClient, inputWithProvider);

        expect(mockFeasibilityService.checkFeasibility).toHaveBeenCalledWith(
          expect.objectContaining({
            requiredProvider: 'PLANET',
          }),
        );
      });

      it('should include cloud coverage when specified', async () => {
        mockFeasibilityService.checkFeasibility.mockResolvedValue(mockFeasibilityResponse);

        const inputWithCloudCoverage = {
          ...validInput,
          maxCloudCoverage: 20,
        };

        await executeCheckTaskingFeasibility(mockClient, inputWithCloudCoverage);

        expect(mockFeasibilityService.checkFeasibility).toHaveBeenCalledWith(
          expect.objectContaining({
            maxCloudCoveragePercent: 20,
          }),
        );
      });

      it('should handle invalid AOI format', async () => {
        const invalidInput = {
          ...validInput,
          aoi: 'INVALID AOI FORMAT',
        };

        const result = await executeCheckTaskingFeasibility(mockClient, invalidInput);

        expect(result).toContain('Invalid input parameters');
        expect(result).toContain('WKT POLYGON');
        expect(mockFeasibilityService.checkFeasibility).not.toHaveBeenCalled();
      });

      it('should handle invalid date format', async () => {
        const invalidInput = {
          ...validInput,
          windowStart: 'invalid-date',
        };

        const result = await executeCheckTaskingFeasibility(mockClient, invalidInput);

        expect(result).toContain('Invalid input parameters');
        expect(result).toContain('ISO 8601');
        expect(mockFeasibilityService.checkFeasibility).not.toHaveBeenCalled();
      });

      it('should handle API errors gracefully', async () => {
        mockFeasibilityService.checkFeasibility.mockRejectedValue(
          new Error('API connection failed'),
        );

        const result = await executeCheckTaskingFeasibility(mockClient, validInput);

        expect(result).toContain('Error checking feasibility');
        expect(result).toContain('API connection failed');
      });

      it('should highlight provider_window_id in results', async () => {
        mockFeasibilityService.checkFeasibility.mockResolvedValue(mockFeasibilityResponse);

        const result = await executeCheckTaskingFeasibility(mockClient, validInput);

        expect(result).toContain('providerWindowId');
        expect(result).toContain('abc-123-def');
        expect(result).toContain('Required for ordering');
      });
    });
  });

  describe('predictSatellitePassesTool', () => {
    describe('tool definition', () => {
      it('should have correct name and description', () => {
        expect(predictSatellitePassesTool.name).toBe('predict_satellite_passes');
        expect(predictSatellitePassesTool.description).toContain('satellite');
        expect(predictSatellitePassesTool.description).toContain('pass');
      });

      it('should require correct parameters', () => {
        const required = predictSatellitePassesTool.inputSchema.required;
        expect(required).toContain('aoi');
        expect(required).toContain('windowStart');
        expect(required).toContain('windowEnd');
      });

      it('should define optional parameters', () => {
        const properties = predictSatellitePassesTool.inputSchema.properties;
        expect(properties.productTypes).toBeDefined();
        expect(properties.resolutions).toBeDefined();
        expect(properties.maxOffNadirAngle).toBeDefined();
      });
    });

    describe('executePredictSatellitePasses', () => {
      const validInput = {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.30, -97.70 30.30, -97.70 30.28, -97.72 30.28))',
        windowStart: '2025-01-15T00:00:00Z',
        windowEnd: '2025-01-22T23:59:59Z',
      };

      const mockPassPredictionResponse: PassPredictionResponse = {
        passes: [
          {
            provider: Provider.Planet,
            satname: 'SkySat-1',
            satid: 'skysat-1',
            noradid: '12345',
            node: 'ascending',
            productType: ProductType.Day,
            resolution: Resolution.High,
            lat: 30.29,
            lon: -97.71,
            passDate: '2025-01-16T10:00:00Z',
            meanT: 15.5,
            offNadirAngle: 12.5,
            solarElevationAngle: 45.0,
            minSquareKms: 5.0,
            maxSquareKms: 50.0,
            priceForOneSquareKm: 7.5,
            priceForOneSquareKmCents: 750,
            gsdDegMin: 0.5,
            gsdDegMax: 1.0,
          },
          {
            provider: Provider.Planet,
            satname: 'SkySat-2',
            satid: 'skysat-2',
            noradid: '12346',
            node: 'descending',
            productType: ProductType.Day,
            resolution: Resolution.VeryHigh,
            lat: 30.29,
            lon: -97.71,
            passDate: '2025-01-17T14:30:00Z',
            meanT: 18.2,
            offNadirAngle: 8.0,
            solarElevationAngle: 50.0,
            minSquareKms: 3.0,
            maxSquareKms: 30.0,
            priceForOneSquareKm: 6.0,
            priceForOneSquareKmCents: 600,
            gsdDegMin: 0.3,
            gsdDegMax: 0.5,
          },
        ],
      };

      it('should execute pass prediction with valid input', async () => {
        mockFeasibilityService.predictPasses.mockResolvedValue(mockPassPredictionResponse);

        const result = await executePredictSatellitePasses(mockClient, validInput);

        expect(result).toContain('Satellite Pass Predictions');
        expect(result).toContain('**2** satellite pass');
        expect(result).toContain('SkySat-1');
        expect(result).toContain('SkySat-2');
        expect(mockFeasibilityService.predictPasses).toHaveBeenCalledWith({
          aoi: validInput.aoi,
          fromDate: validInput.windowStart,
          toDate: validInput.windowEnd,
          productTypes: undefined,
          resolutions: undefined,
          maxOffNadirAngle: 30.0, // default value
        });
      });

      it('should filter by product types when specified', async () => {
        mockFeasibilityService.predictPasses.mockResolvedValue(mockPassPredictionResponse);

        const inputWithProductTypes = {
          ...validInput,
          productTypes: ['Day', 'SAR'],
        };

        await executePredictSatellitePasses(mockClient, inputWithProductTypes);

        expect(mockFeasibilityService.predictPasses).toHaveBeenCalledWith(
          expect.objectContaining({
            productTypes: [ProductType.Day, ProductType.SAR],
          }),
        );
      });

      it('should filter by resolutions when specified', async () => {
        mockFeasibilityService.predictPasses.mockResolvedValue(mockPassPredictionResponse);

        const inputWithResolutions = {
          ...validInput,
          resolutions: ['High', 'VeryHigh'],
        };

        await executePredictSatellitePasses(mockClient, inputWithResolutions);

        expect(mockFeasibilityService.predictPasses).toHaveBeenCalledWith(
          expect.objectContaining({
            resolutions: [Resolution.High, Resolution.VeryHigh],
          }),
        );
      });

      it('should use custom maxOffNadirAngle when specified', async () => {
        mockFeasibilityService.predictPasses.mockResolvedValue(mockPassPredictionResponse);

        const inputWithMaxAngle = {
          ...validInput,
          maxOffNadirAngle: 20,
        };

        await executePredictSatellitePasses(mockClient, inputWithMaxAngle);

        expect(mockFeasibilityService.predictPasses).toHaveBeenCalledWith(
          expect.objectContaining({
            maxOffNadirAngle: 20,
          }),
        );
      });

      it('should show recommendations for best passes', async () => {
        mockFeasibilityService.predictPasses.mockResolvedValue(mockPassPredictionResponse);

        const result = await executePredictSatellitePasses(mockClient, validInput);

        expect(result).toContain('Recommended Passes');
        expect(result).toContain('$6.00/km²'); // Better pricing on SkySat-2
        expect(result).toContain('8.0°'); // Better angle on SkySat-2
      });

      it('should handle empty results', async () => {
        mockFeasibilityService.predictPasses.mockResolvedValue({ passes: [] });

        const result = await executePredictSatellitePasses(mockClient, validInput);

        expect(result).toContain('No satellite passes found');
        expect(result).toContain('Suggestions');
      });

      it('should handle invalid AOI format', async () => {
        const invalidInput = {
          ...validInput,
          aoi: 'NOT A POLYGON',
        };

        const result = await executePredictSatellitePasses(mockClient, invalidInput);

        expect(result).toContain('Invalid input parameters');
        expect(result).toContain('WKT POLYGON');
        expect(mockFeasibilityService.predictPasses).not.toHaveBeenCalled();
      });

      it('should handle API errors gracefully', async () => {
        mockFeasibilityService.predictPasses.mockRejectedValue(
          new Error('Network timeout'),
        );

        const result = await executePredictSatellitePasses(mockClient, validInput);

        expect(result).toContain('Error predicting satellite passes');
        expect(result).toContain('Network timeout');
      });

      it('should group passes by provider', async () => {
        mockFeasibilityService.predictPasses.mockResolvedValue(mockPassPredictionResponse);

        const result = await executePredictSatellitePasses(mockClient, validInput);

        expect(result).toContain('PLANET');
        expect(result).toContain('2 passes');
      });

      it('should include pricing and timing information', async () => {
        mockFeasibilityService.predictPasses.mockResolvedValue(mockPassPredictionResponse);

        const result = await executePredictSatellitePasses(mockClient, validInput);

        expect(result).toContain('$7.50/km²');
        expect(result).toContain('$6.00/km²');
        expect(result).toContain('Off-Nadir Angle');
      });
    });
  });
});
