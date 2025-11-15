/**
 * MCP Server Implementation
 *
 * This module implements the core Model Context Protocol server for SkyFi satellite imagery ordering.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { logger } from '../lib/logger.js';
import { MCPServerConfig } from './config.js';
import { SkyFiClient } from '../skyfi/client.js';
import { createConfigFromEnv } from '../skyfi/config.js';

/**
 * SkyFi MCP Server
 *
 * This class manages the MCP server lifecycle, including HTTP server setup,
 * SSE transport management, and tool registration.
 */
export class SkyFiMCPServer {
  private config: MCPServerConfig;
  private httpServer?: ReturnType<typeof createServer>;
  private mcpServer: Server;
  private skyfiClient: SkyFiClient;
  private transports: Map<string, SSEServerTransport> = new Map();

  constructor(config: MCPServerConfig) {
    this.config = config;

    // Initialize SkyFi API client
    const skyfiConfig = createConfigFromEnv();
    this.skyfiClient = new SkyFiClient(skyfiConfig);

    // Initialize MCP server
    this.mcpServer = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Set up initialization handler
    this.mcpServer.oninitialized = () => {
      logger.info('MCP server initialized successfully');
    };

    logger.info('SkyFi MCP Server created', {
      name: config.name,
      version: config.version,
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server
        this.httpServer = createServer(this.handleRequest.bind(this));

        // Start listening
        this.httpServer.listen(this.config.port, () => {
          logger.info('MCP server listening', {
            port: this.config.port,
            sseEndpoint: this.config.sseEndpoint,
            messageEndpoint: this.config.messageEndpoint,
            healthEndpoint: this.config.healthEndpoint,
          });
          resolve();
        });

        // Handle server errors
        this.httpServer.on('error', (error) => {
          logger.error('HTTP server error', { error: error.message });
          reject(error);
        });
      } catch (error) {
        logger.error('Failed to start MCP server', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        reject(error);
      }
    });
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    logger.info('Stopping MCP server...');

    // Close all transports
    for (const [sessionId, transport] of this.transports.entries()) {
      logger.debug('Closing transport', { sessionId });
      await transport.close();
    }
    this.transports.clear();

    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve, reject) => {
        this.httpServer!.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    logger.info('MCP server stopped');
  }

  /**
   * Handle incoming HTTP requests
   */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url ?? '/';
    const method = req.method ?? 'GET';

    logger.debug('HTTP request received', { method, url });

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS for CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check endpoint
    if (url === this.config.healthEndpoint && method === 'GET') {
      this.handleHealthCheck(res);
      return;
    }

    // SSE endpoint - establish SSE connection
    if (url.startsWith(this.config.sseEndpoint) && method === 'GET') {
      this.handleSSEConnection(req, res);
      return;
    }

    // Message endpoint - handle POST messages
    if (url.startsWith(this.config.messageEndpoint) && method === 'POST') {
      this.handlePostMessage(req, res);
      return;
    }

    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  /**
   * Handle health check requests
   */
  private handleHealthCheck(res: ServerResponse): void {
    const health = {
      status: 'healthy',
      name: this.config.name,
      version: this.config.version,
      timestamp: new Date().toISOString(),
      transports: this.transports.size,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health));

    logger.debug('Health check request served', health);
  }

  /**
   * Handle SSE connection establishment
   */
  private async handleSSEConnection(
    _req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    logger.info('Establishing SSE connection');

    try {
      // Create SSE transport
      const transport = new SSEServerTransport(this.config.messageEndpoint, res);

      // Set up transport event handlers
      transport.onclose = () => {
        logger.info('SSE transport closed', { sessionId: transport.sessionId });
        this.transports.delete(transport.sessionId);
      };

      transport.onerror = (error: Error) => {
        logger.error('SSE transport error', {
          sessionId: transport.sessionId,
          error: error.message,
        });
      };

      // Connect transport to MCP server
      await this.mcpServer.connect(transport);

      // Store transport for message routing
      this.transports.set(transport.sessionId, transport);

      // Start the SSE stream
      await transport.start();

      logger.info('SSE connection established', {
        sessionId: transport.sessionId,
      });
    } catch (error) {
      logger.error('Failed to establish SSE connection', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to establish SSE connection' }));
    }
  }

  /**
   * Handle POST messages
   */
  private async handlePostMessage(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    // Extract session ID from URL path
    // Expected format: /message/<sessionId>
    const sessionId = req.url?.split('/').pop();

    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session ID required' }));
      return;
    }

    // Find the transport for this session
    const transport = this.transports.get(sessionId);
    if (!transport) {
      logger.warn('Transport not found for session', { sessionId });
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }

    // Handle the POST message
    try {
      await transport.handlePostMessage(req, res);
      logger.debug('POST message handled', { sessionId });
    } catch (error) {
      logger.error('Failed to handle POST message', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to handle message' }));
    }
  }

  /**
   * Get the MCP server instance (for testing)
   */
  getMCPServer(): Server {
    return this.mcpServer;
  }

  /**
   * Get the SkyFi client instance (for tool registration)
   */
  getSkyFiClient(): SkyFiClient {
    return this.skyfiClient;
  }
}
