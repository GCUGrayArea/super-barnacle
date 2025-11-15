/**
 * Order Status Formatter for MCP Tools
 *
 * Formats order status information with clear interpretations and actionable next steps
 */

import { DeliveryStatus, OrderStatusHelper } from '../../types/order-status.js';
import { OrderInfoResponse, DeliveryDriver } from '../../types/skyfi-api.js';

/**
 * Get emoji representation for order status
 */
export function getStatusEmoji(status: DeliveryStatus): string {
  if (OrderStatusHelper.isComplete(status)) {
    return '✅';
  }
  if (OrderStatusHelper.isFailed(status)) {
    return '❌';
  }
  return '⚠️';
}

/**
 * Get status category (success, failure, or in progress)
 */
export function getStatusCategory(status: DeliveryStatus): 'success' | 'failure' | 'in_progress' {
  if (OrderStatusHelper.isComplete(status)) {
    return 'success';
  }
  if (OrderStatusHelper.isFailed(status)) {
    return 'failure';
  }
  return 'in_progress';
}

/**
 * Get actionable next steps based on order status
 */
export function getNextSteps(order: OrderInfoResponse): string[] {
  const steps: string[] = [];

  switch (order.status) {
    case DeliveryStatus.DELIVERY_COMPLETED:
      if (order.downloadImageUrl) {
        steps.push(`Download imagery from: ${order.downloadImageUrl}`);
      }
      if (order.downloadPayloadUrl) {
        steps.push(`Download payload from: ${order.downloadPayloadUrl}`);
      }
      if (order.tilesUrl) {
        steps.push(`View tiles at: ${order.tilesUrl}`);
      }
      break;

    case DeliveryStatus.PAYMENT_FAILED:
      steps.push('Update your payment method');
      steps.push('Contact support to retry payment');
      break;

    case DeliveryStatus.DELIVERY_FAILED:
      steps.push('Check your delivery configuration');
      steps.push('Verify storage credentials are correct');
      steps.push('Trigger redelivery with updated configuration');
      break;

    case DeliveryStatus.PROVIDER_FAILED:
    case DeliveryStatus.PLATFORM_FAILED:
    case DeliveryStatus.PROCESSING_FAILED:
      steps.push('Contact SkyFi support for assistance');
      steps.push(`Reference order ID: ${order.orderId}`);
      break;

    case DeliveryStatus.CREATED:
    case DeliveryStatus.STARTED:
    case DeliveryStatus.PROVIDER_PENDING:
    case DeliveryStatus.PROVIDER_COMPLETE:
    case DeliveryStatus.PROCESSING_PENDING:
    case DeliveryStatus.PROCESSING_COMPLETE:
    case DeliveryStatus.DELIVERY_PENDING:
    case DeliveryStatus.INTERNAL_IMAGE_PROCESSING_PENDING:
      steps.push('Order is in progress - no action needed');
      steps.push('Check back later for updates');
      break;
  }

  return steps;
}

/**
 * Format delivery driver information
 */
export function formatDeliveryDriver(
  driver: DeliveryDriver | null,
  params: Record<string, unknown> | null,
): string {
  if (!driver || driver === DeliveryDriver.NONE) {
    return 'No delivery configured (download URLs provided)';
  }

  let formatted = `Delivery Driver: ${driver}\n`;

  if (params) {
    formatted += 'Parameters:\n';
    Object.entries(params).forEach(([key, value]) => {
      // Mask sensitive values
      if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')) {
        formatted += `  - ${key}: ***MASKED***\n`;
      } else {
        formatted += `  - ${key}: ${JSON.stringify(value)}\n`;
      }
    });
  }

  return formatted;
}

/**
 * Format delivery timeline from events
 */
export function formatDeliveryTimeline(order: OrderInfoResponse): string {
  if (!order.events || order.events.length === 0) {
    return 'No delivery events available';
  }

  const timeline = order.events
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((event) => {
      const emoji = getStatusEmoji(event.status);
      const timestamp = new Date(event.timestamp).toISOString();
      const message = event.message ? ` - ${event.message}` : '';
      return `${emoji} ${timestamp} | ${event.status}${message}`;
    })
    .join('\n');

  return `Delivery Timeline:\n${timeline}`;
}

/**
 * Format complete order status summary
 */
export function formatOrderStatus(order: OrderInfoResponse): string {
  const emoji = getStatusEmoji(order.status);
  const category = getStatusCategory(order.status);
  const description = OrderStatusHelper.getStatusDescription(order.status);
  const nextSteps = getNextSteps(order);

  let summary = `${emoji} Order Status: ${order.status}\n`;
  summary += `Category: ${category}\n`;
  summary += `Description: ${description}\n\n`;

  summary += `Order Details:\n`;
  summary += `- Order ID: ${order.orderId}\n`;
  summary += `- Order Code: ${order.orderCode}\n`;
  summary += `- Order Type: ${order.orderType}\n`;
  summary += `- Created: ${new Date(order.createdAt).toISOString()}\n`;
  summary += `- Cost: $${(order.orderCost / 100).toFixed(2)}\n`;
  summary += `- AOI Size: ${order.aoiSqkm.toFixed(2)} sq km\n`;

  if (order.label) {
    summary += `- Label: ${order.label}\n`;
  }
  if (order.geocodeLocation) {
    summary += `- Location: ${order.geocodeLocation}\n`;
  }

  summary += '\n';
  summary += formatDeliveryDriver(order.deliveryDriver, order.deliveryParams);
  summary += '\n\n';

  summary += formatDeliveryTimeline(order);
  summary += '\n\n';

  summary += 'Next Steps:\n';
  nextSteps.forEach((step) => {
    summary += `- ${step}\n`;
  });

  return summary;
}

/**
 * Format a list of orders in a concise table format
 */
export function formatOrdersList(
  orders: OrderInfoResponse[],
  total: number,
  page: number,
  pageSize: number,
): string {
  if (orders.length === 0) {
    return 'No orders found matching the criteria.';
  }

  const startIndex = page * pageSize + 1;
  const endIndex = Math.min(startIndex + orders.length - 1, total);

  let output = `Showing orders ${startIndex}-${endIndex} of ${total}\n\n`;

  orders.forEach((order, index) => {
    const emoji = getStatusEmoji(order.status);
    const orderNum = startIndex + index;
    const created = new Date(order.createdAt).toISOString().split('T')[0];
    const cost = `$${(order.orderCost / 100).toFixed(2)}`;

    output += `${orderNum}. ${emoji} ${order.orderCode} | ${order.orderType}\n`;
    output += `   Status: ${order.status}\n`;
    output += `   Created: ${created} | Cost: ${cost} | Area: ${order.aoiSqkm.toFixed(2)} sq km\n`;
    output += `   Order ID: ${order.orderId}\n`;

    if (order.label) {
      output += `   Label: ${order.label}\n`;
    }

    output += '\n';
  });

  if (endIndex < total) {
    const remainingPages = Math.ceil((total - endIndex) / pageSize);
    output += `\n${remainingPages} more page(s) available. Use pageNumber parameter to view more.`;
  }

  return output;
}
