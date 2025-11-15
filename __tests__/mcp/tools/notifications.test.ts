/**
 * Unit tests for MCP Notification Tools
 *
 * Tests for the notification MCP tool handlers including create, list, and delete.
 */

import { SkyFiClient } from '../../../src/skyfi/client';
import { ValidationError } from '../../../src/lib/errors';
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
import {
  ProductType,
  Resolution,
  Notification,
  CreateNotificationResponse,
  ListNotificationsResponse,
  DeleteNotificationResponse,
} from '../../../src/types/notifications';
import * as notificationsApi from '../../../src/skyfi/notifications';

// Mock dependencies
jest.mock('../../../src/skyfi/client');
jest.mock('../../../src/skyfi/notifications');
jest.mock('../../../src/lib/logger');

describe('MCP Notification Tools', () => {
  let mockClient: jest.Mocked<SkyFiClient>;

  beforeEach(() => {
    // Create a fresh mock client for each test
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      put: jest.fn(),
    } as unknown as jest.Mocked<SkyFiClient>;

    jest.clearAllMocks();
  });

  describe('create_monitoring_notification', () => {
    const validInput = {
      aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
      webhookUrl: 'https://example.com/webhook',
      filters: {
        productTypes: ['DAY'],
        resolutions: ['HIGH'],
        maxCloudCoveragePercent: 20,
      },
      name: 'Test Notification',
    };

    const mockNotification: Notification = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      aoi: validInput.aoi,
      webhookUrl: validInput.webhookUrl,
      filters: {
        productTypes: [ProductType.Day],
        resolutions: [Resolution.High],
        maxCloudCoveragePercent: 20,
      },
      name: validInput.name,
      isActive: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      triggerCount: 0,
    };

    it('should have correct tool name', () => {
      expect(CREATE_TOOL_NAME).toBe('create_monitoring_notification');
    });

    it('should create a notification with valid input', async () => {
      const mockResponse: CreateNotificationResponse = {
        notification: mockNotification,
        message: 'Notification created successfully',
      };

      jest.spyOn(notificationsApi, 'createNotification').mockResolvedValueOnce(mockResponse);

      const result = await executeCreateNotification(mockClient, validInput);

      expect(notificationsApi.createNotification).toHaveBeenCalledWith(mockClient, {
        aoi: validInput.aoi,
        webhookUrl: validInput.webhookUrl,
        filters: {
          productTypes: [ProductType.Day],
          resolutions: [Resolution.High],
          maxCloudCoveragePercent: 20,
        },
        name: validInput.name,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('Notification Created Successfully');
      expect(result.content[0]?.text).toContain(mockNotification.id);
      expect(result.content[0]?.text).toContain('Webhook Setup Guidance');
    });

    it('should create a notification without filters', async () => {
      const inputWithoutFilters = {
        aoi: validInput.aoi,
        webhookUrl: validInput.webhookUrl,
      };

      const mockResponse: CreateNotificationResponse = {
        notification: { ...mockNotification, filters: undefined },
      };

      jest.spyOn(notificationsApi, 'createNotification').mockResolvedValueOnce(mockResponse);

      const result = await executeCreateNotification(mockClient, inputWithoutFilters);

      expect(notificationsApi.createNotification).toHaveBeenCalledWith(mockClient, {
        aoi: inputWithoutFilters.aoi,
        webhookUrl: inputWithoutFilters.webhookUrl,
        filters: undefined,
        name: undefined,
      });

      expect(result.content[0]?.text).toContain('all imagery will trigger notifications');
    });

    it('should throw error for invalid AOI', async () => {
      const invalidInput = {
        ...validInput,
        aoi: 'INVALID AOI',
      };

      await expect(executeCreateNotification(mockClient, invalidInput)).rejects.toThrow();
      expect(notificationsApi.createNotification).not.toHaveBeenCalled();
    });

    it('should throw error for invalid webhook URL', async () => {
      const invalidInput = {
        ...validInput,
        webhookUrl: 'not-a-valid-url',
      };

      await expect(executeCreateNotification(mockClient, invalidInput)).rejects.toThrow();
      expect(notificationsApi.createNotification).not.toHaveBeenCalled();
    });

    it('should throw error for missing required fields', async () => {
      const invalidInput = {
        webhookUrl: 'https://example.com/webhook',
        // missing aoi
      };

      await expect(executeCreateNotification(mockClient, invalidInput)).rejects.toThrow();
      expect(notificationsApi.createNotification).not.toHaveBeenCalled();
    });

    it('should throw error for invalid cloud coverage', async () => {
      const invalidInput = {
        ...validInput,
        filters: {
          maxCloudCoveragePercent: 150, // > 100
        },
      };

      await expect(executeCreateNotification(mockClient, invalidInput)).rejects.toThrow();
      expect(notificationsApi.createNotification).not.toHaveBeenCalled();
    });

    it('should accept HTTP webhook URLs for development', async () => {
      const inputWithHttp = {
        ...validInput,
        webhookUrl: 'http://localhost:3000/webhook',
      };

      const mockResponse: CreateNotificationResponse = {
        notification: { ...mockNotification, webhookUrl: inputWithHttp.webhookUrl },
      };

      jest.spyOn(notificationsApi, 'createNotification').mockResolvedValueOnce(mockResponse);

      const result = await executeCreateNotification(mockClient, inputWithHttp);

      expect(result.content[0]?.text).toContain('http://localhost:3000/webhook');
    });
  });

  describe('list_notifications', () => {
    const mockNotifications: Notification[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook1',
        isActive: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        triggerCount: 5,
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

    it('should have correct tool name', () => {
      expect(LIST_TOOL_NAME).toBe('list_notifications');
    });

    it('should list notifications without options', async () => {
      const mockResponse: ListNotificationsResponse = {
        notifications: mockNotifications,
        total: 2,
      };

      jest.spyOn(notificationsApi, 'listNotifications').mockResolvedValueOnce(mockResponse);

      const result = await executeListNotifications(mockClient, {});

      expect(notificationsApi.listNotifications).toHaveBeenCalledWith(mockClient, {
        page: undefined,
        pageSize: undefined,
        activeOnly: true,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('Monitoring Notifications');
      expect(result.content[0]?.text).toContain('2 of 2');
      expect(result.content[0]?.text).toContain(mockNotifications[0]!.id);
      expect(result.content[0]?.text).toContain(mockNotifications[1]!.id);
    });

    it('should list notifications with pagination', async () => {
      const mockResponse: ListNotificationsResponse = {
        notifications: [mockNotifications[0]!],
        total: 10,
        page: 1,
        pageSize: 1,
      };

      jest.spyOn(notificationsApi, 'listNotifications').mockResolvedValueOnce(mockResponse);

      const result = await executeListNotifications(mockClient, {
        page: 1,
        pageSize: 1,
      });

      expect(notificationsApi.listNotifications).toHaveBeenCalledWith(mockClient, {
        page: 1,
        pageSize: 1,
        activeOnly: true,
      });

      expect(result.content[0]?.text).toContain('Page 1');
      expect(result.content[0]?.text).toContain('1 of 10');
    });

    it('should include inactive notifications when requested', async () => {
      const mockResponse: ListNotificationsResponse = {
        notifications: mockNotifications,
        total: 2,
      };

      jest.spyOn(notificationsApi, 'listNotifications').mockResolvedValueOnce(mockResponse);

      await executeListNotifications(mockClient, {
        includeInactive: true,
      });

      expect(notificationsApi.listNotifications).toHaveBeenCalledWith(mockClient, {
        page: undefined,
        pageSize: undefined,
        activeOnly: false,
      });
    });

    it('should handle empty notification list', async () => {
      const mockResponse: ListNotificationsResponse = {
        notifications: [],
        total: 0,
      };

      jest.spyOn(notificationsApi, 'listNotifications').mockResolvedValueOnce(mockResponse);

      const result = await executeListNotifications(mockClient, {});

      expect(result.content[0]?.text).toContain('No notifications found');
      expect(result.content[0]?.text).toContain('create_monitoring_notification');
    });

    it('should display trigger counts', async () => {
      const mockResponse: ListNotificationsResponse = {
        notifications: [mockNotifications[0]!],
        total: 1,
      };

      jest.spyOn(notificationsApi, 'listNotifications').mockResolvedValueOnce(mockResponse);

      const result = await executeListNotifications(mockClient, {});

      expect(result.content[0]?.text).toContain('Triggers: 5');
    });
  });

  describe('delete_notification', () => {
    const notificationId = '123e4567-e89b-12d3-a456-426614174000';

    it('should have correct tool name', () => {
      expect(DELETE_TOOL_NAME).toBe('delete_notification');
    });

    it('should delete a notification by ID', async () => {
      const mockResponse: DeleteNotificationResponse = {
        success: true,
        message: 'Notification deleted successfully',
        deletedId: notificationId,
      };

      jest.spyOn(notificationsApi, 'deleteNotification').mockResolvedValueOnce(mockResponse);

      const result = await executeDeleteNotification(mockClient, { notificationId });

      expect(notificationsApi.deleteNotification).toHaveBeenCalledWith(mockClient, notificationId);

      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('Notification Deleted');
      expect(result.content[0]?.text).toContain(notificationId);
      expect(result.content[0]?.text).toContain('webhook will no longer receive notifications');
    });

    it('should throw error for invalid notification ID format', async () => {
      const invalidInput = {
        notificationId: 'not-a-uuid',
      };

      await expect(executeDeleteNotification(mockClient, invalidInput)).rejects.toThrow();
      expect(notificationsApi.deleteNotification).not.toHaveBeenCalled();
    });

    it('should throw error for missing notification ID', async () => {
      await expect(executeDeleteNotification(mockClient, {})).rejects.toThrow();
      expect(notificationsApi.deleteNotification).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should format validation errors for webhook URL', async () => {
      const invalidInput = {
        aoi: 'POLYGON ((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
        webhookUrl: 'ftp://invalid-protocol.com',
      };

      try {
        await executeCreateNotification(mockClient, invalidInput);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain('Webhook');
        }
      }
    });

    it('should format validation errors for AOI', async () => {
      const invalidInput = {
        aoi: '', // empty AOI
        webhookUrl: 'https://example.com/webhook',
      };

      try {
        await executeCreateNotification(mockClient, invalidInput);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain('aoi');
        }
      }
    });
  });
});
