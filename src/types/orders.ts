/**
 * Order-related type definitions
 *
 * Type definitions for SkyFi order placement, derived from OpenAPI schema.
 *
 * @packageDocumentation
 */

/**
 * Delivery driver types supported by SkyFi
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
 * Product types for satellite imagery
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
 * Image resolution levels
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
 * Order type enum
 */
export enum OrderType {
  Archive = 'ARCHIVE',
  Tasking = 'TASKING',
}

/**
 * AWS S3 delivery parameters
 */
export interface S3DeliveryParams {
  s3_bucket_id: string;
  aws_region: string;
  aws_access_key: string;
  aws_secret_key: string;
}

/**
 * Google Cloud Storage delivery parameters
 */
export interface GCSDeliveryParams {
  gs_project_id: string;
  gs_bucket_id: string;
  gs_credentials: {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
  };
}

/**
 * Azure Blob Storage delivery parameters (Connection String method)
 */
export interface AzureConnectionStringParams {
  azure_container_id: string;
  azure_connection_string: string;
}

/**
 * Azure Blob Storage delivery parameters (Entra App method)
 */
export interface AzureEntraAppParams {
  azure_storage_account_name: string;
  azure_container_id: string;
  azure_tenant_id: string;
  azure_client_id: string;
  azure_client_secret: string;
}

/**
 * All possible delivery parameters
 */
export type DeliveryParams =
  | S3DeliveryParams
  | GCSDeliveryParams
  | AzureConnectionStringParams
  | AzureEntraAppParams
  | Record<string, unknown>;

/**
 * Base order request interface
 */
export interface BaseOrderRequest {
  aoi: string;
  deliveryDriver?: DeliveryDriver | null;
  deliveryParams?: DeliveryParams | null;
  label?: string;
  orderLabel?: string;
  metadata?: Record<string, unknown> | null;
  webhookUrl?: string | null;
}

/**
 * Archive order request parameters
 */
export interface ArchiveOrderRequest extends BaseOrderRequest {
  archiveId: string;
}

/**
 * Tasking order request parameters
 */
export interface TaskingOrderRequest extends BaseOrderRequest {
  windowStart: string;
  windowEnd: string;
  productType: ProductType;
  resolution: Resolution;
  priorityItem?: boolean | null;
  maxCloudCoveragePercent?: number | null;
  maxOffNadirAngle?: number | null;
  requiredProvider?: string | null;
  sarProductTypes?: string[] | null;
  sarPolarisation?: string | null;
  sarGrazingAngleMin?: number | null;
  sarGrazingAngleMax?: number | null;
  sarAzimuthAngleMin?: number | null;
  sarAzimuthAngleMax?: number | null;
  sarNumberOfLooks?: number | null;
  providerWindowId?: string | null;
}

/**
 * Base order response interface
 */
export interface BaseOrderResponse {
  id: string;
  orderType: OrderType;
  aoi: string;
  deliveryDriver?: DeliveryDriver | null;
  deliveryParams?: DeliveryParams | null;
  label?: string | null;
  orderLabel?: string | null;
  metadata?: Record<string, unknown> | null;
  webhookUrl?: string | null;
}

/**
 * Archive order response
 */
export interface ArchiveOrderResponse extends BaseOrderResponse {
  archiveId: string;
  orderType: OrderType.Archive;
}

/**
 * Tasking order response
 */
export interface TaskingOrderResponse extends BaseOrderResponse {
  windowStart: string;
  windowEnd: string;
  productType: ProductType;
  resolution: Resolution;
  priorityItem?: boolean;
  maxCloudCoveragePercent?: number;
  maxOffNadirAngle?: number;
  orderType: OrderType.Tasking;
}
