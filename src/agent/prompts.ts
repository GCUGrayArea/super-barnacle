/**
 * Agent Prompts and Templates
 *
 * System prompts, templates, and conversation patterns for the SkyFi demo agent.
 * These prompts guide the agent's behavior and provide context for AI interactions.
 *
 * @packageDocumentation
 */

/**
 * System prompt for the SkyFi demo agent
 *
 * This prompt establishes the agent's role, capabilities, and behavior patterns.
 */
export const SYSTEM_PROMPT = `You are a helpful AI assistant powered by the SkyFi satellite imagery platform through the Model Context Protocol (MCP).

**Your Capabilities:**
You have access to SkyFi's satellite imagery ordering platform through specialized tools. You can help users:

1. **Search Archive Imagery**: Search SkyFi's catalog of existing satellite imagery by location, date range, resolution, and other criteria.

2. **Order Archive Imagery**: Place orders for existing satellite imagery with delivery to S3, Google Cloud Storage, or Azure Blob Storage.

3. **Check Feasibility**: Determine if a tasking order (new satellite imagery) is feasible for a specific location and time window.

4. **Predict Satellite Passes**: Find out when satellites will be overhead a specific location to help plan tasking orders.

5. **Order Tasking Imagery**: Place orders for new satellite imagery to be captured.

6. **Manage Orders**: List orders, check order status, retrieve order details, and trigger redelivery if needed.

7. **Set Up Monitoring**: Create notifications to get alerts when new imagery becomes available for a specific area.

8. **Get Pricing**: Retrieve pricing information for different product types and resolutions.

**Your Behavior:**
- Be conversational, friendly, and helpful
- Ask clarifying questions when you need more information
- Explain technical concepts in simple terms
- Provide helpful context about satellite imagery concepts
- Guide users through multi-step workflows
- Always confirm before placing orders (they cost money!)
- Explain what you're doing and why
- Handle errors gracefully and suggest solutions

**Important Guidelines:**
- Area of Interest (AOI) must be provided in Well-Known Text (WKT) format
- Dates should be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)
- Always check feasibility before ordering tasking imagery
- Delivery configurations require cloud storage credentials (S3, GCS, or Azure)
- Archive imagery is pre-existing; tasking imagery is newly captured
- Different product types and resolutions have different costs

**Tool Usage:**
When you need to perform an action, use the appropriate MCP tool. Always explain to the user:
1. What you're about to do
2. Why you're doing it
3. What parameters you're using
4. What the results mean

Remember: You're helping users navigate a complex technical platform. Make it easy and intuitive!`;

/**
 * Welcome message for new conversations
 */
export const WELCOME_MESSAGE = `Welcome to the SkyFi Satellite Imagery Assistant! 🛰️

I can help you search, order, and manage satellite imagery through the SkyFi platform. I have access to:
- Archive imagery search and ordering
- Tasking feasibility checks and new capture orders
- Order management and status tracking
- Monitoring notifications for new imagery
- Pricing information

What would you like to do today?

**Common tasks:**
- "Search for imagery of Central Park in New York from the last week"
- "Check if I can order new satellite imagery of downtown Seattle"
- "Show me my recent orders"
- "What's the cost for high-resolution imagery?"

Type your request, and I'll help you get started!`;

/**
 * Help message explaining available capabilities
 */
export const HELP_MESSAGE = `Here's what I can help you with:

**Search & Order Archive Imagery:**
- Search existing satellite imagery by location, date, resolution, etc.
- Order archive imagery with delivery to your cloud storage

**Tasking (New Captures):**
- Check if a location can be captured by satellites
- Predict when satellites will pass over an area
- Order new satellite imagery captures

**Order Management:**
- List your orders with filtering
- Check order status and details
- Trigger redelivery of completed orders

**Monitoring:**
- Set up notifications for new imagery in specific areas
- Manage existing notifications

**Pricing:**
- Get pricing information for different imagery products

**Need Help with a Specific Task?**
Just describe what you want to do in natural language, and I'll guide you through it!

Example questions:
- "How do I search for imagery?"
- "What's the difference between archive and tasking?"
- "How do I format an area of interest?"
- "What delivery options are available?"`;

/**
 * Error message templates
 */
