/**
 * Comprehensive Mock API Responses for SkyFi Integration Tests
 *
 * This file contains high-fidelity mock responses based on actual SkyFi API responses
 * for use in integration tests. These fixtures ensure consistent testing across all
 * integration test suites.
 *
 * @see docs/openapi.json for API specification
 */

import type { Archive, ArchiveSearchResponse } from '../../src/types/archives';
import type {
  PassPredictionResponse,
  FeasibilityCheckResponse,
  PassOpportunity,
} from '../../src/types/feasibility';
import type { Order, OrdersListResponse } from '../../src/types/order-status';
import type {
  Notification,
  NotificationsListResponse,
} from '../../src/types/notifications';
import { ProductType as NotifProductType, Resolution as NotifResolution, Provider as NotifProvider } from '../../src/types/notifications';
import {
  ProductType,
  Resolution,
  Provider,
  DeliveryDriver,
} from '../../src/types/skyfi-api';
import { OrderType, DeliveryStatus } from '../../src/types/order-status';

// =============================================================================
// Common Test Data
// =============================================================================

export const validWKTPolygon =
  'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))';

export const validWKTPolygonLarge =
  'POLYGON((-97.74 30.27, -97.74 30.30, -97.70 30.30, -97.70 30.27, -97.74 30.27))';

export const invalidWKTPolygon = 'NOT A VALID WKT POLYGON';

export const tooLargeWKTPolygon = 'POLYGON((-180 -85, 180 -85, 180 85, -180 85, -180 -85))';

// =============================================================================
// Archive Search Fixtures
// =============================================================================

export const mockArchive: Archive = {
  archiveId: '354b783d-8fad-4050-a167-2eb069653777',
  provider: Provider.Satellogic,
  constellation: 'NEWSAT',
  productType: ProductType.Day,
  platformResolution: 70,
  resolution: Resolution.VeryHigh,
  captureTimestamp: '2025-01-15T14:30:00+00:00',
  cloudCoveragePercent: 5.2,
  offNadirAngle: 12.5,
  footprint: validWKTPolygon,
  minSqKm: 25,
  maxSqKm: 144,
  priceForOneSquareKm: 2.5,
  priceForOneSquareKmCents: 250,
  priceFullScene: 360,
  openData: false,
  totalAreaSquareKm: 144,
  deliveryTimeHours: 12,
  thumbnailUrls: {
    '200x200': 'https://example.com/thumb-200.png',
    '400x400': 'https://example.com/thumb-400.png',
  },
  gsd: 0.7,
  tilesUrl: 'https://tiles.example.com/{z}/{x}/{y}',
};

export const mockOpenDataArchive: Archive = {
  ...mockArchive,
  archiveId: 'db4794dd-da6a-45b4-ac6e-b9e50e36bb29',
  provider: Provider.Sentinel2,
  constellation: 'SENTINEL2',
  productType: ProductType.Multispectral,
  resolution: Resolution.Low,
  platformResolution: 10,
  priceForOneSquareKm: 0,
  priceForOneSquareKmCents: 0,
  priceFullScene: 0,
  openData: true,
  gsd: 10,
};

export const mockArchiveSearchResponse: ArchiveSearchResponse = {
  request: {
    aoi: validWKTPolygon,
    fromDate: '2025-01-01T00:00:00Z',
    toDate: '2025-01-31T23:59:59Z',
    maxCloudCoveragePercent: 20,
    productTypes: [ProductType.Day],
    resolutions: [Resolution.VeryHigh],
  },
  archives: [mockArchive],
  nextPage: 'https://app.skyfi.com/platform-api/archives?page=abc123',
  total: 42,
};

export const mockEmptyArchiveSearchResponse: ArchiveSearchResponse = {
  request: {},
  archives: [],
  total: 0,
};

// =============================================================================
// Feasibility Check Fixtures
// =============================================================================

export const mockPassOpportunity: PassOpportunity = {
  provider: Provider.Planet,
  satname: 'SKYSAT-15',
  satid: 'SKYSAT-15',
  noradid: '44931',
  node: 'DESCENDING',
  productType: ProductType.Day,
  resolution: Resolution.High,
  lat: 30.29,
  lon: -97.71,
  passDate: '2025-01-16T14:30:00Z',
  meanT: 298,
  offNadirAngle: 15.5,
  solarElevationAngle: 45.2,
  minSquareKms: 10,
  maxSquareKms: 100,
  priceForOneSquareKm: 15.5,
  priceForOneSquareKmCents: 1550,
  gsdDegMin: 0.5,
  gsdDegMax: 1.0,
};

