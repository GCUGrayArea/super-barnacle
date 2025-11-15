/**
 * Notification Type Definitions
 *
 * Type definitions for SkyFi monitoring notifications (webhooks for new imagery alerts).
 * Notifications enable automated workflows by sending webhooks when new imagery
 * matching specific criteria becomes available.
 *
 * @packageDocumentation
 */

/**
 * Product types available for satellite imagery
 */
export enum ProductType {
  /** Optical day imagery (RGB) */
  Day = 'DAY',
  /** Multispectral imagery with additional spectral bands */
  Multispectral = 'MULTISPECTRAL',
  /** Synthetic Aperture Radar imagery */
  SAR = 'SAR',
}

/**
 * Resolution levels for satellite imagery
 */
export enum Resolution {
  /** Low resolution (~10-30m) */
  Low = 'LOW',
  /** Medium resolution (~3-10m) */
  Medium = 'MEDIUM',
  /** High resolution (~1-3m) */
  High = 'HIGH',
  /** Very high resolution (<1m) */
  VeryHigh = 'VERY_HIGH',
}

/**
 * Satellite imagery providers
 */
export enum Provider {
  Planet = 'PLANET',
  Maxar = 'MAXAR',
  Umbra = 'UMBRA',
  Capella = 'CAPELLA',
  Airbus = 'AIRBUS',
  BlackSky = 'BLACKSKY',
  Sentinel2 = 'SENTINEL2',
}

/**
 * Filter criteria for notification triggers
 */
export interface NotificationFilters {
  /** Product types to monitor (DAY, MULTISPECTRAL, SAR) */
  productTypes?: ProductType[];
  /** Resolutions to monitor */
  resolutions?: Resolution[];
  /** Satellite providers to monitor */
  providers?: Provider[];
  /** Maximum cloud coverage percentage (0-100) */
  maxCloudCoveragePercent?: number;
  /** Maximum off-nadir angle in degrees */
  maxOffNadirAngle?: number;
  /** Filter for open data only */
  openData?: boolean;
}

/**
 * Request parameters for creating a notification
 */
export interface CreateNotificationParams {
  /** Area of Interest in WKT POLYGON format (max 500 vertices, max 500k sqkm) */
  aoi: string;
  /** Webhook URL to receive notifications (must be valid HTTPS URL) */
  webhookUrl: string;
  /** Optional filter criteria for the notification */
  filters?: NotificationFilters;
  /** Optional name/description for the notification */
  name?: string;
}

/**
 * Notification object returned from the API
 */
export interface Notification {
  /** Unique notification ID */
  id: string;
  /** User ID who created the notification */
  userId: string;
  /** Area of Interest in WKT POLYGON format */
  aoi: string;
  /** Webhook URL for notifications */
  webhookUrl: string;
  /** Filter criteria for the notification */
  filters?: NotificationFilters;
  /** Optional name/description */
  name?: string;
  /** Whether the notification is active */
  isActive: boolean;
  /** Timestamp when the notification was created */
  createdAt: string;
  /** Timestamp when the notification was last updated */
  updatedAt: string;
  /** Number of times this notification has been triggered */
  triggerCount?: number;
}

/**
 * Response from creating a notification
 */
export interface CreateNotificationResponse {
  /** The created notification */
  notification: Notification;
  /** Success message */
  message?: string;
}

/**
 * Response from listing notifications
 */
export interface ListNotificationsResponse {
  /** Array of notifications */
  notifications: Notification[];
  /** Total count of notifications */
  total: number;
  /** Current page number (if paginated) */
  page?: number;
  /** Page size (if paginated) */
  pageSize?: number;
}

/**
 * Response from getting a notification by ID
 */
export interface GetNotificationResponse {
  /** The requested notification */
  notification: Notification;
}

/**
 * Response from deleting a notification
 */
export interface DeleteNotificationResponse {
  /** Success status */
  success: boolean;
  /** Success message */
  message: string;
  /** ID of the deleted notification */
  deletedId: string;
}

/**
 * Webhook payload structure sent to the webhook URL when new imagery matches
 */
export interface NotificationWebhookPayload {
  /** The notification that triggered this webhook */
  notificationId: string;
  /** Timestamp when the webhook was triggered */
  timestamp: string;
  /** Archive imagery that matched the notification filters */
  archives: Array<{
    archiveId: string;
    provider: string;
    productType: ProductType;
    resolution: Resolution;
    captureTimestamp: string;
    cloudCoveragePercent: number;
    footprint: string;
    thumbnailUrls?: Record<string, string>;
  }>;
  /** Event type */
  event: 'NEW_IMAGERY_AVAILABLE';
}
