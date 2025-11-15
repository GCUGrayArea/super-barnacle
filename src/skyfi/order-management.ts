/**
 * Order Management Module
 *
 * Provides functionality for managing SkyFi orders including:
 * - Listing orders with filtering and pagination
 * - Retrieving individual order details
 * - Triggering order redelivery
 *
 * @packageDocumentation
 */

import { SkyFiClient } from './client.js';
import { logger } from '../lib/logger.js';
import {
  ListOrdersResponse,
  OrderInfoResponse,
} from '../types/skyfi-api.js';
import {
  validateListOrdersParams,
  validateOrderId,
  validateOrderRedeliveryParams,
  validateListOrdersResponse,
  validateOrderInfoResponse,
  type ListOrdersParams,
  type OrderRedeliveryParams,
} from '../schemas/order-management.schemas.js';
import { OrderType } from '../types/order-status.js';

/**
 * Order Management Service
 *
 * Handles all order-related operations through the SkyFi API
 */
export class OrderManagement {
  private client: SkyFiClient;

  /**
   * Create a new OrderManagement instance
   *
   * @param client - SkyFi API client instance
   */
  constructor(client: SkyFiClient) {
    this.client = client;
  }

  /**
   * List orders with optional filtering and pagination
   */
  async listOrders(params?: Partial<ListOrdersParams>): Promise<ListOrdersResponse> {
    try {
      // Validate and normalize parameters
      const validatedParams = validateListOrdersParams(params ?? {});

      logger.info('Listing orders', {
        orderType: validatedParams.orderType,
        pageNumber: validatedParams.pageNumber,
        pageSize: validatedParams.pageSize,
      });

      // Make API request
      const response = await this.client.get<ListOrdersResponse>('/orders', {
        params: {
          orderType: validatedParams.orderType,
          pageNumber: validatedParams.pageNumber,
          pageSize: validatedParams.pageSize,
        },
      } as any);

      // Validate response
      const validatedResponse = validateListOrdersResponse(response);

      logger.info('Orders listed successfully', {
        total: validatedResponse.total,
        returned: validatedResponse.orders.length,
      });

      return validatedResponse;
    } catch (error) {
      logger.error('Failed to list orders', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params,
      });
      throw error;
    }
  }

  /**
   * Get detailed information for a specific order by ID
   */
  async getOrderById(orderId: string): Promise<OrderInfoResponse> {
    try {
      // Validate order ID
      const validatedOrderId = validateOrderId(orderId);

      logger.info('Fetching order details', { orderId: validatedOrderId });

      // Make API request
      const response = await this.client.get<OrderInfoResponse>(`/orders/${validatedOrderId}`);

      // Validate response
      const validatedResponse = validateOrderInfoResponse(response);

      logger.info('Order details retrieved successfully', {
        orderId: validatedOrderId,
        status: validatedResponse.status,
        orderType: validatedResponse.orderType,
        eventsCount: validatedResponse.events.length,
      });

      return validatedResponse;
    } catch (error) {
      logger.error('Failed to fetch order details', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
      throw error;
    }
  }

  /**
   * Trigger redelivery for an order with new delivery parameters
   */
  async triggerRedelivery(
    orderId: string,
    params: OrderRedeliveryParams,
  ): Promise<OrderInfoResponse> {
    try {
      // Validate order ID
      const validatedOrderId = validateOrderId(orderId);

      // Validate redelivery parameters
      const validatedParams = validateOrderRedeliveryParams(params);

      logger.info('Triggering order redelivery', {
        orderId: validatedOrderId,
        deliveryDriver: validatedParams.deliveryDriver,
      });

      // Make API request
      const response = await this.client.post<OrderInfoResponse>(
        `/orders/${validatedOrderId}/redelivery`,
        validatedParams,
      );

      // Validate response
      const validatedResponse = validateOrderInfoResponse(response);

      logger.info('Redelivery triggered successfully', {
        orderId: validatedOrderId,
        status: validatedResponse.status,
      });

      return validatedResponse;
    } catch (error) {
      logger.error('Failed to trigger redelivery', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });
      throw error;
    }
  }

  /**
   * List orders filtered by type
   */
  async listOrdersByType(
    orderType: OrderType,
    pageNumber: number = 0,
    pageSize: number = 10,
  ): Promise<ListOrdersResponse> {
    return this.listOrders({
      orderType,
      pageNumber,
      pageSize,
    });
  }

  /**
   * Get all orders (paginated)
   */
  async getAllOrders(pageNumber: number = 0, pageSize: number = 10): Promise<ListOrdersResponse> {
    return this.listOrders({
      pageNumber,
      pageSize,
    });
  }
}

/**
 * Create a new OrderManagement instance
 */
export function createOrderManagement(client: SkyFiClient): OrderManagement {
  return new OrderManagement(client);
}
