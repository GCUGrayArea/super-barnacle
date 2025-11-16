/**
 * SkyFi Demo Agent
 *
 * Main agent implementation that orchestrates conversations between users,
 * OpenAI's GPT models, and SkyFi MCP tools.
 *
 * @packageDocumentation
 */

import type { ChatCompletionMessageToolCall } from 'openai/resources/chat/completions.js';
import { logger } from '../lib/logger.js';
import { OpenAIClient, ChatCompletionOptions } from './openai-client.js';
import { Conversation, ConversationConfig, createConversation } from './conversation.js';
import { ToolExecutor, createToolExecutor } from './tool-executor.js';
import { formatToolCall, formatErrorForUser } from './prompts.js';

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Conversation configuration */
  conversation?: ConversationConfig;
  /** OpenAI client (creates one if not provided) */
  openaiClient?: OpenAIClient;
  /** Tool executor (creates one if not provided) */
  toolExecutor?: ToolExecutor;
  /** Maximum tool call iterations per user message */
  maxToolIterations?: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Agent response
 */
export interface AgentResponse {
  /** Response message from the agent */
  message: string;
  /** Tool calls made during this interaction */
  toolCalls?: Array<{
    name: string;
    args: unknown;
    result: unknown;
  }>;
  /** Token usage for this interaction */
  tokensUsed: number;
  /** Cost for this interaction */
  cost: number;
  /** Whether the interaction was successful */
  success: boolean;
  /** Error message if unsuccessful */
  error?: string;
}

/**
 * Agent statistics
 */
export interface AgentStats {
  /** Total messages processed */
  messagesProcessed: number;
  /** Total tool calls executed */
  toolCallsExecuted: number;
  /** Total tokens used */
  totalTokens: number;
  /** Total cost */
  totalCost: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
}

/**
 * SkyFi Demo Agent
 *
 * An AI agent that can interact with users and use MCP tools to search,
 * order, and manage satellite imagery through natural language conversations.
 */
export class SkyFiAgent {
  private openaiClient: OpenAIClient;
  private conversation: Conversation;
  private toolExecutor: ToolExecutor;
  private config: Required<Omit<AgentConfig, 'conversation' | 'openaiClient' | 'toolExecutor'>>;
  private stats: AgentStats;

  /**
   * Create a SkyFi agent
   *
   * @param config - Agent configuration
   */
  constructor(config: AgentConfig = {}) {
    this.openaiClient = config.openaiClient ?? new OpenAIClient();
    this.conversation = createConversation(config.conversation);
    this.toolExecutor = config.toolExecutor ?? createToolExecutor();

    this.config = {
      maxToolIterations: config.maxToolIterations ?? 5,
      verbose: config.verbose ?? false,
    };

    this.stats = {
      messagesProcessed: 0,
      toolCallsExecuted: 0,
      totalTokens: 0,
      totalCost: 0,
      averageResponseTime: 0,
    };

    logger.info('SkyFi agent initialized', {
      conversationId: this.conversation.getMetadata().id,
      maxToolIterations: this.config.maxToolIterations,
    });
  }

