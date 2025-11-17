/**
 * MCP Server Implementation
 *
 * This module implements the core Model Context Protocol server for SkyFi satellite imagery ordering.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { logger } from '../lib/logger.js';
import { MCPServerConfig } from './config.js';
import { SkyFiClient } from '../skyfi/client.js';
import { createConfigFromEnv } from '../skyfi/config.js';
import { HealthChecker } from '../health/health-check.js';
import { MetricsCollector } from '../health/metrics.js';
import { createCloudWatchPublisher } from '../lib/cloudwatch.js';

// Import all MCP tools
import {
  searchArchivesToolDefinition,
  executeSearchArchives,
} from './tools/search-archives.js';
import {
  getArchiveToolDefinition,
  executeGetArchive,
} from './tools/get-archive.js';
import {
  archiveOrderTool,
  handleArchiveOrder,
} from './tools/order-archive.js';
import {
  taskingOrderTool,
  handleTaskingOrder,
} from './tools/order-tasking.js';
import {
  checkTaskingFeasibilityTool,
  executeCheckTaskingFeasibility,
} from './tools/check-feasibility.js';
import {
  predictSatellitePassesTool,
  executePredictSatellitePasses,
} from './tools/predict-passes.js';
import {
  LIST_ORDERS_TOOL,
  executeListOrders,
} from './tools/list-orders.js';
import {
  GET_ORDER_DETAILS_TOOL,
  executeGetOrderDetails,
} from './tools/get-order.js';
import {
  TRIGGER_REDELIVERY_TOOL,
  executeTriggerRedelivery,
} from './tools/redelivery.js';
import * as createNotificationTool from './tools/create-notification.js';
import * as listNotificationsTool from './tools/list-notifications.js';
import * as deleteNotificationTool from './tools/delete-notification.js';
import {
  getPricingInfoToolDefinition,
  getPricingInfo,
} from './tools/get-pricing.js';

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
  private healthChecker: HealthChecker;
  private metricsCollector: MetricsCollector;

  constructor(config: MCPServerConfig) {
    this.config = config;

    // Initialize SkyFi API client
    const skyfiConfig = createConfigFromEnv();
    this.skyfiClient = new SkyFiClient(skyfiConfig);

    // Initialize CloudWatch publisher (optional)
    const cloudWatchPublisher = createCloudWatchPublisher();

    // Initialize metrics collector
    this.metricsCollector = new MetricsCollector(cloudWatchPublisher);

    // Initialize health checker
    this.healthChecker = new HealthChecker(
      config.version,
      this.skyfiClient,
      this.metricsCollector
    );

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

    // Register tools
    this.registerTools();

    logger.info('SkyFi MCP Server created', {
      name: config.name,
      version: config.version,
    });
  }

  /**
   * Register MCP tools
   */
  private registerTools(): void {
    // Register list_tools handler
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          searchArchivesToolDefinition,
          getArchiveToolDefinition,
          archiveOrderTool,
          taskingOrderTool,
          checkTaskingFeasibilityTool,
          predictSatellitePassesTool,
          LIST_ORDERS_TOOL,
          GET_ORDER_DETAILS_TOOL,
          TRIGGER_REDELIVERY_TOOL,
          {
            name: createNotificationTool.TOOL_NAME,
            description: createNotificationTool.TOOL_DESCRIPTION,
            inputSchema: createNotificationTool.TOOL_INPUT_SCHEMA,
          },
          {
            name: listNotificationsTool.TOOL_NAME,
            description: listNotificationsTool.TOOL_DESCRIPTION,
            inputSchema: listNotificationsTool.TOOL_INPUT_SCHEMA,
          },
          {
            name: deleteNotificationTool.TOOL_NAME,
            description: deleteNotificationTool.TOOL_DESCRIPTION,
            inputSchema: deleteNotificationTool.TOOL_INPUT_SCHEMA,
          },
          getPricingInfoToolDefinition(),
        ],
      };
    });

    // Register call_tool handler
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();

      logger.info('Tool call requested', { toolName: name });

      // Record request metric
      this.metricsCollector.recordRequest(name);
      this.metricsCollector.recordToolCall(name);

      try {
        let result: string | { content: Array<{ type: string; text: string }> };

        switch (name) {
          case 'search_satellite_archives':
            result = await executeSearchArchives(args, this.skyfiClient);
            break;

          case 'get_archive_details':
            result = await executeGetArchive(args, this.skyfiClient);
            break;

          case 'order_archive_imagery':
            result = await handleArchiveOrder(args, this.skyfiClient);
            break;

          case 'order_tasking_imagery':
            result = await handleTaskingOrder(args, this.skyfiClient);
            break;

          case 'check_tasking_feasibility':
            result = await executeCheckTaskingFeasibility(this.skyfiClient, args);
            break;

          case 'predict_satellite_passes':
            result = await executePredictSatellitePasses(this.skyfiClient, args);
            break;

          case 'list_orders':
            return await executeListOrders(this.skyfiClient, args);

          case 'get_order_details':
            return await executeGetOrderDetails(this.skyfiClient, args);

          case 'trigger_order_redelivery':
            return await executeTriggerRedelivery(this.skyfiClient, args);

          case 'create_monitoring_notification':
            return await createNotificationTool.executeCreateNotification(
              this.skyfiClient,
              args
            );

          case 'list_notifications':
            return await listNotificationsTool.executeListNotifications(
              this.skyfiClient,
              args
            );

          case 'delete_notification':
            return await deleteNotificationTool.executeDeleteNotification(
              this.skyfiClient,
              args
            );

          case 'get_pricing_info':
            result = await getPricingInfo(this.skyfiClient, args);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        // Record latency
        const latency = Date.now() - startTime;
        this.metricsCollector.recordLatency(latency, name);

        // If result is already in MCP format, return it; otherwise wrap it
        if (typeof result === 'object' && 'content' in result) {
          return result;
        }

        return {
          content: [
            {
              type: 'text',
              text: result as string,
            },
          ],
        };
      } catch (error) {
        // Record error metric
        const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
        this.metricsCollector.recordError(errorType, name);

        // Record latency even for errors
        const latency = Date.now() - startTime;
        this.metricsCollector.recordLatency(latency, name);

        logger.error('Tool execution error', {
          toolName: name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });

    logger.info('MCP tools registered', {
      count: 13,
      tools: [
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
      ],
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

    // Stop metrics collector
    this.metricsCollector.stop();

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
      this.handleHealthCheck(res).catch((error) => {
        logger.error('Health check handler error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
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
  private async handleHealthCheck(res: ServerResponse): Promise<void> {
    try {
      // Perform full health check (with deep checks)
      const health = await this.healthChecker.fullCheck({
        includeSkyFiCheck: true,
        includeMetrics: true,
        includeDeepCheck: true,
        timeout: 3000,
      });

      // Add transport count to response
      const responseWithTransports = {
        ...health,
        activeTransports: this.transports.size,
      };

      // Set HTTP status based on health status
      const httpStatus = health.status === 'healthy' ? 200 : 503;

      res.writeHead(httpStatus, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responseWithTransports, null, 2));

      logger.debug('Health check request served', {
        status: health.status,
        transports: this.transports.size,
      });
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      );
    }
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
