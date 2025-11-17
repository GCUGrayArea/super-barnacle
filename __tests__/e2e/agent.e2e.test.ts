/**
 * End-to-End Tests for Demo Agent
 *
 * These tests verify that the demo agent correctly executes complete
 * scenarios with mocked OpenAI and SkyFi APIs.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { SkyFiAgent } from '../../src/agent/agent.js';
import { ToolExecutor } from '../../src/agent/tool-executor.js';
import { Conversation } from '../../src/agent/conversation.js';
import { MockSkyFiServer } from '../helpers/mock-skyfi-server.js';
import {
  MockOpenAIClient,
  createMockOpenAIClient,
  setupArchiveSearchMocks,
  setupFeasibilityCheckMocks,
  setupMonitoringSetupMocks,
  matchLastUserMessage,
  matchLastToolCall,
  matchAll,
  matchMessageCount,
} from '../helpers/mock-openai.js';
import {
  archiveSearchConversation,
  feasibilityCheckConversation,
  monitoringSetupConversation,
  costEstimationConversation,
  multiStepOrderConversation,
  orderManagementConversation,
} from '../fixtures/agent-conversations.js';
import { SkyFiClient } from '../../src/skyfi/client.js';

describe('Demo Agent E2E Tests', () => {
  let mockSkyFi: MockSkyFiServer;
  let skyfiClient: SkyFiClient;
  let mockOpenAI: MockOpenAIClient;
  let toolExecutor: ToolExecutor;

  beforeAll(() => {
    // Set up environment
    process.env.SKYFI_API_KEY = 'test-api-key';
    process.env.SKYFI_BASE_URL = 'https://api.skyfi.com';
    process.env.OPENAI_API_KEY = 'mock-openai-key';

    // Create SkyFi client
    skyfiClient = new SkyFiClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.skyfi.com',
      timeout: 30000,
      maxRetries: 0,
      debug: false,
    });

    // Create and start mock SkyFi API server
    mockSkyFi = new MockSkyFiServer('https://api.skyfi.com');
    mockSkyFi.start(skyfiClient.getAxiosInstance());
  });

  afterAll(() => {
    mockSkyFi.stop();
  });

  beforeEach(() => {
    mockSkyFi.reset();
    mockOpenAI = createMockOpenAIClient();
    toolExecutor = new ToolExecutor(skyfiClient);
  });

  describe('Scenario: Archive Search and Order', () => {
    it('should successfully search for archive imagery', async () => {
      // Setup mocks
      mockSkyFi.mockArchiveSearch({
        archives: [
          {
            archiveId: '354b783d-8fad-4050-a167-2eb069653777',
            provider: 'SATELLOGIC' as any,
            constellation: 'Satellogic',
            productType: 'DAY' as any,
            platformResolution: 70,
            resolution: 'VERY HIGH' as any,
            captureTimestamp: '2024-01-15T12:00:00Z',
            cloudCoveragePercent: 5,
            offNadirAngle: 10,
            footprint: 'POLYGON((-121.65 39.70, -121.50 39.70, -121.50 39.85, -121.65 39.85, -121.65 39.70))',
            minSqKm: 1,
            maxSqKm: 100,
            priceForOneSquareKm: 5.0,
            priceForOneSquareKmCents: 500,
            priceFullScene: 250.0,
            openData: false,
            totalAreaSquareKm: 50,
            deliveryTimeHours: 24,
            gsd: 0.7,
          },
        ],
        total: 1,
      });
      mockSkyFi.mockGetPricing();

      // Setup mock responses using message content matching
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('search');
        },
        {
          content: null,
          toolCalls: [
            {
              name: 'search_satellite_archives',
              args: {
                aoi: 'POLYGON((-121.65 39.70, -121.50 39.70, -121.50 39.85, -121.65 39.85, -121.65 39.85, -121.65 39.70))',
              },
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' &&
                 'name' in lastMsg &&
                 lastMsg.name === 'search_satellite_archives';
        },
        {
          content: 'I found several archive images with very high resolution imagery (0.7m GSD) and low cloud cover (5%).',
          finishReason: 'stop',
        }
      );

      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('cost');
        },
        {
          content: null,
          toolCalls: [{ name: 'get_pricing_info', args: {} }],
          finishReason: 'tool_calls',
        }
      );

      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' &&
                 'name' in lastMsg &&
                 lastMsg.name === 'get_pricing_info';
        },
        {
          content: 'Based on the pricing, this imagery would cost approximately $250 for the full scene.',
          finishReason: 'stop',
        }
      );

      // Create agent with mocked clients
      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: false,
      });

      // Message 1: Search request
      const response1 = await agent.chat('Search for imagery');
      expect(response1.success).toBe(true);
      expect(response1.toolCalls).toBeDefined();
      expect(response1.toolCalls?.[0].name).toBe('search_satellite_archives');

      // Message 2: Request details
      const response2 = await agent.chat('Show me details');
      expect(response2.success).toBe(true);

      // Message 3: Request pricing
      const response3 = await agent.chat('What would it cost?');
      expect(response3.success).toBe(true);
      expect(response3.toolCalls).toBeDefined();
      expect(response3.toolCalls?.[0].name).toBe('get_pricing_info');

      // Verify agent statistics
      const stats = agent.getStats();
      expect(stats.messagesProcessed).toBe(3);
      expect(stats.toolCallsExecuted).toBe(2);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.totalCost).toBeGreaterThan(0);
    });

    it('should handle complete order flow', async () => {
      // Setup all required mocks
      mockSkyFi.mockArchiveSearch();
      mockSkyFi.mockGetArchive('354b783d-8fad-4050-a167-2eb069653777');
      mockSkyFi.mockGetPricing();
      mockSkyFi.mockArchiveOrder('order-123');

      // Setup mock OpenAI responses - Tool results FIRST to prevent loops
      // After search
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'search_satellite_archives';
        },
        {
          content: 'I found archive imagery matching your criteria.',
          finishReason: 'stop',
        }
      );

      // After get archive details
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'get_archive_details';
        },
        {
          content: 'This archive has very high resolution (0.7m) with 5% cloud cover.',
          finishReason: 'stop',
        }
      );

      // After get pricing
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'get_pricing_info';
        },
        {
          content: 'The pricing for this imagery is $5 per square kilometer.',
          finishReason: 'stop',
        }
      );

      // After order
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'order_archive_imagery';
        },
        {
          content: 'Order placed successfully! Your order ID is order-123.',
          finishReason: 'stop',
        }
      );

      // Initial search (user message 1)
      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 1 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('search');
        },
        {
          content: null,
          toolCalls: [
            {
              name: 'search_satellite_archives',
              args: {
                aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
                fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                toDate: new Date().toISOString(),
              },
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      // Get archive details (user message 2)
      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 2 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.includes('354b783d');
        },
        {
          content: null,
          toolCalls: [
            {
              name: 'get_archive_details',
              args: {
                archiveId: '354b783d-8fad-4050-a167-2eb069653777',
              },
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      // Get pricing (user message 3)
      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 3 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('cost');
        },
        {
          content: null,
          toolCalls: [
            {
              name: 'get_pricing_info',
              args: {},
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      // Place order (user message 4)
      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 4 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('order');
        },
        {
          content: null,
          toolCalls: [
            {
              name: 'order_archive_imagery',
              args: {
                archiveId: '354b783d-8fad-4050-a167-2eb069653777',
                aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
                deliveryDriver: 'S3',
                deliveryParams: {
                  s3_bucket_id: 'test-imagery-bucket',
                  aws_region: 'us-east-1',
                },
              },
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      // Execute multi-step conversation
      const messages = multiStepOrderConversation.userMessages;

      const response1 = await agent.chat(messages[0]);
      if (!response1.success) {
        console.log('Response1 failed:', response1.error, response1.message);
      }
      expect(response1.success).toBe(true);
      expect(response1.toolCalls?.[0].name).toBe('search_satellite_archives');

      const response2 = await agent.chat(messages[1]);
      if (!response2.success) {
        throw new Error(`Response2 failed - Error: ${response2.error}, Message: ${response2.message?.substring(0, 200)}`);
      }
      expect(response2.success).toBe(true);
      expect(response2.toolCalls?.[0].name).toBe('get_archive_details');

      const response3 = await agent.chat(messages[2]);
      expect(response3.success).toBe(true);
      expect(response3.toolCalls?.[0].name).toBe('get_pricing_info');

      const response4 = await agent.chat(messages[3]);
      expect(response4.success).toBe(true);
      expect(response4.toolCalls?.[0].name).toBe('order_archive_imagery');
      expect(response4.message).toMatch(/order|placed|order-123/i);

      // Verify full flow completed
      const stats = agent.getStats();
      expect(stats.messagesProcessed).toBe(4);
      expect(stats.toolCallsExecuted).toBe(4);
    });
  });

  describe('Scenario: Feasibility Check and Tasking', () => {
    it('should check tasking feasibility and predict passes', async () => {
      // Setup mocks
      mockSkyFi.mockFeasibilityCheck(true);
      mockSkyFi.mockPredictPasses();

      // Setup mock OpenAI responses - Tool results FIRST, then user messages with count
      // After feasibility check
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'check_tasking_feasibility';
        },
        {
          content: 'Good news! Tasking is highly feasible for your location with a 95% feasibility score.',
          finishReason: 'stop',
        }
      );

      // After predict passes
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'predict_satellite_passes';
        },
        {
          content: 'I found 2 satellite passes over the next 3 days.',
          finishReason: 'stop',
        }
      );

      // Check feasibility (user message 1) - use message count + content
      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 1 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('solar farm');
        },
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
        }
      );

      // Predict satellite passes (user message 2) - use message count + content
      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 2 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('show me all');
        },
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
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      // Execute conversation
      const userMessages = feasibilityCheckConversation.userMessages;

      // Message 1: Check feasibility
      const response1 = await agent.chat(userMessages[0]);
      if (!response1.success) {
        throw new Error(`Response failed - Error: ${response1.error}, Message: ${response1.message?.substring(0, 200)}`);
      }
      expect(response1.success).toBe(true);
      expect(response1.toolCalls).toBeDefined();
      expect(response1.toolCalls?.[0].name).toBe('check_tasking_feasibility');
      expect(response1.message).toMatch(/feasib(le|ility)|possible/i);

      // Message 2: Request satellite passes
      const response2 = await agent.chat(userMessages[1]);
      expect(response2.success).toBe(true);
      expect(response2.toolCalls).toBeDefined();
      expect(response2.toolCalls?.[0].name).toBe('predict_satellite_passes');
      expect(response2.message).toMatch(/pass(es)?|satellite/i);

      // Verify statistics
      const stats = agent.getStats();
      expect(stats.messagesProcessed).toBe(2);
      expect(stats.toolCallsExecuted).toBe(2);
    });

    it('should handle infeasible tasking requests', async () => {
      // Setup mocks
      mockSkyFi.mockFeasibilityCheck(false);

      // Tool result response FIRST
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'check_tasking_feasibility';
        },
        {
          content: 'Unfortunately, tasking is not feasible for this location and time window. The feasibility score is only 10%.',
          finishReason: 'stop',
        }
      );

      // User message response with count + content
      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 1 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('arizona');
        },
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
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      const response = await agent.chat(
        'Can I order new imagery of Arizona in the next week?'
      );

      expect(response.success).toBe(true);
      expect(response.toolCalls?.[0].name).toBe('check_tasking_feasibility');
      expect(response.message).toMatch(/not feasible|unfortunately/i);
    });
  });

  describe('Scenario: Monitoring Setup', () => {
    it('should create monitoring notifications and list them', async () => {
      // Setup mocks
      mockSkyFi.mockCreateNotification('notification-123');
      mockSkyFi.mockListNotifications();

      // Setup mock OpenAI responses - Tool results FIRST, then user messages with count
      // After creating notification
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'create_monitoring_notification';
        },
        {
          content: 'Successfully created your monitoring notification! You\'ll receive webhooks whenever new imagery becomes available.',
          finishReason: 'stop',
        }
      );

      // After listing notifications
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'list_notifications';
        },
        {
          content: 'You have 2 active monitoring notifications set up.',
          finishReason: 'stop',
        }
      );

      // Create notification (user message 1) - use message count + content
      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 1 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('coastal');
        },
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
        }
      );

      // List notifications (user message 2) - use message count + content
      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 2 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('show me all my active');
        },
        {
          content: null,
          toolCalls: [
            {
              name: 'list_notifications',
              args: {},
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      // Execute conversation
      const userMessages = monitoringSetupConversation.userMessages;

      // Message 1: Create notification
      const response1 = await agent.chat(userMessages[0]);
      expect(response1.success).toBe(true);
      expect(response1.toolCalls).toBeDefined();
      expect(response1.toolCalls?.[0].name).toBe('create_monitoring_notification');
      expect(response1.message).toMatch(/created|notification|monitoring/i);

      // Message 2: List notifications
      const response2 = await agent.chat(userMessages[1]);
      expect(response2.success).toBe(true);
      expect(response2.toolCalls).toBeDefined();
      expect(response2.toolCalls?.[0].name).toBe('list_notifications');

      // Verify statistics
      const stats = agent.getStats();
      expect(stats.messagesProcessed).toBe(2);
      expect(stats.toolCallsExecuted).toBe(2);
    });
  });

  describe('Scenario: Cost Estimation', () => {
    it('should provide pricing information and cost estimates', async () => {
      // Setup mocks
      mockSkyFi.mockGetPricing();

      // Tool result response FIRST
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'get_pricing_info';
        },
        {
          content: 'The pricing structure varies by product type, resolution, and provider. Very high resolution day imagery costs $5 per square kilometer.',
          finishReason: 'stop',
        }
      );

      // First user message with count + content
      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 1 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('planning a satellite');
        },
        {
          content: null,
          toolCalls: [
            {
              name: 'get_pricing_info',
              args: {},
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      // Second user message with count + content
      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 2 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('deforestation');
        },
        {
          content: 'With a $5,000 monthly budget and monitoring 500 km² total area (5 sites × 100 km²), you could afford medium resolution (5-10m) imagery with monthly captures.',
          finishReason: 'stop',
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      // Execute conversation
      const userMessages = costEstimationConversation.userMessages;

      const response1 = await agent.chat(userMessages[0]);
      expect(response1.success).toBe(true);
      expect(response1.toolCalls?.[0].name).toBe('get_pricing_info');
      expect(response1.message).toMatch(/pric(e|ing)|cost/i);

      const response2 = await agent.chat(userMessages[1]);
      expect(response2.success).toBe(true);
      expect(response2.message).toMatch(/budget|afford/i);
    });
  });

  describe('Scenario: Order Management', () => {
    it('should list orders and get order details', async () => {
      // Setup mocks
      mockSkyFi.mockListOrders();
      mockSkyFi.mockGetOrder('550e8400-e29b-41d4-a716-446655440099');

      // Tool result responses FIRST
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'list_orders';
        },
        {
          content: 'You have 2 orders: one archive order and one tasking order.',
          finishReason: 'stop',
        }
      );

      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'get_order_details';
        },
        {
          content: 'Order 550e8400-e29b-41d4-a716-446655440099 is in CREATED status.',
          finishReason: 'stop',
        }
      );

      // Then user message responses - check for "show me all"
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.toLowerCase().includes('show me all my orders');
        },
        {
          content: null,
          toolCalls: [
            {
              name: 'list_orders',
              args: {},
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      // Second user message - check for specific order ID
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.includes('550e8400');
        },
        {
          content: null,
          toolCalls: [
            {
              name: 'get_order_details',
              args: {
                orderId: '550e8400-e29b-41d4-a716-446655440099',
              },
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      const userMessages = orderManagementConversation.userMessages;

      const response1 = await agent.chat(userMessages[0]);
      expect(response1.success).toBe(true);
      expect(response1.toolCalls?.[0].name).toBe('list_orders');

      const response2 = await agent.chat(userMessages[1]);
      expect(response2.success).toBe(true);
      expect(response2.toolCalls?.[0].name).toBe('get_order_details');
    });
  });

  describe('Error Handling', () => {
    it('should handle SkyFi API errors gracefully', async () => {
      // Mock API error
      mockSkyFi.mockError('/archives', 'POST', 500, 'Internal server error');

      mockOpenAI.addMockResponse(
        matchLastUserMessage('search'),
        {
          content: null,
          toolCalls: [
            {
              name: 'search_satellite_archives',
              args: {
                aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
              },
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      // After error, OpenAI should apologize
      mockOpenAI.addMockResponse(
        matchLastToolCall('search_satellite_archives'),
        {
          content: 'I encountered an error while searching for imagery. Please try again later.',
          finishReason: 'stop',
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      const response = await agent.chat('Search for imagery in Austin, TX');

      // Tool execution should fail but agent should handle it
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls?.[0].name).toBe('search_satellite_archives');
      // The tool execution itself will fail, but agent should continue
    });

    it('should handle missing required parameters', async () => {
      mockOpenAI.addMockResponse(
        matchLastUserMessage('New York'),
        {
          content: 'To search for imagery, I need a specific area of interest defined as a polygon with coordinates. Could you provide the exact area you want to search?',
          finishReason: 'stop',
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      const response = await agent.chat('Search for satellite imagery around New York City');

      expect(response.success).toBe(true);
      expect(response.message).toMatch(/polygon|area of interest|AOI|coordinate/i);
      // Should not make tool calls without proper parameters
      expect(response.toolCalls).toBeUndefined();
    });

    it('should handle max iterations gracefully', async () => {
      // Setup a loop that keeps calling tools
      mockSkyFi.mockArchiveSearch();

      mockOpenAI.addMockResponse(
        () => true, // Always match
        {
          content: null,
          toolCalls: [
            {
              name: 'search_satellite_archives',
              args: {
                aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
              },
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        maxToolIterations: 3, // Low limit for testing
        verbose: true,
      });

      const response = await agent.chat('Search for imagery');

      expect(response.success).toBe(false);
      expect(response.error).toMatch(/maximum|iteration/i);
    });
  });

  describe('Conversation Context', () => {
    it('should maintain conversation context across multiple messages', async () => {
      mockSkyFi.mockArchiveSearch();
      mockSkyFi.mockGetPricing();

      // Tool result responses FIRST
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'search_satellite_archives';
        },
        {
          content: 'I found several archive images in Austin, TX.',
          finishReason: 'stop',
        }
      );

      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'get_pricing_info';
        },
        {
          content: 'The pricing for those Austin images would be approximately $250.',
          finishReason: 'stop',
        }
      );

      // User message responses with count + content
      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 1 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.includes('Search for imagery in Austin');
        },
        {
          content: null,
          toolCalls: [
            {
              name: 'search_satellite_archives',
              args: {
                aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
              },
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      mockOpenAI.addMockResponse(
        (messages) => {
          const userMsgs = messages.filter((m) => m.role === 'user');
          const lastMsg = messages[messages.length - 1];
          return userMsgs.length === 2 &&
                 lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.includes('those images');
        },
        {
          content: null,
          toolCalls: [
            {
              name: 'get_pricing_info',
              args: {},
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      const response1 = await agent.chat('Search for imagery in Austin, TX');
      expect(response1.success).toBe(true);

      // Second message references "those images" - requires context
      const response2 = await agent.chat('How much would those images cost?');
      expect(response2.success).toBe(true);
      expect(response2.message).toMatch(/Austin|250/i);

      // Verify conversation history
      const conversation = agent.exportConversation();
      expect(conversation.messages.length).toBeGreaterThan(4);
    });

    it('should track token usage across conversation', async () => {
      mockSkyFi.mockArchiveSearch();

      mockOpenAI.addMockResponse(
        () => true,
        {
          content: null,
          toolCalls: [
            {
              name: 'search_satellite_archives',
              args: {
                aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
              },
            },
          ],
          finishReason: 'tool_calls',
          tokens: {
            prompt: 500,
            completion: 100,
          },
        }
      );

      mockOpenAI.addMockResponse(
        matchLastToolCall('search_satellite_archives'),
        {
          content: 'Found imagery.',
          finishReason: 'stop',
          tokens: {
            prompt: 600,
            completion: 50,
          },
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      await agent.chat('Search for imagery');

      const stats = agent.getStats();
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.messagesProcessed).toBe(1);
    });
  });

  describe('Tool Invocation Verification', () => {
    it('should verify correct tool parameters are passed', async () => {
      mockSkyFi.mockArchiveSearch();

      // Tool result response FIRST
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'tool' && 'name' in lastMsg && lastMsg.name === 'search_satellite_archives';
        },
        {
          content: 'Search completed.',
          finishReason: 'stop',
        }
      );

      // Then user message response - check for "January 2024"
      mockOpenAI.addMockResponse(
        (messages) => {
          const lastMsg = messages[messages.length - 1];
          return lastMsg?.role === 'user' &&
                 typeof lastMsg.content === 'string' &&
                 lastMsg.content.includes('January 2024');
        },
        {
          content: null,
          toolCalls: [
            {
              name: 'search_satellite_archives',
              args: {
                aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
                fromDate: '2024-01-01T00:00:00Z',
                toDate: '2024-01-31T23:59:59Z',
                maxCloudCoverage: 10,
                resolutions: ['VERY HIGH'],
              },
            },
          ],
          finishReason: 'tool_calls',
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      const response = await agent.chat('Search for high-res imagery in January 2024');

      expect(response.success).toBe(true);
      expect(response.toolCalls).toBeDefined();
      expect(response.toolCalls?.[0].args).toMatchObject({
        aoi: expect.any(String),
        fromDate: expect.any(String),
        toDate: expect.any(String),
        maxCloudCoverage: 10,
        resolutions: ['VERY HIGH'],
      });
    });
  });

  describe('Agent Statistics', () => {
    it('should track comprehensive statistics', async () => {
      mockSkyFi.mockArchiveSearch();
      mockSkyFi.mockGetPricing();

      setupArchiveSearchMocks(mockOpenAI);

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      // Execute multiple messages
      await agent.chat('Search for imagery');
      await agent.chat('Show me details');
      await agent.chat('What would it cost?');

      const stats = agent.getStats();

      expect(stats.messagesProcessed).toBe(3);
      expect(stats.toolCallsExecuted).toBeGreaterThan(0);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Agent Configuration', () => {
    it('should respect custom configuration', async () => {
      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        maxToolIterations: 2,
        verbose: false,
      });

      const metadata = agent.getConversationMetadata();
      expect(metadata).toHaveProperty('id');
      expect(metadata).toHaveProperty('createdAt');
    });

    it('should allow clearing conversation', async () => {
      mockSkyFi.mockArchiveSearch();

      mockOpenAI.addMockResponse(
        () => true,
        {
          content: 'Hello!',
          finishReason: 'stop',
        }
      );

      const agent = new SkyFiAgent({
        openaiClient: mockOpenAI,
        toolExecutor,
        verbose: true,
      });

      await agent.chat('First message');
      await agent.chat('Second message');

      let conversation = agent.exportConversation();
      expect(conversation.messages.length).toBeGreaterThan(2);

      agent.clearConversation();

      conversation = agent.exportConversation();
      // Should only have system message
      expect(conversation.messages.length).toBe(1);
      expect(conversation.messages[0].role).toBe('system');
    });
  });
});
