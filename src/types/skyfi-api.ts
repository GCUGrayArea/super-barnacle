/**
 * SkyFi API type definitions
 *
 * Type definitions generated from the SkyFi OpenAPI specification
 *
 * @packageDocumentation
 */

import { OrderType, DeliveryStatus, DeliveryEventInfo } from './order-status';

/**
 * Product types available in SkyFi catalog
 */
export enum ProductType {
  Day = 'DAY',
  Night = 'NIGHT',
  Video = 'VIDEO',
  Multispectral = 'MULTISPECTRAL',
  Hyperspectral = 'HYPERSPECTRAL',
  SAR = 'SAR',
  Stereo = 'STEREO',
}

/**
 * Resolution categories for satellite imagery
 */
export enum Resolution {
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH',
  VeryHigh = 'VERY HIGH',
  SuperHigh = 'SUPER HIGH',
  UltraHigh = 'ULTRA HIGH',
  CM30 = 'CM 30',
  CM50 = 'CM 50',
}

/**
 * Satellite imagery providers supported by SkyFi
 */
export enum Provider {
  Siwei = 'SIWEI',
  Satellogic = 'SATELLOGIC',
  Umbra = 'UMBRA',
  Tailwind = 'TAILWIND',
  Geosat = 'GEOSAT',
  Sentinel2 = 'SENTINEL2',
  Sentinel2Creodias = 'SENTINEL2_CREODIAS',
  Planet = 'PLANET',
  Impro = 'IMPRO',
  UrbanSky = 'URBAN_SKY',
  NSL = 'NSL',
  Vexcel = 'VEXCEL',
  IceyeUS = 'ICEYE_US',
}

/**
 * Delivery driver types
 */
export enum DeliveryDriver {
  GS = 'GS',
  S3 = 'S3',
  AZURE = 'AZURE',
  DELIVERY_CONFIG = 'DELIVERY_CONFIG',
  S3_SERVICE_ACCOUNT = 'S3_SERVICE_ACCOUNT',
  GS_SERVICE_ACCOUNT = 'GS_SERVICE_ACCOUNT',
  AZURE_SERVICE_ACCOUNT = 'AZURE_SERVICE_ACCOUNT',
  NONE = 'NONE',
}

/**
 * Base order response fields shared by all order types
 */
export interface BaseOrderResponse {
  /** The order's item id */
  id: string;
  /** The order type */
  orderType: OrderType;
  /** The cost of the order in cents */
  orderCost: number;
  /** The owner of the order */
  ownerId: string;
  /** The delivery status of the order */
  status: DeliveryStatus;
  /** The ordered AOI */
  aoi: string;
  /** The area of the AOI in square kilometers */
  aoiSqkm: number;
  /** How to deliver the asset */
  deliveryDriver: DeliveryDriver | null;
  /** Driver delivery parameters */
  deliveryParams: Record<string, unknown> | null;
  /** Optional item label */
  label?: string | null;
  /** Optional order label */
  orderLabel?: string | null;
  /** Customer order metadata */
  metadata?: Record<string, unknown> | null;
  /** Webhook for order status updates */
  webhookUrl?: string | null;
  /** Optional tiles server url */
  tilesUrl?: string | null;
  /** The image download url */
  downloadImageUrl: string | null;
  /** The payload download url */
  downloadPayloadUrl: string | null;
  /** The order code */
  orderCode: string;
  /** Optional geocode location */
  geocodeLocation?: string | null;
  /** Order creation timestamp */
  createdAt: string;
  /** The order id */
  orderId: string;
  /** The item id */
  itemId: string;
  /** The deliverable id */
  deliverableId?: string | null;
}

/**
 * Archive-specific fields
 */
export interface ArchiveInfo {
  /** Archive ID */
  archiveId: string;
  /** Provider name */
  provider: string;
  /** Constellation name */
  constellation: string;
  /** Product type */
  productType: string;
  /** Platform resolution in meters */
  platformResolution: number;
  /** Resolution category */
  resolution: string;
  /** Capture timestamp */
  captureTimestamp: string;
  /** Cloud coverage percentage */
  cloudCoveragePercent: number;
  /** Off nadir angle */
  offNadirAngle: number;
  /** Footprint WKT */
  footprint: string;
}

/**
 * Archive order response
 */
export interface ArchiveOrderResponse extends BaseOrderResponse {
  orderType: OrderType.ARCHIVE;
  /** The archive id to order from */
  archiveId: string;
  /** Archive meta information */
  archive?: ArchiveInfo;
}

/**
 * Archive order with events (full details response)
 */
export interface ArchiveOrderInfoResponse extends ArchiveOrderResponse {
  /** Event history */
  events: DeliveryEventInfo[];
}

/**
 * Tasking order response
 */
export interface TaskingOrderResponse extends BaseOrderResponse {
  orderType: OrderType.TASKING;
  /** Tasking window start in ISO format */
  windowStart: string;
  /** Tasking window end in ISO format */
  windowEnd: string;
  /** Requested product type */
  productType: string;
  /** Image resolution */
  resolution: string;
  /** Priority Tasking Order */
  priorityItem?: boolean | null;
  /** Maximum cloud cover */
  maxCloudCoveragePercent?: number | null;
  /** Maximum off nadir angle */
  maxOffNadirAngle?: number | null;
  /** Required provider */
  requiredProvider?: string | null;
  /** SAR product types */
  sarProductTypes?: string[] | null;
  /** SAR polarisation */
  sarPolarisation?: string | null;
  /** SAR grazing angle min */
  sarGrazingAngleMin?: number | null;
  /** SAR grazing angle max */
  sarGrazingAngleMax?: number | null;
  /** SAR azimuth angle min */
  sarAzimuthAngleMin?: number | null;
  /** SAR azimuth angle max */
  sarAzimuthAngleMax?: number | null;
  /** SAR number of looks */
  sarNumberOfLooks?: number | null;
}

/**
 * Tasking order with events (full details response)
 */
export interface TaskingOrderInfoResponse extends TaskingOrderResponse {
  /** Event history */
  events: DeliveryEventInfo[];
}

/**
 * List orders request parameters
 */
export interface ListOrdersRequest {
  /** Filter by order type */
  orderType?: OrderType | null;
  /** Page number (0-indexed) */
  pageNumber?: number;
  /** Page size (1-25) */
  pageSize?: number;
}

/**
 * List orders response
 */
export interface ListOrdersResponse {
  /** The request that got processed */
  request: ListOrdersRequest;
  /** The total orders for this request */
  total: number;
  /** The orders for this owner */
  orders: Array<ArchiveOrderResponse | TaskingOrderResponse>;
}

/**
 * Order redelivery request
 */
export interface OrderRedeliveryRequest {
  /** How to deliver the asset */
  deliveryDriver: DeliveryDriver;
  /** Driver delivery parameters */
  deliveryParams: Record<string, unknown>;
}

/**
 * Union type for order info responses
 */
export type OrderInfoResponse = ArchiveOrderInfoResponse | TaskingOrderInfoResponse;

/**
 * Base API error response
 */
export interface BadRequestResponse {
  message: string;
  errorCode?: string;
  details?: unknown;
}

/**
 * HTTP validation error details
 */
export interface ValidationErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

/**
 * HTTP validation error response
 */
export interface HTTPValidationError {
  detail: ValidationErrorDetail[];
}
