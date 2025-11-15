/**
 * MCP Tool: trigger_order_redelivery
 *
 * Triggers redelivery of a SkyFi order with optional new delivery configuration
 */

import { SkyFiClient } from '../../skyfi/client.js';
import { createOrderManagement } from '../../skyfi/order-management.js';
import { logger } from '../../lib/logger.js';
import {
  validateTriggerRedeliveryInput,
  TRIGGER_REDELIVERY_SCHEMA,
} from '../schemas/order-management.schemas.js';
import { formatOrderStatus } from '../formatters/order-status.js';

/**
 * Tool definition for MCP server
 */
export const TRIGGER_REDELIVERY_TOOL = {
  name: 'trigger_order_redelivery',
  description:
    'Trigger redelivery of a SkyFi order. Optionally provide new delivery driver and parameters ' +
    'to update the delivery configuration. Useful when delivery fails or when you need to deliver ' +
    'to a different storage location.',
  inputSchema: TRIGGER_REDELIVERY_SCHEMA,
} as const;

/**
 * Execute the trigger_order_redelivery tool
 */
export async function executeTriggerRedelivery(
  client: SkyFiClient,
  args: unknown,
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    // Validate input
    const input = validateTriggerRedeliveryInput(args);

    logger.info('Executing trigger_order_redelivery tool', {
      orderId: input.orderId,
      hasNewConfig: !!(input.deliveryDriver && input.deliveryParams),
    });

    // Create order management service
    const orderManagement = createOrderManagement(client);

    // First, get the current order to check if we need to use existing config
    const currentOrder = await orderManagement.getOrderById(input.orderId);

    // Determine delivery configuration
    let deliveryDriver = input.deliveryDriver;
    let deliveryParams = input.deliveryParams;

    if (!deliveryDriver || !deliveryParams) {
      // Use existing configuration from the order
      if (!currentOrder.deliveryDriver || !currentOrder.deliveryParams) {
        throw new Error(
          'Order has no existing delivery configuration. ' +
            'Please provide deliveryDriver and deliveryParams.',
        );
      }
      deliveryDriver = currentOrder.deliveryDriver;
      deliveryParams = currentOrder.deliveryParams as Record<string, unknown>;

      logger.info('Using existing delivery configuration for redelivery', {
        orderId: input.orderId,
        deliveryDriver,
      });
    }

    // Trigger redelivery
    const updatedOrder = await orderManagement.triggerRedelivery(input.orderId, {
      deliveryDriver,
      deliveryParams,
    });

    // Format output
    let formattedOutput = 'Redelivery triggered successfully!\n\n';
    formattedOutput += formatOrderStatus(updatedOrder);

    logger.info('trigger_order_redelivery tool executed successfully', {
      orderId: input.orderId,
      newStatus: updatedOrder.status,
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
    logger.error('Failed to execute trigger_order_redelivery tool', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      content: [
        {
          type: 'text',
          text: `Error triggering redelivery: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}
