/**
 * Integration Tests for Notifications API
 *
 * Tests complete notification lifecycle including creation, listing,
 * retrieval, and deletion of monitoring notifications.
 */

import axios from 'axios';
import { SkyFiClient } from '../../src/skyfi/client';
import { createConfigFromEnv } from '../../src/skyfi/config';
import {
  createNotification,
  listNotifications,
  getNotificationById,
  deleteNotification,
} from '../../src/skyfi/notifications';
import type { CreateNotificationParams } from '../../src/types/notifications';
import { ProductType, Resolution, Provider } from '../../src/types/notifications';
import {
  mockNotification,
  mockNotificationsListResponse,
  validWKTPolygonLarge,
  mockValidationError,
  mockAuthenticationError,
  mockNotFoundError,
  mockRateLimitError,
  mockServerError,
} from '../fixtures/skyfi-responses';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

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
    process.env['SKYFI_API_KEY'] = 'test-api-key';
  });

  beforeEach(() => {
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

    mockedAxios.create = jest.fn(() => mockAxiosInstance) as unknown as typeof axios.create;

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

  describe('Create Notification - Success Cases', () => {
    it('should create notification with full parameters', async () => {
      const params: CreateNotificationParams = {
        aoi: validWKTPolygonLarge,
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

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          notification: mockNotification,
          message: 'Notification created successfully',
        },
      });

      const result = await createNotification(client, params);

      expect(result.notification.id).toBe(mockNotification.id);
      expect(result.notification.name).toBe('Austin Downtown High-Res Monitoring');
      expect(result.notification.isActive).toBe(true);
      expect(result.message).toBe('Notification created successfully');
    });

    it('should create notification with minimal parameters', async () => {
      const params: CreateNotificationParams = {
        aoi: validWKTPolygonLarge,
        webhookUrl: 'https://webhook.example.com/notify',
      };

      const minimalNotification = {
        ...mockNotification,
        filters: undefined,
        name: undefined,
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          notification: minimalNotification,
        },
      });

      const result = await createNotification(client, params);

      expect(result.notification.id).toBeDefined();
      expect(result.notification.filters).toBeUndefined();
      expect(result.notification.name).toBeUndefined();
    });

    it('should create notification for open data only', async () => {
      const params: CreateNotificationParams = {
        aoi: validWKTPolygonLarge,
        webhookUrl: 'https://webhook.example.com/notify',
        filters: {
          openData: true,
        },
      };

      const openDataNotification = {
        ...mockNotification,
        filters: {
          openData: true,
        },
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          notification: openDataNotification,
        },
      });

      const result = await createNotification(client, params);

      expect(result.notification.filters?.openData).toBe(true);
    });

    it('should create notification with specific providers', async () => {
      const params: CreateNotificationParams = {
        aoi: validWKTPolygonLarge,
        webhookUrl: 'https://webhook.example.com/notify',
        filters: {
          providers: [Provider.Planet],
        },
      };

      const providerNotification = {
        ...mockNotification,
        filters: {
          providers: [Provider.Planet],
        },
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          notification: providerNotification,
        },
      });

      const result = await createNotification(client, params);

      expect(result.notification.filters?.providers).toEqual([Provider.Planet]);
    });
  });

  describe('List Notifications - Success Cases', () => {
    it('should list all notifications', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockNotificationsListResponse,
      });

      const result = await listNotifications(client);

      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.notifications[0]?.id).toBe(mockNotification.id);
    });

    it('should list notifications with pagination', async () => {
      const paginatedResponse = {
        notifications: [mockNotification],
        total: 10,
        page: 2,
        pageSize: 5,
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: paginatedResponse,
      });

      const result = await listNotifications(client, { page: 2, pageSize: 5 });

      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
    });

    it('should return empty list when no notifications exist', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          notifications: [],
          total: 0,
        },
      });

      const result = await listNotifications(client);

      expect(result.notifications).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should list notifications showing trigger counts', async () => {
      const notificationWithTriggers = {
        ...mockNotification,
        triggerCount: 42,
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          notifications: [notificationWithTriggers],
          total: 1,
        },
      });

      const result = await listNotifications(client);

      expect(result.notifications[0]?.triggerCount).toBe(42);
    });

    it('should list both active and inactive notifications', async () => {
      const activeNotification = mockNotification;
      const inactiveNotification = {
        ...mockNotification,
        id: '550e8400-e29b-41d4-a716-446655440001',
        isActive: false,
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          notifications: [activeNotification, inactiveNotification],
          total: 2,
        },
      });

      const result = await listNotifications(client);

      expect(result.notifications).toHaveLength(2);
      expect(result.notifications[0]?.isActive).toBe(true);
      expect(result.notifications[1]?.isActive).toBe(false);
    });
  });

  describe('Get Notification By ID - Success Cases', () => {
    it('should retrieve notification details', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          notification: mockNotification,
        },
      });

      const result = await getNotificationById(client, mockNotification.id);

      expect(result.notification.id).toBe(mockNotification.id);
      expect(result.notification.triggerCount).toBe(5);
      expect(result.notification.filters).toBeDefined();
    });

    it('should retrieve notification with complete filter details', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          notification: mockNotification,
        },
      });

      const result = await getNotificationById(client, mockNotification.id);

      expect(result.notification.filters?.productTypes).toEqual([
        ProductType.Day,
        ProductType.Multispectral,
      ]);
      expect(result.notification.filters?.resolutions).toEqual([
        Resolution.High,
        Resolution.VeryHigh,
      ]);
      expect(result.notification.filters?.maxCloudCoveragePercent).toBe(15);
    });
  });

  describe('Delete Notification - Success Cases', () => {
    it('should successfully delete notification', async () => {
      mockAxiosInstance.delete.mockResolvedValue({
        data: {
          success: true,
          message: 'Notification deleted successfully',
          deletedId: mockNotification.id,
        },
      });

      const result = await deleteNotification(client, mockNotification.id);

      expect(result.success).toBe(true);
      expect(result.deletedId).toBe(mockNotification.id);
      expect(result.message).toBe('Notification deleted successfully');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle validation errors for invalid webhook URL', async () => {
      const params: CreateNotificationParams = {
        aoi: validWKTPolygonLarge,
        webhookUrl: 'invalid-url',
      };

      const validationError = new Error('Validation failed');
      (validationError as any).response = {
        status: 400,
        data: {
          detail: 'Invalid webhook URL',
        },
      };
      (validationError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(validationError);

      await expect(createNotification(client, params)).rejects.toThrow();
    });

    it('should handle validation errors for invalid AOI', async () => {
      const params: CreateNotificationParams = {
        aoi: 'INVALID WKT',
        webhookUrl: 'https://webhook.example.com/notify',
      };

      const validationError = new Error('Validation failed');
      (validationError as any).response = {
        status: 422,
        data: mockValidationError,
      };
      (validationError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(validationError);

      await expect(createNotification(client, params)).rejects.toThrow();
    });

    it('should handle 404 not found for get notification', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as any).response = {
        status: 404,
        data: mockNotFoundError,
      };
      (notFoundError as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(notFoundError);

      await expect(getNotificationById(client, 'non-existent-id')).rejects.toThrow();
    });

    it('should handle 404 not found for delete notification', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as any).response = {
        status: 404,
        data: mockNotFoundError,
      };
      (notFoundError as any).isAxiosError = true;
      mockAxiosInstance.delete.mockRejectedValue(notFoundError);

      await expect(deleteNotification(client, 'non-existent-id')).rejects.toThrow();
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).response = {
        status: 401,
        data: mockAuthenticationError,
      };
      (authError as any).isAxiosError = true;
      mockAxiosInstance.get.mockRejectedValue(authError);

      await expect(listNotifications(client)).rejects.toThrow();
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limited');
      (rateLimitError as any).response = {
        status: 429,
        data: mockRateLimitError,
        headers: { 'retry-after': '60' },
      };
      (rateLimitError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(rateLimitError);

      await expect(
        createNotification(client, {
          aoi: validWKTPolygonLarge,
          webhookUrl: 'https://webhook.example.com/notify',
        }),
      ).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      const serverError = new Error('Server error');
      (serverError as any).response = {
        status: 500,
        data: mockServerError,
      };
      (serverError as any).isAxiosError = true;
      mockAxiosInstance.post.mockRejectedValue(serverError);

      await expect(
        createNotification(client, {
          aoi: validWKTPolygonLarge,
          webhookUrl: 'https://webhook.example.com/notify',
        }),
      ).rejects.toThrow();
    });
  });

  describe('End-to-End Notification Lifecycle', () => {
    it('should complete full notification workflow', async () => {
      // Step 1: Create notification
      const createParams: CreateNotificationParams = {
        aoi: validWKTPolygonLarge,
        webhookUrl: 'https://webhook.example.com/notify',
        filters: {
          productTypes: [ProductType.Day],
          resolutions: [Resolution.High],
        },
        name: 'E2E Test Notification',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          notification: mockNotification,
        },
      });

      const created = await createNotification(client, createParams);
      expect(created.notification.id).toBe(mockNotification.id);

      // Step 2: List notifications
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          notifications: [mockNotification],
          total: 1,
        },
      });

      const listed = await listNotifications(client);
      expect(listed.notifications).toHaveLength(1);
      expect(listed.notifications[0]?.id).toBe(mockNotification.id);

      // Step 3: Get notification details
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          notification: {
            ...mockNotification,
            triggerCount: 3,
          },
        },
      });

      const retrieved = await getNotificationById(client, mockNotification.id);
      expect(retrieved.notification.id).toBe(mockNotification.id);
      expect(retrieved.notification.triggerCount).toBe(3);

      // Step 4: Delete notification
      mockAxiosInstance.delete.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Notification deleted successfully',
          deletedId: mockNotification.id,
        },
      });

      const deleted = await deleteNotification(client, mockNotification.id);
      expect(deleted.success).toBe(true);
      expect(deleted.deletedId).toBe(mockNotification.id);
    });

    it('should monitor notification triggers over time', async () => {
      // Initial state: 0 triggers
      const initialNotification = {
        ...mockNotification,
        triggerCount: 0,
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          notification: initialNotification,
        },
      });

      const initial = await getNotificationById(client, mockNotification.id);
      expect(initial.notification.triggerCount).toBe(0);

      // After some time: 5 triggers
      const updatedNotification = {
        ...mockNotification,
        triggerCount: 5,
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          notification: updatedNotification,
        },
      });

      const updated = await getNotificationById(client, mockNotification.id);
      expect(updated.notification.triggerCount).toBe(5);
    });
  });
});
