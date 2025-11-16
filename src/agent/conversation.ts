/**
 * Conversation Management
 *
 * Manages conversation history, context, and message handling for the demo agent.
 * Provides utilities for maintaining conversational state across multiple interactions.
 *
 * @packageDocumentation
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { logger } from '../lib/logger.js';
import { SYSTEM_PROMPT } from './prompts.js';
import { estimateMessageTokens } from '../lib/token-counter.js';

/**
 * Maximum number of messages to retain in history
 * This prevents unbounded growth of conversation history
 */
const DEFAULT_MAX_MESSAGES = 50;

/**
 * Maximum token count for conversation history
 * When exceeded, older messages will be pruned
 */
const DEFAULT_MAX_TOKENS = 8000;

/**
 * Conversation configuration
 */
export interface ConversationConfig {
  /** Maximum number of messages to retain */
  maxMessages?: number;
  /** Maximum tokens in conversation history */
  maxTokens?: number;
  /** Custom system prompt (overrides default) */
  systemPrompt?: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  /** Conversation ID */
  id: string;
  /** When conversation started */
  startedAt: Date;
  /** Last interaction timestamp */
  lastInteractionAt: Date;
  /** Total number of messages exchanged */
  messageCount: number;
  /** Total tokens used in conversation */
  totalTokens: number;
}

/**
 * Conversation manager
 *
 * Manages conversation history and provides utilities for working with
 * chat messages in the context of the SkyFi demo agent.
 */
export class Conversation {
  private messages: ChatCompletionMessageParam[] = [];
  private config: Required<ConversationConfig>;
  private metadata: ConversationMetadata;

  /**
   * Create a new conversation
   *
   * @param config - Conversation configuration
   */
  constructor(config: ConversationConfig = {}) {
    this.config = {
      maxMessages: config.maxMessages ?? DEFAULT_MAX_MESSAGES,
      maxTokens: config.maxTokens ?? DEFAULT_MAX_TOKENS,
      systemPrompt: config.systemPrompt ?? SYSTEM_PROMPT,
      debug: config.debug ?? false,
    };

    this.metadata = {
      id: this.generateConversationId(),
      startedAt: new Date(),
      lastInteractionAt: new Date(),
      messageCount: 0,
      totalTokens: 0,
    };

    // Initialize with system prompt
    this.messages.push({
      role: 'system',
      content: this.config.systemPrompt,
    });

    logger.info('Conversation initialized', {
      conversationId: this.metadata.id,
      maxMessages: this.config.maxMessages,
      maxTokens: this.config.maxTokens,
    });
  }

  /**
   * Add a user message to the conversation
   *
   * @param content - Message content
   */
  addUserMessage(content: string): void {
    this.addMessage({
      role: 'user',
      content,
    });

    logger.debug('User message added', {
      conversationId: this.metadata.id,
      contentLength: content.length,
    });
  }

