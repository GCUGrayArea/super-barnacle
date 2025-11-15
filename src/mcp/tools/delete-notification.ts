/**
 * MCP Tool: Delete Notification
 *
 * This tool deletes a monitoring notification, permanently stopping webhook
 * delivery for new imagery matching the notification criteria.
 */

import { z } from 'zod';
import { SkyFiClient } from '../../skyfi/client.js';
import { deleteNotification } from '../../skyfi/notifications.js';
import { ValidationError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { DeleteNotificationInputSchema } from '../schemas/notifications.schemas.js';
import {
  formatDeleteNotificationResult,
  formatValidationError,
} from '../formatters/notification-results.js';

/**
 * Tool name for MCP registration
 */
export const TOOL_NAME = 'delete_notification';

/**
 * Tool description for MCP clients
 */
export const TOOL_DESCRIPTION = `Delete a monitoring notification and stop receiving webhooks.

This tool permanently removes a notification and stops webhook delivery for new imagery.
Once deleted, your webhook endpoint will no longer receive notifications for this AOI.

Use this tool to:
- Remove notifications you no longer need
- Clean up old monitoring setups
- Stop receiving webhooks for specific areas

Important:
- This action cannot be undone
- The notification ID can be obtained using the list_notifications tool
- You can create a new notification anytime with create_monitoring_notification

After deletion, you'll receive a confirmation message with the deleted notification ID.`;

/**
 * Tool input schema for MCP
 */
export const TOOL_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    notificationId: {
      type: 'string',
      description:
        'UUID of the notification to delete. Get this from list_notifications tool. Example: "123e4567-e89b-12d3-a456-426614174000"',
    },
  },
  required: ['notificationId'],
} as const;

/**
 * Execute the delete notification tool
 */
export async function executeDeleteNotification(
  client: SkyFiClient,
  args: unknown
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('MCP Tool: delete_notification called', { args });

  try {
    // Validate input
    const validatedInput = DeleteNotificationInputSchema.parse(args);

    // Call SkyFi API
    const response = await deleteNotification(client, validatedInput.notificationId);

    // Format result
    const formattedResult = formatDeleteNotificationResult(response);

    logger.info('MCP Tool: delete_notification completed', {
      notificationId: response.deletedId,
    });

    return {
      content: [
        {
          type: 'text',
          text: formattedResult,
        },
      ],
    };
  } catch (error) {
    logger.error('MCP Tool: delete_notification failed', { error });

    // Format validation errors nicely
    if (error instanceof z.ZodError) {
      const validationError = new ValidationError(
        error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
      throw new Error(formatValidationError(validationError));
    }

    if (error instanceof ValidationError) {
      throw new Error(formatValidationError(error));
    }

    // Re-throw other errors
    throw error;
  }
}
