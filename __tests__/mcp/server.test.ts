/**
 * Tests for MCP Server
 */

import { jest } from '@jest/globals';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

import { ConfigurationError } from '../../src/lib/errors.js';

import type { MCPServerConfig } from '../../src/mcp/config.js';
import { MCPServer, createMCPServer } from '../../src/mcp/server.js';

describe('MCPServer', () => {
  let server: MCPServer;
  let testConfig: Partial<MCPServerConfig>;

  beforeEach(() => {
    testConfig = {
      name: 'test-server',
      version: '1.0.0',
      port: 3001, // Use different port for testing to avoid conflicts
      logLevel: 'error', // Suppress logs during tests
    };
  });

  afterEach(async () => {
    // Clean up server if it was started
    if (server && server.started) {
      await server.stop();
    }
  });

  describe('createMCPServer', () => {
    it('should create a server instance', () => {
      server = createMCPServer(testConfig);
      expect(server).toBeInstanceOf(MCPServer);
    });

    it('should use default configuration when not provided', () => {
      server = createMCPServer();
      expect(server).toBeInstanceOf(MCPServer);
      expect(server.port).toBeDefined();
    });
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      server = new MCPServer(testConfig);
      expect(server.port).toBe(3001);
      expect(server.configuration.name).toBe('test-server');
      expect(server.configuration.version).toBe('1.0.0');
    });

    it('should throw error for invalid port', () => {
      expect(() => {
        server = new MCPServer({
          ...testConfig,
          port: -1,
        });
      }).toThrow('Invalid port number');
    });

    it('should throw error for port > 65535', () => {
      expect(() => {
        server = new MCPServer({
          ...testConfig,
          port: 70000,
        });
      }).toThrow('Invalid port number');
    });

    it('should throw error for empty server name', () => {
      expect(() => {
        server = new MCPServer({
          ...testConfig,
          name: '',
        });
      }).toThrow('MCP server name is required');
    });

    it('should throw error for empty version', () => {
      expect(() => {
        server = new MCPServer({
          ...testConfig,
          version: '',
        });
      }).toThrow('MCP server version is required');
    });

    it('should throw error for invalid log level', () => {
      expect(() => {
        server = new MCPServer({
          ...testConfig,
          logLevel: 'invalid' as MCPServerConfig['logLevel'],
        });
      }).toThrow('Invalid log level');
    });

    it('should throw error for request timeout too short', () => {
      expect(() => {
        server = new MCPServer({
          ...testConfig,
          requestTimeout: 500, // Less than 1000ms
        });
      }).toThrow('Request timeout too short');
    });
  });

  describe('registerTool', () => {
    beforeEach(() => {
      server = new MCPServer(testConfig);
    });

    it('should register a tool', () => {
      const tool: Tool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      const handler = jest.fn().mockResolvedValue({ success: true });

      server.registerTool('test_tool', tool, handler);

      expect(server.getRegisteredTools()).toContain('test_tool');
    });

    it('should throw error for duplicate tool registration', () => {
      const tool: Tool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      const handler = jest.fn().mockResolvedValue({ success: true });

      server.registerTool('test_tool', tool, handler);

      expect(() => {
        server.registerTool('test_tool', tool, handler);
      }).toThrow(ConfigurationError);
      expect(() => {
        server.registerTool('test_tool', tool, handler);
      }).toThrow("Tool 'test_tool' is already registered");
    });

    it('should store tool information', () => {
      const tool: Tool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      const handler = jest.fn().mockResolvedValue({ success: true });

      server.registerTool('test_tool', tool, handler);

      const registeredTool = server.getTool('test_tool');
      expect(registeredTool).toBeDefined();
      expect(registeredTool?.tool).toBe(tool);
      expect(registeredTool?.handler).toBe(handler);
    });
  });

  describe('getRegisteredTools', () => {
    beforeEach(() => {
      server = new MCPServer(testConfig);
    });

    it('should return empty array initially', () => {
      expect(server.getRegisteredTools()).toEqual([]);
    });

    it('should return list of registered tool names', () => {
      const tool1: Tool = {
        name: 'tool1',
        description: 'Tool 1',
        inputSchema: { type: 'object', properties: {} },
      };

      const tool2: Tool = {
        name: 'tool2',
        description: 'Tool 2',
        inputSchema: { type: 'object', properties: {} },
      };

      server.registerTool('tool1', tool1, jest.fn());
      server.registerTool('tool2', tool2, jest.fn());

      const tools = server.getRegisteredTools();
      expect(tools).toHaveLength(2);
      expect(tools).toContain('tool1');
      expect(tools).toContain('tool2');
    });
  });

  describe('getTool', () => {
    beforeEach(() => {
      server = new MCPServer(testConfig);
    });

    it('should return undefined for non-existent tool', () => {
      expect(server.getTool('nonexistent')).toBeUndefined();
    });

    it('should return tool information', () => {
      const tool: Tool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      };

      const handler = jest.fn();
      server.registerTool('test_tool', tool, handler);

      const retrieved = server.getTool('test_tool');
      expect(retrieved).toBeDefined();
      expect(retrieved?.tool.name).toBe('test_tool');
      expect(retrieved?.handler).toBe(handler);
    });
  });

  describe('start', () => {
    beforeEach(() => {
      server = new MCPServer(testConfig);
    });

    it('should start the server', async () => {
      await expect(server.start()).resolves.not.toThrow();
      expect(server.started).toBe(true);
    });

    it('should throw error if already started', async () => {
      await server.start();
      await expect(server.start()).rejects.toThrow(ConfigurationError);
      await expect(server.start()).rejects.toThrow('Server is already started');
    });

    it('should be accessible on configured port', async () => {
      await server.start();
      expect(server.port).toBe(3001);

      // Try to make a health check request
      const response = await fetch(`http://localhost:${server.port}/health`);
      expect(response.ok).toBe(true);
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      server = new MCPServer(testConfig);
    });

    it('should stop the server', async () => {
      await server.start();
      await server.stop();
      expect(server.started).toBe(false);
    });

    it('should not throw if server is not started', async () => {
      await server.stop();
      // Should complete without throwing
      expect(true).toBe(true);
    });

    it('should close all connections', async () => {
      await server.start();
      await server.stop();

      // Try to connect - should fail
      await expect(
        fetch(`http://localhost:${server.port}/health`),
      ).rejects.toThrow();
    });
  });

  describe('properties', () => {
    beforeEach(() => {
      server = new MCPServer(testConfig);
    });

    it('should expose configuration', () => {
      const config = server.configuration;
      expect(config.name).toBe('test-server');
      expect(config.version).toBe('1.0.0');
      expect(config.port).toBe(3001);
    });

    it('should expose port', () => {
      expect(server.port).toBe(3001);
    });

    it('should expose started status', () => {
      expect(server.started).toBe(false);
    });

    it('should expose Express app', () => {
      expect(server.expressApp).toBeDefined();
      expect(typeof server.expressApp).toBe('function'); // Express apps are functions
    });
  });

  describe('health check endpoint', () => {
    beforeEach(async () => {
      server = new MCPServer(testConfig);
      await server.start();
    });

    it('should respond to health checks', async () => {
      const response = await fetch(`http://localhost:${server.port}/health`);
      expect(response.ok).toBe(true);

      const data = await response.json() as Record<string, unknown>;
      expect(data.status).toBe('healthy');
      expect(data.server).toBe('test-server');
      expect(data.version).toBe('1.0.0');
    });
  });

  describe('404 handling', () => {
    beforeEach(async () => {
      server = new MCPServer(testConfig);
      await server.start();
    });

    it('should return 404 for unknown endpoints', async () => {
      const response = await fetch(`http://localhost:${server.port}/unknown`);
      expect(response.status).toBe(404);

      const data = await response.json() as Record<string, unknown>;
      expect(data.error).toBe('NOT_FOUND');
    });
  });
});
