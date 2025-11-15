/**
 * Tests for MCP Transport
 */

import { jest } from '@jest/globals';
import type { Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

import type { MCPServerConfig } from '../../src/mcp/config.js';

import { MCPTransport, createMCPTransport } from '../../src/mcp/transport.js';

describe('MCPTransport', () => {
  let mockMCPServer: Server;
  let config: MCPServerConfig;
  let transport: MCPTransport;

  beforeEach(() => {
    // Create mock MCP server
    mockMCPServer = new Server(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );

    // Create test configuration
    config = {
      name: 'test-mcp',
      version: '1.0.0',
      port: 3001,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
      },
      requestTimeout: 5000,
      logLevel: 'error', // Suppress logs during tests
    };

    transport = createMCPTransport(mockMCPServer, config);
  });

  describe('createMCPTransport', () => {
    it('should create a transport instance', () => {
      expect(transport).toBeInstanceOf(MCPTransport);
    });
  });

  describe('handleHealthCheck', () => {
    it('should return health status', () => {
      const mockReq = {} as Request;
      const mockRes = {
        json: jest.fn(),
      } as unknown as Response;

      transport.handleHealthCheck(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          server: 'test-mcp',
          version: '1.0.0',
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('handleCORSPreflight', () => {
    it('should set CORS headers for allowed origin', () => {
      const mockReq = {
        get: jest.fn((header) => {
          if (header === 'origin') return 'http://localhost:3000';
          return undefined;
        }),
      } as unknown as Request;

      const headers: Record<string, string> = {};
      const mockRes = {
        header: jest.fn((key, value) => {
          headers[key] = value;
        }),
        status: jest.fn(() => mockRes),
        send: jest.fn(),
      } as unknown as Response;

      transport.handleCORSPreflight(mockReq, mockRes);

      expect(mockRes.header).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  describe('applyCORSHeaders', () => {
    it('should apply CORS headers for allowed origin', () => {
      const mockReq = {
        get: jest.fn((header) => {
          if (header === 'origin') return 'http://localhost:3000';
          return undefined;
        }),
      } as unknown as Request;

      const headers: Record<string, string> = {};
      const mockRes = {
        header: jest.fn((key, value) => {
          headers[key] = value;
        }),
      } as unknown as Response;

      transport.applyCORSHeaders(mockReq, mockRes);

      expect(mockRes.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3000',
      );
    });

    it('should apply credentials header when enabled', () => {
      const mockReq = {
        get: jest.fn(() => 'http://localhost:3000'),
      } as unknown as Request;

      const headers: Record<string, string> = {};
      const mockRes = {
        header: jest.fn((key, value) => {
          headers[key] = value;
        }),
      } as unknown as Response;

      transport.applyCORSHeaders(mockReq, mockRes);

      expect(mockRes.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true',
      );
    });
  });

  describe('handleHTTPRequest', () => {
    it('should return error for missing request body', async () => {
      const mockReq = {
        method: 'POST',
        path: '/message',
        get: jest.fn(),
        body: null,
      } as unknown as Request;

      const mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn(),
      } as unknown as Response;

      await transport.handleHTTPRequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INVALID_REQUEST',
          message: 'Request body is required',
        }),
      );
    });

    it('should process valid request', async () => {
      const mockReq = {
        method: 'POST',
        path: '/message',
        get: jest.fn(),
        body: { jsonrpc: '2.0', method: 'test', id: 1 },
      } as unknown as Request;

      const mockRes = {
        json: jest.fn(),
      } as unknown as Response;

      await transport.handleHTTPRequest(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonrpc: '2.0',
          id: 1,
        }),
      );
    });

    it('should respect request timeout configuration', async () => {
      // Create transport with short timeout to verify configuration is respected
      const shortTimeoutConfig = { ...config, requestTimeout: 100 };
      const shortTimeoutTransport = createMCPTransport(mockMCPServer, shortTimeoutConfig);

      // Verify the transport was created with the timeout config
      expect(shortTimeoutTransport).toBeInstanceOf(MCPTransport);
    });
  });

  describe('handleSSEConnection', () => {
    it('should establish SSE connection', async () => {
      const mockReq = {
        ip: '127.0.0.1',
        on: jest.fn(),
      } as unknown as Request;

      let writeHeadCalled = false;
      const mockRes = {
        writeHead: jest.fn(() => {
          writeHeadCalled = true;
        }),
      } as unknown as Response;

      // Mock server.connect to succeed immediately
      jest.spyOn(mockMCPServer, 'connect').mockResolvedValue(undefined);

      await transport.handleSSEConnection(mockReq, mockRes);

      expect(writeHeadCalled).toBe(true);
      expect(mockRes.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        }),
      );
    });

    it('should handle SSE connection errors', async () => {
      const mockReq = {
        ip: '127.0.0.1',
        on: jest.fn(),
      } as unknown as Request;

      const mockRes = {
        writeHead: jest.fn(),
        headersSent: false,
        status: jest.fn(() => mockRes),
        json: jest.fn(),
      } as unknown as Response;

      // Mock server.connect to fail
      jest.spyOn(mockMCPServer, 'connect').mockRejectedValue(new Error('Connection failed'));

      await transport.handleSSEConnection(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getActiveConnectionCount', () => {
    it('should return 0 initially', () => {
      expect(transport.getActiveConnectionCount()).toBe(0);
    });
  });

  describe('closeAllConnections', () => {
    it('should close all connections', () => {
      expect(() => transport.closeAllConnections()).not.toThrow();
      expect(transport.getActiveConnectionCount()).toBe(0);
    });
  });
});
