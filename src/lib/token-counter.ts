/**
 * Token Counting Utilities
 *
 * Provides utilities for estimating token counts in OpenAI API requests
 * to track costs and manage token limits.
 *
 * Note: This uses a simple approximation. For production use, consider
 * using tiktoken or similar libraries for accurate token counting.
 *
 * @packageDocumentation
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Token usage statistics
 */
export interface TokenUsage {
  /** Tokens in the prompt */
  promptTokens: number;
  /** Tokens in the completion */
  completionTokens: number;
  /** Total tokens (prompt + completion) */
  totalTokens: number;
}

/**
 * Token cost information
 */
export interface TokenCost {
  /** Cost of prompt tokens in USD */
  promptCost: number;
  /** Cost of completion tokens in USD */
  completionCost: number;
  /** Total cost in USD */
  totalCost: number;
}

/**
 * Pricing per 1M tokens for different models (as of 2025)
 * Note: Update these values based on current OpenAI pricing
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5': {
    input: 10.0, // $10 per 1M input tokens (estimate)
    output: 30.0, // $30 per 1M output tokens (estimate)
  },
  'gpt-4-turbo': {
    input: 10.0, // $10 per 1M input tokens
    output: 30.0, // $30 per 1M output tokens
  },
  'gpt-4': {
    input: 30.0, // $30 per 1M input tokens
    output: 60.0, // $60 per 1M output tokens
  },
  'gpt-3.5-turbo': {
    input: 0.5, // $0.50 per 1M input tokens
    output: 1.5, // $1.50 per 1M output tokens
  },
};

/**
 * Estimate token count for a text string
 *
 * This uses a simple approximation: ~4 characters per token for English text.
 * For more accurate counts, use tiktoken library.
 *
 * @param text - Text to count tokens for
 * @returns Estimated token count
 *
 * @example
 * ```typescript
 * const tokens = estimateTokens('Hello, world!');
 * console.log(`Estimated tokens: ${tokens}`);
 * ```
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }

  // Simple approximation: ~4 characters per token for English text
  // Add buffer for special tokens and formatting
  const baseTokens = Math.ceil(text.length / 4);
  const bufferTokens = Math.ceil(baseTokens * 0.1); // 10% buffer

  return baseTokens + bufferTokens;
}

/**
 * Estimate token count for chat messages
 *
 * @param messages - Chat messages to count tokens for
 * @returns Estimated token count
 *
 * @example
 * ```typescript
 * const messages = [
 *   { role: 'system', content: 'You are a helpful assistant.' },
 *   { role: 'user', content: 'Hello!' },
 * ];
 * const tokens = estimateMessageTokens(messages);
 * ```
 */
export function estimateMessageTokens(
  messages: ChatCompletionMessageParam[],
): number {
  let totalTokens = 0;

  for (const message of messages) {
    // Count role tokens (fixed overhead per message)
    totalTokens += 4; // Role indicator and formatting tokens

    // Count content tokens
    if (typeof message.content === 'string') {
      totalTokens += estimateTokens(message.content);
    } else if (Array.isArray(message.content)) {
      // Handle multimodal content (text + images)
      for (const part of message.content) {
        if (part.type === 'text') {
          totalTokens += estimateTokens(part.text);
        } else if (part.type === 'image_url') {
          // Images are expensive - rough estimate
          totalTokens += 85; // Low detail image
        }
      }
    }

    // Count function/tool call tokens if present
    if ('function_call' in message && message.function_call) {
      totalTokens += estimateTokens(JSON.stringify(message.function_call));
    }

    if ('tool_calls' in message && message.tool_calls) {
      totalTokens += estimateTokens(JSON.stringify(message.tool_calls));
    }
  }

  // Add overhead for message array formatting
  totalTokens += 3;

  return totalTokens;
}

