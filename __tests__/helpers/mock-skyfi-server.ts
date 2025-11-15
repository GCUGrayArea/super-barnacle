/**
 * Mock SkyFi API Server
 *
 * Provides mock HTTP responses for the SkyFi API during E2E tests.
 * Uses nock to intercept HTTP requests.
 */

import nock from 'nock';
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
 * Sets up nock interceptors for the SkyFi API
 */
export class MockSkyFiServer {
  private baseUrl: string;
  private scope?: nock.Scope;

  constructor(baseUrl: string = 'https://api.skyfi.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Start the mock server
   */
  start(): void {
    // Enable nock
    if (!nock.isActive()) {
      nock.activate();
    }
  }

  /**
   * Stop the mock server
   */
  stop(): void {
    nock.cleanAll();
    this.scope = undefined;
  }

  /**
   * Reset all interceptors
   */
  reset(): void {
    // Don't clean all - just let nock persist the interceptors
    // Individual test can set up their own mocks
  }

  /**
   * Mock archive search
   */
  mockArchiveSearch(response?: Partial<ArchiveSearchResponse>): void {
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

    nock(this.baseUrl).post('/archives').reply(200, defaultResponse);
  }

  /**
   * Mock get archive by ID
   */
  mockGetArchive(archiveId: string, archive?: Partial<Archive>): void {
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

    nock(this.baseUrl).get(`/archives/${archiveId}`).reply(200, defaultArchive);
  }

  /**
   * Mock archive order
   */
  mockArchiveOrder(orderId: string = 'order-123'): void {
    const response = {
      id: orderId,
      ownerId: 'user-123',
      orderCode: `ORDER-${orderId.toUpperCase()}`,
      orderId,
      itemId: `item-${orderId}`,
      aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      aoiSqkm: 1.5,
      status: DeliveryStatus.CREATED,
      orderCost: 25000,
      createdAt: new Date().toISOString(),
      deliveryDriver: DeliveryDriver.S3,
      downloadImageUrl: null,
      downloadPayloadUrl: null,
    };

    nock(this.baseUrl).post('/orders/archive').reply(201, response);
  }

  /**
   * Mock tasking order
   */
  mockTaskingOrder(orderId: string = 'tasking-order-123'): void {
    const response = {
      id: orderId,
      ownerId: 'user-123',
      orderCode: `ORDER-${orderId.toUpperCase()}`,
      orderId,
      itemId: `item-${orderId}`,
      aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      aoiSqkm: 1.5,
      status: DeliveryStatus.CREATED,
      orderCost: 50000,
      createdAt: new Date().toISOString(),
      deliveryDriver: DeliveryDriver.S3,
      downloadImageUrl: null,
      downloadPayloadUrl: null,
    };

    nock(this.baseUrl).post('/orders/tasking').reply(201, response);
  }

  /**
   * Mock feasibility check
   */
  mockFeasibilityCheck(feasible: boolean = true): void {
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

    nock(this.baseUrl).post('/tasking/feasibility').reply(200, response);
  }

  /**
   * Mock satellite passes prediction
   */
  mockPredictPasses(): void {
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

    nock(this.baseUrl).post('/tasking/predict-passes').reply(200, response);
  }

  /**
   * Mock list orders
   */
  mockListOrders(orderType?: string): void {
    const orders = [
      {
        id: 'order-1',
        orderId: 'order-1',
        itemId: 'item-1',
        ownerId: 'user-123',
        orderCode: 'ORDER-1',
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        aoiSqkm: 1.5,
        status: DeliveryStatus.DELIVERY_COMPLETED,
        orderCost: 25000,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        downloadImageUrl: 'https://example.com/image.tif',
        downloadPayloadUrl: 'https://example.com/payload.zip',
      },
      {
        id: 'order-2',
        orderId: 'order-2',
        itemId: 'item-2',
        ownerId: 'user-123',
        orderCode: 'ORDER-2',
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        aoiSqkm: 1.5,
        status: DeliveryStatus.CREATED,
        orderCost: 50000,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        downloadImageUrl: null,
        downloadPayloadUrl: null,
      },
    ];

    const queryParam = orderType ? `?orderType=${orderType}` : '';
    nock(this.baseUrl)
      .get(`/orders${queryParam}`)
      .reply(200, {
        orders,
        total: orders.length,
        pageNumber: 0,
        pageSize: 10,
      });
  }

  /**
   * Mock get order details
   */
  mockGetOrder(orderId: string, status: DeliveryStatus = DeliveryStatus.CREATED): void {
    const response = {
      id: orderId,
      orderId,
      itemId: `item-${orderId}`,
      ownerId: 'user-123',
      orderCode: `ORDER-${orderId.toUpperCase()}`,
      aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
      aoiSqkm: 1.5,
      status,
      orderCost: 25000,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      deliveryDriver: DeliveryDriver.S3,
      downloadImageUrl: status === DeliveryStatus.DELIVERY_COMPLETED ? 'https://example.com/image.tif' : null,
      downloadPayloadUrl: status === DeliveryStatus.DELIVERY_COMPLETED ? 'https://example.com/payload.zip' : null,
    };

    nock(this.baseUrl).get(`/orders/${orderId}`).reply(200, response);
  }

  /**
   * Mock order redelivery
   */
  mockRedelivery(orderId: string): void {
    const response = {
      success: true,
      message: 'Redelivery initiated',
      orderId,
    };

    nock(this.baseUrl).post(`/orders/${orderId}/redelivery`).reply(200, response);
  }

  /**
   * Mock create notification
   */
  mockCreateNotification(notificationId: string = '550e8400-e29b-41d4-a716-446655440000'): void {
    const response = {
      notification: {
        id: notificationId,
        userId: 'user-123',
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggerCount: 0,
      },
    };

    nock(this.baseUrl).post('/notifications').reply(201, response);
  }

  /**
   * Mock list notifications
   */
  mockListNotifications(): void {
    const notifications: Notification[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-123',
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook',
        isActive: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        triggerCount: 5,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        userId: 'user-123',
        aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
        webhookUrl: 'https://example.com/webhook2',
        isActive: false,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        triggerCount: 0,
      },
    ];

    nock(this.baseUrl).get('/notifications').reply(200, { notifications, total: notifications.length });
  }

  /**
   * Mock delete notification
   */
  mockDeleteNotification(notificationId: string): void {
    const response = {
      success: true,
      message: 'Notification deleted successfully',
      deletedId: notificationId,
    };

    nock(this.baseUrl).delete(`/notifications/${notificationId}`).reply(200, response);
  }

  /**
   * Mock get pricing
   */
  mockGetPricing(): void {
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

    nock(this.baseUrl).get('/pricing').reply(200, response);
  }

  /**
   * Mock an error response
   */
  mockError(endpoint: string, method: string, statusCode: number, errorMessage: string): void {
    const error = {
      message: errorMessage,
      errorCode: `ERROR_${statusCode}`,
    };

    const nockScope = nock(this.baseUrl);
    switch (method.toUpperCase()) {
      case 'GET':
        nockScope.get(endpoint).reply(statusCode, error);
        break;
      case 'POST':
        nockScope.post(endpoint).reply(statusCode, error);
        break;
      case 'PUT':
        nockScope.put(endpoint).reply(statusCode, error);
        break;
      case 'DELETE':
        nockScope.delete(endpoint).reply(statusCode, error);
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
