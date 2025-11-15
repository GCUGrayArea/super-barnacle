/**
 * Order Placement Methods
 *
 * Handles order placement for archive and tasking imagery through the SkyFi API.
 * This module includes robust validation to prevent costly mistakes, as order
 * placement involves payment processing.
 *
 * @packageDocumentation
 */

import { SkyFiClient } from './client';
import { logger } from '../lib/logger';
import { ValidationError } from '../lib/errors';
import { validateDeliveryConfiguration, validateWebhookUrl } from '../lib/delivery-validator';
import {
  ArchiveOrderRequest,
  TaskingOrderRequest,
  ArchiveOrderResponse,
  TaskingOrderResponse,
} from '../types/orders';
import {
  ArchiveOrderRequestSchema,
  TaskingOrderRequestSchema,
} from '../schemas/orders.schemas';

/**
 * Place an archive order for existing satellite imagery
 *
 * Orders imagery from SkyFi's archive catalog. The imagery already exists
 * and will be delivered to your specified cloud storage location.
 *
 * @param params - Archive order parameters
 * @param client - Optional SkyFi client instance (creates new one if not provided)
 * @returns Promise resolving to archive order response
 * @throws {ValidationError} If request parameters are invalid
 * @throws {DeliveryValidationError} If delivery configuration is invalid
 * @throws {SkyFiAPIError} If API request fails
 */
export async function placeArchiveOrder(
  params: ArchiveOrderRequest,
  client?: SkyFiClient,
): Promise<ArchiveOrderResponse> {
  logger.info('Placing archive order', {
    archiveId: params.archiveId,
    driver: params.deliveryDriver,
  });

  // Validate request parameters using Zod schema
  try {
    ArchiveOrderRequestSchema.parse(params);
  } catch (error) {
    logger.error('Archive order validation failed', { error });
    throw new ValidationError(
      'Invalid archive order parameters: ' + (error instanceof Error ? error.message : 'Unknown validation error'),
    );
  }

  // Validate delivery configuration
  validateDeliveryConfiguration(params.deliveryDriver, params.deliveryParams);

  // Validate webhook URL if provided
  if (params.webhookUrl) {
    validateWebhookUrl(params.webhookUrl);
  }

  // Create client if not provided
  const apiClient = client ?? new SkyFiClient();

  try {
    const response = await apiClient.post<ArchiveOrderResponse>(
      '/order-archive',
      params,
    );

    logger.info('Archive order placed successfully', {
      orderId: response.id,
      archiveId: params.archiveId,
    });

    return response;
  } catch (error) {
    logger.error('Failed to place archive order', {
      archiveId: params.archiveId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Place a tasking order for new satellite imagery
 *
 * Orders new satellite imagery to be captured within a specified time window.
 * This is a more complex and expensive operation than archive orders.
 *
 * @param params - Tasking order parameters
 * @param client - Optional SkyFi client instance (creates new one if not provided)
 * @returns Promise resolving to tasking order response
 * @throws {ValidationError} If request parameters are invalid
 * @throws {DeliveryValidationError} If delivery configuration is invalid
 * @throws {SkyFiAPIError} If API request fails
 */
export async function placeTaskingOrder(
  params: TaskingOrderRequest,
  client?: SkyFiClient,
): Promise<TaskingOrderResponse> {
  logger.info('Placing tasking order', {
    productType: params.productType,
    resolution: params.resolution,
    windowStart: params.windowStart,
    windowEnd: params.windowEnd,
    driver: params.deliveryDriver,
  });

  // Validate request parameters using Zod schema
  try {
    TaskingOrderRequestSchema.parse(params);
  } catch (error) {
    logger.error('Tasking order validation failed', { error });
    throw new ValidationError(
      'Invalid tasking order parameters: ' + (error instanceof Error ? error.message : 'Unknown validation error'),
    );
  }

  // Validate delivery configuration
  validateDeliveryConfiguration(params.deliveryDriver, params.deliveryParams);

  // Validate webhook URL if provided
  if (params.webhookUrl) {
    validateWebhookUrl(params.webhookUrl);
  }

  // Additional validation: ensure window times make sense
  const windowStart = new Date(params.windowStart);
  const windowEnd = new Date(params.windowEnd);
  const now = new Date();

  if (windowStart < now) {
    logger.warn('Tasking window start is in the past', {
      windowStart: params.windowStart,
      now: now.toISOString(),
    });
  }

  const windowDurationDays = (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24);
  if (windowDurationDays > 30) {
    logger.warn('Tasking window exceeds 30 days', {
      durationDays: windowDurationDays,
    });
  }

  // Create client if not provided
  const apiClient = client ?? new SkyFiClient();

  try {
    const response = await apiClient.post<TaskingOrderResponse>(
      '/order-tasking',
      params,
    );

    logger.info('Tasking order placed successfully', {
      orderId: response.id,
      productType: params.productType,
      resolution: params.resolution,
    });

    return response;
  } catch (error) {
    logger.error('Failed to place tasking order', {
      productType: params.productType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
