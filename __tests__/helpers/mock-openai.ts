/**
 * Mock OpenAI Client
 *
 * Provides a mock OpenAI client for testing the demo agent with
 * predictable, deterministic responses.
 */

import type {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources/chat/completions';
import { OpenAIClient, type ChatCompletionResult } from '../../src/agent/openai-client.js';

/**
 * Mock response configuration
 */
export interface MockResponse {
  /** Response content (text) */
  content?: string | null;
  /** Tool calls to include */
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  /** Finish reason */
  finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  /** Token usage override */
  tokens?: {
    prompt: number;
    completion: number;
  };
}

/**
 * Response matcher - determines if a message history matches this response
 */
export type ResponseMatcher = (messages: ChatCompletionMessageParam[]) => boolean;

/**
 * Conditional mock response
 */
export interface ConditionalMockResponse {
  /** Matcher function to determine if this response applies */
  matcher: ResponseMatcher;
  /** Response to return if matcher returns true */
  response: MockResponse;
  /** Description for debugging */
  description?: string;
}

/**
 * Mock OpenAI Client for testing
 */
export class MockOpenAIClient extends OpenAIClient {
  private mockResponses: ConditionalMockResponse[] = [];
  private defaultResponse: MockResponse = {
    content: 'I understand. How can I help you with satellite imagery?',
    finishReason: 'stop',
  };
  private callHistory: ChatCompletionMessageParam[][] = [];
  private responseIndex = 0;

  /**
   * Add a conditional mock response
   */
  addMockResponse(matcher: ResponseMatcher, response: MockResponse, description?: string): void {
    this.mockResponses.push({ matcher, response, description });
  }

  /**
   * Set default response (used when no matchers match)
   */
  setDefaultResponse(response: MockResponse): void {
    this.defaultResponse = response;
  }

  /**
   * Clear all mock responses
   */
  clearMockResponses(): void {
    this.mockResponses = [];
    this.callHistory = [];
    this.responseIndex = 0;
  }

  /**
   * Get call history
   */
  getCallHistory(): ChatCompletionMessageParam[][] {
    return [...this.callHistory];
  }

  /**
   * Override createChatCompletion to return mock responses
   */
  override async createChatCompletion(
    messages: ChatCompletionMessageParam[],
    options: any = {},
  ): Promise<ChatCompletionResult> {
    // Record the call
    this.callHistory.push([...messages]);

    // Find matching response
    let mockResponse = this.defaultResponse;
    for (const conditionalResponse of this.mockResponses) {
      if (conditionalResponse.matcher(messages)) {
        mockResponse = conditionalResponse.response;
        break;
      }
    }

    // Generate mock completion
    const completion = this.generateMockCompletion(mockResponse);

    // Calculate token usage
    const promptTokens = mockResponse.tokens?.prompt ?? this.estimateTokens(messages);
    const completionTokens = mockResponse.tokens?.completion ??
      (mockResponse.content ? this.estimateTokens([{ role: 'assistant', content: mockResponse.content }]) : 50);

    const usage = {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };

    const cost = {
      promptCost: (promptTokens / 1000) * 0.01,
      completionCost: (completionTokens / 1000) * 0.03,
      totalCost: ((promptTokens / 1000) * 0.01) + ((completionTokens / 1000) * 0.03),
    };

    this.responseIndex++;

    return {
      completion,
      usage,
      cost,
      model: 'gpt-4-turbo',
      finishReason: mockResponse.finishReason ?? 'stop',
    };
  }

  /**
   * Generate a mock ChatCompletion object
   */
  private generateMockCompletion(mockResponse: MockResponse): ChatCompletion {
    const message: any = {
      role: 'assistant',
      content: mockResponse.content ?? null,
    };

    // Add tool calls if present
    if (mockResponse.toolCalls && mockResponse.toolCalls.length > 0) {
      message.tool_calls = mockResponse.toolCalls.map((tc, index) => ({
        id: `call_mock_${Date.now()}_${index}`,
        type: 'function' as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.args),
        },
      }));
    }

    const promptTokens = mockResponse.tokens?.prompt ?? 100;
    const completionTokens = mockResponse.tokens?.completion ?? 50;

    return {
      id: `chatcmpl-mock-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4-turbo',
      choices: [
        {
          index: 0,
          message,
          finish_reason: mockResponse.finishReason ?? (mockResponse.toolCalls ? 'tool_calls' : 'stop'),
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
      system_fingerprint: 'mock',
    };
  }

  /**
   * Simple token estimation
   */
  private estimateTokens(messages: ChatCompletionMessageParam[]): number {
    let total = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        total += Math.ceil(msg.content.length / 4);
      }
    }
    return total;
  }
}

/**
 * Helper functions for creating response matchers
 */

/**
 * Match if the last user message contains a substring
 */
export function matchLastUserMessage(substring: string, caseInsensitive = true): ResponseMatcher {
  return (messages: ChatCompletionMessageParam[]) => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMessage || typeof lastUserMessage.content !== 'string') {
      return false;
    }
    const content = caseInsensitive ? lastUserMessage.content.toLowerCase() : lastUserMessage.content;
    const search = caseInsensitive ? substring.toLowerCase() : substring;
    return content.includes(search);
  };
}

/**
 * Match if the last user message matches a regex
 */
export function matchLastUserMessageRegex(regex: RegExp): ResponseMatcher {
  return (messages: ChatCompletionMessageParam[]) => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMessage || typeof lastUserMessage.content !== 'string') {
      return false;
    }
    return regex.test(lastUserMessage.content);
  };
}

/**
 * Match if any user message contains a substring
 */
export function matchAnyUserMessage(substring: string, caseInsensitive = true): ResponseMatcher {
  return (messages: ChatCompletionMessageParam[]) => {
    const search = caseInsensitive ? substring.toLowerCase() : substring;
    return messages.some((m) => {
      if (m.role !== 'user' || typeof m.content !== 'string') {
        return false;
      }
      const content = caseInsensitive ? m.content.toLowerCase() : m.content;
      return content.includes(search);
    });
  };
}

/**
 * Match if conversation has exactly N messages
 */
export function matchMessageCount(count: number, role?: 'user' | 'assistant' | 'system' | 'tool'): ResponseMatcher {
  return (messages: ChatCompletionMessageParam[]) => {
    if (role) {
      return messages.filter((m) => m.role === role).length === count;
    }
    return messages.length === count;
  };
}

/**
 * Match if the last tool call was a specific tool
 */
export function matchLastToolCall(toolName: string): ResponseMatcher {
  return (messages: ChatCompletionMessageParam[]) => {
    const lastToolMessage = [...messages].reverse().find((m) => m.role === 'tool');
    if (!lastToolMessage || !('name' in lastToolMessage)) {
      return false;
    }
    return lastToolMessage.name === toolName;
  };
}

/**
 * Combine multiple matchers with AND logic
 */
export function matchAll(...matchers: ResponseMatcher[]): ResponseMatcher {
  return (messages: ChatCompletionMessageParam[]) => {
    return matchers.every((matcher) => matcher(messages));
  };
}

/**
 * Combine multiple matchers with OR logic
 */
export function matchAny(...matchers: ResponseMatcher[]): ResponseMatcher {
  return (messages: ChatCompletionMessageParam[]) => {
    return matchers.some((matcher) => matcher(messages));
  };
}

/**
 * Create a mock OpenAI client
 */
export function createMockOpenAIClient(): MockOpenAIClient {
  return new MockOpenAIClient({
    openaiApiKey: 'mock-api-key',
    model: 'gpt-4-turbo',
    maxTokens: 1000,
    temperature: 0.7,
    timeout: 30000,
    maxRetries: 0,
    retryDelay: 1000,
  });
}

/**
 * Setup common mock responses for archive search scenario
 */
export function setupArchiveSearchMocks(client: MockOpenAIClient): void {
  // First message: search for imagery
  client.addMockResponse(
    matchAll(
      matchMessageCount(2, 'user'), // System + first user message
      matchLastUserMessage('search')
    ),
    {
      content: null,
      toolCalls: [
        {
          name: 'search_satellite_archives',
          args: {
            aoi: 'POLYGON((-121.65 39.70, -121.50 39.70, -121.50 39.85, -121.65 39.85, -121.65 39.70))',
            fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            toDate: new Date().toISOString(),
            resolutions: ['VERY HIGH'],
          },
        },
      ],
      finishReason: 'tool_calls',
    },
    'Search for imagery'
  );

  // After search results: provide summary
  client.addMockResponse(
    matchLastToolCall('search_satellite_archives'),
    {
      content: 'I found several archive images matching your criteria. The results show high-resolution imagery with low cloud cover.',
      finishReason: 'stop',
    },
    'Summarize search results'
  );

  // Request for details
  client.addMockResponse(
    matchLastUserMessage('detail'),
    {
      content: 'The first result shows very high resolution imagery (0.7m GSD) with 5% cloud cover, captured on January 15, 2024.',
      finishReason: 'stop',
    },
    'Provide details'
  );

  // Request for pricing
  client.addMockResponse(
    matchLastUserMessage('cost'),
    {
      content: null,
      toolCalls: [
        {
          name: 'get_pricing_info',
          args: {},
        },
      ],
      finishReason: 'tool_calls',
    },
    'Get pricing'
  );

  // After pricing: provide cost estimate
  client.addMockResponse(
    matchLastToolCall('get_pricing_info'),
    {
      content: 'Based on the current pricing, this imagery would cost approximately $250 for the full scene.',
      finishReason: 'stop',
    },
    'Provide pricing summary'
  );

  // Confirmation
  client.addMockResponse(
    matchLastUserMessage('looks good'),
    {
      content: 'Great! Let me know when you\'re ready to place the order. I can help you configure the delivery to your preferred cloud storage.',
      finishReason: 'stop',
    },
    'Acknowledge confirmation'
  );
}

/**
 * Setup common mock responses for feasibility check scenario
 */
export function setupFeasibilityCheckMocks(client: MockOpenAIClient): void {
  // Check feasibility
  client.addMockResponse(
    matchLastUserMessage('feasible'),
    {
      content: null,
      toolCalls: [
        {
          name: 'check_tasking_feasibility',
          args: {
            aoi: 'POLYGON((-112.25 33.40, -112.20 33.40, -112.20 33.45, -112.25 33.45, -112.25 33.40))',
            productType: 'Day',
            resolution: 'VeryHigh',
            windowStart: new Date().toISOString(),
            windowEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      ],
      finishReason: 'tool_calls',
    },
    'Check feasibility'
  );

  // After feasibility check
  client.addMockResponse(
    matchLastToolCall('check_tasking_feasibility'),
    {
      content: 'Good news! Tasking is highly feasible for your location with a 95% feasibility score. I found several capture opportunities in the next 7 days.',
      finishReason: 'stop',
    },
    'Summarize feasibility'
  );

  // Predict satellite passes
  client.addMockResponse(
    matchLastUserMessage('passes'),
    {
      content: null,
      toolCalls: [
        {
          name: 'predict_satellite_passes',
          args: {
            aoi: 'POLYGON((-112.25 33.40, -112.20 33.40, -112.20 33.45, -112.25 33.45, -112.25 33.40))',
            fromDate: new Date().toISOString(),
            toDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      ],
      finishReason: 'tool_calls',
    },
    'Predict passes'
  );

  // After pass prediction
  client.addMockResponse(
    matchLastToolCall('predict_satellite_passes'),
    {
      content: 'I found 2 satellite passes over the next 3 days. The first pass is tomorrow at 10:30 AM UTC with excellent viewing conditions.',
      finishReason: 'stop',
    },
    'Summarize passes'
  );
}

/**
 * Setup common mock responses for monitoring setup scenario
 */
export function setupMonitoringSetupMocks(client: MockOpenAIClient): void {
  // Create notification
  client.addMockResponse(
    matchLastUserMessage('monitoring'),
    {
      content: null,
      toolCalls: [
        {
          name: 'create_monitoring_notification',
          args: {
            aoi: 'POLYGON((-118.65 34.00, -118.50 34.00, -118.50 34.05, -118.65 34.05, -118.65 34.00))',
            webhookUrl: 'https://api.coastal-monitoring.org/webhooks/skyfi-alerts',
            maxResolution: 5,
            maxCloudCover: 20,
            productTypes: ['DAY'],
          },
        },
      ],
      finishReason: 'tool_calls',
    },
    'Create notification'
  );

  // After creating notification
  client.addMockResponse(
    matchLastToolCall('create_monitoring_notification'),
    {
      content: 'Successfully created your monitoring notification! You\'ll receive webhooks whenever new imagery matching your criteria becomes available.',
      finishReason: 'stop',
    },
    'Confirm notification created'
  );

  // List notifications
  client.addMockResponse(
    matchLastUserMessage('active'),
    {
      content: null,
      toolCalls: [
        {
          name: 'list_notifications',
          args: {},
        },
      ],
      finishReason: 'tool_calls',
    },
    'List notifications'
  );

  // After listing notifications
  client.addMockResponse(
    matchLastToolCall('list_notifications'),
    {
      content: 'You have 2 active monitoring notifications set up. The most recent one is for the coastal area in Southern California.',
      finishReason: 'stop',
    },
    'Summarize notifications'
  );
}

/**
 * Setup error simulation
 */
export function setupErrorSimulation(client: MockOpenAIClient, errorType: 'rate_limit' | 'api_error'): void {
  // This would require modifying the mock to throw errors
  // For now, we'll simulate errors through response content
  if (errorType === 'rate_limit') {
    client.setDefaultResponse({
      content: 'I apologize, but I\'m currently experiencing rate limiting. Please try again in a moment.',
      finishReason: 'stop',
    });
  } else if (errorType === 'api_error') {
    client.setDefaultResponse({
      content: 'I encountered an error while processing your request. Please try again.',
      finishReason: 'stop',
    });
  }
}
