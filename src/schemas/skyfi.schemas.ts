/**
 * SkyFi API Zod Validation Schemas
 *
 * Runtime validation schemas for all SkyFi Platform API requests and responses.
 * These schemas ensure type safety at runtime and provide clear validation errors.
 *
 * @see https://app.skyfi.com/platform-api
 */

import { z } from 'zod';

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

/**
 * Product type enum schema
 */
export const ProductTypeSchema = z.enum([
  'DAY',
  'NIGHT',
  'VIDEO',
  'MULTISPECTRAL',
  'HYPERSPECTRAL',
  'SAR',
  'STEREO',
]);

/**
 * Resolution enum schema
 */
export const ResolutionSchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'VERY HIGH',
  'SUPER HIGH',
  'ULTRA HIGH',
  'CM 30',
  'CM 50',
]);

/**
 * Delivery driver enum schema
 */
export const DeliveryDriverSchema = z.enum([
  'GS',
  'S3',
  'AZURE',
  'DELIVERY_CONFIG',
  'S3_SERVICE_ACCOUNT',
  'GS_SERVICE_ACCOUNT',
  'AZURE_SERVICE_ACCOUNT',
  'NONE',
]);

/**
 * Order type enum schema
 */
export const OrderTypeSchema = z.enum(['ARCHIVE', 'TASKING']);

/**
 * Delivery status enum schema
 */
export const DeliveryStatusSchema = z.enum([
  'CREATED',
  'STARTED',
  'PAYMENT_FAILED',
  'PLATFORM_FAILED',
  'PROVIDER_PENDING',
  'PROVIDER_COMPLETE',
  'PROVIDER_FAILED',
  'PROCESSING_PENDING',
  'PROCESSING_COMPLETE',
  'PROCESSING_FAILED',
  'DELIVERY_PENDING',
  'DELIVERY_COMPLETED',
  'DELIVERY_FAILED',
  'INTERNAL_IMAGE_PROCESSING_PENDING',
]);

/**
 * Feasibility check status enum schema
 */
export const FeasibilityCheckStatusSchema = z.enum([
  'PENDING',
  'STARTED',
  'COMPLETE',
  'ERROR',
]);

/**
 * API provider enum schema
 */
export const ApiProviderSchema = z.enum([
  'SIWEI',
  'SATELLOGIC',
  'UMBRA',
  'TAILWIND',
  'GEOSAT',
  'SENTINEL2',
  'SENTINEL2_CREODIAS',
  'PLANET',
  'IMPRO',
  'URBAN_SKY',
  'NSL',
  'VEXCEL',
  'ICEYE_US',
]);

/**
 * SAR product type enum schema
 */
export const SarProductTypeSchema = z.enum(['GEC', 'SICD', 'SIDD', 'CPHD']);

/**
 * SAR polarisation enum schema
 */
export const SarPolarisationSchema = z.enum(['HH', 'VV']);

/**
 * Deliverable type enum schema
 */
export const DeliverableTypeSchema = z.enum(['image', 'payload', 'baba']);

/**
 * Notification event enum schema
 */
export const NotificationEventSchema = z.enum(['NEW_IMAGERY']);

// ============================================================================
// BASE TYPE SCHEMAS
// ============================================================================

/**
 * Cloud coverage schema
 */
export const CloudCoverageSchema = z.object({
  percentage: z.number().min(0).max(100).nullable()
    .optional(),
  source: z.string().nullable().optional(),
});

/**
 * Weather score schema
 */
export const WeatherScoreSchema = z.object({
  score: z.number().nullable().optional(),
  source: z.string().nullable().optional(),
});

/**
 * Weather details schema
 */
export const WeatherDetailsSchema = z.object({
  cloudCoverage: CloudCoverageSchema.nullable().optional(),
  weatherScore: WeatherScoreSchema.nullable().optional(),
});

/**
 * Feasibility score schema
 */
export const FeasibilityScoreSchema = z.object({
  score: z.number(),
  reasoning: z.string().nullable().optional(),
});

/**
 * Opportunity schema
 */
export const OpportunitySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  score: z.number().nullable().optional(),
  providerWindowId: z.string().uuid().nullable().optional(),
});

/**
 * Provider score schema
 */
export const ProviderScoreSchema = z.object({
  provider: ApiProviderSchema,
  score: z.number(),
  reasoning: z.string().nullable().optional(),
  opportunities: z.array(OpportunitySchema).nullable().optional(),
});

/**
 * Combined provider score schema
 */
