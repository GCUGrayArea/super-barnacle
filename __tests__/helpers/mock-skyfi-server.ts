/**
 * Mock SkyFi API Server
 *
 * Provides mock HTTP responses for the SkyFi API during E2E tests.
 * Uses axios-mock-adapter to intercept HTTP requests.
 */

import MockAdapter from 'axios-mock-adapter';
import type { AxiosInstance } from 'axios';
import type { Archive, ArchiveSearchResponse } from '../../src/types/archives.js';
import type { Notification } from '../../src/types/notifications.js';
import type { FeasibilityCheckResponse, PassPredictionResponse } from '../../src/types/feasibility.js';
import type { PricingResponse } from '../../src/types/pricing.js';
import {
  Provider,
  ProductType,
  Resolution,
  DeliveryDriver,
} from '../../src/types/skyfi-api.js';
import { DeliveryStatus } from '../../src/types/order-status.js';

/**
 * Mock SkyFi API Server
 *
 * Sets up axios-mock-adapter interceptors for the SkyFi API
 */
export class MockSkyFiServer {
  private baseUrl: string;
  private mockAdapter?: MockAdapter;
  private axiosInstance?: AxiosInstance;

  constructor(baseUrl: string = 'https://api.skyfi.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Start the mock server with the given axios instance
   */
  start(axiosInstance?: AxiosInstance): void {
    if (axiosInstance) {
      this.axiosInstance = axiosInstance;
      // Set onNoMatch to 'throwException' so we get clear errors for unmocked requests
      this.mockAdapter = new MockAdapter(axiosInstance, { onNoMatch: 'throwException' });
    }
  }

  /**
   * Stop the mock server
   */
  stop(): void {
    if (this.mockAdapter) {
      this.mockAdapter.restore();
      this.mockAdapter = undefined;
    }
    this.axiosInstance = undefined;
  }

  /**
   * Reset all interceptors
   */
  reset(): void {
    if (this.mockAdapter) {
      this.mockAdapter.reset();
    }
  }

  /**
   * Mock archive search
   */
  mockArchiveSearch(response?: Partial<ArchiveSearchResponse>): void {
    if (!this.mockAdapter) return;

    const defaultArchive: Archive = {
      archiveId: '354b783d-8fad-4050-a167-2eb069653777',
      provider: Provider.Satellogic,
      constellation: 'Satellogic',
      productType: ProductType.Day,
      platformResolution: 70,
      resolution: Resolution.VeryHigh,
      captureTimestamp: '2024-01-15T12:00:00Z',
      cloudCoveragePercent: 5,
      offNadirAngle: 10,
      footprint:
        'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      minSqKm: 1,
      maxSqKm: 100,
      priceForOneSquareKm: 5.0,
      priceForOneSquareKmCents: 500,
      priceFullScene: 250.0,
      openData: false,
      totalAreaSquareKm: 50,
      deliveryTimeHours: 24,
      gsd: 0.7,
    };

    const defaultResponse: ArchiveSearchResponse = {
      request: {},
      archives: [defaultArchive],
      total: 1,
      ...response,
    };

    this.mockAdapter.onPost('/archives').reply(200, defaultResponse);
  }

  /**
   * Mock get archive by ID
   */
  mockGetArchive(archiveId: string, archive?: Partial<Archive>): void {
    if (!this.mockAdapter) return;

    const defaultArchive: Archive = {
      archiveId,
      provider: Provider.Satellogic,
      constellation: 'Satellogic',
      productType: ProductType.Day,
      platformResolution: 70,
      resolution: Resolution.VeryHigh,
      captureTimestamp: '2024-01-15T12:00:00Z',
      cloudCoveragePercent: 5,
      offNadirAngle: 10,
      footprint:
        'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      minSqKm: 1,
      maxSqKm: 100,
      priceForOneSquareKm: 5.0,
      priceForOneSquareKmCents: 500,
      priceFullScene: 250.0,
      openData: false,
      totalAreaSquareKm: 50,
      deliveryTimeHours: 24,
      gsd: 0.7,
      ...archive,
    };

    this.mockAdapter.onGet(`/archives/${archiveId}`).reply(200, defaultArchive);
  }

  /**
   * Mock archive order
   */
  mockArchiveOrder(orderId: string = 'order-123'): void {
    if (!this.mockAdapter) return;

    const response = {
      id: orderId,
      ownerId: '550e8400-e29b-41d4-a716-446655440000',
      orderCode: `ORDER-${orderId.toUpperCase()}`,
      orderId,
      itemId: `item-${orderId}`,
      orderType: 'ARCHIVE',
      aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      aoiSqkm: 1.5,
      status: DeliveryStatus.CREATED,
      orderCost: 25000,
      createdAt: new Date().toISOString(),
      deliveryDriver: DeliveryDriver.S3,
      deliveryParams: {},
      archiveId: '354b783d-8fad-4050-a167-2eb069653777',
      downloadImageUrl: null,
      downloadPayloadUrl: null,
    };

    this.mockAdapter.onPost('/order-archive').reply(201, response);
  }

  /**
   * Mock tasking order
   */
  mockTaskingOrder(orderId: string = 'tasking-order-123'): void {
    if (!this.mockAdapter) return;

    const response = {
      id: orderId,
      ownerId: '550e8400-e29b-41d4-a716-446655440000',
      orderCode: `ORDER-${orderId.toUpperCase()}`,
      orderId,
      itemId: `item-${orderId}`,
      orderType: 'TASKING',
      aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      aoiSqkm: 1.5,
      status: DeliveryStatus.CREATED,
      orderCost: 50000,
      createdAt: new Date().toISOString(),
      deliveryDriver: DeliveryDriver.S3,
      deliveryParams: {},
      windowStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      windowEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      productType: 'DAY',
      resolution: 'VERY HIGH',
      downloadImageUrl: null,
      downloadPayloadUrl: null,
    };

    this.mockAdapter.onPost('/order-tasking').reply(201, response);
  }

  /**
   * Mock feasibility check
   */
  mockFeasibilityCheck(feasible: boolean = true): void {
    if (!this.mockAdapter) return;

    const response: FeasibilityCheckResponse = {
      id: 'feasibility-123',
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      overallScore: feasible
        ? {
            feasibility: 0.95,
            providerScore: {
              score: 0.95,
              providerScores: [
                {
                  provider: 'PLANET',
                  score: 0.95,
                  opportunities: [
                    {
                      windowStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                      windowEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                  ],
                },
              ],
            },
          }
        : {
            feasibility: 0.1,
            providerScore: {
              score: 0.1,
              providerScores: [],
            },
          },
    };

    this.mockAdapter.onPost('/feasibility').reply(200, response);
  }

  /**
   * Mock satellite passes prediction
   */
  mockPredictPasses(): void {
    if (!this.mockAdapter) return;

    const response: PassPredictionResponse = {
      passes: [
        {
          provider: Provider.Satellogic,
          satname: 'Satellogic-1',
          satid: 'SAT-1',
          noradid: '12345',
          node: 'ASCENDING',
          productType: ProductType.Day,
          resolution: Resolution.VeryHigh,
          lat: 30.27,
          lon: -97.74,
          passDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          meanT: 15,
          offNadirAngle: 10,
          solarElevationAngle: 45,
          minSquareKms: 1,
          maxSquareKms: 100,
          priceForOneSquareKm: 5.0,
          priceForOneSquareKmCents: 500,
          gsdDegMin: 0.7,
          gsdDegMax: 0.7,
        },
        {
          provider: Provider.Satellogic,
          satname: 'Satellogic-2',
          satid: 'SAT-2',
          noradid: '12346',
          node: 'DESCENDING',
          productType: ProductType.Day,
          resolution: Resolution.VeryHigh,
          lat: 30.27,
          lon: -97.74,
          passDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          meanT: 18,
          offNadirAngle: 5,
          solarElevationAngle: 60,
          minSquareKms: 1,
          maxSquareKms: 100,
          priceForOneSquareKm: 5.0,
          priceForOneSquareKmCents: 500,
          gsdDegMin: 0.7,
          gsdDegMax: 0.7,
        },
      ],
    };

    this.mockAdapter.onPost('/feasibility/pass-prediction').reply(200, response);
  }

  /**
   * Mock list orders
   */
  mockListOrders(orderType?: string): void {
    if (!this.mockAdapter) return;

    const orders = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        orderId: '550e8400-e29b-41d4-a716-446655440001',
        itemId: '550e8400-e29b-41d4-a716-446655440011',
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        orderCode: 'ORDER-1',
        orderType: 'ARCHIVE',
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        aoiSqkm: 1.5,
        status: DeliveryStatus.DELIVERY_COMPLETED,
        orderCost: 25000,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: {},
        archiveId: '354b783d-8fad-4050-a167-2eb069653777',
        downloadImageUrl: 'https://example.com/image.tif',
        downloadPayloadUrl: 'https://example.com/payload.zip',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        orderId: '550e8400-e29b-41d4-a716-446655440002',
        itemId: '550e8400-e29b-41d4-a716-446655440012',
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        orderCode: 'ORDER-2',
        orderType: 'TASKING',
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        aoiSqkm: 1.5,
        status: DeliveryStatus.CREATED,
        orderCost: 50000,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        deliveryDriver: DeliveryDriver.S3,
        deliveryParams: {},
        windowStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        windowEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        productType: 'DAY',
        resolution: 'VERY HIGH',
        downloadImageUrl: null,
        downloadPayloadUrl: null,
      },
    ];

    const responseData = {
      request: {},
      orders,
      total: orders.length,
      pageNumber: 0,
      pageSize: 10,
    };

    // Mock both with and without query parameters
    this.mockAdapter.onGet('/orders').reply(200, responseData);
    if (orderType) {
      this.mockAdapter.onGet(`/orders`, { params: { orderType } }).reply(200, responseData);
    }
  }

