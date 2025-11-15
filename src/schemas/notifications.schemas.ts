/**
 * Notification Validation Schemas
 *
 * Zod schemas for runtime validation of notification-related parameters and responses.
 * These schemas ensure all inputs meet SkyFi API requirements before making requests.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import {
  ProductType,
  Resolution,
  Provider,
} from '../types/notifications';

/**
 * Maximum area for AOI in square kilometers
 * Archive searches and notifications are limited to 500,000 sqkm
 */
const MAX_AOI_AREA_SQKM = 500000;

/**
 * Maximum number of vertices allowed in AOI polygon
 */
const MAX_AOI_VERTICES = 500;

/**
 * WKT POLYGON format validation
 * Validates that the string starts with POLYGON and contains coordinate pairs
 */
const WKT_POLYGON_REGEX = /^POLYGON\s*\(\(/i;

/**
 * Validates WKT POLYGON format
 */
export const isValidWKT = (value: string): boolean => {
  if (!WKT_POLYGON_REGEX.test(value)) {
    return false;
  }

  // Check if it's properly formatted with coordinates
  const coordMatch = value.match(/POLYGON\s*\(\(([\s\S]+)\)\)/i);
  if (!coordMatch) {
    return false;
  }

  // Extract coordinate pairs
  const coords = coordMatch[1];
  const points = coords.split(',').map((p) => p.trim());

  // Check vertex count (must not exceed MAX_AOI_VERTICES)
  if (points.length > MAX_AOI_VERTICES) {
    return false;
  }

  // Validate each point has two coordinates
  return points.every((point) => {
    const parts = point.trim().split(/\s+/);
    return parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]));
  });
};

/**
 * Validates webhook URL format and protocol
 */
export const isValidWebhookUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    // Webhook URLs should use HTTPS for security
    // HTTP allowed for local development/testing
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * Product type enum schema
 */
export const ProductTypeSchema = z.nativeEnum(ProductType);

/**
 * Resolution enum schema
 */
export const ResolutionSchema = z.nativeEnum(Resolution);

/**
 * Provider enum schema
 */
export const ProviderSchema = z.nativeEnum(Provider);

/**
 * Notification filter criteria schema
 */
export const NotificationFiltersSchema = z.object({
  productTypes: z.array(ProductTypeSchema).optional(),
  resolutions: z.array(ResolutionSchema).optional(),
  providers: z.array(ProviderSchema).optional(),
  maxCloudCoveragePercent: z
    .number()
    .min(0, 'Cloud coverage must be >= 0')
    .max(100, 'Cloud coverage must be <= 100')
    .optional(),
  maxOffNadirAngle: z
    .number()
    .min(0, 'Off-nadir angle must be >= 0')
    .max(90, 'Off-nadir angle must be <= 90')
    .optional(),
  openData: z.boolean().optional(),
});

/**
 * Create notification parameters schema
 */
export const CreateNotificationParamsSchema = z.object({
  aoi: z
    .string()
    .min(1, 'AOI is required')
    .refine(isValidWKT, {
      message: `AOI must be a valid WKT POLYGON with max ${MAX_AOI_VERTICES} vertices`,
    }),
  webhookUrl: z
    .string()
    .url('Webhook URL must be a valid URL')
    .refine(isValidWebhookUrl, {
      message: 'Webhook URL must use HTTP or HTTPS protocol',
    }),
  filters: NotificationFiltersSchema.optional(),
  name: z.string().max(255, 'Name must be <= 255 characters').optional(),
});

/**
 * Notification object schema
 */
export const NotificationSchema = z.object({
  id: z.string().uuid('Notification ID must be a valid UUID'),
  userId: z.string().uuid('User ID must be a valid UUID'),
  aoi: z.string().min(1),
  webhookUrl: z.string().url(),
  filters: NotificationFiltersSchema.optional(),
  name: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime('Created timestamp must be valid ISO 8601'),
  updatedAt: z.string().datetime('Updated timestamp must be valid ISO 8601'),
  triggerCount: z.number().int().nonnegative().optional(),
});

/**
 * Create notification response schema
 */
export const CreateNotificationResponseSchema = z.object({
  notification: NotificationSchema,
  message: z.string().optional(),
});

/**
 * List notifications response schema
 */
export const ListNotificationsResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

/**
 * Get notification response schema
 */
export const GetNotificationResponseSchema = z.object({
  notification: NotificationSchema,
});

/**
 * Delete notification response schema
 */
export const DeleteNotificationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedId: z.string().uuid(),
});

/**
 * Notification webhook payload schema
 */
export const NotificationWebhookPayloadSchema = z.object({
  notificationId: z.string().uuid(),
  timestamp: z.string().datetime(),
  archives: z.array(
    z.object({
      archiveId: z.string().uuid(),
      provider: z.string(),
      productType: ProductTypeSchema,
      resolution: ResolutionSchema,
      captureTimestamp: z.string().datetime(),
      cloudCoveragePercent: z.number().min(0).max(100),
      footprint: z.string(),
      thumbnailUrls: z.record(z.string()).optional(),
    })
  ),
  event: z.literal('NEW_IMAGERY_AVAILABLE'),
});

/**
 * Type exports from schemas for type inference
 */
export type CreateNotificationParamsInput = z.input<typeof CreateNotificationParamsSchema>;
export type NotificationFiltersInput = z.input<typeof NotificationFiltersSchema>;
