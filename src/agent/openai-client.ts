/**
 * OpenAI API Client
 *
 * Provides a configured OpenAI client for the demo agent with proper
 * error handling, retry logic, and token tracking.
 *
 * @packageDocumentation
 */

import OpenAI from 'openai';
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import { logger } from '../lib/logger.js';
import { retryWithBackoff } from '../lib/retry.js';
import {
  estimateMessageTokens,
  calculateCost,
  formatTokenUsage,
  isWithinTokenLimit,
  getModelTokenLimit,
  truncateMessages,
  type TokenUsage,
  type TokenCost,
} from '../lib/token-counter.js';
import { getAgentConfig, validateAgentConfig, type AgentConfig } from './config.js';

/**
 * OpenAI client error
 */
export class OpenAIClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorType?: string,
  ) {
    super(message);
    this.name = 'OpenAIClientError';
    Object.setPrototypeOf(this, OpenAIClientError.prototype);
  }
}

/**
 * Chat completion options
 */
export interface ChatCompletionOptions {
  /** Override default model */
  model?: string;
  /** Override default max tokens */
  maxTokens?: number;
  /** Override default temperature */
  temperature?: number;
  /** Enable function/tool calling */
  tools?: ChatCompletionCreateParamsNonStreaming['tools'];
  /** Tool choice mode */
  toolChoice?: ChatCompletionCreateParamsNonStreaming['tool_choice'];
  /** Stop sequences */
  stop?: string | string[];
  /** Presence penalty */
  presencePenalty?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
}

/**
 * Chat completion result with metadata
 */
export interface ChatCompletionResult {
  /** The completion response */
  completion: ChatCompletion;
  /** Token usage statistics */
  usage: TokenUsage;
  /** Cost breakdown */
  cost: TokenCost;
  /** Model used */
  model: string;
  /** Finish reason */
  finishReason: string | null;
}

/**
 * OpenAI client wrapper with retry logic and token tracking
 */
export class OpenAIClient {
  private client: OpenAI;
  private config: AgentConfig;
  private totalTokensUsed: number = 0;
  private totalCost: number = 0;

  /**
   * Create OpenAI client
   *
   * @param config - Optional agent configuration (loads from env if not provided)
   */
  constructor(config?: AgentConfig) {
    this.config = config ?? getAgentConfig();
    validateAgentConfig(this.config);

    this.client = new OpenAI({
      apiKey: this.config.openaiApiKey,
      timeout: this.config.timeout,
      maxRetries: 0, // We handle retries ourselves
    });

    logger.info('OpenAI client initialized', {
      model: this.config.model,
      maxTokens: this.config.maxTokens,
    });
  }

  /**
   * Create a chat completion
   *
   * @param messages - Chat messages
   * @param options - Completion options
   * @returns Completion result with metadata
   *
   * @example
   * ```typescript
   * const result = await client.createChatCompletion([
   *   { role: 'system', content: 'You are a helpful assistant.' },
   *   { role: 'user', content: 'Hello!' },
   * ]);
   * console.log(result.completion.choices[0].message.content);
   * ```
   */
  async createChatCompletion(
    messages: ChatCompletionMessageParam[],
    options: ChatCompletionOptions = {},
  ): Promise<ChatCompletionResult> {
    const model = options.model ?? this.config.model;
    const maxTokens = options.maxTokens ?? this.config.maxTokens;
    const temperature = options.temperature ?? this.config.temperature;

    // Validate token limits
    const modelLimit = getModelTokenLimit(model);
    const promptTokens = estimateMessageTokens(messages);

    if (!isWithinTokenLimit(promptTokens, modelLimit - maxTokens)) {
      logger.warn('Message length exceeds token limit, truncating', {
        promptTokens,
        modelLimit,
        maxTokens,
      });

      messages = truncateMessages(messages, modelLimit - maxTokens);
    }

    // Prepare request parameters
    const params: ChatCompletionCreateParamsNonStreaming = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(options.tools && { tools: options.tools }),
      ...(options.toolChoice && { tool_choice: options.toolChoice }),
      ...(options.stop && { stop: options.stop }),
      ...(options.presencePenalty !== undefined && { presence_penalty: options.presencePenalty }),
      ...(options.frequencyPenalty !== undefined && { frequency_penalty: options.frequencyPenalty }),
    };

