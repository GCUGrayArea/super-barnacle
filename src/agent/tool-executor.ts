/**
 * MCP Tool Executor
 *
 * Provides a wrapper for executing MCP tools from the demo agent.
 * Converts MCP tool definitions to OpenAI function schemas and handles
 * tool execution with proper error handling and result formatting.
 *
 * @packageDocumentation
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import { logger } from '../lib/logger.js';
import { SkyFiClient } from '../skyfi/client.js';
import { createConfigFromEnv } from '../skyfi/config.js';

// Import MCP tool definitions and handlers
import {
  searchArchivesToolDefinition,
  executeSearchArchives,
} from '../mcp/tools/search-archives.js';
import {
  getArchiveToolDefinition,
  executeGetArchive,
} from '../mcp/tools/get-archive.js';
import {
  archiveOrderTool,
  handleArchiveOrder,
} from '../mcp/tools/order-archive.js';
import {
  taskingOrderTool,
  handleTaskingOrder,
} from '../mcp/tools/order-tasking.js';
import {
  checkTaskingFeasibilityTool,
  executeCheckTaskingFeasibility,
} from '../mcp/tools/check-feasibility.js';
import {
  predictSatellitePassesTool,
  executePredictSatellitePasses,
} from '../mcp/tools/predict-passes.js';
import {
  LIST_ORDERS_TOOL,
  executeListOrders,
} from '../mcp/tools/list-orders.js';
import {
  GET_ORDER_DETAILS_TOOL,
  executeGetOrderDetails,
} from '../mcp/tools/get-order.js';
import {
  TRIGGER_REDELIVERY_TOOL,
  executeTriggerRedelivery,
} from '../mcp/tools/redelivery.js';
import {
  TOOL_NAME as CREATE_NOTIFICATION_NAME,
  TOOL_DESCRIPTION as CREATE_NOTIFICATION_DESC,
  TOOL_INPUT_SCHEMA as CREATE_NOTIFICATION_SCHEMA,
  executeCreateNotification,
} from '../mcp/tools/create-notification.js';
import {
  TOOL_NAME as LIST_NOTIFICATIONS_NAME,
  TOOL_DESCRIPTION as LIST_NOTIFICATIONS_DESC,
  TOOL_INPUT_SCHEMA as LIST_NOTIFICATIONS_SCHEMA,
  executeListNotifications,
} from '../mcp/tools/list-notifications.js';
import {
  TOOL_NAME as DELETE_NOTIFICATION_NAME,
  TOOL_DESCRIPTION as DELETE_NOTIFICATION_DESC,
  TOOL_INPUT_SCHEMA as DELETE_NOTIFICATION_SCHEMA,
  executeDeleteNotification,
} from '../mcp/tools/delete-notification.js';
import {
  getPricingInfoToolDefinition,
  getPricingInfo,
} from '../mcp/tools/get-pricing.js';

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  /** Tool name that was executed */
  toolName: string;
  /** Success status */
  success: boolean;
  /** Result data (on success) */
  result?: unknown;
  /** Error message (on failure) */
  error?: string;
  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * Tool executor error
 */
export class ToolExecutorError extends Error {
  constructor(
    message: string,
    public toolName: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'ToolExecutorError';
    Object.setPrototypeOf(this, ToolExecutorError.prototype);
  }
}

/**
 * MCP Tool Executor
 *
 * Manages execution of MCP tools for the demo agent, including conversion
 * of MCP tool definitions to OpenAI function schemas.
 */
export class ToolExecutor {
  private skyfiClient: SkyFiClient;
  private toolHandlers: Map<string, (args: unknown) => Promise<unknown>>;

  /**
   * Create a tool executor
   *
   * @param skyfiClient - Optional SkyFi client (creates one if not provided)
   */
  constructor(skyfiClient?: SkyFiClient) {
    this.skyfiClient = skyfiClient ?? new SkyFiClient(createConfigFromEnv());
    this.toolHandlers = new Map();

    // Register all tool handlers
    this.registerToolHandlers();

    logger.info('Tool executor initialized', {
      toolCount: this.toolHandlers.size,
    });
  }

  /**
   * Get OpenAI function definitions for all available MCP tools
   *
   * @returns Array of OpenAI function tool definitions
   */
  getOpenAITools(): ChatCompletionTool[] {
    return [
      this.convertMCPToolToOpenAI(searchArchivesToolDefinition),
      this.convertMCPToolToOpenAI(getArchiveToolDefinition),
      this.convertMCPToolToOpenAI(archiveOrderTool),
      this.convertMCPToolToOpenAI(taskingOrderTool),
      this.convertMCPToolToOpenAI(checkTaskingFeasibilityTool),
      this.convertMCPToolToOpenAI(predictSatellitePassesTool),
      this.convertMCPToolToOpenAI(LIST_ORDERS_TOOL),
      this.convertMCPToolToOpenAI(GET_ORDER_DETAILS_TOOL),
      this.convertMCPToolToOpenAI(TRIGGER_REDELIVERY_TOOL),
      this.convertMCPToolToOpenAI({
        name: CREATE_NOTIFICATION_NAME,
        description: CREATE_NOTIFICATION_DESC,
        inputSchema: CREATE_NOTIFICATION_SCHEMA as Record<string, unknown>,
      }),
      this.convertMCPToolToOpenAI({
        name: LIST_NOTIFICATIONS_NAME,
        description: LIST_NOTIFICATIONS_DESC,
        inputSchema: LIST_NOTIFICATIONS_SCHEMA as Record<string, unknown>,
      }),
      this.convertMCPToolToOpenAI({
        name: DELETE_NOTIFICATION_NAME,
        description: DELETE_NOTIFICATION_DESC,
        inputSchema: DELETE_NOTIFICATION_SCHEMA as Record<string, unknown>,
      }),
      this.convertMCPToolToOpenAI(getPricingInfoToolDefinition()),
    ];
  }

