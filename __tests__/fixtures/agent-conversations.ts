/**
 * Agent Conversation Fixtures
 *
 * Sample conversation transcripts and expected tool calls for testing
 * the demo agent's end-to-end behavior.
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Conversation fixture
 */
export interface ConversationFixture {
  /** Fixture name */
  name: string;
  /** Fixture description */
  description: string;
  /** User messages in the conversation */
  userMessages: string[];
  /** Expected tool calls (in order) */
  expectedToolCalls: Array<{
    /** Tool name */
    name: string;
    /** Expected arguments (partial match) */
    expectedArgs?: Record<string, unknown>;
  }>;
  /** Expected response patterns (regex) */
  expectedResponsePatterns?: RegExp[];
}

/**
 * Archive Search and Order Conversation
 */
export const archiveSearchConversation: ConversationFixture = {
  name: 'Archive Search and Order',
  description: 'User searches for archive imagery and places an order',
  userMessages: [
    `I need to search for satellite imagery of a wildfire area in Northern California.
The area is around Paradise, CA, defined by this polygon:
POLYGON((-121.65 39.70, -121.50 39.70, -121.50 39.85, -121.65 39.85, -121.65 39.70))

I need imagery from the past 7 days with the highest resolution available.`,
    'Show me details about the first result. What\'s the cloud cover and resolution?',
    'What would this imagery cost?',
    'Thanks for the pricing info. This looks good.',
  ],
  expectedToolCalls: [
    {
      name: 'search_satellite_archives',
      expectedArgs: {
        aoi: 'POLYGON((-121.65 39.70, -121.50 39.70, -121.50 39.85, -121.65 39.85, -121.65 39.70))',
      },
    },
    {
      name: 'get_pricing_info',
    },
  ],
  expectedResponsePatterns: [
    /archive|imagery|result/i,
    /cloud|resolution|detail/i,
    /price|cost|\$/i,
  ],
};

/**
 * Feasibility Check Conversation
 */
export const feasibilityCheckConversation: ConversationFixture = {
  name: 'Feasibility Check',
  description: 'User checks tasking feasibility and satellite passes',
  userMessages: [
    `I'm monitoring a solar farm construction project in Arizona. I need to check if I can
order new satellite imagery of this location:
POLYGON((-112.25 33.40, -112.20 33.40, -112.20 33.45, -112.25 33.45, -112.25 33.40))

I need imagery captured sometime in the next 7 days at the highest resolution available.
Can you check if this is feasible?`,
    'Show me all satellite passes for the next 3 days',
    'Thanks for the information. Let me review with my team before placing the order.',
  ],
  expectedToolCalls: [
    {
      name: 'check_tasking_feasibility',
      expectedArgs: {
        aoi: 'POLYGON((-112.25 33.40, -112.20 33.40, -112.20 33.45, -112.25 33.45, -112.25 33.40))',
      },
    },
    {
      name: 'predict_satellite_passes',
      expectedArgs: {
        aoi: 'POLYGON((-112.25 33.40, -112.20 33.40, -112.20 33.45, -112.25 33.45, -112.25 33.40))',
      },
    },
  ],
  expectedResponsePatterns: [
    /feasib(le|ility)|possible/i,
    /pass(es)?|satellite/i,
  ],
};

/**
 * Monitoring Setup Conversation
 */
export const monitoringSetupConversation: ConversationFixture = {
  name: 'Monitoring Setup',
  description: 'User sets up monitoring notifications',
  userMessages: [
    `I need to set up monitoring for a coastal area in Southern California. I want to be
notified whenever new high-resolution satellite imagery becomes available.

Area: POLYGON((-118.65 34.00, -118.50 34.00, -118.50 34.05, -118.65 34.05, -118.65 34.00))

Requirements:
- Resolution: 5 meters or better
- Cloud cover: Less than 20%
- Product type: Optical imagery
- Notification webhook: https://api.coastal-monitoring.org/webhooks/skyfi-alerts`,
    'Show me all my active monitoring notifications',
  ],
  expectedToolCalls: [
    {
      name: 'create_monitoring_notification',
      expectedArgs: {
        aoi: 'POLYGON((-118.65 34.00, -118.50 34.00, -118.50 34.05, -118.65 34.05, -118.65 34.00))',
        webhookUrl: 'https://api.coastal-monitoring.org/webhooks/skyfi-alerts',
      },
    },
    {
      name: 'list_notifications',
    },
  ],
  expectedResponsePatterns: [
    /notif(ication|y)|monitor(ing)?|created/i,
    /active|notification/i,
  ],
};

/**
 * Cost Estimation Conversation
 */
