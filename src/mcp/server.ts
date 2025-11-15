/**
 * MCP Server Implementation
 *
 * This module provides the main MCP server class that initializes the server,
 * sets up HTTP/SSE transport, handles tool registration, and manages the
 * server lifecycle.
 */

import type { Server as HTTPServer } from 'http';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import express, { type Express } from 'express';

import { ConfigurationError } from '../lib/errors.js';
import { logger, withCorrelationId } from '../lib/logger.js';

import { createMCPConfig, validateMCPConfig, type MCPServerConfig } from './config.js';
import { createMCPTransport, type MCPTransport } from './transport.js';

/**
 * Tool handler function type
 */
export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

/**
 * Registered tool information
 */
export interface RegisteredTool {
  /**
   * Tool definition
   */
  tool: Tool;

  /**
   * Tool handler function
   */
  handler: ToolHandler;
}

/**
 * MCP Server class
 *
 * Manages the MCP server lifecycle including initialization, tool registration,
 * HTTP/SSE transport, and graceful shutdown.
 */
export class MCPServer {
  private config: MCPServerConfig;

  private mcpServer: Server;

  private transport: MCPTransport;

  private app: Express;

  private httpServer: HTTPServer | null = null;

  private tools: Map<string, RegisteredTool>;

  private isStarted = false;