/**
 * Calculate cost based on token usage
 *
 * @param usage - Token usage statistics
 * @param model - Model name for pricing
 * @returns Cost breakdown
 *
 * @example
 * ```typescript
 * const cost = calculateCost({
 *   promptTokens: 100,
 *   completionTokens: 50,
 *   totalTokens: 150,
 * }, 'gpt-4-turbo');
 * console.log(`Total cost: $${cost.totalCost.toFixed(4)}`);
 * ```
 */
export function calculateCost(
  usage: TokenUsage,
  model: string,
): TokenCost {
  // Get pricing for model, default to GPT-4 Turbo if not found
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['gpt-4-turbo']!;

  // Calculate costs (pricing is per 1M tokens)
  const promptCost = (usage.promptTokens / 1_000_000) * pricing.input;
  const completionCost = (usage.completionTokens / 1_000_000) * pricing.output;
  const totalCost = promptCost + completionCost;

  return {
    promptCost,
    completionCost,
    totalCost,
  };
}

/**
 * Format token usage for logging
 *
 * @param usage - Token usage statistics
 * @param model - Model name
 * @returns Formatted string with usage and cost
 *
 * @example
 * ```typescript
 * const formatted = formatTokenUsage(usage, 'gpt-4-turbo');
 * logger.info(formatted);
 * ```
 */
export function formatTokenUsage(
  usage: TokenUsage,
  model: string,
): string {
  const cost = calculateCost(usage, model);

  return [
    `Tokens: ${usage.totalTokens}`,
    `(prompt: ${usage.promptTokens}, completion: ${usage.completionTokens})`,
    `Cost: $${cost.totalCost.toFixed(6)}`,
    `(prompt: $${cost.promptCost.toFixed(6)}, completion: $${cost.completionCost.toFixed(6)})`,
  ].join(' ');
}

/**
 * Check if token count is within limit
 *
 * @param tokenCount - Current token count
 * @param limit - Token limit
 * @param buffer - Safety buffer (default 10%)
 * @returns True if within limit
 *
 * @example
 * ```typescript
 * if (!isWithinTokenLimit(tokens, 4096)) {
 *   throw new Error('Message too long');
 * }
 * ```
 */
export function isWithinTokenLimit(
  tokenCount: number,
  limit: number,
  buffer: number = 0.1,
): boolean {
  const effectiveLimit = Math.floor(limit * (1 - buffer));
  return tokenCount <= effectiveLimit;
}

/**
 * Get model token limit
 *
 * @param model - Model name
 * @returns Token limit for the model
 */
export function getModelTokenLimit(model: string): number {
  const limits: Record<string, number> = {
    'gpt-5': 128000, // Estimate
    'gpt-4-turbo': 128000,
    'gpt-4': 8192,
    'gpt-3.5-turbo': 16385,
  };

  return limits[model] ?? 8192; // Default to conservative limit
}

/**
 * Truncate messages to fit within token limit
 *
 * Removes older messages while keeping system message and recent context.
 *
 * @param messages - Chat messages
 * @param maxTokens - Maximum token limit
 * @returns Truncated messages
 */
export function truncateMessages(
  messages: ChatCompletionMessageParam[],
  maxTokens: number,
): ChatCompletionMessageParam[] {
  if (messages.length === 0) {
    return messages;
  }

  // Always keep system message if it's the first message
  const systemMessage = messages[0]?.role === 'system' ? messages[0] : null;
  const conversationMessages = systemMessage ? messages.slice(1) : messages;

  let totalTokens = systemMessage ? estimateMessageTokens([systemMessage]) : 0;
  const result: ChatCompletionMessageParam[] = systemMessage ? [systemMessage] : [];

  // Add messages from newest to oldest until we hit the limit
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const message = conversationMessages[i]!;
    const messageTokens = estimateMessageTokens([message]);

    if (totalTokens + messageTokens <= maxTokens) {
      result.splice(systemMessage ? 1 : 0, 0, message);
      totalTokens += messageTokens;
    } else {
      break;
    }
  }

  return result;
}
