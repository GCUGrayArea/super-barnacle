/**
 * Unit tests for SkyFi Notifications API
 *
 * Tests for notification management functionality including creation,
 * listing, retrieval, and deletion of monitoring notifications.
 */

import { SkyFiClient } from '../../src/skyfi/client';
import { ValidationError } from '../../src/lib/errors';
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
  Notification,
} from '../../src/types/notifications';

// Mock the SkyFiClient
jest.mock('../../src/skyfi/client');
jest.mock('../../src/lib/logger');

describe('SkyFi Notifications API', () => {
  let mockClient: jest.Mocked<SkyFiClient>;

  beforeEach(() => {
    // Create a fresh mock client for each test
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      put: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    const validParams: CreateNotificationParams = {
      aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
      webhookUrl: 'https://example.com/webhook',
      filters: {
        productTypes: [ProductType.Day],
        resolutions: [Resolution.High],
        maxCloudCoveragePercent: 20,
      },
      name: 'Test Notification',
    };

    const mockNotification: Notification = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      aoi: validParams.aoi,
      webhookUrl: validParams.webhookUrl,
      filters: validParams.filters,
      name: validParams.name,
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      triggerCount: 0,
    };

    it('should create a notification with valid parameters', async () => {
      const mockResponse = {
        notification: mockNotification,
        message: 'Notification created successfully',
      };

      mockClient.post.mockResolvedValueOnce(mockResponse);

      const result = await createNotification(mockClient, validParams);

      expect(mockClient.post).toHaveBeenCalledWith('/notifications', {
        aoi: validParams.aoi,
        webhook_url: validParams.webhookUrl,
        filters: validParams.filters,
        name: validParams.name,
      });
      expect(result).toEqual(mockResponse);
      expect(result.notification.id).toBe(mockNotification.id);
      expect(result.notification.isActive).toBe(true);
    });

    it('should create a notification without filters', async () => {
      const paramsWithoutFilters: CreateNotificationParams = {
        aoi: validParams.aoi,
        webhookUrl: validParams.webhookUrl,
      };

      const mockResponse = {
        notification: { ...mockNotification, filters: undefined },
      };

      mockClient.post.mockResolvedValueOnce(mockResponse);

      const result = await createNotification(mockClient, paramsWithoutFilters);

      expect(mockClient.post).toHaveBeenCalledWith('/notifications', {
        aoi: paramsWithoutFilters.aoi,
        webhook_url: paramsWithoutFilters.webhookUrl,
        filters: undefined,
        name: undefined,
      });
      expect(result.notification.filters).toBeUndefined();
    });

    it('should throw ValidationError for invalid AOI format', async () => {
      const invalidParams = {
        ...validParams,
        aoi: 'INVALID AOI FORMAT',
      };

      await expect(createNotification(mockClient, invalidParams)).rejects.toThrow(
        ValidationError
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid webhook URL', async () => {
      const invalidParams = {
        ...validParams,
        webhookUrl: 'not-a-valid-url',
      };

      await expect(createNotification(mockClient, invalidParams)).rejects.toThrow(
        ValidationError
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for AOI with too many vertices', async () => {
      // Create a polygon with more than 500 vertices
      const coords = Array.from({ length: 501 }, (_, i) => `${-97.7 + i * 0.001} ${30.2 + i * 0.001}`).join(', ');
      const invalidParams = {
        ...validParams,
        aoi: `POLYGON ((${coords}))`,
      };

      await expect(createNotification(mockClient, invalidParams)).rejects.toThrow(
        ValidationError
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid cloud coverage percentage', async () => {
      const invalidParams = {
        ...validParams,
        filters: {
          maxCloudCoveragePercent: 150, // Invalid: > 100
        },
      };

      await expect(createNotification(mockClient, invalidParams)).rejects.toThrow(
        ValidationError
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for negative cloud coverage', async () => {
      const invalidParams = {
        ...validParams,
        filters: {
          maxCloudCoveragePercent: -10,
        },
      };

      await expect(createNotification(mockClient, invalidParams)).rejects.toThrow(
        ValidationError
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should accept HTTP webhook URLs for development', async () => {
      const paramsWithHttp = {
        ...validParams,
        webhookUrl: 'http://localhost:3000/webhook',
      };

      const mockResponse = {
        notification: { ...mockNotification, webhookUrl: paramsWithHttp.webhookUrl },
      };

      mockClient.post.mockResolvedValueOnce(mockResponse);

      const result = await createNotification(mockClient, paramsWithHttp);

      expect(result.notification.webhookUrl).toBe(paramsWithHttp.webhookUrl);
    });
  });

  describe('listNotifications', () => {
    const mockNotifications: Notification[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook1',
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook2',
        isActive: false,
        createdAt: '2025-01-02T00:00:00Z',
        updatedAt: '2025-01-02T00:00:00Z',
      },
    ];

    it('should list all notifications without options', async () => {
      const mockResponse = {
        notifications: mockNotifications,
        total: 2,
      };

      mockClient.get.mockResolvedValueOnce(mockResponse);

      const result = await listNotifications(mockClient);

      expect(mockClient.get).toHaveBeenCalledWith('/notifications', {
        params: {},
      });
      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should list notifications with pagination', async () => {
      const mockResponse = {
        notifications: [mockNotifications[0]],
        total: 10,
        page: 1,
        pageSize: 1,
      };

      mockClient.get.mockResolvedValueOnce(mockResponse);

      const result = await listNotifications(mockClient, {
        page: 1,
        pageSize: 1,
      });

      expect(mockClient.get).toHaveBeenCalledWith('/notifications', {
        params: {
          page: 1,
          page_size: 1,
        },
      });
      expect(result.notifications).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(1);
    });

    it('should filter for active notifications only', async () => {
      const mockResponse = {
        notifications: [mockNotifications[0]],
        total: 1,
      };

      mockClient.get.mockResolvedValueOnce(mockResponse);

      const result = await listNotifications(mockClient, {
        activeOnly: true,
      });

      expect(mockClient.get).toHaveBeenCalledWith('/notifications', {
        params: {
          active_only: true,
        },
      });
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0]?.isActive).toBe(true);
    });

    it('should return empty list when no notifications exist', async () => {
      const mockResponse = {
        notifications: [],
        total: 0,
      };

      mockClient.get.mockResolvedValueOnce(mockResponse);

      const result = await listNotifications(mockClient);

      expect(result.notifications).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getNotificationById', () => {
    const notificationId = '123e4567-e89b-12d3-a456-426614174000';
    const mockNotification: Notification = {
      id: notificationId,
      userId: '123e4567-e89b-12d3-a456-426614174001',
      aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
      webhookUrl: 'https://example.com/webhook',
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      triggerCount: 5,
    };

    it('should get notification by ID', async () => {
      const mockResponse = {
        notification: mockNotification,
      };

      mockClient.get.mockResolvedValueOnce(mockResponse);

      const result = await getNotificationById(mockClient, notificationId);

      expect(mockClient.get).toHaveBeenCalledWith(`/notifications/${notificationId}`);
      expect(result.notification.id).toBe(notificationId);
      expect(result.notification.triggerCount).toBe(5);
    });

    it('should throw ValidationError for empty notification ID', async () => {
      await expect(getNotificationById(mockClient, '')).rejects.toThrow(ValidationError);
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid notification ID type', async () => {
      await expect(
        getNotificationById(mockClient, null as unknown as string)
      ).rejects.toThrow(ValidationError);
      expect(mockClient.get).not.toHaveBeenCalled();
    });
  });

  describe('deleteNotification', () => {
    const notificationId = '123e4567-e89b-12d3-a456-426614174000';

    it('should delete notification by ID', async () => {
      const mockResponse = {
        success: true,
        message: 'Notification deleted successfully',
        deletedId: notificationId,
      };

      mockClient.delete.mockResolvedValueOnce(mockResponse);

      const result = await deleteNotification(mockClient, notificationId);

      expect(mockClient.delete).toHaveBeenCalledWith(`/notifications/${notificationId}`);
      expect(result.success).toBe(true);
      expect(result.deletedId).toBe(notificationId);
    });

    it('should throw ValidationError for empty notification ID', async () => {
      await expect(deleteNotification(mockClient, '')).rejects.toThrow(ValidationError);
      expect(mockClient.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid notification ID type', async () => {
      await expect(
        deleteNotification(mockClient, null as unknown as string)
      ).rejects.toThrow(ValidationError);
      expect(mockClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('Notification filters validation', () => {
    it('should accept valid product types', async () => {
      const params: CreateNotificationParams = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
        filters: {
          productTypes: [ProductType.Day, ProductType.Multispectral, ProductType.SAR],
        },
      };

      mockClient.post.mockResolvedValueOnce({
        notification: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          aoi: params.aoi,
          webhookUrl: params.webhookUrl,
          filters: params.filters,
          isActive: true,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      });

      const result = await createNotification(mockClient, params);
      expect(result.notification.filters?.productTypes).toHaveLength(3);
    });

    it('should accept valid resolutions', async () => {
      const params: CreateNotificationParams = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
        filters: {
          resolutions: [
            Resolution.Low,
            Resolution.Medium,
            Resolution.High,
            Resolution.VeryHigh,
          ],
        },
      };

      mockClient.post.mockResolvedValueOnce({
        notification: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          aoi: params.aoi,
          webhookUrl: params.webhookUrl,
          filters: params.filters,
          isActive: true,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      });

      const result = await createNotification(mockClient, params);
      expect(result.notification.filters?.resolutions).toHaveLength(4);
    });

    it('should accept valid providers', async () => {
      const params: CreateNotificationParams = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
        filters: {
          providers: [Provider.Planet, Provider.Maxar],
        },
      };

      mockClient.post.mockResolvedValueOnce({
        notification: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          aoi: params.aoi,
          webhookUrl: params.webhookUrl,
          filters: params.filters,
          isActive: true,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      });

      const result = await createNotification(mockClient, params);
      expect(result.notification.filters?.providers).toHaveLength(2);
    });

    it('should accept openData filter', async () => {
      const params: CreateNotificationParams = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
        filters: {
          openData: true,
        },
      };

      mockClient.post.mockResolvedValueOnce({
        notification: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          aoi: params.aoi,
          webhookUrl: params.webhookUrl,
          filters: params.filters,
          isActive: true,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      });

      const result = await createNotification(mockClient, params);
      expect(result.notification.filters?.openData).toBe(true);
    });
  });
});
