/**
 * Tests for MCP Server
 */

import { SkyFiMCPServer } from '../../src/mcp/server';
import { MCPServerConfig } from '../../src/mcp/config';
import http from 'node:http';

describe('SkyFiMCPServer', () => {
  let server: SkyFiMCPServer;
  const testConfig: MCPServerConfig = {
    name: 'test-server',
    version: '1.0.0',
    port: 0, // Use random available port
    sseEndpoint: '/sse',
    messageEndpoint: '/message',
    healthEndpoint: '/health',
    skyfiApiKey: 'test-api-key',
  };

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('constructor', () => {
    it('should create server instance', () => {
      server = new SkyFiMCPServer(testConfig);
      expect(server).toBeDefined();
      expect(server.getMCPServer()).toBeDefined();
      expect(server.getSkyFiClient()).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start HTTP server', async () => {
      server = new SkyFiMCPServer(testConfig);
      await server.start();

      // Verify server is listening by checking it's defined
      expect(server).toBeDefined();
    });

    it('should reject if port is already in use', async () => {
      // Start first server
      server = new SkyFiMCPServer({ ...testConfig, port: 9999 });
      await server.start();

      // Try to start second server on same port
      const server2 = new SkyFiMCPServer({ ...testConfig, port: 9999 });
      await expect(server2.start()).rejects.toThrow();

      // Clean up second server if it started
      try {
        await server2.stop();
      } catch {
        // Ignore cleanup errors
      }
    });
  });

  describe('stop', () => {
    it('should stop server gracefully', async () => {
      server = new SkyFiMCPServer(testConfig);
      await server.start();
      await server.stop();

      // Server should be stopped
      expect(server).toBeDefined();
    });

    it('should handle stop when not started', async () => {
      server = new SkyFiMCPServer(testConfig);
      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe('health check', () => {
    it('should respond to health check requests', async () => {
      const config = { ...testConfig, port: 0 };
      server = new SkyFiMCPServer(config);
      await server.start();

      // Get the actual port the server is listening on
      const actualPort = (server as any).httpServer?.address()?.port;
      expect(actualPort).toBeDefined();

      const response = await fetch(
        `http://localhost:${actualPort}${config.healthEndpoint}`
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        status: 'healthy',
        name: config.name,
        version: config.version,
      });
      expect(data.timestamp).toBeDefined();
      expect(data.transports).toBeDefined();
    });

    it('should return 404 for unknown routes', async () => {
      const config = { ...testConfig, port: 0 };
      server = new SkyFiMCPServer(config);
      await server.start();

      const actualPort = (server as any).httpServer?.address()?.port;
      const response = await fetch(`http://localhost:${actualPort}/unknown`);

      expect(response.status).toBe(404);
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS requests', async () => {
      const config = { ...testConfig, port: 0 };
      server = new SkyFiMCPServer(config);
      await server.start();

      const actualPort = (server as any).httpServer?.address()?.port;
      const response = await fetch(`http://localhost:${actualPort}/health`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
        'GET'
      );
    });
  });
});
