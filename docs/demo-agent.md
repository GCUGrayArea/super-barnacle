# SkyFi Demo Agent Documentation

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Using the Agent](#using-the-agent)
- [Example Conversations](#example-conversations)
- [Cost Estimation](#cost-estimation)
- [Troubleshooting](#troubleshooting)
- [Limitations and Known Issues](#limitations-and-known-issues)

## Overview

### What is the Demo Agent?

The SkyFi Demo Agent is an AI-powered conversational assistant that enables natural language interaction with the SkyFi satellite imagery platform. Built on OpenAI's GPT models and the Model Context Protocol (MCP), the agent translates your natural language requests into API calls, making satellite imagery ordering as simple as having a conversation.

**Architecture:**

```
┌─────────────────┐
│      User       │
└────────┬────────┘
         │ Natural Language
         ▼
┌─────────────────────────────────────────┐
│          SkyFi Demo Agent               │
│  ┌───────────────────────────────────┐  │
│  │  OpenAI GPT-4 / GPT-4 Turbo       │  │
│  │  - Understands natural language   │  │
│  │  - Plans actions                  │  │
│  │  - Generates responses            │  │
│  └──────────────┬────────────────────┘  │
│                 │                        │
│  ┌──────────────▼────────────────────┐  │
│  │  MCP Tool Executor                │  │
│  │  - Executes tool calls            │  │
│  │  - Handles errors                 │  │
│  │  - Formats results                │  │
│  └──────────────┬────────────────────┘  │
└─────────────────┼────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          SkyFi MCP Tools                │
│  - search_archives                      │
│  - order_archive_imagery                │
│  - check_tasking_feasibility            │
│  - order_tasking_imagery                │
│  - create_monitoring_notification       │
│  - get_pricing_info                     │
│  - And more...                          │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│          SkyFi API                      │
│          api.skyfi.com                  │
└─────────────────────────────────────────┘
```

### How It Works

1. **You ask a question** in natural language (e.g., "Find satellite imagery of New York City from last week")
2. **GPT-4 understands** your intent and determines which MCP tools to use
3. **The agent executes** the appropriate API calls through MCP tools
4. **Results are formatted** into a conversational response
5. **You receive** easy-to-understand information about available imagery

### Key Capabilities

The demo agent can help you with:

- **Archive Search**: Find existing satellite imagery by location, date, resolution, and other criteria
- **Archive Orders**: Place orders for existing imagery with delivery to cloud storage
- **Tasking Feasibility**: Check if new satellite captures are possible for your location
- **Satellite Passes**: Predict when satellites will pass over specific areas
- **Tasking Orders**: Order new satellite imagery captures
- **Order Management**: List orders, check status, trigger redelivery
- **Monitoring**: Set up alerts for new imagery in specific areas
- **Pricing**: Get cost estimates for different imagery products

### Limitations

The demo agent is **not** a replacement for direct API integration. It's designed for:

- Exploring the SkyFi platform capabilities
- Learning how satellite imagery ordering works
- Prototyping workflows before building production systems
- One-off or infrequent imagery orders

For production use cases requiring:
- High-volume automated ordering
- Sub-second response times
- Complex custom workflows
- Integration with existing systems

You should use the [SkyFi MCP server](../README.md) directly or integrate with the [SkyFi API](https://docs.skyfi.com).

### When to Use the Demo Agent vs Direct MCP Tools

| Use Demo Agent | Use Direct MCP Tools |
|----------------|---------------------|
| Exploring capabilities | Production automation |
| Learning the platform | High-volume processing |
| One-off orders | Custom workflows |
| Prototyping | System integration |
| Research and planning | Real-time applications |
| Cost exploration | Batch processing |

## Quick Start

### Prerequisites

Before running the demo agent, you'll need:

1. **Node.js 18 or higher**
   ```bash
   node --version  # Should show v18.0.0 or higher
   ```

2. **SkyFi API Key**
   - Sign up at [skyfi.com/developers](https://www.skyfi.com/developers)
   - Generate an API key from your dashboard
   - Note: You'll need a valid payment method to place actual orders

3. **OpenAI API Key**
   - Sign up at [platform.openai.com](https://platform.openai.com)
   - Create an API key with access to GPT-4 or GPT-4 Turbo
   - Note: GPT-3.5 is not recommended as it has lower accuracy with tool calling

### Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/yourusername/skyfi-mcp.git
   cd skyfi-mcp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

### Environment Setup

1. **Create a `.env` file** in the project root:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` and add your API keys**:
   ```bash
   # Required: SkyFi API Key
   SKYFI_API_KEY=your_skyfi_api_key_here

   # Required: OpenAI API Key
   OPENAI_API_KEY=your_openai_api_key_here

   # Optional: OpenAI Model (default: gpt-4-turbo)
   OPENAI_MODEL=gpt-4-turbo

   # Optional: OpenAI Temperature (0-2, default: 0.7)
   OPENAI_TEMPERATURE=0.7

   # Optional: Max Tokens (default: 4096)
   OPENAI_MAX_TOKENS=4096

   # Optional: Logging Level
   LOG_LEVEL=info

   # Optional: Node Environment
   NODE_ENV=development
   ```

3. **Verify your setup**:
   ```bash
   npm run demo -- --help
   ```

   If configured correctly, you should see help information about the demo agent.

### Running the Agent for the First Time

#### Interactive Mode (Coming Soon)

Start a conversational session:
```bash
npm run demo
```

This will open an interactive prompt where you can chat with the agent:

```
Welcome to SkyFi Demo Agent! 🛰️

I can help you search, order, and manage satellite imagery.
Type 'help' for available commands or start chatting!

You:
```

**Note**: Interactive mode is planned but not yet implemented. Use scenario mode instead.

#### Scenario Mode (Available Now)

Run pre-built demonstration scenarios:

```bash
# Run all scenarios in dry-run mode (no real orders)
npm run scenarios

# Run a specific scenario
npm run scenarios search-and-order

# Run with live API calls (⚠️ will place real orders)
npm run scenarios search-and-order --live
```

Available scenarios:
- `search-and-order` - Search and order archive imagery
- `feasibility-check` - Check tasking feasibility and order new captures
- `monitoring-setup` - Set up monitoring notifications
- `cost-estimation` - Explore pricing and cost optimization

### First Conversation Example

Here's what a typical interaction looks like:

```
You: Search for satellite imagery of Central Park in New York from the last week

Agent: I'll search for recent satellite imagery of Central Park in New York.

[Executing: search_archives]
Parameters:
- Location: Central Park, New York (coordinates inferred)
- Date Range: Last 7 days
- Resolution: All resolutions
- Sort: Newest first

I found 4 results matching your criteria. Here are the top 3:

1. WorldView-3 Capture
   Captured: Nov 15, 2024 at 3:45 PM UTC
   Resolution: 0.5m (very high resolution)
   Cloud Cover: 12% (good quality)
   Scene Size: 25 km²
   Estimated Cost: $125-190

2. Sentinel-2 Capture
   Captured: Nov 14, 2024 at 10:30 AM UTC
   Resolution: 10m (medium resolution)
   Cloud Cover: 5% (excellent quality)
   Scene Size: 100 km²
   Estimated Cost: $50-100

3. Planet SkySat Capture
   Captured: Nov 13, 2024 at 2:15 PM UTC
   Resolution: 3m (high resolution)
   Cloud Cover: 18% (acceptable quality)
   Scene Size: 35 km²
   Estimated Cost: $70-120

Would you like more details about any of these, or shall I help you place an order?

You: Tell me more about the WorldView-3 capture

Agent: The WorldView-3 capture is an excellent option. Let me get detailed information.

[Executing: get_archive_by_id]

WorldView-3 Satellite Imagery - Detailed Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Capture Details:
- Archive ID: arch_wv3_20241115_1545
- Satellite: WorldView-3 (commercial very high-resolution satellite)
- Capture Date: November 15, 2024 at 3:45 PM UTC
- Sun Elevation: 42° (good angle for imagery)

Quality Metrics:
- Resolution: 0.5 meters per pixel (individual cars visible)
- Cloud Cover: 12% (mostly clear)
- Off-nadir Angle: 8° (minimal distortion)
- Quality Score: 8.5/10

Coverage:
- Scene Size: 25 km² (covers all of Central Park and surrounding area)
- Bands: Red, Green, Blue, Near-Infrared
- Product Type: Optical (standard RGB imagery)

Pricing:
- Estimated Cost: $125-190 (approximately $5-7.50 per km²)
- Delivery Time: 4-24 hours after order
- Format: GeoTIFF with metadata

This imagery is ideal for:
✓ Detailed mapping and analysis
✓ Individual tree identification
✓ Infrastructure inspection
✓ High-quality reporting and presentations

Would you like to order this imagery?
```

## Configuration

### OpenAI Settings

The demo agent can be configured through environment variables or programmatically.

#### Model Selection

Choose which OpenAI model to use:

```bash
# .env file
OPENAI_MODEL=gpt-4-turbo  # Recommended (best balance of speed and accuracy)
# or
OPENAI_MODEL=gpt-4         # More accurate but slower and more expensive
# or
OPENAI_MODEL=gpt-5         # Latest model (if available to your account)
```

**Model Comparison:**

| Model | Speed | Accuracy | Cost | Best For |
|-------|-------|----------|------|----------|
| GPT-4 Turbo | Fast | Excellent | $$ | General use, production |
| GPT-4 | Slower | Excellent+ | $$$ | Complex queries, critical tasks |
| GPT-5 | Fast | Best | $$$ | Latest features (if available) |
| GPT-3.5 Turbo | Fastest | Good | $ | **Not recommended** (lower tool accuracy) |

#### Temperature

Controls response randomness and creativity:

```bash
# .env file
OPENAI_TEMPERATURE=0.7  # Default: balanced
# Range: 0.0 (deterministic) to 2.0 (very creative)
```

**Temperature Guidelines:**

- `0.0-0.3`: Deterministic, factual responses (recommended for production)
- `0.4-0.7`: Balanced, natural conversations (recommended for demos)
- `0.8-1.2`: More creative, varied responses
- `1.3-2.0`: Very creative but potentially less accurate (not recommended)

#### Max Tokens

Maximum tokens in response:

```bash
# .env file
OPENAI_MAX_TOKENS=4096  # Default: 4096 tokens (~3000 words)
# Range: 1-128000 (depending on model)
```

**Token Guidelines:**

- `1024`: Short responses, simple queries
- `2048`: Medium responses, typical conversations
- `4096`: Long responses, detailed explanations (recommended)
- `8192+`: Very long responses, complex multi-tool workflows

### Agent Behavior Customization

#### System Prompts

The agent's personality and behavior are defined in `src/agent/prompts.ts`. You can customize:

```typescript
// src/agent/prompts.ts

export const SYSTEM_PROMPT = `You are a helpful AI assistant...`;
```

**Customization examples:**

1. **More formal tone:**
   ```typescript
   export const SYSTEM_PROMPT = `You are a professional satellite imagery consultant...`;
   ```

2. **Domain-specific focus:**
   ```typescript
   export const SYSTEM_PROMPT = `You are an agricultural monitoring specialist...`;
   ```

3. **Safety-focused:**
   ```typescript
   export const SYSTEM_PROMPT = `You are a helpful assistant. IMPORTANT: Always confirm before placing orders that cost money. Never place orders without explicit user confirmation...`;
   ```

See [Agent Customization Guide](./agent-customization.md) for more details.

#### Tool Selection

Enable or disable specific tools programmatically:

```typescript
import { createToolExecutor } from './src/agent/tool-executor.js';

const toolExecutor = createToolExecutor({
  enabledTools: [
    'search_archives',
    'get_pricing_info',
    // Disable ordering tools for read-only mode
    // 'order_archive_imagery',
    // 'order_tasking_imagery',
  ]
});
```

### Logging and Debugging Options

#### Log Levels

Configure logging verbosity:

```bash
# .env file
LOG_LEVEL=info  # Default

# Options:
# - error: Only errors
# - warn: Warnings and errors
# - info: General information (recommended)
# - debug: Detailed debugging
# - trace: Very detailed (includes API requests/responses)
```

#### Verbose Mode

Enable detailed console output:

```typescript
import { SkyFiAgent } from './src/agent/agent.js';

const agent = new SkyFiAgent({
  verbose: true  // Enable detailed logging
});
```

#### Debug Mode

For troubleshooting, set environment variable:

```bash
DEBUG=skyfi:* npm run scenarios
```

### Cost Controls

#### Token Limits

Prevent runaway costs:

```bash
# .env file
OPENAI_MAX_TOKENS=4096  # Limit response size
```

#### Budget Warnings

Implement in your code:

```typescript
const response = await agent.chat(userMessage);

if (response.cost > 0.50) {
  console.warn(`⚠️ High cost interaction: $${response.cost.toFixed(2)}`);
}

// Track cumulative costs
const stats = agent.getStats();
if (stats.totalCost > 10.00) {
  console.error(`🚨 Budget exceeded: $${stats.totalCost.toFixed(2)}`);
  // Take action (stop agent, send alert, etc.)
}
```

## Using the Agent

### Starting a Conversation

#### Programmatic Usage

```typescript
import { SkyFiAgent } from './src/agent/agent.js';

// Create agent instance
const agent = new SkyFiAgent({
  verbose: true,
  maxToolIterations: 5
});

// Send a message
const response = await agent.chat('Search for imagery of Paris, France');

console.log(response.message);
// View token usage
console.log(`Tokens used: ${response.tokensUsed}`);
console.log(`Cost: $${response.cost.toFixed(4)}`);
```

#### Scenario Runner

```bash
# Run specific scenario
npm run scenarios search-and-order

# Run with custom options
npm run scenarios --scenario feasibility-check --live
```

### Asking Questions About Satellite Imagery

The agent understands various ways to ask about imagery:

**By Location:**
```
"Show me imagery of downtown Seattle"
"Find satellite images of the Amazon rainforest"
"Search for pictures of Mount Everest"
```

**By Date:**
```
"Get imagery from the last week"
"Find images captured in October 2024"
"Show recent imagery from the past 24 hours"
```

**By Quality:**
```
"I need high-resolution imagery"
"Find the clearest imagery (minimal clouds)"
"Show me very detailed satellite images"
```

**Combined Criteria:**
```
"Find high-resolution imagery of San Francisco from last month with less than 10% cloud cover"
```

### Placing Orders Through Natural Language

The agent guides you through the ordering process:

**Archive Orders:**
```
You: I want to order the WorldView-3 imagery from earlier

Agent: I'll help you order that WorldView-3 imagery. To complete the order,
I need to know where you'd like the imagery delivered.

Do you want to deliver to:
1. AWS S3
2. Google Cloud Storage
3. Azure Blob Storage

You: AWS S3, bucket name is my-satellite-data, region us-west-2

Agent: Perfect! Let me prepare the order summary...

[Order summary displayed]

WARNING: This order will charge your SkyFi account approximately $125-190.

Type 'confirm' to proceed or 'cancel' to abort.

You: confirm

Agent: [Executing: order_archive_imagery]
Order placed successfully! Order ID: ord_abc123...
```

**Tasking Orders:**
```
You: I need new satellite imagery of my farm to be captured tomorrow

Agent: I'll check if we can schedule a satellite capture for your farm tomorrow.
Can you provide the coordinates or an area of interest in WKT format?

You: POLYGON((-122.5 37.5, -122.4 37.5, -122.4 37.6, -122.5 37.6, -122.5 37.5))

Agent: [Executing: check_tasking_feasibility]

Great news! Tasking is feasible for your farm location tomorrow...
[Detailed feasibility information displayed]

Would you like to proceed with placing a tasking order?
```

### Checking Order Status

```
You: What's the status of order ord_abc123?

Agent: [Executing: get_order_details]

Order Status: Processing

Order Details:
- Order ID: ord_abc123
- Status: Processing
- Created: 2 hours ago
- Product: WorldView-3 archive imagery
- Estimated Delivery: 4-24 hours from order time

Current Progress:
✅ Order received
✅ Payment processed
🔄 Preparing imagery for delivery
⏳ Delivery to S3 (pending)

I'll continue monitoring this order. Check back in a few hours!
```

### Setting Up Monitoring

```
You: I want to be notified whenever new imagery becomes available for my construction site

Agent: I can set up monitoring notifications for you. I'll need:
1. The area of interest (coordinates or WKT format)
2. Your notification webhook URL
3. Any specific requirements (resolution, cloud cover, etc.)

You: Area is POLYGON(...), webhook is https://mysite.com/webhooks/skyfi,
     I only want high-resolution imagery with less than 20% clouds

Agent: [Executing: create_monitoring_notification]

Monitoring notification created successfully!

Notification ID: notif_xyz789
You'll receive POST requests at your webhook whenever new imagery matching
your criteria becomes available.

Would you like to see an example of the webhook payload format?
```

### Ending Conversations

Simply stop sending messages. Conversation state is maintained in memory during the session but is not currently persisted between sessions.

## Example Conversations

### Simple Archive Search

**Goal**: Find existing imagery for a specific location

```
You: Search for satellite imagery of Golden Gate Bridge

Agent: I'll search for imagery of the Golden Gate Bridge in San Francisco.

[Executing: search_archives]
Parameters:
- Location: Golden Gate Bridge, San Francisco, CA
- AOI: POINT(-122.4783 37.8199)
- Date Range: Last 30 days
- Sort: Newest first

Found 6 results. Here are the top 3:

1. WorldView-2 - Captured Nov 10, 2024
   Resolution: 0.5m | Cloud Cover: 5% | Cost: ~$50

2. Sentinel-2 - Captured Nov 8, 2024
   Resolution: 10m | Cloud Cover: 0% | Cost: ~$15

3. Planet SkySat - Captured Nov 5, 2024
   Resolution: 3m | Cloud Cover: 8% | Cost: ~$30

Which one would you like to know more about?

You: The WorldView-2 looks good. What format will I receive?

Agent: The WorldView-2 imagery will be delivered as:

Format: GeoTIFF (georeferenced TIFF image)
Bands: Red, Green, Blue, Near-Infrared
Bit Depth: 16-bit
Spatial Reference: WGS84 / UTM Zone 10N
File Size: Approximately 200-300 MB

You'll also receive:
- Metadata JSON file with capture details
- Preview JPEG for quick visualization
- README with usage information

The imagery will be delivered to your specified cloud storage location
within 4-24 hours of order placement.

Would you like to proceed with ordering?
```

### Complex Multi-Step Workflow

**Goal**: Compare archive and tasking options, then place an order

```
You: I need imagery of a wildfire area in California. Show me what's available
     in the archive, but also check if I can order a new capture

Agent: I'll help you with both archive search and tasking feasibility for the
wildfire area. Can you provide the specific location (coordinates or area name)?

You: It's near Paradise, California.
     POLYGON((-121.6 39.7, -121.5 39.7, -121.5 39.85, -121.6 39.85, -121.6 39.7))

Agent: Thanks! I'll search the archive and check tasking feasibility in parallel.

[Executing: search_archives]
[Executing: check_tasking_feasibility]

Archive Search Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found 2 archive results from the past week:

1. Sentinel-2 (Nov 14, 2024)
   Resolution: 10m | Cloud Cover: 45% | Cost: ~$200
   ⚠️ High cloud cover may obscure some areas

2. Landsat 8 (Nov 12, 2024)
   Resolution: 30m | Cloud Cover: 35% | Cost: ~$100
   ⚠️ Lower resolution, moderate cloud cover

Tasking Feasibility:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tasking is FEASIBLE for this location!

Feasibility Score: 82/100 (Good)
Next Available Capture: Tomorrow, Nov 17, 2:30 PM UTC
Satellite: WorldView-3
Expected Conditions: Clear skies (95% probability)
Estimated Cost: $1,600-2,000 for 0.5m resolution
Delivery Time: 5-7 days after successful capture

Recommendation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Given the high cloud cover in available archive imagery, I recommend ordering
a new tasking capture for tomorrow when weather conditions will be optimal.

The higher cost ($1,600-2,000 vs $100-200) is justified by:
- Much better resolution (0.5m vs 10-30m)
- Clear conditions (95% vs 35-45% clouds)
- Recent capture (critical for wildfire assessment)

Would you like to proceed with the tasking order, or would you prefer to
order the archive imagery despite the cloud cover?

You: Let's do the tasking order

Agent: Great choice for a time-sensitive wildfire assessment. I'll prepare
the tasking order. I need your delivery configuration (S3, GCS, or Azure).

[Conversation continues with order placement...]
```

### Error Handling and Recovery

**Goal**: Demonstrate how agent handles errors gracefully

```
You: Search for imagery of XYZ123ABC invalid location

Agent: I encountered an issue with the location you provided. The location
"XYZ123ABC" doesn't appear to be a valid place name or coordinates.

For a successful search, please provide one of the following:
1. Place name: "Central Park" or "London, UK"
2. Coordinates: "-122.4194, 37.7749" (longitude, latitude)
3. WKT format: "POINT(-122.4194 37.7749)"

Could you provide a valid location?

You: Oh sorry, I meant San Diego

Agent: No problem! Searching for imagery of San Diego, California...

[Executing: search_archives]
[Search results displayed]

You: Order the first result to my S3 bucket named "wrong-bucket-name-#$%"

Agent: I notice the bucket name "wrong-bucket-name-#$%" contains special
characters that aren't valid for S3 bucket names.

S3 bucket names must:
- Be 3-63 characters long
- Contain only lowercase letters, numbers, and hyphens
- Start and end with a letter or number
- Not contain special characters like #, $, %, etc.

Could you provide a valid S3 bucket name?

You: It's actually "satellite-imagery-2024"

Agent: Perfect! That's a valid bucket name. Preparing your order...
```

### Price Confirmation Flow

**Goal**: Show how agent handles cost confirmation

```
You: Order WorldView-3 imagery of Manhattan

Agent: I'll search for WorldView-3 imagery of Manhattan first to find the
best available scene.

[Executing: search_archives]

Found a great option:
WorldView-3 capture from Nov 15, 2024
Resolution: 0.5m | Cloud Cover: 8% | Scene Size: 60 km²

Let me get pricing information...

[Executing: get_pricing_info]

Estimated Cost: $450-600 ($7.50-10 per km²)

⚠️ COST CONFIRMATION REQUIRED ⚠️

You're about to order:
- Product: WorldView-3 archive imagery
- Location: Manhattan, New York
- Scene Size: 60 km²
- Estimated Cost: $450-600
- Delivery: 4-24 hours to your cloud storage

This will charge your SkyFi account. Orders cannot be cancelled after placement.

To proceed:
1. Provide delivery configuration (S3/GCS/Azure)
2. Type 'confirm' to place the order

Or type 'cancel' to abort.

What would you like to do?

You: Deliver to S3, bucket: nyc-imagery, region: us-east-1

Agent: Order prepared with S3 delivery configuration.

Final Order Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Product: WorldView-3 Archive Imagery
Location: Manhattan, New York (60 km²)
Resolution: 0.5 meters
Estimated Cost: $450-600

Delivery:
- Provider: AWS S3
- Bucket: nyc-imagery
- Region: us-east-1
- Format: GeoTIFF + metadata

⚠️ Type 'confirm' to place this order and charge your account.

You: confirm

Agent: [Executing: order_archive_imagery]

✅ Order placed successfully!

Order ID: ord_manhattan_20241117
Status: Processing
Expected Delivery: Within 4-24 hours

You can check the status anytime by asking:
"What's the status of order ord_manhattan_20241117?"

The imagery will be delivered to: s3://nyc-imagery/
```

## Cost Estimation

### OpenAI API Costs

The demo agent uses OpenAI's API for GPT model access. Costs vary by model and usage.

#### Pricing by Model (as of November 2024)

**GPT-4 Turbo** (Recommended):
- Input: $0.01 per 1K tokens (~750 words)
- Output: $0.03 per 1K tokens
- Typical conversation turn: $0.02-0.05

**GPT-4**:
- Input: $0.03 per 1K tokens
- Output: $0.06 per 1K tokens
- Typical conversation turn: $0.05-0.15

**GPT-5** (if available):
- Pricing TBD (likely similar to GPT-4 Turbo or higher)

#### Token Usage Per Scenario Type

| Scenario Type | Avg Tokens | Avg Cost (GPT-4 Turbo) |
|--------------|------------|----------------------|
| Simple search query | 500-1,000 | $0.01-0.02 |
| Archive search + order | 2,000-3,000 | $0.04-0.07 |
| Tasking feasibility check | 1,500-2,500 | $0.03-0.06 |
| Multi-step workflow | 4,000-8,000 | $0.10-0.20 |
| Complete scenario (10 turns) | 10,000-15,000 | $0.25-0.40 |

#### Example Costs for Common Workflows

**Scenario 1: Archive Search and Order**
```
Conversation turns: 5-7
Average tokens: 3,500
Estimated cost: $0.08-0.12
```

**Scenario 2: Tasking Feasibility and Order**
```
Conversation turns: 8-10
Average tokens: 6,000
Estimated cost: $0.15-0.20
```

**Scenario 3: Price Comparison and Planning**
```
Conversation turns: 6-8
Average tokens: 5,000
Estimated cost: $0.12-0.16
```

**Scenario 4: Monitoring Setup**
```
Conversation turns: 4-6
Average tokens: 2,500
Estimated cost: $0.06-0.10
```

**Full Demo Session (all scenarios)**
```
Total conversation turns: 30-40
Total tokens: 20,000-30,000
Estimated cost: $0.50-0.80
```

#### Tips for Reducing OpenAI Costs

1. **Use concise queries**: Shorter questions → fewer input tokens
2. **Limit conversation history**: Set `maxMessages` in conversation config
3. **Use GPT-4 Turbo**: 50-70% cheaper than GPT-4
4. **Batch related questions**: Ask multiple things in one message
5. **Disable verbose mode**: Reduces token usage in responses
6. **Set lower temperature**: Reduces output variability and length
7. **Use max tokens limit**: Prevents extremely long responses

Example configuration for cost optimization:

```typescript
const agent = new SkyFiAgent({
  conversation: {
    maxMessages: 20,  // Limit history
    systemPrompt: SYSTEM_PROMPT,  // Keep it concise
  },
  verbose: false,  // Disable verbose output
});
```

```bash
# .env
OPENAI_MODEL=gpt-4-turbo  # Use cost-effective model
OPENAI_TEMPERATURE=0.3    # Lower variability
OPENAI_MAX_TOKENS=2048    # Limit response length
```

### SkyFi Imagery Costs

The agent **does not** charge for using the demo functionality. You only pay for:

1. **OpenAI API usage** (as detailed above)
2. **Actual SkyFi imagery orders** (when you confirm orders)

**SkyFi Pricing** (approximate):

**Archive Imagery:**
- Very High Resolution (0.3-1m): $5-10 per km²
- High Resolution (1-5m): $2-5 per km²
- Medium Resolution (5-30m): $0.50-2 per km²
- Low Resolution (>30m): $0.10-0.50 per km²

**Tasking Imagery:**
- Very High Resolution (0.3-1m): $70-90 per km²
- High Resolution (1-5m): $30-50 per km²
- Medium Resolution (5-30m): $10-25 per km²

**Dry Run Mode**: By default, scenarios run in dry-run mode which does **not** place real orders. Only use `--live` flag when you intend to spend money on actual imagery.

See [Cost Estimation Scenario](./demo-scenarios.md#scenario-4-cost-estimation-and-planning) for detailed pricing analysis.

## Troubleshooting

### OpenAI API Errors

#### Rate Limit Errors

**Error**: `429: Rate limit exceeded`

**Cause**: Too many requests to OpenAI API in short time period

**Solutions**:
```bash
# 1. Check your OpenAI account limits
# Visit: https://platform.openai.com/account/limits

# 2. Add retry logic with delays (built into the agent)

# 3. Upgrade your OpenAI account tier for higher limits

# 4. Reduce request frequency
# Wait a few seconds between agent calls
```

#### Quota Exceeded

**Error**: `429: You exceeded your current quota`

**Cause**: Insufficient credits in OpenAI account

**Solutions**:
```bash
# 1. Add credits to your OpenAI account
# Visit: https://platform.openai.com/account/billing

# 2. Check current usage
# Visit: https://platform.openai.com/account/usage

# 3. Set up billing alerts to prevent future issues
```

#### Invalid API Key

**Error**: `401: Incorrect API key provided`

**Cause**: Invalid or expired OpenAI API key

**Solutions**:
```bash
# 1. Verify your API key in .env file
cat .env | grep OPENAI_API_KEY

# 2. Generate a new API key
# Visit: https://platform.openai.com/api-keys

# 3. Update .env file with new key
# Make sure there are no quotes or extra spaces

# 4. Restart your terminal/session to reload environment variables
```

### Agent Not Responding Correctly

#### Agent Gives Wrong Information

**Symptoms**: Agent provides incorrect details or misunderstands requests

**Solutions**:

1. **Use GPT-4 or GPT-4 Turbo** (not GPT-3.5):
   ```bash
   # .env
   OPENAI_MODEL=gpt-4-turbo
   ```

2. **Reduce temperature** for more factual responses:
   ```bash
   # .env
   OPENAI_TEMPERATURE=0.2
   ```

3. **Be more specific** in your queries:
   ```
   ❌ "Find imagery of the bay"
   ✅ "Find imagery of San Francisco Bay, California from the last week"
   ```

4. **Provide context** in multi-turn conversations:
   ```
   ❌ "Order the second one"
   ✅ "Order the second WorldView-3 result from the San Francisco search"
   ```

#### Agent Doesn't Use Tools

**Symptoms**: Agent responds conversationally but doesn't execute MCP tools

**Causes and Solutions**:

1. **Model doesn't support function calling**:
   ```bash
   # Use GPT-4 or GPT-4 Turbo (not GPT-3.5)
   OPENAI_MODEL=gpt-4-turbo
   ```

2. **Tools not properly registered**:
   ```typescript
   // Verify tool executor is initialized
   const toolExecutor = createToolExecutor();
   const tools = toolExecutor.getAvailableTools();
   console.log(`Available tools: ${tools.length}`);
   ```

3. **Request too ambiguous**:
   ```
   ❌ "Tell me about satellites"  (too vague)
   ✅ "Search for satellite imagery of Paris"  (clear action)
   ```

### Tool Execution Failures

#### SkyFi API Errors

**Error**: `SkyFi API returned error: 401 Unauthorized`

**Cause**: Invalid or missing SkyFi API key

**Solutions**:
```bash
# 1. Verify API key in .env
cat .env | grep SKYFI_API_KEY

# 2. Check key is valid and active
# Visit: https://www.skyfi.com/developers/keys

# 3. Ensure no extra spaces or quotes in .env
SKYFI_API_KEY=sk_live_abc123  # Correct
SKYFI_API_KEY="sk_live_abc123"  # Wrong (remove quotes)

# 4. Restart terminal after updating .env
```

**Error**: `SkyFi API returned error: 403 Forbidden`

**Cause**: API key doesn't have required permissions

**Solutions**:
- Verify your SkyFi account has ordering permissions
- Check if payment method is set up (required for orders)
- Contact SkyFi support if issue persists

**Error**: `SkyFi API returned error: 429 Too Many Requests`

**Cause**: Rate limit exceeded (100 requests/minute default)

**Solutions**:
- Wait 60 seconds before retrying
- Reduce request frequency
- Contact SkyFi for increased rate limits

#### Invalid Tool Parameters

**Error**: `Tool execution failed: Invalid AOI format`

**Cause**: Area of Interest not in correct WKT format

**Solutions**:
```
# Ask the agent for help
You: How do I format an area of interest?

# Or provide location name (agent will convert)
You: Search for imagery of Manhattan

# Or use WKT format correctly
POINT(-122.4194 37.7749)
POLYGON((-122.5 37.7, -122.3 37.7, -122.3 37.8, -122.5 37.8, -122.5 37.7))
```

### Context Window Overflow

**Error**: `Context length exceeded`

**Cause**: Conversation history is too long

**Solutions**:

1. **Start a new conversation**:
   ```typescript
   const agent = new SkyFiAgent();  // Fresh conversation
   ```

2. **Limit conversation history**:
   ```typescript
   const agent = new SkyFiAgent({
     conversation: {
       maxMessages: 20  // Keep only last 20 messages
     }
   });
   ```

3. **Use shorter responses**:
   ```bash
   # .env
   OPENAI_MAX_TOKENS=2048  # Shorter responses
   ```

4. **Summarize and restart**:
   ```
   You: Summarize what we've discussed so far

   Agent: [Provides summary]

   You: [Start new conversation with summary as context]
   ```

### Debug Mode and Logging

Enable detailed logging to troubleshoot issues:

```bash
# Enable all debug logging
DEBUG=skyfi:* npm run scenarios

# Enable only agent logging
DEBUG=skyfi:agent npm run scenarios

# Enable only API logging
DEBUG=skyfi:api npm run scenarios

# Enable verbose mode in code
```

```typescript
const agent = new SkyFiAgent({
  verbose: true  // Detailed console output
});
```

Check log files:
```bash
# View recent logs
tail -f logs/agent.log

# Search for errors
grep ERROR logs/*.log

# Check specific date
grep "2024-11-17" logs/agent.log
```

## Limitations and Known Issues

### Model Limitations

#### Hallucinations

**Issue**: AI may occasionally provide incorrect information

**Examples**:
- Fabricating archive IDs that don't exist
- Inventing satellite names or capabilities
- Providing inaccurate pricing estimates

**Mitigation**:
- Always verify critical information through tool results
- Cross-check order details before confirming
- Use lower temperature (0.2-0.4) for factual tasks
- Review tool execution results, not just agent narrative

#### Context Limits

**Issue**: Long conversations may exceed token limits

**Limits**:
- GPT-4 Turbo: 128K tokens (~96,000 words)
- GPT-4: 8K or 32K tokens (depending on version)

**Symptoms**:
- `Context length exceeded` errors
- Agent "forgetting" earlier conversation
- Truncated responses

**Mitigation**:
- Set `maxMessages` limit (20-30 recommended)
- Start new conversations for separate tasks
- Summarize long conversations periodically

#### Tool Calling Limitations

**Issue**: Agent may not always choose optimal tools

**Examples**:
- Searching when should check feasibility first
- Not combining related tool calls efficiently
- Repeating failed tool calls

**Mitigation**:
- Provide clear, specific instructions
- Guide agent step-by-step for complex workflows
- Use pre-built scenarios for common patterns

### SkyFi API Rate Limits

**Default Limits**:
- 100 requests per minute
- 1,000 requests per hour

**When Limits Apply**:
- Rapid-fire agent queries
- Running many scenarios in sequence
- Parallel conversation instances

**Solutions**:
- Add delays between agent calls
- Use dry-run mode for testing
- Contact SkyFi for increased limits
- Implement request queuing

### Ordering Constraints

#### Requires Payment Method

**Issue**: Cannot place real orders without valid payment

**Requirement**:
- Credit card or payment method on file with SkyFi
- Account in good standing
- Sufficient credit/balance

**For Testing**:
- Use dry-run mode (default in scenarios)
- Only use `--live` flag when ready to pay

#### Minimum Order Sizes

**Issue**: Some imagery products have minimum scene sizes

**Typical Minimums**:
- Very high-res commercial: 25 km² minimum
- Tasking orders: 100 km² minimum for some satellites

**Solutions**:
- Check minimum requirements in product details
- Expand AOI if needed
- Choose different satellite/product

#### Geographic Restrictions

**Issue**: Some areas cannot be imaged due to regulations

**Restricted Areas**:
- Military installations
- Certain government facilities
- Countries under sanctions
- Privacy-protected zones

**Symptoms**:
- Feasibility check returns "not feasible"
- Orders rejected with "restricted area" error

**Solutions**:
- Check feasibility before ordering
- Use different satellite operators
- Contact SkyFi for clarification

### Webhook Delivery Timing

**Issue**: Monitoring notifications may have delays

**Typical Delays**:
- 5-30 minutes from imagery availability
- Up to 1 hour during high load

**Factors**:
- SkyFi processing queue
- Webhook endpoint response time
- Network latency

**Mitigation**:
- Don't rely on instant notifications
- Implement retry logic in webhook handler
- Use polling for time-critical applications

### Known Issues

#### Interactive Mode Not Implemented

**Status**: Coming soon

**Current Workaround**: Use scenario runner mode

```bash
# Instead of interactive mode
# npm run demo  # Not yet available

# Use scenarios
npm run scenarios search-and-order
```

#### Conversation Not Persisted

**Issue**: Conversations are lost when agent process ends

**Impact**:
- Cannot resume conversations after restart
- Must re-provide context in new sessions

**Status**: Planned feature

**Workaround**:
- Keep detailed notes of important details
- Save order IDs externally
- Use scenarios for repeatable workflows

#### Limited Error Recovery

**Issue**: Agent may not gracefully recover from certain errors

**Examples**:
- API timeouts causing conversation state issues
- Partial tool execution failures
- Network interruptions

**Mitigation**:
- Start new conversation if errors persist
- Use try-catch in programmatic usage
- Check logs for error details

#### Cost Tracking Not Exact

**Issue**: Cost estimates are approximate

**Why**:
- OpenAI pricing changes
- Token counting variations
- SkyFi pricing varies by account tier

**Mitigation**:
- Check actual bills in OpenAI dashboard
- Verify SkyFi orders in account portal
- Add 10-20% buffer to estimates

### Coming Soon

Planned improvements to address current limitations:

- ✅ **Interactive CLI mode** with readline interface
- ✅ **Conversation persistence** (save/load conversations)
- ✅ **Better error recovery** with automatic retries
- ✅ **Rate limiting** built into agent
- ✅ **Cost tracking** with budget alerts
- ✅ **Conversation summarization** for context management
- ✅ **Web interface** for demo agent
- ✅ **Integration tests** with mock SkyFi API
- ✅ **Streaming responses** for real-time feedback

---

## Additional Resources

- [Demo Scenarios Guide](./demo-scenarios.md) - Detailed walkthroughs of pre-built scenarios
- [Agent Customization Guide](./agent-customization.md) - Advanced customization options
- [MCP Tools Reference](./mcp-tools-reference.md) - Complete tool documentation
- [SkyFi API Documentation](https://docs.skyfi.com) - Official API docs
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling) - Learn about tool use

## Support

- **GitHub Issues**: Report bugs or request features
- **SkyFi Support**: support@skyfi.com for API-related issues
- **Discussions**: Share use cases and get help from the community

## Next Steps

1. [Run your first scenario](./demo-scenarios.md)
2. [Customize the agent](./agent-customization.md)
3. [Explore MCP tools](./mcp-tools-reference.md)
4. [Build your own integration](../README.md)