  /**
   * Mock get order details
   */
  mockGetOrder(orderId: string, status: DeliveryStatus = DeliveryStatus.CREATED): void {
    if (!this.mockAdapter) return;

    const response = {
      id: orderId,
      orderId,
      itemId: '550e8400-e29b-41d4-a716-446655440099',
      ownerId: '550e8400-e29b-41d4-a716-446655440000',
      orderCode: `ORDER-${orderId.toUpperCase()}`,
      orderType: 'ARCHIVE',
      aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      aoiSqkm: 1.5,
      status,
      orderCost: 25000,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      deliveryDriver: DeliveryDriver.S3,
      deliveryParams: {},
      archiveId: '354b783d-8fad-4050-a167-2eb069653777',
      downloadImageUrl: status === DeliveryStatus.DELIVERY_COMPLETED ? 'https://example.com/image.tif' : null,
      downloadPayloadUrl: status === DeliveryStatus.DELIVERY_COMPLETED ? 'https://example.com/payload.zip' : null,
    };

    this.mockAdapter.onGet(`/orders/${orderId}`).reply(200, response);
  }

  /**
   * Mock order redelivery
   */
  mockRedelivery(orderId: string): void {
    if (!this.mockAdapter) return;

    const response = {
      success: true,
      message: 'Redelivery initiated',
      orderId,
    };

    this.mockAdapter.onPost(`/orders/${orderId}/redelivery`).reply(200, response);
  }