  /**
   * Creates a new MCP server instance
   *
   * @param config - Partial configuration to override defaults
   *
   * @example
   * ```typescript
   * const server = new MCPServer({
   *   name: 'skyfi-mcp',
   *   version: '1.0.0',
   *   port: 3000,
   * });
   * ```
   */
  constructor(config?: Partial<MCPServerConfig>) {
    this.config = createMCPConfig(config);
    validateMCPConfig(this.config);

    this.tools = new Map();

    // Initialize MCP server
    this.mcpServer = new Server(
      {
        name: this.config.name,
        version: this.config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // Initialize transport
    this.transport = createMCPTransport(this.mcpServer, this.config);

    // Initialize Express app
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();

    logger.info('MCP server instance created', {
      name: this.config.name,
      version: this.config.version,
      port: this.config.port,
    });
  }

  /**
   * Sets up Express middleware
   */
  private setupMiddleware(): void {
    // Parse JSON request bodies
    this.app.use(express.json());

    // CORS middleware
    this.app.use((req, res, next) => {
      this.transport.applyCORSHeaders(req, res);
      next();
    });

    // Request logging middleware
    this.app.use((req, _res, next) => {
      const correlationId = withCorrelationId('http-request');
      correlationId.debug('HTTP request received', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });
  }

  /**
   * Sets up Express routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      this.transport.handleHealthCheck(req, res);
    });

    // CORS preflight
    this.app.options('*', (req, res) => {
      this.transport.handleCORSPreflight(req, res);
    });

    // SSE endpoint for streaming
    this.app.get('/sse', (req, res, next) => {
      this.transport.handleSSEConnection(req, res).catch(next);
    });

    // HTTP POST endpoint for MCP requests
    this.app.post('/message', (req, res, next) => {
      this.transport.handleHTTPRequest(req, res).catch(next);
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Endpoint not found',
        path: req.path,
      });
    });

    // Error handler
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, max-len
    this.app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Express error handler', {
        error: err.message,
        stack: err.stack,
        path: req.path,
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: 'An internal server error occurred',
        });
      }
    });
  }

  /**
   * Registers an MCP tool
   *
   * Tools are functions that AI agents can call through the MCP protocol.
   * This method will be used in Block 5 PRs to add actual SkyFi functionality.
   *
   * @param name - Tool name (must be unique)
   * @param tool - Tool definition with schema
   * @param handler - Tool handler function
   * @throws {ConfigurationError} If tool name is already registered
   *
   * @example
   * ```typescript
   * server.registerTool('search_archives', {
   *   name: 'search_archives',
   *   description: 'Search satellite imagery archives',
   *   inputSchema: {
   *     type: 'object',
   *     properties: {
   *       aoi: { type: 'string' },
   *     },
   *   },
   * }, async (args) => {
   *   // Implementation
   *   return results;
   * });
   * ```
   */
  registerTool(name: string, tool: Tool, handler: ToolHandler): void {
    if (this.tools.has(name)) {
      throw new ConfigurationError(`Tool '${name}' is already registered`);
    }

    this.tools.set(name, { tool, handler });

    logger.info('Tool registered', {
      toolName: name,
      description: tool.description,
    });
  }

  /**
   * Gets a list of all registered tools
   *
   * @returns Array of tool names
   */
  getRegisteredTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Gets tool information
   *
   * @param name - Tool name
   * @returns Tool information or undefined if not found
   */
  getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Starts the MCP server
   *
   * Starts listening on the configured port and sets up MCP protocol handling.
   *
   * @returns Promise that resolves when server is started
   * @throws {ConfigurationError} If server is already started
   *
   * @example
   * ```typescript
   * await server.start();
   * console.log('Server is running on port', server.port);
   * ```
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      throw new ConfigurationError('Server is already started');
    }

    return new Promise((resolve, reject) => {
      try {
        this.httpServer = this.app.listen(this.config.port, () => {
          this.isStarted = true;

          logger.info('MCP server started', {
            name: this.config.name,
            version: this.config.version,
            port: this.config.port,
            environment: process.env['NODE_ENV'] ?? 'development',
            registeredTools: this.tools.size,
          });

          resolve();
        });

        this.httpServer.on('error', (error: Error) => {
          logger.error('Server error', {
            error: error.message,
            stack: error.stack,
          });
          reject(error);
        });
      } catch (error) {
        logger.error('Failed to start server', {
          error: error instanceof Error ? error.message : String(error),
        });
        reject(error);
      }
    });
  }

  /**
   * Stops the MCP server gracefully
   *
   * Closes all connections and cleans up resources. Waits for pending
   * requests to complete before shutting down.
   *
   * @param timeout - Maximum time to wait for graceful shutdown in ms
   * @returns Promise that resolves when server is stopped
   *
   * @example
   * ```typescript
   * await server.stop(5000); // Wait max 5 seconds
   * console.log('Server stopped');
   * ```
   */
  async stop(timeout = 10000): Promise<void> {
    if (!this.isStarted || !this.httpServer) {
      logger.warn('Server is not started, nothing to stop');
      return;
    }

    logger.info('Stopping MCP server', {
      timeout,
      activeConnections: this.transport.getActiveConnectionCount(),
    });

    // Close all SSE connections
    this.transport.closeAllConnections();

    // Close HTTP server
    await new Promise<void>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        logger.warn('Graceful shutdown timeout, forcing close');
        resolve();
      }, timeout);

      this.httpServer!.close((err) => {
        clearTimeout(timeoutHandle);
        if (err) {
          logger.error('Error closing HTTP server', {
            error: err.message,
          });
          reject(err);
        } else {
          this.isStarted = false;
          logger.info('MCP server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Gets the server configuration
   *
   * @returns Server configuration
   */
  get configuration(): MCPServerConfig {
    return { ...this.config };
  }

  /**
   * Gets the server port
   *
   * @returns Port number
   */
  get port(): number {
    return this.config.port;
  }

  /**
   * Checks if the server is started
   *
   * @returns True if server is started
   */
  get started(): boolean {
    return this.isStarted;
  }

  /**
   * Gets the Express app instance
   *
   * This can be used for testing or adding custom routes.
   *
   * @returns Express app instance
   */
  get expressApp(): Express {
    return this.app;
  }
}

/**
 * Creates a new MCP server instance
 *
 * @param config - Partial configuration to override defaults
 * @returns MCP server instance
 *
 * @example
 * ```typescript
 * const server = createMCPServer({
 *   port: 8080,
 *   logLevel: 'debug',
 * });
 * ```
 */
export function createMCPServer(config?: Partial<MCPServerConfig>): MCPServer {
  return new MCPServer(config);
}