export const ERROR_MESSAGES = {
  TOOL_EXECUTION_FAILED: (toolName: string, error: string) =>
    `I encountered an error while executing the ${toolName} tool: ${error}\n\nWould you like me to try again or help you with something else?`,

  MISSING_REQUIRED_INFO: (missingInfo: string) =>
    `I need some additional information to proceed: ${missingInfo}\n\nCould you provide that?`,

  API_ERROR: (message: string) =>
    `The SkyFi API returned an error: ${message}\n\nThis might be a temporary issue. Would you like to try again?`,

  INVALID_INPUT: (field: string, reason: string) =>
    `The ${field} you provided doesn't seem to be valid: ${reason}\n\nCould you provide a corrected value?`,

  ORDER_CONFIRMATION_REQUIRED: () =>
    `Before placing this order, please confirm. Orders involve real costs and cannot be undone.\n\nType 'confirm' to proceed or 'cancel' to abort.`,
};

/**
 * Success message templates
 */
export const SUCCESS_MESSAGES = {
  SEARCH_COMPLETE: (resultCount: number) =>
    `I found ${resultCount} ${resultCount === 1 ? 'result' : 'results'} matching your search criteria.`,

  ORDER_PLACED: (orderId: string) =>
    `Success! Your order has been placed with ID: ${orderId}\n\nYou can check its status anytime by asking me to "get order details for ${orderId}".`,

  NOTIFICATION_CREATED: (notificationId: string) =>
    `Notification created successfully with ID: ${notificationId}\n\nYou'll receive alerts at your webhook URL when new imagery becomes available.`,

  REDELIVERY_TRIGGERED: (orderId: string) =>
    `Redelivery has been triggered for order ${orderId}. The imagery will be delivered to your configured storage location again.`,
};

/**
 * Information message templates
 */
export const INFO_MESSAGES = {
  AOI_FORMAT_HELP: () =>
    `Areas of Interest (AOI) should be in Well-Known Text (WKT) format. Here are some examples:

**Point:**
\`POINT(-122.4194 37.7749)\`  (longitude, latitude)

**Polygon:**
\`POLYGON((-122.5 37.7, -122.3 37.7, -122.3 37.8, -122.5 37.8, -122.5 37.7))\`

**Tips:**
- Use longitude (East/West) before latitude (North/South)
- Polygons must close (first and last points must be the same)
- Maximum 500 vertices per polygon
- Maximum area: 500,000 square kilometers

You can use tools like geojson.io to draw polygons and convert them to WKT format.`,

  DELIVERY_CONFIG_HELP: () =>
    `Delivery configuration specifies where imagery should be delivered. Supported options:

**AWS S3:**
\`\`\`json
{
  "deliveryDriver": "S3",
  "bucket": "my-bucket",
  "prefix": "skyfi-imagery/",
  "region": "us-west-2"
}
\`\`\`

**Google Cloud Storage:**
\`\`\`json
{
  "deliveryDriver": "GS",
  "bucket": "my-bucket",
  "prefix": "skyfi-imagery/"
}
\`\`\`

**Azure Blob Storage:**
\`\`\`json
{
  "deliveryDriver": "AZURE",
  "container": "my-container",
  "accountName": "myaccount",
  "connectionString": "..."
}
\`\`\`

Make sure you have the proper permissions configured for SkyFi to deliver to your storage!`,

  PRODUCT_TYPES_INFO: () =>
    `SkyFi offers different types of satellite imagery products:

**Optical Imagery:**
- Standard RGB imagery captured in visible light
- Good for general purpose mapping and analysis
- Affected by cloud cover

**SAR (Synthetic Aperture Radar):**
- Radar-based imaging that works through clouds
- Available day or night
- Good for monitoring, change detection

**Multispectral:**
- Multiple spectral bands beyond visible light
- Useful for vegetation analysis, agriculture
- Can identify different materials and land types

**Resolution Levels:**
- Very High: <1 meter per pixel
- High: 1-5 meters per pixel
- Medium: 5-30 meters per pixel
- Low: >30 meters per pixel

Higher resolution = more detail but higher cost!`,

  ARCHIVE_VS_TASKING: () =>
    `Understanding Archive vs. Tasking:

**Archive Imagery:**
- Pre-existing imagery that's already been captured
- Usually available immediately or within hours
- Lower cost than tasking
- Good when you need recent imagery of popular areas
- Search first to see if suitable imagery exists!

**Tasking Imagery:**
- New imagery captured specifically for your order
- Takes days or weeks depending on satellite availability
- Higher cost due to dedicated capture
- Necessary when you need very recent or future imagery
- Always check feasibility first!

**Recommendation:**
Start by searching archive imagery - you might find what you need at a lower cost!`,
};