  /**
   * Mock create notification
   */
  mockCreateNotification(notificationId: string = '550e8400-e29b-41d4-a716-446655440000'): void {
    if (!this.mockAdapter) return;

    const response = {
      notification: {
        id: notificationId,
        userId: '550e8400-e29b-41d4-a716-446655440000',
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggerCount: 0,
      },
    };

    this.mockAdapter.onPost('/notifications').reply(201, response);
  }

  /**
   * Mock list notifications
   */
  mockListNotifications(): void {
    if (!this.mockAdapter) return;

    const notifications: Notification[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        triggerCount: 5,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook2',
        isActive: false,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        triggerCount: 0,
      },
    ];

    this.mockAdapter.onGet('/notifications').reply(200, { notifications, total: notifications.length });
  }

  /**
   * Mock delete notification
   */
  mockDeleteNotification(notificationId: string): void {
    if (!this.mockAdapter) return;

    const response = {
      success: true,
      message: 'Notification deleted successfully',
      deletedId: notificationId,
    };

    this.mockAdapter.onDelete(`/notifications/${notificationId}`).reply(200, response);
  }

  /**
   * Mock get pricing
   */
  mockGetPricing(): void {
    if (!this.mockAdapter) return;

    const response: PricingResponse = {
      productTypes: {
        DAY: {
          resolutions: {
            'VERY HIGH': {
              providers: {
                SATELLOGIC: {
                  pricePerSqKm: 5.0,
                  available: true,
                },
                PLANET: {
                  pricePerSqKm: 3.5,
                  available: true,
                },
              },
            },
          },
        },
      },
      metadata: {
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
      },
    };

    this.mockAdapter.onGet('/pricing').reply(200, response);
  }

  /**
   * Mock an error response
   */
  mockError(endpoint: string, method: string, statusCode: number, errorMessage: string): void {
    if (!this.mockAdapter) return;

    const error = {
      message: errorMessage,
      errorCode: `ERROR_${statusCode}`,
    };

    switch (method.toUpperCase()) {
      case 'GET':
        this.mockAdapter.onGet(endpoint).reply(statusCode, error);
        break;
      case 'POST':
        this.mockAdapter.onPost(endpoint).reply(statusCode, error);
        break;
      case 'PUT':
        this.mockAdapter.onPut(endpoint).reply(statusCode, error);
        break;
      case 'DELETE':
        this.mockAdapter.onDelete(endpoint).reply(statusCode, error);
        break;
    }
  }
}

/**
 * Create a mock SkyFi server
 */
export function createMockServer(baseUrl?: string): MockSkyFiServer {
  return new MockSkyFiServer(baseUrl);
}
