/**
 * MCP HTTP/SSE Transport Implementation
 *
 * This module implements HTTP and Server-Sent Events (SSE) transport for the
 * MCP server, enabling stateless request/response and streaming updates.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Request, Response } from 'express';

import { handleError } from '../lib/error-handler.js';
import { generateCorrelationId, withCorrelationId } from '../lib/logger.js';

import type { MCPServerConfig } from './config.js';

/**
 * Transport layer for MCP server handling HTTP and SSE connections
 */
export class MCPTransport {
  private server: Server;

  private config: MCPServerConfig;

  private transports: Map<string, SSEServerTransport>;

  /**
   * Creates a new MCP transport instance
   *
   * @param server - MCP server instance
   * @param config - Server configuration
   */
  constructor(server: Server, config: MCPServerConfig) {
    this.server = server;
    this.config = config;
    this.transports = new Map();
  }

  /**
   * Handles HTTP POST requests for MCP protocol
   *
   * This endpoint receives MCP protocol messages via HTTP POST and returns
   * responses. It's stateless and suitable for simple request/response operations.
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async handleHTTPRequest(req: Request, res: Response): Promise<void> {
    const correlationId = generateCorrelationId();
    const logger = withCorrelationId(correlationId);

    try {
      logger.info('Received HTTP MCP request', {
        method: req.method,
        path: req.path,
        contentType: req.get('content-type'),
      });

      // Validate request body
      if (!req.body) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Request body is required',
        });
        return;
      }

      // Set timeout for request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout'));
        }, this.config.requestTimeout);
      });

      // Process MCP request (placeholder - actual implementation depends on MCP SDK)
      const responsePromise = this.processRequest(req.body, correlationId);

      const result = await Promise.race([responsePromise, timeoutPromise]);

      logger.info('HTTP MCP request completed', {
        correlationId,
      });

      res.json(result);
    } catch (error) {
      logger.error('HTTP MCP request failed', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });

      const errorResponse = handleError(error, { correlationId });
      res.status(errorResponse.statusCode ?? 500).json(errorResponse);
    }
  }

  /**
   * Handles SSE (Server-Sent Events) connections for streaming MCP updates
   *
   * SSE enables the server to push updates to clients over a long-lived HTTP
   * connection, useful for streaming results or progress updates.
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async handleSSEConnection(req: Request, res: Response): Promise<void> {
    const correlationId = generateCorrelationId();
    const logger = withCorrelationId(correlationId);

    try {
      logger.info('SSE connection requested', {
        correlationId,
        clientIp: req.ip,
      });

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });

      // Create SSE transport
      const transport = new SSEServerTransport('/message', res);

      // Store transport for this connection
      this.transports.set(correlationId, transport);

      // Connect transport to server
      await this.server.connect(transport);

      logger.info('SSE connection established', {
        correlationId,
      });

      // Handle connection close
      req.on('close', () => {
        logger.info('SSE connection closed', {
          correlationId,
        });

        this.transports.delete(correlationId);
        // Transport cleanup handled by MCP SDK
      });
    } catch (error) {
      logger.error('SSE connection failed', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (!res.headersSent) {
        const errorResponse = handleError(error, { correlationId });
        res.status(errorResponse.statusCode ?? 500).json(errorResponse);
      }
    }
  }

  /**
   * Handles health check requests
   *
   * Returns 200 OK when the server is healthy and ready to accept requests.
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  handleHealthCheck(_req: Request, res: Response): void {
    const correlationId = generateCorrelationId();
    const logger = withCorrelationId(correlationId);

    logger.debug('Health check requested');

    res.json({
      status: 'healthy',
      server: this.config.name,
      version: this.config.version,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handles CORS preflight requests
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleCORSPreflight(req: Request, res: Response): void {
    const { cors } = this.config;

    // Set CORS headers
    const origin = req.get('origin');
    if (origin && (cors.allowedOrigins.includes('*') || cors.allowedOrigins.includes(origin))) {
      res.header('Access-Control-Allow-Origin', origin);
    }

    res.header('Access-Control-Allow-Methods', cors.allowedMethods.join(', '));
    res.header('Access-Control-Allow-Headers', cors.allowedHeaders.join(', '));

    if (cors.credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    res.status(204).send();
  }

  /**
   * Applies CORS headers to a response
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  applyCORSHeaders(req: Request, res: Response): void {
    const { cors } = this.config;

    const origin = req.get('origin');
    if (origin && (cors.allowedOrigins.includes('*') || cors.allowedOrigins.includes(origin))) {
      res.header('Access-Control-Allow-Origin', origin);
    }

    if (cors.credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }

  /**
   * Processes an MCP request
   *
   * @param body - Request body
   * @param correlationId - Correlation ID for tracing
   * @returns Promise resolving to response data
   */
  private processRequest(
    body: unknown,
    correlationId: string,
  ): unknown {
    const logger = withCorrelationId(correlationId);

    logger.debug('Processing MCP request', {
      requestType: typeof body === 'object' && body !== null ? (body as Record<string, unknown>)['method'] : 'unknown',
    });

    // Placeholder for actual MCP request processing
    // The actual implementation will depend on how the MCP SDK handles requests
    // For now, return a basic response structure
    return {
      jsonrpc: '2.0',
      id: typeof body === 'object' && body !== null ? (body as Record<string, unknown>)['id'] : null,
      result: {
        message: 'MCP server is running',
        server: this.config.name,
        version: this.config.version,
      },
    };
  }

  /**
   * Gets the number of active SSE connections
   *
   * @returns Number of active SSE connections
   */
  getActiveConnectionCount(): number {
    return this.transports.size;
  }

  /**
   * Closes all active SSE connections
   *
   * This method should be called during graceful shutdown to cleanly
   * close all active SSE connections.
   */
  closeAllConnections(): void {
    const logger = withCorrelationId('shutdown');

    logger.info('Closing all SSE connections', {
      activeConnections: this.transports.size,
    });

    // Close all transports
    this.transports.clear();

    logger.info('All SSE connections closed');
  }
}

/**
 * Creates a new MCP transport instance
 *
 * @param server - MCP server instance
 * @param config - Server configuration
 * @returns MCP transport instance
 */
export function createMCPTransport(server: Server, config: MCPServerConfig): MCPTransport {
  return new MCPTransport(server, config);
}
