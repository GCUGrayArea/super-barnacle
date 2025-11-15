/**
 * SkyFi Notifications API
 *
 * Implements monitoring notification functionality for automated imagery alerts.
 * Notifications enable setting up webhooks that trigger when new imagery matching
 * specific criteria becomes available in the SkyFi archive.
 *
 * @packageDocumentation
 */

import { SkyFiClient } from './client';
import { logger } from '../lib/logger';
import { ValidationError } from '../lib/errors';
import {
  CreateNotificationParamsSchema,
  CreateNotificationResponseSchema,
  ListNotificationsResponseSchema,
  GetNotificationResponseSchema,
  DeleteNotificationResponseSchema,
} from '../schemas/notifications.schemas';
import type {
  CreateNotificationParams,
  CreateNotificationResponse,
  ListNotificationsResponse,
  GetNotificationResponse,
  DeleteNotificationResponse,
} from '../types/notifications';

/**
 * Create a new monitoring notification
 *
 * Sets up a webhook that will be called when new imagery matching the specified
 * criteria becomes available in the SkyFi archive. The webhook receives details
 * about the new imagery including archive IDs, metadata, and thumbnails.
 *
 * @param client - Authenticated SkyFi API client
 * @param params - Notification parameters (AOI, webhook URL, filters)
 * @returns Promise resolving to the created notification
 * @throws {ValidationError} If parameters are invalid
 * @throws {SkyFiAPIError} If API request fails
 *
 * @example
 * ```typescript
 * const notification = await createNotification(client, {
 *   aoi: 'POLYGON((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))',
 *   webhookUrl: 'https://my-app.com/webhooks/skyfi',
 *   filters: {
 *     productTypes: [ProductType.Day],
 *     resolutions: [Resolution.High, Resolution.VeryHigh],
 *     maxCloudCoveragePercent: 20,
 *   },
 *   name: 'Austin downtown monitoring',
 * });
 * ```
 */
export async function createNotification(
  client: SkyFiClient,
  params: CreateNotificationParams
): Promise<CreateNotificationResponse> {
  logger.info('Creating notification', {
    aoi: params.aoi.substring(0, 50) + '...',
    webhookUrl: params.webhookUrl,
    filters: params.filters,
    name: params.name,
  });

  // Validate input parameters
  try {
    CreateNotificationParamsSchema.parse(params);
  } catch (error) {
    logger.error('Notification parameter validation failed', { error, params });
    throw new ValidationError(
      `Invalid notification parameters: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error
    );
  }

  try {
    // Make API request
    const response = await client.post<CreateNotificationResponse>('/notifications', {
      aoi: params.aoi,
      webhook_url: params.webhookUrl,
      filters: params.filters,
      name: params.name,
    });

    // Validate response
    const validatedResponse = CreateNotificationResponseSchema.parse(response);

    logger.info('Notification created successfully', {
      notificationId: validatedResponse.notification.id,
      name: validatedResponse.notification.name,
    });

    return validatedResponse;
  } catch (error) {
    logger.error('Failed to create notification', {
      error,
      aoi: params.aoi.substring(0, 50) + '...',
    });
    throw error;
  }
}

/**
 * List all monitoring notifications for the authenticated user
 *
 * Retrieves all active and inactive notifications, optionally filtered
 * and paginated.
 *
 * @param client - Authenticated SkyFi API client
 * @param options - Optional pagination and filtering options
 * @returns Promise resolving to list of notifications
 * @throws {SkyFiAPIError} If API request fails
 *
 * @example
 * ```typescript
 * const response = await listNotifications(client, {
 *   page: 1,
 *   pageSize: 20,
 * });
 * console.log(`Found ${response.total} notifications`);
 * ```
 */
export async function listNotifications(
  client: SkyFiClient,
  options?: {
    page?: number;
    pageSize?: number;
    activeOnly?: boolean;
  }
): Promise<ListNotificationsResponse> {
  logger.info('Listing notifications', options);

  try {
    // Build query parameters
    const params: Record<string, string | number | boolean> = {};
    if (options?.page !== undefined) {
      params['page'] = options.page;
    }
    if (options?.pageSize !== undefined) {
      params['page_size'] = options.pageSize;
    }
    if (options?.activeOnly !== undefined) {
      params['active_only'] = options.activeOnly;
    }

    // Make API request
    const response = await client.get<ListNotificationsResponse>('/notifications', {
      params,
    });

    // Validate response
    const validatedResponse = ListNotificationsResponseSchema.parse(response);

    logger.info('Notifications retrieved successfully', {
      count: validatedResponse.notifications.length,
      total: validatedResponse.total,
    });

    return validatedResponse;
  } catch (error) {
    logger.error('Failed to list notifications', { error });
    throw error;
  }
}

/**
 * Get a specific notification by ID
 *
 * Retrieves detailed information about a notification, including
 * trigger count and current status.
 *
 * @param client - Authenticated SkyFi API client
 * @param notificationId - UUID of the notification
 * @returns Promise resolving to the notification details
 * @throws {NotFoundError} If notification doesn't exist
 * @throws {SkyFiAPIError} If API request fails
 *
 * @example
 * ```typescript
 * const response = await getNotificationById(client, 'uuid-here');
 * console.log(`Notification triggered ${response.notification.triggerCount} times`);
 * ```
 */
export async function getNotificationById(
  client: SkyFiClient,
  notificationId: string
): Promise<GetNotificationResponse> {
  logger.info('Getting notification by ID', { notificationId });

  // Basic validation of notification ID format
  if (!notificationId || typeof notificationId !== 'string') {
    throw new ValidationError('Notification ID must be a non-empty string', 'notificationId');
  }

  try {
    // Make API request
    const response = await client.get<GetNotificationResponse>(`/notifications/${notificationId}`);

    // Validate response
    const validatedResponse = GetNotificationResponseSchema.parse(response);

    logger.info('Notification retrieved successfully', {
      notificationId: validatedResponse.notification.id,
      isActive: validatedResponse.notification.isActive,
      triggerCount: validatedResponse.notification.triggerCount,
    });

    return validatedResponse;
  } catch (error) {
    logger.error('Failed to get notification', { error, notificationId });
    throw error;
  }
}

/**
 * Delete a monitoring notification
 *
 * Removes a notification and stops webhook delivery for new imagery.
 * This action is permanent and cannot be undone.
 *
 * @param client - Authenticated SkyFi API client
 * @param notificationId - UUID of the notification to delete
 * @returns Promise resolving to deletion confirmation
 * @throws {NotFoundError} If notification doesn't exist
 * @throws {SkyFiAPIError} If API request fails
 *
 * @example
 * ```typescript
 * const response = await deleteNotification(client, 'uuid-here');
 * console.log(response.message); // "Notification deleted successfully"
 * ```
 */
export async function deleteNotification(
  client: SkyFiClient,
  notificationId: string
): Promise<DeleteNotificationResponse> {
  logger.info('Deleting notification', { notificationId });

  // Basic validation of notification ID format
  if (!notificationId || typeof notificationId !== 'string') {
    throw new ValidationError('Notification ID must be a non-empty string', 'notificationId');
  }

  try {
    // Make API request
    const response = await client.delete<DeleteNotificationResponse>(
      `/notifications/${notificationId}`
    );

    // Validate response
    const validatedResponse = DeleteNotificationResponseSchema.parse(response);

    logger.info('Notification deleted successfully', {
      notificationId: validatedResponse.deletedId,
    });

    return validatedResponse;
  } catch (error) {
    logger.error('Failed to delete notification', { error, notificationId });
    throw error;
  }
}