  /**
   * Add an assistant message to the conversation
   *
   * @param content - Message content
   * @param toolCalls - Optional tool calls made by the assistant
   */
  addAssistantMessage(content: string | null, toolCalls?: unknown[]): void {
    const message: ChatCompletionMessageParam = {
      role: 'assistant',
      content,
      ...(toolCalls && toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    } as ChatCompletionMessageParam;

    this.addMessage(message);

    logger.debug('Assistant message added', {
      conversationId: this.metadata.id,
      hasContent: !!content,
      toolCallCount: toolCalls?.length ?? 0,
    });
  }

  /**
   * Add a tool response message to the conversation
   *
   * @param toolCallId - ID of the tool call this is responding to
   * @param toolName - Name of the tool that was called
   * @param content - Tool response content
   */
  addToolMessage(toolCallId: string, toolName: string, content: string): void {
    this.addMessage({
      role: 'tool',
      tool_call_id: toolCallId,
      content,
    });

    logger.debug('Tool message added', {
      conversationId: this.metadata.id,
      toolName,
      toolCallId,
      contentLength: content.length,
    });
  }

  /**
   * Get all messages in the conversation
   *
   * @returns Array of chat messages
   */
  getMessages(): ChatCompletionMessageParam[] {
    return [...this.messages];
  }

  /**
   * Get conversation metadata
   *
   * @returns Conversation metadata
   */
  getMetadata(): ConversationMetadata {
    return { ...this.metadata };
  }

  /**
   * Clear conversation history (except system prompt)
   */
  clear(): void {
    const systemPrompt = this.messages[0];
    if (!systemPrompt) {
      this.messages = [];
      this.metadata.messageCount = 0;
      this.metadata.totalTokens = 0;
    } else {
      this.messages = [systemPrompt];
      this.metadata.messageCount = 0;
      this.metadata.totalTokens = estimateMessageTokens([systemPrompt]);
    }

    logger.info('Conversation cleared', {
      conversationId: this.metadata.id,
    });
  }

  /**
   * Get the last user message
   *
   * @returns Last user message or null if none exists
   */
  getLastUserMessage(): ChatCompletionMessageParam | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      if (msg && msg.role === 'user') {
        return msg;
      }
    }
    return null;
  }

  /**
   * Get the last assistant message
   *
   * @returns Last assistant message or null if none exists
   */
  getLastAssistantMessage(): ChatCompletionMessageParam | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      if (msg && msg.role === 'assistant') {
        return msg;
      }
    }
    return null;
  }

  /**
   * Get token count for current conversation
   *
   * @returns Estimated token count
   */
  getTokenCount(): number {
    return estimateMessageTokens(this.messages);
  }

  /**
   * Check if conversation is within token limits
   *
   * @returns True if within limits
   */
  isWithinLimits(): boolean {
    const tokenCount = this.getTokenCount();
    const messageCount = this.messages.length;

    return tokenCount <= this.config.maxTokens && messageCount <= this.config.maxMessages;
  }

  /**
   * Prune old messages to stay within limits
   *
   * This removes older messages (but keeps the system prompt) until
   * the conversation is within configured limits.
   */
  pruneIfNeeded(): void {
    if (this.isWithinLimits()) {
      return;
    }

    const systemPrompt = this.messages[0];
    if (!systemPrompt) {
      return;
    }
    let messagesToKeep = this.messages.slice(1); // All except system prompt

    // Calculate how many messages to remove
    const excessMessages = Math.max(0, messagesToKeep.length - (this.config.maxMessages - 1));

    if (excessMessages > 0) {
      messagesToKeep = messagesToKeep.slice(excessMessages);
      logger.debug('Pruned excess messages', {
        conversationId: this.metadata.id,
        removedCount: excessMessages,
      });
    }

    // Check token count and remove more if needed
    let currentMessages = [systemPrompt, ...messagesToKeep].filter((m): m is ChatCompletionMessageParam => m !== undefined);
    let tokenCount = estimateMessageTokens(currentMessages);

    while (tokenCount > this.config.maxTokens && messagesToKeep.length > 1) {
      // Remove oldest message (but keep at least 1 message beyond system prompt)
      messagesToKeep.shift();
      currentMessages = [systemPrompt, ...messagesToKeep].filter((m): m is ChatCompletionMessageParam => m !== undefined);
      tokenCount = estimateMessageTokens(currentMessages);
    }

    this.messages = currentMessages;
    this.metadata.totalTokens = tokenCount;

    logger.info('Conversation pruned', {
      conversationId: this.metadata.id,
      messageCount: this.messages.length,
      tokenCount,
    });
  }

  /**
   * Export conversation to JSON
   *
   * @returns JSON representation of conversation
   */
  toJSON(): {
    metadata: ConversationMetadata;
    messages: ChatCompletionMessageParam[];
  } {
    return {
      metadata: this.getMetadata(),
      messages: this.getMessages(),
    };
  }

  /**
   * Add a message to the conversation
   *
   * @param message - Message to add
   */
  private addMessage(message: ChatCompletionMessageParam): void {
    this.messages.push(message);
    this.metadata.messageCount++;
    this.metadata.lastInteractionAt = new Date();

    // Update token count
    this.metadata.totalTokens = this.getTokenCount();

    // Prune if needed
    this.pruneIfNeeded();
  }

  /**
   * Generate a unique conversation ID
   *
   * @returns Conversation ID
   */
  private generateConversationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `conv_${timestamp}_${random}`;
  }
}

/**
 * Create a new conversation instance
 *
 * @param config - Optional conversation configuration
 * @returns Conversation instance
 *
 * @example
 * ```typescript
 * const conversation = createConversation();
 * conversation.addUserMessage("Hello!");
 * const messages = conversation.getMessages();
 * ```
 */
export function createConversation(config?: ConversationConfig): Conversation {
  return new Conversation(config);
}