export const mockSARPassOpportunity: PassOpportunity = {
  provider: Provider.Umbra,
  satname: 'UMBRA-SAR-01',
  satid: 'UMBRA-SAR-01',
  noradid: '48915',
  node: 'ASCENDING',
  productType: ProductType.SAR,
  resolution: Resolution.VeryHigh,
  lat: 30.28,
  lon: -97.72,
  passDate: '2025-01-17T02:15:00Z',
  meanT: 285,
  offNadirAngle: 25.0,
  solarElevationAngle: 0.0,
  minSquareKms: 5,
  maxSquareKms: 50,
  priceForOneSquareKm: 25.0,
  priceForOneSquareKmCents: 2500,
  gsdDegMin: 0.25,
  gsdDegMax: 0.5,
};

export const mockPassPredictionResponse: PassPredictionResponse = {
  passes: [mockPassOpportunity, mockSARPassOpportunity],
};

export const mockFeasibilityCheckResponse: FeasibilityCheckResponse = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  validUntil: '2025-01-23T00:00:00Z',
  overallScore: {
    feasibility: 0.85,
    weatherScore: {
      weatherScore: 0.9,
      weatherDetails: {
        weatherScore: 0.9,
        clouds: [
          {
            date: '2025-01-16T00:00:00Z',
            coverage: 15,
          },
          {
            date: '2025-01-17T00:00:00Z',
            coverage: 10,
          },
        ],
      },
    },
    providerScore: {
      score: 0.8,
      providerScores: [
        {
          provider: Provider.Planet,
          score: 0.8,
          status: 'COMPLETE',
          reference: 'ref-123',
          opportunities: [
            {
              windowStart: '2025-01-16T14:00:00Z',
              windowEnd: '2025-01-16T15:00:00Z',
              satelliteId: 'SKYSAT-15',
              providerWindowId: '987e6543-e21b-43d1-b789-123456789abc',
              providerMetadata: {
                satellite_family: 'SkySat',
              },
            },
            {
              windowStart: '2025-01-18T09:30:00Z',
              windowEnd: '2025-01-18T10:30:00Z',
              satelliteId: 'SKYSAT-18',
              providerWindowId: '456e7890-f1ab-34c5-d678-901234567890',
            },
          ],
        },
      ],
    },
  },
};

export const mockPendingFeasibilityCheckResponse: FeasibilityCheckResponse = {
  id: 'abc12345-e89b-12d3-a456-426614174000',
  validUntil: '2025-01-23T00:00:00Z',
  overallScore: null,
};

// =============================================================================
// Order Fixtures
// =============================================================================

export const mockArchiveOrder: Order = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  orderType: OrderType.ARCHIVE,
  orderCost: 5000,
  ownerId: '123e4567-e89b-12d3-a456-426614174000',
  status: DeliveryStatus.DELIVERY_COMPLETED,
  aoi: validWKTPolygonLarge,
  aoiSqkm: 16.5,
  deliveryDriver: DeliveryDriver.S3,
  deliveryParams: {
    s3_bucket_id: 'my-imagery-bucket',
    aws_region: 'us-east-1',
  },
  downloadImageUrl: 'https://skyfi.com/downloads/image-123.tif',
  downloadPayloadUrl: 'https://skyfi.com/downloads/payload-123.zip',
  orderCode: 'ORD-2025-001',
  geocodeLocation: 'Austin, TX',
  createdAt: '2025-01-15T10:30:00Z',
  orderId: '550e8400-e29b-41d4-a716-446655440000',
  itemId: '550e8400-e29b-41d4-a716-446655440001',
  archiveId: 'db4794dd-da6a-45b4-ac6e-b9e50e36bb29',
  events: [
    {
      status: DeliveryStatus.CREATED,
      timestamp: '2025-01-15T10:30:00Z',
      message: 'Order created successfully',
    },
    {
      status: DeliveryStatus.STARTED,
      timestamp: '2025-01-15T10:31:00Z',
      message: 'Processing started',
    },
    {
      status: DeliveryStatus.PROVIDER_COMPLETE,
      timestamp: '2025-01-15T12:00:00Z',
      message: 'Provider completed capture',
    },
    {
      status: DeliveryStatus.DELIVERY_COMPLETED,
      timestamp: '2025-01-15T14:30:00Z',
      message: 'Delivery completed successfully',
    },
  ],
};

