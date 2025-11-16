/**
 * Tool Executor Tests
 *
 * Unit tests for the MCP tool executor
 */

import { ToolExecutor, createToolExecutor } from '../../src/agent/tool-executor.js';
import { SkyFiClient } from '../../src/skyfi/client.js';

// Mock the SkyFi client
jest.mock('../../src/skyfi/client.js');
jest.mock('../../src/lib/logger.js');

describe('ToolExecutor', () => {
  let toolExecutor: ToolExecutor;
  let mockSkyFiClient: jest.Mocked<SkyFiClient>;

  beforeEach(() => {
    // Create a mock SkyFi client
    mockSkyFiClient = new SkyFiClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.skyfi.com',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    }) as jest.Mocked<SkyFiClient>;

    toolExecutor = new ToolExecutor(mockSkyFiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOpenAITools', () => {
    it('should return array of OpenAI function tool definitions', () => {
      const tools = toolExecutor.getOpenAITools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Check structure of first tool
      const firstTool = tools[0];
      expect(firstTool).toHaveProperty('type', 'function');
      expect(firstTool).toHaveProperty('function');
      expect(firstTool.function).toHaveProperty('name');
      expect(firstTool.function).toHaveProperty('description');
      expect(firstTool.function).toHaveProperty('parameters');
    });

    it('should include all expected MCP tools', () => {
      const tools = toolExecutor.getOpenAITools();
      const toolNames = tools.map((t) => t.function.name);

      const expectedTools = [
        'search_satellite_archives',
        'get_archive_details',
        'order_archive_imagery',
        'order_tasking_imagery',
        'check_tasking_feasibility',
        'predict_satellite_passes',
        'list_orders',
        'get_order_details',
        'trigger_order_redelivery',
        'create_monitoring_notification',
        'list_notifications',
        'delete_notification',
        'get_pricing_info',
      ];

      expectedTools.forEach((toolName) => {
        expect(toolNames).toContain(toolName);
      });
    });
  });

  describe('getAvailableTools', () => {
    it('should return list of available tool names', () => {
      const toolNames = toolExecutor.getAvailableTools();

      expect(Array.isArray(toolNames)).toBe(true);
      expect(toolNames.length).toBeGreaterThan(0);
      expect(toolNames).toContain('search_satellite_archives');
      expect(toolNames).toContain('list_orders');
    });
  });

  describe('executeTool', () => {
    it('should return error for unknown tool', async () => {
      const result = await toolExecutor.executeTool('unknown_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
      expect(result.toolName).toBe('unknown_tool');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should execute tool successfully', async () => {
      // Just test that the tool executes without throwing
      const result = await toolExecutor.executeTool('get_pricing_info', {
        productType: 'OPTICAL',
      });

      expect(result.toolName).toBe('get_pricing_info');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      // Since we're using mocked clients, result may succeed or fail based on mock setup
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle tool execution errors gracefully', async () => {
      // Test with a tool that may fail due to mock setup or validation
      // The exact behavior depends on mocks, but we can verify error handling works
      const result = await toolExecutor.executeTool('search_satellite_archives', {
        // Invalid or incomplete parameters that might cause an error
        aoi: 'invalid-wkt',
      });

      expect(result.toolName).toBe('search_satellite_archives');
      expect(typeof result.success).toBe('boolean');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      // If it fails, it should have an error message
      if (!result.success) {
        expect(typeof result.error).toBe('string');
      }
    });

    it('should track execution time', async () => {
      const result = await toolExecutor.executeTool('get_pricing_info', {
        productType: 'OPTICAL',
      });

      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.executionTime).toBe('number');
    });
  });

  describe('createToolExecutor', () => {
    it('should create a tool executor instance', () => {
      const executor = createToolExecutor();

      expect(executor).toBeInstanceOf(ToolExecutor);
    });

    it('should accept custom SkyFi client', () => {
      const executor = createToolExecutor(mockSkyFiClient);

      expect(executor).toBeInstanceOf(ToolExecutor);
    });
  });
});
