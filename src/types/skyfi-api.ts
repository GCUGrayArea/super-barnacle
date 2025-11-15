/**
 * SkyFi API Type Definitions
 *
 * Generated from SkyFi OpenAPI specification (docs/openapi.json)
 * These types provide full type safety for all SkyFi Platform API requests and responses.
 *
 * @see https://app.skyfi.com/platform-api
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Product types available for satellite imagery
 */
export enum ProductType {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
  VIDEO = 'VIDEO',
  MULTISPECTRAL = 'MULTISPECTRAL',
  HYPERSPECTRAL = 'HYPERSPECTRAL',
  SAR = 'SAR',
  STEREO = 'STEREO',
}

/**
 * Resolution categories for satellite imagery
 * Note: API supports both legacy format (with spaces) and modern format (with underscores)
 */
export enum Resolution {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY HIGH',
  SUPER_HIGH = 'SUPER HIGH',
  ULTRA_HIGH = 'ULTRA HIGH',
  CM_30 = 'CM 30',
  CM_50 = 'CM 50',
}

/**
 * Delivery driver types for imagery delivery
 */
export enum DeliveryDriver {
  GS = 'GS', // Google Cloud Storage
  S3 = 'S3', // AWS S3
  AZURE = 'AZURE', // Azure Blob Storage
  DELIVERY_CONFIG = 'DELIVERY_CONFIG',
  S3_SERVICE_ACCOUNT = 'S3_SERVICE_ACCOUNT',
  GS_SERVICE_ACCOUNT = 'GS_SERVICE_ACCOUNT',
  AZURE_SERVICE_ACCOUNT = 'AZURE_SERVICE_ACCOUNT',
  NONE = 'NONE',
}

/**
 * Order type enum
 */
export enum OrderType {
  ARCHIVE = 'ARCHIVE',
  TASKING = 'TASKING',
}

/**
 * Delivery status values
 */
export enum DeliveryStatus {
  CREATED = 'CREATED',
  STARTED = 'STARTED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PLATFORM_FAILED = 'PLATFORM_FAILED',
  PROVIDER_PENDING = 'PROVIDER_PENDING',
  PROVIDER_COMPLETE = 'PROVIDER_COMPLETE',
  PROVIDER_FAILED = 'PROVIDER_FAILED',
  PROCESSING_PENDING = 'PROCESSING_PENDING',
  PROCESSING_COMPLETE = 'PROCESSING_COMPLETE',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  DELIVERY_PENDING = 'DELIVERY_PENDING',
  DELIVERY_COMPLETED = 'DELIVERY_COMPLETED',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  INTERNAL_IMAGE_PROCESSING_PENDING = 'INTERNAL_IMAGE_PROCESSING_PENDING',
}

/**
 * Feasibility check status
 */
