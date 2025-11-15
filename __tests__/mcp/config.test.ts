/**
 * Tests for MCP Server Configuration
 */

import { loadMCPConfig } from '../../src/mcp/config';

describe('MCP Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadMCPConfig', () => {
    it('should load configuration from environment variables', () => {
      process.env['PORT'] = '4000';
      process.env['SKYFI_API_KEY'] = 'test-api-key';

      const config = loadMCPConfig();

      expect(config).toEqual({
        name: 'skyfi-mcp',
        version: '1.0.0',
        port: 4000,
        sseEndpoint: '/sse',
        messageEndpoint: '/message',
        healthEndpoint: '/health',
        skyfiApiKey: 'test-api-key',
      });
    });

    it('should use default port if PORT is not set', () => {
      process.env['SKYFI_API_KEY'] = 'test-api-key';
      delete process.env['PORT'];

      const config = loadMCPConfig();

      expect(config.port).toBe(3000);
    });

    it('should throw error if SKYFI_API_KEY is not set', () => {
      delete process.env['SKYFI_API_KEY'];

      expect(() => loadMCPConfig()).toThrow(
        'SKYFI_API_KEY environment variable is required'
      );
    });

    it('should parse PORT as integer', () => {
      process.env['PORT'] = '8080';
      process.env['SKYFI_API_KEY'] = 'test-api-key';

      const config = loadMCPConfig();

      expect(config.port).toBe(8080);
      expect(typeof config.port).toBe('number');
    });
  });
});