  /**
   * Process a user message and generate a response
   *
   * @param userMessage - Message from the user
   * @returns Agent response
   */
  async chat(userMessage: string): Promise<AgentResponse> {
    const startTime = Date.now();

    logger.info('Processing user message', {
      messageLength: userMessage.length,
      conversationId: this.conversation.getMetadata().id,
    });

    // Add user message to conversation
    this.conversation.addUserMessage(userMessage);

    try {
      // Execute agent loop with tool calling
      const result = await this.executeAgentLoop();

      // Update statistics
      this.updateStats(result, Date.now() - startTime);

      return result;
    } catch (error) {
      logger.error('Agent chat failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: this.conversation.getMetadata().id,
      });

      return {
        message: `I encountered an error: ${formatErrorForUser(error)}\n\nPlease try again or rephrase your request.`,
        success: false,
        error: formatErrorForUser(error),
        tokensUsed: 0,
        cost: 0,
      };
    }
  }

  /**
   * Get agent statistics
   *
   * @returns Agent statistics
   */
  getStats(): AgentStats {
    return { ...this.stats };
  }

  /**
   * Get conversation metadata
   *
   * @returns Conversation metadata
   */
  getConversationMetadata() {
    return this.conversation.getMetadata();
  }

  /**
   * Clear conversation history
   */
  clearConversation(): void {
    this.conversation.clear();
    logger.info('Conversation cleared', {
      conversationId: this.conversation.getMetadata().id,
    });
  }

  /**
   * Export conversation to JSON
   *
   * @returns Conversation data
   */
  exportConversation() {
    return this.conversation.toJSON();
  }

  /**
   * Execute the main agent loop with tool calling
   *
   * This handles the iterative process of:
   * 1. Call OpenAI with available tools
   * 2. If tools are called, execute them and provide results
   * 3. Repeat until a final response is generated
   *
   * @returns Agent response
   */
  private async executeAgentLoop(): Promise<AgentResponse> {
    let iterations = 0;
    let totalTokens = 0;
    let totalCost = 0;
    const toolCallsExecuted: Array<{ name: string; args: unknown; result: unknown }> = [];

    // Get available tools
    const tools = this.toolExecutor.getOpenAITools();

    while (iterations < this.config.maxToolIterations) {
      iterations++;

      if (this.config.verbose) {
        logger.debug('Agent loop iteration', {
          iteration: iterations,
          messageCount: this.conversation.getMessages().length,
        });
      }

      // Call OpenAI
      const completionResult = await this.openaiClient.createChatCompletion(
        this.conversation.getMessages(),
        {
          tools,
          toolChoice: 'auto',
        } as ChatCompletionOptions,
      );

      // Update token usage
      totalTokens += completionResult.usage.totalTokens;
      totalCost += completionResult.cost.totalCost;

      const choice = completionResult.completion.choices[0];
      if (!choice) {
        throw new Error('No completion choice returned from OpenAI');
      }
      const message = choice.message;

      // Check if we have a final response (no tool calls)
      if (!message.tool_calls || message.tool_calls.length === 0) {
        // Add assistant's final message
        this.conversation.addAssistantMessage(message.content ?? '');

        return {
          message: message.content ?? '',
          toolCalls: toolCallsExecuted.length > 0 ? toolCallsExecuted : undefined,
          tokensUsed: totalTokens,
          cost: totalCost,
          success: true,
        };
      }

      // We have tool calls to execute
      if (this.config.verbose) {
        logger.debug('Tool calls requested', {
          toolCallCount: message.tool_calls.length,
          tools: message.tool_calls.map((tc: ChatCompletionMessageToolCall) => tc.function.name),
        });
      }

      // Add assistant's message with tool calls
      this.conversation.addAssistantMessage(message.content, message.tool_calls);

      // Execute each tool call
      for (const toolCall of message.tool_calls) {
        await this.executeToolCall(toolCall, toolCallsExecuted);
      }

      // Check if we've hit max iterations
      if (iterations >= this.config.maxToolIterations) {
        logger.warn('Max tool iterations reached', {
          iterations,
          maxIterations: this.config.maxToolIterations,
        });

        return {
          message:
            "I've made several attempts to help with your request, but I'm having trouble completing it. Could you please rephrase or break down your request?",
          toolCalls: toolCallsExecuted.length > 0 ? toolCallsExecuted : undefined,
          tokensUsed: totalTokens,
          cost: totalCost,
          success: false,
          error: 'Maximum tool call iterations reached',
        };
      }
    }

    // This should not be reached, but handle it gracefully
    return {
      message: 'An unexpected error occurred. Please try again.',
      toolCalls: toolCallsExecuted,
      tokensUsed: totalTokens,
      cost: totalCost,
      success: false,
      error: 'Unexpected end of agent loop',
    };
  }

  /**
   * Execute a single tool call
   *
   * @param toolCall - Tool call from OpenAI
   * @param toolCallsExecuted - Array to track executed tool calls
   */
  private async executeToolCall(
    toolCall: ChatCompletionMessageToolCall,
    toolCallsExecuted: Array<{ name: string; args: unknown; result: unknown }>,
  ): Promise<void> {
    const toolName = toolCall.function.name;
    const toolCallId = toolCall.id;

    let args: unknown;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      const errorMessage = 'Invalid JSON arguments for tool call';
      logger.error('Tool call parsing failed', {
        toolName,
        error: errorMessage,
      });

      this.conversation.addToolMessage(
        toolCallId,
        toolName,
        JSON.stringify({ error: errorMessage }),
      );

      return;
    }

    if (this.config.verbose) {
      logger.info(`Tool call: ${formatToolCall(toolName, args as Record<string, unknown>)}`);
    }

    // Execute the tool
    const result = await this.toolExecutor.executeTool(toolName, args);

    // Track tool call
    toolCallsExecuted.push({
      name: toolName,
      args,
      result: result.result,
    });

    this.stats.toolCallsExecuted++;

    // Add tool result to conversation
    const toolResponse = result.success
      ? JSON.stringify(result.result)
      : JSON.stringify({ error: result.error });

    this.conversation.addToolMessage(toolCallId, toolName, toolResponse);

    if (this.config.verbose) {
      if (result.success) {
        logger.info(`Tool completed in ${result.executionTime}ms`);
      } else {
        logger.error(`Tool failed: ${result.error}`);
      }
    }
  }

  /**
   * Update agent statistics
   *
   * @param response - Agent response
   * @param responseTime - Response time in milliseconds
   */
  private updateStats(response: AgentResponse, responseTime: number): void {
    this.stats.messagesProcessed++;
    this.stats.totalTokens += response.tokensUsed;
    this.stats.totalCost += response.cost;

    // Update average response time
    const totalResponseTime = this.stats.averageResponseTime * (this.stats.messagesProcessed - 1);
    this.stats.averageResponseTime = (totalResponseTime + responseTime) / this.stats.messagesProcessed;
  }
}

/**
 * Create a SkyFi agent instance
 *
 * @param config - Optional agent configuration
 * @returns SkyFi agent
 *
 * @example
 * ```typescript
 * const agent = createAgent({ verbose: true });
 * const response = await agent.chat("Search for imagery of San Francisco");
 * console.log(response.message);
 * ```
 */
export function createAgent(config?: AgentConfig): SkyFiAgent {
  return new SkyFiAgent(config);
}