export const costEstimationConversation: ConversationFixture = {
  name: 'Cost Estimation',
  description: 'User explores pricing for different imagery products',
  userMessages: [
    `I'm planning a satellite imagery monitoring project and need to understand the
pricing for different types of imagery products. Can you explain the pricing
structure and show me the current rates?`,
    `I need to monitor 5 deforestation sites in the Amazon, each about 100 km². I need
monthly imagery for a year (12 captures per site). What would be the most
cost-effective approach?

My budget is $5,000/month. What resolution and approach can I afford?`,
  ],
  expectedToolCalls: [
    {
      name: 'get_pricing_info',
    },
  ],
  expectedResponsePatterns: [
    /pric(e|ing)|cost|rate/i,
    /budget|afford|cost-effective/i,
  ],
};

/**
 * Error Handling - Invalid AOI
 */
export const invalidAOIConversation: ConversationFixture = {
  name: 'Invalid AOI',
  description: 'User provides an invalid AOI format',
  userMessages: [
    'Search for satellite imagery around New York City',
  ],
  expectedToolCalls: [],
  expectedResponsePatterns: [
    /polygon|area of interest|AOI|coordinate|specific/i,
  ],
};

/**
 * Multi-Step Order Flow
 */
export const multiStepOrderConversation: ConversationFixture = {
  name: 'Multi-Step Order Flow',
  description: 'Complete order flow with search, details, pricing, and order',
  userMessages: [
    `Search for archive imagery of Austin, Texas.
AOI: POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))
Date range: Last 30 days`,
    'Tell me more about the archive with ID 354b783d-8fad-4050-a167-2eb069653777',
    'What would it cost to order this archive?',
    `I want to order this imagery and have it delivered to my S3 bucket.
Bucket: test-imagery-bucket
Region: us-east-1`,
  ],
  expectedToolCalls: [
    {
      name: 'search_satellite_archives',
      expectedArgs: {
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      },
    },
    {
      name: 'get_archive_details',
      expectedArgs: {
        archiveId: '354b783d-8fad-4050-a167-2eb069653777',
      },
    },
    {
      name: 'get_pricing_info',
    },
    {
      name: 'order_archive_imagery',
      expectedArgs: {
        archiveId: '354b783d-8fad-4050-a167-2eb069653777',
      },
    },
  ],
  expectedResponsePatterns: [
    /search|found|result/i,
    /detail|archive|cloud|resolution/i,
    /price|cost/i,
    /order|placed|confirm/i,
  ],
};

/**
 * Order Management Conversation
 */
export const orderManagementConversation: ConversationFixture = {
  name: 'Order Management',
  description: 'User lists and checks order status',
  userMessages: [
    'Show me all my orders',
    'Get details for order 550e8400-e29b-41d4-a716-446655440099',
  ],
  expectedToolCalls: [
    {
      name: 'list_orders',
    },
    {
      name: 'get_order_details',
      expectedArgs: {
        orderId: '550e8400-e29b-41d4-a716-446655440099',
      },
    },
  ],
  expectedResponsePatterns: [
    /order(s)?|list/i,
    /status|detail/i,
  ],
};

/**
 * All conversation fixtures
 */
export const allConversationFixtures: ConversationFixture[] = [
  archiveSearchConversation,
  feasibilityCheckConversation,
  monitoringSetupConversation,
  costEstimationConversation,
  invalidAOIConversation,
  multiStepOrderConversation,
  orderManagementConversation,
];

/**
 * Get a conversation fixture by name
 */
export function getConversationFixture(name: string): ConversationFixture | undefined {
  return allConversationFixtures.find((fixture) => fixture.name === name);
}

/**
 * Mock chat completion message for testing
 */
export interface MockChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

/**
 * Generate mock assistant response with tool calls
 */
export function generateMockAssistantResponse(
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>,
  content: string | null = null,
): MockChatMessage {
  return {
    role: 'assistant',
    content,
    tool_calls: toolCalls.map((tc, index) => ({
      id: `call_${Date.now()}_${index}`,
      type: 'function' as const,
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.args),
      },
    })),
  };
}

/**
 * Generate mock assistant text response (no tool calls)
 */
export function generateMockTextResponse(content: string): MockChatMessage {
  return {
    role: 'assistant',
    content,
  };
}

/**
 * Generate mock tool result message
 */
export function generateMockToolResult(
  toolCallId: string,
  toolName: string,
  result: unknown,
): MockChatMessage {
  return {
    role: 'tool',
    content: JSON.stringify(result),
    tool_call_id: toolCallId,
    name: toolName,
  };
}
