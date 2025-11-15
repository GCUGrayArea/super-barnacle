/**
 * MCP Tool: List Notifications
 *
 * This tool retrieves all monitoring notifications for the authenticated user,
 * showing their status, configuration, and trigger counts.
 */

import { z } from 'zod';
import { SkyFiClient } from '../../skyfi/client.js';
import { listNotifications } from '../../skyfi/notifications.js';
import { ValidationError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { ListNotificationsInputSchema } from '../schemas/notifications.schemas.js';
import {
  formatListNotificationsResult,
  formatValidationError,
} from '../formatters/notification-results.js';

/**
 * Tool name for MCP registration
 */
export const TOOL_NAME = 'list_notifications';

/**
 * Tool description for MCP clients
 */
export const TOOL_DESCRIPTION = `List all monitoring notifications for the authenticated user.

This tool retrieves all active and optionally inactive monitoring notifications, showing:
- Notification ID and name
- Webhook URL
- Active/inactive status
- Number of times triggered
- Filter criteria (product types, resolutions, cloud coverage, etc.)
- Area of Interest (AOI)
- Creation date

Use this tool to:
- View all your active monitoring setups
- Check notification trigger counts
- Get notification IDs for deletion
- Review filter configurations

The results can be paginated and filtered to show only active notifications.`;

/**
 * Tool input schema for MCP
 */
export const TOOL_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    page: {
      type: 'number',
      description: 'Page number for pagination (1-based). Optional, defaults to 1.',
      minimum: 1,
    },
    pageSize: {
      type: 'number',
      description: 'Number of notifications per page. Optional, defaults to 20. Maximum: 100.',
      minimum: 1,
      maximum: 100,
    },
    includeInactive: {
      type: 'boolean',
      description:
        'Whether to include inactive notifications in the results. Optional, defaults to false (active only).',
    },
  },
} as const;

/**
 * Execute the list notifications tool
 */
export async function executeListNotifications(
  client: SkyFiClient,
  args: unknown
): Promise<{ content: Array<{ type: string; text: string }> }> {
  logger.info('MCP Tool: list_notifications called', { args });

  try {
    // Validate input
    const validatedInput = args
      ? ListNotificationsInputSchema.parse(args)
      : { page: undefined, pageSize: undefined, includeInactive: undefined };

    // Call SkyFi API
    const response = await listNotifications(client, {
      page: validatedInput.page,
      pageSize: validatedInput.pageSize,
      activeOnly: validatedInput.includeInactive === true ? false : true,
    });

    // Format result
    const formattedResult = formatListNotificationsResult(response);

    logger.info('MCP Tool: list_notifications completed', {
      count: response.notifications.length,
      total: response.total,
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
    logger.error('MCP Tool: list_notifications failed', { error });

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