export const ProviderCombinedScoreSchema = z.object({
  provider: ApiProviderSchema,
  overallScore: z.number(),
  feasibilityScore: z.number().nullable().optional(),
  weatherScore: z.number().nullable().optional(),
  opportunities: z.array(OpportunitySchema).nullable().optional(),
});

/**
 * Platform pass schema
 */
export const PlatformPassSchema = z.object({
  provider: ApiProviderSchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  maxElevation: z.number().nullable().optional(),
  minElevation: z.number().nullable().optional(),
  weatherDetails: WeatherDetailsSchema.nullable().optional(),
  providerWindowId: z.string().uuid().nullable().optional(),
});

/**
 * Archive schema
 */
export const ArchiveSchema = z.object({
  id: z.string(),
  aoiSqkm: z.number(),
  provider: ApiProviderSchema,
  productType: ProductTypeSchema,
  resolution: z.string(),
  cloudCoveragePercent: z.number().min(0).max(100).nullable()
    .optional(),
  offNadirAngle: z.number().min(0).max(90).nullable()
    .optional(),
  captureDate: z.string().datetime(),
  catalogId: z.string(),
  previewUrl: z.string().url().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

/**
 * Delivery event info schema
 */
export const DeliveryEventInfoSchema = z.object({
  eventType: z.string(),
  timestamp: z.string().datetime(),
  message: z.string().nullable().optional(),
  details: z.record(z.unknown()).nullable().optional(),
});

/**
 * Whoami user schema
 */
export const WhoamiUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  organization: z.string().nullable().optional(),
});

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Base archive search request schema
 */
export const GetArchivesRequestBaseSchema = z.object({
  aoi: z.string().min(1, 'AOI must be a valid WKT polygon'),
  fromDate: z.string().datetime().nullable().optional(),
  toDate: z.string().datetime().nullable().optional(),
  maxCloudCoveragePercent: z.number().min(0).max(100).nullable()
    .optional(),
  maxOffNadirAngle: z.number().min(0).max(50).nullable()
    .optional(),
  resolutions: z.array(ResolutionSchema).nullable().optional(),
  productTypes: z.array(ProductTypeSchema).nullable().optional(),
  providers: z.array(ApiProviderSchema).nullable().optional(),
  openData: z.boolean().nullable().optional(),
  minOverlapRatio: z.number().min(0).max(1).nullable()
    .optional(),
});

/**
 * Archive search request schema with pagination
 */
export const GetArchivesRequestSchema = GetArchivesRequestBaseSchema.extend({
  pageNumber: z.number().int().min(0).nullable()
    .optional(),
  pageSize: z.number().int().min(1).max(1000)
    .optional(),
});

/**
 * Archive order request schema
 */
export const ArchiveOrderRequestSchema = z.object({
  aoi: z.string().min(1, 'AOI must be a valid WKT polygon'),
  archiveId: z.string().min(1, 'Archive ID is required'),
  deliveryDriver: DeliveryDriverSchema.nullable().optional(),
  deliveryParams: z.record(z.unknown()).nullable().optional(),
  label: z.string().optional(),
  orderLabel: z.string().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  webhookUrl: z.string().url().max(2083).nullable()
    .optional(),
});

/**
 * Tasking order request schema
 */
export const TaskingOrderRequestSchema = z.object({
  aoi: z.string().min(1, 'AOI must be a valid WKT polygon'),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  productType: ProductTypeSchema,
  resolution: z.string().min(1),
  deliveryDriver: DeliveryDriverSchema.nullable().optional(),
  deliveryParams: z.record(z.unknown()).nullable().optional(),
  label: z.string().optional(),
  orderLabel: z.string().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  webhookUrl: z.string().url().max(2083).nullable()
    .optional(),
  priorityItem: z.boolean().nullable().optional(),
  maxCloudCoveragePercent: z.number().int().min(0).max(100)
    .nullable()
    .optional(),
  maxOffNadirAngle: z.number().int().min(0).max(45)
    .nullable()
    .optional(),
  requiredProvider: ApiProviderSchema.nullable().optional(),
  sarProductTypes: z.array(SarProductTypeSchema).nullable().optional(),
  sarPolarisation: SarPolarisationSchema.nullable().optional(),
  sarGrazingAngleMin: z.number().min(10).max(80).nullable()
    .optional(),
  sarGrazingAngleMax: z.number().min(10).max(80).nullable()
    .optional(),
  sarAzimuthAngleMin: z.number().min(0).max(360).nullable()
    .optional(),
  sarAzimuthAngleMax: z.number().min(0).max(360).nullable()
    .optional(),
  sarNumberOfLooks: z.number().int().nullable().optional(),
  providerWindowId: z.string().uuid().nullable().optional(),
});