  /**
   * Execute a tool by name with given arguments
   *
   * @param toolName - Name of the tool to execute
   * @param args - Tool arguments (as JSON object)
   * @returns Tool execution result
   */
  async executeTool(toolName: string, args: unknown): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    logger.debug('Executing tool', {
      toolName,
      args: typeof args === 'object' ? JSON.stringify(args) : args,
    });

    const handler = this.toolHandlers.get(toolName);
    if (!handler) {
      const error = `Unknown tool: ${toolName}`;
      logger.error('Tool execution failed', { toolName, error });

      return {
        toolName,
        success: false,
        error,
        executionTime: Date.now() - startTime,
      };
    }

    try {
      const result = await handler(args);
      const executionTime = Date.now() - startTime;

      logger.info('Tool execution successful', {
        toolName,
        executionTime,
      });

      return {
        toolName,
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Tool execution failed', {
        toolName,
        error: errorMessage,
        executionTime,
      });

      return {
        toolName,
        success: false,
        error: errorMessage,
        executionTime,
      };
    }
  }

  /**
   * Get list of available tool names
   *
   * @returns Array of tool names
   */
  getAvailableTools(): string[] {
    return Array.from(this.toolHandlers.keys());
  }

  /**
   * Convert MCP tool definition to OpenAI function schema
   *
   * @param mcpTool - MCP tool definition
   * @returns OpenAI function tool definition
   */
  private convertMCPToolToOpenAI(mcpTool: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: mcpTool.name,
        description: mcpTool.description,
        parameters: mcpTool.inputSchema,
      },
    };
  }

  /**
   * Register all tool handlers
   */
  private registerToolHandlers(): void {
    // Archive search tools
    this.toolHandlers.set(
      searchArchivesToolDefinition.name,
      async (args) => executeSearchArchives(args as never, this.skyfiClient),
    );

    this.toolHandlers.set(
      getArchiveToolDefinition.name,
      async (args) => executeGetArchive(args as never, this.skyfiClient),
    );

    // Order tools
    this.toolHandlers.set(
      archiveOrderTool.name,
      async (args) => handleArchiveOrder(args as never, this.skyfiClient),
    );

    this.toolHandlers.set(
      taskingOrderTool.name,
      async (args) => handleTaskingOrder(args as never, this.skyfiClient),
    );

    // Feasibility tools
    this.toolHandlers.set(
      checkTaskingFeasibilityTool.name,
      async (args) => executeCheckTaskingFeasibility(args as never, this.skyfiClient),
    );

    this.toolHandlers.set(
      predictSatellitePassesTool.name,
      async (args) => executePredictSatellitePasses(args as never, this.skyfiClient),
    );

    // Order management tools
    this.toolHandlers.set(
      LIST_ORDERS_TOOL.name,
      async (args) => executeListOrders(args as never, this.skyfiClient),
    );

    this.toolHandlers.set(
      GET_ORDER_DETAILS_TOOL.name,
      async (args) => executeGetOrderDetails(args as never, this.skyfiClient),
    );

    this.toolHandlers.set(
      TRIGGER_REDELIVERY_TOOL.name,
      async (args) => executeTriggerRedelivery(args as never, this.skyfiClient),
    );

    // Notification tools
    this.toolHandlers.set(
      CREATE_NOTIFICATION_NAME,
      async (args) => executeCreateNotification(args as never, this.skyfiClient),
    );

    this.toolHandlers.set(
      LIST_NOTIFICATIONS_NAME,
      async (args) => executeListNotifications(args as never, this.skyfiClient),
    );

    this.toolHandlers.set(
      DELETE_NOTIFICATION_NAME,
      async (args) => executeDeleteNotification(args as never, this.skyfiClient),
    );

    // Pricing tool
    const pricingToolDef = getPricingInfoToolDefinition();
    this.toolHandlers.set(
      pricingToolDef.name,
      async (args) => getPricingInfo(this.skyfiClient, args as never),
    );
  }
}

/**
 * Create a tool executor instance
 *
 * @param skyfiClient - Optional SkyFi client
 * @returns Tool executor
 *
 * @example
 * ```typescript
 * const executor = createToolExecutor();
 * const result = await executor.executeTool('search_archives', {
 *   aoi: 'POINT(-122.4194 37.7749)',
 *   limit: 10
 * });
 * ```
 */
export function createToolExecutor(skyfiClient?: SkyFiClient): ToolExecutor {
  return new ToolExecutor(skyfiClient);
}
