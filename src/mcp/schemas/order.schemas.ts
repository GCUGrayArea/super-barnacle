/**
 * MCP Tool Input Schemas for Order Placement
 *
 * This module defines the JSON Schema specifications for MCP tool inputs
 * related to placing satellite imagery orders. These schemas are used by
 * MCP clients to validate and provide UI hints for tool parameters.
 *
 * @packageDocumentation
 */

/**
 * S3 delivery parameters schema for MCP tools
 */
export const S3DeliveryParamsSchema = {
  type: 'object',
  required: ['s3_bucket_id', 'aws_region', 'aws_access_key', 'aws_secret_key'],
  properties: {
    s3_bucket_id: {
      type: 'string',
      description: 'AWS S3 bucket name',
      minLength: 1,
    },
    aws_region: {
      type: 'string',
      description: 'AWS region (e.g., us-east-1, eu-west-1)',
      minLength: 1,
    },
    aws_access_key: {
      type: 'string',
      description: 'AWS access key ID (starts with AKIA or ASIA)',
      minLength: 1,
    },
    aws_secret_key: {
      type: 'string',
      description: 'AWS secret access key (40 characters)',
      minLength: 1,
    },
  },
  additionalProperties: false,
} as const;

/**
 * GCS credentials schema for MCP tools
 */
export const GCSCredentialsSchema = {
  type: 'object',
  required: [
    'type',
    'project_id',
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
    'auth_uri',
    'token_uri',
    'auth_provider_x509_cert_url',
    'client_x509_cert_url',
  ],
  properties: {
    type: {
      type: 'string',
      description: 'Service account type (should be "service_account")',
    },
    project_id: {
      type: 'string',
      description: 'GCP project ID',
    },
    private_key_id: {
      type: 'string',
      description: 'Private key ID from service account',
    },
    private_key: {
      type: 'string',
      description: 'Private key in PEM format',
    },
    client_email: {
      type: 'string',
      description: 'Service account email',
      format: 'email',
    },
    client_id: {
      type: 'string',
      description: 'Client ID',
    },
    auth_uri: {
      type: 'string',
      description: 'OAuth2 auth URI',
      format: 'uri',
    },
    token_uri: {
      type: 'string',
      description: 'OAuth2 token URI',
      format: 'uri',
    },
    auth_provider_x509_cert_url: {
      type: 'string',
      description: 'Auth provider certificate URL',
      format: 'uri',
    },
    client_x509_cert_url: {
      type: 'string',
      description: 'Client certificate URL',
      format: 'uri',
    },
  },
  additionalProperties: false,
} as const;

/**
 * GCS delivery parameters schema for MCP tools
 */
export const GCSDeliveryParamsSchema = {
  type: 'object',
  required: ['gs_project_id', 'gs_bucket_id', 'gs_credentials'],
  properties: {
    gs_project_id: {
      type: 'string',
      description: 'Google Cloud project ID',
      minLength: 1,
    },
    gs_bucket_id: {
      type: 'string',
      description: 'Google Cloud Storage bucket name',
      minLength: 1,
    },
    gs_credentials: GCSCredentialsSchema,
  },
  additionalProperties: false,
} as const;

/**
 * Azure Connection String delivery parameters schema for MCP tools
 */
export const AzureConnectionStringParamsSchema = {
  type: 'object',
  required: ['azure_container_id', 'azure_connection_string'],
  properties: {
    azure_container_id: {
      type: 'string',
      description: 'Azure Blob Storage container name',
      minLength: 1,
    },
    azure_connection_string: {
      type: 'string',
      description:
        'Azure connection string (contains AccountName and AccountKey)',
      minLength: 1,
    },
  },
  additionalProperties: false,
} as const;

/**
 * Azure Entra App delivery parameters schema for MCP tools
 */
export const AzureEntraAppParamsSchema = {
  type: 'object',
  required: [
    'azure_storage_account_name',
    'azure_container_id',
    'azure_tenant_id',
    'azure_client_id',
    'azure_client_secret',
  ],
  properties: {
    azure_storage_account_name: {
      type: 'string',
      description:
        'Azure storage account name (3-24 lowercase alphanumeric characters)',
      minLength: 3,
      maxLength: 24,
      pattern: '^[a-z0-9]+$',
    },
    azure_container_id: {
      type: 'string',
      description: 'Azure Blob Storage container name',
      minLength: 1,
    },
    azure_tenant_id: {
      type: 'string',
      description: 'Azure tenant ID (UUID)',
      format: 'uuid',
    },
    azure_client_id: {
      type: 'string',
      description: 'Azure client ID (UUID)',
      format: 'uuid',
    },
    azure_client_secret: {
      type: 'string',
      description: 'Azure client secret',
      minLength: 1,
    },
  },
  additionalProperties: false,
} as const;

/**
 * Generic delivery parameters schema
 * Allows any of the supported delivery configurations
 */
export const DeliveryParamsSchema = {
  type: 'object',
  description: 'Delivery configuration based on selected driver',
  additionalProperties: true,
} as const;

/**
 * Archive order input schema for MCP tools
 */
