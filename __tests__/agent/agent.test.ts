/**
 * Agent Tests
 *
 * Unit tests for the main SkyFi demo agent
 */

import { SkyFiAgent, createAgent } from '../../src/agent/agent.js';
import { OpenAIClient } from '../../src/agent/openai-client.js';
import { Conversation } from '../../src/agent/conversation.js';
import { ToolExecutor } from '../../src/agent/tool-executor.js';
import type { ChatCompletion } from 'openai/resources/chat/completions';

jest.mock('../../src/lib/logger.js');
jest.mock('../../src/agent/openai-client.js');
jest.mock('../../src/agent/tool-executor.js');

describe('SkyFiAgent', () => {
  let agent: SkyFiAgent;
  let mockOpenAIClient: jest.Mocked<OpenAIClient>;
  let mockToolExecutor: jest.Mocked<ToolExecutor>;

  beforeEach(() => {
    // Create mocks
    mockOpenAIClient = {
      createChatCompletion: jest.fn(),
      getTotalTokensUsed: jest.fn().mockReturnValue(0),
      getTotalCost: jest.fn().mockReturnValue(0),
      resetUsageStats: jest.fn(),
      getConfig: jest.fn(),
    } as unknown as jest.Mocked<OpenAIClient>;

    mockToolExecutor = {
      getOpenAITools: jest.fn().mockReturnValue([
        {
          type: 'function',
          function: {
            name: 'search_archives',
            description: 'Search for archive imagery',
            parameters: {},
          },
        },
      ]),
      executeTool: jest.fn(),
      getAvailableTools: jest.fn().mockReturnValue(['search_archives']),
    } as unknown as jest.Mocked<ToolExecutor>;

    agent = new SkyFiAgent({
      openaiClient: mockOpenAIClient,
      toolExecutor: mockToolExecutor,
      verbose: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultAgent = createAgent();
      expect(defaultAgent).toBeInstanceOf(SkyFiAgent);
    });

    it('should accept custom configuration', () => {
      const customAgent = new SkyFiAgent({
        openaiClient: mockOpenAIClient,
        toolExecutor: mockToolExecutor,
        maxToolIterations: 10,
        verbose: true,
      });

      expect(customAgent).toBeInstanceOf(SkyFiAgent);
    });
  });

  describe('chat', () => {
    it('should process simple user message without tool calls', async () => {
      // Mock OpenAI response without tool calls
      const mockCompletion: ChatCompletion = {
        id: 'completion-123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you with satellite imagery today?',
            },
            finish_reason: 'stop',
            logprobs: null,
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 20,
          total_tokens: 70,
        },
      };

      mockOpenAIClient.createChatCompletion.mockResolvedValue({
        completion: mockCompletion,
        usage: {
          promptTokens: 50,
          completionTokens: 20,
          totalTokens: 70,
        },
        cost: {
          promptCost: 0.0001,
          completionCost: 0.0001,
          totalCost: 0.0002,
        },
        model: 'gpt-4-turbo',
        finishReason: 'stop',
      });

      const response = await agent.chat('Hello');

      expect(response.success).toBe(true);
      expect(response.message).toBe('Hello! How can I help you with satellite imagery today?');
      expect(response.tokensUsed).toBe(70);
      expect(response.cost).toBeGreaterThan(0);
      expect(mockOpenAIClient.createChatCompletion).toHaveBeenCalledTimes(1);
    });

    it('should handle tool calls', async () => {
      // Mock OpenAI response with tool call
      const toolCallCompletion: ChatCompletion = {
        id: 'completion-456',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'search_archives',
                    arguments: JSON.stringify({
                      aoi: 'POINT(-122.4194 37.7749)',
                      limit: 10,
                    }),
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
            logprobs: null,
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      };

      // Mock final response after tool execution
      const finalCompletion: ChatCompletion = {
        id: 'completion-789',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'I found 5 archive images matching your criteria.',
            },
            finish_reason: 'stop',
            logprobs: null,
          },
        ],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 30,
          total_tokens: 230,
        },
      };

      mockOpenAIClient.createChatCompletion
        .mockResolvedValueOnce({
          completion: toolCallCompletion,
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          cost: { promptCost: 0.0002, completionCost: 0.0002, totalCost: 0.0004 },
          model: 'gpt-4-turbo',
          finishReason: 'tool_calls',
        })
        .mockResolvedValueOnce({
          completion: finalCompletion,
          usage: { promptTokens: 200, completionTokens: 30, totalTokens: 230 },
          cost: { promptCost: 0.0004, completionCost: 0.0001, totalCost: 0.0005 },
          model: 'gpt-4-turbo',
          finishReason: 'stop',
        });

      mockToolExecutor.executeTool.mockResolvedValue({
        toolName: 'search_archives',
        success: true,
        result: { results: [], totalCount: 5 },
        executionTime: 100,
      });

      const response = await agent.chat('Search for imagery in San Francisco');

      expect(response.success).toBe(true);
      expect(response.message).toContain('I found 5 archive images');
      expect(response.toolCalls).toHaveLength(1);
      expect(response.toolCalls?.[0].name).toBe('search_archives');
      expect(mockToolExecutor.executeTool).toHaveBeenCalledWith('search_archives', {
        aoi: 'POINT(-122.4194 37.7749)',
        limit: 10,
      });
    });

    it('should handle tool execution errors', async () => {
      const toolCallCompletion: ChatCompletion = {
        id: 'completion-error',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_error',
                  type: 'function',
                  function: {
                    name: 'search_archives',
                    arguments: '{}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
            logprobs: null,
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
      };

      const errorRecoveryCompletion: ChatCompletion = {
        id: 'completion-recovery',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'I encountered an error. Please provide a valid location.',
            },
            finish_reason: 'stop',
            logprobs: null,
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      };

      mockOpenAIClient.createChatCompletion
        .mockResolvedValueOnce({
          completion: toolCallCompletion,
          usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
          cost: { promptCost: 0.0001, completionCost: 0.0001, totalCost: 0.0002 },
          model: 'gpt-4-turbo',
          finishReason: 'tool_calls',
        })
        .mockResolvedValueOnce({
          completion: errorRecoveryCompletion,
          usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
          cost: { promptCost: 0.0002, completionCost: 0.0001, totalCost: 0.0003 },
          model: 'gpt-4-turbo',
          finishReason: 'stop',
        });

      mockToolExecutor.executeTool.mockResolvedValue({
        toolName: 'search_archives',
        success: false,
        error: 'Invalid AOI format',
        executionTime: 50,
      });

      const response = await agent.chat('Search imagery');

      expect(response.success).toBe(true);
      expect(mockToolExecutor.executeTool).toHaveBeenCalled();
    });

    it('should limit tool call iterations', async () => {
      const limitedAgent = new SkyFiAgent({
        openaiClient: mockOpenAIClient,
        toolExecutor: mockToolExecutor,
        maxToolIterations: 2,
      });

      // Always return tool calls (infinite loop scenario)
      const toolCallCompletion: ChatCompletion = {
        id: 'completion-loop',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_loop',
                  type: 'function',
                  function: { name: 'search_archives', arguments: '{}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
            logprobs: null,
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
      };

      mockOpenAIClient.createChatCompletion.mockResolvedValue({
        completion: toolCallCompletion,
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
        cost: { promptCost: 0.0001, completionCost: 0.0001, totalCost: 0.0002 },
        model: 'gpt-4-turbo',
        finishReason: 'tool_calls',
      });

      mockToolExecutor.executeTool.mockResolvedValue({
        toolName: 'search_archives',
        success: true,
        result: {},
        executionTime: 50,
      });

      const response = await limitedAgent.chat('Test');

      expect(response.success).toBe(false);
      expect(response.error).toContain('Maximum tool call iterations');
      expect(mockOpenAIClient.createChatCompletion).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStats', () => {
    it('should return agent statistics', () => {
      const stats = agent.getStats();

      expect(stats).toHaveProperty('messagesProcessed');
      expect(stats).toHaveProperty('toolCallsExecuted');
      expect(stats).toHaveProperty('totalTokens');
      expect(stats).toHaveProperty('totalCost');
      expect(stats).toHaveProperty('averageResponseTime');
      expect(stats.messagesProcessed).toBe(0);
    });

    it('should update statistics after chat', async () => {
      const mockCompletion: ChatCompletion = {
        id: 'test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-turbo',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
            logprobs: null,
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockOpenAIClient.createChatCompletion.mockResolvedValue({
        completion: mockCompletion,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        cost: { promptCost: 0.00001, completionCost: 0.00001, totalCost: 0.00002 },
        model: 'gpt-4-turbo',
        finishReason: 'stop',
      });

      await agent.chat('Test');

      const stats = agent.getStats();
      expect(stats.messagesProcessed).toBe(1);
      expect(stats.totalTokens).toBe(15);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('clearConversation', () => {
    it('should clear conversation history', async () => {
      // Add some messages
      const mockCompletion: ChatCompletion = {
        id: 'test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4-turbo',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
            logprobs: null,
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockOpenAIClient.createChatCompletion.mockResolvedValue({
        completion: mockCompletion,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        cost: { promptCost: 0.00001, completionCost: 0.00001, totalCost: 0.00002 },
        model: 'gpt-4-turbo',
        finishReason: 'stop',
      });

      await agent.chat('First message');
      await agent.chat('Second message');

      agent.clearConversation();

      // Conversation should be cleared (only system prompt remains)
      const metadata = agent.getConversationMetadata();
      expect(metadata.messageCount).toBe(0);
    });
  });

  describe('exportConversation', () => {
    it('should export conversation data', () => {
      const exported = agent.exportConversation();

      expect(exported).toHaveProperty('metadata');
      expect(exported).toHaveProperty('messages');
      expect(Array.isArray(exported.messages)).toBe(true);
    });
  });
});