export const mockTaskingOrder: Order = {
  id: '660f9511-f3ac-52e5-b827-557766551111',
  orderType: OrderType.TASKING,
  orderCost: 15000,
  ownerId: '123e4567-e89b-12d3-a456-426614174000',
  status: DeliveryStatus.PROVIDER_PENDING,
  aoi: 'POLYGON((-122.42 37.77, -122.42 37.75, -122.40 37.75, -122.40 37.77, -122.42 37.77))',
  aoiSqkm: 2.5,
  deliveryDriver: DeliveryDriver.GS,
  deliveryParams: {
    gs_project_id: 'my-gcp-project',
    gs_bucket_id: 'skyfi-imagery',
  },
  downloadImageUrl: null,
  downloadPayloadUrl: null,
  orderCode: 'ORD-2025-002',
  createdAt: '2025-01-16T14:20:00Z',
  orderId: '660f9511-f3ac-52e5-b827-557766551111',
  itemId: '660f9511-f3ac-52e5-b827-557766551112',
  windowStart: '2025-01-20T00:00:00Z',
  windowEnd: '2025-01-25T23:59:59Z',
  productType: 'DAY',
  resolution: 'VERY HIGH',
  priorityItem: false,
  maxCloudCoveragePercent: 20,
  maxOffNadirAngle: 30,
  events: [
    {
      status: DeliveryStatus.CREATED,
      timestamp: '2025-01-16T14:20:00Z',
      message: 'Tasking order created',
    },
    {
      status: DeliveryStatus.PROVIDER_PENDING,
      timestamp: '2025-01-16T14:21:00Z',
      message: 'Sent to provider for tasking',
    },
  ],
};

export const mockOrdersListResponse: OrdersListResponse = {
  request: {
    orderType: null,
    pageNumber: 0,
    pageSize: 10,
  },
  total: 2,
  orders: [mockArchiveOrder, mockTaskingOrder],
};

// =============================================================================
// Notification Fixtures
// =============================================================================

export const mockNotification: Notification = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: '123e4567-e89b-12d3-a456-426614174000',
  aoi: validWKTPolygonLarge,
  webhookUrl: 'https://my-app.example.com/webhooks/skyfi',
  filters: {
    productTypes: [NotifProductType.Day, NotifProductType.Multispectral],
    resolutions: [NotifResolution.High, NotifResolution.VeryHigh],
    maxCloudCoveragePercent: 15,
    maxOffNadirAngle: 25,
    providers: [NotifProvider.Planet, NotifProvider.Maxar],
    openData: false,
  },
  name: 'Austin Downtown High-Res Monitoring',
  isActive: true,
  createdAt: '2025-01-15T10:30:00Z',
  updatedAt: '2025-01-15T10:30:00Z',
  triggerCount: 5,
};

export const mockNotificationsListResponse: NotificationsListResponse = {
  notifications: [mockNotification],
  total: 1,
};

// =============================================================================
// Error Response Fixtures
// =============================================================================

export const mockValidationError = {
  detail: [
    {
      loc: ['body', 'aoi'],
      msg: 'Invalid WKT polygon format',
      type: 'value_error',
    },
  ],
};

export const mockAuthenticationError = {
  detail: 'Invalid API key',
  errorCode: 'AUTHENTICATION_FAILED',
};

export const mockNotFoundError = {
  detail: 'Resource not found',
  errorCode: 'NOT_FOUND',
};

export const mockRateLimitError = {
  detail: 'Rate limit exceeded. Please try again later.',
  errorCode: 'RATE_LIMIT_EXCEEDED',
};

export const mockServerError = {
  detail: 'Internal server error',
  errorCode: 'INTERNAL_SERVER_ERROR',
};

// =============================================================================
// S3 Delivery Parameters
// =============================================================================

export const mockS3DeliveryParams = {
  s3_bucket_id: 'my-imagery-bucket',
  aws_region: 'us-east-1',
  aws_access_key: 'AKIAIOSFODNN7EXAMPLE',
  aws_secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  subfolder: 'skyfi-orders/2025',
};

// =============================================================================
// GCS Delivery Parameters
// =============================================================================

export const mockGCSDeliveryParams = {
  gs_project_id: 'my-gcp-project',
  gs_bucket_id: 'skyfi-imagery',
  gs_credentials: {
    type: 'service_account',
    project_id: 'my-gcp-project',
    private_key_id: 'key123',
    private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n',
    client_email: 'test@my-gcp-project.iam.gserviceaccount.com',
    client_id: '123456',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: 'https://www.googleapis.com/service/account',
  },
  subfolder: 'skyfi-orders/2025',
};

// =============================================================================
// Azure Delivery Parameters
// =============================================================================

export const mockAzureDeliveryParams = {
  azure_container_id: 'skyfi-container',
  azure_connection_string:
    'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=abc123;EndpointSuffix=core.windows.net',
  subfolder: 'skyfi-orders/2025',
};