/**
 * Feasibility check request schema
 */
export const PlatformApiFeasibilityTaskRequestSchema = z.object({
  aoi: z.string().min(1, 'AOI must be a valid WKT polygon'),
  productType: ProductTypeSchema,
  resolution: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  maxCloudCoveragePercent: z.number().nullable().optional(),
  priorityItem: z.boolean().nullable().optional(),
  requiredProvider: ApiProviderSchema.nullable().optional(),
  sarParameters: z
    .object({
      productTypes: z.array(SarProductTypeSchema).nullable().optional(),
      polarisation: SarPolarisationSchema.nullable().optional(),
      grazingAngleMin: z.number().min(10).max(80).nullable()
        .optional(),
      grazingAngleMax: z.number().min(10).max(80).nullable()
        .optional(),
      azimuthAngleMin: z.number().min(0).max(360).nullable()
        .optional(),
      azimuthAngleMax: z.number().min(0).max(360).nullable()
        .optional(),
      numberOfLooks: z.number().int().nullable().optional(),
    })
    .optional(),
});

/**
 * Pass prediction request schema
 */
export const PlatformApiPassPredictionRequestSchema = z.object({
  aoi: z.string().min(1, 'AOI must be a valid WKT polygon'),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
  productTypes: z.array(ProductTypeSchema).nullable().optional(),
  resolutions: z.array(ResolutionSchema).nullable().optional(),
  maxOffNadirAngle: z.number().nullable().optional(),
});

/**
 * Create notification request schema
 */
export const CreateNotificationRequestSchema = z.object({
  aoi: z.string().min(1, 'AOI must be a valid WKT polygon'),
  webhookUrl: z.string().url(),
  gsdMin: z.number().int().nullable().optional(),
  gsdMax: z.number().int().nullable().optional(),
  productType: ProductTypeSchema.nullable().optional(),
});

/**
 * List notifications request schema
 */
export const ListNotificationsRequestSchema = z.object({
  pageNumber: z.number().int().min(0).optional(),
  pageSize: z.number().int().min(1).max(1000)
    .optional(),
});

/**
 * List orders request schema
 */
export const ListOrdersRequestSchema = z.object({
  orderType: OrderTypeSchema.nullable().optional(),
  pageNumber: z.number().int().min(0).optional(),
  pageSize: z.number().int().min(1).max(1000)
    .optional(),
});

/**
 * Pricing request schema
 */
export const PricingRequestSchema = z.object({
  aoi: z.string().min(1).nullable().optional(),
});

/**
 * Order redelivery request schema
 */
export const OrderRedeliveryRequestSchema = z.object({
  deliveryDriver: DeliveryDriverSchema.nullable().optional(),
  deliveryParams: z.record(z.unknown()).nullable().optional(),
});

/**
 * Demo delivery request schema
 */
export const DemoDeliveryRequestSchema = z.object({
  orderId: z.string().min(1),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Archive search response schema
 */
export const GetArchivesResponseSchema = z.object({
  request: GetArchivesRequestBaseSchema,
  archives: z.array(ArchiveSchema),
  nextPage: z.string().nullable().optional(),
  total: z.number().int().nullable().optional(),
});

/**
 * Base order response schema
 */
export const BaseOrderResponseSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  itemId: z.string(),
  orderType: OrderTypeSchema,
  orderCost: z.number().int(),
  ownerId: z.string(),
  status: DeliveryStatusSchema,
  aoi: z.string(),
  aoiSqkm: z.number(),
  deliveryDriver: DeliveryDriverSchema.nullable().optional(),
  deliveryParams: z.record(z.unknown()).nullable().optional(),
  label: z.string().nullable().optional(),
  orderLabel: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  webhookUrl: z.string().url().nullable().optional(),
  tilesUrl: z.string().nullable().optional(),
  downloadImageUrl: z.string().nullable().optional(),
  downloadPayloadUrl: z.string().nullable().optional(),
  orderCode: z.string(),
  geocodeLocation: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  deliverableId: z.string().uuid().nullable().optional(),
});

/**
 * Archive order response schema
 */
export const ArchiveOrderResponseSchema = BaseOrderResponseSchema.extend({
  archiveId: z.string(),
  archive: ArchiveSchema,
});

/**
 * Tasking order response schema
 */
