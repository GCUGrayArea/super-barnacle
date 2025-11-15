/**
 * Mock Archive API Responses
 *
 * This module contains fixture data for testing archive functionality.
 */

import type { Archive, ArchiveSearchResponse } from '../../src/types/archives';
import { ProductType, Provider, Resolution } from '../../src/types/skyfi-api';

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
  footprint: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
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

export const mockArchiveSearchResponse: ArchiveSearchResponse = {
  request: {
    aoi: 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))',
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

export const mockEmptySearchResponse: ArchiveSearchResponse = {
  request: {},
  archives: [],
  total: 0,
};

export const validWKTPolygon = 'POLYGON((-97.72 30.28, -97.72 30.29, -97.71 30.29, -97.71 30.28, -97.72 30.28))';

export const invalidWKTPolygon = 'NOT A VALID WKT';

export const tooLargeWKTPolygon = 'POLYGON((-180 -85, 180 -85, 180 85, -180 85, -180 -85))';
