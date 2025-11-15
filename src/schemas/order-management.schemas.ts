/**
 * Zod validation schemas for order management
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { OrderType, DeliveryStatus } from '../types/order-status.js';
import { DeliveryDriver } from '../types/skyfi-api.js';

/**
 * Schema for list orders request parameters
 */
export const ListOrdersParamsSchema = z.object({
  orderType: z.nativeEnum(OrderType).optional().nullable(),
  pageNumber: z.number().int().min(0).optional().default(0),
  pageSize: z.number().int().min(1).max(25).optional().default(10),
});

/**
 * Type for list orders request parameters
 */
export type ListOrdersParams = z.infer<typeof ListOrdersParamsSchema>;

/**
 * Schema for order ID (UUID format)
 */
export const OrderIdSchema = z.string().uuid({
  message: 'Order ID must be a valid UUID',
});

/**
 * Schema for delivery driver enum
 */
export const DeliveryDriverSchema = z.nativeEnum(DeliveryDriver);

/**
 * Schema for delivery parameters
 *
 * Note: Actual validation of driver-specific parameters
 * would be done in a separate validation layer
 */
export const DeliveryParamsSchema = z.record(z.unknown()).refine(
  (params) => {
    return Object.keys(params).length > 0;
  },
  {
    message: 'Delivery parameters must not be empty',
  },
);

/**
 * Schema for order redelivery request
 */
export const OrderRedeliverySchema = z.object({
  deliveryDriver: DeliveryDriverSchema,
  deliveryParams: DeliveryParamsSchema,
});

/**
 * Type for order redelivery request
 */
export type OrderRedeliveryParams = z.infer<typeof OrderRedeliverySchema>;

/**
 * Schema for delivery event info
 */
export const DeliveryEventInfoSchema = z.object({
  status: z.nativeEnum(DeliveryStatus),
  timestamp: z.string().datetime(),
  message: z.string().nullable(),
});

/**
 * Base order response schema
 */
const BaseOrderResponseSchema = z.object({
  id: z.string().uuid(),
  orderType: z.nativeEnum(OrderType),
  orderCost: z.number().int(),
  ownerId: z.string().uuid(),
  status: z.nativeEnum(DeliveryStatus),
  aoi: z.string(),
  aoiSqkm: z.number(),
  deliveryDriver: DeliveryDriverSchema.nullable(),
  deliveryParams: z.record(z.unknown()).nullable(),
  label: z.string().nullable().optional(),
  orderLabel: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  webhookUrl: z.string().url().nullable().optional(),
  tilesUrl: z.string().nullable().optional(),
  downloadImageUrl: z.string().nullable(),
  downloadPayloadUrl: z.string().nullable(),
  orderCode: z.string(),
  geocodeLocation: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  orderId: z.string().uuid(),
  itemId: z.string().uuid(),
  deliverableId: z.string().uuid().nullable().optional(),
});

/**
 * Archive order response schema
 */
export const ArchiveOrderResponseSchema = BaseOrderResponseSchema.extend({
  orderType: z.literal(OrderType.ARCHIVE),
  archiveId: z.string(),
  archive: z
    .object({
      archiveId: z.string(),
      provider: z.string(),
      constellation: z.string(),
      productType: z.string(),
      platformResolution: z.number(),
      resolution: z.string(),
      captureTimestamp: z.string(),
      cloudCoveragePercent: z.number(),
      offNadirAngle: z.number(),
      footprint: z.string(),
    })
    .optional(),
});

/**
 * Tasking order response schema
 */
export const TaskingOrderResponseSchema = BaseOrderResponseSchema.extend({
  orderType: z.literal(OrderType.TASKING),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  productType: z.string(),
  resolution: z.string(),
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
});

/**
 * Union schema for any order response
 */
export const OrderResponseSchema = z.union([
  ArchiveOrderResponseSchema,
  TaskingOrderResponseSchema,
]);

/**
 * Archive order info response schema (with events)
 */
export const ArchiveOrderInfoResponseSchema = ArchiveOrderResponseSchema.extend({
  events: z.array(DeliveryEventInfoSchema),
});

/**
 * Tasking order info response schema (with events)
 */
export const TaskingOrderInfoResponseSchema = TaskingOrderResponseSchema.extend({
  events: z.array(DeliveryEventInfoSchema),
});

/**
 * Union schema for order info response (with events)
 */
export const OrderInfoResponseSchema = z.union([
  ArchiveOrderInfoResponseSchema,
  TaskingOrderInfoResponseSchema,
]);

/**
 * List orders response schema
 */
export const ListOrdersResponseSchema = z.object({
  request: z.object({
    orderType: z.nativeEnum(OrderType).nullable().optional(),
    pageNumber: z.number().int().min(0).optional(),
    pageSize: z.number().int().min(1).max(25).optional(),
  }),
  total: z.number().int(),
  orders: z.array(OrderResponseSchema),
});

/**
 * Validate list orders parameters
 *
 * @param params - Parameters to validate
 * @returns Validated and normalized parameters
 * @throws {ValidationError} If parameters are invalid
 */
export function validateListOrdersParams(
  params: unknown,
): z.infer<typeof ListOrdersParamsSchema> {
  return ListOrdersParamsSchema.parse(params);
}

/**
 * Validate order ID
 *
 * @param orderId - Order ID to validate
 * @returns Validated order ID
 * @throws {ValidationError} If order ID is invalid
 */
export function validateOrderId(orderId: unknown): string {
  return OrderIdSchema.parse(orderId);
}

/**
 * Validate order redelivery parameters
 *
 * @param params - Redelivery parameters to validate
 * @returns Validated parameters
 * @throws {ValidationError} If parameters are invalid
 */
export function validateOrderRedeliveryParams(
  params: unknown,
): z.infer<typeof OrderRedeliverySchema> {
  return OrderRedeliverySchema.parse(params);
}

/**
 * Validate list orders response
 *
 * @param data - Response data to validate
 * @returns Validated response
 * @throws {ValidationError} If response data is invalid
 */
export function validateListOrdersResponse(
  data: unknown,
): z.infer<typeof ListOrdersResponseSchema> {
  return ListOrdersResponseSchema.parse(data);
}

/**
 * Validate order info response
 *
 * @param data - Response data to validate
 * @returns Validated response
 * @throws {ValidationError} If response data is invalid
 */
export function validateOrderInfoResponse(
  data: unknown,
): z.infer<typeof OrderInfoResponseSchema> {
  return OrderInfoResponseSchema.parse(data);
}
