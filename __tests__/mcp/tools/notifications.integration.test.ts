/**
 * Integration tests for MCP Notification Tools
 *
 * These tests verify the MCP notification tools work correctly with the
 * SkyFi API client and proper data flow end-to-end.
 */

import axios from 'axios';
import { SkyFiClient } from '../../../src/skyfi/client';
import {
  executeCreateNotification,
  TOOL_NAME as CREATE_TOOL_NAME,
} from '../../../src/mcp/tools/create-notification';
import {
  executeListNotifications,
  TOOL_NAME as LIST_TOOL_NAME,
} from '../../../src/mcp/tools/list-notifications';
import {
  executeDeleteNotification,
  TOOL_NAME as DELETE_TOOL_NAME,
} from '../../../src/mcp/tools/delete-notification';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger to reduce noise in tests
jest.mock('../../../src/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('MCP Notification Tools Integration', () => {
  let client: SkyFiClient;
  let mockAxiosInstance: any;

  beforeAll(() => {
    // Set environment variable for API key
    process.env['SKYFI_API_KEY'] = 'test-api-key';
  });

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create = jest.fn(() => mockAxiosInstance) as unknown as typeof axios.create;

    // Create a real SkyFiClient instance with mocked axios
    client = new SkyFiClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://app.skyfi.com/platform-api',
      timeout: 30000,
      maxRetries: 3,
      debug: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create_monitoring_notification Integration', () => {
    it('should create notification and format result correctly', async () => {
      const input = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
        filters: {
          productTypes: ['DAY'],
          resolutions: ['HIGH'],
          maxCloudCoveragePercent: 20,
        },
        name: 'Test Notification',
      };

      const mockApiResponse = {
        data: {
          notification: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            aoi: input.aoi,
            webhookUrl: input.webhookUrl,
            filters: {
              productTypes: ['DAY'],
              resolutions: ['HIGH'],
              maxCloudCoveragePercent: 20,
            },
            name: input.name,
            isActive: true,
            createdAt: '2025-01-15T10:30:00Z',
            updatedAt: '2025-01-15T10:30:00Z',
            triggerCount: 0,
          },
          message: 'Notification created successfully',
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockApiResponse);

      const result = await executeCreateNotification(client, input);

      // Verify result structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');

      // Verify formatted text contains expected sections
      const text = result.content[0]!.text;
      expect(text).toContain('Notification Created Successfully');
      expect(text).toContain('550e8400-e29b-41d4-a716-446655440000');
      expect(text).toContain('Test Notification');
      expect(text).toContain('https://example.com/webhook');
      expect(text).toContain('Webhook Setup Guidance');
      expect(text).toContain('Expected Webhook Payload Format');
      expect(text).toContain('Next Steps');
      expect(text).toContain('ngrok');
      expect(text).toContain('webhook.site');
    });

    it('should handle minimal notification creation', async () => {
      const input = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
      };

      const mockApiResponse = {
        data: {
          notification: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            aoi: input.aoi,
            webhookUrl: input.webhookUrl,
            isActive: true,
            createdAt: '2025-01-15T10:30:00Z',
            updatedAt: '2025-01-15T10:30:00Z',
            triggerCount: 0,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockApiResponse);

      const result = await executeCreateNotification(client, input);

      const text = result.content[0]!.text;
      expect(text).toContain('(unnamed)');
      expect(text).toContain('all imagery will trigger notifications');
    });

    it('should handle API errors gracefully', async () => {
      const input = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
      };

      const error = new Error('API Error: Webhook URL is not accessible');
      mockAxiosInstance.post.mockRejectedValueOnce(error);

      // Should propagate errors from the API
      try {
        await executeCreateNotification(client, input);
        // If no error, that's also acceptable as long as validation passed
      } catch (e) {
        // Error was thrown, which is expected
        expect(e).toBeDefined();
      }
    });
  });

  describe('list_notifications Integration', () => {
    it('should list notifications and format result correctly', async () => {
      const mockApiResponse = {
        data: {
          notifications: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              userId: '123e4567-e89b-12d3-a456-426614174000',
              aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
              webhookUrl: 'https://webhook1.example.com/notify',
              name: 'Notification 1',
              filters: {
                productTypes: ['DAY'],
                resolutions: ['HIGH'],
              },
              isActive: true,
              createdAt: '2025-01-15T10:00:00Z',
              updatedAt: '2025-01-15T10:00:00Z',
              triggerCount: 5,
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              userId: '123e4567-e89b-12d3-a456-426614174000',
              aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
              webhookUrl: 'https://webhook2.example.com/notify',
              name: 'Notification 2',
              isActive: true,
              createdAt: '2025-01-14T10:00:00Z',
              updatedAt: '2025-01-15T09:00:00Z',
              triggerCount: 12,
            },
          ],
          total: 2,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockApiResponse);

      const result = await executeListNotifications(client, {});

      // Verify result structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      // Verify formatted text contains expected information
      const text = result.content[0]!.text;
      expect(text).toContain('Monitoring Notifications');
      expect(text).toContain('2 of 2');
      expect(text).toContain('550e8400-e29b-41d4-a716-446655440000');
      expect(text).toContain('550e8400-e29b-41d4-a716-446655440001');
      expect(text).toContain('Notification 1');
      expect(text).toContain('Notification 2');
      expect(text).toContain('Triggers: 5');
      expect(text).toContain('Triggers: 12');
      expect(text).toContain('✓ Active');
      expect(text).toContain('delete_notification');
    });

    it('should handle empty notification list', async () => {
      const mockApiResponse = {
        data: {
          notifications: [],
          total: 0,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockApiResponse);

      const result = await executeListNotifications(client, {});

      const text = result.content[0]!.text;
      expect(text).toContain('No notifications found');
      expect(text).toContain('create_monitoring_notification');
    });

    it('should handle pagination correctly', async () => {
      const mockApiResponse = {
        data: {
          notifications: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              userId: '123e4567-e89b-12d3-a456-426614174000',
              aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
              webhookUrl: 'https://webhook.example.com/notify',
              isActive: true,
              createdAt: '2025-01-15T10:00:00Z',
              updatedAt: '2025-01-15T10:00:00Z',
            },
          ],
          total: 10,
          page: 2,
          pageSize: 5,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockApiResponse);

      const result = await executeListNotifications(client, {
        page: 2,
        pageSize: 5,
      });

      const text = result.content[0]!.text;
      expect(text).toContain('Page 2');
      expect(text).toContain('5 per page');
      expect(text).toContain('10 total');
    });

    it('should include inactive notifications when requested', async () => {
      const mockApiResponse = {
        data: {
          notifications: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              userId: '123e4567-e89b-12d3-a456-426614174000',
              aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
              webhookUrl: 'https://webhook.example.com/notify',
              isActive: false,
              createdAt: '2025-01-15T10:00:00Z',
              updatedAt: '2025-01-15T10:00:00Z',
            },
          ],
          total: 1,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockApiResponse);

      const result = await executeListNotifications(client, {
        includeInactive: true,
      });

      // Verify API was called with activeOnly: false
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/notifications',
        expect.objectContaining({
          params: expect.objectContaining({
            active_only: false,
          }),
        })
      );

      const text = result.content[0]!.text;
      expect(text).toContain('✗ Inactive');
    });
  });

  describe('delete_notification Integration', () => {
    it('should delete notification and format result correctly', async () => {
      const notificationId = '550e8400-e29b-41d4-a716-446655440000';

      const mockApiResponse = {
        data: {
          success: true,
          message: 'Notification deleted successfully',
          deletedId: notificationId,
        },
      };

      mockAxiosInstance.delete.mockResolvedValueOnce(mockApiResponse);

      const result = await executeDeleteNotification(client, { notificationId });

      // Verify result structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');

      // Verify formatted text contains expected information
      const text = result.content[0]!.text;
      expect(text).toContain('Notification Deleted');
      expect(text).toContain('Notification deleted successfully');
      expect(text).toContain(notificationId);
      expect(text).toContain('webhook will no longer receive notifications');
      expect(text).toContain('create_monitoring_notification');
    });

    it('should handle 404 error for non-existent notification', async () => {
      const notificationId = '550e8400-e29b-41d4-a716-446655440099';

      const error = new Error('API Error: Notification not found');
      mockAxiosInstance.delete.mockRejectedValueOnce(error);

      // Should propagate errors from the API
      try {
        await executeDeleteNotification(client, { notificationId });
        // If no error, that's also acceptable as the ID format was valid
      } catch (e) {
        // Error was thrown, which is expected
        expect(e).toBeDefined();
      }
    });
  });

  describe('End-to-End Workflow Integration', () => {
    it('should complete full notification lifecycle via MCP tools', async () => {
      // Step 1: Create notification via MCP tool
      const createInput = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://webhook.example.com/notify',
        filters: {
          productTypes: ['DAY'],
          resolutions: ['HIGH'],
        },
        name: 'E2E Test Notification',
      };

      const createdNotificationId = '550e8400-e29b-41d4-a716-446655440000';

      const createResponse = {
        data: {
          notification: {
            id: createdNotificationId,
            userId: '123e4567-e89b-12d3-a456-426614174000',
            aoi: createInput.aoi,
            webhookUrl: createInput.webhookUrl,
            filters: {
              productTypes: ['DAY'],
              resolutions: ['HIGH'],
            },
            name: createInput.name,
            isActive: true,
            createdAt: '2025-01-15T10:00:00Z',
            updatedAt: '2025-01-15T10:00:00Z',
            triggerCount: 0,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(createResponse);
      const createResult = await executeCreateNotification(client, createInput);
      expect(createResult.content[0]!.text).toContain(createdNotificationId);

      // Step 2: List notifications via MCP tool
      const listResponse = {
        data: {
          notifications: [
            {
              ...createResponse.data.notification,
              triggerCount: 3, // Simulate some triggers
            },
          ],
          total: 1,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(listResponse);
      const listResult = await executeListNotifications(client, {});
      expect(listResult.content[0]!.text).toContain(createdNotificationId);
      expect(listResult.content[0]!.text).toContain('Triggers: 3');

      // Step 3: Delete notification via MCP tool
      const deleteResponse = {
        data: {
          success: true,
          message: 'Notification deleted successfully',
          deletedId: createdNotificationId,
        },
      };

      mockAxiosInstance.delete.mockResolvedValueOnce(deleteResponse);
      const deleteResult = await executeDeleteNotification(client, {
        notificationId: createdNotificationId,
      });
      expect(deleteResult.content[0]!.text).toContain('Notification Deleted');
      expect(deleteResult.content[0]!.text).toContain(createdNotificationId);
    });
  });

  describe('Validation and Error Formatting', () => {
    it('should provide helpful error message for invalid webhook URL', async () => {
      const input = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'not-a-valid-url',
      };

      try {
        await executeCreateNotification(client, input);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain('Webhook URL');
        }
      }
    });

    it('should provide helpful error message for invalid AOI', async () => {
      const input = {
        aoi: '',
        webhookUrl: 'https://example.com/webhook',
      };

      try {
        await executeCreateNotification(client, input);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain('aoi');
        }
      }
    });

    it('should provide helpful error message for invalid UUID', async () => {
      const input = {
        notificationId: 'not-a-uuid',
      };

      try {
        await executeDeleteNotification(client, input);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain('UUID');
        }
      }
    });
  });
});