export const ArchiveOrderInputSchema = {
  type: 'object',
  required: ['archiveId', 'aoi', 'deliveryDriver'],
  properties: {
    archiveId: {
      type: 'string',
      description: 'Archive ID (UUID) from SkyFi catalog search',
      format: 'uuid',
    },
    aoi: {
      type: 'string',
      description:
        'Area of Interest in WKT POLYGON format: POLYGON((lon lat, lon lat, ...))',
    },
    deliveryDriver: {
      type: 'string',
      description: 'Cloud storage delivery driver',
      enum: [
        'S3',
        'GS',
        'AZURE',
        'S3_SERVICE_ACCOUNT',
        'GS_SERVICE_ACCOUNT',
        'AZURE_SERVICE_ACCOUNT',
        'DELIVERY_CONFIG',
        'NONE',
      ],
    },
    deliveryParams: DeliveryParamsSchema,
    label: {
      type: 'string',
      description: 'Optional label for the order',
    },
    orderLabel: {
      type: 'string',
      description: 'Optional order-specific label',
    },
    metadata: {
      type: 'object',
      description: 'Optional metadata key-value pairs',
      additionalProperties: true,
    },
    webhookUrl: {
      type: 'string',
      description:
        'Optional webhook URL for order status notifications (must be HTTPS)',
      format: 'uri',
    },
  },
  additionalProperties: false,
} as const;

/**
 * Tasking order input schema for MCP tools
 */
export const TaskingOrderInputSchema = {
  type: 'object',
  required: [
    'aoi',
    'deliveryDriver',
    'windowStart',
    'windowEnd',
    'productType',
    'resolution',
  ],
  properties: {
    aoi: {
      type: 'string',
      description:
        'Area of Interest in WKT POLYGON format: POLYGON((lon lat, lon lat, ...))',
    },
    deliveryDriver: {
      type: 'string',
      description: 'Cloud storage delivery driver',
      enum: [
        'S3',
        'GS',
        'AZURE',
        'S3_SERVICE_ACCOUNT',
        'GS_SERVICE_ACCOUNT',
        'AZURE_SERVICE_ACCOUNT',
        'DELIVERY_CONFIG',
        'NONE',
      ],
    },
    deliveryParams: DeliveryParamsSchema,
    windowStart: {
      type: 'string',
      description:
        'Tasking window start time in ISO 8601 format (e.g., 2024-01-15T10:00:00Z)',
      format: 'date-time',
    },
    windowEnd: {
      type: 'string',
      description:
        'Tasking window end time in ISO 8601 format (e.g., 2024-01-20T10:00:00Z)',
      format: 'date-time',
    },
    productType: {
      type: 'string',
      description: 'Type of satellite imagery product',
      enum: [
        'DAY',
        'NIGHT',
        'VIDEO',
        'MULTISPECTRAL',
        'HYPERSPECTRAL',
        'SAR',
        'STEREO',
      ],
    },
    resolution: {
      type: 'string',
      description: 'Image resolution level',
      enum: [
        'LOW',
        'MEDIUM',
        'HIGH',
        'VERY HIGH',
        'SUPER HIGH',
        'ULTRA HIGH',
        'CM 30',
        'CM 50',
      ],
    },
    priorityItem: {
      type: 'boolean',
      description: 'Mark as priority order (may affect pricing)',
    },
    maxCloudCoveragePercent: {
      type: 'integer',
      description: 'Maximum acceptable cloud coverage percentage (0-100)',
      minimum: 0,
      maximum: 100,
    },
    maxOffNadirAngle: {
      type: 'integer',
      description: 'Maximum off-nadir angle in degrees (0-45)',
      minimum: 0,
      maximum: 45,
    },
    requiredProvider: {
      type: 'string',
      description: 'Specific satellite provider requirement',
    },
    sarProductTypes: {
      type: 'array',
      description: 'SAR product types (required for SAR productType)',
      items: {
        type: 'string',
      },
    },
    sarPolarisation: {
      type: 'string',
      description: 'SAR polarisation (required for SAR productType)',
    },
    sarGrazingAngleMin: {
      type: 'number',
      description: 'Minimum SAR grazing angle (10-80)',
      minimum: 10,
      maximum: 80,
    },
    sarGrazingAngleMax: {
      type: 'number',
      description: 'Maximum SAR grazing angle (10-80)',
      minimum: 10,
      maximum: 80,
    },
    sarAzimuthAngleMin: {
      type: 'number',
      description: 'Minimum SAR azimuth angle (0-360)',
      minimum: 0,
      maximum: 360,
    },
    sarAzimuthAngleMax: {
      type: 'number',
      description: 'Maximum SAR azimuth angle (0-360)',
      minimum: 0,
      maximum: 360,
    },
    sarNumberOfLooks: {
      type: 'integer',
      description: 'SAR number of looks',
    },
    providerWindowId: {
      type: 'string',
      description: 'Provider-specific window ID (UUID) from pass prediction',
      format: 'uuid',
    },
    label: {
      type: 'string',
      description: 'Optional label for the order',
    },
    orderLabel: {
      type: 'string',
      description: 'Optional order-specific label',
    },
    metadata: {
      type: 'object',
      description: 'Optional metadata key-value pairs',
      additionalProperties: true,
    },
    webhookUrl: {
      type: 'string',
      description:
        'Optional webhook URL for order status notifications (must be HTTPS)',
      format: 'uri',
    },
  },
  additionalProperties: false,
} as const;
