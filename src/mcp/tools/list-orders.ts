/**
 * MCP Tool: list_orders
 *
 * Lists SkyFi orders with optional filtering and pagination
 */

import { SkyFiClient } from '../../skyfi/client.js';
import { createOrderManagement } from '../../skyfi/order-management.js';
import { logger } from '../../lib/logger.js';
import {
  validateListOrdersInput,
  LIST_ORDERS_SCHEMA,
} from '../schemas/order-management.schemas.js';
import { formatOrdersList } from '../formatters/order-status.js';
import { OrderInfoResponse } from '../../types/skyfi-api.js';

/**
 * Tool definition for MCP server
 */
export const LIST_ORDERS_TOOL = {
  name: 'list_orders',
  description:
    'List SkyFi satellite imagery orders with optional filtering by type, status, and date range. ' +
    'Returns paginated results with order summaries including status, cost, and delivery information.',
  inputSchema: LIST_ORDERS_SCHEMA,
} as const;

/**
 * Execute the list_orders tool
 */
export async function executeListOrders(
  client: SkyFiClient,
  args: unknown,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    // Validate input
    const input = validateListOrdersInput(args);

    logger.info('Executing list_orders tool', {
      orderType: input.orderType,
      pageNumber: input.pageNumber,
      pageSize: input.pageSize,
    });

    // Create order management service
    const orderManagement = createOrderManagement(client);

    // Fetch orders
    const response = await orderManagement.listOrders({
      orderType: input.orderType,
      pageNumber: input.pageNumber ?? 0,
      pageSize: input.pageSize ?? 10,
    });

    // Filter by status if provided (client-side filtering)
    let filteredOrders = response.orders as OrderInfoResponse[];
    if (input.status) {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === input.status,
      );
    }

    // Filter by date range if provided (client-side filtering)
    if (input.fromDate) {
      const fromTimestamp = new Date(input.fromDate).getTime();
      filteredOrders = filteredOrders.filter(
        (order) => new Date(order.createdAt).getTime() >= fromTimestamp,
      );
    }

    if (input.toDate) {
      const toTimestamp = new Date(input.toDate).getTime();
      filteredOrders = filteredOrders.filter(
        (order) => new Date(order.createdAt).getTime() <= toTimestamp,
      );
    }

    // Format output
    const formattedOutput = formatOrdersList(
      filteredOrders,
      response.total,
      input.pageNumber ?? 0,
      input.pageSize ?? 10,
    );

    logger.info('list_orders tool executed successfully', {
      totalOrders: response.total,
      returnedOrders: filteredOrders.length,
    });

    return {
      content: [
        {
          type: 'text',
          text: formattedOutput,
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to execute list_orders tool', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      content: [
        {
          type: 'text',
          text: `Error listing orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}
