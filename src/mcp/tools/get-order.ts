/**
 * MCP Tool: get_order_details
 *
 * Retrieves complete details for a specific SkyFi order including delivery timeline and next steps
 */

import { SkyFiClient } from '../../skyfi/client.js';
import { createOrderManagement } from '../../skyfi/order-management.js';
import { logger } from '../../lib/logger.js';
import {
  validateGetOrderDetailsInput,
  GET_ORDER_DETAILS_SCHEMA,
} from '../schemas/order-management.schemas.js';
import { formatOrderStatus } from '../formatters/order-status.js';

/**
 * Tool definition for MCP server
 */
export const GET_ORDER_DETAILS_TOOL = {
  name: 'get_order_details',
  description:
    'Get complete details for a specific SkyFi order by ID. Returns order status, delivery timeline, ' +
    'download URLs, and actionable next steps based on the current status.',
  inputSchema: GET_ORDER_DETAILS_SCHEMA,
} as const;

/**
 * Execute the get_order_details tool
 */
export async function executeGetOrderDetails(
  client: SkyFiClient,
  args: unknown,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    // Validate input
    const input = validateGetOrderDetailsInput(args);

    logger.info('Executing get_order_details tool', {
      orderId: input.orderId,
    });

    // Create order management service
    const orderManagement = createOrderManagement(client);

    // Fetch order details
    const order = await orderManagement.getOrderById(input.orderId);

    // Format output
    const formattedOutput = formatOrderStatus(order);

    logger.info('get_order_details tool executed successfully', {
      orderId: input.orderId,
      status: order.status,
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
    logger.error('Failed to execute get_order_details tool', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving order details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}
