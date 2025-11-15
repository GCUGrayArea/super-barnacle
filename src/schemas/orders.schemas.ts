/**
 * Zod validation schemas for order placement
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { DeliveryDriver, ProductType, Resolution } from '../types/orders.js';

/**
 * WKT (Well-Known Text) polygon validation
 * Basic validation for POLYGON format
 */
const wktPolygonRegex = /^POLYGON\s*\(\([^)]+\)\)$/i;

/**
 * URL validation for webhooks
 */
const urlSchema = z.string().url().max(2083).min(1).nullable().optional();

/**
 * AOI validation schema
 * Validates WKT POLYGON format
 */
export const AOISchema = z.string().refine(
  (value) => wktPolygonRegex.test(value),
  {
    message: 'AOI must be a valid WKT POLYGON format: POLYGON((lon lat, lon lat, ...))',
  },
);

/**
 * S3 delivery parameters schema
 */
export const S3DeliveryParamsSchema = z.object({
  s3_bucket_id: z.string().min(1, 'S3 bucket ID is required'),
  aws_region: z.string().min(1, 'AWS region is required'),
  aws_access_key: z.string().min(1, 'AWS access key is required'),
  aws_secret_key: z.string().min(1, 'AWS secret key is required'),
});

/**
 * GCS credentials schema
 */
export const GCSCredentialsSchema = z.object({
  type: z.string(),
  project_id: z.string(),
  private_key_id: z.string(),
  private_key: z.string(),
  client_email: z.string().email(),
  client_id: z.string(),
  auth_uri: z.string().url(),
  token_uri: z.string().url(),
  auth_provider_x509_cert_url: z.string().url(),
  client_x509_cert_url: z.string().url(),
});

/**
 * GCS delivery parameters schema
 */
export const GCSDeliveryParamsSchema = z.object({
  gs_project_id: z.string().min(1, 'GCS project ID is required'),
  gs_bucket_id: z.string().min(1, 'GCS bucket ID is required'),
  gs_credentials: GCSCredentialsSchema,
});

/**
 * Azure Connection String delivery parameters schema
 */
export const AzureConnectionStringParamsSchema = z.object({
  azure_container_id: z.string().min(1, 'Azure container ID is required'),
  azure_connection_string: z.string().min(1, 'Azure connection string is required'),
});

/**
 * Azure Entra App delivery parameters schema
 */
export const AzureEntraAppParamsSchema = z.object({
  azure_storage_account_name: z.string().min(1, 'Azure storage account name is required'),
  azure_container_id: z.string().min(1, 'Azure container ID is required'),
  azure_tenant_id: z.string().min(1, 'Azure tenant ID is required'),
  azure_client_id: z.string().min(1, 'Azure client ID is required'),
  azure_client_secret: z.string().min(1, 'Azure client secret is required'),
});

/**
 * Delivery driver enum schema
 */
export const DeliveryDriverSchema = z.nativeEnum(DeliveryDriver);

/**
 * Product type enum schema
 */
export const ProductTypeSchema = z.nativeEnum(ProductType);

/**
 * Resolution enum schema
 */
export const ResolutionSchema = z.nativeEnum(Resolution);

/**
 * Base order request schema
 */
const BaseOrderRequestSchema = z.object({
  aoi: AOISchema,
  deliveryDriver: DeliveryDriverSchema.nullable().optional(),
  deliveryParams: z.record(z.unknown()).nullable().optional(),
  label: z.string().optional(),
  orderLabel: z.string().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  webhookUrl: urlSchema,
});

/**
 * Archive order request schema
 */
export const ArchiveOrderRequestSchema = BaseOrderRequestSchema.extend({
  archiveId: z.string().uuid('Archive ID must be a valid UUID'),
});

/**
 * Tasking order request schema
 */
export const TaskingOrderRequestSchema = BaseOrderRequestSchema.extend({
  windowStart: z.string().datetime('Window start must be ISO 8601 datetime'),
  windowEnd: z.string().datetime('Window end must be ISO 8601 datetime'),
  productType: ProductTypeSchema,
  resolution: ResolutionSchema,
  priorityItem: z.boolean().nullable().optional(),
  maxCloudCoveragePercent: z.number().int().min(0).max(100).nullable().optional(),
  maxOffNadirAngle: z.number().int().min(0).max(45).nullable().optional(),
  requiredProvider: z.string().nullable().optional(),
  sarProductTypes: z.array(z.string()).nullable().optional(),
  sarPolarisation: z.string().nullable().optional(),
  sarGrazingAngleMin: z.number().min(10).max(80).nullable().optional(),
  sarGrazingAngleMax: z.number().min(10).max(80).nullable().optional(),
  sarAzimuthAngleMin: z.number().min(0).max(360).nullable().optional(),
  sarAzimuthAngleMax: z.number().min(0).max(360).nullable().optional(),
  sarNumberOfLooks: z.number().int().nullable().optional(),
  providerWindowId: z.string().uuid().nullable().optional(),
}).refine(
  (data) => {
    const start = new Date(data.windowStart);
    const end = new Date(data.windowEnd);
    return start < end;
  },
  {
    message: 'Window start must be before window end',
    path: ['windowEnd'],
  },
);
