/**
 * MCP Tool Input Schemas for Notifications
 *
 * This module defines the input validation schemas for MCP notification tools.
 * These schemas validate parameters received from MCP clients before processing.
 */

import { z } from 'zod';
import { isValidWKT, isValidWebhookUrl } from '../../schemas/notifications.schemas.js';

/**
 * Create notification tool input schema
 *
 * Validates parameters for creating a new monitoring notification.
 * The webhook URL receives POST requests when new imagery matches the AOI and filters.
 */
export const CreateNotificationInputSchema = z.object({
  /**
   * Area of Interest in WKT POLYGON format
   * Example: "POLYGON((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))"
   * Maximum 500 vertices, max 500,000 sqkm area
   */
  aoi: z
    .string()
    .min(1, 'AOI is required')
    .refine(isValidWKT, {
      message: 'AOI must be a valid WKT POLYGON with max 500 vertices',
    }),

  /**
   * Webhook URL to receive notifications
   * Must be a valid HTTPS URL (HTTP allowed for local development)
   * Example: "https://your-app.com/webhooks/skyfi"
   */
  webhookUrl: z
    .string()
    .url('Webhook URL must be a valid URL')
    .refine(isValidWebhookUrl, {
      message: 'Webhook URL must use HTTP or HTTPS protocol',
    }),

  /**
   * Optional filter criteria for imagery notifications
   */
  filters: z
    .object({
      /**
       * Product types to monitor (DAY, MULTISPECTRAL, SAR)
       */
      productTypes: z.array(z.enum(['DAY', 'MULTISPECTRAL', 'SAR'])).optional(),

      /**
       * Resolution levels to monitor (LOW, MEDIUM, HIGH, VERY_HIGH)
       */
      resolutions: z.array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'])).optional(),

      /**
       * Satellite providers to monitor
       */
      providers: z
        .array(z.enum(['PLANET', 'MAXAR', 'UMBRA', 'CAPELLA', 'AIRBUS', 'BLACKSKY', 'SENTINEL2']))
        .optional(),

      /**
       * Maximum cloud coverage percentage (0-100)
       */
      maxCloudCoveragePercent: z
        .number()
        .min(0, 'Cloud coverage must be >= 0')
        .max(100, 'Cloud coverage must be <= 100')
        .optional(),

      /**
       * Maximum off-nadir angle in degrees (0-90)
       */
      maxOffNadirAngle: z
        .number()
        .min(0, 'Off-nadir angle must be >= 0')
        .max(90, 'Off-nadir angle must be <= 90')
        .optional(),

      /**
       * Filter for open data only
       */
      openData: z.boolean().optional(),
    })
    .optional(),

  /**
   * Optional name/description for the notification
   */
  name: z.string().max(255, 'Name must be <= 255 characters').optional(),
});

/**
 * List notifications tool input schema
 *
 * Validates parameters for listing monitoring notifications.
 */
export const ListNotificationsInputSchema = z.object({
  /**
   * Page number for pagination (1-based)
   */
  page: z.number().int().positive().optional(),

  /**
   * Number of notifications per page
   */
  pageSize: z.number().int().positive().max(100).optional(),

  /**
   * Whether to include inactive notifications (default: false)
   */
  includeInactive: z.boolean().optional(),
});

/**
 * Delete notification tool input schema
 *
 * Validates parameters for deleting a monitoring notification.
 */
export const DeleteNotificationInputSchema = z.object({
  /**
   * UUID of the notification to delete
   */
  notificationId: z.string().uuid('Notification ID must be a valid UUID'),
});

/**
 * Type exports for input validation
 */
export type CreateNotificationInput = z.infer<typeof CreateNotificationInputSchema>;
export type ListNotificationsInput = z.infer<typeof ListNotificationsInputSchema>;
export type DeleteNotificationInput = z.infer<typeof DeleteNotificationInputSchema>;