/**
 * Confirmation prompts
 */
export const CONFIRMATION_PROMPTS = {
  ORDER_ARCHIVE: (productType: string, resolution: string, cost?: number) => {
    const costInfo = cost !== undefined ? ` The estimated cost is $${cost.toFixed(2)}.` : '';
    return `You're about to order archive imagery:\n- Product Type: ${productType}\n- Resolution: ${resolution}${costInfo}\n\nThis will charge your SkyFi account. Do you want to proceed? (yes/no)`;
  },

  ORDER_TASKING: (productType: string, resolution: string, cost?: number) => {
    const costInfo = cost !== undefined ? ` The estimated cost is $${cost.toFixed(2)}.` : '';
    return `You're about to order new tasking imagery:\n- Product Type: ${productType}\n- Resolution: ${resolution}${costInfo}\n\nTasking orders can take days or weeks to complete and will charge your SkyFi account. Do you want to proceed? (yes/no)`;
  },

  DELETE_NOTIFICATION: (notificationId: string) =>
    `Are you sure you want to delete notification ${notificationId}? (yes/no)`,
};

/**
 * Get a conversational error message
 *
 * @param error - Error object or message
 * @returns Formatted error message for display to user
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Format a tool call for user-friendly display
 *
 * @param toolName - Name of the tool being called
 * @param params - Parameters being passed to the tool
 * @returns User-friendly description of the tool call
 */
export function formatToolCall(toolName: string, params: Record<string, unknown>): string {
  const toolDescriptions: Record<string, (p: Record<string, unknown>) => string> = {
    search_archives: (p) => `Searching for archive imagery${p['aoi'] ? ` in the specified area` : ''}${p['startDate'] ? ` from ${p['startDate']}` : ''}${p['endDate'] ? ` to ${p['endDate']}` : ''}...`,
    get_archive_by_id: (p) => `Retrieving details for archive item ${p['archiveId']}...`,
    order_archive_imagery: (p) => `Placing order for archive imagery${p['archiveId'] ? ` (ID: ${p['archiveId']})` : ''}...`,
    order_tasking_imagery: () => `Placing tasking order for new satellite imagery...`,
    check_tasking_feasibility: () => `Checking if tasking is feasible for the specified area...`,
    predict_satellite_passes: () => `Predicting satellite passes over the specified area...`,
    list_orders: (p) => `Retrieving your orders${p['status'] ? ` with status: ${p['status']}` : ''}...`,
    get_order_details: (p) => `Getting details for order ${p['orderId']}...`,
    trigger_order_redelivery: (p) => `Triggering redelivery for order ${p['orderId']}...`,
    create_monitoring_notification: () => `Creating monitoring notification for new imagery...`,
    list_notifications: () => `Retrieving your notification subscriptions...`,
    delete_notification: (p) => `Deleting notification ${p['notificationId']}...`,
    get_pricing_info: () => `Retrieving pricing information...`,
  };

  const formatter = toolDescriptions[toolName];
  if (formatter) {
    return formatter(params);
  }

  return `Executing ${toolName}...`;
}

/**
 * Format tool results for user-friendly display
 *
 * @param _toolName - Name of the tool that was called (unused in current implementation)
 * @param result - Result from the tool execution
 * @returns User-friendly description of the results
 */
export function formatToolResult(_toolName: string, result: unknown): string {
  // This is a basic implementation - you can enhance with tool-specific formatting
  if (typeof result === 'string') {
    return result;
  }

  if (typeof result === 'object' && result !== null) {
    // For structured results, provide a summary
    return JSON.stringify(result, null, 2);
  }

  return 'Operation completed successfully.';
}
