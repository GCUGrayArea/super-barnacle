/**
 * Unit Tests for OpenAI Client
 */

import OpenAI from 'openai';
import {
  OpenAIClient,
  createOpenAIClient,
  OpenAIClientError,
} from '../../src/agent/openai-client';
import { getAgentConfig, validateAgentConfig } from '../../src/agent/config';
import { retryWithBackoff } from '../../src/lib/retry';
import type { ChatCompletion } from 'openai/resources/chat/completions';

// Mock dependencies
jest.mock('openai');
jest.mock('../../src/agent/config', () => ({
  ...jest.requireActual('../../src/agent/config'),
  getAgentConfig: jest.fn(),
}));
jest.mock('../../src/lib/retry');

describe('OpenAIClient', () => {
  const mockConfig = {
    openaiApiKey: 'test-api-key',
    model: 'gpt-4-turbo',
    maxTokens: 4096,
    temperature: 0.7,
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 60000,
  };

  const mockCompletion: ChatCompletion = {
    id: 'chatcmpl-123',
    object: 'chat.completion',
    created: 1677652288,
    model: 'gpt-4-turbo',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: 'Hello! How can I help you today?',
        },
        finish_reason: 'stop',
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: 20,
      completion_tokens: 10,
      total_tokens: 30,
    },
  };

  let mockOpenAIInstance: {
    chat: {
      completions: {
        create: jest.Mock;
      };
    };
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock getAgentConfig
    (getAgentConfig as jest.Mock).mockReturnValue(mockConfig);

    // Mock OpenAI constructor
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };
    (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAIInstance);

    // Mock retryWithBackoff to execute function immediately
    (retryWithBackoff as jest.Mock).mockImplementation(async (fn) => fn());
  });

  describe('constructor', () => {
    it('should initialize with config from environment', () => {
      const client = new OpenAIClient();

      expect(getAgentConfig).toHaveBeenCalled();
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: mockConfig.openaiApiKey,
        timeout: mockConfig.timeout,
        maxRetries: 0,
      });
    });

    it('should initialize with provided config', () => {
      const customConfig = {
        ...mockConfig,
        model: 'gpt-5',
      };

      const client = new OpenAIClient(customConfig);

      expect(getAgentConfig).not.toHaveBeenCalled();
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: customConfig.openaiApiKey,
        timeout: customConfig.timeout,
        maxRetries: 0,
      });
    });

    it('should throw error for invalid config', () => {
      const invalidConfig = {
        ...mockConfig,
        maxTokens: -1,
      };

      expect(() => new OpenAIClient(invalidConfig)).toThrow('maxTokens must be between 1 and 128000');
    });
  });

  describe('createChatCompletion', () => {
    let client: OpenAIClient;

    beforeEach(() => {
      client = new OpenAIClient(mockConfig);
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockCompletion);
    });

    it('should create chat completion successfully', async () => {
      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant.' },
        { role: 'user' as const, content: 'Hello!' },
      ];

      const result = await client.createChatCompletion(messages);

      expect(result.completion).toEqual(mockCompletion);
      expect(result.usage.totalTokens).toBe(30);
      expect(result.model).toBe('gpt-4-turbo');
      expect(result.finishReason).toBe('stop');
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-turbo',
          messages,
          max_tokens: 4096,
          temperature: 0.7,
        }),
      );
    });

    it('should use custom options', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello!' }];
      const options = {
        model: 'gpt-5',
        maxTokens: 2048,
        temperature: 0.5,
        stop: ['END'],
        presencePenalty: 0.5,
        frequencyPenalty: 0.5,
      };

      await client.createChatCompletion(messages, options);

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5',
          max_tokens: 2048,
          temperature: 0.5,
          stop: ['END'],
          presence_penalty: 0.5,
          frequency_penalty: 0.5,
        }),
      );
    });

    it('should include tools when provided', async () => {
      const messages = [{ role: 'user' as const, content: 'Search for imagery' }];
      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'search_archives',
            description: 'Search archive imagery',
            parameters: {
              type: 'object',
              properties: {
                aoi: { type: 'string' },
              },
            },
          },
        },
      ];

      await client.createChatCompletion(messages, {
        tools,
        toolChoice: 'auto',
      });

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tools,
          tool_choice: 'auto',
        }),
      );
    });

    it('should track total tokens and cost', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello!' }];

      await client.createChatCompletion(messages);
      await client.createChatCompletion(messages);

      expect(client.getTotalTokensUsed()).toBe(60); // 30 * 2
      expect(client.getTotalCost()).toBeGreaterThan(0);
    });

    it('should handle completion without usage data', async () => {
      const completionWithoutUsage = {
        ...mockCompletion,
        usage: undefined,
      };
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(completionWithoutUsage);

      const messages = [{ role: 'user' as const, content: 'Hello!' }];
      const result = await client.createChatCompletion(messages);

      expect(result.usage.promptTokens).toBeGreaterThan(0);
      expect(result.usage.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    let client: OpenAIClient;

    beforeEach(() => {
      client = new OpenAIClient(mockConfig);
    });

    it('should handle 401 authentication errors', async () => {
      // Create a proper APIError instance
      const error: any = new Error('Invalid API key');
      error.status = 401;
      error.type = 'invalid_request_error';
      error.code = 'invalid_api_key';
      Object.setPrototypeOf(error, OpenAI.APIError.prototype);

      mockOpenAIInstance.chat.completions.create.mockRejectedValue(error);

      const messages = [{ role: 'user' as const, content: 'Hello!' }];

      await expect(client.createChatCompletion(messages)).rejects.toThrow(OpenAIClientError);
      await expect(client.createChatCompletion(messages)).rejects.toThrow(/Invalid API key/);
    });

    it('should handle 429 rate limit errors', async () => {
      // Create a proper APIError instance
      const error: any = new Error('Rate limit exceeded');
      error.status = 429;
      error.type = 'rate_limit_error';
      error.code = 'rate_limit_exceeded';
      Object.setPrototypeOf(error, OpenAI.APIError.prototype);

      mockOpenAIInstance.chat.completions.create.mockRejectedValue(error);

      const messages = [{ role: 'user' as const, content: 'Hello!' }];

      await expect(client.createChatCompletion(messages)).rejects.toThrow(OpenAIClientError);
      await expect(client.createChatCompletion(messages)).rejects.toThrow(/Rate limit exceeded/);
    });

    it('should handle 503 service unavailable errors', async () => {
      // Create a proper APIError instance
      const error: any = new Error('Service unavailable');
      error.status = 503;
      error.type = 'service_unavailable';
      error.code = 'service_unavailable';
      Object.setPrototypeOf(error, OpenAI.APIError.prototype);

      mockOpenAIInstance.chat.completions.create.mockRejectedValue(error);

      const messages = [{ role: 'user' as const, content: 'Hello!' }];

      await expect(client.createChatCompletion(messages)).rejects.toThrow(OpenAIClientError);
      await expect(client.createChatCompletion(messages)).rejects.toThrow(
        /service temporarily unavailable/i,
      );
    });

    it('should handle 404 model not found errors', async () => {
      // Create a proper APIError instance
      const error: any = new Error('The model gpt-5 does not exist');
      error.status = 404;
      error.type = 'invalid_request_error';
      error.code = 'model_not_found';
      Object.setPrototypeOf(error, OpenAI.APIError.prototype);

      mockOpenAIInstance.chat.completions.create.mockRejectedValue(error);

      const messages = [{ role: 'user' as const, content: 'Hello!' }];

      await expect(client.createChatCompletion(messages)).rejects.toThrow(OpenAIClientError);
      await expect(client.createChatCompletion(messages)).rejects.toThrow(/not found/i);
    });

    it('should handle generic errors', async () => {
      const error = new Error('Network error');
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(error);

      const messages = [{ role: 'user' as const, content: 'Hello!' }];

      await expect(client.createChatCompletion(messages)).rejects.toThrow('Network error');
    });

    it('should handle unknown errors', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue('Unknown error');

      const messages = [{ role: 'user' as const, content: 'Hello!' }];

      await expect(client.createChatCompletion(messages)).rejects.toThrow();
    });
  });

  describe('retry logic', () => {
    let client: OpenAIClient;

    beforeEach(() => {
      client = new OpenAIClient(mockConfig);
      // Reset mock to use real retry behavior
      (retryWithBackoff as jest.Mock).mockImplementation(
        async (fn, options) => {
          // Try once
          try {
            return await fn();
          } catch (error) {
            // Check if retryable
            if (options?.isRetryable?.(error)) {
              // Try second time
              return await fn();
            }
            throw error;
          }
        },
      );
    });

    it('should retry on rate limit errors', async () => {
      // Create a proper APIError instance
      const error: any = new Error('Rate limit exceeded');
      error.status = 429;
      error.type = 'rate_limit_error';
      error.code = 'rate_limit_exceeded';
      Object.setPrototypeOf(error, OpenAI.APIError.prototype);

      mockOpenAIInstance.chat.completions.create
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockCompletion);

      const messages = [{ role: 'user' as const, content: 'Hello!' }];
      const result = await client.createChatCompletion(messages);

      expect(result.completion).toEqual(mockCompletion);
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 errors', async () => {
      // Create a proper APIError instance
      const error: any = new Error('Service unavailable');
      error.status = 503;
      error.type = 'service_unavailable';
      error.code = 'service_unavailable';
      Object.setPrototypeOf(error, OpenAI.APIError.prototype);

      mockOpenAIInstance.chat.completions.create
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockCompletion);

      const messages = [{ role: 'user' as const, content: 'Hello!' }];
      const result = await client.createChatCompletion(messages);

      expect(result.completion).toEqual(mockCompletion);
    });

    it('should not retry on 401 authentication errors', async () => {
      // Reset the mock implementation to actually check retryability
      (retryWithBackoff as jest.Mock).mockImplementation(
        async (fn, options) => {
          try {
            return await fn();
          } catch (error) {
            // Check if retryable
            if (options?.isRetryable?.(error)) {
              // Try second time (should not happen for 401)
              return await fn();
            }
            throw error;
          }
        },
      );

      // Create a proper APIError instance
      const error: any = new Error('Invalid API key');
      error.status = 401;
      error.type = 'invalid_request_error';
      error.code = 'invalid_api_key';
      Object.setPrototypeOf(error, OpenAI.APIError.prototype);

      mockOpenAIInstance.chat.completions.create.mockRejectedValue(error);

      const messages = [{ role: 'user' as const, content: 'Hello!' }];

      await expect(client.createChatCompletion(messages)).rejects.toThrow();
      // Should only be called once (no retry)
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('usage statistics', () => {
    let client: OpenAIClient;

    beforeEach(() => {
      client = new OpenAIClient(mockConfig);
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockCompletion);
    });

    it('should track total tokens used', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello!' }];

      expect(client.getTotalTokensUsed()).toBe(0);

      await client.createChatCompletion(messages);
      expect(client.getTotalTokensUsed()).toBe(30);

      await client.createChatCompletion(messages);
      expect(client.getTotalTokensUsed()).toBe(60);
    });

    it('should track total cost', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello!' }];

      expect(client.getTotalCost()).toBe(0);

      await client.createChatCompletion(messages);
      expect(client.getTotalCost()).toBeGreaterThan(0);

      const costAfterOne = client.getTotalCost();
      await client.createChatCompletion(messages);
      expect(client.getTotalCost()).toBeGreaterThan(costAfterOne);
    });

    it('should reset usage statistics', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello!' }];

      await client.createChatCompletion(messages);
      expect(client.getTotalTokensUsed()).toBeGreaterThan(0);
      expect(client.getTotalCost()).toBeGreaterThan(0);

      client.resetUsageStats();
      expect(client.getTotalTokensUsed()).toBe(0);
      expect(client.getTotalCost()).toBe(0);
    });
  });

  describe('getConfig', () => {
    it('should return copy of config', () => {
      const client = new OpenAIClient(mockConfig);
      const config = client.getConfig();

      expect(config).toEqual(mockConfig);
      expect(config).not.toBe(mockConfig); // Should be a copy

      // Modifying returned config should not affect client
      config.model = 'different-model';
      expect(client.getConfig().model).toBe(mockConfig.model);
    });
  });

  describe('createOpenAIClient', () => {
    it('should create client with default config', () => {
      const client = createOpenAIClient();

      expect(client).toBeInstanceOf(OpenAIClient);
      expect(getAgentConfig).toHaveBeenCalled();
    });

    it('should create client with custom config', () => {
      const customConfig = {
        ...mockConfig,
        model: 'gpt-5',
      };

      const client = createOpenAIClient(customConfig);

      expect(client).toBeInstanceOf(OpenAIClient);
      expect(client.getConfig().model).toBe('gpt-5');
    });
  });

  describe('message truncation', () => {
    let client: OpenAIClient;

    beforeEach(() => {
      client = new OpenAIClient(mockConfig);
      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockCompletion);
    });

    it('should not truncate short messages', async () => {
      const messages = [
        { role: 'system' as const, content: 'You are a helpful assistant.' },
        { role: 'user' as const, content: 'Hello!' },
      ];

      await client.createChatCompletion(messages);

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0]?.[0];
      expect(callArgs?.messages).toHaveLength(2);
    });
  });
});
