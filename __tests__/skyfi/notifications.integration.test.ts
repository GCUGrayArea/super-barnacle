/**
 * Integration tests for SkyFi Notifications API
 *
 * These tests verify the notifications module works correctly with mocked API responses
 * that match the actual SkyFi API format.
 */

import axios from 'axios';
import { SkyFiClient } from '../../src/skyfi/client';
import {
  createNotification,
  listNotifications,
  getNotificationById,
  deleteNotification,
} from '../../src/skyfi/notifications';
import {
  ProductType,
  Resolution,
  Provider,
  CreateNotificationParams,
} from '../../src/types/notifications';
import { SkyFiAPIError, ValidationError } from '../../src/lib/errors';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger to reduce noise in tests
jest.mock('../../src/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Notifications Integration Tests', () => {
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

  describe('Create Notification Integration', () => {
    it('should create notification with full workflow', async () => {
      const params: CreateNotificationParams = {
        aoi: 'POLYGON ((-97.72441554971037 30.289674402322873, -97.67245401025714 30.289674402322873, -97.67244213427398 30.244570392925723, -97.72440367372722 30.244570392925723, -97.72441554971037 30.289674402322873))',
        webhookUrl: 'https://my-app.example.com/webhooks/skyfi',
        filters: {
          productTypes: [ProductType.Day, ProductType.Multispectral],
          resolutions: [Resolution.High, Resolution.VeryHigh],
          maxCloudCoveragePercent: 15,
          maxOffNadirAngle: 25,
          providers: [Provider.Planet, Provider.Maxar],
          openData: false,
        },
        name: 'Austin Downtown High-Res Monitoring',
      };

      const mockApiResponse = {
        data: {
          notification: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            aoi: params.aoi,
            webhookUrl: params.webhookUrl,
            filters: params.filters,
            name: params.name,
            isActive: true,
            createdAt: '2025-01-15T10:30:00Z',
            updatedAt: '2025-01-15T10:30:00Z',
            triggerCount: 0,
          },
          message: 'Notification created successfully',
        },
      };

      // Mock the axios post call
      mockAxiosInstance.post.mockResolvedValueOnce(mockApiResponse);

      const result = await createNotification(client, params);

      expect(result.notification.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.notification.name).toBe('Austin Downtown High-Res Monitoring');
      expect(result.notification.filters?.productTypes).toEqual([
        ProductType.Day,
        ProductType.Multispectral,
      ]);
      expect(result.notification.isActive).toBe(true);
      expect(result.notification.triggerCount).toBe(0);
      expect(result.message).toBe('Notification created successfully');
    });

    it('should create notification with minimal parameters', async () => {
      const params: CreateNotificationParams = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://webhook.example.com/notify',
      };

      const mockApiResponse = {
        data: {
          notification: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            aoi: params.aoi,
            webhookUrl: params.webhookUrl,
            isActive: true,
            createdAt: '2025-01-15T10:31:00Z',
            updatedAt: '2025-01-15T10:31:00Z',
            triggerCount: 0,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockApiResponse);

      const result = await createNotification(client, params);

      expect(result.notification.id).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(result.notification.filters).toBeUndefined();
      expect(result.notification.name).toBeUndefined();
    });

    it('should handle API error when creating notification', async () => {
      const params: CreateNotificationParams = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://webhook.example.com/notify',
      };

      const error = new Error('Invalid webhook URL');
      (error as any).response = {
        status: 400,
        data: {
          detail: 'Invalid webhook URL',
        },
      };
      (error as any).isAxiosError = true;

      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(createNotification(client, params)).rejects.toThrow();
    });
  });

  describe('List Notifications Integration', () => {
    it('should list all notifications', async () => {
      const mockApiResponse = {
        data: {
          notifications: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              userId: '123e4567-e89b-12d3-a456-426614174000',
              aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
              webhookUrl: 'https://webhook1.example.com/notify',
              name: 'Notification 1',
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
              isActive: false,
              createdAt: '2025-01-14T10:00:00Z',
              updatedAt: '2025-01-15T09:00:00Z',
              triggerCount: 12,
            },
          ],
          total: 2,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockApiResponse);

      const result = await listNotifications(client);

      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.notifications[0]?.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.notifications[0]?.isActive).toBe(true);
      expect(result.notifications[1]?.isActive).toBe(false);
    });

    it('should list notifications with pagination', async () => {
      const mockApiResponse = {
        data: {
          notifications: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              userId: '123e4567-e89b-12d3-a456-426614174000',
              aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
              webhookUrl: 'https://webhook1.example.com/notify',
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

      const result = await listNotifications(client, { page: 2, pageSize: 5 });

      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
    });

    it('should return empty list when no notifications exist', async () => {
      const mockApiResponse = {
        data: {
          notifications: [],
          total: 0,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockApiResponse);

      const result = await listNotifications(client);

      expect(result.notifications).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Get Notification By ID Integration', () => {
    it('should get notification details', async () => {
      const notificationId = '550e8400-e29b-41d4-a716-446655440000';

      const mockApiResponse = {
        data: {
          notification: {
            id: notificationId,
            userId: '123e4567-e89b-12d3-a456-426614174000',
            aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
            webhookUrl: 'https://webhook.example.com/notify',
            filters: {
              productTypes: [ProductType.Day],
              resolutions: [Resolution.High],
              maxCloudCoveragePercent: 20,
            },
            name: 'Test Notification',
            isActive: true,
            createdAt: '2025-01-15T10:00:00Z',
            updatedAt: '2025-01-15T12:00:00Z',
            triggerCount: 8,
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockApiResponse);

      const result = await getNotificationById(client, notificationId);

      expect(result.notification.id).toBe(notificationId);
      expect(result.notification.triggerCount).toBe(8);
      expect(result.notification.filters?.productTypes).toEqual([ProductType.Day]);
    });

    it('should handle 404 error for non-existent notification', async () => {
      const notificationId = '550e8400-e29b-41d4-a716-446655440099';

      const error = new Error('Notification not found');
      (error as any).response = {
        status: 404,
        data: {
          detail: 'Notification not found',
        },
      };
      (error as any).isAxiosError = true;

      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(getNotificationById(client, notificationId)).rejects.toThrow();
    });
  });

  describe('Delete Notification Integration', () => {
    it('should delete notification successfully', async () => {
      const notificationId = '550e8400-e29b-41d4-a716-446655440000';

      const mockApiResponse = {
        data: {
          success: true,
          message: 'Notification deleted successfully',
          deletedId: notificationId,
        },
      };

      mockAxiosInstance.delete.mockResolvedValueOnce(mockApiResponse);

      const result = await deleteNotification(client, notificationId);

      expect(result.success).toBe(true);
      expect(result.deletedId).toBe(notificationId);
      expect(result.message).toBe('Notification deleted successfully');
    });

    it('should handle 404 error when deleting non-existent notification', async () => {
      const notificationId = '550e8400-e29b-41d4-a716-446655440099';

      const error = new Error('Notification not found');
      (error as any).response = {
        status: 404,
        data: {
          detail: 'Notification not found',
        },
      };
      (error as any).isAxiosError = true;

      mockAxiosInstance.delete.mockRejectedValueOnce(error);

      await expect(deleteNotification(client, notificationId)).rejects.toThrow();
    });
  });

  describe('End-to-End Notification Workflow', () => {
    it('should complete full notification lifecycle', async () => {
      // Step 1: Create notification
      const createParams: CreateNotificationParams = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://webhook.example.com/notify',
        filters: {
          productTypes: [ProductType.Day],
          resolutions: [Resolution.High],
        },
        name: 'E2E Test Notification',
      };

      const createdNotificationId = '550e8400-e29b-41d4-a716-446655440000';

      const createResponse = {
        data: {
          notification: {
            id: createdNotificationId,
            userId: '123e4567-e89b-12d3-a456-426614174000',
            aoi: createParams.aoi,
            webhookUrl: createParams.webhookUrl,
            filters: createParams.filters,
            name: createParams.name,
            isActive: true,
            createdAt: '2025-01-15T10:00:00Z',
            updatedAt: '2025-01-15T10:00:00Z',
            triggerCount: 0,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(createResponse);
      const created = await createNotification(client, createParams);
      expect(created.notification.id).toBe(createdNotificationId);

      // Step 2: List notifications
      const listResponse = {
        data: {
          notifications: [created.notification],
          total: 1,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(listResponse);
      const listed = await listNotifications(client);
      expect(listed.notifications).toHaveLength(1);
      expect(listed.notifications[0]?.id).toBe(createdNotificationId);

      // Step 3: Get notification by ID
      const getResponse = {
        data: {
          notification: {
            ...created.notification,
            triggerCount: 3,
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(getResponse);
      const retrieved = await getNotificationById(client, createdNotificationId);
      expect(retrieved.notification.id).toBe(createdNotificationId);
      expect(retrieved.notification.triggerCount).toBe(3);

      // Step 4: Delete notification
      const deleteResponse = {
        data: {
          success: true,
          message: 'Notification deleted successfully',
          deletedId: createdNotificationId,
        },
      };

      mockAxiosInstance.delete.mockResolvedValueOnce(deleteResponse);
      const deleted = await deleteNotification(client, createdNotificationId);
      expect(deleted.success).toBe(true);
      expect(deleted.deletedId).toBe(createdNotificationId);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle rate limiting error', async () => {
      const params: CreateNotificationParams = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://webhook.example.com/notify',
      };

      const error = new Error('Rate limit exceeded');
      (error as any).response = {
        status: 429,
        data: {
          detail: 'Rate limit exceeded',
        },
      };
      (error as any).isAxiosError = true;

      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(createNotification(client, params)).rejects.toThrow();
    });

    it('should handle authentication error', async () => {
      const error = new Error('Invalid API key');
      (error as any).response = {
        status: 401,
        data: {
          detail: 'Invalid API key',
        },
      };
      (error as any).isAxiosError = true;

      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(listNotifications(client)).rejects.toThrow();
    });

    it('should handle server error', async () => {
      const params: CreateNotificationParams = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://webhook.example.com/notify',
      };

      const error = new Error('Internal server error');
      (error as any).response = {
        status: 500,
        data: {
          detail: 'Internal server error',
        },
      };
      (error as any).isAxiosError = true;

      mockAxiosInstance.post.mockRejectedValueOnce(error);

      await expect(createNotification(client, params)).rejects.toThrow();
    });
  });
});