    logger.debug('Creating chat completion', {
      model,
      messageCount: messages.length,
      estimatedPromptTokens: promptTokens,
    });

    // Execute with retry logic
    let completion: ChatCompletion;
    try {
      completion = await retryWithBackoff(
        async () => {
          try {
            return await this.client.chat.completions.create(params);
          } catch (error) {
            throw this.handleOpenAIError(error);
          }
        },
        {
          maxRetries: this.config.maxRetries,
          initialDelay: this.config.retryDelay,
          isRetryable: (error) => this.isRetryableError(error),
        },
      );
    } catch (error) {
      logger.error('Chat completion failed after retries', {
        model,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    // Extract token usage
    const usage: TokenUsage = {
      promptTokens: completion.usage?.prompt_tokens ?? promptTokens,
      completionTokens: completion.usage?.completion_tokens ?? 0,
      totalTokens: completion.usage?.total_tokens ?? promptTokens,
    };

    // Calculate cost
    const cost = calculateCost(usage, model);

    // Update totals
    this.totalTokensUsed += usage.totalTokens;
    this.totalCost += cost.totalCost;

    // Log usage
    logger.info('Chat completion successful', {
      model,
      finishReason: completion.choices[0]?.finish_reason,
      usage: formatTokenUsage(usage, model),
    });

    return {
      completion,
      usage,
      cost,
      model,
      finishReason: completion.choices[0]?.finish_reason ?? null,
    };
  }

  /**
   * Get total tokens used across all requests
   */
  getTotalTokensUsed(): number {
    return this.totalTokensUsed;
  }

  /**
   * Get total cost across all requests
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.totalTokensUsed = 0;
    this.totalCost = 0;
    logger.debug('Usage statistics reset');
  }

  /**
   * Get current configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Handle OpenAI API errors
   *
   * @param error - Error from OpenAI SDK
   * @returns Normalized error
   */
  private handleOpenAIError(error: unknown): Error {
    if (error instanceof OpenAI.APIError) {
      const statusCode = error.status;
      const errorType = error.type;
      // Extract message from error - it might be in message or in the error body
      const message = error.message || (error as any).error?.message || 'Unknown error';

      logger.error('OpenAI API error', {
        statusCode,
        errorType,
        message,
      });

      // Handle specific error types
      if (statusCode === 401) {
        return new OpenAIClientError(
          'Invalid API key. Please check your OPENAI_API_KEY environment variable.',
          statusCode,
          errorType,
        );
      }

      if (statusCode === 429) {
        return new OpenAIClientError(
          'Rate limit exceeded. Please try again later.',
          statusCode,
          errorType,
        );
      }

      if (statusCode === 503) {
        return new OpenAIClientError(
          'OpenAI service temporarily unavailable. Please try again later.',
          statusCode,
          errorType,
        );
      }

      // Handle model not found (e.g., GPT-5 not available)
      if (statusCode === 404 && (message.toLowerCase().includes('model') || message.toLowerCase().includes('not found'))) {
        return new OpenAIClientError(
          `Model '${this.config.model}' not found. It may not be available yet. Please use 'gpt-4-turbo' instead.`,
          statusCode,
          errorType,
        );
      }

      return new OpenAIClientError(
        `OpenAI API error: ${message}`,
        statusCode,
        errorType,
      );
    }

    if (error instanceof Error) {
      return error;
    }

    return new OpenAIClientError('Unknown error occurred');
  }

  /**
   * Check if error is retryable
   *
   * @param error - Error to check
   * @returns True if error should be retried
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof OpenAIClientError) {
      // Retry on rate limits and service unavailable
      if (error.statusCode === 429 || error.statusCode === 503) {
        return true;
      }

      // Retry on network errors (5xx except 501 Not Implemented)
      if (error.statusCode && error.statusCode >= 500 && error.statusCode !== 501) {
        return true;
      }

      // Don't retry on client errors (4xx) except rate limits
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        return false;
      }
    }

    // Retry on network errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('econnrefused')
      ) {
        return true;
      }
    }

    // Default to retry for unknown errors
    return true;
  }
}

/**
 * Create a default OpenAI client instance
 *
 * @returns OpenAI client
 *
 * @example
 * ```typescript
 * const client = createOpenAIClient();
 * const result = await client.createChatCompletion(messages);
 * ```
 */
export function createOpenAIClient(config?: AgentConfig): OpenAIClient {
  return new OpenAIClient(config);
}