export enum FeasibilityCheckStatus {
  PENDING = 'PENDING',
  STARTED = 'STARTED',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

/**
 * API provider enum
 */
export enum ApiProvider {
  SIWEI = 'SIWEI',
  SATELLOGIC = 'SATELLOGIC',
  UMBRA = 'UMBRA',
  TAILWIND = 'TAILWIND',
  GEOSAT = 'GEOSAT',
  SENTINEL2 = 'SENTINEL2',
  SENTINEL2_CREODIAS = 'SENTINEL2_CREODIAS',
  PLANET = 'PLANET',
  IMPRO = 'IMPRO',
  URBAN_SKY = 'URBAN_SKY',
  NSL = 'NSL',
  VEXCEL = 'VEXCEL',
  ICEYE_US = 'ICEYE_US',
}

/**
 * SAR product types
 */
export enum SarProductType {
  GEC = 'GEC',
  SICD = 'SICD',
  SIDD = 'SIDD',
  CPHD = 'CPHD',
}

/**
 * SAR polarisation options
 */
export enum SarPolarisation {
  HH = 'HH',
  VV = 'VV',
}

/**
 * Deliverable type enum
 */
export enum DeliverableType {
  IMAGE = 'image',
  PAYLOAD = 'payload',
  BABA = 'baba',
}

/**
 * Notification event types
 */
export enum NotificationEvent {
  NEW_IMAGERY = 'NEW_IMAGERY',
}

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * Cloud coverage information
 */
export interface CloudCoverage {
  percentage?: number | null;
  source?: string | null;
}

/**
 * Weather details for a satellite pass
 */
export interface WeatherDetails {
  cloudCoverage?: CloudCoverage | null;
  weatherScore?: WeatherScore | null;
}

/**
 * Weather score information
 */
export interface WeatherScore {
  score?: number | null;
  source?: string | null;
}

/**
 * Feasibility score for a task
 */
export interface FeasibilityScore {
  score: number;
  reasoning?: string | null;
}

/**
 * Provider score information
 */
export interface ProviderScore {
  provider: ApiProvider;
  score: number;
  reasoning?: string | null;
  opportunities?: Opportunity[] | null;
}

/**
 * Combined provider score with weather
 */
export interface ProviderCombinedScore {
  provider: ApiProvider;
  overallScore: number;
  feasibilityScore?: number | null;
  weatherScore?: number | null;
  opportunities?: Opportunity[] | null;
}

/**
 * Satellite pass opportunity
 */
export interface Opportunity {
  startTime: string; // ISO 8601 datetime
  endTime: string; // ISO 8601 datetime
  score?: number | null;
  providerWindowId?: string | null; // UUID for Planet provider
}

/**
 * Satellite pass prediction
 */
export interface PlatformPass {
  provider: ApiProvider;
  startTime: string; // ISO 8601 datetime
  endTime: string; // ISO 8601 datetime
  maxElevation?: number | null;
  minElevation?: number | null;
  weatherDetails?: WeatherDetails | null;
  providerWindowId?: string | null; // UUID for Planet provider
}

/**
 * Archive imagery metadata
 */
export interface Archive {
  id: string;
  aoiSqkm: number;
  provider: ApiProvider;
  productType: ProductType;
  resolution: string;
  cloudCoveragePercent?: number | null;
  offNadirAngle?: number | null;
  captureDate: string; // ISO 8601 datetime
  catalogId: string;
  previewUrl?: string | null;
  thumbnailUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Delivery event information
 */
export interface DeliveryEventInfo {
  eventType: string;
  timestamp: string; // ISO 8601 datetime
  message?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * Whoami user information
 */
export interface WhoamiUser {
  id: string;
  email: string;
  name?: string | null;
  organization?: string | null;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Base archive search request parameters
 */
export interface GetArchivesRequestBase {
  aoi: string; // WKT polygon string
  fromDate?: string | null; // ISO 8601 datetime
  toDate?: string | null; // ISO 8601 datetime
  maxCloudCoveragePercent?: number | null; // 0-100
  maxOffNadirAngle?: number | null; // 0-50
  resolutions?: Resolution[] | null;
  productTypes?: ProductType[] | null;
  providers?: ApiProvider[] | null;
  openData?: boolean | null;
  minOverlapRatio?: number | null; // 0-1
}

/**
 * Archive search request with pagination
 */
export interface GetArchivesRequest extends GetArchivesRequestBase {
  pageNumber?: number | null;
  pageSize?: number;
}

/**
 * Archive order request
 */
export interface ArchiveOrderRequest {
  aoi: string; // WKT polygon string
  archiveId: string;
  deliveryDriver?: DeliveryDriver | null;
  deliveryParams?: Record<string, unknown> | null;
  label?: string;
  orderLabel?: string;
  metadata?: Record<string, unknown> | null;
  webhookUrl?: string | null; // URI format
}

/**
 * Tasking order request
 */
export interface TaskingOrderRequest {
  aoi: string; // WKT polygon string
  windowStart: string; // ISO 8601 datetime
  windowEnd: string; // ISO 8601 datetime
  productType: ProductType;
  resolution: string;
  deliveryDriver?: DeliveryDriver | null;
  deliveryParams?: Record<string, unknown> | null;
  label?: string;
  orderLabel?: string;
  metadata?: Record<string, unknown> | null;
  webhookUrl?: string | null; // URI format
  priorityItem?: boolean | null;
  maxCloudCoveragePercent?: number | null; // 0-100
  maxOffNadirAngle?: number | null; // 0-45
  requiredProvider?: ApiProvider | null;
  sarProductTypes?: SarProductType[] | null;
  sarPolarisation?: SarPolarisation | null;
  sarGrazingAngleMin?: number | null; // 10-80
  sarGrazingAngleMax?: number | null; // 10-80
  sarAzimuthAngleMin?: number | null; // 0-360
  sarAzimuthAngleMax?: number | null; // 0-360
  sarNumberOfLooks?: number | null;
  providerWindowId?: string | null; // UUID from pass prediction
}

/**
 * Feasibility check request
 */
export interface PlatformApiFeasibilityTaskRequest {
  aoi: string; // WKT polygon string
  productType: ProductType;
  resolution: string;
  startDate: string; // ISO 8601 datetime
  endDate: string; // ISO 8601 datetime
  maxCloudCoveragePercent?: number | null;
  priorityItem?: boolean | null;
  requiredProvider?: ApiProvider | null;
  sarParameters?: {
    productTypes?: SarProductType[] | null;
    polarisation?: SarPolarisation | null;
    grazingAngleMin?: number | null;
    grazingAngleMax?: number | null;
    azimuthAngleMin?: number | null;
    azimuthAngleMax?: number | null;
    numberOfLooks?: number | null;
  };
}

/**
 * Pass prediction request
 */
export interface PlatformApiPassPredictionRequest {
  aoi: string; // WKT polygon string
  fromDate: string; // ISO 8601 datetime
  toDate: string; // ISO 8601 datetime
  productTypes?: ProductType[] | null;
  resolutions?: Resolution[] | null;
  maxOffNadirAngle?: number | null;
}

/**
 * Create notification request
 */
export interface CreateNotificationRequest {
  aoi: string; // WKT polygon string
  webhookUrl: string; // URI format
  gsdMin?: number | null;
  gsdMax?: number | null;
  productType?: ProductType | null;
}

/**
 * List notifications request
 */
export interface ListNotificationsRequest {
  pageNumber?: number;
  pageSize?: number;
}

/**
 * List orders request
 */
export interface ListOrdersRequest {
  orderType?: OrderType | null;
  pageNumber?: number;
  pageSize?: number;
}

/**
 * Pricing request
 */
export interface PricingRequest {
  aoi?: string | null; // WKT polygon string
}

/**
 * Order redelivery request
 */
export interface OrderRedeliveryRequest {
  deliveryDriver?: DeliveryDriver | null;
  deliveryParams?: Record<string, unknown> | null;
}

/**
 * Demo delivery request
 */
export interface DemoDeliveryRequest {
  orderId: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Archive search response
 */
export interface GetArchivesResponse {
  request: GetArchivesRequestBase;
  archives: Archive[];
  nextPage?: string | null;
  total?: number | null;
}

/**
 * Base order response fields
 */
export interface BaseOrderResponse {
  id: string;
  orderId: string;
  itemId: string;
  orderType: OrderType;
  orderCost: number;
  ownerId: string;
  status: DeliveryStatus;
  aoi: string; // WKT polygon string
  aoiSqkm: number;
  deliveryDriver?: DeliveryDriver | null;
  deliveryParams?: Record<string, unknown> | null;
  label?: string | null;
  orderLabel?: string | null;
  metadata?: Record<string, unknown> | null;
  webhookUrl?: string | null;
  tilesUrl?: string | null;
  downloadImageUrl?: string | null;
  downloadPayloadUrl?: string | null;
  orderCode: string;
  geocodeLocation?: string | null;
  createdAt: string; // ISO 8601 datetime
  deliverableId?: string | null; // UUID
}

/**
 * Archive order response
 */
export interface ArchiveOrderResponse extends BaseOrderResponse {
  archiveId: string;
  archive: Archive;
}

/**
 * Tasking order response
 */
export interface TaskingOrderResponse extends BaseOrderResponse {
  windowStart: string; // ISO 8601 datetime
  windowEnd: string; // ISO 8601 datetime
  productType: ProductType;
  resolution: string;
  priorityItem?: boolean | null;
  maxCloudCoveragePercent?: number | null;
  maxOffNadirAngle?: number | null;
  requiredProvider?: ApiProvider | null;
  sarProductTypes?: SarProductType[] | null;
  sarPolarisation?: SarPolarisation | null;
  sarGrazingAngleMin?: number | null;
  sarGrazingAngleMax?: number | null;
  sarAzimuthAngleMin?: number | null;
  sarAzimuthAngleMax?: number | null;
  sarNumberOfLooks?: number | null;
}

/**
 * Archive order info response (for list orders)
 */
export interface ArchiveOrderInfoResponse extends BaseOrderResponse {
  archiveId: string;
}

/**
 * Tasking order info response (for list orders)
 */
export interface TaskingOrderInfoResponse extends BaseOrderResponse {
  windowStart: string;
  windowEnd: string;
  productType: ProductType;
  resolution: string;
}

/**
 * Order info with event
 */
export interface OrderInfoWithEvent {
  order: ArchiveOrderInfoResponse | TaskingOrderInfoResponse;
  event?: DeliveryEventInfo | null;
}

/**
 * List orders response
 */
export interface ListOrdersResponse {
  request: ListOrdersRequest;
  total: number;
  orders: OrderInfoWithEvent[];
}

/**
 * Feasibility check response
 */
export interface PlatformFeasibilityTaskResponse {
  id: string; // UUID
  validUntil: string; // ISO 8601 datetime
  overallScore?: FeasibilityScore | null;
}

/**
 * Pass prediction response
 */
export interface PlatformPassPredictionResponse {
  passes: PlatformPass[];
}

/**
 * Notification response
 */
export interface NotificationResponse {
  id: string; // UUID
  ownerId: string;
  aoi: string; // WKT polygon string
  gsdMin?: number | null;
  gsdMax?: number | null;
  productType?: ProductType | null;
  webhookUrl: string;
  createdAt: string; // ISO 8601 datetime
}

/**
 * Notification with history response
 */
export interface NotificationWithHistoryResponse extends NotificationResponse {
  lastTriggered?: string | null; // ISO 8601 datetime
  triggerCount?: number;
}

/**
 * List notifications response
 */
export interface ListNotificationsResponse {
  request: ListNotificationsRequest;
  total: number;
  notifications: NotificationWithHistoryResponse[];
}

/**
 * Demo delivery response
 */
export interface DemoDeliveryResponse {
  success: boolean;
  message?: string | null;
}

/**
 * Status response
 */
export interface StatusResponse {
  status: string;
  version?: string | null;
}

/**
 * Pong response (for health check)
 */
export interface PongResponse {
  message: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Validation error detail
 */
export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

/**
 * HTTP validation error response (422)
 */
export interface HTTPValidationError {
  detail: ValidationError[];
}

/**
 * Bad request response (400)
 */
export interface BadRequestResponse {
  detail: string;
}

// ============================================================================
// TYPE UNIONS
// ============================================================================

/**
 * Any order response type
 */
export type OrderResponse = ArchiveOrderResponse | TaskingOrderResponse;

/**
 * Any order info type
 */
export type OrderInfo = ArchiveOrderInfoResponse | TaskingOrderInfoResponse;

/**
 * Error response types
 */
export type ErrorResponse = HTTPValidationError | BadRequestResponse;
