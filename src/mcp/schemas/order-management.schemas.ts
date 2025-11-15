/**
 * MCP Tool Input Schemas for Order Management
 *
 * JSON Schema definitions for MCP tool inputs
 */

import { OrderType } from '../../types/order-status.js';
import { DeliveryDriver } from '../../types/skyfi-api.js';

/**
 * Schema for list_orders tool input
 */
export const LIST_ORDERS_SCHEMA = {
  type: 'object',
  properties: {
    orderType: {
      type: 'string',
      enum: [OrderType.ARCHIVE, OrderType.TASKING],
      description: 'Filter orders by type (ARCHIVE or TASKING)',
    },
    status: {
      type: 'string',
      description: 'Filter orders by delivery status',
    },
    fromDate: {
      type: 'string',
      format: 'date-time',
      description: 'Filter orders created after this date (ISO 8601 format)',
    },
    toDate: {
      type: 'string',
      format: 'date-time',
      description: 'Filter orders created before this date (ISO 8601 format)',
    },
    pageNumber: {
      type: 'number',
      minimum: 0,
      default: 0,
      description: 'Page number for pagination (0-indexed)',
    },
    pageSize: {
      type: 'number',
      minimum: 1,
      maximum: 25,
      default: 10,
      description: 'Number of orders per page (1-25)',
    },
  },
  additionalProperties: false,
} as const;

/**
 * Schema for get_order_details tool input
 */
export const GET_ORDER_DETAILS_SCHEMA = {
  type: 'object',
  properties: {
    orderId: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier of the order (UUID format)',
    },
  },
  required: ['orderId'],
  additionalProperties: false,
} as const;

/**
 * Schema for trigger_order_redelivery tool input
 */
export const TRIGGER_REDELIVERY_SCHEMA = {
  type: 'object',
  properties: {
    orderId: {
      type: 'string',
      format: 'uuid',
      description: 'Unique identifier of the order (UUID format)',
    },
    deliveryDriver: {
      type: 'string',
      enum: Object.values(DeliveryDriver),
      description: 'Delivery driver to use for redelivery',
    },
    deliveryParams: {
      type: 'object',
      description: 'Driver-specific delivery parameters',
      additionalProperties: true,
    },
  },
  required: ['orderId'],
  additionalProperties: false,
} as const;

/**
 * Type definitions for tool inputs
 */
export interface ListOrdersInput {
  orderType?: OrderType;
  status?: string;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetOrderDetailsInput {
  orderId: string;
}

export interface TriggerRedeliveryInput {
  orderId: string;
  deliveryDriver?: DeliveryDriver;
  deliveryParams?: Record<string, unknown>;
}

/**
 * Validate list orders input
 */
export function validateListOrdersInput(input: unknown): ListOrdersInput {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Input must be an object');
  }

  const typed = input as Record<string, unknown>;

  const result: ListOrdersInput = {};

  if (typed['orderType'] !== undefined) {
    if (
      typeof typed['orderType'] !== 'string' ||
      ![OrderType.ARCHIVE, OrderType.TASKING].includes(typed['orderType'] as OrderType)
    ) {
      throw new Error('orderType must be either ARCHIVE or TASKING');
    }
    result.orderType = typed['orderType'] as OrderType;
  }

  if (typed['status'] !== undefined) {
    if (typeof typed['status'] !== 'string') {
      throw new Error('status must be a string');
    }
    result.status = typed['status'];
  }

  if (typed['fromDate'] !== undefined) {
    if (typeof typed['fromDate'] !== 'string') {
      throw new Error('fromDate must be a string in ISO 8601 format');
    }
    // Validate date format
    if (Number.isNaN(Date.parse(typed['fromDate']))) {
      throw new Error('fromDate must be a valid ISO 8601 date');
    }
    result.fromDate = typed['fromDate'];
  }

  if (typed['toDate'] !== undefined) {
    if (typeof typed['toDate'] !== 'string') {
      throw new Error('toDate must be a string in ISO 8601 format');
    }
    // Validate date format
    if (Number.isNaN(Date.parse(typed['toDate']))) {
      throw new Error('toDate must be a valid ISO 8601 date');
    }
    result.toDate = typed['toDate'];
  }

  if (typed['pageNumber'] !== undefined) {
    if (typeof typed['pageNumber'] !== 'number' || typed['pageNumber'] < 0) {
      throw new Error('pageNumber must be a non-negative number');
    }
    result.pageNumber = Math.floor(typed['pageNumber']);
  }

  if (typed['pageSize'] !== undefined) {
    if (
      typeof typed['pageSize'] !== 'number' ||
      typed['pageSize'] < 1 ||
      typed['pageSize'] > 25
    ) {
      throw new Error('pageSize must be a number between 1 and 25');
    }
    result.pageSize = Math.floor(typed['pageSize']);
  }

  return result;
}

/**
 * Validate get order details input
 */
export function validateGetOrderDetailsInput(input: unknown): GetOrderDetailsInput {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Input must be an object');
  }

  const typed = input as Record<string, unknown>;

  if (!typed['orderId'] || typeof typed['orderId'] !== 'string') {
    throw new Error('orderId is required and must be a string');
  }

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(typed['orderId'])) {
    throw new Error('orderId must be a valid UUID');
  }

  return {
    orderId: typed['orderId'],
  };
}

/**
 * Validate trigger redelivery input
 */
export function validateTriggerRedeliveryInput(input: unknown): TriggerRedeliveryInput {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Input must be an object');
  }

  const typed = input as Record<string, unknown>;

  if (!typed['orderId'] || typeof typed['orderId'] !== 'string') {
    throw new Error('orderId is required and must be a string');
  }

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(typed['orderId'])) {
    throw new Error('orderId must be a valid UUID');
  }

  const result: TriggerRedeliveryInput = {
    orderId: typed['orderId'],
  };

  if (typed['deliveryDriver'] !== undefined) {
    if (
      typeof typed['deliveryDriver'] !== 'string' ||
      !Object.values(DeliveryDriver).includes(typed['deliveryDriver'] as DeliveryDriver)
    ) {
      throw new Error('deliveryDriver must be a valid DeliveryDriver value');
    }
    result.deliveryDriver = typed['deliveryDriver'] as DeliveryDriver;
  }

  if (typed['deliveryParams'] !== undefined) {
    if (typeof typed['deliveryParams'] !== 'object' || typed['deliveryParams'] === null) {
      throw new Error('deliveryParams must be an object');
    }
    result.deliveryParams = typed['deliveryParams'] as Record<string, unknown>;
  }

  // If deliveryDriver is provided, deliveryParams must also be provided
  if (result.deliveryDriver && !result.deliveryParams) {
    throw new Error('deliveryParams is required when deliveryDriver is specified');
  }

  return result;
}
