/**
 * MCP Result Formatters for Notifications
 *
 * This module provides formatting functions to convert SkyFi API responses
 * into human-readable text suitable for MCP tool responses.
 */

import type {
  CreateNotificationResponse,
  ListNotificationsResponse,
  DeleteNotificationResponse,
  Notification,
  NotificationFilters,
} from '../../types/notifications.js';

/**
 * Format notification filters into a human-readable string
 */
function formatFilters(filters?: NotificationFilters): string {
  if (!filters) {
    return 'None (all imagery will trigger notifications)';
  }

  const parts: string[] = [];

  if (filters.productTypes && filters.productTypes.length > 0) {
    parts.push(`Product Types: ${filters.productTypes.join(', ')}`);
  }

  if (filters.resolutions && filters.resolutions.length > 0) {
    parts.push(`Resolutions: ${filters.resolutions.join(', ')}`);
  }

  if (filters.providers && filters.providers.length > 0) {
    parts.push(`Providers: ${filters.providers.join(', ')}`);
  }

  if (filters.maxCloudCoveragePercent !== undefined) {
    parts.push(`Max Cloud Coverage: ${filters.maxCloudCoveragePercent}%`);
  }

  if (filters.maxOffNadirAngle !== undefined) {
    parts.push(`Max Off-Nadir Angle: ${filters.maxOffNadirAngle}°`);
  }

  if (filters.openData !== undefined) {
    parts.push(`Open Data Only: ${filters.openData ? 'Yes' : 'No'}`);
  }

  return parts.length > 0 ? parts.join('\n  - ') : 'None';
}

/**
 * Format a single notification object
 */
function formatNotification(notification: Notification): string {
  const lines: string[] = [
    `ID: ${notification.id}`,
    `Name: ${notification.name || '(unnamed)'}`,
    `Status: ${notification.isActive ? '✓ Active' : '✗ Inactive'}`,
    `Webhook URL: ${notification.webhookUrl}`,
    `Created: ${new Date(notification.createdAt).toLocaleString()}`,
  ];

  if (notification.triggerCount !== undefined) {
    lines.push(`Triggers: ${notification.triggerCount}`);
  }

  lines.push(`Filters:\n  - ${formatFilters(notification.filters)}`);

  // Truncate AOI for display
  const aoiPreview = notification.aoi.substring(0, 100);
  const aoiDisplay = notification.aoi.length > 100 ? `${aoiPreview}...` : aoiPreview;
  lines.push(`AOI: ${aoiDisplay}`);

  return lines.join('\n');
}

/**
 * Format webhook payload structure for documentation
 */
function formatWebhookPayloadExample(): string {
  return `
Expected Webhook Payload Format:
\`\`\`json
{
  "notificationId": "uuid-here",
  "timestamp": "2025-01-15T12:00:00Z",
  "event": "NEW_IMAGERY_AVAILABLE",
  "archives": [
    {
      "archiveId": "uuid-here",
      "provider": "MAXAR",
      "productType": "DAY",
      "resolution": "HIGH",
      "captureTimestamp": "2025-01-15T10:30:00Z",
      "cloudCoveragePercent": 5,
      "footprint": "POLYGON(...)",
      "thumbnailUrls": {
        "small": "https://...",
        "medium": "https://..."
      }
    }
  ]
}
\`\`\`

Your webhook endpoint should:
- Accept POST requests
- Use HTTPS (HTTP allowed for local dev/testing)
- Return 200 status code to acknowledge receipt
- Process the payload asynchronously if needed
`.trim();
}

/**
 * Format webhook setup guidance
 */
function formatWebhookGuidance(): string {
  return `
Webhook Setup Guidance:
- Webhook URL must be publicly accessible via HTTPS
- For local development/testing, consider using:
  • webhook.site - Get a temporary webhook URL for testing
  • ngrok - Tunnel local server to public HTTPS URL
  • localtunnel - Another tunneling option

Example local setup with ngrok:
1. Start your local webhook server: http://localhost:3000/webhook
2. Run: ngrok http 3000
3. Use the HTTPS URL provided by ngrok as your webhook URL
`.trim();
}

/**
 * Format create notification response
 */
export function formatCreateNotificationResult(
  response: CreateNotificationResponse
): string {
  const sections: string[] = [
    '=== Notification Created Successfully ===\n',
    formatNotification(response.notification),
    '\n' + formatWebhookGuidance(),
    '\n' + formatWebhookPayloadExample(),
    '\n=== Next Steps ===',
    '1. Ensure your webhook endpoint is ready to receive POST requests',
    '2. Test your webhook endpoint manually if needed',
    '3. Monitor the notification trigger count to verify it\'s working',
    '4. Use list_notifications to view all your active notifications',
  ];

  return sections.join('\n');
}

/**
 * Format list notifications response
 */
export function formatListNotificationsResult(
  response: ListNotificationsResponse
): string {
  if (response.notifications.length === 0) {
    return 'No notifications found.\n\nUse create_monitoring_notification to set up imagery alerts.';
  }

  const sections: string[] = [
    `=== Monitoring Notifications (${response.notifications.length} of ${response.total}) ===\n`,
  ];

  response.notifications.forEach((notification, index) => {
    sections.push(`--- Notification ${index + 1} ---`);
    sections.push(formatNotification(notification));
    sections.push('');
  });

  if (response.page !== undefined && response.pageSize !== undefined) {
    sections.push(
      `Page ${response.page} (${response.pageSize} per page, ${response.total} total)`
    );
  }

  sections.push('\n=== Actions ===');
  sections.push('- Use delete_notification with the ID to remove a notification');
  sections.push('- Check webhook endpoint logs to verify notifications are being received');

  return sections.join('\n');
}

/**
 * Format delete notification response
 */
export function formatDeleteNotificationResult(
  response: DeleteNotificationResponse
): string {
  return `
=== Notification Deleted ===

${response.message}

Notification ID: ${response.deletedId}

The webhook will no longer receive notifications for new imagery.
You can create a new notification anytime with create_monitoring_notification.
`.trim();
}

/**
 * Format validation error for user-friendly display
 */
export function formatValidationError(error: Error): string {
  const message = error.message;

  // Check for common validation errors and provide helpful guidance
  if (message.includes('Webhook URL')) {
    return `
${message}

Webhook Requirements:
- Must be a valid URL (https://your-domain.com/webhook)
- Should use HTTPS for production (HTTP allowed for local dev)
- Must be publicly accessible to receive POST requests

For local testing, use ngrok or webhook.site.
`.trim();
  }

  if (message.includes('AOI')) {
    return `
${message}

AOI Requirements:
- Must be in WKT POLYGON format
- Example: "POLYGON((-97.72 30.28, -97.72 30.24, -97.76 30.24, -97.76 30.28, -97.72 30.28))"
- Maximum 500 vertices
- Maximum area: 500,000 square kilometers

Note: First and last coordinate pairs must be identical to close the polygon.
`.trim();
  }

  // Default error message
  return message;
}
