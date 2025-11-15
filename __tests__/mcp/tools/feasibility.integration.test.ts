/**
 * Integration tests for MCP Feasibility Tools
 *
 * These tests verify tool definitions and input validation.
 */

import {
  checkTaskingFeasibilityTool,
  executeCheckTaskingFeasibility,
} from '../../../src/mcp/tools/check-feasibility.js';
import {
  predictSatellitePassesTool,
  executePredictSatellitePasses,
} from '../../../src/mcp/tools/predict-passes.js';
import { SkyFiClient } from '../../../src/skyfi/client.js';
import { FeasibilityService } from '../../../src/skyfi/feasibility.js';

// Mock the feasibility service
jest.mock('../../../src/skyfi/feasibility.js');

describe('MCP Feasibility Tools - Integration', () => {
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

  describe('Tool Definitions', () => {
    it('check_tasking_feasibility should have correct definition', () => {
      expect(checkTaskingFeasibilityTool.name).toBe('check_tasking_feasibility');
      expect(checkTaskingFeasibilityTool.description).toContain('feasibility');
      expect(checkTaskingFeasibilityTool.description).toContain('provider_window_id');
      expect(checkTaskingFeasibilityTool.inputSchema.required).toContain('aoi');
      expect(checkTaskingFeasibilityTool.inputSchema.required).toContain('productType');
      expect(checkTaskingFeasibilityTool.inputSchema.required).toContain('resolution');
      expect(checkTaskingFeasibilityTool.inputSchema.required).toContain('windowStart');
      expect(checkTaskingFeasibilityTool.inputSchema.required).toContain('windowEnd');
    });

    it('predict_satellite_passes should have correct definition', () => {
      expect(predictSatellitePassesTool.name).toBe('predict_satellite_passes');
      expect(predictSatellitePassesTool.description).toContain('satellite');
      expect(predictSatellitePassesTool.description).toContain('pass');
      expect(predictSatellitePassesTool.inputSchema.required).toContain('aoi');
      expect(predictSatellitePassesTool.inputSchema.required).toContain('windowStart');
      expect(predictSatellitePassesTool.inputSchema.required).toContain('windowEnd');
    });
  });

  describe('Tool Input Validation', () => {
    it('should validate check_tasking_feasibility input', async () => {
      const invalidInput = {
        aoi: 'INVALID',
        productType: 'Day',
        resolution: 'High',
        windowStart: '2025-01-15T00:00:00Z',
        windowEnd: '2025-01-22T23:59:59Z',
      };

      const result = await executeCheckTaskingFeasibility(mockClient, invalidInput);

      expect(result).toContain('Invalid input parameters');
      expect(result).toContain('WKT POLYGON');
    });

    it('should validate predict_satellite_passes input', async () => {
      const invalidInput = {
        aoi: 'POLYGON((1 2, 3 4, 5 6, 1 2))',
        windowStart: 'invalid-date',
        windowEnd: '2025-01-22T23:59:59Z',
      };

      const result = await executePredictSatellitePasses(mockClient, invalidInput);

      expect(result).toContain('Invalid input parameters');
      expect(result).toContain('ISO 8601');
    });

    it('should reject invalid product types', async () => {
      const invalidInput = {
        aoi: 'POLYGON((1 2, 3 4, 5 6, 1 2))',
        productType: 'InvalidType',
        resolution: 'High',
        windowStart: '2025-01-15T00:00:00Z',
        windowEnd: '2025-01-22T23:59:59Z',
      };

      const result = await executeCheckTaskingFeasibility(mockClient, invalidInput);

      expect(result).toContain('Invalid input parameters');
    });

    it('should reject invalid resolutions', async () => {
      const invalidInput = {
        aoi: 'POLYGON((1 2, 3 4, 5 6, 1 2))',
        productType: 'Day',
        resolution: 'InvalidResolution',
        windowStart: '2025-01-15T00:00:00Z',
        windowEnd: '2025-01-22T23:59:59Z',
      };

      const result = await executeCheckTaskingFeasibility(mockClient, invalidInput);

      expect(result).toContain('Invalid input parameters');
    });

    it('should reject invalid cloud coverage values', async () => {
      const invalidInput = {
        aoi: 'POLYGON((1 2, 3 4, 5 6, 1 2))',
        productType: 'Day',
        resolution: 'High',
        windowStart: '2025-01-15T00:00:00Z',
        windowEnd: '2025-01-22T23:59:59Z',
        maxCloudCoverage: 150, // Invalid: > 100
      };

      const result = await executeCheckTaskingFeasibility(mockClient, invalidInput);

      expect(result).toContain('Invalid input parameters');
    });

    it('should reject invalid off-nadir angles', async () => {
      const invalidInput = {
        aoi: 'POLYGON((1 2, 3 4, 5 6, 1 2))',
        windowStart: '2025-01-15T00:00:00Z',
        windowEnd: '2025-01-22T23:59:59Z',
        maxOffNadirAngle: 100, // Invalid: > 90
      };

      const result = await executePredictSatellitePasses(mockClient, invalidInput);

      expect(result).toContain('Invalid input parameters');
    });
  });

  describe('Tool Execution', () => {
    it('should provide helpful error messages for missing required fields', async () => {
      const incompleteInput = {
        aoi: 'POLYGON((1 2, 3 4, 5 6, 1 2))',
        // Missing productType, resolution, windowStart, windowEnd
      };

      const result = await executeCheckTaskingFeasibility(mockClient, incompleteInput);

      expect(result).toContain('Invalid input parameters');
      expect(result).toMatch(/productType|resolution|windowStart|windowEnd/);
    });
  });

  describe('Provider Window ID', () => {
    it('should highlight provider_window_id in tool description', () => {
      expect(checkTaskingFeasibilityTool.description).toContain('provider_window_id');
      expect(checkTaskingFeasibilityTool.description.toLowerCase()).toContain('required');
    });
  });

  describe('Time Window Handling', () => {
    it('should accept various time window lengths', async () => {
      const inputs = [
        {
          // Short window: 1 day
          aoi: 'POLYGON((1 2, 3 4, 5 6, 1 2))',
          windowStart: '2025-01-15T00:00:00Z',
          windowEnd: '2025-01-16T00:00:00Z',
        },
        {
          // Medium window: 1 week
          aoi: 'POLYGON((1 2, 3 4, 5 6, 1 2))',
          windowStart: '2025-01-15T00:00:00Z',
          windowEnd: '2025-01-22T00:00:00Z',
        },
        {
          // Long window: 1 month
          aoi: 'POLYGON((1 2, 3 4, 5 6, 1 2))',
          windowStart: '2025-01-15T00:00:00Z',
          windowEnd: '2025-02-15T00:00:00Z',
        },
      ];

      for (const input of inputs) {
        const result = await executePredictSatellitePasses(mockClient, input);
        // Should not contain validation errors
        expect(result).not.toContain('Invalid input parameters');
      }
    });
  });

  describe('Provider Filtering', () => {
    it('should accept valid provider filters', async () => {
      const inputs = [
        {
          aoi: 'POLYGON((1 2, 3 4, 5 6, 1 2))',
          productType: 'Day',
          resolution: 'High',
          windowStart: '2025-01-15T00:00:00Z',
          windowEnd: '2025-01-22T00:00:00Z',
          providers: ['PLANET'],
        },
        {
          aoi: 'POLYGON((1 2, 3 4, 5 6, 1 2))',
          productType: 'SAR',
          resolution: 'VeryHigh',
          windowStart: '2025-01-15T00:00:00Z',
          windowEnd: '2025-01-22T00:00:00Z',
          providers: ['UMBRA'],
        },
      ];

      for (const input of inputs) {
        const result = await executeCheckTaskingFeasibility(mockClient, input);
        // Should not contain validation errors
        expect(result).not.toContain('Invalid input parameters');
      }
    });

    it('should reject invalid providers', async () => {
      const invalidInput = {
        aoi: 'POLYGON((1 2, 3 4, 5 6, 1 2))',
        productType: 'Day',
        resolution: 'High',
        windowStart: '2025-01-15T00:00:00Z',
        windowEnd: '2025-01-22T23:59:59Z',
        providers: ['INVALID_PROVIDER'],
      };

      const result = await executeCheckTaskingFeasibility(mockClient, invalidInput);

      expect(result).toContain('Invalid input parameters');
    });
  });
});
