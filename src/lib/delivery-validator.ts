/**
 * Delivery Configuration Validator
 *
 * Validates delivery driver configurations for S3, GCS, and Azure.
 * Order placement involves payment - validation must be extremely robust
 * to prevent costly mistakes from invalid delivery configurations.
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import {
  DeliveryDriver,
  DeliveryParams,
  S3DeliveryParams,
  GCSDeliveryParams,
  AzureConnectionStringParams,
  AzureEntraAppParams,
} from '../types/orders.js';
import {
  S3DeliveryParamsSchema,
  GCSDeliveryParamsSchema,
  AzureConnectionStringParamsSchema,
  AzureEntraAppParamsSchema,
} from '../schemas/orders.schemas.js';
import { DeliveryValidationError } from './errors.js';
import { logger } from './logger.js';

/**
 * Validate delivery configuration based on the delivery driver
 *
 * @param driver - Delivery driver type
 * @param params - Delivery parameters to validate
 * @throws {DeliveryValidationError} If validation fails
 */
export function validateDeliveryConfiguration(
  driver: DeliveryDriver | null | undefined,
  params: DeliveryParams | null | undefined,
): void {
  // If no delivery driver is specified, validation passes
  if (!driver || driver === DeliveryDriver.NONE) {
    logger.debug('No delivery driver specified, skipping validation');
    return;
  }

  // Delivery params are required for all drivers except NONE
  if (!params) {
    throw new DeliveryValidationError(
      `Delivery parameters are required for ${driver} delivery driver`,
      driver,
    );
  }

  logger.debug('Validating delivery configuration', { driver });

  try {
    switch (driver) {
      case DeliveryDriver.S3:
      case DeliveryDriver.S3_SERVICE_ACCOUNT:
        validateS3Configuration(params);
        break;

      case DeliveryDriver.GS:
      case DeliveryDriver.GS_SERVICE_ACCOUNT:
        validateGCSConfiguration(params);
        break;

      case DeliveryDriver.AZURE:
      case DeliveryDriver.AZURE_SERVICE_ACCOUNT:
        validateAzureConfiguration(params);
        break;

      case DeliveryDriver.DELIVERY_CONFIG:
        // DELIVERY_CONFIG uses pre-configured delivery settings
        // No additional validation needed
        logger.debug('Using pre-configured delivery settings');
        break;

      default:
        throw new DeliveryValidationError(
          `Unsupported delivery driver: ${driver}`,
          driver,
        );
    }

    logger.info('Delivery configuration validated successfully', { driver });
  } catch (error) {
    if (error instanceof DeliveryValidationError) {
      throw error;
    }

    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new DeliveryValidationError(
        firstError?.message ?? 'Delivery configuration validation failed',
        driver,
        firstError?.path.join('.'),
      );
    }

    throw new DeliveryValidationError(
      `Failed to validate ${driver} delivery configuration: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      driver,
    );
  }
}

/**
 * Validate S3 delivery configuration
 */
function validateS3Configuration(params: DeliveryParams): asserts params is S3DeliveryParams {
  S3DeliveryParamsSchema.parse(params);

  const s3Params = params as S3DeliveryParams;

  // Additional validation for AWS regions
  const validRegions = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'eu-central-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'ap-northeast-2',
    'sa-east-1',
  ];

  if (!validRegions.includes(s3Params.aws_region)) {
    logger.warn('Non-standard AWS region specified', { region: s3Params.aws_region });
  }

  // Validate AWS access key format (should start with AKIA or ASIA)
  if (
    !s3Params.aws_access_key.startsWith('AKIA') &&
    !s3Params.aws_access_key.startsWith('ASIA')
  ) {
    throw new DeliveryValidationError(
      'AWS access key should start with AKIA (long-term) or ASIA (temporary)',
      DeliveryDriver.S3,
      'aws_access_key',
    );
  }

  // Validate AWS secret key length (should be 40 characters)
  if (s3Params.aws_secret_key.length !== 40) {
    logger.warn('AWS secret key length is not standard (expected 40 characters)', {
      length: s3Params.aws_secret_key.length,
    });
  }

  logger.debug('S3 configuration validated', {
    bucket: s3Params.s3_bucket_id,
    region: s3Params.aws_region,
  });
}

/**
 * Validate GCS delivery configuration
 */
function validateGCSConfiguration(params: DeliveryParams): asserts params is GCSDeliveryParams {
  GCSDeliveryParamsSchema.parse(params);

  const gcsParams = params as GCSDeliveryParams;

  // Validate service account email format
  const serviceAccountEmailRegex = /^.+@.+\.iam\.gserviceaccount\.com$/;
  if (!serviceAccountEmailRegex.test(gcsParams.gs_credentials.client_email)) {
    throw new DeliveryValidationError(
      'GCS service account email must be in format: name@project.iam.gserviceaccount.com',
      DeliveryDriver.GS,
      'gs_credentials.client_email',
    );
  }

  // Validate project ID matches in credentials
  if (gcsParams.gs_project_id !== gcsParams.gs_credentials.project_id) {
    throw new DeliveryValidationError(
      'GCS project ID must match the project ID in credentials',
      DeliveryDriver.GS,
      'gs_project_id',
    );
  }

  // Validate private key format
  if (
    !gcsParams.gs_credentials.private_key.includes('BEGIN PRIVATE KEY') ||
    !gcsParams.gs_credentials.private_key.includes('END PRIVATE KEY')
  ) {
    throw new DeliveryValidationError(
      'GCS private key must be in PEM format with BEGIN/END markers',
      DeliveryDriver.GS,
      'gs_credentials.private_key',
    );
  }

  logger.debug('GCS configuration validated', {
    project: gcsParams.gs_project_id,
    bucket: gcsParams.gs_bucket_id,
  });
}

/**
 * Validate Azure delivery configuration
 *
 * Supports both Connection String and Entra App authentication methods
 */
function validateAzureConfiguration(
  params: DeliveryParams,
): asserts params is AzureConnectionStringParams | AzureEntraAppParams {
  // Try connection string method first
  const connectionStringResult = AzureConnectionStringParamsSchema.safeParse(params);
  if (connectionStringResult.success) {
    const azureParams = params as AzureConnectionStringParams;
    validateAzureConnectionString(azureParams.azure_connection_string);
    logger.debug('Azure Connection String configuration validated', {
      container: azureParams.azure_container_id,
    });
    return;
  }

  // Try Entra App method
  const entraAppResult = AzureEntraAppParamsSchema.safeParse(params);
  if (entraAppResult.success) {
    const azureParams = params as AzureEntraAppParams;
    validateAzureEntraApp(azureParams);
    logger.debug('Azure Entra App configuration validated', {
      storageAccount: azureParams.azure_storage_account_name,
      container: azureParams.azure_container_id,
    });
    return;
  }

  // Neither method succeeded
  throw new DeliveryValidationError(
    'Azure delivery parameters must include either connection string or Entra App credentials. ' +
      'Connection String requires: azure_container_id, azure_connection_string. ' +
      'Entra App requires: azure_storage_account_name, azure_container_id, azure_tenant_id, ' +
      'azure_client_id, azure_client_secret.',
    DeliveryDriver.AZURE,
  );
}

/**
 * Validate Azure connection string format
 */
function validateAzureConnectionString(connectionString: string): void {
  // Azure connection strings should contain AccountName and AccountKey
  const requiredParts = ['AccountName=', 'AccountKey='];
  const missingParts = requiredParts.filter((part) => !connectionString.includes(part));

  if (missingParts.length > 0) {
    throw new DeliveryValidationError(
      `Azure connection string is missing required components: ${missingParts.join(', ')}`,
      DeliveryDriver.AZURE,
      'azure_connection_string',
    );
  }
}

/**
 * Validate Azure Entra App configuration
 */
function validateAzureEntraApp(params: AzureEntraAppParams): void {
  // Validate storage account name format (3-24 lowercase alphanumeric characters)
  const storageAccountNameRegex = /^[a-z0-9]{3,24}$/;
  if (!storageAccountNameRegex.test(params.azure_storage_account_name)) {
    throw new DeliveryValidationError(
      'Azure storage account name must be 3-24 lowercase alphanumeric characters',
      DeliveryDriver.AZURE,
      'azure_storage_account_name',
    );
  }

  // Validate tenant ID format (UUID)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.azure_tenant_id)) {
    throw new DeliveryValidationError(
      'Azure tenant ID must be a valid UUID',
      DeliveryDriver.AZURE,
      'azure_tenant_id',
    );
  }

  // Validate client ID format (UUID)
  if (!uuidRegex.test(params.azure_client_id)) {
    throw new DeliveryValidationError(
      'Azure client ID must be a valid UUID',
      DeliveryDriver.AZURE,
      'azure_client_id',
    );
  }
}

/**
 * Validate webhook URL format
 */
export function validateWebhookUrl(webhookUrl: string | null | undefined): void {
  if (!webhookUrl) {
    return;
  }

  try {
    const url = new URL(webhookUrl);

    // Must be HTTPS for security
    if (url.protocol !== 'https:') {
      throw new DeliveryValidationError(
        'Webhook URL must use HTTPS protocol for security',
        'webhook',
        'webhookUrl',
      );
    }

    // URL length validation (max 2083 characters per RFC)
    if (webhookUrl.length > 2083) {
      throw new DeliveryValidationError(
        'Webhook URL exceeds maximum length of 2083 characters',
        'webhook',
        'webhookUrl',
      );
    }

    logger.debug('Webhook URL validated', { url: webhookUrl });
  } catch (error) {
    if (error instanceof DeliveryValidationError) {
      throw error;
    }

    throw new DeliveryValidationError(
      `Invalid webhook URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'webhook',
      'webhookUrl',
    );
  }
}