export const TaskingOrderResponseSchema = BaseOrderResponseSchema.extend({
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  productType: ProductTypeSchema,
  resolution: z.string(),
  priorityItem: z.boolean().nullable().optional(),
  maxCloudCoveragePercent: z.number().int().min(0).max(100)
    .nullable()
    .optional(),
  maxOffNadirAngle: z.number().int().min(0).max(45)
    .nullable()
    .optional(),
  requiredProvider: ApiProviderSchema.nullable().optional(),
  sarProductTypes: z.array(SarProductTypeSchema).nullable().optional(),
  sarPolarisation: SarPolarisationSchema.nullable().optional(),
  sarGrazingAngleMin: z.number().min(10).max(80).nullable()
    .optional(),
  sarGrazingAngleMax: z.number().min(10).max(80).nullable()
    .optional(),
  sarAzimuthAngleMin: z.number().min(0).max(360).nullable()
    .optional(),
  sarAzimuthAngleMax: z.number().min(0).max(360).nullable()
    .optional(),
  sarNumberOfLooks: z.number().int().nullable().optional(),
});

/**
 * Archive order info response schema
 */
export const ArchiveOrderInfoResponseSchema = BaseOrderResponseSchema.extend({
  archiveId: z.string(),
});

/**
 * Tasking order info response schema
 */
export const TaskingOrderInfoResponseSchema = BaseOrderResponseSchema.extend({
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  productType: ProductTypeSchema,
  resolution: z.string(),
});

/**
 * Order info with event schema
 */
export const OrderInfoWithEventSchema = z.object({
  order: z.union([ArchiveOrderInfoResponseSchema, TaskingOrderInfoResponseSchema]),
  event: DeliveryEventInfoSchema.nullable().optional(),
});

/**
 * List orders response schema
 */
export const ListOrdersResponseSchema = z.object({
  request: ListOrdersRequestSchema,
  total: z.number().int(),
  orders: z.array(OrderInfoWithEventSchema),
});

/**
 * Feasibility check response schema
 */
export const PlatformFeasibilityTaskResponseSchema = z.object({
  id: z.string().uuid(),
  validUntil: z.string().datetime(),
  overallScore: FeasibilityScoreSchema.nullable().optional(),
});

/**
 * Pass prediction response schema
 */
export const PlatformPassPredictionResponseSchema = z.object({
  passes: z.array(PlatformPassSchema),
});

/**
 * Notification response schema
 */
export const NotificationResponseSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  aoi: z.string(),
  gsdMin: z.number().int().nullable().optional(),
  gsdMax: z.number().int().nullable().optional(),
  productType: ProductTypeSchema.nullable().optional(),
  webhookUrl: z.string().url(),
  createdAt: z.string().datetime(),
});

/**
 * Notification with history response schema
 */
export const NotificationWithHistoryResponseSchema = NotificationResponseSchema.extend({
  lastTriggered: z.string().datetime().nullable().optional(),
  triggerCount: z.number().int().optional(),
});

/**
 * List notifications response schema
 */
export const ListNotificationsResponseSchema = z.object({
  request: ListNotificationsRequestSchema,
  total: z.number().int(),
  notifications: z.array(NotificationWithHistoryResponseSchema),
});

/**
 * Demo delivery response schema
 */
export const DemoDeliveryResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),
});

/**
 * Status response schema
 */
export const StatusResponseSchema = z.object({
  status: z.string(),
  version: z.string().nullable().optional(),
});

/**
 * Pong response schema
 */
export const PongResponseSchema = z.object({
  message: z.string(),
});

// ============================================================================
// ERROR SCHEMAS
// ============================================================================

/**
 * Validation error schema
 */
export const ValidationErrorSchema = z.object({
  loc: z.array(z.union([z.string(), z.number()])),
  msg: z.string(),
  type: z.string(),
});

/**
 * HTTP validation error schema (422)
 */
export const HTTPValidationErrorSchema = z.object({
  detail: z.array(ValidationErrorSchema),
});

/**
 * Bad request response schema (400)
 */
export const BadRequestResponseSchema = z.object({
  detail: z.string(),
});

// ============================================================================
// UNION SCHEMAS
// ============================================================================

/**
 * Order response schema (union)
 */
export const OrderResponseSchema = z.union([
  ArchiveOrderResponseSchema,
  TaskingOrderResponseSchema,
]);

/**
 * Order info schema (union)
 */
export const OrderInfoSchema = z.union([
  ArchiveOrderInfoResponseSchema,
  TaskingOrderInfoResponseSchema,
]);

/**
 * Error response schema (union)
 */
export const ErrorResponseSchema = z.union([
  HTTPValidationErrorSchema,
  BadRequestResponseSchema,
]);
